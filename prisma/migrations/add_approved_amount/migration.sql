-- Add approvedAmount field to EmployeeRequest
-- This allows approvers to adjust the advance payment amount before approving

ALTER TABLE "EmployeeRequest" ADD COLUMN IF NOT EXISTS "approvedAmount" DECIMAL(15,2);

-- Add comment for documentation
COMMENT ON COLUMN "EmployeeRequest"."approvedAmount" IS 'Approver-adjusted amount. If set, this is the actual approved amount (may be less than requested amount). Used for payroll advance calculation.';
