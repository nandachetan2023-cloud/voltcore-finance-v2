'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, UserX, CalendarOff, Clock, Plus, Pencil, Trash2,
  AlertTriangle, Loader2, Search
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';

interface EmployeeInfo { id: string; empId: string; name: string; }

interface AttendanceRecord {
  id: string;
  empId: string;
  site: string;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  otHours: number;
  shift: string | null;
  status: string;
  employee: EmployeeInfo;
}

interface AttendanceFormData {
  empId: string;
  site: string;
  date: string;
  timeIn: string;
  timeOut: string;
  otHours: number;
  shift: string;
  status: string;
}

const SHIFTS = ['Day A', 'Day B', 'Night B', 'General'];
const STATUSES = ['Present', 'Absent', 'Late', 'On Leave', 'Half Day'];

const emptyForm: AttendanceFormData = {
  empId: '', site: '', date: '', timeIn: '', timeOut: '', otHours: 0, shift: 'Day A', status: 'Present',
};

const statusColor = (s: string) => {
  switch (s) {
    case 'Present': return 'bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30';
    case 'Absent': return 'bg-[#ff3d3d]/15 text-[#ff3d3d] border border-[#ff3d3d]/30';
    case 'On Leave': return 'bg-[#ffab40]/15 text-[#ffab40] border border-[#ffab40]/30';
    case 'Late': return 'bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30';
    case 'Half Day': return 'bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30';
    default: return 'bg-[#5a6878]/15 text-[#5a6878] border border-[#5a6878]/30';
  }
};

const shiftColor = (s: string) => {
  switch (s) {
    case 'Day A': return 'bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30';
    case 'Day B': return 'bg-[#f5a623]/15 text-[#f5a623] border border-[#f5a623]/30';
    case 'Night B': return 'bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30';
    default: return 'bg-[#8899aa]/15 text-[#8899aa] border border-[#8899aa]/30';
  }
};

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number; color: string;
}) {
  return (
    <div className="vc-stat-card">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] text-[#5a6878] font-semibold uppercase tracking-wider mb-1">{label}</div>
          <div className="text-[28px] font-bold leading-none" style={{ fontFamily: "'Share Tech Mono', monospace", color }}>{value}</div>
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623]";
const selectCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623] appearance-none cursor-pointer";

