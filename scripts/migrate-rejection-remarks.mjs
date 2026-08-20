// Records WHERE in the approval chain a request was rejected, on every tenant DB:
//   LeaveRequest / TourRequest / EmployeeRequest gain
//     "rejectedAtStep"     the chain step number that rejected
//     "rejectedByRoleName" the approver role's name at that step
//
// Also adds LeaveRequest."rejectionReason" if it is somehow missing — it is in
// the schema already, but the column is cheap to assert and this keeps the
// three modules genuinely uniform.
//
// Both new columns are nullable with no backfill. Historical rejections simply
// have no recorded position, which the UI renders as a plain "Rejected" exactly
// as it does today — there is no way to recover which step rejected them after
// the fact, and inventing one would be worse than showing nothing.
//
// Safe & idempotent (IF NOT EXISTS), no data change.
//
//   SUPERADMIN_DATABASE_URL="postgres://..." node scripts/migrate-rejection-remarks.mjs
import pg from 'pg';

const STATEMENTS = [
  `ALTER TABLE "LeaveRequest"    ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT`,
  `ALTER TABLE "LeaveRequest"    ADD COLUMN IF NOT EXISTS "rejectedAtStep" INTEGER`,
  `ALTER TABLE "LeaveRequest"    ADD COLUMN IF NOT EXISTS "rejectedByRoleName" TEXT`,
  `ALTER TABLE "TourRequest"     ADD COLUMN IF NOT EXISTS "rejectedAtStep" INTEGER`,
  `ALTER TABLE "TourRequest"     ADD COLUMN IF NOT EXISTS "rejectedByRoleName" TEXT`,
  `ALTER TABLE "EmployeeRequest" ADD COLUMN IF NOT EXISTS "rejectedAtStep" INTEGER`,
  `ALTER TABLE "EmployeeRequest" ADD COLUMN IF NOT EXISTS "rejectedByRoleName" TEXT`,
];

const stripQuery = (url) => url.split('?')[0];
const mask = (url) => stripQuery(url).replace(/:\/\/[^@]*@/, '://***@');

const saUrl = process.env.SUPERADMIN_DATABASE_URL;
if (!saUrl) { console.error('Set SUPERADMIN_DATABASE_URL (see your .env)'); process.exit(1); }

const sa = new pg.Client({ connectionString: stripQuery(saUrl) });
await sa.connect();
const { rows } = await sa.query('SELECT DISTINCT "dbUrl" FROM "Tenant"');
await sa.end();

const urls = new Set(rows.map((r) => r.dbUrl).filter(Boolean));
if (process.env.DATABASE_URL) urls.add(process.env.DATABASE_URL);

let failed = 0;
for (const url of urls) {
  const client = new pg.Client({ connectionString: stripQuery(url) });
  try {
    await client.connect();
    let ok = 0;
    for (const stmt of STATEMENTS) {
      try { await client.query(stmt); ok++; }
      catch (e) { failed++; console.log(`  ! ${mask(url)}: ${e.message}`); }
    }
    console.log(`✓ ${mask(url)} — ${ok}/${STATEMENTS.length} statements applied`);
  } catch (e) {
    failed++;
    console.log(`✗ ${mask(url)}: ${e.message}`);
  } finally {
    await client.end().catch(() => {});
  }
}
console.log('\nDone.');
process.exit(failed ? 1 : 0);
