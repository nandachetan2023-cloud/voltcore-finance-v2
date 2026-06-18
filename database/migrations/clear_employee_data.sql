-- ============================================================================
-- Clear employee data, attendance, biometric logs, shift assignments, and
-- all employee-dependent records while keeping reference data (Shift,
-- Department, Designation, Branch, etc.) intact.
--
-- Also resets the biometric sync cursor (BiometricSyncLog) so the next sync
-- re-fetches from the anchor month defined by BIOMETRIC_BACKFILL_START_MONTH
-- and BIOMETRIC_BACKFILL_START_YEAR environment variables.
--
-- ⚠️  DESTRUCTIVE: deletes all employees and all related data.
--     Run per database (erp and/or erp_demo) as needed.
-- ============================================================================

BEGIN;

-- Biometric sync cursor — deleting this forces a fresh fetch from the anchor
DELETE FROM "BiometricSyncLog";

-- Raw punch data from biometric devices
DELETE FROM "BiometricRawLog";

-- Attendance records
DELETE FROM "AttendanceLog";

-- Employee-dependent records (order respects FK constraints)
DELETE FROM "ShiftAssignment";
DELETE FROM "SalaryStructureAssignment";
DELETE FROM "PayrollItem";
DELETE FROM "LeaveRequest";
DELETE FROM "Resignation";
DELETE FROM "TourRequest";
DELETE FROM "EmployeeRequest";
DELETE FROM "OnboardingChecklist";

-- Employees themselves
DELETE FROM "Employee";

COMMIT;
