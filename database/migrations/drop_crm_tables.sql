-- ============================================================================
-- Migration: Remove CRM Module Tables
-- Date: 2026-04-28
-- Description: Drops Lead and LeadActivity tables (CRM module)
--              These tables have no dependencies and are safe to remove.
-- ============================================================================

-- Drop LeadActivity first (has foreign key to Lead)
DROP TABLE IF EXISTS "LeadActivity" CASCADE;

-- Drop Lead table
DROP TABLE IF EXISTS "Lead" CASCADE;

-- ============================================================================
-- Verification Queries (run after migration to confirm)
-- ============================================================================

-- Check if tables are dropped
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('Lead', 'LeadActivity');

-- Should return 0 rows if successful
