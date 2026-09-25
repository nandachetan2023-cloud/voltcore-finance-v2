const BASE = 'http://localhost:3000';
const ACTOR = 'admin@test.com';

async function test(path) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'x-actor-email': ACTOR },
      signal: AbortSignal.timeout(15000)
    });
    const status = res.status;
    const key = status < 500 ? 'PASS' : 'FAIL';
    console.log(`${key}  ${status}  GET ${path}`);
    return status < 500;
  } catch (e) {
    console.log(`FAIL  ERR  GET ${path} → ${e.message}`);
    return false;
  }
}

const endpoints = [
  '/api/fin/jobs',
  '/api/fin/parties',
  '/api/fin/vendors',
  '/api/fin/invoices',
  '/api/fin/payments',
  '/api/fin/payment-advices',
  '/api/fin/petty-cash',
  '/api/fin/bank-reconciliation',
  '/api/fin/material-receipts',
  '/api/fin/material-issues',
  '/api/fin/scrap',
  '/api/fin/stock-ledger',
  '/api/fin/site-expenses',
  '/api/fin/expense-claims',
  '/api/fin/ra-bills',
  '/api/fin/po-register',
  '/api/fin/purchase-orders',
  '/api/fin/gst-tds-register',
  '/api/fin/credit-notes',
  '/api/fin/tally-sync',
  '/api/fin/tally-export',
  '/api/fin/sync-config',
  '/api/fin/profit-loss',
  '/api/fin/receipts',
  '/api/fin/client-follow-up',
  '/api/accounts-receivable',
  '/api/accounts-payable',
  '/api/journal-entries',
  '/api/ledger',
  '/api/coa',
  '/api/bank-cash',
  '/api/budget',
  '/api/financial-reports',
  '/api/finance-dashboard',
  '/api/finance-assistant',
  '/api/finance',
  '/api/items',
  '/api/customers',
  '/api/sales/tenders',
  '/api/invoices',
  '/api/dashboard',
  '/api/branches',
  '/api/sites',
  '/api/biometric/logs',
  '/api/biometric/sites',
  '/api/biometric/sync-status',
  '/api/biometric/config',
  '/api/shifts',
  '/api/organization',
  '/api/projects',
  '/api/store',
  '/api/taxation',
  '/api/notifications',
  '/api/notices',
  '/api/tenant/users',
  '/api/tenant/roles',
  '/api/checklist-templates',
  '/api/recruitment',
  '/api/onboarding',
  '/api/onboarding-form',
  '/api/employee-self/shifts',
  '/api/employee-requests',
  '/api/payroll',
  '/api/procurement',
  '/api/purchases',
  '/api/reports',
];

console.log('Testing all non-HR modules...\n');
const results = await Promise.all(endpoints.map(ep => test(ep)));
const passed = results.filter(r => r).length;
const failed = results.filter(r => !r).length;
console.log(`\n=== ${passed} PASS, ${failed} FAIL ===`);