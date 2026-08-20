// Adds the 24h auto-approval columns to LeaveRequest in every tenant DB:
//   - "stepEnteredAt"     when the request entered its CURRENT step
//   - "autoApprovedSteps" comma-separated step numbers passed by the timer
//
// Existing pending rows are backfilled with "appliedDate" so their window is
// measured from submission rather than from the moment this script ran —
// otherwise every in-flight request would silently get a fresh 24 hours.
//
// Note that this means requests already pending for over 24h become eligible
// on the very next sweep. That is the intended reading of "pending > 24h", but
// it does mean the first sweep after deployment may advance a batch of them.
// Run with --dry-run first to see how many that will be.
//
// Safe & idempotent (IF NOT EXISTS); the backfill only touches rows where
// "stepEnteredAt" IS NULL, so re-running never resets a live timer.
//
//   SUPERADMIN_DATABASE_URL="postgres://..." node scripts/migrate-leave-auto-approval.mjs
//   SUPERADMIN_DATABASE_URL="postgres://..." node scripts/migrate-leave-auto-approval.mjs --dry-run
import pg from 'pg';

const DRY_RUN = process.argv.includes('--dry-run');

const STATEMENTS = [
  `ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "stepEnteredAt" TIMESTAMP(3)`,
  `ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "autoApprovedSteps" TEXT NOT NULL DEFAULT ''`,
  // Backfill: only rows that have never had a step timestamp.
  `UPDATE "LeaveRequest" SET "stepEnteredAt" = "appliedDate" WHERE "stepEnteredAt" IS NULL`,
  // The sweep filters on these three columns together.
  `CREATE INDEX IF NOT EXISTS "LeaveRequest_status_stepEnteredAt_idx"
     ON "LeaveRequest"(status, "stepEnteredAt") WHERE "isDeleted" = false`,
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

if (DRY_RUN) console.log('DRY RUN — no changes will be written.\n');

let failed = 0;
for (const url of urls) {
  const client = new pg.Client({ connectionString: stripQuery(url) });
  try {
    await client.connect();

    // How many pending requests are already older than 24h? These become
    // eligible for auto-approval on the first sweep after deployment.
    const { rows: pre } = await client.query(
      `SELECT COUNT(*)::int AS pending,
              COUNT(*) FILTER (
                WHERE "appliedDate" < NOW() - INTERVAL '24 hours'
              )::int AS overdue
         FROM "LeaveRequest"
        WHERE status = 'pending' AND "isDeleted" = false`
    ).catch(() => ({ rows: [{ pending: 0, overdue: 0 }] }));

    if (DRY_RUN) {
      console.log(`· ${mask(url)} — ${pre[0].pending} pending, ${pre[0].overdue} already past 24h`);
      continue;
    }

    let ok = 0;
    for (const stmt of STATEMENTS) {
      try { await client.query(stmt); ok++; }
      catch (e) { failed++; console.log(`  ! ${mask(url)}: ${e.message}`); }
    }
    console.log(`✓ ${mask(url)} — ${ok}/${STATEMENTS.length} statements applied`);
    console.log(`  ${pre[0].pending} pending leave requests (${pre[0].overdue} already past 24h)`);
  } catch (e) {
    failed++;
    console.log(`✗ ${mask(url)}: ${e.message}`);
  } finally {
    await client.end().catch(() => {});
  }
}
console.log(DRY_RUN ? '\nDry run complete.' : '\nDone.');
process.exit(failed ? 1 : 0);
