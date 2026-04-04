'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wrench, CheckCircle2, AlertOctagon, Clock, MapPin, User,
  Gauge, Plus, Pencil, Trash2, AlertTriangle
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface EquipmentItem {
  id: string;
  name: string;
  eqId: string;
  site: string;
  status: string;
  lastPM: string | null;
  nextPM: string | null;
  issue: string | null;
  assignedTo: string | null;
  utilization: number;
}

interface EquipmentFormData {
  name: string;
  site: string;
  status: string;
  lastPM: string;
  nextPM: string;
  assignedTo: string;
  utilization: number;
}

const emptyForm: EquipmentFormData = {
  name: '', site: '', status: 'Operational', lastPM: '', nextPM: '', assignedTo: '', utilization: 0,
};

function formatDate(d: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ElementType; label: string; value: string | number; color: string; sub?: string;
}) {
  return (
    <div className="vc-stat-card">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] text-[#5a6878] font-semibold uppercase tracking-wider mb-1">{label}</div>
          <div className="text-[28px] font-bold leading-none" style={{ fontFamily: "'Share Tech Mono', monospace", color }}>{value}</div>
          {sub && <div className="text-[10px] text-[#5a6878] mt-1">{sub}</div>}
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

function EquipmentCard({ eq, onEdit, onDelete }: { eq: EquipmentItem; onEdit: (e: EquipmentItem) => void; onDelete: (id: string) => void }) {
  const isMaintenance = eq.status?.toLowerCase() === 'maintenance' || eq.status?.toLowerCase() === 'under maintenance';
  const isDecom = eq.status?.toLowerCase() === 'decommissioned';
  const barColor = isMaintenance ? '#ff3d3d' : isDecom ? '#5a6878' : '#00e676';

  const statusBg = isMaintenance
    ? 'bg-[#ff3d3d]/15 text-[#ff3d3d] border-[#ff3d3d]/40'
    : isDecom
    ? 'bg-[#5a6878]/15 text-[#5a6878] border-[#5a6878]/40'
    : 'bg-[#00e676]/15 text-[#00e676] border-[#00e676]/40';

  return (
    <div className={`vc-panel transition-colors group ${isMaintenance ? 'border-[#ff3d3d]/40' : isDecom ? 'border-[#5a6878]/40' : 'hover:border-[#2e3a48]'}`}>
      <div className="vc-panel-header">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Wrench size={13} className={isMaintenance ? 'text-[#ff3d3d]' : isDecom ? 'text-[#5a6878]' : 'text-[#00e676]'} />
            <span className="text-[12px] font-bold text-[#e2e8f0] truncate">{eq.name}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-[#5a6878]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{eq.eqId}</span>
            <span className="text-[#252e3a]">|</span>
            <span className="text-[10px] text-[#8899aa] flex items-center gap-1"><MapPin size={9} />{eq.site}</span>
          </div>
        </div>
        <span className={`vc-badge border shrink-0 ${statusBg}`}>{eq.status}</span>
      </div>
      <div className="vc-panel-body space-y-3">
        {isMaintenance && eq.issue && (
          <div className="flex items-center gap-2">
            <AlertOctagon size={12} className="text-[#ff3d3d] shrink-0" />
            <div className="min-w-0"><div className="text-[9px] text-[#5a6878] uppercase tracking-wider">Issue</div><div className="text-[11px] text-[#e2e8f0] truncate">{eq.issue}</div></div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={11} className="text-[#5a6878]" />
            <div><div className="text-[9px] text-[#5a6878] uppercase tracking-wider">Last PM</div><div className="text-[11px] text-[#8899aa]">{formatDate(eq.lastPM)}</div></div>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={11} className="text-[#00d4ff]" />
            <div><div className="text-[9px] text-[#5a6878] uppercase tracking-wider">Next PM</div><div className="text-[11px] text-[#00d4ff]">{formatDate(eq.nextPM)}</div></div>
          </div>
        </div>
        {eq.assignedTo && (
          <div className="flex items-center gap-1.5"><User size={11} className="text-[#5a6878]" /><span className="text-[11px] text-[#8899aa]">{eq.assignedTo}</span></div>
        )}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold">Utilization</span>
            <span className="text-[12px] font-bold" style={{ fontFamily: "'Share Tech Mono', monospace", color: barColor }}>{eq.utilization}%</span>
          </div>
          <div className="h-[6px] bg-[#141920] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, eq.utilization))}%`, background: `linear-gradient(90deg, ${barColor}90, ${barColor})` }} />
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-[#252e3a]/50">
          <button className="flex-1 vc-btn-ghost text-[10px] flex items-center justify-center gap-1" onClick={() => onEdit(eq)}><Pencil size={11} /> Edit</button>
          <button className="flex-1 vc-btn-ghost text-[10px] flex items-center justify-center gap-1 text-[#ff3d3d]/70 hover:text-[#ff3d3d] hover:border-[#ff3d3d]/30" onClick={() => onDelete(eq.id)}><Trash2 size={11} /> Delete</button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623]";
const selectCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623] appearance-none cursor-pointer";

export default function EquipmentModule() {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<EquipmentFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/equipment');
      const json = await res.json();
      if (json.success) setEquipment(json.data);
      else setError(json.error || 'Failed to load equipment');
    } catch { setError('Network error fetching equipment'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const operational = equipment.filter(e => e.status?.toLowerCase() === 'operational').length;
  const maintenance = equipment.filter(e => e.status?.toLowerCase() === 'maintenance' || e.status?.toLowerCase() === 'under maintenance').length;
  const today = new Date().toISOString().split('T')[0];
  const pmDue = equipment.filter(e => e.nextPM && e.nextPM <= today).length;

  const openCreate = () => { setForm(emptyForm); setCreateOpen(true); };
  const openEdit = (eq: EquipmentItem) => {
    setForm({ name: eq.name, site: eq.site, status: eq.status, lastPM: eq.lastPM || '', nextPM: eq.nextPM || '', assignedTo: eq.assignedTo || '', utilization: eq.utilization });
    setSelectedId(eq.id);
    setEditOpen(true);
  };
  const openDelete = (id: string) => { setSelectedId(id); setDeleteOpen(true); };

  const handleSubmit = async (mode: 'create' | 'edit') => {
    setSubmitting(true);
    try {
      const body = mode === 'edit' ? { id: selectedId, ...form } : form;
      const res = await fetch('/api/equipment', { method: mode === 'create' ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(mode === 'create' ? 'Equipment added successfully' : 'Equipment updated successfully');
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
      const res = await fetch('/api/equipment', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedId }) });
      const json = await res.json();
      if (json.success) { toast.success('Equipment deleted successfully'); setDeleteOpen(false); fetchData(); }
      else { toast.error(json.error || 'Failed to delete'); }
    } catch { toast.error('Failed to delete'); }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="vc-stat-card"><Skeleton className="h-3 w-24 mb-2 bg-[#1e2630]" /><Skeleton className="h-8 w-16 bg-[#1e2630]" /></div>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="vc-panel"><Skeleton className="h-14 w-full bg-[#1e2630]" /><Skeleton className="h-28 w-full bg-[#1e2630]" /></div>)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Wrench size={40} className="text-[#ff3d3d]" />
        <p className="text-[#8899aa] text-sm">{error}</p>
        <button className="vc-btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const dialogContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Equipment Name</label>
        <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Tower Crane TC-01" />
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Site</label>
        <input className={inputCls} value={form.site} onChange={e => setForm(f => ({ ...f, site: e.target.value }))} placeholder="Tuticorin Plant" />
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Status</label>
        <select className={selectCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
          <option value="Operational">Operational</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Decommissioned">Decommissioned</option>
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Assigned To</label>
        <input className={inputCls} value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="Operator name" />
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Last PM Date</label>
        <input className={inputCls} type="date" value={form.lastPM} onChange={e => setForm(f => ({ ...f, lastPM: e.target.value }))} />
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Next PM Date</label>
        <input className={inputCls} type="date" value={form.nextPM} onChange={e => setForm(f => ({ ...f, nextPM: e.target.value }))} />
      </div>
      <div className="md:col-span-2">
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Utilization ({form.utilization}%)</label>
        <input className="w-full" type="range" min={0} max={100} value={form.utilization} onChange={e => setForm(f => ({ ...f, utilization: parseInt(e.target.value) }))} style={{ accentColor: '#f5a623' }} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CheckCircle2} label="Total" value={equipment.length} color="#f5a623" sub="All assets" />
        <StatCard icon={CheckCircle2} label="Operational" value={operational} color="#00e676" sub="Running" />
        <StatCard icon={AlertOctagon} label="Under Maintenance" value={maintenance} color="#ff3d3d" sub="Currently offline" />
        <StatCard icon={Clock} label="PM Due" value={pmDue} color="#00d4ff" sub="Needs attention" />
      </div>

      <div className="flex justify-end">
        <button className="vc-btn-primary flex items-center gap-1" onClick={openCreate}><Plus size={13} /> Add Equipment</button>
      </div>

      {equipment.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#5a6878]">
          <Wrench size={36} className="mb-2 opacity-40" />
          <p className="text-[12px]">No equipment registered</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {equipment.map(eq => (
            <EquipmentCard key={eq.id} eq={eq} onEdit={openEdit} onDelete={openDelete} />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl"><DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Add New Equipment</DialogTitle></DialogHeader>{dialogContent()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('create')}>{submitting ? 'Adding...' : 'Add Equipment'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl"><DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Edit Equipment</DialogTitle></DialogHeader>{dialogContent()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('edit')}>{submitting ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Delete Equipment</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-[#ff3d3d]/15 flex items-center justify-center shrink-0 mt-0.5"><AlertTriangle size={20} className="text-[#ff3d3d]" /></div>
            <div><p className="text-[13px] text-[#e2e8f0] mb-1">Are you sure you want to delete this equipment?</p><p className="text-[11px] text-[#8899aa]">This action cannot be undone.</p></div>
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
