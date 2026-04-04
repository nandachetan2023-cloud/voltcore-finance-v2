'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  IndianRupee, TrendingUp, TrendingDown, ShieldCheck, Clock,
  Plus, Pencil, Trash2, AlertTriangle, CheckCircle2, XCircle, Loader2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';

interface EmployeeInfo { id: string; empId: string; name: string; }

interface PayrollRecord {
  id: string;
  empId: string;
  month: string;
  days: number;
  basic: number;
  hra: number;
  ot: number;
  gross: number;
  pf: number;
  esi: number;
  tds: number;
  netPay: number;
  status: string;
  employee: EmployeeInfo;
}

interface PayrollFormData {
  empId: string;
  month: string;
  days: number;
  basic: number;
  hra: number;
  ot: number;
  gross: number;
  pf: number;
  esi: number;
  tds: number;
  netPay: number;
  status: string;
}

const MONTHS = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];
const emptyForm: PayrollFormData = { empId: '', month: '', days: 26, basic: 0, hra: 0, ot: 0, gross: 0, pf: 0, esi: 0, tds: 0, netPay: 0, status: 'Pending' };

const formatCurrency = (val: number) => '₹' + val.toLocaleString('en-IN');
const formatLakhs = (val: number) => {
  if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + 'Cr';
  if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + 'L';
  return formatCurrency(val);
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Paid: 'bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30',
    Pending: 'bg-[#ffab40]/15 text-[#ffab40] border border-[#ffab40]/30',
    Processing: 'bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30',
    Failed: 'bg-[#ff3d3d]/15 text-[#ff3d3d] border border-[#ff3d3d]/30',
    Hold: 'bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-[2px] rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${styles[status] ?? 'bg-[#5a6878]/15 text-[#5a6878] border border-[#5a6878]/30'}`}>
      {status === 'Paid' && <CheckCircle2 size={10} />}
      {status === 'Pending' && <Clock size={10} />}
      {status === 'Processing' && <Loader2 size={10} className="animate-spin" />}
      {status === 'Failed' && <XCircle size={10} />}
      {status}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color, subtitle }: {
  icon: React.ElementType; label: string; value: string; icon: React.ElementType; color: string; subtitle?: string;
}) {
  return (
    <div className="vc-stat-card relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">{label}</div>
          <div className="text-[20px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</div>
          {subtitle && <div className="text-[10px] text-[#5a6878] mt-1">{subtitle}</div>}
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
  const [data, setData] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState('');
  const [employeeList, setEmployeeList] = useState<EmployeeInfo[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<PayrollFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payroll');
      const json = await res.json();
      if (json.success && json.data) setData(json.data);
      else setError(json.error ?? 'Failed to load payroll');
    } catch { setError('Network error while fetching payroll'); }
    finally { setLoading(false); }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      const json = await res.json();
      if (json.success) setEmployeeList(json.data.map((e: { id: string; empId: string; name: string }) => ({ id: e.id, empId: e.empId, name: e.name })));
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchData(); fetchEmployees(); }, [fetchData, fetchEmployees]);

  const filtered = useMemo(() => {
    if (!monthFilter) return data;
    return data.filter(r => r.month === monthFilter);
  }, [data, monthFilter]);

  const stats = useMemo(() => {
    if (!filtered.length) return { gross: 0, net: 0, pfEsi: 0, ot: 0 };
    return {
      gross: filtered.reduce((s, r) => s + r.gross, 0),
      net: filtered.reduce((s, r) => s + r.netPay, 0),
      pfEsi: filtered.reduce((s, r) => s + r.pf + r.esi, 0),
      ot: filtered.reduce((s, r) => s + r.ot, 0),
    };
  }, [filtered]);

  const computeValues = (basic: number, hra: number, ot: number, tds: number) => {
    const gross = basic + hra + ot;
    const pf = basic * 0.12;
    const esi = gross * 0.0075;
    const netPay = gross - pf - esi - tds;
    return { gross, pf, esi, netPay };
  };

  const openCreate = () => { setForm(emptyForm); setCreateOpen(true); };
  const openEdit = (r: PayrollRecord) => {
    setForm({ empId: r.empId, month: r.month, days: r.days, basic: r.basic, hra: r.hra, ot: r.ot, gross: r.gross, pf: r.pf, esi: r.esi, tds: r.tds, netPay: r.netPay, status: r.status });
    setSelectedId(r.id);
    setEditOpen(true);
  };
  const openDelete = (id: string) => { setSelectedId(id); setDeleteOpen(true); };

  const handleSubmit = async (mode: 'create' | 'edit') => {
    setSubmitting(true);
    try {
      const body = mode === 'edit' ? { id: selectedId, ...form } : form;
      const res = await fetch('/api/payroll', { method: mode === 'create' ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(mode === 'create' ? 'Payroll record created' : 'Payroll record updated');
        if (mode === 'create') setCreateOpen(false); else setEditOpen(false);
        fetchData();
      } else { toast.error(json.error || `Failed to ${mode}`); }
    } catch { toast.error(`Failed to ${mode}`); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/payroll', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedId }) });
      const json = await res.json();
      if (json.success) { toast.success('Payroll record deleted'); setDeleteOpen(false); fetchData(); }
      else { toast.error(json.error || 'Failed to delete'); }
    } catch { toast.error('Failed to delete'); }
    finally { setSubmitting(false); }
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

  const dialogContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Employee</label>
        <select className={selectCls} value={form.empId} onChange={e => setForm(f => ({ ...f, empId: e.target.value }))}>
          <option value="">Select employee</option>
          {employeeList.map(e => <option key={e.id} value={e.id}>{e.name} ({e.empId})</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Month</label>
        <select className={selectCls} value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}>
          <option value="">Select month</option>
          {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Days Worked</label>
        <input className={inputCls} type="number" value={form.days} onChange={e => setForm(f => ({ ...f, days: parseInt(e.target.value) || 0 }))} />
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Basic Pay (₹)</label>
        <input className={inputCls} type="number" value={form.basic} onChange={e => {
          const basic = parseFloat(e.target.value) || 0;
          const { gross, pf, esi, netPay } = computeValues(basic, form.hra, form.ot, form.tds);
          setForm(f => ({ ...f, basic, gross, pf, esi, netPay }));
        }} />
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">HRA (₹)</label>
        <input className={inputCls} type="number" value={form.hra} onChange={e => {
          const hra = parseFloat(e.target.value) || 0;
          const { gross, pf, esi, netPay } = computeValues(form.basic, hra, form.ot, form.tds);
          setForm(f => ({ ...f, hra, gross, pf, esi, netPay }));
        }} />
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">OT (₹)</label>
        <input className={inputCls} type="number" value={form.ot} onChange={e => {
          const ot = parseFloat(e.target.value) || 0;
          const { gross, pf, esi, netPay } = computeValues(form.basic, form.hra, ot, form.tds);
          setForm(f => ({ ...f, ot, gross, pf, esi, netPay }));
        }} />
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">TDS (₹)</label>
        <input className={inputCls} type="number" value={form.tds} onChange={e => {
          const tds = parseFloat(e.target.value) || 0;
          const { gross, pf, esi, netPay } = computeValues(form.basic, form.hra, form.ot, tds);
          setForm(f => ({ ...f, tds, gross, pf, esi, netPay }));
        }} />
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Status</label>
        <select className={selectCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
          <option value="Pending">Pending</option>
          <option value="Processing">Processing</option>
          <option value="Paid">Paid</option>
          <option value="Hold">Hold</option>
          <option value="Failed">Failed</option>
        </select>
      </div>
      {/* Auto-computed display */}
      <div className="md:col-span-2 grid grid-cols-4 gap-2 mt-1">
        <div className="bg-[#141920] border border-[#252e3a] rounded-md p-2 text-center">
          <div className="text-[9px] text-[#5a6878] uppercase">Gross</div>
          <div className="text-[13px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{formatCurrency(form.gross)}</div>
        </div>
        <div className="bg-[#141920] border border-[#252e3a] rounded-md p-2 text-center">
          <div className="text-[9px] text-[#5a6878] uppercase">PF (12%)</div>
          <div className="text-[13px] font-bold text-[#ff3d3d]/80" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{formatCurrency(form.pf)}</div>
        </div>
        <div className="bg-[#141920] border border-[#252e3a] rounded-md p-2 text-center">
          <div className="text-[9px] text-[#5a6878] uppercase">ESI (0.75%)</div>
          <div className="text-[13px] font-bold text-[#ff3d3d]/80" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{formatCurrency(form.esi)}</div>
        </div>
        <div className="bg-[#141920] border border-[#00e676]/30 rounded-md p-2 text-center">
          <div className="text-[9px] text-[#5a6878] uppercase">Net Pay</div>
          <div className="text-[13px] font-bold text-[#00e676]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{formatCurrency(form.netPay)}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp} label="Total Gross" value={formatLakhs(stats.gross)} color="#f5a623" subtitle="This month" />
        <StatCard icon={TrendingDown} label="Net Disbursed" value={formatLakhs(stats.net)} color="#00e676" subtitle="After deductions" />
        <StatCard icon={ShieldCheck} label="PF + ESI" value={formatLakhs(stats.pfEsi)} color="#00d4ff" subtitle="Statutory" />
        <StatCard icon={Clock} label="OT Total" value={formatLakhs(stats.ot)} color="#a78bfa" subtitle="Overtime" />
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header">
          <IndianRupee size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Payroll Register</span>
          <div className="ml-auto flex items-center gap-2">
            <select className="vc-input appearance-none w-[130px] cursor-pointer text-[11px]" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
              <option value="">All Months</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <span className="text-[10px] text-[#5a6878]">{filtered.length} records</span>
          </div>
          <button className="vc-btn-primary ml-2 flex items-center gap-1" onClick={openCreate}><Plus size={13} /> New Entry</button>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-[#161c24] z-10">
              <tr className="border-b border-[#252e3a]">
                {['Emp ID', 'Employee', 'Month', 'Days', 'Basic', 'HRA', 'OT', 'Gross', 'PF', 'ESI', 'TDS', 'Net Pay', 'Status', ''].map(h => (
                  <th key={h} className="text-right py-2 px-2 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap first:text-left first:pl-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={14} className="py-8 text-center text-[#5a6878] text-[11px]">No payroll records found.</td></tr>
              ) : filtered.map(rec => (
                <tr key={rec.id} className="border-b border-[#252e3a]/50 hover:bg-[#141920] transition-colors group">
                  <td className="py-[10px] px-2 text-left pl-3 text-[10px] text-[#8899aa]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{rec.employee.empId}</td>
                  <td className="py-[10px] px-2 text-left font-semibold text-[#e2e8f0]">{rec.employee.name}</td>
                  <td className="py-[10px] px-2 text-[#8899aa]">{rec.month}</td>
                  <td className="py-[10px] px-2 text-right text-[#8899aa]">{rec.days}</td>
                  <td className="py-[10px] px-2 text-right text-[#8899aa]">{formatCurrency(rec.basic)}</td>
                  <td className="py-[10px] px-2 text-right text-[#8899aa]">{formatCurrency(rec.hra)}</td>
                  <td className="py-[10px] px-2 text-right text-[#a78bfa]">{rec.ot > 0 ? formatCurrency(rec.ot) : '—'}</td>
                  <td className="py-[10px] px-2 text-right font-semibold text-[#e2e8f0]">{formatCurrency(rec.gross)}</td>
                  <td className="py-[10px] px-2 text-right text-[#ff3d3d]/80">{formatCurrency(rec.pf)}</td>
                  <td className="py-[10px] px-2 text-right text-[#ff3d3d]/80">{formatCurrency(rec.esi)}</td>
                  <td className="py-[10px] px-2 text-right text-[#ff3d3d]/80">{formatCurrency(rec.tds)}</td>
                  <td className="py-[10px] px-2 text-right font-bold text-[#00e676]">{formatCurrency(rec.netPay)}</td>
                  <td className="py-[10px] px-2 text-center"><StatusBadge status={rec.status} /></td>
                  <td className="py-[10px] px-2 text-right pr-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" onClick={() => openEdit(rec)}><Pencil size={13} /></button>
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" onClick={() => openDelete(rec.id)}><Trash2 size={13} /></button>
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
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl"><DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Create Payroll Entry</DialogTitle></DialogHeader>{dialogContent()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('create')}>{submitting ? 'Creating...' : 'Create Entry'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl"><DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Edit Payroll Entry</DialogTitle></DialogHeader>{dialogContent()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('edit')}>{submitting ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Delete Payroll Entry</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-[#ff3d3d]/15 flex items-center justify-center shrink-0 mt-0.5"><AlertTriangle size={20} className="text-[#ff3d3d]" /></div>
            <div><p className="text-[13px] text-[#e2e8f0] mb-1">Are you sure you want to delete this payroll entry?</p><p className="text-[11px] text-[#8899aa]">This action cannot be undone.</p></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#cc2020] font-semibold" disabled={submitting} onClick={handleDelete}>{submitting ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
