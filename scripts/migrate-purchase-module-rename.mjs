// Renames the Purchase Management module's approval step label from the old
// "Procurement" wording to "Purchase", so PR approval chains read
//   Site Engineer → Project Manager → Purchase → Finance
// on every tenant DB (existing rows included — the UI renders FinPRApproval.label
// verbatim, so leaving old rows untouched would show both names side by side).
//
// The step's machine key (FinPRApproval.role = 'procurement') is unchanged, so
// approvals already in flight keep matching the same role.
//
// Safe & idempotent.
//
//   SUPERADMIN_DATABASE_URL="postgres://..." node scripts/migrate-purchase-module-rename.mjs
import pg from 'pg';

const STATEMENTS = [
  `UPDATE "FinPRApproval" SET "label" = 'Purchase' WHERE "label" = 'Procurement'`,
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
      try {
        const res = await client.query(stmt);
        ok++;
        console.log(`  • ${mask(url)} — ${res.rowCount ?? 0} row(s) relabelled`);
      } catch (e) {
        failed++;
        console.log(`  ! ${mask(url)}: ${e.message}`);
      }
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
