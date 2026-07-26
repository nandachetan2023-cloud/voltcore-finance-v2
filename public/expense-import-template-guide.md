# HO Personal Expenses Import - Template Guide

This document describes the format for the HO Personal Expenses Excel import template.

## Template Structure

The template must be an Excel (.xlsx) file with the following columns in the first row:

| Column Index | Field Name | Required | Format | Notes |
|--------------|------------|----------|---------|-------|
| A | Date | Yes | dd-mm-yyyy | Date of the expense |
| B | SiteType | Yes | "HO" | Site type (fixed as "HO") |
| C | Category | Yes | String | Expense category (GAP FOODING, ADVANCE, ABF, etc.) |
| D | ItemName | No | String | Specific expense item name |
| E | Description | No | String | Detailed description of expenses |
| F | TotalAmount | Yes | Numeric | Total incurred amount |
| G | ReceivedAmount | No | Numeric | Amount received from HO (default 0) |
| H | GSTAmount | No | Numeric | GST amount (tax) |
| I | TDSAmount | No | Numeric | TDS deduction amount |
| J | BillNo | Yes | String | Invoice or bill number |
| K | ApprovalStatus | No | String | Draft | Pending | Approved | Rejected | Paid |

## Required Data Types

### Date Format
- Format: dd-mm-yyyy
- Example: `12-07-2026`
- Update pattern: `^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})$`

### Currency Amounts
- Format: Numeric values only (no currency symbols)
- Example: `5000.50`
- Updates to Decimal(15,2)

## Sample Data

| Date | SiteType | Category | ItemName | Description | TotalAmount | ReceivedAmount | GSTAmount | TDSAmount | BillNo | ApprovalStatus |
|------|----------|----------|----------|-------------|-------------|----------------|-----------|-----------|--------|----------------|
| 12-07-2026 | HO | GAP FOODING | Travel Expense | Personal travel for site | 5000 | 0 | 900 | 50 | INV001 | Draft |
| 13-07-2026 | HO | ADVANCE | Quick Cash | Fast cash advance | 10000 | 10000 | 1800 | 200 | INV002 | Pending |
| 14-07-2026 | HO | ABF | Stationary | Office supplies | 2500 | 500 | 450 | 25 | INV003 | Approved |

## Important Notes

1. **Required Fields**: Date, SiteType, Category, TotalAmount, BillNo are required
2. **SiteType**: Must be "HO" (Head Office) for all records
3. **Claim Number Format**: Auto-generated as `HOEXP-YYYYMMDD-0001`, `HOEXP-YYYYMMDD-0002`, etc.
4. **Approval Status**: Defaults to "Draft" if not specified
5. **Data Validation**: Upload will automatically skip invalid rows (missing required fields)

## Excel Template Generation

Run the Python script to generate the template:

```bash
python public/generate-expense-template.py
```

This creates `expense-import-template.xlsx` with:
- Proper column headers
- Sample data for testing
- Instructions and notes
- Formatted cells for consistency


## API Endpoints

### Preview Endpoint
- **URL**: `/api/finance/import/expenses/preview`
- **Method**: POST
- **Content-Type**: multipart/form-data
- **Parameters**:
  - `file`: Excel file (.xlsx)
  - `sheet`: Sheet name (optional)

### Commit Endpoint
- **URL**: `/api/finance/import/expenses/commit`
- **Method**: POST
- **Content-Type**: multipart/form-data
- **Parameters**:
  - `file`: Excel file (.xlsx)
  - `preview`: JSON preview data from preview endpoint
  - `sheet`: Sheet name (optional)

## Database Models

### FinExpenseClaim
```prisma
model FinExpenseClaim {
  id             Int       @id @default(autoincrement())
  claimNo        String    @unique
  siteId         Int
  siteType       String    @default("Site") // Site | HO
  expenseType    String    @default("") // GAP FOODING | Advance | ABF | etc.
  submittedBy    String
  date           DateTime  @db.Date
  receivedAmount Float     @default(0)
  totalAmount    Float     @default(0)
  gstAmount      Float     @default(0)
  tdsAmount      Float     @default(0)
  billNo         String?
  approvalStatus String    @default("Draft")
  status         String    @default("Draft")
  remarks        String?
  postedAt       DateTime?
  approvedBy     String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  site      FinSite       @relation(fields: [siteId], references: [id])
  items     FinExpenseItem[]
  approvals FinApprovalLog[]
}
```

### FinExpenseItem
```prisma
model FinExpenseItem {
  id          Int       @id @default(autoincrement())
  claimId     Int
  itemDate    DateTime? @db.Date
  category    String    @default("")
  name        String?
  description String?
  amount      Float     @default(0)
  remark      String?
  receiptUrl  String?
  createdAt   DateTime  @default(now())

  claim FinExpenseClaim @relation(fields: [claimId], references: [id], onDelete: Cascade)
}
```

## Frontend Integration

The Finance Import Center component has been updated with:
- New "Expenses" tab in the multi-tab interface
- Support for expense preview and import operations
- Proper endpoint routing for expense data
- Error handling and display