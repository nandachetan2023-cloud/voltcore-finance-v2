/**
 * Finance Assistant — engine
 * ──────────────────────────
 * Deterministic, data-driven. No AI / no LLM / no external service.
 *
 * 1. Match the user's sentence against the form registry (triggers +
 *    entity keywords) and pick the best-scoring form.
 * 2. Extract field values with the form's extractors and resolve
 *    lookups (site/party/bank/PO) against the tenant DB.
 * 3. Build the payload (via `form.build`) and POST it to the existing
 *    internal API endpoint (tenant cookie forwarded).
 * 4. File an in-app notification (bell) and return a result the widget
 *    can render as an alert.
 */

import { NextRequest } from 'next/server';
import { getDbForRequest } from '@/lib/db';
import { FORMS } from './forms';
import type { AssistantRequest, AssistantResult, BuildContext, FieldDef, FormDef } from './types';
import { parseAmount, parseDate } from './parser';

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsWord(text: string, token: string): boolean {
  const t = token.toLowerCase();
  if (t.includes(' ')) return text.includes(t);
  return new RegExp(`\\b${escapeRe(t)}\\b`, 'i').test(text);
}

function isQuestion(text: string): boolean {
  const q = text.trim().toLowerCase();
  if (/^(how|what|where|when|why|who|which|is|are|can|could|do|does)\b/.test(q)) return true;
  return /(how do|how to|how can|what is|what are|tell me|help me|explain|show me)\b/.test(q);
}

// ── Small talk — greetings/thanks/help feel like a bot, not a wall of text ──
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const GREETING_RE = /^(hi|hii+|hiya|hello+|hey+|yo|good\s?(morning|afternoon|evening|day))\b[\s!.]*$/i;
const THANKS_RE = /^(thanks|thank\s?you|thx|ty|much appreciated|appreciate it)\b[\s!.]*$/i;
const FAREWELL_RE = /^(bye|goodbye|see\s?ya|see\s?you|cya|good\s?night)\b[\s!.]*$/i;
const HELP_RE = /^(help|help me|what can you do|what do you do|what can you help( me)? with|who are you|what are you)\??$/i;

function smallTalkReply(text: string): string | null {
  const t = text.trim();
  if (GREETING_RE.test(t)) {
    return pick([
      "Hey! Tell me what you'd like to create — e.g. \"create petty cash of 500 for courier at site TPP Adani Godda job JOB-2026-001 po PO-2026-001 cost center CC-SIT-001 department Projects pm R. Sharma\".",
      'Hi there! I can post finance entries straight from a sentence — try something like "raise an invoice for 2 lakh to L&T Construction at site NTPC Rihand".',
      "Hello! Ready when you are — say what you'd like to create (invoice, payment, petty cash, PO, and more).",
    ]);
  }
  if (THANKS_RE.test(t)) {
    return pick(["You're welcome!", 'Anytime — happy to help.', "No problem! Let me know what's next."]);
  }
  if (FAREWELL_RE.test(t)) {
    return pick(['See you!', 'Bye — come back anytime you need to post an entry.', 'Take care!']);
  }
  if (HELP_RE.test(t)) {
    return [
      "I'm the Finance Assistant — I create records directly from a sentence, then alert and refresh the relevant table for you. No AI guessing, just pattern matching, so be explicit about the fields.",
      '',
      'I can create: ' + FORMS.map((f) => f.title).join(', ') + '.',
      '',
      'Example: "create petty cash of 500 for courier at site TPP Adani Godda job JOB-2026-001 po PO-2026-001 cost center CC-SIT-001 department Projects pm R. Sharma"',
      '',
      "If a field doesn't parse, I'll tell you exactly which one and what format I expect.",
    ].join('\n');
  }
  return null;
}

function pickForm(text: string): FormDef | null {
  let best: FormDef | null = null;
  let bestScore = 0;
  for (const form of FORMS) {
    let score = 0;
    for (const kw of form.entityKeywords) {
      if (containsWord(text, kw)) score += 1;
    }
    const hasTrigger = form.triggers.some((t) => containsWord(text, t));
    if (hasTrigger) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = form;
    }
  }
  return bestScore >= 2 ? best : null;
}

