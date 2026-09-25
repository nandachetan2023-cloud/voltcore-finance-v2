// Read-only smoke test: logs in, then GETs every listed endpoint and reports
// whether it returns data, is empty, is auth-gated, or fails.
//
//   SMOKE_EMAIL='finance_admin@voltcore.in' SMOKE_PASSWORD='...' node smoke-verify.mjs
//
// Credentials come from the environment, never from this file. SMOKE_BASE
// overrides the server URL (default http://localhost:3000).

const BASE = process.env.SMOKE_BASE || 'http://localhost:3000';
const EMAIL = process.env.SMOKE_EMAIL;
const PASSWORD = process.env.SMOKE_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error('Set SMOKE_EMAIL and SMOKE_PASSWORD (a login for the tenant you are testing).');
  process.exit(2);
}

let COOKIE = null;

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  // The session lives in several cookies (role, tenant db, email, ...). Keep ALL
  // of them - keeping only the first left every later request unauthenticated.
  const cookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  COOKIE = cookies.map(c => c.split(';')[0]).join('; ') || null;
  const json = await res.json();
  console.log(`LOGIN ${json.success ? 'OK' : 'FAIL'} as ${json.user?.email || '?'}
`);
  return json.success;
}

async function probe(path) {
  const headers = { 'x-actor-email': EMAIL };
  if (COOKIE) headers['Cookie'] = COOKIE;
  try {
    const res = await fetch(`${BASE}${path}`, { headers, signal: AbortSignal.timeout(20000) });
    const status = res.status;
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status, json };
  } catch (e) {
    return { status: 0, json: null, error: e.message };
  }
}

function verdict(status, json) {
  if (status === 0) return { s: 'ERR ', note: 'connection failed' };
  if (status >= 500) return { s: 'FAIL', note: 'server error' };
  if (status === 401 || status === 403) return { s: 'AUTH', note: 'gated (expected for admin-only)' };
  if (status === 404) return { s: '404 ', note: 'no route / no data' };
  if (status === 405) return { s: '405 ', note: 'method not allowed (read-only ok)' };
  if (status === 400) return { s: '400 ', note: 'needs params' };
  if (!json) return { s: '??? ', note: 'non-JSON response' };
  if (json.success === true) {
    const d = json.data;
    if (Array.isArray(d)) {
      return d.length > 0
        ? { s: 'DATA', note: `${d.length} record(s)` }
        : { s: 'OK  ', note: 'empty table (no seed data)' };
    }
    if (d && typeof d === 'object') {
      const k = Object.keys(d);
      const counts = k.filter(x => Array.isArray(d[x])).map(x => `${d[x].length} ${x}`);
      return counts.length
        ? { s: 'DATA', note: counts.join(', ') }
        : { s: 'OK  ', note: `object keys: ${k.slice(0,5).join(',')}` };
    }
    return { s: 'OK  ', note: 'success:true' };
  }
  return { s: 'FAIL', note: JSON.stringify(json).slice(0, 100) };
}

const modules = [
  ['FINANCE MASTER', ['/api/fin/sites', '/api/fin/jobs', '/api/fin/parties', '/api/fin/vendors', '/api/customers', '/api/items']],
  ['FINANCE TRANSACTIONS', ['/api/fin/invoices', '/api/fin/payments', '/api/fin/payment-advices', '/api/fin/receipts', '/api/fin/petty-cash', '/api/fin/expense-claims', '/api/fin/site-expenses', '/api/fin/ra-bills', '/api/fin/po-register', '/api/fin/purchase-orders', '/api/fin/credit-notes', '/api/fin/gst-tds-register', '/api/fin/client-follow-up']],
  ['FINANCE MATERIAL', ['/api/fin/material-receipts', '/api/fin/material-issues', '/api/fin/scrap', '/api/fin/stock-ledger']],
  ['ACCOUNTING', ['/api/journal-entries', '/api/ledger', '/api/coa', '/api/bank-cash', '/api/budget', '/api/fin/bank-reconciliation']],
  ['REPORTS & DASH', ['/api/fin/profit-loss', '/api/financial-reports', '/api/finance-dashboard', '/api/finance', '/api/dashboard']],
  ['AR / AP', ['/api/accounts-receivable', '/api/accounts-payable']],
  ['TALLY SYNC', ['/api/fin/tally-sync', '/api/fin/tally-export', '/api/fin/sync-config']],
  ['SALES', ['/api/sales/tenders', '/api/invoices']],
  ['BIOMETRIC', ['/api/biometric/sites', '/api/biometric/logs', '/api/biometric/config', '/api/biometric/sync-status']],
  ['ORG & SETTINGS', ['/api/organization', '/api/branches', '/api/sites', '/api/settings', '/api/shifts', '/api/notifications', '/api/notices']],
  ['HR-adjacent (allowed)', ['/api/payroll', '/api/taxation', '/api/checklist-templates', '/api/employee-requests', '/api/employee-self/shifts', '/api/recruitment']],
  ['TENANT & AUTH', ['/api/tenant/users', '/api/tenant/roles', '/api/projects', '/api/procurement', '/api/purchases', '/api/reports']],
];

let total = 0, data = 0, ok = 0, problems = [];

if (!(await login())) { console.error('Login failed - aborting.'); process.exit(1); }

for (const [group, endpoints] of modules) {
  console.log(`\n=== ${group} ===`);
  for (const ep of endpoints) {
    const { status, json, error } = await probe(ep);
    const v = verdict(status, json);
    total++;
    if (v.s === 'DATA') data++;
    else if (v.s.startsWith('OK') || v.s.startsWith('40') || v.s === 'AUTH' || v.s === '405' || v.s.startsWith('400')) ok++;
    else problems.push(`${ep} → ${v.s} ${v.note}`);
    console.log(`  ${v.s}  ${String(status).padEnd(4)} ${ep.padEnd(38)} ${v.note}`);
    if (error) console.log(`        error: ${error}`);
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`TOTAL: ${total}  |  WITH DATA: ${data}  |  OK/gated: ${ok}  |  PROBLEMS: ${problems.length}`);
if (problems.length) {
  console.log('\nPROBLEM ENDPOINTS:');
  problems.forEach(p => console.log('  - ' + p));
}