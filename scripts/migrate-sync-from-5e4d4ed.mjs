// Consolidated, data-safe migration to bring every tenant DB from commit
// 5e4d4ed up to the current schema. Covers ALL column additions made since then:
//
//   Branch."monthlyWorkingDays"        INTEGER          default 26
//   Branch."otType1Divisor"            INTEGER          default 26
//   Branch."otType2Divisor"            INTEGER          default 26
//   Employee."otType"                  INTEGER          default 1
//   PayrollItem."basicWagesPerDay"     NUMERIC(10,2)    default 0
//   PayrollItem."grossEarnWages"       NUMERIC(15,2)    default 0
//   PayrollItem."totalNonComplianceAmount" NUMERIC(15,2) default 0
//   Shift."minPresentHours"            DOUBLE PRECISION default 8
//   Shift."minHalfDayHours"            DOUBLE PRECISION default 4
//
// Every statement is idempotent (ADD COLUMN IF NOT EXISTS / guarded UPDATE), so
// re-running it is harmless and NO existing data is touched or dropped. New
// columns land with sensible defaults on existing rows; the only data writes are
// two conservative backfills that ONLY rewrite legacy/old-default values.
//
// Run once per environment. It enumerates every tenant DB from the superadmin
// registry (and DATABASE_URL if set):
//
//   SUPERADMIN_DATABASE_URL="postgres://..." node scripts/migrate-sync-from-5e4d4ed.mjs
import pg from 'pg';

const STATEMENTS = [
  // ── Branch: per-site payroll divisors ────────────────────────────────
  `ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "monthlyWorkingDays" INTEGER NOT NULL DEFAULT 26`,
  `ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "otType1Divisor" INTEGER NOT NULL DEFAULT 26`,
  `ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "otType2Divisor" INTEGER NOT NULL DEFAULT 26`,

  // ── Employee: OT-type class for non-fixed employees ──────────────────
  `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "otType" INTEGER NOT NULL DEFAULT 1`,

  // ── PayrollItem: non-compliance round-trip fields (fixes P2022) ──────
  `ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "basicWagesPerDay" NUMERIC(10,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "grossEarnWages" NUMERIC(15,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "totalNonComplianceAmount" NUMERIC(15,2) NOT NULL DEFAULT 0`,

  // ── Shift: hours-worked thresholds (present 8 / half-day 4) ──────────
  `ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "minPresentHours" DOUBLE PRECISION NOT NULL DEFAULT 8`,
  `ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "minHalfDayHours" DOUBLE PRECISION NOT NULL DEFAULT 4`,
  // If the columns already existed from an earlier script (with the old 4/2
  // defaults), realign the column DEFAULT for any future inserts.
  `ALTER TABLE "Shift" ALTER COLUMN "minPresentHours" SET DEFAULT 8`,
  `ALTER TABLE "Shift" ALTER COLUMN "minHalfDayHours" SET DEFAULT 4`,

  // ── Data backfills (conservative — only touch legacy/old-default rows) ─
  // 1) Classify the existing workforce as Non-Fixed (standard /26 behaviour).
  //    Only rewrites values that aren't already the fixed/non_fixed vocabulary,
  //    so employees already flipped to 'fixed' are left alone.
  `UPDATE "Employee" SET "employmentType" = 'non_fixed'
     WHERE "employmentType" IS NULL OR "employmentType" NOT IN ('fixed', 'non_fixed')`,
  // 2) Move shifts still on the OLD thresholds (present 4 / half-day 2) to 8 / 4.
  //    A shift the user deliberately set to any other value is preserved.
  `UPDATE "Shift" SET "minPresentHours" = 8, "minHalfDayHours" = 4
     WHERE "minPresentHours" = 4 AND "minHalfDayHours" = 2`,
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

let failures = 0;
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
        failures++;
        console.log(`  ! ${mask(url)}: ${e.message}`);
      }
    }
    console.log(`✓ ${mask(url)} — ${ok}/${STATEMENTS.length} statements applied`);
  } catch (e) {
    failures++;
    console.log(`✗ ${mask(url)}: ${e.message}`);
  } finally {
    await client.end();
  }
}

console.log(failures ? `Done with ${failures} failure(s).` : 'Done. All statements applied cleanly.');
process.exit(failures ? 1 : 0);
