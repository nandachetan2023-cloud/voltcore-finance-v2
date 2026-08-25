'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Check, XCircle, MapPin, Calendar, RefreshCw, Plane } from 'lucide-react';
import { toast } from 'sonner';

interface TourRequest {
  id: number;
  employeeId: number;
  fromDate: string;
  toDate: string;
  days: number;
  destination: string;
  purpose: string;
  remarks?: string;
  status: string;
  appliedDate: string;
  approvedDate?: string;
  rejectedDate?: string;
  rejectionReason?: string;
  canApprove?: boolean;
  Employee?: {
    id: number;
    employeeCode: string;
    firstName: string;
    lastName: string;
    Branch?: { name: string };
  };
}

const inp = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]/60 transition-colors placeholder:text-[#5a6878]';
const lbl = 'block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5';

export default function TourRequests() {
  const [requests, setRequests] = useState<TourRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [employees, setEmployees] = useState<{ id: number; employeeCode: string; name: string }[]>([]);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [form, setForm] = useState({
    employeeId: '',
    fromDate: '',
    toDate: '',
    destination: '',
    purpose: '',
    remarks: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter !== 'all' ? `/api/tour-requests?status=${filter}` : '/api/tour-requests';
      const [trRes, empRes] = await Promise.all([
        fetch(url).then(r => r.json()),
        fetch('/api/employees?active=true').then(r => r.json()),
      ]);
      if (trRes.success) setRequests(trRes.data);
      if (empRes.success) {
        setEmployees(empRes.data.map((e: any) => ({
          id: e.id,
          employeeCode: e.employeeCode,
          name: `${e.firstName} ${e.lastName}`,
        })));
      }
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const calculateDays = (from: string, to: string) => {
    if (!from || !to) return 0;
    const diff = new Date(to).getTime() - new Date(from).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmit = async () => {
    if (!form.employeeId || !form.fromDate || !form.toDate || !form.destination || !form.purpose) {
      toast.error('Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      const days = calculateDays(form.fromDate, form.toDate);
      const res = await fetch('/api/tour-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, days }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Tour request submitted');
        setShowForm(false);
        setForm({ employeeId: '', fromDate: '', toDate: '', destination: '', purpose: '', remarks: '' });
        fetchData();
      } else toast.error(data.error);
    } finally { setSaving(false); }
  };

  const handleApprove = async (id: number) => {
    const res = await fetch('/api/tour-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'approve' }),
    });
    const data = await res.json();
    if (data.success) { toast.success('Tour approved — days will count as paid attendance'); fetchData(); }
    else toast.error(data.error);
  };

  const handleReject = async () => {
    if (!rejectId) return;
    const res = await fetch('/api/tour-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rejectId, action: 'reject', rejectionReason: rejectReason }),
    });
    const data = await res.json();
    if (data.success) { toast.success('Tour request rejected'); setRejectId(null); setRejectReason(''); fetchData(); }
    else toast.error(data.error);
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-[#ffab40]/10 text-[#ffab40]',
      approved: 'bg-[#00e676]/10 text-[#00e676]',
      rejected: 'bg-[#ff3d3d]/10 text-[#ff3d3d]',
    };
    return (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${styles[status] || 'bg-[#252e3a] text-[#8899aa]'}`}>
        {status}
      </span>
    );
  };

  const days = calculateDays(form.fromDate, form.toDate);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f5a623]/10 rounded-xl flex items-center justify-center">
            <Plane size={18} className="text-[#f5a623]" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Tour Requests</h2>
            <p className="text-[11px] text-[#5a6878]">Apply for on-duty tours — approved days count as paid attendance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchData()} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0] transition-colors">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] transition-colors">
            <Plus size={13} /> New Tour Request
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg capitalize transition-colors ${
              filter === f ? 'bg-[#f5a623] text-black' : 'text-[#5a6878] hover:text-[#e2e8f0]'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-semibold text-[#e2e8f0]">New Tour Request</h3>
            <button onClick={() => setShowForm(false)}><X size={15} className="text-[#5a6878]" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Employee *</label>
              <select className={inp} value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}>
                <option value="">Select employee</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.employeeCode})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Destination *</label>
              <input className={inp} value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} placeholder="City / Location" />
            </div>
            <div>
              <label className={lbl}>From Date *</label>
              <input className={inp} type="date" value={form.fromDate} onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>To Date *</label>
              <input className={inp} type="date" value={form.toDate} onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Purpose *</label>
              <input className={inp} value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="Reason for tour / on-duty" />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Remarks</label>
              <textarea className={inp + ' min-h-[60px]'} value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Additional notes (optional)" />
            </div>
          </div>
          {days > 0 && (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-[#f5a623]">
              <Calendar size={12} /> Tour duration: <span className="font-bold">{days} day{days > 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} disabled={saving}
              className="px-4 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] disabled:opacity-50 transition-colors">
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 text-[12px] text-[#8899aa] border border-[#252e3a] rounded-lg hover:border-[#f5a623] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="bg-[#161c24] border border-[#ff3d3d]/30 rounded-xl p-4">
          <h3 className="text-[12px] font-semibold text-[#e2e8f0] mb-2">Reject Tour Request #{rejectId}</h3>
          <textarea className={inp + ' min-h-[60px] mb-3'} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection (optional)" />
          <div className="flex gap-2">
            <button onClick={handleReject} className="px-3 py-1.5 bg-[#ff3d3d] text-white text-[11px] font-bold rounded-lg">Confirm Reject</button>
            <button onClick={() => { setRejectId(null); setRejectReason(''); }} className="px-3 py-1.5 text-[11px] text-[#8899aa] border border-[#252e3a] rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {/* Requests list */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw size={20} className="animate-spin text-[#5a6878]" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-[#161c24] border border-[#252e3a] rounded-xl">
          <Plane size={32} className="mx-auto text-[#5a6878] mb-3" />
          <p className="text-[13px] font-semibold text-[#e2e8f0] mb-1">No tour requests</p>
          <p className="text-[11px] text-[#5a6878]">Create a new tour request to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map(tr => (
            <div key={tr.id} className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 hover:border-[#f5a623]/20 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[13px] font-semibold text-[#e2e8f0]">
                      {tr.Employee ? `${tr.Employee.firstName} ${tr.Employee.lastName}` : `Employee #${tr.employeeId}`}
                    </span>
                    <span className="text-[10px] text-[#5a6878]">{tr.Employee?.employeeCode}</span>
                    {statusBadge(tr.status)}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#8899aa] mb-1">
                    <span className="flex items-center gap-1"><MapPin size={11} /> {tr.destination}</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {new Date(tr.fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} — {new Date(tr.toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="font-semibold text-[#f5a623]">{(Number(tr.days) || 0)} day{(Number(tr.days) || 0) > 1 ? 's' : ''}</span>
                  </div>
                  <p className="text-[11px] text-[#5a6878]">{tr.purpose}</p>
                  {tr.rejectionReason && (
                    <p className="text-[10px] text-[#ff3d3d] mt-1">Rejected: {tr.rejectionReason}</p>
                  )}
                </div>
                {tr.canApprove && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => handleApprove(tr.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/30 rounded-lg hover:bg-[#00e676]/20 transition-colors">
                      <Check size={11} /> Approve
                    </button>
                    <button onClick={() => setRejectId(tr.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold bg-[#ff3d3d]/10 text-[#ff3d3d] border border-[#ff3d3d]/30 rounded-lg hover:bg-[#ff3d3d]/20 transition-colors">
                      <XCircle size={11} /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
