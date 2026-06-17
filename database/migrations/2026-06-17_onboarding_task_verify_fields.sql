-- ============================================================================
-- Migration: Add employeeVerifiedAt & employeeRemark to OnboardingTask
-- Date: 2026-06-17
-- Apply to main tenant DB (erp).
-- Idempotent & non-destructive.
--
-- Adds the employeeVerifiedAt and employeeRemark fields used by the
-- employee document verify/confirm + remark flow with admin visibility.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'OnboardingTask' AND column_name = 'employeeVerifiedAt'
  ) THEN
    ALTER TABLE "OnboardingTask"
    ADD COLUMN "employeeVerifiedAt" TIMESTAMP(3);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'OnboardingTask' AND column_name = 'employeeRemark'
  ) THEN
    ALTER TABLE "OnboardingTask"
    ADD COLUMN "employeeRemark" TEXT;
  END IF;
END $$;
