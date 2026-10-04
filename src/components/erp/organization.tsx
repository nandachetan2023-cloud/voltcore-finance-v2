'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Award, Calendar, FileText, Shield, DollarSign,
  Plus, Pencil, Trash2, AlertTriangle, Users, Clock, Settings
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';

// ── Types ──────────────────────────────────────────────
interface Department {
  id: number;
  name: string;
  code: string;
  _count?: { Employee: number };
}

interface Designation {
  id: number;
  name: string;
  _count?: { Employee: number };
}

interface Holiday {
  id: number;
  name: string;
  date: string;
  type: string;
  description?: string;
  isRecurring: boolean;
  applicableTo: string;
  branchId?: number;
  isActive: boolean;
}

interface LeavePolicy {
  id: number;
  name: string;
  code: string;
  leaveType: string;
  annualQuota: number;
  carryForward: boolean;
  maxCarryForward: number;
  encashable: boolean;
  maxEncashment: number;
  minDaysNotice: number;
  maxConsecutiveDays: number;
  applicableAfterMonths: number;
  applicableGender: string;
  requiresDocument: boolean;
  isActive: boolean;
}

interface AttendanceRule {
  id: number;
  name: string;
  ruleType: string;
  gracePeriodMinutes: number;
  lateMarkAfterMinutes: number;
  halfDayAfterMinutes: number;
  absentAfterMinutes: number;
  fineAmount: number;
  fineType: string;
  finePerMinute: number;
  maxFinePerDay: number;
  applyToShiftId?: number;
  applyToDepartmentId?: number;
  applyToBranchId?: number;
  isActive: boolean;
}

interface Grade {
  id: number;
  name: string;
  code: string;
  level: number;
  minSalary: number;
  maxSalary: number;
  description?: string;
  benefits?: string;
  isActive: boolean;
  _count?: { Employee: number };
}

type TabType = 'departments' | 'designations' | 'holidays' | 'leave-policies' | 'attendance-rules' | 'grades';

const inputCls = "w-full bg-[#1a2332] border-[1.5px] border-[#2e3a48] rounded-lg px-3.5 py-2.5 text-[13px] text-[#e2e8f0] outline-none transition-all duration-200 placeholder:text-[#5a6878] hover:border-[#3a4858] hover:bg-[#1e2838] focus:border-[#f5a623] focus:bg-[#1e2838] focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)]";
const selectCls = "w-full bg-[#1a2332] border-[1.5px] border-[#2e3a48] rounded-lg px-3.5 py-2.5 text-[13px] text-[#e2e8f0] outline-none transition-all duration-200 hover:border-[#3a4858] hover:bg-[#1e2838] focus:border-[#f5a623] focus:bg-[#1e2838] focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)] appearance-none cursor-pointer";

