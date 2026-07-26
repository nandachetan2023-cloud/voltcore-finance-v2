# Finance & Accounts Module — Database Design

## 1. Overview

This document maps the **Finance & Accounts** requirements to the existing Prisma schema and identifies any gaps or enhancements needed. The design follows the double-entry bookkeeping principle and supports **Site Wise, Job Wise, PO Wise and Customer Wise** profitability analysis.

---

## 2. Core Design Principles

| Principle | Description |
|-----------|-------------|
| **Double Entry** | Every transaction posts debit and credit entries automatically. |
| **Tagging** | Each financial transaction is tagged with `siteId`, `jobCode`, `poNo`, `costCenter`, `department`, `projectManager`. |
| **Multi-tenancy** | All finance tables are tenant-isolated via existing `getDbForRequest()` cookie routing. |
| **Audit Trail** | All mutations tracked via `createdAt`, `updatedAt`, and `createdBy` / `postedBy` fields. |
| **Indian Compliance** | GST (CGST/SGST/IGST), TDS (Contractor/Professional/Rent/Salary), Form 26Q ready. |

---

## 3. Entity Relationship Summary

```
FinSite ──┬── FinInvoice
          ├── FinPurchaseOrder
          ├── FinExpenseClaim
          ├── FinPaymentAdvice
          ├── FinPettyCash
          ├── FinJournalEntry
          └── FinBudget

FinParty ──┬── FinInvoice
           ├── FinPaymentAdvice
           ├── FinTdsDeduction
           └── FinPettyCash

FinAccount ──┬── FinJournalLine
             └── FinBudgetLine

FinJournalEntry ── FinJournalLine
FinBudget ──────── FinBudgetLine
FinPurchaseOrder ─ FinPOItem
FinInvoice ──┬── FinPayment
             ├── FinInvoiceDeduction
             ├── FinTdsDeduction
             └── FinOutstanding
```

---

## 4. Module-wise Schema

### 4.1 General Ledger (GL) & Chart of Accounts

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `FinAccount` | Chart of Accounts (COA) | `accountCode`, `name`, `group` (Assets/Liabilities/Income/Expenses), `type`, `parentId` (hierarchy), `taxApplicable` |
| `FinJournalEntry` | Journal Voucher Header | `entryNo`, `entryDate`, `siteId`, `status` (Draft/Posted/Reversed), `totalDebit`, `totalCredit`, `postedBy`, `approvedBy` |
| `FinJournalLine` | Journal Voucher Lines | `entryId`, `accountId`, `debit`, `credit`, `costCenter` |

**COA Groups Supported:**
- **Assets:** Cash, Bank, Petty Cash, Accounts Receivable, Inventory, Fixed Assets
- **Liabilities:** Vendor Payable, GST Payable, TDS Payable, Salary Payable
- **Income:** Service Revenue, Project Revenue, Material Sales
- **Expenses:** Payroll Expense, Labour Expense, Material Consumption, Vehicle Expense, Office Expense

**Auto-Posting Example (Purchase Entry):**
```
Dr Material Inventory   1,00,000
   Cr Vendor Payable            1,00,000
   Tagged: Site=SITE-001, Job=JOB-2026-001, PO=PO-125
```

---

### 4.2 Accounts Payable (Purchase / Supplier)

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `FinPurchaseOrder` | Vendor PO | `poNo`, `vendorId`, `vendorName`, `siteId`, `date`, `totalAmount`, `status`, `grnDate`, `grnRef` |
| `FinPOItem` | PO Line Items | `poId`, `description`, `quantity`, `unitRate`, `total`, `receivedQty` |
| `FinPaymentAdvice` | Payment Advice to Vendor | `adviceNo`, `partyId`, `siteId`, `poId`, `totalAmount`, `paymentDate`, `paymentMode`, `bankAccountId`, `status` |
| `FinPaymentAdviceLine` | Advice Line Items | `adviceId`, `invoiceId`, `billNo`, `invAmount`, `gst`, `tdsAmount`, `paidAmount`, `balanceAmount` |
| `AccountsPayable` | Legacy AP | `billNo`, `vendor`, `amount`, `dueDate`, `paidDate`, `status` |

**Process Flow:**
```
Purchase Request → RFQ → Quotation → PO → GRN → Purchase Invoice → Payment Advice → Payment
```

**Vendor Master:** `FinParty` with `partyType = "Vendor"` supports `gstin`, `pan`, `address`, `contact`, `tdsSection`, `tdsRate`.

**Reports:**
- Vendor Outstanding Report
- Vendor Ageing (0-30, 31-60, 61-90, 90+ Days)

---

