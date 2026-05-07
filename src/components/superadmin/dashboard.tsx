'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2, Users, Fingerprint, Shield, LogOut, Plus, Pencil, Trash2,
  X, Eye, EyeOff, RefreshCw, Wifi, WifiOff,
  AlertTriangle, Database, GitBranch, Layers
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { toast } from 'sonner';
import HierarchyTab from './hierarchy-tab';
import TrashTab from './trash-tab';
import ModuleSelect from './module-select';

/* ── Types ─────────────────────────────────────────────────────── */
interface Tenant {
  id: string; name: string; slug: string; dbUrl: string;
  status: string; notes: string; createdAt: string;
  _count?: { users: number; biometric: number };
}

interface TenantUser {
  id: string; tenantId: string; name: string; email: string;
  phone: string; allowedModules: string; isActive: boolean;
  lastActiveAt?: string; createdAt: string;
  tenant?: { name: string; slug: string };
}

interface BiometricConfig {
  id: string; tenantId: string; siteId: string; siteName: string;
  baseUrl: string; corporateId: string; username: string;
  isActive: boolean; createdAt: string;
  tenant?: { name: string; slug: string };
}

/* ── Shared input style ─────────────────────────────────────────── */
const inp = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]/60 transition-colors placeholder:text-[#5a6878]';
const lbl = 'block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className={lbl}>{label}</label>{children}</div>;
}

