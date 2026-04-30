'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, IndianRupee, Plus, Trash2, Clock, CheckCircle2,
  XCircle, RefreshCw, AlertTriangle, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const TYPE_CONFIG = {
  general:         { label: 'General Request',  color: '#00d4ff', icon: FileText },
  advance_payment: { label: 'Advance Payment',  color: '#f5a623', icon: IndianRupee },
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:  { label: 'Pending',  cls: 'bg-[#ffab40]/15 text-[#ffab40]' },
  approved: { label: 'Approved', cls: 'bg-[#00e676]/15 text-[#00e676]' },
  rejected: { label: 'Rejected', cls: 'bg-[#ff3d3d]/15 text-[#ff3d3d]' },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MyRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'general' | 'advance_payment'>('all');

  const emptyForm = { requestType: 'general', subject: '', description: '', amount: '' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const match = document.cookie.match(/(^| )erp_employee_id=([^;]+)/);
    if (match) { setEmployeeId(decodeURIComponent(match[2])); return; }
    try {
      const u = localStorage.getItem('erp_auth_user');
      if (u) { const p = JSON.parse(u); if (p.employeeId) setEmployeeId(String(p.employeeId)); }
    } catch {}
  }, []);

  const fetchRequests = useCallback(async (empId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employee-requests?employeeId=${empId}`);
      const data = await res.json();
      if (data.success) setRequests(data.data);
    } catch { toast.error('Failed to load requests'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (employeeId) fetchRequests(employeeId);
    else setLoading(false);
  }, [employeeId, fetchRequests]);

  const handleSubmit = async () => {
    if (!employeeId || !form.subject || !form.description) {
      toast.error('Subject and description are required');
      return;
    }
    if (form.requestType === 'advance_payment' && (!form.amount || parseFloat(form.amount) <= 0)) {
      toast.error('Please enter a valid amount for advance payment request');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/employee-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: parseInt(employeeId),
          requestType: form.requestType,
          subject: form.subject,
          description: form.description,
          amount: form.requestType === 'advance_payment' ? parseFloat(form.amount) : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Request submitted successfully');
        setCreateOpen(false);
        setForm(emptyForm);
        fetchRequests(employeeId);
      } else if (res.status === 422) {
        setCreateOpen(false);
        setBlockError(data.error || 'No approval chain is configured for your role.');
      } else toast.error(data.error || 'Failed to submit request');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Cancel this request?')) return;
    const res = await fetch('/api/employee-requests', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.success) { toast.success('Request cancelled'); if (employeeId) fetchRequests(employeeId); }
    else toast.error(data.error);
  };

  const filtered = activeTab === 'all' ? requests : requests.filter(r => r.requestType === activeTab);

  if (!employeeId) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle size={32} className="mx-auto text-[#f5a623] mb-3" />
        <p className="text-[13px] font-semibold text-[#e2e8f0] mb-1">Employee profile not linked</p>
        <p className="text-[11px] text-[#5a6878]">Contact your administrator to link your account to an employee record.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f5a623]/10 rounded-xl flex items-center justify-center">
            <FileText size={18} className="text-[#f5a623]" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">My Requests</h2>
            <p className="text-[11px] text-[#5a6878]">Submit general or advance payment requests</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => employeeId && fetchRequests(employeeId)} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => { setForm(emptyForm); setCreateOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] transition-colors">
            <Plus size={13} /> New Request
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', value: requests.filter(r => r.status === 'pending').length, color: '#ffab40', icon: Clock },
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

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-[#161c24] border border-[#252e3a] rounded-lg p-1">
        {[
          { id: 'all', label: 'All' },
          { id: 'general', label: 'General' },
          { id: 'advance_payment', label: 'Advance Payment' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`px-3 py-[6px] rounded-md text-[11px] font-semibold transition-all ${activeTab === t.id ? 'bg-[#f5a623] text-black' : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#141920]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Requests list */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-[#161c24] border border-[#252e3a] rounded-xl">
          <FileText size={28} className="mx-auto text-[#5a6878] mb-2" />
          <p className="text-[12px] text-[#5a6878]">No requests yet. Click "New Request" to submit one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const typeCfg = TYPE_CONFIG[r.requestType as keyof typeof TYPE_CONFIG];
            const statusCfg = STATUS_CONFIG[r.status] || STATUS_CONFIG['pending'];
            const Icon = typeCfg?.icon || FileText;
            return (
              <div key={r.id} className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
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
                      <p className="text-[11px] text-[#8899aa] mt-1 line-clamp-2">{r.description}</p>
                      {r.amount && (
                        <div className="flex items-center gap-2 mt-1 text-[11px] font-semibold flex-wrap">
                          <span className="flex items-center gap-1 text-[#f5a623]">
                            <IndianRupee size={11} />
                            {Number(r.amount).toLocaleString('en-IN')}
                            <span className="text-[10px] font-normal text-[#8899aa]">requested</span>
                          </span>
                          {r.approvedAmount !== null && r.approvedAmount !== undefined && r.status === 'approved' && (
                            <>
                              <span className="text-[#5a6878]">→</span>
                              <span className="flex items-center gap-1 text-[#00e676]">
                                <IndianRupee size={11} />
                                {Number(r.approvedAmount).toLocaleString('en-IN')}
                                <span className="text-[10px] font-normal text-[#8899aa]">approved</span>
                              </span>
                              {Number(r.approvedAmount) < Number(r.amount) && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#ffab40]/15 text-[#ffab40] font-semibold">
                                  Partially Approved
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      {r.status === 'rejected' && r.rejectionNote && (
                        <div className="mt-1.5 px-2 py-1 bg-[#ff3d3d]/10 border border-[#ff3d3d]/20 rounded-md text-[10px] text-[#ff3d3d]">
                          Reason: {r.rejectionNote}
                        </div>
                      )}
                      <div className="text-[10px] text-[#5a6878] mt-1">Submitted {fmtDate(r.createdAt)}</div>
                    </div>
                  </div>
                  {r.status === 'pending' && (
                    <button onClick={() => handleDelete(r.id)} className="p-1.5 text-[#5a6878] hover:text-[#ff3d3d] transition-colors shrink-0">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Request Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623] flex items-center gap-2">
              <Send size={16} /> New Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Request Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button key={key} type="button" onClick={() => setForm(f => ({ ...f, requestType: key }))}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${form.requestType === key ? 'border-[#f5a623] bg-[#f5a623]/10' : 'border-[#252e3a] hover:border-[#f5a623]/40'}`}>
                      <Icon size={16} style={{ color: cfg.color }} />
                      <span className="text-[11px] font-semibold text-[#e2e8f0]">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Subject *</label>
              <input className="vc-input" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Brief subject of your request" />
            </div>
            {form.requestType === 'advance_payment' && (
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Amount (₹) *</label>
                <input className="vc-input" type="number" min="1" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="Enter amount" />
              </div>
            )}
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Description *</label>
              <textarea className="vc-input resize-none" rows={4} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={form.requestType === 'advance_payment'
                  ? 'Explain why you need the advance payment...'
                  : 'Describe your request in detail...'} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#1a2332] text-[#8899aa] border border-[#2e3a48]" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={handleSubmit}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval chain not configured — block error dialog */}
      <Dialog open={!!blockError} onOpenChange={() => setBlockError(null)}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623] flex items-center gap-2">
              <AlertTriangle size={16} /> Cannot Submit Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[12px] text-[#8899aa] leading-relaxed">{blockError}</p>
            <div className="px-3 py-2.5 bg-[#f5a623]/10 border border-[#f5a623]/20 rounded-lg text-[11px] text-[#f5a623]">
              Please contact your system administrator to configure an approval workflow for your role.
            </div>
          </div>
          <DialogFooter>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" onClick={() => setBlockError(null)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
