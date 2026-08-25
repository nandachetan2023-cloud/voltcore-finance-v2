/**
 * Finance Assistant â€” Form Registry
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * The "training data" of the assistant. Each entry maps natural-language
 * commands (triggers + entity keywords + examples) to an existing API
 * endpoint and its fields. Field values are pulled out of the sentence with
 * regex extractors, then resolved (party/site/bank/PO lookups) and posted.
 *
 * To teach the assistant a new utterance: add it to `examples` and extend
 * the `keywords` / `extractors`. No code changes needed for the engine.
 */

import type { BuildContext, BuildResult, FieldDef, FormDef } from './types';
import { extractAmounts, nextRef, parseAmount, parseDate, toISODate } from './parser';

// â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Text captured after a leading keyword, e.g. "description <captured>". */
function afterText(...keywords: string[]): FieldDef['extractors'] {
  // Stop at natural boundaries AND the costing tags (job/po/cost center/dept/
  // pm/site) so multi-turn accumulated sentences don't bleed into the value.
  const re = new RegExp(
    `(?:${keywords.join('|')})\\s*:?\\s*([A-Za-z0-9&%.,/()-][^]*?)(?=\\s+(?:on|for|dated|job\\b|po\\b|cost\\s*cent(?:er|re)|dept\\b|department|pm\\b|project manager|site)\\b|$)`,
    'i'
  );
  return [re];
}

function pick(mapping: Record<string, string>): FieldDef['map'] {
  return mapping;
}

// â”€â”€ Compulsory costing fields (Site/Job/PO/Department/PM) â”€â”€
// Every finance transaction form now requires these (API-enforced). Shared
// extractors so each form only needs to read ctx.values.jobCode / .poNo /
// .department / .projectManager in its build().
function jobCodeField(): FieldDef {
  return { key: 'jobCode', kind: 'text', label: 'Job Code', required: true, extractors: [/\bjob(?:\s*code)?\s*:?\s*([A-Za-z0-9/-]+?)(?=\s+(?:po\b|cost\s*cent|dept|department|pm\b|project manager|site|â‚¹|rs\.?|for|of|on|dated)|$)/i] };
}
function poNoField(): FieldDef {
  return { key: 'poNo', kind: 'text', label: 'PO Number', required: true, extractors: [/\bpo(?:\s*(?:no\.?|number))?\s*:?\s*([A-Za-z0-9/-]+?)(?=\s+(?:cost\s*cent|dept|department|pm\b|project manager|job|site|â‚¹|rs\.?|for|of|on|dated)|$)/i] };
}
function costCenterField(): FieldDef {
  return { key: 'costCenter', kind: 'text', label: 'Cost Center', required: true, extractors: [/\bcost\s*cent(?:er|re)\s*:?\s*([A-Za-z0-9][A-Za-z0-9 /-]*?)(?=\s+(?:dept\.?|department|pm\b|project manager|job|po\b|site|â‚¹|rs\.?|for|of|on|dated)|$)/i] };
}
function departmentField(): FieldDef {
  return { key: 'department', kind: 'text', label: 'Department', required: true, extractors: [/\b(?:dept\.?|department)\s*:?\s*([A-Za-z][A-Za-z ]*?)(?=\s+(?:pm\b|project manager|cost\s*cent|job|po\b|site|â‚¹|rs\.?|for|of|on|dated)|$)/i] };
}
function projectManagerField(): FieldDef {
  return { key: 'projectManager', kind: 'text', label: 'Project Manager', required: true, extractors: [/\b(?:pm|project manager)\s*:?\s*([A-Za-z][A-Za-z. ]*?)(?=\s+(?:cost\s*cent|dept|department|job|po\b|site|â‚¹|rs\.?|for|of|on|dated)|$)/i] };
}
function poIdField(): FieldDef {
  return { key: 'poId', kind: 'po', label: 'PO Number', required: true, extractors: [/\bpo(?:\s*(?:no\.?|number))?\s*:?\s*([A-Za-z0-9/-]+?)(?=\s+(?:cost\s*cent|dept|department|pm\b|project manager|job|site|â‚¹|rs\.?|for|of|on|dated)|$)/i] };
}
/** Site/Job/PO(free-text)/Department/PM â€” for forms whose endpoint stores poNo as text (invoice, credit-note). */
function costingFieldDefs(): FieldDef[] {
  return [jobCodeField(), poNoField(), costCenterField(), departmentField(), projectManagerField()];
}
/** Site/Job/PO(FK lookup)/Department/PM â€” for forms whose endpoint stores poId (petty-cash, expense-claim, payment-advice). */
function costingFieldDefsPoId(): FieldDef[] {
  return [jobCodeField(), poIdField(), costCenterField(), departmentField(), projectManagerField()];
}
/** Job/Department/PM only â€” for the PO form itself (no separate PO reference). */
function costingFieldDefsNoPo(): FieldDef[] {
  return [jobCodeField(), costCenterField(), departmentField(), projectManagerField()];
}
/** Read the costing values off ctx.values with `|| null` fallback (for build()). */
function costingPayload(v: Record<string, unknown>) {
  return {
    jobCode: (v.jobCode as string) || null,
    poNo: (v.poNo as string) || null,
    costCenter: (v.costCenter as string) || null,
    department: (v.department as string) || null,
    projectManager: (v.projectManager as string) || null,
  };
}
function costingPayloadPoId(v: Record<string, unknown>) {
  return {
    jobCode: (v.jobCode as string) || null,
    poId: (v.poId as number) ?? null,
    costCenter: (v.costCenter as string) || null,
    department: (v.department as string) || null,
    projectManager: (v.projectManager as string) || null,
  };
}
function costingPayloadNoPo(v: Record<string, unknown>) {
  return {
    jobCode: (v.jobCode as string) || null,
    costCenter: (v.costCenter as string) || null,
    department: (v.department as string) || null,
    projectManager: (v.projectManager as string) || null,
  };
}

