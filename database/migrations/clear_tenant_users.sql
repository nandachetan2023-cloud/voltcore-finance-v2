-- ============================================================================
-- Clear tenant user accounts from the superadmin database for a specific
-- tenant (slug = 'ua'). Keeps superadmin-created accounts (admin, etc.).
--
-- ⚠️  DESTRUCTIVE: deletes all tenant-created user accounts for "ua".
-- ============================================================================

BEGIN;

DELETE FROM "TenantUser"
WHERE "tenantId" = (SELECT id FROM "Tenant" WHERE slug = 'ua')
  AND "createdBySuperadmin" = false;

COMMIT;
