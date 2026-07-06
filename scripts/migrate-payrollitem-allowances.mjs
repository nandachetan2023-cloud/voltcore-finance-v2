// Adds PayrollItem."attendanceAllowance" and "phAmount" (both NUMERIC, default 0)
// to every tenant DB. Safe & idempotent (IF NOT EXISTS), no data change. These
// let the payslip show the Attendance Allowance + PH Amount lines and reconcile
// Net Payable = Gross − Deductions (matching the reference payslip).
//
//   SUPERADMIN_DATABASE_URL="postgres://..." node scripts/migrate-payrollitem-allowances.mjs
import pg from 'pg';

const STATEMENTS = [
  `ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "attendanceAllowance" NUMERIC(15,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "phAmount" NUMERIC(15,2) NOT NULL DEFAULT 0`,
];

const stripQuery = (url) => url.split('?')[0];
const mask = (url) => stripQuery(url).replace(/:\/\/[^@]*@/, '://***@');

const saUrl = process.env.SUPERADMIN_DATABASE_URL;
if (!saUrl) {
  console.error('Set SUPERADMIN_DATABASE_URL (see your .env)');
  process.exit(1);
}

const sa = new pg.Client({ connectionString: stripQuery(saUrl) });
await sa.connect();
const { rows } = await sa.query('SELECT DISTINCT "dbUrl" FROM "Tenant"');
await sa.end();

const urls = new Set(rows.map((r) => r.dbUrl).filter(Boolean));
if (process.env.DATABASE_URL) urls.add(process.env.DATABASE_URL);

for (const url of urls) {
  const client = new pg.Client({ connectionString: stripQuery(url) });
  try {
    await client.connect();
    let ok = 0;
    for (const stmt of STATEMENTS) {
      try {
        await client.query(stmt);
        ok++;
      } catch (e) {
        console.log(`  ! ${mask(url)}: ${e.message}`);
      }
    }
    console.log(`✓ ${mask(url)} — ${ok}/${STATEMENTS.length} statements applied`);
  } catch (e) {
    console.log(`✗ ${mask(url)}: ${e.message}`);
  } finally {
    await client.end();
  }
}

console.log('Done.');
