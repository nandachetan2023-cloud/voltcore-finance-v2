// Reset ALL tenant (operational) data while leaving the superadmin DB intact.
//
// WHAT IT TOUCHES
//   Every database listed in Tenant.dbUrl, plus DATABASE_URL. Tables are
//   TRUNCATEd and their identity sequences restarted, so the schema, indexes
//   and FKs survive — only rows go. Nothing is dropped, so no migration needs
//   to be re-run afterwards.
//
// WHAT IT NEVER TOUCHES
//   SUPERADMIN_DATABASE_URL — Tenant, TenantUser, OrgRole, ApprovalChain,
//   ApprovalStep, SuperAdminUser, BiometricSiteConfig, PasswordResetOTP.
//   The script refuses to run if a tenant URL resolves to the same database
//   as the superadmin URL.
//
// THE CROSS-DB DANGLING REFERENCE
//   TenantUser.employeeId lives in the superadmin DB and points at
//   Employee.id in a tenant DB, with no foreign key to enforce it. Wiping the
//   tenant DB leaves those pointing at employees that no longer exist, so
//   affected logins resolve to nothing. By default this script clears
//   employeeId on those rows (the accounts keep working; they just need
//   re-linking to a new employee record). Pass --keep-links to leave them.
//
// USAGE
//   node scripts/reset-tenant-db.mjs --dry-run     # show what would happen
//   node scripts/reset-tenant-db.mjs --confirm     # actually do it
//   node scripts/reset-tenant-db.mjs --confirm --keep-links
//   node scripts/reset-tenant-db.mjs --confirm --only=erp_upasana
//
// Requires --confirm to modify anything. Default is a dry run.
import pg from 'pg';
import readline from 'node:readline';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const valOf = (p) => (args.find((a) => a.startsWith(p)) || '').split('=')[1] || null;

const DRY = !has('--confirm');
const KEEP_LINKS = has('--keep-links');
const ONLY = valOf('--only=');
const YES = has('--yes');

const stripQuery = (u) => u.split('?')[0];
const mask = (u) => stripQuery(u).replace(/:\/\/[^@]*@/, '://***@');
const dbKey = (u) => {
  const x = new URL(stripQuery(u));
  return `${x.hostname}:${x.port || 5432}${x.pathname}`;
};
const dbName = (u) => new URL(stripQuery(u)).pathname.slice(1);

const saUrl = process.env.SUPERADMIN_DATABASE_URL;
if (!saUrl) {
  console.error('SUPERADMIN_DATABASE_URL is not set. Run with your .env exported.');
  process.exit(1);
}

console.log(DRY ? '\n=== DRY RUN — nothing will be modified ===\n'
                : '\n=== LIVE RUN — tenant data WILL be deleted ===\n');

// ── Collect tenant databases ────────────────────────────────────
const sa = new pg.Client({ connectionString: stripQuery(saUrl) });
await sa.connect();

const { rows: tenants } = await sa.query('SELECT id, name, "dbUrl" FROM "Tenant"');
const targets = new Map(); // dbKey -> { url, label }

for (const t of tenants) {
  if (!t.dbUrl) continue;
  try { targets.set(dbKey(t.dbUrl), { url: t.dbUrl, label: t.name }); }
  catch { console.log(`  ! tenant "${t.name}" has an unparseable dbUrl — skipped`); }
}
// The default tenant DB may hold data even when no Tenant row points at it.
if (process.env.DATABASE_URL) {
  const k = dbKey(process.env.DATABASE_URL);
  if (!targets.has(k)) targets.set(k, { url: process.env.DATABASE_URL, label: '(DATABASE_URL default)' });
}

// ── Guard: never let a target be the superadmin DB ───────────────
const saKey = dbKey(saUrl);
for (const [k, v] of targets) {
  if (k === saKey) {
    console.error(`\nREFUSING TO RUN: "${v.label}" resolves to the same database as`);
    console.error(`SUPERADMIN_DATABASE_URL (${mask(saUrl)}).`);
    console.error('Resetting it would destroy tenants, roles and logins.');
    await sa.end();
    process.exit(1);
  }
}

let selected = [...targets.entries()];
if (ONLY) {
  selected = selected.filter(([, v]) => dbName(v.url) === ONLY);
  if (!selected.length) {
    console.error(`--only=${ONLY} matched no tenant database.`);
    await sa.end();
    process.exit(1);
  }
}

