CREATE TABLE "FinTaxCode" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hsnSac" TEXT,
    "cgstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cessRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inputAccountCode" TEXT,
    "outputAccountCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "createdBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinTaxCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinTaxCode_code_key" ON "FinTaxCode"("code");
CREATE INDEX "FinTaxCode_status_idx" ON "FinTaxCode"("status");

ALTER TABLE "AccountsPayable"
    ADD COLUMN "taxCodeId" INTEGER,
    ADD COLUMN "cgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "sgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "igstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "cessAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "itcEligible" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "itcReviewedBy" TEXT,
    ADD COLUMN "itcReviewedAt" TIMESTAMP(3);

ALTER TABLE "AccountsPayable"
    ADD COLUMN "billDate" DATE,
    ADD COLUMN "createdBy" TEXT;

ALTER TABLE "AccountsReceivable"
    ADD COLUMN "taxCodeId" INTEGER,
    ADD COLUMN "cgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "sgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "igstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "cessAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "BankAccount" ADD COLUMN "finAccountId" INTEGER;
ALTER TABLE "FinInvoice" ADD COLUMN "taxCodeId" INTEGER;

ALTER TABLE "FinReceipt"
    ADD COLUMN "partyId" INTEGER,
    ADD COLUMN "bankAccountId" INTEGER,
    ADD COLUMN "status" TEXT NOT NULL DEFAULT 'Draft',
    ADD COLUMN "createdBy" TEXT,
    ADD COLUMN "postedBy" TEXT,
    ADD COLUMN "postedAt" TIMESTAMP(3);

CREATE TABLE "FinReceiptAllocation" (
    "id" SERIAL NOT NULL,
    "receiptId" INTEGER NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tdsAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinReceiptAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinReceiptAllocation_receiptId_invoiceId_key"
    ON "FinReceiptAllocation"("receiptId", "invoiceId");
CREATE INDEX "FinReceiptAllocation_invoiceId_idx"
    ON "FinReceiptAllocation"("invoiceId");

ALTER TABLE "FinExpenseClaim"
    ADD COLUMN "managerApprovedBy" TEXT,
    ADD COLUMN "managerApprovedAt" TIMESTAMP(3),
    ADD COLUMN "verifiedBy" TEXT,
    ADD COLUMN "verifiedAt" TIMESTAMP(3),
    ADD COLUMN "settledBy" TEXT,
    ADD COLUMN "settledAt" TIMESTAMP(3),
    ADD COLUMN "settlementRef" TEXT,
    ADD COLUMN "settlementType" TEXT,
    ADD COLUMN "bankAccountId" INTEGER;

ALTER TABLE "FinExpenseItem" ADD COLUMN "accountId" INTEGER;

ALTER TABLE "AccountsPayable"
    ADD CONSTRAINT "AccountsPayable_taxCodeId_fkey"
    FOREIGN KEY ("taxCodeId") REFERENCES "FinTaxCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BankAccount"
    ADD CONSTRAINT "BankAccount_finAccountId_fkey"
    FOREIGN KEY ("finAccountId") REFERENCES "FinAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinInvoice"
    ADD CONSTRAINT "FinInvoice_taxCodeId_fkey"
    FOREIGN KEY ("taxCodeId") REFERENCES "FinTaxCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AccountsReceivable"
    ADD CONSTRAINT "AccountsReceivable_taxCodeId_fkey"
    FOREIGN KEY ("taxCodeId") REFERENCES "FinTaxCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinReceipt"
    ADD CONSTRAINT "FinReceipt_partyId_fkey"
    FOREIGN KEY ("partyId") REFERENCES "FinParty"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "FinReceipt_bankAccountId_fkey"
    FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinReceiptAllocation"
    ADD CONSTRAINT "FinReceiptAllocation_receiptId_fkey"
    FOREIGN KEY ("receiptId") REFERENCES "FinReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "FinReceiptAllocation_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "FinInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinExpenseClaim"
    ADD CONSTRAINT "FinExpenseClaim_bankAccountId_fkey"
    FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinExpenseItem"
    ADD CONSTRAINT "FinExpenseItem_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "FinAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
