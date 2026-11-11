// Build the Item Code Master Register (from "Item code.docx") in every tenant DB,
// obeying the same rules the app uses (src/lib/auto-number.ts#nextItemCode):
//
//   • code = <PREFIX>-<NNN>, next = highest existing suffix for that prefix + 1
//     (3-digit pad), never reusing a code freed by a delete
//   • codes immutable & unique (FinItem.itemCode is UNIQUE) — existing rows are
//     never rewritten or renumbered by this script
//   • uncategorised series falls back to ITM-###
//   • idempotent: an item whose (category, name, specification) already exists
//     is skipped, so re-running seeds nothing twice
//
// What it does, per database (superadmin Tenant registry + DATABASE_URL):
//   1. Ensures the four register columns exist on FinItem (idempotent ALTER)
//   2. Upserts the Category Prefix Master (CON, P&M, T&T, PPE, GAS, ELE, WEL,
//      MIN, LFT, SAF) — existing categories win, nothing is renamed/deleted
//   3. Seeds the register's sample items with auto-generated codes
//
//   node scripts/generate-item-register.mjs            # apply
//   node scripts/generate-item-register.mjs --dry-run  # print what would happen
//
//   With tenants: SUPERADMIN_DATABASE_URL="postgres://..." node scripts/generate-item-register.mjs
import pg from 'pg';
import fs from 'fs';
import path from 'path';

// Load .env (no dependency) for anything not already set in the environment.
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
} catch { /* .env optional */ }

const DRY_RUN = process.argv.includes('--dry-run');

const COLUMN_STATEMENTS = [
  `ALTER TABLE "FinItem" ADD COLUMN IF NOT EXISTS "specification" TEXT`,
  `ALTER TABLE "FinItem" ADD COLUMN IF NOT EXISTS "makeBrand" TEXT`,
  `ALTER TABLE "FinItem" ADD COLUMN IF NOT EXISTS "modelNo" TEXT`,
  `ALTER TABLE "FinItem" ADD COLUMN IF NOT EXISTS "sizeCapacity" TEXT`,
];

// Category Prefix Master (docx)
const CATEGORY_MASTER = [
  ['CON', 'Consumable'], ['P&M', 'Power & Machine'], ['T&T', 'Tools & Tackles'],
  ['PPE', 'PPES'], ['GAS', 'Gas'], ['ELE', 'Electrical'],
  ['WEL', 'Welding Equipment'], ['MIN', 'Measuring Instrument'], ['LFT', 'Lifting Equipment'],
  ['SAF', 'Safety Equipment'],
];

// The register's sample items — codes assigned by the series, not taken from
// the docx blindly (a fresh DB lands exactly on the docx: CON-001…GAS-004).
// [categoryCode, preferredCode, name, specification, makeBrand, modelNo, sizeCapacity, description, uom]
const REGISTER_ITEMS = [
  ['CON', 'CON-001', 'Welding Electrode', 'E7018 Low Hydrogen', 'ESAB', 'OK 48.00', '4 mm', 'Welding Consumable', 'Kg'],
  ['P&M', 'P&M-001', 'Grinding Machine', 'Electric Hand Grinder', 'Bosch', 'GWS 900-100', '900 W', 'Power Tool', 'Nos'],
  ['T&T', 'T&T-001', 'Chain Block', 'Manual Chain Pulley Block', 'Vital', 'CB-5T', '5 Ton', 'Lifting Tool', 'Nos'],
  ['PPE', 'PPE-001', 'Safety Shoe', 'Steel Toe', 'Allen Cooper', 'AC-01', 'Size-8', 'Foot Protection', 'Pair'],
  ['GAS', 'GAS-001', 'Oxygen Cylinder', 'Industrial Oxygen', 'INOX', 'OXY-01', '7 Cum', 'Gas Cutting & Welding', 'Nos'],
  ['GAS', 'GAS-002', 'DA Cylinder', 'Dissolved Acetylene', 'Linde', 'DA-01', '6 Cum', 'Gas Cutting', 'Nos'],
  ['GAS', 'GAS-003', 'Argon Cylinder', 'Pure Argon 99.99%', 'Linde', 'AR-01', '7 Cum', 'GTAW Welding', 'Nos'],
  ['GAS', 'GAS-004', 'CO₂ Cylinder', 'Industrial CO₂', 'INOX', 'CO2-01', '22 Kg', 'MIG Welding', 'Nos'],
];