console.log('Superadmin DB (PRESERVED):', mask(saUrl));
console.log('\nTenant databases to reset:');
for (const [, v] of selected) console.log(`  - ${v.label}: ${dbName(v.url)}`);

// ── Report the cross-DB links that will dangle ───────────────────
const { rows: linked } = await sa.query(
  'SELECT id, email, "employeeId" FROM "TenantUser" WHERE "employeeId" IS NOT NULL'
);
console.log(`\nTenantUser rows linked to a tenant Employee.id: ${linked.length}`);
for (const u of linked) console.log(`  - ${u.email} → Employee.id=${u.employeeId}`);
console.log(KEEP_LINKS
  ? '  → --keep-links given: these will be LEFT AS-IS and will dangle.'
  : '  → these will have employeeId cleared (accounts survive, need re-linking).');

// ── Per-database row counts ──────────────────────────────────────
const plan = [];
for (const [, v] of selected) {
  const c = new pg.Client({ connectionString: stripQuery(v.url) });
  try {
    await c.connect();
    const { rows: tbls } = await c.query(
      `SELECT tablename FROM pg_tables
        WHERE schemaname='public' AND tablename NOT LIKE '_prisma%'
        ORDER BY tablename`
    );
    let total = 0;
    const counts = [];
    for (const { tablename } of tbls) {
      const { rows: r } = await c.query(`SELECT COUNT(*)::int AS n FROM "${tablename}"`);
      if (r[0].n > 0) counts.push(`${tablename}=${r[0].n}`);
      total += r[0].n;
    }
    plan.push({ ...v, tables: tbls.map((t) => t.tablename), total });
    console.log(`\n${v.label} (${dbName(v.url)}): ${tbls.length} tables, ${total} rows`);
    if (counts.length) console.log('  non-empty: ' + counts.join(', '));
  } catch (e) {
    console.log(`\n✗ ${v.label}: ${e.message}`);
  } finally {
    await c.end().catch(() => {});
  }
}

if (DRY) {
  console.log('\n=== DRY RUN complete. Re-run with --confirm to apply. ===\n');
  await sa.end();
  process.exit(0);
}

// ── Interactive confirmation ─────────────────────────────────────
if (!YES) {
  const totalRows = plan.reduce((a, p) => a + p.total, 0);
  const names = plan.map((p) => dbName(p.url)).join(', ');
  console.log(`\nAbout to delete ${totalRows} rows from: ${names}`);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans = await new Promise((res) => rl.question('Type RESET to proceed: ', res));
  rl.close();
  if (ans.trim() !== 'RESET') {
    console.log('Aborted — nothing was changed.');
    await sa.end();
    process.exit(1);
  }
}

// ── Truncate ─────────────────────────────────────────────────────
for (const p of plan) {
  const c = new pg.Client({ connectionString: stripQuery(p.url) });
  try {
    await c.connect();
    if (!p.tables.length) { console.log(`\n${p.label}: no tables, skipped`); continue; }
    // One statement: TRUNCATE ... CASCADE handles FK order for us, and
    // RESTART IDENTITY resets sequences so new ids start from 1 again.
    const list = p.tables.map((t) => `"${t}"`).join(', ');
    await c.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
    console.log(`\n✓ ${p.label} (${dbName(p.url)}): ${p.tables.length} tables truncated, sequences reset`);
  } catch (e) {
    console.log(`\n✗ ${p.label}: ${e.message}`);
  } finally {
    await c.end().catch(() => {});
  }
}

// ── Clear the now-dangling employee links ────────────────────────
if (!KEEP_LINKS && linked.length) {
  const r = await sa.query('UPDATE "TenantUser" SET "employeeId" = NULL WHERE "employeeId" IS NOT NULL');
  console.log(`\n✓ Cleared employeeId on ${r.rowCount} TenantUser row(s) — logins preserved.`);
}

await sa.end();

console.log(`
=== Reset complete ===
Superadmin DB untouched: tenants, roles, approval chains and logins all intact.

Next steps on the server:
  1. pm2 restart erp-nextjs
  2. Log in as your admin and re-create employees (or run the bulk import).
  3. Re-link each login to its new employee record in User Management
     (their employeeId was cleared).
`);
