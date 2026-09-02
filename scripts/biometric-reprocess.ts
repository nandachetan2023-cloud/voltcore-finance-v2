#!/usr/bin/env tsx
// One-off biometric RE-PROCESS / backfill for existing raw logs.
//
// Why: the punch-pairing fix (IST timezone + cross-midnight stitching) only
// affects NEW syncs. Attendance rows already built from raw logs may have a
// missing punch-out (night shifts) or a shifted day/time. This rebuilds
// attendance from the raw logs that are STILL STORED in BiometricRawLog — so
// nothing is lost; the raw punches are the source of truth and are never
// deleted.
//
// What it does (per tenant, per biometric site), scoped to an optional date
// window:
//   1) Dumps a JSON backup of every biometric-source AttendanceLog in scope to
//      a timestamped file (so the previous state is recoverable).
//   2) Deletes ONLY biometric-source AttendanceLog rows in the window
//      (source = 'biometric'). MANUAL rows (source = 'manual') are never
//      touched. Deletion is required because the cross-midnight fix moves a
//      punch to a different day, so stale rows must be cleared before rebuild.
//   3) Resets the matching BiometricRawLog rows to processed=false.
//   4) Re-runs processRawLogs() which rebuilds attendance with correct pairing.
//
// Runs in DRY-RUN by default (reports counts, changes nothing). Add --apply to
// perform the changes.
//
// Usage (from project root):
//   tsx scripts/biometric-reprocess.ts                       # dry-run, all tenants
//   tsx scripts/biometric-reprocess.ts --apply               # perform it
//   FROM=2026-05-01 TO=2026-05-31 tsx scripts/biometric-reprocess.ts --apply
//   TENANT=upasana tsx scripts/biometric-reprocess.ts --apply
//   SITE=<siteId> tsx scripts/biometric-reprocess.ts --apply
import fs from 'fs'
import path from 'path'
import { superadminDb } from '../src/lib/superadmin-db'
import { getClientForUrl } from '../src/lib/db'
import { loadBiometricSitesFromDb, BiometricService } from '../src/lib/biometric'

const APPLY = process.argv.includes('--apply')
const ONLY_TENANT = process.env.TENANT || ''
const ONLY_SITE = process.env.SITE || ''
// Optional inclusive date window (YYYY-MM-DD). When omitted, all dates.
const FROM = process.env.FROM || ''
const TO = process.env.TO || ''

// Build a logDate range filter. logDate is stored as UTC midnight of the day.
function dateWindow() {
  const where: any = {}
  if (FROM) where.gte = new Date(`${FROM}T00:00:00.000Z`)
  if (TO) {
    const end = new Date(`${TO}T00:00:00.000Z`)
    end.setUTCDate(end.getUTCDate() + 1) // make TO inclusive
    where.lt = end
  }
  return Object.keys(where).length ? where : null
}

function punchWindow() {
  const where: any = {}
  if (FROM) where.gte = new Date(`${FROM}T00:00:00.000+05:30`)
  if (TO) {
    const end = new Date(`${TO}T00:00:00.000+05:30`)
    end.setUTCDate(end.getUTCDate() + 1)
    where.lt = end
  }
  return Object.keys(where).length ? where : null
}

