-- ============================================================================
-- Migration: Add dearnessAllowance to PayrollItem
-- Date: 2026-06-17
-- Apply to both erp and erp_demo.
-- Idempotent & non-destructive.
--
-- Adds the dearnessAllowance column used by the compliance salary pipeline
-- to preserve DA values through import/export without folding into HRA.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'PayrollItem' AND column_name = 'dearnessAllowance'
  ) THEN
    ALTER TABLE "PayrollItem"
    ADD COLUMN "dearnessAllowance" DECIMAL(15,2) NOT NULL DEFAULT 0;
  END IF;
END $$;