### 4.3 Accounts Receivable (Client Billing)

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `FinInvoice` | Sales Invoice | `invoiceNo`, `siteId`, `partyId`, `poId`, `invoiceDate`, `dueDate`, `taxableValue`, `cgstAmount`, `sgstAmount`, `igstAmount`, `grandTotal`, `tdsDeduction`, `totalDeduction`, `balanceAmount`, `status` |
| `FinInvoiceDeduction` | Normalized Deductions | `invoiceId`, `type` (TDS/KPI/SAFETY/RETENTION/OTHER), `amount`, `rate`, `section` |
| `FinPayment` | Payment Received | `invoiceId`, `amount`, `paymentDate`, `paymentMode`, `bankAccountId` |
| `FinOutstanding` | Outstanding Tracker | `invoiceId`, `siteId`, `invoiceValue`, `receivedAmount`, `balanceAmount` |
| `FinCreditNote` | Credit Note | `creditNoteNo`, `invoiceId`, `siteId`, `amount`, `status` |
| `AccountsReceivable` | Legacy AR | `invoiceNo`, `client`, `amount`, `dueDate`, `receivedDate`, `status` |

**Customer Master:** `FinParty` with `partyType = "Customer"`.

**Process:**
```
Customer PO → RA Bill → Tax Invoice → Payment Collection → Receipt Entry
```

**Reports:**
- Customer Outstanding
- Collection Ageing (0-30, 31-60, 61-90, 90+ days)

---

### 4.4 Cash & Bank Management

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `BankAccount` | Bank Account Master | `accountName`, `bankName`, `accountNo`, `ifsc`, `type`, `balance`, `currency` |
| `BankTransaction` | Bank Transactions | `bankAccountId`, `date`, `type` (Payment/Receipt/Contra/Transfer/Charges/Interest), `amount`, `balance`, `reference`, `party`, `description`, `reconciled` |
| `FinPettyCash` | Petty Cash (see 4.10) | `voucherNo`, `date`, `type`, `amount`, `category`, `siteId`, `poId`, `expenseClaimId` |

**Bank Transaction Types Supported:**
- Payment
- Receipt
- Contra (Internal bank transfer)
- Transfer
- Charges
- Interest

**Reports:**
- Bank Book
- Cash Book
- Bank Reconciliation (ERP Balance vs Bank Statement)

---

### 4.5 GST & TDS Module

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `SalesTaxInvoice` | GST Tax Invoice | `invoiceNo`, `customerId`, `hsnSac`, `taxableAmount`, `cgstRate`, `sgstRate`, `igstRate`, `cgstAmount`, `sgstAmount`, `igstAmount`, `totalAmount` |
| `SalesTaxInvoiceItem` | Invoice Line Items | `invoiceId`, `description`, `hsnSac`, `quantity`, `rate`, `taxableValue`, `cgstAmount`, `sgstAmount`, `igstAmount` |
| `FinTdsDeduction` | TDS Deduction | `documentType` (INVOICE/PURCHASE_BILL), `documentId`, `invoiceId`, `partyId`, `deductionDate`, `section`, `rate`, `taxableAmount`, `deductionAmount`, `paidAmount`, `status` |
| `TaxRecord` | Tax Liability Tracker | `taxType` (GST/TDS/PF/ESI), `period`, `amount`, `dueDate`, `paidDate`, `status` |

**GST Features:**
- Purchase GST: CGST, SGST, IGST
- Sales GST: GST Invoices, GST Register
- Reports: GSTR-1, GSTR-3B, GST Purchase Register, GST Sales Register

**TDS Features:**
- Sections: Contractor, Professional, Rent, Salary
- Reports: TDS Register, TDS Payable, Form 26Q Data

---

### 4.6 Journal Voucher (JV)

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `FinJournalEntry` | JV Header | `entryNo`, `entryDate`, `siteId`, `reference`, `description`, `status` (Draft/Posted/Reversed), `totalDebit`, `totalCredit`, `postedBy`, `approvedBy`, `approvedAt` |
| `FinJournalLine` | JV Lines | `entryId`, `accountId`, `description`, `debit`, `credit` |

**JV Controls:**
- Approval Workflow (`approvedBy`, `approvedAt`)
- Supporting Document Upload (extend via `reference` or new attachment model)
- Audit Trail (all fields timestamped)

**Examples:**
- Depreciation: Dr Depreciation Expense / Cr Asset Account
- Provision Entry: Dr Expense / Cr Provision Account

---

### 4.7 Profit & Loss Statement

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `ProfitLossEntry` | P&L Data | `site`, `month`, `side` (debit/credit), `category`, `particular`, `amount` |

