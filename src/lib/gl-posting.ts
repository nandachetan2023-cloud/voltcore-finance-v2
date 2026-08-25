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
  try {
    if (!opts.siteId) return; // GL entries require a site — nothing to post without one
    const totalDebit = opts.lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = opts.lines.reduce((s, l) => s + (l.credit || 0), 0);
    if (totalDebit <= 0 && totalCredit <= 0) return;

    const resolvedLines: { accountId: number; description: string | null; debit: number; credit: number; costCenter: string | null; jobCode: string | null; siteCode: string | null; department: string | null; projectManager: string | null }[] = [];
    for (const line of opts.lines) {
      const account = await pdb.finAccount.findUnique({ where: { accountCode: line.accountCode } });
      if (!account) {
        console.warn(`[gl-posting] Account code "${line.accountCode}" not found — skipping journal entry "${opts.description}"`);
        return; // don't post a half-formed, unbalanced entry
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
    const count = (await pdb.finJournalEntry.count()) + 1;
    const entryNo = `${opts.prefix}/${year}/${String(count).padStart(4, '0')}`;

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
        status: 'Draft',
        totalDebit,
        totalCredit,
        lines: { create: resolvedLines },
      },
    });
  } catch (error) {
    console.error('[gl-posting] Failed to auto-post journal entry:', error);
  }
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
