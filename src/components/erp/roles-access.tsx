'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, X, ChevronDown, ChevronUp,
  ArrowRight, Shield, GitBranch, Check, RefreshCw, Users, UserCog, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import ModuleSelect from '@/components/superadmin/module-select';

/* ── Types ─────────────────────────────────────────────────────── */
interface OrgRole {
  id: string; name: string; level: number;
  moduleAccess: string; departments: string; designations: string; branches: string;
  color: string; currentCount?: number;
}
interface ApprovalStep {
  id?: string; stepNumber: number;
  approverRoleId: string; approverRole?: OrgRole;
  scope: string; isRequired: boolean;
}
interface ApprovalChain {
  id: string; name: string; description: string; isActive: boolean;
  steps: ApprovalStep[]; requesterRoleId?: string | null; requesterRole?: OrgRole | null;
}
interface AccountUsage { maxAccounts: number; used: number; remaining: number | null; unlimited: boolean; enabledModules?: string }

const SCOPE_OPTIONS = [
  { value: 'universal', label: 'Universal (any dept)' },
  { value: 'same_department', label: 'Same Department only' },
  { value: 'same_branch', label: 'Same Branch only' },
];
const ROLE_COLORS = ['#f5a623', '#00d4ff', '#00e676', '#a78bfa', '#ff3d3d', '#ff9800', '#00bcd4', '#4caf50', '#9c27b0', '#f44336'];

/** Compact one-line summary of a role's scope. Empty string = fully universal. */
function scopeLabel(r: Pick<OrgRole, 'departments' | 'designations' | 'branches'>): string {
  const parts: string[] = [];
  if (r.departments?.trim()) parts.push(r.departments);
  if (r.designations?.trim()) parts.push(r.designations);
  if (r.branches?.trim()) parts.push(r.branches);
  return parts.join(' · ');
}

const inp = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]/60 transition-colors placeholder:text-[#5a6878]';
const lbl = 'block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5';

function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return <div className={span2 ? 'col-span-2' : ''}><label className={lbl}>{label}</label>{children}</div>;
}

/* ── Multi-value tag input (departments/designations) ──────────── */
function TagInput({ value, options, placeholder, onChange }: {
  value: string; options: string[]; placeholder: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const tags = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
  const toggle = (opt: string) => {
    const next = new Set(tags);
    const wasSelected = next.has(opt);
    if (wasSelected) {
      next.delete(opt);
      // Deselecting — keep dropdown open so user can adjust further
    } else {
      next.add(opt);
      // New selection — close dropdown immediately (single-select UX)
      setOpen(false);
    }
    onChange([...next].join(','));
  };
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] hover:border-[#f5a623]/40 transition-colors min-h-[36px]">
        {tags.length === 0 ? <span className="text-[#5a6878]">{placeholder}</span> : (
          <div className="flex flex-wrap gap-1">{tags.map(t => <span key={t} className="bg-[#f5a623]/15 text-[#f5a623] text-[10px] font-medium px-2 py-[2px] rounded-md">{t}</span>)}</div>
        )}
        {open ? <ChevronUp size={12} className="text-[#5a6878] shrink-0 ml-2" /> : <ChevronDown size={12} className="text-[#5a6878] shrink-0 ml-2" />}
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#161c24] border border-[#252e3a] rounded-xl shadow-2xl p-2 max-h-[200px] overflow-y-auto space-y-1">
          <button onClick={() => { onChange(''); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#1a2028] transition-colors">Clear (Universal)</button>
          {options.map(opt => {
            const sel = tags.includes(opt);
            return (
              <button key={opt} onClick={() => toggle(opt)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors ${sel ? 'bg-[#f5a623]/10' : 'hover:bg-[#1a2028]'}`}>
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${sel ? 'bg-[#f5a623] border-[#f5a623]' : 'border-[#2e3a48]'}`}>{sel && <Check size={9} className="text-black" />}</div>
                <span className={`text-[11px] ${sel ? 'text-[#e2e8f0] font-medium' : 'text-[#8899aa]'}`}>{opt}</span>
              </button>
            );
          })}
          {options.length === 0 && <p className="text-[10px] text-[#5a6878] px-3 py-2">No options yet</p>}
        </div>
      )}
    </div>
  );
}

