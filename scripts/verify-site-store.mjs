// Verifies every API call made by the Site Store tabs, end-to-end, with the
// same headers the UI sends (x-actor-email). Creates test rows, asserts,
// then cleans them up.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const BASE = 'http://localhost:3000';
const ACTOR = 'finance_admin@voltcore.in';
const H = { 'Content-Type': 'application/json', 'x-actor-email': ACTOR };

let failures = 0, checks = 0;
function q(cond, label) { checks++; if (cond) console.log('  PASS ' + label); else { failures++; console.log('  FAIL ' + label); } }
async function get(path) { const r = await fetch(BASE + path, { headers: H }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {} return { status: r.status, json: j, raw: t }; }
async function send(method, path, body) { const r = await fetch(BASE + path, { method, headers: H, body: JSON.stringify(body) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {} return { status: r.status, json: j, raw: t }; }
const post = (p, b) => send('POST', p, b);
const put = (p, b) => send('PUT', p, b);
const del = (p) => send('DELETE', p);
async function findUnusedRoutineDate(siteId, month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  const db = new PrismaClient();
  try {
    const records = await db.finStoreRoutineCheck.findMany({
      where: { siteId, routineType: 'Daily', routineDate: { gte: start, lt: end } },
      select: { routineDate: true },
    });
    const used = new Set(records.map(record => record.routineDate.toISOString().slice(0, 10)));
    const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${month}-${String(day).padStart(2, '0')}`;
      if (!used.has(date)) return date;
    }
    throw new Error(`No unused daily checklist date is available in ${month}`);
  } finally {
    await db.$disconnect();
  }
}
const [siteLookup, itemLookup] = await Promise.all([get('/api/fin/sites'), get('/api/items')]);
const site = siteLookup.json?.data?.find(s => s.siteCode === 'SITE-004')?.id;
const itemId = itemLookup.json?.data?.find(i => i.sku === 'CBL-011')?.id;
if (!site || !itemId) throw new Error('Required fixtures SITE-004 / CBL-011 are missing');
const baselineStock = await get('/api/store/stock-register?itemCode=CBL-011');
const baselineBalance = baselineStock.json?.data?.totals?.balance ?? 0;
const baselineEntries = baselineStock.json?.data?.entries?.length ?? 0;
const reportMonth = new Date().toISOString().slice(0, 7);
const baselineReport = await get(`/api/store/report?siteId=${site}&month=${reportMonth}`);
const baselineItem = baselineReport.json?.data?.items?.find(i => i.itemCode === 'CBL-011');
const baselineClosing = baselineItem?.closing ?? 0;
const baselineStockValue = baselineItem?.stockValue ?? 0;
const baselineDamagedReturns = baselineItem?.damagedReturnQty ?? 0;
const baselineSupplierReturns = baselineItem?.returnedToSupplier ?? 0;
let routineCheckId;

console.log('== 1. Lookups used by useLookups()');
for (const p of ['/api/fin/sites', '/api/fin/jobs', '/api/items', '/api/fin/vendors', '/api/fin/purchase-orders', '/api/fin/item-categories']) {
  const r = await get(p); q(r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data), `GET ${p}`);
}

console.log('== 2. Tab data loads (GET)');
for (const p of ['/api/store/grn', '/api/store/mrs', '/api/store/returns', '/api/store/tools', '/api/store/gate-pass', '/api/store/equipment', '/api/store/scrap', '/api/store/physical-verification', '/api/store/stock-register', '/api/store/diesel', '/api/store/gas-cylinders', '/api/store/daily-issues']) {
  const r = await get(p); q(r.status === 200 && r.json?.success === true, `GET ${p}`);
}

console.log('== 3. GRN flow (soft-copy fields + ledger)');
const grnBody = { actor: ACTOR, siteId: site, status: 'Posted', timeOfReceipt: '05:30 PM', projectName: 'AAP GAP AMC', siteLocation: 'Lapanga OD', gateEntryNo: 'GE-10125', vehicleNo: 'OD23U4075', lrDetails: 'NA', storeLocation: 'Main Store', receivedBy: 'Store Keeper', vendorName: 'D S TRADERS', dcNo: 'DC-0813', invoiceNo: 'INV-1', grnDate: new Date().toISOString(), remarks: 'smoke test', lines: [{ itemId, qtyOrdered: 3, qtyReceived: 3, rate: 50, storageLocation: 'Rack-A1', materialCategory: 'CONSUMABLE ITEM', batchHeatNo: 'HN-12345-A', damageTransit: 'No', inspectionStatus: 'Accepted' }, { itemId, qtyOrdered: 7, qtyReceived: 7, rate: 100, storageLocation: 'Rack-A2', materialCategory: 'CONSUMABLE ITEM', batchHeatNo: 'HN-12345-B', damageTransit: 'No', inspectionStatus: 'Accepted' }] };
const grn = await post('/api/store/grn', grnBody);
q(grn.status === 200 || grn.status === 201, `POST /api/store/grn -> ${grn.status}`);
const grnId = grn.json?.data?.id;
q(!!grn.json?.data?.grnNo, `GRN number generated (${grn.json?.data?.grnNo})`);
const sr1 = await get('/api/store/stock-register?itemCode=CBL-011');
const cb1 = sr1.json?.data?.totals;
q(cb1?.balance === baselineBalance + 10 && cb1?.received === 10, 'ledger: accepted quantity added after GRN (got ' + JSON.stringify(cb1) + ')');
q(sr1.json?.data?.entries?.some(e => e.referenceNo === grn.json?.data?.grnNo && e.location === 'Rack-A1'), 'item storage location is saved to the stock ledger');
const rejectedGrn = await post('/api/store/grn', { actor: ACTOR, siteId: site, status: 'Posted', grnDate: new Date().toISOString(), lines: [{ itemId, qtyReceived: 3, rate: 100, storageLocation: 'Quarantine', inspectionStatus: 'Rejected' }] });
const rejectedGrnId = rejectedGrn.json?.data?.id;
q(rejectedGrn.json?.data?.lines?.[0]?.qtyAccepted === 0 && rejectedGrn.json?.data?.lines?.[0]?.qtyRejected === 3, 'rejected GRN line is quarantined, not accepted into stock');
const srRejected = await get('/api/store/stock-register?itemCode=CBL-011');
q(srRejected.json?.data?.totals?.balance === baselineBalance + 10, 'rejected GRN does not increase available stock');
console.log('== 4. MRS flow');
const mrs = await post('/api/store/mrs', { actor: ACTOR, siteId: site, status: 'Approved', requestedBy: 'Store Keeper', purpose: 'Welding bay 3', requiredByDate: '2026-11-20', reasonForRequirement: 'New Work', lines: [{ itemId, qtyRequested: 4 }] });
const mrsId = mrs.json?.data?.id; q(!!mrsId, `POST /api/store/mrs -> MRS ${mrs.json?.data?.mrsNo}`);
q(mrs.json?.data?.status === 'Draft', 'MRS create cannot bypass the approval workflow');
const bypassApproval = await put('/api/store/mrs', { id: mrsId, status: 'Approved', actor: ACTOR });
q(bypassApproval.status === 400, 'direct MRS status edit is rejected');
for (const action of ['submit', 'approve']) {
  const r = await put('/api/store/mrs', { id: mrsId, action, actor: ACTOR });
  q(r.json?.success === true, `MRS ${action}`);
}
const issue = await post('/api/store/issue', { actor: ACTOR, siteId: site, mrsId, issuedTo: 'Test Receiver', contractorName: 'Smoke Subcontractor', issuedBy: 'Store Keeper', receiverSignature: 'signed-by-test', lines: [{ itemId, qty: 4, rate: 100 }] });
const issueId = issue.json?.data?.id;
q(!!issue.json?.data?.issueNo, `issue created (${issue.json?.data?.issueNo})`);
q(issue.json?.data?.receiverSignature === 'signed-by-test', 'receiver signature is saved on the issue');
q(issue.json?.data?.contractorName === 'Smoke Subcontractor', 'contractor attribution is saved on the issue');
const fifoIssueLine = issue.json?.data?.lines?.[0];
q(Array.isArray(fifoIssueLine?.fifoAllocations) && fifoIssueLine.fifoAllocations.reduce((sum, allocation) => sum + allocation.qty, 0) === 4, 'issue line stores FIFO receipt-lot allocations');
if (baselineBalance === 0) {
  q(fifoIssueLine?.rate === 62.5 && fifoIssueLine?.amount === 250 && fifoIssueLine.fifoAllocations[0]?.qty === 3 && fifoIssueLine.fifoAllocations[0]?.rate === 50 && fifoIssueLine.fifoAllocations[1]?.qty === 1 && fifoIssueLine.fifoAllocations[1]?.rate === 100, 'issue cost uses the oldest receipt lots first');
}
const sr2 = await get('/api/store/stock-register?itemCode=CBL-011');
q(sr2.json?.data?.totals?.balance === baselineBalance + 6, 'ledger: issue quantity deducted (got ' + sr2.json?.data?.totals?.balance + ')');
console.log('== 5. Return flow');
const ret = await post('/api/store/returns', { actor: ACTOR, siteId: site, returnedBy: 'Test Receiver', receivedBy: 'Store Keeper', lines: [{ itemId, qty: 2, condition: 'Good' }] });
const returnId = ret.json?.data?.id;
q(!!ret.json?.data?.returnNo, `return created (${ret.json?.data?.returnNo})`);
const sr3 = await get('/api/store/stock-register?itemCode=CBL-011');
q(sr3.json?.data?.totals?.balance === baselineBalance + 8, 'ledger: good returned material replenishes stock (got ' + sr3.json?.data?.totals?.balance + ')');
const damagedReturn = await post('/api/store/returns', { actor: ACTOR, siteId: site, returnedBy: 'Test Receiver', receivedBy: 'Store Keeper', lines: [{ itemId, qty: 3, condition: 'Damaged' }] });
const damagedReturnId = damagedReturn.json?.data?.id;
q(!!damagedReturnId, 'damaged returned material is recorded');
const srDamaged = await get('/api/store/stock-register?itemCode=CBL-011');
q(srDamaged.json?.data?.totals?.balance === baselineBalance + 8, 'damaged return does not replenish available stock');
const insufficientSupplierReturn = await post('/api/store/returns', { actor: ACTOR, siteId: site, returnType: 'Supplier', vendorName: 'Smoke Supplier', authorizedBy: 'Store Keeper', lines: [{ itemId, qty: baselineBalance + 1000 }] });
q(insufficientSupplierReturn.status === 409, 'supplier return is rejected when quantity exceeds available site stock');
const supplierReturn = await post('/api/store/returns', { actor: ACTOR, siteId: site, returnType: 'Supplier', vendorName: 'Smoke Supplier', supplierDocNo: 'SUP-RTN-TEST', authorizedBy: 'Store Keeper', lines: [{ itemId, qty: 2, condition: 'Good' }] });
const supplierReturnId = supplierReturn.json?.data?.id;
q(supplierReturn.json?.data?.returnType === 'Supplier' && supplierReturn.json?.data?.vendorName === 'Smoke Supplier', 'supplier return records supplier and return type');
q(Array.isArray(supplierReturn.json?.data?.lines?.[0]?.fifoAllocations) && supplierReturn.json.data.lines[0].fifoAllocations.reduce((sum, allocation) => sum + allocation.qty, 0) === 2, 'supplier return records FIFO lot allocations');
const srSupplier = await get('/api/store/stock-register?itemCode=CBL-011');
q(srSupplier.json?.data?.totals?.balance === baselineBalance + 6, 'supplier return reduces available stock');
const shortIssueQty = (srSupplier.json?.data?.totals?.balance ?? 0) + 1;
const shortMRS = await post('/api/store/mrs', { actor: ACTOR, siteId: site, requestedBy: 'Store Keeper', purpose: 'Insufficient stock test', lines: [{ itemId, qtyRequested: shortIssueQty }] });
const shortMRSId = shortMRS.json?.data?.id;
q(!!shortMRSId, 'insufficient-stock test MRS created');
for (const action of ['submit', 'approve']) await put('/api/store/mrs', { id: shortMRSId, action, actor: ACTOR });
const shortIssue = await post('/api/store/issue', { actor: ACTOR, siteId: site, mrsId: shortMRSId, issuedTo: 'Test Receiver', issuedBy: 'Store Keeper', lines: [{ itemId, qty: shortIssueQty, rate: 100 }] });
q(shortIssue.status === 409, 'material issue rejects quantities above available FIFO stock');
const mrsAfterShortIssue = await get('/api/store/mrs');
q(mrsAfterShortIssue.json?.data?.find(x => x.id === shortMRSId)?.status === 'Approved', 'failed material issue leaves the approved MRS unchanged');
const stockAfterShortIssue = await get('/api/store/stock-register?itemCode=CBL-011');
q(stockAfterShortIssue.json?.data?.totals?.balance === srSupplier.json?.data?.totals?.balance, 'failed material issue leaves stock unchanged');
console.log('== 6. Tools flow');
const calibrationDueDate = new Date().toISOString().slice(0, 10);
const invalidCalibrationDate = await post('/api/store/tools', { actor: ACTOR, siteId: site, name: 'Invalid Date Tool', calibrationDueDate: '2026-13-40' });
q(invalidCalibrationDate.status === 400, 'invalid calibration date is rejected');
const tool = await post('/api/store/tools', { actor: ACTOR, siteId: site, name: 'Smoke Grinder', category: 'Measuring Tool', calibrationDueDate, remarks: 'smoke' });
const toolId = tool.json?.data?.id;
q(!!tool.json?.data?.toolCode, `tool registered (${tool.json?.data?.toolCode})`);
q(tool.json?.data?.calibrationDueDate?.startsWith(calibrationDueDate), 'tool calibration due date is saved');
const issueTool = await put('/api/store/tools', { id: toolId, actor: ACTOR, issueLog: { issuedTo: 'Test Receiver' } });
const logId = issueTool.json?.data?.logs?.find(l => !l.returnDate)?.id;
q(!!logId, 'tool issued, log created');
q(!!issueTool.json?.data?.logs?.find(l => !l.returnDate)?.issueNo?.startsWith('TI/'), `log issueNo starts with TI/ (got ${issueTool.json?.data?.logs?.find(l => !l.returnDate)?.issueNo})`);
const retTool = await put('/api/store/tools', { id: toolId, actor: ACTOR, issueLog: { returnLogId: logId, condition: 'Good' } });
q(retTool.json?.data?.status === 'Available', 'tool returned to Available');
console.log('== 7. Gate pass');
const gp = await post('/api/store/gate-pass', { actor: ACTOR, siteId: site, type: 'Outward', itemDescription: '33kV XLPE Cable', itemCode: 'CBL-011', qty: 2, vehicleNo: 'OD01AB1234', purpose: 'Return to vendor', authorizedBy: 'Store Keeper' });
const gpId = gp.json?.data?.id; q(!!gp.json?.data?.gatePassNo, `gate pass created (${gp.json?.data?.gatePassNo})`);
const closeGp = await put('/api/store/gate-pass', { id: gpId, status: 'Closed', actor: ACTOR });
q(closeGp.json?.success === true, 'gate pass closed');
console.log('== 8. Equipment');
const eq = await post('/api/store/equipment', { actor: ACTOR, siteId: site, name: 'Smoke Crane', type: 'Crane', make: 'ElectroMech', srNo: 'SN-001', capacity: '50 Ton', location: 'Yard', validityDate: '2027-01-31', lastService: '2026-10-01', nextService: '2027-04-01', operatorName: 'Suresh' });
const eqId = eq.json?.data?.id;
q(eq.json?.data?.make === 'ElectroMech' && eq.json?.data?.capacity === '50 Ton' && eq.json?.data?.nextService?.startsWith('2027-04-01'), 'equipment fields round-trip (make/capacity/nextService)');
console.log('== 9. Scrap');
const scrape = await post('/api/store/scrap', { actor: ACTOR, siteId: site, description: 'Cut-offs from fabrication', scrapType: 'Scrap', location: 'Yard', qty: 2, unit: 'Nos', estimatedValue: 500 });
const scrapId = scrape.json?.data?.id; q(!!scrape.json?.data?.scrapNo, `scrap created (${scrape.json?.data?.scrapNo})`);
const dispose = await put('/api/store/scrap', { id: scrapId, disposalStatus: 'Disposed', disposedTo: 'Scrap dealer', actor: ACTOR });
q(dispose.json?.data?.disposedTo === 'Scrap dealer', 'scrap marked Disposed with Disposed To');
console.log('== 10. Physical verification');
const pv = await post('/api/store/physical-verification', { actor: ACTOR, siteId: site, type: 'Monthly', verifiedBy: 'Store Keeper', lines: [{ itemId, bookQty: 8, physicalQty: 7, remarks: 'Investigate issue slip and recount' }] });
const pvId = pv.json?.data?.id; q(!!pv.json?.data?.verificationNo, `verification created (${pv.json?.data?.verificationNo})`);
q(pv.json?.data?.lines?.[0]?.remarks === 'Investigate issue slip and recount', 'physical verification stores corrective-action notes');
console.log('== 11. Daily issue / diesel / gas cylinder');
const di = await post('/api/store/daily-issues', { actor: ACTOR, siteId: site, itemName: '33kV XLPE Cable', itemCode: 'CBL-011', qty: 1, unit: 'MT', receiverName: 'Test Receiver', purposeLocation: 'Welding bay 3' });
const diId = di.json?.data?.id; q(di.json?.data?.issueNo?.startsWith('DI/'), `daily issue created (${di.json?.data?.issueNo})`);
const toggle = await put('/api/store/daily-issues', { id: diId, returned: true, actor: ACTOR });
q(toggle.json?.data?.returned === true, 'daily issue toggled to Returned');
const dsl = await post('/api/store/diesel', { actor: ACTOR, siteId: site, vehicle: 'Hydra', opening: 50, received: 20, consumed: 10, operatorName: 'Suresh' });
q(dsl.json?.data?.closing === 60, 'diesel closing auto-computed (opening 50 + received 20 - consumed 10 = 60, got ' + dsl.json?.data?.closing + ')');
const dslId = dsl.json?.data?.id;
const gc = await post('/api/store/gas-cylinders', { actor: ACTOR, siteId: site, gasType: 'O2', cylinderNo: 'VE-001', direction: 'Issued', qty: 1, issuedTo: 'Welder 1', condition: 'Good' });
const gcId = gc.json?.data?.id; q(gc.json?.data?.logNo?.startsWith('GC/'), `gas cylinder issue logged (${gc.json?.data?.logNo})`);
console.log('== 12. Store routine checklist');
const routineDate = await findUnusedRoutineDate(site, reportMonth);
const routineTemplate = await get(`/api/store/routine-checklists?siteId=${site}&routineType=Daily&date=${routineDate}`);
q(routineTemplate.status === 200 && routineTemplate.json?.data?.template?.some(x => x.id === 'fifo') && routineTemplate.json?.data?.template?.some(x => x.id === 'fire-safety') && routineTemplate.json?.data?.template?.some(x => x.id === 'material-tags') && routineTemplate.json?.data?.template?.some(x => x.id === 'weather-protection'), 'daily checklist includes FIFO, safety, identification, and weather-protection checks');
const routineChecks = (routineTemplate.json?.data?.template || []).map((check, index) => ({ id: check.id, status: index === 0 ? 'Issue' : 'Done', note: index === 0 ? 'Clean and reorganize receiving area' : '' }));
const routine = await post('/api/store/routine-checklists', { actor: ACTOR, completedBy: 'Smoke Store Keeper', siteId: site, routineType: 'Daily', routineDate, checks: routineChecks });
routineCheckId = routine.json?.data?.id;
q(routine.status === 201 && routine.json?.data?.completedBy === 'Smoke Store Keeper', 'routine checklist saves for site/date');
const routineReload = await get(`/api/store/routine-checklists?siteId=${site}&routineType=Daily&date=${routineDate}`);
q(routineReload.json?.data?.record?.checks?.[0]?.note === 'Clean and reorganize receiving area', 'routine checklist persists corrective-action notes');
const invalidRoutine = await post('/api/store/routine-checklists', { actor: ACTOR, siteId: site, routineType: 'Daily', routineDate, checks: routineChecks.map((check, index) => index === 0 ? { ...check, note: '' } : check) });
q(invalidRoutine.status === 400, 'routine checklist requires corrective notes for issues');
console.log('== 13. Monthly report (new client format)');
const rep = await get('/api/store/report?siteId=' + site + '&month=' + reportMonth);
q(rep.status === 200 && rep.json?.success === true, 'report returns 200');
const s = rep.json?.data?.summary;
q(!!s && 'materialReceived' in s && 'mrs' in s && 'tools' in s && 'gatePasses' in s && 'physicalVerification' in s, 'summary has all panels');
q(Array.isArray(rep.json?.data?.items), 'items array present');
const row = (rep.json?.data?.items || []).find(i => i.itemCode === 'CBL-011');
q(!!row, 'CBL-011 present in monthly report');
q(row && row.received === (baselineItem?.received ?? 0) + 10 && row.issued === (baselineItem?.issued ?? 0) + 4 && row.returned === (baselineItem?.returned ?? 0) + 2 && row.returnedToSupplier === baselineSupplierReturns + 2 && row.closing === baselineClosing + 6, 'row math reconciles receipts, issues, site returns, and supplier returns (got ' + JSON.stringify(row) + ')');
if (baselineBalance === 0) q(row?.stockValue === baselineStockValue + 525, 'stock valuation reconciles FIFO issue, site return, and supplier return costs');
q(rep.json.data.summary.returnsToSupplier.qty === 2 && rep.json.data.summary.returnsBySupplier.some(x => x.supplier === 'Smoke Supplier'), 'monthly report shows supplier return quantity and supplier breakdown');
q(row?.damagedReturnQty === baselineDamagedReturns + 3, 'damaged returns are visible in report but excluded from stock');
q(['stockValue', 'receiptsBySupplier', 'receiptsByPurchaseOrder', 'issuesByDepartment', 'issuesByWorkArea', 'issuesByReceiver', 'issuesByContractor', 'consumables', 'toolActivity', 'keyObservations', 'calibrationDueItems', 'pendingMaterials', 'slowMoving', 'belowReorderLevel', 'varianceDetails', 'serviceDueItems'].every(k => k in rep.json.data.summary), 'report includes valuation, receipt/issue breakdowns, consumables, tool activity, observations, calibration, and exceptions');
q(rep.json.data.summary.consumables.some(x => x.itemCode === 'CBL-011' && x.issued === 4), 'monthly consumables report includes received and issued consumable stock');
q(rep.json.data.summary.toolActivity.issued >= 1 && rep.json.data.summary.toolActivity.returned >= 1, 'monthly tool activity reports issue and return quantities');
q(rep.json.data.summary.calibrationDueItems.some(x => x.toolCode === tool.json?.data?.toolCode), 'monthly report lists tools with calibration due');
q(rep.json.data.summary.keyObservations.majorReceipts.some(x => x.grnNo === grn.json?.data?.grnNo), 'key observations include major receipts');
q(rep.json.data.summary.keyObservations.highValueIssues.some(x => x.issueNo === issue.json?.data?.issueNo), 'key observations include high-value material issues');
q(rep.json.data.summary.keyObservations.damageLossIncidents.some(x => x.scrapNo === scrape.json?.data?.scrapNo), 'key observations include damage, loss, and disposal details');
q(rep.json.data.summary.keyObservations.improvementActions.some(x => x.action === 'Clean and reorganize receiving area'), 'key observations include corrective improvement actions');
q(rep.json.data.summary.issuesByContractor.some(x => x.name === 'Smoke Subcontractor'), 'monthly report groups issues by contractor');
q(rep.json.data.summary.varianceDetails.some(x => x.remarks === 'Investigate issue slip and recount'), 'monthly report includes physical-variance corrective notes');
const repFieldNames = row ? Object.keys(row).sort().join(',') : '';
q(repFieldNames === 'closing,damagedLostQty,damagedReturnQty,issued,itemCode,itemId,itemName,opening,rate,received,reorderLevel,returned,returnedToSupplier,scrapQty,stockValue,unit,varianceCount', 'row has client columns (got ' + repFieldNames + ')');
console.log('== 14. Cleanup (delete test rows + ledger entries)');
for (const [label, url] of [['daily-issue', '/api/store/daily-issues?id=' + diId], ['diesel', '/api/store/diesel?id=' + dslId], ['gas', '/api/store/gas-cylinders?id=' + gcId], ['physical-verification', '/api/store/physical-verification?id=' + pvId], ['scrap', '/api/store/scrap?id=' + scrapId], ['equipment', '/api/store/equipment?id=' + eqId], ['gate-pass', '/api/store/gate-pass?id=' + gpId], ['tool', '/api/store/tools?id=' + toolId], ['supplier-return', '/api/store/returns?id=' + supplierReturnId], ['damaged-return', '/api/store/returns?id=' + damagedReturnId], ['return', '/api/store/returns?id=' + returnId], ['issue', '/api/store/issue?id=' + issueId], ['insufficient-stock-mrs', '/api/store/mrs?id=' + shortMRSId], ['mrs', '/api/store/mrs?id=' + mrsId], ['rejected-grn', '/api/store/grn?id=' + rejectedGrnId], ['grn', '/api/store/grn?id=' + grnId]]) {
  const r = await del(url); q(r.json?.success === true, `delete ${label}`);
}
if (routineCheckId) {
  const db = new PrismaClient();
  try { await db.finStoreRoutineCheck.delete({ where: { id: routineCheckId } }); q(true, 'delete routine checklist test record'); }
  catch (error) { q(false, `delete routine checklist test record (${error.message})`); }
  finally { await db.$disconnect(); }
}
const sr4 = await get('/api/store/stock-register?itemCode=CBL-011');
q(sr4.json?.data?.entries?.length === baselineEntries && sr4.json?.data?.totals?.balance === baselineBalance, 'stock register restored to baseline after cleanup');

console.log('\nRESULT: ' + checks + ' checks, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
