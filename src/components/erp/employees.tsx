'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HardHat, Search, Plus, Eye, Pencil, Trash2, Users, MapPin,
  UserPlus, UserMinus, ChevronDown, X, AlertTriangle
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';
import EmployeeBulkImport from './employee-bulk-import';

interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  employmentType: string;
  employmentStatus: string;
  dateOfJoining: string;
  Department?: {
    id: number;
    name: string;
    code: string;
  };
  Designation?: {
    id: number;
    name: string;
  };
  Branch?: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface EmployeeFormData {
  empId: string;
  name: string;
  email: string;
  phone: string;
  trade: string;
  role: string;
  site: string;
  type: string;
  status: string;
  joiningDate: string;
  certifications: string;
}

const TRADES = ['Electrical', 'Mechanical', 'Civil', 'Welding', 'Instrumentation', 'Safety', 'Rigging', 'Administration'];
const emptyForm: EmployeeFormData = {
  empId: '', name: '', email: '', phone: '', trade: 'Electrical', role: '', site: '',
  type: 'Staff', status: 'Active', joiningDate: '', certifications: '',
};

const AVATAR_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  B: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  C: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  D: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
};

function getAvatarColor(name: string) {
  if (!name || typeof name !== 'string') {
    return { bg: 'bg-gray-500/20', text: 'text-gray-400' };
  }
  const letter = name.charAt(0).toUpperCase();
  return AVATAR_COLORS[letter] || { bg: 'bg-red-500/20', text: 'text-red-400' };
}

function getFullName(emp: Employee): string {
  const parts = [emp.firstName, emp.middleName, emp.lastName].filter(Boolean);
  return parts.join(' ') || 'Unknown';
}

function getInitials(emp: Employee): string {
  const firstName = emp.firstName || '';
  const lastName = emp.lastName || '';
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || '??';
}

function getStatusStyle(status: string) {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case 'active': return { bg: 'bg-[#00e676]/10', text: 'text-[#00e676]', border: 'border-[#00e676]/20' };
    case 'inactive': return { bg: 'bg-[#5a6878]/10', text: 'text-[#5a6878]', border: 'border-[#5a6878]/20' };
    case 'on_leave': return { bg: 'bg-[#a78bfa]/10', text: 'text-[#a78bfa]', border: 'border-[#a78bfa]/20' };
    case 'notice_period': return { bg: 'bg-[#ffab40]/10', text: 'text-[#ffab40]', border: 'border-[#ffab40]/20' };
    case 'separated': return { bg: 'bg-[#ff3d3d]/10', text: 'text-[#ff3d3d]', border: 'border-[#ff3d3d]/20' };
    default: return { bg: 'bg-[#8899aa]/10', text: 'text-[#8899aa]', border: 'border-[#8899aa]/20' };
  }
}

function getTypeStyle(type: string) {
  switch (type) {
    case 'Staff': return { bg: 'bg-[#00d4ff]/10', text: 'text-[#00d4ff]' };
    case 'Contract': return { bg: 'bg-[#f5a623]/10', text: 'text-[#f5a623]' };
    default: return { bg: 'bg-[#8899aa]/10', text: 'text-[#8899aa]' };
  }
}

function parseCerts(certStr: string): string[] {
  if (!certStr || certStr.trim() === '') return [];
  return certStr.split(',').map(c => c.trim()).filter(Boolean).slice(0, 3);
}

