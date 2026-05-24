'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, X, MapPin, Calendar, RefreshCw, Plane, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TourRequest {
  id: number;
  fromDate: string;
  toDate: string;
  days: number;
  destination: string;
  purpose: string;
  remarks?: string;
  status: string;
  appliedDate: string;
  approvedDate?: string;
  rejectionReason?: string;
}

const inp = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]/60 transition-colors placeholder:text-[#5a6878]';
const lbl = 'block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5';

export default function MyTours() {
  const [requests, setRequests] = useState<TourRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employeeId, setEmployeeId] = useState<number | null>(null);

  const [form, setForm] = useState({
    fromDate: '',
    toDate: '',
    destination: '',
    purpose: '',
    remarks: '',
  });

  useEffect(() => {
    const stored = localStorage.getItem('erp_employee_id');
    if (stored) setEmployeeId(parseInt(stored));
  }, []);

  const fetchData = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tour-requests?employeeId=${employeeId}`);
      const data = await res.json();
      if (data.success) setRequests(data.data);
    } catch { toast.error('Failed to load tour requests'); }
    finally { setLoading(false); }
  }, [employeeId]);

  useEffect(() => { if (employeeId) fetchData(); }, [employeeId, fetchData]);

  const calculateDays = (from: string, to: string) => {
    if (!from || !to) return 0;
    return Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmit = async () => {
    if (!form.fromDate || !form.toDate || !form.destination || !form.purpose) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!employeeId) { toast.error('Employee ID not found. Please re-login.'); return; }
    setSaving(true);
    try {
      const days = calculateDays(form.fromDate, form.toDate);
      const res = await fetch('/api/tour-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, employeeId, days }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Tour request submitted for approval');
        setShowForm(false);
        setForm({ fromDate: '', toDate: '', destination: '', purpose: '', remarks: '' });
        fetchData();
      } else toast.error(data.error);
    } finally { setSaving(false); }
  };

  const statusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle2 size={14} className="text-[#00e676]" />;
    if (status === 'rejected') return <XCircle size={14} className="text-[#ff3d3d]" />;
    return <Clock size={14} className="text-[#ffab40]" />;
  };

  const days = calculateDays(form.fromDate, form.toDate);

  if (!employeeId) {
    return (
      <div className="p-4 text-center text-[#5a6878] text-[12px]">
        Employee ID not found. Please ensure your account is linked to an employee record.
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f5a623]/10 rounded-xl flex items-center justify-center">
            <Plane size={18} className="text-[#f5a623]" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">My Tour Requests</h2>
            <p className="text-[11px] text-[#5a6878]">Apply for on-duty tours — approved days count as paid attendance</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] transition-colors">
          <Plus size={13} /> Apply for Tour
        </button>
      </div>

      {/* Apply form */}
      {showForm && (
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-semibold text-[#e2e8f0]">New Tour Request</h3>
            <button onClick={() => setShowForm(false)}><X size={15} className="text-[#5a6878]" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>From Date *</label>
              <input className={inp} type="date" value={form.fromDate} onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>To Date *</label>
              <input className={inp} type="date" value={form.toDate} onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Destination *</label>
              <input className={inp} value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} placeholder="City / Location you are visiting" />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Purpose *</label>
              <input className={inp} value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="Reason for the tour / on-duty visit" />
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

      {/* Requests list */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw size={20} className="animate-spin text-[#5a6878]" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-[#161c24] border border-[#252e3a] rounded-xl">
          <Plane size={32} className="mx-auto text-[#5a6878] mb-3" />
          <p className="text-[13px] font-semibold text-[#e2e8f0] mb-1">No tour requests yet</p>
          <p className="text-[11px] text-[#5a6878]">Apply for a tour when you need to travel for work</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map(tr => (
            <div key={tr.id} className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
              <div className="flex items-start gap-3">
                {statusIcon(tr.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[12px] font-semibold text-[#e2e8f0]">{tr.destination}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                      tr.status === 'approved' ? 'bg-[#00e676]/10 text-[#00e676]' :
                      tr.status === 'rejected' ? 'bg-[#ff3d3d]/10 text-[#ff3d3d]' :
                      'bg-[#ffab40]/10 text-[#ffab40]'
                    }`}>{tr.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#8899aa]">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {new Date(tr.fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} — {new Date(tr.toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="font-semibold text-[#f5a623]">{Number(tr.days)} day{Number(tr.days) > 1 ? 's' : ''}</span>
                  </div>
                  <p className="text-[11px] text-[#5a6878] mt-1">{tr.purpose}</p>
                  {tr.rejectionReason && (
                    <p className="text-[10px] text-[#ff3d3d] mt-1">Reason: {tr.rejectionReason}</p>
                  )}
                </div>
                <span className="text-[10px] text-[#5a6878] shrink-0">
                  {new Date(tr.appliedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
