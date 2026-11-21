// Shared General Ledger auto-posting helper. Modeled directly on the one
// working precedent in the codebase (site-expense-claim approval, see
// src/app/api/fin/site-expenses/[id]/route.ts) so every AP/AR/Payment
// transaction posts real double-entry FinJournalEntry/FinJournalLine rows
// instead of living only in its own table.
//
// A GL-posting failure must never block the primary business transaction
// (the AP bill, the invoice, the payment) from succeeding — callers should
// invoke this AFTER the primary record is created/updated, and this
// function swallows its own errors (logging them) rather than throwing.

import { nextPrefixedCode } from '@/lib/auto-number'

export interface PostJournalLine {
  accountCode: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface PostJournalEntryOptions {
  prefix: string; // e.g. 'JE-AP', 'JE-AR', 'JE-PAY'
  voucherType: 'Journal' | 'Payment' | 'Receipt' | 'Contra';
  entryDate: Date;
  description: string;
  reference?: string | null;
  siteId: number | null | undefined;
  jobCode?: string | null;
  poNo?: string | null;
  costCenter?: string | null;
  department?: string | null;
  projectManager?: string | null;
  lines: PostJournalLine[];
}

export async function postJournalEntry(pdb: any, opts: PostJournalEntryOptions): Promise<void> {
  if (!opts.siteId) throw new Error('GL entries require a site'); // GL entries require a site — nothing to post without one
    const totalDebit = opts.lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = opts.lines.reduce((s, l) => s + (l.credit || 0), 0);
    if (totalDebit <= 0 && totalCredit <= 0) return;

    const resolvedLines: { accountId: number; description: string | null; debit: number; credit: number; costCenter: string | null; jobCode: string | null; siteCode: string | null; department: string | null; projectManager: string | null }[] = [];
    for (const line of opts.lines) {
      const account = await pdb.finAccount.findUnique({ where: { accountCode: line.accountCode } });
       if (!account) {
         throw new Error(`Account code "${line.accountCode}" not found — cannot post journal entry "${opts.description}"`);
       }
      resolvedLines.push({
        accountId: account.id,
        description: line.description || opts.description,
        debit: line.debit || 0,
        credit: line.credit || 0,
        costCenter: opts.costCenter || null,
        jobCode: opts.jobCode || null,
        siteCode: null,
        department: opts.department || null,
        projectManager: opts.projectManager || null,
      });
    }

    const year = opts.entryDate.getFullYear();

    // entryNo is generated from the highest existing suffix + 1 (deletes never
    // free a number). Two concurrent postings can still compute the same
    // number, so retry on that unique-constraint failure instead of letting
    // the GL entry silently vanish into the catch below.
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      const entryNo = await nextPrefixedCode(pdb, 'finJournalEntry', 'entryNo', `${opts.prefix}/${year}/`, 4);
      try {
        await pdb.finJournalEntry.create({
          data: {
            entryNo,
            entryDate: opts.entryDate,
            reference: opts.reference || null,
            description: opts.description,
            siteId: opts.siteId,
            finSiteId: opts.siteId,
            jobCode: opts.jobCode || null,
            poNo: opts.poNo || null,
            costCenter: opts.costCenter || null,
            department: opts.department || null,
            projectManager: opts.projectManager || null,
            voucherType: opts.voucherType,
            status: 'Posted',
            totalDebit,
            totalCredit,
            lines: { create: resolvedLines },
          },
        });
        return;
      } catch (err: any) {
        lastError = err;
        if (err?.code !== 'P2002') break; // only retry on the entryNo unique-constraint race
      }
    }
    throw lastError;
  }

// Standard chart-of-accounts codes seeded in prisma/seed.ts — kept here so
// call sites reference a name instead of a magic string.
export const GL_ACCOUNTS = {
  CASH: '1001',
  BANK: '1002',
  PETTY_CASH: '1003',
  ACCOUNTS_RECEIVABLE: '1004',
  INVENTORY: '1005',
  FIXED_ASSETS: '1006',
  VENDOR_PAYABLE: '2001',
  GST_PAYABLE: '2002',
  TDS_PAYABLE: '2003',
  SALARY_PAYABLE: '2004',
  PROJECT_REVENUE: '4001',
  SERVICE_REVENUE: '4002',
  MATERIAL_SALES: '4003',
  MATERIAL_CONSUMPTION: '5003',
} as const;

export async function findJournalEntryByReference(pdb: any, reference: string) {
  return pdb.finJournalEntry.findFirst({
    where: { reference },
    include: { lines: true },
    orderBy: { entryDate: 'desc' },
  });
}

export async function reverseJournalEntry(pdb: any, reference: string, actor: string, reason: string) {
  const existingEntry = await findJournalEntryByReference(pdb, reference);
  if (!existingEntry) return { success: false, error: 'No journal entry found to reverse' };
  if (existingEntry.status === 'Reversed') return { success: false, error: 'Journal entry already reversed' };
  if (existingEntry.status !== 'Posted') return { success: false, error: `Cannot reverse journal entry with status '${existingEntry.status}'` };

  const year = new Date().getFullYear();
  const entryNo = await nextPrefixedCode(pdb, 'finJournalEntry', 'entryNo', `REV/${year}/`, 4);

  const reversedLines = existingEntry.lines.map((line: any) => ({
    accountId: line.accountId,
    description: `Reversal: ${reason} (orig: ${existingEntry.entryNo})`,
    debit: line.credit,
    credit: line.debit,
    costCenter: line.costCenter,
    jobCode: line.jobCode,
    siteCode: line.siteCode,
    department: line.department,
    projectManager: line.projectManager,
  }));

  const totalDebit = reversedLines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = reversedLines.reduce((sum, line) => sum + line.credit, 0);

  await pdb.$transaction(async (tx: any) => {
    await tx.finJournalEntry.create({
      data: {
        entryNo,
        entryDate: new Date(),
        reference: `REV-${reference}`,
        description: `Reversal of ${existingEntry.entryNo}: ${reason}`,
        siteId: existingEntry.siteId,
        finSiteId: existingEntry.finSiteId,
        jobCode: existingEntry.jobCode,
        poNo: existingEntry.poNo,
        costCenter: existingEntry.costCenter,
        department: existingEntry.department,
        projectManager: existingEntry.projectManager,
        voucherType: 'Journal',
        status: 'Posted',
        postedAt: new Date(),
        postedBy: actor,
        totalDebit,
        totalCredit,
        lines: { create: reversedLines },
      },
    });
    await tx.finJournalEntry.update({
      where: { id: existingEntry.id },
      data: { status: 'Reversed' },
    });
  });

  return { success: true, reversalEntryNo: entryNo };
}

export async function checkPostedJournalEntry(pdb: any, reference: string) {
  const entry = await findJournalEntryByReference(pdb, reference);
  return { hasPostedEntry: entry?.status === 'Posted', entry };
}