async function main() {
  console.log(`[reprocess] mode=${APPLY ? 'APPLY' : 'DRY-RUN'}` +
    `${FROM || TO ? ` window=${FROM || '…'}..${TO || '…'}` : ' window=ALL'}` +
    `${ONLY_TENANT ? ` tenant=${ONLY_TENANT}` : ''}${ONLY_SITE ? ` site=${ONLY_SITE}` : ''}`)

  const backupDir = path.join(process.cwd(), 'backups')
  if (APPLY && !fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })

  const tenants = await superadminDb.tenant.findMany({ where: { status: 'active' } })
  const targets = ONLY_TENANT
    ? tenants.filter((t) => t.id === ONLY_TENANT || t.slug === ONLY_TENANT)
    : tenants

  if (targets.length === 0) {
    console.error(ONLY_TENANT ? `No active tenant matched "${ONLY_TENANT}".` : 'No active tenants found.')
    process.exit(1)
  }

  const logDateFilter = dateWindow()
  const punchDateFilter = punchWindow()

  for (const tenant of targets) {
    if (!tenant.dbUrl) { console.log(`- ${tenant.slug}: no dbUrl, skipping`); continue }

    const db = getClientForUrl(tenant.dbUrl)
    let sites = await loadBiometricSitesFromDb(db, tenant.id)
    if (ONLY_SITE) sites = sites.filter((s) => s.config.siteId === ONLY_SITE)
    if (sites.length === 0) { console.log(`- ${tenant.slug}: no biometric sites, skipping`); continue }

    for (const site of sites) {
      const siteId = site.config.siteId
      const attWhere: any = { source: 'biometric' }
      if (logDateFilter) attWhere.logDate = logDateFilter
      // Scope attendance rows to this site's employees via biometric raw logs is
      // hard to join; instead we scope by source+date. All biometric sites for a
      // tenant share the employee pool, so a per-site restriction isn't needed —
      // re-processing every site rebuilds all of them.

      const rawWhere: any = { siteId }
      if (punchDateFilter) rawWhere.punchDate = punchDateFilter

      const attCount = await db.attendanceLog.count({ where: attWhere })
      const rawCount = await db.biometricRawLog.count({ where: rawWhere })
      const noOut = await db.attendanceLog.count({ where: { ...attWhere, punchIn: { not: null }, punchOut: null } })

      console.log(`\n• ${tenant.slug} / ${site.name} (siteId=${siteId})`)
      console.log(`    biometric attendance rows in scope: ${attCount} (of which missing punch-out: ${noOut})`)
      console.log(`    raw logs to re-process: ${rawCount}`)

      if (!APPLY) {
        console.log('    [dry-run] would back up + delete the biometric attendance rows above, reset raw logs, and rebuild.')
        continue
      }

      if (rawCount === 0) { console.log('    nothing to do (no raw logs).'); continue }

      // 1) Back up the biometric attendance rows we're about to rebuild.
      const rows = await db.attendanceLog.findMany({ where: attWhere })
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      const file = path.join(backupDir, `attendance-${tenant.slug}-${siteId}-${stamp}.json`)
      fs.writeFileSync(file, JSON.stringify(rows, null, 2))
      console.log(`    ✓ backed up ${rows.length} rows → ${path.relative(process.cwd(), file)}`)

      // 2) Delete only biometric-source attendance in scope (manual untouched).
      const del = await db.attendanceLog.deleteMany({ where: attWhere })
      console.log(`    ✓ cleared ${del.count} biometric attendance rows`)

      // 3) Reset the raw logs so processRawLogs picks them up again.
      const reset = await db.biometricRawLog.updateMany({
        where: rawWhere,
        data: { processed: false, matched: false, skipReason: null, processedAt: null },
      })
      console.log(`    ✓ reset ${reset.count} raw logs to unprocessed`)

      // 4) Rebuild attendance from raw logs with the corrected pairing.
      const service = new BiometricService(site.config, db)
      const proc = await service.processRawLogs()
      console.log(`    ✓ rebuilt: processed ${proc.processedCount} raw logs` +
        (proc.skippedRecords.length ? `, skipped ${proc.skippedRecords.length}` : ''))

      const noOutAfter = await db.attendanceLog.count({ where: { ...attWhere, punchIn: { not: null }, punchOut: null } })
      console.log(`    → missing punch-out now: ${noOutAfter} (was ${noOut})`)
    }
  }

  console.log(`\n[reprocess] Done.${APPLY ? '' : ' (dry-run — re-run with --apply to make changes)'}`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error('[reprocess] Fatal:', e); process.exit(1) })
