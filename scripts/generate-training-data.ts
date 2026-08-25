/**
 * Finance Assistant — training data generator (dev-time only)
 * ─────────────────────────────────────────────────────────────
 * Calls a free OpenRouter model to generate realistic example sentences +
 * their correct field extractions for each of the 11 assistant forms
 * (src/lib/assistant/forms.ts). Output is written as JSONL, one file per
 * form, under scripts/training-data/ — meant to be used later as a
 * fine-tuning dataset for a small local base model (e.g. Qwen2.5-1.5B).
 *
 * This script is NOT part of the running app. The OpenRouter key is only
 * used here, once, offline — it never touches the deployed bot or any
 * user data.
 *
 * Setup:
 *   1. Add OPENROUTER_API_KEY=sk-or-... to .env (already gitignored).
 *   2. npx tsx scripts/generate-training-data.ts
 *   3. Optionally: npx tsx scripts/generate-training-data.ts petty-cash invoice
 *      to generate only specific forms.
 *
 * Output: scripts/training-data/<form-id>.jsonl
 *   Each line: { "text": "...", "formId": "...", "fields": { ... } }
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ── Minimal .env loader (no extra dependency) ──────────────────────
function loadEnvFile() {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvFile();

const API_KEY = process.env.OPENROUTER_API_KEY;
// Free-tier OpenRouter model. Swap for another `:free` slug if this one is
// rate-limited or deprecated — check https://openrouter.ai/models?max_price=0
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b:free';
const EXAMPLES_PER_FORM = Number(process.env.EXAMPLES_PER_FORM || 25);

if (!API_KEY) {
  console.error('Missing OPENROUTER_API_KEY. Add it to .env (never commit it) and re-run.');
  process.exit(1);
}

// ── Form specs — kept in sync with src/lib/assistant/forms.ts by hand.
// Each describes the fields a real user command should supply, so the
// model generates commands that actually exercise the field extractors. ──
interface FormSpec {
  id: string;
  title: string;
  description: string;
  fields: string[];
}

const FORM_SPECS: FormSpec[] = [
  {
    id: 'journal-entry',
    title: 'Journal Entry',
    description: 'A Dr/Cr double-entry accounting posting.',
    fields: ['debitAccount', 'creditAccount', 'amount', 'date (optional)', 'narration (optional)'],
  },
  {
    id: 'invoice',
    title: 'Site Invoice',
    description: 'A GST tax invoice raised against a client for site work.',
    fields: ['site', 'client', 'amount', 'jobCode', 'poNo', 'costCenter', 'department', 'projectManager', 'date (optional)'],
  },
  {
    id: 'payment',
    title: 'Payment',
    description: 'An outgoing payment from a bank account to a vendor/party.',
    fields: ['bankAccount', 'party', 'amount', 'site', 'jobCode', 'poNo', 'costCenter', 'department', 'projectManager', 'paymentMethod (NEFT/RTGS/UPI/IMPS/Cheque/Cash, optional)'],
  },
  {
    id: 'petty-cash',
    title: 'Petty Cash Voucher',
    description: 'A small cash expense voucher.',
    fields: ['description', 'amount', 'site', 'jobCode', 'poNo', 'costCenter', 'department', 'projectManager', 'category (optional)'],
  },
  {
    id: 'expense-claim',
    title: 'Expense Claim',
    description: 'A staff reimbursement claim for expenses incurred.',
    fields: ['site', 'amount', 'jobCode', 'poNo', 'costCenter', 'department', 'projectManager', 'expenseType (optional)', 'submittedBy (optional)'],
  },
  {
    id: 'purchase-order',
    title: 'Purchase Order',
    description: 'A PO raised to a vendor for materials/services at a site.',
    fields: ['vendorName', 'site', 'amount', 'jobCode', 'costCenter', 'department', 'projectManager', 'descriptionOfWork (optional)'],
  },
  {
    id: 'purchase-requisition',
    title: 'Purchase Requisition',
    description: 'An internal request to procure materials before a PO is raised.',
    fields: ['requester', 'amount', 'project (optional)', 'requiredBy (optional date)'],
  },
  {
    id: 'payment-advice',
    title: 'Payment Advice',
    description: 'A remittance advice sent to a vendor confirming a payment.',
    fields: ['party', 'site', 'amount', 'jobCode', 'poNo', 'costCenter', 'department', 'projectManager', 'paymentMode (optional)'],
  },
  {
    id: 'credit-note',
    title: 'Credit Note',
    description: 'A credit note issued against an existing invoice.',
    fields: ['invoiceNo', 'amount', 'reason (optional)', 'site', 'jobCode', 'poNo', 'costCenter', 'department', 'projectManager'],
  },
  {
    id: 'site-master',
    title: 'Site',
    description: 'Registering a new project site (site code is auto-generated, never mentioned by the user).',
    fields: ['name', 'location (optional)', 'state (optional)', 'customer (optional)', 'contactPerson (optional)', 'contactPhone (optional)', 'contactEmail (optional)', 'budget (optional)'],
  },
  {
    id: 'party-master',
    title: 'Party',
    description: 'Registering a new client or vendor (party code is auto-generated, never mentioned by the user).',
    fields: ['name', 'partyType (vendor/supplier or client/customer — must be stated)', 'gstin (optional)', 'pan (optional)', 'state (optional)', 'contact (optional)', 'paymentTerms (optional, e.g. Net 30)'],
  },
];

// ── OpenRouter call ──────────────────────────────────────────────
async function callOpenRouter(prompt: string): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'VoltCore Finance Assistant - training data generator',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? '';
}

function buildPrompt(spec: FormSpec, count: number): string {
  return `You are generating training data for a deterministic, rule-based finance-assistant bot used by an Indian construction/power-plant contractor ERP.

Form: "${spec.title}" (${spec.description})
Fields it needs: ${spec.fields.join(', ')}

Generate ${count} DIFFERENT realistic natural-language commands an Indian finance/site user might type to create this record via chat, covering a mix of:
- fully-specified commands (every field present)
- commands missing 1-2 optional fields
- varied phrasing, amount formats (₹50000, 50,000, 2 lakh, 1.5 cr), and Indian names/sites

Use realistic Indian construction-site names (e.g. TPP Adani Godda, BALCO Smelter Korba), party names (e.g. L&T Construction, Siemens India Ltd), job codes like JOB-2026-00X, PO numbers like PO-2026-00X, cost centers like CC-SIT-00X, departments like Projects/Operations/Finance, and project manager names like R. Sharma.

Return ONLY a JSON array (no markdown, no commentary) of ${count} objects, each shaped exactly like:
{"text": "<the command a user would type>", "fields": {"<fieldName>": "<value found in text, or null if omitted>", ...}}

The "fields" object must have one key per field listed above (using the exact field names given, without the "(optional)" suffix), with the value taken verbatim from "text", or null if that field was intentionally omitted from the sentence.`;
}

function extractJsonArray(raw: string): any[] {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = trimmed.indexOf('[');
  const end = trimmed.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('No JSON array found in model output');
  return JSON.parse(trimmed.slice(start, end + 1));
}

async function generateForForm(spec: FormSpec) {
  process.stdout.write(`Generating ${EXAMPLES_PER_FORM} examples for "${spec.title}"... `);
  try {
    const raw = await callOpenRouter(buildPrompt(spec, EXAMPLES_PER_FORM));
    const examples = extractJsonArray(raw);
    const lines = examples
      .filter((e) => e && typeof e.text === 'string' && e.fields)
      .map((e) => JSON.stringify({ text: e.text, formId: spec.id, fields: e.fields }));

    const outDir = join(process.cwd(), 'scripts', 'training-data');
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, `${spec.id}.jsonl`), lines.join('\n') + '\n', 'utf8');
    console.log(`${lines.length} examples → scripts/training-data/${spec.id}.jsonl`);
  } catch (err) {
    console.log('FAILED');
    console.error(`  ${spec.id}:`, (err as Error).message);
  }
}

async function main() {
  const requested = process.argv.slice(2);
  const targets = requested.length > 0 ? FORM_SPECS.filter((f) => requested.includes(f.id)) : FORM_SPECS;

  if (requested.length > 0 && targets.length === 0) {
    console.error(`No matching form ids. Available: ${FORM_SPECS.map((f) => f.id).join(', ')}`);
    process.exit(1);
  }

  console.log(`Using model: ${MODEL}`);
  console.log(`Generating for: ${targets.map((t) => t.id).join(', ')}\n`);

  for (const spec of targets) {
    await generateForForm(spec);
    // Be polite to the free tier — small delay between calls.
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log('\nDone. Combine all .jsonl files under scripts/training-data/ for fine-tuning.');
}

main().catch((e) => { console.error(e); process.exit(1); });
