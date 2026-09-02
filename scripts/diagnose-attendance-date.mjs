// Diagnoses WHY biometric-matched punches don't show in the attendance view.
// For a given employee code + date, it prints:
//   - the server's timezone / current time
//   - the raw biometric logs (matched flag, punchDate)
//   - every AttendanceLog for that employee near that date, with the EXACT
//     logDate value stored (UTC ISO) so we can see if it's on the day the view
//     queries for.
//
//   SUPERADMIN_DATABASE_URL="postgres://..." EMP=UA0063 DAY=2026-07-24 \
//     node scripts/diagnose-attendance-date.mjs
import pg from 'pg';

const EMP = process.env.EMP || 'UA0063';
const DAY = process.env.DAY || new Date().toISOString().slice(0, 10);
const stripQuery = (u) => u.split('?')[0];
const mask = (u) => stripQuery(u).replace(/:\/\/[^@]*@/, '://***@');

console.log('=== Server clock ===');
console.log('  process TZ    :', Intl.DateTimeFormat().resolvedOptions().timeZone, '| offsetMin:', new Date().getTimezoneOffset());
console.log('  now (local)   :', new Date().toString());
console.log('  now (UTC)     :', new Date().toISOString());
console.log(`  Looking for EMP=${EMP} DAY=${DAY}\n`);

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
    const emp = await c.query('SELECT id, "employeeCode", "firstName", "lastName" FROM "Employee" WHERE "employeeCode"=$1', [EMP]);
    if (emp.rowCount === 0) { await c.end(); continue; }
    const e = emp.rows[0];
    console.log(`--- ${mask(url)} : ${e.employeeCode} (${e.firstName} ${e.lastName}) id=${e.id} ---`);

    // AttendanceLog rows within ±2 days of the target
    const att = await c.query(`
      SELECT id, "logDate", "logDate"::text AS logdate_raw,
             ("logDate" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata' AS ist_view,
             "punchIn"::text AS punchin, "punchOut"::text AS punchout, status, source
      FROM "AttendanceLog"
      WHERE "employeeId"=$1
        AND "logDate" BETWEEN ($2::date - 2) AND ($2::date + 2)
      ORDER BY "logDate"`, [e.id, DAY]);
    console.log(`  AttendanceLog rows near ${DAY}: ${att.rowCount}`);
    att.rows.forEach(r => console.log(`    #${r.id} logDate(UTC)=${r.logdate_raw}  IST=${r.ist_view?.toISOString?.()||r.ist_view}  in=${r.punchin||'-'} status=${r.status} src=${r.source}`));

    // What the attendance view's day-query would match (server-local midnight semantics)
    const viewMatch = await c.query(`
      SELECT COUNT(*) AS n FROM "AttendanceLog"
      WHERE "employeeId"=$1
        AND "logDate" >= $2::timestamp AND "logDate" < ($2::timestamp + interval '1 day')`, [e.id, DAY]);
    console.log(`  → Rows the view query [${DAY} 00:00, +1d) would return: ${viewMatch.rows[0].n}`);
    await c.end();
  } catch (err) {
    console.log(`  ✗ ${mask(url)}: ${err.message}`);
    try { await c.end(); } catch {}
  }
}
console.log('\nDone.');

// --- Raw biometric log dump (run with RAW=1) ---
if (process.env.RAW === '1') {
  const sa2 = new pg.Client({ connectionString: stripQuery(saUrl) });
  await sa2.connect();
  const { rows: turls } = await sa2.query('SELECT DISTINCT "dbUrl" FROM "Tenant"');
  await sa2.end();
  const us = new Set(turls.map(r => r.dbUrl).filter(Boolean));
  if (process.env.DATABASE_URL) us.add(process.env.DATABASE_URL);
  const last4 = EMP.replace(/\D/g, '').slice(-4);
  for (const url of us) {
    const c = new pg.Client({ connectionString: stripQuery(url) });
    try {
      await c.connect();
      const raw = await c.query(`
        SELECT id, "empCode", "enrolledId", name, "punchDate"::text AS punchdate,
               ("rawJson"->>'PunchDate') AS raw_punchdate, processed, matched, "skipReason"
        FROM "BiometricRawLog"
        WHERE "enrolledId" LIKE $1 OR "empCode" LIKE $1
        ORDER BY "punchDate" DESC LIMIT 10`, [`%${last4}`]);
      if (raw.rowCount) {
        console.log(`\n[RAW ${mask(url)}] logs for *${last4}:`);
        raw.rows.forEach(r => console.log(`  #${r.id} enrolled=${r.enrolledId} rawPunchDate="${r.raw_punchdate}" stored(UTC)=${r.punchdate} proc=${r.processed} matched=${r.matched} skip=${r.skipReason||'-'}`));
      }
      await c.end();
    } catch (e) { console.log('  raw err', e.message); try{await c.end()}catch{} }
  }
}
