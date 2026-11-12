'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock, CheckCircle2, XCircle, UserCheck, Plus, Pencil,
  Trash2, Loader2, AlertTriangle, FileCheck, CalendarRange,
  RotateCcw, RefreshCw, ShieldAlert, Ban, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { FieldError, fieldBorderError } from '@/components/ui/field-error';
import { validateFields, isValid, type FieldErrors } from '@/lib/form-validation';

/* ── Types ────────────────────────────────────────── */
interface Employee {
  id: string;
  empId: string;
  name: string;
  role: string;
  site: string;
  departmentId?: number;
  designationId?: number;
}

interface LeaveRequest {
  id: string;
  empId: string;
  site: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: string;
  appliedDate: string;
  createdAt: string;
  updatedAt: string;
  employee: Employee;
}

interface LeaveFormData {
  empId: string;
  site: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
}

const EMPTY_FORM: LeaveFormData = {
  empId: '', site: '', type: 'EL', fromDate: '', toDate: '', days: 0, reason: '',
};

const LEAVE_TYPES = ['EL', 'SL', 'CL', 'ML', 'Comp Off'] as const;
type TabFilter = 'all' | 'Pending' | 'Approved' | 'Rejected';

const TABS: { id: TabFilter; label: string }[] = [
  { id: 'all', label: 'All Requests' },
  { id: 'Pending', label: 'Pending' },
  { id: 'Approved', label: 'Approved' },
  { id: 'Rejected', label: 'Rejected' },
];

/* ── Helpers ──────────────────────────────────────── */
function typeBadge(t: string) {
  const m: Record<string, string> = {
    EL: 'bg-[#00d4ff]/15 text-[#00d4ff]',
    SL: 'bg-[#ffab40]/15 text-[#ffab40]',
    ML: 'bg-[#a78bfa]/15 text-[#a78bfa]',
    CL: 'bg-[#00e676]/15 text-[#00e676]',
    'Comp Off': 'bg-[#f5a623]/15 text-[#f5a623]',
  };
  return m[t] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function statusBadge(s: string) {
  const m: Record<string, string> = {
    Pending: 'bg-[#ffab40]/15 text-[#ffab40]',
    Approved: 'bg-[#00e676]/15 text-[#00e676]',
    Rejected: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    Cancelled: 'bg-[#5a6878]/15 text-[#5a6878]',
  };
  return m[s] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function fmtDate(d: string) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch { return d; }
}

function calcDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const d1 = new Date(from), d2 = new Date(to);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
}

