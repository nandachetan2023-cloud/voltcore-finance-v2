# Finance Excel → Relational Model (Draft)

This model is derived from the complete column inventory in:
- `analysis/finance_excels_profile.md`
- `analysis/finance_excels_profile.json`

## 1) What the Excels represent (high-level)

Your workbooks collectively cover:
- **Receivables / Outstanding (OS)**: bill/invoice register with deductions, receipts, balances (`OS DETAILS`, `Master List Tax Invoice`, many client sheets).
- **Credit notes**: separate CN register and link-back to invoice/bill (`CREDIT NOTE`, `Master List CR Note`, many CRN sheets).
- **Work orders**: order master with value, booking, billing, receipts, unexecuted value and delay controls (`Work order Format ...`).
- **Payment advice**: vendor payment advice with multiple invoices, bank details and payment meta (`Payment_Advice_Excel_Multiple_Invoices.xlsx`).
- **Expenses**: HO personal expenses + site expenses, cash book, advances, room rent (multiple month sheets).
- **P&L by site**: monthly P&L summary sheets per site.

## 2) Canonical keys (controls an experienced finance team expects)

These are the keys we should standardize as *unique identifiers* in the DB:
- **Client/Party**: normalized `party_name` + optional `party_code` + GSTIN.
- **Site/Area**: standardized site/area master (avoid free-text drift).
- **Work Order**: `work_order_no` (unique per client), dates, order value.
- **PO**: `po_no` (often present in OS and work-order excels).
- **Invoice/Bill**: `bill_no` / `invoice_no` (unique per series), `invoice_date`, `month`.
- **Tracking**: `tracking_no` (used like an internal tracking id in OS).
- **Voucher/Receipt reference**: `voucher_no`, payment ref, received date.

## 3) Normalized tables (recommended)

### 3.1 Masters
- `FinParty` (Client/Vendor)
- `FinSite` (Site/Area/Cost center)
- `FinWorkOrder` (order master)
- `FinPurchaseOrder` (optional: if PO tracking is required separately from WO)
- `FinBankAccount` (company bank accounts)

### 3.2 Transaction registers
- `FinInvoice` (Tax invoice / bill register)
- `FinCreditNote` (CN register, linked to invoice)
- `FinReceipt` (money received against invoices; supports split receipts / part payments)
- `FinDeduction` (TDS/KPI/Safety/Retention/Other; can be computed or captured)
- `FinOutstandingSnapshot` (optional: if you want periodic snapshots as per Excel “OS DETAILS”)

### 3.3 Payables (if maintained)
- `FinVendorBill` (AP register)
- `FinPaymentAdvice` + `FinPaymentAdviceLine` (one advice, multiple invoices/bills)

### 3.4 Expenses
- `FinExpenseBatch` (monthly workbook import batch)
- `FinExpense` (one expense voucher/entry)
- `FinExpenseLine` (optional if you need splits)
- `FinAdvance` (advances given/settled)

### 3.5 Reporting tables (derived)
- `FinPLMonthly` (per site, per month, per ledger group)

## 4) Column-to-table mapping approach (how we ensure no column is missed)

Instead of hard-coding per-file logic, use a **Template + Mapping** layer:
- `ExcelTemplate` (workbook/sheet signature, header row index, required columns)
- `ExcelColumnMap` (source column name → target table.field + transform rule)
- `ImportBatch` (who/when imported, file hash, error report)

This lets finance keep adding columns without breaking imports: unmapped columns are stored as `raw_json` and surfaced in an “unmapped columns” report.

## 5) Automation processes (finance team friendly)

### 5.1 OS / Collection automation
- Auto compute: `total_invoice_value`, `total_deduction`, `after_tds_balance`, `balance_amount`.
- Ageing buckets: 0–30 / 31–60 / 61–90 / 90+ (by invoice date or due date).
- Follow-up scheduler: next follow-up date based on ageing + client risk.

### 5.2 Payment advice automation
- Generate advice number series.
- Validate bank details, GSTIN, invoice totals, and prevent duplicate advice for same invoice.

### 5.3 Data quality controls (hard rules)
- Dates must be valid and consistent (invoice date ≤ due date ≤ received date).
- Amount columns must be numeric (reject text like “NA” unless mapped as null).
- Unique constraints on invoice number per party + financial year.
- Mandatory fields per template (e.g., bill no, client, invoice date, total invoice value).

## 6) Next implementation step in this repo

1) Choose the **source of truth** templates:
   - `ALL SITE...xlsx` (OS DETAILS)
   - `Bill Details...xlsx` (Tax Invoice + CR Note master + per-client sheets)
   - `Payment_Advice...xlsx` (payment advice)
   - Site/HO expenses + cash book
2) Define the DB schema in `prisma/schema.prisma` for the tables above.
3) Build `/api/finance/import` endpoints to upload Excel, preview mapping, then commit import batch with validation report.

