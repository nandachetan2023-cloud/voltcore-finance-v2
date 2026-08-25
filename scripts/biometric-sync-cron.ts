#!/usr/bin/env tsx
//
// Biometric Sync Cron Job
//
// This script should be run every 5 minutes via cron:
//   */5 * * * * cd /path/to/project && tsx scripts/biometric-sync-cron.ts
//
// Or use Node-cron for internal scheduling
//

import { createBiometricService } from '../src/lib/biometric'

async function runSync() {
  console.log(`[${new Date().toISOString()}] Starting biometric sync...`)

  try {
    const biometricService = createBiometricService()
    const result = await biometricService.syncIncremental()

    console.log(`[${new Date().toISOString()}] Sync completed successfully`)
    console.log(`  - Fetched: ${result.fetched} records`)
    console.log(`  - Processed: ${result.processed} records`)

    process.exit(0)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Sync failed:`, error)
    process.exit(1)
  }
}

runSync()