/** Number sequence generation counters are computed in build(); helper below. */
async function seqCount(ctx: BuildContext, model: string): Promise<number> {
  // ctx.resolve is used for lookups; counters need a count query â€” provided by engine.
  const count = await (ctx as any).count(model);
  return count;
}

// â”€â”€ Journal Entry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const journalEntry: FormDef = {
  id: 'journal-entry',
  title: 'Journal Entry',
  moduleId: 'create-journal-entry',
  endpoint: '/api/journal-entries',
  triggers: ['create', 'post', 'pass', 'make', 'enter', 'record', 'add', 'raise', 'book'],
  entityKeywords: ['journal entry', 'journal', 'je', 'debit', 'credit', 'dr', 'cr', 'voucher', 'double entry'],
  examples: [
    'Create a journal entry Dr Office Rent 50000 Cr SBI Bank 50000',
    'Pass a JE: debit Cash 10000 and credit Sales 10000 for 5 Jan 2026',
  ],
  build: async (ctx: BuildContext): Promise<BuildResult> => {
    const text = ctx.text;
    const amounts = extractAmounts(text);

    const dateStr = parseDate(extractAfter(text, /\bdate\b/i, /(?:dated|date)\s*:?\s*([^\s]+)/i) ?? '') ?? toISODate(new Date());

    // debit clause: everything after a "debit"/"dr" keyword, up to "credit"/"cr"
    const debitClause = matchClause(text, /(?:debit|dr)\b\s*:?\s*(.+?)(?=\s*(?:credit|cr)\b|$)/i);
    const creditClause = matchClause(text, /(?:credit|cr)\b\s*:?\s*(.+)$/i);

    const debitAmount = debitClause ? (extractAmounts(debitClause).pop() ?? amounts[0] ?? null) : null;
    const creditAmount = creditClause ? (extractAmounts(creditClause).pop() ?? amounts[0] ?? null) : null;
    const debitAccount = debitClause ? stripAmounts(debitClause) : null;
    const creditAccount = creditClause ? stripAmounts(creditClause) : null;

    const totalDebit = debitAmount ?? creditAmount ?? null;
    const totalCredit = creditAmount ?? debitAmount ?? null;

    if (!debitAccount || !creditAccount || totalDebit === null) {
      return {
        payload: {},
        summary: '',
        reference: undefined,
      };
    }
    if (Math.abs(totalDebit - (totalCredit ?? 0)) > 0.01) {
      return {
        payload: {},
        summary: 'Journal entry would not balance',
        reference: undefined,
      };
    }

    const seq = await seqCount(ctx, 'journalEntry');
    const entryNo = nextRef('JE', seq + 1);
    const narration = extractAfter(text, /\bnarration\b|\bfor\b/i, /(?:narration|for)\s*:?\s*([A-Za-z0-9][^]*?)(?:\.|$)/i) ?? null;
    const poNoMatch = text.match(/\bpo[\s/-]*([A-Za-z0-9/-]+)/i);
    const poNo = poNoMatch ? poNoMatch[1] : undefined;

    const payload: Record<string, unknown> = {
      entryNo,
      date: new Date(dateStr),
      voucherType: extractAfter(text, /\bvoucher type\b/i, /voucher\s+type\s*:?\s*([a-z ]+)/i) || 'Journal',
      status: 'Posted',
      narration,
      poNo,
      description: narration,
      lines: [
        {
          account: debitAccount,
          accountName: debitAccount,
          debit: totalDebit,
          credit: 0,
          description: narration,
        },
        {
          account: creditAccount,
          accountName: creditAccount,
          credit: totalCredit,
          debit: 0,
          description: narration,
        },
      ],
    };

    return {
      payload,
      summary: `Dr ${debitAccount} â‚¹${totalDebit.toLocaleString('en-IN')} Â· Cr ${creditAccount} â‚¹${(totalCredit ?? 0).toLocaleString('en-IN')}`,
      reference: entryNo,
    };
  },
  fields: [],
};