const stripQuery = (url) => url.split('?')[0];
const mask = (url) => stripQuery(url).replace(/:\/\/[^@]*@/, '://***@');
const sanitizeSeg = (code) => String(code || '').toUpperCase().replace(/[^A-Z0-9&]/g, '');

// Same algorithm as nextItemCode(): highest existing suffix + 1 for the prefix.
async function nextCode(client, prefix) {
  const like = `${prefix}-%`;
  const { rows } = await client.query(
    `SELECT "itemCode" FROM "FinItem" WHERE "itemCode" LIKE $1`,
    [like],
  );
  let max = 0;
  for (const r of rows) {
    const m = String(r.itemCode).slice(prefix.length + 1).match(/^\d+/);
    if (m) max = Math.max(max, parseInt(m[0], 10));
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

async function processDb(url) {
  const client = new pg.Client({ connectionString: stripQuery(url) });
  await client.connect();
  try {
    // 1. Register columns
    if (!DRY_RUN) for (const stmt of COLUMN_STATEMENTS) await client.query(stmt);

    // 2. Category Prefix Master — existing rows win (DO NOTHING on any clash)
    for (const [code, name] of CATEGORY_MASTER) {
      if (DRY_RUN) { console.log(`  · category ${code} (${name}) — upsert`); continue; }
      await client.query(
        `INSERT INTO "FinItemCategory" ("code", "name", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, true, NOW(), NOW()) ON CONFLICT DO NOTHING`,
        [code, name],
      );
    }

    // 3. Register items — resolve category, skip if already seeded, else assign code
    for (const [catCode, preferred, name, spec, brand, model, cap, desc, uom] of REGISTER_ITEMS) {
      const seg = sanitizeSeg(catCode);
      const { rows: catRows } = await client.query(
        `SELECT id, code FROM "FinItemCategory" WHERE code = $1`,
        [seg],
      );
      const cat = catRows[0];
      if (!cat) {
        console.log(`  ! skip ${name}: category ${seg} missing (prefix master clash?)`);
        continue;
      }
      // Idempotency: same category + name + specification already present?
      const { rows: dup } = await client.query(
        `SELECT "itemCode" FROM "FinItem"
         WHERE "categoryId" = $1 AND name = $2 AND COALESCE("specification", '') = $3
         LIMIT 1`,
        [cat.id, name, spec],
      );
      if (dup.length) {
        console.log(`  = ${dup[0].itemCode} ${name} — already present, skipped`);
        continue;
      }
      // Honour the docx code if the slot is free, else next in the series.
      const { rows: taken } = await client.query(
        `SELECT 1 FROM "FinItem" WHERE "itemCode" = $1 LIMIT 1`,
        [preferred],
      );
      const itemCode = taken.length ? await nextCode(client, seg) : preferred;
      if (DRY_RUN) {
        console.log(`  + ${itemCode} ${name} — would insert (category ${seg})`);
        continue;
      }
      await client.query(
        `INSERT INTO "FinItem" ("itemCode", name, specification, "makeBrand", "modelNo", "sizeCapacity",
                                description, uom, "categoryId", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW())`,
        [itemCode, name, spec, brand, model, cap, desc, uom, cat.id],
      );
      console.log(`  + ${itemCode} ${name}`);
    }
  } finally {
    await client.end();
  }
}

const urls = new Set();
if (process.env.SUPERADMIN_DATABASE_URL) {
  const sa = new pg.Client({ connectionString: stripQuery(process.env.SUPERADMIN_DATABASE_URL) });
  await sa.connect();
  const { rows } = await sa.query('SELECT DISTINCT "dbUrl" FROM "Tenant"');
  await sa.end();
  for (const r of rows) if (r.dbUrl) urls.add(r.dbUrl);
}
if (process.env.DATABASE_URL) urls.add(process.env.DATABASE_URL);
if (urls.size === 0) {
  console.error('Nothing to do: set SUPERADMIN_DATABASE_URL (all tenants) and/or DATABASE_URL (this DB). See .env');
  process.exit(1);
}

console.log(DRY_RUN ? 'DRY RUN — no changes will be written\n' : '');
let failures = 0;
for (const url of urls) {
  console.log(`${DRY_RUN ? '·' : '→'} ${mask(url)}`);
  try {
    await processDb(url);
  } catch (e) {
    failures++;
    console.log(`  ✗ ${e.message}`);
  }
}
console.log(failures ? `Done with ${failures} failed database(s).` : 'Done.');
process.exit(failures ? 1 : 0);
