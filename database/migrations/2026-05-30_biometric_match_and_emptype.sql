-- ============================================================================
-- Migration: Biometric match tracking + optional employment type
-- Date: 2026-05-30
-- Apply to BOTH databases on the server: erp AND erp_demo
-- Idempotent & non-destructive (safe to run more than once). Does NOT drop data.
-- ============================================================================

-- 1. BiometricRawLog: track matched vs unmatched + skip reason
ALTER TABLE "BiometricRawLog" ADD COLUMN IF NOT EXISTS "matched" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BiometricRawLog" ADD COLUMN IF NOT EXISTS "skipReason" TEXT;

-- 2. Employee.employmentType: make optional (nullable)
ALTER TABLE "Employee" ALTER COLUMN "employmentType" DROP NOT NULL;
