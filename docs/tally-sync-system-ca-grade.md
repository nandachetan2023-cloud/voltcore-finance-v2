# Tally Sync System — CA-Grade Design (20-Year Chartered Accountant Perspective)

**ERP VoltCore — Finance Purchase & Sales → Tally Prime / ERP 9**
**Author: Muse Spark (CA 20Y lens) — 27 Aug 2026**
**Status: Design — Ready to implement**

---

## 1. Executive Summary (What a CA Will Sign)

Current Tally sync is **two disjoint scripts** (Excel → ERP `tally-sync`, ERP → Tally `tally-export`) with no FY lock, no double-entry validation, no GST/TDS ledgers, random voucher nos, and no trial-balance reconciliation. A 20Y CA **would qualify** under SA 315 / CARO and refuse to file GSTR-1/3B or 26Q.

This design makes Tally the **faithful mirror** of ERP’s **posted** books — FY-locked, sequentially numbered, double-entry balanced, GST/TDS compliant, cost-centre tagged, maker-checker controlled, and fully reconciled. Every voucher that hits `FinJournalEntry(status=Posted)` or `FinInvoice(status!=Draft)` has a **deterministic, idempotent, auditable** Tally `VOUCHER` with `AlterID` back-link.

**Guarantee:** `Σ FinJournalLine(debit-credit) by FinAccount` == Tally Trial Balance (within rounding) for any FY+Company, or sync is `Failed` and blocks FY close.

---

## 2. What Purchase & Sales Really Mean to a CA

### 2.1 Purchase Cycle — From Requisition to GR/IR Clearing

```
PR (budget, non-accounting) → RFQ (commercial) → PO (FinPurchaseOrder + FinPOItem, site/job/costCenter mandatory, revisioned)
  → GRN (FinStoreGrn, site/job, qtyAccepted*rate, increments FinPOItem.receivedQty) → 3-Way Match
  → Vendor Bill (AccountsPayable, tax lump) → TDS (FinTdsDeduction 194C 1%/2%, 194J 10%)
  → Payment (FinPaymentAdvice → BankTransaction) → Retention (5% DLP)
  → GL: JE-AP (Dr Inventory 1005 / Cr Vendor Payable 2001, + GST Payable 2002, TDS Payable 2003)
```

**CA hotspots:** Two PO tables (`FinPO` vs `FinPurchaseOrder`) — deprecate `FinPO`; `taxAmount` lump must split CGST/SGST/IGST per `Item.hsnSacCode` + `FinParty.state` vs `FinSite.state`; `INVENTORY` vs `Purchase Account` mapping by `Item.category`; `bgAmount` verification; `site/job/costCenter` mandatory already — good.

### 2.2 Sales Cycle — From Tender to Receipt Allocation

```
Tender (FinTender) → Opportunity (FinOpportunity, winProb) → Quotation (QT) → SalesOrder (SO)
  → RA Bill (FinMootBill, workPercent) → Tax Invoice (FinInvoice, FinSite/job/poNo/costCenter, GST split, deductions)
  → Credit Note (FinCreditNote, reversal) → Receipt (FinReceipt / FinPayment, allocation) → AR Ageing
  → GL: JE-AR (Dr AR 1004 / Cr Project Revenue 4001, + Output GST, - TDS Receivable)
```

**CA hotspots:** Legacy `SalesTaxInvoice` vs `FinInvoice` — GSTR-1 must read `FinInvoice`; `grandTotal` includes GST — P&L must credit `taxableValue` to `4001`, GST to `2002`; `FinCreditNote` has no GST split/TDS reversal; `FinReceipt.invoiceRef` free-text → unallocated cash; `Float` rounding → use `Decimal(15,2)`.

### 2.3 What Triggers a Tally Voucher (and What Never Should)

