'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  IndianRupee, TrendingUp, Users, Download, FileSpreadsheet,
  Plus, Eye, Loader2, AlertTriangle, CheckCircle2, Clock, Filter
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';
import SalaryComplianceBulkImport from './salary-compliance-bulk-import';

interface PayrollRun {
  id: number;
  name: string;
  month: number;
  year: number;
  status: string;
  totalEmployees: number;
  totalGross: number;
  totalNet: number;
  processedAt: string | null;
  createdAt: string;
  PayrollItem: PayrollItem[];
}

interface PayrollItem {
  id: number;
  employeeId: number;
  workingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  lopDays: number;
  otHours: number;
  basicSalary: number;
  hra: number;
  grossEarning: number;
  totalDeduction: number;
  netPay: number;
  status: string;
  payslipGenerated: boolean;
  Employee: {
    employeeCode: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    Department: { name: string } | null;
    Designation: { name: string } | null;
  };
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const YEARS = [2024, 2025, 2026, 2027];

const formatCurrency = (val: number) => '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2 });
const formatLakhs = (val: number) => {
  if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + 'Cr';
  if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + 'L';
  return formatCurrency(val);
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30',
    processing: 'bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30',
    draft: 'bg-[#ffab40]/15 text-[#ffab40] border border-[#ffab40]/30',
    failed: 'bg-[#ff3d3d]/15 text-[#ff3d3d] border border-[#ff3d3d]/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-[2px] rounded text-[9px] font-bold uppercase tracking-wider ${styles[status] || 'bg-[#5a6878]/15 text-[#5a6878]'}`}>
      {status === 'completed' && <CheckCircle2 size={10} />}
      {status === 'processing' && <Loader2 size={10} className="animate-spin" />}
      {status === 'draft' && <Clock size={10} />}
      {status}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string;
}) {
  return (
    <div className="vc-stat-card relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">{label}</div>
          <div className="text-[20px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</div>
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623]";
const selectCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623] appearance-none cursor-pointer";

export default function PayrollModule() {
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [generateOpen, setGenerateOpen] = useState(false);
  const [searchPayslipOpen, setSearchPayslipOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // New 2-step process states
  const [uploadCalculateOpen, setUploadCalculateOpen] = useState(false);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [calculating, setCalculating] = useState(false);
  const templateFileInputRef = useRef<HTMLInputElement>(null);

  // Restore previously uploaded template file after page refresh
  useEffect(() => {
    const saved = localStorage.getItem('payroll_nc_template');
    if (saved) {
      try {
        const { name, type, data } = JSON.parse(saved);
        const byteString = atob(data.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        setTemplateFile(new File([new Blob([ab], { type })], name, { type }));
      } catch {
        localStorage.removeItem('payroll_nc_template');
      }
    }
  }, []);

  const [generateForm, setGenerateForm] = useState({
    mode: 'bulk' as 'single' | 'bulk',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    employeeId: '',
  });

  const [payslipSearchForm, setPayslipSearchForm] = useState({
    mode: 'bulk' as 'single' | 'bulk',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    employeeId: '',
  });

  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [employees, setEmployees] = useState<Array<{ id: number; employeeCode: string; firstName: string; lastName: string }>>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState<number | ''>('');
  const [monthFilter, setMonthFilter] = useState<number | ''>('');

  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setGenerateOpen(true); }, [triggerCreate]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payroll');
      const json = await res.json();
      if (json.success) setPayrollRuns(json.data);
      else setError(json.error || 'Failed to load payroll');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch('/api/departments');
      const json = await res.json();
      if (json.success) setDepartments(json.data);
    } catch { /* silent */ }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      const json = await res.json();
      if (json.success) setEmployees(json.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { 
    fetchData(); 
    fetchDepartments();
    fetchEmployees();
  }, [fetchData, fetchDepartments, fetchEmployees]);

  const stats = useMemo(() => {
    if (!payrollRuns.length) return { totalRuns: 0, totalEmployees: 0, totalGross: 0, totalNet: 0 };
    const completed = payrollRuns.filter(r => r.status === 'completed');
    return {
      totalRuns: payrollRuns.length,
      totalEmployees: completed.reduce((s, r) => s + r.totalEmployees, 0),
      totalGross: completed.reduce((s, r) => s + Number(r.totalGross), 0),
      totalNet: completed.reduce((s, r) => s + Number(r.totalNet), 0),
    };
  }, [payrollRuns]);

  // Filtered payroll runs based on search & filters
  const filteredRuns = useMemo(() => {
    let list = payrollRuns;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(run => run.name.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') {
      list = list.filter(run => run.status === statusFilter);
    }
    if (yearFilter !== '') {
      list = list.filter(run => run.year === yearFilter);
    }
    if (monthFilter !== '') {
      list = list.filter(run => run.month === monthFilter);
    }
    return list;
  }, [payrollRuns, searchQuery, statusFilter, yearFilter, monthFilter]);

  // Get available months and years from payroll runs
  const availableMonthsYears = useMemo(() => {
    const uniquePeriods = new Set<string>();
    payrollRuns.forEach(run => {
      uniquePeriods.add(`${run.year}-${run.month}`);
    });
    
    const years = new Set<number>();
    const monthsByYear = new Map<number, Set<number>>();
    
    payrollRuns.forEach(run => {
      years.add(run.year);
      if (!monthsByYear.has(run.year)) {
        monthsByYear.set(run.year, new Set());
      }
      monthsByYear.get(run.year)!.add(run.month);
    });
    
    return {
      years: Array.from(years).sort((a, b) => b - a), // Descending order
      monthsByYear,
      hasData: uniquePeriods.size > 0
    };
  }, [payrollRuns]);

  // Get available months for selected year
  const availableMonths = useMemo(() => {
    const monthsForYear = availableMonthsYears.monthsByYear.get(payslipSearchForm.year);
    if (!monthsForYear) return [];
    return MONTHS.filter(m => monthsForYear.has(m.value));
  }, [availableMonthsYears, payslipSearchForm.year]);

  // Get employees with payslips for selected month/year
  const employeesWithPayslips = useMemo(() => {
    const run = payrollRuns.find(r => r.month === payslipSearchForm.month && r.year === payslipSearchForm.year);
    if (!run || !run.PayrollItem) return [];
    
    return run.PayrollItem.map(item => ({
      id: item.employeeId,
      employeeCode: item.Employee.employeeCode,
      firstName: item.Employee.firstName,
      lastName: item.Employee.lastName,
      payrollItemId: item.id
    }));
  }, [payrollRuns, payslipSearchForm.month, payslipSearchForm.year]);

  // Initialize payslip search form with first available year/month when dialog opens
  useEffect(() => {
    if (searchPayslipOpen && availableMonthsYears.hasData) {
      const firstYear = availableMonthsYears.years[0];
      const monthsForYear = availableMonthsYears.monthsByYear.get(firstYear);
      if (monthsForYear && monthsForYear.size > 0) {
        const firstMonth = Math.max(...Array.from(monthsForYear)); // Get latest month
        setPayslipSearchForm(f => ({
          ...f,
          year: firstYear,
          month: firstMonth
        }));
      }
    }
  }, [searchPayslipOpen, availableMonthsYears]);

  // Auto-adjust month when year changes if current month is not available
  useEffect(() => {
    const monthsForYear = availableMonthsYears.monthsByYear.get(payslipSearchForm.year);
    if (monthsForYear && !monthsForYear.has(payslipSearchForm.month)) {
      const firstAvailableMonth = Math.max(...Array.from(monthsForYear));
      setPayslipSearchForm(f => ({ ...f, month: firstAvailableMonth }));
    }
  }, [payslipSearchForm.year, availableMonthsYears]);

  const handleGenerate = async () => {
    setSubmitting(true);
    try {
      const body: any = {
        mode: generateForm.mode,
        month: generateForm.month,
        year: generateForm.year,
      };

      if (generateForm.mode === 'single') {
        if (!generateForm.employeeId) {
          toast.error('Please select an employee');
          setSubmitting(false);
          return;
        }
        body.employeeId = parseInt(generateForm.employeeId);
      }

      const res = await fetch('/api/payroll/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (json.success) {
        toast.success(
          <div>
            <div className="font-semibold">Payroll Generated!</div>
            <div className="text-xs mt-1">{json.data.itemsCreated} of {json.data.totalEmployees} employees processed</div>
          </div>
        );
        setGenerateOpen(false);
        fetchData();
      } else {
        toast.error(json.error || 'Failed to generate payroll');
      }
    } catch (error) {
      toast.error('Failed to generate payroll');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchAndDownloadPayslips = async () => {
    setSubmitting(true);
    try {
      const { mode, month, year, employeeId } = payslipSearchForm;

      if (mode === 'single' && !employeeId) {
        toast.error('Please select an employee');
        setSubmitting(false);
        return;
      }

      // Find payroll run for the selected month/year
      const run = payrollRuns.find(r => r.month === month && r.year === year);
      if (!run) {
        toast.error(`No payroll data found for ${MONTHS[month - 1].label} ${year}`);
        setSubmitting(false);
        return;
      }

      if (mode === 'bulk') {
        // Download all payslips as ZIP
        await handleDownloadBulkPayslips(run.id, month, year);
      } else {
        // Find specific payroll item for employee
        const employeeWithPayslip = employeesWithPayslips.find(e => e.id === parseInt(employeeId));
        if (!employeeWithPayslip) {
          toast.error('No payroll data found for selected employee');
          setSubmitting(false);
          return;
        }
        await handleDownloadPayslip(employeeWithPayslip.payrollItemId, employeeWithPayslip.employeeCode, month, year);
      }

      setSearchPayslipOpen(false);
    } catch (error) {
      toast.error('Failed to download payslips');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadBulkPayslips = async (runId: number, month: number, year: number) => {
    try {
      toast.info('Generating bulk payslips...');
      
      const res = await fetch('/api/payroll/generate-payslips-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payrollRunId: runId }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const monthName = MONTHS[month - 1].label;
        const timestamp = Date.now();
        a.download = `Payslips_${monthName}_${year}_${timestamp}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Bulk payslips downloaded successfully');
      } else {
        const json = await res.json();
        toast.error(json.error || 'Failed to generate bulk payslips');
      }
    } catch (error) {
      toast.error('Failed to download bulk payslips');
      console.error(error);
    }
  };

  const handleDownloadPayslip = async (itemId: number, employeeCode: string, month: number, year: number) => {
    try {
      toast.info('Generating payslip...');
      
      const res = await fetch('/api/payroll/generate-payslips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payrollItemId: itemId }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const monthName = MONTHS[month - 1].label.substring(0, 3).toUpperCase();
        const timestamp = Date.now();
        a.download = `Payslip_${employeeCode}_${monthName}_${year}_${timestamp}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Payslip downloaded successfully');
      } else {
        const json = await res.json();
        toast.error(json.error || 'Failed to generate payslip');
      }
    } catch (error) {
      toast.error('Failed to download payslip');
      console.error(error);
    }
  };

  const handleDownloadSalarySheet = async (runId: number, month: number, year: number) => {
    try {
      toast.info('Generating salary non-compliance sheet...');
      
      const res = await fetch('/api/payroll/salary-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payrollRunId: runId, month, year }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = Date.now();
        a.download = `Salary_NonCompliance_Sheet_${MONTHS[month - 1].label}_${year}_${timestamp}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Salary non-compliance sheet downloaded successfully');
      } else {
        toast.error('Failed to generate salary sheet');
      }
    } catch (error) {
      toast.error('Failed to download salary sheet');
      console.error(error);
    }
  };

  // New 2-step process handlers
  const handleDownloadTemplate = async () => {
    try {
      toast.info('Generating payroll template...');
      
      const params = new URLSearchParams({
        month: generateForm.month.toString(),
        year: generateForm.year.toString(),
      });

      if (generateForm.mode === 'single' && generateForm.employeeId) {
        params.append('employeeId', generateForm.employeeId);
      }

      const res = await fetch(`/api/payroll/generate-template?${params.toString()}`);

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Payroll_Template_${MONTHS[generateForm.month - 1].label}_${generateForm.year}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Template downloaded successfully! Fill in the highlighted columns and upload for calculation.');
        setGenerateOpen(false);
        // Open upload dialog after download
        setTimeout(() => setUploadCalculateOpen(true), 500);
      } else {
        const json = await res.json();
        toast.error(json.error || 'Failed to generate template');
      }
    } catch (error) {
      toast.error('Failed to download template');
      console.error(error);
    }
  };

  const handleTemplateFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTemplateFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        try {
          localStorage.setItem('payroll_nc_template', JSON.stringify({ name: file.name, type: file.type, data: reader.result }));
        } catch { /* storage full — ignore */ }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadAndCalculate = async () => {
    if (!templateFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setCalculating(true);
    try {
      toast.info('Calculating payroll from template...');
      
      const formData = new FormData();
      formData.append('file', templateFile);

      const res = await fetch('/api/payroll/calculate-from-template', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = Date.now();
        a.download = `Payroll_Calculated_${timestamp}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        const calculatedRows = res.headers.get('X-Calculated-Rows') || '0';
        const errCount = res.headers.get('X-Calculation-Errors');
        const errDetails: string[] = errCount
          ? JSON.parse(res.headers.get('X-Calculation-Error-Details') || '[]')
          : [];

        toast.success(
          <div>
            <div className="font-semibold">Calculation Complete!</div>
            <div className="text-xs mt-1">{calculatedRows} employees processed. Upload this file to "Non-Compliance Bulk Import" to save to database.</div>
            {errCount && (
              <div className="text-xs mt-2 text-yellow-400">
                <div className="font-semibold">⚠ {errCount} row(s) skipped (missing required fields):</div>
                {errDetails.slice(0, 3).map((e, i) => <div key={i}>• {e}</div>)}
                {errDetails.length > 3 && <div>... and {errDetails.length - 3} more</div>}
              </div>
            )}
          </div>,
          { duration: errCount ? 10000 : 6000 }
        );

        setUploadCalculateOpen(false);
        setTemplateFile(null);
        localStorage.removeItem('payroll_nc_template');
        if (templateFileInputRef.current) {
          templateFileInputRef.current.value = '';
        }
      } else {
        let errorMsg = 'Unknown error';
        let details: string[] = [];
        try {
          const json = await res.json();
          errorMsg = json.error || errorMsg;
          details = json.details || [];
        } catch {
          errorMsg = `Server error (HTTP ${res.status})`;
        }
        toast.error(
          <div>
            <div className="font-semibold">Calculation Failed</div>
            <div className="text-xs mt-1">{errorMsg}</div>
            {details.length > 0 && (
              <div className="text-xs mt-2 max-h-32 overflow-y-auto">
                {details.slice(0, 5).map((err: string, idx: number) => (
                  <div key={idx}>• {err}</div>
                ))}
                {details.length > 5 && <div>... and {details.length - 5} more errors</div>}
              </div>
            )}
          </div>,
          { duration: 8000 }
        );
      }
    } catch (error) {
      toast.error(`Failed to calculate payroll: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error(error);
    } finally {
      setCalculating(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertTriangle size={40} className="text-[#ff3d3d]" />
        <div className="text-sm text-[#e2e8f0] font-medium">{error}</div>
        <button className="vc-btn-primary mt-2" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="vc-stat-card"><Skeleton className="h-3 w-24 mb-2 bg-[#1e2630]" /><Skeleton className="h-6 w-32 bg-[#1e2630]" /></div>)}
        </div>
        <div className="vc-panel"><Skeleton className="h-64 w-full bg-[#1e2630]" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={IndianRupee} label="Total Runs" value={stats.totalRuns.toString()} color="#f5a623" />
        <StatCard icon={Users} label="Employees Processed" value={stats.totalEmployees.toString()} color="#00e676" />
        <StatCard icon={TrendingUp} label="Total Gross" value={formatLakhs(stats.totalGross)} color="#00d4ff" />
        <StatCard icon={TrendingUp} label="Total Net" value={formatLakhs(stats.totalNet)} color="#a78bfa" />
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header">
          <IndianRupee size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Payroll Runs</span>
          <span className="ml-auto text-[10px] text-[#5a6878]">{filteredRuns.length}{filteredRuns.length !== payrollRuns.length ? ` / ${payrollRuns.length}` : ''} runs</span>
          <SalaryComplianceBulkImport onImportComplete={fetchData} />
          <button className="vc-btn-secondary ml-2 flex items-center gap-1" onClick={() => setGenerateOpen(true)}>
            <Plus size={13} /> Generate Payroll Excel
          </button>
          <button className="vc-btn-secondary ml-2 flex items-center gap-1" onClick={() => setUploadCalculateOpen(true)}>
            <FileSpreadsheet size={13} /> Upload & Calculate
          </button>
          <button className="vc-btn-primary ml-2 flex items-center gap-1" onClick={() => setSearchPayslipOpen(true)}>
            <Download size={13} /> Search & Download Payslips
          </button>
        </div>
        
        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap gap-3 items-center px-4 py-3 border-b border-[#252e3a]">
          <div className="flex items-center gap-2 bg-[#141920] border border-[#2e3a48] rounded-lg px-3 py-[6px] flex-1 min-w-[200px] max-w-[320px]">
            <Filter size={13} className="text-[#5a6878] shrink-0" />
            <input
              type="text"
              placeholder="Search by run name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-[12px] text-[#e2e8f0] outline-none w-full placeholder:text-[#5a6878]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[#5a6878] hover:text-[#e2e8f0]">
                ✕
              </button>
            )}
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="vc-input appearance-none pr-7 min-w-[120px] text-[11px] cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="draft">Draft</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="relative">
            <select
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value ? parseInt(e.target.value) : '')}
              className="vc-input appearance-none pr-7 min-w-[100px] text-[11px] cursor-pointer"
            >
              <option value="">All Years</option>
              {YEARS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <select
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value ? parseInt(e.target.value) : '')}
              className="vc-input appearance-none pr-7 min-w-[120px] text-[11px] cursor-pointer"
            >
              <option value="">All Months</option>
              {MONTHS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          {(searchQuery || statusFilter !== 'all' || yearFilter !== '' || monthFilter !== '') && (
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); setYearFilter(''); setMonthFilter(''); }}
              className="text-[10px] text-[#f5a623] hover:text-[#e8891a] font-semibold uppercase tracking-wider"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-[#161c24] z-10">
              <tr className="border-b border-[#252e3a]">
                {['Run Name', 'Month/Year', 'Employees', 'Total Gross', 'Total Net', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRuns.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-[#5a6878] text-[11px]">{payrollRuns.length === 0 ? 'No payroll runs found. Click "Generate Payroll" to create one.' : 'No runs match your filters.'}</td></tr>
              ) : filteredRuns.map(run => (
                <tr key={run.id} className="border-b border-[#252e3a]/50 hover:bg-[#141920] transition-colors group">
                  <td className="py-[10px] px-3 font-semibold text-[#e2e8f0]">{run.name}</td>
                  <td className="py-[10px] px-3 text-[#8899aa]">{MONTHS[run.month - 1].label} {run.year}</td>
                  <td className="py-[10px] px-3 text-[#8899aa]">{run.totalEmployees}</td>
                  <td className="py-[10px] px-3 text-[#8899aa]">{formatCurrency(Number(run.totalGross))}</td>
                  <td className="py-[10px] px-3 font-semibold text-[#00e676]">{formatCurrency(Number(run.totalNet))}</td>
                  <td className="py-[10px] px-3"><StatusBadge status={run.status} /></td>
                  <td className="py-[10px] px-3">
                    <div className="flex items-center gap-2">
                      <button 
                        className="px-3 py-1.5 rounded-md flex items-center gap-1.5 text-[11px] font-medium bg-[#00d4ff]/10 text-[#00d4ff] hover:bg-[#00d4ff]/20 border border-[#00d4ff]/30 transition-colors"
                        onClick={() => { setSelectedRun(run); setViewOpen(true); }}
                        title="View Details"
                      >
                        <Eye size={14} />
                        View
                      </button>
                      <button 
                        className="px-3 py-1.5 rounded-md flex items-center gap-1.5 text-[11px] font-medium bg-[#f5a623]/10 text-[#f5a623] hover:bg-[#f5a623]/20 border border-[#f5a623]/30 transition-colors"
                        onClick={() => handleDownloadBulkPayslips(run.id, run.month, run.year)}
                        title="Download All Payslips (ZIP)"
                      >
                        <Download size={14} />
                        Payslips
                      </button>
                      <button 
                        className="px-3 py-1.5 rounded-md flex items-center gap-1.5 text-[11px] font-medium bg-[#00e676]/10 text-[#00e676] hover:bg-[#00e676]/20 border border-[#00e676]/30 transition-colors"
                        onClick={() => handleDownloadSalarySheet(run.id, run.month, run.year)}
                        title="Download Salary Sheet (Excel)"
                      >
                        <FileSpreadsheet size={14} />
                        Sheet
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Search & Download Payslips Dialog */}
      <Dialog open={searchPayslipOpen} onOpenChange={setSearchPayslipOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0] text-base">Search & Download Payslips</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-[#141920] border border-[#2e3a48] rounded-lg p-3">
              <div className="text-[10px] text-[#8899aa] mb-2">
                Search and download payslips by month/year. Choose bulk download for all employees or single download for a specific employee.
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Download Mode</label>
              <select 
                className={selectCls} 
                value={payslipSearchForm.mode} 
                onChange={e => setPayslipSearchForm(f => ({ ...f, mode: e.target.value as 'single' | 'bulk' }))}
              >
                <option value="bulk">Bulk (All Employees - ZIP)</option>
                <option value="single">Single Employee (PDF)</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Year</label>
                <select 
                  className={selectCls} 
                  value={payslipSearchForm.year} 
                  onChange={e => setPayslipSearchForm(f => ({ ...f, year: parseInt(e.target.value) }))}
                >
                  {availableMonthsYears.years.length > 0 ? (
                    availableMonthsYears.years.map(y => <option key={y} value={y}>{y}</option>)
                  ) : (
                    <option value={payslipSearchForm.year}>No data available</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Month</label>
                <select 
                  className={selectCls} 
                  value={payslipSearchForm.month} 
                  onChange={e => setPayslipSearchForm(f => ({ ...f, month: parseInt(e.target.value) }))}
                >
                  {availableMonths.length > 0 ? (
                    availableMonths.map(m => <option key={m.value} value={m.value}>{m.label}</option>)
                  ) : (
                    <option value={payslipSearchForm.month}>No data for {payslipSearchForm.year}</option>
                  )}
                </select>
              </div>
            </div>

            {payslipSearchForm.mode === 'single' && (
              <div>
                <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Employee</label>
                <select 
                  className={selectCls} 
                  value={payslipSearchForm.employeeId} 
                  onChange={e => setPayslipSearchForm(f => ({ ...f, employeeId: e.target.value }))}
                >
                  <option value="">Select employee</option>
                  {employeesWithPayslips.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.employeeCode} - {e.firstName} {e.lastName}
                    </option>
                  ))}
                </select>
                {employeesWithPayslips.length === 0 && (
                  <div className="text-[10px] text-[#ff3d3d] mt-1">
                    No payslips found for {MONTHS[payslipSearchForm.month - 1].label} {payslipSearchForm.year}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="ghost" 
              className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48]" 
              onClick={() => setSearchPayslipOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" 
              disabled={submitting} 
              onClick={handleSearchAndDownloadPayslips}
            >
              {submitting ? 'Downloading...' : payslipSearchForm.mode === 'bulk' ? 'Download ZIP' : 'Download PDF'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Payroll Dialog - Step 1A: Download Template */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0] text-base">Generate Payroll Excel - Step 1</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-[#141920] border border-[#2e3a48] rounded-lg p-3">
              <div className="text-[10px] text-[#8899aa] space-y-2">
                <p className="font-semibold text-[#e2e8f0]">2-Step Process:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Download template with auto-filled data</li>
                  <li>Fill in highlighted user input columns</li>
                  <li>Upload for calculation</li>
                  <li>Download final sheet</li>
                  <li>Import to database via "Non-Compliance Bulk Import"</li>
                </ol>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Mode</label>
              <select 
                className={selectCls} 
                value={generateForm.mode} 
                onChange={e => setGenerateForm(f => ({ ...f, mode: e.target.value as 'single' | 'bulk' }))}
              >
                <option value="bulk">Bulk (All Employees)</option>
                <option value="single">Single Employee</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Month</label>
                <select 
                  className={selectCls} 
                  value={generateForm.month} 
                  onChange={e => setGenerateForm(f => ({ ...f, month: parseInt(e.target.value) }))}
                >
                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Year</label>
                <select 
                  className={selectCls} 
                  value={generateForm.year} 
                  onChange={e => setGenerateForm(f => ({ ...f, year: parseInt(e.target.value) }))}
                >
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {generateForm.mode === 'single' && (
              <div>
                <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Employee</label>
                <select 
                  className={selectCls} 
                  value={generateForm.employeeId} 
                  onChange={e => setGenerateForm(f => ({ ...f, employeeId: e.target.value }))}
                >
                  <option value="">Select employee</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.employeeCode} - {e.firstName} {e.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="ghost" 
              className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48]" 
              onClick={() => setGenerateOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" 
              onClick={handleDownloadTemplate}
            >
              Download Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload & Calculate Dialog - Step 1B */}
      <Dialog open={uploadCalculateOpen} onOpenChange={setUploadCalculateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0] text-base">Upload & Calculate - Step 2</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-[#141920] border border-[#2e3a48] rounded-lg p-3">
              <div className="text-[10px] text-[#8899aa] space-y-2">
                <p className="font-semibold text-[#e2e8f0]">Instructions:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Upload the template you filled offline</li>
                  <li>System will validate and calculate all formulas</li>
                  <li>Download the final calculated sheet</li>
                  <li>Upload final sheet to "Non-Compliance Bulk Import"</li>
                </ul>
              </div>
            </div>

            {/* Upload Section */}
            <div className="border-2 border-dashed border-[#2e3a48] rounded-lg p-6 text-center">
              <input
                ref={templateFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleTemplateFileSelect}
                className="hidden"
                id="template-file-upload"
              />
              <label
                htmlFor="template-file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-[#f5a623]/10 flex items-center justify-center">
                  <FileSpreadsheet size={24} className="text-[#f5a623]" />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-[#e2e8f0] mb-1">
                    {templateFile ? templateFile.name : 'Click to upload filled template'}
                  </div>
                  <div className="text-[10px] text-[#5a6878]">
                    Excel file (.xlsx, .xls)
                  </div>
                </div>
              </label>
            </div>

            {calculating && (
              <div className="bg-[#141920] border border-[#2e3a48] rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#f5a623] border-t-transparent" />
                  <span className="text-[11px] text-[#e2e8f0]">Calculating payroll...</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="ghost" 
              className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48]" 
              onClick={() => {
                setUploadCalculateOpen(false);
                setTemplateFile(null);
                localStorage.removeItem('payroll_nc_template');
                if (templateFileInputRef.current) {
                  templateFileInputRef.current.value = '';
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" 
              disabled={!templateFile || calculating}
              onClick={handleUploadAndCalculate}
            >
              {calculating ? 'Calculating...' : 'Upload & Calculate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] w-[98vw] max-w-[98vw] sm:max-w-[98vw]">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0] text-base">{selectedRun?.name}</DialogTitle>
          </DialogHeader>
          {selectedRun && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-[#141920] border border-[#252e3a] rounded-md p-3">
                  <div className="text-[9px] text-[#5a6878] uppercase mb-1">Employees</div>
                  <div className="text-[16px] font-bold text-[#e2e8f0]">{selectedRun.totalEmployees}</div>
                </div>
                <div className="bg-[#141920] border border-[#252e3a] rounded-md p-3">
                  <div className="text-[9px] text-[#5a6878] uppercase mb-1">Total Gross</div>
                  <div className="text-[16px] font-bold text-[#e2e8f0]">{formatCurrency(Number(selectedRun.totalGross))}</div>
                </div>
                <div className="bg-[#141920] border border-[#252e3a] rounded-md p-3">
                  <div className="text-[9px] text-[#5a6878] uppercase mb-1">Total Net</div>
                  <div className="text-[16px] font-bold text-[#00e676]">{formatCurrency(Number(selectedRun.totalNet))}</div>
                </div>
                <div className="bg-[#141920] border border-[#252e3a] rounded-md p-3">
                  <div className="text-[9px] text-[#5a6878] uppercase mb-1">Status</div>
                  <div className="mt-1"><StatusBadge status={selectedRun.status} /></div>
                </div>
              </div>

              <div className="w-full max-h-[calc(100vh-280px)] overflow-y-auto">
                <table className="w-full text-[11px] min-w-full">
                  <thead className="sticky top-0 bg-[#161c24] z-10">
                    <tr className="border-b border-[#252e3a]">
                      <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Employee Code</th>
                      <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Name</th>
                      <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Department</th>
                      <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Days</th>
                      <th className="text-right py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Gross</th>
                      <th className="text-right py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Deductions</th>
                      <th className="text-right py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Net Pay</th>
                      <th className="text-center py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRun.PayrollItem.map(item => (
                      <tr key={item.id} className="border-b border-[#252e3a]/50 hover:bg-[#141920] transition-colors">
                        <td className="py-3 px-3">
                          <div className="text-[#8899aa] font-mono">{item.Employee.employeeCode}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-[#e2e8f0]">
                            {item.Employee.firstName} {item.Employee.lastName}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[#8899aa]">{item.Employee.Department?.name || 'N/A'}</td>
                        <td className="py-3 px-3 text-[#8899aa]">{item.presentDays}/{item.workingDays}</td>
                        <td className="py-3 px-3 text-[#8899aa] text-right font-mono">{formatCurrency(Number(item.grossEarning))}</td>
                        <td className="py-3 px-3 text-[#ff3d3d]/80 text-right font-mono">{formatCurrency(Number(item.totalDeduction))}</td>
                        <td className="py-3 px-3 font-semibold text-[#00e676] text-right font-mono">{formatCurrency(Number(item.netPay))}</td>
                        <td className="py-3 px-3 text-center">
                          <button 
                            className="px-2 py-1 rounded flex items-center gap-1 text-[10px] font-medium bg-[#f5a623]/10 text-[#f5a623] hover:bg-[#f5a623]/20 border border-[#f5a623]/30 transition-colors mx-auto"
                            onClick={() => handleDownloadPayslip(item.id, item.Employee.employeeCode, selectedRun.month, selectedRun.year)}
                            title="Retrieve Payslip"
                          >
                            <Download size={11} />
                            Payslip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
