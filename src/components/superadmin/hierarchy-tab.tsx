'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, X, ChevronDown, ChevronUp,
  ArrowRight, Shield, GitBranch, Check, AlertTriangle, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import ModuleSelect from './module-select';

/* ── Types ─────────────────────────────────────────────────────── */
interface OrgRole {
  id: string; tenantId: string; name: string; level: number; maxUsers: number;
  moduleAccess: string; departments: string; designations: string;
  color: string; isActive: boolean;
}

interface ApprovalStep {
  id?: string; stepNumber: number;
  approverRoleId: string; approverRole?: OrgRole;
  scope: string;
  selfEscalateToRoleId?: string; selfEscalateTo?: OrgRole;
  isRequired: boolean;
}

interface ApprovalChain {
  id: string; tenantId: string; requestType: string; name: string;
  description: string; isActive: boolean; steps: ApprovalStep[];
}

interface TenantData {
  departments: { id: number; name: string }[];
  designations: { id: number; name: string }[];
}

/* ── Constants ─────────────────────────────────────────────────── */
const REQUEST_TYPES = [
  { value: 'leave', label: 'Leave Request' },
  { value: 'expense', label: 'Expense Claim' },
  { value: 'attendance', label: 'Attendance Correction' },
  { value: 'payroll', label: 'Payroll Approval' },
  { value: 'custom', label: 'Custom' },
];

const SCOPE_OPTIONS = [
  { value: 'universal', label: 'Universal (any dept)' },
  { value: 'same_department', label: 'Same Department only' },
  { value: 'same_branch', label: 'Same Branch only' },
];

const ROLE_COLORS = [
  '#f5a623', '#00d4ff', '#00e676', '#a78bfa', '#ff3d3d',
  '#ff9800', '#00bcd4', '#4caf50', '#9c27b0', '#f44336',
];

/* ── Shared styles ─────────────────────────────────────────────── */
const inp = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]/60 transition-colors placeholder:text-[#5a6878]';
const lbl = 'block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5';

function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <label className={lbl}>{label}</label>
      {children}
    </div>
  );
}

