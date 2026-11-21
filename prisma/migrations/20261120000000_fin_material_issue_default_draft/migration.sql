-- Material issues must be explicitly posted: a new row no longer defaults to
-- 'Posted', which previously reduced stock and P&L on creation.
ALTER TABLE "FinMaterialIssue" ALTER COLUMN "status" SET DEFAULT 'Draft';