// â”€â”€ Site Invoice â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const invoice: FormDef = {
  id: 'invoice',
  title: 'Site Invoice',
  moduleId: 'fin-invoices',
  endpoint: '/api/fin/invoices',
  triggers: ['create', 'raise', 'make', 'generate', 'book', 'add', 'bill'],
  entityKeywords: ['invoice', 'tax invoice', 'bill', 'gst invoice', 'raise invoice'],
  examples: [
    'Raise an invoice for 5 lakh to L&T Construction against site NTPC Rihand',
    'Create an invoice of 250000 to ABC Ltd dated 10 Jan 2026',
  ],
  fields: [
    { key: 'site', kind: 'site', label: 'Site', required: true, extractors: [/\bsite\s*:?\s*([a-z0-9 &/()-]+?)(?=\s+(?:for|of|dated|on|to|amount|job|po\b|cost\s*cent|dept|department|pm\b|project manager|â‚¹|rs\.?|invoice\b)|$)/i] },
    { key: 'client', kind: 'text', label: 'Client' },
    { key: 'date', kind: 'date', label: 'Date' },
    ...costingFieldDefs(),
    { key: 'status', kind: 'select', label: 'Status', default: 'Unpaid' },
  ],
  requiredKeys: ['siteId', 'jobCode', 'poNo', 'costCenter', 'department', 'projectManager'],
  build: async (ctx: BuildContext): Promise<BuildResult> => {
    const v = ctx.values as any;
    const amount = parseAmount(extractFirstAmountText(ctx.text) ?? '') ?? (await amountFromText(ctx));
    if (!amount) {
      return { payload: {}, summary: '', reference: undefined };
    }
    const invoiceDate = parseDate(String(v.date ?? '')) ?? toISODate(new Date());
    const seq = await seqCount(ctx, 'finInvoice');
    const invoiceNo = nextRef('INV', seq + 1);
    const payload: Record<string, unknown> = {
      invoiceNo,
      invoiceDate: new Date(invoiceDate),
      dueDate: new Date(invoiceDate),
      siteId: v.site,
      client: v.client || null,
      partyId: v.partyId ?? null,
      ...costingPayload(v),
      taxableValue: amount,
      invoiceValue: amount,
      grandTotal: amount,
      status: v.status || 'Unpaid',
    };
    return { payload, summary: `${invoiceNo} for â‚¹${amount.toLocaleString('en-IN')}`, reference: invoiceNo };
  },
  };

// â”€â”€ Payment (Payment Center) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const payment: FormDef = {
  id: 'payment',
  title: 'Payment',
  moduleId: 'fin-payments',
  endpoint: '/api/fin/payments',
  triggers: ['record', 'make', 'post', 'do', 'pay', 'transfer', 'credit'],
  entityKeywords: ['payment', 'pay', 'transfer', 'neft', 'rtgs', 'upi', 'imps', 'cheque', 'remit'],
  examples: [
    'Record a payment of 75000 from SBI Bank to ABC Ltd via NEFT',
    'Make an UPI payment of 10000 to Tata Motors from HDFC Bank',
  ],
  fields: [
    { key: 'bankAccountId', kind: 'bankAccount', label: 'Bank account', required: true, extractors: [/(?:from|via|out of)\s*:?\s*([a-z0-9 &/()-]+?)(?=\s+(?:to|for|of|dated|on|job|po\b|cost\s*cent|dept|department|pm\b|project manager|site|â‚¹|rs\.?|neft|rtgs|upi|imps|cheque)|$)/i] },
    { key: 'party', kind: 'text', label: 'Party', extractors: [/(?:to|for|pay to|vendor)\s*:?\s*([a-z0-9 &/()-]+?)(?=\s+(?:from|via|for|of|dated|on|job|po\b|cost\s*cent|dept|department|pm\b|project manager|site|â‚¹|rs\.?|neft|rtgs|upi|imps|cheque)|$)/i] },
    { key: 'site', kind: 'site', label: 'Site', required: true, extractors: [/\bsite\s*:?\s*([a-z0-9 &/()-]+?)(?=\s+(?:for|of|dated|on|job|po\b|cost\s*cent|dept|department|pm\b|project manager|â‚¹|rs\.?)|$)/i] },
    { key: 'description', kind: 'text', label: 'Description' },
    { key: 'date', kind: 'date', label: 'Date' },
    { key: 'paymentMethod', kind: 'select', label: 'Payment method' },
    ...costingFieldDefs(),
  ],
  requiredKeys: ['siteId', 'jobCode', 'poNo', 'costCenter', 'department', 'projectManager'],
  build: async (ctx: BuildContext): Promise<BuildResult> => {
    const v = ctx.values as any;
    const amount = await amountFromText(ctx);
    if (!amount) return { payload: {}, summary: '', reference: undefined };
    const methodMatch = ctx.text.match(/\b(neft|rtgs|imps|upi|cheque|cash)\b/i);
    const payload: Record<string, unknown> = {
      bankAccountId: v.bankAccountId,
      amount,
      paymentMethod: methodMatch ? methodMatch[1].toUpperCase() : v.paymentMethod || 'NEFT',
      party: v.party || null,
      description: v.description || null,
      reference: extractRef(ctx.text) || null,
      date: parseDate(String(v.date ?? '')) ? new Date(parseDate(String(v.date ?? ''))!) : new Date(),
      siteId: v.site ?? null,
      ...costingPayload(v),
    };
    return { payload, summary: `â‚¹${amount.toLocaleString('en-IN')} from bank â†’ ${v.party ?? 'Party'}`, reference: undefined };
  },
  };

