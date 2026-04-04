'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Users, MapPin, Award, Plus, Pencil, Trash2,
  AlertTriangle, Briefcase, UserCheck, UserX
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';

// ── Types ──────────────────────────────────────────────
interface Department {
  id: string;
  name: string;
  head: string | null;
  location: string;
  employeeCount: number;
  status: string;
  createdAt: string;
}

interface Designation {
  id: string;
  title: string;
  department: string;
  level: string;
  minSalary: number;
  maxSalary: number;
  status: string;
  createdAt: string;
}

interface OrgData {
  departments: Department[];
  designations: Designation[];
}

interface DeptFormData {
  name: string;
  head: string;
  location: string;
  status: string;
}

interface DesigFormData {
  title: string;
  department: string;
  level: string;
  minSalary: string;
  maxSalary: string;
  status: string;
}

const emptyDeptForm: DeptFormData = { name: '', head: '', location: '', status: 'Active' };
const emptyDesigForm: DesigFormData = { title: '', department: '', level: '', minSalary: '', maxSalary: '', status: 'Active' };

// ── Helpers ────────────────────────────────────────────
function orgStatusColor(s: string) {
  switch (s?.toLowerCase()) {
    case 'active': return 'bg-[#00e676]/15 text-[#00e676] border-[#00e676]/40';
    case 'inactive': return 'bg-[#5a6878]/15 text-[#8899aa] border-[#5a6878]/40';
    default: return 'bg-[#5a6878]/15 text-[#8899aa] border-[#5a6878]/40';
  }
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val);
}

// ── Stat Card ──────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ElementType; label: string; value: string | number; color: string; sub?: string;
}) {
  return (
    <div className="vc-stat-card">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] text-[#5a6878] font-semibold uppercase tracking-wider mb-1">{label}</div>
          <div className="text-[28px] font-bold leading-none" style={{ fontFamily: "'Share Tech Mono', monospace", color }}>{value}</div>
          {sub && <div className="text-[10px] text-[#5a6878] mt-1">{sub}</div>}
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

// ── Loading Skeleton ───────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="vc-stat-card">
            <Skeleton className="h-3 w-24 mb-2 bg-[#1e2630]" />
            <Skeleton className="h-8 w-16 bg-[#1e2630]" />
          </div>
        ))}
      </div>
      <div className="vc-panel">
        <Skeleton className="h-10 w-full bg-[#1e2630]" />
        <div className="p-3 space-y-2">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-11 w-full bg-[#1e2630]" />)}
        </div>
      </div>
    </div>
  );
}

// ── Form Field ─────────────────────────────────────────
function FormField({ label, children, span = false }: { label: string; children: React.ReactNode; span?: boolean }) {
  return (
    <div className={span ? 'md:col-span-2' : ''}>
      <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623]";
const selectCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623] appearance-none cursor-pointer";

