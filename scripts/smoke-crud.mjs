// End-to-end CRUD smoke test for the Finance, Purchase and Inventory modules.
// Drives the real API routes the way each screen's form does: list -> create ->
// update -> delete, then cleans up anything that has no DELETE route.
//
// Usage: node scripts/smoke-crud.mjs [baseUrl]
import { PrismaClient } from '@prisma/client'

const BASE = process.argv[2] || process.env.BASE_URL || 'http://localhost:3000'
const ACTOR = 'qa-crud@voltcore.local'
const TAG = Date.now().toString().slice(-6)
const db = new PrismaClient()

let pass = 0
const failures = []
const cleanup = []

function ok(name, detail = '') {
  pass++
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`)
}
function bad(name, detail = '') {
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-actor-email': ACTOR },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let json = null
  try { json = await res.json() } catch { /* non-JSON */ }
  return { status: res.status, json }
}

function expectStatus(label, res, want) {
  const okStatus = Array.isArray(want) ? want.includes(res.status) : res.status === want
  if (okStatus) ok(label, `${res.status}`)
  else bad(label, `got ${res.status} ${JSON.stringify(res.json?.error ?? res.json).slice(0, 160)}`)
  return okStatus
}

// Runs GET -> POST -> PUT -> DELETE against one collection.
// create: (ctx) => payload ; update: (ctx, created) => payload ; idOf: (json) => id
async function crud(name, path, opts) {
  const { create, update, idOf = (j) => j?.data?.id, listKey = 'data', skipDelete = false } = opts

  const list = await api('GET', path)
  if (!expectStatus(`${name}: GET list`, list, 200)) return
  if (!list.json?.success) bad(`${name}: list payload`, JSON.stringify(list.json).slice(0, 120))

  const created = await api('POST', path, create())
  if (!expectStatus(`${name}: POST create`, created, [200, 201])) return
  const id = idOf(created.json)
  if (!id) { bad(`${name}: create returned id`, JSON.stringify(created.json).slice(0, 160)); return }
  ok(`${name}: created #${id}`)

  if (update) {
    const updPath = opts.updatePath ? opts.updatePath(id) : opts.pathFor ? opts.pathFor(id) : path
    const upd = await api('PUT', updPath, update(id))
    expectStatus(`${name}: PUT update`, upd, 200)
  }

  if (!skipDelete) {
    const delPath = opts.deletePath ? opts.deletePath(id) : opts.pathFor ? `${opts.pathFor(id)}` : `${path}?id=${id}`
    const del = await api('DELETE', delPath)
    const delOk = expectStatus(`${name}: DELETE`, del, [200, 204])
    if (!delOk) cleanup.push({ model: opts.model, id })
  } else if (opts.model) {
    cleanup.push({ model: opts.model, id })
  }
}

