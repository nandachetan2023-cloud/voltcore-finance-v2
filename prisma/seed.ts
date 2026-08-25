import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const now = new Date()

// ── Date helpers ───────────────────────────────────────────────────
// Seed data is anchored to "today" so the ageing buckets (0-30 / 31-60 /
// 61-90 / 90+) and the daily/monthly reports always have meaningful spread
// no matter when the seed is run.
const TODAY = new Date()
const daysAgo = (n: number) => { const d = new Date(TODAY); d.setDate(d.getDate() - n); d.setHours(0, 0, 0, 0); return d }
const daysAhead = (n: number) => daysAgo(-n)
const monthKey = (d: Date) => d.toLocaleString('en-US', { month: 'short' }) + '-' + String(d.getFullYear()).slice(-2)

// Home state for GST: intra-state supply gets CGST+SGST, inter-state gets IGST.
const HOME_STATE_CODE = '27' // Maharashtra
const gstSplit = (taxable: number, stateCode: string, rate = 0.18) => {
  const tax = Math.round(taxable * rate)
  return stateCode === HOME_STATE_CODE
    ? { cgstAmount: Math.round(tax / 2), sgstAmount: Math.round(tax / 2), igstAmount: 0, gstValue: tax }
    : { cgstAmount: 0, sgstAmount: 0, igstAmount: tax, gstValue: tax }
}

async function wipe() {
  console.log('🧹 Clearing existing sample data...')
  // Children before parents. Each wrapped so a missing/empty table can't abort the run.
  const tables = [
    // Site Store Management — FKs into Site/Job/PO/Item, so clear first.
    () => db.finPhysicalVerification.deleteMany(), () => db.finScrapEntry.deleteMany(),
    () => db.finGatePass.deleteMany(), () => db.finEquipment.deleteMany(), () => db.finTool.deleteMany(),
    () => db.finMaterialReturn.deleteMany(), () => db.finStoreIssue.deleteMany(),
    () => db.finMaterialRequisition.deleteMany(), () => db.finStoreGrn.deleteMany(),
    () => db.finJob.deleteMany(),
    () => db.finProject.deleteMany(),
    () => db.finApprovalLog.deleteMany(), () => db.finPRApproval.deleteMany(),
    () => db.finPRLineItem.deleteMany(), () => db.finPurchaseRequisition.deleteMany(),
    () => db.finRFQBid.deleteMany(), () => db.finRFQLineItem.deleteMany(), () => db.finRFQ.deleteMany(),
    () => db.finSubcontractRetentionRelease.deleteMany(), () => db.finSubcontractProgressClaim.deleteMany(),
    () => db.finMootBill.deleteMany(), () => db.finMaterialIssue.deleteMany(), () => db.finStockLedger.deleteMany(),
    () => db.finReceipt.deleteMany(), () => db.finMaterialReceipt.deleteMany(),
    () => db.finVendor.deleteMany(),
    () => db.finPO.deleteMany(),
() => db.finBoqItem.deleteMany(), () => db.finBoq.deleteMany(),
() => db.finMilestone.deleteMany(), () => db.finProjectProgress.deleteMany(),
    () => db.finSubcontractMilestone.deleteMany(), () => db.finSubcontract.deleteMany(),
    () => db.finMaterialTrackingItem.deleteMany(),
    () => db.finPaymentAdviceLine.deleteMany(), () => db.finPaymentAdvice.deleteMany(),
    () => db.finPayment.deleteMany(), () => db.finOutstanding.deleteMany(),
    () => db.finCreditNote.deleteMany(), () => db.finTdsDeduction.deleteMany(),
    () => db.finFollowUp.deleteMany(), () => db.finClientFollowUp.deleteMany(), () => db.finAlert.deleteMany(),
    () => db.finInvoiceDeduction.deleteMany(),
    () => db.finExpenseItem.deleteMany(), () => db.finExpenseClaim.deleteMany(),
    () => db.finPettyCash.deleteMany(),
    () => db.finPOItem.deleteMany(), () => db.finPurchaseOrder.deleteMany(),
    () => db.finInvoice.deleteMany(),
    () => db.finJournalLine.deleteMany(), () => db.finJournalEntry.deleteMany(),
    () => db.finBudgetLine.deleteMany(), () => db.finBudget.deleteMany(),
    () => db.finAssetDepreciation.deleteMany(), () => db.finAsset.deleteMany(),
    () => db.finArea.deleteMany(),
    () => db.finOppStageHistory.deleteMany(), () => db.finOppGoNoGo.deleteMany(),
    () => db.finOpportunityCompetitor.deleteMany(), () => db.finOpportunityBidCost.deleteMany(),
    () => db.finOpportunityDocument.deleteMany(), () => db.finOpportunityContact.deleteMany(),
    () => db.finOpportunity.deleteMany(),
    () => db.finTenderEvaluation.deleteMany(), () => db.finTenderBidTeam.deleteMany(),
    () => db.finTenderDocument.deleteMany(), () => db.finTender.deleteMany(),
    () => db.finClientOpportunity.deleteMany(), () => db.finClientProject.deleteMany(),
    () => db.finClientContact.deleteMany(), () => db.finClient.deleteMany(),
    () => db.finParty.deleteMany(), () => db.finSite.deleteMany(),
    () => db.finAccount.deleteMany(),
    () => db.bankTransaction.deleteMany(), () => db.bankAccount.deleteMany(),
    () => db.accountsPayable.deleteMany(), () => db.accountsReceivable.deleteMany(),
    () => db.journalEntry.deleteMany(), () => db.ledgerAccount.deleteMany(),
    () => db.taxRecord.deleteMany(), () => db.budgetItem.deleteMany(),
    () => db.profitLossEntry.deleteMany(),
    () => db.salesTaxInvoiceItem.deleteMany(), () => db.salesTaxInvoice.deleteMany(),
    () => db.quotationItem.deleteMany(), () => db.quotation.deleteMany(),
    () => db.salesOrderItem.deleteMany(), () => db.salesOrder.deleteMany(),
    () => db.invoice.deleteMany(), () => db.purchaseOrder.deleteMany(),
    () => db.customer.deleteMany(),
  ]
  for (const t of tables) { try { await t() } catch { /* table empty or absent */ } }
}

