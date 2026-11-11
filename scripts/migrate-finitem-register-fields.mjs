// Item Master → docx "Item Code Master Register" alignment.
// Adds the four register columns to FinItem in every tenant DB (idempotent —
// ADD COLUMN IF NOT EXISTS, no data touched, safe to re-run):
//
//   FinItem."specification" TEXT   e.g. 'E7018 Low Hydrogen'
//   FinItem."makeBrand"     TEXT   e.g. 'ESAB'
//   FinItem."modelNo"       TEXT   e.g. 'OK 48.00'
//   FinItem."sizeCapacity"  TEXT   e.g. '4 mm'
//
// Also seeds the register's Category Prefix Master (CON, P&M, T&T, PPE, GAS,
// ELE, WEL, MIN, LFT, SAF) via upsert — existing categories are left alone.
//
// Run once per environment. It enumerates every tenant DB from the superadmin
// registry (and DATABASE_URL if set):
//
//   SUPERADMIN_DATABASE_URL="postgres://..." node scripts/migrate-finitem-register-fields.mjs
import pg from 'pg';

const STATEMENTS = [
  `ALTER TABLE "FinItem" ADD COLUMN IF NOT EXISTS "specification" TEXT`,
  `ALTER TABLE "FinItem" ADD COLUMN IF NOT EXISTS "makeBrand" TEXT`,
  `ALTER TABLE "FinItem" ADD COLUMN IF NOT EXISTS "modelNo" TEXT`,
  `ALTER TABLE "FinItem" ADD COLUMN IF NOT EXISTS "sizeCapacity" TEXT`,
];

const CATEGORY_MASTER = [
  ['CON', 'Consumable'], ['P&M', 'Power & Machine'], ['T&T', 'Tools & Tackles'],
  ['PPE', 'PPES'], ['GAS', 'Gas'], ['ELE', 'Electrical'],
  ['WEL', 'Welding Equipment'], ['MIN', 'Measuring Instrument'], ['LFT', 'Lifting Equipment'],
  ['SAF', 'Safety Equipment'],
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
    for (const [code, name] of CATEGORY_MASTER) {
      try {
        await client.query(
          `INSERT INTO "FinItemCategory" ("code", "name", "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, true, NOW(), NOW())
           ON CONFLICT DO NOTHING`,
          [code, name],
        );
        ok++;
      } catch (e) {
        failures++;
        console.log(`  ! ${mask(url)} category ${code}: ${e.message}`);
      }
    }
    console.log(`✓ ${mask(url)} — ${ok}/${STATEMENTS.length + CATEGORY_MASTER.length} statements applied`);
  } catch (e) {
    failures++;
    console.log(`✗ ${mask(url)}: ${e.message}`);
  } finally {
    await client.end();
  }
}

console.log(failures ? `Done with ${failures} failure(s).` : 'Done. All statements applied cleanly.');
process.exit(failures ? 1 : 0);
