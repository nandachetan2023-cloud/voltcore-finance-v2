// ── Tally XML generation for ERP → Tally export ───────────────────────
// CA-Grade: FY-locked, GST/TDS compliant, cost-centre tagged, bill-wise
// Tally ERP 9 / Prime listens on port 9000, accepts XML via HTTP POST.

export interface TallyCompanyInfo {
  name: string
}

export interface TallyPartyMaster {
  name: string
  parent: string         // Sundry Debtors | Sundry Creditors
  gstin?: string
  pan?: string
  address?: string
  state?: string
  stateCode?: string
  contact?: string
  gstRegistrationType?: string // Regular|Composition|Unregistered|SEZ
  isBillWiseOn?: boolean
}

export interface TallyVoucherEntry {
  ledgerName: string
  amount: number         // positive = debit, negative = credit
  isDeemedPositive?: boolean
  costCentreAllocations?: Array<{ costCentre: string; amount: number }>
  billAllocations?: Array<{ billName: string; billType: string; amount: number }>
  hsnSac?: string
}

export interface TallyVoucher {
  voucherTypeName: string  // Sales, Purchase, Payment, Receipt, Contra, Journal, Credit Note, Receipt Note
  voucherNumber: string
  date: string             // YYYYMMDD
  effectiveDate?: string
  partyLedgerName?: string
  ledgerEntries: TallyVoucherEntry[]
  costCentre?: string
  jobCode?: string
  narration?: string
  placeOfSupply?: string
  gstRegistrationType?: string
}