| ERP Event | Tally Voucher | Condition | Never Sync |
|---|---|---|---|
| `FinPurchaseOrder` created | *Nothing* | PO is order, not accounting | PR, RFQ |
| `FinStoreGrn` Posted | **Receipt Note** (inventory) + `Journal` (GR/IR) | `status=Posted` | Draft/Rejected `qtyAccepted=0` |
| `AccountsPayable` created | **Purchase** | `status=Pending` + GST split | Draft PO |
| `FinPaymentAdvice` Paid | **Payment** | `status=Paid` + TDS deducted | — |
| `FinInvoice` Unpaid/Partially Paid | **Sales** | `status!=Draft/Cancelled` | Quotation, SalesOrder |
| `FinCreditNote` Issued | **Credit Note** | `status=Issued` + linked `invoiceId` same FY | Draft |
| `FinReceipt` / `FinPayment` Received | **Receipt** | allocated to invoice via `BILLALLOCATIONS` | Unallocated |
| `FinJournalEntry` Posted | **Journal/Contra** | `status=Posted` + `totalDebit==totalCredit` | Draft/Reversed |

---

## 3. Design Principles (Non-Negotiable for CA Sign-Off)

1. **FY is law:** Every voucher derives `financialYear` from `invoiceDate/entryDate` (`YYYY-26` for Apr-Mar). No voucher crosses FY. Tally `SVCURRENTCOMPANY` + FY period validated before push; closed FY → `409 FY Locked`.
2. **Sequential, gapless numbering per FY+voucherType:** `INV/25-26/0001`, `PUR/25-26/0001`, `JV/25-26/0001` from DB sequence `FinVoucherSeries(finYear, type, lastNo)`, not `count()+1`. Tally `VOUCHERNUMBER` = ERP number, idempotent on `company+fy+voucherNo+type`.
3. **Double-entry or nothing:** `tally-xml` builders validate `Σ debit == Σ credit` (incl. GST/TDS/Cess/RoundOff/Retention) or throw. `gl-posting` swallowing is removed — export retries or marks `Failed` with unbalanced reason.
4. **GST is not optional:** Every taxable line carries `HSN/SAC`, `placeOfSupply`, `GSTRegistrationType`, `CGST/SGST/IGST/Cess` ledgers (`Input/Output CGST 9%`, `IGST 18%`, `Cess`). `TallyPartyMaster` exports `GSTIN`, `STATE`, `COUNTRY`, `ISBILLWISEON=Yes`, `GSTREGISTRATIONTYPE`.
5. **TDS at source:** `FinParty.tdsSection/Rate` → voucher adds `TDS Payable 2003` (AP) or `TDS Receivable` (AR) ledger; `FinTdsDeduction` created atomically; `26Q` ready. Invalid PAN → `20%` + warning.
6. **Cost centre on every ledger line:** `COSTCENTREALLOCATIONS.LIST` with `jobCode/costCenter/department/projectManager/siteCode` for job-wise P&L vs Tally.
7. **Maker-Checker + RBAC:** `assertPermission` on every export/commit, `INVENTORY_CREATE`→`GL_CREATE` hierarchy, `FinSodRule` blocks self-approval, `Auditor` readOnly.
8. **Immutable audit:** `FinTallySync` non-deletable, `createdBy/approvedBy`, `companyName/fiscalYear/hash/alterID/duration`, `responseXml` full (not 2000 chars), `BILLALLOCATIONS` for ageing.

---

## 4. Architecture

### 4.1 Components

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  ERP Events         │────▶│  Tally Sync Engine   │────▶│  Tally Prime    │
│  (FinInvoice, JE,   │     │  (tally-sync-engine) │     │  :9000 XML      │
│   AP, GRN, Payment) │     │  + FinVoucherSeries  │     │  Company+FY     │
│                     │     │  + FinTallyVoucher   │     │                 │
└─────────────────────┘     └──────────────────────┘     └─────────────────┘
         ▲                           │                           │
         │                    ┌──────┴──────┐              ┌─────┴─────┐
         └────────────────────│  FinTallySync (log) + FinTallyVoucher (link) │◀─────┘ Trial Balance
                              └─────────────┘              └───────────┘ Reconcile
         Triggers: Manual (UI) | Scheduled (cron, SyncConfig) | On-Approve (JE Posted)
```

### 4.2 New / Changed Prisma Models

```prisma
model FinVoucherSeries {
  id        Int      @id @default(autoincrement())
  finYear   String   // "2025-26"
  type      String   // "Sales"|"Purchase"|"Payment"|"Receipt"|"Journal"|"Contra"|"Credit Note"
  lastNo    Int      @default(0)
  @@unique([finYear, type])
}

