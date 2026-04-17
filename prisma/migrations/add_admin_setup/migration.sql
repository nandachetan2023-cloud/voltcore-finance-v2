-- Add Administrative Setup Tables

-- Holiday Calendar
CREATE TABLE "Holiday" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'public',
    "description" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "applicableTo" TEXT NOT NULL DEFAULT 'all',
    "branchId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- Leave Policy
CREATE TABLE "LeavePolicy" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "annualQuota" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "carryForward" BOOLEAN NOT NULL DEFAULT false,
    "maxCarryForward" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "encashable" BOOLEAN NOT NULL DEFAULT false,
    "maxEncashment" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "minDaysNotice" INTEGER NOT NULL DEFAULT 0,
    "maxConsecutiveDays" INTEGER NOT NULL DEFAULT 0,
    "applicableAfterMonths" INTEGER NOT NULL DEFAULT 0,
    "applicableGender" TEXT NOT NULL DEFAULT 'all',
    "requiresDocument" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeavePolicy_pkey" PRIMARY KEY ("id")
);

-- Attendance Rules
CREATE TABLE "AttendanceRule" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "gracePeriodMinutes" INTEGER NOT NULL DEFAULT 0,
    "lateMarkAfterMinutes" INTEGER NOT NULL DEFAULT 0,
    "halfDayAfterMinutes" INTEGER NOT NULL DEFAULT 0,
    "absentAfterMinutes" INTEGER NOT NULL DEFAULT 0,
    "fineAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "fineType" TEXT NOT NULL DEFAULT 'fixed',
    "finePerMinute" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxFinePerDay" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "applyToShiftId" INTEGER,
    "applyToDepartmentId" INTEGER,
    "applyToBranchId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRule_pkey" PRIMARY KEY ("id")
);

-- Grade/Salary Band
CREATE TABLE "Grade" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "minSalary" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "maxSalary" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "benefits" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX "Holiday_date_idx" ON "Holiday"("date");
CREATE INDEX "Holiday_branchId_idx" ON "Holiday"("branchId");
CREATE UNIQUE INDEX "LeavePolicy_code_key" ON "LeavePolicy"("code");
CREATE INDEX "LeavePolicy_leaveType_idx" ON "LeavePolicy"("leaveType");
CREATE UNIQUE INDEX "Grade_code_key" ON "Grade"("code");
CREATE INDEX "Grade_level_idx" ON "Grade"("level");

-- Add foreign keys
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AttendanceRule" ADD CONSTRAINT "AttendanceRule_applyToShiftId_fkey" FOREIGN KEY ("applyToShiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AttendanceRule" ADD CONSTRAINT "AttendanceRule_applyToDepartmentId_fkey" FOREIGN KEY ("applyToDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AttendanceRule" ADD CONSTRAINT "AttendanceRule_applyToBranchId_fkey" FOREIGN KEY ("applyToBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add gradeId to Employee table
ALTER TABLE "Employee" ADD COLUMN "gradeId" INTEGER;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
