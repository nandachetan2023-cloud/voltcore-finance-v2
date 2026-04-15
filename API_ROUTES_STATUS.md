# API Routes Fix Status

## Summary

The old_erp application had API routes written for an old schema. The current Prisma schema has different models and field structures. This document tracks the fix status.

## ✅ Fixed Routes (Match Current Schema)

### Core HR
- `/api/employees` - Fixed to use Employee model with correct fields (employeeCode, firstName, lastName, etc.)
- `/api/attendance` - Fixed to use AttendanceLog model
- `/api/payroll` - Fixed to use PayrollRun and PayrollItem models

### Inventory & Sales
- `/api/inventory` - Fixed to use Item and StockLedger models
- `/api/sales` - Fixed to use Customer and SalesOrder models

### Procurement
- `/api/purchases` - Uses PurchaseOrder model (needs field verification)
- `/api/invoices` - Uses Invoice model (needs field verification)

## ⚠️ Stub Routes (Models Don't Exist - Return Empty Data)

These routes return empty arrays with 501 status until models are added to schema:

- `/api/projects` - Project/Task/Milestone models don't exist
- `/api/equipment` - Equipment/Asset models don't exist
- `/api/incidents` - Incident model doesn't exist
- `/api/permits` - Permit model doesn't exist
- `/api/expenses` - Expense model doesn't exist
- `/api/subcontractors` - Subcontractor model doesn't exist
- `/api/support` - Support/Ticket models don't exist
- `/api/knowledgebase` - Knowledgebase model doesn't exist
- `/api/journal-entries` - JournalEntry model doesn't exist
- `/api/accounts-payable` - AccountsPayable model doesn't exist
- `/api/accounts-receivable` - AccountsReceivable model doesn't exist
- `/api/bank-cash` - BankAccount model doesn't exist
- `/api/taxation` - TaxConfig model doesn't exist
- `/api/budget` - Budget model doesn't exist
- `/api/ledger` - LedgerAccount model doesn't exist
- `/api/financial-reports` - Financial report models don't exist
- `/api/finance-dashboard` - Finance dashboard models don't exist
- `/api/shifts` - Shift model exists but route needs fixing
- `/api/sites` - Site model doesn't exist (use Branch instead)
- `/api/training` - Training/Certification models don't exist
- `/api/recruitment` - JobOpening model doesn't exist

## 🔧 Routes That Need Verification

These routes reference models that exist but may have incorrect field names:

- `/api/crm` - Uses Lead/LeadActivity models (needs verification)
- `/api/purchases` - Uses PurchaseOrder model (needs field verification)
- `/api/invoices` - Uses Invoice model (needs field verification)
- `/api/organization` - Uses Department/Designation/Branch models (needs verification)
- `/api/dashboard` - Aggregation queries (needs verification)
- `/api/settings` - User/preferences (needs verification)
- `/api/leave` - LeaveRequest model doesn't exist in schema

## Models Available in Current Schema

### Core
- User
- Employee
- Department
- Designation
- Branch

### Inventory & Sales
- Item, ItemCategory, Uom
- Customer
- Lead, LeadActivity
- Quotation, QuotationItem
- SalesOrder, SalesOrderItem
- Invoice, InvoiceItem

### Warehouse
- Warehouse, WarehouseLocation
- StockEntry, StockEntryLine
- StockLedger

### Procurement
- Vendor
- PurchaseOrder, PurchaseOrderItem

### Payroll & HR
- Shift, ShiftAssignment
- SalaryComponent, SalaryStructure, SalaryStructureItem, SalaryStructureAssignment
- PayrollRun, PayrollItem
- AttendanceLog

### Workflow
- WorkflowDefinition, WorkflowInstance, WorkflowAction

## Models Missing from Schema

These models are referenced in API routes but don't exist in the schema:

- Site (use Branch as alternative)
- Project, Task, Milestone
- Equipment, Asset, AssetMaintenance
- Incident
- Permit
- Expense
- Subcontractor
- Training, Certification, TrainingSession
- Support, Ticket
- Knowledgebase, KnowledgebaseArticle
- LedgerAccount, JournalEntry
- AccountsPayable, AccountsReceivable
- BankAccount, BankTransaction
- TaxConfig, TaxRate
- Budget, BudgetLine
- LeaveRequest, LeaveBalance
- JobOpening, Candidate

## Recommended Next Steps

### Option 1: Quick Fix (Current Approach)
- ✅ Fix routes that have models in schema
- ✅ Return empty data for routes without models
- ✅ Application runs without errors
- ⚠️ Some modules won't have functionality

### Option 2: Complete Fix (Future)
1. Add missing models to Prisma schema
2. Run migrations to create tables
3. Update API routes to use new models
4. Add seed data for new models
5. Test all modules

### Option 3: Hybrid Approach
1. Keep stub routes for now
2. Gradually add models as needed
3. Priority order:
   - Leave management (LeaveRequest, LeaveBalance)
   - Projects (Project, Task, Milestone)
   - Assets (Equipment, Asset)
   - Finance (LedgerAccount, JournalEntry)

## Testing Checklist

To verify the application works:

1. Start the dev server: `npm run dev`
2. Login with admin credentials
3. Test each module:
   - ✅ Employees - Should load and work
   - ✅ Attendance - Should load and work
   - ✅ Payroll - Should load and work
   - ✅ Inventory - Should load and work
   - ✅ Sales - Should load and work
   - ⚠️ Projects - Returns empty (expected)
   - ⚠️ Training - Returns empty (expected)
   - ⚠️ Sites - Returns empty (expected)
   - etc.

## Current Status

✅ Application should now run without errors
✅ Core modules (Employees, Attendance, Payroll) work
✅ Inventory and Sales modules work
⚠️ Many modules return empty data (by design)
🔧 Some modules need field verification

## How to Add a Missing Model

Example: Adding LeaveRequest model

1. Add to `prisma/schema.prisma`:
```prisma
model LeaveRequest {
  id              Int       @id @default(autoincrement())
  employeeId      Int
  employee        Employee  @relation(fields: [employeeId], references: [id])
  leaveType       String
  startDate       DateTime
  endDate         DateTime
  days            Decimal   @db.Decimal(5, 2)
  reason          String?
  status          String    @default("pending")
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

2. Run migration:
```bash
npm run db:push
```

3. Update `/api/leave/route.ts` to use the model

4. Test the module

## Files Modified

- `src/app/api/employees/route.ts` - Fixed Employee fields
- `src/app/api/attendance/route.ts` - Fixed to use AttendanceLog
- `src/app/api/payroll/route.ts` - Fixed to use PayrollRun/PayrollItem
- `src/app/api/inventory/route.ts` - Fixed to use Item/StockLedger
- `src/app/api/sales/route.ts` - Fixed to use Customer/SalesOrder
- `src/app/api/training/route.ts` - Stub implementation
- `src/app/api/sites/route.ts` - Stub implementation
- `src/app/api/recruitment/route.ts` - Stub implementation
- `src/app/api/projects/route.ts` - Stub implementation
- Plus 17 other stub implementations

## Scripts Created

- `fix-api-routes.ps1` - PowerShell script to create stub implementations
- `fix-all-api-routes.sh` - Bash script (alternative)

---

**Last Updated:** $(date)
**Status:** Application runs without errors, core modules functional