// â”€â”€ Petty Cash â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const pettyCash: FormDef = {
  id: 'petty-cash',
  title: 'Petty Cash Voucher',
  moduleId: 'fin-petty-cash',
  endpoint: '/api/fin/petty-cash',
  triggers: ['create', 'record', 'enter', 'add', 'book', 'make'],
  entityKeywords: ['petty cash', 'petty', 'voucher', 'cash expense', 'stationery', 'conveyance', 'courier'],
  examples: [
    'Record petty cash of 500 for courier at site NTPC Rihand',
    'Create a petty cash voucher of 2000 for diesel, category Transport',
    'Create a petty cash voucher of 300 via UPI for stationery at site NTPC Rihand',
  ],
  fields: [
    { key: 'description', kind: 'text', label: 'Description', required: true, extractors: afterText('for', 'purpose', 'towards') },
    { key: 'site', kind: 'site', label: 'Site', required: true, extractors: [/\bsite\s*:?\s*([a-z0-9 &/()-]+?)(?=\s+(?:for|of|dated|on|job|po\b|cost\s*cent|dept|department|pm\b|project manager|â‚¹|rs\.?)|$)/i] },
    {
      key: 'category', kind: 'select', label: 'Category', map: {
        fuel: 'Travel', diesel: 'Travel', petrol: 'Travel', transport: 'Travel', conveyance: 'Travel',
        maint: 'Maintenance', maintenance: 'Maintenance', repair: 'Maintenance', servicing: 'Maintenance',
        local: 'Site Material', 'site material': 'Site Material', material: 'Site Material',
        food: 'Food & Refreshment', refreshment: 'Food & Refreshment', lunch: 'Food & Refreshment',
        stationary: 'Office Supplies', stationery: 'Office Supplies', 'office supplies': 'Office Supplies',
        misc: 'Miscellaneous', general: 'Miscellaneous', other: 'Miscellaneous',
      },
    },
    { key: 'date', kind: 'date', label: 'Date' },
    { key: 'type', kind: 'select', label: 'Type', default: 'Debit' },
    { key: 'paymentMode', kind: 'select', label: 'Payment mode', default: 'Cash' },
    { key: 'party', kind: 'party', label: 'Party' },
    ...costingFieldDefsPoId(),
  ],
  requiredKeys: ['siteId', 'jobCode', 'poId', 'costCenter', 'department', 'projectManager'],
  build: async (ctx: BuildContext): Promise<BuildResult> => {
    const v = ctx.values as any;
    const amount = await amountFromText(ctx);
    const description = v.description || 'Petty cash expense';
    if (!amount) return { payload: {}, summary: '', reference: undefined };
    const seq = await seqCount(ctx, 'finPettyCash');
    const voucherNo = nextRef('PV', seq + 1);
    const modeMatch = ctx.text.match(/\b(cash|wallet|upi)\b/i);
    const paymentMode = modeMatch ? ({ cash: 'Cash', wallet: 'Wallet', upi: 'UPI' } as Record<string, string>)[modeMatch[1].toLowerCase()] ?? 'Cash' : v.paymentMode || 'Cash';
    const payload: Record<string, unknown> = {
      voucherNo,
      date: new Date(parseDate(String(v.date ?? '')) ?? toISODate(new Date())),
      description,
      amount,
      type: v.type || 'Debit',
      category: v.category || null,
      siteId: v.site ?? null,
      partyId: v.partyId ?? null,
      paymentMode,
      remarks: null,
      ...costingPayloadPoId(v),
    };
    return { payload, summary: `${voucherNo} â€” â‚¹${amount.toLocaleString('en-IN')} for ${description}`, reference: voucherNo };
  },
  };

// â”€â”€ Expense Claim â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const expenseClaim: FormDef = {
  id: 'expense-claim',
  title: 'Expense Claim',
  moduleId: 'fin-expense-claims',
  endpoint: '/api/fin/expense-claims',
  triggers: ['create', 'submit', 'record', 'add', 'claim'],
  entityKeywords: ['expense claim', 'claim', 'reimbursement', 'staff expense'],
  examples: [
    'Submit an expense claim of 12000 for travel at site BALCO',
  ],
  fields: [
    { key: 'site', kind: 'site', label: 'Site', required: true, extractors: [/\bsite\s*:?\s*([a-z0-9 &/()-]+?)(?=\s+(?:for|of|dated|on|job|po\b|cost\s*cent|dept|department|pm\b|project manager|â‚¹|rs\.?)|$)/i] },
    { key: 'submittedBy', kind: 'text', label: 'Submitted by' },
    { key: 'date', kind: 'date', label: 'Date' },
    { key: 'expenseType', kind: 'select', label: 'Expense type' },
    ...costingFieldDefsPoId(),
  ],
  requiredKeys: ['siteId', 'jobCode', 'poId', 'costCenter', 'department', 'projectManager'],
  build: async (ctx: BuildContext): Promise<BuildResult> => {
    const v = ctx.values as any;
    const amount = await amountFromText(ctx);
    if (!amount) return { payload: {}, summary: '', reference: undefined };
    const seq = await seqCount(ctx, 'finExpenseClaim');
    const claimNo = nextRef('EC', seq + 1);
    const payload: Record<string, unknown> = {
      claimNo,
      siteId: v.site,
      submittedBy: v.submittedBy || 'Finance Assistant',
      date: new Date(parseDate(String(v.date ?? '')) ?? toISODate(new Date())),
      expenseType: v.expenseType || '',
      totalAmount: amount,
      receivedAmount: 0,
      approvalStatus: 'Draft',
      status: 'Draft',
      items: [{ category: v.expenseType || 'General', amount, name: v.expenseType || 'Expense' }],
      ...costingPayloadPoId(v),
    };
    return { payload, summary: `${claimNo} â€” â‚¹${amount.toLocaleString('en-IN')}`, reference: claimNo };
  },
  };

