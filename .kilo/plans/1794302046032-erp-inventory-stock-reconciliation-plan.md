# ERP Inventory / Purchase / Sales / Share — Excel Reconciliation Plan

**File:** `.kilo/plans/1794302046032-erp-inventory-stock-reconciliation-plan.md`
**Status:** Ready for implementation — key decisions resolved; two minor open items remain.

**Resolved decisions**
- Desired outcome: **Report + write-back** (reconcile AND import/correct data into ERP; requires a new store/inventory import endpoint).
- "Share": means **share capital / shareholding register** — a NEW domain not modeled in `schema.prisma`. Needs a new model + import path.
- Purchase/Sales Excel files were **not provided**; purchase/sales reconciliation runs against existing ERP data only (PO/GRN, SalesOrder/Invoice/SalesTaxInvoice) unless the user supplies purchase/sales Excel files.

**Cell contents could not be read** in this session (shell restrictions blocked `unzip`/`cp`/node on paths with `(` `&`). The implementation agent will need `xlsx`/`ExcelJS` (both are dependencies, see `src/app/api/fin/tally-sync/route.ts`) to parse the sheets.

## 1. Goal
Reconcile the stock/register Excel files against the ERP's inventory, purchase, and sales data, identify discrepancies (variances, missing items, unmapped entries), and apply data corrections / code changes (report + write-back).