model FinTallyVoucher {
  id              Int      @id @default(autoincrement())
  finYear         String
  voucherNo       String
  voucherType     String
  companyName     String
  erpRefType      String   // "FinInvoice"|"AccountsPayable"|"FinJournalEntry"
  erpRefId        Int
  tallyAlterID    String?  // from Tally <ALTERID>
  tallyMasterID   String?
  hash            String   // SHA256 of canonical XML
  status          String   // "Pending"|"Sent"|"Acked"|"Failed"|"Voided"
  jsonPayload     Json?
  responseXml     String?  @db.Text
  createdBy       String?
  createdAt       DateTime @default(now())
  @@unique([companyName, finYear, voucherType, voucherNo])
  @@index([erpRefType, erpRefId])
  @@index([companyName, finYear])
}

model FinTallySync {
  // extend existing:
  direction     String   @default("Export") // "Export"|"Import"
  companyName   String?
  finYear       String?
  voucherType   String?
  trigger       String?  // "manual"|"scheduled"|"onApprove"
  hash          String?
  alterID       String?
  actorEmail    String?
  actorIp       String?
  durationMs    Int?
  // make rawJson Json, add retry fields
  attemptCount  Int      @default(0)
  nextRetryAt   DateTime?
  reconciled    Boolean  @default(false)
  reconciledAt  DateTime?
  // existing: fileName, totalRows, createdRows, errorRows, status, log, etc. → make immutable (no DELETE)
}
```

Add to `FinJournalEntry`, `FinInvoice`, `AccountsPayable` etc. a `tallyStatus` enum for quick filter if needed, but `FinTallyVoucher` is source.

### 4.3 Tally XML Corrections (tally-xml.ts)

- `buildLedgerMasterXml`: `PARENT` by `partyType`, `ISDEEMEDPOSITIVE` = `parent==Sundry Creditors ? Yes : No`, tags `GSTIN`, `INCOMETAXNUMBER`, `STATE`, `LEDSTATENAME`, `GSTREGISTRATIONTYPE`, `COUNTRYNAME`, `ISBILLWISEON`, `COSTCENTRE` handling via `LEDGERMAILINGDETAILS`.
- `invoiceToTallyVoucher`: per-line `HSN/SAC`, split `Output/Input CGST/SGST/IGST/Cess`, add `TDS` ledger, `RoundOff`, `Retention`, `BILLALLOCATIONS.LIST` (`New Ref` for invoice, `Agst Ref` for payment), `GSTCLASS`, `PLACEOFSUPPLY`, `COSTCENTREALLOCATIONS` per ledger line, voucher type = `Sales` always (never `Receipt`).
- `paymentToTallyVoucher`: detect `isReceipt` (AR) → `Receipt` else `Payment`, `BANKALLOCATIONS` (`INSTRUMENTNUMBER/DATE/BANKNAME/TRANSACTIONTYPE`), `LEDGERENTRIES` with `BILLALLOCATIONS`.
- `journalEntryToTallyVoucher`: include `COSTCENTREALLOCATIONS` per `FinJournalLine.jobCode/costCenter`, validate `totalDebit==totalCredit`.
- New `creditNoteToTallyVoucher`, `receiptNoteToTallyVoucher` (GRN), `contraToTallyVoucher`.
- Envelope `REPORTNAME='Vouchers'` for vouchers, `'All Masters'` for masters, `buildCombinedBatchXml` = masters then vouchers.

### 4.4 Tally Client (tally-client.ts)

- Parse `CREATED/ALTERED/REJECTED/ERRORS` counts from response, not `ERROR` substring. Store full `rawXml` (Text), extract `ALTERID`/`MASTERID` per `TALLYMESSAGE`.
- `http` + optional `https` with `TALLY_API_KEY` header, allow-list `TALLY_HOST`, timeout `TALLY_TIMEOUT`.
- Retry 3× exponential backoff, idempotency via `FinTallyVoucher.hash`.
- `testTallyConnection` also fetches `List of Companies` + `Books Beginning From` to validate FY.

---

## 5. API Design

### 5.1 Export — Manual (Existing, Hardened)

```
POST /api/fin/tally-export
Body: { companyName: string, actions: ("parties"|"invoices"|"payments"|"journal"|"grn"|"creditNotes")[], since?: ISO, finYear?: "2025-26", dryRun?: boolean }
RBAC: assertPermission(..., "GL_CREATE" or "AR_CREATE"/"AP_CREATE" per action, siteCode) + FINANCE_MGR/DIRECTOR or FIN_EXEC with site scope
Steps:
  1. Validate finYear derived from since or current FY, check company FY open via testTallyConnection.
  2. Pull ERP records where tallyStatus != "Acked" and date in FY, with GST/TDS joins.
  3. Allocate voucherNo from FinVoucherSeries(finYear,type) if missing (gapless).
  4. Build XML via corrected builders (with cost centres, GST, TDS, BILLALLOCATIONS).
  5. sendToTally (idempotent by hash), parse CREATED/ALTERED, store FinTallyVoucher + FinTallySync(direction=Export, trigger=manual, companyName, finYear, alterID, hash, actorEmail).
  6. On success, update erpRef.tallyStatus="Acked".

