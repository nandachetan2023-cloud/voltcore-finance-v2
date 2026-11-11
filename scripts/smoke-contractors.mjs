// Smoke test for the contractor master CRUD (Contractors Management).
//
//   node scripts/smoke-contractors.mjs [baseUrl]
//
// Exercises the same request/response cycle the Contractor Wizard drives:
// create with every field, read back, update, validation rejection,
// duplicate rejection and delete.
const base = process.argv[2] || 'http://localhost:3000';

let pass = 0;
let fail = 0;

function check(name, ok, detail) {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

async function json(method, url, body) {
  const res = await fetch(base + url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
}

const stamp = Date.now();
const name = `Smoke Test Contractor ${stamp}`;
const full = {
  name,
  legalName: `${name} Pvt Ltd`,
  tradeName: 'Smoke Traders',
  vendorCode: `SMK-${stamp}`,
  vendorType: 'Contractor',
  categories: ['Civil', 'Electrical'],
  region: 'Mumbai HQ',
  status: 'standard',
  registeredOn: '2024-04-01',
  contactPerson: 'Test Contact',
  contactDesignation: 'Project Manager',
  phone: '+91 98765 43210',
  alternatePhone: '022 12345678',
  email: 'test.contact@example.com',
  website: 'www.example.com',
  address: '12 Test Street, Andheri East',
  country: 'India',
  state: 'Maharashtra',
  city: 'Mumbai',
  pincode: '400059',
  gstin: '27AAACT1234F1Z5',
  pan: 'AAACT1234F',
  tan: 'BLR1234567',
  msmeRegistered: true,
  taxDeduction: '194C',
  certificates: [{ name: 'ISO 9001', certNo: 'ISO-TEST-1', issueDate: '2024-01-01', expiryDate: '2027-01-01' }],
  bankName: 'Test Bank',
  bankAccountName: `${name} Pvt Ltd`,
  bankAccountNumber: '123456789012',
  bankIfsc: 'TEST0001234',
  paymentTerms: '30 days from invoice',
  creditDays: 30,
  rating: 4.2,
  metrics: { onTimeDelivery: 92, qualityRating: 4.1, priceCompetitiveness: 3.8 },
  notes: 'Created by the contractor CRUD smoke test.',
};

console.log(`Driving ${base} ...\n`);

// 1. Create
const created = await json('POST', '/api/fin/vendors', full);
check('POST creates a contractor', created.status === 201 && created.data?.success === true, `status ${created.status} ${JSON.stringify(created.data?.error)}`);
const id = created.data?.data?.id;
check('created record has an id', typeof id === 'number');
if (!id) { console.log('\nAborting — cannot continue without a created record.'); process.exit(1); }

// 2. Every field persisted
const back = await json('GET', `/api/fin/vendors?id=${id}`);
const rec = back.data?.data || {};
check('GET returns the record', back.status === 200 && rec.id === id);
check('identity fields persisted',
  rec.name === full.name && rec.legalName === full.legalName && rec.vendorCode === full.vendorCode &&
  rec.vendorType === full.vendorType && rec.region === full.region);
check('contact fields persisted',
  rec.contactPerson === full.contactPerson && rec.contactDesignation === full.contactDesignation &&
  rec.phone === full.phone && rec.alternatePhone === full.alternatePhone && rec.email === full.email &&
  rec.website === full.website && rec.address === full.address);
check('location fields persisted',
  rec.country === full.country && rec.state === full.state && rec.city === full.city && rec.pincode === full.pincode);
check('tax fields persisted',
  rec.gstin === full.gstin && rec.pan === full.pan && rec.tan === full.tan &&
  rec.msmeRegistered === true && rec.taxDeduction === full.taxDeduction);
check('banking fields persisted',
  rec.bankName === full.bankName && rec.bankAccountName === full.bankAccountName &&
  rec.bankAccountNumber === full.bankAccountNumber && rec.bankIfsc === full.bankIfsc &&
  rec.paymentTerms === full.paymentTerms && rec.creditDays === full.creditDays);
check('certificates persisted', Array.isArray(rec.certificates) && rec.certificates.length === 1 && rec.certificates[0].certNo === 'ISO-TEST-1');
check('metrics persisted', rec.metrics?.onTimeDelivery === 92 && rec.metrics?.qualityRating === 4.1);
check('categories persisted', Array.isArray(rec.categories) && rec.categories.includes('Civil'));
check('registeredOn persisted', String(rec.registeredOn || '').slice(0, 10) === '2024-04-01');

// 3. Update
const updated = await json('PUT', '/api/fin/vendors', {
  id,
  name,
  region: 'Eastern Region',
  status: 'preferred',
  rating: 4.8,
  city: 'Pune',
  bankIfsc: 'TEST0009999',
});
check('PUT updates the contractor', updated.status === 200 && updated.data?.success === true, `status ${updated.status}`);
const after = (await json('GET', `/api/fin/vendors?id=${id}`)).data?.data || {};
check('update applied', after.region === 'Eastern Region' && after.status === 'preferred' && after.rating === 4.8 && after.city === 'Pune' && after.bankIfsc === 'TEST0009999');

// 4. Partial update (status flip only) must not blank other fields
const partial = await json('PUT', '/api/fin/vendors', { id, status: 'standard' });
const afterPartial = (await json('GET', `/api/fin/vendors?id=${id}`)).data?.data || {};
check('partial update keeps other fields',
  partial.status === 200 && afterPartial.region === 'Eastern Region' && afterPartial.email === full.email &&
  afterPartial.gstin === full.gstin && afterPartial.bankAccountNumber === full.bankAccountNumber);

// 5. Validation
const bad = await json('POST', '/api/fin/vendors', { name: '', region: '', email: 'not-an-email', gstin: 'TOOSHORT', pan: 'BAD' });
check('invalid create is rejected with field errors',
  bad.status === 400 && bad.data?.errors?.name && bad.data?.errors?.region && bad.data?.errors?.email && bad.data?.errors?.gstin && bad.data?.errors?.pan,
  `status ${bad.status} ${JSON.stringify(bad.data?.errors)}`);

// 6. Duplicate name
const dupe = await json('POST', '/api/fin/vendors', { name: name.toUpperCase(), region: 'Mumbai HQ' });
check('duplicate contractor name is rejected', dupe.status === 409 && !!dupe.data?.errors?.name, `status ${dupe.status}`);

// 7. Duplicate code
const dupeCode = await json('POST', '/api/fin/vendors', { name: `${name} Two`, region: 'Mumbai HQ', vendorCode: full.vendorCode });
check('duplicate contractor code is rejected', dupeCode.status === 409 && !!dupeCode.data?.errors?.vendorCode, `status ${dupeCode.status}`);

// 8. Delete
const removed = await json('DELETE', `/api/fin/vendors?id=${id}`);
check('DELETE removes the contractor', removed.status === 200 && removed.data?.success === true, `status ${removed.status}`);
const gone = await json('GET', `/api/fin/vendors?id=${id}`);
check('deleted contractor is gone', gone.status === 404);

// 9. A contractor that is already used by a purchase document must not be deletable
const pos = await json('GET', '/api/procurement/po-register');
const poVendors = [...new Set((pos.data?.data || []).map(p => p.vendor).filter(Boolean))];
const list = await json('GET', '/api/fin/vendors');
const used = poVendors.map(name => (list.data?.data || []).find(v => v.name === name)).find(Boolean);
if (used) {
  const blocked = await json('DELETE', `/api/fin/vendors?id=${used.id}`);
  check(`contractor in use (${used.name}) cannot be deleted`, blocked.status === 409, `status ${blocked.status}`);
} else {
  console.log(`SKIP  contractor-in-use delete guard (no PO vendor is in the master: ${poVendors.join(', ') || 'none'})`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
