// Full re-process of biometric attendance from the (correct) raw logs.
//
// WHY: earlier code versions produced wrong AttendanceLog rows (punches paired
// onto the wrong day, evening punch stored as punch-IN, matched employees left
// Absent). Those raw logs are now marked processed:true, matched:true, so NEITHER
// a normal sync (processed:false only) NOR rematch (matched:false only) will
// reprocess them — the bad attendance is frozen. This script resets ALL biometric
// raw logs to unprocessed and deletes the biometric-sourced AttendanceLog rows,
// so the next "Process" run rebuilds attendance cleanly with the fixed pipeline.
//
// The raw logs themselves are CORRECT (verified: rawJson.PunchDate parses to the
// right IST instant), so nothing is lost — attendance is fully re-derivable.
// Manual attendance rows (source != 'biometric') are left untouched.
//
//   SUPERADMIN_DATABASE_URL="postgres://..." node scripts/reprocess-biometric-attendance.mjs
//   DRY_RUN=1 to preview counts only.
//   FROM=2026-07-01 to limit the reset/delete to logs on/after a date.
import pg from 'pg';

const DRY = process.env.DRY_RUN === '1';
const FROM = process.env.FROM || null; // YYYY-MM-DD, optional lower bound
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

    const rawWhere = FROM ? `WHERE "punchDate" >= '${FROM}'::date` : '';
    const attWhere = `WHERE source = 'biometric'` + (FROM ? ` AND "logDate" >= '${FROM}'::date` : '');

    const rawCount = (await c.query(`SELECT COUNT(*) n FROM "BiometricRawLog" ${rawWhere}`)).rows[0].n;
    const attCount = (await c.query(`SELECT COUNT(*) n FROM "AttendanceLog" ${attWhere}`)).rows[0].n;

    if (DRY) {
      console.log(`[dry] ${mask(url)} — would reset ${rawCount} raw log(s), delete ${attCount} biometric AttendanceLog row(s)`);
      await c.end();
      continue;
    }

    // 1. Delete biometric-sourced attendance so it can be rebuilt cleanly.
    const del = await c.query(`DELETE FROM "AttendanceLog" ${attWhere}`);
    // 2. Reset raw logs to unprocessed so the next Process run reprocesses them.
    const reset = await c.query(
      `UPDATE "BiometricRawLog" SET processed = false, matched = false, "skipReason" = NULL, "processedAt" = NULL ${rawWhere}`
    );
    console.log(`✓ ${mask(url)} — deleted ${del.rowCount} biometric attendance row(s), reset ${reset.rowCount} raw log(s)`);
    await c.end();
  } catch (e) {
    console.log(`✗ ${mask(url)}: ${e.message}`);
    try { await c.end(); } catch {}
  }
}
console.log('\nDone. Now trigger biometric processing for each site (normal "Process"/"Sync" — the logs are unprocessed again).');
