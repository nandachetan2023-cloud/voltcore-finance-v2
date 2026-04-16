'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, Users, Send, UserCheck, Plus, Pencil,
  Trash2, Loader2, AlertTriangle, Zap, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

/* ── Types ────────────────────────────────────────── */
interface JobOpening {
  id: string;
  position: string;
  designationId?: number | null;
  site: string;
  openings: number;
  applications: number;
  priority: string;
  status: string;
  createdAt: string;
}

interface Designation {
  id: number;
  name: string;
}

interface JobFormData {
  position: string;
  designationId: number | null;
  site: string;
  openings: number;
  priority: string;
  status: string;
}

const EMPTY_FORM: JobFormData = {
  position: '', designationId: null, site: '', openings: 1, priority: 'Medium', status: 'Open',
};

const PRIORITY_OPTIONS = ['Urgent', 'High', 'Medium', 'Low'];
const STATUS_OPTIONS = ['Open', 'Shortlisting', 'Closed', 'Filled'];

/* ── Helpers ──────────────────────────────────────── */
function priorityBadge(p: string) {
  const m: Record<string, string> = {
    Urgent: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    High: 'bg-[#ffab40]/15 text-[#ffab40]',
    Medium: 'bg-[#f5a623]/15 text-[#f5a623]',
    Low: 'bg-[#5a6878]/15 text-[#5a6878]',
  };
  return m[p] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function statusBadge(s: string) {
  const m: Record<string, string> = {
    Open: 'bg-[#00e676]/15 text-[#00e676]',
    Shortlisting: 'bg-[#00d4ff]/15 text-[#00d4ff]',
    Closed: 'bg-[#5a6878]/15 text-[#5a6878]',
    Filled: 'bg-[#a78bfa]/15 text-[#a78bfa]',
    'On Hold': 'bg-[#ffab40]/15 text-[#ffab40]',
  };
  return m[s] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function priorityIcon(p: string) {
  if (p === 'Urgent') return <Zap size={10} className="text-[#ff3d3d]" />;
  return null;
}

/* ── Loading Skeleton ─────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="vc-stat-card">
            <Skeleton className="h-3 w-24 mb-2 bg-[#1e2630]" />
            <Skeleton className="h-7 w-12 bg-[#1e2630]" />
          </div>
        ))}
      </div>
      <div className="vc-panel">
        <Skeleton className="h-10 w-full bg-[#1e2630]" />
        <div className="p-3 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full bg-[#1e2630]" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Stat Card ────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number | string; color: string;
}) {
  return (
    <div className="vc-stat-card">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">{label}</div>
          <div className="text-[22px] font-bold leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{value}</div>
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */
export default function Recruitment() {
  const [openings, setOpenings] = useState<JobOpening[]>([]);
  const [sites, setSites] = useState<string[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<JobOpening | null>(null);
  const [editTarget, setEditTarget] = useState<JobOpening | null>(null);
  const [form, setForm] = useState<JobFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [jobRes, siteRes, desigRes] = await Promise.all([
        fetch('/api/recruitment'),
        fetch('/api/biometric/sites'),
        fetch('/api/designations'),
      ]);
      const jobJson = await jobRes.json();
      const siteJson = await siteRes.json();
      const desigJson = await desigRes.json();
      if (jobJson.success) setOpenings(jobJson.data);
      if (siteJson.success) {
        const siteNames = siteJson.data.map((s: any) => s.name);
        setSites(siteNames);
      }
      if (desigJson.success) setDesignations(desigJson.data);
    } catch {
      toast.error('Failed to fetch recruitment data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Stats ── */
  const openPositions = openings.filter(o => o.status === 'Open' || o.status === 'Shortlisting').length;
  const totalApplications = openings.reduce((s, o) => s + o.applications, 0);
  const offersSent = openings.filter(o => o.status === 'Filled').length;
  const hired = openings.filter(o => o.status === 'Filled').reduce((s, o) => s + o.openings, 0);

  /* ── Form helpers ── */
  const updateForm = (field: keyof JobFormData, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.position || !form.site || !form.openings || !form.priority) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/recruitment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Job opening created');
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to create job opening');
      }
    } catch {
      toast.error('Network error creating job opening');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget || !form.position || !form.site) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/recruitment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTarget.id, ...form }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Job opening updated');
        setEditOpen(false);
        setEditTarget(null);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to update job opening');
      }
    } catch {
      toast.error('Network error updating job opening');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch('/api/recruitment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Job opening deleted');
        setDeleteOpen(false);
        setDeleteTarget(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Delete failed');
      }
    } catch {
      toast.error('Network error deleting job opening');
    }
  };

  const openEditDialog = (job: JobOpening) => {
    setEditTarget(job);
    setForm({
      position: job.position, designationId: job.designationId || null, site: job.site, openings: job.openings,
      priority: job.priority, status: job.status,
    });
    setEditOpen(true);
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Briefcase} label="Open Positions" value={openPositions} color="#f5a623" />
        <StatCard icon={Users} label="Total Applications" value={totalApplications} color="#00d4ff" />
        <StatCard icon={Send} label="Offers Sent" value={offersSent} color="#00e676" />
        <StatCard icon={UserCheck} label="Hired" value={hired} color="#a78bfa" />
      </div>

      {/* Table */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Briefcase size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Job Openings</span>
          <span className="vc-badge bg-[#f5a623]/15 text-[#f5a623] ml-auto">{openPositions} Open</span>
          <button onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}
            className="vc-btn-primary flex items-center gap-1.5 ml-2">
            <Plus size={13} /> Post Job
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0f1318]">
                  {['Position', 'Site', 'Openings', 'Applications', 'Priority', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                {openings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center">
                      <Briefcase className="mx-auto text-[#5a6878] mb-2" size={24} />
                      <div className="text-[11px] text-[#5a6878]">No job openings found</div>
                    </td>
                  </tr>
                ) : (
                  openings.map(job => (
                    <tr key={job.id} className="hover:bg-[#141920] transition-colors">
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{job.position}</td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{job.site}</td>
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{job.openings}</td>
                      <td className="py-2.5 px-3 text-[#00d4ff] font-medium">{job.applications}</td>
                      <td className="py-2.5 px-3">
                        <span className={`vc-badge ${priorityBadge(job.priority)} flex items-center gap-1 w-fit`}>
                          {priorityIcon(job.priority)} {job.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`vc-badge ${statusBadge(job.status)}`}>{job.status}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditDialog(job)}
                            className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-all" title="Edit">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => { setDeleteTarget(job); setDeleteOpen(true); }}
                            className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-all" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623] flex items-center gap-2">
              <Plus size={16} /> Post New Job
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Position *</label>
              <input type="text" value={form.position} onChange={e => updateForm('position', e.target.value)} placeholder="e.g. Site Engineer" className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Designation</label>
              <select value={form.designationId || ''} onChange={e => updateForm('designationId', e.target.value ? Number(e.target.value) : null)} className="vc-input appearance-none">
                <option value="">Select designation (optional)...</option>
                {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Site *</label>
              <select value={form.site} onChange={e => updateForm('site', e.target.value)} className="vc-input appearance-none">
                <option value="">Select site...</option>
                {sites.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Openings *</label>
                <input type="number" value={form.openings} onChange={e => updateForm('openings', Number(e.target.value))} className="vc-input" min="1" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Priority *</label>
                <select value={form.priority} onChange={e => updateForm('priority', e.target.value)} className="vc-input appearance-none">
                  {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label>
              <select value={form.status} onChange={e => updateForm('status', e.target.value)} className="vc-input appearance-none">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setCreateOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleCreate} disabled={submitting}
              className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Post Job
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#00d4ff] flex items-center gap-2">
              <Pencil size={16} /> Edit Job — {editTarget?.position}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Position *</label>
              <input type="text" value={form.position} onChange={e => updateForm('position', e.target.value)} className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Designation</label>
              <select value={form.designationId || ''} onChange={e => updateForm('designationId', e.target.value ? Number(e.target.value) : null)} className="vc-input appearance-none">
                <option value="">Select designation (optional)...</option>
                {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Site *</label>
              <select value={form.site} onChange={e => updateForm('site', e.target.value)} className="vc-input appearance-none">
                {sites.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Openings</label>
                <input type="number" value={form.openings} onChange={e => updateForm('openings', Number(e.target.value))} className="vc-input" min="1" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Priority</label>
                <select value={form.priority} onChange={e => updateForm('priority', e.target.value)} className="vc-input appearance-none">
                  {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label>
              <select value={form.status} onChange={e => updateForm('status', e.target.value)} className="vc-input appearance-none">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleEdit} disabled={submitting}
              className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Update Job
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d] flex items-center gap-2">
              <AlertTriangle size={16} /> Delete Job Opening
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Are you sure you want to delete the job opening for <strong className="text-[#e2e8f0]">{deleteTarget?.position}</strong> at <strong className="text-[#8899aa]">{deleteTarget?.site}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