**Revenue:**
- Project Billing
- Service Billing

**Expenses:**
- Material
- Labour
- Salary
- Transport
- Equipment
- Admin Cost

**Example:**
```
Revenue:     ₹1,00,00,000
Expenses:    ₹80,00,000
Profit:      ₹20,00,000
Margin:      20%
```

---

### 4.8 Balance Sheet

Derived from `FinAccount` balances. No separate model needed — the Balance Sheet is a report generated from the GL.

**Assets:**
- Cash, Bank, Inventory, Fixed Assets, Receivables

**Liabilities:**
- Vendor Outstanding, GST Liability, Loan, Salary Payable

**Equity:**
- Capital, Retained Earnings

---

### 4.9 Budget vs Actual

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `FinBudget` | Budget Plan | `fiscalYear`, `name`, `siteId`, `version`, `status` (Draft/Approved), `totalAmount` |
| `FinBudgetLine` | Monthly Budget Grid | `budgetId`, `accountId`, `month` (1-12), `amount` |
| `BudgetItem` | Legacy Budget | `category`, `description`, `planned`, `actual`, `variance`, `period` |

**Budget vs Actual Analysis:** Compare `FinBudgetLine.amount` against actual GL postings for the same account and period.

---

### 4.10 Petty Cash Management (Detailed)

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `FinPettyCash` | Petty Cash Voucher | `voucherNo`, `date`, `description`, `amount`, `type` (Debit/Credit), `category`, `partyId`, `siteId`, `poId`, `expenseClaimId`, `linkedType` (Direct/ExpenseClaim), `authorizedBy`, `paymentMode`, `balance` |
| `FinExpenseClaim` | Expense Claim Header | `claimNo`, `siteId`, `poId`, `siteType` (Site/HO), `expenseType`, `submittedBy`, `date`, `receivedAmount`, `totalAmount`, `approvalStatus`, `status` |
| `FinExpenseItem` | Expense Claim Line | `claimId`, `itemDate`, `category`, `name`, `description`, `amount`, `receiptUrl` |
| `FinApprovalLog` | Approval Workflow | `entityType`, `entityId`, `status`, `action`, `makerId`, `checkerId`, `comments` |

**Petty Cash ERP Fields (Mandatory):**
1. Voucher No
2. Date
3. Expense Head
4. Site Code
5. Job Code
6. Amount
7. Bill Attachment
8. Approver

**Petty Cash Master:**
- Custodian
- Site Incharge
- Store Incharge
- Admin Executive

**Process Flow:**
```
Cash Issued → Expense Voucher → Bill Upload → Approval → Petty Cash Settlement
```

**Petty Cash Examples (Site Expenses):**
- Tea & Snacks
- Local Conveyance
- Auto Fare
- Diesel
- Stationery
- Courier
- Labour Welfare
- Emergency Purchases

**Reports:**
- Daily Cash Report
- Petty Cash Summary (Site-wise)
- Employee Wise Settlement

---

### 4.11 Fixed Assets

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `FinAsset` | Asset Master | `assetCode`, `name`, `category`, `serialNo`, `acquisitionDate`, `cost`, `salvageValue`, `usefulLife`, `depreciationMethod`, `siteId`, `custodian`, `status` |
| `FinAssetDepreciation` | Depreciation Schedule | `assetId`, `period` (YYYY-MM), `amount`, `bookValue` |

---

### 4.12 Vendor / Customer Master

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `FinParty` | Unified Party Master | `code`, `name`, `partyType` (Customer/Vendor/Employee/Advance Holder/Other), `gstin`, `pan`, `address`, `state`, `stateCode`, `contact`, `udyam`, `tdsSection`, `tdsRate`, `gstTreatment` |

**Vendor Fields:**
- Vendor Code
- Vendor Name
- GST No
- PAN
- Address
- Contact Person
- Payment Terms

**Customer Fields:**
- Customer Code
- Customer Name
- GST
- Credit Period
- Contract Value

---

### 4.13 Site & Project Master

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `FinSite` | Site Master | `siteCode`, `name`, `location`, `state`, `projectType`, `billingEntity`, `responsiblePerson`, `contactPerson`, `contactPhone`, `contactEmail`, `budget` |
| `FinArea` | Area under Site | `siteId`, `code`, `name` |

---

