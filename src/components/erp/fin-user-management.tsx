'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Pencil, Trash2, X, RefreshCw, ShieldCheck, Wallet, UserCheck, Building2, Check, Search,
  ListChecks, Lock, FileSearch, Eye, EyeOff, ChevronLeft, ChevronRight, KeyRound, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUserEmail } from '@/lib/current-user';

// ── Types ────────────────────────────────────────────────────────────
interface Role {
  id: number; code: string; name: string; level: number; readOnly: boolean;
  color: string; isActive: boolean; createdAt: string;
  _count?: { assignments: number; permissions: number };
}
interface Permission {
  id: number; code: string; module: string; action: string; description: string | null;
  finRolePermissions?: Array<{ id: number; role: { id: number; code: string; name: string } }>;
}
interface Assignment {
  id: number; userEmail: string; userName: string | null; siteCode: string | null;
  isActive: boolean; createdAt: string;
  role: { id: number; code: string; name: string; level: number; readOnly: boolean; color: string } | null;
}
interface SodRule { id: number; roleACode: string; roleBCode: string; description: string | null; isActive: boolean; }
interface AuditRow {
  id: number; userEmail: string; module: string; permissionCode: string | null; action: string;
  entityId: string | null; siteCode: string | null; ip: string | null; success: boolean;
  deniedReason: string | null; createdAt: string;
}
interface SiteRef { id: number; name: string; siteCode: string; }
interface TenantUser { id: string; name: string; email: string; phone: string; isActive: boolean; }

type TabId = 'roles' | 'assignments' | 'permissions' | 'sod' | 'audit';

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'roles', label: 'Role Catalog', icon: ShieldCheck },
  { id: 'assignments', label: 'Assignments', icon: UserCheck },
  { id: 'permissions', label: 'Permissions', icon: ListChecks },
  { id: 'sod', label: 'SoD Rules', icon: Lock },
  { id: 'audit', label: 'Audit Log', icon: FileSearch },
];

const inp = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]/60 transition-colors placeholder:text-[#5a6878]';
const lbl = 'block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5';

const LEVEL_COLORS = ['#8899aa', '#f5a623', '#00d4ff', '#00e676', '#7c5cff'];

function actorHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const email = getCurrentUserEmail();
  if (email) headers['x-actor-email'] = email;
  return headers;
}

function levelBadge(level: number) {
  return (
    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
      style={{ background: `${LEVEL_COLORS[level - 1] || '#8899aa'}20`, color: LEVEL_COLORS[level - 1] || '#8899aa' }}>
      {level}
    </span>
  );
}

