// Script to delete all biometric logs from today
// Usage: npx tsx scripts/delete-today-logs.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteTodayLogs() {
  try {
    console.log('🗑️  Starting deletion of today\'s biometric logs...\n');

    // Get today's date range (start and end of day)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    console.log(`📅 Date Range:`);
    console.log(`   Start: ${startOfDay.toLocaleString()}`);
    console.log(`   End:   ${endOfDay.toLocaleString()}\n`);

    // Count logs before deletion
    const processedCount = await prisma.biometricRawLog.count({
      where: {
        punchDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        processed: true
      }
    });

    const unprocessedCount = await prisma.biometricRawLog.count({
      where: {
        punchDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        processed: false
      }
    });

    const totalCount = processedCount + unprocessedCount;

    console.log(`📊 Logs found for today:`);
    console.log(`   Processed:   ${processedCount}`);
    console.log(`   Unprocessed: ${unprocessedCount}`);
    console.log(`   Total:       ${totalCount}\n`);

    if (totalCount === 0) {
      console.log('✅ No logs found for today. Nothing to delete.');
      return;
    }

    // Delete all logs from today
    const deleteResult = await prisma.biometricRawLog.deleteMany({
      where: {
        punchDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    console.log(`✅ Successfully deleted ${deleteResult.count} log(s) from today!\n`);

    // Also delete related attendance logs if they exist
    const attendanceDeleteResult = await prisma.attendanceLog.deleteMany({
      where: {
        logDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    if (attendanceDeleteResult.count > 0) {
      console.log(`✅ Also deleted ${attendanceDeleteResult.count} attendance log(s) from today!\n`);
    }

    console.log('🎉 Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error deleting logs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
deleteTodayLogs()
  .then(() => {
    console.log('\n✨ Script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
