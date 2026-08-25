'use client';

/* ════════════════════════════════════════════════════════════════
   StatusBadge — single source of truth for status color coding.
   Convention: green = Approved/Paid/Completed, yellow = Pending/
   Draft/Unpaid/Submitted, red = Rejected/Overdue/Revoked.
   All screens should use this instead of ad-hoc per-file helpers so
   the color mapping cannot drift. Unknown statuses fall back to a
   neutral slate tone.
   ════════════════════════════════════════════════════════════════ */

const APPROVED = new Set(['approved', 'paid', 'completed', 'cleared', 'active', 'released', 'verified', 'valid', 'settled', 'invoiced', 'posted', 'delivered']);
const PENDING = new Set(['pending', 'draft', 'unpaid', 'submitted', 'partial', 'partially paid', 'in-progress', 'in progress', 'processing', 'waiting', 'on-hold', 'on hold', 'scheduled', 'open', 'pending approval', 'under review', 'sent', 'created', 'new', 'queued']);
const REJECTED = new Set(['rejected', 'overdue', 'revoked', 'cancelled', 'canceled', 'closed', 'void', 'failed', 'expired', 'disapproved', 'blocked', 'escalated']);

function classify(status?: string | null): 'green' | 'yellow' | 'red' | 'gray' {
  const key = (status || '').toString().trim().toLowerCase();
  if (!key) return 'gray';
  if (APPROVED.has(key)) return 'green';
  if (PENDING.has(key)) return 'yellow';
  if (REJECTED.has(key)) return 'red';
  // fallback heuristic for compound phrases
  if (/\b(approved|paid|completed|active|verified)\b/.test(key)) return 'green';
  if (/\b(pending|draft|unpaid|submitted|partial|progress|review|open|waiting)\b/.test(key)) return 'yellow';
  if (/\b(rejected|overdue|cancelled|canceled|closed|void|failed|expired)\b/.test(key)) return 'red';
  return 'gray';
}

const COLORS: Record<string, string> = {
  green: '#00e676',
  yellow: '#f5a623',
  red: '#ff3d3d',
  gray: '#8899aa',
};

export function StatusBadge({ status, dot = true }: { status?: string | null; dot?: boolean }) {
  const tone = classify(status);
  const color = COLORS[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full text-[10px] font-bold whitespace-nowrap"
      style={{ background: `${color}1f`, color }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
      {status || '—'}
    </span>
  );
}

export function statusColor(status?: string | null): string {
  return COLORS[classify(status)];
}