// ── XML building blocks ────────────────────────────────────────────────

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function tag(name: string, content: string | number | boolean | null | undefined, indent = 0): string {
  const pad = '  '.repeat(indent)
  if (content === null || content === undefined || content === '') return `${pad}<${name} />\n`
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

// ── Helpers ────────────────────────────────────────────────────────────

export function deriveFinYear(d: Date): string {
  const y = d.getFullYear()
  const m = d.getMonth() // 0-indexed
  // Apr-Mar: e.g. 2025-04-01 => 2025-26, 2026-02-15 => 2025-26
  if (m >= 3) return `${y}-${String(y+1).slice(-2)}`
  return `${y-1}-${String(y).slice(-2)}`
}

export function formatTallyDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function validateBalanced(entries: TallyVoucherEntry[]): void {
  const sum = entries.reduce((s, e) => s + e.amount, 0)
  if (Math.abs(sum) > 0.01) {
    throw new Error(`Unbalanced voucher: Σ amount = ${sum.toFixed(2)} (must be 0) — ${entries.map(e=>`${e.ledgerName}:${e.amount}`).join(', ')}`)
  }
}

// ── Master XML builders ────────────────────────────────────────────────

export function buildLedgerMasterXml(party: TallyPartyMaster): string {
  // CA Fix: ISDEEMEDPOSITIVE depends on Sundry Creditors vs Debtors; correct tags
  const isCreditors = party.parent === 'Sundry Creditors'
  const fields = [
    tag('NAME', party.name, 2),
    tag('PARENT', party.parent, 2),
    tag('ISDEEMEDPOSITIVE', isCreditors ? 'Yes' : 'No', 2),
    tag('ISBILLWISEON', party.isBillWiseOn !== false ? 'Yes' : 'No', 2),
    party.gstin ? tag('GSTIN', party.gstin, 2) : '',
    party.gstin ? tag('PARTYGSTIN', party.gstin, 2) : '',
    party.pan ? tag('INCOMETAXNUMBER', party.pan, 2) : '',
    party.address ? block('LEDGERMAILINGDETAILS.LIST', tag('ADDRESS', party.address, 3) + (party.state ? tag('STATE', party.state, 3) : ''), 2) : '',
    party.state ? tag('LEDSTATENAME', party.state, 2) : '',
    party.stateCode ? tag('STATECODE', party.stateCode, 2) : '',
    party.contact ? tag('LEDGERCONTACT', party.contact, 2) : '',
    party.gstRegistrationType ? tag('GSTREGISTRATIONTYPE', party.gstRegistrationType, 2) : tag('GSTREGISTRATIONTYPE', party.gstin ? 'Regular' : 'Unregistered', 2),
    tag('COUNTRYNAME', 'India', 2),
    tag('LANGUAGENAME', party.name, 2),
  ]
  return block('TALLYMESSAGE', block('LEDGER', fields.join(''), 1), 0)
}

export function buildMastersBatchXml(parties: TallyPartyMaster[], company: TallyCompanyInfo): string {
  const dataXml = parties.map(p => buildLedgerMasterXml(p)).join('\n')
  return envelope(importData('All Masters', company.name, dataXml))
}

// ── Voucher XML builders ───────────────────────────────────────────────

function buildCostCentreAllocXml(allocs: Array<{ costCentre: string; amount: number }>): string {
  if (!allocs || allocs.length === 0) return ''
  const inner = allocs.map(a =>
    block('COSTCENTREALLOCATIONS.LIST',
      tag('COSTCENTRENAME', a.costCentre, 3) + tag('AMOUNT', a.amount, 3), 2)
  ).join('\n')
  return inner
}

function buildBillAllocXml(allocs: Array<{ billName: string; billType: string; amount: number }>): string {
  if (!allocs || allocs.length === 0) return ''
  const inner = allocs.map(a =>
    block('BILLALLOCATIONS.LIST',
      tag('NAME', a.billName, 3) + tag('BILLTYPE', a.billType, 3) + tag('AMOUNT', a.amount, 3), 2)
  ).join('\n')
  return inner
}

function buildLedgerEntryXml(entry: TallyVoucherEntry, indent = 4): string {
  const costCentreXml = entry.costCentreAllocations ? buildCostCentreAllocXml(entry.costCentreAllocations) : ''
  const billAllocXml = entry.billAllocations ? buildBillAllocXml(entry.billAllocations) : ''
  const inner = tag('LEDGERNAME', entry.ledgerName, indent) +
    tag('ISDEEMEDPOSITIVE', entry.isDeemedPositive ? 'Yes' : 'No', indent) +
    tag('AMOUNT', entry.amount, indent) +
    costCentreXml + billAllocXml
  return block('LEDGERENTRY', inner, indent - 1)
}

export function buildVoucherXml(v: TallyVoucher): string {
  validateBalanced(v.ledgerEntries)
  const entriesXml = v.ledgerEntries.map(e => buildLedgerEntryXml(e)).join('\n')
  const voucherBody = [
    tag('DATE', v.date, 2),
    tag('VOUCHERTYPENAME', v.voucherTypeName, 2),
    tag('VOUCHERNUMBER', v.voucherNumber, 2),
    v.partyLedgerName ? tag('PARTYLEDGERNAME', v.partyLedgerName, 2) : '',
    tag('EFFECTIVEDATE', v.effectiveDate || v.date, 2),
    v.narration ? tag('NARRATION', v.narration, 2) : '',
    v.placeOfSupply ? tag('PLACEOFSUPPLY', v.placeOfSupply, 2) : '',
    v.gstRegistrationType ? tag('GSTREGISTRATIONTYPE', v.gstRegistrationType, 2) : '',
    v.costCentre ? tag('COSTCENTRE', v.costCentre, 2) : '',
    v.jobCode ? tag('JOBCODE', v.jobCode, 2) : '',
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
  gstTreatment?: string | null
}): TallyPartyMaster {
  const parent = (party.partyType || '').toLowerCase().includes('vendor')
    ? 'Sundry Creditors'
    : 'Sundry Debtors'
  const gstRegType = party.gstTreatment === 'Composition' ? 'Composition'
    : party.gstTreatment === 'Unregistered' ? 'Unregistered'
    : party.gstin ? 'Regular' : 'Unregistered'
  return {
    name: party.name,
    parent,
    gstin: party.gstin || undefined,
    pan: party.pan || undefined,
    address: party.address || undefined,
    state: party.state || undefined,
    stateCode: party.stateCode || undefined,
    contact: party.contact || undefined,
    gstRegistrationType: gstRegType,
    isBillWiseOn: true,
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
  cessAmount?: number
  grandTotal?: number
  gstValue?: number
  tdsDeduction?: number
  retentionAmount?: number
  kpiDeduction?: number
  safetyDeduction?: number
  roundoffAmount?: number
  hsnSac?: string | null
  description?: string | null
  placeOfSupply?: string | null
  costCentre?: string | null
  jobCode?: string | null
  department?: string | null
}): TallyVoucher {
  const dateStr = formatTallyDate(invoice.invoiceDate)
  const taxable = invoice.taxableValue || 0
  const cgst = invoice.cgstAmount || 0
  const sgst = invoice.sgstAmount || 0
  const igst = invoice.igstAmount || 0
  const cess = invoice.cessAmount || 0
  const tds = invoice.tdsDeduction || 0
  const retention = invoice.retentionAmount || 0
  const kpi = invoice.kpiDeduction || 0
  const safety = invoice.safetyDeduction || 0
  const roundoff = invoice.roundoffAmount || 0
  const total = invoice.grandTotal || taxable + cgst + sgst + igst + cess

  // CA Fix: always Sales, bill-wise, with GST ledgers, TDS/Retention as separate ledgers
  // Dr Party (with BILLALLOCATIONS New Ref), Cr Sales, Cr GST, Dr TDS/Retention if applicable, validate balanced
  const entries: TallyVoucherEntry[] = []
  const costCentre = invoice.costCentre || invoice.jobCode || undefined
  const alloc = costCentre ? [{ costCentre, amount: taxable }] : undefined

  // Cr Sales Account
  entries.push({ ledgerName: 'Sales Account', amount: -taxable, isDeemedPositive: true, costCentreAllocations: alloc, hsnSac: invoice.hsnSac || undefined })
  if (cgst > 0) entries.push({ ledgerName: 'Output CGST', amount: -cgst, isDeemedPositive: true })
  if (sgst > 0) entries.push({ ledgerName: 'Output SGST', amount: -sgst, isDeemedPositive: true })
  if (igst > 0) entries.push({ ledgerName: 'Output IGST', amount: -igst, isDeemedPositive: true })
  if (cess > 0) entries.push({ ledgerName: 'Output Cess', amount: -cess, isDeemedPositive: true })
  if (roundoff !== 0) entries.push({ ledgerName: 'Round Off', amount: -roundoff, isDeemedPositive: roundoff > 0 })
  // Dr Party (net after TDS/retentions)
  const netAmount = total - tds - retention - kpi - safety
  entries.push({
    ledgerName: invoice.partyName,
    amount: netAmount,
    isDeemedPositive: false,
    billAllocations: [{ billName: invoice.invoiceNo, billType: 'New Ref', amount: netAmount }],
  })
  // Dr TDS Receivable / Retention (assets) — debit positive
  if (tds > 0) entries.push({ ledgerName: 'TDS Receivable', amount: tds, isDeemedPositive: false })
  if (retention > 0) entries.push({ ledgerName: 'Retention Receivable', amount: retention, isDeemedPositive: false })
  if (kpi > 0) entries.push({ ledgerName: 'KPI Deduction', amount: kpi, isDeemedPositive: false })
  if (safety > 0) entries.push({ ledgerName: 'Safety Deduction', amount: safety, isDeemedPositive: false })

  // Adjust for TDS/Retention: reduce Party debit (client pays net)
  if (tds + retention + kpi + safety > 0) {
    const partyEntry = entries.find(e => e.ledgerName === invoice.partyName)
    if (partyEntry) partyEntry.amount = total - tds - retention - kpi - safety
  }

  return {
    voucherTypeName: 'Sales',
    voucherNumber: invoice.invoiceNo,
    date: dateStr,
    effectiveDate: dateStr,
    partyLedgerName: invoice.partyName,
    narration: invoice.description || undefined,
    placeOfSupply: invoice.placeOfSupply || undefined,
    costCentre: invoice.costCentre || undefined,
    jobCode: invoice.jobCode || undefined,
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
  bankAccountName?: string
  instrumentNumber?: string
  instrumentDate?: Date
  costCentre?: string | null
  isReceipt?: boolean
}): TallyVoucher {
  const dateStr = formatTallyDate(payment.paymentDate)
  const isReceipt = payment.isReceipt || false
  const bankLedger = payment.bankAccountName || 'Bank Account'
  const entries: TallyVoucherEntry[] = isReceipt
    ? [
        { ledgerName: bankLedger, amount: payment.amount, isDeemedPositive: false },
        { ledgerName: payment.partyName, amount: -payment.amount, isDeemedPositive: true, billAllocations: payment.invoiceNo ? [{ billName: payment.invoiceNo, billType: 'Agst Ref', amount: -payment.amount }] : undefined },
      ]
    : [
        { ledgerName: payment.partyName, amount: payment.amount, isDeemedPositive: false, billAllocations: payment.invoiceNo ? [{ billName: payment.invoiceNo, billType: 'Agst Ref', amount: payment.amount }] : undefined },
        { ledgerName: bankLedger, amount: -payment.amount, isDeemedPositive: true },
      ]
  // BANKALLOCATIONS for instrument details would go here if needed
  return {
    voucherTypeName: isReceipt ? 'Receipt' : 'Payment',
    voucherNumber: payment.voucherNo || `PAY-${formatTallyDate(payment.paymentDate)}-${String(Date.now()).slice(-4)}`,
    date: dateStr,
    partyLedgerName: payment.partyName,
    ledgerEntries: entries,
    costCentre: payment.costCentre || undefined,
  }
}

export function journalEntryToTallyVoucher(je: {
  entryNo: string
  entryDate: Date
  description?: string | null
  costCentre?: string | null
  jobCode?: string | null
  lines: Array<{ accountName: string; debit: number; credit: number; costCentre?: string | null; jobCode?: string | null }>
}): TallyVoucher {
  const dateStr = formatTallyDate(je.entryDate)
  const entries: TallyVoucherEntry[] = []
  for (const line of je.lines) {
    const cc = line.costCentre || je.costCentre || undefined
    const alloc = cc ? [{ costCentre: cc, amount: line.debit || -line.credit }] : undefined
    if (line.debit > 0) {
      entries.push({ ledgerName: line.accountName, amount: line.debit, isDeemedPositive: false, costCentreAllocations: alloc })
    }
    if (line.credit > 0) {
      entries.push({ ledgerName: line.accountName, amount: -line.credit, isDeemedPositive: true, costCentreAllocations: alloc })
    }
  }
  validateBalanced(entries)
  return {
    voucherTypeName: 'Journal',
    voucherNumber: je.entryNo,
    date: dateStr,
    narration: je.description || undefined,
    costCentre: je.costCentre || undefined,
    jobCode: je.jobCode || undefined,
    ledgerEntries: entries,
  }
}

export function creditNoteToTallyVoucher(cn: {
  creditNoteNo: string
  date: Date
  partyName: string
  amount: number
  gstValue: number
  cgstAmount?: number
  sgstAmount?: number
  igstAmount?: number
  invoiceNo?: string
  reason?: string
  costCentre?: string | null
}): TallyVoucher {
  const dateStr = formatTallyDate(cn.date)
  const cgst = cn.cgstAmount || 0
  const sgst = cn.sgstAmount || 0
  const igst = cn.igstAmount || 0
  const taxable = cn.amount
  const gst = cn.gstValue || cgst + sgst + igst
  const total = taxable + gst
  const entries: TallyVoucherEntry[] = [
    { ledgerName: cn.partyName, amount: -total, isDeemedPositive: true, billAllocations: cn.invoiceNo ? [{ billName: cn.invoiceNo, billType: 'Agst Ref', amount: -total }] : undefined },
    { ledgerName: 'Sales Account', amount: taxable, isDeemedPositive: false },
  ]
  if (cgst > 0) entries.push({ ledgerName: 'Output CGST', amount: cgst, isDeemedPositive: false })
  if (sgst > 0) entries.push({ ledgerName: 'Output SGST', amount: sgst, isDeemedPositive: false })
  if (igst > 0) entries.push({ ledgerName: 'Output IGST', amount: igst, isDeemedPositive: false })
  return {
    voucherTypeName: 'Credit Note',
    voucherNumber: cn.creditNoteNo,
    date: dateStr,
    partyLedgerName: cn.partyName,
    narration: cn.reason || undefined,
    costCentre: cn.costCentre || undefined,
    ledgerEntries: entries,
  }
}

export function purchaseToTallyVoucher(po: {
  poNo: string
  date: Date
  partyName: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  cgstAmount?: number
  sgstAmount?: number
  igstAmount?: number
  costCentre?: string | null
  jobCode?: string | null
}): TallyVoucher {
  const dateStr = formatTallyDate(po.date)
  const cgst = po.cgstAmount || 0
  const sgst = po.sgstAmount || 0
  const igst = po.igstAmount || 0
  const entries: TallyVoucherEntry[] = [
    { ledgerName: 'Purchase Account', amount: po.subtotal, isDeemedPositive: false, costCentreAllocations: po.costCentre ? [{ costCentre: po.costCentre, amount: po.subtotal }] : undefined },
  ]
  if (cgst > 0) entries.push({ ledgerName: 'Input CGST', amount: cgst, isDeemedPositive: false })
  if (sgst > 0) entries.push({ ledgerName: 'Input SGST', amount: sgst, isDeemedPositive: false })
  if (igst > 0) entries.push({ ledgerName: 'Input IGST', amount: igst, isDeemedPositive: false })
  entries.push({ ledgerName: po.partyName, amount: -po.totalAmount, isDeemedPositive: true, billAllocations: [{ billName: po.poNo, billType: 'New Ref', amount: -po.totalAmount }] })
  return {
    voucherTypeName: 'Purchase',
    voucherNumber: po.poNo,
    date: dateStr,
    partyLedgerName: po.partyName,
    costCentre: po.costCentre || undefined,
    jobCode: po.jobCode || undefined,
    ledgerEntries: entries,
  }
}
