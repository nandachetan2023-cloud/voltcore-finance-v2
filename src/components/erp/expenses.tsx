'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Receipt, CheckCircle2, XCircle, Plus, Trash2, Loader2,
  AlertTriangle, IndianRupee, RefreshCw, Plane,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

/* ── Types ────────────────────────────────────────── */
interface Employee {
  id: string;
  empId: string;
  name: string;
  role: string;
  site: string;
}

/** The view shape this screen renders — mapped from a FinExpenseClaim row. */
interface Expense {
  id: string;
  claimNo: string;
  employeeName: string;
  department: string;
  siteName: string;
  category: string;
  amount: number;
  project: string;
  date: string;
  status: string;
}

interface Site { id: number; name: string; siteCode: string; }
interface JobOption { id: number; jobCode: string; description: string | null; siteId: number | null; status: string; }

/**
 * /api/fin/expense-claims returns FinExpenseClaim rows, which carry expenseType /
 * totalAmount / submittedBy / jobCode — not category / amount / employee /
 * project. Reading the latter straight off the response left every one of them
 * undefined, and `undefined.toLowerCase()` in categoryIcon crashed the screen.
 */
function toExpense(r: any): Expense {
  return {
    id: String(r.id),
    claimNo: r.claimNo ?? '—',
    employeeName: r.submittedBy || 'Unknown',
    department: r.department || '',
    siteName: r.site?.name || '',
    category: r.expenseType || 'Misc',
    amount: Number(r.totalAmount) || 0,
    project: r.jobCode || r.costCenter || '',
    date: typeof r.date === 'string' ? r.date.split('T')[0] : '',
    status: r.approvalStatus || r.status || 'Draft',
  };
}

interface ExpenseFormData {
  siteId: string;
  category: string;
  amount: number;
  jobCode: string;
  submittedBy: string;
  date: string;
}

const EMPTY_FORM: ExpenseFormData = {
  siteId: '', category: 'Travel & Accommodation', amount: 0, jobCode: '', submittedBy: '', date: '',
};

const CATEGORIES = [
  'Travel & Accommodation',
  'Tools & Consumables',
  'Medical',
  'Communication',
  'Transport',
  'Misc',
];

