/*
  Warnings:

  - You are about to drop the `BiometricDevice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Certification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Interview` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JobApplication` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JobPosting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LeaveRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OvertimeRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Timesheet` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TimesheetEntry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Training` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TrainingParticipant` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Certification" DROP CONSTRAINT "Certification_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "Interview" DROP CONSTRAINT "Interview_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "JobApplication" DROP CONSTRAINT "JobApplication_jobPostingId_fkey";

-- DropForeignKey
ALTER TABLE "JobPosting" DROP CONSTRAINT "JobPosting_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "OvertimeRequest" DROP CONSTRAINT "OvertimeRequest_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "Timesheet" DROP CONSTRAINT "Timesheet_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "TimesheetEntry" DROP CONSTRAINT "TimesheetEntry_timesheetId_fkey";

-- DropForeignKey
ALTER TABLE "TrainingParticipant" DROP CONSTRAINT "TrainingParticipant_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "TrainingParticipant" DROP CONSTRAINT "TrainingParticipant_trainingId_fkey";

-- DropTable
DROP TABLE "BiometricDevice";

-- DropTable
DROP TABLE "Certification";

-- DropTable
DROP TABLE "Interview";

-- DropTable
DROP TABLE "JobApplication";

-- DropTable
DROP TABLE "JobPosting";

-- DropTable
DROP TABLE "LeaveRequest";

-- DropTable
DROP TABLE "OvertimeRequest";

-- DropTable
DROP TABLE "Timesheet";

-- DropTable
DROP TABLE "TimesheetEntry";

-- DropTable
DROP TABLE "Training";

-- DropTable
DROP TABLE "TrainingParticipant";

-- CreateTable
CREATE TABLE "BiometricRawLog" (
    "id" SERIAL NOT NULL,
    "empCode" TEXT NOT NULL,
    "name" TEXT,
    "punchDate" TIMESTAMP(3) NOT NULL,
    "deviceId" TEXT,
    "mFlag" TEXT,
    "rawJson" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricRawLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricSyncLog" (
    "id" SERIAL NOT NULL,
    "lastRecord" TEXT NOT NULL,
    "syncType" TEXT NOT NULL DEFAULT 'incremental',
    "recordsFetched" INTEGER NOT NULL DEFAULT 0,
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BiometricRawLog_empCode_punchDate_idx" ON "BiometricRawLog"("empCode", "punchDate");

-- CreateIndex
CREATE INDEX "BiometricRawLog_processed_idx" ON "BiometricRawLog"("processed");
