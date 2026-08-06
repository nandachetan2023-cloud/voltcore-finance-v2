// Delete every OrgRole and ApprovalChain (with their steps) for all tenants.
//
// These live in the SUPERADMIN database, so this is the one destructive
// script that deliberately writes there. It does NOT touch Tenant,
// TenantUser (beyond unassigning roles), SuperAdminUser, BiometricSiteConfig
// or PasswordResetOTP — logins survive.
//
// ORDER MATTERS
//   ApprovalStep.approverRoleId is ON DELETE RESTRICT, so a role cannot be
//   deleted while any step references it. Deletion therefore runs
//   steps -> chains -> roles. (Steps also cascade from chains, but they are
//   removed explicitly so the RESTRICT can never trip.)
//
// THE UNENFORCED REFERENCE
//   TenantUser.orgRoleId has NO foreign key — Prisma models it as a plain
//   String. Deleting roles would leave it pointing at rows that no longer
//   exist, and nothing in the database would complain. Login resolves module
//   access from the role when orgRoleId is set, so a dangling id silently
//   falls back to TenantUser.allowedModules. This script clears orgRoleId
//   first, which makes that fallback explicit rather than accidental.
//
//   Before clearing, each user's effective module access is written into
//   their own allowedModules column, so nobody's access changes as a result
//   of losing their role. Without this a user whose access came from the
//   role would silently inherit whatever stale value that column held.
//
// USAGE
//   node scripts/reset-roles-and-chains.mjs                 # dry run
//   node scripts/reset-roles-and-chains.mjs --confirm
//   node scripts/reset-roles-and-chains.mjs --confirm --tenant=<tenantId>
//   node scripts/reset-roles-and-chains.mjs --confirm --keep-assignments
import pg from 'pg';
import readline from 'node:readline';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const valOf = (p) => (args.find((a) => a.startsWith(p)) || '').split('=')[1] || null;

const DRY = !has('--confirm');
const YES = has('--yes');
const KEEP_ASSIGNMENTS = has('--keep-assignments');
const TENANT = valOf('--tenant=');

const stripQuery = (u) => u.split('?')[0];
const mask = (u) => stripQuery(u).replace(/:\/\/[^@]*@/, '://***@');

const saUrl = process.env.SUPERADMIN_DATABASE_URL;
if (!saUrl) {
  console.error('SUPERADMIN_DATABASE_URL is not set. Run with your .env exported.');
  process.exit(1);
}

console.log(DRY ? '\n=== DRY RUN — nothing will be modified ===\n'
                : '\n=== LIVE RUN — roles and approval chains WILL be deleted ===\n');
console.log('Superadmin DB:', mask(saUrl));
if (TENANT) console.log('Scoped to tenant:', TENANT);

const c = new pg.Client({ connectionString: stripQuery(saUrl) });
await c.connect();

// Scope filter. Roles and chains are both tenant-scoped; steps are reached
// through their chain.
const where = TENANT ? `WHERE "tenantId" = $1` : '';
const params = TENANT ? [TENANT] : [];

const { rows: tenants } = await c.query('SELECT id, name FROM "Tenant"');
const tenantName = new Map(tenants.map((t) => [t.id, t.name]));
if (TENANT && !tenantName.has(TENANT)) {
  console.error(`\nNo tenant with id "${TENANT}". Known tenants:`);
  for (const t of tenants) console.error(`  ${t.id}  ${t.name}`);
  await c.end();
  process.exit(1);
}

// ── Inventory ────────────────────────────────────────────────────
const { rows: roles } = await c.query(
  `SELECT id, name, level, "tenantId", "moduleAccess" FROM "OrgRole" ${where} ORDER BY level`, params
);
const { rows: chains } = await c.query(
  `SELECT id, name, "tenantId" FROM "ApprovalChain" ${where}`, params
);
const chainIds = chains.map((x) => x.id);
const { rows: steps } = chainIds.length
  ? await c.query(`SELECT id, "chainId" FROM "ApprovalStep" WHERE "chainId" = ANY($1)`, [chainIds])
  : { rows: [] };

// Users holding one of the roles being deleted.
const roleIds = roles.map((r) => r.id);
const { rows: assigned } = roleIds.length
  ? await c.query(
      `SELECT id, email, "orgRoleId", "allowedModules" FROM "TenantUser" WHERE "orgRoleId" = ANY($1)`,
      [roleIds]
    )
  : { rows: [] };