// â”€â”€ Purchase Order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const purchaseOrder: FormDef = {
  id: 'purchase-order',
  title: 'Purchase Order',
  moduleId: 'fin-purchase-orders',
  endpoint: '/api/fin/purchase-orders',
  triggers: ['create', 'raise', 'make', 'add', 'book', 'place'],
  entityKeywords: ['purchase order', 'po', 'order material', 'buy'],
  examples: [
    'Create a purchase order for cement of 2 lakh from UltraTech at site NTPC Rihand',
  ],
  fields: [
    { key: 'vendorName', kind: 'text', label: 'Vendor', required: true, extractors: [/(?:from|to|vendor)\s*:?\s*([a-z0-9 &/()-]+?)(?=\s+(?:for|of|at|dated|on|job|cost\s*cent|dept|department|pm\b|project manager|â‚¹|rs\.?)|$)/i] },
    { key: 'site', kind: 'site', label: 'Site', required: true, extractors: [/\bsite\s*:?\s*([a-z0-9 &/()-]+?)(?=\s+(?:for|of|dated|on|job|cost\s*cent|dept|department|pm\b|project manager|â‚¹|rs\.?)|$)/i] },
    { key: 'descriptionOfWork', kind: 'text', label: 'Description', extractors: afterText('for', 'of') },
    { key: 'date', kind: 'date', label: 'Date' },
    { key: 'status', kind: 'select', label: 'Status', default: 'Draft' },
    ...costingFieldDefsNoPo(),
  ],
  requiredKeys: ['siteId', 'jobCode', 'costCenter', 'department', 'projectManager'],
  build: async (ctx: BuildContext): Promise<BuildResult> => {
    const v = ctx.values as any;
    const amount = await amountFromText(ctx);
    if (!v.vendorName || !v.site) return { payload: {}, summary: '', reference: undefined };
    const seq = await seqCount(ctx, 'finPurchaseOrder');
    const poNo = nextRef('PO', seq + 1);
    const payload: Record<string, unknown> = {
      poNo,
      vendorId: v.vendorName,
      vendorName: v.vendorName,
      siteId: v.site,
      date: new Date(parseDate(String(v.date ?? '')) ?? toISODate(new Date())),
      descriptionOfWork: v.descriptionOfWork || null,
      totalAmount: amount ?? 0,
      status: v.status || 'Draft',
      ...costingPayloadNoPo(v),
    };
    return { payload, summary: `${poNo} â€” ${v.vendorName} â‚¹${(amount ?? 0).toLocaleString('en-IN')}`, reference: poNo };
  },
  };

// â”€â”€ Purchase Requisition â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const purchaseRequisition: FormDef = {
  id: 'purchase-requisition',
  title: 'Purchase Requisition',
  moduleId: 'procurement-pr',
  endpoint: '/api/procurement/requisitions',
  triggers: ['create', 'raise', 'add', 'submit', 'request'],
  entityKeywords: ['purchase requisition', 'pr', 'requisition', 'material request', 'pr for'],
  examples: [
    'Create a purchase requisition for steel of 80000 requested by Rajesh for site NTPC Rihand',
  ],
  fields: [
    { key: 'requester', kind: 'text', label: 'Requester', extractors: [/(?:requested by|by|requester)\s*:?\s*([a-z][a-z. ]+?)(?=\s+(?:for|of|at|dated|on|â‚¹|rs\.?)|$)/i] },
    { key: 'project', kind: 'text', label: 'Project' },
    { key: 'date', kind: 'date', label: 'Date' },
    { key: 'requiredBy', kind: 'date', label: 'Required by' },
  ],
  build: async (ctx: BuildContext): Promise<BuildResult> => {
    const v = ctx.values as any;
    const amount = await amountFromText(ctx);
    const description = ctx.text.replace(/^\s*(create|raise|add|submit|request)\s+(a|an|the)?\s*(purchase requisition|pr|requisition)\b/i, '').trim() || 'Material requisition';
    const payload: Record<string, unknown> = {
      date: new Date(parseDate(String(v.date ?? '')) ?? toISODate(new Date())),
      requester: v.requester || 'System',
      project: v.project || null,
      requiredBy: v.requiredBy ? new Date(parseDate(String(v.requiredBy))!) : null,
      totalEstCost: amount ?? 0,
      status: 'Draft',
      items: [{ description, qty: 1, unit: '', estCost: amount ?? 0, total: amount ?? 0 }],
    };
    return { payload, summary: `${description} â€” est â‚¹${(amount ?? 0).toLocaleString('en-IN')}`, reference: undefined };
  },
  };

