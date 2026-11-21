ALTER TABLE "FinStoreIssueLine"
ADD COLUMN "fifoAllocations" JSONB;

ALTER TABLE "FinMaterialReturnLine"
ADD COLUMN "fifoAllocations" JSONB;