### 4.14 Procurement Support Models

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `FinPurchaseRequisition` | Purchase Request | `prNo`, `date`, `requester`, `project`, `totalEstCost`, `requiredBy`, `status` |
| `FinPRLineItem` | PR Items | `prId`, `description`, `qty`, `unit`, `estCost` |
| `FinRFQ` | Request for Quotation | `rfqNo`, `description`, `issueDate`, `responseDeadline`, `project`, `status` |
| `FinRFQLineItem` | RFQ Items | `rfqId`, `description`, `qty`, `unit` |
| `FinRFQBid` | Vendor Bid | `rfqId`, `vendorId`, `lineItemId`, `unitPrice`, `leadTime`, `compliant` |
| `FinSubcontract` | Subcontract | `subcontractNo`, `vendor`, `project`, `scopeSummary`, `value`, `startDate`, `endDate`, `retentionPercent` |
| `FinSubcontractMilestone` | Milestone | `subcontractId`, `description`, `scheduledAmount`, `dueDate`, `amountPaid`, `balance`, `status` |
| `FinSubcontractProgressClaim` | Progress Claim | `subcontractId`, `claimNo`, `date`, `amountClaimed`, `certifiedAmount`, `amountPaid`, `status` |
| `FinMaterialTrackingItem` | Material Tracking | `poNo`, `vendor`, `project`, `site`, `material`, `category`, `qtyRequired`, `qtyStock`, `qtyInTransit`, `scheduledDate`, `expectedDate`, `status` |

---

### 4.15 Sales & CRM (Finance-linked)

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `FinClient` | Client Master | `name`, `sector`, `strength`, `website`, `industry` |
| `FinClientProject` | Client Project | `clientId`, `name`, `value`, `startDate`, `endDate` |
| `FinOpportunity` | Opportunity | `projectName`, `clientName`, `value`, `winProbability`, `dueDate`, `stage` |
| `FinTender` | Tender Register | `tenderNo`, `client`, `project`, `rftIssueDate`, `submissionDeadline`, `estimatedValue`, `status` |
| `SalesTaxInvoice` | GST Sales Invoice | `invoiceNo`, `customerId`, `taxableAmount`, `cgstRate`, `sgstRate`, `igstRate`, `totalAmount` |
| `SalesTaxInvoiceItem` | Sales Invoice Items | `invoiceId`, `description`, `quantity`, `rate`, `taxableValue`, `cgstAmount`, `sgstAmount`, `igstAmount` |

---

### 4.16 Integration & Sync

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `FinTallySync` | Tally Sync | `syncType`, `fileName`, `periodFrom`, `periodTo`, `totalRows`, `status`, `rawJson`, `log` |
| `SyncConfig` | Sync Configuration | `module`, `enabled`, `autoSync`, `syncInterval`, `lastSyncAt`, `lastStatus` |
| `SyncLog` | Sync Log | `module`, `action`, `recordId`, `recordData`, `status`, `direction`, `conflictReason` |

---

## 5. Mandatory Transaction Fields

Every financial transaction must include these fields for profitability analysis:

| Field | Source Model(s) | Purpose |
|-------|-----------------|---------|
| `siteId` | FinInvoice, FinJournalEntry, FinPettyCash, FinExpenseClaim, FinPaymentAdvice | Site-wise reporting |
| `jobCode` | Extend via `reference` or dedicated field | Job-wise P&L |
| `poNo` | FinPurchaseOrder, FinPettyCash, FinInvoice | PO-wise costing |
| `costCenter` | FinJournalLine | Department-wise costing |
| `department` | Extend via Employee/Department relation | Department-wise costing |
| `projectManager` | Extend via Employee relation | Accountability |

**Note:** The existing schema already supports `siteId` on most finance models. `jobCode`, `costCenter`, and `projectManager` can be added via the `reference` field or by extending specific models if needed.

---

## 6. Reports Matrix

| Report | Primary Models | Filter Dimensions |
|--------|---------------|-------------------|
| Site Wise P&L | ProfitLossEntry, FinJournalEntry | site, month |
| Job Wise P&L | ProfitLossEntry, FinJournalEntry | jobCode, month |
| PO Wise Costing | FinPurchaseOrder, FinPOItem, FinPaymentAdvice | poNo |
| Customer Wise Profitability | FinInvoice, FinParty | partyId (Customer) |
| Department Wise Costing | FinJournalLine, FinBudgetLine | costCenter |
| Budget vs Actual | FinBudgetLine, FinJournalLine | accountId, month |
| Vendor Outstanding | FinPaymentAdvice, FinOutstanding | partyId (Vendor), dueDate |
| Customer Outstanding | FinOutstanding, FinInvoice | partyId (Customer), dueDate |
| Vendor Ageing | FinPaymentAdvice | dueDate buckets |
| Collection Ageing | FinOutstanding | dueDate buckets |
| GST Reports | SalesTaxInvoice, FinTdsDeduction | period |
| TDS Reports | FinTdsDeduction | partyId, period |
| Bank Book | BankTransaction, BankAccount | bankAccountId, date range |
| Cash Book | BankTransaction, FinPettyCash | type = Receipt/Payment |
| Bank Reconciliation | BankTransaction | reconciled = false |
| Petty Cash Summary | FinPettyCash, FinExpenseClaim | siteId, date range |

