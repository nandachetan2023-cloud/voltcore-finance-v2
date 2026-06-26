// Adds performance indexes to every tenant DB. Safe & idempotent
// (CREATE INDEX IF NOT EXISTS), no data change. Index names match Prisma's
// convention so the schema and DB stay in sync.
//
//   SUPERADMIN_DATABASE_URL="postgres://..." node scripts/add-performance-indexes.mjs
//
// Tip: on a very large AttendanceLog, run during low traffic — CREATE INDEX
// briefly locks writes on that table (fast for small/medium tables).
import pg from 'pg';

const STATEMENTS = [
  `CREATE INDEX IF NOT EXISTS "AttendanceLog_employeeId_logDate_idx" ON "AttendanceLog" ("employeeId", "logDate")`,
  `CREATE INDEX IF NOT EXISTS "Employee_isDeleted_employmentStatus_idx" ON "Employee" ("isDeleted", "employmentStatus")`,
  `CREATE INDEX IF NOT EXISTS "Employee_departmentId_idx" ON "Employee" ("departmentId")`,
  `CREATE INDEX IF NOT EXISTS "Employee_branchId_idx" ON "Employee" ("branchId")`,
];

const stripQuery = (url) => url.split('?')[0]; // pg doesn't understand ?schema=public
const mask = (url) => stripQuery(url).replace(/:\/\/[^@]*@/, '://***@');

const saUrl = process.env.SUPERADMIN_DATABASE_URL;
if (!saUrl) {
  console.error('Set SUPERADMIN_DATABASE_URL (see your .env)');
  process.exit(1);
}

// Discover every tenant DB from the superadmin registry
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
    console.log(`✓ ${mask(url)} — ${ok}/${STATEMENTS.length} indexes ensured`);
  } catch (e) {
    console.log(`✗ ${mask(url)}: ${e.message}`);
  } finally {
    await client.end();
  }
}

console.log('Done.');
