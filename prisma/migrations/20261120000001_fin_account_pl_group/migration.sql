-- Add mapped P&L reporting group to the new Chart of Accounts (FinAccount).
-- Values are set through the approved finance-master mapping screen, not inferred.
-- Balance-sheet accounts remain excluded from P&L.

ALTER TABLE "FinAccount" ADD COLUMN     "plGroup" TEXT,
  ADD COLUMN     "plSubGroup" TEXT;