export default function FinanceUserManagement() {
  const [tab, setTab] = useState<TabId>('roles');

  // Shared data
  const [roles, setRoles] = useState<Role[]>([]);
  const [sites, setSites] = useState<SiteRef[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // Lazy-loaded per-tab data
  const [perms, setPerms] = useState<{ module: string; permissions: Permission[] }[]>([]);
  const [sodRules, setSodRules] = useState<SodRule[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [rr, sr, ur] = await Promise.all([
          fetch('/api/fin/rbac/roles', { headers: actorHeaders() }).then(r => r.json()),
          fetch('/api/fin/sites').then(r => r.json()),
          fetch('/api/tenant/users').then(r => r.json()),
        ]);
        if (rr.success) setRoles(rr.data);
        if (sr.success) setSites(sr.data);
        if (ur.success) setUsers(ur.data);
      } catch { toast.error('Failed to load data'); }
      finally { setLoading(false); }
    };
    load();
  }, [refreshKey]);

  useEffect(() => {
    if (tab === 'permissions') {
      fetch('/api/fin/rbac/permissions?bindings=1', { headers: actorHeaders() }).then(r => r.json())
        .then(j => { if (j.success) setPerms(j.data); })
        .catch(() => toast.error('Failed to load permissions'));
    }
  }, [tab, refreshKey]);

  useEffect(() => {
    if (tab === 'sod') {
      fetch('/api/fin/rbac/sod-rules', { headers: actorHeaders() }).then(r => r.json())
        .then(j => { if (j.success) setSodRules(j.data); })
        .catch(() => toast.error('Failed to load SoD rules'));
    }
  }, [tab, refreshKey]);

  const [auditFilters, setAuditFilters] = useState({ email: '', success: '', page: 1, limit: 50 });
  const loadAudit = useCallback(async (filters?: Partial<typeof auditFilters>) => {
    const f = { ...auditFilters, ...(filters || {}) };
    const p = new URLSearchParams();
    if (f.email) p.set('email', f.email);
    if (f.success) p.set('success', f.success);
    p.set('page', String(f.page));
    p.set('limit', String(f.limit));
    try {
      const j = await fetch(`/api/fin/rbac/audit?${p}`, { headers: actorHeaders() }).then(r => r.json());
      if (j.success) { setAuditRows(j.data); setAuditTotal(j.total || 0); }
      else toast.error(j.error || 'Failed to load audit log');
    } catch { toast.error('Network error loading audit log'); }
  }, [auditFilters]);

  const applyAuditFilter = useCallback((patch: Partial<typeof auditFilters>) => {
    const next = { ...auditFilters, ...patch, page: 1 };
    setAuditFilters(next);
    loadAudit(next);
  }, [auditFilters, loadAudit]);

  useEffect(() => {
    if (tab === 'audit') loadAudit();
  }, [tab, refreshKey, loadAudit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f5a623]/10 rounded-xl flex items-center justify-center">
            <ShieldCheck size={18} className="text-[#f5a623]" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Finance Access Control</h2>
            <p className="text-[11px] text-[#5a6878]">Hierarchical roles, site-scoped assignments, SoD rules and audit trail</p>
          </div>
        </div>
        <button onClick={refresh} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0] transition-colors" title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-1.5 flex-wrap border-b border-[#252e3a] pb-3">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-[6px] rounded-md text-[11px] font-semibold transition-all ${
                tab === t.id ? 'bg-[#f5a623] text-black shadow-sm' : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#141920]'
              }`}>
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'roles' && <RolesTab roles={roles} onChanged={refresh} />}
      {tab === 'assignments' && <AssignmentsTab roles={roles} sites={sites} users={users} onChanged={refresh} />}
      {tab === 'permissions' && <PermissionsTab groups={perms} roles={roles} />}
      {tab === 'sod' && <SodTab roles={roles} rules={sodRules} onChanged={refresh} />}
      {tab === 'audit' && <AuditTab rows={auditRows} total={auditTotal} filters={auditFilters} onApply={applyAuditFilter} />}
    </div>
  );
}

// ── Roles ─────────────────────────────────────────────────────────────
function RolesTab({ roles, onChanged }: { roles: Role[]; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const emptyForm = { code: '', name: '', level: '1', readOnly: false, color: '#00d4ff' };
  const [form, setForm] = useState(emptyForm);
  const formRef = useRef<HTMLDivElement>(null);

  const openNew = () => { setEdit(null); setForm(emptyForm); setSaveError(null); setShowForm(true); };
  const openEdit = (r: Role) => {
    setEdit(r);
    setForm({ code: r.code, name: r.name, level: String(r.level), readOnly: r.readOnly, color: r.color });
    setSaveError(null);
    setShowForm(true);
  };
  // The panel renders below a table that can already be tall (many roles) —
  // without this, "New Role" appears to do nothing because the form opens
  // off-screen below the fold.
  useEffect(() => { if (showForm) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [showForm]);

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) { setSaveError('Code and name are required'); return; }
    setSaveError(null);
    setSaving(true);
    try {
      const url = '/api/fin/rbac/roles';
      const res = edit
        ? await fetch(url, { method: 'PUT', headers: actorHeaders(), body: JSON.stringify({ id: edit.id, name: form.name, level: Number(form.level), readOnly: form.readOnly, color: form.color }) })
        : await fetch(url, { method: 'POST', headers: actorHeaders(), body: JSON.stringify({ code: form.code.trim().toUpperCase().replace(/\s+/g, '_'), name: form.name, level: Number(form.level), readOnly: form.readOnly, color: form.color }) });
      const data = await res.json();
      if (data.success) {
        toast.success(edit ? 'Role updated' : 'Role created');
        setShowForm(false); onChanged();
      } else { toast.error(data.error || 'Failed to save'); setSaveError(data.error || 'Failed to save'); }
    } catch { toast.error('Network error'); setSaveError('Network error — could not reach the server'); }
    finally { setSaving(false); }
  };

  const del = async (r: Role) => {
    if (!confirm(`Delete "${r.name}" (${r.code})? Assignments and permission bindings for this role will be removed.`)) return;
    try {
      const res = await fetch(`/api/fin/rbac/roles?id=${r.id}`, { method: 'DELETE', headers: actorHeaders() });
      const data = await res.json();
      if (data.success) { toast.success('Role deleted'); onChanged(); }
      else toast.error(data.error || 'Failed to delete');
    } catch { toast.error('Network error'); }
  };

  const toggleActive = async (r: Role) => {
    try {
      const res = await fetch('/api/fin/rbac/roles', { method: 'PUT', headers: actorHeaders(), body: JSON.stringify({ id: r.id, isActive: !r.isActive }) });
      const data = await res.json();
      if (data.success) { toast.success(r.isActive ? 'Role deactivated' : 'Role activated'); onChanged(); }
      else toast.error(data.error || 'Failed to update');
    } catch { toast.error('Network error'); }
  };

  const byLevel = (lvl: number) => roles.filter(r => r.level === lvl);
  const sorted = [...roles].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  return (
    <div>
      {/* Level ladder */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map(lvl => (
          <div key={lvl} className="p-3 bg-[#161c24] border border-[#252e3a] rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              {levelBadge(lvl)}
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a6878]">
                {lvl === 1 ? 'Requester' : lvl === 2 ? 'Site Incharge' : lvl === 3 ? 'Line Approver' : lvl === 4 ? 'Finance Head' : 'Director'}
              </span>
            </div>
            <div className="space-y-1">
              {byLevel(lvl).map(r => (
                <div key={r.id} className="flex items-center justify-between px-2 py-1.5 rounded-md border"
                  style={{ background: `${r.color}12`, borderColor: `${r.color}25` }}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                    <span className="text-[11px] font-semibold truncate" style={{ color: r.color }}>{r.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {r.readOnly && <EyeOff size={11} className="text-[#5a6878]" aria-label="Read-only" />}
                    <span className="text-[9px] text-[#5a6878] font-mono">{r._count?.assignments ?? 0}</span>
                  </div>
                </div>
              ))}
              {byLevel(lvl).length === 0 && <div className="px-2 py-1.5 text-[10px] text-[#5a6878]">—</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-semibold text-[#e2e8f0]">Role Catalog <span className="text-[#5a6878] font-normal">({roles.length})</span></span>
        <button onClick={openNew}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] transition-colors">
          <Plus size={13} /> New Role
        </button>
      </div>

      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
              {['Level', 'Code', 'Name', 'Access', 'Assignments', 'Permissions', 'Status', ''].map(h => (
                <th key={h} className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {sorted.map(r => (
                <tr key={r.id} className="hover:bg-[#141920]">
                  <td className="py-3 px-4">{levelBadge(r.level)}</td>
                  <td className="py-3 px-4 font-mono text-[#8899aa]">{r.code}</td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-2 font-semibold text-[#e2e8f0]">
                      <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />{r.name}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {r.readOnly
                      ? <span className="px-2 py-[2px] rounded-full text-[10px] font-semibold bg-[#7c5cff]/15 text-[#a78bfa]"><Eye size={10} className="inline mr-1" />Read-only</span>
                      : <span className="px-2 py-[2px] rounded-full text-[10px] font-semibold bg-[#00e676]/10 text-[#00e676]"><KeyRound size={10} className="inline mr-1" />Full</span>}
                  </td>
                  <td className="py-3 px-4 text-[#8899aa]">{r._count?.assignments ?? 0}</td>
                  <td className="py-3 px-4 text-[#8899aa]">{r._count?.permissions ?? 0}</td>
                  <td className="py-3 px-4">
                    <button onClick={() => toggleActive(r)}
                      className={`px-2 py-[2px] rounded-full text-[10px] font-semibold border transition-colors ${r.isActive ? 'bg-[#00e676]/10 text-[#00e676] border-[#00e676]/25' : 'bg-[#5a6878]/10 text-[#5a6878] border-[#5a6878]/25'}`}>
                      {r.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button>
                      <button onClick={() => del(r)} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-[#5a6878]">No roles yet. Click “New Role” to build the catalog.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div ref={formRef} className="mt-4 bg-[#161c24] border border-[#f5a623]/25 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-[#e2e8f0]">{edit ? `Edit ${edit.code}` : 'New Role'}</span>
            <button onClick={() => setShowForm(false)}><X size={15} className="text-[#5a6878]" /></button>
          </div>
          {saveError && (
            <div className="mb-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-[#ff3d3d]/10 border border-[#ff3d3d]/25 text-[11px] text-[#ff3d3d]">
              <AlertTriangle size={13} className="mt-[1px] shrink-0" /> {saveError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Code *</label>
              <input className={inp + (edit ? ' opacity-50' : '')} value={form.code} disabled={!!edit}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. CUSTODIAN" />
            </div>
            <div>
              <label className={lbl}>Name *</label>
              <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Site Incharge (Custodian)" />
            </div>
            <div>
              <label className={lbl}>Level (1..5) *</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(l => (
                  <button key={l} type="button" onClick={() => setForm(f => ({ ...f, level: String(l) }))}
                    className={`w-9 h-9 rounded-lg text-[12px] font-bold transition-colors border ${form.level === String(l) ? 'text-black border-transparent' : 'text-[#8899aa] border-[#252e3a] hover:border-[#f5a623]/50'}`}
                    style={form.level === String(l) ? { background: LEVEL_COLORS[l - 1] } : undefined}>
                    {l}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#5a6878] mt-1">Higher number = more authority.</p>
            </div>
            <div>
              <label className={lbl}>Badge Color</label>
              <div className="flex items-center gap-1.5">
                {['#00d4ff', '#f5a623', '#00e676', '#7c5cff', '#ff3d3d'].map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={`w-7 h-7 rounded-lg transition-transform border-2 ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>Access Mode</label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setForm(f => ({ ...f, readOnly: false }))}
                  className={`flex-1 px-3 py-2.5 rounded-lg border text-left transition-colors ${!form.readOnly ? 'bg-[#00e676]/8 border-[#00e676]/30' : 'border-[#252e3a] hover:border-[#00e676]/40'}`}>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#00e676]"><KeyRound size={12} /> Full access</div>
                  <div className="text-[10px] text-[#5a6878] mt-0.5">Can create, approve and export as assigned by permissions.</div>
                </button>
                <button type="button" onClick={() => setForm(f => ({ ...f, readOnly: true }))}
                  className={`flex-1 px-3 py-2.5 rounded-lg border text-left transition-colors ${form.readOnly ? 'bg-[#7c5cff]/8 border-[#7c5cff]/40' : 'bg-[#252e3a] border-[#252e3a] hover:border-[#7c5cff]/40'}`}>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#a78bfa]"><Eye size={12} /> Read-only (Auditor)</div>
                  <div className="text-[10px] text-[#5a6878] mt-0.5">View + export only; mutating actions are denied at the gate.</div>
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-[11px] text-[#8899aa] border border-[#252e3a] rounded-lg hover:border-[#00d4ff] transition-colors">Cancel</button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#f5a623] text-black text-[11px] font-bold rounded-lg hover:bg-[#e8891a] disabled:opacity-50 transition-colors">
              <Wallet size={13} /> {saving ? 'Saving...' : edit ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Assignments tab ───────────────────────────────────────────────────
function AssignmentsTab({ roles, sites, users, onChanged }: {
  roles: Role[]; sites: SiteRef[]; users: TenantUser[]; onChanged: () => void;
}) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const emptyForm = { userEmail: '', userName: '', roleId: '', siteCode: '', isActive: true };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const j = await fetch('/api/fin/rbac/assignments', { headers: actorHeaders() }).then(r => r.json());
      if (j.success) setAssignments(j.data || []);
    } catch { toast.error('Failed to load assignments'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeRoles = roles.filter(r => r.isActive);
  const filteredUsers = users.filter(u => {
    if (!u.isActive) return false;
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });
  const selectedUser = form.userEmail ? users.find(u => u.email === form.userEmail) : null;

  const selectUser = (u: TenantUser) => {
    setForm(f => ({ ...f, userEmail: u.email, userName: u.name }));
    setUserSearch(u.name);
    setShowUserDropdown(false);
  };

  const openNew = () => {
    setEditId(null); setForm(emptyForm); setUserSearch(''); setShowUserDropdown(false); setShowForm(true);
  };

  const openEdit = (a: Assignment) => {
    setEditId(a.id);
    setForm({ userEmail: a.userEmail, userName: a.userName || '', roleId: String(a.role?.id || ''), siteCode: a.siteCode || '', isActive: a.isActive });
    setUserSearch(a.userName || a.userEmail);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.userEmail.trim()) { toast.error('Please select a user'); return; }
    if (!form.roleId) { toast.error('Select a role'); return; }
    setSaving(true);
    try {
      const siteCode = form.siteCode || null;
      const payload: any = { userEmail: form.userEmail, userName: form.userName || null, siteCode };
      if (editId) {
        Object.assign(payload, { id: editId });
      } else {
        payload.roleId = Number(form.roleId);
      }
      const res = await fetch('/api/fin/rbac/assignments', {
        method: editId ? 'PUT' : 'POST',
        headers: actorHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editId ? 'Assignment updated' : 'Assignment created');
        setShowForm(false); setEditId(null); setForm(emptyForm); setUserSearch(''); setShowUserDropdown(false);
        await load(); onChanged();
      } else toast.error(data.error || 'Failed to save');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const del = async (a: Assignment) => {
    if (!confirm(`Remove ${a.userName || a.userEmail} from ${a.role?.name || 'role'}?`)) return;
    try {
      const res = await fetch(`/api/fin/rbac/assignments?id=${a.id}`, { method: 'DELETE', headers: actorHeaders() });
      const data = await res.json();
      if (data.success) { toast.success('Assignment removed'); await load(); onChanged(); }
      else toast.error(data.error || 'Failed to delete');
    } catch { toast.error('Network error'); }
  };

  const filtered = assignments.filter(a => {
    if (roleFilter !== 'all' && a.role?.code !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.userEmail.toLowerCase().includes(q) && !(a.userName || '').toLowerCase().includes(q) && !(a.role?.name || '').toLowerCase().includes(q) && !(a.siteCode || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      {/* Legend */}
      <div className="mb-4 p-3 bg-[#161c24] border border-[#252e3a] rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={13} className="text-[#f5a623]" />
          <span className="text-[11px] font-semibold text-[#e2e8f0]">Site-scoped authority</span>
          <span className="text-[10px] text-[#5a6878]">— a role only applies to the site it is assigned to; empty scope means all sites. SoD pairs are blocked at save time (HTTP 409).</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {['all', ...activeRoles.map(r => r.code)].map(v => (
            <button key={v} onClick={() => setRoleFilter(v)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${roleFilter === v ? 'bg-[#f5a623]/15 text-[#f5a623] border border-[#f5a623]/30' : 'text-[#8899aa] border border-transparent hover:bg-[#141920] hover:text-[#e2e8f0]'}`}>
              {v === 'all' ? 'All Roles' : v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6878]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user / email / site..."
              className="pl-9 w-[220px] bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] outline-none focus:border-[#f5a623]/60 placeholder:text-[#5a6878]" />
          </div>
          <button onClick={openNew} disabled={users.length === 0 || activeRoles.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <Plus size={13} /> Assign
          </button>
        </div>
      </div>

      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
              {['User', 'Role', 'Site Scope', 'Status', 'Assigned', ''].map(h => (
                <th key={h} className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {filtered.map((a, i) => (
                <tr key={a.id || i} className="hover:bg-[#141920]">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#252e3a] flex items-center justify-center text-[10px] font-bold text-[#f5a623] shrink-0">
                        {(a.userName || a.userEmail || '?').charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <div className="text-[#e2e8f0] font-semibold">{a.userName || '—'}</div>
                        <div className="text-[10px] text-[#5a6878] font-mono">{a.userEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {a.role && (
                      <span className="px-2 py-[2px] rounded-full text-[10px] font-semibold flex items-center gap-1 w-fit"
                        style={{ background: `${a.role.color}15`, color: a.role.color }}>
                        {a.role.readOnly && <EyeOff size={10} />}{a.role.name}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[#8899aa]">
                    {a.siteCode
                      ? <span className="flex items-center gap-1"><Building2 size={11} className="text-[#00d4ff]" />{a.siteCode}</span>
                      : <span className="flex items-center gap-1"><Check size={11} className="text-[#00e676]" />All Sites</span>}
                  </td>
                  <td className="py-3 px-4 text-[#5a6878]">{a.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="py-3 px-4 text-[#5a6878] font-mono">{new Date(a.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(a)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button>
                      <button onClick={() => del(a)} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-[#5a6878]">No assignments found. Click “Assign” to add one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="mt-4 bg-[#161c24] border border-[#f5a623]/25 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-[#e2e8f0]">{editId ? 'Edit Assignment' : 'New Role Assignment'}</span>
            <button onClick={() => setShowForm(false)}><X size={15} className="text-[#5a6878]" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={lbl}>User *</label>
              <div className="relative">
                <input
                  className={inp + (selectedUser ? ' pr-8' : '')}
                  value={userSearch}
                  onChange={e => {
                    setUserSearch(e.target.value);
                    if (selectedUser) setForm(f => ({ ...f, userEmail: '', userName: '' }));
                    setShowUserDropdown(true);
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  placeholder="Search by name or email..."
                />
                {selectedUser && (
                  <button type="button" onClick={() => { setForm(f => ({ ...f, userEmail: '', userName: '' })); setUserSearch(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6878] hover:text-[#ff3d3d]"><X size={13} /></button>
                )}
                {showUserDropdown && !selectedUser && filteredUsers.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#161c24] border border-[#252e3a] rounded-lg shadow-2xl max-h-[220px] overflow-y-auto">
                    {filteredUsers.map(u => (
                      <button key={u.id} type="button" onClick={() => selectUser(u)}
                        className="w-full text-left px-3 py-2.5 hover:bg-[#1a2028] transition-colors border-b border-[#1e252e] last:border-0">
                        <div className="text-[11px] font-semibold text-[#e2e8f0]">{u.name}</div>
                        <div className="text-[10px] text-[#5a6878]">{u.email}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedUser ? (
                <div className="mt-1.5 px-3 py-2 bg-[#00e676]/8 border border-[#00e676]/20 rounded-lg flex items-center gap-2">
                  <Check size={12} className="text-[#00e676] shrink-0" />
                  <div className="text-[10px] text-[#00e676]">
                    <span className="font-semibold">{selectedUser.name}</span>
                    <span className="text-[#00e676]/70"> · {selectedUser.email}</span>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-[#5a6878] mt-1">Select a system user to assign a finance role.</p>
              )}
            </div>

            <div>
              <label className={lbl}>Role *</label>
              <select value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))} className={inp + ' appearance-none'} disabled={!!editId}>
                <option value="">Select role...</option>
                {activeRoles.map(r => (
                  <option key={r.id} value={r.id}>{r.name} (L{r.level}{r.readOnly ? ' · read-only' : ''})</option>
                ))}
              </select>
              <p className="text-[10px] text-[#5a6878] mt-1">SoD pairings (e.g. Custodian × Finance Head) are blocked automatically.</p>
            </div>

            <div>
              <label className={lbl}>Site Scope</label>
              <select value={form.siteCode} onChange={e => setForm(f => ({ ...f, siteCode: e.target.value }))} className={inp + ' appearance-none'}>
                <option value="">All Sites</option>
                {sites.map(s => <option key={s.id} value={s.siteCode}>{s.name} ({s.siteCode})</option>)}
              </select>
              <p className="text-[10px] text-[#5a6878] mt-1">Custodians are usually site-specific; leave empty for finance/other roles.</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-[11px] text-[#8899aa] border border-[#252e3a] rounded-lg hover:border-[#00d4ff] transition-colors">Cancel</button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#f5a623] text-black text-[11px] font-bold rounded-lg hover:bg-[#e8891a] disabled:opacity-50 transition-colors">
              <Wallet size={13} /> {saving ? 'Saving...' : editId ? 'Update Assignment' : 'Assign Role'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Permissions matrix tab ────────────────────────────────────────────
function PermissionsTab({ groups, roles }: { groups: { module: string; permissions: Permission[] }[]; roles: Role[] }) {
  const [selectedModule, setSelectedModule] = useState<string>('');
  const currentModule = selectedModule && groups.some(g => g.module === selectedModule) ? selectedModule : groups[0]?.module || '';

  const group = groups.find(g => g.module === currentModule);
  return (
    <div>
      <div className="mb-3 flex items-center gap-3 flex-wrap">
        <span className="text-[12px] font-semibold text-[#e2e8f0]">Permission Catalog</span>
        <div className="flex gap-1.5 flex-wrap">
          {groups.map(g => (
            <button key={g.module} onClick={() => setSelectedModule(g.module)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${currentModule === g.module ? 'bg-[#f5a623]/15 text-[#f5a623] border border-[#f5a623]/30' : 'text-[#8899aa] border border-transparent hover:bg-[#141920] hover:text-[#e2e8f0]'}`}>
              {g.module}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
              <th className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Permission</th>
              {roles.map(r => (
                <th key={r.id} className="text-center py-3 px-2 text-[#5a6878] font-semibold text-[9px]">{r.code}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {group?.permissions.map(p => (
                <tr key={p.id} className="hover:bg-[#141920]">
                  <td className="py-2.5 px-4">
                    <div className="font-mono text-[#e2e8f0]">{p.code}</div>
                    {p.description && <div className="text-[10px] text-[#5a6878] mt-0.5">{p.description}</div>}
                  </td>
                  {roles.map(r => {
                    const bound = p.finRolePermissions?.some(bp => bp.role.id === r.id);
                    return (
                      <td key={r.id} className="text-center py-2.5 px-2">
                        {bound
                          ? <span className="inline-flex w-5 h-5 rounded-full items-center justify-center" style={{ background: `${r.color}22`, color: r.color }}><Check size={11} /></span>
                          : <span className="inline-flex w-5 h-5 rounded-full items-center justify-center text-[#2e3a48]">·</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!group && (
                <tr><td colSpan={roles.length + 1} className="py-8 text-center text-[#5a6878]">Loading permission catalog...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[10px] text-[#5a6878] mt-2">Matrix is seeded from the permission catalog; bindings are edited via the Finance RBAC seed script.</p>
    </div>
  );
}

// ── SoD rules tab ─────────────────────────────────────────────────────
function SodTab({ roles, rules, onChanged }: { roles: Role[]; rules: SodRule[]; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<SodRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ roleA: '', roleB: '', description: '' });

  const roleOptions = roles.filter(r => !r.readOnly);

  const openNew = () => { setEdit(null); setForm({ roleA: '', roleB: '', description: '' }); setShowForm(true); };

  const save = async () => {
    if (!form.roleA || !form.roleB) { toast.error('Select both roles'); return; }
    if (form.roleA === form.roleB) { toast.error('Roles must differ'); return; }
    setSaving(true);
    try {
      const payload = { roleACode: form.roleA, roleBCode: form.roleB, description: form.description || null };
      const res = edit
        ? await fetch('/api/fin/rbac/sod-rules', { method: 'PUT', headers: actorHeaders(), body: JSON.stringify({ id: edit.id, description: form.description || null }) })
        : await fetch('/api/fin/rbac/sod-rules', { method: 'POST', headers: actorHeaders(), body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        toast.success(edit ? 'Rule updated' : 'SoD rule added');
        setShowForm(false); setEdit(null); onChanged();
      } else toast.error(data.error || 'Failed to save');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const del = async (r: SodRule) => {
    if (!confirm(`Delete SoD rule ${r.roleACode} × ${r.roleBCode}?`)) return;
    try {
      const res = await fetch(`/api/fin/rbac/sod-rules?id=${r.id}`, { method: 'DELETE', headers: actorHeaders() });
      const data = await res.json();
      if (data.success) { toast.success('SoD rule deleted'); onChanged(); }
      else toast.error(data.error || 'Failed to delete');
    } catch { toast.error('Network error'); }
  };

  const toggle = async (r: SodRule) => {
    try {
      const res = await fetch('/api/fin/rbac/sod-rules', { method: 'PUT', headers: actorHeaders(), body: JSON.stringify({ id: r.id, isActive: !r.isActive }) });
      const data = await res.json();
      if (data.success) { toast.success(r.isActive ? 'Rule disabled' : 'Rule enabled'); onChanged(); }
      else toast.error(data.error || 'Failed to update');
    } catch { toast.error('Network error'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-semibold text-[#e2e8f0]">Segregation of Duties <span className="text-[#5a6878] font-normal">({rules.length})</span></span>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] transition-colors">
          <Plus size={13} /> New Rule
        </button>
      </div>

      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
              {['Role A', 'Role B', 'Description', 'Status', ''].map(h => (
                <th key={h} className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {rules.map(r => (
                <tr key={r.id} className="hover:bg-[#141920]">
                  <td className="py-3 px-4 font-mono text-[#e2e8f0]">{r.roleACode}</td>
                  <td className="py-3 px-4 font-mono text-[#e2e8f0]">{r.roleBCode}</td>
                  <td className="py-3 px-4 text-[#8899aa]">{r.description || '—'}</td>
                  <td className="py-3 px-4">
                    <button onClick={() => toggle(r)}
                      className={`px-2 py-[2px] rounded-full text-[10px] font-semibold border transition-colors ${r.isActive ? 'bg-[#ff3d3d]/10 text-[#ff3d3d] border-[#ff3d3d]/25' : 'bg-[#5a6878]/10 text-[#5a6878] border-[#5a6878]/25'}`}>
                      {r.isActive ? 'Enforced' : 'Paused'}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button onClick={() => { setEdit(r); setForm({ roleA: r.roleACode, roleB: r.roleBCode, description: r.description || '' }); setShowForm(true); }}
                        className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button>
                      <button onClick={() => del(r)} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-[#5a6878]">No rules yet. Add pairs of roles that must never be held by one person.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="mt-4 bg-[#161c24] border border-[#f5a623]/25 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-[#e2e8f0]">{edit ? 'Edit SoD Rule' : 'New SoD Rule'}</span>
            <button onClick={() => setShowForm(false)}><X size={15} className="text-[#5a6878]" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Role A *</label>
              <select value={form.roleA} disabled={!!edit} onChange={e => setForm(f => ({ ...f, roleA: e.target.value }))} className={inp + ' appearance-none'}>
                <option value="">Select role...</option>
                {roleOptions.map(r => <option key={r.code} value={r.code}>{r.name} ({r.code})</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Role B *</label>
              <select value={form.roleB} disabled={!!edit} onChange={e => setForm(f => ({ ...f, roleB: e.target.value }))} className={inp + ' appearance-none'}>
                <option value="">Select role...</option>
                {roleOptions.filter(r => r.code !== form.roleA).map(r => <option key={r.code} value={r.code}>{r.name} ({r.code})</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>Description</label>
              <input className={inp} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Custodian and Finance Head must be different people" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-[11px] text-[#8899aa] border border-[#252e3a] rounded-lg hover:border-[#00d4ff] transition-colors">Cancel</button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#f5a623] text-black text-[11px] font-bold rounded-lg hover:bg-[#e8891a] disabled:opacity-50 transition-colors">
              <Lock size={13} /> {saving ? 'Saving...' : edit ? 'Update Rule' : 'Add Rule'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Audit log tab ─────────────────────────────────────────────────────
function AuditTab({ rows, total, filters, onApply }: {
  rows: AuditRow[]; total: number;
  filters: { email: string; success: string; page: number; limit: number };
  onApply: (patch: Partial<{ email: string; success: string; page: number; limit: number }>) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  const goTo = (page: number) => {
    if (page < 1 || page > totalPages || page === filters.page) return;
    onApply({ page });
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <input value={filters.email} onChange={e => onApply({ email: e.target.value })} placeholder="Filter by email..."
          className="w-[220px] bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] outline-none focus:border-[#f5a623]/60 placeholder:text-[#5a6878]" />
        <select value={filters.success} onChange={e => onApply({ success: e.target.value })} className={inp + ' w-[140px] appearance-none'}>
          <option value="">All outcomes</option>
          <option value="true">Allowed</option>
          <option value="false">Denied</option>
        </select>
        <span className="text-[11px] text-[#5a6878]">{total} record{total === 1 ? '' : 's'}</span>
      </div>

      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
              {['When', 'Actor', 'Module', 'Permission', 'Site', 'IP', 'Outcome', 'Reason'].map(h => (
                <th key={h} className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-[#141920]">
                  <td className="py-3 px-4 text-[#5a6878] font-mono whitespace-nowrap">{new Date(r.createdAt).toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 font-mono text-[#e2e8f0]">{r.userEmail}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-[2px] rounded-full text-[10px] font-semibold bg-[#252e3a] text-[#8899aa]">{r.module}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[#5a6878]">{r.permissionCode || r.action || '—'}</td>
                  <td className="py-3 px-4 font-mono text-[#5a6878]">{r.siteCode || '—'}</td>
                  <td className="py-3 px-4 font-mono text-[#5a6878]">{r.ip || '—'}</td>
                  <td className="py-3 px-4">
                    {r.success
                      ? <Check size={14} className="text-[#00e676]" />
                      : <X size={14} className="text-[#ff3d3d]" />}
                  </td>
                  <td className="py-3 px-4 text-[10px] text-[#5a6878] max-w-[220px] truncate" title={r.deniedReason || ''}>{r.deniedReason || '—'}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-[#5a6878]">No audit records match the filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] text-[#5a6878]">Page {filters.page} of {totalPages}</span>
        <div className="flex gap-1.5">
          <button onClick={() => goTo(filters.page - 1)} disabled={filters.page <= 1}
            className="p-1.5 rounded border border-[#252e3a] text-[#8899aa] hover:text-[#e2e8f0] hover:border-[#00d4ff]/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft size={13} />
          </button>
          <button onClick={() => goTo(filters.page + 1)} disabled={filters.page >= totalPages}
            className="p-1.5 rounded border border-[#252e3a] text-[#8899aa] hover:text-[#e2e8f0] hover:border-[#00d4ff]/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}