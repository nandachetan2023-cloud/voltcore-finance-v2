// Verifies every API call made by the Site Store tabs, end-to-end, with the
// same headers the UI sends (x-actor-email). Creates test rows, asserts,
// then cleans them up.
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
const site = 11, itemId = 11;

console.log('== 1. Lookups used by useLookups()');
for (const p of ['/api/fin/sites', '/api/fin/jobs', '/api/items', '/api/fin/vendors', '/api/fin/purchase-orders', '/api/fin/item-categories']) {
  const r = await get(p); q(r.status === 200 && r.json?.success === true && Array.isArray(r.json?.data), `GET ${p}`);
}

console.log('== 2. Tab data loads (GET)');
for (const p of ['/api/store/grn', '/api/store/mrs', '/api/store/returns', '/api/store/tools', '/api/store/gate-pass', '/api/store/equipment', '/api/store/scrap', '/api/store/physical-verification', '/api/store/stock-register', '/api/store/diesel', '/api/store/gas-cylinders', '/api/store/daily-issues']) {
  const r = await get(p); q(r.status === 200 && r.json?.success === true, `GET ${p}`);
}

console.log('== 3. GRN flow (soft-copy fields + ledger)');
const grnBody = { actor: ACTOR, siteId: site, status: 'Posted', timeOfReceipt: '05:30 PM', projectName: 'AAP GAP AMC', siteLocation: 'Lapanga OD', gateEntryNo: 'GE-10125', vehicleNo: 'OD23U4075', lrDetails: 'NA', storeLocation: 'Main Store', receivedBy: 'Store Keeper', vendorName: 'D S TRADERS', dcNo: 'DC-0813', invoiceNo: 'INV-1', grnDate: '2026-11-10', remarks: 'smoke test', lines: [{ itemId, qtyOrdered: 10, qtyReceived: 10, rate: 100, materialCategory: 'CONSUMABLE ITEM', batchHeatNo: 'HN-12345', damageTransit: 'No', inspectionStatus: 'Accepted' }] };
const grn = await post('/api/store/grn', grnBody);
q(grn.status === 200 || grn.status === 201, `POST /api/store/grn -> ${grn.status}`);
const grnId = grn.json?.data?.id;
q(!!grn.json?.data?.grnNo, `GRN number generated (${grn.json?.data?.grnNo})`);
const sr1 = await get('/api/store/stock-register?itemCode=CBL-011');
const cb1 = sr1.json?.data?.totals;
q(cb1?.balance === 10 && cb1?.received === 10, 'ledger: closing 10 after GRN (got ' + JSON.stringify(cb1) + ')');
console.log('== 4. MRS flow');
const mrs = await post('/api/store/mrs', { actor: ACTOR, siteId: site, requestedBy: 'Store Keeper', purpose: 'Welding bay 3', requiredByDate: '2026-11-20', reasonForRequirement: 'New Work', lines: [{ itemId, qtyRequested: 4 }] });
const mrsId = mrs.json?.data?.id; q(!!mrsId, `POST /api/store/mrs -> MRS ${mrs.json?.data?.mrsNo}`);
for (const action of ['submit', 'approve']) {
  const r = await put('/api/store/mrs', { id: mrsId, action, actor: ACTOR });
  q(r.json?.success === true, `MRS ${action}`);
}
const issue = await post('/api/store/issue', { actor: ACTOR, siteId: site, mrsId, issuedTo: 'Test Receiver', issuedBy: 'Store Keeper', lines: [{ itemId, qty: 4, rate: 100 }] });
const issueId = issue.json?.data?.id;
q(!!issue.json?.data?.issueNo, `issue created (${issue.json?.data?.issueNo})`);
const sr2 = await get('/api/store/stock-register?itemCode=CBL-011');
q(sr2.json?.data?.totals?.balance === 6, 'ledger: closing 6 after issue (got ' + sr2.json?.data?.totals?.balance + ')');
console.log('== 5. Return flow');
const ret = await post('/api/store/returns', { actor: ACTOR, siteId: site, returnedBy: 'Test Receiver', receivedBy: 'Store Keeper', lines: [{ itemId, qty: 2, condition: 'Good' }] });
const returnId = ret.json?.data?.id;
q(!!ret.json?.data?.returnNo, `return created (${ret.json?.data?.returnNo})`);
const sr3 = await get('/api/store/stock-register?itemCode=CBL-011');
q(sr3.json?.data?.totals?.balance === 8, 'ledger: closing 8 after return (got ' + sr3.json?.data?.totals?.balance + ')');
console.log('== 6. Tools flow');
const tool = await post('/api/store/tools', { actor: ACTOR, siteId: site, name: 'Smoke Grinder', category: 'Grinding Machine', remarks: 'smoke' });
const toolId = tool.json?.data?.id;
q(!!tool.json?.data?.toolCode, `tool registered (${tool.json?.data?.toolCode})`);
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
const pv = await post('/api/store/physical-verification', { actor: ACTOR, siteId: site, type: 'Monthly', verifiedBy: 'Store Keeper', lines: [{ itemId, bookQty: 8, physicalQty: 7 }] });
const pvId = pv.json?.data?.id; q(!!pv.json?.data?.verificationNo, `verification created (${pv.json?.data?.verificationNo})`);
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
console.log('== 12. Monthly report (new client format)');
const rep = await get('/api/store/report?siteId=' + site + '&month=2026-11');
q(rep.status === 200 && rep.json?.success === true, 'report returns 200');
const s = rep.json?.data?.summary;
q(!!s && 'materialReceived' in s && 'mrs' in s && 'tools' in s && 'gatePasses' in s && 'physicalVerification' in s, 'summary has all panels');
q(Array.isArray(rep.json?.data?.items), 'items array present');
const row = (rep.json?.data?.items || []).find(i => i.itemCode === 'CBL-011');
q(!!row, 'CBL-011 present in monthly report');
q(row && row.opening === 0 && row.received === 10 && row.issued === 4 && row.returned === 2 && row.closing === 8, 'row math: open 0 + rec 10 + ret 2 - iss 4 = close 8 (got ' + JSON.stringify(row) + ')');
const repFieldNames = row ? Object.keys(row).sort().join(',') : '';
q(repFieldNames === 'closing,damagedLostQty,issued,itemCode,itemId,itemName,opening,rate,received,reorderLevel,returned,scrapQty,stockValue,unit,varianceCount', 'row has client columns (got ' + repFieldNames + ')');
console.log('== 13. Cleanup (delete test rows + ledger entries)');
for (const [label, url] of [['daily-issue', '/api/store/daily-issues?id=' + diId], ['diesel', '/api/store/diesel?id=' + dslId], ['gas', '/api/store/gas-cylinders?id=' + gcId], ['physical-verification', '/api/store/physical-verification?id=' + pvId], ['scrap', '/api/store/scrap?id=' + scrapId], ['equipment', '/api/store/equipment?id=' + eqId], ['gate-pass', '/api/store/gate-pass?id=' + gpId], ['tool', '/api/store/tools?id=' + toolId], ['return', '/api/store/returns?id=' + returnId], ['issue', '/api/store/issue?id=' + issueId], ['mrs', '/api/store/mrs?id=' + mrsId], ['grn', '/api/store/grn?id=' + grnId]]) {
  const r = await del(url); q(r.json?.success === true, `delete ${label}`);
}
const sr4 = await get('/api/store/stock-register?itemCode=CBL-011');
q(sr4.json?.data?.entries?.length === 0 && sr4.json?.data?.totals?.balance === 0, 'stock register back to empty after cleanup');

console.log('\nRESULT: ' + checks + ' checks, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