GET /api/fin/tally-export -> connection alive + counts (m masters, n unexported vouchers per type/fy)
```

### 5.2 Scheduled (New)

```
GET /api/fin/tally-auto?dryRun=1   (cron, Vercel Cron or node-cron)
- Reads SyncConfig where module="tally-export" and autoSync=true and enabled
- For each company in Tenant.companySettings (or single), finYear = current FY
- since = last FinTallySync(finYear, companyName, status=Completed).syncedAt
- Calls internal tally-export POST with trigger=scheduled, actions from config
- Logs FinTallySync(trigger=scheduled)

SyncConfig record:
  module: "tally-export"
  enabled: bool, autoSync: bool, syncInterval: cron "0 2 * * *" (2am), endpoint: "tally:9000", authKey, companyName, finYear
```

### 5.3 On-Approve (New Hook)

In `src/app/api/journal-entries/approve/route.ts:97` after `status=Posted`:
```ts
if (updated.status === "Posted") await autoPushSingle("FinJournalEntry", updated.id, { trigger:"onApprove", actor: actorEmail });
```
Similarly in `src/app/api/fin/invoices/route.ts` after `postJournalEntry` on `FINANCE_MGR` approve, and `src/app/api/fin/payments/route.ts` after `Payment Center` commit. Helper:

```ts
// src/lib/tally-sync-engine.ts
export async function autoPushSingle(refType: string, refId: number, opts: {trigger:string, actor:string}) {
  const cfg = await db.syncConfig.findUnique({where:{module:"tally-export"}});
  if (!cfg?.autoSync) return; // respect toggle
  // build single voucher XML + send + log (same as export but single)
}
```

### 5.4 Import (Tally → ERP) — Hardened, Not Removed

Keep `tally-sync` Excel path but:
- Require `finYear` + `companyName` in upload, validate FY.
- Parse GST columns (CGST/SGST/IGST/Cess, HSN, placeOfSupply), compute `taxableValue`.
- Validate `TALLY_HOST` allow-list, `assertPermission(..., "Admin")` (not open).
- Create `FinTallySync(direction=Import)` + `FinTallyVoucher` per row.
- Call `postJournalEntry` for every imported invoice/AP so `FinJournalEntry` balances.
- Replace `siteId:1` with form field `siteId`, `jobCode` mandatory; remove `Math.random()` voucher — use `FinVoucherSeries`.

### 5.5 Reconciliation

```
GET /api/fin/tally-reconcile?finYear=2025-26&company=VEC
- Fetches Tally Trial Balance via EXPORTDATA <Trial Balance>,
- Compares Σ FinJournalLine by FinAccount.accountCode vs Tally ledger balances,
- Returns { matched:bool, diffs: [{accountCode, erp:123, tally:120, diff:3}], erpTBHash, tallyTBHash }
- Writes FinTallySync(reconciled=true, reconciledAt)

