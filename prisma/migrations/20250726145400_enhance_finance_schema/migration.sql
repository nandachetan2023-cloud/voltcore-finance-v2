-- Enhance Finance schema with missing tagging and approval fields

-- FinJournalLine: add jobCode, projectManager, change costCenter to TEXT
ALTER TABLE "FinJournalLine" ADD COLUMN IF NOT EXISTS "jobCode" TEXT;
ALTER TABLE "FinJournalLine" ADD COLUMN IF NOT EXISTS "projectManager" TEXT;
ALTER TABLE "FinJournalLine" ALTER COLUMN "costCenter" TYPE TEXT USING "costCenter"::TEXT;

-- FinPettyCash: add billAttachmentPath
ALTER TABLE "FinPettyCash" ADD COLUMN IF NOT EXISTS "billAttachmentPath" TEXT;

-- FinApprovalLog: add FinJournalEntry relation
ALTER TABLE "FinApprovalLog" ADD COLUMN IF NOT EXISTS "finJournalEntryId" INTEGER;
ALTER TABLE "FinApprovalLog" ADD CONSTRAINT "FinApprovalLog_finJournalEntryId_fkey" FOREIGN KEY ("finJournalEntryId") REFERENCES "FinJournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "FinJournalLine_jobCode_idx" ON "FinJournalLine"("jobCode");
CREATE INDEX IF NOT EXISTS "FinJournalLine_projectManager_idx" ON "FinJournalLine"("projectManager");
