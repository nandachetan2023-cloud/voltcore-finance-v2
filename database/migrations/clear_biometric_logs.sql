-- ============================================================================
-- Clear fetched biometric data so it can be re-fetched from scratch.
-- ⚠️  DESTRUCTIVE: deletes all raw punch logs, sync cursor history, and
--     biometric-sourced attendance. Manual attendance entries are NOT touched.
--     Run per database (erp and/or erp_demo) as needed.
--     Resets the incremental cursor so the next sync starts from May 1st.
-- ============================================================================

BEGIN;

-- Attendance rows created from biometric punches (keeps manual entries)
DELETE FROM "AttendanceLog" WHERE "source" = 'biometric';

-- Raw punch logs
DELETE FROM "BiometricRawLog";

-- Sync history / incremental cursor (reset so next sync re-fetches from anchor)
DELETE FROM "BiometricSyncLog";

COMMIT;
