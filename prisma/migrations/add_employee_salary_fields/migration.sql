-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "tokenNumber" TEXT,
ADD COLUMN "workmenSlNo" TEXT,
ADD COLUMN "monthlyGrossSalary" DECIMAL(15,2),
ADD COLUMN "natureOfDesignation" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_tokenNumber_key" ON "Employee"("tokenNumber");

-- Add comments for documentation
COMMENT ON COLUMN "Employee"."tokenNumber" IS 'Unique token number for the employee (different from employeeCode)';
COMMENT ON COLUMN "Employee"."workmenSlNo" IS 'Workmen serial number for salary sheet';
COMMENT ON COLUMN "Employee"."monthlyGrossSalary" IS 'Monthly gross salary for non-compliance salary sheet';
COMMENT ON COLUMN "Employee"."natureOfDesignation" IS 'Nature of designation (e.g., Skilled, Unskilled, Semi-skilled)';
