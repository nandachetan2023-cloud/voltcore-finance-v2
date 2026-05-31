-- ============================================================================
-- Migration: Tenant total-account cap
-- Date: 2026-05-31
-- Apply to the SUPERADMIN database (erp_superadmin) only.
-- Idempotent & non-destructive.
--
-- Adds Tenant.maxAccounts — the total number of accounts the tenant admin may
-- create across all roles (0 = unlimited). Replaces the old per-role OrgRole.maxUsers
-- enforcement (the maxUsers column is kept for backward-compat but no longer used).
-- ============================================================================

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "maxAccounts" INTEGER NOT NULL DEFAULT 0;
