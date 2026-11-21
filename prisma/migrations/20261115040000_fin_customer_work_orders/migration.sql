CREATE TABLE "FinWorkOrder" (
    "id" SERIAL NOT NULL,
    "workOrderNo" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "siteId" INTEGER NOT NULL,
    "jobCode" TEXT,
    "costCenter" TEXT,
    "department" TEXT,
    "projectManager" TEXT,
    "date" DATE NOT NULL,
    "descriptionOfWork" TEXT,
    "orderInitiationDate" DATE,
    "orderCompletionDate" DATE,
    "bgAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bgSource" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unexecutedWorkAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountBookedLastFY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountBookedCurrentFY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountToBeBookedByEndFY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "billRaisedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountReceivedOutOfBill" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "workDoneNotBilled" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "delayExtensionLetter" TEXT,
    "reasonOfDelay" TEXT,
    "subcontractedTo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinWorkOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinWorkOrder_workOrderNo_key" ON "FinWorkOrder"("workOrderNo");
CREATE INDEX "FinWorkOrder_customerId_idx" ON "FinWorkOrder"("customerId");
CREATE INDEX "FinWorkOrder_siteId_idx" ON "FinWorkOrder"("siteId");
CREATE INDEX "FinWorkOrder_jobCode_idx" ON "FinWorkOrder"("jobCode");

ALTER TABLE "FinWorkOrder"
    ADD CONSTRAINT "FinWorkOrder_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "FinParty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinWorkOrder"
    ADD CONSTRAINT "FinWorkOrder_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "FinSite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinInvoice" ADD COLUMN "workOrderId" INTEGER;
CREATE INDEX "FinInvoice_workOrderId_idx" ON "FinInvoice"("workOrderId");
ALTER TABLE "FinInvoice"
    ADD CONSTRAINT "FinInvoice_workOrderId_fkey"
    FOREIGN KEY ("workOrderId") REFERENCES "FinWorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AccountsReceivable"
    ADD COLUMN "workOrderNo" TEXT,
    ADD COLUMN "workOrderId" INTEGER;
CREATE INDEX "AccountsReceivable_workOrderId_idx" ON "AccountsReceivable"("workOrderId");
ALTER TABLE "AccountsReceivable"
    ADD CONSTRAINT "AccountsReceivable_workOrderId_fkey"
    FOREIGN KEY ("workOrderId") REFERENCES "FinWorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
