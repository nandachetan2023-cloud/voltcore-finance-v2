// ── Tally XML generation for ERP → Tally export ───────────────────────
// Tally ERP 9 listens on port 9000 by default and accepts XML via HTTP POST.
// This module builds Tally-compatible XML envelopes for masters & vouchers.

export interface TallyCompanyInfo {
  name: string
}

export interface TallyPartyMaster {
  name: string
  parent: string         // e.g. "Sundry Debtors" | "Sundry Creditors"
  gstin?: string
  pan?: string
  address?: string
  state?: string
  stateCode?: string
  contact?: string
}

export interface TallyVoucherEntry {
  ledgerName: string
  amount: number         // positive = debit, negative = credit in Tally convention
  isDeemedPositive?: boolean
}

export interface TallyVoucher {
  voucherTypeName: string  // "Sales", "Purchase", "Payment", "Receipt", "Contra", "Journal"
  voucherNumber: string
  date: string             // YYYYMMDD
  effectiveDate?: string
  partyLedgerName?: string
  ledgerEntries: TallyVoucherEntry[]
}

// ── XML building blocks ────────────────────────────────────────────────

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function tag(name: string, content: string | number | boolean | null | undefined, indent = 0): string {
  const pad = '  '.repeat(indent)
  if (content === null || content === undefined) return `${pad}<${name} />\n`
  return `${pad}<${name}>${xmlEscape(String(content))}</${name}>\n`
}

function block(name: string, inner: string, indent = 0): string {
  const pad = '  '.repeat(indent)
  return `${pad}<${name}>\n${inner}${pad}</${name}>\n`
}

// ── Envelope ───────────────────────────────────────────────────────────