/* ── Multi-value tag input (for departments/designations) ──────── */
function TagInput({ value, options, placeholder, onChange }: {
  value: string; options: string[]; placeholder: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const tags = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  const toggle = (opt: string) => {
    const next = new Set(tags);
    if (next.has(opt)) next.delete(opt); else next.add(opt);
    onChange([...next].join(','));
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] hover:border-[#f5a623]/40 transition-colors min-h-[36px]">
        {tags.length === 0 ? (
          <span className="text-[#5a6878]">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {tags.map(t => (
              <span key={t} className="bg-[#f5a623]/15 text-[#f5a623] text-[10px] font-medium px-2 py-[2px] rounded-md">{t}</span>
            ))}
          </div>
        )}
        {open ? <ChevronUp size={12} className="text-[#5a6878] shrink-0 ml-2" /> : <ChevronDown size={12} className="text-[#5a6878] shrink-0 ml-2" />}
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#161c24] border border-[#252e3a] rounded-xl shadow-2xl p-2 max-h-[200px] overflow-y-auto space-y-1">
          <button onClick={() => { onChange(''); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#1a2028] transition-colors">
            Clear (Universal)
          </button>
          {options.map(opt => {
            const sel = tags.includes(opt);
            return (
              <button key={opt} onClick={() => toggle(opt)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors ${sel ? 'bg-[#f5a623]/10' : 'hover:bg-[#1a2028]'}`}>
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${sel ? 'bg-[#f5a623] border-[#f5a623]' : 'border-[#2e3a48]'}`}>
                  {sel && <Check size={9} className="text-black" />}
                </div>
                <span className={`text-[11px] ${sel ? 'text-[#e2e8f0] font-medium' : 'text-[#8899aa]'}`}>{opt}</span>
              </button>
            );
          })}
          {options.length === 0 && (
            <p className="text-[10px] text-[#5a6878] px-3 py-2">No options — tenant DB may not have data yet</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN HIERARCHY TAB
   ════════════════════════════════════════════════════════════════ */
export default function HierarchyTab({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const [subTab, setSubTab] = useState<'roles' | 'chains'>('roles');
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [chains, setChains] = useState<ApprovalChain[]>([]);
  const [tenantData, setTenantData] = useState<TenantData>({ departments: [], designations: [] });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, chainsRes, tdRes] = await Promise.all([
        fetch(`/api/superadmin/org-roles?tenantId=${tenantId}`).then(r => r.json()),
        fetch(`/api/superadmin/approval-chains?tenantId=${tenantId}`).then(r => r.json()),
        fetch(`/api/superadmin/tenant-data?tenantId=${tenantId}`).then(r => r.json()),
      ]);
      if (rolesRes.success) setRoles(rolesRes.data);
      if (chainsRes.success) setChains(chainsRes.data);
      if (tdRes.success) setTenantData(tdRes.data);
    } catch { toast.error('Failed to load hierarchy data'); }
    finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-[#e2e8f0]">Access & Approval Hierarchy</h3>
          <p className="text-[11px] text-[#5a6878] mt-0.5">{tenantName}</p>
        </div>
        <button onClick={fetchData} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0] transition-colors">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1">
        {[
          { id: 'roles', label: 'Role Definitions', icon: Shield },
          { id: 'chains', label: 'Approval Chains', icon: GitBranch },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${subTab === t.id ? 'bg-[#f5a623] text-black' : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#1a2028]'}`}>
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-[#5a6878] text-[12px]">Loading...</div>
      ) : (
        <>
          {subTab === 'roles' && (
            <RolesPanel
              roles={roles} tenantId={tenantId}
              departments={tenantData.departments.map(d => d.name)}
              designations={tenantData.designations.map(d => d.name)}
              onRefresh={fetchData}
            />
          )}
          {subTab === 'chains' && (
            <ChainsPanel chains={chains} roles={roles} tenantId={tenantId} onRefresh={fetchData} />
          )}
        </>
      )}
    </div>
  );
}

/* ── Roles Panel ─────────────────────────────────────────────── */
function RolesPanel({ roles, tenantId, departments, designations, onRefresh }: {
  roles: OrgRole[]; tenantId: string;
  departments: string[]; designations: string[];
  onRefresh: () => void;
}) {
  const empty = { name: '', level: '1', maxUsers: '0', moduleAccess: 'all', departments: '', designations: '', color: '#f5a623' };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name) { toast.error('Role name is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/org-roles', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editId ? { id: editId, ...form } : { tenantId, ...form }),
      });
      const data = await res.json();
      if (data.success) { toast.success(editId ? 'Role updated' : 'Role created'); onRefresh(); setShowForm(false); setForm(empty); setEditId(null); }
      else toast.error(data.error);
    } finally { setSaving(false); }
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete role "${name}"?`)) return;
    const res = await fetch('/api/superadmin/org-roles', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const data = await res.json();
    if (data.success) { toast.success('Role deleted'); onRefresh(); }
    else toast.error(data.error);
  };

  // Sort roles by level for display
  const sorted = [...roles].sort((a, b) => a.level - b.level);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[#5a6878]">Define business roles and their module access. Higher level = more authority.</p>
        <button onClick={() => { setShowForm(true); setForm(empty); setEditId(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5a623] text-black text-[11px] font-bold rounded-lg hover:bg-[#e8891a] transition-colors">
          <Plus size={12} /> Add Role
        </button>
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
              <input className={inp} type="number" min="1" max="100" value={form.level}
                onChange={e => setForm(f => ({ ...f, level: e.target.value }))} placeholder="1 = lowest, 10 = highest" />
            </Field>
            <Field label="Max Users (0 = unlimited)">
              <input className={inp} type="number" min="0" value={form.maxUsers}
                onChange={e => setForm(f => ({ ...f, maxUsers: e.target.value }))}
                placeholder="0 = no limit" />
              <p className="text-[10px] text-[#5a6878] mt-1">
                Limits how many users the tenant admin can create with this role. Superadmin-created users are exempt.
              </p>
            </Field>
            <Field label="Module Access">
              <ModuleSelect value={form.moduleAccess} onChange={v => setForm(f => ({ ...f, moduleAccess: v }))} />
            </Field>
            <Field label="Badge Color">
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="w-10 h-9 rounded-lg border border-[#2e3a48] bg-[#0d1117] cursor-pointer p-1" />
                <div className="flex gap-1 flex-wrap">
                  {ROLE_COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-5 h-5 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
            </Field>
            <Field label="Departments (blank = universal)">
              <TagInput value={form.departments} options={departments} placeholder="All departments" onChange={v => setForm(f => ({ ...f, departments: v }))} />
            </Field>
            <Field label="Designations (blank = universal)">
              <TagInput value={form.designations} options={designations} placeholder="All designations" onChange={v => setForm(f => ({ ...f, designations: v }))} />
            </Field>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-[#f5a623] text-black text-[11px] font-bold rounded-lg hover:bg-[#e8891a] disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : 'Save Role'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-[11px] text-[#8899aa] border border-[#252e3a] rounded-lg hover:border-[#f5a623] transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Hierarchy visual */}
      {sorted.length > 0 && (
        <div className="bg-[#0d1117] border border-[#252e3a] rounded-xl p-4">
          <p className="text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-3">Hierarchy (lowest → highest)</p>
          <div className="flex items-center gap-2 flex-wrap">
            {sorted.map((r, i) => (
              <div key={r.id} className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <div className="px-3 py-1.5 rounded-lg text-[11px] font-bold border"
                    style={{ background: `${r.color}15`, color: r.color, borderColor: `${r.color}40` }}>
                    {r.name}
                  </div>
                  <span className="text-[9px] text-[#5a6878] mt-0.5">Level {r.level}</span>
                </div>
                {i < sorted.length - 1 && <ArrowRight size={14} className="text-[#2e3a48] shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role cards */}
      <div className="space-y-2">
        {sorted.map(r => (
          <div key={r.id} className="bg-[#0d1117] border border-[#252e3a] rounded-xl p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-black"
                  style={{ background: `${r.color}20`, color: r.color }}>
                  {r.level}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-semibold" style={{ color: r.color }}>{r.name}</span>
                    <span className="text-[9px] font-bold px-2 py-[2px] rounded-full bg-[#252e3a] text-[#8899aa]">
                      {r.moduleAccess === 'all' ? 'All Modules' : r.moduleAccess.split(',').length + ' groups'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-[#5a6878]">
                    <span>Depts: <span className="text-[#8899aa]">{r.departments || 'Universal'}</span></span>
                    <span>Desig: <span className="text-[#8899aa]">{r.designations || 'Universal'}</span></span>
                    <span>
                      Max users: <span className={r.maxUsers > 0 ? 'text-[#f5a623] font-semibold' : 'text-[#8899aa]'}>
                        {r.maxUsers > 0 ? r.maxUsers : 'Unlimited'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => {
                  setForm({ name: r.name, level: String(r.level), maxUsers: String((r as any).maxUsers ?? 0), moduleAccess: r.moduleAccess, departments: r.departments, designations: r.designations, color: r.color });
                  setEditId(r.id); setShowForm(true);
                }} className="p-1.5 text-[#5a6878] hover:text-[#f5a623] transition-colors"><Pencil size={12} /></button>
                <button onClick={() => del(r.id, r.name)} className="p-1.5 text-[#5a6878] hover:text-[#ff3d3d] transition-colors"><Trash2 size={12} /></button>
              </div>
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="text-center py-8 text-[#5a6878] text-[11px]">No roles defined yet. Add your first role.</div>
        )}
      </div>
    </div>
  );
}

/* ── Chains Panel ────────────────────────────────────────────── */
function ChainsPanel({ chains, roles, tenantId, onRefresh }: {
  chains: ApprovalChain[]; roles: OrgRole[]; tenantId: string; onRefresh: () => void;
}) {
  const emptyChain = { requestType: 'leave', name: '', description: '' };
  const emptyStep = { approverRoleId: '', scope: 'universal', selfEscalateToRoleId: '', isRequired: true };

  const [form, setForm] = useState(emptyChain);
  const [steps, setSteps] = useState<typeof emptyStep[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedChain, setExpandedChain] = useState<string | null>(null);

  const addStep = () => setSteps(s => [...s, { ...emptyStep }]);
  const removeStep = (i: number) => setSteps(s => s.filter((_, idx) => idx !== i));
  const updateStep = (i: number, field: string, value: any) =>
    setSteps(s => s.map((step, idx) => idx === i ? { ...step, [field]: value } : step));

  const openEdit = (chain: ApprovalChain) => {
    setForm({ requestType: chain.requestType, name: chain.name, description: chain.description });
    setSteps(chain.steps.map(s => ({
      approverRoleId: s.approverRoleId,
      scope: s.scope,
      selfEscalateToRoleId: s.selfEscalateToRoleId || '',
      isRequired: s.isRequired,
    })));
    setEditId(chain.id);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name || !form.requestType) { toast.error('Request type and name are required'); return; }
    if (steps.some(s => !s.approverRoleId)) { toast.error('All steps must have an approver role'); return; }
    setSaving(true);
    try {
      const payload = {
        ...(editId ? { id: editId } : { tenantId }),
        ...form,
        steps: steps.map(s => ({
          ...s,
          selfEscalateToRoleId: s.selfEscalateToRoleId || null,
        })),
      };
      const res = await fetch('/api/superadmin/approval-chains', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) { toast.success(editId ? 'Chain updated' : 'Chain created'); onRefresh(); setShowForm(false); setForm(emptyChain); setSteps([]); setEditId(null); }
      else toast.error(data.error);
    } finally { setSaving(false); }
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete chain "${name}"?`)) return;
    const res = await fetch('/api/superadmin/approval-chains', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const data = await res.json();
    if (data.success) { toast.success('Chain deleted'); onRefresh(); }
    else toast.error(data.error);
  };

  const roleById = (id: string) => roles.find(r => r.id === id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[#5a6878]">Define multi-step approval chains per request type. Self-approval is automatically escalated.</p>
        <button onClick={() => { setShowForm(true); setForm(emptyChain); setSteps([{ ...emptyStep }]); setEditId(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5a623] text-black text-[11px] font-bold rounded-lg hover:bg-[#e8891a] transition-colors">
          <Plus size={12} /> Add Chain
        </button>
      </div>

      {showForm && (
        <div className="bg-[#0d1117] border border-[#252e3a] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#e2e8f0]">{editId ? 'Edit Approval Chain' : 'New Approval Chain'}</span>
            <button onClick={() => setShowForm(false)}><X size={14} className="text-[#5a6878]" /></button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Request Type *">
              <select className={inp} value={form.requestType} onChange={e => setForm(f => ({ ...f, requestType: e.target.value }))}>
                {REQUEST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Chain Name *">
              <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Leave Approval" />
            </Field>
            <Field label="Description" span2>
              <input className={inp} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </Field>
          </div>

          {/* Steps builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={lbl + ' mb-0'}>Approval Steps</label>
              <button onClick={addStep} className="flex items-center gap-1 text-[10px] text-[#f5a623] hover:text-[#e8891a] font-semibold transition-colors">
                <Plus size={11} /> Add Step
              </button>
            </div>

            {steps.length === 0 && (
              <div className="text-center py-4 text-[#5a6878] text-[11px] border border-dashed border-[#252e3a] rounded-lg">
                No steps yet. Click "Add Step" to build the chain.
              </div>
            )}

            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="bg-[#161c24] border border-[#252e3a] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#f5a623]/20 text-[#f5a623] text-[10px] font-black flex items-center justify-center">
                        {i + 1}
                      </div>
                      <span className="text-[11px] font-semibold text-[#e2e8f0]">Step {i + 1}</span>
                      {i > 0 && <ArrowRight size={12} className="text-[#2e3a48]" />}
                    </div>
                    <button onClick={() => removeStep(i)} className="text-[#5a6878] hover:text-[#ff3d3d] transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={lbl}>Approver Role *</label>
                      <select className={inp} value={step.approverRoleId} onChange={e => updateStep(i, 'approverRoleId', e.target.value)}>
                        <option value="">Select role...</option>
                        {[...roles].sort((a, b) => b.level - a.level).map(r => (
                          <option key={r.id} value={r.id}>{r.name} (Level {r.level})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Scope</label>
                      <select className={inp} value={step.scope} onChange={e => updateStep(i, 'scope', e.target.value)}>
                        {SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>If Self-Approving, Escalate To</label>
                      <select className={inp} value={step.selfEscalateToRoleId} onChange={e => updateStep(i, 'selfEscalateToRoleId', e.target.value)}>
                        <option value="">No escalation</option>
                        {[...roles].sort((a, b) => b.level - a.level).map(r => (
                          <option key={r.id} value={r.id}>{r.name} (Level {r.level})</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={step.isRequired} onChange={e => updateStep(i, 'isRequired', e.target.checked)} className="accent-[#f5a623]" />
                        <span className="text-[11px] text-[#8899aa]">Required step</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Visual chain preview */}
            {steps.length > 0 && (
              <div className="mt-3 p-3 bg-[#161c24] border border-[#252e3a] rounded-xl">
                <p className="text-[10px] text-[#5a6878] font-semibold uppercase tracking-wider mb-2">Chain Preview</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="px-2 py-1 rounded-md bg-[#252e3a] text-[10px] text-[#8899aa]">Requester</div>
                  {steps.map((s, i) => {
                    const role = roleById(s.approverRoleId);
                    const escalate = s.selfEscalateToRoleId ? roleById(s.selfEscalateToRoleId) : null;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <ArrowRight size={12} className="text-[#2e3a48]" />
                        <div className="flex flex-col items-center">
                          <div className="px-2 py-1 rounded-md text-[10px] font-semibold border"
                            style={role ? { background: `${role.color}15`, color: role.color, borderColor: `${role.color}40` } : { background: '#252e3a', color: '#5a6878', borderColor: '#2e3a48' }}>
                            {role?.name || 'Select role'}
                          </div>
                          {escalate && (
                            <div className="text-[9px] text-[#5a6878] mt-0.5 flex items-center gap-1">
                              <AlertTriangle size={8} className="text-[#f5a623]" />
                              self→{escalate.name}
                            </div>
                          )}
                          <div className="text-[9px] text-[#5a6878]">{s.scope === 'universal' ? 'any dept' : s.scope.replace('same_', '')}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-[#f5a623] text-black text-[11px] font-bold rounded-lg hover:bg-[#e8891a] disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : 'Save Chain'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-[11px] text-[#8899aa] border border-[#252e3a] rounded-lg hover:border-[#f5a623] transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Existing chains */}
      <div className="space-y-2">
        {chains.map(chain => (
          <div key={chain.id} className="bg-[#0d1117] border border-[#252e3a] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-[#161c24] transition-colors"
              onClick={() => setExpandedChain(expandedChain === chain.id ? null : chain.id)}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${chain.isActive ? 'bg-[#00e676]/10' : 'bg-[#5a6878]/10'}`}>
                  <GitBranch size={14} className={chain.isActive ? 'text-[#00e676]' : 'text-[#5a6878]'} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-[#e2e8f0]">{chain.name}</span>
                    <span className="text-[9px] font-bold px-2 py-[2px] rounded-full bg-[#f5a623]/10 text-[#f5a623]">
                      {REQUEST_TYPES.find(t => t.value === chain.requestType)?.label || chain.requestType}
                    </span>
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
              <div className="border-t border-[#252e3a] p-3 bg-[#161c24]">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="px-2 py-1 rounded-md bg-[#252e3a] text-[10px] text-[#8899aa]">Requester</div>
                  {chain.steps.map((step, i) => {
                    const role = step.approverRole;
                    return (
                      <div key={step.id || i} className="flex items-center gap-2">
                        <ArrowRight size={12} className="text-[#2e3a48]" />
                        <div className="flex flex-col items-center">
                          <div className="px-2 py-1.5 rounded-lg text-[10px] font-semibold border"
                            style={role ? { background: `${role.color}15`, color: role.color, borderColor: `${role.color}40` } : {}}>
                            Step {step.stepNumber}: {role?.name || '?'}
                          </div>
                          {step.selfEscalateTo && (
                            <div className="text-[9px] text-[#f5a623] mt-0.5 flex items-center gap-1">
                              <AlertTriangle size={8} />
                              self → {step.selfEscalateTo.name}
                            </div>
                          )}
                          <div className="text-[9px] text-[#5a6878]">
                            {step.scope === 'universal' ? 'any dept' : step.scope.replace('same_', '')}
                            {!step.isRequired && ' · optional'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
        {chains.length === 0 && (
          <div className="text-center py-8 text-[#5a6878] text-[11px]">No approval chains defined yet.</div>
        )}
      </div>
    </div>
  );
}
