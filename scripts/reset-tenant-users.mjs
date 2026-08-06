// Delete tenant user accounts, keeping each tenant's admin account(s).
//
// "Admin" here means TenantUser.createdBySuperadmin = true — the flag the app
// itself uses to grant admin role regardless of module access (see
// src/lib/auth.ts, where role = 'admin' when modules === 'all' OR
// createdBySuperadmin). Everything else is deleted.
//
// TenantUser lives in the SUPERADMIN database, so this writes there.
// Tenant, OrgRole, ApprovalChain and SuperAdminUser are untouched.
//
// SAFETY: A tenant is never left with zero logins. If applying the rule would
// delete every account for a tenant, that tenant is SKIPPED entirely and
// reported — losing all logins means losing access to the tenant, which no
// cleanup script should be able to do silently.
//
// ORPHANED NOTIFICATIONS: tenant DBs store Notification.userEmail (and a
// userId int) referencing a TenantUser that lives in the other database, with
// no FK. Deleting a login therefore strands its notifications. Those rows are
// removed too, per tenant, unless --keep-notifications is given.
//
// USAGE
//   node scripts/reset-tenant-users.mjs                      # dry run
//   node scripts/reset-tenant-users.mjs --confirm
//   node scripts/reset-tenant-users.mjs --confirm --tenant=<tenantId>
//   node scripts/reset-tenant-users.mjs --confirm --keep=a@x.com,b@y.com
//   node scripts/reset-tenant-users.mjs --confirm --keep-notifications
import pg from 'pg';
import readline from 'node:readline';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const valOf = (p) => (args.find((a) => a.startsWith(p)) || '').split('=')[1] || null;

const DRY = !has('--confirm');
const YES = has('--yes');
const KEEP_NOTIFICATIONS = has('--keep-notifications');
const TENANT = valOf('--tenant=');
const KEEP_EMAILS = new Set(
  (valOf('--keep=') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
);

const stripQuery = (u) => u.split('?')[0];
const mask = (u) => stripQuery(u).replace(/:\/\/[^@]*@/, '://***@');

const saUrl = process.env.SUPERADMIN_DATABASE_URL;
if (!saUrl) {
  console.error('SUPERADMIN_DATABASE_URL is not set. Run with your .env exported.');
  process.exit(1);
}

console.log(DRY ? '\n=== DRY RUN — nothing will be modified ===\n'
                : '\n=== LIVE RUN — user accounts WILL be deleted ===\n');
console.log('Superadmin DB:', mask(saUrl));
console.log('Keep rule    : createdBySuperadmin = true'
  + (KEEP_EMAILS.size ? `, plus --keep: ${[...KEEP_EMAILS].join(', ')}` : ''));
if (TENANT) console.log('Scoped to    :', TENANT);

const c = new pg.Client({ connectionString: stripQuery(saUrl) });
await c.connect();

const { rows: tenants } = await c.query(
  TENANT ? 'SELECT id, name, "dbUrl" FROM "Tenant" WHERE id = $1' : 'SELECT id, name, "dbUrl" FROM "Tenant"',
  TENANT ? [TENANT] : []
);
if (!tenants.length) {
  console.error(TENANT ? `\nNo tenant with id "${TENANT}".` : '\nNo tenants found.');
  await c.end();
  process.exit(1);
}

const toDelete = [];   // { id, email, tenantId }
const skipped = [];    // tenants that would be emptied

for (const t of tenants) {
  const { rows: users } = await c.query(
    'SELECT id, email, name, "createdBySuperadmin", "allowedModules", "isActive" FROM "TenantUser" WHERE "tenantId" = $1 ORDER BY "createdAt"',
    [t.id]
  );
  if (!users.length) continue;

  const keep = users.filter(
    (u) => u.createdBySuperadmin === true || KEEP_EMAILS.has(u.email.toLowerCase())
  );
  const drop = users.filter((u) => !keep.includes(u));

  console.log(`\n── ${t.name} ──`);
  for (const u of keep) {
    const why = u.createdBySuperadmin ? 'createdBySuperadmin' : '--keep';
    console.log(`  KEEP    ${u.email}  (${why})`);
  }
  for (const u of drop) console.log(`  DELETE  ${u.email}`);

  if (!drop.length) { console.log('  (nothing to delete)'); continue; }

  if (!keep.length) {
    console.log(`  !! SKIPPING this tenant — the rule would delete ALL ${users.length} login(s),`);
    console.log('     leaving no way in. Use --keep=<email> to nominate one, then re-run.');
    skipped.push(t);
    continue;
  }

  for (const u of drop) toDelete.push({ ...u, tenantId: t.id, tenantName: t.name, dbUrl: t.dbUrl });
}

console.log(`\nTotal to delete: ${toDelete.length} account(s)`);
if (skipped.length) console.log(`Tenants skipped for safety: ${skipped.map((t) => t.name).join(', ')}`);

if (!toDelete.length) {
  console.log('\nNothing to do.');
  await c.end();
  process.exit(0);
}

if (DRY) {
  console.log('\n=== DRY RUN complete. Re-run with --confirm to apply. ===\n');
  await c.end();
  process.exit(0);
}

if (!YES) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans = await new Promise((res) =>
    rl.question(`\nPermanently delete ${toDelete.length} account(s)? Type DELETE: `, res)
  );
  rl.close();
  if (ans.trim() !== 'DELETE') {
    console.log('Aborted — nothing was changed.');
    await c.end();
    process.exit(1);
  }
}

// ── Delete the accounts ──────────────────────────────────────────
try {
  const ids = toDelete.map((u) => u.id);
  const r = await c.query('DELETE FROM "TenantUser" WHERE id = ANY($1)', [ids]);
  console.log(`\n✓ Deleted ${r.rowCount} account(s)`);
} catch (e) {
  console.error(`\n✗ Delete failed: ${e.message}`);
  await c.end();
  process.exit(1);
}

// ── Clean up their now-orphaned notifications, per tenant DB ─────
if (!KEEP_NOTIFICATIONS) {
  const byDb = new Map();
  for (const u of toDelete) {
    if (!u.dbUrl) continue;
    if (!byDb.has(u.dbUrl)) byDb.set(u.dbUrl, []);
    byDb.get(u.dbUrl).push(u.email);
  }
  for (const [url, emails] of byDb) {
    const t = new pg.Client({ connectionString: stripQuery(url) });
    try {
      await t.connect();
      const r = await t.query('DELETE FROM "Notification" WHERE "userEmail" = ANY($1)', [emails]);
      console.log(`✓ Removed ${r.rowCount} orphaned notification(s) from ${new URL(stripQuery(url)).pathname.slice(1)}`);
    } catch (e) {
      console.log(`  ! Could not clean notifications in ${mask(url)}: ${e.message}`);
    } finally {
      await t.end().catch(() => {});
    }
  }
}

// ── Verify ───────────────────────────────────────────────────────
const { rows: left } = await c.query(
  `SELECT t.name, COUNT(u.id)::int AS logins
     FROM "Tenant" t LEFT JOIN "TenantUser" u ON u."tenantId" = t.id
    GROUP BY t.name ORDER BY t.name`
);
console.log('\nRemaining logins per tenant:');
for (const r of left) console.log(`  ${r.name}: ${r.logins}`);

await c.end();
console.log('\n=== Done ===\n');