// ── Tab Button ─────────────────────────────────────────
function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-semibold transition-colors ${
        active
          ? 'bg-[#f5a623]/15 text-[#f5a623] border border-[#f5a623]/30'
          : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#141920] border border-transparent'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────
export default function OrganizationModule() {
  const [data, setData] = useState<OrgData>({ departments: [], designations: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'departments' | 'designations'>('departments');

  // Department CRUD
  const [deptCreateOpen, setDeptCreateOpen] = useState(false);
  const [deptEditOpen, setDeptEditOpen] = useState(false);
  const [deptDeleteOpen, setDeptDeleteOpen] = useState(false);
  const [deptForm, setDeptForm] = useState<DeptFormData>(emptyDeptForm);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  // Designation CRUD
  const [desigCreateOpen, setDesigCreateOpen] = useState(false);
  const [desigEditOpen, setDesigEditOpen] = useState(false);
  const [desigDeleteOpen, setDesigDeleteOpen] = useState(false);
  const [desigForm, setDesigForm] = useState<DesigFormData>(emptyDesigForm);
  const [selectedDesigId, setSelectedDesigId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) { if (activeTab === 'departments') setDeptCreateOpen(true); else setDesigCreateOpen(true); } }, [triggerCreate, activeTab]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/organization');
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error || 'Failed to load organization data');
    } catch { setError('Network error fetching organization data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Computed stats
  const { departments, designations } = data;
  const activeDepts = departments.filter(d => d.status?.toLowerCase() === 'active').length;
  const totalEmployees = departments.reduce((sum, d) => sum + (d.employeeCount || 0), 0);

  // ── Department Handlers ──
  const openDeptCreate = () => { setDeptForm(emptyDeptForm); setDeptCreateOpen(true); };
  const openDeptEdit = (d: Department) => {
    setDeptForm({ name: d.name, head: d.head || '', location: d.location, status: d.status });
    setSelectedDeptId(d.id);
    setDeptEditOpen(true);
  };
  const openDeptDelete = (id: string) => { setSelectedDeptId(id); setDeptDeleteOpen(true); };

  const handleDeptSubmit = async (mode: 'create' | 'edit') => {
    if (!deptForm.name.trim()) { toast.error('Department name is required'); return; }
    setSubmitting(true);
    try {
      const method = mode === 'create' ? 'POST' : 'PUT';
      const body = mode === 'edit' ? { type: 'department', id: selectedDeptId, ...deptForm } : { type: 'department', ...deptForm };
      const res = await fetch('/api/organization', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(mode === 'create' ? 'Department created successfully' : 'Department updated successfully');
        if (mode === 'create') setDeptCreateOpen(false); else setDeptEditOpen(false);
        fetchData();
      } else { toast.error(json.error || `Failed to ${mode} department`); }
    } catch { toast.error(`Failed to ${mode} department`); }
    finally { setSubmitting(false); }
  };

  const handleDeptDelete = async () => {
    if (!selectedDeptId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/organization', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'department', id: selectedDeptId }) });
      const json = await res.json();
      if (json.success) {
        toast.success('Department deleted successfully');
        setDeptDeleteOpen(false);
        fetchData();
      } else { toast.error(json.error || 'Failed to delete department'); }
    } catch { toast.error('Failed to delete department'); }
    finally { setSubmitting(false); }
  };

  // ── Designation Handlers ──
  const openDesigCreate = () => { setDesigForm(emptyDesigForm); setDesigCreateOpen(true); };
  const openDesigEdit = (d: Designation) => {
    setDesigForm({
      title: d.title, department: d.department, level: d.level,
      minSalary: String(d.minSalary), maxSalary: String(d.maxSalary), status: d.status,
    });
    setSelectedDesigId(d.id);
    setDesigEditOpen(true);
  };
  const openDesigDelete = (id: string) => { setSelectedDesigId(id); setDesigDeleteOpen(true); };

  const handleDesigSubmit = async (mode: 'create' | 'edit') => {
    if (!desigForm.title.trim()) { toast.error('Designation title is required'); return; }
    setSubmitting(true);
    try {
      const payload = {
        ...desigForm,
        minSalary: parseFloat(desigForm.minSalary) || 0,
        maxSalary: parseFloat(desigForm.maxSalary) || 0,
      };
      const method = mode === 'create' ? 'POST' : 'PUT';
      const body = mode === 'edit' ? { type: 'designation', id: selectedDesigId, ...payload } : { type: 'designation', ...payload };
      const res = await fetch('/api/organization', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(mode === 'create' ? 'Designation created successfully' : 'Designation updated successfully');
        if (mode === 'create') setDesigCreateOpen(false); else setDesigEditOpen(false);
        fetchData();
      } else { toast.error(json.error || `Failed to ${mode} designation`); }
    } catch { toast.error(`Failed to ${mode} designation`); }
    finally { setSubmitting(false); }
  };

  const handleDesigDelete = async () => {
    if (!selectedDesigId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/organization', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'designation', id: selectedDesigId }) });
      const json = await res.json();
      if (json.success) {
        toast.success('Designation deleted successfully');
        setDesigDeleteOpen(false);
        fetchData();
      } else { toast.error(json.error || 'Failed to delete designation'); }
    } catch { toast.error('Failed to delete designation'); }
    finally { setSubmitting(false); }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Building2 size={40} className="text-[#ff3d3d]" />
        <p className="text-[#8899aa] text-sm">{error}</p>
        <button className="vc-btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Total Departments" value={departments.length} color="#f5a623" sub="All departments" />
        <StatCard icon={UserCheck} label="Active" value={activeDepts} color="#00e676" sub="Currently active" />
        <StatCard icon={Award} label="Total Designations" value={designations.length} color="#00d4ff" sub="All roles" />
        <StatCard icon={Users} label="Employee Count" value={totalEmployees} color="#a78bfa" sub="Across all departments" />
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-2">
        <TabButton active={activeTab === 'departments'} onClick={() => setActiveTab('departments')} icon={Building2} label="Departments" />
        <TabButton active={activeTab === 'designations'} onClick={() => setActiveTab('designations')} icon={Award} label="Designations" />
      </div>

      {/* ── Departments Table ── */}
      {activeTab === 'departments' && (
        <div className="vc-panel">
          <div className="vc-panel-header">
            <Building2 size={15} className="text-[#f5a623]" />
            <span className="text-[12px] font-bold text-[#e2e8f0]">Departments</span>
            <span className="ml-auto text-[10px] text-[#5a6878]">{departments.length} departments</span>
            <button className="vc-btn-primary ml-2 flex items-center gap-1" onClick={openDeptCreate}>
              <Plus size={13} /> New Department
            </button>
          </div>

          {departments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#5a6878]">
              <Building2 size={36} className="mb-2 opacity-40" />
              <p className="text-[12px]">No departments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-[#252e3a] bg-[#141920]/50">
                    {['Name', 'Head', 'Location', 'Employees', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-3 py-[9px] text-[9px] font-bold uppercase tracking-wider text-[#5a6878] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept.id} className="border-b border-[#252e3a]/60 hover:bg-[#141920] transition-colors group">
                      <td className="px-3 py-[10px] font-semibold text-[#e2e8f0] whitespace-nowrap">{dept.name}</td>
                      <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap">{dept.head || '—'}</td>
                      <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap">
                        <div className="flex items-center gap-1"><MapPin size={10} className="text-[#5a6878]" />{dept.location}</div>
                      </td>
                      <td className="px-3 py-[10px] whitespace-nowrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        <span className="text-[#00d4ff]">{dept.employeeCount}</span>
                      </td>
                      <td className="px-3 py-[10px] whitespace-nowrap">
                        <span className={`vc-badge border ${orgStatusColor(dept.status)}`}>{dept.status}</span>
                      </td>
                      <td className="px-3 py-[10px] whitespace-nowrap">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" onClick={() => openDeptEdit(dept)}><Pencil size={13} /></button>
                          <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" onClick={() => openDeptDelete(dept.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Designations Table ── */}
      {activeTab === 'designations' && (
        <div className="vc-panel">
          <div className="vc-panel-header">
            <Award size={15} className="text-[#f5a623]" />
            <span className="text-[12px] font-bold text-[#e2e8f0]">Designations</span>
            <span className="ml-auto text-[10px] text-[#5a6878]">{designations.length} designations</span>
            <button className="vc-btn-primary ml-2 flex items-center gap-1" onClick={openDesigCreate}>
              <Plus size={13} /> New Designation
            </button>
          </div>

          {designations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#5a6878]">
              <Award size={36} className="mb-2 opacity-40" />
              <p className="text-[12px]">No designations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-[#252e3a] bg-[#141920]/50">
                    {['Title', 'Department', 'Level', 'Min Salary', 'Max Salary', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-3 py-[9px] text-[9px] font-bold uppercase tracking-wider text-[#5a6878] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {designations.map((desig) => (
                    <tr key={desig.id} className="border-b border-[#252e3a]/60 hover:bg-[#141920] transition-colors group">
                      <td className="px-3 py-[10px] font-semibold text-[#e2e8f0] whitespace-nowrap">{desig.title}</td>
                      <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap">
                        <div className="flex items-center gap-1"><Building2 size={10} className="text-[#5a6878]" />{desig.department}</div>
                      </td>
                      <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap">{desig.level}</td>
                      <td className="px-3 py-[10px] whitespace-nowrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        <span className="text-[#00e676]">₹{formatCurrency(desig.minSalary)}</span>
                      </td>
                      <td className="px-3 py-[10px] whitespace-nowrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        <span className="text-[#00e676]">₹{formatCurrency(desig.maxSalary)}</span>
                      </td>
                      <td className="px-3 py-[10px] whitespace-nowrap">
                        <span className={`vc-badge border ${orgStatusColor(desig.status)}`}>{desig.status}</span>
                      </td>
                      <td className="px-3 py-[10px] whitespace-nowrap">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" onClick={() => openDesigEdit(desig)}><Pencil size={13} /></button>
                          <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" onClick={() => openDesigDelete(desig.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Create Department Dialog ── */}
      <Dialog open={deptCreateOpen} onOpenChange={setDeptCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-lg">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Create New Department</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Department Name" span>
              <input className={inputCls} value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} placeholder="Engineering" />
            </FormField>
            <FormField label="Department Head">
              <input className={inputCls} value={deptForm.head} onChange={e => setDeptForm(f => ({ ...f, head: e.target.value }))} placeholder="Rajesh Kumar" />
            </FormField>
            <FormField label="Location">
              <input className={inputCls} value={deptForm.location} onChange={e => setDeptForm(f => ({ ...f, location: e.target.value }))} placeholder="Chennai, Tamil Nadu" />
            </FormField>
            <FormField label="Status">
              <select className={selectCls} value={deptForm.status} onChange={e => setDeptForm(f => ({ ...f, status: e.target.value }))}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </FormField>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setDeptCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleDeptSubmit('create')}>
              {submitting ? 'Creating...' : 'Create Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Department Dialog ── */}
      <Dialog open={deptEditOpen} onOpenChange={setDeptEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-lg">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Edit Department</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Department Name" span>
              <input className={inputCls} value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} />
            </FormField>
            <FormField label="Department Head">
              <input className={inputCls} value={deptForm.head} onChange={e => setDeptForm(f => ({ ...f, head: e.target.value }))} />
            </FormField>
            <FormField label="Location">
              <input className={inputCls} value={deptForm.location} onChange={e => setDeptForm(f => ({ ...f, location: e.target.value }))} />
            </FormField>
            <FormField label="Status">
              <select className={selectCls} value={deptForm.status} onChange={e => setDeptForm(f => ({ ...f, status: e.target.value }))}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </FormField>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setDeptEditOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleDeptSubmit('edit')}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Department Dialog ── */}
      <Dialog open={deptDeleteOpen} onOpenChange={setDeptDeleteOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Delete Department</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-[#ff3d3d]/15 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={20} className="text-[#ff3d3d]" />
            </div>
            <div>
              <p className="text-[13px] text-[#e2e8f0] mb-1">Are you sure you want to delete this department?</p>
              <p className="text-[11px] text-[#8899aa]">This action cannot be undone. All associated designations and data may be affected.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setDeptDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#cc2020] font-semibold" disabled={submitting} onClick={handleDeptDelete}>
              {submitting ? 'Deleting...' : 'Delete Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Designation Dialog ── */}
      <Dialog open={desigCreateOpen} onOpenChange={setDesigCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-lg">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Create New Designation</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Title" span>
              <input className={inputCls} value={desigForm.title} onChange={e => setDesigForm(f => ({ ...f, title: e.target.value }))} placeholder="Senior Engineer" />
            </FormField>
            <FormField label="Department">
              <select className={selectCls} value={desigForm.department} onChange={e => setDesigForm(f => ({ ...f, department: e.target.value }))}>
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </FormField>
            <FormField label="Level">
              <select className={selectCls} value={desigForm.level} onChange={e => setDesigForm(f => ({ ...f, level: e.target.value }))}>
                <option value="">Select level</option>
                <option value="L1">L1 - Junior</option>
                <option value="L2">L2 - Mid</option>
                <option value="L3">L3 - Senior</option>
                <option value="L4">L4 - Lead</option>
                <option value="L5">L5 - Manager</option>
                <option value="L6">L6 - Director</option>
              </select>
            </FormField>
            <FormField label="Min Salary (₹)">
              <input className={inputCls} type="number" value={desigForm.minSalary} onChange={e => setDesigForm(f => ({ ...f, minSalary: e.target.value }))} placeholder="25000" />
            </FormField>
            <FormField label="Max Salary (₹)">
              <input className={inputCls} type="number" value={desigForm.maxSalary} onChange={e => setDesigForm(f => ({ ...f, maxSalary: e.target.value }))} placeholder="80000" />
            </FormField>
            <FormField label="Status">
              <select className={selectCls} value={desigForm.status} onChange={e => setDesigForm(f => ({ ...f, status: e.target.value }))}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </FormField>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setDesigCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleDesigSubmit('create')}>
              {submitting ? 'Creating...' : 'Create Designation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Designation Dialog ── */}
      <Dialog open={desigEditOpen} onOpenChange={setDesigEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-lg">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Edit Designation</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Title" span>
              <input className={inputCls} value={desigForm.title} onChange={e => setDesigForm(f => ({ ...f, title: e.target.value }))} />
            </FormField>
            <FormField label="Department">
              <select className={selectCls} value={desigForm.department} onChange={e => setDesigForm(f => ({ ...f, department: e.target.value }))}>
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </FormField>
            <FormField label="Level">
              <select className={selectCls} value={desigForm.level} onChange={e => setDesigForm(f => ({ ...f, level: e.target.value }))}>
                <option value="">Select level</option>
                <option value="L1">L1 - Junior</option>
                <option value="L2">L2 - Mid</option>
                <option value="L3">L3 - Senior</option>
                <option value="L4">L4 - Lead</option>
                <option value="L5">L5 - Manager</option>
                <option value="L6">L6 - Director</option>
              </select>
            </FormField>
            <FormField label="Min Salary (₹)">
              <input className={inputCls} type="number" value={desigForm.minSalary} onChange={e => setDesigForm(f => ({ ...f, minSalary: e.target.value }))} />
            </FormField>
            <FormField label="Max Salary (₹)">
              <input className={inputCls} type="number" value={desigForm.maxSalary} onChange={e => setDesigForm(f => ({ ...f, maxSalary: e.target.value }))} />
            </FormField>
            <FormField label="Status">
              <select className={selectCls} value={desigForm.status} onChange={e => setDesigForm(f => ({ ...f, status: e.target.value }))}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </FormField>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setDesigEditOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleDesigSubmit('edit')}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Designation Dialog ── */}
      <Dialog open={desigDeleteOpen} onOpenChange={setDesigDeleteOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Delete Designation</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-[#ff3d3d]/15 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={20} className="text-[#ff3d3d]" />
            </div>
            <div>
              <p className="text-[13px] text-[#e2e8f0] mb-1">Are you sure you want to delete this designation?</p>
              <p className="text-[11px] text-[#8899aa]">This action cannot be undone.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setDesigDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#cc2020] font-semibold" disabled={submitting} onClick={handleDesigDelete}>
              {submitting ? 'Deleting...' : 'Delete Designation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