/* ════════════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ════════════════════════════════════════════════════════════════ */
export default function SuperAdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<'tenants' | 'users' | 'biometric' | 'hierarchy' | 'trash'>('tenants');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [biometric, setBiometric] = useState<BiometricConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [hierarchyTenant, setHierarchyTenant] = useState<Tenant | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tr, ur, br] = await Promise.all([
        fetch('/api/superadmin/tenants').then(r => r.json()),
        fetch('/api/superadmin/users').then(r => r.json()),
        fetch('/api/superadmin/biometric').then(r => r.json()),
      ]);
      if (tr.success) setTenants(tr.data);
      if (ur.success) setUsers(ur.data);
      if (br.success) setBiometric(br.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saUser = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(localStorage.getItem('sa_auth') || '{}'); } catch { return {}; } })()
    : {};

  const tabs = [
    { id: 'tenants', label: 'Tenants', icon: Building2, count: tenants.length },
    { id: 'users', label: 'Users', icon: Users, count: users.length },
    { id: 'biometric', label: 'Biometric', icon: Fingerprint, count: biometric.length },
    { id: 'hierarchy', label: 'Hierarchy', icon: GitBranch, count: tenants.length },
    { id: 'trash', label: 'Recycle Bin', icon: Trash2, count: 0 },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0a0d12] text-[#e2e8f0]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Top bar */}
      <header className="h-[52px] bg-[#161c24] border-b border-[#252e3a] flex items-center px-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-gradient-to-br from-[#ff3d3d] to-[#cc0000] rounded-lg flex items-center justify-center">
            <Shield size={14} className="text-white" />
          </div>
          <span className="text-[15px] font-black text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            SUPER ADMIN
          </span>
          <span className="text-[9px] text-[#5a6878] tracking-widest uppercase hidden sm:block">VoltCore Control Panel</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button onClick={fetchAll} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0] transition-colors">
            <RefreshCw size={14} />
          </button>
          <div className="text-[11px] text-[#5a6878] hidden sm:block">{saUser.email}</div>
          <button onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-[#8899aa] hover:text-[#ff3d3d] border border-[#252e3a] hover:border-[#ff3d3d]/40 rounded-lg transition-colors">
            <LogOut size={12} /> Logout
          </button>
          <ThemeToggle compact />
          <button
            onClick={() => { window.location.href = '/'; }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-[#8899aa] hover:text-[#f5a623] border border-[#252e3a] hover:border-[#f5a623]/40 rounded-lg transition-colors">
            ← ERP Login
          </button>
        </div>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 p-4 pb-0">
        {[
          { label: 'Tenants', value: tenants.length, active: tenants.filter(t => t.status === 'active').length, color: '#00d4ff', icon: Building2 },
          { label: 'Users', value: users.length, active: users.filter(u => u.isActive).length, color: '#00e676', icon: Users },
          { label: 'Biometric Sites', value: biometric.length, active: biometric.filter(b => b.isActive).length, color: '#f5a623', icon: Fingerprint },
        ].map(s => (
          <div key={s.label} className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: s.color }} />
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold mb-1">{s.label}</div>
                <div className="text-[24px] font-black leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: s.color }}>{s.value}</div>
                <div className="text-[10px] text-[#5a6878] mt-1">{s.active} active</div>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-4 pt-4">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors ${tab === t.id ? 'bg-[#f5a623] text-black' : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#161c24]'}`}>
            <t.icon size={13} />
            {t.label}
            <span className={`text-[10px] px-1.5 py-[1px] rounded-full font-bold ${tab === t.id ? 'bg-black/20 text-black' : 'bg-[#252e3a] text-[#5a6878]'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-[#5a6878] text-[12px]">Loading...</div>
        ) : (
          <>
            {tab === 'tenants' && <TenantsTab tenants={tenants} onRefresh={fetchAll} onOpenHierarchy={(t) => { setHierarchyTenant(t); setTab('hierarchy'); }} />}
            {tab === 'users' && <UsersTab users={users} tenants={tenants} onRefresh={fetchAll} />}
            {tab === 'biometric' && <BiometricTab configs={biometric} tenants={tenants} onRefresh={fetchAll} />}
            {tab === 'trash' && <TrashTab tenants={tenants} />}
            {tab === 'hierarchy' && (
              hierarchyTenant ? (
                <HierarchyTab tenantId={hierarchyTenant.id} tenantName={hierarchyTenant.name} />
              ) : (
                <div className="space-y-3">
                  <h2 className="text-[14px] font-bold text-[#e2e8f0]">Select a Tenant to Configure Hierarchy</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tenants.map(t => (
                      <button key={t.id} onClick={() => setHierarchyTenant(t)}
                        className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 text-left hover:border-[#f5a623]/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#f5a623]/10 flex items-center justify-center">
                            <GitBranch size={16} className="text-[#f5a623]" />
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold text-[#e2e8f0]">{t.name}</div>
                            <div className="text-[10px] text-[#5a6878]">{t.slug}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Tenants Tab ─────────────────────────────────────────────── */
function TenantsTab({ tenants, onRefresh, onOpenHierarchy }: { tenants: Tenant[]; onRefresh: () => void; onOpenHierarchy: (t: Tenant) => void }) {
  const empty = { name: '', slug: '', dbUrl: '', notes: '', status: 'active' };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pushingId, setPushingId] = useState<string | null>(null);

  const save = async () => {
    if (!form.name || !form.slug || !form.dbUrl) { toast.error('Name, slug and DB URL are required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/tenants', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editId ? { id: editId, ...form } : form),
      });
      const data = await res.json();
      if (data.success) { toast.success(editId ? 'Tenant updated' : 'Tenant created'); onRefresh(); setShowForm(false); setForm(empty); setEditId(null); }
      else toast.error(data.error);
    } finally { setSaving(false); }
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete tenant "${name}"? This will also remove all its users and biometric configs.`)) return;
    const res = await fetch('/api/superadmin/tenants', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const data = await res.json();
    if (data.success) { toast.success('Tenant deleted'); onRefresh(); }
    else toast.error(data.error);
  };

  const pushSchema = async (tenant: Tenant) => {
    setPushingId(tenant.id);
    try {
      const res = await fetch('/api/superadmin/push-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbUrl: tenant.dbUrl }),
      });
      const data = await res.json();
      if (data.success) toast.success(`Schema pushed to ${tenant.name}`);
      else toast.error(data.error || 'Push failed');
    } catch { toast.error('Push failed'); }
    finally { setPushingId(null); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-bold text-[#e2e8f0]">Company Tenants</h2>
        <button onClick={() => { setShowForm(true); setForm(empty); setEditId(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] transition-colors">
          <Plus size={13} /> Add Tenant
        </button>
      </div>

      {showForm && (
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[13px] font-semibold">{editId ? 'Edit Tenant' : 'New Tenant'}</span>
            <button onClick={() => setShowForm(false)}><X size={15} className="text-[#5a6878]" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company Name *"><input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Upasana Associates" /></Field>
            <Field label="Slug * (unique key)"><input className={inp} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} placeholder="upasana" /></Field>
            <Field label="PostgreSQL DB URL *"><input className={inp} value={form.dbUrl} onChange={e => setForm(f => ({ ...f, dbUrl: e.target.value }))} placeholder="postgresql://user:pass@host:5432/erp_client" /></Field>
            <Field label="Status">
              <select className={inp} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <div className="col-span-2">
              <Field label="Notes"><input className={inp} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" /></Field>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-[12px] text-[#8899aa] border border-[#252e3a] rounded-lg hover:border-[#f5a623] transition-colors">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {tenants.map(t => (
          <div key={t.id} className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.status === 'active' ? 'bg-[#00d4ff]/10' : 'bg-[#5a6878]/10'}`}>
                  <Database size={16} className={t.status === 'active' ? 'text-[#00d4ff]' : 'text-[#5a6878]'} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold">{t.name}</span>
                    <span className="text-[9px] font-bold px-2 py-[2px] rounded-full bg-[#252e3a] text-[#8899aa]">{t.slug}</span>
                    <span className={`text-[9px] font-bold px-2 py-[2px] rounded-full ${t.status === 'active' ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-[#5a6878]/10 text-[#5a6878]'}`}>
                      {t.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#5a6878] mt-0.5 font-mono truncate max-w-[400px]">{t.dbUrl.replace(/:[^:@]+@/, ':***@')}</div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-[#5a6878]">
                    <span>{t._count?.users ?? 0} users</span>
                    <span>{t._count?.biometric ?? 0} biometric sites</span>
                    {t.notes && <span className="text-[#8899aa]">{t.notes}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => pushSchema(t)} disabled={pushingId === t.id}
                  className="px-2.5 py-1.5 text-[10px] font-semibold text-[#00d4ff] border border-[#00d4ff]/30 rounded-lg hover:bg-[#00d4ff]/10 disabled:opacity-50 transition-colors">
                  {pushingId === t.id ? 'Pushing...' : 'Push Schema'}
                </button>
                <button onClick={() => onOpenHierarchy(t)}
                  className="px-2.5 py-1.5 text-[10px] font-semibold text-[#f5a623] border border-[#f5a623]/30 rounded-lg hover:bg-[#f5a623]/10 transition-colors flex items-center gap-1">
                  <GitBranch size={11} /> Hierarchy
                </button>
                <button onClick={() => { setForm({ name: t.name, slug: t.slug, dbUrl: t.dbUrl, notes: t.notes, status: t.status }); setEditId(t.id); setShowForm(true); }}
                  className="p-1.5 text-[#5a6878] hover:text-[#f5a623] transition-colors"><Pencil size={13} /></button>
                <button onClick={() => del(t.id, t.name)} className="p-1.5 text-[#5a6878] hover:text-[#ff3d3d] transition-colors"><Trash2 size={13} /></button>
              </div>
            </div>
          </div>
        ))}
        {tenants.length === 0 && (
          <div className="text-center py-12 text-[#5a6878] text-[12px]">No tenants yet. Add your first company.</div>
        )}
      </div>
    </div>
  );
}

/* ── Users Tab ───────────────────────────────────────────────── */
function UsersTab({ users, tenants, onRefresh }: { users: TenantUser[]; tenants: Tenant[]; onRefresh: () => void }) {
  const empty = { tenantId: '', name: '', email: '', password: '', phone: '', allowedModules: 'all', isAdminRole: true, employeeId: null as number | null };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterTenant, setFilterTenant] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  const filtered = filterTenant ? users.filter(u => u.tenantId === filterTenant) : users;

  // Fetch employees when tenant changes or search changes
  useEffect(() => {
    if (!form.tenantId || !showForm) {
      setEmployees([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingEmployees(true);
      try {
        // Pass excludeEditId when editing so the current employee stays available
        const excludeParam = editId && form.employeeId ? `&excludeEditId=${form.employeeId}` : '';
        const res = await fetch(`/api/superadmin/tenant-employees?tenantId=${form.tenantId}&search=${employeeSearch}${excludeParam}`);
        const data = await res.json();
        if (data.success) setEmployees(data.data || []);
      } catch (e) {
        console.error('Failed to fetch employees:', e);
      } finally {
        setLoadingEmployees(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [form.tenantId, employeeSearch, showForm, editId, form.employeeId]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showEmployeeDropdown) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.employee-search-container')) {
        setShowEmployeeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmployeeDropdown]);

  const selectEmployee = (emp: any) => {
    const fullName = `${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim();
    setForm(f => ({
      ...f,
      employeeId: emp.id,
      name: fullName,
      email: emp.email,
      phone: emp.phone || '',
    }));
    setEmployeeSearch(fullName);
    setShowEmployeeDropdown(false);
  };

  const save = async () => {
    if (!form.tenantId || !form.name || !form.email) { toast.error('Tenant, name and email are required'); return; }
    if (!editId && !form.password) { toast.error('Password is required for new users'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/users', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editId
          ? { id: editId, ...form, createdBySuperadmin: form.isAdminRole }
          : { ...form, createdBySuperadmin: form.isAdminRole }),
      });
      const data = await res.json();
      if (data.success) { toast.success(editId ? 'User updated' : 'User created'); onRefresh(); setShowForm(false); setForm(empty); setEditId(null); }
      else toast.error(data.error);
    } finally { setSaving(false); }
  };

  const del = async (id: string, email: string) => {
    if (!confirm(`Delete user "${email}"?`)) return;
    const res = await fetch('/api/superadmin/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const data = await res.json();
    if (data.success) { toast.success('User deleted'); onRefresh(); }
    else toast.error(data.error);
  };

  const toggleActive = async (u: TenantUser) => {
    const res = await fetch('/api/superadmin/users', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, isActive: !u.isActive }),
    });
    const data = await res.json();
    if (data.success) { toast.success(u.isActive ? 'User deactivated' : 'User activated'); onRefresh(); }
    else toast.error(data.error);
  };

  const moduleLabel = (m: string) => m === 'all' ? 'All Modules' : m.split(',').map(s => s.trim()).join(', ');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-[14px] font-bold text-[#e2e8f0]">Tenant Users</h2>
        <div className="flex items-center gap-2">
          <select value={filterTenant} onChange={e => setFilterTenant(e.target.value)}
            className="bg-[#161c24] border border-[#252e3a] rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] outline-none">
            <option value="">All Tenants</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button onClick={() => { setShowForm(true); setForm(empty); setEditId(null); setEmployeeSearch(''); setEmployees([]); setShowEmployeeDropdown(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] transition-colors">
            <Plus size={13} /> Add User
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[13px] font-semibold">{editId ? 'Edit User' : 'New User'}</span>
            <button onClick={() => setShowForm(false)}><X size={15} className="text-[#5a6878]" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tenant *">
              <select className={inp} value={form.tenantId} onChange={e => {
                setForm(f => ({ ...f, tenantId: e.target.value }));
                setEmployeeSearch('');
                setEmployees([]);
              }} disabled={!!editId}>
                <option value="">Select tenant...</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            {form.tenantId && (
              <div className="col-span-2">
                <Field label="Link to Employee (Optional)">
                  <div className="relative employee-search-container">
                    <input
                      className={inp}
                      value={employeeSearch}
                      onChange={e => {
                        setEmployeeSearch(e.target.value);
                        // Clear the linked employee if user types manually
                        if (form.employeeId) setForm(f => ({ ...f, employeeId: null, name: '', email: '', phone: '' }));
                        setShowEmployeeDropdown(true);
                      }}
                      onFocus={() => setShowEmployeeDropdown(true)}
                      placeholder="Search by name, code, or email..."
                    />
                    {/* Clear button */}
                    {form.employeeId && (
                      <button
                        type="button"
                        onClick={() => {
                          setForm(f => ({ ...f, employeeId: null, name: '', email: '', phone: '' }));
                          setEmployeeSearch('');
                          setEmployees([]);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6878] hover:text-[#ff3d3d] transition-colors"
                      >
                        <X size={13} />
                      </button>
                    )}
                    {showEmployeeDropdown && employees.length > 0 && !form.employeeId && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#161c24] border border-[#252e3a] rounded-lg shadow-2xl max-h-[200px] overflow-y-auto">
                        {employees.map(emp => {
                          const fullName = `${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim();
                          return (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => selectEmployee(emp)}
                              className="w-full text-left px-3 py-2 hover:bg-[#1a2028] transition-colors border-b border-[#1e252e] last:border-0"
                            >
                              <div className="text-[11px] font-semibold text-[#e2e8f0]">{fullName}</div>
                              <div className="text-[10px] text-[#5a6878] flex items-center gap-2">
                                <span>{emp.employeeCode}</span>
                                <span>•</span>
                                <span>{emp.email}</span>
                                {emp.Designation && <><span>•</span><span>{emp.Designation.name}</span></>}
                                {emp.Department && <><span>•</span><span>{emp.Department.name}</span></>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {loadingEmployees && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <RefreshCw size={12} className="text-[#5a6878] animate-spin" />
                      </div>
                    )}
                  </div>
                  {form.employeeId ? (
                    <p className="text-[10px] text-[#00e676] mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] inline-block" />
                      Employee linked — details auto-filled from DB. Click × to unlink.
                    </p>
                  ) : (
                    <p className="text-[10px] text-[#5a6878] mt-1">
                      Select an employee to auto-fill details. Only unassigned employees are shown.
                    </p>
                  )}
                </Field>
              </div>
            )}

            {/* Name, Email, Phone — read-only when employee is linked */}
            <Field label="Full Name *">
              {form.employeeId ? (
                <div className={inp + ' bg-[#0a0d12] text-[#8899aa] cursor-not-allowed'}>{form.name}</div>
              ) : (
                <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" />
              )}
            </Field>
            <Field label="Email *">
              {form.employeeId ? (
                <div className={inp + ' bg-[#0a0d12] text-[#8899aa] cursor-not-allowed'}>{form.email}</div>
              ) : (
                <input className={inp} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@company.com" />
              )}
            </Field>
            <Field label="Phone">
              {form.employeeId ? (
                <div className={inp + ' bg-[#0a0d12] text-[#8899aa] cursor-not-allowed'}>{form.phone || '—'}</div>
              ) : (
                <input className={inp} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
              )}
            </Field>
            <div className="col-span-2">
              <Field label={editId ? 'New Password (leave blank to keep)' : 'Password *'}>
                <div className="relative">
                  <input className={inp + ' pr-10'} type={showPw ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editId ? '••••••••' : 'Min 6 characters'} />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6878]">
                    {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </Field>
            </div>
            <div className="col-span-2">
              <label className={lbl}>Module Access</label>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, allowedModules: 'all', isAdminRole: true }))}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-colors ${form.allowedModules === 'all' ? 'bg-[#f5a623] text-black border-[#f5a623]' : 'text-[#f5a623] border-[#f5a623]/30 hover:bg-[#f5a623]/10'}`}>
                  Full Admin
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, allowedModules: f.allowedModules === 'all' ? '' : f.allowedModules, isAdminRole: true }))}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-colors ${form.allowedModules !== 'all' && form.isAdminRole ? 'bg-[#00d4ff]/20 text-[#00d4ff] border-[#00d4ff]/40' : 'text-[#00d4ff] border-[#00d4ff]/20 hover:bg-[#00d4ff]/10'}`}>
                  Admin + Limited Modules
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, allowedModules: f.allowedModules === 'all' ? '' : f.allowedModules, isAdminRole: false }))}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-colors ${!form.isAdminRole ? 'bg-[#252e3a] text-[#e2e8f0] border-[#2e3a48]' : 'text-[#5a6878] border-[#252e3a] hover:bg-[#1a2028]'}`}>
                  Restricted User
                </button>
              </div>
              {form.allowedModules !== 'all' && (
                <ModuleSelect value={form.allowedModules} onChange={v => setForm(f => ({ ...f, allowedModules: v }))} />
              )}
              <p className="text-[10px] text-[#5a6878] mt-1">
                {form.allowedModules === 'all'
                  ? '✓ Full admin — sees and manages all modules.'
                  : form.isAdminRole
                  ? '✓ Admin role with selected modules only — can create/edit within allowed modules.'
                  : '✓ Restricted user — read access to selected modules only.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => {
              setShowForm(false);
              setEmployeeSearch('');
              setEmployees([]);
              setShowEmployeeDropdown(false);
            }} className="px-4 py-2 text-[12px] text-[#8899aa] border border-[#252e3a] rounded-lg hover:border-[#f5a623] transition-colors">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(u => (
          <div key={u.id} className={`bg-[#161c24] border rounded-xl p-4 transition-colors ${u.isActive ? 'border-[#252e3a]' : 'border-[#252e3a] opacity-60'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${u.isActive ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-[#5a6878]/10 text-[#5a6878]'}`}>
                  {u.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold">{u.name}</span>
                    <span className="text-[10px] text-[#5a6878]">{u.email}</span>
                    <span className="text-[9px] font-bold px-2 py-[2px] rounded-full bg-[#00d4ff]/10 text-[#00d4ff]">
                      {u.tenant?.name || u.tenantId}
                    </span>
                    {!u.isActive && <span className="text-[9px] font-bold px-2 py-[2px] rounded-full bg-[#ff3d3d]/10 text-[#ff3d3d]">Inactive</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Layers size={10} className="text-[#5a6878]" />
                    <span className="text-[10px] text-[#f5a623] font-medium">{moduleLabel(u.allowedModules)}</span>
                  </div>
                  {u.lastActiveAt && (
                    <div className="text-[10px] text-[#5a6878] mt-0.5">
                      Last active: {new Date(u.lastActiveAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => toggleActive(u)}
                  className={`px-2.5 py-1.5 text-[10px] font-semibold rounded-lg border transition-colors ${u.isActive ? 'text-[#ff3d3d] border-[#ff3d3d]/30 hover:bg-[#ff3d3d]/10' : 'text-[#00e676] border-[#00e676]/30 hover:bg-[#00e676]/10'}`}>
                  {u.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => {
                  setForm({ tenantId: u.tenantId, name: u.name, email: u.email, password: '', phone: u.phone, allowedModules: u.allowedModules, isAdminRole: u.createdBySuperadmin || u.allowedModules === 'all', employeeId: null });
                  setEditId(u.id); setShowForm(true);
                }} className="p-1.5 text-[#5a6878] hover:text-[#f5a623] transition-colors"><Pencil size={13} /></button>
                <button onClick={() => del(u.id, u.email)} className="p-1.5 text-[#5a6878] hover:text-[#ff3d3d] transition-colors"><Trash2 size={13} /></button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[#5a6878] text-[12px]">No users found.</div>
        )}
      </div>
    </div>
  );
}

/* ── Biometric Tab ───────────────────────────────────────────── */
function BiometricTab({ configs, tenants, onRefresh }: { configs: BiometricConfig[]; tenants: Tenant[]; onRefresh: () => void }) {
  const empty = { tenantId: '', siteId: '', siteName: '', baseUrl: 'https://api.etimeoffice.com/api', corporateId: '', username: '', password: '', isActive: true };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterTenant, setFilterTenant] = useState('');
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, 'ok' | 'fail'>>({});

  const filtered = filterTenant ? configs.filter(c => c.tenantId === filterTenant) : configs;

  const save = async () => {
    if (!form.tenantId || !form.siteId || !form.siteName || !form.corporateId || !form.username) {
      toast.error('Tenant, Site ID, Site Name, Corporate ID and Username are required'); return;
    }
    if (!editId && !form.password) { toast.error('Password is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/biometric', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editId ? { id: editId, ...form } : form),
      });
      const data = await res.json();
      if (data.success) { toast.success(editId ? 'Config updated' : 'Config created'); onRefresh(); setShowForm(false); setForm(empty); setEditId(null); }
      else toast.error(data.error);
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this biometric config?')) return;
    const res = await fetch('/api/superadmin/biometric', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const data = await res.json();
    if (data.success) { toast.success('Config deleted'); onRefresh(); }
    else toast.error(data.error);
  };

  const testConnection = async (c: BiometricConfig) => {
    setTesting(c.id);
    try {
      const res = await fetch(`/api/biometric/test?siteId=${c.siteId}`);
      const data = await res.json();
      const ok = data.data?.[0]?.format1?.success || data.data?.[0]?.format2?.success;
      setTestResult(r => ({ ...r, [c.id]: ok ? 'ok' : 'fail' }));
      toast[ok ? 'success' : 'error'](ok ? `${c.siteName} connected` : `${c.siteName} connection failed`);
    } catch {
      setTestResult(r => ({ ...r, [c.id]: 'fail' }));
      toast.error('Test failed');
    } finally { setTesting(null); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-[14px] font-bold text-[#e2e8f0]">Biometric Site Configs</h2>
        <div className="flex items-center gap-2">
          <select value={filterTenant} onChange={e => setFilterTenant(e.target.value)}
            className="bg-[#161c24] border border-[#252e3a] rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] outline-none">
            <option value="">All Tenants</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button onClick={() => { setShowForm(true); setForm(empty); setEditId(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] transition-colors">
            <Plus size={13} /> Add Site
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[13px] font-semibold">{editId ? 'Edit Biometric Config' : 'New Biometric Site'}</span>
            <button onClick={() => setShowForm(false)}><X size={15} className="text-[#5a6878]" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tenant *">
              <select className={inp} value={form.tenantId} onChange={e => setForm(f => ({ ...f, tenantId: e.target.value }))} disabled={!!editId}>
                <option value="">Select tenant...</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Site ID * (e.g. site1)"><input className={inp} value={form.siteId} onChange={e => setForm(f => ({ ...f, siteId: e.target.value }))} placeholder="site1" disabled={!!editId} /></Field>
            <Field label="Site Name *"><input className={inp} value={form.siteName} onChange={e => setForm(f => ({ ...f, siteName: e.target.value }))} placeholder="Head Office" /></Field>
            <Field label="Corporate ID *"><input className={inp} value={form.corporateId} onChange={e => setForm(f => ({ ...f, corporateId: e.target.value }))} placeholder="UA567" /></Field>
            <Field label="Username *"><input className={inp} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="API username" /></Field>
            <Field label={editId ? 'Password (blank = keep)' : 'Password *'}>
              <div className="relative">
                <input className={inp + ' pr-10'} type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editId ? '••••••••' : 'API password'} />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6878]">
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </Field>
            <div className="col-span-2">
              <Field label="API Base URL"><input className={inp} value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))} /></Field>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="bioActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="accent-[#f5a623]" />
              <label htmlFor="bioActive" className="text-[12px] text-[#8899aa]">Active</label>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-[12px] text-[#8899aa] border border-[#252e3a] rounded-lg hover:border-[#f5a623] transition-colors">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(c => (
          <div key={c.id} className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.isActive ? 'bg-[#22c55e]/10' : 'bg-[#5a6878]/10'}`}>
                  {c.isActive ? <Wifi size={15} className="text-[#22c55e]" /> : <WifiOff size={15} className="text-[#5a6878]" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold">{c.siteName}</span>
                    <span className="text-[9px] font-bold px-2 py-[2px] rounded-full bg-[#f5a623]/10 text-[#f5a623]">{c.siteId}</span>
                    <span className="text-[9px] font-bold px-2 py-[2px] rounded-full bg-[#00d4ff]/10 text-[#00d4ff]">{c.tenant?.name}</span>
                    {!c.isActive && <span className="text-[9px] font-bold px-2 py-[2px] rounded-full bg-[#5a6878]/10 text-[#5a6878]">Inactive</span>}
                  </div>
                  <div className="text-[10px] text-[#5a6878] mt-0.5">
                    Corporate: <span className="text-[#8899aa]">{c.corporateId}</span>
                    {' · '}User: <span className="text-[#8899aa]">{c.username}</span>
                  </div>
                  <div className="text-[10px] text-[#5a6878] mt-0.5 truncate max-w-xs">{c.baseUrl}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => testConnection(c)} disabled={testing === c.id}
                  className={`px-2.5 py-1.5 text-[10px] font-semibold rounded-lg border transition-colors ${
                    testResult[c.id] === 'ok' ? 'border-[#22c55e]/40 text-[#22c55e] bg-[#22c55e]/10'
                    : testResult[c.id] === 'fail' ? 'border-[#ff3d3d]/40 text-[#ff3d3d] bg-[#ff3d3d]/10'
                    : 'border-[#2e3a48] text-[#8899aa] hover:border-[#f5a623] hover:text-[#f5a623]'
                  }`}>
                  {testing === c.id ? 'Testing...' : testResult[c.id] === 'ok' ? '✓ OK' : testResult[c.id] === 'fail' ? '✗ Fail' : 'Test'}
                </button>
                <button onClick={() => {
                  setForm({ tenantId: c.tenantId, siteId: c.siteId, siteName: c.siteName, baseUrl: c.baseUrl, corporateId: c.corporateId, username: c.username, password: '', isActive: c.isActive });
                  setEditId(c.id); setShowForm(true);
                }} className="p-1.5 text-[#5a6878] hover:text-[#f5a623] transition-colors"><Pencil size={13} /></button>
                <button onClick={() => del(c.id)} className="p-1.5 text-[#5a6878] hover:text-[#ff3d3d] transition-colors"><Trash2 size={13} /></button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[#5a6878] text-[12px]">No biometric configs yet.</div>
        )}
      </div>
    </div>
  );
}