POST /api/fin/tally-reconcile {finYear, companyName} -> triggers above
UI: "Reconcile" button in tally-sync page, red diff table blocks FY close if diff !=0.
```

---

## 6. UI (Finance › Tally Sync)

New tab in `src/components/erp/finance.tsx` or dedicated `src/components/erp/tally-sync.tsx`:

- **Connection card:** `host:port`, `alive`, `company` dropdown (from `testTallyConnection` → companies), `FY` selector, `Test` button.
- **Export card:** checkboxes `Masters (Debtors/Creditors) | Sales (Invoices) | Purchase (Bills) | Payments | Journals | GRN | Credit Notes`, `Since` date, `FY` badge, `Dry Run` → preview XML (first 2 vouchers), `Push to Tally` → progress + `CREATED/ALTERED/REJECTED` counts.
- **Auto card:** toggles `Enable Tally Sync`, `Auto on Approve`, `Scheduled (cron 0 2 * * *)`, `Company`, `FY`.
- **History table:** `FinTallySync` (direction, trigger, company, fy, voucherType, rows, status, actor, duration, alterID, log, responseXml expand).
- **Reconcile card:** `FY + Company` → `Trial Balance Diff` table, `Reconcile` button, `Last reconciledAt`.

RBAC: `FINANCE_MGR`/`DIRECTOR` can push; `FIN_EXEC` can dry-run; `AUDITOR` readOnly.

---

## 7. GST / TDS / Cost Centre — CA Compliance Matrix

| Statute | ERP Field | Tally Ledger | XML | Report |
|---|---|---|---|---|
| **GSTR-1** | `FinInvoice.taxableValue + cgst/sgst/igst/cess + hsnSac + placeOfSupply + isReverseCharge` | `Output CGST/SGST/IGST + Cess` | per-line `GSTCLASS` + `BILLALLOCATIONS` | `gst-tds-register?type=gst-sales` sums taxable+tax per FY |
| **GSTR-3B** | `outputTax (FinInvoice) - itc (AP Bill tax, not PO)` | `GST Payable 2002`, `Input CGST/SGST/IGST` | separate ledgers | netPayable |
| **GSTR-2B ITC** | `AP Bill` (not PO) `subtotal/tax` from `FinParty.gstin` | `Input CGST/SGST/IGST` | IGST vs CGST/SGST by state | itcAvailable |
| **TDS 26Q** | `FinParty.tdsSection/Rate` → `FinTdsDeduction` | `TDS Payable 2003`, `TDS Receivable` | `TDSDEDUCTABLE` ledger | `tds-register` by section |
| **Job Costing** | `FinJob.budget + jobCode/costCenter/department/projectManager/siteId` | `COSTCENTREALLOCATIONS` per ledger | per-line | `report-drilldown` vs Tally Cost Centre Summary |

---

## 8. Voucher Numbering & FY

- `FinVoucherSeries(finYear, type)` row locked `SELECT FOR UPDATE` on allocate.
- Number: `<Prefix>/<FY>/<NNNN>` e.g. `INV/25-26/0042`, `PUR/25-26/0019`, `JV/25-26/0103`.
- `Prefix` per `voucherTypeName` (`INV→Sales`, `PUR→Purchase`, etc.) — not shared.
- Idempotency: `FinTallyVoucher@@unique([companyName, finYear, voucherType, voucherNo])` + `hash` of canonical voucher JSON; re-push with same hash → `ALTERED` not `CREATED`, no duplicate.
- FY derived: `finYear = invoiceDate.getMonth()>=3 ? year+"-"+(year+1-2000) : (year-1)+"-"+(year-2000)` (Apr-Mar).

---

## 9. Security, RBAC, Audit

- Every `/tally-*` route calls `assertPermission(pdb, actor, "Admin" or "GL_CREATE", {siteCode})` — no open Excel commit.
- `Auditor` (`readOnly=true`) can only `GET` + `dryRun`.
- `FinSodRule`: `FIN_EXEC` cannot be `FINANCE_MGR` on same `siteCode` for Tally push.
- `FinTallySync` immutable — `DELETE` removed, add `isDeleted=false` + `reversedBy`.
- `FinAccessAuditLog` logs every `Export/Scheduled/OnApprove` with `ip`, `actorEmail`, `entityId=company:fy:voucherNo`, `success`, `hash`.
- `SyncConfig` per `company+finYear`, not global.

---

## 10. Implementation Plan (Files)

**Phase 1 — Fix & Harden (P0, 1 sprint):**
- `prisma/schema.prisma`: add `FinVoucherSeries`, `FinTallyVoucher`, extend `FinTallySync` (direction, companyName, finYear, hash, alterID, actor, direction), add `tallyStatus` to `FinInvoice/JE` optional.
- `src/lib/tally-xml.ts`: fix `ISDEEMEDPOSITIVE`, tags, GST, TDS, cost centre, bill allocations, new builders (`creditNote`, `grn`).
- `src/lib/tally-client.ts`: parse `CREATED/ALTERED/REJECTED`, hash, retry, FY validation.
- `src/app/api/fin/tally-export/route.ts`: fix combined batch bug, FY filter, idempotency, journal support, RBAC.
- `src/components/erp/module-registry.tsx` + `src/store/erp-store.ts`: already fixed `fin-assets` exclusion — keep.

**Phase 2 — Auto (P0/P1):**
- `src/lib/tally-sync-engine.ts` (new): `buildAndPushSingle`, `pushBatch`, `allocateVoucherNo`, `deriveFinYear`.
- `src/app/api/journal-entries/approve/route.ts`, `src/app/api/fin/invoices/route.ts`, `src/app/api/fin/payments/route.ts`: add `autoPushSingle` hook after Posted.
- `src/app/api/fin/tally-auto/route.ts` (new): scheduled cron, reads `SyncConfig`.
- `src/app/api/fin/sync-config/route.ts`: add `companyName`, `finYear` fields.

**Phase 3 — Reconcile & UI (P1/P2):**
- `src/app/api/fin/tally-reconcile/route.ts` (new): trial balance compare.
- `src/components/erp/tally-sync.tsx` (new) + wire into `src/components/erp/finance.tsx` tabs.
- `src/app/api/fin/tally-sync/route.ts`: harden import (FY, GST, GL posting, site/job mandatory, permission).

**Phase 4 — GST/TDS Deep (P1):**
- `src/app/api/fin/gst-tds-register/route.ts`: source ITC from `AP Bill` not PO, add `cess`, `RCM`, `composition`.
- Add `eInvoice` fields (`irn`, `ackNo`) to `FinInvoice` + export.

---

## 11. Test Plan (CA Would Demand)

- **Unit:** `tally-xml` 20 vouchers × GST types (intra 9+9, inter 18, exempt, RCM, composition, cess, TDS 1%/2%/10%, retention 5%, roundOff) → `Σ debit == Σ credit`.
- **Integration:** `sendToTally` mock Tally HTTP 9000, assert `CREATED=5, ALTERED=1, REJECTED=0`, `AlterID` stored.
- **Idempotency:** Push same `INV/25-26/0001` twice → second is `ALTERED`, no duplicate in Tally.
- **FY:** Push `31-03-2026` vs `01-04-2026` → different `FinVoucherSeries`, `finYear` `25-26` vs `26-27`.
- **RBAC:** `custodian@test.com` (no `GL_CREATE`) → `403` on export; `Auditor` → `403` on push, `200` on dryRun.
- **Reconcile:** Create 10 `FinInvoice` + 5 `AP` + 5 `Payments` → Tally export → `tally-reconcile` → `diff=0` or `Failed`.
- **Schedule:** Set `SyncConfig autoSync=true, interval 0 * * * *` → `tally-auto` cron picks `since=lastSync`.
- **On-Approve:** `POST /journal-entries/approve {action:approve}` → `FinTallyVoucher(trigger=onApprove)` created.

---

## 12. What to Do Next

Want me to **build Phase 1** now (schema + tally-xml + tally-export + reconcile skeleton) and verify with `npx tsc` + `smoke.mjs` + `testTallyConnection` against your Tally on `localhost:9000`? Or start with Phase 2 Auto hooks?

*This doc is the CA sign-off checklist — nothing pushes to Tally until Voucher is balanced, FY-locked, sequentially numbered, GST/TDS tagged, cost-centred, and audit-logged.*

