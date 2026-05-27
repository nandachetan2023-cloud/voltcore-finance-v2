'use client';
import { useState, useEffect, useCallback } from 'react';
import { UserX, Plus, CheckCircle2, Clock, XCircle, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FieldError, fieldBorderError } from '@/components/ui/field-error';
import { type FieldErrors } from '@/lib/form-validation';

const STATUS_COLORS: Record<string, string> = {
  pending: '#ffab40', approved: '#00e676', rejected: '#ff3d3d',
  withdrawn: '#5a6878', notice_period: '#00d4ff',
};

interface CurrentUser {
  isAdmin: boolean;
  deptName: string | null;
  employeeId: number | null;
  isLevel1: boolean;
}

export default function OffboardingModule() {
  const [resignations, setResignations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ employeeId: '', reason: '', requestedLwd: '', buyoutDays: '0' });
  const [offboardFieldErrors, setOffboardFieldErrors] = useState<FieldErrors>({});
  const [currentUser, setCurrentUser] = useState<CurrentUser>({ isAdmin: false, deptName: null, employeeId: null, isLevel1: false });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, eRes] = await Promise.all([
        fetch('/api/offboarding').then(r => r.json()),
        fetch('/api/employees').then(r => r.json()),
      ]);
      if (rRes.success) {
        setResignations(rRes.data);
        if (rRes.currentUser) setCurrentUser(rRes.currentUser);
      }
      if (eRes.success) setEmployees(eRes.data.filter((e: any) => ['active', 'notice_period'].includes(e.employmentStatus)));
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const submit = async () => {
    const errors: FieldErrors = {}
    if (!form.employeeId) errors.employeeId = 'Employee is required'
    if (!form.reason) errors.reason = 'Reason is required'
    if (!form.requestedLwd) errors.requestedLwd = 'Last Working Day is required'
    setOffboardFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    setSubmitting(true);
    try {
      const res = await fetch('/api/offboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) {
        toast.success('Resignation submitted');
        fetchData();
        setShowForm(false);
        setForm({ employeeId: '', reason: '', requestedLwd: '', buyoutDays: '0' });
        setOffboardFieldErrors({});
      } else toast.error(data.error);
    } finally { setSubmitting(false); }
  };

  const action = async (id: number, act: string, rejectionReason?: string) => {
    const res = await fetch('/api/offboarding', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: act, rejectionReason }) });
    const data = await res.json();
    if (data.success) { toast.success('Updated'); fetchData(); }
    else toast.error(data.error);
  };

  const updateClearance = async (clearanceId: number, newStatus: string) => {
    const res = await fetch('/api/offboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clearanceId, clearanceStatus: newStatus }),
    });
    const data = await res.json();
    if (data.success) {
      if (data.allCleared) toast.success('🎉 All clearances done — resignation approved!', { duration: 5000 });
      else toast.success('Clearance updated');
      fetchData();
    } else toast.error(data.error);
  };

  // Determine if the current user can act on a specific clearance
  // Must be admin OR (level-1 role AND matching department)
  const canActOnClearance = (clearanceDept: string) => {
    if (currentUser.isAdmin) return true;
    if (!currentUser.isLevel1 || !currentUser.deptName) return false;
    return clearanceDept.toLowerCase().trim() === currentUser.deptName.toLowerCase().trim();
  };

  // Which clearances should be visible to this user
  const visibleClearances = (clearances: any[]) => {
    if (currentUser.isAdmin) return clearances;
    return clearances.filter(c => canActOnClearance(c.department));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" />
    </div>
  );

  // Access denied for non-admin, non-level-1 users
  if (!currentUser.isAdmin && !currentUser.isLevel1) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center h-[400px] bg-[#161c24] border border-[#252e3a] rounded-xl">
          <div className="w-16 h-16 bg-[#ff3d3d]/10 rounded-full flex items-center justify-center mb-4">
            <UserX size={32} className="text-[#ff3d3d]" />
          </div>
          <h3 className="text-[16px] font-bold text-[#e2e8f0] mb-2">Access Restricted</h3>
          <p className="text-[12px] text-[#5a6878] text-center max-w-md">
            Only Level-1 role employees and administrators can access the offboarding module.
          </p>
          <p className="text-[11px] text-[#3a4a5a] mt-2">
            Contact your administrator if you need access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#ff3d3d]/10 rounded-xl flex items-center justify-center">
            <UserX size={18} className="text-[#ff3d3d]" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Offboarding</h2>
            <p className="text-[11px] text-[#5a6878]">Manage resignations and exit clearances</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Show current user's dept context */}
          {!currentUser.isAdmin && currentUser.deptName && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20 font-semibold uppercase">
              {currentUser.deptName} dept
            </span>
          )}
          {currentUser.isAdmin && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-[#f5a623]/10 text-[#f5a623] border border-[#f5a623]/20 font-semibold">
              Admin — all depts
            </span>
          )}
          <button onClick={fetchData} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
          {currentUser.isAdmin && (
            <button onClick={() => { setShowForm(true); setOffboardFieldErrors({}); }} className="flex items-center gap-1.5 px-3 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a]">
              <Plus size={13} /> New Resignation
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', value: resignations.filter(r => r.status === 'pending').length, color: '#ffab40', icon: Clock },
          { label: 'In Notice', value: resignations.filter(r => r.status === 'approved').length, color: '#00d4ff', icon: AlertTriangle },
          { label: 'Completed', value: resignations.filter(r => r.status === 'withdrawn').length, color: '#5a6878', icon: CheckCircle2 },
        ].map(s => (
          <div key={s.label} className="vc-stat-card">
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: s.color }} />
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">{s.label}</div>
                <div className="text-[22px] font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: s.color }}>{s.value}</div>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15` }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {resignations.map(r => {
          const myVisible = visibleClearances(r.clearances || []);
          const totalClearances = r.clearances?.length || 0;
          const clearedCount = r.clearances?.filter((c: any) => c.status === 'cleared').length || 0;

          return (
            <div key={r.id} className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#1a2028]"
                onClick={() => setExpanded(s => { const n = new Set(s); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#ff3d3d]/10 flex items-center justify-center text-[12px] font-bold text-[#ff3d3d]">
                    {r.Employee?.firstName?.[0]}{r.Employee?.lastName?.[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-[#e2e8f0]">{r.Employee?.firstName} {r.Employee?.lastName}</span>
                      <span className="text-[9px] text-[#5a6878]">{r.Employee?.Department?.name}</span>
                      <span className="text-[9px] px-2 py-[2px] rounded-full" style={{ background: `${STATUS_COLORS[r.status]}15`, color: STATUS_COLORS[r.status] }}>{r.status}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="text-[10px] text-[#5a6878]">
                        LWD: {r.calculatedLwd ? new Date(r.calculatedLwd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        {' · '}{r.noticePeriodDays}d notice
                        {r.buyoutDays > 0 && ` · ${r.buyoutDays}d buyout`}
                      </div>
                      {/* Clearance progress pill */}
                      {totalClearances > 0 && (
                        <span className={`text-[9px] px-2 py-[2px] rounded-full font-semibold ${clearedCount === totalClearances ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-[#ffab40]/10 text-[#ffab40]'}`}>
                          {clearedCount}/{totalClearances} cleared
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentUser.isAdmin && r.status === 'pending' && (
                    <>
                      <button onClick={e => { e.stopPropagation(); action(r.id, 'approve_manager'); }} className="px-2.5 py-1.5 text-[10px] font-semibold bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/20 rounded-lg hover:bg-[#00e676]/20">Approve</button>
                      <button onClick={e => { e.stopPropagation(); action(r.id, 'reject'); }} className="px-2.5 py-1.5 text-[10px] font-semibold bg-[#ff3d3d]/10 text-[#ff3d3d] border border-[#ff3d3d]/20 rounded-lg hover:bg-[#ff3d3d]/20">Reject</button>
                    </>
                  )}
                  {expanded.has(r.id) ? <ChevronUp size={14} className="text-[#5a6878]" /> : <ChevronDown size={14} className="text-[#5a6878]" />}
                </div>
              </div>

              {expanded.has(r.id) && (
                <div className="border-t border-[#252e3a] p-4 space-y-3">
                  <div className="text-[11px] text-[#8899aa]">
                    <span className="text-[#5a6878] font-semibold">Reason: </span>{r.reason}
                  </div>

                  {myVisible.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-2">
                        {currentUser.isAdmin ? 'All Departmental Clearances' : 'Your Department Clearance'}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {myVisible.map((c: any) => {
                          const isCleared = c.status === 'cleared';
                          const canAct = canActOnClearance(c.department);
                          return (
                            <div key={c.id} className="flex flex-col items-center gap-1 min-w-[80px]">
                              <button
                                onClick={() => canAct && !isCleared && updateClearance(c.id, 'cleared')}
                                disabled={!canAct || isCleared}
                                title={
                                  isCleared ? 'Already cleared'
                                  : !canAct ? 'Not your department'
                                  : `Approve ${c.department} clearance`
                                }
                                className={`w-full flex flex-col items-center gap-1 p-2.5 rounded-lg border text-[10px] font-semibold transition-all
                                  ${isCleared
                                    ? 'bg-[#00e676]/10 border-[#00e676]/30 text-[#00e676] cursor-default'
                                    : canAct
                                      ? 'bg-[#252e3a] border-[#2e3a48] text-[#8899aa] hover:border-[#f5a623]/60 hover:text-[#f5a623] cursor-pointer'
                                      : 'bg-[#0d1117] border-[#1e2a38] text-[#3a4a5a] cursor-not-allowed opacity-60'
                                  }`}
                              >
                                {isCleared
                                  ? <CheckCircle2 size={14} className="text-[#00e676]" />
                                  : canAct
                                    ? <Clock size={14} />
                                    : <Lock size={14} />
                                }
                                <span className="capitalize">{c.department}</span>
                              </button>
                              {isCleared && c.clearedAt && (
                                <span className="text-[8px] text-[#5a6878] text-center">
                                  {new Date(c.clearedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Show pending clearances from other depts (read-only) for non-admin */}
                      {!currentUser.isAdmin && r.clearances?.length > myVisible.length && (
                        <div className="mt-2 pt-2 border-t border-[#1e2a38]">
                          <div className="text-[9px] text-[#3a4a5a] uppercase tracking-wider mb-1.5">Other departments</div>
                          <div className="flex flex-wrap gap-1.5">
                            {r.clearances
                              .filter((c: any) => !canActOnClearance(c.department))
                              .map((c: any) => (
                                <span key={c.id} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-semibold border
                                  ${c.status === 'cleared'
                                    ? 'bg-[#00e676]/8 border-[#00e676]/20 text-[#00e676]'
                                    : 'bg-[#0d1117] border-[#1e2a38] text-[#3a4a5a]'
                                  }`}>
                                  {c.status === 'cleared' ? <CheckCircle2 size={9} /> : <Lock size={9} />}
                                  <span className="capitalize">{c.department}</span>
                                </span>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* All cleared banner */}
                  {clearedCount === totalClearances && totalClearances > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-[#00e676]/8 border border-[#00e676]/20 rounded-lg">
                      <CheckCircle2 size={15} className="text-[#00e676]" />
                      <div>
                        <div className="text-[12px] font-semibold text-[#00e676]">All Clearances Complete</div>
                        <div className="text-[10px] text-[#5a6878]">Resignation has been approved</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {resignations.length === 0 && (
          <div className="text-center py-12 bg-[#161c24] border border-[#252e3a] rounded-xl">
            <UserX size={28} className="mx-auto text-[#5a6878] mb-2" />
            <p className="text-[12px] text-[#5a6878]">No resignations on record.</p>
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setOffboardFieldErrors({}); }}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623] flex items-center gap-2"><UserX size={16} /> Submit Resignation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Employee *</label>
              <select className={`vc-input appearance-none ${fieldBorderError(offboardFieldErrors.employeeId)}`} value={form.employeeId} onChange={e => { setForm(f => ({ ...f, employeeId: e.target.value })); setOffboardFieldErrors(fe => ({ ...fe, employeeId: '' })); }}>
                <option value="">Select employee...</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.employeeCode} — {e.firstName} {e.lastName}</option>)}
              </select>
              <FieldError message={offboardFieldErrors.employeeId} />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Requested Last Working Day *</label>
              <input type="date" className={`vc-input ${fieldBorderError(offboardFieldErrors.requestedLwd)}`} value={form.requestedLwd} onChange={e => { setForm(f => ({ ...f, requestedLwd: e.target.value })); setOffboardFieldErrors(fe => ({ ...fe, requestedLwd: '' })); }} />
              <FieldError message={offboardFieldErrors.requestedLwd} />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Buyout Days</label>
              <input type="number" min="0" className="vc-input" value={form.buyoutDays} onChange={e => setForm(f => ({ ...f, buyoutDays: e.target.value }))} />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Reason *</label>
              <textarea className={`vc-input resize-none ${fieldBorderError(offboardFieldErrors.reason)}`} rows={3} value={form.reason} onChange={e => { setForm(f => ({ ...f, reason: e.target.value })); setOffboardFieldErrors(fe => ({ ...fe, reason: '' })); }} placeholder="Reason for resignation..." />
              <FieldError message={offboardFieldErrors.reason} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#1a2332] text-[#8899aa] border border-[#2e3a48]" onClick={() => { setShowForm(false); setOffboardFieldErrors({}); }}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={submit}>
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
