'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2, IndianRupee, Plus, FileText, MapPin, Users, Calendar,
  TrendingUp, Pencil, Trash2, AlertTriangle
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';

// ── Types ──────────────────────────────────────────────
interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  type: string;
  contractValue: string;
  startDate: string;
  endDate: string;
  progress: number;
  people: number;
  status: string;
  site: string;
}

interface ProjectFormData {
  code: string;
  name: string;
  client: string;
  type: string;
  contractValue: string;
  startDate: string;
  endDate: string;
  progress: number;
  people: number;
  status: string;
  site: string;
}

const emptyForm: ProjectFormData = {
  code: '', name: '', client: '', type: '', contractValue: '',
  startDate: '', endDate: '', progress: 0, people: 0, status: 'On Track', site: '',
};

// ── Helpers ────────────────────────────────────────────
function statusColor(s: string) {
  switch (s?.toLowerCase()) {
    case 'on track': return 'bg-[#00d4ff]/15 text-[#00d4ff] border-[#00d4ff]/40';
    case 'at risk': return 'bg-[#ffab40]/15 text-[#ffab40] border-[#ffab40]/40';
    case 'near done':
    case 'completed': return 'bg-[#00e676]/15 text-[#00e676] border-[#00e676]/40';
    case 'delayed': return 'bg-[#ff3d3d]/15 text-[#ff3d3d] border-[#ff3d3d]/40';
    default: return 'bg-[#5a6878]/15 text-[#8899aa] border-[#5a6878]/40';
  }
}

function progressColor(s: string) {
  switch (s?.toLowerCase()) {
    case 'on track': return '#00d4ff';
    case 'at risk': return '#ffab40';
    case 'near done':
    case 'completed': return '#00e676';
    case 'delayed': return '#ff3d3d';
    default: return '#5a6878';
  }
}

function formatDate(d: string) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

function formatCurrency(val: string) {
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  if (num >= 100) return `₹${(num ?? 0).toLocaleString('en-IN')}Cr`;
  return `₹${(num ?? 0).toLocaleString('en-IN')}L`;
}

// ── Stat Card ──────────────────────────────────────────
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

// ── Loading Skeleton ───────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="vc-stat-card">
            <Skeleton className="h-3 w-24 mb-2 bg-[#1e2630]" />
            <Skeleton className="h-8 w-16 bg-[#1e2630]" />
          </div>
        ))}
      </div>
      <div className="vc-panel">
        <Skeleton className="h-10 w-full bg-[#1e2630]" />
        <div className="p-3 space-y-2">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-11 w-full bg-[#1e2630]" />)}
        </div>
      </div>
    </div>
  );
}

// ── Form Field ─────────────────────────────────────────
function FormField({ label, children, span = false }: { label: string; children: React.ReactNode; span?: boolean }) {
  return (
    <div className={span ? 'md:col-span-2' : ''}>
      <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623]";
const selectCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623] appearance-none cursor-pointer";

