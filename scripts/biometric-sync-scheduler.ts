#!/usr/bin/env tsx
/**
 * Biometric Sync Scheduler (Internal)
 * 
 * Run this as a background service:
 * tsx scripts/biometric-sync-scheduler.ts
 * 
 * Or use PM2:
 * pm2 start scripts/biometric-sync-scheduler.ts --name biometric-sync
 */

import { createBiometricService } from '../src/lib/biometric'

const SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes

async function runSync() {
  console.log(`[${new Date().toISOString()}] Starting biometric sync...`)

  try {
    const biometricService = createBiometricService()
    const result = await biometricService.syncIncremental()

    console.log(`[${new Date().toISOString()}] Sync completed successfully`)
    console.log(`  - Fetched: ${result.fetched} records`)
    console.log(`  - Processed: ${result.processed} records`)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Sync failed:`, error)
  }
}

// Run immediately on start
runSync()

// Schedule recurring sync
setInterval(runSync, SYNC_INTERVAL)

console.log(`Biometric sync scheduler started. Running every ${SYNC_INTERVAL / 1000 / 60} minutes.`)