export default function AttendanceModule() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split('T')[0]);
  const [employeeList, setEmployeeList] = useState<EmployeeInfo[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<AttendanceFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance');
      if (!res.ok) throw new Error('Failed to fetch attendance');
      const json = await res.json();
      if (json.success) setRecords(json.data);
      else throw new Error(json.error || 'Unknown error');
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong'); }
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

  const filteredRecords = useMemo(() => {
    if (!dateFilter) return records;
    return records.filter(r => r.date === dateFilter);
  }, [records, dateFilter]);

  const presentToday = filteredRecords.filter(r => r.status === 'Present').length;
  const absent = filteredRecords.filter(r => r.status === 'Absent').length;
  const onLeave = filteredRecords.filter(r => r.status === 'On Leave').length;
  const otWorkers = filteredRecords.filter(r => r.otHours > 0).length;

  const openCreate = () => { setForm({ ...emptyForm, date: dateFilter || new Date().toISOString().split('T')[0] }); setCreateOpen(true); };
  const openEdit = (r: AttendanceRecord) => {
    setForm({ empId: r.empId, site: r.site, date: r.date, timeIn: r.timeIn || '', timeOut: r.timeOut || '', otHours: r.otHours, shift: r.shift || 'General', status: r.status });
    setSelectedId(r.id);
    setEditOpen(true);
  };
  const openDelete = (id: string) => { setSelectedId(id); setDeleteOpen(true); };

  const handleSubmit = async (mode: 'create' | 'edit') => {
    setSubmitting(true);
    try {
      const body = mode === 'edit' ? { id: selectedId, ...form } : form;
      const res = await fetch('/api/attendance', { method: mode === 'create' ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(mode === 'create' ? 'Attendance record created' : 'Attendance record updated');
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
      const res = await fetch('/api/attendance', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedId }) });
      const json = await res.json();
      if (json.success) { toast.success('Attendance record deleted'); setDeleteOpen(false); fetchData(); }
      else { toast.error(json.error || 'Failed to delete'); }
    } catch { toast.error('Failed to delete'); }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="vc-stat-card"><Skeleton className="h-3 w-24 mb-2 bg-[#1e2630]" /><Skeleton className="h-8 w-16 bg-[#1e2630]" /></div>)}
        </div>
        <div className="vc-panel"><Skeleton className="h-64 w-full bg-[#1e2630]" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle size={40} className="text-[#ff3d3d]" />
        <p className="text-[#8899aa] text-sm">{error}</p>
        <button className="vc-btn-primary" onClick={() => window.location.reload()}>Retry</button>
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
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Site</label>
        <input className={inputCls} value={form.site} onChange={e => setForm(f => ({ ...f, site: e.target.value }))} placeholder="Site name" />
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Date</label>
        <input className={inputCls} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Status</label>
        <select className={selectCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Time In</label>
        <input className={inputCls} type="time" value={form.timeIn} onChange={e => setForm(f => ({ ...f, timeIn: e.target.value }))} />
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Time Out</label>
        <input className={inputCls} type="time" value={form.timeOut} onChange={e => setForm(f => ({ ...f, timeOut: e.target.value }))} />
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">OT Hours</label>
        <input className={inputCls} type="number" step="0.5" value={form.otHours} onChange={e => setForm(f => ({ ...f, otHours: parseFloat(e.target.value) || 0 }))} />
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Shift</label>
        <select className={selectCls} value={form.shift} onChange={e => setForm(f => ({ ...f, shift: e.target.value }))}>
          {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Present" value={presentToday} color="#00e676" />
        <StatCard icon={UserX} label="Absent" value={absent} color="#ff3d3d" />
        <StatCard icon={CalendarOff} label="On Leave" value={onLeave} color="#ffab40" />
        <StatCard icon={Clock} label="OT Workers" value={otWorkers} color="#00d4ff" />
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header">
          <Clock size={14} className="text-[#f5a623]" />
          <span className="text-[13px] font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>ATTENDANCE LOG</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2 bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-1">
              <span className="text-[10px] text-[#5a6878]">Date:</span>
              <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="bg-transparent border-none text-[#e2e8f0] outline-none text-[11px]" />
            </div>
            <span className="text-[10px] text-[#5a6878]">{filteredRecords.length} records</span>
          </div>
          <button className="vc-btn-primary ml-2 flex items-center gap-1" onClick={openCreate}><Plus size={13} /> New Record</button>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-[#161c24] z-10">
              <tr className="border-b border-[#252e3a]">
                {['Emp ID', 'Employee', 'Site', 'Time In', 'Time Out', 'OT (hrs)', 'Shift', 'Status', ''].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-[#5a6878] text-[11px]">No attendance records for this date.</td></tr>
              ) : filteredRecords.map(r => (
                <tr key={r.id} className="border-b border-[#252e3a]/50 hover:bg-[#141920] transition-colors group">
                  <td className="py-2.5 px-3 text-[10px] text-[#8899aa]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{r.employee.empId}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{r.employee.name}</td>
                  <td className="py-2.5 px-3 text-[#8899aa]">{r.site}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono text-[10px]">{r.timeIn || '—'}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono text-[10px]">{r.timeOut || '—'}</td>
                  <td className="py-2.5 px-3"><span className={r.otHours > 0 ? 'text-[#00d4ff] font-semibold' : 'text-[#5a6878]'} style={{ fontFamily: "'Share Tech Mono', monospace" }}>{r.otHours > 0 ? r.otHours.toFixed(1) : '—'}</span></td>
                  <td className="py-2.5 px-3"><span className={`vc-badge ${shiftColor(r.shift || '')}`}>{r.shift || '—'}</span></td>
                  <td className="py-2.5 px-3"><span className={`vc-badge ${statusColor(r.status)}`}>{r.status}</span></td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" onClick={() => openEdit(r)}><Pencil size={13} /></button>
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" onClick={() => openDelete(r.id)}><Trash2 size={13} /></button>
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
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl"><DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Create Attendance Record</DialogTitle></DialogHeader>{dialogContent()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('create')}>{submitting ? 'Creating...' : 'Create Record'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl"><DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Edit Attendance Record</DialogTitle></DialogHeader>{dialogContent()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('edit')}>{submitting ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Delete Attendance Record</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-[#ff3d3d]/15 flex items-center justify-center shrink-0 mt-0.5"><AlertTriangle size={20} className="text-[#ff3d3d]" /></div>
            <div><p className="text-[13px] text-[#e2e8f0] mb-1">Are you sure you want to delete this attendance record?</p><p className="text-[11px] text-[#8899aa]">This action cannot be undone.</p></div>
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
