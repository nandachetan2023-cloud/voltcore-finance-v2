ALTER TABLE "FinMaterialReturn"
ADD COLUMN "returnType" TEXT NOT NULL DEFAULT 'Site',
ADD COLUMN "vendorName" TEXT,
ADD COLUMN "supplierDocNo" TEXT,
ADD COLUMN "authorizedBy" TEXT;

CREATE TABLE "FinStoreRoutineCheck" (
  "id" SERIAL NOT NULL,
  "siteId" INTEGER NOT NULL,
  "routineDate" DATE NOT NULL,
  "routineType" TEXT NOT NULL,
  "completedBy" TEXT NOT NULL,
  "checks" JSONB NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinStoreRoutineCheck_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinStoreRoutineCheck_siteId_routineDate_routineType_key"
ON "FinStoreRoutineCheck"("siteId", "routineDate", "routineType");

CREATE INDEX "FinStoreRoutineCheck_routineDate_idx"
ON "FinStoreRoutineCheck"("routineDate");

ALTER TABLE "FinStoreRoutineCheck"
ADD CONSTRAINT "FinStoreRoutineCheck_siteId_fkey"
FOREIGN KEY ("siteId") REFERENCES "FinSite"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
