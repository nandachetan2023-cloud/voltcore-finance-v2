-- Add site/branch scoping to OrgRole (superadmin DB — PostgreSQL).
--
-- Companion to the existing `departments` and `designations` columns. Empty
-- string means "universal" (no restriction on this axis), matching how the
-- other two scope columns already behave — so this is backwards compatible:
-- every existing role stays universal until an admin narrows it.
--
-- Enforced by src/lib/services/approval-scope.ts across every approval surface.

ALTER TABLE "OrgRole" ADD COLUMN IF NOT EXISTS "branches" VARCHAR(191) NOT NULL DEFAULT '';
