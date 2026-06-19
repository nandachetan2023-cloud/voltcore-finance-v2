// Reset attendance data for a fresh re-sync:
//   - Deletes ShiftAssignment (keeps Shift definitions)
//   - Deletes AttendanceLog
//   - Resets BiometricRawLog (processed=false, matched=false, etc.)
//   - Deletes BiometricSyncLog (resets cursor so sync re-fetches from anchor)
//   - Keeps Employee and Shift data intact
//
// Usage:
//   npx tsx scripts/reset-attendance-data.ts                (runs with confirmation prompt)
//   npx tsx scripts/reset-attendance-data.ts --dry-run       (preview only)
//   npx tsx scripts/reset-attendance-data.ts --force         (skip confirmation)
//   npx tsx scripts/reset-attendance-data.ts --dry-run --force  (preview even in non-interactive)

import { PrismaClient } from '@prisma/client';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

async function confirm(promptText: string): Promise<boolean> {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`${promptText} (y/N) `);
  rl.close();
  return answer.toLowerCase() === 'y';
}

async function run() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log(`
  Usage: npx tsx scripts/reset-attendance-data.ts [options]

  Reset all attendance data for a fresh biometric re-sync.
  - Keeps Employee records and Shift definitions intact.
  - Deletes ShiftAssignment, AttendanceLog, BiometricSyncLog.
  - Resets BiometricRawLog (sets processed=false, matched=false).

  Options:
    --dry-run   Show record counts without modifying anything
    --force     Skip confirmation prompt
    --help, -h  Show this help message

  Examples:
    npx tsx scripts/reset-attendance-data.ts
    npx tsx scripts/reset-attendance-data.ts --dry-run
    npx tsx scripts/reset-attendance-data.ts --force
`);
    return;
  }

  const prisma = new PrismaClient();

  try {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║     Attendance Data Reset Script                        ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');

    if (dryRun) {
      console.log('🔍 DRY RUN MODE — counts only, no data will be modified\n');
    }

    // ── Count ─────────────────────────────────────────────────────────
    console.log('📊 Counting records...\n');

    const shiftAssignmentCount = await prisma.shiftAssignment.count();
    const attendanceLogCount = await prisma.attendanceLog.count();
    const biometricRawLogCount = await prisma.biometricRawLog.count();
    const biometricSyncLogCount = await prisma.biometricSyncLog.count();

    const biometricProcessedCount = await prisma.biometricRawLog.count({ where: { processed: true } });
    const biometricUnprocessedCount = await prisma.biometricRawLog.count({ where: { processed: false } });
    const biometricMatchedCount = await prisma.biometricRawLog.count({ where: { matched: true } });

    console.log(`   ShiftAssignment       ${String(shiftAssignmentCount).padStart(6)}  (will be DELETED)`);
    console.log(`   AttendanceLog         ${String(attendanceLogCount).padStart(6)}  (will be DELETED)`);
    console.log(`   BiometricRawLog       ${String(biometricRawLogCount).padStart(6)}  (will be RESET — status cleared)`);
    console.log(`     ├─ Processed        ${String(biometricProcessedCount).padStart(6)}`);
    console.log(`     ├─ Unprocessed      ${String(biometricUnprocessedCount).padStart(6)}`);
    console.log(`     ├─ Matched          ${String(biometricMatchedCount).padStart(6)}`);
    console.log(`     └─ Unmatched        ${String(biometricProcessedCount - biometricMatchedCount).padStart(6)}`);
    console.log(`   BiometricSyncLog      ${String(biometricSyncLogCount).padStart(6)}  (will be DELETED — sync cursor reset)`);
    console.log('');

    const totalDeleted = shiftAssignmentCount + attendanceLogCount + biometricSyncLogCount;
    console.log(`   Total records to DELETE:      ${String(totalDeleted).padStart(5)}`);
    console.log(`   Total records to RESET:        ${String(biometricRawLogCount).padStart(5)}`);
    console.log('');
    console.log('   ✅ Employee records, Shift definitions, and all other data will be KEPT.\n');

    if (totalDeleted + biometricRawLogCount === 0) {
      console.log('✅ Nothing to reset. All attendance-related tables are already empty.');
      return;
    }

    if (dryRun) {
      console.log('🔍 Dry run complete. Run without --dry-run to execute.\n');
      return;
    }

    // ── Confirm ───────────────────────────────────────────────────────
    if (!force) {
      const ok = await confirm('\n⚠️  WARNING: This will permanently DELETE all shift assignments, attendance logs, and sync cursors, and RESET biometric logs. Are you sure?');
      if (!ok) {
        console.log('❌ Aborted. No changes were made.');
        return;
      }
    }

    // ── Execute (order respects FK constraints) ───────────────────────
    console.log('');
    console.log('🔄 Executing...\n');

    const deletedShiftAssignments = await prisma.shiftAssignment.deleteMany();
    console.log(`   ✅ Deleted ${String(deletedShiftAssignments.count).padStart(5)} ShiftAssignment record(s)`);

    const deletedAttendanceLogs = await prisma.attendanceLog.deleteMany();
    console.log(`   ✅ Deleted ${String(deletedAttendanceLogs.count).padStart(5)} AttendanceLog record(s)`);

    const resetBiometricRawLogs = await prisma.biometricRawLog.updateMany({
      data: {
        processed: false,
        matched: false,
        skipReason: null,
        processedAt: null,
      },
    });
    console.log(`   ✅ Reset ${String(resetBiometricRawLogs.count).padStart(5)} BiometricRawLog record(s) (processed=false, matched=false)`);

    const deletedSyncLogs = await prisma.biometricSyncLog.deleteMany();
    console.log(`   ✅ Deleted ${String(deletedSyncLogs.count).padStart(5)} BiometricSyncLog record(s) (sync cursor reset)`);

    console.log('\n🎉 Reset complete! The next biometric sync will re-fetch all data from the anchor month.');
    console.log('   Run "Sync" to re-fetch, then "Re-match Unmatched" to re-process.\n');

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

run()
  .then(() => {
    console.log('✨ Script finished.');
    process.exit(0);
  })
  .catch(() => {
    console.error('\n💥 Script failed.');
    process.exit(1);
  });
