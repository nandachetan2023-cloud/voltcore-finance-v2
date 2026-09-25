'use client';

import { useState, type ReactNode } from 'react';
import { Save, Send, History, Loader2 } from 'lucide-react';
import { StatusBadge } from './_status-badge';

/* ════════════════════════════════════════════════════════════════
   WorkflowTabs — shared form-action shell giving every transaction
   form the compulsory workflow actions: Save Draft / Save, Submit for
   Approval, plus an Audit Trail tab showing the record's status
   history. Screens pass their own save/submit handlers and an optional
   audit-trail renderer.
   ════════════════════════════════════════════════════════════════ */

export type AuditEntry = {
  id?: number | string;
  date?: string;
  action: string;
  by?: string;
  from?: string;
  to?: string;
  note?: string;
};

export interface AuditTrailProps {
  entries: AuditEntry[];
  currentStatus?: string | null;
}

/** Minimal default audit-trail renderer (override via the tab prop). */
export function AuditTrailView({ entries, currentStatus }: AuditTrailProps) {
  const sorted = [...entries].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
  return (
    <div className="space-y-3">
      {currentStatus && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#5a6878]">Current status:</span>
          <StatusBadge status={currentStatus} />
        </div>
      )}
      {sorted.length === 0 ? (
        <p className="text-[11px] text-[#5a6878] py-6 text-center">No audit trail recorded yet.</p>
      ) : (
        <ol className="relative border-l border-[#252e3a] ml-2 space-y-4">
          {sorted.map((e) => (
            <li key={e.id ? String(e.id) : `${e.date}-${e.action}-${e.by ?? ''}`} className="ml-4">
              <span className="absolute -left-[5px] w-2.5 h-2.5 rounded-full bg-[#f5a623]" />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-[#e2e8f0]">{e.action}</span>
                {e.from && <StatusBadge status={e.from} dot={false} />}
                {e.from && e.to && <span className="text-[#5a6878]">→</span>}
                {e.to && <StatusBadge status={e.to} dot={false} />}
              </div>
              <div className="text-[10px] text-[#5a6878] mt-0.5">
                {e.by && <span>{e.by}</span>}
                {e.by && e.date && <span> · </span>}
                {e.date && <span className="font-mono">{new Date(e.date).toLocaleString()}</span>}
                {e.note && <div className="text-[#8899aa] mt-0.5">{e.note}</div>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Shared tab for the audit history. `auditEntries` + `currentStatus` are required. */
export function AuditTab({ entries, currentStatus }: AuditTrailProps) {
  return <AuditTrailView entries={entries} currentStatus={currentStatus} />;
}

/* ── The form workflow action bar ──────────────────────────────── */
export function WorkflowActions({
  onSave,
  onSubmit,
  saving,
  submitting,
  saveLabel = 'Save Draft',
  submitLabel = 'Submit for Approval',
}: {
  onSave?: () => void;
  onSubmit?: () => void;
  saving?: boolean;
  submitting?: boolean;
  saveLabel?: string;
  submitLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {onSave && (
        <button
          type="button"
          onClick={onSave}
          disabled={saving || submitting}
          className="vc-btn-ghost flex items-center gap-1.5 text-[12px] font-semibold disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={14} />} {saveLabel}
        </button>
      )}
      <span className="text-[#252e3a]">|</span>
      {onSubmit && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving || submitting}
          className="text-[#f5a623] text-[13px] font-semibold hover:underline underline-offset-4 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={14} />} {submitLabel}
        </button>
      )}
    </div>
  );
}

/* ── Full shell: action bar + optional Details/Audit tabs ───────── */
export function WorkflowTabs({
  actions,
  auditEntries = [],
  currentStatus,
  detailsTab,
  auditRenderer,
}: {
  actions: ReactNode;
  auditEntries?: AuditEntry[];
  currentStatus?: string | null;
  /** Optional extra tab content shown as the primary "Details" tab. */
  detailsTab?: ReactNode;
  /** Custom audit renderer. Defaults to <AuditTab/>. */
  auditRenderer?: (props: AuditTrailProps) => ReactNode;
}) {
  const hasAudit = auditEntries.length > 0 || currentStatus;
  const showTabs = Boolean(detailsTab) && hasAudit;
  const [tab, setTab] = useState<'details' | 'audit'>('details');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">{actions}</div>
      {showTabs && (
        <div>
          <div className="flex items-center gap-1 border-b border-[#252e3a]">
            <TabButton active={tab === 'details'} onClick={() => setTab('details')}>Details</TabButton>
            <TabButton active={tab === 'audit'} onClick={() => setTab('audit')} icon={<History size={13} />}>Audit Trail</TabButton>
          </div>
          <div className="pt-3">
            {tab === 'details' ? detailsTab : (auditRenderer ? auditRenderer({ entries: auditEntries, currentStatus }) : <AuditTab entries={auditEntries} currentStatus={currentStatus} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children, icon }: { active: boolean; onClick: () => void; children: ReactNode; icon?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider border-b-2 transition-colors ${
        active ? 'text-[#f5a623] border-[#f5a623]' : 'text-[#5a6878] border-transparent hover:text-[#8899aa]'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
