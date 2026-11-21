---
name: item-code-generator
description: Use when creating or auditing items on VoltCore ERP's Item Code Generator (Item Master) — auto-generating item codes (CON-001, P&M-001, T&T-001), seeding the Item Code Master Register from "Item code.docx", adding register categories, or fixing item-code format mismatches. Covers the category prefix master, the running-number rule, and the exact API/DB flow.
---

# Item Code Generator — Item Code Master Register

Source of truth register: `C:\work\erp\fnancialappdata\ERP Inventory\ERP\Item code.docx`
Implementation: `src/lib/auto-number.ts` (`nextItemCode`), `src/app/api/fin/items/route.ts`, `src/components/erp/fin-items.tsx`, Prisma model `FinItem` / `FinItemCategory` (`prisma/schema.prisma`).

## Golden rules

1. Item codes are **always generated server-side** — the user only picks a **Category**; the system assigns `<PREFIX>-<NNN>` (3-digit running number). Never type a code by hand into the form.
2. Format: `PREFIX` + `-` + running number, e.g. `CON-001`, `P&M-001`, `T&T-001`. The number is the **highest existing suffix + 1**; gaps from deletes are never reused.
3. Codes are **immutable** after creation (PRs / GRNs / stock ledger reference them). To retire an item, deactivate it — don't edit the code.
4. Uncategorised items fall back to the `ITM-` series (`ITM-001`…).
5. Category prefixes are 2–4 chars, A–Z / 0–9 / `&` (e.g. `P&M`, `T&T` are valid).

## Item Code Master Register (from the docx)

| Category | Prefix | Item Code | Item Name | Specification | Make/Brand | Model No. | Size/Capacity | Description | Unit |
|---|---|---|---|---|---|---|---|---|---|
| Consumable | CON | CON-001 | Welding Electrode | E7018 Low Hydrogen | ESAB | OK 48.00 | 4 mm | Welding Consumable | Kg |
| Power & Machine | P&M | P&M-001 | Grinding Machine | Electric Hand Grinder | Bosch | GWS 900-100 | 900 W | Power Tool | Nos |
| Tools & Tackles | T&T | T&T-001 | Chain Block | Manual Chain Pulley Block | Vital | CB-5T | 5 Ton | Lifting Tool | Nos |
| PPES | PPE | PPE-001 | Safety Shoe | Steel Toe | Allen Cooper | AC-01 | Size-8 | Foot Protection | Pair |
| Gas | GAS | GAS-001 | Oxygen Cylinder | Industrial Oxygen | INOX | OXY-01 | 7 Cum | Gas Cutting & Welding | Nos |
| Gas | GAS | GAS-002 | DA Cylinder | Dissolved Acetylene | Linde | DA-01 | 6 Cum | Gas Cutting | Nos |
| Gas | GAS | GAS-003 | Argon Cylinder | Pure Argon 99.99% | Linde | AR-01 | 7 Cum | GTAW Welding | Nos |
| Gas | GAS | GAS-004 | CO₂ Cylinder | Industrial CO₂ | INOX | CO2-01 | 22 Kg | MIG Welding | Nos |

## Category Dropdown List

1. Consumable  2. Power & Machine  3. Tools & Tackles  4. PPES  5. Gas
6. Electrical  7. Welding Equipment  8. Measuring Instrument  9. Lifting Equipment  10. Safety Equipment

## Category Prefix Master

| Category | Prefix |
|---|---|
| Consumable | CON |
| Power & Machine | P&M |
| Tools & Tackles | T&T |
| PPES | PPE |
| Gas | GAS |
| Electrical | ELE |
| Welding Equipment | WEL |
| Measuring Instrument | MIN |
| Lifting Equipment | LFT |
| Safety Equipment | SAF |

## Auto-generated examples

CON-001…003 (Consumable) · GAS-001…002 (Gas) · PPE-001…002 (PPES) · T&T-001…002 (Tools & Tackles) · P&M-001…002 (Power & Machine)

`CON-001 = Consumable` · `P&M-001 = Power & Machine` · `T&T-001 = Tools & Tackles` · `PPE-001 = PPE Item` · `GAS-001 = Gas Cylinder` · `ELE-001 = Electrical Item` · `WEL-001 = Welding Equipment` · `MIN-001 = Measuring Instrument` · `LFT-001 = Lifting Equipment` · `SAF-001 = Safety Equipment`

User-facing behaviour (Hindi): *sirf Category select karenge, aur us category ke hisab se Item Code generate hoga; Item Name, Specification, Brand, Model, Capacity, Description aur Unit details uske saamne maintain kar sakenge.*

## How to generate / create (in this repo)

1. **Form (UI)** — Finance › Item Code Generator → *New Item*: pick Category, fill Item Name / Specification / Make/Brand / Model No. / Size/Capacity / Description / Unit (+ HSN, Reorder Level, Rate, Status). Code shows as "Auto-generated"; server assigns it on save.
2. **API** — `POST /api/fin/items` with `categoryId` and **blank/omitted `itemCode`**; response `data.itemCode` carries the assigned code (e.g. `CON-001`). Categories: `GET/POST /api/fin/item-categories` (code regex `^[A-Z0-9&]{2,4}$`).
3. **Preview only** — `GET /api/fin/items/next-code?categoryId=<id>` returns `{ code, prefix, categoryCode, categoryName }` for the code the next save will get (no `categoryId` = the `ITM-` fallback series). It is only a preview: the server re-generates and re-checks the number at create time.
4. **Code** — reuse `nextItemCode(db, categoryCode)` from `src/lib/auto-number.ts`; wrap creates in `withCodeRetry(...)`. Never re-implement the counter.
5. **Seed / rebuild the whole register** — `npm run item:register` (dry preview: `npm run item:register:dry`, or `node scripts/generate-item-register.mjs`). Ensures the 4 register columns, upserts the Category Prefix Master, seeds the docx sample items with auto-generated codes, and enumerates every tenant DB from the superadmin `Tenant` registry + `DATABASE_URL`. Idempotent — existing items and categories are skipped, never renumbered.

## Gotchas

- Local dev DB historically has `SAF = 'Safety'` (legacy) and `ELC = 'Electrical'`; the docx master uses `SAF = 'Safety Equipment'` and `ELE = 'Electrical'`. `ELE` insert fails on the name UNIQUE clash until someone renames/merges — do **not** auto-delete or renumber legacy categories.
- Existing items may carry 4-digit codes (`ELC-0001…`) from before the docx alignment; new codes use 3 digits. Both parse fine (`^\d+`), never rewrite existing codes.
- Tenant DBs get schema changes via idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS` scripts enumerated from the superadmin `Tenant` registry — see `scripts/migrate-finitem-register-fields.mjs` for the pattern.
- `prisma generate` fails with EPERM while `next dev` is running — stop the dev server first.
