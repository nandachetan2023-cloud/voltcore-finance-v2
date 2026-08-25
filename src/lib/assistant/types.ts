/**
 * Finance Assistant — types
 * ─────────────────────────
 * Deterministic, data-driven assistant. NOT an AI/LLM. It matches natural
 * language commands against the form registry (`forms.ts`), extracts field
 * values with small parsers (`parser.ts`), resolves lookups against the
 * tenant DB, and posts records through the existing API endpoints.
 *
 * "Training" = editing `forms.ts` (triggers, keywords, examples, extractors).
 */

export type FieldKind =
  | 'text'        // free text
  | 'number'      // plain number
  | 'currency'    // amount with ₹/lakh/cr support
  | 'date'        // date string -> ISO
  | 'select'      // pick from free values
  | 'party'       // name -> FinParty.id
  | 'site'        // name -> FinSite.id
  | 'bankAccount' // name -> BankAccount.id
  | 'po'          // poNo -> FinPurchaseOrder.id

export interface FieldDef {
  /** Payload key. */
  key: string;
  kind: FieldKind;
  label: string;
  required?: boolean;
  /** Fixed value used when the user didn't say anything. */
  default?: unknown;
  /** Regexes (executed case-insensitively) that capture the raw value. */
  extractors?: RegExp[];
  /** Normalize extracted value: matched word -> replacement. */
  map?: Record<string, string>;
}

export interface FormDef {
  id: string;
  title: string;
  /** Module to navigate to after a successful create (remounts the table). */
  moduleId: string;
  /** Internal API endpoint that handles the POST. */
  endpoint: string;
  /** Action verbs that signal a create command. */
  triggers: string[];
  /** Keywords that identify this form (scored against the query). */
  entityKeywords: string[];
  /** Training utterances shown to the user / used for matching hints. */
  examples: string[];
  /** Fields extracted from the sentence before the custom builder runs. */
  fields: FieldDef[];
  /** Optional custom payload builder (e.g. journal entry lines). */
  build?: (ctx: BuildContext) => Promise<BuildResult>;
  /**
   * Payload keys the backing endpoint hard-requires (400s without them) —
   * e.g. the compulsory Site/Job/PO/Cost Center/Department/PM set. Checked
   * against `built.payload` after build() runs, before the POST, so the
   * user gets a friendly "I still need…" prompt instead of a raw API error.
   */
  requiredKeys?: string[];
}

export interface BuildContext {
  form: FormDef;
  text: string;
  values: Record<string, unknown>;
  origin: string;
  cookieHeader: string;
  resolve: (field: FieldDef) => Promise<any | null>;
}

export interface BuildResult {
  payload: Record<string, unknown>;
  summary: string;
  /** Friendly record reference (e.g. "JE/2026-27/0001"). */
  reference?: string;
}

export interface LookupRow {
  id: number;
  name?: string | null;
  code?: string | null;
  [k: string]: unknown;
}

/**
 * Pending-form context. Kept by the caller (chat widget) so the assistant is
 * conversational: when it asks for missing fields, the next message continues
 * the SAME form instead of being treated as a brand-new command. `text` is the
 * accumulated sentence (original command + every follow-up) that gets
 * re-parsed on the next turn.
 */
export interface AssistantContext {
  /** The form we're mid-way through filling. */
  formId?: string;
  /** The accumulated sentence for this form attempt. */
  text?: string;
}

export interface AssistantRequest {
  text: string;
  /** Current user email — used to file an in-app notification alert. */
  userEmail?: string;
  /** Optional hint — e.g. the module the user is currently in. */
  moduleId?: string;
  /** Optional pending-form context from a previous turn. */
  context?: AssistantContext;
}

export interface AssistantResult {
  success: boolean;
  action: 'create' | 'info' | 'error';
  formId?: string;
  title?: string;
  moduleId?: string;
  message: string;
  reference?: string;
  payload?: Record<string, unknown>;
  /** Prompt shown to the user for the missing field. */
  missing?: { field: string; label: string }[];
  /** Known forms list (used when the command didn't match). */
  available?: string[];
  /** Raw endpoint response (for debugging). */
  response?: unknown;
  /** Continue this pending form on the next turn (caller should store it). */
  context?: AssistantContext;
}
