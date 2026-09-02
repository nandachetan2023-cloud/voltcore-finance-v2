'use client';
import { useState, useEffect } from 'react';
import { IndianRupee, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmt(n: any) { return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

export default function MyPayslips() {
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [hasEmployee, setHasEmployee] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);

  const fetchPayslips = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employee-self/payslips').then(r => r.json());
      if (res.success) setPayslips(res.data);
      else if (res.error?.includes('Not linked')) setHasEmployee(false);
      else toast.error(res.error);
    } catch { toast.error('Failed to load payslips'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPayslips(); }, []);

  const toggle = (id: number) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const downloadPayslip = async (payrollItemId: number, label: string) => {
    setDownloading(payrollItemId);
    try {
      const res = await fetch('/api/employee-self/payslips/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payrollItemId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || 'Failed to download payslip');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payslip_${label.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Payslip downloaded');
    } catch {
      toast.error('Failed to download payslip');
    } finally {
      setDownloading(null);
    }
  };

  if (!hasEmployee) return (
    <div className="p-6 text-center">
      <AlertTriangle size={32} className="mx-auto text-[#f5a623] mb-3" />
      <p className="text-[13px] font-semibold text-[#e2e8f0] mb-1">Employee profile not linked</p>
      <p className="text-[11px] text-[#5a6878]">Contact your administrator to link your account.</p>
    </div>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-7 h-7 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#00e676]/10 rounded-xl flex items-center justify-center">
            <IndianRupee size={18} className="text-[#00e676]" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">My Payslips</h2>
            <p className="text-[11px] text-[#5a6878]">{payslips.length} payslip{payslips.length !== 1 ? 's' : ''} available</p>
          </div>
        </div>
        <button onClick={fetchPayslips} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
      </div>

      <div className="space-y-2">
        {payslips.map(p => {
          const run = p.PayrollRun;
          const monthLabel = run ? `${MONTHS[(run.month || 1) - 1]} ${run.year}` : '—';
          const isExpanded = expanded.has(p.id);
          const gross = Number(p.grossEarning || 0);
          const deductions = Number(p.totalDeduction || 0);
          const net = Number(p.netPay || 0);

          return (
            <div key={p.id} className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
              <button className="w-full flex items-center justify-between p-4 hover:bg-[#1a2028] transition-colors" onClick={() => toggle(p.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#00e676]/10 rounded-lg flex items-center justify-center">
                    <IndianRupee size={16} className="text-[#00e676]" />
                  </div>
                  <div className="text-left">
                    <div className="text-[13px] font-semibold text-[#e2e8f0]">{monthLabel}</div>
                    <div className="text-[10px] text-[#5a6878]">{run?.payrollType === 'compliance' ? 'Compliance' : 'Standard'} payroll</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <div className="text-[10px] text-[#5a6878]">Gross</div>
                    <div className="text-[12px] font-semibold text-[#e2e8f0]">₹{fmt(gross)}</div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-[10px] text-[#5a6878]">Deductions</div>
                    <div className="text-[12px] font-semibold text-[#ff3d3d]">-₹{fmt(deductions)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[#5a6878]">Net Pay</div>
                    <div className="text-[14px] font-bold text-[#00e676]">₹{fmt(net)}</div>
                  </div>
                  {isExpanded ? <ChevronUp size={14} className="text-[#5a6878]" /> : <ChevronDown size={14} className="text-[#5a6878]" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-[#252e3a] p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-bold text-[#5a6878] uppercase tracking-wider mb-2">Earnings</div>
                      <div className="space-y-1.5">
                        {[['Basic Salary', p.basicSalary], ['HRA', p.hra], ['Conveyance', p.conveyanceAllowance], ['Medical', p.medicalAllowance], ['Special Allow.', p.specialAllowance], ['OT Amount', p.otAmount]]
                          .filter(([, v]) => Number(v) > 0).map(([l, v]) => (
                          <div key={l as string} className="flex justify-between text-[11px]">
                            <span className="text-[#5a6878]">{l}</span>
                            <span className="text-[#e2e8f0] font-medium">₹{fmt(v)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-[12px] font-bold border-t border-[#252e3a] pt-1.5 mt-1.5">
                          <span className="text-[#8899aa]">Gross</span>
                          <span className="text-[#00e676]">₹{fmt(gross)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-[#5a6878] uppercase tracking-wider mb-2">Deductions</div>
                      <div className="space-y-1.5">
                        {[['PF / EPF', p.pfDeduction], ['ESI', p.esiDeduction], ['PT', p.ptDeduction], ['TDS', p.tdsDeduction], ['LOP', p.lopDeduction], ['Other', p.otherDeductions]]
                          .filter(([, v]) => Number(v) > 0).map(([l, v]) => (
                          <div key={l as string} className="flex justify-between text-[11px]">
                            <span className="text-[#5a6878]">{l}</span>
                            <span className="text-[#ff3d3d] font-medium">-₹{fmt(v)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-[12px] font-bold border-t border-[#252e3a] pt-1.5 mt-1.5">
                          <span className="text-[#8899aa]">Total Deductions</span>
                          <span className="text-[#ff3d3d]">-₹{fmt(deductions)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5 bg-[#00e676]/8 border border-[#00e676]/20 rounded-lg">
                    <span className="text-[13px] font-bold text-[#00e676]">Net Pay</span>
                    <span className="text-[16px] font-black text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{fmt(net)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-[10px] text-[#5a6878]">
                      <span>Days Present: <strong className="text-[#e2e8f0]">{p.presentDays || 0}/{p.workingDays || 26}</strong></span>
                      {Number(p.otHours) > 0 && <span>OT Hours: <strong className="text-[#e2e8f0]">{Number(p.otHours).toFixed(2)}h</strong></span>}
                    </div>
                    <button
                      onClick={() => downloadPayslip(p.id, monthLabel)}
                      disabled={downloading === p.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#00e676]/10 text-[#00e676] hover:bg-[#00e676]/20 border border-[#00e676]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {downloading === p.id
                        ? <><div className="w-3 h-3 border-2 border-[#00e676]/30 border-t-[#00e676] rounded-full animate-spin" /> Preparing…</>
                        : <><Download size={12} /> Download PDF</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {payslips.length === 0 && (
          <div className="text-center py-12 bg-[#161c24] border border-[#252e3a] rounded-xl">
            <IndianRupee size={28} className="mx-auto text-[#5a6878] mb-2" />
            <p className="text-[12px] text-[#5a6878]">No payslips available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
