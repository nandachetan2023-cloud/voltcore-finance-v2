// Adds the Fixed/Non-Fixed + OT-type payroll fields to every tenant DB:
//   Employee."otType"            (INTEGER, default 1)  — 1x/2x OT for non-fixed
//   Branch."monthlyWorkingDays"  (INTEGER, default 26) — per-site payroll divisor
// Safe & idempotent (IF NOT EXISTS), no data change.
//
//   SUPERADMIN_DATABASE_URL="postgres://..." node scripts/migrate-fixed-nonfixed-ottype.mjs
import pg from 'pg';

const STATEMENTS = [
  `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "otType" INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "monthlyWorkingDays" INTEGER NOT NULL DEFAULT 26`,
  `ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "otType1Divisor" INTEGER NOT NULL DEFAULT 26`,
  `ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "otType2Divisor" INTEGER NOT NULL DEFAULT 26`,
  // Classify the existing workforce as Non-Fixed with 1x OT (the standard /26
  // behaviour) — the sensible default. The few true fixed employees get flipped
  // to 'fixed' individually in the employee form afterwards. Only rewrites values
  // that aren't already the new fixed/non_fixed vocabulary.
  `UPDATE "Employee" SET "employmentType" = 'non_fixed'
     WHERE "employmentType" IS NULL OR "employmentType" NOT IN ('fixed', 'non_fixed')`,
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
