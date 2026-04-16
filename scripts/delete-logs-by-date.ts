// Script to delete biometric logs for a specific date
// Usage: 
//   npx tsx scripts/delete-logs-by-date.ts                    (deletes today's logs)
//   npx tsx scripts/delete-logs-by-date.ts 2024-01-15         (deletes logs for specific date)
//   npx tsx scripts/delete-logs-by-date.ts 2024-01-15 --dry-run  (preview without deleting)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteLogsByDate(dateStr?: string, dryRun: boolean = false) {
  try {
    // Parse date argument or use today
    let targetDate: Date;
    if (dateStr) {
      targetDate = new Date(dateStr);
      if (isNaN(targetDate.getTime())) {
        throw new Error(`Invalid date format: ${dateStr}. Use YYYY-MM-DD format.`);
      }
    } else {
      targetDate = new Date();
    }

    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    console.log('🗑️  Biometric Logs Deletion Script\n');
    console.log(`📅 Target Date: ${startOfDay.toLocaleDateString()}`);
    console.log(`   Range: ${startOfDay.toLocaleString()} to ${endOfDay.toLocaleString()}\n`);

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No data will be deleted\n');
    }

    // Count logs by type
    const processedCount = await prisma.biometricRawLog.count({
      where: {
        punchDate: { gte: startOfDay, lte: endOfDay },
        processed: true
      }
    });

    const unprocessedCount = await prisma.biometricRawLog.count({
      where: {
        punchDate: { gte: startOfDay, lte: endOfDay },
        processed: false
      }
    });

    const attendanceCount = await prisma.attendanceLog.count({
      where: {
        logDate: { gte: startOfDay, lte: endOfDay }
      }
    });

    console.log(`📊 Logs found:`);
    console.log(`   Biometric (Processed):   ${processedCount}`);
    console.log(`   Biometric (Unprocessed): ${unprocessedCount}`);
    console.log(`   Attendance Logs:         ${attendanceCount}`);
    console.log(`   ─────────────────────────────────`);
    console.log(`   Total:                   ${processedCount + unprocessedCount + attendanceCount}\n`);

    if (processedCount + unprocessedCount + attendanceCount === 0) {
      console.log('✅ No logs found for this date. Nothing to delete.');
      return;
    }

    if (dryRun) {
      console.log('✅ Dry run completed. Run without --dry-run to actually delete.');
      return;
    }

    // Perform deletion
    console.log('🔄 Deleting logs...\n');

    const biometricResult = await prisma.biometricRawLog.deleteMany({
      where: {
        punchDate: { gte: startOfDay, lte: endOfDay }
      }
    });

    const attendanceResult = await prisma.attendanceLog.deleteMany({
      where: {
        logDate: { gte: startOfDay, lte: endOfDay }
      }
    });

    console.log(`✅ Deleted ${biometricResult.count} biometric log(s)`);
    console.log(`✅ Deleted ${attendanceResult.count} attendance log(s)\n`);
    console.log('🎉 Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dateArg = args.find(arg => !arg.startsWith('--'));
const dryRun = args.includes('--dry-run');

// Run the script
deleteLogsByDate(dateArg, dryRun)
  .then(() => {
    console.log('\n✨ Script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed.');
    process.exit(1);
  });
