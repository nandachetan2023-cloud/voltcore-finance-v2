// Adds Shift hours-worked thresholds to every tenant DB:
//   Shift."minPresentHours" (default 8)  — worked ≥ this → full-day Present
//   Shift."minHalfDayHours" (default 4)  — worked ≥ this (but < minPresent) → Half Day; below → Absent
// Safe & idempotent (IF NOT EXISTS), no data change.
//
//   SUPERADMIN_DATABASE_URL="postgres://..." node scripts/migrate-shift-minhours.mjs
import pg from 'pg';

const STATEMENTS = [
  `ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "minPresentHours" DOUBLE PRECISION NOT NULL DEFAULT 8`,
  `ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "minHalfDayHours" DOUBLE PRECISION NOT NULL DEFAULT 4`,
  `ALTER TABLE "Shift" ALTER COLUMN "minPresentHours" SET DEFAULT 8`,
  `ALTER TABLE "Shift" ALTER COLUMN "minHalfDayHours" SET DEFAULT 4`,
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