/**
 * Field check outcome, mirroring the trained flow:
 *  1. Does the form define this field?              (form.fields — always yes here)
 *  2. Did the user actually supply something for it? ('missing' if not, and required)
 *  3. Does what they supplied match the field's data type / resolve in the DB?
 *     ('invalid' if not — number/date/amount won't parse, or site/party/PO/bank
 *     account name doesn't match a real record)
 *  4. Otherwise 'ok' — safe to use.
 */
type FieldStatus = 'ok' | 'missing' | 'invalid';
interface FieldCheck { value: unknown; status: FieldStatus; raw: string | null; record?: any }

function kindHint(kind: FieldDef['kind']): string {
  switch (kind) {
    case 'number': return 'a number, e.g. 5000';
    case 'currency': return 'an amount, e.g. 50000, 2.5 lakh, or 1 cr';
    case 'date': return 'a date, e.g. 2026-01-15, 15/01/2026, or "5 Jan 2026"';
    case 'site': return 'a site name/code that exists in Site Master';
    case 'party': return 'a client/vendor name that exists in Party Master';
    case 'bankAccount': return 'a bank account name that exists in Bank & Cash';
    case 'po': return 'a PO number that exists in Purchase Orders';
    default: return 'a value';
  }
}

async function extractFieldValue(ctx: BuildContext, field: FieldDef): Promise<FieldCheck> {
  let raw: string | null = null;
  if (field.extractors) {
    for (const re of field.extractors) {
      const m = ctx.text.match(re);
      if (m && m[1]) {
        raw = m[1].trim();
        break;
      }
    }
  }

  if (field.map && raw) {
    const lower = raw.toLowerCase();
    for (const [k, v] of Object.entries(field.map)) {
      if (lower === k || lower.includes(k)) {
        raw = v;
        break;
      }
    }
  }

  const hasRaw = raw !== null && raw !== '';
  const missingOrOk = (): FieldCheck => ({
    value: field.default ?? null,
    status: field.required === true && field.default === undefined ? 'missing' : 'ok',
    raw: null,
  });

  switch (field.kind) {
    case 'text':
    case 'select':
      return hasRaw ? { value: raw, status: 'ok', raw } : missingOrOk();
    case 'number': {
      if (!hasRaw) return missingOrOk();
      const n = Number((raw as string).replace(/,/g, ''));
      return Number.isFinite(n) ? { value: n, status: 'ok', raw } : { value: null, status: 'invalid', raw };
    }
    case 'currency': {
      if (!hasRaw) return missingOrOk();
      const n = parseAmount(raw as string);
      return n !== null ? { value: n, status: 'ok', raw } : { value: null, status: 'invalid', raw };
    }
    case 'date': {
      if (!hasRaw) return missingOrOk();
      const d = parseDate(raw as string);
      return d !== null ? { value: d, status: 'ok', raw } : { value: null, status: 'invalid', raw };
    }
    case 'site':
    case 'party':
    case 'bankAccount':
    case 'po': {
      if (!hasRaw) return missingOrOk();
      const record = await ctx.resolve(field);
      if (!record) return { value: null, status: 'invalid', raw };
      return { value: field.kind === 'party' ? (record.name ?? null) : record.id, status: 'ok', raw, record };
    }
    default:
      return hasRaw ? { value: raw, status: 'ok', raw } : missingOrOk();
  }
}