/* ── Helpers ──────────────────────────────────────── */
function statusBadge(s?: string | null) {
  const m: Record<string, string> = {
    Pending: 'bg-[#ffab40]/15 text-[#ffab40]',
    Approved: 'bg-[#00e676]/15 text-[#00e676]',
    Rejected: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
  };
  return m[s ?? ''] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function categoryIcon(cat?: string | null) {
  if ((cat ?? '').toLowerCase().includes('travel')) return <Plane size={12} className="text-[#00d4ff]" />;
  return <Receipt size={12} className="text-[#8899aa]" />;
}

/* ── Loading Skeleton ─────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="vc-stat-card">
            <Skeleton className="h-3 w-24 mb-2 bg-[#1e2630]" />
            <Skeleton className="h-7 w-14 bg-[#1e2630]" />
          </div>
        ))}
      </div>
      <div className="vc-panel">
        <Skeleton className="h-10 w-full bg-[#1e2630]" />
        <div className="p-3 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full bg-[#1e2630]" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Stat Card ────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number | string; color: string;
}) {
  return (
    <div className="vc-stat-card">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">{label}</div>
          <div className="text-[22px] font-bold leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{value}</div>
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */
export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

/* ── Fetch ── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [expRes, empRes, siteRes, jobRes] = await Promise.all([
        fetch('/api/fin/expense-claims'),
        fetch('/api/employees'),
        fetch('/api/fin/sites'),
        fetch('/api/fin/jobs'),
      ]);
      const expJson = await expRes.json();
      const empJson = await empRes.json();
      const siteJson = await siteRes.json();
      const jobJson = await jobRes.json();
      if (expJson.success) setExpenses((expJson.data ?? []).map(toExpense));
      if (empJson.success) setEmployees(empJson.data ?? []);
      if (siteJson.success) setSites(siteJson.data ?? []);
      if (jobJson.success) setJobs((jobJson.data ?? []).map((j: any) => ({ id: j.id, jobCode: j.jobCode, description: j.description ?? null, siteId: j.siteId ?? null, status: j.status })));
    } catch {
      toast.error('Failed to fetch expense data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Stats ── */
  const pendingCount = expenses.filter(e => e.status === 'Pending').length;
  const approvedMTD = expenses.filter(e => e.status === 'Approved').reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalAmount = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const rejectedCount = expenses.filter(e => e.status === 'Rejected').length;

  // Jobs belong to a site, so the picker follows the site chosen in the form.
  const formSiteJobs = form.siteId
    ? jobs.filter(j => String(j.siteId) === form.siteId && j.status !== 'Closed')
    : [];

  /* ── Form helpers ── */
  const updateForm = (field: keyof ExpenseFormData, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.siteId || !form.amount || !form.date) {
      toast.error('Site, amount and date are required');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/fin/expense-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: Number(form.siteId),
          expenseType: form.category,
          totalAmount: form.amount,
          jobCode: form.jobCode || null,
          submittedBy: form.submittedBy || null,
          date: form.date,
          approvalStatus: 'Pending',
          status: 'Submitted',
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Expense claim created');
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to create expense');
      }
    } catch {
      toast.error('Network error creating expense');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Approve / Reject ── */
  const handleStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      setActionLoading(id);
      const res = await fetch('/api/fin/expense-claims', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(id), approvalStatus: status, status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Expense ${status.toLowerCase()}`);
        await fetchData();
      } else {
        toast.error(json.error || 'Action failed');
      }
    } catch {
      toast.error('Network error updating status');
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/fin/expense-claims?id=${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success('Expense deleted');
        setDeleteOpen(false);
        setDeleteTarget(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Delete failed');
      }
    } catch {
      toast.error('Network error deleting expense');
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4 p-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Receipt} label="Pending Claims" value={pendingCount} color="#ffab40" />
        <StatCard icon={CheckCircle2} label="Approved MTD" value={`₹${(approvedMTD / 100000).toFixed(1)}L`} color="#00e676" />
        <StatCard icon={IndianRupee} label="Total Amount" value={`₹${(totalAmount / 100000).toFixed(1)}L`} color="#00d4ff" />
        <StatCard icon={XCircle} label="Rejected" value={rejectedCount} color="#ff3d3d" />
      </div>

      {/* Table */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Receipt size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Expense Claims</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{expenses.length} Total</span>
          <button onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}
            className="vc-btn-primary flex items-center gap-1.5 ml-2">
            <Plus size={13} /> New Claim
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0f1318]">
                  {['Claim No.', 'Employee', 'Category', 'Amount', 'Project', 'Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center">
                      <Receipt className="mx-auto text-[#5a6878] mb-2" size={24} />
                      <div className="text-[11px] text-[#5a6878]">No expense claims found</div>
                    </td>
                  </tr>
                ) : (
                  expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-[#141920] transition-colors">
                      <td className="py-2.5 px-3 text-[#f5a623] font-medium">{exp.claimNo}</td>
                      <td className="py-2.5 px-3">
                        <div className="text-[#e2e8f0] font-medium">{exp.employeeName}</div>
                        <div className="text-[#5a6878] text-[9px]">{[exp.department, exp.siteName].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 text-[#8899aa]">
                          {categoryIcon(exp.category)} {exp.category || '—'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">₹{(exp.amount ?? 0).toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{exp.project || '—'}</td>
                      <td className="py-2.5 px-3 text-[#5a6878]">{exp.date}</td>
                      <td className="py-2.5 px-3">
                        <span className={`vc-badge ${statusBadge(exp.status)}`}>{exp.status}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          {exp.status === 'Pending' && (
                            <>
                              <button onClick={() => handleStatus(exp.id, 'Approved')} disabled={actionLoading === exp.id}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-[#00e676]/10 text-[#00e676] hover:bg-[#00e676]/20 border border-[#00e676]/20 disabled:opacity-50">
                                {actionLoading === exp.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                                Approve
                              </button>
                              <button onClick={() => handleStatus(exp.id, 'Rejected')} disabled={actionLoading === exp.id}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-[#ff3d3d]/10 text-[#ff3d3d] hover:bg-[#ff3d3d]/20 border border-[#ff3d3d]/20 disabled:opacity-50">
                                Reject
                              </button>
                            </>
                          )}
                          <button onClick={() => { setDeleteTarget(exp); setDeleteOpen(true); }}
                            className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-all" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Expense Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623] flex items-center gap-2">
              <Plus size={16} /> New Expense Claim
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Site *</label>
              <select value={form.siteId} onChange={e => { updateForm('siteId', e.target.value); updateForm('jobCode', ''); }} className="vc-input appearance-none">
                <option value="">Select site...</option>
                {sites.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Submitted By</label>
              <select value={form.submittedBy} onChange={e => updateForm('submittedBy', e.target.value)} className="vc-input appearance-none">
                <option value="">Me (from session)</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.name}>{emp.empId} - {emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Category *</label>
              <select value={form.category} onChange={e => updateForm('category', e.target.value)} className="vc-input appearance-none">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Amount (₹) *</label>
              <input type="number" value={form.amount || ''} onChange={e => updateForm('amount', Number(e.target.value))}
                placeholder="0" className="vc-input" min="0" step="0.01" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Job Code</label>
              <select value={form.jobCode} onChange={e => updateForm('jobCode', e.target.value)} disabled={!form.siteId} className="vc-input appearance-none disabled:opacity-50">
                <option value="">{!form.siteId ? '— Select a site first —' : formSiteJobs.length === 0 ? '— No active jobs for this site —' : '— Select Job —'}</option>
                {formSiteJobs.map(j => <option key={j.id} value={j.jobCode}>{j.jobCode} — {j.description || 'Untitled'}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Date *</label>
              <input type="date" value={form.date} onChange={e => updateForm('date', e.target.value)} className="vc-input" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setCreateOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleCreate} disabled={submitting}
              className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Submit Claim
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d] flex items-center gap-2">
              <AlertTriangle size={16} /> Delete Expense Claim
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Are you sure you want to delete claim <strong className="text-[#f5a623]">{deleteTarget?.claimNo}</strong> for <strong className="text-[#e2e8f0]">{deleteTarget?.employeeName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
