-- Tenant-wide module cap set by the superadmin.
-- "all" (default) = no cap; otherwise comma-separated module/group keys.
-- Effective access for any tenant user = intersection(role/user access, this cap).
-- Idempotent: safe to run multiple times.

ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "enabledModules" TEXT NOT NULL DEFAULT 'all';
