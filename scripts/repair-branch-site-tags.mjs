// Re-point existing tenant Branch rows at their current biometric siteId.
//
// WHY THIS IS NEEDED
//   /api/branches used to match sites to branches BY NAME, so renaming a site
//   in the superadmin created a second Branch and left the old name in every
//   site dropdown. The fix keys on siteId, stamped into Branch.address as
//   "Site ID: <siteId>".
//
//   Branches created before the fix carry whatever siteId the site had when
//   they were first synced. If the siteId itself was later changed, the stamp
//   no longer matches any live site — so the corrected sync would treat the
//   site as new and create YET ANOTHER branch. This script re-stamps by NAME
//   once, so the existing rows are adopted instead of duplicated.
//
// WHAT IT DOES, per tenant DB
//   For each ACTIVE biometric site, find the branch whose name equals the
//   site name and re-stamp its address to the current siteId. Branches that
//   already carry the right tag are left alone. Nothing is deleted, and no
//   branch is ever renamed here — only the address tag changes.
//
// Run this ONCE, before or right after deploying the /api/branches fix.
//
//   node scripts/repair-branch-site-tags.mjs            # dry run
//   node scripts/repair-branch-site-tags.mjs --confirm
import pg from 'pg';

const DRY = !process.argv.includes('--confirm');
const stripQuery = (u) => u.split('?')[0];
const mask = (u) => stripQuery(u).replace(/:\/\/[^@]*@/, '://***@');
const siteTag = (id) => `Site ID: ${id}`;

const saUrl = process.env.SUPERADMIN_DATABASE_URL;
if (!saUrl) {
  console.error('SUPERADMIN_DATABASE_URL is not set. Run with your .env exported.');
  process.exit(1);
}

console.log(DRY ? '\n=== DRY RUN — nothing will be modified ===\n'
                : '\n=== LIVE RUN — branch tags will be updated ===\n');

const sa = new pg.Client({ connectionString: stripQuery(saUrl) });
await sa.connect();

const { rows: tenants } = await sa.query('SELECT id, name, "dbUrl" FROM "Tenant"');
let planned = 0;

for (const t of tenants) {
  const { rows: sites } = await sa.query(
    'SELECT "siteId", "siteName" FROM "BiometricSiteConfig" WHERE "tenantId" = $1 AND "isActive" = true',
    [t.id]
  );
  console.log(`\n── ${t.name} ── ${sites.length} active site(s)`);
  if (!sites.length) continue;

  const url = t.dbUrl || process.env.DATABASE_URL;
  if (!url) { console.log('  ! no dbUrl and no DATABASE_URL fallback — skipped'); continue; }

  const db = new pg.Client({ connectionString: stripQuery(url) });
  try {
    await db.connect();
    for (const s of sites) {
      const want = siteTag(s.siteId);

      const { rows: tagged } = await db.query('SELECT id, name FROM "Branch" WHERE address = $1', [want]);
      if (tagged.length) {
        console.log(`  ok   "${s.siteName}" already tagged ${want}`);
        continue;
      }

      const { rows: byName } = await db.query('SELECT id, name, address FROM "Branch" WHERE name = $1', [s.siteName]);
      if (!byName.length) {
        console.log(`  ..   "${s.siteName}" has no branch yet — the app will create it on next load`);
        continue;
      }

      const b = byName[0];
      console.log(`  FIX  "${b.name}": ${JSON.stringify(b.address)} -> ${JSON.stringify(want)}`);
      planned++;
      if (!DRY) {
        await db.query('UPDATE "Branch" SET address = $1 WHERE id = $2', [want, b.id]);
      }
    }

    // Report branches that will STILL be tagged with a dead siteId after this
    // run — the genuine leftovers the corrected GET hides (unless they hold
    // staff). On a dry run the rows above have not been re-stamped yet, so
    // exclude the ones we just planned to fix or this would list them twice.
    const liveTags = sites.map(s => siteTag(s.siteId));
    const fixedNames = sites.map(s => s.siteName);
    const { rows: stale } = await db.query(
      `SELECT b.id, b.name, b.address, COUNT(e.id)::int AS employees
         FROM "Branch" b LEFT JOIN "Employee" e ON e."branchId" = b.id
        WHERE b.address LIKE 'Site ID: %'
          AND NOT (b.address = ANY($1))
          AND NOT (b.name = ANY($2))
        GROUP BY b.id, b.name, b.address`,
      [liveTags.length ? liveTags : [''], fixedNames.length ? fixedNames : ['']]
    );
    for (const s of stale) {
      console.log(`  ${s.employees > 0 ? 'KEEP' : 'HIDE'} "${s.name}" (${s.address}) — ${s.employees} employee(s)`
        + (s.employees > 0 ? ' — stays listed, flagged orphaned' : ' — will drop out of dropdowns'));
    }
  } catch (e) {
    console.log(`  ✗ ${mask(url)}: ${e.message}`);
  } finally {
    await db.end().catch(() => {});
  }
}

await sa.end();

console.log(DRY
  ? `\n=== DRY RUN complete — ${planned} branch tag(s) would be updated. Re-run with --confirm. ===\n`
  : `\n=== Done — ${planned} branch tag(s) updated. ===\n`);
