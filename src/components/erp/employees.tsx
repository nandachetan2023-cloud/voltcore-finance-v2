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
import { FieldError, fieldBorderError } from '@/components/ui/field-error';
import { validateFields, isValid, type FieldErrors } from '@/lib/form-validation';

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
  // Identity
  empId: string;
  tokenNumber: string;
  workmenSlNo: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone: string;
  personalEmail: string;
  // Personal
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  bloodGroup: string;
  fatherName: string;
  // Address
  currentAddress: string;
  currentCity: string;
  currentState: string;
  currentPincode: string;
  permanentAddress: string;
  permanentCity: string;
  permanentState: string;
  permanentPincode: string;
  // Organisation
  departmentId: string;
  designationId: string;
  natureOfDesignation: string;
  branchId: string;
  gradeId: string;
  reportingManagerId: string;
  // Employment
  dateOfJoining: string;
  confirmationDate: string;
  employmentType: string;
  employmentStatus: string;
  probationMonths: string;
  noticePeriodDays: string;
  // Salary
  monthlyGrossSalary: string;
  // Statutory
  panNumber: string;
  aadharNumber: string;
  uanNumber: string;
  esicNumber: string;
  // Bank
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  // Emergency
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
}

const emptyForm: EmployeeFormData = {
  empId: '', tokenNumber: '', workmenSlNo: '', firstName: '', middleName: '', lastName: '',
  email: '', phone: '', alternatePhone: '', personalEmail: '',
  dateOfBirth: '', gender: 'male', maritalStatus: '', bloodGroup: '',
  fatherName: '',
  currentAddress: '', currentCity: '', currentState: '', currentPincode: '',
  permanentAddress: '', permanentCity: '', permanentState: '', permanentPincode: '',
  departmentId: '', designationId: '', natureOfDesignation: '', branchId: '', gradeId: '', reportingManagerId: '',
  dateOfJoining: '', confirmationDate: '',
  employmentType: 'permanent', employmentStatus: 'active',
  probationMonths: '6', noticePeriodDays: '30',
  monthlyGrossSalary: '',
  panNumber: '', aadharNumber: '', uanNumber: '', esicNumber: '',
  bankName: '', bankAccount: '', bankIfsc: '',
  emergencyContactName: '', emergencyContactRelation: '', emergencyContactPhone: '',
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formTab, setFormTab] = useState<'identity' | 'personal' | 'address' | 'org' | 'employment' | 'statutory' | 'bank' | 'emergency'>('identity');
  const { triggerCreate } = useERPStore();

  // Fetch designations for dropdown
  const [designations, setDesignations] = useState<Array<{ id: number; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [branches, setBranches] = useState<Array<{ id: number; name: string }>>([]);
  const [grades, setGrades] = useState<Array<{ id: number; name: string; code: string }>>([]);

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
    // Fetch branches and grades
    fetch('/api/branches').then(r => r.json()).then(d => { if (d.success) setBranches(d.data); });
    fetch('/api/grades').then(r => r.json()).then(d => { if (d.success) setGrades(d.data); });
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
    const existingCodes = employees.map(e => e.employeeCode).filter(code => /^EMP\d{4}$/.test(code));
    const numbers = existingCodes.map(code => parseInt(code.substring(3)));
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;
    const suggestedId = nextNumber <= 9999 ? `EMP${nextNumber.toString().padStart(4, '0')}` : '';
    setForm({ ...emptyForm, empId: suggestedId }); 
    setFormTab('identity');
    setFieldErrors({});
    setCreateOpen(true); 
  };
  const openEdit = (emp: any) => {
    setForm({
      empId: emp.employeeCode || '',
      tokenNumber: emp.tokenNumber || '',
      workmenSlNo: emp.workmenSlNo || '',
      firstName: emp.firstName || '',
      middleName: emp.middleName || '',
      lastName: emp.lastName || '',
      email: emp.email || '',
      phone: emp.phone || '',
      alternatePhone: emp.alternatePhone || '',
      personalEmail: emp.personalEmail || '',
      dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.split('T')[0] : '',
      gender: emp.gender || 'male',
      maritalStatus: emp.maritalStatus || '',
      bloodGroup: emp.bloodGroup || '',
      fatherName: emp.fatherName || '',
      currentAddress: emp.currentAddress || '',
      currentCity: emp.currentCity || '',
      currentState: emp.currentState || '',
      currentPincode: emp.currentPincode || '',
      permanentAddress: emp.permanentAddress || '',
      permanentCity: emp.permanentCity || '',
      permanentState: emp.permanentState || '',
      permanentPincode: emp.permanentPincode || '',
      departmentId: emp.departmentId?.toString() || emp.Department?.id?.toString() || '',
      designationId: emp.designationId?.toString() || emp.Designation?.id?.toString() || '',
      natureOfDesignation: emp.natureOfDesignation || '',
      branchId: emp.branchId?.toString() || emp.Branch?.id?.toString() || '',
      gradeId: emp.gradeId?.toString() || '',
      reportingManagerId: emp.reportingManagerId?.toString() || '',
      dateOfJoining: emp.dateOfJoining ? emp.dateOfJoining.split('T')[0] : '',
      confirmationDate: emp.confirmationDate ? emp.confirmationDate.split('T')[0] : '',
      employmentType: emp.employmentType || 'permanent',
      employmentStatus: emp.employmentStatus || 'active',
      probationMonths: emp.probationMonths?.toString() || '6',
      noticePeriodDays: emp.noticePeriodDays?.toString() || '30',
      monthlyGrossSalary: emp.monthlyGrossSalary?.toString() || '',
      panNumber: emp.panNumber || '',
      aadharNumber: emp.aadharNumber || '',
      uanNumber: emp.uanNumber || '',
      esicNumber: emp.esicNumber || '',
      bankName: emp.bankName || '',
      bankAccount: emp.bankAccount || '',
      bankIfsc: emp.bankIfsc || '',
      emergencyContactName: emp.emergencyContactName || '',
      emergencyContactRelation: emp.emergencyContactRelation || '',
      emergencyContactPhone: emp.emergencyContactPhone || '',
    });
    setSelectedId(emp.id.toString());
    setFormTab('identity');
    setFieldErrors({});
    setEditOpen(true);
  };
  const openDelete = (id: number) => { setSelectedId(id.toString()); setDeleteOpen(true); };

  const handleSubmit = async (mode: 'create' | 'edit') => {
    setSubmitting(true);
    try {
      const errors = validateFields([
        { field: 'empId', value: form.empId, label: 'Employee ID' },
        { field: 'firstName', value: form.firstName, label: 'First Name' },
        { field: 'lastName', value: form.lastName, label: 'Last Name' },
        { field: 'email', value: form.email, label: 'Email' },
        { field: 'phone', value: form.phone, label: 'Phone' },
        { field: 'dateOfBirth', value: form.dateOfBirth, label: 'Date of Birth' },
        { field: 'currentAddress', value: form.currentAddress, label: 'Current Address' },
        { field: 'currentCity', value: form.currentCity, label: 'Current City' },
        { field: 'currentState', value: form.currentState, label: 'Current State' },
        { field: 'currentPincode', value: form.currentPincode, label: 'Current Pincode' },
        { field: 'departmentId', value: form.departmentId, label: 'Department' },
        { field: 'designationId', value: form.designationId, label: 'Designation' },
        { field: 'branchId', value: form.branchId, label: 'Branch' },
        { field: 'dateOfJoining', value: form.dateOfJoining, label: 'Date of Joining' },
      ]);
      setFieldErrors(errors);
      if (!isValid(errors)) {
        setSubmitting(false);
        return;
      }

      let employeeCode = form.empId.trim().toUpperCase();
      // Only auto-format and validate code format when creating new employees
      if (mode === 'create') {
        if (/^\d{1,8}$/.test(employeeCode)) employeeCode = `UA${employeeCode.padStart(8, '0')}`;
        if (!/^UA\d{8}$/.test(employeeCode)) {
          toast.error('Employee ID must be in format UA00000001 to UA99999999');
          setSubmitting(false);
          return;
        }
      }

      const apiBody: any = {
        employeeCode,
        tokenNumber: form.tokenNumber.trim() || null,
        workmenSlNo: form.workmenSlNo.trim() || null,
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim() || null,
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        alternatePhone: form.alternatePhone.trim() || null,
        personalEmail: form.personalEmail.trim() || null,
        dateOfBirth: new Date(form.dateOfBirth).toISOString(),
        gender: form.gender,
        maritalStatus: form.maritalStatus || null,
        bloodGroup: form.bloodGroup || null,
        fatherName: form.fatherName.trim() || null,
        currentAddress: form.currentAddress.trim(),
        currentCity: form.currentCity.trim(),
        currentState: form.currentState.trim(),
        currentPincode: form.currentPincode.trim(),
        permanentAddress: form.permanentAddress.trim() || null,
        permanentCity: form.permanentCity.trim() || null,
        permanentState: form.permanentState.trim() || null,
        permanentPincode: form.permanentPincode.trim() || null,
        departmentId: parseInt(form.departmentId),
        designationId: parseInt(form.designationId),
        natureOfDesignation: form.natureOfDesignation.trim() || null,
        branchId: parseInt(form.branchId),
        gradeId: form.gradeId ? parseInt(form.gradeId) : null,
        reportingManagerId: form.reportingManagerId ? parseInt(form.reportingManagerId) : null,
        dateOfJoining: new Date(form.dateOfJoining).toISOString(),
        confirmationDate: form.confirmationDate ? new Date(form.confirmationDate).toISOString() : null,
        employmentType: form.employmentType,
        employmentStatus: form.employmentStatus,
        probationMonths: parseInt(form.probationMonths) || 6,
        noticePeriodDays: parseInt(form.noticePeriodDays) || 30,
        monthlyGrossSalary: form.monthlyGrossSalary ? parseFloat(form.monthlyGrossSalary) : null,
        panNumber: form.panNumber.trim() || null,
        aadharNumber: form.aadharNumber.trim() || null,
        uanNumber: form.uanNumber.trim() || null,
        esicNumber: form.esicNumber.trim() || null,
        bankName: form.bankName.trim() || null,
        bankAccount: form.bankAccount.trim() || null,
        bankIfsc: form.bankIfsc.trim() || null,
        emergencyContactName: form.emergencyContactName.trim() || null,
        emergencyContactRelation: form.emergencyContactRelation.trim() || null,
        emergencyContactPhone: form.emergencyContactPhone.trim() || null,
      };

      const body = mode === 'edit' ? { id: parseInt(selectedId || '0'), ...apiBody } : apiBody;
      const res = await fetch('/api/employees', { method: mode === 'create' ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();

      if (json.success) {
        toast.success(<div><div className="font-semibold">{mode === 'create' ? 'Employee Created!' : 'Employee Updated!'}</div><div className="text-xs mt-1">{employeeCode} - {form.firstName} {form.lastName}</div></div>, { duration: 3000 });
        if (mode === 'create') setCreateOpen(false); else setEditOpen(false);
        setForm(emptyForm);
        await fetchData();
      } else {
        toast.error(<div><div className="font-semibold mb-1">Failed to {mode} employee</div><div className="text-xs">{json.error || 'Unknown error'}</div></div>, { duration: 5000 });
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
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

  const inp = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]/60 transition-colors placeholder:text-[#5a6878]';
  const sel = inp + ' appearance-none cursor-pointer';
  const lbl = 'block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5';
  const F = ({ label, children, req, span2 }: { label: string; children: React.ReactNode; req?: boolean; span2?: boolean }) => (
    <div className={span2 ? 'col-span-2' : ''}>
      <label className={lbl}>{label}{req && <span className="text-[#ff3d3d] ml-0.5">*</span>}</label>
      {children}
    </div>
  );

  const FORM_TABS = [
    { id: 'identity', label: 'Identity' },
    { id: 'personal', label: 'Personal' },
    { id: 'address', label: 'Address' },
    { id: 'org', label: 'Organisation' },
    { id: 'employment', label: 'Employment' },
    { id: 'statutory', label: 'Statutory' },
    { id: 'bank', label: 'Bank' },
    { id: 'emergency', label: 'Emergency' },
  ] as const;

  const dialogContent = () => (
    <div className="space-y-3">
      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap border-b border-[#252e3a] pb-2">
        {FORM_TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setFormTab(t.id)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${formTab === t.id ? 'bg-[#f5a623] text-black' : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#141920]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1">
        {/* ── Identity ── */}
        {formTab === 'identity' && <>
          <F label="Employee ID" req><input className={`${inp} ${fieldBorderError(fieldErrors.empId)}`} value={form.empId} onChange={e => { setForm(f => ({ ...f, empId: e.target.value.toUpperCase() })); setFieldErrors(fe => ({ ...fe, empId: '' })); }} placeholder="UA00000001" maxLength={10} /><FieldError message={fieldErrors.empId} /></F>
          <F label="Token Number"><input className={inp} value={form.tokenNumber} onChange={e => setForm(f => ({ ...f, tokenNumber: e.target.value.toUpperCase() }))} placeholder="TKN001" /></F>
          <F label="Workmen Sl. No."><input className={inp} value={form.workmenSlNo} onChange={e => setForm(f => ({ ...f, workmenSlNo: e.target.value.toUpperCase() }))} placeholder="WM001" /></F>
          <F label="First Name" req><input className={`${inp} ${fieldBorderError(fieldErrors.firstName)}`} value={form.firstName} onChange={e => { setForm(f => ({ ...f, firstName: e.target.value })); setFieldErrors(fe => ({ ...fe, firstName: '' })); }} placeholder="Rajesh" /><FieldError message={fieldErrors.firstName} /></F>
          <F label="Middle Name"><input className={inp} value={form.middleName} onChange={e => setForm(f => ({ ...f, middleName: e.target.value }))} placeholder="Kumar" /></F>
          <F label="Last Name" req><input className={`${inp} ${fieldBorderError(fieldErrors.lastName)}`} value={form.lastName} onChange={e => { setForm(f => ({ ...f, lastName: e.target.value })); setFieldErrors(fe => ({ ...fe, lastName: '' })); }} placeholder="Sharma" /><FieldError message={fieldErrors.lastName} /></F>
          <F label="Work Email" req><input className={`${inp} ${fieldBorderError(fieldErrors.email)}`} type="email" value={form.email} onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setFieldErrors(fe => ({ ...fe, email: '' })); }} placeholder="rajesh@company.com" /><FieldError message={fieldErrors.email} /></F>
          <F label="Personal Email"><input className={inp} type="email" value={form.personalEmail} onChange={e => setForm(f => ({ ...f, personalEmail: e.target.value }))} placeholder="rajesh@gmail.com" /></F>
          <F label="Phone" req><input className={`${inp} ${fieldBorderError(fieldErrors.phone)}`} value={form.phone} onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setFieldErrors(fe => ({ ...fe, phone: '' })); }} placeholder="+91 98765 43210" /><FieldError message={fieldErrors.phone} /></F>
          <F label="Alternate Phone"><input className={inp} value={form.alternatePhone} onChange={e => setForm(f => ({ ...f, alternatePhone: e.target.value }))} placeholder="+91 98765 43211" /></F>
        </>}

        {/* ── Personal ── */}
        {formTab === 'personal' && <>
          <F label="Date of Birth" req><input className={`${inp} ${fieldBorderError(fieldErrors.dateOfBirth)}`} type="date" value={form.dateOfBirth} onChange={e => { setForm(f => ({ ...f, dateOfBirth: e.target.value })); setFieldErrors(fe => ({ ...fe, dateOfBirth: '' })); }} /><FieldError message={fieldErrors.dateOfBirth} /></F>
          <F label="Gender" req>
            <select className={`${sel} ${fieldBorderError(fieldErrors.gender)}`} value={form.gender} onChange={e => { setForm(f => ({ ...f, gender: e.target.value })); setFieldErrors(fe => ({ ...fe, gender: '' })); }}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </F>
          <F label="Marital Status">
            <select className={sel} value={form.maritalStatus} onChange={e => setForm(f => ({ ...f, maritalStatus: e.target.value }))}>
              <option value="">Select...</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </select>
          </F>
          <F label="Blood Group">
            <select className={sel} value={form.bloodGroup} onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))}>
              <option value="">Select...</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </F>
          <F label="Father's Name" span2><input className={inp} value={form.fatherName} onChange={e => setForm(f => ({ ...f, fatherName: e.target.value }))} placeholder="Father's full name" /></F>
        </>}

        {/* ── Address ── */}
        {formTab === 'address' && <>
          <F label="Current Address" req span2><input className={`${inp} ${fieldBorderError(fieldErrors.currentAddress)}`} value={form.currentAddress} onChange={e => { setForm(f => ({ ...f, currentAddress: e.target.value })); setFieldErrors(fe => ({ ...fe, currentAddress: '' })); }} placeholder="House No, Street, Area" /><FieldError message={fieldErrors.currentAddress} /></F>
          <F label="Current City" req><input className={`${inp} ${fieldBorderError(fieldErrors.currentCity)}`} value={form.currentCity} onChange={e => { setForm(f => ({ ...f, currentCity: e.target.value })); setFieldErrors(fe => ({ ...fe, currentCity: '' })); }} placeholder="Mumbai" /><FieldError message={fieldErrors.currentCity} /></F>
          <F label="Current State" req><input className={`${inp} ${fieldBorderError(fieldErrors.currentState)}`} value={form.currentState} onChange={e => { setForm(f => ({ ...f, currentState: e.target.value })); setFieldErrors(fe => ({ ...fe, currentState: '' })); }} placeholder="Maharashtra" /><FieldError message={fieldErrors.currentState} /></F>
          <F label="Current Pincode" req><input className={`${inp} ${fieldBorderError(fieldErrors.currentPincode)}`} value={form.currentPincode} onChange={e => { setForm(f => ({ ...f, currentPincode: e.target.value })); setFieldErrors(fe => ({ ...fe, currentPincode: '' })); }} placeholder="400001" maxLength={6} /><FieldError message={fieldErrors.currentPincode} /></F>
          <div className="col-span-2 border-t border-[#252e3a] pt-2 mt-1">
            <p className="text-[10px] text-[#5a6878] mb-2">Permanent Address (if different)</p>
          </div>
          <F label="Permanent Address" span2><input className={inp} value={form.permanentAddress} onChange={e => setForm(f => ({ ...f, permanentAddress: e.target.value }))} placeholder="House No, Street, Area" /></F>
          <F label="Permanent City"><input className={inp} value={form.permanentCity} onChange={e => setForm(f => ({ ...f, permanentCity: e.target.value }))} placeholder="Delhi" /></F>
          <F label="Permanent State"><input className={inp} value={form.permanentState} onChange={e => setForm(f => ({ ...f, permanentState: e.target.value }))} placeholder="Delhi" /></F>
          <F label="Permanent Pincode"><input className={inp} value={form.permanentPincode} onChange={e => setForm(f => ({ ...f, permanentPincode: e.target.value }))} placeholder="110001" maxLength={6} /></F>
        </>}

        {/* ── Organisation ── */}
        {formTab === 'org' && <>
          <F label="Department" req>
            <select className={`${sel} ${fieldBorderError(fieldErrors.departmentId)}`} value={form.departmentId} onChange={e => { setForm(f => ({ ...f, departmentId: e.target.value })); setFieldErrors(fe => ({ ...fe, departmentId: '' })); }}>
              <option value="">Select department...</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <FieldError message={fieldErrors.departmentId} />
          </F>
          <F label="Designation" req>
            <select className={`${sel} ${fieldBorderError(fieldErrors.designationId)}`} value={form.designationId} onChange={e => { setForm(f => ({ ...f, designationId: e.target.value })); setFieldErrors(fe => ({ ...fe, designationId: '' })); }}>
              <option value="">Select designation...</option>
              {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <FieldError message={fieldErrors.designationId} />
          </F>
          <F label="Branch / Site" req>
            <select className={`${sel} ${fieldBorderError(fieldErrors.branchId)}`} value={form.branchId} onChange={e => { setForm(f => ({ ...f, branchId: e.target.value })); setFieldErrors(fe => ({ ...fe, branchId: '' })); }}>
              <option value="">Select site...</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <FieldError message={fieldErrors.branchId} />
          </F>
          <F label="Grade">
            <select className={sel} value={form.gradeId} onChange={e => setForm(f => ({ ...f, gradeId: e.target.value }))}>
              <option value="">Select grade...</option>
              {grades.map(g => <option key={g.id} value={g.id}>{g.name} ({g.code})</option>)}
            </select>
          </F>
          <F label="Reporting Manager" span2>
            <select className={sel} value={form.reportingManagerId} onChange={e => setForm(f => ({ ...f, reportingManagerId: e.target.value }))}>
              <option value="">None</option>
              {employees.filter(e => e.id.toString() !== selectedId).map(e => (
                <option key={e.id} value={e.id}>{e.employeeCode} — {getFullName(e)}</option>
              ))}
            </select>
          </F>
        </>}

        {/* ── Employment ── */}
        {formTab === 'employment' && <>
          <F label="Date of Joining" req><input className={`${inp} ${fieldBorderError(fieldErrors.dateOfJoining)}`} type="date" value={form.dateOfJoining} onChange={e => { setForm(f => ({ ...f, dateOfJoining: e.target.value })); setFieldErrors(fe => ({ ...fe, dateOfJoining: '' })); }} /><FieldError message={fieldErrors.dateOfJoining} /></F>
          <F label="Confirmation Date"><input className={inp} type="date" value={form.confirmationDate} onChange={e => setForm(f => ({ ...f, confirmationDate: e.target.value }))} /></F>
          <F label="Employment Type" req>
            <select className={sel} value={form.employmentType} onChange={e => setForm(f => ({ ...f, employmentType: e.target.value }))}>
              <option value="permanent">Permanent</option>
              <option value="contract">Contract</option>
              <option value="probation">Probation</option>
              <option value="intern">Intern</option>
              <option value="part_time">Part Time</option>
            </select>
          </F>
          <F label="Employment Status" req>
            <select className={sel} value={form.employmentStatus} onChange={e => setForm(f => ({ ...f, employmentStatus: e.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="notice_period">Notice Period</option>
              <option value="separated">Separated</option>
            </select>
          </F>
          <F label="Nature of Designation">
            <select className={sel} value={form.natureOfDesignation} onChange={e => setForm(f => ({ ...f, natureOfDesignation: e.target.value }))}>
              <option value="">Select...</option>
              <option value="Skilled">Skilled</option>
              <option value="Semi-skilled">Semi-skilled</option>
              <option value="Unskilled">Unskilled</option>
              <option value="Highly Skilled">Highly Skilled</option>
            </select>
          </F>
          <F label="Monthly Gross Salary"><input className={inp} type="number" min="0" step="0.01" value={form.monthlyGrossSalary} onChange={e => setForm(f => ({ ...f, monthlyGrossSalary: e.target.value }))} placeholder="15000.00" /></F>
          <F label="Probation Months"><input className={inp} type="number" min="0" value={form.probationMonths} onChange={e => setForm(f => ({ ...f, probationMonths: e.target.value }))} /></F>
          <F label="Notice Period Days"><input className={inp} type="number" min="0" value={form.noticePeriodDays} onChange={e => setForm(f => ({ ...f, noticePeriodDays: e.target.value }))} /></F>
        </>}

        {/* ── Statutory ── */}
        {formTab === 'statutory' && <>
          <F label="PAN Number"><input className={inp} value={form.panNumber} onChange={e => setForm(f => ({ ...f, panNumber: e.target.value.toUpperCase() }))} placeholder="ABCDE1234F" maxLength={10} /></F>
          <F label="Aadhar Number"><input className={inp} value={form.aadharNumber} onChange={e => setForm(f => ({ ...f, aadharNumber: e.target.value }))} placeholder="1234 5678 9012" maxLength={14} /></F>
          <F label="UAN Number"><input className={inp} value={form.uanNumber} onChange={e => setForm(f => ({ ...f, uanNumber: e.target.value }))} placeholder="100123456789" maxLength={12} /></F>
          <F label="ESIC IP Number"><input className={inp} value={form.esicNumber} onChange={e => setForm(f => ({ ...f, esicNumber: e.target.value }))} placeholder="1234567890" /></F>
        </>}

        {/* ── Bank ── */}
        {formTab === 'bank' && <>
          <F label="Bank Name" span2><input className={inp} value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} placeholder="State Bank of India" /></F>
          <F label="Account Number"><input className={inp} value={form.bankAccount} onChange={e => setForm(f => ({ ...f, bankAccount: e.target.value }))} placeholder="1234567890123" /></F>
          <F label="IFSC Code"><input className={inp} value={form.bankIfsc} onChange={e => setForm(f => ({ ...f, bankIfsc: e.target.value.toUpperCase() }))} placeholder="SBIN0001234" maxLength={11} /></F>
        </>}

        {/* ── Emergency ── */}
        {formTab === 'emergency' && <>
          <F label="Contact Name" span2><input className={inp} value={form.emergencyContactName} onChange={e => setForm(f => ({ ...f, emergencyContactName: e.target.value }))} placeholder="Spouse / Parent name" /></F>
          <F label="Relation"><input className={inp} value={form.emergencyContactRelation} onChange={e => setForm(f => ({ ...f, emergencyContactRelation: e.target.value }))} placeholder="Spouse / Father / Mother" /></F>
          <F label="Phone"><input className={inp} value={form.emergencyContactPhone} onChange={e => setForm(f => ({ ...f, emergencyContactPhone: e.target.value }))} placeholder="+91 98765 43210" /></F>
        </>}
      </div>

      {/* Tab navigation */}
      <div className="flex justify-between pt-1 border-t border-[#252e3a]">
        <button type="button" onClick={() => {
          const idx = FORM_TABS.findIndex(t => t.id === formTab);
          if (idx > 0) setFormTab(FORM_TABS[idx - 1].id);
        }} disabled={formTab === 'identity'} className="text-[11px] text-[#8899aa] hover:text-[#e2e8f0] disabled:opacity-30 px-3 py-1.5 border border-[#252e3a] rounded-lg hover:border-[#f5a623] transition-colors">
          ← Previous
        </button>
        <span className="text-[10px] text-[#5a6878] self-center">
          {FORM_TABS.findIndex(t => t.id === formTab) + 1} / {FORM_TABS.length}
        </span>
        <button type="button" onClick={() => {
          const idx = FORM_TABS.findIndex(t => t.id === formTab);
          if (idx < FORM_TABS.length - 1) setFormTab(FORM_TABS[idx + 1].id);
        }} disabled={formTab === 'emergency'} className="text-[11px] text-[#8899aa] hover:text-[#e2e8f0] disabled:opacity-30 px-3 py-1.5 border border-[#252e3a] rounded-lg hover:border-[#f5a623] transition-colors">
          Next →
        </button>
      </div>
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
            <div className="overflow-x-auto">
              <div className="max-h-[480px] overflow-y-auto min-w-[900px]">
                <div className="grid grid-cols-[70px_1fr_110px_90px_90px_80px_130px_75px_60px] gap-2 px-3 py-2.5 text-[9px] font-bold uppercase tracking-wider text-[#5a6878] bg-[#141920] border-b border-[#252e3a] sticky top-0 z-10">
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
                  <div key={emp.id} className="grid grid-cols-[70px_1fr_110px_90px_90px_80px_130px_75px_60px] gap-2 px-3 py-2.5 items-center border-b border-[#1e252e] last:border-0 hover:bg-[#1a2028] transition-colors group">
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
            <p id="create-employee-description" className="text-[11px] text-[#5a6878] mt-1">Fill in all employee details across the tabs below.</p>
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
