# API Routes Fix Guide

## Problem
The API routes were written for an old schema that had different field names and models. The current Prisma schema has different models and field structures.

## Models in Current Schema

### Core Models
- User
- Employee (with fields: employeeCode, firstName, lastName, email, phone, etc.)
- Department
- Designation
- Branch

### Inventory & Sales
- Item
- ItemCategory
- Uom
- Customer
- Lead
- LeadActivity
- Quotation
- QuotationItem
- SalesOrder
- SalesOrderItem
- Invoice
- InvoiceItem

### Warehouse & Stock
- Warehouse
- WarehouseLocation
- StockEntry
- StockEntryLine
- StockLedger

### Procurement
- Vendor
- PurchaseOrder
- PurchaseOrderItem

### Payroll & HR
- Shift
- ShiftAssignment
- SalaryComponent
- SalaryStructure
- SalaryStructureItem
- SalaryStructureAssignment
- PayrollRun
- PayrollItem
- AttendanceLog

### Workflow
- WorkflowDefinition
- WorkflowInstance
- WorkflowAction

## Models NOT in Schema (Need to Return Empty or Mock Data)

These API routes reference models that don't exist:
- Site
- Project/Task/Milestone
- Equipment/Asset
- Incident
- Permit
- Expense
- Subcontractor
- Training/Certification
- Support/Ticket
- Knowledgebase
- LedgerAccount/JournalEntry
- AccountsPayable/AccountsReceivable
- BankAccount
- TaxConfig
- Budget

## Fix Strategy

### Option 1: Return Empty Arrays (Quick Fix)
For models that don't exist, return empty arrays with success: true

### Option 2: Add Missing Models to Schema (Complete Fix)
Add all missing models to the Prisma schema

## Recommended Approach

1. Fix existing models first (Employee, Payroll, Inventory, Sales, etc.)
2. For missing models, return empty arrays with a note
3. Gradually add missing models to schema as needed

## Files Fixed So Far

- ✅ `/api/employees` - Fixed to use correct Employee model fields
- ✅ `/api/payroll` - Fixed to use PayrollRun and PayrollItem models

## Files That Need Fixing

All other API routes need to be checked and fixed to match the schema.
