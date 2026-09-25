# India-Compliant Farm Finance ERP Plan

## Objective

Create an anonymized, India-compliant financial ERP workflow for managing farm/site finance records, replacing scattered Excel files with controlled forms, import mappings, audit trails, and statutory reporting.

The implementation must avoid exposing or depending on any real client/vendor/party data. Use placeholders such as `PARTY_CODE`, `SITE_CODE`, `INVOICE_NO`, `BILL_NO`, `GSTIN_SAMPLE`, and `PAN_SAMPLE`.

## Existing Repository Findings

- Main app: `C:\work\erp\ERP_voltcore-main`
- Stack: Next.js, TypeScript, Prisma, PostgreSQL, shadcn/ui-style components.
- Existing scripts:
  - `npm run dev`
  - `npm run build`
  - `npm run lint`
  - `npm run db:migrate`
  - `npm run db:push`
- Existing finance-related backend already present:
  - `src/app/api/finance/...`
  - `src/app/api/fin/...`
  - `src/app/api/finance-dashboard/route.ts`
  - `src/app/api/fin/payments/route.ts`
- Existing Prisma finance models already present:
  - `FinParty`, `FinSite`, `FinArea`, `FinInvoice`, `FinInvoiceDeduction`, `FinOutstanding`, `FinPayment`
  - `FinExpenseClaim`, `FinExpenseItem`, `FinPettyCash`
  - `FinPaymentAdvice`, `FinPaymentAdviceLine`
  - `FinPurchaseOrder`, `FinPOItem`, `FinCreditNote`
  - `FinAccount`, `FinJournalEntry`, `FinJournalLine`
  - `FinBudget`, `FinBudgetLine`, `FinAsset`, `FinAssetDepreciation`
  - Excel import models: `FinExcelTemplate`, `FinExcelColumnMap`, `FinImportBatch`, `FinImportRow`, `FinImportRowError`

## Privacy Constraint

Do not read, extract, display, or commit any real Excel values. If Excel inspection is required later, it must happen only inside a controlled import process that stores hashes/structure and never displays sensitive values in chat or generated files.

## Proposed Module Structure

### 1. Master Data Forms

Create CRUD forms for:

1. **Financial Year**
   - `2024-25`, `2025-26`, start date, end date, status.
2. **Chart of Accounts**
   - Groups: Assets, Liabilities, Capital, Income, Expenses, Direct Income, Direct Expenses, Indirect Income, Indirect Expenses.
   - Mandatory fields: account code, account name, group, parent account, tax applicability.
3. **Party Master**
   - Party type: Customer, Vendor, Employee, Advance Holder, Other.
   - Legal name, short name, PAN, GSTIN, state code, address, contact, UDYAM, TDS section, TDS rate, GST treatment.
4. **Site / Cost Center**
   - Site code, site name, state, project type, billing entity, responsible person.
5. **Bank / Cash Master**
   - Bank name, account number masked in UI, IFSC, branch, opening balance, account type.
6. **Tax Master**
   - GST rate, HSN/SAC, IGST/CGST/SGST split logic, TDS section/rate, cess if applicable.
7. **Item / Service Master**
   - Item/service code, HSN/SAC, tax rate, income/expense account mapping, unit.

### 2. Transaction Forms

Build form-based entry screens for:

1. **Work Order / Purchase Order**
   - PO/WO number, client, site, order date, order value, scope, retention terms, GST, TDS, start/end date.
2. **Sales Invoice / Tax Invoice**
   - Invoice number, invoice date, PO/WO, party, site, SAC/HSN, taxable value, GST split, total value, TDS, retention, credit note adjustment.
3. **Credit Note**
   - Credit note number, linked invoice, reason, taxable value, GST, net adjustment.
4. **Receipt / Collection**
   - Receipt date, invoice, bank/cash, amount, UTR/cheque reference, allocation across invoices.
5. **Outstanding Register**
   - Derived from invoices, deductions, receipts, credit notes.
   - Ageing buckets: 0–30, 31–60, 61–90, 90+.
6. **Purchase Bill / Vendor Bill**
   - Bill number, vendor, invoice date, site, taxable value, GST, TDS, due date.
7. **Payment Advice**
   - Advice number, vendor, bank details, payment date, multiple bill lines, UTR/cheque reference.
8. **Expense Claim**
   - Site/HO expense, date, category, amount, GST/TDS if applicable, bill attachment, approval status.
9. **Petty Cash Voucher**
   - Voucher number, date, debit/credit, category, party, balance.
10. **Journal Voucher**
   - Debit/credit lines, cost center/site, narration, attachment, maker-checker status.
11. **Fixed Asset**
   - Asset code, purchase date, cost, GST, useful life, depreciation method, location.

### 3. India Compliance Requirements

Implement validation and reporting for:

1. **GST**
   - GSTIN format validation.
   - State code mapping.
   - CGST/SGST for intra-state, IGST for inter-state.
   - HSN/SAC code capture.
   - Tax invoice fields required under Rule 46.
   - Credit note linkage to original invoice.
