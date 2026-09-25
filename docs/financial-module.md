# Financial Module Documentation

---

## Overview
The financial module is the backbone of the ERP system’s accounting capabilities. It provides end‑to‑end handling of invoices, payments, expense claims, purchase orders, and reporting while respecting multi‑tenant, role‑based security.

---

## Architecture Diagram
```
+-------------------+        HTTP/REST        +----------------------+        Prisma Client (ORM)        +-----------------+
|   User Interface  | ─────────────────────▶ |   API Routes (Next.js) | ─────────────────────────────▶ |   PostgreSQL   |
|   (React / TSX)   |                         |   (src/app/api/fin)   |                                 |   (Database)   |
+-------------------+                         +----------------------+                                 +-----------------+
                         ▲
                         │
                Role‑based cookie auth & tenant routing
``` 

- **User Interface**: React/TSX components under `src/components/erp/*`.
- **API Layer**: Next.js API route handlers (`src/app/api/fin/*`).
- **Prisma Client**: Generated ORM that maps the **Fin‑prefixed** models to PostgreSQL tables.
- **Database**: Normalized relational schema with strong foreign‑key constraints and indexes for high‑frequency financial queries.

---

## Core Entity Models (Prisma)
The schema defines **76 Fin‑prefixed models** that represent the financial domain. The most frequently interacted models are:

| Model | Description |
|-------|-------------|
| **FinAccount** | Chart of Accounts (COA) header. |
| **FinJournalEntry** | Journal voucher header with site tagging and approval workflow. |
| **FinJournalLine** | Journal voucher lines with `jobCode`, `costCenter`, `projectManager` tagging. |
| **FinInvoice** | Sales invoice header. |
| **FinInvoiceItem** | Line items belonging to a `FinInvoice`. |
| **FinCreditNote** | Credit adjustments against invoices. |
| **FinPurchaseOrder** | Vendor purchase order header. |
| **FinPurchaseOrderItem** | Items within a purchase order. |
| **FinParty** | Business party (customer, vendor, etc.). |
| **FinSite** | Physical or logical site associated with a party. |
| **FinExpenseClaim** | Employee‑submitted expense claim. |
| **FinExpenseItem** | Individual expense line within a claim. |
| **FinPettyCash** | Small‑ticket cash transactions with bill upload support. |
| **FinApprovalLog** | Unified approval workflow supporting expense claims, payment advices, and journal entries. |
| **FinTdsDeduction** | TDS deduction tracking for compliance. |
| **SalesTaxInvoice** | GST sales invoice with HSN/SAC and tax calculation. |
| **ProfitLossEntry** | P&L data for site/job-wise profitability. |

> **Note:** Older names such as `Invoice`, `WorkOrder`, or `PurchaseOrder` without the `Fin` prefix exist only for legacy migrations and are **not** part of the public API.

> **Enhancement:** `FinJournalLine` now supports `jobCode` and `projectManager` fields for Job Wise P&L and accountability. `FinPettyCash` now supports `billAttachmentPath` for direct bill uploads. `FinApprovalLog` now supports Journal Entry approvals.

---

## API Endpoints
| Endpoint | Purpose |
|----------|---------|
| **/api/fin/invoices** | CRUD operations for `FinInvoice` and `FinInvoiceItem`. |
| **/api/fin/payment‑advices** | Create and manage vendor payment advices (`FinPaymentAdvice`). |
| **/api/fin/site‑expenses** | Retrieve expenses grouped by `FinSite`. |
| **/api/fin/expense‑claims** | CRUD for employee expense claims (`FinExpenseClaim`). |
| **/api/fin/purchase‑orders** | Manage purchase orders (`FinPurchaseOrder`). |
| **/api/fin/financial‑reports** | Generate P&L, balance‑sheet, and tax reports. |
| **/api/fin/import/*** | Bulk import endpoints for Excel/CSV data (invoices, expenses, etc.). |

*Removed:* `/api/fin/work-orders` – there is no `FinWorkOrder` model.

---

## Security
Authentication is performed via **cookie‑based tenant routing**. A signed session cookie carries the tenant identifier and the user’s role (e.g., `admin`, `accountant`, `viewer`). All API handlers verify the cookie, resolve the tenant context, and enforce role‑based access control before any database operation.

---

## Next Steps for Development
1. **Finalize Import Templates** – Confirm the set of Excel templates that map to `FinImportBatch`/`FinImportRow`.
2. **Add Missing API Routes** – If additional claim types are needed, scaffold new route files under `src/app/api/fin/`.
3. **Integrate Reporting UI** – Wire `FinReportSnapshot` data into the finance dashboard components (`src/components/erp/finance-dashboard.tsx`).
4. **Run Data Quality Checks** – Schedule periodic jobs to validate `FinInvoice` balances and reconcile `FinBankStatement` entries.
5. **Update Documentation** – Keep this file in sync whenever new `Fin*` models or endpoints are added.
6. **Leverage New Tagging Fields** – Update `FinJournalLine` creation forms to capture `jobCode`, `costCenter`, and `projectManager` for Site/Job/Department-wise P&L.
7. **Petty Cash Bill Upload** – Update `FinPettyCash` UI to support `billAttachmentPath` uploads.
8. **Journal Entry Approval** – Wire `FinApprovalLog` to `FinJournalEntry` for approval workflows on JVs.

---

*Generated with Claude Code*