async function main() {
  console.log('🌱 Seeding Finance, Procurement & Sales sample data...')
  await wipe()

  // ── Organization & people (reuse if already present) ─────────────
  const branch = await db.branch.findFirst() ?? await db.branch.create({ data: { name: 'Head Office Mumbai' } })
  const dept = await db.department.findFirst() ?? await db.department.create({ data: { name: 'Project Execution', code: 'DEPT-PE' } })

  // ── Parties (customers / vendors / employees) ─────────────────────
  const partySeed = [
    { code: 'C001', name: 'L&T Construction', shortName: 'L&T', partyType: 'Customer', gstin: '27AABCL1234Q1Z1', pan: 'AABCL1234Q', address: 'Powai, Mumbai', state: 'Maharashtra', stateCode: '27', contact: '+91-9876543210', tdsSection: '194C', tdsRate: 2, paymentTerms: 'Net 45' },
    { code: 'C002', name: 'Tata Projects Ltd', shortName: 'Tata Proj', partyType: 'Customer', gstin: '24AABCT9012L1Z1', pan: 'AABCT9012L', address: 'Ahmedabad, Gujarat', state: 'Gujarat', stateCode: '24', contact: '+91-9876543212', tdsSection: '194C', tdsRate: 2, paymentTerms: 'Net 30' },
    { code: 'C003', name: 'NTPC Limited', shortName: 'NTPC', partyType: 'Customer', gstin: '07AABCN1234P1Z1', pan: 'AABCN1234P', address: 'Scope Complex, New Delhi', state: 'Delhi', stateCode: '07', contact: '+91-9876543213', tdsSection: '194C', tdsRate: 2, paymentTerms: 'Net 60' },
    { code: 'C004', name: 'BALCO Industries', shortName: 'BALCO', partyType: 'Customer', gstin: '22AABCB9012K1Z1', pan: 'AABCB9012K', address: 'Korba, Chhattisgarh', state: 'Chhattisgarh', stateCode: '22', contact: '+91-9876543215', tdsSection: '194C', tdsRate: 2, paymentTerms: 'Net 45' },
    { code: 'C005', name: 'Coal India Limited', shortName: 'CIL', partyType: 'Customer', gstin: '19AABCC1234R1Z1', pan: 'AABCC1234R', address: 'Kolkata, West Bengal', state: 'West Bengal', stateCode: '19', contact: '+91-9876543216', tdsSection: '194C', tdsRate: 2, paymentTerms: 'Net 60' },
    { code: 'C006', name: 'Adani Power Ltd', shortName: 'Adani', partyType: 'Customer', gstin: '24AAACA1234M1Z6', pan: 'AAACA1234M', address: 'Ahmedabad, Gujarat', state: 'Gujarat', stateCode: '24', contact: '+91-9876543220', tdsSection: '194C', tdsRate: 2, paymentTerms: 'Net 30' },
    { code: 'V001', name: 'Siemens India Ltd', shortName: 'Siemens', partyType: 'Vendor', gstin: '29AABCS5678R1Z1', pan: 'AABCS5678R', address: 'Bengaluru, Karnataka', state: 'Karnataka', stateCode: '29', contact: '+91-9876543211', tdsSection: '194C', tdsRate: 2, paymentTerms: 'Net 30' },
    { code: 'V002', name: 'Steel India Pvt Ltd', shortName: 'Steel India', partyType: 'Vendor', gstin: '27AACCS1234F1Z5', pan: 'AACCS1234F', address: 'Bhiwandi, Maharashtra', state: 'Maharashtra', stateCode: '27', contact: '+91-9876543221', tdsSection: '194C', tdsRate: 1, paymentTerms: 'Net 45' },
    { code: 'V003', name: 'RK Electricals', shortName: 'RK Elec', partyType: 'Vendor', gstin: '29AAECR5678K1Z2', pan: 'AAECR5678K', address: 'Hosur, Karnataka', state: 'Karnataka', stateCode: '29', contact: '+91-9876543222', tdsSection: '194C', tdsRate: 1, paymentTerms: 'Net 30' },
    { code: 'V004', name: 'Ramesh Transport Services', shortName: 'Ramesh Trans', partyType: 'Vendor', gstin: '22AABCR5678H1Z1', pan: 'AABCR5678H', address: 'Raipur, Chhattisgarh', state: 'Chhattisgarh', stateCode: '22', contact: '+91-9876543217', udyam: 'UDYAM-CT-01-0003456', tdsSection: '194C', tdsRate: 1, paymentTerms: 'Net 15' },
    { code: 'V005', name: 'Design Associates', shortName: 'Design Assoc', partyType: 'Vendor', gstin: '27AAFFD4321N1Z8', pan: 'AAFFD4321N', address: 'Pune, Maharashtra', state: 'Maharashtra', stateCode: '27', contact: '+91-9876543223', tdsSection: '194J', tdsRate: 10, paymentTerms: 'Net 30' },
    { code: 'E001', name: 'Sunil Verma (Employee Advance)', shortName: 'Sunil Verma', partyType: 'Employee', pan: 'IIIII8888I', address: 'Mumbai, Maharashtra', state: 'Maharashtra', stateCode: '27', contact: '+91-9876543218', tdsSection: '192', tdsRate: 10, paymentTerms: 'Immediate' },
  ]
  const parties = [] as { id: number; name: string; code: string | null; stateCode: string | null }[]
  for (const p of partySeed) parties.push(await db.finParty.create({ data: { ...p, gstTreatment: 'Registered', isActive: true } }) as any)
  const byCode = (c: string) => parties.find(p => p.code === c)!
  const CUST = { lnt: byCode('C001'), tata: byCode('C002'), ntpc: byCode('C003'), balco: byCode('C004'), cil: byCode('C005'), adani: byCode('C006') }
  const VEND = { siemens: byCode('V001'), steel: byCode('V002'), rk: byCode('V003'), transport: byCode('V004'), design: byCode('V005') }

  // ── Sites ─────────────────────────────────────────────────────────
  const siteSeed = [
    { siteCode: 'SITE-001', name: 'TPP Adani Godda', location: 'Godda, Jharkhand', state: 'Jharkhand', projectType: 'Thermal Power', responsiblePerson: 'Rajesh Kumar', contactPerson: 'Rajesh Kumar', contactPhone: '+91-9876543210', contactEmail: 'rajesh@godda.adani.in', budget: 62000000, customerId: CUST.adani.id, startDate: daysAgo(420), endDate: daysAhead(240) },
    { siteCode: 'SITE-002', name: 'TPP NTPC Barh', location: 'Barh, Bihar', state: 'Bihar', projectType: 'Thermal Power', responsiblePerson: 'Ankit Verma', contactPerson: 'Ankit Verma', contactPhone: '+91-9876543211', contactEmail: 'ankit.verma@ntpc.co.in', budget: 48000000, customerId: CUST.ntpc.id, startDate: daysAgo(300), endDate: daysAhead(360) },
    { siteCode: 'SITE-003', name: 'HO Mumbai', location: 'Andheri East, Mumbai', state: 'Maharashtra', projectType: 'Head Office', responsiblePerson: 'Suresh Mahto', contactPerson: 'Suresh Mahto', contactPhone: '+91-9876543212', contactEmail: 'ho@voltcore.in', budget: 9000000, customerId: null, startDate: null, endDate: null },
    { siteCode: 'SITE-004', name: 'BALCO Smelter Korba', location: 'Korba, Chhattisgarh', state: 'Chhattisgarh', projectType: 'Smelter', responsiblePerson: 'Prakash Sahu', contactPerson: 'Prakash Sahu', contactPhone: '+91-9876543213', contactEmail: 'prakash@balco.in', budget: 38000000, customerId: CUST.balco.id, startDate: daysAgo(180), endDate: daysAhead(540) },
    { siteCode: 'SITE-005', name: 'Coal India Rajmahal', location: 'Rajmahal, Jharkhand', state: 'Jharkhand', projectType: 'Mining', responsiblePerson: 'Deepak Mishra', contactPerson: 'Deepak Mishra', contactPhone: '+91-9876543214', contactEmail: 'deepak@coalindia.in', budget: 27000000, customerId: CUST.cil.id, startDate: daysAgo(90), endDate: daysAhead(630) },
  ]
  const sites = [] as { id: number; siteCode: string; name: string }[]
  for (const s of siteSeed) sites.push(await db.finSite.create({ data: { ...s, status: 'Active' } }))
  const [S1, S2, S3, S4, S5] = sites

  // Job codes — one live job per site, used for Job-wise profitability.
  const JOB = { s1: 'JOB-2026-001', s2: 'JOB-2026-002', s3: 'JOB-2026-003', s4: 'JOB-2026-004', s5: 'JOB-2026-005' }

  // ── Receipts (money received against customer invoices) ────────────
  const receiptSeed = [
    { partyName: CUST.ntpc.name, invoiceRef: 'INV-2026-011', amount: 4850000, mode: 'NEFT', bankRef: 'NEFT-88421', jobCode: JOB.s2, siteCode: S2.siteCode, daysAgo: 9 },
    { partyName: CUST.adani.name, invoiceRef: 'INV-2026-014', amount: 2100000, mode: 'Cheque', bankRef: 'CHQ-00218', jobCode: JOB.s1, siteCode: S1.siteCode, daysAgo: 4 },
    { partyName: CUST.balco.name, invoiceRef: 'INV-2026-018', amount: 975000, mode: 'UPI', bankRef: 'UPI-33412', jobCode: JOB.s4, siteCode: S4.siteCode, daysAgo: 1 },
  ]
  let rNo = 0
  for (const r of receiptSeed) {
    rNo++
    await db.finReceipt.create({
      data: {
        receiptNo: `RCT-${TODAY.getFullYear()}-${String(rNo).padStart(3, '0')}`,
        receiptDate: daysAgo(r.daysAgo),
        partyName: r.partyName, invoiceRef: r.invoiceRef, amount: r.amount,
        mode: r.mode, bankRef: r.bankRef, jobCode: r.jobCode, siteCode: r.siteCode,
      },
    })
  }

  // ── Material Receipts (GRN against purchase orders) ────────────────
  const grnSeed = [
    { poRef: 'PO-2026-055', itemName: 'Structural Steel ISMB 300', vendorName: VEND.steel.name, qtyReceived: 40, qtyPO: 50, unit: 'MT', rate: 18000, siteCode: S2.siteCode, jobCode: JOB.s2, daysAgo: 7 },
    { poRef: 'PO-2026-058', itemName: '33kV XLPE Cable', vendorName: VEND.rk.name, qtyReceived: 1200, qtyPO: 1500, unit: 'Mtr', rate: 900, siteCode: S1.siteCode, jobCode: JOB.s1, daysAgo: 3 },
    { poRef: 'PO-2026-061', itemName: 'OPC 53 Grade Cement', vendorName: VEND.siemens.name, qtyReceived: 250, qtyPO: 250, unit: 'MT', rate: 2500, siteCode: S4.siteCode, jobCode: JOB.s4, daysAgo: 1 },
  ]
  let gNo = 0
  for (const g of grnSeed) {
    gNo++
    await db.finMaterialReceipt.create({
      data: {
        grnNo: `GRN-${TODAY.getFullYear()}-${String(100 + gNo)}`,
        grnDate: daysAgo(g.daysAgo),
        poRef: g.poRef, itemName: g.itemName, vendorName: g.vendorName,
        qtyReceived: g.qtyReceived, qtyPO: g.qtyPO, unit: g.unit, rate: g.rate,
        value: g.qtyReceived * g.rate, siteCode: g.siteCode, jobCode: g.jobCode, status: 'Received',
      },
    })
  }

  // ── Chart of Accounts (hierarchical, per the Finance spec) ────────
  const coaGroups = [
    { code: '1000', name: 'Assets', type: 'Asset', group: 'Assets', children: [
      { code: '1001', name: 'Cash', bal: 450000 }, { code: '1002', name: 'Bank', bal: 3280000 },
      { code: '1003', name: 'Petty Cash', bal: 32600 }, { code: '1004', name: 'Accounts Receivable', bal: 4200000 },
      { code: '1005', name: 'Inventory', bal: 1800000 }, { code: '1006', name: 'Fixed Assets', bal: 6500000 } ] },
    { code: '2000', name: 'Liabilities', type: 'Liability', group: 'Liabilities', children: [
      { code: '2001', name: 'Vendor Payable', bal: 3820000 }, { code: '2002', name: 'GST Payable', bal: 640000 },
      { code: '2003', name: 'TDS Payable', bal: 118000 }, { code: '2004', name: 'Salary Payable', bal: 370000 },
      { code: '2005', name: 'Term Loan', bal: 2500000 } ] },
    { code: '3000', name: 'Equity', type: 'Equity', group: 'Capital', children: [
      { code: '3001', name: 'Share Capital', bal: 6000000 }, { code: '3002', name: 'Retained Earnings', bal: 2814600 } ] },
    { code: '4000', name: 'Income', type: 'Income', group: 'Income', children: [
      { code: '4001', name: 'Project Revenue', bal: 7800000 }, { code: '4002', name: 'Service Revenue', bal: 2200000 },
      { code: '4003', name: 'Material Sales', bal: 620000 } ] },
    { code: '5000', name: 'Expenses', type: 'Expense', group: 'Expense', children: [
      { code: '5001', name: 'Payroll Expense', bal: 1400000 }, { code: '5002', name: 'Labour Expense', bal: 2000000 },
      { code: '5003', name: 'Material Consumption', bal: 3200000 }, { code: '5004', name: 'Vehicle Expense', bal: 600000 },
      { code: '5005', name: 'Office Expense', bal: 300000 } ] },
  ]
  const accByCode: Record<string, { id: number }> = {}
  for (const g of coaGroups) {
    const parent = await db.finAccount.create({ data: { accountCode: g.code, name: g.name, group: g.group, type: g.type } })
    accByCode[g.code] = parent
    for (const c of g.children) {
      accByCode[c.code] = await db.finAccount.create({ data: { accountCode: c.code, name: c.name, group: g.group, type: g.type, parentId: parent.id } })
      // Mirror into the legacy LedgerAccount table — this is what the Balance Sheet report reads.
      await db.ledgerAccount.create({ data: { accountCode: c.code, name: c.name, group: g.group, type: g.type, parentAccount: g.name, balance: c.bal, status: 'Active' } })
    }
  }

  // ── Sales invoices (GST register + AR ageing source) ──────────────
  // dueDay drives which ageing bucket each invoice lands in.
  const invoiceSeed = [
    { no: 'INV-2026-001', site: S1, party: CUST.lnt,   job: JOB.s1, taxable: 2500000, issuedDay: 150, dueDay: 120, received: 0,       desc: 'Boiler erection — Phase 1 RA bill' },
    { no: 'INV-2026-002', site: S2, party: CUST.ntpc,  job: JOB.s2, taxable: 1800000, issuedDay: 128, dueDay: 98,  received: 600000,  desc: 'Structural steel fabrication' },
    { no: 'INV-2026-003', site: S4, party: CUST.balco, job: JOB.s4, taxable: 3200000, issuedDay: 105, dueDay: 75,  received: 1200000, desc: 'Potline expansion works' },
    { no: 'INV-2026-004', site: S5, party: CUST.cil,   job: JOB.s5, taxable: 1450000, issuedDay: 92,  dueDay: 62,  received: 0,       desc: 'Coal handling plant upgrade' },
    { no: 'INV-2026-005', site: S1, party: CUST.lnt,   job: JOB.s1, taxable: 2100000, issuedDay: 78,  dueDay: 48,  received: 2100000, desc: 'Boiler erection — Phase 2 RA bill' },
    { no: 'INV-2026-006', site: S2, party: CUST.tata,  job: JOB.s2, taxable: 980000,  issuedDay: 60,  dueDay: 30,  received: 400000,  desc: 'TG deck civil works' },
    { no: 'INV-2026-007', site: S4, party: CUST.balco, job: JOB.s4, taxable: 1650000, issuedDay: 44,  dueDay: 14,  received: 0,       desc: 'Smelter maintenance contract' },
    { no: 'INV-2026-008', site: S5, party: CUST.adani, job: JOB.s5, taxable: 2750000, issuedDay: 30,  dueDay: 0,   received: 0,       desc: 'Conveyor system installation' },
    { no: 'INV-2026-009', site: S1, party: CUST.ntpc,  job: JOB.s1, taxable: 1320000, issuedDay: 18,  dueDay: -12, received: 0,       desc: 'Commissioning & testing services' },
    { no: 'INV-2026-010', site: S3, party: CUST.tata,  job: JOB.s3, taxable: 760000,  issuedDay: 8,   dueDay: -22, received: 0,       desc: 'Design consultancy retainer' },
  ]
  const invoices = [] as any[]
  for (const iv of invoiceSeed) {
    const g = gstSplit(iv.taxable, iv.party.stateCode ?? '')
    const grand = iv.taxable + g.gstValue
    const tds = Math.round(iv.taxable * 0.02)
    const rec = await db.finInvoice.create({
      data: {
        invoiceNo: iv.no, siteId: iv.site.id, partyId: iv.party.id, jobCode: iv.job,
        poNo: `PO-CL-${iv.no.slice(-3)}`, financialYear: '2026-27',
        invoiceDate: daysAgo(iv.issuedDay), dueDate: daysAgo(iv.dueDay),
        hsnSac: '995461', taxableValue: iv.taxable, ...g,
        invoiceValue: iv.taxable, grandTotal: grand, tdsDeduction: tds, totalDeduction: tds,
        afterTdsBalance: grand - tds, receivedAmount: iv.received,
        receivedDate: iv.received > 0 ? daysAgo(Math.max(iv.dueDay - 5, 1)) : null,
        balanceAmount: grand - tds - iv.received, description: iv.desc,
        status: iv.received === 0 ? 'Unpaid' : iv.received >= grand - tds ? 'Paid' : 'Partially Paid',
      },
    })
    invoices.push(rec)
    await db.finOutstanding.create({
      data: { invoiceId: rec.id, siteId: iv.site.id, billNo: iv.no, client: iv.party.name, poNo: rec.poNo,
        month: monthKey(daysAgo(iv.issuedDay)), billDate: daysAgo(iv.issuedDay),
        invoiceValue: iv.taxable, gstValue: g.gstValue, totalInvoiceValue: grand,
        tdsDeduction: tds, totalDeduction: tds, afterTdsBalance: grand - tds,
        receivedAmount: iv.received, balanceAmount: grand - tds - iv.received },
    })
    // TDS deducted by the customer on our invoice
    await db.finTdsDeduction.create({
      data: { documentType: 'INVOICE', documentId: iv.no, invoiceId: rec.id, partyId: iv.party.id,
        deductionDate: daysAgo(iv.issuedDay), section: '194C', rate: 2,
        taxableAmount: iv.taxable, deductionAmount: tds,
        paidAmount: iv.received > 0 ? tds : 0, status: iv.received > 0 ? 'Paid' : 'Deducted' },
    })
  }

  // Vendor-side TDS (professional / rent / salary sections for the TDS register)
  const vendorTds = [
    { doc: 'BILL-9001', party: VEND.design,    section: '194J', rate: 10, taxable: 250000, status: 'Deducted', day: 40 },
    { doc: 'BILL-9002', party: VEND.transport, section: '194C', rate: 1,  taxable: 180000, status: 'Paid',     day: 62 },
    { doc: 'RENT-2026-Q1', party: VEND.steel,  section: '194I', rate: 10, taxable: 600000, status: 'Deducted', day: 25 },
    { doc: 'SAL-2026-06', party: byCode('E001'), section: '192', rate: 10, taxable: 420000, status: 'Paid',    day: 33 },
    { doc: 'BILL-9003', party: VEND.rk,        section: '194C', rate: 1,  taxable: 320000, status: 'Deducted', day: 15 },
  ]
  for (const t of vendorTds) {
    const amt = Math.round(t.taxable * t.rate / 100)
    await db.finTdsDeduction.create({
      data: { documentType: 'PURCHASE_BILL', documentId: t.doc, partyId: t.party.id, deductionDate: daysAgo(t.day),
        section: t.section, rate: t.rate, taxableAmount: t.taxable, deductionAmount: amt,
        paidAmount: t.status === 'Paid' ? amt : 0, status: t.status },
    })
  }

  // ── Purchase orders (GST purchase register + PO-wise costing) ─────
  const poSeed = [
    { no: 'PO-2026-001', vendor: VEND.steel,     site: S1, job: JOB.s1, sub: 1800000, day: 140, status: 'Approved', desc: 'TMT bars & structural steel' },
    { no: 'PO-2026-002', vendor: VEND.siemens,   site: S2, job: JOB.s2, sub: 2400000, day: 118, status: 'Approved', desc: 'HT switchgear panels' },
    { no: 'PO-2026-003', vendor: VEND.rk,        site: S4, job: JOB.s4, sub: 950000,  day: 88,  status: 'Approved', desc: 'LT cabling & terminations' },
    { no: 'PO-2026-004', vendor: VEND.transport, site: S5, job: JOB.s5, sub: 420000,  day: 55,  status: 'Approved', desc: 'Site material transportation' },
    { no: 'PO-2026-005', vendor: VEND.design,    site: S3, job: JOB.s3, sub: 250000,  day: 34,  status: 'Draft',    desc: 'Detailed engineering drawings' },
    { no: 'PO-2026-006', vendor: VEND.steel,     site: S1, job: JOB.s1, sub: 1350000, day: 12,  status: 'Approved', desc: 'MS plates & fasteners — Phase 2' },
  ]
  const pos = [] as any[]
  for (const p of poSeed) {
    const tax = Math.round(p.sub * 0.18)
    const rec = await db.finPurchaseOrder.create({
      data: { poNo: p.no, vendorId: p.vendor.code ?? '', vendorName: p.vendor.name, siteId: p.site.id, jobCode: p.job,
        date: daysAgo(p.day), descriptionOfWork: p.desc, subtotal: p.sub, taxAmount: tax, totalAmount: p.sub + tax,
        status: p.status, billTo: 'VoltCore Engineering Pvt Ltd',
        grnDate: p.status === 'Approved' ? daysAgo(Math.max(p.day - 10, 1)) : null,
        grnRef: p.status === 'Approved' ? `GRN-${p.no.slice(-3)}` : null },
    })
    await db.finPOItem.create({ data: { poId: rec.id, description: p.desc, unitOfMeasure: 'Nos', quantity: 10, unitRate: p.sub / 10, taxPercent: 18, total: p.sub, receivedQty: p.status === 'Approved' ? 10 : 0 } })
    pos.push(rec)
  }

  // ── Job Master (PO-wise unique job codes) ──────────────────────────
  const jobSeed = [
    { jobCode: JOB.s1, po: pos[0], site: S1, description: 'Boiler erection & structural steel — TPP Adani Godda', status: 'Active', budget: 62000000 },
    { jobCode: JOB.s2, po: pos[1], site: S2, description: 'Switchgear & structural works — TPP NTPC Barh', status: 'Active', budget: 48000000 },
    { jobCode: JOB.s3, po: pos[4], site: S3, description: 'Detailed engineering & drawings — HO Mumbai', status: 'Active', budget: 9000000 },
    { jobCode: JOB.s4, po: pos[2], site: S4, description: 'LT cabling & terminations — BALCO Smelter Korba', status: 'Active', budget: 38000000 },
    { jobCode: JOB.s5, po: pos[3], site: S5, description: 'Site material transportation — Coal India Rajmahal', status: 'Active', budget: 27000000 },
  ]
  const jobRecs = [] as any[]
  for (const j of jobSeed) jobRecs.push(await db.finJob.create({ data: { jobCode: j.jobCode, poId: j.po.id, siteId: j.site.id, description: j.description, status: j.status, budget: j.budget } }))

  // ── Project hierarchy (contract → job → sub-job) ──────────────────
  // Demonstrates drill-down and roll-up across a multi-site contract.
  const projectSeed = [
    { projectCode: 'PRJ-2026-001', name: 'Delhi Metro Phase-IV EPC Contract', client: CUST.ntpc.name, contractValue: 245000000, sector: 'Power', projectManager: 'Rohan Deshpande', startDate: daysAgo(240), endDate: daysAhead(720), status: 'Active', description: 'Turnkey EPC for viaduct, station, depot and E&S systems.' },
    { projectCode: 'PRJ-2026-002', name: 'Godda Thermal Package EPC', client: CUST.adani.name, contractValue: 182000000, sector: 'Power', projectManager: 'Sanjay Rao', startDate: daysAgo(420), endDate: daysAhead(240), status: 'Active', description: 'Boiler, TG and balance-of-plant works.' },
    { projectCode: 'PRJ-2026-003', name: 'BALCO Smelter Balance Works', client: CUST.balco.name, contractValue: 64000000, sector: 'Industrial', projectManager: 'Prakash Sahu', startDate: daysAgo(180), endDate: daysAhead(540), status: 'Active', description: 'Smelter cell rebuild, cabling and civil packages.' },
  ]
  const projectRecs = [] as any[]
  for (const pr of projectSeed) projectRecs.push(await db.finProject.create({ data: pr }))
  const [P1, P2, P3] = projectRecs

  // Sub-jobs (phases) under each top-level job. Deliberately links a few
  // existing live jobs into the contract hierarchy to avoid dead rows.
  const subJobSeed = [
    { code: 'JOB-2026-101', parent: JOB.s1, proj: P1, site: S1, desc: 'Phase 1 — Viaduct Section', budget: 82000000 },
    { code: 'JOB-2026-102', parent: JOB.s1, proj: P1, site: S1, desc: 'Phase 2 — Station Building', budget: 64000000 },
    { code: 'JOB-2026-103', parent: JOB.s1, proj: P1, site: S1, desc: 'Phase 3 — Track Laying', budget: 48000000 },
    { code: 'JOB-2026-201', parent: JOB.s2, proj: P1, site: S2, desc: 'Underground Station Works', budget: 64000000 },
    { code: 'JOB-2026-301', parent: JOB.s4, proj: P3, site: S4, desc: 'Civil Works Package', budget: 24000000 },
    { code: 'JOB-2026-302', parent: JOB.s4, proj: P3, site: S4, desc: 'Electrical Installation', budget: 18000000 },
  ]
  const jobByCode = new Map(jobRecs.map((j: any) => [j.jobCode, j]))
  for (const s of subJobSeed) {
    const parent = jobByCode.get(s.parent)
    await db.finJob.create({ data: { jobCode: s.code, parentId: parent ? parent.id : null, projectId: s.proj.id, siteId: s.site.id, description: s.desc, status: 'Active', budget: s.budget } })
  }

  // ── Accounts Receivable (customer ageing buckets) ─────────────────
  const arSeed = [
    { no: 'AR-2026-001', party: CUST.lnt,   site: S1, job: JOB.s1, amt: 2500000, dueDay: 118, status: 'Overdue' },
    { no: 'AR-2026-002', party: CUST.ntpc,  site: S2, job: JOB.s2, amt: 1200000, dueDay: 96,  status: 'Overdue' },
    { no: 'AR-2026-003', party: CUST.balco, site: S4, job: JOB.s4, amt: 2000000, dueDay: 74,  status: 'Pending' },
    { no: 'AR-2026-004', party: CUST.cil,   site: S5, job: JOB.s5, amt: 1450000, dueDay: 63,  status: 'Pending' },
    { no: 'AR-2026-005', party: CUST.tata,  site: S2, job: JOB.s2, amt: 980000,  dueDay: 45,  status: 'Pending' },
    { no: 'AR-2026-006', party: CUST.balco, site: S4, job: JOB.s4, amt: 1650000, dueDay: 33,  status: 'Pending' },
    { no: 'AR-2026-007', party: CUST.adani, site: S5, job: JOB.s5, amt: 2750000, dueDay: 18,  status: 'Pending' },
    { no: 'AR-2026-008', party: CUST.ntpc,  site: S1, job: JOB.s1, amt: 1320000, dueDay: 6,   status: 'Pending' },
    { no: 'AR-2026-009', party: CUST.tata,  site: S3, job: JOB.s3, amt: 760000,  dueDay: -20, status: 'Received' },
  ]
  for (const a of arSeed) {
    const tax = Math.round(a.amt * 0.18)
    await db.accountsReceivable.create({
      data: { invoiceNo: a.no, client: a.party.name, clientCode: a.party.code, partyId: a.party.id,
        siteId: a.site.id, jobCode: a.job, invoiceRef: `REF-${a.no.slice(-3)}`,
        description: `Progress billing — ${a.site.name}`, amount: a.amt, tax, totalAmount: a.amt + tax,
        dueDate: daysAgo(a.dueDay), receivedDate: a.status === 'Received' ? daysAgo(a.dueDay + 4) : null,
        paymentMethod: a.status === 'Received' ? 'NEFT' : null, status: a.status },
    })
  }

  // ── Accounts Payable (vendor ageing buckets) ──────────────────────
  const apSeed = [
    { no: 'AP-2026-001', vendor: VEND.steel,     site: S1, job: JOB.s1, po: pos[0], amt: 1800000, dueDay: 112, status: 'Overdue' },
    { no: 'AP-2026-002', vendor: VEND.siemens,   site: S2, job: JOB.s2, po: pos[1], amt: 2400000, dueDay: 94,  status: 'Partially Paid' },
    { no: 'AP-2026-003', vendor: VEND.rk,        site: S4, job: JOB.s4, po: pos[2], amt: 950000,  dueDay: 71,  status: 'Pending' },
    { no: 'AP-2026-004', vendor: VEND.transport, site: S5, job: JOB.s5, po: pos[3], amt: 420000,  dueDay: 58,  status: 'Pending' },
    { no: 'AP-2026-005', vendor: VEND.steel,     site: S1, job: JOB.s1, po: pos[5], amt: 1350000, dueDay: 40,  status: 'Pending' },
    { no: 'AP-2026-006', vendor: VEND.design,    site: S3, job: JOB.s3, po: null,   amt: 250000,  dueDay: 26,  status: 'Pending' },
    { no: 'AP-2026-007', vendor: VEND.rk,        site: S4, job: JOB.s4, po: null,   amt: 320000,  dueDay: 11,  status: 'Pending' },
    { no: 'AP-2026-008', vendor: VEND.transport, site: S5, job: JOB.s5, po: null,   amt: 180000,  dueDay: -15, status: 'Paid' },
  ]
  for (const a of apSeed) {
    const tax = Math.round(a.amt * 0.18)
    await db.accountsPayable.create({
      data: { billNo: a.no, vendor: a.vendor.name, vendorCode: a.vendor.code, partyId: a.vendor.id,
        siteId: a.site.id, jobCode: a.job, poId: a.po?.id ?? null, invoiceRef: `VINV-${a.no.slice(-3)}`,
        description: `Supply & services — ${a.site.name}`, amount: a.amt, tax, totalAmount: a.amt + tax,
        dueDate: daysAgo(a.dueDay), paidDate: a.status === 'Paid' ? daysAgo(a.dueDay + 3) : null,
        paymentMethod: a.status === 'Paid' ? 'RTGS' : null, status: a.status },
    })
  }

  // ── Petty cash (daily report / site summary / employee settlement /
  //    approval workflow all read off this) ─────────────────────────
  const custodians = [
    { name: 'Rajesh Kumar', role: 'Site Incharge', site: S1, job: JOB.s1, limit: 50000 },
    { name: 'Prakash Sahu', role: 'Site Incharge', site: S4, job: JOB.s4, limit: 50000 },
    { name: 'Suresh Mahto', role: 'Admin Executive', site: S3, job: JOB.s3, limit: 25000 },
    { name: 'Deepak Mishra', role: 'Store Incharge', site: S5, job: JOB.s5, limit: 30000 },
  ]
  const pcSeed: { day: number; desc: string; amt: number; type: 'Debit' | 'Credit'; cat: string; cust: typeof custodians[number]; approval: string; reason?: string }[] = [
    { day: 88, desc: 'Petty cash float issued — SITE-001', amt: 50000, type: 'Credit', cat: 'Replenishment', cust: custodians[0], approval: 'Approved' },
    { day: 86, desc: 'Tea & snacks for site crew', amt: 620, type: 'Debit', cat: 'Refreshments', cust: custodians[0], approval: 'Approved' },
    { day: 84, desc: 'Diesel for DG set', amt: 3200, type: 'Debit', cat: 'Fuel', cust: custodians[0], approval: 'Approved' },
    { day: 80, desc: 'Auto fare — material pickup', amt: 450, type: 'Debit', cat: 'Conveyance', cust: custodians[0], approval: 'Approved' },
    { day: 76, desc: 'Stationery & printing', amt: 1150, type: 'Debit', cat: 'Office Supplies', cust: custodians[0], approval: 'Approved' },
    { day: 72, desc: 'Petty cash float issued — SITE-004', amt: 50000, type: 'Credit', cat: 'Replenishment', cust: custodians[1], approval: 'Approved' },
    { day: 70, desc: 'Courier charges — drawings dispatch', amt: 890, type: 'Debit', cat: 'Courier', cust: custodians[1], approval: 'Approved' },
    { day: 66, desc: 'Labour welfare — drinking water cans', amt: 2400, type: 'Debit', cat: 'Labour Welfare', cust: custodians[1], approval: 'Approved' },
    { day: 60, desc: 'Petty cash float issued — HO Mumbai', amt: 25000, type: 'Credit', cat: 'Replenishment', cust: custodians[2], approval: 'Approved' },
    { day: 58, desc: 'Office pantry supplies', amt: 1780, type: 'Debit', cat: 'Office Supplies', cust: custodians[2], approval: 'Approved' },
    { day: 52, desc: 'Local conveyance — bank visit', amt: 380, type: 'Debit', cat: 'Conveyance', cust: custodians[2], approval: 'Approved' },
    { day: 46, desc: 'Emergency purchase — welding rods', amt: 4600, type: 'Debit', cat: 'Emergency Purchase', cust: custodians[1], approval: 'Approved' },
    { day: 40, desc: 'Petty cash float issued — SITE-005', amt: 30000, type: 'Credit', cat: 'Replenishment', cust: custodians[3], approval: 'Approved' },
    { day: 38, desc: 'Diesel for site pickup van', amt: 3800, type: 'Debit', cat: 'Fuel', cust: custodians[3], approval: 'Approved' },
    { day: 32, desc: 'Site safety consumables', amt: 2950, type: 'Debit', cat: 'Safety', cust: custodians[3], approval: 'Approved' },
    { day: 24, desc: 'Tea & refreshments — client visit', amt: 1650, type: 'Debit', cat: 'Refreshments', cust: custodians[0], approval: 'Approved' },
    { day: 18, desc: 'Auto fare & local travel', amt: 720, type: 'Debit', cat: 'Conveyance', cust: custodians[1], approval: 'Approved' },
    { day: 12, desc: 'Photocopy & lamination — tender docs', amt: 1340, type: 'Debit', cat: 'Office Supplies', cust: custodians[2], approval: 'Pending' },
    { day: 8,  desc: 'Diesel top-up — generator', amt: 4200, type: 'Debit', cat: 'Fuel', cust: custodians[3], approval: 'Pending' },
    { day: 5,  desc: 'Site crew meals — night shift', amt: 3100, type: 'Debit', cat: 'Refreshments', cust: custodians[0], approval: 'Pending' },
    { day: 2,  desc: 'Site crew travel — Korba to Bilaspur', amt: 2100, type: 'Debit', cat: 'Travel', cust: custodians[1], approval: 'Pending' },
    { day: 1,  desc: 'Cabling consumables — local purchase', amt: 3450, type: 'Debit', cat: 'Site Material', cust: custodians[1], approval: 'Pending' },
    { day: 3,  desc: 'Miscellaneous hardware purchase', amt: 2680, type: 'Debit', cat: 'Emergency Purchase', cust: custodians[1], approval: 'Rejected', reason: 'No supporting bill attached — please re-upload the vendor receipt.' },
    { day: 1,  desc: 'Courier — statutory filings', amt: 540, type: 'Debit', cat: 'Courier', cust: custodians[2], approval: 'Draft' },
  ]
  let pcBalance = 0
  let pcNo = 1
  for (const v of pcSeed) {
    pcBalance += v.type === 'Credit' ? v.amt : -v.amt
    const submitted = ['Pending', 'Approved', 'Rejected'].includes(v.approval)
    const pc = await db.finPettyCash.create({
      data: {
        voucherNo: `PV/2026-27/${String(pcNo++).padStart(3, '0')}`, date: daysAgo(v.day),
        description: v.desc, amount: v.amt, type: v.type, category: v.cat,
        siteId: v.cust.site.id, jobCode: v.cust.job, linkedType: 'Direct',
        authorizedBy: v.cust.name, custodian: `${v.cust.role} — ${v.cust.name}`, limitAmount: v.cust.limit,
        paymentMode: v.type === 'Credit' ? 'Bank Transfer' : 'Cash', balance: pcBalance,
        referenceNo: v.type === 'Credit' ? `NEFT/${daysAgo(v.day).toISOString().slice(0, 10).replace(/-/g, '')}` : null,
        approvalStatus: v.approval,
        submittedBy: submitted ? v.cust.name : null,
        submittedAt: submitted ? daysAgo(v.day) : null,
        approvedBy: v.approval === 'Approved' ? 'A. Mehta (Finance)' : null,
        approvedAt: v.approval === 'Approved' ? daysAgo(Math.max(v.day - 1, 0)) : null,
        rejectionReason: v.reason ?? null,
      },
    })
    // Audit trail for anything that left Draft
    if (submitted) {
      await db.finApprovalLog.create({ data: { entityType: 'FinPettyCash', entityId: String(pc.id), status: 'Pending', action: 'Submit', makerId: v.cust.name, finPettyCashId: pc.id } })
      if (v.approval === 'Approved') await db.finApprovalLog.create({ data: { entityType: 'FinPettyCash', entityId: String(pc.id), status: 'Approved', action: 'Approve', checkerId: 'A. Mehta (Finance)', finPettyCashId: pc.id } })
      if (v.approval === 'Rejected') await db.finApprovalLog.create({ data: { entityType: 'FinPettyCash', entityId: String(pc.id), status: 'Rejected', action: 'Reject', checkerId: 'A. Mehta (Finance)', comments: v.reason, finPettyCashId: pc.id } })
    }
  }

  // ── Expense claims ────────────────────────────────────────────────
  const ecSeed = [
    { no: 'EC-2026-001', site: S1, job: JOB.s1, by: 'Rajesh Kumar', day: 64, total: 47500, status: 'Approved', type: 'Travel' },
    { no: 'EC-2026-002', site: S4, job: JOB.s4, by: 'Prakash Sahu', day: 42, total: 23000, status: 'Paid', type: 'Material' },
    { no: 'EC-2026-003', site: S5, job: JOB.s5, by: 'Deepak Mishra', day: 21, total: 15800, status: 'Submitted', type: 'Travel' },
    { no: 'EC-2026-004', site: S3, job: JOB.s3, by: 'Suresh Mahto', day: 9, total: 8600, status: 'Draft', type: 'Office' },
  ]
  for (const e of ecSeed) {
    const claim = await db.finExpenseClaim.create({
      data: { claimNo: e.no, siteId: e.site.id, jobCode: e.job, siteType: e.site.siteCode === 'SITE-003' ? 'HO' : 'Site',
        expenseType: e.type, submittedBy: e.by, date: daysAgo(e.day), totalAmount: e.total,
        gstAmount: Math.round(e.total * 0.05), tdsAmount: 0, billNo: `BILL-${e.no.slice(-3)}`,
        approvalStatus: e.status === 'Draft' ? 'Draft' : e.status === 'Submitted' ? 'Pending' : 'Approved', status: e.status },
    })
    await db.finExpenseItem.create({ data: { claimId: claim.id, itemDate: daysAgo(e.day), category: e.type, name: `${e.type} expense`, description: `${e.type} incurred at ${e.site.name}`, amount: Math.round(e.total * 0.6) } })
    await db.finExpenseItem.create({ data: { claimId: claim.id, itemDate: daysAgo(e.day), category: 'Misc', name: 'Incidentals', amount: e.total - Math.round(e.total * 0.6) } })
  }

  // ── Journal entries (Site/Job/Dept tagged) ───────────────────────
  const jeSeed = [
    { no: 'JE-2026-001', day: 140, desc: 'Material purchase — Steel India', site: S1, job: JOB.s1, dr: '1005', cr: '2001', amt: 1800000, dept: 'Procurement', pm: 'Rajesh Kumar' },
    { no: 'JE-2026-002', day: 118, desc: 'Switchgear purchase — Siemens', site: S2, job: JOB.s2, dr: '1005', cr: '2001', amt: 2400000, dept: 'Electrical', pm: 'Ankit Verma' },
    { no: 'JE-2026-003', day: 60,  desc: 'Monthly payroll accrual', site: S3, job: JOB.s3, dr: '5001', cr: '2004', amt: 1400000, dept: 'HR', pm: 'Suresh Mahto' },
    { no: 'JE-2026-004', day: 30,  desc: 'Depreciation — plant & machinery', site: S1, job: JOB.s1, dr: '5004', cr: '1006', amt: 420000, dept: 'Finance', pm: 'A. Mehta' },
    { no: 'JE-2026-005', day: 12,  desc: 'Labour bill provision — Q2', site: S4, job: JOB.s4, dr: '5002', cr: '2001', amt: 860000, dept: 'Execution', pm: 'Prakash Sahu' },
  ]
  for (const j of jeSeed) {
    const entry = await db.finJournalEntry.create({
      data: { entryNo: j.no, entryDate: daysAgo(j.day), description: j.desc, siteId: j.site.id, finSiteId: j.site.id,
        status: 'Posted', postedAt: daysAgo(j.day), postedBy: j.pm, totalDebit: j.amt, totalCredit: j.amt },
    })
    await db.finJournalLine.create({ data: { entryId: entry.id, accountId: accByCode[j.dr].id, description: j.desc, debit: j.amt, jobCode: j.job, siteCode: j.site.siteCode, department: j.dept, projectManager: j.pm, costCenter: `CC-${j.site.siteCode.slice(-3)}` } })
    await db.finJournalLine.create({ data: { entryId: entry.id, accountId: accByCode[j.cr].id, description: j.desc, credit: j.amt, jobCode: j.job, siteCode: j.site.siteCode, department: j.dept, projectManager: j.pm, costCenter: `CC-${j.site.siteCode.slice(-3)}` } })
    // Legacy mirror (drives the journal-entries screen)
    await db.journalEntry.create({ data: { entryNo: j.no, date: daysAgo(j.day), account: j.dr, accountName: coaGroups.flatMap(g => g.children).find(c => c.code === j.dr)?.name ?? j.dr, siteId: j.site.id, jobCode: j.job, department: j.dept, projectManager: j.pm, costCenter: `CC-${j.site.siteCode.slice(-3)}`, debit: j.amt, credit: 0, description: j.desc, voucherType: 'Journal', status: 'Posted' } })
    await db.journalEntry.create({ data: { entryNo: j.no, date: daysAgo(j.day), account: j.cr, accountName: coaGroups.flatMap(g => g.children).find(c => c.code === j.cr)?.name ?? j.cr, siteId: j.site.id, jobCode: j.job, department: j.dept, projectManager: j.pm, costCenter: `CC-${j.site.siteCode.slice(-3)}`, debit: 0, credit: j.amt, description: j.desc, voucherType: 'Journal', status: 'Posted' } })
  }

  // ── Payment advices ───────────────────────────────────────────────
  const paSeed = [
    { no: 'PA-2026-001', vendor: VEND.steel,   site: S1, job: JOB.s1, po: pos[0], amt: 1200000, day: 100, status: 'Paid' },
    { no: 'PA-2026-002', vendor: VEND.siemens, site: S2, job: JOB.s2, po: pos[1], amt: 1500000, day: 70,  status: 'Paid' },
    { no: 'PA-2026-003', vendor: VEND.rk,      site: S4, job: JOB.s4, po: pos[2], amt: 600000,  day: 28,  status: 'Approved' },
    { no: 'PA-2026-004', vendor: VEND.transport, site: S5, job: JOB.s5, po: pos[3], amt: 300000, day: 7,  status: 'Draft' },
  ]
  for (const p of paSeed) {
    const adv = await db.finPaymentAdvice.create({
      data: { adviceNo: p.no, partyId: p.vendor.id, siteId: p.site.id, poId: p.po.id, jobCode: p.job,
        totalAmount: p.amt, paymentDate: daysAgo(p.day), paymentMode: 'NEFT',
        referenceNo: p.status === 'Paid' ? `UTR/${daysAgo(p.day).toISOString().slice(0, 10).replace(/-/g, '')}` : null,
        supplierName: p.vendor.name, vendorCode: p.vendor.code, status: p.status },
    })
    await db.finPaymentAdviceLine.create({ data: { adviceId: adv.id, billNo: `VINV-${p.no.slice(-3)}`, invDate: daysAgo(p.day + 20).toISOString().slice(0, 10), invAmount: p.amt, amount: p.amt, paidAmount: p.status === 'Paid' ? p.amt : 0, balanceAmount: p.status === 'Paid' ? 0 : p.amt } })
  }

  // ── Credit notes ──────────────────────────────────────────────────
  await db.finCreditNote.create({ data: { creditNoteNo: 'CN-2026-001', invoiceId: invoices[0].id, siteId: S1.id, jobCode: JOB.s1, client: CUST.lnt.name, date: daysAgo(100), invoiceValue: 2500000, gstValue: 450000, totalInvoiceValue: 2950000, amount: 150000, afterTdsBalance: 135000, receivedAmount: 135000, holdAmount: 15000, reason: 'Rate revision adjustment', status: 'Received' } })
  await db.finCreditNote.create({ data: { creditNoteNo: 'CN-2026-002', invoiceId: invoices[2].id, siteId: S4.id, jobCode: JOB.s4, client: CUST.balco.name, date: daysAgo(48), invoiceValue: 3200000, gstValue: 576000, totalInvoiceValue: 3776000, amount: 220000, afterTdsBalance: 198000, holdAmount: 22000, reason: 'Quality deduction — rework at site', status: 'Issued' } })

  // ── Fixed assets ──────────────────────────────────────────────────
  const assetSeed = [
    { code: 'FA/MAC/001', name: 'Tower Crane TC-5610', cat: 'Machinery', cost: 8500000, life: 15, site: S1, dept: 'Execution', cust: 'Rajesh Kumar' },
    { code: 'FA/VEH/002', name: 'Tata Prima 4040S Tipper', cat: 'Vehicles', cost: 3200000, life: 10, site: S4, dept: 'Logistics', cust: 'Prakash Sahu' },
    { code: 'FA/IT/003',  name: 'Dell PowerEdge R750 Server', cat: 'IT', cost: 450000, life: 5, site: S3, dept: 'IT', cust: 'Suresh Mahto' },
    { code: 'FA/MAC/004', name: 'Concrete Batching Plant 60m³', cat: 'Machinery', cost: 12000000, life: 20, site: S5, dept: 'Execution', cust: 'Deepak Mishra' },
  ]
  for (const a of assetSeed) {
    const asset = await db.finAsset.create({
      data: { assetCode: a.code, name: a.name, category: a.cat, serialNo: `SN-${a.code.slice(-3)}-2025`,
        acquisitionDate: daysAgo(400), cost: a.cost, salvageValue: Math.round(a.cost * 0.1), usefulLife: a.life,
        depreciationMethod: 'Straight Line', siteId: a.site.id, finSiteId: a.site.id,
        custodian: a.cust, departmentCode: a.dept, status: 'Active' },
    })
    const annual = (a.cost - a.cost * 0.1) / a.life
    await db.finAssetDepreciation.create({ data: { assetId: asset.id, period: monthKey(daysAgo(30)), amount: Math.round(annual / 12), bookValue: Math.round(a.cost - annual) } })
  }

  // ── Bank & cash ───────────────────────────────────────────────────
  const bankSeed = [
    { name: 'Operating Account', bank: 'State Bank of India', no: '38201234567', ifsc: 'SBIN0001234', bal: 1840000 },
    { name: 'Project Account — NTPC', bank: 'HDFC Bank', no: '50109876543', ifsc: 'HDFC0005678', bal: 960000 },
    { name: 'Collection Account', bank: 'ICICI Bank', no: '000601234567', ifsc: 'ICIC0000006', bal: 480000 },
  ]
  for (const [bi, b] of bankSeed.entries()) {
    const acct = await db.bankAccount.create({ data: { accountName: b.name, bankName: b.bank, branch: 'Main Branch', accountNo: b.no, ifsc: b.ifsc, type: 'Current', balance: b.bal, status: 'Active' } })
    let run = b.bal
    for (let k = 0; k < 5; k++) {
      const isCredit = k % 2 === 0
      const amt = 120000 + k * 45000 + bi * 30000
      run += isCredit ? amt : -amt
      await db.bankTransaction.create({
        data: { bankAccountId: acct.id, date: daysAgo(60 - k * 12), type: isCredit ? 'Credit' : 'Debit',
          amount: isCredit ? amt : -amt, balance: run,
          reference: `${isCredit ? 'NEFT' : 'RTGS'}/${String(202600 + k)}`,
          party: isCredit ? CUST.lnt.name : VEND.steel.name,
          description: isCredit ? 'Client payment received' : 'Vendor payment',
          category: isCredit ? 'Receipt' : 'Payment', status: 'Completed', reconciled: k < 3 },
      })
    }
  }

  // ── Tax records (statutory calendar) ─────────────────────────────
  for (const t of [
    { type: 'GST', period: monthKey(daysAgo(90)), amt: 774000, dueDay: 70, status: 'Paid' },
    { type: 'GST', period: monthKey(daysAgo(60)), amt: 812000, dueDay: 40, status: 'Paid' },
    { type: 'GST', period: monthKey(daysAgo(30)), amt: 640000, dueDay: -8, status: 'Pending' },
    { type: 'TDS', period: 'Q1 FY26-27', amt: 118000, dueDay: 12, status: 'Pending' },
    { type: 'PF', period: monthKey(daysAgo(30)), amt: 168000, dueDay: -3, status: 'Pending' },
    { type: 'ESI', period: monthKey(daysAgo(60)), amt: 42000, dueDay: 25, status: 'Overdue' },
  ]) {
    await db.taxRecord.create({ data: { taxType: t.type, period: t.period, amount: t.amt, dueDate: daysAgo(t.dueDay), paidDate: t.status === 'Paid' ? daysAgo(t.dueDay + 4) : null, paymentRef: t.status === 'Paid' ? `CHLN-${t.type}-${t.period}` : null, status: t.status } })
  }

  // ── Budget (site-wise, budget vs actual) ─────────────────────────
  const budgetSeed = [
    { cat: 'Material', desc: 'Structural steel & consumables', planned: 8200000, actual: 6350000, site: S1 },
    { cat: 'Labour', desc: 'Skilled & unskilled site labour', planned: 4500000, actual: 3800000, site: S1 },
    { cat: 'Equipment', desc: 'Crane & DG hire charges', planned: 3500000, actual: 3960000, site: S4 },
    { cat: 'Transport', desc: 'Material movement to site', planned: 1200000, actual: 950000, site: S5 },
    { cat: 'Subcontract', desc: 'Testing & commissioning', planned: 6000000, actual: 5200000, site: S2 },
    { cat: 'Overhead', desc: 'Office rent, utilities & admin', planned: 1800000, actual: 1950000, site: S3 },
  ]
  for (const b of budgetSeed) {
    await db.budgetItem.create({ data: { category: b.cat, description: b.desc, planned: b.planned, actual: b.actual, variance: b.planned - b.actual, period: 'FY 2026-27', siteId: b.site.id, status: b.actual > b.planned ? 'Over Budget' : b.actual / b.planned > 0.8 ? 'On Track' : 'Under Budget' } })
  }
  const finBudget = await db.finBudget.create({ data: { fiscalYear: '2026-27', name: 'Annual Budget 2026-27', siteId: S1.id, finSiteId: S1.id, version: '1.0', status: 'Approved', totalAmount: 50000000 } })
  for (let m = 1; m <= 12; m++) await db.finBudgetLine.create({ data: { budgetId: finBudget.id, accountId: accByCode['4001'].id, month: m, amount: 4000000 } })

  // ── Profit & Loss (multi-month, multi-site) ──────────────────────
  const plMonths = [daysAgo(120), daysAgo(90), daysAgo(60), daysAgo(30)]
  const plSites = [S1, S2, S4, S5]
  for (const [si, site] of plSites.entries()) {
    for (const [mi, m] of plMonths.entries()) {
      const scale = 1 + si * 0.15 + mi * 0.08
      await db.profitLossEntry.create({ data: { site: site.name, month: monthKey(m), side: 'credit', category: 'Sales Accounts', particular: 'Project Billing', amount: Math.round(2200000 * scale) } })
      await db.profitLossEntry.create({ data: { site: site.name, month: monthKey(m), side: 'credit', category: 'Indirect Incomes', particular: 'Service Income', amount: Math.round(320000 * scale) } })
      await db.profitLossEntry.create({ data: { site: site.name, month: monthKey(m), side: 'debit', category: 'Purchase Accounts', particular: 'Material Consumption', amount: Math.round(880000 * scale) } })
      await db.profitLossEntry.create({ data: { site: site.name, month: monthKey(m), side: 'debit', category: 'Direct Expenses', particular: 'Site Labour', amount: Math.round(560000 * scale) } })
      await db.profitLossEntry.create({ data: { site: site.name, month: monthKey(m), side: 'debit', category: 'Direct Expenses', particular: 'Equipment Hire', amount: Math.round(240000 * scale) } })
      await db.profitLossEntry.create({ data: { site: site.name, month: monthKey(m), side: 'debit', category: 'Indirect Expenses', particular: 'Admin Overhead', amount: Math.round(150000 * scale) } })
    }
  }

  // ── Alerts & collection follow-ups ───────────────────────────────
  await db.finAlert.create({ data: { type: 'Overdue', title: 'Invoice overdue 120+ days', message: 'INV-2026-001 (L&T Construction) is 120 days past due', invoiceId: invoices[0].id, siteId: S1.id, amount: 2891000 } })
  await db.finAlert.create({ data: { type: 'Overdue', title: 'Invoice overdue', message: 'INV-2026-002 (NTPC Limited) is 98 days past due', invoiceId: invoices[1].id, siteId: S2.id, amount: 1524000 } })
  await db.finFollowUp.create({ data: { invoiceId: invoices[0].id, clientName: CUST.lnt.name, invoiceNo: 'INV-2026-001', balanceAmount: 2891000, contactNo: '+91-9876543210', contactPerson: 'Amit Singh', followUpDate: daysAhead(3), remarks: 'Awaiting RA bill certification' } })
  await db.finFollowUp.create({ data: { invoiceId: invoices[3].id, clientName: CUST.cil.name, invoiceNo: 'INV-2026-004', balanceAmount: 1711000, contactNo: '+91-9876543216', contactPerson: 'S. Banerjee', followUpDate: daysAhead(7), remarks: 'Client confirmed payment in next cycle' } })

  // ── Client Follow Up (collections tracker — fin-client-follow-up.tsx) ──
  const followUpSeed = [
    { client: CUST.lnt.name,   bal: 2891000, po: pos[0], invoices: 'INV-2026-001', contact: 'Amit Singh',    phone: '+91-9876543210', matter: 'RA bill certification pending with site PM', call: daysAhead(3),  remarks: 'Client confirmed sign-off by next week', status: 'Pending' },
    { client: CUST.ntpc.name,  bal: 1524000, po: pos[1], invoices: 'INV-2026-002, INV-2026-009', contact: 'Suresh Reddy', phone: '+91-9876543213', matter: 'Payment 98 days overdue — escalated to finance', call: daysAgo(2), remarks: 'Awaiting internal NTPC approval cycle', status: 'Overdue' },
    { client: CUST.balco.name, bal: 2198000, po: pos[2], invoices: 'INV-2026-003, INV-2026-007', contact: 'R. Iyer',       phone: '+91-9876543215', matter: 'Quality deduction dispute on CN-2026-002', call: daysAhead(5),  remarks: 'Site team reworking punch list items', status: 'In Progress' },
    { client: CUST.cil.name,   bal: 1711000, po: null,   invoices: 'INV-2026-004', contact: 'S. Banerjee',   phone: '+91-9876543216', matter: 'Confirmed for next payment cycle', call: daysAhead(7),  remarks: 'Client confirmed payment in next cycle', status: 'Pending' },
    { client: CUST.tata.name,  bal: 660000,  po: null,   invoices: 'INV-2026-006', contact: 'Neha Kapoor',   phone: '+91-9876543212', matter: 'Follow up on TDS certificate for reconciliation', call: daysAgo(1), remarks: 'Certificate received, verifying against ledger', status: 'Resolved' },
    { client: CUST.adani.name, bal: 2750000, po: null,   invoices: 'INV-2026-008', contact: 'Vivek Shah',    phone: '+91-9876543220', matter: 'Invoice raised, first follow-up call', call: daysAhead(10), remarks: 'Standard 30-day credit period, not yet due', status: 'Pending' },
  ]
  for (const f of followUpSeed) {
    await db.finClientFollowUp.create({
      data: { clientName: f.client, balanceAmount: f.bal, poId: f.po?.id ?? null, invoiceNos: f.invoices,
        contactNo: f.phone, contactPerson: f.contact, matterDiscussed: f.matter,
        callBackDate: f.call, remarks: f.remarks, status: f.status, createdBy: 'A. Mehta (Finance)' },
    })
  }

  // ── Procurement: Purchase Requisitions with live approval chains ──
  const APPROVAL_CHAIN = [
    { role: 'site_engineer', label: 'Site Engineer' },
    { role: 'project_manager', label: 'Project Manager' },
    { role: 'procurement', label: 'Procurement' },
    { role: 'finance', label: 'Finance' },
  ]
  const prSeed = [
    { no: 'PR-2026-0001', req: 'Rajesh Kumar', proj: S1.name, day: 70, status: 'Approved', approvedSteps: 4, items: [{ d: 'Safety Helmets', q: 100, u: 'pcs', c: 850 }, { d: 'Safety Harness', q: 40, u: 'pcs', c: 2400 }] },
    { no: 'PR-2026-0002', req: 'Ankit Verma', proj: S2.name, day: 52, status: 'Approved', approvedSteps: 4, items: [{ d: 'Welding Electrodes 3.15mm', q: 500, u: 'kg', c: 180 }] },
    { no: 'PR-2026-0003', req: 'Prakash Sahu', proj: S4.name, day: 34, status: 'Pending Approval', approvedSteps: 2, items: [{ d: 'LT Cable 4Cx16sqmm', q: 800, u: 'mtr', c: 420 }, { d: 'Cable Glands', q: 200, u: 'pcs', c: 95 }] },
    { no: 'PR-2026-0004', req: 'Deepak Mishra', proj: S5.name, day: 20, status: 'Pending Approval', approvedSteps: 1, items: [{ d: 'Conveyor Idler Rollers', q: 60, u: 'pcs', c: 1850 }] },
    { no: 'PR-2026-0005', req: 'Suresh Mahto', proj: S3.name, day: 11, status: 'Draft', approvedSteps: 0, items: [{ d: 'Office Chairs', q: 12, u: 'pcs', c: 6500 }] },
    { no: 'PR-2026-0006', req: 'Rajesh Kumar', proj: S1.name, day: 4, status: 'Draft', approvedSteps: 0, items: [{ d: 'Hydraulic Jack 20T', q: 4, u: 'pcs', c: 18500 }, { d: 'Chain Pulley Block 5T', q: 6, u: 'pcs', c: 12000 }] },
  ]
  for (const p of prSeed) {
    const total = p.items.reduce((s, i) => s + i.q * i.c, 0)
    const pr = await db.finPurchaseRequisition.create({
      data: { prNo: p.no, date: daysAgo(p.day), requester: p.req, project: p.proj, totalEstCost: total, requiredBy: daysAhead(30 - p.day > 0 ? 30 - p.day : 15), status: p.status },
    })
    for (const i of p.items) await db.finPRLineItem.create({ data: { prId: pr.id, description: i.d, qty: i.q, unit: i.u, estCost: i.c, total: i.q * i.c } })
    if (p.status !== 'Draft') {
      for (const [idx, step] of APPROVAL_CHAIN.entries()) {
        const done = idx < p.approvedSteps
        await db.finPRApproval.create({
          data: { prId: pr.id, role: step.role, label: step.label, status: done ? 'Approved' : 'Pending',
            actedBy: done ? ['R. Kumar', 'A. Verma', 'M. Joshi', 'A. Mehta'][idx] : null,
            actedAt: done ? daysAgo(p.day - idx - 1) : null },
        })
      }
    }
  }

  // ── Procurement: RFQ, subcontract, material tracking ─────────────
  const rfq = await db.finRFQ.create({ data: { rfqNo: 'RFQ-2026-001', description: 'Safety equipment procurement', issueDate: daysAgo(66), responseDeadline: daysAgo(50), project: S1.name, status: 'Awarded' } })
  const rfqLine = await db.finRFQLineItem.create({ data: { rfqId: rfq.id, description: 'Safety Helmet', qty: 100, unit: 'pcs' } })
  await db.finRFQBid.create({ data: { rfqId: rfq.id, vendorId: VEND.steel.id, lineItemId: rfqLine.id, unitPrice: 850, leadTime: 7, compliant: true } })
  await db.finRFQBid.create({ data: { rfqId: rfq.id, vendorId: VEND.rk.id, lineItemId: rfqLine.id, unitPrice: 920, leadTime: 5, compliant: true } })
  await db.finSubcontract.create({ data: { subcontractNo: 'SUB-2026-001', vendor: 'KEC International', project: S1.name, value: 5000000, startDate: daysAgo(80), endDate: daysAhead(120), status: 'Active', percentComplete: 45 } })
  await db.finSubcontract.create({ data: { subcontractNo: 'SUB-2026-002', vendor: 'Tata Projects Ltd', project: S4.name, value: 3200000, startDate: daysAgo(40), endDate: daysAhead(180), status: 'Active', percentComplete: 18 } })
  await db.finMaterialTrackingItem.create({ data: { poNo: 'PO-2026-002', vendor: VEND.siemens.name, project: S2.name, site: S2.name, material: 'HT Switchgear Panel', category: 'Electrical', unit: 'Nos', qtyRequired: 10, qtyStock: 4, qtyInTransit: 6, scheduledDate: daysAhead(10), expectedDate: daysAhead(15), status: 'In Transit' } })
  await db.finMaterialTrackingItem.create({ data: { poNo: 'PO-2026-001', vendor: VEND.steel.name, project: S1.name, site: S1.name, material: 'TMT Bars Fe500D', category: 'Civil', unit: 'MT', qtyRequired: 120, qtyStock: 120, qtyInTransit: 0, scheduledDate: daysAgo(120), expectedDate: daysAgo(115), status: 'Delivered' } })

  // ── Stage C/D/E sample data (stock ledger, material issue→WIP, RA bills) ──
  let bal = 0; let sl = 0;
  const stockRows = [
    { itemCode: 'ITM-001', itemName: '33kV XLPE Cable', unit: 'Mtr', ref: 'GRN-0001', job: null, in: 2500, out: 0 },
    { itemCode: 'ITM-001', itemName: '33kV XLPE Cable', unit: 'Mtr', ref: 'MI-0001', job: 'JOB-2026-001', in: 0, out: 850 },
    { itemCode: 'ITM-002', itemName: 'Structural Steel ISMB 300', unit: 'MT', ref: 'GRN-0002', job: null, in: 120, out: 0 },
    { itemCode: 'ITM-002', itemName: 'Structural Steel ISMB 300', unit: 'MT', ref: 'MI-0002', job: 'JOB-2026-002', in: 0, out: 42 },
    { itemCode: 'ITM-003', itemName: 'OPC 53 Cement', unit: 'MT', ref: 'GRN-0003', job: null, in: 5000, out: 0 },
    { itemCode: 'ITM-003', itemName: 'OPC 53 Cement', unit: 'MT', ref: 'MI-0003', job: 'JOB-2026-004', in: 0, out: 1200 },
  ];
  for (const r of stockRows) {
    bal = Math.round((bal + (r.in || 0) - (r.out || 0)) * 1000) / 1000;
    sl++;
    await db.finStockLedger.create({ data: { entryNo: `SL-2026-${String(sl).padStart(3, '0')}`, postingDate: daysAgo(20 - sl * 2), itemCode: r.itemCode, itemName: r.itemName, unit: r.unit, qtyIn: r.in, qtyOut: r.out, balanceQty: bal, rate: r.itemCode === 'ITM-003' ? 6250 : r.itemCode === 'ITM-002' ? 72500 : 4850, referenceType: r.ref.startsWith('GRN') ? 'Stock Receipt' : 'Material Issue', referenceNo: r.ref, jobCode: r.job, siteCode: S1.siteCode } })
  }
await db.finMaterialIssue.create({ data: { issueNo: 'MI-2026-001', issueDate: daysAgo(14), siteCode: S1.siteCode, siteId: S1.id, jobCode: 'JOB-2026-001', jobName: JOB.s1, itemCode: 'ITM-001', itemName: '33kV XLPE Cable', description: '33kV XLPE Cable issue to Boiler Erection', qty: 850, unit: 'Mtr', rate: 4850, amount: 4122500, wipAccount: '1501', status: 'Posted' } })
await db.finMaterialIssue.create({ data: { issueNo: 'MI-2026-002', issueDate: daysAgo(10), siteCode: S2.siteCode, siteId: S2.id, jobCode: 'JOB-2026-002', jobName: JOB.s2, itemCode: 'ITM-002', itemName: 'Structural Steel ISMB 300', description: 'Structural Steel to TG Deck Civil', qty: 42, unit: 'MT', rate: 72500, amount: 3045000, wipAccount: '1502', status: 'Posted' } })
await db.finMaterialIssue.create({ data: { issueNo: 'MI-2026-003', issueDate: daysAgo(6), siteCode: S4.siteCode, siteId: S4.id, jobCode: 'JOB-2026-004', jobName: JOB.s4, itemCode: 'ITM-003', itemName: 'OPC 53 Cement', description: 'OPC 53 Cement bulk to Potline Works', qty: 1200, unit: 'MT', rate: 6250, amount: 7500000, wipAccount: '1503', status: 'Draft' } })
  await db.finMootBill.create({ data: { raNo: 'RA-2026-001', raDate: daysAgo(25), siteCode: S1.siteCode, jobCode: 'JOB-2026-001', jobName: JOB.s1, poNo: 'PO-2026-021', poTotal: 29400000, workPercent: 30, previousWork: 0, billedSoFar: 0, billAmount: 8820000, withholding: 10, deducted: 882000, netRavFor: 7938000, status: 'Approved' } })
  await db.finMootBill.create({ data: { raNo: 'RA-2026-002', raDate: daysAgo(8), siteCode: S2.siteCode, jobCode: 'JOB-2026-002', jobName: JOB.s2, poNo: 'PO-2026-022', poTotal: 84000000, workPercent: 45, previousWork: 30, billedSoFar: 25200000, billAmount: 12600000, withholding: 0, deducted: 0, netRavFor: 12600000, status: 'Submitted' } })

  // ── Projects – BOQ / Job Progress / Scrap ──────────────────────────
  await db.finBoq.create({ data: {
    boqNo: 'BOQ-2026-001', title: 'Boiler Erection — BOQ', siteId: S1.id, siteCode: S1.siteCode, jobCode: 'JOB-2026-001', jobName: JOB.s1, poNo: 'PO-2026-021', project: 'TPP Adani Godda', version: 'V1', status: 'Approved',
    totalQty: 7622, totalAmount: 60475000,
    lines: { create: [
      { itemNo: '1', description: 'Structural Steel ISMB 300', uom: 'MT', qty: 120, rate: 72500, amount: 8700000, sortOrder: 0 },
      { itemNo: '2', description: '33kV XLPE Cable 3Cx400sqmm', uom: 'Mtr', qty: 2500, rate: 4850, amount: 12125000, sortOrder: 1 },
      { itemNo: '3', description: 'OPC 53 Cement bulk', uom: 'MT', qty: 5000, rate: 6250, amount: 31250000, sortOrder: 2 },
      { itemNo: '4', description: 'Power Transformer 50 MVA', uom: 'Nos', qty: 2, rate: 4200000, amount: 8400000, sortOrder: 3 },
    ] },
  } })
  await db.finProjectProgress.create({ data: {
    jobCode: 'JOB-2026-001', jobName: JOB.s1, siteCode: S1.siteCode, siteId: S1.id, overallPct: 62, status: 'In Progress', milestone: 'Equipment Installation',
    milestones: { create: [
      { name: 'Civil & Foundations', pct: 20, achievedPct: 100, done: true },
      { name: 'Structural Erection', pct: 35, achievedPct: 80, done: false },
      { name: 'Equipment Installation', pct: 30, achievedPct: 40, done: false },
      { name: 'Testing & Commissioning', pct: 15, achievedPct: 0, done: false },
    ] },
  } })
  await db.finProjectProgress.create({ data: {
    jobCode: 'JOB-2026-002', jobName: JOB.s2, siteCode: S2.siteCode, siteId: S2.id, overallPct: 78, status: 'In Progress', milestone: 'Structural Erection',
    milestones: { create: [
      { name: 'Civil & Foundations', pct: 20, achievedPct: 100, done: true },
      { name: 'Structural Erection', pct: 35, achievedPct: 90, done: false },
      { name: 'Equipment Installation', pct: 30, achievedPct: 70, done: false },
      { name: 'Testing & Commissioning', pct: 15, achievedPct: 30, done: false },
    ] },
  } })
  await db.finStockLedger.create({ data: { entryNo: 'SCR-2026-001', postingDate: daysAgo(8), itemCode: 'ITM-002', itemName: 'Structural Steel ISMB 300', unit: 'MT', qtyIn: 0, qtyOut: 2.5, balanceQty: 115.5, rate: 18000, valueOut: 45000, referenceType: 'Scrap Disposal', referenceNo: 'SCR-0001', jobCode: 'JOB-2026-002', siteCode: S2.siteCode, remarks: 'Cut-offs from fabrication' } })
  await db.finStockLedger.create({ data: { entryNo: 'SCR-2026-002', postingDate: daysAgo(5), itemCode: 'ITM-001', itemName: '33kV XLPE Cable', unit: 'Mtr', qtyIn: 0, qtyOut: 120, balanceQty: 2380, rate: 900, valueOut: 108000, referenceType: 'Scrap Disposal', referenceNo: 'SCR-0002', jobCode: 'JOB-2026-001', siteCode: S1.siteCode, remarks: 'Damaged cable ends' } })

  // ── Sales & BD ────────────────────────────────────────────────────
  const client1 = await db.finClient.create({ data: { name: CUST.lnt.name, sector: 'Power', strength: 'Large', website: 'www.lntconstruction.com', industry: 'Infrastructure' } })
  await db.finClient.create({ data: { name: CUST.tata.name, sector: 'Power', strength: 'Large', website: 'www.tataprojects.com', industry: 'Engineering' } })
  await db.finClientContact.create({ data: { clientId: client1.id, name: 'Amit Singh', role: 'Procurement Head', phone: '+91-9988776655', email: 'amit.singh@lnt.com' } })
  await db.finClientProject.create({ data: { clientId: client1.id, name: 'Godda 660MW Unit 5', value: 50000000, startDate: daysAgo(150), endDate: daysAhead(200), sector: 'Power' } })

  const opp1 = await db.finOpportunity.create({ data: { projectName: 'Godda 660MW Unit 5 Erection', clientName: CUST.lnt.name, value: 50000000, sector: 'Power', winProbability: 75, dueDate: daysAhead(60), bdOwner: 'Vikram Patel', scope: 'Complete erection of Boiler and TG', stage: 'Negotiate' } })
  await db.finOpportunity.create({ data: { projectName: 'Barh 500MW Unit 3 Overhaul', clientName: CUST.tata.name, value: 35000000, sector: 'Power', winProbability: 60, dueDate: daysAhead(95), bdOwner: 'Vikram Patel', scope: 'Turbine overhaul and maintenance', stage: 'Qualify' } })
  await db.finOpportunity.create({ data: { projectName: 'Rajmahal Conveyor Package', clientName: CUST.cil.name, value: 18000000, sector: 'Mining', winProbability: 40, dueDate: daysAhead(130), bdOwner: 'Neha Gupta', scope: 'Conveyor supply & erection', stage: 'Lead' } })
  await db.finOpportunityContact.create({ data: { opportunityId: opp1.id, name: 'Suresh Reddy', role: 'Project Director', phone: '+91-8877665544', email: 'suresh.reddy@lnt.com' } })
  await db.finOppGoNoGo.create({ data: { opportunityId: opp1.id, label: 'Strategic Fit', checked: true, signOff: 'Vikram Patel' } })
  await db.finOppStageHistory.create({ data: { opportunityId: opp1.id, stage: 'Lead', timestamp: daysAgo(90).toISOString() } })

  const tender = await db.finTender.create({ data: { tenderNo: 'TDR-2026-001', client: CUST.ntpc.name, project: 'Barh 500MW Unit 3', sector: 'Power', rftIssueDate: daysAgo(45), submissionDeadline: daysAhead(12), estimatedValue: 45000000, estimator: 'Vikram Patel', status: 'Submitted', description: 'Annual maintenance contract' } })
  await db.finTenderDocument.create({ data: { tenderId: tender.id, name: 'Technical Bid', status: 'Submitted' } })
  await db.finTenderBidTeam.create({ data: { tenderId: tender.id, name: 'Vikram Patel', role: 'Bid Manager' } })
  await db.finTenderEvaluation.create({ data: { tenderId: tender.id, technicalScore: 85, commercialScore: 78, totalScore: 81.5, evaluatorNotes: 'Competitive bid, strong technical score' } })

  // ── Legacy sales docs (GST tax invoice screen) ───────────────────
  const cust = await db.customer.create({ data: { name: CUST.lnt.name, contactPerson: 'Amit Singh', email: 'purchase@lnt.com', phone: '+91-9988776655', updatedAt: now } })
  await db.salesOrder.create({ data: { soNo: 'SO-2026-001', soDate: daysAgo(60), customerId: cust.id, status: 'Confirmed', totalAmount: 590000, updatedAt: now } })
  await db.quotation.create({ data: { quotationNo: 'QTN-2026-001', quotationDate: daysAgo(75), customerId: cust.id, validUntil: daysAhead(20), status: 'sent', subtotal: 750000, taxAmount: 135000, totalAmount: 885000, updatedAt: now } })
  for (const [i, ti] of [
    { no: 'TX-2026-001', taxable: 300000, day: 70, state: '27' },
    { no: 'TX-2026-002', taxable: 480000, day: 40, state: '24' },
    { no: 'TX-2026-003', taxable: 220000, day: 12, state: '27' },
  ].entries()) {
    const g = gstSplit(ti.taxable, ti.state)
    const inv = await db.salesTaxInvoice.create({
      data: { invoiceNo: ti.no, invoiceDate: daysAgo(ti.day), dueDate: daysAhead(30 - ti.day > 0 ? 30 - ti.day : 10), customerId: cust.id,
        customerName: CUST.lnt.name, customerGstin: '27AABCL1234Q1Z1', customerStateCode: ti.state, placeOfSupply: ti.state,
        poNo: `PO-CL-00${i + 1}`, taxableAmount: ti.taxable,
        cgstRate: g.cgstAmount ? 9 : 0, sgstRate: g.sgstAmount ? 9 : 0, igstRate: g.igstAmount ? 18 : 0,
        cgstAmount: g.cgstAmount, sgstAmount: g.sgstAmount, igstAmount: g.igstAmount,
        totalAmount: ti.taxable + g.gstValue, status: 'submitted', updatedAt: now },
    })
    await db.salesTaxInvoiceItem.create({ data: { invoiceId: inv.id, description: 'Erection & commissioning services', hsnSac: '995461', uom: 'Job', quantity: 1, rate: ti.taxable, taxableValue: ti.taxable, cgstPercent: g.cgstAmount ? 9 : 0, sgstPercent: g.sgstAmount ? 9 : 0, igstPercent: g.igstAmount ? 18 : 0, cgstAmount: g.cgstAmount, sgstAmount: g.sgstAmount, igstAmount: g.igstAmount, total: ti.taxable + g.gstValue } })
  }
  await db.invoice.create({ data: { invoiceNo: 'INV-LEGACY-001', invoiceDate: daysAgo(50), customerId: cust.id, status: 'sent', totalAmount: 590000, updatedAt: now } })
  const wh = await db.warehouse.findFirst() ?? await db.warehouse.create({ data: { name: 'Main Warehouse Mumbai', code: 'WH-MUM', branchId: branch.id, updatedAt: now } })
  await db.purchaseOrder.create({ data: { poNo: 'PO-LEGACY-001', poDate: daysAgo(65), warehouseId: wh.id, status: 'open', subtotal: 350000, taxAmount: 63000, totalAmount: 413000, updatedAt: now } })

  // ── UOMs & Items (sales item pickers) ─────────────────────────────
  const uomSeed = ['Nos', 'Mtr', 'MT', 'kg', 'pcs']
  const uoms: Record<string, number> = {}
  for (const code of uomSeed) {
    const u = await db.uom.upsert({ where: { code }, create: { name: code, code }, update: {} })
    uoms[code] = u.id
  }
  const itemSeed = [
    { sku: 'AL-001', name: 'Aluminium Ingot', price: 1800 },
    { sku: 'CP-002', name: 'Copper Cathode', price: 4500 },
    { sku: 'ZN-003', name: 'Zinc Plate', price: 2750 },
    { sku: 'ST-004', name: 'Steel Coil', price: 3200 },
    { sku: 'LB-005', name: 'Lead Bullion', price: 3000 },
    { sku: 'SKU-006', name: 'Structural Steel ISMB 300', price: 72500 },
    { sku: 'CEM-007', name: 'OPC 53 Grade Cement (50kg bag)', price: 380 },
    { sku: 'TMT-008', name: 'TMT Bar 12mm Fe550', price: 62000 },
    { sku: 'WLD-009', name: 'Welding Electrode 3.15mm', price: 180 },
    { sku: 'PPE-010', name: 'Safety Helmet (ISI)', price: 250 },
    { sku: 'CBL-011', name: '33kV XLPE Cable', price: 900 },
  ]
  const itemIds: Record<string, number> = {}
  for (const it of itemSeed) {
    const i = await db.item.upsert({
      where: { sku: it.sku },
      create: { sku: it.sku, name: it.name, uomId: uoms['MT'], sellingPrice: it.price, costPrice: Math.round(it.price * 0.8), updatedAt: now },
      update: {},
    })
    itemIds[it.sku] = i.id
  }

  // ── Site Store Management (GRN / MRS / Issue / Returns / Tools / Gate
  // Pass / Equipment / Scrap / Physical Verification) — normalized against
  // Site, Job, PO and Item so it stays in sync with Sales/Purchase/Finance.
  const SI = (sku: string) => itemIds[sku]
  const jobId = (code: string) => (jobByCode.get(code) as any)?.id ?? null

  // Tools register — a few hand/power tools live at the busier sites.
  const toolSeed = [
    { code: 'TL-0001', name: 'Welding Machine 300A', category: 'Power Tool', site: S1, status: 'Issued' },
    { code: 'TL-0002', name: 'Portable Drill Machine', category: 'Power Tool', site: S1, status: 'Available' },
    { code: 'TL-0003', name: 'Total Station (Survey)', category: 'Survey Instrument', site: S4, status: 'Available' },
    { code: 'TL-0004', name: 'Concrete Vibrator', category: 'Power Tool', site: S4, status: 'Under Repair' },
    { code: 'TL-0005', name: 'Chain Pulley Block 5T', category: 'Lifting Tackle', site: S2, status: 'Issued' },
  ]
  const tools: any[] = []
  for (const t of toolSeed) tools.push(await db.finTool.create({ data: { toolCode: t.code, name: t.name, category: t.category, siteId: t.site.id, status: t.status } }))
  await db.finToolIssueLog.create({ data: { toolId: tools[0].id, issuedTo: 'Ramesh (Fitter)', issueDate: daysAgo(6), expectedReturnDate: daysAhead(4) } })
  await db.finToolIssueLog.create({ data: { toolId: tools[4].id, issuedTo: 'Suresh (Rigger)', issueDate: daysAgo(2), expectedReturnDate: daysAhead(8) } })
  await db.finToolIssueLog.create({ data: { toolId: tools[1].id, issuedTo: 'Vijay (Electrician)', issueDate: daysAgo(20), returnDate: daysAgo(15), condition: 'Good' } })

  // Equipment register — heavy plant/machinery with usage logs.
  const equipSeed = [
    { code: 'EQ-0001', name: 'Mobile Crane 50T', type: 'Crane', site: S1, status: 'Active', operator: 'Iqbal Khan' },
    { code: 'EQ-0002', name: 'DG Set 125 kVA', type: 'Generator', site: S4, status: 'Active', operator: 'Ram Singh' },
    { code: 'EQ-0003', name: 'JCB Excavator', type: 'Excavator', site: S5, status: 'Under Maintenance', operator: 'Bablu Yadav' },
  ]
  const equipment: any[] = []
  for (const e of equipSeed) equipment.push(await db.finEquipment.create({ data: { equipmentCode: e.code, name: e.name, type: e.type, siteId: e.site.id, status: e.status, operatorName: e.operator } }))
  await db.finEquipmentLog.create({ data: { equipmentId: equipment[0].id, logDate: daysAgo(3), hoursUsed: 6.5, fuelConsumed: 42, remarks: 'Boiler module lift' } })
  await db.finEquipmentLog.create({ data: { equipmentId: equipment[1].id, logDate: daysAgo(1), hoursUsed: 10, fuelConsumed: 65, remarks: 'Site power backup during shutdown' } })

  // GRN — material received against the live POs, so PO Register / 3-way
  // match and Site Store stay reconciled off the same purchase orders.
  const grnStoreSeed = [
    { seq: 1, po: pos[0], site: S1, job: JOB.s1, itemSku: 'TMT-008', qtyOrdered: 25, qtyReceived: 25, rate: 62000, day: 9 },
    { seq: 2, po: pos[1], site: S2, job: JOB.s2, itemSku: 'CBL-011', qtyOrdered: 1500, qtyReceived: 1200, rate: 900, day: 4 },
    { seq: 3, po: pos[2], site: S4, job: JOB.s4, itemSku: 'WLD-009', qtyOrdered: 500, qtyReceived: 500, rate: 180, day: 2 },
  ]
  for (const g of grnStoreSeed) {
    await db.finStoreGrn.create({
      data: {
        grnNo: `GRN/${TODAY.getFullYear()}/${String(g.seq).padStart(4, '0')}`,
        grnDate: daysAgo(g.day), poId: g.po.id, siteId: g.site.id, jobId: jobId(g.job),
        vendorName: g.po.vendorName, dcNo: `DC-${String(1000 + g.seq)}`, invoiceNo: `${g.po.poNo}-INV`, status: 'Posted',
        lines: { create: [{ itemId: SI(g.itemSku), qtyOrdered: g.qtyOrdered, qtyReceived: g.qtyReceived, qtyAccepted: g.qtyReceived, qtyRejected: 0, rate: g.rate, amount: g.qtyReceived * g.rate, condition: 'Good' }] },
      },
    })
  }

  // MRS — one full approval-workflow lifecycle per state (Draft / Pending /
  // Approved / Issued), so the approval queue and the issue-gating rule
  // (Store Issue requires an Approved MRS) both have real data to show.
  const mrsSeed = [
    { seq: 1, site: S1, job: JOB.s1, requestedBy: 'Ramesh (Fitter)', dept: 'Erection', purpose: 'Boiler support structure welding', status: 'Issued', approvedBy: 'Prakash Sahu', day: 8, lines: [{ sku: 'TMT-008', qtyRequested: 5, qtyIssued: 5 }, { sku: 'WLD-009', qtyRequested: 100, qtyIssued: 100 }] },
    { seq: 2, site: S2, job: JOB.s2, requestedBy: 'Suresh (Rigger)', dept: 'Electrical', purpose: 'Switchgear cable termination', status: 'Approved', approvedBy: 'Ankit Verma', day: 3, lines: [{ sku: 'CBL-011', qtyRequested: 200, qtyIssued: 0 }] },
    { seq: 3, site: S4, job: JOB.s4, requestedBy: 'Vijay (Electrician)', dept: 'Electrical', purpose: 'LT panel wiring', status: 'Pending', approvedBy: null, day: 1, lines: [{ sku: 'CBL-011', qtyRequested: 80, qtyIssued: 0 }] },
    { seq: 4, site: S5, job: JOB.s5, requestedBy: 'Deepak Mishra', dept: 'Civil', purpose: 'Conveyor foundation cement', status: 'Draft', approvedBy: null, day: 0, lines: [{ sku: 'CEM-007', qtyRequested: 60, qtyIssued: 0 }] },
  ]
  const mrsRecs: any[] = []
  for (const m of mrsSeed) {
    mrsRecs.push(await db.finMaterialRequisition.create({
      data: {
        mrsNo: `MRS/${TODAY.getFullYear()}/${String(m.seq).padStart(4, '0')}`,
        mrsDate: daysAgo(m.day), siteId: m.site.id, jobId: jobId(m.job),
        requestedBy: m.requestedBy, department: m.dept, purpose: m.purpose, status: m.status,
        approvedBy: m.approvedBy, approvedAt: m.approvedBy ? daysAgo(Math.max(m.day - 1, 0)) : null,
        lines: { create: m.lines.map(l => ({ itemId: SI(l.sku), qtyRequested: l.qtyRequested, qtyIssued: l.qtyIssued })) },
      },
    }))
  }

  // Store Issue — material actually handed out against the fully Issued MRS above.
  await db.finStoreIssue.create({
    data: {
      issueNo: `SI/${TODAY.getFullYear()}/0001`, issueDate: daysAgo(7), mrsId: mrsRecs[0].id, siteId: S1.id, jobId: jobId(JOB.s1),
      issuedTo: 'Ramesh (Fitter)', issuedBy: 'Prakash Sahu',
      lines: { create: [
        { itemId: SI('TMT-008'), qty: 5, rate: 62000, amount: 5 * 62000 },
        { itemId: SI('WLD-009'), qty: 100, rate: 180, amount: 100 * 180 },
      ] },
    },
  })

  // Material Return — excess cable returned to store after a completed pull.
  await db.finMaterialReturn.create({
    data: {
      returnNo: `MRN/${TODAY.getFullYear()}/0001`, returnDate: daysAgo(1), siteId: S2.id, jobId: jobId(JOB.s2),
      returnedBy: 'Suresh (Rigger)',
      lines: { create: [{ itemId: SI('CBL-011'), qty: 30, condition: 'Good', remarks: 'Excess after termination' }] },
    },
  })

  // Gate Pass — inward vendor delivery + outward tool sent for external repair.
  await db.finGatePass.create({ data: { gatePassNo: `GP/${TODAY.getFullYear()}/0001`, gatePassDate: daysAgo(9), type: 'Inward', siteId: S1.id, itemDescription: 'TMT Bar 12mm Fe550 delivery', qty: 25, vehicleNo: 'CG04-AB-1234', driverName: 'Mohan Lal', purpose: 'Vendor GRN delivery', authorizedBy: 'Prakash Sahu', status: 'Closed' } })
  await db.finGatePass.create({ data: { gatePassNo: `GP/${TODAY.getFullYear()}/0002`, gatePassDate: daysAgo(2), type: 'Outward', siteId: S4.id, itemDescription: 'Concrete Vibrator sent for repair', qty: 1, vehicleNo: 'CG04-CD-5678', driverName: 'Sanjay Rathore', purpose: 'External vendor repair', authorizedBy: 'Prakash Sahu', status: 'Open' } })

  // Scrap Management — off-cuts and damaged material awaiting disposal.
  await db.finScrapEntry.create({ data: { scrapNo: `SCR/${TODAY.getFullYear()}/0001`, scrapDate: daysAgo(5), siteId: S1.id, jobId: jobId(JOB.s1), itemId: SI('ST-004'), description: 'Steel coil off-cuts from fabrication', qty: 320, unit: 'kg', estimatedValue: 9600, disposalStatus: 'Pending' } })
  await db.finScrapEntry.create({ data: { scrapNo: `SCR/${TODAY.getFullYear()}/0002`, scrapDate: daysAgo(11), siteId: S4.id, jobId: jobId(JOB.s4), itemId: SI('CBL-011'), description: 'Damaged cable drum (transit damage)', qty: 40, unit: 'Mtr', estimatedValue: 12000, disposalStatus: 'Sold' } })

  // Physical Verification — monthly stock count with a small negative variance.
  await db.finPhysicalVerification.create({
    data: {
      verificationNo: `PV/${TODAY.getFullYear()}/0001`, verificationDate: daysAgo(2), siteId: S1.id, type: 'Monthly', verifiedBy: 'Prakash Sahu', status: 'Completed',
      lines: { create: [
        { itemId: SI('TMT-008'), bookQty: 20, physicalQty: 20, variance: 0 },
        { itemId: SI('WLD-009'), bookQty: 400, physicalQty: 392, variance: -8, remarks: 'Minor pilferage — reported to site incharge' },
      ] },
    },
  })

  // ── Sales customers, quotations & orders ──────────────────────────
  const salesCustNames = [CUST.balco.name, CUST.ntpc.name, CUST.cil.name, CUST.adani.name, CUST.tata.name]
  const salesCustIds: Record<string, number> = { [CUST.lnt.name]: cust.id }
  for (const n of salesCustNames) {
    const c = await db.customer.create({ data: { name: n, contactPerson: n.split(' ')[0] + ' Contact', updatedAt: now } })
    salesCustIds[n] = c.id
  }
  const qtnSeed = [
    { no: 'QTN-2026-002', cust: CUST.balco.name, day: 18, status: 'accepted', lines: [[ 'AL-001', 10, 1800 ], [ 'ST-004', 4, 3200 ]] },
    { no: 'QTN-2026-003', cust: CUST.ntpc.name, day: 25, status: 'sent', lines: [[ 'CP-002', 1000, 4500 ]] },
    { no: 'QTN-2026-004', cust: CUST.cil.name, day: 12, status: 'draft', lines: [[ 'ZN-003', 300, 2750 ]] },
    { no: 'QTN-2026-005', cust: CUST.adani.name, day: 30, status: 'rejected', lines: [[ 'LB-005', 150, 3000 ], [ 'AL-001', 5, 1800 ]] },
    { no: 'QTN-2026-006', cust: CUST.tata.name, day: 8, status: 'sent', lines: [[ 'SKU-006', 40, 72500 ]] },
  ]
  const quotationIds: Record<string, number> = {}
  for (const q of qtnSeed) {
    const lines = q.lines as Array<[string, number, number]>
    const subtotal = lines.reduce((s, l) => s + l[1] * l[2], 0)
    const qr = await db.quotation.create({
      data: { quotationNo: q.no, quotationDate: daysAgo(q.day), customerId: salesCustIds[q.cust], validUntil: daysAhead(30), status: q.status, subtotal, taxAmount: 0, totalAmount: subtotal, updatedAt: now },
    })
    quotationIds[q.no] = qr.id
    for (const [sku, qty, rate] of lines) {
      await db.quotationItem.create({ data: { quotationId: qr.id, itemId: itemIds[sku], qty, rate, amount: qty * rate } })
    }
  }
  const soSeed = [
    { no: 'SO-2026-002', cust: CUST.balco.name, day: 15, status: 'draft', qtn: 'QTN-2026-002', lines: [[ 'AL-001', 500, 1800 ], [ 'ST-004', 100, 3200 ]] },
    { no: 'SO-2026-003', cust: CUST.ntpc.name, day: 22, status: 'submitted', qtn: 'QTN-2026-003', lines: [[ 'CP-002', 1000, 4500 ]] },
    { no: 'SO-2026-004', cust: CUST.cil.name, day: 9, status: 'confirmed', qtn: 'QTN-2026-004', lines: [[ 'ST-004', 500, 3200 ], [ 'ZN-003', 300, 2750 ]] },
    { no: 'SO-2026-005', cust: CUST.adani.name, day: 4, status: 'draft', qtn: null, lines: [[ 'AL-001', 300, 1800 ]] },
  ]
  for (const o of soSeed) {
    const lines = o.lines as Array<[string, number, number]>
    const total = lines.reduce((s, l) => s + l[1] * l[2], 0)
    const so = await db.salesOrder.create({
      data: { soNo: o.no, soDate: daysAgo(o.day), customerId: salesCustIds[o.cust], quotationId: o.qtn ? quotationIds[o.qtn] : null, status: o.status, totalAmount: total, updatedAt: now },
    })
    for (const [sku, qty, rate] of lines) {
      await db.salesOrderItem.create({ data: { salesOrderId: so.id, itemId: itemIds[sku], qty, rate, amount: qty * rate } })
    }
  }

  // ── Procurement vendors (directory) ──────────────────────────────
  const vendorSeed = [
    { name: 'ElectroMech Solutions', categories: ['Electrical'], region: 'Maharashtra', status: 'preferred', rating: 4.2, contactPerson: 'Sandeep Joshi', phone: '+91-9876543001', email: 'sjoshi@electromech.in', address: 'Pune, Maharashtra', notes: 'Reliable electrical contractor for mining sites.', certificates: [{ name: 'ISO 9001', certNo: 'ISO-9001-EM-2023', issueDate: '2023-06-15', expiryDate: '2026-06-14' }, { name: 'ISO 14001', certNo: 'ISO-14001-EM-2023', issueDate: '2023-06-15', expiryDate: '2026-06-14' }, { name: 'GST Registration', certNo: 'GST-EM-2021', issueDate: '2021-07-01', expiryDate: '2026-06-30' }], metrics: { onTimeDelivery: 94, qualityRating: 4.3, priceCompetitiveness: 4.0 }, blacklistLog: [] },
    { name: 'PowerTech Industries', categories: ['Electrical', 'Mechanical'], region: 'Gujarat', status: 'standard', rating: 3.8, contactPerson: 'Amit Shah', phone: '+91-9876543002', email: 'amit@powertech.in', address: 'Vadodara, Gujarat', notes: '', certificates: [{ name: 'ISO 9001', certNo: 'ISO-9001-PT-2022', issueDate: '2022-04-01', expiryDate: '2025-03-31' }, { name: 'GST Registration', certNo: 'GST-PT-2021', issueDate: '2021-07-01', expiryDate: '2026-06-30' }], metrics: { onTimeDelivery: 82, qualityRating: 3.8, priceCompetitiveness: 3.5 }, blacklistLog: [] },
    { name: 'Bharat Heavy Electricals Ltd', categories: ['Electrical', 'Mechanical'], region: 'Multiple', status: 'preferred', rating: 4.5, contactPerson: 'Rajiv Mehta', phone: '+91-9876543003', email: 'rajiv@bhel.in', address: 'Bhopal, Madhya Pradesh', notes: 'Government PSU. Preferred partner for high-value electrical contracts.', certificates: [{ name: 'ISO 9001', certNo: 'ISO-9001-BHEL-2023', issueDate: '2023-01-01', expiryDate: '2026-12-31' }, { name: 'OHSAS 18001', certNo: 'OHSAS-BHEL-2023', issueDate: '2023-03-15', expiryDate: '2026-03-14' }, { name: 'GST Registration', certNo: 'GST-BHEL-2021', issueDate: '2021-07-01', expiryDate: '2026-06-30' }], metrics: { onTimeDelivery: 97, qualityRating: 4.7, priceCompetitiveness: 4.2 }, blacklistLog: [] },
    { name: 'MinMet Engineering', categories: ['Mechanical', 'Civil'], region: 'Odisha', status: 'standard', rating: 3.2, contactPerson: 'Prakash Nayak', phone: '+91-9876543004', email: 'prakash@minmet.in', address: 'Bhubaneswar, Odisha', notes: '', certificates: [{ name: 'ISO 9001', certNo: 'ISO-9001-MM-2021', issueDate: '2021-11-01', expiryDate: '2024-10-31' }, { name: 'GST Registration', certNo: 'GST-MM-2020', issueDate: '2020-06-01', expiryDate: '2025-05-31' }], metrics: { onTimeDelivery: 68, qualityRating: 3.0, priceCompetitiveness: 3.8 }, blacklistLog: [] },
    { name: 'Industrial Supplies Co', categories: ['Mechanical', 'Services'], region: 'Jharkhand', status: 'standard', rating: 3.5, contactPerson: 'Vikram Singh', phone: '+91-9876543005', email: 'vikram@indsupplies.in', address: 'Jamshedpur, Jharkhand', notes: '', certificates: [{ name: 'ISO 9001', certNo: 'ISO-9001-ISC-2022', issueDate: '2022-08-01', expiryDate: '2025-07-31' }, { name: 'GST Registration', certNo: 'GST-ISC-2020', issueDate: '2020-06-01', expiryDate: '2025-05-31' }], metrics: { onTimeDelivery: 76, qualityRating: 3.5, priceCompetitiveness: 3.3 }, blacklistLog: [] },
    { name: 'GreenTech Electricals', categories: ['Electrical'], region: 'Karnataka', status: 'blacklisted', rating: 2.8, contactPerson: 'Mahesh Rao', phone: '+91-9876543006', email: 'mahesh@greentech.in', address: 'Bengaluru, Karnataka', notes: 'Quality issues and repeated delivery failures.', certificates: [{ name: 'ISO 9001', certNo: 'ISO-9001-GT-2021', issueDate: '2021-03-01', expiryDate: '2024-02-29' }], metrics: { onTimeDelivery: 45, qualityRating: 2.5, priceCompetitiveness: 3.0 }, blacklistLog: [{ date: '2024-11-15', reason: 'Supplied substandard cable drums - failed QC inspection', setBy: 'Ramesh Kumar (QA)' }, { date: '2024-08-22', reason: 'Repeated late deliveries on 3 consecutive POs', setBy: 'Suresh Patel (Procurement)' }] },
    { name: 'Singh Civil Contractors', categories: ['Civil', 'Labour'], region: 'Madhya Pradesh', status: 'preferred', rating: 4.0, contactPerson: 'Gurpreet Singh', phone: '+91-9876543007', email: 'gurpreet@scc.in', address: 'Indore, Madhya Pradesh', notes: 'Excellent civil works team. Preferred for site development.', certificates: [{ name: 'ISO 9001', certNo: 'ISO-9001-SCC-2023', issueDate: '2023-05-01', expiryDate: '2026-04-30' }, { name: 'OHSAS 18001', certNo: 'OHSAS-SCC-2023', issueDate: '2023-05-01', expiryDate: '2025-04-30' }, { name: 'GST Registration', certNo: 'GST-SCC-2020', issueDate: '2020-08-01', expiryDate: '2025-07-31' }], metrics: { onTimeDelivery: 91, qualityRating: 4.2, priceCompetitiveness: 3.8 }, blacklistLog: [] },
    { name: 'Rapid Logistics', categories: ['Services'], region: 'West Bengal', status: 'blacklisted', rating: 2.5, contactPerson: 'Subrata Dey', phone: '+91-9876543008', email: 'subrata@rapidlogistics.in', address: 'Kolkata, West Bengal', notes: 'Frequent loss of materials in transit.', certificates: [{ name: 'GST Registration', certNo: 'GST-RL-2021', issueDate: '2021-04-01', expiryDate: '2026-03-31' }], metrics: { onTimeDelivery: 52, qualityRating: 2.0, priceCompetitiveness: 3.5 }, blacklistLog: [{ date: '2024-10-05', reason: 'Lost shipment worth ₹4.2L - insurance claim pending', setBy: 'Anita Verma (Logistics)' }, { date: '2024-03-28', reason: 'Unauthorized subcontracting of delivery route', setBy: 'Management' }] },
    { name: 'Pioneer Fabricators', categories: ['Mechanical', 'Civil'], region: 'Chhattisgarh', status: 'standard', rating: 3.0, contactPerson: 'Dilip Verma', phone: '+91-9876543009', email: 'dilip@pioneerfab.in', address: 'Raipur, Chhattisgarh', notes: '', certificates: [{ name: 'ISO 9001', certNo: 'ISO-9001-PF-2022', issueDate: '2022-09-01', expiryDate: '2025-08-31' }], metrics: { onTimeDelivery: 65, qualityRating: 3.2, priceCompetitiveness: 3.0 }, blacklistLog: [] },
    { name: 'Hitech Cables Ltd', categories: ['Electrical'], region: 'Maharashtra', status: 'preferred', rating: 4.3, contactPerson: 'Neha Kulkarni', phone: '+91-9876543010', email: 'neha@hitechcables.in', address: 'Mumbai, Maharashtra', notes: 'Premium cable supplier for all mining electrification projects.', certificates: [{ name: 'ISO 9001', certNo: 'ISO-9001-HCL-2023', issueDate: '2023-04-01', expiryDate: '2026-03-31' }, { name: 'OHSAS 18001', certNo: 'OHSAS-HCL-2024', issueDate: '2024-01-15', expiryDate: '2026-01-14' }, { name: 'GST Registration', certNo: 'GST-HCL-2019', issueDate: '2019-06-01', expiryDate: '2024-05-31' }], metrics: { onTimeDelivery: 96, qualityRating: 4.5, priceCompetitiveness: 3.8 }, blacklistLog: [] },
  ]
  for (const v of vendorSeed) await db.finVendor.create({ data: v as any })

  // ── Purchase Order register (simplified ledger view) ─────────────
  const poRegSeed = [
    { no: 'PO-2026-001', vendor: 'ElectroMech Solutions', proj: 'TPP Adani Godda', projShort: 'Godda', status: 'Open', req: daysAhead(25), match: { po: true, grn: false, inv: false }, items: [[ 'Structural Steel ISMB 300', 500, 'MT', 72000 ], [ '33kV XLPE Cable', 2000, 'Mtr', 4850 ]] },
    { no: 'PO-2026-002', vendor: 'Bharat Heavy Electricals Ltd', proj: 'TPP NTPC Barh', projShort: 'Barh', status: 'Partially Received', req: daysAhead(60), match: { po: true, grn: true, inv: false }, items: [[ 'Power Transformer 50 MVA 132/33kV', 2, 'Nos', 38500000 ]] },
    { no: 'PO-2026-003', vendor: 'PowerTech Industries', proj: 'BALCO Smelter Korba', projShort: 'BALCO', status: 'Partially Received', req: daysAhead(-5), match: { po: true, grn: true, inv: false }, items: [[ 'Centrifugal Pump 5000 LPM', 6, 'Nos', 1250000 ], [ 'Switchgear 11kV Panel', 5, 'Nos', 2750000 ]] },
    { no: 'PO-2026-004', vendor: 'MinMet Engineering', proj: 'Coal India Rajmahal', projShort: 'Rajmahal', status: 'Completed', req: daysAhead(-30), match: { po: true, grn: true, inv: true }, items: [[ 'Conveyor Belt 1200mm EP630/4', 800, 'm', 14500 ]] },
    { no: 'PO-2026-005', vendor: 'Hitech Cables Ltd', proj: 'BALCO Smelter Korba', projShort: 'BALCO', status: 'Open', req: daysAhead(90), match: { po: true, grn: false, inv: false }, items: [[ 'HV Power Cable 33kV 3Cx400sqmm', 1500, 'm', 4850 ]] },
    { no: 'PO-2026-006', vendor: 'Kirloskar Brothers', proj: 'JSW Vijayanagar', projShort: 'JSW', status: 'Open', req: daysAhead(15), match: { po: false, grn: false, inv: false }, items: [[ 'Vertical Turbine Pump 7500 LPM', 4, 'Nos', 1850000 ]] },
    { no: 'PO-2026-007', vendor: 'Siemens India', proj: 'TPP NTPC Barh', projShort: 'Barh', status: 'Completed', req: daysAhead(-45), match: { po: true, grn: true, inv: true }, items: [[ '13.8kV Switchgear Bay (Complete)', 8, 'Nos', 4200000 ]] },
    { no: 'PO-2026-008', vendor: 'ABB India', proj: 'Hindalco Mahan', projShort: 'Mahan', status: 'Partially Received', req: daysAhead(10), match: { po: true, grn: true, inv: false }, items: [[ 'MCC Panel 660V', 12, 'Nos', 780000 ]] },
  ]
  for (const p of poRegSeed) {
    const lines = (p.items as Array<[string, number, string, number]>).map((it, i) => {
      const total = it[1] * it[3]
      return { id: i + 1, itemDesc: it[0], qtyOrdered: it[1], qtyReceived: p.status === 'Completed' ? it[1] : p.status === 'Partially Received' ? Math.floor(it[1] * 0.6) : 0, unit: it[2], unitPrice: it[3], total }
    })
    const totalValue = lines.reduce((s, l) => s + l.total, 0)
    const completed = p.status === 'Completed'
    const partial = p.status === 'Partially Received'
    await db.finPO.create({
      data: {
        poNo: p.no, vendor: p.vendor, project: p.proj, projectShort: p.projShort, totalValue,
        deliveryAddress: 'Site Location, Korba, Chhattisgarh', requiredDate: p.req as Date,
        actualDeliveryDate: completed ? daysAgo(5) : partial ? daysAgo(1) : null,
        lineItems: lines, status: p.status, poIssueDate: daysAgo(60),
        grnDate: p.match.grn ? daysAgo(2) : null, invoiceMatchDate: p.match.inv ? daysAgo(1) : null,
        poIssued: p.match.po, grnCompleted: p.match.grn, invoiceMatched: p.match.inv,
      },
    })
  }

  console.log(`✅ Seed complete — ${sites.length} sites, ${parties.length} parties, ${invoices.length} invoices, ${pcSeed.length} petty cash vouchers, ${prSeed.length} purchase requisitions`)
  console.log(`   Chart of Accounts: ${Object.keys(accByCode).length} accounts · AR ${arSeed.length} · AP ${apSeed.length} · PO ${poSeed.length} · Projects ${projectSeed.length} · Sub-jobs ${subJobSeed.length}`)
  console.log(`   Site Store: ${grnStoreSeed.length} GRNs · ${mrsSeed.length} MRS · ${toolSeed.length} tools · ${equipSeed.length} equipment · 2 scrap entries · 1 physical verification`)
  console.log(`   Data is anchored to today (${TODAY.toISOString().slice(0, 10)}) so ageing buckets stay meaningful.`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await db.$disconnect() })
