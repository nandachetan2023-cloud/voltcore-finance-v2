-- Add indexes for faster queries

-- Employee indexes
CREATE INDEX IF NOT EXISTS "Employee_employeeCode_idx" ON "Employee"("employeeCode");
CREATE INDEX IF NOT EXISTS "Employee_email_idx" ON "Employee"("email");
CREATE INDEX IF NOT EXISTS "Employee_departmentId_idx" ON "Employee"("departmentId");
CREATE INDEX IF NOT EXISTS "Employee_designationId_idx" ON "Employee"("designationId");
CREATE INDEX IF NOT EXISTS "Employee_isActive_isDeleted_idx" ON "Employee"("isActive", "isDeleted");

-- AttendanceLog indexes
CREATE INDEX IF NOT EXISTS "AttendanceLog_employeeId_idx" ON "AttendanceLog"("employeeId");
CREATE INDEX IF NOT EXISTS "AttendanceLog_logDate_idx" ON "AttendanceLog"("logDate");
CREATE INDEX IF NOT EXISTS "AttendanceLog_employeeId_logDate_idx" ON "AttendanceLog"("employeeId", "logDate");
CREATE INDEX IF NOT EXISTS "AttendanceLog_source_idx" ON "AttendanceLog"("source");
CREATE INDEX IF NOT EXISTS "AttendanceLog_status_idx" ON "AttendanceLog"("status");

-- BiometricRawLog indexes
CREATE INDEX IF NOT EXISTS "BiometricRawLog_empCode_idx" ON "BiometricRawLog"("empCode");
CREATE INDEX IF NOT EXISTS "BiometricRawLog_processed_idx" ON "BiometricRawLog"("processed");
CREATE INDEX IF NOT EXISTS "BiometricRawLog_siteId_idx" ON "BiometricRawLog"("siteId");
CREATE INDEX IF NOT EXISTS "BiometricRawLog_punchDate_idx" ON "BiometricRawLog"("punchDate");
CREATE INDEX IF NOT EXISTS "BiometricRawLog_empCode_punchDate_idx" ON "BiometricRawLog"("empCode", "punchDate");

-- BiometricSyncLog indexes
CREATE INDEX IF NOT EXISTS "BiometricSyncLog_siteId_idx" ON "BiometricSyncLog"("siteId");
CREATE INDEX IF NOT EXISTS "BiometricSyncLog_status_idx" ON "BiometricSyncLog"("status");
CREATE INDEX IF NOT EXISTS "BiometricSyncLog_createdAt_idx" ON "BiometricSyncLog"("createdAt");
