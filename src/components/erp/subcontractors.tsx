'use client';

import { useState, useEffect, useCallback } from 'react';
import { Handshake, Users, ShieldCheck, ShieldAlert, Plus, Pencil, Trash2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Subcontractor {
  id: string;
  name: string;
  trade: string;
  workers: number;
  site: string;
  pfReg: string;
  esiReg: string;
  labourLic: string;
  compliance: string;
}

interface SubcontractorFormData {
  name: string;
  trade: string;
  workers: number;
  site: string;
  pfReg: string;
  esiReg: string;
  labourLic: string;
  compliance: string;
}

const emptyForm: SubcontractorFormData = { name: '', trade: '', workers: 0, site: '', pfReg: 'Pending', esiReg: 'Pending', labourLic: 'Pending', compliance: 'Non-Compliant' };

function getComplianceBadge(c: string) {
  return c === 'Compliant' ? 'bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30' : 'bg-[#ff3d3d]/15 text-[#ff3d3d] border border-[#ff3d3d]/30';
}

function getRegBadge(s: string) {
  if (s === 'Done') return 'bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30';
  if (s === 'Pending') return 'bg-[#ffab40]/15 text-[#ffab40] border border-[#ffab40]/30';
  return 'bg-[#ff3d3d]/15 text-[#ff3d3d] border border-[#ff3d3d]/30';
}

function getLicBadge(l: string) {
  if (l === 'Valid') return 'bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30';
  if (l === 'Pending') return 'bg-[#ffab40]/15 text-[#ffab40] border border-[#ffab40]/30';
  return 'bg-[#ff3d3d]/15 text-[#ff3d3d] border border-[#ff3d3d]/30';
}

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

export default function SubcontractorsModule() {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<SubcontractorFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/subcontractors');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      if (json.success) setSubcontractors(json.data);
      else throw new Error(json.error || 'Unknown error');
    } catch (err) { setError(err instanceof Error ? err.message : 'Error loading data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalWorkers = subcontractors.reduce((s, sc) => s + sc.workers, 0);
  const compliantCount = subcontractors.filter(sc => sc.compliance === 'Compliant').length;
  const nonCompliantCount = subcontractors.filter(sc => sc.compliance !== 'Compliant').length;

  const openCreate = () => { setForm(emptyForm); setCreateOpen(true); };
  const openEdit = (sc: Subcontractor) => {
    setForm({ name: sc.name, trade: sc.trade, workers: sc.workers, site: sc.site, pfReg: sc.pfReg, esiReg: sc.esiReg, labourLic: sc.labourLic, compliance: sc.compliance });
    setSelectedId(sc.id);
    setEditOpen(true);
  };
  const openDelete = (id: string) => { setSelectedId(id); setDeleteOpen(true); };

  const handleSubmit = async (mode: 'create' | 'edit') => {
    setSubmitting(true);
    try {
      const body = mode === 'edit' ? { id: selectedId, ...form } : form;
      const res = await fetch('/api/subcontractors', { method: mode === 'create' ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(mode === 'create' ? 'Subcontractor added successfully' : 'Subcontractor updated successfully');
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
      const res = await fetch('/api/subcontractors', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedId }) });
      const json = await res.json();
      if (json.success) { toast.success('Subcontractor deleted successfully'); setDeleteOpen(false); fetchData(); }
      else { toast.error(json.error || 'Failed to delete'); }
    } catch { toast.error('Failed to delete'); }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="vc-stat-card"><Skeleton className="h-3 w-24 mb-2 bg-[#1e2630]" /><Skeleton className="h-6 w-12 bg-[#1e2630]" /></div>)}
        </div>
        <div className="vc-panel"><Skeleton className="h-64 w-full bg-[#1e2630]" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Handshake size={40} className="text-[#ff3d3d]" />
        <p className="text-[#8899aa] text-sm">{error}</p>
        <button className="vc-btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const dialogContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Company Name</label>
        <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ABC Contractors" />
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Trade</label>
        <input className={inputCls} value={form.trade} onChange={e => setForm(f => ({ ...f, trade: e.target.value }))} placeholder="Civil Works" />
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Workers Deployed</label>
        <input className={inputCls} type="number" value={form.workers} onChange={e => setForm(f => ({ ...f, workers: parseInt(e.target.value) || 0 }))} />
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Site</label>
        <input className={inputCls} value={form.site} onChange={e => setForm(f => ({ ...f, site: e.target.value }))} placeholder="Tuticorin Plant" />
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">PF Registration</label>
        <select className={selectCls} value={form.pfReg} onChange={e => setForm(f => ({ ...f, pfReg: e.target.value }))}>
          <option value="Done">Done</option>
          <option value="Pending">Pending</option>
          <option value="Missing">Missing</option>
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">ESI Registration</label>
        <select className={selectCls} value={form.esiReg} onChange={e => setForm(f => ({ ...f, esiReg: e.target.value }))}>
          <option value="Done">Done</option>
          <option value="Pending">Pending</option>
          <option value="Missing">Missing</option>
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Labour Licence</label>
        <select className={selectCls} value={form.labourLic} onChange={e => setForm(f => ({ ...f, labourLic: e.target.value }))}>
          <option value="Valid">Valid</option>
          <option value="Pending">Pending</option>
          <option value="Expired">Expired</option>
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Compliance Status</label>
        <select className={selectCls} value={form.compliance} onChange={e => setForm(f => ({ ...f, compliance: e.target.value }))}>
          <option value="Compliant">Compliant</option>
          <option value="Non-Compliant">Non-Compliant</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Handshake} label="Total" value={subcontractors.length} color="#f5a623" />
        <StatCard icon={Users} label="Workers Deployed" value={totalWorkers} color="#00d4ff" />
        <StatCard icon={ShieldCheck} label="Compliant" value={compliantCount} color="#00e676" />
        <StatCard icon={ShieldAlert} label="Non-Compliant" value={nonCompliantCount} color="#ff3d3d" />
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header">
          <Handshake size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Subcontractor Register</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{subcontractors.length} Total</span>
          <button className="vc-btn-primary ml-2 flex items-center gap-1" onClick={openCreate}><Plus size={13} /> Add Subcontractor</button>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-[#161c24] z-10">
              <tr className="border-b border-[#252e3a]">
                {['Name', 'Trade', 'Workers', 'Site', 'PF Reg', 'ESI Reg', 'Labour Lic', 'Compliance', ''].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subcontractors.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-[#5a6878] text-[11px]">No subcontractors found</td></tr>
              ) : subcontractors.map(sc => (
                <tr key={sc.id} className="border-b border-[#252e3a]/50 hover:bg-[#141920] transition-colors group">
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{sc.name}</td>
                  <td className="py-2.5 px-3 text-[#8899aa]">{sc.trade}</td>
                  <td className="py-2.5 px-3 text-center text-[#00d4ff] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{sc.workers}</td>
                  <td className="py-2.5 px-3 text-[#8899aa]">{sc.site}</td>
                  <td className="py-2.5 px-3 text-center"><span className={`vc-badge ${getRegBadge(sc.pfReg)}`}>{sc.pfReg}</span></td>
                  <td className="py-2.5 px-3 text-center"><span className={`vc-badge ${getRegBadge(sc.esiReg)}`}>{sc.esiReg}</span></td>
                  <td className="py-2.5 px-3 text-center"><span className={`vc-badge ${getLicBadge(sc.labourLic)}`}>{sc.labourLic}</span></td>
                  <td className="py-2.5 px-3 text-center"><span className={`vc-badge ${getComplianceBadge(sc.compliance)}`}>{sc.compliance}</span></td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" onClick={() => openEdit(sc)}><Pencil size={13} /></button>
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" onClick={() => openDelete(sc.id)}><Trash2 size={13} /></button>
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
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl"><DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Add Subcontractor</DialogTitle></DialogHeader>{dialogContent()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('create')}>{submitting ? 'Adding...' : 'Add Subcontractor'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl"><DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Edit Subcontractor</DialogTitle></DialogHeader>{dialogContent()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('edit')}>{submitting ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Delete Subcontractor</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-[#ff3d3d]/15 flex items-center justify-center shrink-0 mt-0.5"><AlertTriangle size={20} className="text-[#ff3d3d]" /></div>
            <div><p className="text-[13px] text-[#e2e8f0] mb-1">Are you sure you want to delete this subcontractor?</p><p className="text-[11px] text-[#8899aa]">This action cannot be undone.</p></div>
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
