'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, AlertTriangle, CheckCircle2, Plus, Pencil,
  Trash2, Loader2, FileText, MapPin, User,
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
interface Incident {
  id: string;
  refNo: string;
  date: string;
  site: string;
  type: string;
  severity: string;
  person: string;
  status: string;
  description: string | null;
  action: string | null;
  createdAt: string;
}

interface IncidentFormData {
  date: string;
  site: string;
  type: string;
  severity: string;
  person: string;
  status: string;
  description: string;
  action: string;
}

const EMPTY_FORM: IncidentFormData = {
  date: '', site: '', type: 'Near Miss', severity: 'Low', person: '', status: 'Investigating', description: '', action: '',
};

const INCIDENT_TYPES = ['Near Miss', 'First Aid', 'Property Damage', 'LTI', 'Fatality', 'Hazard ID'];
const SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const STATUS_OPTIONS = ['Investigating', 'Open', 'Closed'];

/* ── Helpers ──────────────────────────────────────── */
function severityColor(s: string) {
  const m: Record<string, string> = {
    Critical: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    High: 'bg-[#ffab40]/15 text-[#ffab40]',
    Medium: 'bg-[#f5a623]/15 text-[#f5a623]',
    Low: 'bg-[#00d4ff]/15 text-[#00d4ff]',
  };
  return m[s] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function incidentStatusColor(s: string) {
  const m: Record<string, string> = {
    Investigating: 'bg-[#ffab40]/15 text-[#ffab40]',
    Open: 'bg-[#00d4ff]/15 text-[#00d4ff]',
    Closed: 'bg-[#00e676]/15 text-[#00e676]',
  };
  return m[s] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function fmtDate(d: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; }
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
function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ElementType; label: string; value: number | string; color: string; sub?: string;
}) {
  return (
    <div className="vc-stat-card">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">{label}</div>
          <div className="text-[22px] font-bold leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{value}</div>
          {sub && <div className="text-[9px] text-[#5a6878] mt-1">{sub}</div>}
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
export default function SafetyModule() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [sites, setSites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Incident | null>(null);
  const [editTarget, setEditTarget] = useState<Incident | null>(null);
  const [form, setForm] = useState<IncidentFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [incRes, siteRes] = await Promise.all([
        fetch('/api/incidents'),
        fetch('/api/sites'),
      ]);
      const incJson = await incRes.json();
      const siteJson = await siteRes.json();
      if (incJson.success) setIncidents(incJson.data);
      if (siteJson.success) {
        const uniqueSites = [...new Set(siteJson.data.map((s: any) => s.name))] as string[];
        setSites(uniqueSites);
      }
    } catch {
      toast.error('Failed to fetch incident data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Stats ── */
  const totalCount = incidents.length;
  const openCount = incidents.filter(i => i.status === 'Investigating' || i.status === 'Open').length;
  const closedCount = incidents.filter(i => i.status === 'Closed').length;
  const ltiCount = incidents.filter(i => i.type === 'LTI' || i.type === 'Fatality').length;

  /* ── Form helpers ── */
  const updateForm = (field: keyof IncidentFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.date || !form.site || !form.type || !form.severity || !form.person) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, description: form.description || null, action: form.action || null }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Incident reported successfully');
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to report incident');
      }
    } catch {
      toast.error('Network error reporting incident');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget || !form.date || !form.site || !form.type) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/incidents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTarget.id, ...form, description: form.description || null, action: form.action || null }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Incident updated');
        setEditOpen(false);
        setEditTarget(null);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to update incident');
      }
    } catch {
      toast.error('Network error updating incident');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch('/api/incidents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Incident deleted');
        setDeleteOpen(false);
        setDeleteTarget(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Delete failed');
      }
    } catch {
      toast.error('Network error deleting incident');
    }
  };

  const openEditDialog = (inc: Incident) => {
    setEditTarget(inc);
    setForm({
      date: inc.date, site: inc.site, type: inc.type, severity: inc.severity,
      person: inc.person, status: inc.status,
      description: inc.description || '', action: inc.action || '',
    });
    setEditOpen(true);
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4 p-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={AlertTriangle} label="Total Incidents" value={totalCount} color="#f5a623" />
        <StatCard icon={ShieldAlert} label="Open" value={openCount} color="#ffab40" />
        <StatCard icon={CheckCircle2} label="Closed" value={closedCount} color="#00e676" />
        <StatCard icon={ShieldAlert} label="LTI Count" value={ltiCount} color="#ff3d3d" sub="Lost Time Incidents" />
      </div>

      {/* Table */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileText size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Incident Register</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{incidents.length} Records</span>
          <button onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}
            className="vc-btn-primary flex items-center gap-1.5 ml-2">
            <Plus size={13} /> Report Incident
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0f1318]">
                  {['Ref No.', 'Date', 'Site', 'Type', 'Severity', 'Person', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center">
                      <ShieldAlert className="mx-auto text-[#5a6878] mb-2" size={24} />
                      <div className="text-[11px] text-[#5a6878]">No incidents recorded</div>
                    </td>
                  </tr>
                ) : (
                  incidents.map(inc => (
                    <tr key={inc.id} className="hover:bg-[#141920] transition-colors">
                      <td className="py-2.5 px-3 text-[#f5a623] font-medium">{inc.refNo}</td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{fmtDate(inc.date)}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1 text-[#8899aa]">
                          <MapPin size={10} className="text-[#5a6878] shrink-0" /> {inc.site}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[#e2e8f0]">{inc.type}</td>
                      <td className="py-2.5 px-3">
                        <span className={`vc-badge ${severityColor(inc.severity)}`}>{inc.severity}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1 text-[#e2e8f0]">
                          <User size={10} className="text-[#5a6878] shrink-0" /> {inc.person}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`vc-badge ${incidentStatusColor(inc.status)}`}>{inc.status}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditDialog(inc)}
                            className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-all" title="Edit">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => { setDeleteTarget(inc); setDeleteOpen(true); }}
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
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623] flex items-center gap-2">
              <Plus size={16} /> Report Incident
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Date *</label>
                <input type="date" value={form.date} onChange={e => updateForm('date', e.target.value)} className="vc-input" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Site *</label>
                <select value={form.site} onChange={e => updateForm('site', e.target.value)} className="vc-input appearance-none">
                  <option value="">Select site...</option>
                  {sites.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Type *</label>
                <select value={form.type} onChange={e => updateForm('type', e.target.value)} className="vc-input appearance-none">
                  {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Severity *</label>
                <select value={form.severity} onChange={e => updateForm('severity', e.target.value)} className="vc-input appearance-none">
                  {SEVERITY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Person Involved *</label>
              <input type="text" value={form.person} onChange={e => updateForm('person', e.target.value)} placeholder="Name of person" className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Description</label>
              <textarea value={form.description} onChange={e => updateForm('description', e.target.value)} rows={3} placeholder="Describe the incident..." className="vc-input resize-none" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Action Taken</label>
              <textarea value={form.action} onChange={e => updateForm('action', e.target.value)} rows={2} placeholder="Immediate actions taken..." className="vc-input resize-none" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setCreateOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleCreate} disabled={submitting}
              className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Report Incident
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#00d4ff] flex items-center gap-2">
              <Pencil size={16} /> Edit Incident — {editTarget?.refNo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Date *</label>
                <input type="date" value={form.date} onChange={e => updateForm('date', e.target.value)} className="vc-input" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Site *</label>
                <select value={form.site} onChange={e => updateForm('site', e.target.value)} className="vc-input appearance-none">
                  {sites.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Type *</label>
                <select value={form.type} onChange={e => updateForm('type', e.target.value)} className="vc-input appearance-none">
                  {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Severity *</label>
                <select value={form.severity} onChange={e => updateForm('severity', e.target.value)} className="vc-input appearance-none">
                  {SEVERITY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Person Involved *</label>
              <input type="text" value={form.person} onChange={e => updateForm('person', e.target.value)} className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label>
              <select value={form.status} onChange={e => updateForm('status', e.target.value)} className="vc-input appearance-none">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Description</label>
              <textarea value={form.description} onChange={e => updateForm('description', e.target.value)} rows={3} className="vc-input resize-none" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Action Taken</label>
              <textarea value={form.action} onChange={e => updateForm('action', e.target.value)} rows={2} className="vc-input resize-none" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleEdit} disabled={submitting}
              className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Update Incident
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d] flex items-center gap-2">
              <AlertTriangle size={16} /> Delete Incident
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Are you sure you want to delete incident <strong className="text-[#f5a623]">{deleteTarget?.refNo}</strong> ({deleteTarget?.type}) at <strong className="text-[#e2e8f0]">{deleteTarget?.site}</strong>? This action cannot be undone.
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
