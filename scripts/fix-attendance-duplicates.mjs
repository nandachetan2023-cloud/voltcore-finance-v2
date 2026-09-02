// Repairs AttendanceLog damage caused by the old biometric pipeline that:
//   (a) hard-skipped matched employees without a resolvable shift assignment, and
//   (b) looked up existing attendance by EXACT logDate, so an offset pre-existing
//       row (IST vs UTC) was missed and a duplicate could be created.
//
// For every (employee, IST-calendar-day) that has MORE THAN ONE AttendanceLog row,
// this keeps the "best" row (prefers one WITH a punchIn; then the most complete /
// most recently updated) and deletes the rest — so the Absent-with-no-time-in
// ghost rows disappear and the real punched row remains.
//
// Idempotent and safe: it only removes duplicate rows within the same employee-day;
// single rows are never touched. Runs across every tenant DB.
//
//   SUPERADMIN_DATABASE_URL="postgres://..." node scripts/fix-attendance-duplicates.mjs
//   Add DRY_RUN=1 to only report what WOULD be deleted.
import pg from 'pg';

const DRY = process.env.DRY_RUN === '1';
const stripQuery = (url) => url.split('?')[0];
const mask = (url) => stripQuery(url).replace(/:\/\/[^@]*@/, '://***@');

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
    // Group by employee + IST calendar day. Keep the best row per group:
    //   1. rows WITH a punchIn beat rows without,
    //   2. then rows WITH a punchOut,
    //   3. then the most recently updated.
    // Delete every other row in a group with >1 row.
    const dupGroups = await c.query(`
      SELECT "employeeId",
             (("logDate" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::date AS ist_day,
             COUNT(*) AS n
      FROM "AttendanceLog"
      GROUP BY "employeeId", ist_day
      HAVING COUNT(*) > 1`);

    let deleted = 0;
    for (const g of dupGroups.rows) {
      const rowsInGroup = await c.query(`
        SELECT id, "punchIn", "punchOut", "updatedAt"
        FROM "AttendanceLog"
        WHERE "employeeId" = $1
          AND (("logDate" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::date = $2
        ORDER BY ("punchIn" IS NOT NULL) DESC,
                 ("punchOut" IS NOT NULL) DESC,
                 "updatedAt" DESC`,
        [g.employeeId, g.ist_day]);
      const keep = rowsInGroup.rows[0];
      const drop = rowsInGroup.rows.slice(1).map((r) => r.id);
      if (drop.length === 0) continue;
      if (DRY) {
        console.log(`  [dry] emp ${g.employeeId} ${g.ist_day}: keep #${keep.id} (in=${!!keep.punchIn}), drop ${JSON.stringify(drop)}`);
      } else {
        const res = await c.query('DELETE FROM "AttendanceLog" WHERE id = ANY($1)', [drop]);
        deleted += res.rowCount;
      }
    }
    console.log(`${DRY ? '[dry] ' : ''}✓ ${mask(url)} — ${dupGroups.rowCount} duplicate day-group(s), ${DRY ? '(no deletes)' : deleted + ' row(s) deleted'}`);
    await c.end();
  } catch (e) {
    console.log(`✗ ${mask(url)}: ${e.message}`);
    try { await c.end(); } catch {}
  }
}
console.log('Done.');