---

## 7. Schema Gap Analysis

| Requirement | Status | Notes |
|-------------|--------|-------|
| Chart of Accounts (COA) | ✅ Covered | `FinAccount` model with hierarchy |
| Vendor Master | ✅ Covered | `FinParty` with `partyType = "Vendor"` |
| Customer Master | ✅ Covered | `FinParty` with `partyType = "Customer"` |
| Purchase Entry Auto-posting | ✅ Covered | Via `FinJournalEntry` + `FinJournalLine` |
| Vendor Outstanding & Ageing | ✅ Covered | `FinPaymentAdvice`, `FinOutstanding` |
| Customer Outstanding & Ageing | ✅ Covered | `FinOutstanding`, `FinPayment` |
| Multi-Bank Accounts | ✅ Covered | `BankAccount` |
| Bank Transactions (Payment/Receipt/Contra/Transfer/Charges/Interest) | ✅ Covered | `BankTransaction` with `type` field |
| GST Invoices & Registers | ✅ Covered | `SalesTaxInvoice`, `SalesTaxInvoiceItem` |
| TDS Deduction & Reports | ✅ Covered | `FinTdsDeduction`, `TaxRecord` |
| Journal Voucher with Approval | ✅ Covered | `FinJournalEntry` with `approvedBy`/`approvedAt` |
| P&L Statement | ✅ Covered | `ProfitLossEntry` |
| Balance Sheet | ✅ Covered | Derived from `FinAccount` balances |
| Budget vs Actual | ✅ Covered | `FinBudget`, `FinBudgetLine` |
| Petty Cash Detailed | ✅ Covered | `FinPettyCash`, `FinExpenseClaim`, `FinExpenseItem` |
| Petty Cash Approval | ✅ Covered | `FinApprovalLog` |
| Fixed Assets & Depreciation | ✅ Covered | `FinAsset`, `FinAssetDepreciation` |
| Tally Sync | ✅ Covered | `FinTallySync` |
| Job Code tagging | ⚠️ Partial | Use `reference` field or extend `FinJournalLine` |
| Cost Center tagging | ⚠️ Partial | `FinJournalLine.costCenter` exists but references generic Int |
| Project Manager tagging | ⚠️ Partial | Use `reference` field or extend with employee relation |

---

## 8. Recommended Enhancements

### 8.1 Add Missing Tagging Fields
```prisma
model FinJournalLine {
  // existing fields...
  jobCode      String?  // NEW: Job Wise costing
  costCenter   String?  // ENHANCE: from Int to String for flexibility
  projectManager String? // NEW: accountability
}
```

### 8.2 Petty Cash Enhancement
Consider adding `billAttachmentPath` to `FinPettyCash` for direct bill upload support:
```prisma
model FinPettyCash {
  // existing fields...
  billAttachmentPath String? // NEW: direct bill upload
}
```

### 8.3 Approval Workflow for Journal Entries
Extend `FinApprovalLog` to support JV approvals:
```prisma
model FinApprovalLog {
  // existing fields...
  finJournalEntryId  Int?
  finJournalEntry    FinJournalEntry? @relation(fields: [finJournalEntryId], references: [id])
}
```

---

## 9. Migration Notes

1. The existing `schema.prisma` already contains **76 Fin-prefixed models** covering the majority of requirements.
2. The legacy `LedgerAccount`, `JournalEntry`, `AccountsPayable`, `AccountsReceivable`, `BankAccount`, `BankTransaction`, `TaxRecord`, and `BudgetItem` models exist for backward compatibility.
3. New development should use the `Fin*` prefixed models.
4. No breaking changes required — the design is additive.

---

## 10. Naming Conventions

| Convention | Example |
|------------|---------|
| Table Prefix | `Fin` for finance-specific tables |
| Primary Key | `id` (auto-increment Int) |
| Unique Business Keys | `invoiceNo`, `poNo`, `entryNo`, `voucherNo` |
| Date Fields | `DateTime` with `@db.Date` for date-only |
| Amount Fields | `Float` with `@default(0)` |
| Timestamps | `createdAt`, `updatedAt` |
| Soft Delete | `isDeleted` + `@default(false)` |
| Indexes | Foreign keys, unique business keys, status, date ranges |