/* ── Account Capacity card ─────────────────────────────────────── */
function AccountCapacityCard({ usage }: { usage: AccountUsage }) {
  if (usage.unlimited) {
    return (
      <div className="vc-panel">
        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00e676]/10 flex items-center justify-center shrink-0">
            <Users size={18} className="text-[#00e676]" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-[#e2e8f0]">Account Capacity</div>
            <div className="text-[11px] text-[#5a6878]">
              <span className="text-[#00e676] font-semibold">Unlimited</span> — your provider has not set a cap.
              Currently <span className="text-[#8899aa] font-semibold">{usage.used}</span> account{usage.used !== 1 ? 's' : ''} in use.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((usage.used / Math.max(1, usage.maxAccounts)) * 100));
  const remaining = usage.remaining ?? 0;
  const full = remaining <= 0;
  const nearFull = !full && pct >= 80;
  const accent = full ? '#ff3d3d' : nearFull ? '#ff9800' : '#f5a623';
  const note = full
    ? 'Limit reached — remove an account or ask your provider to raise the cap before adding more.'
    : nearFull
      ? 'You are close to your account limit.'
      : 'You can keep adding accounts up to your limit.';

  return (
    <div className="vc-panel overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent}15` }}>
              <Users size={18} style={{ color: accent }} />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#e2e8f0]">Account Capacity</div>
              <div className="text-[11px] text-[#5a6878]">{note}</div>
            </div>
          </div>
          <div className="flex items-stretch gap-2">
            {[
              { label: 'Used', value: usage.used, color: accent },
              { label: 'Remaining', value: remaining, color: full ? '#ff3d3d' : '#00e676' },
              // var(), not a literal grey — inline styles bypass the light-mode overrides.
              { label: 'Limit', value: usage.maxAccounts, color: 'var(--vc-text2)' },
            ].map(s => (
              <div key={s.label} className="text-center px-3 py-1.5 rounded-lg bg-[#0d1117] border border-[#252e3a] min-w-[60px]">
                <div className="text-[16px] font-black leading-none" style={{ color: s.color, fontFamily: "'Share Tech Mono', monospace" }}>{s.value}</div>
                <div className="text-[9px] text-[#5a6878] uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <div className="h-2.5 bg-[#0d1117] rounded-full overflow-hidden border border-[#252e3a]">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: accent }} />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[9px] text-[#5a6878]">{pct}% used</span>
            <span className="text-[9px] text-[#5a6878]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{usage.used} / {usage.maxAccounts}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN — Roles & Access (admin, under Organization)
   ════════════════════════════════════════════════════════════════ */
export default function RolesAccessModule() {
  const [subTab, setSubTab] = useState<'roles' | 'chains'>('roles');
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [chains, setChains] = useState<ApprovalChain[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [usage, setUsage] = useState<AccountUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, chainsRes, deptRes, desigRes, branchRes, usageRes] = await Promise.all([
        fetch('/api/tenant/roles').then(r => r.json()),
        fetch('/api/tenant/approval-chains').then(r => r.json()),
        fetch('/api/departments').then(r => r.json()),
        fetch('/api/designations').then(r => r.json()),
        fetch('/api/branches').then(r => r.json()),
        fetch('/api/tenant/account-limit').then(r => r.json()),
      ]);
      if (rolesRes.success) setRoles(rolesRes.data);
      if (chainsRes.success) setChains(chainsRes.data);
      if (deptRes.success) setDepartments(deptRes.data.map((d: any) => d.name));
      if (desigRes.success) setDesignations(desigRes.data.map((d: any) => d.name));
      if (branchRes.success) setBranches(branchRes.data.map((b: any) => b.name));
      if (usageRes.success) setUsage(usageRes.data);
    } catch { toast.error('Failed to load roles & access data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      {usage && <AccountCapacityCard usage={usage} />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#e2e8f0]">Roles &amp; Access</h2>
          <p className="text-sm text-[#5a6878]">Define roles, their module access, and approval chains.</p>
        </div>
        <button onClick={fetchData} className="p-2 text-[#5a6878] hover:text-[#e2e8f0] transition-colors"><RefreshCw size={14} /></button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1">
        {[
          { id: 'roles', label: 'Roles & Module Access', icon: Shield },
          { id: 'chains', label: 'Approval Chains', icon: GitBranch },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${subTab === t.id ? 'bg-[#f5a623] text-black' : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#1a2028]'}`}>
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-[#5a6878] text-[12px]">Loading...</div>
      ) : subTab === 'roles' ? (
        <RolesPanel roles={roles} departments={departments} designations={designations} branches={branches} moduleCap={usage?.enabledModules || 'all'} onRefresh={fetchData} />
      ) : (
        <ChainsPanel chains={chains} roles={roles} onRefresh={fetchData} />
      )}
    </div>
  );
}

/* ── Roles Panel ─────────────────────────────────────────────── */
function RolesPanel({ roles, departments, designations, branches, moduleCap, onRefresh }: {
  roles: OrgRole[]; departments: string[]; designations: string[]; branches: string[]; moduleCap: string; onRefresh: () => void;
}) {
  const empty = { name: '', level: '1', moduleAccess: 'all', departments: '', designations: '', branches: '', color: '#f5a623' };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; count: number } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    if (!form.name.trim()) { toast.error('Role name is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/tenant/roles', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editId ? { id: editId, ...form } : form),
      });
      const data = await res.json();
      if (data.success) { toast.success(editId ? 'Role updated' : 'Role created'); onRefresh(); setShowForm(false); setForm(empty); setEditId(null); }
      else toast.error(data.error);
    } finally { setSaving(false); }
  };

  const confirmDelete = (r: OrgRole) => {
    setDeleteTarget({ id: r.id, name: r.name, count: r.currentCount ?? 0 });
    setDeleteError(null);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/tenant/roles', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) });
      const data = await res.json();
      if (data.success) {
        toast.success('Role deleted');
        setDeleteTarget(null);
        onRefresh();
      } else {
        // Show the reason inline — don't dismiss the dialog
        setDeleteError(data.error || 'Failed to delete role');
      }
    } catch {
      setDeleteError('Network error — please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const sorted = [...roles].sort((a, b) => a.level - b.level);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[#5a6878]">Define business roles and their module access. Level 1 is the highest authority (just below admin); higher numbers are lower positions.</p>
        <button onClick={() => { setShowForm(true); setForm(empty); setEditId(null); }}
          className="vc-btn-primary flex items-center gap-1.5"><Plus size={13} /> Add Role</button>
      </div>

      {showForm && (
        <div className="bg-[#0d1117] border border-[#252e3a] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#e2e8f0]">{editId ? 'Edit Role' : 'New Role'}</span>
            <button onClick={() => setShowForm(false)}><X size={14} className="text-[#5a6878]" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role Name *">
              <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. HR Manager" />
            </Field>
            <Field label="Hierarchy Level *">
              <input className={inp} type="number" min="1" max="100" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} placeholder="1 = highest" />
            </Field>
            <Field label="Module Access" span2>
              <ModuleSelect value={form.moduleAccess} onChange={v => setForm(f => ({ ...f, moduleAccess: v }))} cap={moduleCap} />
              {moduleCap && moduleCap !== 'all' && (
                <p className="text-[10px] text-[#5a6878] mt-1">Only modules enabled for your company are shown. Contact your provider to enable more.</p>
              )}
            </Field>
            <Field label="Badge Color">
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-9 rounded-lg border border-[#2e3a48] bg-[#0d1117] cursor-pointer p-1" />
                <div className="flex gap-1 flex-wrap">
                  {ROLE_COLORS.map(c => <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-5 h-5 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ background: c }} />)}
                </div>
              </div>
            </Field>
            <Field label="Departments (blank = universal)">
              <TagInput value={form.departments} options={departments} placeholder="All departments" onChange={v => setForm(f => ({ ...f, departments: v }))} />
            </Field>
            <Field label="Designations (blank = universal)">
              <TagInput value={form.designations} options={designations} placeholder="All designations" onChange={v => setForm(f => ({ ...f, designations: v }))} />
            </Field>
            <Field label="Sites / Branches (blank = universal)" span2>
              <TagInput value={form.branches} options={branches} placeholder="All sites" onChange={v => setForm(f => ({ ...f, branches: v }))} />
            </Field>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg border border-[#00d4ff]/25 bg-[#00d4ff]/[0.06] px-3 py-2.5">
            <Shield size={13} className="text-[#00d4ff] shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#8899aa] leading-relaxed">
              These describe <span className="text-[#e2e8f0] font-semibold">who holds this role</span>, not who they can approve for.
              A role set to dept <span className="text-[#e2e8f0]">HR</span> and site <span className="text-[#e2e8f0]">Mumbai</span> means its holders
              <span className="text-[#e2e8f0]"> are</span> the HR staff at Mumbai — so when a chain step names this role, the request goes to those people.
              Users assigned the role whose own department/designation/site disagrees are skipped.
              Leave a filter blank to leave that axis unrestricted.
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="vc-btn-primary disabled:opacity-50">{saving ? 'Saving...' : 'Save Role'}</button>
            <button onClick={() => setShowForm(false)} className="vc-btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="bg-[#0d1117] border border-[#252e3a] rounded-xl p-4">
          <p className="text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-3">Hierarchy (highest → lowest authority)</p>
          <div className="flex items-center gap-2 flex-wrap">
            {sorted.map((r, i) => (
              <div key={r.id} className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <div className="px-3 py-1.5 rounded-lg text-[11px] font-bold border" style={{ background: `${r.color}15`, color: r.color, borderColor: `${r.color}40` }}>{r.name}</div>
                  <span className="text-[9px] text-[#5a6878] mt-0.5">Level {r.level}</span>
                </div>
                {i < sorted.length - 1 && <ArrowRight size={14} className="text-[#2e3a48] shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Delete confirmation panel ── */}
      {deleteTarget && (
        <div className="bg-[#0d1117] border border-[#ff3d3d]/40 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#ff3d3d]/10 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={15} className="text-[#ff3d3d]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-[#e2e8f0]">
                Delete &ldquo;{deleteTarget.name}&rdquo;?
              </div>
              {deleteTarget.count > 0 ? (
                <p className="text-[11px] text-[#8899aa] mt-0.5">
                  This role has <span className="text-[#ffab40] font-semibold">{deleteTarget.count} user{deleteTarget.count !== 1 ? 's' : ''}</span> assigned to it. You&apos;ll need to reassign or remove them in <span className="text-[#e2e8f0]">User Management</span> before this role can be deleted.
                </p>
              ) : (
                <p className="text-[11px] text-[#8899aa] mt-0.5">This action cannot be undone.</p>
              )}
              {/* Inline error from API (e.g. linked to approval chain) */}
              {deleteError && (
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-[#ff3d3d]/8 border border-[#ff3d3d]/30 px-3 py-2">
                  <AlertTriangle size={12} className="text-[#ff3d3d] shrink-0 mt-0.5" />
                  <span className="text-[11px] text-[#ff3d3d]">{deleteError}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
              className="vc-btn-ghost text-[11px] px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={del}
              disabled={deleting || (deleteTarget.count > 0)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#ff3d3d] text-white hover:bg-[#e63535] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={deleteTarget.count > 0 ? 'Reassign users before deleting this role' : ''}
            >
              <Trash2 size={11} /> {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sorted.map(r => (
          <div key={r.id} className="bg-[#0d1117] border border-[#252e3a] rounded-xl p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-black" style={{ background: `${r.color}20`, color: r.color }}>{r.level}</div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-semibold" style={{ color: r.color }}>{r.name}</span>
                    <span className="text-[9px] font-bold px-2 py-[2px] rounded-full bg-[#252e3a] text-[#8899aa]">
                      {r.moduleAccess === 'all' ? 'All Modules' : r.moduleAccess.split(',').length + ' groups'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-[#5a6878] flex-wrap">
                    <span>Depts: <span className="text-[#8899aa]">{r.departments || 'Universal'}</span></span>
                    <span>Desig: <span className="text-[#8899aa]">{r.designations || 'Universal'}</span></span>
                    <span>Sites: <span className="text-[#8899aa]">{r.branches || 'Universal'}</span></span>
                    <span>Users: <span className="text-[#8899aa]">{r.currentCount ?? 0}</span></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => { setForm({ name: r.name, level: String(r.level), moduleAccess: r.moduleAccess, departments: r.departments, designations: r.designations, branches: r.branches || '', color: r.color }); setEditId(r.id); setShowForm(true); }} className="p-1.5 text-[#5a6878] hover:text-[#f5a623] transition-colors"><Pencil size={12} /></button>
                <button onClick={() => confirmDelete(r)} className="p-1.5 text-[#5a6878] hover:text-[#ff3d3d] transition-colors"><Trash2 size={12} /></button>
              </div>
            </div>
          </div>
        ))}
        {sorted.length === 0 && <div className="text-center py-8 text-[#5a6878] text-[11px]">No roles defined yet. Add your first role.</div>}
      </div>
    </div>
  );
}

/* ── Chains Panel — role tree builder ───────────────────────── */
function ChainsPanel({ chains, roles, onRefresh }: {
  chains: ApprovalChain[]; roles: OrgRole[]; onRefresh: () => void;
}) {
  const emptyChain = { name: '', description: '', requesterRoleId: '' };
  const [form, setForm] = useState(emptyChain);
  const [treeSteps, setTreeSteps] = useState<{ roleId: string; scope: string; isRequired: boolean }[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedChain, setExpandedChain] = useState<string | null>(null);

  const sortedRoles = [...roles].sort((a, b) => a.level - b.level);
  const roleById = (id: string) => roles.find(r => r.id === id);

  const requesterRole = form.requesterRoleId ? roleById(form.requesterRoleId) : null;
  const isLevel1Requester = !!requesterRole && requesterRole.level <= 1;
  // Only HIGHER authority (lower level number) than the requester may approve.
  // The requester's own level and every level below it are auto-exempted.
  const eligibleApprovers = requesterRole
    ? roles.filter(r => r.level < requesterRole.level).sort((a, b) => b.level - a.level)
    : [];

  // When the requester changes, drop any selected approvers that are no longer eligible.
  useEffect(() => {
    if (!requesterRole) return;
    setTreeSteps(prev => {
      const next = prev.filter(s => {
        const role = roleById(s.roleId);
        return role && role.level < requesterRole.level;
      });
      return next.length === prev.length ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.requesterRoleId]);

  const addRoleToTree = (roleId: string) => {
    if (treeSteps.find(s => s.roleId === roleId)) return;
    setTreeSteps(prev => [...prev, { roleId, scope: 'universal', isRequired: true }]);
  };
  const removeFromTree = (roleId: string) => setTreeSteps(prev => prev.filter(s => s.roleId !== roleId));
  const updateTreeStep = (roleId: string, field: string, value: any) => setTreeSteps(prev => prev.map(s => s.roleId === roleId ? { ...s, [field]: value } : s));
  const moveUp = (idx: number) => { if (idx === 0) return; setTreeSteps(prev => { const n = [...prev]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n; }); };
  const moveDown = (idx: number) => setTreeSteps(prev => { if (idx >= prev.length - 1) return prev; const n = [...prev]; [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]]; return n; });

  const openEdit = (chain: ApprovalChain) => {
    setForm({ name: chain.name, description: chain.description, requesterRoleId: chain.requesterRoleId || '' });
    setTreeSteps(chain.steps.map(s => ({ roleId: s.approverRoleId, scope: s.scope, isRequired: s.isRequired })));
    setEditId(chain.id);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Chain name is required'); return; }
    if (!form.requesterRoleId) { toast.error('Select the role this chain applies to'); return; }
    if (isLevel1Requester) { toast.error('Level-1 roles go directly to admin — no chain needed'); return; }
    if (treeSteps.length === 0) { toast.error('Add at least one approver role'); return; }
    setSaving(true);
    try {
      const payload = {
        ...(editId ? { id: editId } : {}),
        ...form,
        requesterRoleId: form.requesterRoleId || null,
        steps: treeSteps.map(s => ({ approverRoleId: s.roleId, scope: s.scope, selfEscalateToRoleId: null, isRequired: s.isRequired })),
      };
      const res = await fetch('/api/tenant/approval-chains', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) { toast.success(editId ? 'Chain updated' : 'Chain created'); onRefresh(); setShowForm(false); setForm(emptyChain); setTreeSteps([]); setEditId(null); }
      else toast.error(data.error);
    } finally { setSaving(false); }
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete chain "${name}"?`)) return;
    const res = await fetch('/api/tenant/approval-chains', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const data = await res.json();
    if (data.success) { toast.success('Chain deleted'); onRefresh(); } else toast.error(data.error);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[#5a6878]">Build approval chains by selecting roles. Only higher-authority roles (lower level numbers) can approve. Requests flow from the requester upward.</p>
        <button onClick={() => { setShowForm(true); setForm(emptyChain); setTreeSteps([]); setEditId(null); }}
          className="vc-btn-primary flex items-center gap-1.5"><Plus size={13} /> Add Chain</button>
      </div>

      {showForm && (
        <div className="bg-[#0d1117] border border-[#252e3a] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#e2e8f0]">{editId ? 'Edit Approval Chain' : 'New Approval Chain'}</span>
            <button onClick={() => setShowForm(false)}><X size={14} className="text-[#5a6878]" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Applies to Role">
              <select className={inp} value={form.requesterRoleId} onChange={e => setForm(f => ({ ...f, requesterRoleId: e.target.value }))}>
                <option value="">Select role...</option>
                {sortedRoles.map(r => <option key={r.id} value={r.id}>{r.name} — Level {r.level}{r.level <= 1 ? ' (top)' : ''}</option>)}
              </select>
              <p className="text-[10px] text-[#5a6878] mt-1">Level-1 roles go directly to admin. Other roles need a chain.</p>
            </Field>
            <Field label="Chain Name *">
              <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Employee Approval Chain" />
            </Field>
            <Field label="Description" span2>
              <input className={inp} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </Field>
          </div>

          {isLevel1Requester && (
            <div className="flex items-start gap-3 rounded-xl border border-[#00d4ff]/30 bg-[#00d4ff]/8 p-3">
              <Shield size={16} className="text-[#00d4ff] shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] font-semibold text-[#00d4ff]">No chain needed for Level 1</div>
                <p className="text-[10px] text-[#8899aa] mt-0.5">{requesterRole?.name} is the highest authority below admin. Their requests go directly to the admin for approval, so an approval chain isn&apos;t required.</p>
              </div>
            </div>
          )}

          <div className={`grid grid-cols-2 gap-4 ${isLevel1Requester ? 'hidden' : ''}`}>
            <div>
              <label className={lbl}>Eligible Approvers — click to add</label>
              <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-3 space-y-1.5 max-h-[280px] overflow-y-auto">
                {!requesterRole && <p className="text-[10px] text-[#5a6878] text-center py-4">Select the role this chain applies to first.</p>}
                {requesterRole && isLevel1Requester && (
                  <p className="text-[10px] text-[#5a6878] text-center py-4">Level-1 is the top authority — requests go straight to admin.</p>
                )}
                {requesterRole && !isLevel1Requester && eligibleApprovers.length === 0 && (
                  <p className="text-[10px] text-[#5a6878] text-center py-4">No higher-authority roles exist above this one.</p>
                )}
                {requesterRole && !isLevel1Requester && eligibleApprovers.map(role => {
                  const inChain = treeSteps.some(s => s.roleId === role.id);
                  return (
                    <button key={role.id} onClick={() => inChain ? removeFromTree(role.id) : addRoleToTree(role.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${inChain ? 'border-[#f5a623]/50 bg-[#f5a623]/10' : 'border-[#252e3a] hover:border-[#f5a623]/30 hover:bg-[#1a2028]'}`}>
                      <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black shrink-0" style={{ background: `${role.color}20`, color: role.color }}>{role.level}</div>
                      <div className="flex-1 min-w-0">
                        {/* Unselected role names must follow the theme. A literal
                            #e2e8f0 here is invisible on the light panel, because
                            inline styles are not reachable by the light-mode CSS
                            overrides that remap the equivalent utility class. */}
                        <div
                          className="text-[11px] font-semibold truncate"
                          style={{ color: inChain ? role.color : 'var(--vc-text)' }}
                        >
                          {role.name}
                        </div>
                        {scopeLabel(role) && <div className="text-[9px] text-[#5a6878] truncate">{scopeLabel(role)}</div>}
                      </div>
                      {inChain && <Check size={11} className="text-[#f5a623] shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-[#5a6878] mt-1.5">Only roles above the requester are shown. Admin always has final authority.</p>
            </div>

            <div>
              <label className={lbl}>Approval Order</label>
              {treeSteps.length === 0 ? (
                <div className="bg-[#161c24] border border-dashed border-[#252e3a] rounded-xl p-6 text-center">
                  <GitBranch size={20} className="mx-auto text-[#2e3a48] mb-2" />
                  <p className="text-[10px] text-[#5a6878]">Click roles on the left to add them</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#161c24] border border-[#252e3a] rounded-lg">
                    <div className="w-5 h-5 rounded bg-[#252e3a] flex items-center justify-center text-[9px] text-[#5a6878]">R</div>
                    <span className="text-[10px] text-[#5a6878]">Requester (submits)</span>
                  </div>
                  {treeSteps.map((step, idx) => {
                    const role = roleById(step.roleId);
                    if (!role) return null;
                    return (
                      <div key={step.roleId}>
                        <div className="flex justify-center py-0.5"><ArrowRight size={12} className="text-[#2e3a48] rotate-90" /></div>
                        <div className="border rounded-xl p-2.5 space-y-2" style={{ borderColor: `${role.color}40`, background: `${role.color}08` }}>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black shrink-0" style={{ background: `${role.color}20`, color: role.color }}>{idx + 1}</div>
                            <span className="text-[11px] font-semibold flex-1" style={{ color: role.color }}>{role.name}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-0.5 text-[#5a6878] hover:text-[#e2e8f0] disabled:opacity-30 transition-colors"><ChevronUp size={11} /></button>
                              <button onClick={() => moveDown(idx)} disabled={idx === treeSteps.length - 1} className="p-0.5 text-[#5a6878] hover:text-[#e2e8f0] disabled:opacity-30 transition-colors"><ChevronDown size={11} /></button>
                              <button onClick={() => removeFromTree(step.roleId)} className="p-0.5 text-[#5a6878] hover:text-[#ff3d3d] transition-colors"><X size={11} /></button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider block mb-1">Scope</label>
                              <select value={step.scope} onChange={e => updateTreeStep(step.roleId, 'scope', e.target.value)} className="w-full bg-[#0d1117] border border-[#2e3a48] rounded-md px-2 py-1 text-[10px] text-[#e2e8f0] outline-none">
                                {SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </div>
                            <div className="flex items-end pb-1">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={step.isRequired} onChange={e => updateTreeStep(step.roleId, 'isRequired', e.target.checked)} className="accent-[#f5a623]" />
                                <span className="text-[10px] text-[#8899aa]">Required</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-center py-0.5"><ArrowRight size={12} className="text-[#2e3a48] rotate-90" /></div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#00e676]/8 border border-[#00e676]/20 rounded-lg">
                    <Check size={12} className="text-[#00e676]" />
                    <span className="text-[10px] text-[#00e676] font-semibold">Approved</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving || isLevel1Requester} className="vc-btn-primary disabled:opacity-50">{saving ? 'Saving...' : 'Save Chain'}</button>
            <button onClick={() => setShowForm(false)} className="vc-btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {chains.map(chain => (
          <div key={chain.id} className="bg-[#0d1117] border border-[#252e3a] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-[#161c24] transition-colors" onClick={() => setExpandedChain(expandedChain === chain.id ? null : chain.id)}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${chain.isActive ? 'bg-[#00e676]/10' : 'bg-[#5a6878]/10'}`}>
                  <GitBranch size={14} className={chain.isActive ? 'text-[#00e676]' : 'text-[#5a6878]'} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-[#e2e8f0]">{chain.name}</span>
                    {chain.requesterRole ? (
                      <span className="text-[9px] font-bold px-2 py-[2px] rounded-full border" style={{ background: `${chain.requesterRole.color}15`, color: chain.requesterRole.color, borderColor: `${chain.requesterRole.color}40` }}>{chain.requesterRole.name} · Lv.{chain.requesterRole.level}</span>
                    ) : (
                      <span className="text-[9px] font-bold px-2 py-[2px] rounded-full bg-[#252e3a] text-[#8899aa]">All Roles</span>
                    )}
                    <span className="text-[9px] text-[#5a6878]">{chain.steps.length} step{chain.steps.length !== 1 ? 's' : ''}</span>
                  </div>
                  {chain.description && <p className="text-[10px] text-[#5a6878] mt-0.5">{chain.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={e => { e.stopPropagation(); openEdit(chain); }} className="p-1.5 text-[#5a6878] hover:text-[#f5a623] transition-colors"><Pencil size={12} /></button>
                <button onClick={e => { e.stopPropagation(); del(chain.id, chain.name); }} className="p-1.5 text-[#5a6878] hover:text-[#ff3d3d] transition-colors"><Trash2 size={12} /></button>
                {expandedChain === chain.id ? <ChevronUp size={13} className="text-[#5a6878]" /> : <ChevronDown size={13} className="text-[#5a6878]" />}
              </div>
            </div>
            {expandedChain === chain.id && (
              <div className="border-t border-[#252e3a] p-4 bg-[#161c24]">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="px-3 py-1.5 rounded-lg bg-[#252e3a] text-[10px] text-[#8899aa]">Requester</div>
                  {chain.steps.map((step, i) => {
                    const role = step.approverRole;
                    return (
                      <div key={step.id || i} className="flex items-center gap-2">
                        <ArrowRight size={12} className="text-[#2e3a48]" />
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="px-3 py-1.5 rounded-lg text-[10px] font-semibold border" style={role ? { background: `${role.color}15`, color: role.color, borderColor: `${role.color}40` } : { background: '#252e3a', color: '#5a6878', borderColor: '#2e3a48' }}>{step.stepNumber}. {role?.name || '?'}</div>
                          <div className="text-[9px] text-[#5a6878]">{step.scope === 'universal' ? 'any dept' : step.scope.replace('same_', '')}{!step.isRequired && ' · optional'}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-2">
                    <ArrowRight size={12} className="text-[#2e3a48]" />
                    <div className="px-3 py-1.5 rounded-lg bg-[#00e676]/10 border border-[#00e676]/20 text-[10px] text-[#00e676] font-semibold flex items-center gap-1"><Check size={10} /> Approved</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {chains.length === 0 && <div className="text-center py-8 text-[#5a6878] text-[11px]">No approval chains defined yet.</div>}
      </div>
    </div>
  );
}
