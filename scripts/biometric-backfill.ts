#!/usr/bin/env tsx
// One-off biometric BACKFILL.
//
// Forces a fresh fetch starting from a given month/year (default September of
// last year) WITHOUT touching the sync-log cursors — it re-walks month-by-month
// up to now. saveRawLogs de-duplicates, so already-synced months create no
// duplicate raw logs or attendance rows. After fetching it also processes the
// raw logs into attendance (same as the app's sync button).
//
// Usage (from the project root):
//   tsx scripts/biometric-backfill.ts
//   BACKFILL_MONTH=9 BACKFILL_YEAR=2025 tsx scripts/biometric-backfill.ts
//   TENANT=upasana tsx scripts/biometric-backfill.ts     # limit to one tenant (id or slug)
//
// Safe to re-run. Does NOT delete anything.
import { superadminDb } from '../src/lib/superadmin-db'
import { getClientForUrl } from '../src/lib/db'
import { loadBiometricSitesFromDb, BiometricService } from '../src/lib/biometric'

const START_MONTH = parseInt(process.env.BACKFILL_MONTH || '9') // September
const START_YEAR = parseInt(process.env.BACKFILL_YEAR || String(new Date().getFullYear() - 1)) // last year
const ONLY = process.env.TENANT || '' // optional tenant id or slug

async function main() {
  console.log(`[backfill] Start anchor: ${String(START_MONTH).padStart(2, '0')}/${START_YEAR}`)

  const tenants = await superadminDb.tenant.findMany({ where: { status: 'active' } })
  const targets = ONLY
    ? tenants.filter((t) => t.id === ONLY || t.slug === ONLY)
    : tenants

  if (targets.length === 0) {
    console.error(ONLY ? `No active tenant matched "${ONLY}".` : 'No active tenants found.')
    process.exit(1)
  }

  for (const tenant of targets) {
    if (!tenant.dbUrl) {
      console.log(`- ${tenant.slug}: no dbUrl, skipping`)
      continue
    }

    const db = getClientForUrl(tenant.dbUrl)
    const sites = await loadBiometricSitesFromDb(db, tenant.id)
    if (sites.length === 0) {
      console.log(`- ${tenant.slug}: no biometric sites configured, skipping`)
      continue
    }

    for (const site of sites) {
      try {
        const service = new BiometricService(site.config, db)
        const sync = await service.syncIncremental({ startMonth: START_MONTH, startYear: START_YEAR })
        const proc = await service.processRawLogs()
        console.log(
          `✓ ${tenant.slug} / ${site.name}: fetched ${sync.fetched} raw logs, processed ${proc.processedCount}` +
            (proc.skippedRecords.length ? `, skipped ${proc.skippedRecords.length}` : '')
        )
      } catch (e) {
        console.error(`✗ ${tenant.slug} / ${site.name}:`, e instanceof Error ? e.message : e)
      }
    }
  }

  console.log('[backfill] Done.')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[backfill] Fatal:', e)
    process.exit(1)
  })