function formatDate(d: string) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="vc-stat-card">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] text-[#5a6878] font-semibold uppercase tracking-wider mb-1">{label}</div>
          <div className="text-[26px] font-bold leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{value}</div>
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children, span = false, required = false }: { label: string; children: React.ReactNode; span?: boolean; required?: boolean }) {
  return (
    <div className={span ? 'md:col-span-2' : ''}>
      <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">
        {label}
        {required && <span className="text-[#ff3d3d] ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623]";
const selectCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623] appearance-none cursor-pointer";

export default function EmployeesModule() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [tradeFilter, setTradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  // Fetch designations for dropdown
  const [designations, setDesignations] = useState<Array<{ id: number; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      if (json.success) setEmployees(json.data);
      else throw new Error(json.error || 'Unknown error');
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong'); }
    finally { setLoading(false); }
  }, []);

  const fetchDesignations = useCallback(async () => {
    try {
      const res = await fetch('/api/designations');
      const json = await res.json();
      if (json.success) setDesignations(json.data);
    } catch (err) {
      console.error('Failed to fetch designations:', err);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch('/api/departments');
      const json = await res.json();
      if (json.success) setDepartments(json.data);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
    fetchDesignations();
    fetchDepartments();
  }, [fetchData, fetchDesignations, fetchDepartments]);

  const sites = useMemo(() => Array.from(new Set(employees.map(e => e.Branch?.name).filter(Boolean))).sort(), [employees]);
  const trades = useMemo(() => Array.from(new Set(employees.map(e => e.Department?.name).filter(Boolean))).sort(), [employees]);

  const filtered = useMemo(() => {
    let list = employees;
    if (search.trim()) {
      const q = search.toLowerCase();
      const fullName = (e: Employee) => getFullName(e).toLowerCase();
      list = list.filter(e => 
        fullName(e).includes(q) || 
        e.employeeCode.toLowerCase().includes(q) || 
        e.email?.toLowerCase().includes(q) || 
        e.Department?.name.toLowerCase().includes(q) || 
        e.Designation?.name.toLowerCase().includes(q)
      );
    }
    if (siteFilter !== 'all') list = list.filter(e => e.Branch?.name === siteFilter);
    if (tradeFilter !== 'all') list = list.filter(e => e.Department?.name === tradeFilter);
    if (statusFilter !== 'all') list = list.filter(e => e.employmentStatus === statusFilter.toLowerCase().replace(' ', '_'));
    return list;
  }, [employees, search, siteFilter, tradeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const totalEmployees = employees.length;
  const activeCount = employees.filter(e => e.employmentStatus === 'active').length;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
  const newJoiners = employees.filter(e => e.dateOfJoining >= thirtyDaysAgo).length;
  const separated = employees.filter(e => e.employmentStatus === 'separated').length;

  useEffect(() => { setPage(1); }, [search, siteFilter, tradeFilter, statusFilter]);

  const openCreate = () => { 
    // Suggest next available employee ID
    const existingCodes = employees.map(e => e.employeeCode).filter(code => /^EMP\d{4}$/.test(code));
    const numbers = existingCodes.map(code => parseInt(code.substring(3)));
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;
    const suggestedId = nextNumber <= 9999 ? `EMP${nextNumber.toString().padStart(4, '0')}` : '';
    
    setForm({ ...emptyForm, empId: suggestedId }); 
    setCreateOpen(true); 
  };
  const openEdit = (emp: Employee) => {
    // Convert ISO date to YYYY-MM-DD format for date input
    const joiningDate = emp.dateOfJoining ? emp.dateOfJoining.split('T')[0] : '';
    
    const formData = {
      empId: emp.employeeCode,
      name: getFullName(emp),
      email: emp.email || '',
      phone: emp.phone || '',
      trade: emp.Department?.name || 'Electrical',
      role: emp.Designation?.name || '',
      site: emp.Branch?.name || '',
      type: emp.employmentType === 'permanent' ? 'Staff' : 'Contract',
      status: emp.employmentStatus.charAt(0).toUpperCase() + emp.employmentStatus.slice(1).replace('_', ' '),
      joiningDate: joiningDate,
      certifications: '',
    };
    setForm(formData);
    setSelectedId(emp.id.toString());
    setEditOpen(true);
  };
  const openDelete = (id: number) => { setSelectedId(id.toString()); setDeleteOpen(true); };

  const handleSubmit = async (mode: 'create' | 'edit') => {
    setSubmitting(true);
    try {
      // Validate required fields
      const errors: string[] = [];
      
      if (!form.empId.trim()) errors.push('Employee ID is required');
      if (!form.name.trim()) errors.push('Full Name is required');
      if (!form.email.trim()) errors.push('Email is required');
      if (!form.phone.trim()) errors.push('Phone is required');
      if (!form.trade) errors.push('Trade/Department is required');
      if (!form.role.trim()) errors.push('Role/Designation is required');
      if (!form.site) errors.push('Site/Branch is required');
      if (!form.joiningDate) errors.push('Joining Date is required');
      
      if (errors.length > 0) {
        toast.error(
          <div>
            <div className="font-semibold mb-1">Please fix the following errors:</div>
            <ul className="list-disc list-inside text-xs">
              {errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>,
          { duration: 5000 }
        );
        setSubmitting(false);
        return;
      }

      // Validate employee ID format (EMP0001 to EMP9999)
      const empIdPattern = /^EMP\d{4}$/;
      let employeeCode = form.empId.trim().toUpperCase();
      
      // Auto-format if user entered just numbers
      if (/^\d{1,4}$/.test(employeeCode)) {
        employeeCode = `EMP${employeeCode.padStart(4, '0')}`;
      }
      
      if (!empIdPattern.test(employeeCode)) {
        toast.error(
          <div>
            <div className="font-semibold mb-1">Invalid Employee ID Format</div>
            <div className="text-xs">Employee ID must be in format: EMP0001 to EMP9999</div>
            <div className="text-xs mt-1">Examples: EMP0001, EMP0123, EMP9999</div>
          </div>,
          { duration: 5000 }
        );
        setSubmitting(false);
        return;
      }

      // Validate email format
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(form.email)) {
        toast.error('Please enter a valid email address');
        setSubmitting(false);
        return;
      }

      // Validate phone format (basic check)
      const phonePattern = /^[0-9+\-\s()]{10,}$/;
      if (!phonePattern.test(form.phone)) {
        toast.error('Please enter a valid phone number (at least 10 digits)');
        setSubmitting(false);
        return;
      }

      // Check for duplicate employee ID (only for create mode)
      if (mode === 'create') {
        const existingEmployee = employees.find(e => e.employeeCode === employeeCode);
        if (existingEmployee) {
          toast.error(
            <div>
              <div className="font-semibold mb-1">Duplicate Employee ID</div>
              <div className="text-xs">Employee ID {employeeCode} is already assigned to:</div>
              <div className="text-xs font-semibold mt-1">{getFullName(existingEmployee)}</div>
              <div className="text-xs mt-1">Please use a different Employee ID</div>
            </div>,
            { duration: 6000 }
          );
          setSubmitting(false);
          return;
        }
      }

      // Transform form data to match API expectations
      const nameParts = form.name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0] || '';
      const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null;

      // Fetch department, designation, and branch data
      const [deptRes, desigRes, branchRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/designations'),
        fetch('/api/branches'),
      ]);
      
      if (!deptRes.ok || !desigRes.ok || !branchRes.ok) {
        toast.error(
          <div>
            <div className="font-semibold mb-1">System Configuration Error</div>
            <div className="text-xs">Failed to load departments, designations, or branches.</div>
            <div className="text-xs mt-1">Please contact your system administrator.</div>
          </div>,
          { duration: 5000 }
        );
        setSubmitting(false);
        return;
      }
      
      const deptData = await deptRes.json();
      const desigData = await desigRes.json();
      const branchData = await branchRes.json();

      // Find matching department, designation, and branch by name
      const department = deptData.data?.find((d: any) => d.name === form.trade);
      const designation = desigData.data?.find((d: any) => d.name === form.role);
      const branch = branchData.data?.find((b: any) => b.name === form.site);

      // Use found IDs or default to first available
      const departmentId = department?.id || deptData.data?.[0]?.id;
      const designationId = designation?.id || desigData.data?.[0]?.id;
      const branchId = branch?.id || branchData.data?.[0]?.id;

      if (!departmentId || !designationId || !branchId) {
        toast.error('System configuration error: Missing department, designation, or branch data. Please contact administrator.');
        setSubmitting(false);
        return;
      }

      const apiBody = {
        employeeCode,
        firstName,
        middleName,
        lastName,
        email: form.email.trim(),
        phone: form.phone.trim(),
        dateOfBirth: new Date('1990-01-01').toISOString(),
        gender: 'male',
        currentAddress: 'Address',
        currentCity: 'City',
        currentState: 'State',
        currentPincode: '000000',
        departmentId,
        designationId,
        branchId,
        dateOfJoining: form.joiningDate,
        employmentType: form.type.toLowerCase() === 'staff' ? 'permanent' : 'contract',
        employmentStatus: form.status.toLowerCase().replace(' ', '_'),
      };

      const body = mode === 'edit' ? { id: parseInt(selectedId || '0'), ...apiBody } : apiBody;
      
      const res = await fetch('/api/employees', { 
        method: mode === 'create' ? 'POST' : 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body) 
      });
      
      const json = await res.json();
      
      if (json.success) {
        toast.success(
          <div>
            <div className="font-semibold">{mode === 'create' ? 'Employee Created!' : 'Employee Updated!'}</div>
            <div className="text-xs mt-1">{employeeCode} - {form.name}</div>
          </div>,
          { duration: 3000 }
        );
        if (mode === 'create') setCreateOpen(false); else setEditOpen(false);
        setForm(emptyForm); // Reset form
        await fetchData(); // Wait for data to refresh
      } else { 
        toast.error(
          <div>
            <div className="font-semibold mb-1">Failed to {mode} employee</div>
            <div className="text-xs">{json.error || 'Unknown error occurred'}</div>
          </div>,
          { duration: 5000 }
        );
      }
    } catch (error) { 
      toast.error(
        <div>
          <div className="font-semibold mb-1">System Error</div>
          <div className="text-xs">{error instanceof Error ? error.message : 'Failed to process request'}</div>
        </div>,
        { duration: 5000 }
      );
      console.error('Submit error:', error);
    } finally { 
      setSubmitting(false); 
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/employees', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedId }) });
      const json = await res.json();
      if (json.success) { toast.success('Employee deleted successfully'); setDeleteOpen(false); fetchData(); }
      else { toast.error(json.error || 'Failed to delete employee'); }
    } catch { toast.error('Failed to delete employee'); }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="vc-stat-card"><Skeleton className="h-3 w-24 mb-2 bg-[#1e2630]" /><Skeleton className="h-8 w-16 bg-[#1e2630]" /></div>
          ))}
        </div>
        <div className="vc-panel"><Skeleton className="h-64 w-full bg-[#1e2630]" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle size={40} className="text-[#ff3d3d]" />
        <p className="text-[#8899aa] text-sm">{error}</p>
        <button className="vc-btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const dialogContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
      <FormField label="Employee ID" required>
        <input 
          className={inputCls} 
          value={form.empId} 
          onChange={e => setForm(f => ({ ...f, empId: e.target.value.toUpperCase() }))} 
          placeholder="EMP0001" 
          maxLength={7}
        />
        <p className="text-[9px] text-[#5a6878] mt-1">Format: EMP0001 to EMP9999</p>
      </FormField>
      <FormField label="Full Name" required>
        <input 
          className={inputCls} 
          value={form.name} 
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
          placeholder="Rajesh Kumar" 
        />
      </FormField>
      <FormField label="Email" required>
        <input 
          className={inputCls} 
          type="email" 
          value={form.email} 
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
          placeholder="rajesh@voltcore.com" 
        />
      </FormField>
      <FormField label="Phone" required>
        <input 
          className={inputCls} 
          value={form.phone} 
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} 
          placeholder="+91 98765 43210" 
        />
      </FormField>
      <FormField label="Trade / Department" required>
        <select 
          className={selectCls} 
          value={form.trade} 
          onChange={e => setForm(f => ({ ...f, trade: e.target.value }))}
        >
          <option value="">Select department</option>
          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
      </FormField>
      <FormField label="Role / Designation" required>
        <select 
          className={selectCls} 
          value={form.role} 
          onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
        >
          <option value="">Select designation</option>
          {designations.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
      </FormField>
      <FormField label="Site / Branch" required>
        <select 
          className={selectCls} 
          value={form.site} 
          onChange={e => setForm(f => ({ ...f, site: e.target.value }))}
        >
          <option value="">Select site</option>
          {sites.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </FormField>
      <FormField label="Employment Type" required>
        <select 
          className={selectCls} 
          value={form.type} 
          onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
        >
          <option value="Staff">Staff (Permanent)</option>
          <option value="Contract">Contract</option>
        </select>
      </FormField>
      <FormField label="Employment Status" required>
        <select 
          className={selectCls} 
          value={form.status} 
          onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="On Leave">On Leave</option>
          <option value="Notice Period">Notice Period</option>
          <option value="Separated">Separated</option>
        </select>
      </FormField>
      <FormField label="Joining Date" required>
        <input 
          className={inputCls} 
          type="date" 
          value={form.joiningDate} 
          onChange={e => setForm(f => ({ ...f, joiningDate: e.target.value }))} 
        />
      </FormField>
      <FormField label="Certifications (comma separated)" span>
        <input 
          className={inputCls} 
          value={form.certifications} 
          onChange={e => setForm(f => ({ ...f, certifications: e.target.value }))} 
          placeholder="First Aid, Confined Space, Working at Height" 
        />
        <p className="text-[9px] text-[#5a6878] mt-1">Optional: Separate multiple certifications with commas</p>
      </FormField>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Employees" value={totalEmployees} color="#f5a623" />
        <StatCard icon={MapPin} label="Active" value={activeCount} color="#00e676" />
        <StatCard icon={UserPlus} label="New (30d)" value={newJoiners} color="#00d4ff" />
        <StatCard icon={UserMinus} label="Separated" value={separated} color="#ff3d3d" />
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header">
          <HardHat size={14} className="text-[#f5a623]" />
          <span className="text-[13px] font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>EMPLOYEE DIRECTORY</span>
          <span className="ml-auto text-[10px] text-[#5a6878]">{filtered.length} records</span>
          <EmployeeBulkImport onImportComplete={fetchData} />
          <button className="vc-btn-primary ml-2 flex items-center gap-1" onClick={openCreate}><Plus size={13} /> Add Employee</button>
        </div>
        <div className="vc-panel-body space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 bg-[#141920] border border-[#2e3a48] rounded-lg px-3 py-[6px] flex-1 min-w-[200px] max-w-[360px]">
              <Search size={14} className="text-[#5a6878] shrink-0" />
              <input type="text" placeholder="Search by name, ID, trade..." value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent border-none text-[#e2e8f0] outline-none text-[12px] w-full placeholder:text-[#5a6878]" />
              {search && <button onClick={() => setSearch('')} className="text-[#5a6878] hover:text-[#e2e8f0]"><X size={14} /></button>}
            </div>
            {[
              { value: siteFilter, set: setSiteFilter, label: 'All Sites', options: sites },
              { value: tradeFilter, set: setTradeFilter, label: 'All Trades', options: trades },
              { value: statusFilter, set: setStatusFilter, label: 'All Status', options: ['Active', 'Inactive', 'On Leave', 'Notice Period', 'Separated'] },
            ].map((filter, i) => (
              <div key={i} className="relative">
                <select value={filter.value} onChange={e => filter.set(e.target.value)} className="vc-input appearance-none pr-7 min-w-[130px] cursor-pointer">
                  <option value="all">{filter.label}</option>
                  {filter.options.map((o, idx) => <option key={`${filter.label}-${o}-${idx}`} value={o}>{o}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5a6878] pointer-events-none" />
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="rounded-lg border border-[#252e3a] overflow-hidden">
            <div className="max-h-[480px] overflow-y-auto">
              <div className="grid grid-cols-[70px_1fr_110px_90px_65px_80px_130px_75px_60px] gap-2 px-3 py-2.5 text-[9px] font-bold uppercase tracking-wider text-[#5a6878] bg-[#141920] border-b border-[#252e3a] sticky top-0 z-10">
                <span>ID</span><span>Name</span><span className="hidden md:block">Trade/Role</span><span className="hidden lg:block">Site</span><span>Type</span><span className="hidden sm:block">Joined</span><span className="hidden xl:block">Certifications</span><span>Status</span><span className="text-right">Actions</span>
              </div>
              {paged.length === 0 ? (
                <div className="px-4 py-12 text-center text-[#5a6878] text-xs">No employees match your filters.</div>
              ) : paged.map(emp => {
                const fullName = getFullName(emp);
                const avatar = getAvatarColor(fullName);
                const st = getStatusStyle(emp.employmentStatus || 'active');
                const initials = getInitials(emp);
                return (
                  <div key={emp.id} className="grid grid-cols-[70px_1fr_110px_90px_65px_80px_130px_75px_60px] gap-2 px-3 py-2.5 items-center border-b border-[#1e252e] last:border-0 hover:bg-[#1a2028] transition-colors group">
                    <span className="text-[10px] text-[#8899aa] font-medium truncate" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{emp.employeeCode}</span>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold ${avatar.bg} ${avatar.text}`}>{initials}</div>
                      <div className="min-w-0"><div className="text-[11px] font-semibold text-[#e2e8f0] truncate">{fullName}</div><div className="text-[9px] text-[#5a6878] truncate">{emp.email || emp.phone || '—'}</div></div>
                    </div>
                    <div className="hidden md:block min-w-0"><div className="text-[10px] text-[#e2e8f0] truncate">{emp.Designation?.name || '—'}</div><div className="text-[9px] text-[#5a6878] truncate">{emp.Department?.name || '—'}</div></div>
                    <span className="hidden lg:block text-[10px] text-[#8899aa] truncate">{emp.Branch?.name || '—'}</span>
                    <span className={`vc-badge ${emp.employmentType === 'permanent' ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-[#ffab40]/10 text-[#ffab40]'}`}>{emp.employmentType}</span>
                    <span className="hidden sm:block text-[9px] text-[#8899aa]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{formatDate(emp.dateOfJoining)}</span>
                    <div className="hidden xl:flex items-center gap-1 flex-wrap">
                      <span className="text-[9px] text-[#5a6878]">—</span>
                    </div>
                    <span className={`vc-badge ${st.bg} ${st.text}`} style={{ border: `1px solid ${st.border}` }}>{emp.employmentStatus}</span>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-6 h-6 rounded flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" onClick={() => openEdit(emp)}><Pencil size={12} /></button>
                      <button className="w-6 h-6 rounded flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" onClick={() => openDelete(emp.id)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#5a6878]">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="vc-btn-ghost disabled:opacity-30 disabled:cursor-not-allowed text-[10px] px-2.5">Prev</button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pn: number;
                  if (totalPages <= 5) pn = i + 1;
                  else if (page <= 3) pn = i + 1;
                  else if (page >= totalPages - 2) pn = totalPages - 4 + i;
                  else pn = page - 2 + i;
                  return (
                    <button key={pn} onClick={() => setPage(pn)} className={`w-7 h-7 rounded flex items-center justify-center text-[11px] font-semibold transition-colors ${page === pn ? 'bg-[#f5a623] text-black' : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#1e252e]'}`}>{pn}</button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="vc-btn-ghost disabled:opacity-30 disabled:cursor-not-allowed text-[10px] px-2.5">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl" aria-describedby="create-employee-description">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0] text-base">Add New Employee</DialogTitle>
            <p id="create-employee-description" className="text-[11px] text-[#5a6878] mt-1">Fill in the employee details below to add a new employee to the system.</p>
          </DialogHeader>
          {dialogContent()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('create')}>{submitting ? 'Creating...' : 'Add Employee'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl" aria-describedby="edit-employee-description">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0] text-base">Edit Employee</DialogTitle>
            <p id="edit-employee-description" className="text-[11px] text-[#5a6878] mt-1">Update the employee information below.</p>
          </DialogHeader>
          {dialogContent()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('edit')}>{submitting ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md" aria-describedby="delete-employee-description">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0] text-base">Delete Employee</DialogTitle>
          </DialogHeader>
          <div id="delete-employee-description" className="flex items-start gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-[#ff3d3d]/15 flex items-center justify-center shrink-0 mt-0.5"><AlertTriangle size={20} className="text-[#ff3d3d]" /></div>
            <div><p className="text-[13px] text-[#e2e8f0] mb-1">Are you sure you want to delete this employee?</p><p className="text-[11px] text-[#8899aa]">All associated records will be affected.</p></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#cc2020] font-semibold" disabled={submitting} onClick={handleDelete}>{submitting ? 'Deleting...' : 'Delete Employee'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