console.log(`\nOrgRole        : ${roles.length}`);
for (const r of roles) console.log(`  - ${r.name} (level ${r.level}) · ${tenantName.get(r.tenantId) || r.tenantId}`);
console.log(`ApprovalChain  : ${chains.length}`);
for (const x of chains) console.log(`  - ${x.name} · ${tenantName.get(x.tenantId) || x.tenantId}`);
console.log(`ApprovalStep   : ${steps.length}`);

console.log(`\nTenantUser rows holding one of these roles: ${assigned.length}`);
const roleById = new Map(roles.map((r) => [r.id, r]));
for (const u of assigned) {
  const role = roleById.get(u.orgRoleId);
  const effective = role ? role.moduleAccess : u.allowedModules;
  console.log(`  - ${u.email}`);
  console.log(`      role "${role?.name ?? '?'}" grants: ${effective}`);
  console.log(`      own allowedModules currently: ${u.allowedModules}`);
  if (!KEEP_ASSIGNMENTS && effective !== u.allowedModules) {
    console.log(`      -> allowedModules will be set to "${effective}" so access is unchanged`);
  }
}
console.log(KEEP_ASSIGNMENTS
  ? '\n  --keep-assignments: orgRoleId will be LEFT AS-IS and will dangle (no FK enforces it).'
  : '\n  orgRoleId will be cleared; login falls back to allowedModules (preserved above).');

if (!roles.length && !chains.length) {
  console.log('\nNothing to delete.');
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
    rl.question(`\nDelete ${roles.length} role(s), ${chains.length} chain(s), ${steps.length} step(s)? Type DELETE: `, res)
  );
  rl.close();
  if (ans.trim() !== 'DELETE') {
    console.log('Aborted — nothing was changed.');
    await c.end();
    process.exit(1);
  }
}

// ── Delete, in one transaction ───────────────────────────────────
try {
  await c.query('BEGIN');

  // 1. Preserve effective access, then unassign. Must happen before the roles
  //    go, since the role is where the access value comes from.
  if (!KEEP_ASSIGNMENTS && assigned.length) {
    for (const u of assigned) {
      const role = roleById.get(u.orgRoleId);
      const effective = role ? role.moduleAccess : u.allowedModules;
      await c.query(
        'UPDATE "TenantUser" SET "allowedModules" = $1, "orgRoleId" = NULL WHERE id = $2',
        [effective, u.id]
      );
    }
    console.log(`\n✓ Preserved module access and cleared orgRoleId on ${assigned.length} user(s)`);
  }

  // 2. Steps first — ApprovalStep.approverRoleId is ON DELETE RESTRICT.
  if (chainIds.length) {
    const r = await c.query('DELETE FROM "ApprovalStep" WHERE "chainId" = ANY($1)', [chainIds]);
    console.log(`✓ Deleted ${r.rowCount} approval step(s)`);
  }

  // 3. Chains.
  const rc = await c.query(`DELETE FROM "ApprovalChain" ${where}`, params);
  console.log(`✓ Deleted ${rc.rowCount} approval chain(s)`);

  // 4. Roles — now unreferenced.
  const rr = await c.query(`DELETE FROM "OrgRole" ${where}`, params);
  console.log(`✓ Deleted ${rr.rowCount} role(s)`);

  await c.query('COMMIT');
} catch (e) {
  await c.query('ROLLBACK').catch(() => {});
  console.error(`\n✗ Failed, rolled back — nothing was deleted: ${e.message}`);
  await c.end();
  process.exit(1);
}

// ── Verify ───────────────────────────────────────────────────────
const { rows: left } = await c.query(
  `SELECT (SELECT COUNT(*)::int FROM "OrgRole" ${where}) AS roles,
          (SELECT COUNT(*)::int FROM "ApprovalChain" ${where}) AS chains,
          (SELECT COUNT(*)::int FROM "ApprovalStep") AS steps,
          (SELECT COUNT(*)::int FROM "TenantUser") AS users,
          (SELECT COUNT(*)::int FROM "Tenant") AS tenants`,
  params
);
const v = left[0];
console.log(`\nRemaining — roles: ${v.roles}, chains: ${v.chains}, steps: ${v.steps}`);
console.log(`Preserved  — tenants: ${v.tenants}, logins: ${v.users}`);

await c.end();

console.log(`
=== Done ===
Rebuild your roles in Organization -> Roles & Access, then reassign users
in User Management. Until a user is given a role again, their access comes
from their own allowedModules value (preserved above) and approvals fall
through to the tenant admin.
`);