// â”€â”€ Payment Advice â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const paymentAdvice: FormDef = {
  id: 'payment-advice',
  title: 'Payment Advice',
  moduleId: 'fin-payment-advices',
  endpoint: '/api/fin/payment-advices',
  triggers: ['create', 'record', 'raise', 'make', 'add', 'generate'],
  entityKeywords: ['payment advice', 'advice', 'payment note', 'remittance advice'],
  examples: [
    'Create a payment advice of 95000 to Tata Projects via NEFT',
  ],
  fields: [
    { key: 'party', kind: 'party', label: 'Party' },
    { key: 'site', kind: 'site', label: 'Site', required: true, extractors: [/\bsite\s*:?\s*([a-z0-9 &/()-]+?)(?=\s+(?:for|of|dated|on|job|po\b|cost\s*cent|dept|department|pm\b|project manager|â‚¹|rs\.?)|$)/i] },
    { key: 'date', kind: 'date', label: 'Date' },
    { key: 'paymentMode', kind: 'select', label: 'Payment mode' },
    ...costingFieldDefsPoId(),
  ],
  requiredKeys: ['siteId', 'jobCode', 'poId', 'costCenter', 'department', 'projectManager'],
  build: async (ctx: BuildContext): Promise<BuildResult> => {
    const v = ctx.values as any;
    const amount = await amountFromText(ctx);
    if (!amount) return { payload: {}, summary: '', reference: undefined };
    const seq = await seqCount(ctx, 'finPaymentAdvice');
    const adviceNo = nextRef('PA', seq + 1);
    const modeMatch = ctx.text.match(/\b(neft|rtgs|imps|upi|cheque|cash|bank transfer)\b/i);
    const payload: Record<string, unknown> = {
      adviceNo,
      partyId: v.partyId ?? null,
      siteId: v.site ?? null,
      totalAmount: amount,
      paymentDate: new Date(parseDate(String(v.date ?? '')) ?? toISODate(new Date())),
      paymentMode: modeMatch ? modeMatch[1].toUpperCase() : v.paymentMode || 'Bank Transfer',
      status: 'Draft',
      lines: [{ amount, remarks: null }],
      ...costingPayloadPoId(v),
    };
    return { payload, summary: `${adviceNo} â€” â‚¹${amount.toLocaleString('en-IN')}`, reference: adviceNo };
  },
  };

// â”€â”€ Credit Note â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const creditNote: FormDef = {
  id: 'credit-note',
  title: 'Credit Note',
  moduleId: 'fin-credit-notes',
  endpoint: '/api/fin/credit-notes',
  triggers: ['create', 'raise', 'make', 'add', 'issue'],
  entityKeywords: ['credit note', 'credit memo'],
  examples: [
    'Create a credit note of 50000 against invoice INV/2025-26/0001 for L&T',
  ],
  fields: [
    { key: 'invoiceNo', kind: 'text', label: 'Invoice No', required: true, extractors: [/\b(?:against|for|invoice)\s*:?\s*([A-Z0-9/-]+)/i] },
    { key: 'reason', kind: 'text', label: 'Reason', extractors: afterText('for', 'reason') },
    { key: 'date', kind: 'date', label: 'Date' },
    ...costingFieldDefs(),
  ],
  requiredKeys: ['siteId', 'jobCode', 'poNo', 'costCenter', 'department', 'projectManager'],
  build: async (ctx: BuildContext): Promise<BuildResult> => {
    const v = ctx.values as any;
    const amount = await amountFromText(ctx);
    if (!v.invoiceNo || !amount) return { payload: {}, summary: '', reference: undefined };
    const invoice = await (ctx as any).lookupInvoice(v.invoiceNo);
    if (!invoice) {
      return { payload: {}, summary: 'Invoice not found', reference: undefined };
    }
    const seq = await seqCount(ctx, 'finCreditNote');
    const creditNoteNo = nextRef('CN', seq + 1);
    const payload: Record<string, unknown> = {
      creditNoteNo,
      creditNoteAgainstInvoiceNo: invoice.invoiceNo,
      invoiceId: invoice.id,
      siteId: invoice.siteId,
      partyId: invoice.partyId ?? null,
      date: new Date(parseDate(String(v.date ?? '')) ?? toISODate(new Date())),
      invoiceValue: invoice.grandTotal ?? 0,
      amount,
      afterTdsBalance: amount,
      reason: v.reason || null,
      status: 'Issued',
      ...costingPayload(v),
    };
    return { payload, summary: `${creditNoteNo} â€” â‚¹${amount.toLocaleString('en-IN')} vs ${invoice.invoiceNo}`, reference: creditNoteNo };
  },
  };

