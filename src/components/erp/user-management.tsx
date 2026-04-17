'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, X, Eye, EyeOff, RefreshCw,
  Users, Shield, Check, UserCheck, UserX, Layers, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import ModuleSelect from '@/components/superadmin/module-select';

/* ── Types ─────────────────────────────────────────────────────── */
interface TenantUser {
  id: string; name: string; email: string; phone: string;
  allowedModules: string; orgRoleId?: string; isActive: boolean;
  lastActiveAt?: string; createdAt: string; employeeId?: number;
}

interface OrgRole {
  id: string; name: string; level: number; moduleAccess: string;
  departments: string; designations: string; color: string;
  maxUsers: number; currentCount: number;
}

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

/* ── Module access display ─────────────────────────────────────── */
function ModuleBadge({ modules }: { modules: string }) {
  if (!modules || modules === 'all') {
    return <span className="text-[10px] font-semibold px-2 py-[2px] rounded-full bg-[#f5a623]/10 text-[#f5a623]">All Modules</span>;
  }
  const list = modules.split(',').map(s => s.trim()).filter(Boolean);
  return (
    <div className="flex flex-wrap gap-1">
      {list.map(m => (
        <span key={m} className="text-[9px] font-semibold px-2 py-[2px] rounded-full bg-[#252e3a] text-[#8899aa] capitalize">{m}</span>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */
export default function UserManagement() {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [employees, setEmployees] = useState<{ id: number; employeeCode: string; name: string; department: string; designation: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyForm = { name: '', email: '', password: '', phone: '', orgRoleId: '', employeeId: '' };
  const [form, setForm] = useState(emptyForm);
  const [empSearch, setEmpSearch] = useState('');
  const [showEmpDropdown, setShowEmpDropdown] = useState(false);

  // Employees filtered by search
  const filteredEmployees = employees.filter(e => {
    if (!empSearch) return true;
    const q = empSearch.toLowerCase();
    return e.name.toLowerCase().includes(q) ||
      e.employeeCode.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q);
  });

  const selectedEmployee = form.employeeId ? employees.find(e => String(e.id) === form.employeeId) : null;

  const selectEmployee = (emp: typeof employees[0]) => {
    setForm(f => ({ ...f, employeeId: String(emp.id), name: emp.name, email: emp.email, phone: emp.phone }));
    setEmpSearch(emp.name);
    setShowEmpDropdown(false);
  };

  const clearEmployee = () => {
    setForm(f => ({ ...f, employeeId: '', name: '', email: '', phone: '' }));
    setEmpSearch('');
  };

  const fetchData = useCallback(async (excludeUserId?: string) => {
    setLoading(true);
    try {
      const empUrl = excludeUserId
        ? `/api/tenant/employees?excludeUserId=${excludeUserId}`
        : '/api/tenant/employees';
      const [ur, rr, er] = await Promise.all([
        fetch('/api/tenant/users').then(r => r.json()),
        fetch('/api/tenant/roles').then(r => r.json()),
        fetch(empUrl).then(r => r.json()),
      ]);
      if (ur.success) setUsers(ur.data);
      if (rr.success) setRoles(rr.data);
      if (er.success) setEmployees(er.data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selectedRole = roles.find(r => r.id === form.orgRoleId);

  const save = async () => {
    if (!form.employeeId) { toast.error('Please select an employee'); return; }
    if (!form.name || !form.email) { toast.error('Employee details are missing — please re-select'); return; }
    if (!editId && !form.password) { toast.error('Password is required for new users'); return; }
    if (!form.orgRoleId) { toast.error('A role must be assigned'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/tenant/users', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editId ? { id: editId, ...form } : form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editId ? 'User updated' : 'User created');
        fetchData(); setShowForm(false); setForm(emptyForm); setEditId(null); setEmpSearch('');
      } else toast.error(data.error);
    } finally { setSaving(false); }
  };

  const del = async (id: string, email: string) => {
    if (!confirm(`Delete user "${email}"? They will no longer be able to log in.`)) return;
    const res = await fetch('/api/tenant/users', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.success) { toast.success('User deleted'); fetchData(); }
    else toast.error(data.error);
  };

  const toggleActive = async (u: TenantUser) => {
    const res = await fetch('/api/tenant/users', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, isActive: !u.isActive }),
    });
    const data = await res.json();
    if (data.success) { toast.success(u.isActive ? 'User deactivated' : 'User activated'); fetchData(); }
    else toast.error(data.error);
  };

  const openEdit = (u: TenantUser) => {
    setForm({ name: u.name, email: u.email, password: '', phone: u.phone, orgRoleId: u.orgRoleId || '', employeeId: u.employeeId ? String(u.employeeId) : '' });
    const linkedEmp = employees.find(e => e.id === u.employeeId);
    setEmpSearch(linkedEmp?.name || u.name);
    setEditId(u.id);
    setShowForm(true);
    // Reload employees excluding this user's current link
    fetchData(u.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f5a623]/10 rounded-xl flex items-center justify-center">
            <Users size={18} className="text-[#f5a623]" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">User Management</h2>
            <p className="text-[11px] text-[#5a6878]">Manage login accounts for your company</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0] transition-colors">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => { setShowForm(true); setForm(emptyForm); setEditId(null); setEmpSearch(''); setShowEmpDropdown(false); }}
            disabled={roles.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title={roles.length === 0 ? 'No roles defined — contact system administrator' : ''}>
            <Plus size={13} /> Add User
          </button>
        </div>
      </div>

      {/* Roles info banner */}
      {roles.length > 0 && (
        <div className="mb-4 p-3 bg-[#161c24] border border-[#252e3a] rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={13} className="text-[#f5a623]" />
            <span className="text-[11px] font-semibold text-[#e2e8f0]">Available Roles</span>
            <span className="text-[10px] text-[#5a6878]">(defined by system admin — module access is automatic)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[...roles].sort((a, b) => a.level - b.level).map(r => {
              const atLimit = r.maxUsers > 0 && r.currentCount >= r.maxUsers;
              return (
                <div key={r.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-semibold"
                  style={{ background: `${r.color}12`, color: r.color, borderColor: `${r.color}30` }}>
                  <span>{r.name}</span>
                  <span className="opacity-60">Lv.{r.level}</span>
                  {r.maxUsers > 0 && (
                    <span className={`ml-1 px-1.5 py-[1px] rounded-full text-[9px] font-bold ${atLimit ? 'bg-[#ff3d3d]/20 text-[#ff3d3d]' : 'bg-black/20'}`}>
                      {r.currentCount}/{r.maxUsers}
                    </span>
                  )}
                  {r.maxUsers === 0 && <span className="opacity-40 text-[9px]">∞</span>}
                  {r.departments && <span className="opacity-60">· {r.departments}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {roles.length === 0 && (
        <div className="mb-4 p-3 bg-[#161c24] border border-[#f5a623]/20 rounded-xl flex items-center gap-2">
          <Lock size={13} className="text-[#f5a623]" />
          <span className="text-[11px] text-[#8899aa]">
            No roles defined yet. Contact your system administrator to set up role definitions and approval hierarchies.
          </span>
        </div>
      )}

      {/* Create/Edit form */}
      {showForm && (
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-[#e2e8f0]">{editId ? 'Edit User' : 'New User'}</span>
            <button onClick={() => setShowForm(false)}><X size={15} className="text-[#5a6878]" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Employee search — primary field */}
            <Field label="Select Employee *" span2>
              <div className="relative">
                <input
                  className={inp + (selectedEmployee ? ' pr-8' : '')}
                  value={empSearch}
                  onChange={e => {
                    setEmpSearch(e.target.value);
                    if (selectedEmployee) clearEmployee();
                    setShowEmpDropdown(true);
                  }}
                  onFocus={() => setShowEmpDropdown(true)}
                  placeholder="Search by name, code or email..."
                />
                {selectedEmployee && (
                  <button type="button" onClick={clearEmployee}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6878] hover:text-[#ff3d3d]">
                    <X size={13} />
                  </button>
                )}
                {showEmpDropdown && !selectedEmployee && filteredEmployees.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#161c24] border border-[#252e3a] rounded-lg shadow-2xl max-h-[220px] overflow-y-auto">
                    {filteredEmployees.map(emp => (
                      <button key={emp.id} type="button" onClick={() => selectEmployee(emp)}
                        className="w-full text-left px-3 py-2.5 hover:bg-[#1a2028] transition-colors border-b border-[#1e252e] last:border-0">
                        <div className="text-[11px] font-semibold text-[#e2e8f0]">{emp.name}</div>
                        <div className="text-[10px] text-[#5a6878] flex items-center gap-2 mt-0.5">
                          <span>{emp.employeeCode}</span>
                          <span>·</span>
                          <span>{emp.email}</span>
                          {emp.designation && <><span>·</span><span>{emp.designation}</span></>}
                          {emp.department && <><span>·</span><span>{emp.department}</span></>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedEmployee ? (
                <div className="mt-1.5 px-3 py-2 bg-[#00e676]/8 border border-[#00e676]/20 rounded-lg flex items-center gap-2">
                  <Check size={12} className="text-[#00e676] shrink-0" />
                  <div className="text-[10px] text-[#00e676]">
                    <span className="font-semibold">{selectedEmployee.name}</span>
                    <span className="text-[#00e676]/70"> · {selectedEmployee.email} · {selectedEmployee.phone || 'no phone'}</span>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-[#5a6878] mt-1">Only unassigned employees are shown. Select to auto-fill details.</p>
              )}
            </Field>

            {/* Auto-filled read-only fields */}
            <Field label="Name">
              <div className={inp + ' bg-[#0a0d12] text-[#8899aa] cursor-not-allowed'}>{form.name || '—'}</div>
            </Field>
            <Field label="Email">
              <div className={inp + ' bg-[#0a0d12] text-[#8899aa] cursor-not-allowed'}>{form.email || '—'}</div>
            </Field>
            <Field label="Phone">
              <div className={inp + ' bg-[#0a0d12] text-[#8899aa] cursor-not-allowed'}>{form.phone || '—'}</div>
            </Field>

            <Field label={editId ? 'New Password (blank = keep)' : 'Password *'}>
              <div className="relative">
                <input className={inp + ' pr-10'} type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editId ? '••••••••' : 'Min 6 characters'} />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6878]">
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </Field>
            <Field label="Role * (sets module access automatically)" span2>
              {roles.length > 0 ? (
                <div className="space-y-2">
                  <select className={inp} value={form.orgRoleId} onChange={e => setForm(f => ({ ...f, orgRoleId: e.target.value }))}>
                    <option value="">Select a role...</option>
                    {[...roles].sort((a, b) => a.level - b.level).map(r => {
                      const atLimit = r.maxUsers > 0 && r.currentCount >= r.maxUsers;
                      return (
                        <option key={r.id} value={r.id} disabled={atLimit}>
                          {r.name} — Level {r.level}
                          {r.departments ? ` · ${r.departments}` : ''}
                          {r.maxUsers > 0 ? ` (${r.currentCount}/${r.maxUsers} used)` : ' (unlimited)'}
                          {atLimit ? ' — LIMIT REACHED' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {selectedRole && (
                    <>
                      <div className="flex items-center gap-2 p-2 rounded-lg border"
                        style={{ background: `${selectedRole.color}10`, borderColor: `${selectedRole.color}30` }}>
                        <Layers size={12} style={{ color: selectedRole.color }} />
                        <span className="text-[11px]" style={{ color: selectedRole.color }}>
                          Module access: {selectedRole.moduleAccess === 'all' ? 'All Modules' : selectedRole.moduleAccess.split(',').join(', ')}
                        </span>
                      </div>
                      {selectedRole.maxUsers > 0 && (
                        <div className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] ${
                          selectedRole.currentCount >= selectedRole.maxUsers
                            ? 'bg-[#ff3d3d]/10 border-[#ff3d3d]/30 text-[#ff3d3d]'
                            : 'bg-[#252e3a] border-[#2e3a48] text-[#8899aa]'
                        }`}>
                          <Shield size={12} />
                          {selectedRole.currentCount >= selectedRole.maxUsers
                            ? `Limit reached: ${selectedRole.currentCount}/${selectedRole.maxUsers} users. Contact system admin to increase.`
                            : `${selectedRole.currentCount} of ${selectedRole.maxUsers} users used`}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 bg-[#0d1117] border border-[#2e3a48] rounded-lg">
                  <Lock size={12} className="text-[#5a6878]" />
                  <span className="text-[11px] text-[#5a6878]">No roles available — user will get full access</span>
                </div>
              )}
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={save} disabled={saving}
              className="px-4 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : 'Save User'}
            </button>
            <button onClick={() => { setShowForm(false); setEmpSearch(''); setShowEmpDropdown(false); }}
              className="px-4 py-2 text-[12px] text-[#8899aa] border border-[#252e3a] rounded-lg hover:border-[#f5a623] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Users list */}
      <div className="space-y-2">
        {users.map(u => {
          const role = roles.find(r => r.id === u.orgRoleId);
          return (
            <div key={u.id} className={`bg-[#161c24] border rounded-xl p-4 transition-colors ${u.isActive ? 'border-[#252e3a]' : 'border-[#252e3a] opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0`}
                    style={role ? { background: `${role.color}20`, color: role.color } : { background: '#252e3a', color: '#8899aa' }}>
                    {u.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-[#e2e8f0]">{u.name}</span>
                      <span className="text-[11px] text-[#5a6878]">{u.email}</span>
                      {!u.isActive && (
                        <span className="text-[9px] font-bold px-2 py-[2px] rounded-full bg-[#ff3d3d]/10 text-[#ff3d3d]">Inactive</span>
                      )}
                    </div>

                    {/* Role badge */}
                    {role ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-semibold px-2 py-[2px] rounded-full border"
                          style={{ background: `${role.color}15`, color: role.color, borderColor: `${role.color}30` }}>
                          {role.name}
                        </span>
                        <span className="text-[10px] text-[#5a6878]">·</span>
                        <ModuleBadge modules={u.allowedModules} />
                      </div>
                    ) : (
                      <div className="mt-1">
                        <ModuleBadge modules={u.allowedModules} />
                      </div>
                    )}

                    {u.phone && <div className="text-[10px] text-[#5a6878] mt-0.5">{u.phone}</div>}
                    {u.employeeId && (
                      <div className="text-[10px] text-[#00d4ff] mt-0.5 flex items-center gap-1">
                        <span>🔗</span>
                        <span>Linked to employee #{u.employeeId} — {employees.find(e => e.id === u.employeeId)?.name || 'Employee'}</span>
                      </div>
                    )}
                    {u.lastActiveAt && (
                      <div className="text-[10px] text-[#5a6878] mt-0.5">
                        Last active: {new Date(u.lastActiveAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => toggleActive(u)}
                    className={`p-1.5 rounded-lg border transition-colors ${u.isActive
                      ? 'text-[#ff3d3d] border-[#ff3d3d]/20 hover:bg-[#ff3d3d]/10'
                      : 'text-[#00e676] border-[#00e676]/20 hover:bg-[#00e676]/10'}`}
                    title={u.isActive ? 'Deactivate' : 'Activate'}>
                    {u.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                  </button>
                  <button onClick={() => openEdit(u)} className="p-1.5 text-[#5a6878] hover:text-[#f5a623] transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => del(u.id, u.email)} className="p-1.5 text-[#5a6878] hover:text-[#ff3d3d] transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {users.length === 0 && (
          <div className="text-center py-12 bg-[#161c24] border border-[#252e3a] rounded-xl">
            <Users size={32} className="mx-auto text-[#5a6878] mb-3" />
            <p className="text-[13px] font-semibold text-[#e2e8f0] mb-1">No users yet</p>
            <p className="text-[11px] text-[#5a6878]">Add your first user to give them ERP access</p>
          </div>
        )}
      </div>
    </div>
  );
}