/* ── Loading Skeleton ─────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="vc-stat-card">
            <Skeleton className="h-3 w-24 mb-2 bg-[#1e2630]" />
            <Skeleton className="h-7 w-12 bg-[#1e2630]" />
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

/* ── Balance Card ─────────────────────────────────── */
function BalanceCard({ label, allocated, used, color }: {
  label: string; allocated: number; used: number; color: string;
}) {
  const balance = allocated - used;
  const pct = allocated > 0 ? Math.round((used / allocated) * 100) : 0;
  return (
    <div className="bg-[#0f1318] border border-[#1e2530] rounded-lg p-3">
      <div className="text-[9px] text-[#5a6878] uppercase tracking-wider mb-2">{label}</div>
      <div className="flex items-end gap-1 mb-2">
        <span className="text-2xl font-bold" style={{ color, fontFamily: "'Barlow Condensed', sans-serif" }}>{balance}</span>
        <span className="text-[10px] text-[#5a6878] mb-0.5">/ {allocated}</span>
      </div>
      <div className="h-[4px] bg-[#141920] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-[#5a6878]">{used} used</span>
        <span className="text-[9px] text-[#5a6878]">{pct}%</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   LEAVE LEDGER COMPONENT
   Shows per-employee leave balance summary with expandable
   rows to view individual leave request logs.
   Fetches its own data from /api/leave/ledger, which returns
   every employee to an admin and only the caller's own
   ledger to anyone else.
   ════════════════════════════════════════════════════════ */
function LeaveLedger({ leavePolicies, refreshKey }: {
  leavePolicies: any[];
  refreshKey: number;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/leave/ledger', { cache: 'no-store' });
        const json = await res.json();
        if (cancelled || !json.success) return;
        const mappedEmployees: Employee[] = json.data.employees.map((e: any) => ({
          id: e.id.toString(),
          empId: e.employeeCode,
          name: `${e.firstName} ${e.lastName}`,
          role: e.Designation?.name || 'N/A',
          site: e.Branch?.name || 'N/A',
          departmentId: e.departmentId,
          designationId: e.designationId,
        }));
        const byId = new Map(mappedEmployees.map(e => [e.id, e]));
        setEmployees(mappedEmployees);
        setRecords(json.data.records.map((r: any) => {
          const emp = byId.get(r.employeeId.toString());
          return {
            id: r.id.toString(),
            empId: emp?.empId || '',
            site: emp?.site || 'N/A',
            type: r.leaveType,
            fromDate: r.fromDate,
            toDate: r.toDate,
            days: r.days,
            reason: r.reason || '',
            status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
            appliedDate: r.appliedDate || r.createdAt,
            createdAt: r.createdAt,
            updatedAt: r.createdAt,
            employee: emp!,
          };
        }));
      } catch (error) {
        console.error('Error fetching leave ledger:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  const activePolicies = leavePolicies.filter(p => p.isActive);
  const leaveTypes = activePolicies.map(p => p.code || p.leaveType);

  // Build per-employee ledger
  const ledger = useMemo(() => {
    return employees
      .filter(emp => {
        if (!search) return true;
        return emp.name.toLowerCase().includes(search.toLowerCase()) ||
               emp.empId.toLowerCase().includes(search.toLowerCase());
      })
      .map(emp => {
        const empRecords = records.filter(r => r.employee?.id === emp.id);

        const byType = leaveTypes.map(type => {
          const policy = activePolicies.find(p => (p.code || p.leaveType) === type);
          const allocated = policy ? Number(policy.annualQuota) : 0;
          const typeRecords = empRecords.filter(r => r.type === type);
          const approved = typeRecords.filter(r => r.status === 'Approved').reduce((s, r) => s + Number(r.days), 0);
          const pending  = typeRecords.filter(r => r.status === 'Pending').reduce((s, r) => s + Number(r.days), 0);
          const remaining = Math.max(0, allocated - approved);
          return { type, allocated, approved, pending, remaining, policyName: policy?.name || type };
        });

        const totalAllocated = byType.reduce((s, t) => s + t.allocated, 0);
        const totalUsed      = byType.reduce((s, t) => s + t.approved, 0);
        const totalPending   = byType.reduce((s, t) => s + t.pending, 0);
        const totalRemaining = byType.reduce((s, t) => s + t.remaining, 0);

        return { emp, byType, empRecords, totalAllocated, totalUsed, totalPending, totalRemaining };
      })
      .filter(row => {
        if (!filterType) return true;
        return row.byType.some(t => t.type === filterType && (t.approved > 0 || t.pending > 0));
      });
  }, [employees, records, leaveTypes, activePolicies, search, filterType]);

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const TYPE_COLORS: Record<string, string> = {
    EL: '#00d4ff', SL: '#ffab40', ML: '#a78bfa', CL: '#00e676', 'Comp Off': '#f5a623',
  };

  return (
    <div className="vc-panel">
      <div className="vc-panel-header">
        <CalendarRange size={14} className="text-[#a78bfa]" />
        <span className="text-[12px] font-semibold text-[#e2e8f0]">Leave Ledger</span>
        <span className="ml-1 vc-badge bg-[#252e3a] text-[#8899aa]">{ledger.length} employees</span>
        <div className="ml-auto flex items-center gap-2">
          {/* Search */}
          <div className="flex items-center gap-1.5 bg-[#0f1318] border border-[#252e3a] rounded-md px-2 py-1">
            <FileCheck size={11} className="text-[#5a6878]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employee..."
              className="bg-transparent text-[11px] text-[#e2e8f0] outline-none w-[130px] placeholder:text-[#5a6878]"
            />
          </div>
          {/* Filter by type */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-[#0f1318] border border-[#252e3a] rounded-md px-2 py-1 text-[11px] text-[#e2e8f0] outline-none"
          >
            <option value="">All Types</option>
            {leaveTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-[#0f1318] border-b border-[#252e3a]">
              <th className="text-left py-2 px-3 text-[9px] font-bold uppercase tracking-wider text-[#5a6878] w-8"></th>
              <th className="text-left py-2 px-3 text-[9px] font-bold uppercase tracking-wider text-[#5a6878]">Employee</th>
              {leaveTypes.map(t => (
                <th key={t} className="text-center py-2 px-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: TYPE_COLORS[t] || '#5a6878' }}>{t}</th>
              ))}
              <th className="text-center py-2 px-3 text-[9px] font-bold uppercase tracking-wider text-[#5a6878]">Total Used</th>
              <th className="text-center py-2 px-3 text-[9px] font-bold uppercase tracking-wider text-[#ffab40]">Pending</th>
              <th className="text-center py-2 px-3 text-[9px] font-bold uppercase tracking-wider text-[#00e676]">Remaining</th>
            </tr>
          </thead>
          <tbody>
            {ledger.length === 0 ? (
              <tr><td colSpan={leaveTypes.length + 4} className="py-10 text-center text-[#5a6878] text-[12px]">No employees found</td></tr>
            ) : ledger.map(({ emp, byType, empRecords, totalUsed, totalPending, totalRemaining }) => (
              <React.Fragment key={emp.id}>
                {/* Summary row */}
                <tr
                  key={emp.id}
                  onClick={() => toggle(emp.id)}
                  className="border-b border-[#1a2028] hover:bg-[#141920] transition-colors cursor-pointer"
                >
                  <td className="py-2.5 px-3 text-[#5a6878]">
                    <ChevronRight size={12} className={`transition-transform ${expanded.has(emp.id) ? 'rotate-90' : ''}`} />
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-[#e2e8f0]">{emp.name}</div>
                    <div className="text-[9px] text-[#5a6878]">{emp.empId} · {emp.site}</div>
                  </td>
                  {byType.map(t => (
                    <td key={t.type} className="py-2.5 px-2 text-center">
                      <div className="text-[11px] font-bold" style={{ color: TYPE_COLORS[t.type] || '#e2e8f0' }}>
                        {t.remaining}
                      </div>
                      <div className="text-[9px] text-[#5a6878]">/ {t.allocated}</div>
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-center font-semibold text-[#e2e8f0]">{totalUsed}</td>
                  <td className="py-2.5 px-3 text-center font-semibold text-[#ffab40]">{totalPending > 0 ? totalPending : '—'}</td>
                  <td className="py-2.5 px-3 text-center font-semibold text-[#00e676]">{totalRemaining}</td>
                </tr>

                {/* Expanded: individual leave logs */}
                {expanded.has(emp.id) && (
                  <tr key={`${emp.id}-detail`} className="bg-[#0a0d12]">
                    <td colSpan={leaveTypes.length + 4} className="px-6 py-3">
                      {/* Per-type breakdown */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-3">
                        {byType.filter(t => t.allocated > 0).map(t => {
                          const pct = t.allocated > 0 ? Math.min(100, Math.round((t.approved / t.allocated) * 100)) : 0;
                          const color = TYPE_COLORS[t.type] || '#5a6878';
                          return (
                            <div key={t.type} className="bg-[#0f1318] border border-[#1e2530] rounded-lg p-2.5">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color }}>{t.type}</span>
                                <span className="text-[9px] text-[#5a6878]">{t.policyName}</span>
                              </div>
                              <div className="flex items-end gap-1 mb-1.5">
                                <span className="text-[18px] font-black" style={{ color, fontFamily: "'Barlow Condensed', sans-serif" }}>{t.remaining}</span>
                                <span className="text-[9px] text-[#5a6878] mb-0.5">/ {t.allocated} left</span>
                              </div>
                              <div className="h-[3px] bg-[#141920] rounded-full overflow-hidden mb-1">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                              </div>
                              <div className="flex justify-between text-[9px] text-[#5a6878]">
                                <span>{t.approved} used</span>
                                {t.pending > 0 && <span className="text-[#ffab40]">{t.pending} pending</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Leave request log */}
                      {empRecords.length > 0 ? (
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr className="border-b border-[#252e3a]">
                              {['Type', 'From', 'To', 'Days', 'Reason', 'Applied', 'Status'].map(h => (
                                <th key={h} className="text-left py-1.5 px-2 text-[9px] font-bold uppercase tracking-wider text-[#5a6878]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1a2028]">
                            {empRecords
                              .sort((a, b) => new Date(b.appliedDate || b.createdAt).getTime() - new Date(a.appliedDate || a.createdAt).getTime())
                              .map(r => (
                                <tr key={r.id} className="hover:bg-[#141920] transition-colors">
                                  <td className="py-1.5 px-2">
                                    <span className={`vc-badge ${typeBadge(r.type)}`}>{r.type}</span>
                                  </td>
                                  <td className="py-1.5 px-2 text-[#8899aa]">{fmtDate(r.fromDate)}</td>
                                  <td className="py-1.5 px-2 text-[#8899aa]">{fmtDate(r.toDate)}</td>
                                  <td className="py-1.5 px-2 font-semibold text-[#e2e8f0]">{r.days}</td>
                                  <td className="py-1.5 px-2 text-[#8899aa] max-w-[180px] truncate" title={r.reason}>{r.reason || '—'}</td>
                                  <td className="py-1.5 px-2 text-[#8899aa]">{fmtDate(r.appliedDate || r.createdAt)}</td>
                                  <td className="py-1.5 px-2">
                                    <span className={`vc-badge ${statusBadge(r.status)}`}>{r.status}</span>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-[11px] text-[#5a6878] text-center py-3">No leave requests for this employee.</p>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */
export default function LeaveModule() {
  const [records, setRecords] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leavePolicies, setLeavePolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [tableSearch, setTableSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [myEmployeeId, setMyEmployeeId] = useState<number | null>(null);
  const [ledgerVersion, setLedgerVersion] = useState(0);

  // Get current user's employeeId to prevent self-approval
  useEffect(() => {
    try {
      const u = localStorage.getItem('erp_auth_user');
      if (u) {
        const p = JSON.parse(u);
        if (p.employeeId) setMyEmployeeId(Number(p.employeeId));
      }
    } catch {}
  }, []);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LeaveRequest | null>(null);
  // Rejection remark — optional, so the approver can say why. The employee
  // sees it alongside which step rejected in My Portal > My Leave.
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState<LeaveFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) { setForm(EMPTY_FORM); setFieldErrors({}); setCreateOpen(true); } }, [triggerCreate]);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [leaveRes, empRes, policiesRes] = await Promise.all([
        // no-store: without it the browser can serve the pre-approval response
        // back to the refetch, leaving an approved row still showing Pending
        // with its Approve/Reject buttons.
        fetch('/api/leave', { cache: 'no-store' }),
        fetch('/api/employees'),
        fetch('/api/leave-policies'),
      ]);
      const leaveJson = await leaveRes.json();
      const empJson = await empRes.json();
      const policiesJson = await policiesRes.json();

      console.log('Leave Module - Raw employee data:', empJson.data?.slice(0, 3));
      console.log('Leave Module - Raw leave data:', leaveJson.data?.slice(0, 3));
      console.log('Leave Module - Leave policies:', policiesJson.data);

      if (leaveJson.success) {
        // Map leave records to match component format
        const mappedRecords = leaveJson.data.map((record: any) => ({
          id: record.id.toString(),
          empId: record.Employee?.employeeCode || '',
          site: record.Employee?.Branch?.name || 'N/A',
          type: record.leaveType,
          fromDate: record.fromDate,
          toDate: record.toDate,
          days: record.days,
          reason: record.reason || '',
          status: record.status.charAt(0).toUpperCase() + record.status.slice(1), // Capitalize status
          appliedDate: record.appliedDate || record.createdAt,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          employee: {
            id: record.Employee?.id?.toString() || '',
            empId: record.Employee?.employeeCode || '',
            name: record.Employee ? `${record.Employee.firstName} ${record.Employee.lastName}` : 'Unknown',
            role: 'N/A',
            site: record.Employee?.Branch?.name || 'N/A',
          },
        }));
        
        console.log('Leave Module - Mapped leave records:', mappedRecords.slice(0, 3));
        setRecords(mappedRecords);
      }

      if (empJson.success) {
        const activeEmployees = empJson.data.filter((e: any) => e.employmentStatus?.toLowerCase() === 'active');
        console.log('Leave Module - Active employees count:', activeEmployees.length);
        console.log('Leave Module - Sample raw employee:', empJson.data[0]);
        
        const mappedEmployees = activeEmployees.map((e: any) => ({
          id: e.id.toString(), // Keep as string for form value
          empId: e.employeeCode,
          name: `${e.firstName} ${e.lastName}`,
          role: e.Designation?.name || 'N/A',
          site: e.Branch?.name || 'N/A',
          departmentId: e.departmentId,
          designationId: e.designationId,
        }));
        
        console.log('Leave Module - Mapped employees:', mappedEmployees.slice(0, 3));
        console.log('Leave Module - Total mapped employees:', mappedEmployees.length);
        setEmployees(mappedEmployees);
      } else {
        console.error('Leave Module - Failed to fetch employees:', empJson.error);
      }

      if (policiesJson.success) {
        setLeavePolicies(policiesJson.data || []);
      }
    } catch (error) {
      console.error('Error fetching leave data:', error);
      toast.error('Failed to fetch leave data');
    } finally {
      setLoading(false);
      setLedgerVersion(v => v + 1);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Stats ── */
  const pendingCount = records.filter(r => r.status === 'Pending').length;
  const approvedMTD = records.filter(r => r.status === 'Approved').length;
  const rejectedCount = records.filter(r => r.status === 'Rejected').length;
  const currentlyOnLeave = records.filter(r => {
    const today = new Date().toISOString().split('T')[0];
    return r.status === 'Approved' && r.fromDate <= today && r.toDate >= today;
  }).length;

  /* ── Leave balances (computed from leave policies and approved leaves) ── */
  const balances = useMemo(() => {
    if (leavePolicies.length === 0) return [];
    
    // Create map of used leave days by leave type
    const usedMap: Record<string, number> = {};
    records.filter(r => r.status === 'Approved').forEach(r => {
      const leaveType = r.type.toUpperCase();
      usedMap[leaveType] = (usedMap[leaveType] || 0) + r.days;
    });
    
    // Map leave policies to balance cards - show all active policies
    return leavePolicies
      .filter(policy => policy.isActive)
      .map(policy => {
        const code = policy.code || policy.leaveType;
        const colorClass = typeBadge(code).split(' ')[1];
        const colorValue = colorClass.replace('text-[', '').replace(']', '');
        
        return {
          type: code,
          allocated: Number(policy.annualQuota),
          used: usedMap[code] || usedMap[policy.leaveType] || 0,
          color: colorValue,
          name: policy.name,
          applicableTo: policy.applicableTo || 'all',
          department: policy.Department?.name,
          designation: policy.Designation?.name,
        };
      });
  }, [records, leavePolicies]);

  /* ── Filtered ── */
  const filtered = records.filter(r => {
    if (activeTab !== 'all' && r.status !== activeTab) return false;
    // In Pending tab, hide requests the caller cannot approve
    if (activeTab === 'Pending' && r.canApprove === false) return false;
    if (tableSearch) {
      const q = tableSearch.toLowerCase();
      return (
        r.employee?.name?.toLowerCase().includes(q) ||
        r.employee?.empId?.toLowerCase().includes(q) ||
        r.type?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  /* ── Get applicable leave policies for selected employee ── */
  const getApplicablePolicies = useCallback((employeeId: string) => {
    if (!employeeId) return leavePolicies.filter(p => p.isActive);
    
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return leavePolicies.filter(p => p.isActive);
    
    return leavePolicies.filter(policy => {
      if (!policy.isActive) return false;
      if (!policy.applicableTo || policy.applicableTo === 'all') return true;
      if (policy.applicableTo === 'department') return policy.departmentId === employee.departmentId;
      if (policy.applicableTo === 'designation') return policy.designationId === employee.designationId;
      if (policy.applicableTo === 'both') {
        return policy.departmentId === employee.departmentId &&
               policy.designationId === employee.designationId;
      }
      return false;
    });
  }, [employees, leavePolicies]);

  /* ── Balance warning for selected employee + leave type ── */
  const formBalanceWarning = useMemo(() => {
    if (!form.empId || !form.type || form.days <= 0) return null;

    // Build used map for this employee's approved leaves
    const usedMap: Record<string, number> = {};
    records
      .filter(r => r.employee?.id === form.empId && r.status === 'Approved')
      .forEach(r => { usedMap[r.type] = (usedMap[r.type] || 0) + Number(r.days); });

    const policy = leavePolicies.find(p => (p.code || p.leaveType) === form.type && p.isActive);
    if (!policy) return null;

    const allocated = Number(policy.annualQuota);
    const used = usedMap[form.type] || 0;
    const remaining = allocated - used;

    if (form.days > remaining) {
      return `${employees.find(e => e.id === form.empId)?.name || 'Employee'} only has ${remaining} day${remaining !== 1 ? 's' : ''} remaining for ${policy.name || form.type}. Requested: ${form.days} day${form.days !== 1 ? 's' : ''}.`;
    }
    return null;
  }, [form.empId, form.type, form.days, records, leavePolicies, employees]);

  /* ── Form helpers ── */
  const updateForm = async (field: keyof LeaveFormData, value: string | number) => {
    // Update the field immediately
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Calculate working days when dates or employee changes
    const updatedForm = { ...form, [field]: value };
    
    if (updatedForm.fromDate && updatedForm.toDate && updatedForm.empId) {
      // First show calendar days immediately
      const calendarDays = calcDays(updatedForm.fromDate, updatedForm.toDate);
      setForm(prev => ({ ...prev, [field]: value, days: calendarDays }));
      
      // Then fetch actual working days from backend
      if (field === 'fromDate' || field === 'toDate' || field === 'empId') {
        try {
          console.log('Fetching working days for:', {
            employeeId: updatedForm.empId,
            startDate: updatedForm.fromDate,
            endDate: updatedForm.toDate
          });
          
          const res = await fetch(
            `/api/leave/calculate-days?employeeId=${updatedForm.empId}&startDate=${updatedForm.fromDate}&endDate=${updatedForm.toDate}`
          );
          const json = await res.json();
          
          console.log('Working days response:', json);
          
          if (json.success) {
            setForm(prev => ({ ...prev, days: json.data.workingDays }));
          }
        } catch (error) {
          console.error('Error calculating working days:', error);
        }
      }
    } else if (field === 'fromDate' || field === 'toDate') {
      const calendarDays = calcDays(updatedForm.fromDate, updatedForm.toDate);
      setForm(prev => ({ ...prev, [field]: value, days: calendarDays }));
    }
  };

  const handleCreate = async () => {
    const errors = validateFields([
      { field: 'empId', value: form.empId, label: 'Employee' },
      { field: 'type', value: form.type, label: 'Leave Type' },
      { field: 'fromDate', value: form.fromDate, label: 'From Date' },
      { field: 'toDate', value: form.toDate, label: 'To Date' },
    ]);
    setFieldErrors(errors);
    if (!isValid(errors)) return;
    if (form.days < 1) {
      toast.error('Please select a valid date range');
      return;
    }
    if (formBalanceWarning) {
      toast.error(formBalanceWarning);
      return;
    }
    try {
      setSubmitting(true);
      
      // Transform form data to match API expectations
      const payload = {
        employeeId: parseInt(form.empId),
        leaveType: form.type,
        fromDate: form.fromDate,
        toDate: form.toDate,
        days: form.days,
        reason: form.reason || '',
      };
      
      console.log('Leave Module - Creating leave request:', payload);
      
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      
      console.log('Leave Module - API response:', json);
      
      if (json.success) {
        // Show success message with holiday and off days info if present
        if (json.holidayInfo) {
          const parts = [];
          
          if (json.holidayInfo.count > 0) {
            const holidayNames = json.holidayInfo.holidays.map((h: any) => h.name).join(', ');
            parts.push(`${json.holidayInfo.count} holiday(s) (${holidayNames})`);
          }
          
          if (json.holidayInfo.offDays > 0) {
            parts.push(`${json.holidayInfo.offDays} off day(s)`);
          }
          
          if (parts.length > 0) {
            toast.success(
              <div>
                <div className="font-semibold">Leave request created!</div>
                <div className="text-xs mt-1">
                  {parts.join(' and ')} excluded.
                </div>
                <div className="text-xs">
                  {json.holidayInfo.workingDays} working days will be deducted.
                </div>
              </div>,
              { duration: 6000 }
            );
          } else {
            toast.success('Leave request created successfully');
          }
        } else {
          toast.success('Leave request created successfully');
        }
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        setFieldErrors({});
        await fetchData();
      } else if (res.status === 422) {
        setCreateOpen(false);
        setBlockError(json.error || 'No approval chain is configured for this employee\'s role.');
      } else {
        toast.error(json.error || 'Failed to create leave request');
      }
    } catch (error) {
      console.error('Leave Module - Error creating leave:', error);
      toast.error('Network error creating leave request');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Approve / Reject ── */
  const handleStatus = async (id: string, status: 'Approved' | 'Rejected', reason?: string) => {
    try {
      setActionLoading(id);
      const res = await fetch('/api/leave', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(id),
          status: status.toLowerCase(), // API expects lowercase
          // Optional: omitted entirely when the approver left it blank.
          ...(reason && reason.trim() ? { rejectionReason: reason.trim() } : {}),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Leave ${status.toLowerCase()}`);
        await fetchData();
      } else {
        toast.error(json.error || 'Action failed');
      }
    } catch (error) {
      console.error('Leave Module - Error updating status:', error);
      toast.error('Network error updating status');
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Reject with an optional remark ── */
  const openReject = (r: LeaveRequest) => {
    setRejectTarget(r);
    setRejectReason('');
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    const target = rejectTarget;
    setRejectOpen(false);
    await handleStatus(target.id, 'Rejected', rejectReason);
    setRejectTarget(null);
    setRejectReason('');
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch('/api/leave', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Leave request deleted');
        setDeleteOpen(false);
        setDeleteTarget(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Delete failed');
      }
    } catch {
      toast.error('Network error deleting leave request');
    }
  };

  /* ── Render ── */
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Clock} label="Pending Requests" value={pendingCount} color="#ffab40" />
        <StatCard icon={CheckCircle2} label="Approved MTD" value={approvedMTD} color="#00e676" />
        <StatCard icon={XCircle} label="Rejected" value={rejectedCount} color="#ff3d3d" />
        <StatCard icon={UserCheck} label="Currently on Leave" value={currentlyOnLeave} color="#a78bfa" />
      </div>

      {/* Tabs + search row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-[#161c24] border border-[#252e3a] rounded-lg p-1 overflow-x-auto flex-1 min-w-0">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-[6px] rounded-md text-[11px] font-semibold whitespace-nowrap transition-all duration-150 ${activeTab === tab.id ? 'bg-[#f5a623] text-black shadow-sm' : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#141920]'}`}>
              {tab.label}
              {tab.id !== 'all' && (
                <span className={`text-[9px] px-1.5 rounded-full ${activeTab === tab.id ? 'bg-black/20' : 'bg-[#252e3a]'}`}>
                  {records.filter(r => tab.id === 'all' || r.status === tab.id).length}
                </span>
              )}
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="flex items-center gap-1.5 bg-[#161c24] border border-[#252e3a] rounded-lg px-3 py-[7px] min-w-[200px]">
          <FileCheck size={12} className="text-[#5a6878] shrink-0" />
          <input
            value={tableSearch}
            onChange={e => setTableSearch(e.target.value)}
            placeholder="Search employee, type..."
            className="bg-transparent text-[11px] text-[#e2e8f0] outline-none w-full placeholder:text-[#5a6878]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileCheck className="text-[#f5a623]" size={14} />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">
            {activeTab === 'all' ? 'All Leave Requests' : `${activeTab} Requests`}
          </span>
          <span className="ml-auto vc-badge bg-[#252e3a] text-[#8899aa]">{filtered.length}</span>
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0f1318]">
                  {['Employee', 'Site', 'Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center">
                      <CheckCircle2 className="mx-auto text-[#00e676] mb-2" size={24} />
                      <div className="text-[11px] text-[#5a6878]">No leave requests found</div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(r => (
                    <tr key={r.id} className="hover:bg-[#141920] transition-colors">
                      <td className="py-2.5 px-3">
                        <div>
                          <div className="text-[#e2e8f0] font-medium">{r.employee?.name || 'Unknown'}</div>
                          <div className="text-[#5a6878] text-[9px]">{r.employee?.empId || r.empId}</div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[#8899aa] max-w-[100px] truncate">{r.site}</td>
                      <td className="py-2.5 px-3"><span className={`vc-badge ${typeBadge(r.type)}`}>{r.type}</span></td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{fmtDate(r.fromDate)}</td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{fmtDate(r.toDate)}</td>
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-semibold">{r.days}</td>
                      <td className="py-2.5 px-3 text-[#8899aa] max-w-[150px] truncate" title={r.reason}>{r.reason}</td>
                      <td className="py-2.5 px-3"><span className={`vc-badge ${statusBadge(r.status)}`}>{r.status}</span></td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          {r.status === 'Pending' && r.employee?.id !== String(myEmployeeId) && r.canApprove !== false && (
                            <>
                              <button onClick={() => handleStatus(r.id, 'Approved')} disabled={actionLoading === r.id}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-[#00e676]/10 text-[#00e676] hover:bg-[#00e676]/20 border border-[#00e676]/20 transition-all disabled:opacity-50">
                                {actionLoading === r.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                                Approve
                              </button>
                              <button onClick={() => openReject(r)} disabled={actionLoading === r.id}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-[#ff3d3d]/10 text-[#ff3d3d] hover:bg-[#ff3d3d]/20 border border-[#ff3d3d]/20 transition-all disabled:opacity-50">
                                Reject
                              </button>
                            </>
                          )}
                          {r.status === 'Pending' && r.employee?.id === String(myEmployeeId) && (
                            <span className="text-[9px] text-[#5a6878] font-semibold px-2 py-1 bg-[#5a6878]/10 rounded">
                              Your leave
                            </span>
                          )}
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

      {/* Leave Ledger Panel — below approval table */}
      <LeaveLedger leavePolicies={leavePolicies} refreshKey={ledgerVersion} />

      {/* Create Leave Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) { setForm(EMPTY_FORM); setFieldErrors({}); } }}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623] flex items-center gap-2">
              <Plus size={16} /> New Leave Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Employee *</label>
              <select value={form.empId} onChange={e => { updateForm('empId', e.target.value); setFieldErrors(fe => ({ ...fe, empId: '' })); }} className={`vc-input appearance-none ${fieldBorderError(fieldErrors.empId)}`}>
                <option value="">Select employee...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.empId} - {emp.name}</option>
                ))}
              </select>
              <FieldError message={fieldErrors.empId} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Leave Type *</label>
                <select value={form.type} onChange={e => { updateForm('type', e.target.value); setFieldErrors(fe => ({ ...fe, type: '' })); }} className={`vc-input appearance-none ${fieldBorderError(fieldErrors.type)}`}>
                  <option value="">Select Leave Type</option>
                  {form.empId ? (
                    getApplicablePolicies(form.empId).map(policy => (
                      <option key={policy.id} value={policy.code || policy.leaveType}>
                        {policy.name} ({policy.code || policy.leaveType})
                      </option>
                    ))
                  ) : (
                    leavePolicies.filter(p => p.isActive && (!p.applicableTo || p.applicableTo === 'all')).map(policy => (
                      <option key={policy.id} value={policy.code || policy.leaveType}>
                        {policy.name} ({policy.code || policy.leaveType})
                      </option>
                    ))
                  )}
                </select>
                <FieldError message={fieldErrors.type} />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Site</label>
                <select value={form.site} onChange={e => updateForm('site', e.target.value)} className="vc-input appearance-none">
                  <option value="">Auto from employee</option>
                  {Array.from(new Set(employees.map(emp => emp.site).filter(Boolean))).map((s, idx) => (
                    <option key={`site-${idx}-${s}`} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">From Date *</label>
                <input type="date" value={form.fromDate} onChange={e => { updateForm('fromDate', e.target.value); setFieldErrors(fe => ({ ...fe, fromDate: '' })); }} className={`vc-input ${fieldBorderError(fieldErrors.fromDate)}`} />
                <FieldError message={fieldErrors.fromDate} />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">To Date *</label>
                <input type="date" value={form.toDate} onChange={e => { updateForm('toDate', e.target.value); setFieldErrors(fe => ({ ...fe, toDate: '' })); }} className={`vc-input ${fieldBorderError(fieldErrors.toDate)}`} />
                <FieldError message={fieldErrors.toDate} />
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Days (auto-calculated)</label>
              <input type="number" value={form.days} readOnly className="vc-input opacity-60" />
            </div>
            {/* Balance warning */}
            {formBalanceWarning && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-[#ff3d3d]/10 border border-[#ff3d3d]/30 rounded-lg">
                <AlertTriangle size={14} className="text-[#ff3d3d] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#ff3d3d] leading-snug">{formBalanceWarning}</p>
              </div>
            )}
            {/* Remaining balance hint */}
            {!formBalanceWarning && form.empId && form.type && form.days > 0 && (() => {
              const usedMap: Record<string, number> = {};
              records.filter(r => r.employee?.id === form.empId && r.status === 'Approved')
                .forEach(r => { usedMap[r.type] = (usedMap[r.type] || 0) + Number(r.days); });
              const policy = leavePolicies.find(p => (p.code || p.leaveType) === form.type && p.isActive);
              if (!policy) return null;
              const remaining = Number(policy.annualQuota) - (usedMap[form.type] || 0);
              const afterRequest = remaining - form.days;
              return (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#00e676]/8 border border-[#00e676]/20 rounded-lg">
                  <ShieldAlert size={13} className="text-[#00e676] shrink-0" />
                  <p className="text-[11px] text-[#00e676]">
                    {afterRequest} day{afterRequest !== 1 ? 's' : ''} will remain after this request.
                  </p>
                </div>
              );
            })()}
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Reason</label>
              <textarea value={form.reason} onChange={e => updateForm('reason', e.target.value)} rows={3} placeholder="Leave reason..." className="vc-input resize-none" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM); setFieldErrors({}); }} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleCreate} disabled={submitting || !!formBalanceWarning}
              className={`flex items-center gap-1.5 disabled:opacity-50 ${formBalanceWarning ? 'px-4 py-2 rounded-lg text-[12px] font-bold bg-[#ff3d3d] text-white' : 'vc-btn-primary'}`}>
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {formBalanceWarning ? 'Exceeds Balance' : 'Create Request'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d] flex items-center gap-2">
              <AlertTriangle size={16} /> Delete Leave Request
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Are you sure you want to delete the leave request for <strong className="text-[#e2e8f0]">{deleteTarget?.employee?.name}</strong> ({fmtDate(deleteTarget?.fromDate || '')} to {fmtDate(deleteTarget?.toDate || '')})? This action cannot be undone.
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

      {/* Reject with optional remark */}
      <Dialog open={rejectOpen} onOpenChange={(open) => { setRejectOpen(open); if (!open) { setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#ff3d3d] flex items-center gap-2">
              <XCircle size={16} /> Reject Leave Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {rejectTarget && (
              <p className="text-[11px] text-[#8899aa]">
                Rejecting <strong className="text-[#e2e8f0]">{rejectTarget.employee?.name}</strong>&apos;s{' '}
                {rejectTarget.type} leave ({fmtDate(rejectTarget.fromDate)} to {fmtDate(rejectTarget.toDate)}).
              </p>
            )}
            <div>
              <label className="block text-[10px] font-semibold text-[#8899aa] mb-1.5 uppercase tracking-wide">
                Remark <span className="text-[#5a6878] normal-case tracking-normal font-normal">(optional)</span>
              </label>
              <textarea
                className="vc-input resize-none w-full text-[#e2e8f0]"
                rows={3}
                maxLength={500}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Why is this being rejected? The employee will see this."
              />
              <p className="text-[9px] text-[#5a6878] mt-1">
                Shown to the employee along with the approval step that rejected it.
              </p>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setRejectOpen(false)} className="vc-btn-ghost text-[11px] px-3 py-1.5">
              Cancel
            </button>
            <button
              onClick={confirmReject}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#ff3d3d] hover:bg-[#cc2020] text-white transition-all disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
              Reject
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval chain not configured — block error dialog */}
      <Dialog open={!!blockError} onOpenChange={() => setBlockError(null)}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623] flex items-center gap-2">
              <AlertTriangle size={16} /> Cannot Create Leave Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[12px] text-[#8899aa] leading-relaxed">{blockError}</p>
            <div className="px-3 py-2.5 bg-[#f5a623]/10 border border-[#f5a623]/20 rounded-lg text-[11px] text-[#f5a623]">
              An approval chain must be configured for this employee's role in the superadmin portal before leave requests can be submitted.
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setBlockError(null)} className="vc-btn-primary">OK</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