// â”€â”€ Site Master â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Master data, not a transaction â€” no compulsory Job/PO/Cost Center/PM
// fields. siteCode is a primary-key-style code, so it is always
// auto-generated (SITE-NNN), never asked from the user.
const siteMaster: FormDef = {
  id: 'site-master',
  title: 'Site',
  moduleId: 'fin-sites',
  endpoint: '/api/fin/sites',
  triggers: ['create', 'add', 'raise', 'register', 'open', 'new'],
  entityKeywords: ['site master', 'new site', 'add site', 'register site', 'open a site', 'project site'],
  examples: [
    'Add a new site TISCO Plant Bellary location Bellary state Karnataka customer JSW Steel contact Manoj Rao phone 9876543125 email manoj.rao@jsw.in budget 41000000',
  ],
  fields: [
    { key: 'name', kind: 'text', label: 'Site Name', required: true, extractors: [/\bsite\s*:?\s*([a-z0-9 &.,/()-]+?)(?=\s+(?:location|state|customer|client|contact|phone|email|budget|status)\b|$)/i] },
    { key: 'location', kind: 'text', label: 'Location', extractors: [/\blocation\s*:?\s*([a-z0-9 &.,/()-]+?)(?=\s+(?:state|customer|client|contact|phone|email|budget|status)\b|$)/i] },
    { key: 'state', kind: 'text', label: 'State', extractors: [/\bstate\s*:?\s*([a-z ]+?)(?=\s+(?:customer|client|contact|phone|email|budget|status)\b|$)/i] },
    { key: 'party', kind: 'party', label: 'Customer', extractors: [/\b(?:customer|client)\s*:?\s*([a-z0-9 &.,/()-]+?)(?=\s+(?:contact|phone|email|budget|status)\b|$)/i] },
    { key: 'contactPerson', kind: 'text', label: 'Contact Person', extractors: [/\bcontact\s*:?\s*([a-z][a-z. ]*?)(?=\s+(?:phone|email|budget|status)\b|$)/i] },
    { key: 'contactPhone', kind: 'text', label: 'Phone', extractors: [/\bphone\s*:?\s*([0-9+\- ]+?)(?=\s+(?:email|budget|status)\b|$)/i] },
    { key: 'contactEmail', kind: 'text', label: 'Email', extractors: [/\bemail\s*:?\s*([^\s]+@[^\s]+?)(?=\s+(?:budget|status)\b|$)/i] },
    { key: 'budget', kind: 'currency', label: 'Budget', extractors: [/\bbudget\s*:?\s*([\d,.]+\s*(?:crore|cr|million|mn|lakh|lac|thousand|k)?)(?=\s+(?:status)\b|$)/i] },
    { key: 'status', kind: 'select', label: 'Status', default: 'Active' },
  ],
  build: async (ctx: BuildContext): Promise<BuildResult> => {
    const v = ctx.values as any;
    if (!v.name) return { payload: {}, summary: '', reference: undefined };
    const count = await seqCount(ctx, 'finSite');
    const siteCode = `SITE-${String(count + 1).padStart(3, '0')}`;
    const payload: Record<string, unknown> = {
      siteCode,
      name: v.name,
      location: v.location || null,
      state: v.state || null,
      customerId: v.partyId ?? null,
      contactPerson: v.contactPerson || null,
      contactPhone: v.contactPhone || null,
      contactEmail: v.contactEmail || null,
      budget: v.budget || 0,
      status: v.status || 'Active',
    };
    return { payload, summary: `${siteCode} â€” ${v.name}`, reference: siteCode };
  },
};

// â”€â”€ Party Master (Client/Vendor) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Master data, not a transaction â€” no compulsory Job/PO/Cost Center/PM
// fields. `code` is a primary-key-style code, so it is always
// auto-generated (C-prefixed for customers, V-prefixed for vendors),
// never asked from the user.
const partyMaster: FormDef = {
  id: 'party-master',
  title: 'Party',
  moduleId: 'fin-parties',
  endpoint: '/api/fin/parties',
  triggers: ['create', 'add', 'raise', 'register', 'new'],
  entityKeywords: ['party master', 'new client', 'new vendor', 'new supplier', 'add client', 'add vendor', 'add supplier', 'register client', 'register vendor', 'new party', 'add party'],
  examples: [
    'Add a new vendor Siemens India Ltd gstin 29AABCS5678R1Z1 pan AABCS5678R state Karnataka contact 9876543210 terms Net 30',
    'Add a new client Tata Projects Ltd gstin 24AABCT9012L1Z1 state Gujarat contact 9876543212 terms Net 45',
  ],
  fields: [
    { key: 'name', kind: 'text', label: 'Party Name', required: true, extractors: [/\b(?:vendor|supplier|client|customer|party)\s*:?\s*([a-z0-9 &.,/()-]+?)(?=\s+(?:gstin|pan|address|state|contact|phone|terms|payment terms)\b|$)/i] },
    { key: 'gstin', kind: 'text', label: 'GSTIN', extractors: [/\bgstin\s*:?\s*([0-9A-Z]{15})/i] },
    { key: 'pan', kind: 'text', label: 'PAN', extractors: [/\bpan\s*:?\s*([0-9A-Z]{10})/i] },
    { key: 'address', kind: 'text', label: 'Address', extractors: [/\baddress\s*:?\s*([a-z0-9 &.,/()-]+?)(?=\s+(?:state|contact|phone|terms|payment terms)\b|$)/i] },
    { key: 'state', kind: 'text', label: 'State', extractors: [/\bstate\s*:?\s*([a-z ]+?)(?=\s+(?:contact|phone|terms|payment terms)\b|$)/i] },
    { key: 'contact', kind: 'text', label: 'Contact', extractors: [/\b(?:contact|phone)\s*:?\s*([0-9+\- ]+?)(?=\s+(?:terms|payment terms)\b|$)/i] },
    { key: 'paymentTerms', kind: 'text', label: 'Payment Terms', extractors: [/\b(?:terms|payment terms)\s*:?\s*(net\s*\d+|advance|immediate)/i] },
  ],
  build: async (ctx: BuildContext): Promise<BuildResult> => {
    const v = ctx.values as any;
    if (!v.name) return { payload: {}, summary: '', reference: undefined };
    const text = ctx.text.toLowerCase();
    const partyType = /\b(vendor|supplier)\b/.test(text) ? 'Vendor' : /\b(client|customer)\b/.test(text) ? 'Customer' : 'Other';
    const prefix = partyType === 'Vendor' ? 'V' : partyType === 'Customer' ? 'C' : 'O';
    const count = await (ctx as any).countPartiesByType(partyType);
    const code = `${prefix}${String(count + 1).padStart(3, '0')}`;
    const payload: Record<string, unknown> = {
      code,
      name: v.name,
      partyType,
      gstin: v.gstin || null,
      pan: v.pan || null,
      address: v.address || null,
      state: v.state || null,
      contact: v.contact || null,
      paymentTerms: v.paymentTerms || null,
      gstTreatment: v.gstin ? 'Registered' : 'Unregistered',
      isActive: true,
    };
    return { payload, summary: `${code} â€” ${v.name} (${partyType})`, reference: code };
  },
};

