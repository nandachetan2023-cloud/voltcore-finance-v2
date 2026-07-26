import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const now = new Date()
const d = (s: string) => new Date(s)

async function main() {
  console.log('🌱 Seeding database for Finance, Procurement, Sales & BD, Dashboard...')

  // ── Organization ──────────────────────────────────────────────
  const branch = await db.branch.create({ data: { name: 'Head Office Mumbai' } })
  const dept = await db.department.create({ data: { name: 'Project Execution', code: 'DEPT-PE' } })
  const desig = await db.designation.create({ data: { name: 'Site Engineer' } })
  const grade = await db.grade.create({ data: { name: 'Grade A', code: 'GRD-A', level: 1, updatedAt: now } })
  await db.holiday.create({ data: { name: 'Republic Day', date: new Date('2026-01-26'), updatedAt: now } })
  await db.holiday.create({ data: { name: 'Independence Day', date: new Date('2026-08-15'), updatedAt: now } })
  await db.warehouse.create({ data: { name: 'Main Warehouse Mumbai', code: 'WH-MUM', branchId: branch.id, updatedAt: now } })

  // ── Employee ──────────────────────────────────────────────────
  const emp1 = await db.employee.create({
    data: { employeeCode: 'EMP001', firstName: 'Rajesh', lastName: 'Kumar', email: 'rajesh.kumar@voltcore.in', phone: '+91-9876543210', dateOfJoining: new Date('2024-01-15'), employmentStatus: 'Active', departmentId: dept.id, designationId: desig.id, branchId: branch.id, gradeId: grade.id, updatedAt: now }
  })
  const emp2 = await db.employee.create({
    data: { employeeCode: 'EMP002', firstName: 'Priya', lastName: 'Sharma', email: 'priya.sharma@voltcore.in', phone: '+91-9876543211', dateOfJoining: new Date('2023-06-01'), employmentStatus: 'Active', departmentId: dept.id, designationId: desig.id, branchId: branch.id, gradeId: grade.id, updatedAt: now }
  })

  // ── Finance: Sites ────────────────────────────────────────────
  const site1 = await db.finSite.create({ data: { siteCode: 'SITE-001', name: 'TPP Adani Godda', location: 'Godda, Jharkhand', state: 'Jharkhand', status: 'Active' } })
  const site2 = await db.finSite.create({ data: { siteCode: 'SITE-002', name: 'TPP NTPC Barh', location: 'Barh, Bihar', state: 'Bihar', status: 'Active' } })
  await db.finSite.create({ data: { siteCode: 'SITE-003', name: 'HO Mumbai', location: 'Mumbai, Maharashtra', state: 'Maharashtra', status: 'Active' } })

  // ── Finance: Parties ──────────────────────────────────────────
  const party1 = await db.finParty.create({ data: { code: 'C001', name: 'L&T Construction', shortName: 'L&T', partyType: 'Customer', gstin: '27AABCL1234Q1Z1', pan: 'AABCL1234Q', address: 'Mumbai, Maharashtra', state: 'Maharashtra', stateCode: '27', contact: '+91-9876543210', tdsSection: '194C', tdsRate: 2, gstTreatment: 'Registered', isActive: true } })
  const party2 = await db.finParty.create({ data: { code: 'V001', name: 'Siemens India Ltd', shortName: 'Siemens', partyType: 'Vendor', gstin: '29AABCS5678R1Z1', pan: 'AABCS5678R', address: 'Bengaluru, Karnataka', state: 'Karnataka', stateCode: '29', contact: '+91-9876543211', tdsSection: '194C', tdsRate: 2, gstTreatment: 'Registered', isActive: true } })
  const party3 = await db.finParty.create({ data: { code: 'C002', name: 'Tata Projects', shortName: 'Tata Proj', partyType: 'Customer', gstin: '24AABCT9012L1Z1', pan: 'AABCT9012L', address: 'Ahmedabad, Gujarat', state: 'Gujarat', stateCode: '24', contact: '+91-9876543212', tdsSection: '194C', tdsRate: 2, gstTreatment: 'Registered', isActive: true } })
  await db.finParty.create({ data: { code: 'C003', name: 'NTPC Limited', shortName: 'NTPC', partyType: 'Customer', gstin: '07AABCN1234P1Z1', pan: 'AABCN1234P', address: 'New Delhi', state: 'Delhi', stateCode: '07', contact: '+91-9876543213', tdsSection: '194I', tdsRate: 10, gstTreatment: 'Registered', isActive: true } })
  await db.finParty.create({ data: { code: 'V002', name: 'Hindalco Industries Ltd', shortName: 'Hindalco', partyType: 'Vendor', gstin: '09AABCH5678M1Z1', pan: 'AABCH5678M', address: 'Noida, Uttar Pradesh', state: 'Uttar Pradesh', stateCode: '09', contact: '+91-9876543214', tdsSection: '194C', tdsRate: 1, gstTreatment: 'Registered', isActive: true } })
  await db.finParty.create({ data: { code: 'C004', name: 'BALCO Industries', shortName: 'BALCO', partyType: 'Customer', gstin: '22AABCB9012K1Z1', pan: 'AABCB9012K', address: 'Korba, Chhattisgarh', state: 'Chhattisgarh', stateCode: '22', contact: '+91-9876543215', tdsSection: '194C', tdsRate: 2, gstTreatment: 'Registered', isActive: true } })
  await db.finParty.create({ data: { code: 'C005', name: 'Coal India Limited', shortName: 'CIL', partyType: 'Customer', gstin: '19AABCC1234R1Z1', pan: 'AABCC1234R', address: 'Kolkata, West Bengal', state: 'West Bengal', stateCode: '19', contact: '+91-9876543216', tdsSection: '194C', tdsRate: 2, gstTreatment: 'Registered', isActive: true } })
  await db.finParty.create({ data: { code: 'V003', name: 'Ramesh Transport Services', shortName: 'Ramesh Trans', partyType: 'Vendor', gstin: '24AABCR5678H1Z1', pan: 'AABCR5678H', address: 'Raipur, Chhattisgarh', state: 'Chhattisgarh', stateCode: '22', contact: '+91-9876543217', udyam: 'UDYAM-CT-01-0003456', tdsSection: '194C', tdsRate: 1, gstTreatment: 'Registered', isActive: true } })
  await db.finParty.create({ data: { code: 'E001', name: 'Sunil Verma (Employee Advance)', shortName: 'Sunil Verma', partyType: 'Employee', pan: 'IIIII8888I', address: 'Mumbai, Maharashtra', state: 'Maharashtra', stateCode: '27', contact: '+91-9876543218', tdsSection: '192', tdsRate: 10, gstTreatment: 'Unregistered', isActive: true } })
  await db.finParty.create({ data: { code: 'H001', name: 'M/s Kumar & Associates', shortName: 'Kumar Assoc', partyType: 'Advance Holder', pan: 'JJJJJ9999J', address: 'Patna, Bihar', state: 'Bihar', stateCode: '10', contact: '+91-9876543219', tdsSection: '194C', tdsRate: 2, gstTreatment: 'Unregistered', isActive: true } })

  // ── Finance: Chart of Accounts ────────────────────────────────
  const accRev = await db.finAccount.create({ data: { accountCode: '4001', name: 'Project Revenue', group: 'Income', type: 'Income' } })
  const accBank = await db.finAccount.create({ data: { accountCode: '1101', name: 'SBI Current Account', group: 'Bank Accounts', type: 'Asset' } })
  await db.finAccount.create({ data: { accountCode: '2001', name: 'Accounts Payable', group: 'Current Liabilities', type: 'Liability' } })
  await db.finAccount.create({ data: { accountCode: '5001', name: 'Labour Cost', group: 'Project Cost', type: 'Expense' } })

  // ── Finance: Invoices ─────────────────────────────────────────
  const inv1 = await db.finInvoice.create({
    data: { invoiceNo: 'INV-2026-001', siteId: site1.id, partyId: party1.id, invoiceDate: new Date('2026-01-01'), dueDate: new Date('2026-02-01'), invoiceValue: 2500000, gstValue: 450000, grandTotal: 2950000, afterTdsBalance: 2800000, balanceAmount: 2800000, status: 'Unpaid' }
  })
  const inv2 = await db.finInvoice.create({
    data: { invoiceNo: 'INV-2026-002', siteId: site2.id, partyId: party1.id, invoiceDate: new Date('2026-01-15'), dueDate: new Date('2026-02-15'), invoiceValue: 1800000, gstValue: 324000, grandTotal: 2124000, afterTdsBalance: 2017800, balanceAmount: 2017800, status: 'Unpaid' }
  })

  // ── Finance: Outstanding ──────────────────────────────────────
  await db.finOutstanding.create({ data: { invoiceId: inv1.id, billNo: 'INV-2026-001', billDate: new Date('2026-01-01'), invoiceValue: 2500000, gstValue: 450000, totalInvoiceValue: 2950000, afterTdsBalance: 2800000, balanceAmount: 2800000 } })
  await db.finOutstanding.create({ data: { invoiceId: inv2.id, billNo: 'INV-2026-002', billDate: new Date('2026-01-15'), invoiceValue: 1800000, gstValue: 324000, totalInvoiceValue: 2124000, afterTdsBalance: 2017800, balanceAmount: 2017800 } })

  // ── Finance: Budget ───────────────────────────────────────────
  const budget = await db.finBudget.create({ data: { fiscalYear: '2026-27', name: 'Annual Budget 2026-27', siteId: site1.id, version: '1.0', totalAmount: 50000000, finSiteId: site1.id } })
  for (let m = 1; m <= 12; m++) {
    await db.finBudgetLine.create({ data: { budgetId: budget.id, accountId: accRev.id, month: m, amount: 4000000 } })
  }

  // ── Finance: Journal Entry ────────────────────────────────────
  const je = await db.finJournalEntry.create({
    data: { entryNo: 'JE-2026-001', entryDate: new Date('2026-01-31'), description: 'Monthly revenue recognition', status: 'Posted', totalDebit: 2950000, totalCredit: 2950000, finSiteId: site1.id, siteId: site1.id }
  })
  await db.finJournalLine.create({ data: { entryId: je.id, accountId: accRev.id, description: 'Project Revenue', credit: 2950000 } })
  await db.finJournalLine.create({ data: { entryId: je.id, accountId: accBank.id, description: 'Bank Account', debit: 2950000 } })

  // ── Finance: Payment Advice ───────────────────────────────────
  const pa = await db.finPaymentAdvice.create({
    data: { adviceNo: 'PA-2026-001', partyId: party2.id, siteId: site1.id, totalAmount: 150000, paymentDate: new Date('2026-01-20'), paymentMode: 'Bank Transfer', status: 'Paid' }
  })
  await db.finPaymentAdviceLine.create({ data: { adviceId: pa.id, invoiceId: inv1.id, amount: 150000 } })

  // ── Finance: Expense Claim ────────────────────────────────────
  const ec = await db.finExpenseClaim.create({
    data: { claimNo: 'EC-2026-001', siteId: site1.id, siteType: 'Site', expenseType: 'Travel', submittedBy: 'Rajesh Kumar', date: new Date('2026-01-10'), totalAmount: 25000, gstAmount: 4500, approvalStatus: 'Approved', status: 'Approved' }
  })
  await db.finExpenseItem.create({ data: { claimId: ec.id, itemDate: new Date('2026-01-10'), category: 'Travel', name: 'Site Visit', amount: 25000 } })

  // ── Finance: Petty Cash ───────────────────────────────────────
  await db.finPettyCash.create({ data: { voucherNo: 'PC-2026-001', date: new Date('2026-01-05'), description: 'Stationery purchase', amount: 5000, type: 'Debit', partyId: party2.id, siteId: site1.id, balance: 95000 } })

  // ── Finance: Purchase Order ───────────────────────────────────
  const fpo = await db.finPurchaseOrder.create({
    data: { poNo: 'PO-FIN-2026-001', vendorId: 'V001', vendorName: 'Siemens India Ltd', siteId: site1.id, date: new Date('2026-01-05'), totalAmount: 850000, status: 'Approved' }
  })
  await db.finPOItem.create({ data: { poId: fpo.id, description: 'Circuit Breaker 32A', quantity: 10, unitRate: 85000, total: 850000 } })

  // ── Finance: Credit Note ──────────────────────────────────────
  await db.finCreditNote.create({ data: { creditNoteNo: 'CN-2026-001', invoiceId: inv1.id, siteId: site1.id, date: new Date('2026-01-25'), amount: 50000, status: 'Issued' } })

  // ── Finance: Asset ────────────────────────────────────────────
  const asset = await db.finAsset.create({
    data: { assetCode: 'AST-001', name: 'Tower Crane TC-5610', category: 'Machinery', acquisitionDate: new Date('2025-06-01'), cost: 4500000, salvageValue: 500000, usefulLife: 10, depreciationMethod: 'Straight Line', status: 'Active', finSiteId: site1.id }
  })
  await db.finAssetDepreciation.create({ data: { assetId: asset.id, period: '2026-01', amount: 33333, bookValue: 4466667 } })

  // ── Finance: Bank & Cash ──────────────────────────────────────
  const bank = await db.bankAccount.create({ data: { accountName: 'SBI Current Account', bankName: 'State Bank of India', accountNo: 'SBIN0001234', ifsc: 'SBIN0001234', type: 'Current', balance: 5000000, status: 'Active' } })
  await db.bankTransaction.create({ data: { bankAccountId: bank.id, date: new Date('2026-01-31'), type: 'Credit', amount: 2950000, balance: 7950000, party: 'L&T Construction', description: 'Invoice payment received' } })

  // ── Finance: Alerts & Follow-ups ──────────────────────────────
  await db.finAlert.create({ data: { type: 'Overdue', title: 'Overdue Invoice', message: 'INV-2026-001 is 30 days overdue', invoiceId: inv1.id, siteId: site1.id, amount: 2800000 } })
  await db.finFollowUp.create({ data: { invoiceId: inv1.id, clientName: 'L&T Construction', invoiceNo: 'INV-2026-001', balanceAmount: 2800000, contactNo: '+91-9876543210', contactPerson: 'Rajesh Kumar', followUpDate: new Date('2026-02-15') } })

  // ── Sales/BD: Clients ─────────────────────────────────────────
  const client1 = await db.finClient.create({ data: { name: 'L&T Construction', sector: 'Power', strength: 'Large', website: 'www.lntconstruction.com', industry: 'Infrastructure' } })
  const client2 = await db.finClient.create({ data: { name: 'Tata Projects', sector: 'Power', strength: 'Large', website: 'www.tataprojects.com', industry: 'Engineering' } })
  await db.finClientContact.create({ data: { clientId: client1.id, name: 'Amit Singh', role: 'Procurement Head', phone: '+91-9988776655', email: 'amit.singh@lnt.com' } })
  await db.finClientProject.create({ data: { clientId: client1.id, name: 'Godda 660MW Unit 5', value: 50000000, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'), sector: 'Power' } })

  // ── Sales/BD: Opportunities ───────────────────────────────────
  const opp1 = await db.finOpportunity.create({
    data: { projectName: 'Godda 660MW Unit 5 Erection', clientName: 'L&T Construction', value: 50000000, sector: 'Power', winProbability: 75, dueDate: new Date('2026-06-30'), bdOwner: 'Vikram Patel', scope: 'Complete erection of Boiler and TG', stage: 'Negotiate' }
  })
  await db.finOpportunity.create({
    data: { projectName: 'Barh 500MW Unit 3 Overhaul', clientName: 'Tata Projects', value: 35000000, sector: 'Power', winProbability: 60, dueDate: new Date('2026-08-31'), bdOwner: 'Vikram Patel', scope: 'Turbine overhaul and maintenance', stage: 'Qualify' }
  })
  await db.finOpportunityContact.create({ data: { opportunityId: opp1.id, name: 'Suresh Reddy', role: 'Project Director', phone: '+91-8877665544', email: 'suresh.reddy@lnt.com' } })
  await db.finOppGoNoGo.create({ data: { opportunityId: opp1.id, label: 'Strategic Fit', checked: true, signOff: 'Vikram Patel' } })
  await db.finOppStageHistory.create({ data: { opportunityId: opp1.id, stage: 'Lead', timestamp: new Date().toISOString() } })

  // ── Sales/BD: Tenders ─────────────────────────────────────────
  const tender = await db.finTender.create({
    data: { tenderNo: 'TDR-2026-001', client: 'NTPC Ltd', project: 'Barh 500MW Unit 3', sector: 'Power', rftIssueDate: new Date('2026-01-01'), submissionDeadline: new Date('2026-02-15'), estimatedValue: 45000000, estimator: 'Vikram Patel', status: 'Submitted', description: 'Annual maintenance contract' }
  })
  await db.finTenderDocument.create({ data: { tenderId: tender.id, name: 'Technical Bid', status: 'Submitted' } })
  await db.finTenderBidTeam.create({ data: { tenderId: tender.id, name: 'Vikram Patel', role: 'Bid Manager' } })
  await db.finTenderEvaluation.create({ data: { tenderId: tender.id, technicalScore: 85, commercialScore: 78, totalScore: 81.5, evaluatorNotes: 'Competitive bid' } })

  // ── Sales: Legacy Order / Quotation / Tax Invoice ────────────
  const cust = await db.customer.create({ data: { name: 'L&T Construction', contactPerson: 'Amit Singh', email: 'purchase@lnt.com', phone: '+91-9988776655', updatedAt: now } })
  await db.salesOrder.create({ data: { soNo: 'SO-2026-001', soDate: new Date('2026-01-10'), customerId: cust.id, status: 'Confirmed', totalAmount: 590000, updatedAt: now } })
  await db.quotation.create({ data: { quotationNo: 'QTN-2026-001', quotationDate: new Date('2026-01-05'), customerId: cust.id, validUntil: new Date('2026-02-28'), status: 'sent', subtotal: 750000, taxAmount: 135000, totalAmount: 885000, updatedAt: now } })
  await db.salesTaxInvoice.create({ data: { invoiceNo: 'TX-2026-001', invoiceDate: new Date('2026-01-20'), customerId: cust.id, customerName: 'L&T Construction', customerGstin: '27AABCL1234Q1Z1', customerStateCode: '27', placeOfSupply: '27', poNo: 'PO-001', taxableAmount: 300000, cgstAmount: 27000, sgstAmount: 27000, igstAmount: 0, totalAmount: 354000, status: 'submitted', updatedAt: now } })

  // ── Sales: Profit & Loss Entry ────────────────────────────────
  await db.profitLossEntry.create({ data: { site: 'TPP Adani Godda', month: '2026-01', side: 'credit', category: 'Project Revenue', particular: 'Erection Income', amount: 2500000 } })
  await db.profitLossEntry.create({ data: { site: 'TPP Adani Godda', month: '2026-01', side: 'debit', category: 'Labour Cost', particular: 'Site Labour', amount: 850000 } })

  // ── Procurement: Purchase Requisition ─────────────────────────
  const pr = await db.finPurchaseRequisition.create({
    data: { prNo: 'PR-2026-001', date: new Date('2026-01-05'), requester: 'Rajesh Kumar', project: 'Godda Unit 5', totalEstCost: 250000, status: 'Approved' }
  })
  await db.finPRLineItem.create({ data: { prId: pr.id, description: 'Safety Helmets', qty: 100, unit: 'Nos', estCost: 2500, total: 250000 } })
  await db.finPRApproval.create({ data: { prId: pr.id, role: 'Project Manager', label: 'Project Head', status: 'Approved' } })

  // ── Procurement: RFQ ──────────────────────────────────────────
  const rfq = await db.finRFQ.create({
    data: { rfqNo: 'RFQ-2026-001', description: 'Safety equipment procurement', issueDate: new Date('2026-01-10'), responseDeadline: new Date('2026-01-25'), project: 'Godda Unit 5', status: 'Awarded' }
  })
  await db.finRFQLineItem.create({ data: { rfqId: rfq.id, description: 'Safety Helmet', qty: 100, unit: 'Nos' } })
  await db.finRFQBid.create({ data: { rfqId: rfq.id, vendorId: 1, lineItemId: 1, unitPrice: 2500, leadTime: 7, compliant: true } })

  // ── Procurement: Subcontract ──────────────────────────────────
  await db.finSubcontract.create({
    data: { subcontractNo: 'SUB-2026-001', vendor: 'KEC International', project: 'Godda Unit 5', value: 5000000, startDate: new Date('2026-02-01'), endDate: new Date('2026-08-31'), status: 'Active', percentComplete: 25 }
  })

  // ── Procurement: Material Tracking ────────────────────────────
  await db.finMaterialTrackingItem.create({
    data: { poNo: 'PO-FIN-2026-001', vendor: 'Siemens India Ltd', project: 'Godda Unit 5', site: 'TPP Adani Godda', material: 'Circuit Breaker 32A', category: 'Electrical', unit: 'Nos', qtyRequired: 10, qtyStock: 0, qtyInTransit: 10, scheduledDate: new Date('2026-02-15'), expectedDate: new Date('2026-02-20'), status: 'In Transit' }
  })

  // ── Legacy: Purchase Order / Invoice / AP / AR / JE / Ledger ──
  await db.purchaseOrder.create({ data: { poNo: 'PO-LEGACY-001', poDate: new Date('2026-01-15'), warehouseId: 1, status: 'open', subtotal: 350000, taxAmount: 63000, totalAmount: 413000, updatedAt: now } })
  await db.invoice.create({ data: { invoiceNo: 'INV-LEGACY-001', invoiceDate: new Date('2026-01-20'), customerId: cust.id, status: 'sent', totalAmount: 590000, updatedAt: now } })
  await db.accountsPayable.create({ data: { billNo: 'AP-2026-001', vendor: 'Siemens India Ltd', amount: 850000, totalAmount: 850000, dueDate: new Date('2026-02-15'), status: 'Pending' } })
  await db.accountsReceivable.create({ data: { invoiceNo: 'AR-2026-001', client: 'L&T Construction', amount: 2800000, totalAmount: 2800000, dueDate: new Date('2026-02-01'), status: 'Pending' } })
  await db.journalEntry.create({ data: { entryNo: 'JE-Legacy-001', date: new Date('2026-01-31'), account: 'Project Revenue', debit: 0, credit: 2950000, voucherType: 'Journal', status: 'Posted' } })
  await db.ledgerAccount.create({ data: { accountCode: 'LEDGER-001', name: 'General Ledger Account', group: 'Assets', type: 'Asset', balance: 5000000 } })
  await db.bankAccount.create({ data: { accountName: 'HDFC Term Deposit', bankName: 'HDFC Bank', accountNo: 'HDFC0005678', ifsc: 'HDFC0005678', type: 'Deposit', balance: 10000000, status: 'Active' } })
  await db.taxRecord.create({ data: { taxType: 'GST', period: '2026-01', amount: 774000, dueDate: new Date('2026-02-20'), status: 'Pending' } })
  await db.budgetItem.create({ data: { category: 'Project Revenue', description: 'Q1 2026 Revenue Target', planned: 50000000, actual: 2950000, variance: -47050000, period: 'Q1-2026', status: 'On Track' } })

  // ── Attendance Log (for dashboard) ──────────────────────────
  await db.attendanceLog.create({ data: { employeeId: emp1.id, logDate: new Date(), punchIn: new Date('2026-01-31T08:00:00Z'), punchOut: new Date('2026-01-31T17:30:00Z'), status: 'Present', source: 'manual', updatedAt: now } })
  await db.attendanceLog.create({ data: { employeeId: emp2.id, logDate: new Date(), punchIn: new Date('2026-01-31T09:00:00Z'), punchOut: new Date('2026-01-31T18:00:00Z'), status: 'Present', source: 'manual', updatedAt: now } })

  console.log('✅ Seed completed successfully')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await db.$disconnect() })
