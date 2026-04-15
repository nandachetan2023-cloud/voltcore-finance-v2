-- AlterTable
ALTER TABLE "BiometricRawLog" ADD COLUMN     "siteId" TEXT;

-- AlterTable
ALTER TABLE "BiometricSyncLog" ADD COLUMN     "siteId" TEXT;

-- CreateIndex
CREATE INDEX "BiometricRawLog_siteId_idx" ON "BiometricRawLog"("siteId");

-- CreateIndex
CREATE INDEX "BiometricSyncLog_siteId_idx" ON "BiometricSyncLog"("siteId");
