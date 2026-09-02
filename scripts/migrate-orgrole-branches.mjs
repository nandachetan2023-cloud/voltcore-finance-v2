// Adds OrgRole."branches" to the SUPERADMIN database.
//
// This is the site/branch scope axis, sitting alongside the existing
// "departments" and "designations" columns. Empty string = universal, so every
// existing role keeps its current behaviour until an admin narrows it.
//
// Unlike the other migrate-* scripts this one targets the SUPERADMIN DB only —
// OrgRole lives there, not in the per-tenant databases.
//
// Safe & idempotent (IF NOT EXISTS), no data change.
//
//   node scripts/migrate-orgrole-branches.mjs
import pg from 'pg';

const STATEMENTS = [
  `ALTER TABLE "OrgRole" ADD COLUMN IF NOT EXISTS "branches" VARCHAR(191) NOT NULL DEFAULT ''`,
];

const stripQuery = (url) => url.split('?')[0];
const mask = (url) => stripQuery(url).replace(/:\/\/[^@]*@/, '://***@');

const saUrl = process.env.SUPERADMIN_DATABASE_URL;
if (!saUrl) {
  console.error('Set SUPERADMIN_DATABASE_URL (see your .env)');
  process.exit(1);
}

const client = new pg.Client({ connectionString: stripQuery(saUrl) });
let failed = 0;
try {
  await client.connect();
  for (const stmt of STATEMENTS) {
    try { await client.query(stmt); }
    catch (e) { failed++; console.log(`  ! ${e.message}`); }
  }

  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE "branches" = '')::int AS universal
       FROM "OrgRole"`
  );
  console.log(`✓ ${mask(saUrl)} — ${STATEMENTS.length - failed}/${STATEMENTS.length} statements applied`);
  console.log(`  OrgRole rows: ${rows[0].total} (${rows[0].universal} universal / unscoped by site)`);
} catch (e) {
  console.log(`✗ ${mask(saUrl)}: ${e.message}`);
  failed++;
} finally {
  await client.end().catch(() => {});
}

process.exit(failed ? 1 : 0);
