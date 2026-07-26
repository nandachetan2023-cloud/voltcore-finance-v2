'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Globe, Users, Building2, User, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';

interface Site {
  id: string;
  name: string;
  state: string;
  project: string;
  manpower: number;
  incharge: string;
  status: string;
}

interface SiteFormData {
  name: string;
  state: string;
  project: string;
  manpower: number;
  incharge: string;
  status: string;
}

const emptyForm: SiteFormData = { name: '', state: '', project: '', manpower: 0, incharge: '', status: 'Active' };

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    Active: 'bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30',
    Closing: 'bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30',
    Slow: 'bg-[#ffab40]/15 text-[#ffab40] border border-[#ffab40]/30',
    HO: 'bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30',
    Inactive: 'bg-[#5a6878]/15 text-[#5a6878] border border-[#5a6878]/30',
  };
  return map[status] || map['Active'];
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623]";
const selectCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623] appearance-none cursor-pointer";

export default function SitesModule() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<SiteFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/sites');
      const json = await res.json();
      if (json.success) setSites(json.data);
      else setError(json.error || 'Failed to load sites');
    } catch { setError('Network error fetching sites'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeSites = sites.filter(s => s.status === 'Active' || s.status === 'HO').length;
  const uniqueStates = new Set(sites.map(s => s.state)).size;
  const totalManpower = sites.reduce((s, site) => s + site.manpower, 0);

  const openCreate = () => { setForm(emptyForm); setCreateOpen(true); };
  const openEdit = (s: Site) => {
    setForm({ name: s.name, state: s.state, project: s.project, manpower: s.manpower, incharge: s.incharge, status: s.status });
    setSelectedId(s.id);
    setEditOpen(true);
  };
  const openDelete = (id: string) => { setSelectedId(id); setDeleteOpen(true); };

  const handleSubmit = async (mode: 'create' | 'edit') => {
    setSubmitting(true);
    try {
      const body = mode === 'edit' ? { id: selectedId, ...form } : form;
      const res = await fetch('/api/sites', { method: mode === 'create' ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(mode === 'create' ? 'Site created successfully' : 'Site updated successfully');
        if (mode === 'create') setCreateOpen(false); else setEditOpen(false);
        fetchData();
      } else { toast.error(json.error || `Failed to ${mode} site`); }
    } catch { toast.error(`Failed to ${mode} site`); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/sites', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedId }) });
      const json = await res.json();
      if (json.success) { toast.success('Site deleted successfully'); setDeleteOpen(false); fetchData(); }
      else { toast.error(json.error || 'Failed to delete site'); }
    } catch { toast.error('Failed to delete site'); }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="vc-stat-card">
              <Skeleton className="h-3 w-24 mb-2 bg-[#1e2630]" />
              <Skeleton className="h-8 w-16 bg-[#1e2630]" />
            </div>
          ))}
        </div>
        <div className="vc-panel"><Skeleton className="h-64 w-full bg-[#1e2630]" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <MapPin size={40} className="text-[#ff3d3d]" />
        <p className="text-[#8899aa] text-sm">{error}</p>
        <button className="vc-btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const dialogContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
      <FormField label="Site Name">
        <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Tuticorin Thermal Plant" />
      </FormField>
      <FormField label="State">
        <select className={selectCls} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
          <option value="">Select state</option>
          {['Tamil Nadu', 'Maharashtra', 'Gujarat', 'Rajasthan', 'Karnataka', 'Telangana', 'Andhra Pradesh', 'Odisha', 'West Bengal', 'Madhya Pradesh'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Project">
        <input className={inputCls} value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} placeholder="PRJ-001" />
      </FormField>
      <FormField label="Manpower">
        <input className={inputCls} type="number" value={form.manpower} onChange={e => setForm(f => ({ ...f, manpower: parseInt(e.target.value) || 0 }))} />
      </FormField>
      <FormField label="Area Incharge">
        <input className={inputCls} value={form.incharge} onChange={e => setForm(f => ({ ...f, incharge: e.target.value }))} placeholder="Rajesh Kumar" />
      </FormField>
      <FormField label="Status">
        <select className={selectCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
          <option value="Active">Active</option>
          <option value="HO">HO</option>
          <option value="Slow">Slow</option>
          <option value="Closing">Closing</option>
          <option value="Inactive">Inactive</option>
        </select>
      </FormField>
    </div>
  );

  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={MapPin} label="Total Sites" value={sites.length} color="#f5a623" />
        <StatCard icon={Building2} label="Active" value={activeSites} color="#00e676" />
        <StatCard icon={Globe} label="States" value={uniqueStates} color="#00d4ff" />
        <StatCard icon={Users} label="Total Manpower" value={totalManpower} color="#a78bfa" />
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header">
          <MapPin size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Site Overview</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{sites.length} Sites</span>
          <button className="vc-btn-primary ml-2 flex items-center gap-1" onClick={openCreate}><Plus size={13} /> New Site</button>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-[#161c24] z-10">
              <tr className="border-b border-[#252e3a]">
                {['Site Name', 'State', 'Project', 'Manpower', 'Area Incharge', 'Status', ''].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sites.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-[#5a6878] text-[11px]">No sites found</td></tr>
              ) : sites.map(site => (
                <tr key={site.id} className="border-b border-[#252e3a]/50 hover:bg-[#141920] transition-colors group">
                  <td className="py-2.5 px-3"><div className="flex items-center gap-2"><MapPin size={12} className="text-[#f5a623] shrink-0" /><span className="text-[#e2e8f0] font-medium">{site.name}</span></div></td>
                  <td className="py-2.5 px-3 text-[#8899aa]">{site.state}</td>
                  <td className="py-2.5 px-3 text-[#8899aa]">{site.project}</td>
                  <td className="py-2.5 px-3 text-center text-[#00e676] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{site.manpower}</td>
                  <td className="py-2.5 px-3"><div className="flex items-center gap-1.5"><User size={11} className="text-[#5a6878]" /><span className="text-[#e2e8f0]">{site.incharge}</span></div></td>
                  <td className="py-2.5 px-3"><span className={`vc-badge ${getStatusBadge(site.status)}`}>{site.status}</span></td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" onClick={() => openEdit(site)}><Pencil size={13} /></button>
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" onClick={() => openDelete(site.id)}><Trash2 size={13} /></button>
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
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Create New Site</DialogTitle></DialogHeader>
          {dialogContent()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('create')}>{submitting ? 'Creating...' : 'Create Site'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Edit Site</DialogTitle></DialogHeader>
          {dialogContent()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('edit')}>{submitting ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Delete Site</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-[#ff3d3d]/15 flex items-center justify-center shrink-0 mt-0.5"><AlertTriangle size={20} className="text-[#ff3d3d]" /></div>
            <div>
              <p className="text-[13px] text-[#e2e8f0] mb-1">Are you sure you want to delete this site?</p>
              <p className="text-[11px] text-[#8899aa]">This action cannot be undone.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#cc2020] font-semibold" disabled={submitting} onClick={handleDelete}>{submitting ? 'Deleting...' : 'Delete Site'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