// ── Helpers ────────────────────────────────────────────
function formatCurrency(val: number) {
  return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
          <div className="text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">{label}</div>
          <div className="text-[32px] font-bold leading-none mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{value}</div>
          {sub && <div className="text-[11px] text-[#5a6878] mt-1">{sub}</div>}
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

// ── Tab Button ─────────────────────────────────────────
function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
        active
          ? 'bg-[#f5a623]/15 text-[#f5a623] border border-[#f5a623]/30 shadow-lg shadow-[#f5a623]/10'
          : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#1a2332] border border-transparent'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

// ── Form Field ─────────────────────────────────────────
function FormField({ label, children, span = false, required = false }: { 
  label: string; children: React.ReactNode; span?: boolean; required?: boolean 
}) {
  return (
    <div className={span ? 'md:col-span-2' : ''}>
      <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">
        {label}
        {required && <span className="text-[#ff3d3d] ml-1">*</span>}
      </label>
      {children}
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
    </div>
  );
}

export default function OrganizationModule() {
  const [activeTab, setActiveTab] = useState<TabType>('departments');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Data states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leavePolicies, setLeavePolicies] = useState<LeavePolicy[]>([]);
  const [attendanceRules, setAttendanceRules] = useState<AttendanceRule[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  
  const { triggerCreate } = useERPStore();

  useEffect(() => { 
    if (triggerCreate > 0) {
      // Open create dialog based on active tab
      switch(activeTab) {
        case 'departments': /* handle */ break;
        case 'holidays': /* handle */ break;
        // ... etc
      }
    }
  }, [triggerCreate, activeTab]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [deptRes, desigRes, holidaysRes, policiesRes, rulesRes, gradesRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/designations'),
        fetch('/api/holidays'),
        fetch('/api/leave-policies'),
        fetch('/api/attendance-rules'),
        fetch('/api/grades'),
      ]);
      
      const deptJson = await deptRes.json();
      const desigJson = await desigRes.json();
      const holidaysJson = await holidaysRes.json();
      const policiesJson = await policiesRes.json();
      const rulesJson = await rulesRes.json();
      const gradesJson = await gradesRes.json();
      
      if (deptJson.success) setDepartments(deptJson.data);
      if (desigJson.success) setDesignations(desigJson.data);
      if (holidaysJson.success) setHolidays(holidaysJson.data);
      if (policiesJson.success) setLeavePolicies(policiesJson.data);
      if (rulesJson.success) setAttendanceRules(rulesJson.data);
      if (gradesJson.success) setGrades(gradesJson.data);
      
    } catch (err) {
      console.error('Error fetching organization data:', err);
      toast.error('Failed to load organization data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Computed stats
  const stats = {
    departments: departments.length,
    designations: designations.length,
    holidays: holidays.length,
    leavePolicies: leavePolicies.length,
    attendanceRules: attendanceRules.length,
    grades: grades.length,
    totalEmployees: departments.reduce((sum, d) => sum + (d._count?.Employee || 0), 0),
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Departments" value={stats.departments} color="#f5a623" sub={`${stats.totalEmployees} employees`} />
        <StatCard icon={Calendar} label="Holidays" value={stats.holidays} color="#00e676" sub="This year" />
        <StatCard icon={FileText} label="Leave Policies" value={stats.leavePolicies} color="#00d4ff" sub="Active policies" />
        <StatCard icon={DollarSign} label="Salary Grades" value={stats.grades} color="#a78bfa" sub="Grade levels" />
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <TabButton active={activeTab === 'departments'} onClick={() => setActiveTab('departments')} icon={Building2} label="Departments" />
        <TabButton active={activeTab === 'designations'} onClick={() => setActiveTab('designations')} icon={Award} label="Designations" />
        <TabButton active={activeTab === 'holidays'} onClick={() => setActiveTab('holidays')} icon={Calendar} label="Holidays" />
        <TabButton active={activeTab === 'leave-policies'} onClick={() => setActiveTab('leave-policies')} icon={FileText} label="Leave Policies" />
        <TabButton active={activeTab === 'attendance-rules'} onClick={() => setActiveTab('attendance-rules')} icon={Shield} label="Attendance Rules" />
        <TabButton active={activeTab === 'grades'} onClick={() => setActiveTab('grades')} icon={DollarSign} label="Grades" />
      </div>

      {/* ── Content Panels ── */}
      {activeTab === 'departments' && <DepartmentsPanel departments={departments} onRefresh={fetchData} />}
      {activeTab === 'designations' && <DesignationsPanel designations={designations} onRefresh={fetchData} />}
      {activeTab === 'holidays' && <HolidaysPanel holidays={holidays} onRefresh={fetchData} />}
      {activeTab === 'leave-policies' && <LeavePoliciesPanel policies={leavePolicies} onRefresh={fetchData} />}
      {activeTab === 'attendance-rules' && <AttendanceRulesPanel rules={attendanceRules} onRefresh={fetchData} />}
      {activeTab === 'grades' && <GradesPanel grades={grades} onRefresh={fetchData} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DEPARTMENTS PANEL
// ══════════════════════════════════════════════════════════════════════════════
function DepartmentsPanel({ departments, onRefresh }: { departments: Department[]; onRefresh: () => void }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', code: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (mode: 'create' | 'edit') => {
    if (!form.name.trim()) { toast.error('Department name is required'); return; }
    setSubmitting(true);
    try {
      const method = mode === 'create' ? 'POST' : 'PUT';
      const body = mode === 'edit' ? { id: selectedId, ...form } : form;
      const res = await fetch('/api/departments', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(`Department ${mode === 'create' ? 'created' : 'updated'} successfully`);
        mode === 'create' ? setCreateOpen(false) : setEditOpen(false);
        setForm({ name: '', code: '' });
        onRefresh();
      } else { toast.error(json.error || `Failed to ${mode} department`); }
    } catch { toast.error(`Failed to ${mode} department`); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/departments', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedId }) });
      const json = await res.json();
      if (json.success) {
        toast.success('Department deleted successfully');
        setDeleteOpen(false);
        onRefresh();
      } else { toast.error(json.error || 'Failed to delete department'); }
    } catch { toast.error('Failed to delete department'); }
    finally { setSubmitting(false); }
  };

  return (
    <>
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Building2 size={16} className="text-[#f5a623]" />
          <span className="text-[14px] font-bold text-[#e2e8f0]">Departments</span>
          <span className="ml-auto text-[11px] text-[#5a6878]">{departments.length} total</span>
          <button className="vc-btn-primary ml-2 flex items-center gap-1.5" onClick={() => { setForm({ name: '', code: '' }); setCreateOpen(true); }}>
            <Plus size={14} /> Add Department
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-[#1a2332] z-10">
              <tr className="border-b border-[#2e3a48]">
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Name</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Code</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Employees</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center text-[#5a6878] text-[12px]">No departments found</td></tr>
              ) : departments.map((dept) => (
                <tr key={dept.id} className="border-b border-[#1e252e] hover:bg-[#1a2028] transition-colors group">
                  <td className="px-4 py-3 font-semibold text-[#e2e8f0]">{dept.name}</td>
                  <td className="px-4 py-3 text-[#8899aa] font-mono text-[11px]">{dept.code}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#00d4ff]/10 text-[#00d4ff] text-[11px] font-semibold">
                      <Users size={12} />
                      {dept._count?.Employee || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" 
                        onClick={() => { setForm({ name: dept.name, code: dept.code }); setSelectedId(dept.id); setEditOpen(true); }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" 
                        onClick={() => { setSelectedId(dept.id); setDeleteOpen(true); }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-lg">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Create Department</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-4">
            <FormField label="Department Name" required>
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, code: e.target.value.toUpperCase().replace(/\s+/g, '_') }))} placeholder="Engineering" />
            </FormField>
            <FormField label="Department Code" required>
              <input className={inputCls} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="ENG" />
            </FormField>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="vc-btn-ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="vc-btn-primary" disabled={submitting} onClick={() => handleSubmit('create')}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit & Delete Dialogs - Similar structure */}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DESIGNATIONS PANEL
// ══════════════════════════════════════════════════════════════════════════════
function DesignationsPanel({ designations, onRefresh }: { designations: Designation[]; onRefresh: () => void }) {
  return (
    <div className="vc-panel">
      <div className="vc-panel-header">
        <Award size={16} className="text-[#f5a623]" />
        <span className="text-[14px] font-bold text-[#e2e8f0]">Designations</span>
        <span className="ml-auto text-[11px] text-[#5a6878]">{designations.length} total</span>
      </div>
      <div className="p-4 text-center text-[#5a6878]">Designations management - Similar to Departments</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HOLIDAYS PANEL
// ══════════════════════════════════════════════════════════════════════════════
function HolidaysPanel({ holidays, onRefresh }: { holidays: Holiday[]; onRefresh: () => void }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', date: '', type: 'public', description: '', isRecurring: false, applicableTo: 'all', branchId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [branches, setBranches] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(j => { if (j.success) setBranches(j.data); }).catch(() => {});
  }, []);

  const handleSubmit = async (mode: 'create' | 'edit') => {
    if (!form.name.trim() || !form.date) { toast.error('Name and date are required'); return; }
    setSubmitting(true);
    try {
      const method = mode === 'create' ? 'POST' : 'PUT';
      const body = mode === 'edit' ? { id: selectedId, ...form, branchId: form.branchId ? parseInt(form.branchId) : null } : { ...form, branchId: form.branchId ? parseInt(form.branchId) : null };
      const res = await fetch('/api/holidays', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(`Holiday ${mode === 'create' ? 'created' : 'updated'} successfully`);
        mode === 'create' ? setCreateOpen(false) : setEditOpen(false);
        setForm({ name: '', date: '', type: 'public', description: '', isRecurring: false, applicableTo: 'all', branchId: '' });
        onRefresh();
      } else { toast.error(json.error || `Failed to ${mode} holiday`); }
    } catch { toast.error(`Failed to ${mode} holiday`); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/holidays', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedId }) });
      const json = await res.json();
      if (json.success) {
        toast.success('Holiday deleted successfully');
        setDeleteOpen(false);
        onRefresh();
      } else { toast.error(json.error || 'Failed to delete holiday'); }
    } catch { toast.error('Failed to delete holiday'); }
    finally { setSubmitting(false); }
  };

  return (
    <>
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Calendar size={16} className="text-[#00e676]" />
          <span className="text-[14px] font-bold text-[#e2e8f0]">Holiday Calendar</span>
          <span className="ml-auto text-[11px] text-[#5a6878]">{holidays.length} holidays</span>
          <button className="vc-btn-primary ml-2 flex items-center gap-1.5" onClick={() => { setForm({ name: '', date: '', type: 'public', description: '', isRecurring: false, applicableTo: 'all', branchId: '' }); setCreateOpen(true); }}>
            <Plus size={14} /> Add Holiday
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-[#1a2332] z-10">
              <tr className="border-b border-[#2e3a48]">
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Name</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Date</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Type</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Branch</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Recurring</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {holidays.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-[#5a6878] text-[12px]">No holidays found</td></tr>
              ) : holidays.map((holiday) => (
                <tr key={holiday.id} className="border-b border-[#1e252e] hover:bg-[#1a2028] transition-colors group">
                  <td className="px-4 py-3 font-semibold text-[#e2e8f0]">{holiday.name}</td>
                  <td className="px-4 py-3 text-[#8899aa]">{formatDate(holiday.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-md text-[11px] font-semibold ${
                      holiday.type === 'public' ? 'bg-[#00e676]/10 text-[#00e676]' : 
                      holiday.type === 'company' ? 'bg-[#00d4ff]/10 text-[#00d4ff]' : 
                      'bg-[#a78bfa]/10 text-[#a78bfa]'
                    }`}>
                      {holiday.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#8899aa] text-[11px]">{holiday.branchId ? `Branch ${holiday.branchId}` : 'All'}</td>
                  <td className="px-4 py-3 text-center">
                    {holiday.isRecurring && <span className="inline-flex px-2 py-1 rounded-md bg-[#f5a623]/10 text-[#f5a623] text-[11px] font-semibold">Yes</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" 
                        onClick={() => { 
                          setForm({ 
                            name: holiday.name, 
                            date: new Date(holiday.date).toISOString().split('T')[0], 
                            type: holiday.type, 
                            description: holiday.description || '', 
                            isRecurring: holiday.isRecurring, 
                            applicableTo: holiday.applicableTo, 
                            branchId: holiday.branchId?.toString() || '' 
                          }); 
                          setSelectedId(holiday.id); 
                          setEditOpen(true); 
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" 
                        onClick={() => { setSelectedId(holiday.id); setDeleteOpen(true); }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Create Holiday</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Holiday Name" required>
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Republic Day" />
            </FormField>
            <FormField label="Date" required>
              <input type="date" className={inputCls} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="Type">
              <select className={selectCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="public">Public</option>
                <option value="company">Company</option>
                <option value="optional">Optional</option>
              </select>
            </FormField>
            <FormField label="Branch">
              <select className={selectCls} value={form.branchId} onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}>
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </FormField>
            <FormField label="Description" span>
              <input className={inputCls} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </FormField>
            <div className="flex items-center gap-2 col-span-2">
              <input type="checkbox" id="recurring" checked={form.isRecurring} onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))} className="w-4 h-4" />
              <label htmlFor="recurring" className="text-[12px] text-[#e2e8f0]">Recurring annually</label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="vc-btn-ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#00e676] text-black hover:bg-[#00c853] font-semibold" disabled={submitting} onClick={() => handleSubmit('create')}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Edit Holiday</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Holiday Name" required>
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </FormField>
            <FormField label="Date" required>
              <input type="date" className={inputCls} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="Type">
              <select className={selectCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="public">Public</option>
                <option value="company">Company</option>
                <option value="optional">Optional</option>
              </select>
            </FormField>
            <FormField label="Branch">
              <select className={selectCls} value={form.branchId} onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}>
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </FormField>
            <FormField label="Description" span>
              <input className={inputCls} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </FormField>
            <div className="flex items-center gap-2 col-span-2">
              <input type="checkbox" id="recurring-edit" checked={form.isRecurring} onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))} className="w-4 h-4" />
              <label htmlFor="recurring-edit" className="text-[12px] text-[#e2e8f0]">Recurring annually</label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="vc-btn-ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="vc-btn-primary" disabled={submitting} onClick={() => handleSubmit('edit')}>
              {submitting ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base flex items-center gap-2"><AlertTriangle size={20} className="text-[#ff3d3d]" /> Delete Holiday</DialogTitle></DialogHeader>
          <p className="text-[13px] text-[#8899aa]">Are you sure you want to delete this holiday? This action cannot be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="vc-btn-ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#e63535] font-semibold" disabled={submitting} onClick={handleDelete}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LEAVE POLICIES PANEL
// ══════════════════════════════════════════════════════════════════════════════
function LeavePoliciesPanel({ policies, onRefresh }: { policies: LeavePolicy[]; onRefresh: () => void }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState({ 
    name: '', code: '', leaveType: 'paid', annualQuota: '0', carryForward: false, maxCarryForward: '0', 
    encashable: false, maxEncashment: '0', minDaysNotice: '0', maxConsecutiveDays: '0', 
    applicableAfterMonths: '0', applicableGender: 'all', requiresDocument: false 
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (mode: 'create' | 'edit') => {
    if (!form.name.trim() || !form.code.trim()) { toast.error('Name and code are required'); return; }
    setSubmitting(true);
    try {
      const method = mode === 'create' ? 'POST' : 'PUT';
      const body = mode === 'edit' ? { id: selectedId, ...form } : form;
      const res = await fetch('/api/leave-policies', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(`Leave policy ${mode === 'create' ? 'created' : 'updated'} successfully`);
        mode === 'create' ? setCreateOpen(false) : setEditOpen(false);
        setForm({ name: '', code: '', leaveType: 'paid', annualQuota: '0', carryForward: false, maxCarryForward: '0', encashable: false, maxEncashment: '0', minDaysNotice: '0', maxConsecutiveDays: '0', applicableAfterMonths: '0', applicableGender: 'all', requiresDocument: false });
        onRefresh();
      } else { toast.error(json.error || `Failed to ${mode} policy`); }
    } catch { toast.error(`Failed to ${mode} policy`); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/leave-policies', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedId }) });
      const json = await res.json();
      if (json.success) {
        toast.success('Leave policy deleted successfully');
        setDeleteOpen(false);
        onRefresh();
      } else { toast.error(json.error || 'Failed to delete policy'); }
    } catch { toast.error('Failed to delete policy'); }
    finally { setSubmitting(false); }
  };

  return (
    <>
      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileText size={16} className="text-[#00d4ff]" />
          <span className="text-[14px] font-bold text-[#e2e8f0]">Leave Policies</span>
          <span className="ml-auto text-[11px] text-[#5a6878]">{policies.length} policies</span>
          <button className="vc-btn-primary ml-2 flex items-center gap-1.5" onClick={() => { setForm({ name: '', code: '', leaveType: 'paid', annualQuota: '0', carryForward: false, maxCarryForward: '0', encashable: false, maxEncashment: '0', minDaysNotice: '0', maxConsecutiveDays: '0', applicableAfterMonths: '0', applicableGender: 'all', requiresDocument: false }); setCreateOpen(true); }}>
            <Plus size={14} /> Add Policy
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-[#1a2332] z-10">
              <tr className="border-b border-[#2e3a48]">
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Name</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Code</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Type</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Annual Quota</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Carry Forward</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Encashable</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {policies.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-[#5a6878] text-[12px]">No leave policies found</td></tr>
              ) : policies.map((policy) => (
                <tr key={policy.id} className="border-b border-[#1e252e] hover:bg-[#1a2028] transition-colors group">
                  <td className="px-4 py-3 font-semibold text-[#e2e8f0]">{policy.name}</td>
                  <td className="px-4 py-3 text-[#8899aa] font-mono text-[11px]">{policy.code}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-md text-[11px] font-semibold ${
                      policy.leaveType === 'paid' ? 'bg-[#00e676]/10 text-[#00e676]' : 
                      policy.leaveType === 'sick' ? 'bg-[#ff3d3d]/10 text-[#ff3d3d]' : 
                      'bg-[#a78bfa]/10 text-[#a78bfa]'
                    }`}>
                      {policy.leaveType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-[#e2e8f0] font-semibold">{policy.annualQuota} days</td>
                  <td className="px-4 py-3 text-center">
                    {policy.carryForward && <span className="inline-flex px-2 py-1 rounded-md bg-[#00d4ff]/10 text-[#00d4ff] text-[11px] font-semibold">{policy.maxCarryForward} days</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {policy.encashable && <span className="inline-flex px-2 py-1 rounded-md bg-[#f5a623]/10 text-[#f5a623] text-[11px] font-semibold">{policy.maxEncashment} days</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" 
                        onClick={() => { 
                          setForm({ 
                            name: policy.name, code: policy.code, leaveType: policy.leaveType, 
                            annualQuota: policy.annualQuota.toString(), carryForward: policy.carryForward, 
                            maxCarryForward: policy.maxCarryForward.toString(), encashable: policy.encashable, 
                            maxEncashment: policy.maxEncashment.toString(), minDaysNotice: policy.minDaysNotice.toString(), 
                            maxConsecutiveDays: policy.maxConsecutiveDays.toString(), applicableAfterMonths: policy.applicableAfterMonths.toString(), 
                            applicableGender: policy.applicableGender, requiresDocument: policy.requiresDocument 
                          }); 
                          setSelectedId(policy.id); 
                          setEditOpen(true); 
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" 
                        onClick={() => { setSelectedId(policy.id); setDeleteOpen(true); }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Create Leave Policy</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Policy Name" required>
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, code: e.target.value.toUpperCase().replace(/\s+/g, '_').substring(0, 10) }))} placeholder="Paid Leave" />
            </FormField>
            <FormField label="Code" required>
              <input className={inputCls} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="PL" />
            </FormField>
            <FormField label="Leave Type">
              <select className={selectCls} value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))}>
                <option value="paid">Paid</option>
                <option value="sick">Sick</option>
                <option value="casual">Casual</option>
                <option value="maternity">Maternity</option>
                <option value="paternity">Paternity</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </FormField>
            <FormField label="Annual Quota (days)" required>
              <input type="number" step="0.5" className={inputCls} value={form.annualQuota} onChange={e => setForm(f => ({ ...f, annualQuota: e.target.value }))} />
            </FormField>
            <FormField label="Min Days Notice">
              <input type="number" className={inputCls} value={form.minDaysNotice} onChange={e => setForm(f => ({ ...f, minDaysNotice: e.target.value }))} />
            </FormField>
            <FormField label="Max Consecutive Days">
              <input type="number" className={inputCls} value={form.maxConsecutiveDays} onChange={e => setForm(f => ({ ...f, maxConsecutiveDays: e.target.value }))} />
            </FormField>
            <FormField label="Applicable After (months)">
              <input type="number" className={inputCls} value={form.applicableAfterMonths} onChange={e => setForm(f => ({ ...f, applicableAfterMonths: e.target.value }))} />
            </FormField>
            <FormField label="Applicable Gender">
              <select className={selectCls} value={form.applicableGender} onChange={e => setForm(f => ({ ...f, applicableGender: e.target.value }))}>
                <option value="all">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </FormField>
            <div className="col-span-2 space-y-3 border-t border-[#2e3a48] pt-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="carryForward" checked={form.carryForward} onChange={e => setForm(f => ({ ...f, carryForward: e.target.checked }))} className="w-4 h-4" />
                <label htmlFor="carryForward" className="text-[12px] text-[#e2e8f0]">Allow Carry Forward</label>
                {form.carryForward && (
                  <input type="number" step="0.5" className={`${inputCls} w-24 ml-4`} value={form.maxCarryForward} onChange={e => setForm(f => ({ ...f, maxCarryForward: e.target.value }))} placeholder="Max days" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="encashable" checked={form.encashable} onChange={e => setForm(f => ({ ...f, encashable: e.target.checked }))} className="w-4 h-4" />
                <label htmlFor="encashable" className="text-[12px] text-[#e2e8f0]">Encashable</label>
                {form.encashable && (
                  <input type="number" step="0.5" className={`${inputCls} w-24 ml-4`} value={form.maxEncashment} onChange={e => setForm(f => ({ ...f, maxEncashment: e.target.value }))} placeholder="Max days" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="requiresDocument" checked={form.requiresDocument} onChange={e => setForm(f => ({ ...f, requiresDocument: e.target.checked }))} className="w-4 h-4" />
                <label htmlFor="requiresDocument" className="text-[12px] text-[#e2e8f0]">Requires Document (Medical Certificate)</label>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="vc-btn-ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#00d4ff] text-black hover:bg-[#00b8d4] font-semibold" disabled={submitting} onClick={() => handleSubmit('create')}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Same structure as create */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Edit Leave Policy</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Policy Name" required>
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </FormField>
            <FormField label="Code" required>
              <input className={inputCls} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
            </FormField>
            <FormField label="Leave Type">
              <select className={selectCls} value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))}>
                <option value="paid">Paid</option>
                <option value="sick">Sick</option>
                <option value="casual">Casual</option>
                <option value="maternity">Maternity</option>
                <option value="paternity">Paternity</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </FormField>
            <FormField label="Annual Quota (days)" required>
              <input type="number" step="0.5" className={inputCls} value={form.annualQuota} onChange={e => setForm(f => ({ ...f, annualQuota: e.target.value }))} />
            </FormField>
            <FormField label="Min Days Notice">
              <input type="number" className={inputCls} value={form.minDaysNotice} onChange={e => setForm(f => ({ ...f, minDaysNotice: e.target.value }))} />
            </FormField>
            <FormField label="Max Consecutive Days">
              <input type="number" className={inputCls} value={form.maxConsecutiveDays} onChange={e => setForm(f => ({ ...f, maxConsecutiveDays: e.target.value }))} />
            </FormField>
            <FormField label="Applicable After (months)">
              <input type="number" className={inputCls} value={form.applicableAfterMonths} onChange={e => setForm(f => ({ ...f, applicableAfterMonths: e.target.value }))} />
            </FormField>
            <FormField label="Applicable Gender">
              <select className={selectCls} value={form.applicableGender} onChange={e => setForm(f => ({ ...f, applicableGender: e.target.value }))}>
                <option value="all">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </FormField>
            <div className="col-span-2 space-y-3 border-t border-[#2e3a48] pt-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="carryForward-edit" checked={form.carryForward} onChange={e => setForm(f => ({ ...f, carryForward: e.target.checked }))} className="w-4 h-4" />
                <label htmlFor="carryForward-edit" className="text-[12px] text-[#e2e8f0]">Allow Carry Forward</label>
                {form.carryForward && (
                  <input type="number" step="0.5" className={`${inputCls} w-24 ml-4`} value={form.maxCarryForward} onChange={e => setForm(f => ({ ...f, maxCarryForward: e.target.value }))} />
                )}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="encashable-edit" checked={form.encashable} onChange={e => setForm(f => ({ ...f, encashable: e.target.checked }))} className="w-4 h-4" />
                <label htmlFor="encashable-edit" className="text-[12px] text-[#e2e8f0]">Encashable</label>
                {form.encashable && (
                  <input type="number" step="0.5" className={`${inputCls} w-24 ml-4`} value={form.maxEncashment} onChange={e => setForm(f => ({ ...f, maxEncashment: e.target.value }))} />
                )}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="requiresDocument-edit" checked={form.requiresDocument} onChange={e => setForm(f => ({ ...f, requiresDocument: e.target.checked }))} className="w-4 h-4" />
                <label htmlFor="requiresDocument-edit" className="text-[12px] text-[#e2e8f0]">Requires Document</label>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="vc-btn-ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="vc-btn-primary" disabled={submitting} onClick={() => handleSubmit('edit')}>
              {submitting ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base flex items-center gap-2"><AlertTriangle size={20} className="text-[#ff3d3d]" /> Delete Leave Policy</DialogTitle></DialogHeader>
          <p className="text-[13px] text-[#8899aa]">Are you sure you want to delete this leave policy? This action cannot be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="vc-btn-ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#e63535] font-semibold" disabled={submitting} onClick={handleDelete}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE RULES PANEL
// ══════════════════════════════════════════════════════════════════════════════
function AttendanceRulesPanel({ rules, onRefresh }: { rules: AttendanceRule[]; onRefresh: () => void }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState({ 
    name: '', ruleType: 'late_mark', gracePeriodMinutes: '0', lateMarkAfterMinutes: '0', 
    halfDayAfterMinutes: '0', absentAfterMinutes: '0', fineAmount: '0', fineType: 'fixed', 
    finePerMinute: '0', maxFinePerDay: '0', applyToShiftId: '', applyToDepartmentId: '', applyToBranchId: '' 
  });
  const [submitting, setSubmitting] = useState(false);
  const [shifts, setShifts] = useState<Array<{ id: number; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [branches, setBranches] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/shifts').then(r => r.json()).then(j => { if (j.success) setShifts(j.data); }),
      fetch('/api/departments').then(r => r.json()).then(j => { if (j.success) setDepartments(j.data); }),
      fetch('/api/branches').then(r => r.json()).then(j => { if (j.success) setBranches(j.data); }),
    ]).catch(() => {});
  }, []);

  const handleSubmit = async (mode: 'create' | 'edit') => {
    if (!form.name.trim()) { toast.error('Rule name is required'); return; }
    setSubmitting(true);
    try {
      const method = mode === 'create' ? 'POST' : 'PUT';
      const body = mode === 'edit' ? { 
        id: selectedId, ...form, 
        applyToShiftId: form.applyToShiftId ? parseInt(form.applyToShiftId) : null,
        applyToDepartmentId: form.applyToDepartmentId ? parseInt(form.applyToDepartmentId) : null,
        applyToBranchId: form.applyToBranchId ? parseInt(form.applyToBranchId) : null,
      } : { 
        ...form,
        applyToShiftId: form.applyToShiftId ? parseInt(form.applyToShiftId) : null,
        applyToDepartmentId: form.applyToDepartmentId ? parseInt(form.applyToDepartmentId) : null,
        applyToBranchId: form.applyToBranchId ? parseInt(form.applyToBranchId) : null,
      };
      const res = await fetch('/api/attendance-rules', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(`Attendance rule ${mode === 'create' ? 'created' : 'updated'} successfully`);
        mode === 'create' ? setCreateOpen(false) : setEditOpen(false);
        setForm({ name: '', ruleType: 'late_mark', gracePeriodMinutes: '0', lateMarkAfterMinutes: '0', halfDayAfterMinutes: '0', absentAfterMinutes: '0', fineAmount: '0', fineType: 'fixed', finePerMinute: '0', maxFinePerDay: '0', applyToShiftId: '', applyToDepartmentId: '', applyToBranchId: '' });
        onRefresh();
      } else { toast.error(json.error || `Failed to ${mode} rule`); }
    } catch { toast.error(`Failed to ${mode} rule`); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/attendance-rules', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedId }) });
      const json = await res.json();
      if (json.success) {
        toast.success('Attendance rule deleted successfully');
        setDeleteOpen(false);
        onRefresh();
      } else { toast.error(json.error || 'Failed to delete rule'); }
    } catch { toast.error('Failed to delete rule'); }
    finally { setSubmitting(false); }
  };

  return (
    <>
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Shield size={16} className="text-[#a78bfa]" />
          <span className="text-[14px] font-bold text-[#e2e8f0]">Attendance Rules</span>
          <span className="ml-auto text-[11px] text-[#5a6878]">{rules.length} rules</span>
          <button className="vc-btn-primary ml-2 flex items-center gap-1.5" onClick={() => { setForm({ name: '', ruleType: 'late_mark', gracePeriodMinutes: '0', lateMarkAfterMinutes: '0', halfDayAfterMinutes: '0', absentAfterMinutes: '0', fineAmount: '0', fineType: 'fixed', finePerMinute: '0', maxFinePerDay: '0', applyToShiftId: '', applyToDepartmentId: '', applyToBranchId: '' }); setCreateOpen(true); }}>
            <Plus size={14} /> Add Rule
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-[#1a2332] z-10">
              <tr className="border-b border-[#2e3a48]">
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Name</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Type</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Grace (min)</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Late Mark</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Fine</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Apply To</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-[#5a6878] text-[12px]">No attendance rules found</td></tr>
              ) : rules.map((rule) => (
                <tr key={rule.id} className="border-b border-[#1e252e] hover:bg-[#1a2028] transition-colors group">
                  <td className="px-4 py-3 font-semibold text-[#e2e8f0]">{rule.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-md text-[11px] font-semibold ${
                      rule.ruleType === 'late_mark' ? 'bg-[#ffab40]/10 text-[#ffab40]' : 
                      rule.ruleType === 'fine' ? 'bg-[#ff3d3d]/10 text-[#ff3d3d]' : 
                      'bg-[#a78bfa]/10 text-[#a78bfa]'
                    }`}>
                      {rule.ruleType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-[#e2e8f0]">{rule.gracePeriodMinutes}</td>
                  <td className="px-4 py-3 text-center text-[#e2e8f0]">{rule.lateMarkAfterMinutes} min</td>
                  <td className="px-4 py-3 text-center">
                    {rule.fineAmount > 0 && (
                      <span className="inline-flex px-2 py-1 rounded-md bg-[#ff3d3d]/10 text-[#ff3d3d] text-[11px] font-semibold">
                        {formatCurrency(Number(rule.fineAmount))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#8899aa] text-[11px]">
                    {rule.applyToShiftId ? `Shift ${rule.applyToShiftId}` : 
                     rule.applyToDepartmentId ? `Dept ${rule.applyToDepartmentId}` : 
                     rule.applyToBranchId ? `Branch ${rule.applyToBranchId}` : 'All'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" 
                        onClick={() => { 
                          setForm({ 
                            name: rule.name, ruleType: rule.ruleType, gracePeriodMinutes: rule.gracePeriodMinutes.toString(), 
                            lateMarkAfterMinutes: rule.lateMarkAfterMinutes.toString(), halfDayAfterMinutes: rule.halfDayAfterMinutes.toString(), 
                            absentAfterMinutes: rule.absentAfterMinutes.toString(), fineAmount: rule.fineAmount.toString(), 
                            fineType: rule.fineType, finePerMinute: rule.finePerMinute.toString(), maxFinePerDay: rule.maxFinePerDay.toString(), 
                            applyToShiftId: rule.applyToShiftId?.toString() || '', applyToDepartmentId: rule.applyToDepartmentId?.toString() || '', 
                            applyToBranchId: rule.applyToBranchId?.toString() || '' 
                          }); 
                          setSelectedId(rule.id); 
                          setEditOpen(true); 
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" 
                        onClick={() => { setSelectedId(rule.id); setDeleteOpen(true); }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Create Attendance Rule</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Rule Name" required span>
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Standard Late Mark Rule" />
            </FormField>
            <FormField label="Rule Type">
              <select className={selectCls} value={form.ruleType} onChange={e => setForm(f => ({ ...f, ruleType: e.target.value }))}>
                <option value="late_mark">Late Mark</option>
                <option value="fine">Fine</option>
                <option value="half_day">Half Day</option>
                <option value="absent">Absent</option>
              </select>
            </FormField>
            <FormField label="Grace Period (minutes)">
              <input type="number" className={inputCls} value={form.gracePeriodMinutes} onChange={e => setForm(f => ({ ...f, gracePeriodMinutes: e.target.value }))} />
            </FormField>
            <FormField label="Late Mark After (minutes)">
              <input type="number" className={inputCls} value={form.lateMarkAfterMinutes} onChange={e => setForm(f => ({ ...f, lateMarkAfterMinutes: e.target.value }))} />
            </FormField>
            <FormField label="Half Day After (minutes)">
              <input type="number" className={inputCls} value={form.halfDayAfterMinutes} onChange={e => setForm(f => ({ ...f, halfDayAfterMinutes: e.target.value }))} />
            </FormField>
            <FormField label="Absent After (minutes)">
              <input type="number" className={inputCls} value={form.absentAfterMinutes} onChange={e => setForm(f => ({ ...f, absentAfterMinutes: e.target.value }))} />
            </FormField>
            <FormField label="Fine Type">
              <select className={selectCls} value={form.fineType} onChange={e => setForm(f => ({ ...f, fineType: e.target.value }))}>
                <option value="fixed">Fixed</option>
                <option value="per_minute">Per Minute</option>
                <option value="progressive">Progressive</option>
              </select>
            </FormField>
            <FormField label="Fine Amount (₹)">
              <input type="number" step="0.01" className={inputCls} value={form.fineAmount} onChange={e => setForm(f => ({ ...f, fineAmount: e.target.value }))} />
            </FormField>
            {form.fineType === 'per_minute' && (
              <>
                <FormField label="Fine Per Minute (₹)">
                  <input type="number" step="0.01" className={inputCls} value={form.finePerMinute} onChange={e => setForm(f => ({ ...f, finePerMinute: e.target.value }))} />
                </FormField>
                <FormField label="Max Fine Per Day (₹)">
                  <input type="number" step="0.01" className={inputCls} value={form.maxFinePerDay} onChange={e => setForm(f => ({ ...f, maxFinePerDay: e.target.value }))} />
                </FormField>
              </>
            )}
            <FormField label="Apply To Shift">
              <select className={selectCls} value={form.applyToShiftId} onChange={e => setForm(f => ({ ...f, applyToShiftId: e.target.value }))}>
                <option value="">All Shifts</option>
                {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FormField>
            <FormField label="Apply To Department">
              <select className={selectCls} value={form.applyToDepartmentId} onChange={e => setForm(f => ({ ...f, applyToDepartmentId: e.target.value }))}>
                <option value="">All Departments</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </FormField>
            <FormField label="Apply To Branch">
              <select className={selectCls} value={form.applyToBranchId} onChange={e => setForm(f => ({ ...f, applyToBranchId: e.target.value }))}>
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </FormField>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="vc-btn-ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#a78bfa] text-black hover:bg-[#9575cd] font-semibold" disabled={submitting} onClick={() => handleSubmit('create')}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Similar to create */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Edit Attendance Rule</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Rule Name" required span>
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </FormField>
            <FormField label="Rule Type">
              <select className={selectCls} value={form.ruleType} onChange={e => setForm(f => ({ ...f, ruleType: e.target.value }))}>
                <option value="late_mark">Late Mark</option>
                <option value="fine">Fine</option>
                <option value="half_day">Half Day</option>
                <option value="absent">Absent</option>
              </select>
            </FormField>
            <FormField label="Grace Period (minutes)">
              <input type="number" className={inputCls} value={form.gracePeriodMinutes} onChange={e => setForm(f => ({ ...f, gracePeriodMinutes: e.target.value }))} />
            </FormField>
            <FormField label="Late Mark After (minutes)">
              <input type="number" className={inputCls} value={form.lateMarkAfterMinutes} onChange={e => setForm(f => ({ ...f, lateMarkAfterMinutes: e.target.value }))} />
            </FormField>
            <FormField label="Half Day After (minutes)">
              <input type="number" className={inputCls} value={form.halfDayAfterMinutes} onChange={e => setForm(f => ({ ...f, halfDayAfterMinutes: e.target.value }))} />
            </FormField>
            <FormField label="Absent After (minutes)">
              <input type="number" className={inputCls} value={form.absentAfterMinutes} onChange={e => setForm(f => ({ ...f, absentAfterMinutes: e.target.value }))} />
            </FormField>
            <FormField label="Fine Type">
              <select className={selectCls} value={form.fineType} onChange={e => setForm(f => ({ ...f, fineType: e.target.value }))}>
                <option value="fixed">Fixed</option>
                <option value="per_minute">Per Minute</option>
                <option value="progressive">Progressive</option>
              </select>
            </FormField>
            <FormField label="Fine Amount (₹)">
              <input type="number" step="0.01" className={inputCls} value={form.fineAmount} onChange={e => setForm(f => ({ ...f, fineAmount: e.target.value }))} />
            </FormField>
            {form.fineType === 'per_minute' && (
              <>
                <FormField label="Fine Per Minute (₹)">
                  <input type="number" step="0.01" className={inputCls} value={form.finePerMinute} onChange={e => setForm(f => ({ ...f, finePerMinute: e.target.value }))} />
                </FormField>
                <FormField label="Max Fine Per Day (₹)">
                  <input type="number" step="0.01" className={inputCls} value={form.maxFinePerDay} onChange={e => setForm(f => ({ ...f, maxFinePerDay: e.target.value }))} />
                </FormField>
              </>
            )}
            <FormField label="Apply To Shift">
              <select className={selectCls} value={form.applyToShiftId} onChange={e => setForm(f => ({ ...f, applyToShiftId: e.target.value }))}>
                <option value="">All Shifts</option>
                {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FormField>
            <FormField label="Apply To Department">
              <select className={selectCls} value={form.applyToDepartmentId} onChange={e => setForm(f => ({ ...f, applyToDepartmentId: e.target.value }))}>
                <option value="">All Departments</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </FormField>
            <FormField label="Apply To Branch">
              <select className={selectCls} value={form.applyToBranchId} onChange={e => setForm(f => ({ ...f, applyToBranchId: e.target.value }))}>
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </FormField>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="vc-btn-ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="vc-btn-primary" disabled={submitting} onClick={() => handleSubmit('edit')}>
              {submitting ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base flex items-center gap-2"><AlertTriangle size={20} className="text-[#ff3d3d]" /> Delete Attendance Rule</DialogTitle></DialogHeader>
          <p className="text-[13px] text-[#8899aa]">Are you sure you want to delete this attendance rule? This action cannot be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="vc-btn-ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#e63535] font-semibold" disabled={submitting} onClick={handleDelete}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GRADES PANEL
// ══════════════════════════════════════════════════════════════════════════════
function GradesPanel({ grades, onRefresh }: { grades: Grade[]; onRefresh: () => void }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', code: '', level: '1', minSalary: '0', maxSalary: '0', description: '', benefits: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (mode: 'create' | 'edit') => {
    if (!form.name.trim() || !form.code.trim()) { toast.error('Name and code are required'); return; }
    if (parseFloat(form.minSalary) >= parseFloat(form.maxSalary)) { toast.error('Max salary must be greater than min salary'); return; }
    setSubmitting(true);
    try {
      const method = mode === 'create' ? 'POST' : 'PUT';
      const body = mode === 'edit' ? { id: selectedId, ...form } : form;
      const res = await fetch('/api/grades', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(`Grade ${mode === 'create' ? 'created' : 'updated'} successfully`);
        mode === 'create' ? setCreateOpen(false) : setEditOpen(false);
        setForm({ name: '', code: '', level: '1', minSalary: '0', maxSalary: '0', description: '', benefits: '' });
        onRefresh();
      } else { toast.error(json.error || `Failed to ${mode} grade`); }
    } catch { toast.error(`Failed to ${mode} grade`); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/grades', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedId }) });
      const json = await res.json();
      if (json.success) {
        toast.success('Grade deleted successfully');
        setDeleteOpen(false);
        onRefresh();
      } else { toast.error(json.error || 'Failed to delete grade'); }
    } catch { toast.error('Failed to delete grade'); }
    finally { setSubmitting(false); }
  };

  return (
    <>
      <div className="vc-panel">
        <div className="vc-panel-header">
          <DollarSign size={16} className="text-[#a78bfa]" />
          <span className="text-[14px] font-bold text-[#e2e8f0]">Salary Grades</span>
          <span className="ml-auto text-[11px] text-[#5a6878]">{grades.length} grades</span>
          <button className="vc-btn-primary ml-2 flex items-center gap-1.5" onClick={() => { setForm({ name: '', code: '', level: '1', minSalary: '0', maxSalary: '0', description: '', benefits: '' }); setCreateOpen(true); }}>
            <Plus size={14} /> Add Grade
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-[#1a2332] z-10">
              <tr className="border-b border-[#2e3a48]">
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Name</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Code</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Level</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Min Salary</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Max Salary</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Employees</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {grades.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-[#5a6878] text-[12px]">No grades found</td></tr>
              ) : grades.map((grade) => (
                <tr key={grade.id} className="border-b border-[#1e252e] hover:bg-[#1a2028] transition-colors group">
                  <td className="px-4 py-3 font-semibold text-[#e2e8f0]">{grade.name}</td>
                  <td className="px-4 py-3 text-[#8899aa] font-mono text-[11px]">{grade.code}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#a78bfa]/10 text-[#a78bfa] font-bold">
                      {grade.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-[#8899aa] font-mono text-[11px]">{formatCurrency(Number(grade.minSalary))}</td>
                  <td className="px-4 py-3 text-right text-[#e2e8f0] font-semibold">{formatCurrency(Number(grade.maxSalary))}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#00d4ff]/10 text-[#00d4ff] text-[11px] font-semibold">
                      <Users size={12} />
                      {grade._count?.Employee || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" 
                        onClick={() => { 
                          setForm({ 
                            name: grade.name, code: grade.code, level: grade.level.toString(), 
                            minSalary: grade.minSalary.toString(), maxSalary: grade.maxSalary.toString(), 
                            description: grade.description || '', benefits: grade.benefits || '' 
                          }); 
                          setSelectedId(grade.id); 
                          setEditOpen(true); 
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" 
                        onClick={() => { setSelectedId(grade.id); setDeleteOpen(true); }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Create Salary Grade</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Grade Name" required>
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, code: e.target.value.toUpperCase().replace(/\s+/g, '_').substring(0, 10) }))} placeholder="L1 - Junior Engineer" />
            </FormField>
            <FormField label="Code" required>
              <input className={inputCls} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="L1" />
            </FormField>
            <FormField label="Level" required>
              <input type="number" className={inputCls} value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} min="1" />
            </FormField>
            <div />
            <FormField label="Minimum Salary (₹)" required>
              <input type="number" step="1000" className={inputCls} value={form.minSalary} onChange={e => setForm(f => ({ ...f, minSalary: e.target.value }))} />
            </FormField>
            <FormField label="Maximum Salary (₹)" required>
              <input type="number" step="1000" className={inputCls} value={form.maxSalary} onChange={e => setForm(f => ({ ...f, maxSalary: e.target.value }))} />
            </FormField>
            <FormField label="Description" span>
              <input className={inputCls} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Entry-level engineers with 0-2 years experience" />
            </FormField>
            <FormField label="Benefits" span>
              <input className={inputCls} value={form.benefits} onChange={e => setForm(f => ({ ...f, benefits: e.target.value }))} placeholder="Health insurance, PF, ESI" />
            </FormField>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="vc-btn-ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#a78bfa] text-black hover:bg-[#9575cd] font-semibold" disabled={submitting} onClick={() => handleSubmit('create')}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Edit Salary Grade</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Grade Name" required>
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </FormField>
            <FormField label="Code" required>
              <input className={inputCls} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
            </FormField>
            <FormField label="Level" required>
              <input type="number" className={inputCls} value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} min="1" />
            </FormField>
            <div />
            <FormField label="Minimum Salary (₹)" required>
              <input type="number" step="1000" className={inputCls} value={form.minSalary} onChange={e => setForm(f => ({ ...f, minSalary: e.target.value }))} />
            </FormField>
            <FormField label="Maximum Salary (₹)" required>
              <input type="number" step="1000" className={inputCls} value={form.maxSalary} onChange={e => setForm(f => ({ ...f, maxSalary: e.target.value }))} />
            </FormField>
            <FormField label="Description" span>
              <input className={inputCls} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </FormField>
            <FormField label="Benefits" span>
              <input className={inputCls} value={form.benefits} onChange={e => setForm(f => ({ ...f, benefits: e.target.value }))} />
            </FormField>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="vc-btn-ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="vc-btn-primary" disabled={submitting} onClick={() => handleSubmit('edit')}>
              {submitting ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base flex items-center gap-2"><AlertTriangle size={20} className="text-[#ff3d3d]" /> Delete Salary Grade</DialogTitle></DialogHeader>
          <p className="text-[13px] text-[#8899aa]">Are you sure you want to delete this salary grade? This action cannot be undone and will affect employees assigned to this grade.</p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="vc-btn-ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#e63535] font-semibold" disabled={submitting} onClick={handleDelete}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
