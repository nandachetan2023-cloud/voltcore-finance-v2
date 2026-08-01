// Repairs AttendanceLog rows that have a punch-in but are wrongly marked 'absent'
// (produced by an attendance rule with a low absentAfterMinutes, before the
// "punched in is never absent" policy fix). A punched-in row is reclassified:
//   - status -> 'present' (a valid punch means the person showed up)
// Late/half-day nuance is preserved where lateMinutes indicates it: rows that
// already carry lateMinutes above the half-day-ish band stay 'half_day'.
//
// This does NOT touch rows without a punch-in (genuine absences), nor manual rows'
// punch data. Idempotent. Runs across every tenant DB.
//
//   SUPERADMIN_DATABASE_URL="postgres://..." node scripts/fix-punched-in-absent.mjs
//   DRY_RUN=1 to preview counts only.
//   HALFDAY_LATE_MIN=120  (optional) lateMinutes >= this stays half_day; else present.
import pg from 'pg';

const DRY = process.env.DRY_RUN === '1';
const HALFDAY_LATE_MIN = Number(process.env.HALFDAY_LATE_MIN || '0'); // 0 = always present
const stripQuery = (u) => u.split('?')[0];
const mask = (u) => stripQuery(u).replace(/:\/\/[^@]*@/, '://***@');

const saUrl = process.env.SUPERADMIN_DATABASE_URL;
if (!saUrl) { console.error('Set SUPERADMIN_DATABASE_URL'); process.exit(1); }
const sa = new pg.Client({ connectionString: stripQuery(saUrl) });
await sa.connect();
const { rows } = await sa.query('SELECT DISTINCT "dbUrl" FROM "Tenant"');
await sa.end();
const urls = new Set(rows.map((r) => r.dbUrl).filter(Boolean));
if (process.env.DATABASE_URL) urls.add(process.env.DATABASE_URL);

for (const url of urls) {
  const c = new pg.Client({ connectionString: stripQuery(url) });
  try {
    await c.connect();
    const bad = (await c.query(
      `SELECT COUNT(*) n FROM "AttendanceLog" WHERE "punchIn" IS NOT NULL AND status = 'absent'`
    )).rows[0].n;

    if (DRY) {
      console.log(`[dry] ${mask(url)} — ${bad} punched-in-but-absent row(s) would be fixed`);
      await c.end();
      continue;
    }

    // Reclassify: punched-in absents become present, unless we want to keep the
    // very-late ones as half_day.
    let res;
    if (HALFDAY_LATE_MIN > 0) {
      res = await c.query(
        `UPDATE "AttendanceLog"
           SET status = CASE WHEN "lateMinutes" >= $1 THEN 'half_day' ELSE 'present' END,
               "updatedAt" = NOW()
         WHERE "punchIn" IS NOT NULL AND status = 'absent'`,
        [HALFDAY_LATE_MIN]
      );
    } else {
      res = await c.query(
        `UPDATE "AttendanceLog" SET status = 'present', "updatedAt" = NOW()
         WHERE "punchIn" IS NOT NULL AND status = 'absent'`
      );
    }
    console.log(`✓ ${mask(url)} — fixed ${res.rowCount} punched-in-but-absent row(s)`);
    await c.end();
  } catch (e) {
    console.log(`✗ ${mask(url)}: ${e.message}`);
    try { await c.end(); } catch {}
  }
}
console.log('\nDone.');
