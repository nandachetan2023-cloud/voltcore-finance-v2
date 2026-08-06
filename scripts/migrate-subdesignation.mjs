// Adds the SubDesignation feature to every tenant DB:
//   - "SubDesignation" table (name + designationId FK, unique per parent)
//   - Employee."subDesignationId" (nullable FK to SubDesignation)
// Safe & idempotent (IF NOT EXISTS), no data change.
//
//   SUPERADMIN_DATABASE_URL="postgres://..." node scripts/migrate-subdesignation.mjs
import pg from 'pg';

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "SubDesignation" (
     id SERIAL PRIMARY KEY,
     name TEXT NOT NULL,
     "designationId" INTEGER NOT NULL REFERENCES "Designation"(id) ON DELETE CASCADE
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "SubDesignation_designationId_name_key" ON "SubDesignation"("designationId", name)`,
  `CREATE INDEX IF NOT EXISTS "SubDesignation_designationId_idx" ON "SubDesignation"("designationId")`,
  `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "subDesignationId" INTEGER REFERENCES "SubDesignation"(id)`,
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

for (const url of urls) {
  const client = new pg.Client({ connectionString: stripQuery(url) });
  try {
    await client.connect();
    let ok = 0;
    for (const stmt of STATEMENTS) {
      try { await client.query(stmt); ok++; }
      catch (e) { console.log(`  ! ${mask(url)}: ${e.message}`); }
    }
    console.log(`✓ ${mask(url)} — ${ok}/${STATEMENTS.length} statements applied`);
  } catch (e) {
    console.log(`✗ ${mask(url)}: ${e.message}`);
  } finally {
    await client.end();
  }
}
console.log('Done.');
