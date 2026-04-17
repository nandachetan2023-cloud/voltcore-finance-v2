#!/usr/bin/env tsx
/**
 * Cleanup Script for Soft-Deleted Records
 * 
 * This script permanently deletes records that have been soft-deleted
 * for more than the specified retention period.
 * 
 * Usage:
 *   npm run cleanup:deleted
 *   tsx scripts/cleanup-deleted-records.ts
 * 
 * Configuration:
 *   - RETENTION_DAYS: Number of days to keep soft-deleted records (default: 90)
 *   - DRY_RUN: Set to true to preview without deleting (default: false)
 */

import { db } from '../src/lib/db';

// Configuration
const RETENTION_DAYS = 90; // Keep deleted records for 90 days
const DRY_RUN = false; // Set to true to preview without actually deleting

interface CleanupResult {
  model: string;
  count: number;
  error?: string;
}

async function cleanupDeletedRecords() {
  console.log('='.repeat(60));
  console.log('Soft-Deleted Records Cleanup Script');
  console.log('='.repeat(60));
  console.log(`Retention Period: ${RETENTION_DAYS} days`);
  console.log(`Dry Run: ${DRY_RUN ? 'YES (no actual deletion)' : 'NO (will delete)'}`);
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
  console.log(`\nDeleting records soft-deleted before: ${cutoffDate.toISOString()}\n`);

  const results: CleanupResult[] = [];

  // Cleanup Leave Policies
  try {
    if (DRY_RUN) {
      const count = await db.leavePolicy.count({
        where: {
          isActive: false,
          updatedAt: { lt: cutoffDate }
        }
      });
      results.push({ model: 'LeavePolicy', count });
      console.log(`[DRY RUN] Would delete ${count} Leave Policies`);
    } else {
      const result = await db.leavePolicy.deleteMany({
        where: {
          isActive: false,
          updatedAt: { lt: cutoffDate }
        }
      });
      results.push({ model: 'LeavePolicy', count: result.count });
      console.log(`✓ Deleted ${result.count} Leave Policies`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    results.push({ model: 'LeavePolicy', count: 0, error: errorMsg });
    console.error(`✗ Error deleting Leave Policies: ${errorMsg}`);
  }

  // Cleanup Attendance Rules
  try {
    if (DRY_RUN) {
      const count = await db.attendanceRule.count({
        where: {
          isActive: false,
          updatedAt: { lt: cutoffDate }
        }
      });
      results.push({ model: 'AttendanceRule', count });
      console.log(`[DRY RUN] Would delete ${count} Attendance Rules`);
    } else {
      const result = await db.attendanceRule.deleteMany({
        where: {
          isActive: false,
          updatedAt: { lt: cutoffDate }
        }
      });
      results.push({ model: 'AttendanceRule', count: result.count });
      console.log(`✓ Deleted ${result.count} Attendance Rules`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    results.push({ model: 'AttendanceRule', count: 0, error: errorMsg });
    console.error(`✗ Error deleting Attendance Rules: ${errorMsg}`);
  }

  // Cleanup Holidays
  try {
    if (DRY_RUN) {
      const count = await db.holiday.count({
        where: {
          isActive: false,
          updatedAt: { lt: cutoffDate }
        }
      });
      results.push({ model: 'Holiday', count });
      console.log(`[DRY RUN] Would delete ${count} Holidays`);
    } else {
      const result = await db.holiday.deleteMany({
        where: {
          isActive: false,
          updatedAt: { lt: cutoffDate }
        }
      });
      results.push({ model: 'Holiday', count: result.count });
      console.log(`✓ Deleted ${result.count} Holidays`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    results.push({ model: 'Holiday', count: 0, error: errorMsg });
    console.error(`✗ Error deleting Holidays: ${errorMsg}`);
  }

  // Cleanup Departments
  try {
    if (DRY_RUN) {
      const count = await db.department.count({
        where: {
          isDeleted: true,
          updatedAt: { lt: cutoffDate }
        }
      });
      results.push({ model: 'Department', count });
      console.log(`[DRY RUN] Would delete ${count} Departments`);
    } else {
      const result = await db.department.deleteMany({
        where: {
          isDeleted: true,
          updatedAt: { lt: cutoffDate }
        }
      });
      results.push({ model: 'Department', count: result.count });
      console.log(`✓ Deleted ${result.count} Departments`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    results.push({ model: 'Department', count: 0, error: errorMsg });
    console.error(`✗ Error deleting Departments: ${errorMsg}`);
  }

  // Cleanup Designations
  try {
    if (DRY_RUN) {
      const count = await db.designation.count({
        where: {
          isDeleted: true,
          updatedAt: { lt: cutoffDate }
        }
      });
      results.push({ model: 'Designation', count });
      console.log(`[DRY RUN] Would delete ${count} Designations`);
    } else {
      const result = await db.designation.deleteMany({
        where: {
          isDeleted: true,
          updatedAt: { lt: cutoffDate }
        }
      });
      results.push({ model: 'Designation', count: result.count });
      console.log(`✓ Deleted ${result.count} Designations`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    results.push({ model: 'Designation', count: 0, error: errorMsg });
    console.error(`✗ Error deleting Designations: ${errorMsg}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Cleanup Summary');
  console.log('='.repeat(60));
  
  const totalDeleted = results.reduce((sum, r) => sum + r.count, 0);
  const errors = results.filter(r => r.error);
  
  results.forEach(result => {
    const status = result.error ? '✗ ERROR' : '✓';
    console.log(`${status} ${result.model}: ${result.count} records${result.error ? ` (${result.error})` : ''}`);
  });
  
  console.log('='.repeat(60));
  console.log(`Total Records ${DRY_RUN ? 'Would Be ' : ''}Deleted: ${totalDeleted}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Completed at: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  // Exit with error code if there were errors
  if (errors.length > 0) {
    process.exit(1);
  }
}

// Run the cleanup
cleanupDeletedRecords()
  .then(() => {
    console.log('\n✓ Cleanup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Cleanup failed:', error);
    process.exit(1);
  });
