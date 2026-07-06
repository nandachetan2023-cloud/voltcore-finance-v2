'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, IndianRupee, CheckCircle2, XCircle, Clock,
  RefreshCw, Search, X, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const TYPE_CONFIG = {
  general:         { label: 'General',        color: '#00d4ff', icon: FileText },
  advance_payment: { label: 'Advance Payment', color: '#f5a623', icon: IndianRupee },
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:  { label: 'Pending',  cls: 'bg-[#ffab40]/15 text-[#ffab40]' },
  approved: { label: 'Approved', cls: 'bg-[#00e676]/15 text-[#00e676]' },
  rejected: { label: 'Rejected', cls: 'bg-[#ff3d3d]/15 text-[#ff3d3d]' },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [typeFilter, setTypeFilter] = useState<'all' | 'general' | 'advance_payment'>('all');
  const [actionTarget, setActionTarget] = useState<{ request: any; action: 'approve' | 'reject' } | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [approvedAmount, setApprovedAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [myEmployeeId, setMyEmployeeId] = useState<number | null>(null);

  // Get current user's employeeId to prevent self-approval in the UI
  useEffect(() => {
    try {
      const u = localStorage.getItem('erp_auth_user');
      if (u) {
        const p = JSON.parse(u);
        if (p.employeeId) setMyEmployeeId(Number(p.employeeId));
      }
    } catch {}
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employee-requests');
      const data = await res.json();
      if (data.success) setRequests(data.data);
    } catch { toast.error('Failed to load requests'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleAction = async () => {
    if (!actionTarget) return;

    // Validate approved amount for advance payment approvals
    if (actionTarget.action === 'approve' && actionTarget.request.requestType === 'advance_payment') {
      const requested = Number(actionTarget.request.amount);
      const approved = parseFloat(approvedAmount);
      if (isNaN(approved) || approved <= 0) {
        toast.error('Please enter a valid approved amount');
        return;
      }
      if (approved > requested) {
        toast.error(`Approved amount cannot exceed the requested amount of ₹${requested.toLocaleString('en-IN')}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const body: any = {
        id: actionTarget.request.id,
        action: actionTarget.action,
        rejectionNote: rejectionNote || undefined,
      };

      // Include approvedAmount for advance payment approvals
      if (actionTarget.action === 'approve' && actionTarget.request.requestType === 'advance_payment' && approvedAmount) {
        body.approvedAmount = parseFloat(approvedAmount);
      }

      const res = await fetch('/api/employee-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Request ${actionTarget.action === 'approve' ? 'approved' : 'rejected'}`);
        setActionTarget(null);
        setRejectionNote('');
        setApprovedAmount('');
        fetchRequests();
      } else toast.error(data.error);
    } finally { setSubmitting(false); }
  };

  // Filter
  const filtered = requests.filter(r => {
    if (activeTab !== 'all' && r.status !== activeTab) return false;
    if (typeFilter !== 'all' && r.requestType !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const empName = r.Employee ? `${r.Employee.firstName} ${r.Employee.lastName}`.toLowerCase() : '';
      return empName.includes(q) || r.subject.toLowerCase().includes(q);
    }
    return true;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f5a623]/10 rounded-xl flex items-center justify-center">
            <FileText size={18} className="text-[#f5a623]" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Employee Requests</h2>
            <p className="text-[11px] text-[#5a6878]">Review and action employee requests</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[#161c24] border border-[#252e3a] rounded-lg px-3 py-1.5">
            <Search size={13} className="text-[#5a6878]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search employee or subject..."
              className="bg-transparent text-[12px] text-[#e2e8f0] outline-none w-[180px] placeholder:text-[#5a6878]" />
            {search && <button onClick={() => setSearch('')}><X size={12} className="text-[#5a6878]" /></button>}
          </div>
          <button onClick={fetchRequests} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending Action', value: pendingCount, color: '#ffab40', icon: Clock },
          { label: 'Approved', value: requests.filter(r => r.status === 'approved').length, color: '#00e676', icon: CheckCircle2 },
          { label: 'Rejected', value: requests.filter(r => r.status === 'rejected').length, color: '#ff3d3d', icon: XCircle },
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

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-[#161c24] border border-[#252e3a] rounded-lg p-1">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-3 py-[5px] rounded-md text-[11px] font-semibold capitalize transition-all ${activeTab === t ? 'bg-[#f5a623] text-black' : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#141920]'}`}>
              {t} {t !== 'all' && `(${requests.filter(r => r.status === t).length})`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-[#161c24] border border-[#252e3a] rounded-lg p-1">
          {(['all', 'general', 'advance_payment'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-[5px] rounded-md text-[11px] font-semibold transition-all ${typeFilter === t ? 'bg-[#252e3a] text-[#e2e8f0]' : 'text-[#8899aa] hover:text-[#e2e8f0]'}`}>
              {t === 'all' ? 'All Types' : t === 'general' ? 'General' : 'Advance Payment'}
            </button>
          ))}
        </div>
      </div>

      {/* Requests */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-[#161c24] border border-[#252e3a] rounded-xl">
          <FileText size={28} className="mx-auto text-[#5a6878] mb-2" />
          <p className="text-[12px] text-[#5a6878]">No requests found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const typeCfg = TYPE_CONFIG[r.requestType as keyof typeof TYPE_CONFIG];
            const statusCfg = STATUS_CONFIG[r.status] || STATUS_CONFIG['pending'];
            const Icon = typeCfg?.icon || FileText;
            const empName = r.Employee ? `${r.Employee.firstName} ${r.Employee.lastName}` : 'Unknown';
            const dept = r.Employee?.Department?.name || '';
            return (
              <div key={r.id} className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${typeCfg?.color}15` }}>
                      <Icon size={16} style={{ color: typeCfg?.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-[#e2e8f0]">{r.subject}</span>
                        <span className="text-[9px] font-bold px-2 py-[2px] rounded-full"
                          style={{ background: `${typeCfg?.color}15`, color: typeCfg?.color }}>
                          {typeCfg?.label}
                        </span>
                        <span className={`vc-badge ${statusCfg.cls}`}>{statusCfg.label}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-[#8899aa]">
                        <span className="font-medium text-[#e2e8f0]">{empName}</span>
                        {dept && <><span>·</span><span>{dept}</span></>}
                        {r.Employee?.employeeCode && <><span>·</span><span className="font-mono">{r.Employee.employeeCode}</span></>}
                        {r.status === 'pending' && r.currentStep > 1 && (
                          <><span>·</span>
                          <span className="text-[#f5a623] font-semibold">Step {r.currentStep} of approval</span></>
                        )}
                      </div>
                      <p className="text-[11px] text-[#8899aa] mt-1 line-clamp-2">{r.description}</p>
                      {r.amount && (
                        <div className="flex items-center gap-2 mt-1 text-[12px] font-bold">
                          <span className="flex items-center gap-1 text-[#f5a623]">
                            <IndianRupee size={12} />
                            {Number(r.amount).toLocaleString('en-IN')}
                            <span className="text-[10px] font-normal text-[#8899aa]">requested</span>
                          </span>
                          {r.approvedAmount !== null && r.approvedAmount !== undefined && r.status === 'approved' && (
                            <>
                              <span className="text-[#5a6878]">→</span>
                              <span className="flex items-center gap-1 text-[#00e676]">
                                <IndianRupee size={12} />
                                {Number(r.approvedAmount).toLocaleString('en-IN')}
                                <span className="text-[10px] font-normal text-[#8899aa]">approved</span>
                              </span>
                            </>
                          )}
                        </div>
                      )}
                      {r.status === 'rejected' && r.rejectionNote && (
                        <div className="mt-1.5 px-2 py-1 bg-[#ff3d3d]/10 border border-[#ff3d3d]/20 rounded-md text-[10px] text-[#ff3d3d] flex items-center gap-1">
                          <MessageSquare size={10} /> {r.rejectionNote}
                        </div>
                      )}
                      <div className="text-[10px] text-[#5a6878] mt-1">Submitted {fmtDate(r.createdAt)}</div>
                    </div>
                  </div>

                  {r.status === 'pending' && r.canApprove !== false && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => {
                          setActionTarget({ request: r, action: 'approve' });
                          // Pre-fill approved amount: use previously adjusted amount if set,
                          // otherwise fall back to the original requested amount
                          if (r.requestType === 'advance_payment') {
                            const prefill = r.approvedAmount ?? r.amount;
                            setApprovedAmount(prefill ? String(Number(prefill)) : '');
                          } else {
                            setApprovedAmount('');
                          }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#00e676]/10 text-[#00e676] hover:bg-[#00e676]/20 border border-[#00e676]/20 transition-all">
                        <CheckCircle2 size={12} /> {r.currentStep > 1 ? `Approve (Step ${r.currentStep})` : 'Approve'}
                      </button>
                      <button onClick={() => { setActionTarget({ request: r, action: 'reject' }); setRejectionNote(''); setApprovedAmount(''); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#ff3d3d]/10 text-[#ff3d3d] hover:bg-[#ff3d3d]/20 border border-[#ff3d3d]/20 transition-all">
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  )}
                  {r.status === 'pending' && r.Employee?.id !== myEmployeeId && r.canApprove === false && (
                    <div className="px-3 py-1.5 bg-[#5a6878]/10 border border-[#5a6878]/20 rounded-lg text-[10px] text-[#5a6878] font-semibold">
                      Insufficient level
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Dialog */}
      {actionTarget && (
        <Dialog open onOpenChange={() => { setActionTarget(null); setRejectionNote(''); setApprovedAmount(''); }}>
          <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className={`flex items-center gap-2 ${actionTarget.action === 'approve' ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>
                {actionTarget.action === 'approve' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                {actionTarget.action === 'approve' ? 'Approve Request' : 'Reject Request'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-[12px] text-[#8899aa]">
                {actionTarget.action === 'approve' ? 'Approve' : 'Reject'} request:{' '}
                <span className="text-[#e2e8f0] font-semibold">"{actionTarget.request.subject}"</span>
              </p>

              {/* Advance payment amount adjustment */}
              {actionTarget.action === 'approve' && actionTarget.request.requestType === 'advance_payment' && actionTarget.request.amount && (
                <div className="bg-[#f5a623]/10 border border-[#f5a623]/30 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#8899aa]">Requested Amount:</span>
                    <span className="text-[#f5a623] font-bold flex items-center gap-1">
                      <IndianRupee size={11} />
                      {Number(actionTarget.request.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">
                      Approved Amount (₹) <span className="text-[#ff3d3d]">*</span>
                    </label>
                    <input
                      className="vc-input"
                      type="number"
                      min="1"
                      max={Number(actionTarget.request.amount)}
                      value={approvedAmount}
                      onChange={e => setApprovedAmount(e.target.value)}
                      placeholder="Enter approved amount"
                    />
                    <p className="text-[9px] text-[#5a6878] mt-1">
                      You can approve the full amount or reduce it. Cannot exceed the requested amount.
                    </p>
                  </div>
                </div>
              )}

              {actionTarget.action === 'reject' && (
                <div>
                  <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Reason for Rejection</label>
                  <textarea className="vc-input resize-none" rows={3} value={rejectionNote}
                    onChange={e => setRejectionNote(e.target.value)} placeholder="Optional reason..." />
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" className="bg-[#1a2332] text-[#8899aa] border border-[#2e3a48]"
                onClick={() => { setActionTarget(null); setRejectionNote(''); setApprovedAmount(''); }}>Cancel</Button>
              <Button
                className={actionTarget.action === 'approve' ? 'bg-[#00e676] text-black hover:bg-[#00c853] font-semibold' : 'bg-[#ff3d3d] text-white hover:bg-[#e63535] font-semibold'}
                disabled={submitting} onClick={handleAction}>
                {submitting ? 'Processing...' : actionTarget.action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