2. **TDS**
   - Party-level TDS section/rate.
   - TDS deduction on invoices and vendor bills.
   - TDS payable register and payment tracking.
3. **Books of Account**
   - Voucher numbering by financial year.
   - Immutable posted voucher audit trail.
   - Maker-checker approval for posted accounting entries.
4. **Retention / Security Deduction**
   - Separate tracking for retention receivable/payable and release.
5. **Bank Reconciliation**
   - Match bank statement rows with receipts/payments by amount, date, reference, party.
6. **Audit Trail**
   - Created by, updated by, posted by, approved by, timestamps, old/new values for sensitive fields.
7. **Data Retention**
   - Do not hard-delete posted financial records; use soft delete or reversal entries.

### 4. Excel Import Strategy

Create a controlled import pipeline:

1. **Upload**
   - User uploads workbook.
   - Store only file hash, file name, uploader, upload timestamp, sheet names, header names.
2. **Preview**
   - Show row count and mapped columns using placeholders.
   - Do not display sensitive cell values in chat or non-secure logs.
3. **Column Mapping**
   - Map source columns to target fields.
   - Save mappings in `FinExcelTemplate` and `FinExcelColumnMap`.
4. **Validation**
   - Required fields.
   - Date parsing.
   - Amount parsing.
   - Duplicate invoice/bill checks.
   - GST/PAN format checks.
   - Financial year consistency.
5. **Commit**
   - Create/update normalized records.
   - Store raw row JSON only if allowed by privacy policy.
   - Generate error report for rejected rows.
6. **Batch Lock**
   - Once committed, lock batch and require reversal/import correction workflow for changes.

### 5. Suggested Anonymized File Naming Convention

Use this convention for future Excel naming:

- Sales invoices: `FY{FY}_SalesInvoice_{ClientCode}_{InvoiceNo}_{YYYYMMDD}.xlsx`
- Credit notes: `FY{FY}_CreditNote_{ClientCode}_{CNNo}_{YYYYMMDD}.xlsx`
- Work orders: `FY{FY}_WorkOrder_{SiteCode}_{POorWONo}_{YYYYMMDD}.xlsx`
- Outstanding: `FY{FY}_Outstanding_{SiteCode}_{YYYYMM}.xlsx`
- Receipts: `FY{FY}_Receipt_{ClientCode}_{YYYYMMDD}.xlsx`
- Vendor bills: `FY{FY}_PurchaseBill_{VendorCode}_{BillNo}_{YYYYMMDD}.xlsx`
- Payment advice: `FY{FY}_PaymentAdvice_{VendorCode}_{AdviceNo}_{YYYYMMDD}.xlsx`
- Site expenses: `FY{FY}_SiteExpense_{SiteCode}_{YYYYMM}.xlsx`
- HO expenses: `FY{FY}_HOExpense_{YYYYMM}.xlsx`
- Petty cash: `FY{FY}_PettyCash_{YYYYMM}.xlsx`
- Bank reconciliation: `FY{FY}_BankReconciliation_{BankCode}_{YYYYMM}.xlsx`
- P&L: `FY{FY}_PL_{SiteCode}_{YYYYMM}.xlsx`

### 6. UI Pages to Build

Add a finance section with these pages:

1. `/finance/dashboard`
   - Cash/bank balance, AR/AP ageing, GST/TDS pending, site P&L summary.
2. `/finance/masters/parties`
3. `/finance/masters/sites`
4. `/finance/masters/chart-of-accounts`
5. `/finance/masters/tax`
6. `/finance/sales-invoices`
7. `/finance/receipts`
8. `/finance/outstanding`
9. `/finance/purchase-bills`
10. `/finance/payment-advices`
11. `/finance/expenses`
12. `/finance/petty-cash`
13. `/finance/journal`
14. `/finance/import-center`
15. `/finance/reports/trial-balance`
16. `/finance/reports/profit-loss`
17. `/finance/reports/balance-sheet`
18. `/finance/reports/gst`
19. `/finance/reports/tds`
20. `/finance/reports/bank-reconciliation`

### 7. API Endpoints to Add

Use existing Next.js API route pattern.

1. Masters:
   - `POST /api/finance/parties`
   - `PATCH /api/finance/parties/[id]`
   - `GET /api/finance/parties`
   - Repeat for sites, chart of accounts, tax, banks.
2. Transactions:
   - `POST /api/finance/invoices`
   - `PATCH /api/finance/invoices/[id]`
   - `POST /api/finance/invoices/[id]/post`
   - `POST /api/finance/receipts`
   - `POST /api/finance/payment-advices`
   - `POST /api/finance/expenses`
   - `POST /api/finance/journals`
3. Reports:
   - `GET /api/finance/reports/trial-balance`
   - `GET /api/finance/reports/profit-loss`
   - `GET /api/finance/reports/balance-sheet`
   - `GET /api/finance/reports/gst`
   - `GET /api/finance/reports/tds`
   - `GET /api/finance/reports/outstanding-ageing`
