-- ============================================================================
-- Migration: Add employeeCode to TenantUser (superadmin DB)
-- Date: 2026-06-17
-- Apply to SUPERADMIN database, NOT the tenant DB.
-- Idempotent & non-destructive.
--
-- Adds the employeeCode field and composite unique index used by the
-- login-by-employeeCode flow, allowing TenantUser lookup via
-- Employee.employeeCode.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'TenantUser' AND column_name = 'employeeCode'
  ) THEN
    ALTER TABLE "TenantUser"
    ADD COLUMN "employeeCode" TEXT;
  END IF;
END $$;

-- Composite unique index: one employeeCode per tenant
CREATE UNIQUE INDEX IF NOT EXISTS "TenantUser_tenantId_employeeCode_key"
ON "TenantUser"("tenantId", "employeeCode");

-- Regular index for lookup by employeeCode alone
CREATE INDEX IF NOT EXISTS "TenantUser_employeeCode_idx"
ON "TenantUser"("employeeCode");