async function run() {
  console.log(`Driving ${BASE} as ${ACTOR}\n`)

  // ── Full-authority actor so create/edit/delete gates all pass ──────────
  const director = await db.finRole.findFirst({ where: { code: 'DIRECTOR' } })
  if (!director) {
    bad('seed: DIRECTOR role present', 'run npx tsx scripts/seed-fin-rbac.ts')
  } else {
    const existing = await db.finUserRole.findFirst({ where: { userEmail: ACTOR, roleId: director.id } })
    if (!existing) {
      await db.finUserRole.create({ data: { userEmail: ACTOR, roleId: director.id, userName: 'QA CRUD', isActive: true } })
    }
    ok('seeded QA actor with DIRECTOR role')
  }

  // ── Reference data from the seed ───────────────────────────────────────
  const sitesRes = await api('GET', '/api/fin/sites')
  const site = sitesRes.json?.data?.[0]
  const jobsRes = await api('GET', '/api/fin/jobs')
  const job = jobsRes.json?.data?.find((j) => j.siteId === site?.id) || jobsRes.json?.data?.[0]
  if (!site || !job) { bad('seed reference data', 'no site/job found — run npx tsx prisma/seed.ts'); return }
  const ctx = {
    siteId: site.id,
    siteCode: site.siteCode,
    jobCode: job.jobCode,
    costCenter: `CC-${site.siteCode}`,
    department: 'Projects',
    projectManager: site.responsiblePerson || 'QA Manager',
  }
  ok('reference data', `${site.siteCode} / ${job.jobCode}`)

  const fined = (extra = {}) => ({
    siteId: ctx.siteId, jobCode: ctx.jobCode, poNo: `QA-PO-${TAG}`, costCenter: ctx.costCenter,
    department: ctx.department, projectManager: ctx.projectManager, actor: ACTOR, ...extra,
  })

  // ── Finance: master data ───────────────────────────────────────────────
  await crud('sites', '/api/fin/sites', {
    model: 'finSite',
    create: () => ({ name: `QA Site ${TAG}`, location: 'QA', state: 'QA', status: 'Active' }),
    update: (id) => ({ id, name: `QA Site ${TAG} (edited)` }),
  })
  await crud('jobs', '/api/fin/jobs', {
    model: 'finJob',
    create: () => ({ siteId: ctx.siteId, description: `QA Job ${TAG}` }),
    update: (id) => ({ id, description: `QA Job ${TAG} (edited)` }),
  })
  await crud('parties', '/api/fin/parties', {
    model: 'finParty',
    create: () => ({ name: `QA Party ${TAG}`, partyType: 'Vendor' }),
    update: (id) => ({ id, name: `QA Party ${TAG} (edited)` }),
  })
  const catRes = await api('POST', '/api/fin/item-categories', { code: 'QAQ', name: `QA Category ${TAG}` })
  const categoryId = catRes.json?.data?.id
  if (categoryId) ok(`item-categories: created #${categoryId}`); else bad('item-categories: POST create', JSON.stringify(catRes.json).slice(0, 140))
  await crud('items', '/api/fin/items', {
    model: 'finItem',
    create: () => ({ name: `QA Item ${TAG}`, categoryId: categoryId ?? null, rate: 25, uom: 'Nos' }),
    update: (id) => ({ id, name: `QA Item ${TAG} (edited)`, rate: 30 }),
  })

  // ── Finance: transactions ──────────────────────────────────────────────
  await crud('invoices', '/api/fin/invoices', {
    model: 'finInvoice',
    create: () => fined({
      client: `QA Client ${TAG}`, invoiceDate: '2026-01-15', dueDate: '2026-04-15',
      invoiceValue: 100000, gstValue: 18000, grandTotal: 118000, balanceAmount: 118000,
      status: 'Unpaid', description: 'QA invoice', tdsDeduction: 0, afterTdsBalance: 118000,
    }),
    update: (id) => fined({ id, description: 'QA invoice (edited)' }),
  })

  const invList = await api('GET', '/api/fin/invoices')
  const invoiceId = invList.json?.data?.[0]?.id
  const vRes = await api('GET', '/api/fin/vendors')
  const vendor = vRes.json?.data?.[0]
  const vendorId = vendor?.vendorCode || (vendor?.id ? String(vendor.id) : 'QA-VENDOR')
  if (!invoiceId) bad('credit-notes: need an existing invoice')
  if (!vendor) bad('purchase-orders: need an existing contractor')

  await crud('credit-notes', '/api/fin/credit-notes', {
    model: 'finCreditNote',
    create: () => fined({ invoiceId, client: `QA Client ${TAG}`, amount: 5000, status: 'Open', date: new Date('2026-01-20').toISOString(), reason: 'QA' }),
    update: (id) => fined({ id, invoiceId, amount: 6000 }),
  })

  const poPrereq = await api('POST', '/api/fin/purchase-orders', fined({
    vendorId, vendorName: `QA Vendor ${TAG}`, totalAmount: 50000, date: new Date('2026-01-10').toISOString(), descriptionOfWork: 'QA PO',
  }))
  const poId = poPrereq.json?.data?.id
  if (poId) ok(`purchase-orders: created prerequisite PO #${poId}`)
  else bad('purchase-orders: prerequisite PO', JSON.stringify(poPrereq.json).slice(0, 140))

  await crud('purchase-orders', '/api/fin/purchase-orders', {
    model: 'finPurchaseOrder',
    create: () => { const { poNo: _p, ...p } = fined({ vendorId, vendorName: `QA Vendor ${TAG}`, totalAmount: 50000, date: new Date('2026-01-10').toISOString(), descriptionOfWork: 'QA PO' }); return p },
    update: (id) => { const { poNo: _p, ...p } = fined({ id, vendorId, vendorName: `QA Vendor ${TAG}`, totalAmount: 55000, date: new Date('2026-01-10').toISOString() }); return p },
  })
  await crud('payment-advices', '/api/fin/payment-advices', {
    model: 'finPaymentAdvice',
    create: () => { const { poNo: _p, ...p } = fined({ adviceNo: `QA-PA-${TAG}`, poId: poId ?? null, totalAmount: 10000, paymentDate: new Date('2026-01-25').toISOString(), paymentMode: 'NEFT', supplierName: `QA Vendor ${TAG}`, lines: [] }); return p },
    update: (id) => { const { poNo: _p, ...p } = fined({ id, adviceNo: `QA-PA-${TAG}`, poId: poId ?? null, totalAmount: 11000, paymentDate: new Date('2026-01-25').toISOString(), paymentMode: 'RTGS', supplierName: `QA Vendor ${TAG}` }); return p },
  })
  await crud('accounts-payable', '/api/accounts-payable', {
    model: 'accountsPayable',
    create: () => ({ vendor: `QA Vendor ${TAG}`, vendorCode: 'QA', invoiceRef: `QA-REF-${TAG}`, description: 'QA bill', amount: 10000, tax: 1800, totalAmount: 11800, dueDate: new Date('2026-03-15').toISOString(), status: 'Pending', siteId: ctx.siteId, poId: poId ?? null, jobCode: ctx.jobCode, costCenter: ctx.costCenter, department: ctx.department, projectManager: ctx.projectManager, actor: ACTOR }),
    update: (id) => ({ id, vendor: `QA Vendor ${TAG}`, dueDate: new Date('2026-03-15').toISOString(), status: 'Approved', siteId: ctx.siteId, poId: poId ?? null, jobCode: ctx.jobCode, costCenter: ctx.costCenter, department: ctx.department, projectManager: ctx.projectManager, actor: ACTOR }),
  })
  await crud('accounts-receivable', '/api/accounts-receivable', {
    model: 'accountsReceivable',
    create: () => ({ client: `QA Client ${TAG}`, clientCode: 'QA', invoiceRef: `QA-REF-${TAG}`, description: 'QA receivable', amount: 20000, tax: 3600, totalAmount: 23600, dueDate: new Date('2026-03-20').toISOString(), status: 'Pending', receivedAmount: 0, tdsAmount: 0, siteId: ctx.siteId, jobCode: ctx.jobCode, poNo: `QA-PO-${TAG}`, costCenter: ctx.costCenter, department: ctx.department, projectManager: ctx.projectManager, actor: ACTOR }),
    update: (id) => ({ id, client: `QA Client ${TAG}`, dueDate: new Date('2026-03-20').toISOString(), receivedAmount: 1000, siteId: ctx.siteId, jobCode: ctx.jobCode, poNo: `QA-PO-${TAG}`, costCenter: ctx.costCenter, department: ctx.department, projectManager: ctx.projectManager, actor: ACTOR }),
  })

  await crud('expense-claims', '/api/fin/expense-claims', {
    model: 'finExpenseClaim',
    create: () => ({ siteId: ctx.siteId, expenseType: 'Travel', submittedBy: 'QA', date: '2026-01-12', totalAmount: 2500, actor: ACTOR, items: [{ description: 'Taxi', amount: 2500 }] }),
    update: (id) => ({ id, siteId: ctx.siteId, expenseType: 'Travel', status: 'Submitted', totalAmount: 2600, actor: ACTOR }),
  })
  await crud('po-register', '/api/fin/po-register', {
    model: 'finPO',
    create: () => ({ poNo: `QA-POREG-${TAG}`, vendor: `QA Vendor ${TAG}`, project: 'QA Project', totalValue: 40000 }),
    update: (id) => ({ id, totalValue: 42000 }),
  })
  await crud('ra-bills', '/api/fin/ra-bills', {
    model: 'finMootBill',
    create: () => ({ jobCode: ctx.jobCode, poTotal: 100000, workPercent: 10, withholding: 5 }),
    update: (id) => ({ id, jobCode: ctx.jobCode, poTotal: 100000, workPercent: 20, withholding: 5 }),
  })

  // petty-cash has its own approve flow
  const pc = await api('POST', '/api/fin/petty-cash', {
    description: `QA petty ${TAG}`, amount: 500, category: 'Misc', siteId: ctx.siteId, jobCode: ctx.jobCode, actor: ACTOR,
  })
  if (expectStatus('petty-cash: POST create', pc, [200, 201])) {
    const pcId = pc.json?.data?.id
    const sub = await api('POST', '/api/fin/petty-cash/approve', { id: pcId, action: 'submit', actor: ACTOR })
    expectStatus('petty-cash: approve submit', sub, 200)
    const upd = await api('PUT', '/api/fin/petty-cash', { id: pcId, description: `QA petty ${TAG} (edited)`, amount: 550, siteId: ctx.siteId, jobCode: ctx.jobCode, actor: ACTOR })
    expectStatus('petty-cash: PUT update', upd, 200)
    const del = await api('DELETE', `/api/fin/petty-cash?id=${pcId}&actor=${ACTOR}`)
    expectStatus('petty-cash: DELETE', del, [200, 204])
  }

  // receipts / payments / bank reconciliation
  await crud('receipts', '/api/fin/receipts', {
    model: 'finReceipt',
    create: () => ({ partyName: `QA Client ${TAG}`, amount: 1500, mode: 'NEFT', jobCode: ctx.jobCode, siteCode: ctx.siteCode }),
  })
  const bank = await db.bankAccount.findFirst({ where: { balance: { gte: 500 } } }).catch(() => null)
  if (bank) {
    const pay = await api('POST', '/api/fin/payments', fined({
      bankAccountId: bank.id, amount: 100, paymentMethod: 'NEFT', reference: `QA-${TAG}`,
      party: `QA Vendor ${TAG}`, description: 'QA payment', date: '2026-01-26',
    }))
    expectStatus('payments: POST create', pay, [200, 201])
  } else {
    ok('payments: skipped (no funded bank account)')
  }

  // ── Inventory ──────────────────────────────────────────────────────────
  await crud('stock-ledger', '/api/fin/stock-ledger', {
    model: 'finStockLedger',
    create: () => ({ itemCode: `QA-STK-${TAG}`, itemName: 'QA Stock Item', qtyIn: 10, rate: 5, unit: 'Nos' }),
    update: (id) => ({ id, remarks: 'QA edited' }),
  })
  await crud('material-issues', '/api/fin/material-issues', {
    model: 'finMaterialIssue',
    create: () => ({ jobCode: ctx.jobCode, description: `QA issue ${TAG}`, qty: 2, rate: 5, siteId: ctx.siteId }),
    update: (id) => ({ id, jobCode: ctx.jobCode, description: `QA issue ${TAG} (edited)`, qty: 3, rate: 5 }),
  })
  await crud('material-receipts', '/api/fin/material-receipts', {
    model: 'finMaterialReceipt',
    create: () => ({ itemName: `QA GRN ${TAG}`, vendorName: `QA Vendor ${TAG}`, qtyReceived: 5, rate: 10, siteCode: ctx.siteCode }),
  })
  await crud('scrap', '/api/fin/scrap', {
    model: 'finStockLedger',
    create: () => ({ itemCode: `QA-STK-${TAG}`, itemName: 'QA Stock Item', qty: 1, rate: 5 }),
  })
  await crud('site-expenses', '/api/fin/site-expenses', {
    model: 'finExpenseClaim',
    pathFor: (id) => `/api/fin/site-expenses/${id}`,
    create: () => ({ siteId: ctx.siteId, expenseType: 'Site Misc', submittedBy: 'QA', date: '2026-01-12', remarks: 'QA', items: [{ description: 'Consumables', amount: 700 }] }),
  })

  // ── Purchase ───────────────────────────────────────────────────────────
  await crud('requisitions', '/api/procurement/requisitions', {
    model: 'finPurchaseRequisition',
    create: () => ({ requester: 'QA', project: 'QA Project', date: '2026-01-10', items: [{ description: 'QA material', qty: 2, unit: 'Nos', estCost: 100, total: 200 }] }),
    update: (id) => ({ id, requester: 'QA', project: 'QA Project', status: 'Submitted' }),
  })
  await crud('rfqs', '/api/procurement/rfqs', {
    model: 'finRFQ',
    pathFor: (id) => `/api/procurement/rfqs/${id}`,
    create: () => ({
      description: `QA RFQ ${TAG}`, issueDate: '2026-01-10', responseDeadline: '2026-01-20',
      project: 'QA Project', notes: 'QA', vendorIds: [1, 2],
      lineItems: [{ description: `QA line ${TAG}`, qty: 2, unit: 'Nos' }],
    }),
    update: (id) => ({ id, description: `QA RFQ ${TAG} (edited)`, issueDate: '2026-01-11', responseDeadline: '2026-01-21', vendorIds: [1] }),
  })
  await crud('po-register (purchase)', '/api/procurement/po-register', {
    model: 'finPO',
    create: () => ({ poNo: `QA-PRPO-${TAG}`, vendor: `QA Vendor ${TAG}`, project: 'QA Project', jobCode: ctx.jobCode, totalValue: 30000 }),
    update: (id) => ({ id, totalValue: 31000 }),
  })
  await crud('material-tracking', '/api/procurement/material-tracking', {
    model: 'finMaterialTrackingItem',
    create: () => ({ poNo: `QA-MT-${TAG}`, vendor: `QA Vendor ${TAG}`, project: 'QA Project', material: `QA Pipe ${TAG}`, category: 'Piping', unit: 'Nos', scheduledDate: '2026-02-01', expectedDate: '' }),
    update: (id) => ({ id, status: 'On-Time', qtyStock: 1 }),
  })
  await crud('subcontracts', '/api/procurement/subcontracts', {
    model: 'finSubcontract',
    pathFor: (id) => `/api/procurement/subcontracts/${id}`,
    create: () => ({ vendor: `QA Vendor ${TAG}`, project: 'QA Project', value: 20000, startDate: '2026-01-01', endDate: '2026-06-30', scopeSummary: 'QA scope' }),
    update: (id) => ({ id, percentComplete: 25 }),
  })

  // ── Finance: ledger, budget, tax, journals, bank ───────────────────────
  await crud('ledger accounts', '/api/ledger', {
    model: 'ledgerAccount',
    create: () => ({ name: `QA Ledger ${TAG}`, group: 'Assets', type: 'Asset' }),
    update: (id) => ({ id, name: `QA Ledger ${TAG} (edited)` }),
  })
  await crud('budget items', '/api/budget', {
    model: 'budgetItem',
    create: () => ({ category: 'Material', description: `QA budget ${TAG}`, planned: 1000, period: 'FY26', siteId: ctx.siteId, jobCode: ctx.jobCode, poNo: `QA-PO-${TAG}`, costCenter: ctx.costCenter, department: ctx.department, projectManager: ctx.projectManager }),
    update: (id) => ({ id, category: 'Material', description: `QA budget ${TAG}`, planned: 1500, period: 'FY26', siteId: ctx.siteId, jobCode: ctx.jobCode, poNo: `QA-PO-${TAG}`, costCenter: ctx.costCenter, department: ctx.department, projectManager: ctx.projectManager }),
  })
  await crud('taxation', '/api/taxation', {
    model: 'taxRecord',
    create: () => ({ taxType: 'GST', period: `QA-${TAG}`, amount: 5000, dueDate: new Date('2026-02-20').toISOString(), siteCode: ctx.siteCode, jobCode: ctx.jobCode, poNo: `QA-PO-${TAG}`, costCenter: ctx.costCenter, department: ctx.department, projectManager: ctx.projectManager }),
    update: (id) => ({ id, taxType: 'GST', period: `QA-${TAG}`, amount: 5500, dueDate: new Date('2026-02-20').toISOString(), siteCode: ctx.siteCode, jobCode: ctx.jobCode, poNo: `QA-PO-${TAG}`, costCenter: ctx.costCenter, department: ctx.department, projectManager: ctx.projectManager }),
  })
  await crud('profit & loss', '/api/fin/profit-loss', {
    model: 'profitLossEntry',
    create: () => ({ site: 'QA', month: `QA-${TAG}`, side: 'debit', category: 'Direct Expenses', particular: `QA P&L ${TAG}`, amount: 750 }),
    update: (id) => ({ id, site: 'QA', month: `QA-${TAG}`, side: 'debit', category: 'Direct Expenses', particular: `QA P&L ${TAG} (edited)`, amount: 800 }),
  })
  await crud('client follow-up', '/api/fin/client-follow-up', {
    model: 'finClientFollowUp',
    create: () => ({ clientName: `QA Client ${TAG}`, balanceAmount: 12000, contactNo: '9999999999', remarks: 'QA call' }),
    update: (id) => ({ id, clientName: `QA Client ${TAG}`, balanceAmount: 13000, status: 'In Progress' }),
  })

  const acct = await db.finAccount.findFirst().catch(() => null)
  if (acct) {
    const je = await api('POST', '/api/journal-entries', {
      siteId: ctx.siteId, jobCode: ctx.jobCode, date: new Date('2026-01-15').toISOString(), description: `QA JE ${TAG}`, actor: ACTOR,
      lines: [
        { account: acct.accountCode, debit: 1000, credit: 0 },
        { account: acct.accountCode, debit: 0, credit: 1000 },
      ],
    })
    if (expectStatus('journal-entries: POST create', je, [200, 201])) {
      const jeEntryId = je.json?.data?.[0]?.entryId
      const jeLineId = je.json?.data?.[0]?.id
      const upd = await api('PUT', '/api/journal-entries', { id: jeEntryId, description: `QA JE ${TAG} (edited)`, actor: ACTOR })
      expectStatus('journal-entries: PUT update', upd, 200)
      const del = await api('DELETE', `/api/journal-entries?id=${jeLineId}`)
      expectStatus('journal-entries: DELETE', del, [200, 204])
    }
  } else bad('journal-entries: no FinAccount to post against')

  // bank transaction + reconciliation
  const bankAcct = await db.bankAccount.findFirst().catch(() => null)
  if (bankAcct) {
    const tx = await api('POST', '/api/bank-cash', {
      bankAccountId: bankAcct.id, date: new Date('2026-01-18').toISOString(), amount: 2500, type: 'Payment', transactionType: 'Payment',
      description: `QA bank tx ${TAG}`, siteCode: ctx.siteCode, jobCode: ctx.jobCode, poNo: `QA-PO-${TAG}`, costCenter: ctx.costCenter, department: ctx.department, projectManager: ctx.projectManager,
    })
    if (expectStatus('bank-cash: POST transaction', tx, [200, 201])) {
      const txId = tx.json?.data?.id
      const upd = await api('PUT', '/api/bank-cash', {
        id: txId, type: 'Payment', transactionType: 'Payment', description: `QA bank tx ${TAG} (edited)`,
        siteCode: ctx.siteCode, jobCode: ctx.jobCode, poNo: `QA-PO-${TAG}`, costCenter: ctx.costCenter, department: ctx.department, projectManager: ctx.projectManager,
      })
      expectStatus('bank-cash: PUT transaction', upd, 200)
      const rec = await api('POST', '/api/fin/bank-reconciliation', { transactionId: txId })
      expectStatus('bank-reconciliation: reconcile', rec, 200)
      const unrec = await api('DELETE', `/api/fin/bank-reconciliation?transactionId=${txId}`)
      expectStatus('bank-reconciliation: unreconcile', unrec, [200, 204])
      const del = await api('DELETE', `/api/bank-cash?id=${txId}&type=transaction`)
      expectStatus('bank-cash: DELETE transaction', del, [200, 204])
    }
  } else bad('bank-cash: no BankAccount seeded')

  if (poId) await api('DELETE', `/api/fin/purchase-orders?id=${poId}`)

  // �� Inventory (store) document numbering: create -> delete -> create must
  // not reuse a suffix (a count()+1 generator 500s on the second create).
  const storeCases = [
    ['tools', '/api/store/tools', () => ({ siteId: ctx.siteId, name: `QA Tool ${TAG}`, actor: ACTOR }), (j) => j?.data?.toolCode],
    ['equipment', '/api/store/equipment', () => ({ siteId: ctx.siteId, name: `QA Equipment ${TAG}`, actor: ACTOR }), (j) => j?.data?.equipmentCode],
    ['store-scrap', '/api/store/scrap', () => ({ siteId: ctx.siteId, description: `QA scrap ${TAG}`, qty: 1, actor: ACTOR }), (j) => j?.data?.scrapNo],
    ['gate-pass', '/api/store/gate-pass', () => ({ siteId: ctx.siteId, itemDescription: `QA gate pass ${TAG}`, actor: ACTOR }), (j) => j?.data?.gatePassNo],
    ['store-returns', '/api/store/returns', () => ({ siteId: ctx.siteId, remarks: `QA return ${TAG}`, actor: ACTOR }), (j) => j?.data?.returnNo],
    ['store-mrs', '/api/store/mrs', () => ({ siteId: ctx.siteId, remarks: `QA MRS ${TAG}`, actor: ACTOR }), (j) => j?.data?.mrsNo],
    ['physical-verification', '/api/store/physical-verification', () => ({ siteId: ctx.siteId, remarks: `QA PV ${TAG}`, actor: ACTOR }), (j) => j?.data?.verificationNo],
    ['store-grn', '/api/store/grn', () => ({ siteId: ctx.siteId, remarks: `QA GRN ${TAG}`, actor: ACTOR }), (j) => j?.data?.grnNo],
  ]
  for (const [name, path, payload, codeOf] of storeCases) {
    const first = await api('POST', path, payload())
    if (!expectStatus(`${name}: POST create`, first, [200, 201])) continue
    const firstId = first.json?.data?.id
    const firstCode = codeOf(first.json)
    await api('DELETE', `${path}?id=${firstId}`)
    const second = await api('POST', path, payload())
    if (!expectStatus(`${name}: POST after delete (numbering)`, second, [200, 201])) continue
    const secondCode = codeOf(second.json)
    ok(`${name}: POST after delete (numbering) ${firstCode} -> ${secondCode}`)
    const secondId = second.json?.data?.id
    if (secondId) await api('DELETE', `${path}?id=${secondId}`)
  }

  // ── Clean up rows that have no DELETE route ────────────────────────────
  for (const c of cleanup) {
    try { await db[c.model].delete({ where: { id: c.id } }) } catch { /* already gone */ }
  }
  try { await db.finUserRole.deleteMany({ where: { userEmail: ACTOR } }) } catch { /* noop */ }
  try { await db.finItemCategory.deleteMany({ where: { name: `QA Category ${TAG}` } }) } catch { /* noop */ }

  console.log(`\n${pass} passed, ${failures.length} failed`)
  if (failures.length) {
    console.log('\nFAILURES:')
    failures.forEach((f) => console.log(`  - ${f}`))
    process.exitCode = 1
  } else {
    console.log('\nALL PASS')
  }
}

run()
  .catch((e) => { console.error('FATAL', e); process.exitCode = 1 })
  .finally(() => db.$disconnect())
