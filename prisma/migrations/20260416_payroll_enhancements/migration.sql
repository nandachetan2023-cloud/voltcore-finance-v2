-- Add missing fields to PayrollItem table
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "workingDays" INTEGER DEFAULT 26;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "presentDays" INTEGER DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "paidLeaveDays" INTEGER DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "lopDays" INTEGER DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "otHours" DECIMAL(5,2) DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "basicSalary" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "hra" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "conveyanceAllowance" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "medicalAllowance" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "specialAllowance" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "otAmount" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "pfDeduction" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "esiDeduction" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "ptDeduction" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "tdsDeduction" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "lopDeduction" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "otherDeductions" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "payslipGenerated" BOOLEAN DEFAULT false;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "payslipPath" TEXT;
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "remarks" TEXT;

-- Add missing fields to PayrollRun table
ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "totalEmployees" INTEGER DEFAULT 0;
ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "totalGross" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "totalNet" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP;

-- Add missing fields to Employee table for payroll
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "bankAccount" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "bankIfsc" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "fatherName" TEXT;

-- Create index for faster payroll queries
CREATE INDEX IF NOT EXISTS "idx_payroll_item_employee_month" ON "PayrollItem"("employeeId", "payrollRunId");
CREATE INDEX IF NOT EXISTS "idx_payroll_run_month_year" ON "PayrollRun"("month", "year", "status");
CREATE INDEX IF NOT EXISTS "idx_attendance_log_employee_date" ON "AttendanceLog"("employeeId", "logDate");