4. Imports:
   - `POST /api/finance/import/preview`
   - `POST /api/finance/import/commit`
   - `GET /api/finance/import/batches`
   - `GET /api/finance/import/batches/[id]/errors`

### 8. Database Schema Gaps to Fill

Existing schema has many finance models, but add or strengthen:

1. `FinFinancialYear`
2. `FinTaxRate`
3. `FinBankStatement`
4. `FinBankReconciliation`
5. `FinTdsDeduction`
6. `FinTdsPayment`
7. `FinGstReturnPeriod`
8. `FinRetentionReceivable`
9. `FinRetentionPayable`
10. `FinAttachment`
11. `FinApprovalLog`
12. `FinAuditLog`
13. `FinReportSnapshot`
14. `FinDocumentNumberSeries`
15. `FinOpeningBalance`

### 9. Form Management Workflow

Use forms as the primary source of truth, not Excel.

1. User enters master data once.
2. Transactions are created from dropdown-linked masters.
3. Each transaction gets a voucher/document number series.
4. Posted records cannot be edited directly.
5. Corrections are done through reversal, credit note, debit note, or adjustment voucher.
6. Excel is used only for migration or bulk import, not daily entry.
7. Reports are generated from normalized database records.

### 10. Validation Rules

Implement strict validations:

1. GSTIN: 15 characters, correct state-code prefix, checksum.
2. PAN: 10 characters, standard PAN pattern.
3. IFSC: 11 characters, alphanumeric pattern.
4. Invoice number unique per party + financial year.
5. Bill number unique per vendor + financial year.
6. Debit total must equal credit total for journals.
7. Receipt/payment amount must be greater than zero.
8. Invoice date and bill date must fall inside selected financial year or show warning.
9. Posted documents require approval before changing ledger impact.
10. Bank payment requires bank account, payment date, amount, and reference.

### 11. Reporting Design

Reports should be generated from normalized tables:

1. **Trial Balance**
   - From `FinJournalLine` and `FinAccount`.
2. **Profit & Loss**
   - Income and expense accounts by period/site.
3. **Balance Sheet**
   - Assets, liabilities, capital, current balances.
4. **GST Sales Register**
   - Taxable value, CGST, SGST, IGST, invoice-wise.
5. **GST Purchase Register**
   - Vendor bill-wise GST input.
6. **TDS Register**
   - Deducted TDS, paid TDS, pending TDS.
7. **AR Ageing**
   - Invoice-wise outstanding ageing.
8. **AP Ageing**
   - Vendor bill-wise payable ageing.
9. **Site P&L**
   - Revenue, direct expense, indirect allocation by site.
10. **Cash/Bank Book**
   - Receipts, payments, bank balance.
11. **Bank Reconciliation**
   - Unmatched bank statement entries.

### 12. Implementation Phases

#### Phase 1: Privacy-Safe Foundation

- Do not inspect real Excel data.
- Create anonymized master forms.
- Add financial year, tax, party, site, bank, chart of accounts forms.
- Add audit log and document number series tables.

#### Phase 2: Core Transactions

- Sales invoice form.
- Receipt form.
- Purchase bill form.
- Payment advice form.
- Expense claim form.
- Petty cash form.
- Journal voucher form.

#### Phase 3: Compliance

- GST invoice validation and GST reports.
- TDS deduction/payment register.
- Maker-checker approval.
- Immutable posted voucher behavior.
- Credit note and debit note linkage.

#### Phase 4: Excel Import Center

- Generic upload, preview, mapping, validation, commit.
- Store only safe metadata by default.
- Optional raw row storage only if user explicitly permits.

#### Phase 5: Reports

- Trial balance.
- P&L.
- Balance sheet.
- GST sales/purchase register.
- TDS register.
- AR/AP ageing.
- Bank reconciliation.

#### Phase 6: Migration and UAT

- Prepare anonymized sample data.
- Migrate historical data in controlled batches.
- Validate totals against CA-reviewed Excel summaries.
- Freeze opening balances by financial year.

### 13. Testing Plan

Run:

- `npm run lint`
- `npm run build`
- Prisma generate/migrate as required.
- Unit tests for validation functions:
  - GSTIN
  - PAN
  - IFSC
  - financial year derivation
  - debit-credit balance
  - duplicate invoice/bill
- API tests for:
  - create party
  - create invoice
  - post invoice
  - create receipt
  - create payment advice
  - create journal
  - import preview/commit with anonymized sample files
- UI smoke tests for all finance pages.

### 14. Acceptance Criteria

The task is complete when:

1. Finance users can enter all core records through forms.
2. Excel is no longer required for daily financial entry.
3. Posted records have audit trails and cannot be silently edited.
4. GST/TDS fields are captured and validated.
5. AR/AP/outstanding reports are generated from database records.
6. Import center can map future Excel files without exposing sensitive values.
7. Reports match CA-reviewed totals using anonymized test data.