## 2. Source files (not yet parsed — cell contents not inspected)
Located in `C:\work\erp\fnancialappdata\ERP Inventory\ERP\`:

| File | Size | Likely module | Date on file |
|---|---|---|---|
| `Consumable_Stock_Register_Index_Wise 17.08.2026 (4).xlsx` | 562 KB | Inventory — consumables stock | 17.08.2026 |
| `Item code.docx` | 51 KB | Item master reference | — |
| `Mechanical_Store_Registers_Formats (2).xlsx` | 51 KB | Inventory — mechanical store | — |
| `POWER & MACHINE REGISTER.xlsx` | 10.6 MB | Inventory — equipment (FinEquipment) | — |
| `TOOLS AND TACKELS REGISTER 19.08.2026.xlsx` | 949 KB | Inventory — tools & tackles (FinTool) | 19.08.2026 |

## 3. Target ERP data models (prisma/schema.prisma)

**Inventory / Store**
- `Item` (sku, name, category, uom, costPrice, sellingPrice, trackInventory) — item master
- `FinStoreGrn` / `FinStoreGrnLine` — goods receipt (inventory IN, from PO)
- `FinStoreIssue` / `FinStoreIssueLine` — material issue (inventory OUT/consumption)
- `FinMaterialRequisition` / `FinMaterialRequisitionLine` — requisition (gates issue)
- `FinMaterialReturn` / `FinMaterialReturnLine` — return (inventory IN)
- `FinStockLedger` — running balance per item/warehouse (qtyIn/qtyOut/balanceQty)
- `FinPhysicalVerification` / `FinPhysicalVerificationLine` — book vs physical qty, variance
- `FinMaterialIssue` — WIP posting to jobs
- `FinTool` / `FinToolIssueLog` — tools & tackles register
- `FinEquipment` / `FinEquipmentLog` — power & machine register
- `FinGatePass`, `FinScrapEntry`, `FinBoq` / `FinBoqItem`

**Purchase**
- `FinPurchaseOrder` / `FinPOItem`, `PurchaseOrder`
- `FinVendor`
- `FinMaterialReceipt`, `FinMaterialTrackingItem`
- `FinPurchaseRequisition`, `FinRFQ`, `FinSubcontract`
- `AccountsPayable`

**Sales**
- `SalesOrder` / `SalesOrderItem`, `Invoice` / `Customer`
- `SalesTaxInvoice` / `SalesTaxInvoiceItem`
- `FinInvoice` / `FinClient`, `AccountsReceivable`
- `FinMootBill` (RA bills), `FinTender`

**Share**
- **No Share / shareholding / share-capital model exists.** New domain to add (shareholder, share class, share certificate / register, issued capital).

## 4. Existing import/report patterns to reuse
- `src/app/api/fin/tally-sync/route.ts` — parses `.xlsx` (Purchase/Sales Register, Sundry Debtors/Creditors, Petty Cash) via `xlsx`; creates `FinPurchaseOrder`/`FinInvoice`/`finParty`. Reusable parsing helpers (`excelDateToJS`, `findHeaderRow`, `num`, `str`).
- `src/app/api/sales/orders/import/route.ts` — JSON upsert of SalesOrder by `soNo`.
- `src/app/api/store/grn/route.ts` — GRN create/update with RBAC (`INVENTORY_CREATE/EDIT/DELETE`).
- `src/app/api/store/report/route.ts` — monthly store movement report (received/issued/returned/scrap per item).
- `prisma/schema.prisma` — `FinImportBatch` / `FinImportRow` / `FinImportRowError` audit models exist for import tracking.

## 5. Proposed reconciliation steps (implementation tasks)

**T1. Parse Excel files.** Read each sheet of the 4 xlsx files + the docx item codes; normalize headers (case/whitespace), detect header row, coerce dates/numbers. Capture per-sheet row count and a preview.

**T2. Build item master mapping.** Match Excel item names/codes to `Item.sku`/`Item.name` (and `FinItem.itemCode`/`FinItem.name`). Flag unmapped Excel items. Use `Item code.docx` as the reference for codes.

**T3. Reconcile inventory (stock).**
- Compare Excel stock-on-hand per item vs `FinStockLedger` latest `balanceQty` (and `FinPhysicalVerification.bookQty` vs `physicalQty`).
- Flag qty/value variances per item/warehouse/site.
- Map GRN (receipts) and Issue (consumption) rows to `FinStoreGrn`/`FinStoreIssue` where reference nos match.

**T4. Reconcile purchase (existing ERP data only — no purchase Excel supplied).**
- Review `FinPurchaseOrder`/`FinStoreGrn`/`FinMaterialReceipt` for completeness; flag POs without GRN, short receipts, price variances vs `FinPOItem.unitRate`.

**T5. Reconcile sales (existing ERP data only — no sales Excel supplied).**
- Review `SalesOrder`/`SalesTaxInvoice`/`FinInvoice` for completeness; flag invoices without payment, open vs overdue status.

**T6. Add Share / shareholding domain.** Create Prisma models for shareholder, share class, share certificate/register, issued capital; add migration + seed; build Excel import for share register if a share Excel is supplied later (currently none supplied).

**T7. Produce discrepancy report + change list.** Output per-file: matched, unmatched, variance rows; recommended data corrections (adjustments, new GRN/issue/verification rows) and code changes.

**T8. Build import endpoint.** Add an Excel import route for store/inventory (none currently exists for GRN/issue/item-master bulk import), following the `tally-sync` + `store/grn` patterns with RBAC (`assertPermission`) and `FinImportBatch`/`FinImportRow`/`FinImportRowError` audit. Write back confirmed corrections (GRN/issue/stock-ledger/physical-verification adjustments).

## 6. Risks / assumptions
- Two item masters exist (`Item` store-side vs `FinItem` finance-side). Mapping between them must be explicit; do not assume codes match.
- `FinStockLedger.balanceQty` is a running balance; reconciliation must use the latest entry per item/warehouse, not a snapshot column.
- Excel files may contain merged cells, header rows, totals, and date serials — parsing must skip totals/opening/closing rows (pattern in `tally-sync` `parseRegister`).
- No purchase/sales Excel was supplied, so purchase/sales are validated against ERP internal consistency only (no external source to diff against).

## 7. Open items (for implementation agent / user to confirm at execution)
1. **Site/warehouse scope**: which `FinSite`/`Warehouse` do the Excel registers belong to? Needed to filter `FinStockLedger`/`FinStoreGrn`/`FinStoreIssue`.
2. **Purchase/Sales Excel files**: confirm whether additional purchase/sales register Excel files exist to reconcile; if not, T4/T5 run as internal-consistency reviews only.

## 8. Validation
- Run `tsc` (typecheck) and `npm run lint` (if configured) after any code changes.
- Run `prisma validate` / `prisma migrate` for the new Share models.
- Discrepancy report must reconcile to zero unexplained variance, or every variance must have a documented reason.
- Any import endpoint must be covered by RBAC checks (`assertPermission`) and `FinImportBatch` audit rows.