// ── Main Component ─────────────────────────────────────
export default function ProjectsModule() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const json = await res.json();
      if (json.success) setProjects(json.data);
      else setError(json.error || 'Failed to load projects');
    } catch { setError('Network error fetching projects'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeCount = projects.filter(p => p.status?.toLowerCase() !== 'completed' && p.status?.toLowerCase() !== 'cancelled').length;
  const delayedCount = projects.filter(p => p.status?.toLowerCase() === 'delayed').length;
  const totalContract = projects.reduce((sum, p) => sum + (parseFloat(p.contractValue) || 0), 0);

  const openCreate = () => { setForm(emptyForm); setCreateOpen(true); };
  const openEdit = (p: Project) => {
    setForm({
      code: p.code, name: p.name, client: p.client, type: p.type, contractValue: p.contractValue,
      startDate: p.startDate, endDate: p.endDate, progress: p.progress, people: p.people,
      status: p.status, site: p.site,
    });
    setEditOpen(true);
  };
  const openDelete = (id: string) => { setSelectedId(id); setDeleteOpen(true); };

  const handleSubmit = async (mode: 'create' | 'edit') => {
    setSubmitting(true);
    try {
      const url = mode === 'create' ? '/api/projects' : '/api/projects';
      const method = mode === 'create' ? 'POST' : 'PUT';
      const body = mode === 'edit' ? { id: selectedId, ...form } : form;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(mode === 'create' ? 'Project created successfully' : 'Project updated successfully');
        if (mode === 'create') setCreateOpen(false); else setEditOpen(false);
        fetchData();
      } else {
        toast.error(json.error || `Failed to ${mode} project`);
      }
    } catch { toast.error(`Failed to ${mode} project`); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/projects', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedId }) });
      const json = await res.json();
      if (json.success) {
        toast.success('Project deleted successfully');
        setDeleteOpen(false);
        fetchData();
      } else { toast.error(json.error || 'Failed to delete project'); }
    } catch { toast.error('Failed to delete project'); }
    finally { setSubmitting(false); }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Building2 size={40} className="text-[#ff3d3d]" />
        <p className="text-[#8899aa] text-sm">{error}</p>
        <button className="vc-btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (loading) return <LoadingSkeleton />;

  // ── Dialog content shared between create and edit ──
  const dialogContent = (mode: 'create' | 'edit') => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
      <FormField label="Project Code">
        <input className={inputCls} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="PRJ-001" />
      </FormField>
      <FormField label="Project Name">
        <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Thermal Power Plant" />
      </FormField>
      <FormField label="Client">
        <input className={inputCls} value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} placeholder="NTPC Limited" />
      </FormField>
      <FormField label="Type">
        <select className={selectCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          <option value="">Select type</option>
          <option value="Thermal">Thermal</option>
          <option value="Solar">Solar</option>
          <option value="Transmission">Transmission</option>
          <option value="Substation">Substation</option>
          <option value="Maintenance">Maintenance</option>
        </select>
      </FormField>
      <FormField label="Contract Value (₹ Lakhs)">
        <input className={inputCls} type="number" value={form.contractValue} onChange={e => setForm(f => ({ ...f, contractValue: e.target.value }))} placeholder="250" />
      </FormField>
      <FormField label="Site">
        <input className={inputCls} value={form.site} onChange={e => setForm(f => ({ ...f, site: e.target.value }))} placeholder="Tamil Nadu" />
      </FormField>
      <FormField label="Start Date">
        <input className={inputCls} type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
      </FormField>
      <FormField label="End Date">
        <input className={inputCls} type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
      </FormField>
      <FormField label="Progress (%)">
        <input className={inputCls} type="number" min={0} max={100} value={form.progress} onChange={e => setForm(f => ({ ...f, progress: parseInt(e.target.value) || 0 }))} />
      </FormField>
      <FormField label="People Count">
        <input className={inputCls} type="number" value={form.people} onChange={e => setForm(f => ({ ...f, people: parseInt(e.target.value) || 0 }))} />
      </FormField>
      <FormField label="Status" span>
        <select className={selectCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
          <option value="On Track">On Track</option>
          <option value="At Risk">At Risk</option>
          <option value="Delayed">Delayed</option>
          <option value="Completed">Completed</option>
          <option value="Near Done">Near Done</option>
        </select>
      </FormField>
    </div>
  );

  return (
    <div className="space-y-4 p-6">
      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Total Projects" value={projects.length} color="#f5a623" sub={`${activeCount} active`} />
        <StatCard icon={TrendingUp} label="Active Projects" value={activeCount} color="#00d4ff" sub="Currently running" />
        <StatCard icon={IndianRupee} label="Contract Value" value={totalContract >= 100 ? `₹${(totalContract ?? 0).toLocaleString('en-IN')}Cr` : `₹${(totalContract ?? 0).toLocaleString('en-IN')}L`} color="#00e676" sub="All projects" />
        <StatCard icon={AlertTriangle} label="Delayed" value={delayedCount} color="#ff3d3d" sub="Need attention" />
      </div>

      {/* ── Project Portfolio Table ── */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileText size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-bold text-[#e2e8f0]">Project Portfolio</span>
          <span className="ml-auto text-[10px] text-[#5a6878]">{projects.length} projects</span>
          <button className="vc-btn-primary ml-2 flex items-center gap-1" onClick={openCreate}>
            <Plus size={13} /> New Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#5a6878]">
            <Building2 size={36} className="mb-2 opacity-40" />
            <p className="text-[12px]">No projects found</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[#252e3a] bg-[#141920]/50">
                  {['Code', 'Name', 'Client', 'Type', 'Contract ₹', 'Start', 'End', 'Progress', 'People', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-3 py-[9px] text-[9px] font-bold uppercase tracking-wider text-[#5a6878] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.map((proj) => {
                  const pColor = progressColor(proj.status);
                  return (
                    <tr key={proj.id} className="border-b border-[#252e3a]/60 hover:bg-[#141920] transition-colors group">
                      <td className="px-3 py-[10px] font-semibold text-[#f5a623] whitespace-nowrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{proj.code}</td>
                      <td className="px-3 py-[10px] text-[#e2e8f0] whitespace-nowrap max-w-[180px] truncate font-medium">{proj.name}</td>
                      <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap max-w-[140px] truncate">{proj.client}</td>
                      <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap">{proj.type}</td>
                      <td className="px-3 py-[10px] whitespace-nowrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        <span className="text-[#00e676]">{formatCurrency(proj.contractValue)}</span>
                      </td>
                      <td className="px-3 py-[10px] text-[#5a6878] whitespace-nowrap">{formatDate(proj.startDate)}</td>
                      <td className="px-3 py-[10px] text-[#5a6878] whitespace-nowrap">{formatDate(proj.endDate)}</td>
                      <td className="px-3 py-[10px] whitespace-nowrap min-w-[130px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-[6px] bg-[#141920] rounded-full overflow-hidden min-w-[50px]">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, proj.progress))}%`, background: `linear-gradient(90deg, ${pColor}80, ${pColor})` }} />
                          </div>
                          <span className="text-[10px] font-bold w-8 text-right" style={{ fontFamily: "'Share Tech Mono', monospace", color: pColor }}>{proj.progress}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap">
                        <div className="flex items-center gap-1"><Users size={10} className="text-[#5a6878]" /><span style={{ fontFamily: "'Share Tech Mono', monospace" }}>{proj.people}</span></div>
                      </td>
                      <td className="px-3 py-[10px] whitespace-nowrap"><span className={`vc-badge border ${statusColor(proj.status)}`}>{proj.status}</span></td>
                      <td className="px-3 py-[10px] whitespace-nowrap">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" onClick={() => openEdit(proj)}><Pencil size={13} /></button>
                          <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" onClick={() => openDelete(proj.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Create New Project</DialogTitle></DialogHeader>
          {dialogContent('create')}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('create')}>
              {submitting ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Edit Project</DialogTitle></DialogHeader>
          {dialogContent('edit')}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('edit')}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Delete Project</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-[#ff3d3d]/15 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={20} className="text-[#ff3d3d]" />
            </div>
            <div>
              <p className="text-[13px] text-[#e2e8f0] mb-1">Are you sure you want to delete this project?</p>
              <p className="text-[11px] text-[#8899aa]">This action cannot be undone. All associated data will be permanently removed.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#cc2020] font-semibold" disabled={submitting} onClick={handleDelete}>
              {submitting ? 'Deleting...' : 'Delete Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