function envelope(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<ENVELOPE>\n${body}</ENVELOPE>`
}

function importData(reportName: string, companyName: string, dataXml: string): string {
  return block('HEADER', tag('TALLYREQUEST', 'Import Data'), 0) +
    block('BODY',
      block('IMPORTDATA',
        block('REQUESTDESC',
          tag('REPORTNAME', reportName, 2) +
          block('STATICVARIABLES',
            tag('SVCURRENTCOMPANY', companyName, 3), 1) +
          block('REQUESTDATA',
            dataXml, 1), 0))
  )
}

// ── Master XML builders ────────────────────────────────────────────────

export function buildLedgerMasterXml(party: TallyPartyMaster): string {
  const fields = [
    tag('NAME', party.name, 2),
    tag('PARENT', party.parent, 2),
    tag('ISDEEMEDPOSITIVE', 'Yes', 2),
    party.gstin ? tag('GSTNUMBER', party.gstin, 2) : '',
    party.pan ? tag('GSTINITIAL', party.pan, 2) : '',
    party.address ? tag('ADDRESS', party.address, 2) : '',
    party.state ? tag('STATE', party.state, 2) : '',
    party.stateCode ? tag('STATECODE', party.stateCode, 2) : '',
    party.contact ? tag('CONTACT', party.contact, 2) : '',
    tag('LANGUAGENAME', party.name, 2),
  ]
  return block('TALLYMESSAGE', block('LEDGER', fields.join(''), 1), 0)
}

export function buildMastersBatchXml(parties: TallyPartyMaster[], company: TallyCompanyInfo): string {
  const dataXml = parties.map(p => buildLedgerMasterXml(p)).join('\n')
  return envelope(importData('All Masters', company.name, dataXml))
}

// ── Voucher XML builders ───────────────────────────────────────────────

function buildLedgerEntryXml(entry: TallyVoucherEntry, indent = 4): string {
  return block('LEDGERENTRY',
    tag('LEDGERNAME', entry.ledgerName, indent) +
    tag('ISDEEMEDPOSITIVE', entry.isDeemedPositive ? 'Yes' : 'No', indent) +
    tag('AMOUNT', entry.amount, indent), indent - 1)
}

export function buildVoucherXml(v: TallyVoucher): string {
  const entriesXml = v.ledgerEntries.map(e => buildLedgerEntryXml(e)).join('\n')
  const voucherBody = [
    tag('DATE', v.date, 2),
    tag('VOUCHERTYPENAME', v.voucherTypeName, 2),
    tag('VOUCHERNUMBER', v.voucherNumber, 2),
    v.partyLedgerName ? tag('PARTYLEDGERNAME', v.partyLedgerName, 2) : '',
    tag('EFFECTIVEDATE', v.effectiveDate || v.date, 2),
    tag('ISVOID', 'No', 2),
    tag('ISDELETED', 'No', 2),
    block('ALLLEDGERENTRIES.LIST', entriesXml, 2),
  ]
  return block('TALLYMESSAGE', block('VOUCHER', voucherBody.join(''), 1), 0)
}

export function buildVouchersBatchXml(vouchers: TallyVoucher[], company: TallyCompanyInfo): string {
  const dataXml = vouchers.map(v => buildVoucherXml(v)).join('\n')
  return envelope(importData('Vouchers', company.name, dataXml))
}

// ── Combined batch (masters + vouchers in one request) ────────────────

export function buildCombinedBatchXml(
  parties: TallyPartyMaster[],
  vouchers: TallyVoucher[],
  company: TallyCompanyInfo,
): string {
  const mastersXml = parties.map(p => buildLedgerMasterXml(p)).join('\n')
  const vouchersXml = vouchers.map(v => buildVoucherXml(v)).join('\n')
  const dataXml = mastersXml + '\n' + vouchersXml
  return envelope(importData('All Masters', company.name, dataXml))
}

// ── Utility: ERP data → Tally structure ───────────────────────────────

export function partyToTallyMaster(party: {
  name: string
  partyType?: string
  gstin?: string | null
  pan?: string | null
  address?: string | null
  state?: string | null
  stateCode?: string | null
  contact?: string | null
}): TallyPartyMaster {
  const parent = (party.partyType || '').toLowerCase().includes('vendor')
    ? 'Sundry Creditors'
    : 'Sundry Debtors'
  return {
    name: party.name,
    parent,
    gstin: party.gstin || undefined,
    pan: party.pan || undefined,
    address: party.address || undefined,
    state: party.state || undefined,
    stateCode: party.stateCode || undefined,
    contact: party.contact || undefined,
  }
}

export function invoiceToTallyVoucher(invoice: {
  invoiceNo: string
  invoiceDate: Date
  partyName: string
  taxableValue?: number
  cgstAmount?: number
  sgstAmount?: number
  igstAmount?: number
  grandTotal?: number
  gstValue?: number
  status?: string
  hsnSac?: string | null
  description?: string | null
}): TallyVoucher {
  const dateStr = formatTallyDate(invoice.invoiceDate)
  const taxable = invoice.taxableValue || 0
  const cgst = invoice.cgstAmount || 0
  const sgst = invoice.sgstAmount || 0
  const igst = invoice.igstAmount || 0
  const total = invoice.grandTotal || taxable + cgst + sgst + igst

  const entries: TallyVoucherEntry[] = [
    { ledgerName: 'Sales Account', amount: taxable, isDeemedPositive: false },
  ]
  if (cgst > 0) entries.push({ ledgerName: 'Output CGST', amount: cgst, isDeemedPositive: false })
  if (sgst > 0) entries.push({ ledgerName: 'Output SGST', amount: sgst, isDeemedPositive: false })
  if (igst > 0) entries.push({ ledgerName: 'Output IGST', amount: igst, isDeemedPositive: false })
  entries.push({ ledgerName: invoice.partyName, amount: -total, isDeemedPositive: true })

  return {
    voucherTypeName: invoice.status === 'Paid' ? 'Receipt' : 'Sales',
    voucherNumber: invoice.invoiceNo,
    date: dateStr,
    effectiveDate: dateStr,
    partyLedgerName: invoice.partyName,
    ledgerEntries: entries,
  }
}

export function paymentToTallyVoucher(payment: {
  voucherNo?: string | null
  paymentDate: Date
  amount: number
  invoiceNo?: string | null
  partyName: string
  mode?: string | null
}): TallyVoucher {
  const dateStr = formatTallyDate(payment.paymentDate)
  const entries: TallyVoucherEntry[] = [
    { ledgerName: payment.partyName, amount: payment.amount, isDeemedPositive: false },
    { ledgerName: 'Bank Account', amount: -payment.amount, isDeemedPositive: true },
  ]
  return {
    voucherTypeName: 'Payment',
    voucherNumber: payment.voucherNo || `PAY-${Date.now()}`,
    date: dateStr,
    partyLedgerName: payment.partyName,
    ledgerEntries: entries,
  }
}

export function journalEntryToTallyVoucher(je: {
  entryNo: string
  entryDate: Date
  description?: string | null
  lines: Array<{ accountName: string; debit: number; credit: number }>
}): TallyVoucher {
  const dateStr = formatTallyDate(je.entryDate)
  const entries: TallyVoucherEntry[] = []
  for (const line of je.lines) {
    if (line.debit > 0) {
      entries.push({ ledgerName: line.accountName, amount: line.debit, isDeemedPositive: false })
    }
    if (line.credit > 0) {
      entries.push({ ledgerName: line.accountName, amount: -line.credit, isDeemedPositive: true })
    }
  }
  return {
    voucherTypeName: 'Journal',
    voucherNumber: je.entryNo,
    date: dateStr,
    ledgerEntries: entries,
  }
}

function formatTallyDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}