export async function run(request: NextRequest, req: AssistantRequest): Promise<AssistantResult> {
  const newText = (req.text || '').trim();
  const ctxIn = req.context;

  // Conversational continuation: if we're mid-way through a form (the previous
  // turn returned a `context` asking for more fields), merge the accumulated
  // sentence with this new message so every previously-supplied field is still
  // parsed alongside the follow-up.
  const pendingForm = ctxIn?.formId ? FORMS.find((f) => f.id === ctxIn.formId) : undefined;
  const hasPending = Boolean(pendingForm);
  const pendingText = hasPending && ctxIn?.text ? `${ctxIn.text} ${newText}`.replace(/\s+/g, ' ').trim() : newText;

  if (!newText) {
    return {
      success: false,
      action: 'info',
      message: 'Tell me what to create — e.g. "create a journal entry…", "raise an invoice…", "record a payment…".',
      available: FORMS.map((f) => f.title),
    };
  }

  // Skip small talk / question detection while a form is pending — the follow-up
  // is meant to fill in the fields, not start something new.
  const smallTalk = hasPending ? null : smallTalkReply(newText);
  if (smallTalk) {
    return { success: false, action: 'info', message: smallTalk, available: FORMS.map((f) => f.title) };
  }

  const isQ = hasPending ? false : isQuestion(newText);
  if (isQ) {
    return {
      success: false,
      action: 'info',
      message: 'That looks like a question. Try a create command instead, e.g. "create a journal entry Dr Rent 5000 Cr Cash 5000".',
      available: FORMS.map((f) => f.title),
    };
  }

  let form = pickForm(newText);
  // If this message isn't a fresh command on its own, continue the pending form.
  if (!form && pendingForm) form = pendingForm;
  if (!form) {
    return {
      success: false,
      action: 'info',
      message: `I couldn't match that to a finance/procurement form. I can create: ${FORMS.map((f) => f.title).join(', ')}.`,
      available: FORMS.map((f) => f.title),
    };
  }

  // When continuing a pending form, parse the accumulated sentence; otherwise
  // just the new message.
  const effectiveText = form === pendingForm ? pendingText : newText;

  const pdb = getDbForRequest(request);
  const origin = new URL(request.url).origin;
  const cookieHeader = request.headers.get('cookie') || '';

  const ctx: BuildContext & { count: (m: string) => Promise<number>; lookupInvoice: (no: string) => Promise<any>; countPartiesByType: (partyType: string) => Promise<number> } = {
    form,
    text: effectiveText,
    values: {},
    origin,
    cookieHeader,
    resolve: async (field: FieldDef) => {
      const rawRe = field.extractors?.[0];
      const m = rawRe ? effectiveText.match(rawRe) : null;
      const raw = m?.[1]?.trim() ?? '';
      switch (field.kind) {
        case 'site':
          return pdb.finSite.findFirst({ where: { OR: [{ name: { contains: raw, mode: 'insensitive' } }, { siteCode: { contains: raw, mode: 'insensitive' } }] } });
        case 'party':
          return pdb.finParty.findFirst({ where: { OR: [{ name: { contains: raw, mode: 'insensitive' } }, { code: { contains: raw, mode: 'insensitive' } }] } });
        case 'bankAccount':
          return pdb.bankAccount.findFirst({ where: { OR: [{ accountName: { contains: raw, mode: 'insensitive' } }, { bankName: { contains: raw, mode: 'insensitive' } }] } });
        case 'po':
          return pdb.finPurchaseOrder.findFirst({ where: { poNo: { contains: raw, mode: 'insensitive' } } });
        default:
          return null;
      }
    },
    count: async (m: string) => {
      const delegate = (pdb as any)[m];
      if (typeof delegate?.count === 'function') return delegate.count();
      return 0;
    },
    lookupInvoice: async (no: string) => pdb.finInvoice.findFirst({ where: { invoiceNo: { contains: no, mode: 'insensitive' } } }),
    countPartiesByType: async (partyType: string) => pdb.finParty.count({ where: { partyType } }),
  };

  // Check every field the form defines: did the user supply it, and if so,
  // does it match the expected type / resolve to a real record? Anything
  // that fails either check stops here — we ask for that same field back
  // rather than silently dropping it or letting a bad value through.
  const missingFields: FieldDef[] = [];
  const invalidFields: { field: FieldDef; raw: string | null }[] = [];
  for (const field of form.fields) {
    const check = await extractFieldValue(ctx, field);
    if (check.status === 'missing') { missingFields.push(field); continue; }
    if (check.status === 'invalid') { invalidFields.push({ field, raw: check.raw }); continue; }
    if (field.kind === 'party' && check.record) {
      ctx.values[`${field.key}Id`] = check.record.id;
      ctx.values[field.key] = check.value;
    } else {
      ctx.values[field.key] = check.value;
    }
  }

  if (invalidFields.length > 0 || missingFields.length > 0) {
    const parts: string[] = [];
    if (invalidFields.length > 0) {
      parts.push(
        invalidFields
          .map(({ field, raw }) => `**${field.label}** — "${raw}" doesn't look right, I need ${kindHint(field.kind)}.`)
          .join(' ')
      );
    }
    if (missingFields.length > 0) {
      parts.push(`I still need: ${missingFields.map((f) => f.label).join(', ')}.`);
    }
    return {
      success: false,
      action: 'error',
      formId: form.id,
      title: form.title,
      message: parts.join(' '),
      missing: [...invalidFields.map((f) => f.field), ...missingFields].map((f) => ({ field: f.key, label: f.label })),
      available: FORMS.map((f) => f.title),
      context: { formId: form.id, text: effectiveText },
    };
  }

  // Run the form's custom builder.
  let built: { payload: Record<string, unknown>; summary: string; reference?: string };
  try {
    built = form.build
      ? await form.build(ctx)
      : { payload: { ...ctx.values }, summary: '' };
  } catch (err) {
    console.error('[assistant] build error:', err);
    return { success: false, action: 'error', message: 'I ran into an error preparing this entry.', formId: form.id, title: form.title };
  }

  if (!built.payload || Object.keys(built.payload).length === 0) {
    // Builder signalled it needs more info.
    const required = form.fields.filter((f) => f.required && ctx.values[f.key] === undefined);
    const missingLabels = required.map((f) => f.label);
    if (missingLabels.length === 0) missingLabels.push('amount', 'the account details (e.g. "Dr Cash 1000 Cr Sales 1000")');
    return {
      success: false,
      action: 'error',
      formId: form.id,
      title: form.title,
      message: `I need a bit more detail to create the ${form.title}. Missing: ${missingLabels.join(', ')}.`,
      missing: required.map((f) => ({ field: f.key, label: f.label })),
      available: FORMS.map((f) => f.title),
      context: { formId: form.id, text: effectiveText },
    };
  }

  // Endpoint-level compulsory fields (Site/Job/PO/Cost Center/Department/PM)
  // — checked here so the user gets a friendly prompt instead of a raw
  // 400 from the API after we've already committed to this form.
  if (form.requiredKeys && form.requiredKeys.length > 0) {
    const emptyKeys = form.requiredKeys.filter((k) => {
      const val = built.payload[k];
      return val === undefined || val === null || val === '';
    });
    if (emptyKeys.length > 0) {
      const byKey = new Map(form.fields.map((f) => [f.key, f.label]));
      const aliasKey: Record<string, string> = { siteId: 'site', poId: 'po', partyId: 'party' };
      const labels = emptyKeys.map((k) => byKey.get(k) || byKey.get(aliasKey[k] ?? '') || k);
      return {
        success: false,
        action: 'error',
        formId: form.id,
        title: form.title,
        message: `I need a bit more detail to create the ${form.title}. Missing: ${labels.join(', ')}. Add them like "job JOB-2026-001 po PO-2026-001 cost center CC-SIT-001 department Projects pm R. Sharma".`,
        missing: emptyKeys.map((k) => ({ field: k, label: byKey.get(k) || k })),
        available: FORMS.map((f) => f.title),
        context: { formId: form.id, text: effectiveText },
      };
    }
  }

  // POST through the existing endpoint.
  try {
    const res = await fetch(`${origin}${form.endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify(built.payload),
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      return {
        success: false,
        action: 'error',
        formId: form.id,
        title: form.title,
        message: `The ${form.title} could not be saved: ${json.error || `server returned ${res.status}`}`,
        response: json,
      };
    }

    // File an in-app alert so the bell shows the activity.
    if (req.userEmail) {
      await pdb.notification.create({
        data: {
          userId: 0,
          userEmail: req.userEmail,
          title: `${form.title} created`,
          message: built.summary || `${form.title} was saved.`,
          type: 'success',
          link: '',
          entityType: 'finance',
          entityId: (json.data as any)?.id ?? null,
        },
      }).catch(() => {});
    }

    return {
      success: true,
      action: 'create',
      formId: form.id,
      title: form.title,
      moduleId: form.moduleId,
      message: `${form.title} saved. ${built.summary}.`,
      reference: built.reference,
      payload: built.payload,
      response: json,
    };
  } catch (err) {
    console.error('[assistant] POST error:', err);
    return { success: false, action: 'error', formId: form.id, title: form.title, message: 'Network error while saving the entry.' };
  }
}