// â”€â”€ Job Master (PO-wise) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// New in the Site/Job/PO/Customer tagging compliance push. A Job ties a
// unique job code to a site and (optionally) the PO that funds it. The
// job code is the key every transaction's `jobCode` tag should reference.
// Master data â€” no compulsory Job/PO/Cost Center/PM fields of its own.
const job: FormDef = {
  id: 'job',
  title: 'Job',
  moduleId: 'fin-jobs',
  endpoint: '/api/fin/jobs',
  triggers: ['create', 'add', 'register', 'open', 'new', 'set up'],
  entityKeywords: ['job master', 'new job', 'add job', 'create job', 'register job', 'open a job', 'job'],
  examples: [
    'Create a job JOB-2026-006 at site TISCO Plant Bellary for PO/2025/0012 description Boiler erection phase 1',
    'Add a new job at site NTPC Rihand linked to purchase order PO-2026-001',
  ],
  fields: [
    { key: 'jobCode', kind: 'text', label: 'Job Code', extractors: [/\bjob(?:\s*code)?\s*:?\s*([A-Z0-9/.-]+)/i] },
    { key: 'site', kind: 'site', label: 'Site', required: true, extractors: [/\bsite\s*:?\s*([a-z0-9 &.,/()-]+?)(?=\s+(?:for|of|dated|on|po\b|description|status|â‚¹|rs\.?)|$)/i] },
    { key: 'po', kind: 'po', label: 'Purchase Order', extractors: [/\bpo(?:\s*(?:no\.?|number))?\s*:?\s*([a-z0-9/.-]+?)(?=\s+(?:for|of|dated|on|site\b|description|status|â‚¹|rs\.?)|$)/i] },
    { key: 'description', kind: 'text', label: 'Description', extractors: [/\bdescription\s*:?\s*([a-z0-9 &.,/()-]+?)(?=\s+(?:status)\b|$)/i] },
    { key: 'status', kind: 'select', label: 'Status', default: 'Active' },
  ],
  build: async (ctx: BuildContext): Promise<BuildResult> => {
    const v = ctx.values as any;
    if (!v.site) return { payload: {}, summary: '', reference: undefined };
    const payload: Record<string, unknown> = {
      jobCode: v.jobCode || '',
      siteId: v.site,
      poId: v.po ?? null,
      description: v.description || null,
      status: v.status || 'Active',
    };
    return {
      payload,
      summary: `${v.jobCode || 'job code auto-generated'} at site, linked PO ${v.po ? 'yes' : 'none'}`,
      reference: v.jobCode || undefined,
    };
  },
};

export const FORMS: FormDef[] = [
  journalEntry,
  invoice,
  payment,
  pettyCash,
  expenseClaim,
  purchaseOrder,
  purchaseRequisition,
  paymentAdvice,
  siteMaster,
  partyMaster,
  creditNote,
  job,
];

// â”€â”€ shared helpers used by builds â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function matchClause(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

function stripAmounts(s: string): string {
  return s
    .replace(/\b[\d,]+(?:\.\d+)?\s*(crore|cr|million|mn|lakh|lac|thousand|k)?\b/gi, '')
    .replace(/[â‚¹]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractAfter(_text: string, _hint: RegExp, re: RegExp): string | null {
  const m = _text.match(re);
  return m ? m[1].trim().replace(/\.$/, '') : null;
}

/** Return the raw first amount segment from the sentence (for amount extraction). */
function extractFirstAmountText(text: string): string | null {
  const m = text.match(/(?:â‚¹|rs\.?|rupees|inr)?\s*\b[\d,]+(?:\.\d+)?\s*(?:crore|cr|million|mn|lakh|lac|thousand|k)?\b/i);
  return m ? m[0] : null;
}

function extractRef(text: string): string | null {
  const m = text.match(/\b(?:utr|ref|cheque(?: no)?|reference)\s*[:#]?\s*([A-Z0-9]{4,})/i);
  return m ? m[1] : null;
}

/** Pull the amount out of the sentence via the parser (used by builds). */
async function amountFromText(ctx: BuildContext): Promise<number | null> {
  const amts = extractAmounts(ctx.text);
  if (amts.length === 0) return null;
  return amts[0];
}

// Re-export helpers for the engine.
export { pick, afterText };
