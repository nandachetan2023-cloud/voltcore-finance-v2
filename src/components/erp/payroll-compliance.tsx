'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  IndianRupee, TrendingUp, Users, Download, FileSpreadsheet,
  Plus, Eye, Loader2, AlertTriangle, CheckCircle2, Clock, Shield, Send, Trash2
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

export default function PayrollCompliance() {
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [searchPayslipOpen, setSearchPayslipOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmRun, setDeleteConfirmRun] = useState<PayrollRun | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [payslipSearchForm, setPayslipSearchForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payroll?payrollType=compliance');
      const json = await res.json();
      if (json.success) setPayrollRuns(json.data);
      else setError(json.error || 'Failed to load payroll');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const handleDownloadComplianceSheet = async (runId: number, month: number, year: number) => {
    try {
      toast.info('Generating compliance salary sheet...');
      
      const res = await fetch('/api/payroll/salary-sheet-compliance', {
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
        a.download = `Salary_Compliance_Sheet_${MONTHS[month - 1].label}_${year}_${timestamp}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Compliance salary sheet downloaded successfully');
      } else {
        toast.error('Failed to generate compliance sheet');
      }
    } catch (error) {
      toast.error('Failed to download compliance sheet');
      console.error(error);
    }
  };

  const handleSearchAndDownloadSheet = async () => {
    setSubmitting(true);
    try {
      const { month, year } = payslipSearchForm;

      // Find payroll run for the selected month/year
      const run = payrollRuns.find(r => r.month === month && r.year === year);
      if (!run) {
        toast.error(`No compliance payroll data found for ${MONTHS[month - 1].label} ${year}`);
        setSubmitting(false);
        return;
      }

      await handleDownloadComplianceSheet(run.id, month, year);
      setSearchPayslipOpen(false);
    } catch (error) {
      toast.error('Failed to download compliance sheet');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRun = async () => {
    if (!deleteConfirmRun) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/payroll', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteConfirmRun.id }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`Payroll run "${deleteConfirmRun.name}" deleted successfully.`);
        setDeleteConfirmRun(null);
        fetchData();
      } else {
        toast.error(json.error || 'Failed to delete payroll run');
      }
    } catch {
      toast.error('Failed to delete payroll run');
    } finally {
      setDeleting(false);
    }
  };

  // Get available months and years from payroll runs
  const availableMonthsYears = useMemo(() => {
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
      years: Array.from(years).sort((a, b) => b - a),
      monthsByYear,
      hasData: years.size > 0
    };
  }, [payrollRuns]);

  // Get available months for selected year
  const availableMonths = useMemo(() => {
    const monthsForYear = availableMonthsYears.monthsByYear.get(payslipSearchForm.year);
    if (!monthsForYear) return [];
    return MONTHS.filter(m => monthsForYear.has(m.value));
  }, [availableMonthsYears, payslipSearchForm.year]);

  // Initialize search form with first available year/month when dialog opens
  useEffect(() => {
    if (searchPayslipOpen && availableMonthsYears.hasData) {
      const firstYear = availableMonthsYears.years[0];
      const monthsForYear = availableMonthsYears.monthsByYear.get(firstYear);
      if (monthsForYear && monthsForYear.size > 0) {
        const firstMonth = Math.max(...Array.from(monthsForYear));
        setPayslipSearchForm({ year: firstYear, month: firstMonth });
      }
    }
  }, [searchPayslipOpen, availableMonthsYears]);

  // Auto-adjust month when year changes
  useEffect(() => {
    const monthsForYear = availableMonthsYears.monthsByYear.get(payslipSearchForm.year);
    if (monthsForYear && !monthsForYear.has(payslipSearchForm.month)) {
      const firstAvailableMonth = Math.max(...Array.from(monthsForYear));
      setPayslipSearchForm(f => ({ ...f, month: firstAvailableMonth }));
    }
  }, [payslipSearchForm.year, availableMonthsYears]);

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
      {/* Info Banner */}
      <div className="bg-[#00e676]/10 border border-[#00e676]/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield size={20} className="text-[#00e676] shrink-0 mt-0.5" />
          <div>
            <div className="text-[13px] font-semibold text-[#00e676] mb-1">
              Compliance Payroll View
            </div>
            <div className="text-[11px] text-[#8899aa] leading-relaxed">
              This view shows payroll runs with compliance-focused actions. Download simplified 32-column compliance sheets 
              suitable for government submissions, EPF/ESIC returns, and statutory reporting.
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Shield} label="Total Runs" value={stats.totalRuns.toString()} color="#00e676" />
        <StatCard icon={Users} label="Employees Processed" value={stats.totalEmployees.toString()} color="#00d4ff" />
        <StatCard icon={TrendingUp} label="Total Gross" value={formatLakhs(stats.totalGross)} color="#f5a623" />
        <StatCard icon={TrendingUp} label="Total Net" value={formatLakhs(stats.totalNet)} color="#a78bfa" />
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header">
          <Shield size={15} className="text-[#00e676]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Compliance Payroll Runs</span>
          <span className="ml-auto text-[10px] text-[#5a6878]">{payrollRuns.length} runs</span>
          <SalaryComplianceBulkImport onImportComplete={fetchData} />
          <button className="vc-btn-primary ml-2 flex items-center gap-1" onClick={() => setSearchPayslipOpen(true)}>
            <Download size={13} /> Search & Download Sheet
          </button>
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
              {payrollRuns.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-[#5a6878] text-[11px]">No payroll runs found.</td></tr>
              ) : payrollRuns.map(run => (
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
                        className="px-3 py-1.5 rounded-md flex items-center gap-1.5 text-[11px] font-medium bg-[#a78bfa]/10 text-[#a78bfa] hover:bg-[#a78bfa]/20 border border-[#a78bfa]/30 transition-colors"
                        onClick={async () => {
                          if (!confirm(`Dispatch payslips for "${run.name}" to all employees? They will be able to view their payslips in the employee portal.`)) return;
                          try {
                            const res = await fetch('/api/payroll/dispatch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payrollRunId: run.id }) });
                            const data = await res.json();
                            if (data.success) {
                              if (data.data.alreadyDispatched > 0 && data.data.dispatched === 0) toast.info(`All ${data.data.total} payslips already dispatched`);
                              else toast.success(`✅ Dispatched ${data.data.dispatched} payslip${data.data.dispatched !== 1 ? 's' : ''} to employees${data.data.alreadyDispatched > 0 ? ` (${data.data.alreadyDispatched} already sent)` : ''}`);
                              fetchData();
                            } else {
                              toast.error(data.error || 'Dispatch failed');
                            }
                          } catch (err) {
                            toast.error('Network error — failed to dispatch payslips');
                            console.error('Dispatch error:', err);
                          }
                        }}
                        title="Dispatch payslips to employee dashboards"
                      >
                        <Send size={14} />
                        Dispatch
                      </button>
                      <button 
                        className="px-3 py-1.5 rounded-md flex items-center gap-1.5 text-[11px] font-medium bg-[#00e676]/10 text-[#00e676] hover:bg-[#00e676]/20 border border-[#00e676]/30 transition-colors"
                        onClick={() => handleDownloadComplianceSheet(run.id, run.month, run.year)}
                        title="Download Compliance Sheet (32 columns)"
                      >
                        <FileSpreadsheet size={14} />
                        Compliance Sheet
                      </button>
                      <button
                        className="px-3 py-1.5 rounded-md flex items-center gap-1.5 text-[11px] font-medium bg-[#ff3d3d]/10 text-[#ff3d3d] hover:bg-[#ff3d3d]/20 border border-[#ff3d3d]/30 transition-colors"
                        onClick={() => setDeleteConfirmRun(run)}
                        title="Delete Payroll Run"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Search & Download Sheet Dialog */}
      <Dialog open={searchPayslipOpen} onOpenChange={setSearchPayslipOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0] text-base">Search & Download Compliance Sheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-[#141920] border border-[#2e3a48] rounded-lg p-3">
              <div className="text-[10px] text-[#8899aa] mb-2">
                Search and download compliance salary sheets by month/year. The sheet will be in FORM XVII/XIII format.
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Year</label>
                <select 
                  className="w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623] appearance-none cursor-pointer"
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
                  className="w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623] appearance-none cursor-pointer"
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
              className="bg-[#00e676] text-black hover:bg-[#00d45e] font-semibold" 
              disabled={submitting} 
              onClick={handleSearchAndDownloadSheet}
            >
              {submitting ? 'Downloading...' : 'Download Sheet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] w-[98vw] max-w-[98vw] sm:max-w-[98vw]">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0] text-base flex items-center gap-2">
              <Shield size={16} className="text-[#00e676]" />
              {selectedRun?.name} - Compliance View
            </DialogTitle>
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
                      <th className="text-right py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Basic</th>
                      <th className="text-right py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Gross</th>
                      <th className="text-right py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Deductions</th>
                      <th className="text-right py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Net Pay</th>
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
                        <td className="py-3 px-3 text-[#8899aa] text-right font-mono">{formatCurrency(Number(item.basicSalary))}</td>
                        <td className="py-3 px-3 text-[#8899aa] text-right font-mono">{formatCurrency(Number(item.grossEarning))}</td>
                        <td className="py-3 px-3 text-[#ff3d3d]/80 text-right font-mono">{formatCurrency(Number(item.totalDeduction))}</td>
                        <td className="py-3 px-3 font-semibold text-[#00e676] text-right font-mono">{formatCurrency(Number(item.netPay))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmRun} onOpenChange={open => { if (!open) setDeleteConfirmRun(null); }}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#ff3d3d] text-base flex items-center gap-2">
              <Trash2 size={18} /> Delete Payroll Run
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-[12px] text-[#e2e8f0]">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-[#f5a623]">{deleteConfirmRun?.name}</span>?
            </p>
            <p className="text-[11px] text-[#8899aa]">
              This will permanently remove the payroll run and all {deleteConfirmRun?.totalEmployees} employee salary records for{' '}
              {deleteConfirmRun ? `${MONTHS[deleteConfirmRun.month - 1].label} ${deleteConfirmRun.year}` : ''}. You can then generate a fresh run for this month. This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48]"
              onClick={() => setDeleteConfirmRun(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#ff3d3d] text-white hover:bg-[#e02d2d] font-semibold"
              onClick={handleDeleteRun}
              disabled={deleting}
            >
              {deleting
                ? <><Loader2 size={14} className="animate-spin mr-1" />Deleting...</>
                : <><Trash2 size={14} className="mr-1" />Delete</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
