'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldAlert, AlertTriangle, Clock, CheckCircle2, XCircle,
  Plus, Pencil, Trash2, Loader2, ArrowRight, Ban, MapPin, User,
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
interface WorkPermit {
  id: string;
  permitNo: string;
  type: string;
  location: string;
  issuedTo: string;
  expiry: string;
  status: string;
  description: string | null;
  precautions: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PermitFormData {
  type: string;
  location: string;
  issuedTo: string;
  expiry: string;
  description: string;
  precautions: string;
  status: string;
}

const EMPTY_FORM: PermitFormData = {
  type: '', location: '', issuedTo: '', expiry: '', description: '', precautions: '', status: 'Active',
};

const PERMIT_TYPES = ['Hot Work', 'LOTO', 'Height Work', 'Confined Space', 'Excavation', 'Electrical'];
const PERMIT_TYPE_EMOJI: Record<string, string> = {
  'Hot Work': '🔥', 'LOTO': '🔒', 'Height Work': '🧗', 'Confined Space': '🕳️',
  'Excavation': '⛏️', 'Electrical': '⚡',
};

/* ── Helpers ──────────────────────────────────────── */
function permitStatusBadge(s: string) {
  const m: Record<string, string> = {
    Active: 'bg-[#00e676]/15 text-[#00e676]',
    Draft: 'bg-[#ffab40]/15 text-[#ffab40]',
    Expired: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    Revoked: 'bg-[#a78bfa]/15 text-[#a78bfa]',
    Closed: 'bg-[#5a6878]/15 text-[#5a6878]',
  };
  return m[s] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function getTimeUntil(dateStr: string): { hours: number; label: string } | null {
  try {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return null;
    const hours = diff / (1000 * 60 * 60);
    if (hours < 1) return { hours, label: `${Math.floor(diff / 60000)}m` };
    if (hours < 24) return { hours, label: `${Math.floor(hours)}h` };
    return { hours, label: `${Math.floor(hours / 24)}d` };
  } catch { return null; }
}

function fmtExpiry(d: string) {
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return d; }
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
export default function PermitsModule() {
  const [data, setData] = useState<WorkPermit[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkPermit | null>(null);
  const [editTarget, setEditTarget] = useState<WorkPermit | null>(null);
  const [form, setForm] = useState<PermitFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/permits');
      const json = await res.json();
      if (json.success) setData(json.data);
      else toast.error(json.error || 'Failed to fetch permits');
    } catch {
      toast.error('Network error fetching permits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Stats ── */
  const activeCount = data.filter(p => p.status === 'Active').length;
  const expiringSoon = data.filter(p => {
    if (p.status !== 'Active') return false;
    const tl = getTimeUntil(p.expiry);
    return tl !== null && tl.hours <= 48;
  }).length;
  const expiredCount = data.filter(p => p.status === 'Expired').length;
  const totalCount = data.length;

  /* ── Alert permits expiring within 48h ── */
  const expiringPermits = useMemo(() => data.filter(p => {
    if (p.status !== 'Active') return false;
    const tl = getTimeUntil(p.expiry);
    return tl !== null && tl.hours <= 48;
  }), [data]);

  /* ── Form helpers ── */
  const updateForm = (field: keyof PermitFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.type || !form.location || !form.issuedTo || !form.expiry) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setSubmitting(true);
      const count = await (await fetch('/api/permits')).json().then((j: any) => j.data?.length || 0);
      const permitNo = `PTW-${String(count + 1).padStart(3, '0')}`;
      const res = await fetch('/api/permits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permitNo, ...form, description: form.description || null, precautions: form.precautions || null }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Permit created successfully');
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to create permit');
      }
    } catch {
      toast.error('Network error creating permit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget || !form.type || !form.location) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/permits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTarget.id, ...form, description: form.description || null, precautions: form.precautions || null }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Permit updated');
        setEditOpen(false);
        setEditTarget(null);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to update permit');
      }
    } catch {
      toast.error('Network error updating permit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      setActionLoading(id);
      const res = await fetch('/api/permits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Permit ${status.toLowerCase()}`);
        await fetchData();
      } else {
        toast.error(json.error || 'Status update failed');
      }
    } catch {
      toast.error('Network error updating status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch('/api/permits', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Permit deleted');
        setDeleteOpen(false);
        setDeleteTarget(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Delete failed');
      }
    } catch {
      toast.error('Network error deleting permit');
    }
  };

  const openEditDialog = (p: WorkPermit) => {
    setEditTarget(p);
    setForm({
      type: p.type, location: p.location, issuedTo: p.issuedTo,
      expiry: p.expiry ? p.expiry.split('T')[0] : '',
      description: p.description || '', precautions: p.precautions || '', status: p.status,
    });
    setEditOpen(true);
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4 p-6">
      {/* Alert banner: permits expiring within 48h */}
      {expiringPermits.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#ff3d3d]/10 border border-[#ff3d3d]/30 animate-pulse">
          <AlertTriangle size={18} className="text-[#ff3d3d] shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[12px] font-bold text-[#ff3d3d]">WARNING: </span>
            <span className="text-[11px] text-[#e2e8f0]">
              {expiringPermits.length} permit(s) expiring within 48h —{' '}
              {expiringPermits.map(p => (
                <span key={p.id} className="inline-flex items-center gap-1 mr-2">
                  <strong className="text-[#ffab40]">{p.permitNo}</strong>
                  ({getTimeUntil(p.expiry)?.label})
                </span>
              ))}
            </span>
          </div>
          <ArrowRight size={16} className="text-[#ff3d3d] shrink-0" />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ShieldAlert} label="Active Permits" value={activeCount} color="#00e676" />
        <StatCard icon={Clock} label="Expiring Soon" value={expiringSoon} color="#ffab40" />
        <StatCard icon={XCircle} label="Expired" value={expiredCount} color="#ff3d3d" />
        <StatCard icon={CheckCircle2} label="Total Created" value={totalCount} color="#00d4ff" />
      </div>

      {/* Table */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <ShieldAlert size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Work Permits</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{data.length} Total</span>
          <button onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}
            className="vc-btn-primary flex items-center gap-1.5 ml-2">
            <Plus size={13} /> New Permit
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0f1318]">
                  {['Permit No.', 'Type', 'Location', 'Issued To', 'Expiry', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center">
                      <ShieldAlert className="mx-auto text-[#5a6878] mb-2" size={24} />
                      <div className="text-[11px] text-[#5a6878]">No permits found</div>
                    </td>
                  </tr>
                ) : (
                  data.map(p => {
                    const tl = getTimeUntil(p.expiry);
                    const isExpiring = p.status === 'Active' && tl !== null && tl.hours <= 48;
                    return (
                      <tr key={p.id} className={`transition-colors ${isExpiring ? 'bg-[#ff3d3d]/5' : 'hover:bg-[#141920]'}`}>
                        <td className="py-2.5 px-3 text-[#f5a623] font-medium">{p.permitNo}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1">
                            <span className="text-[13px]">{PERMIT_TYPE_EMOJI[p.type] || '📋'}</span>
                            <span className="text-[#e2e8f0]">{p.type}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1 text-[#8899aa]">
                            <MapPin size={10} className="text-[#5a6878] shrink-0" /> {p.location}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1 text-[#8899aa]">
                            <User size={10} className="text-[#5a6878] shrink-0" /> {p.issuedTo}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className={`text-[10px] ${isExpiring ? 'text-[#ff3d3d] font-semibold' : 'text-[#8899aa]'}`}>
                            {fmtExpiry(p.expiry)}
                            {isExpiring && tl && (
                              <span className="ml-1 text-[8px] bg-[#ff3d3d]/20 text-[#ff3d3d] px-1 rounded">{tl.label}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`vc-badge ${permitStatusBadge(p.status)}`}>{p.status}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            {p.status === 'Active' && (
                              <>
                                <button onClick={() => handleStatusChange(p.id, 'Closed')} disabled={actionLoading === p.id}
                                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-[#00e676]/10 text-[#00e676] hover:bg-[#00e676]/20 border border-[#00e676]/20 disabled:opacity-50" title="Close Permit">
                                  {actionLoading === p.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                                  Close
                                </button>
                                <button onClick={() => handleStatusChange(p.id, 'Revoked')} disabled={actionLoading === p.id}
                                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-[#a78bfa]/10 text-[#a78bfa] hover:bg-[#a78bfa]/20 border border-[#a78bfa]/20 disabled:opacity-50" title="Revoke Permit">
                                  <Ban size={10} /> Revoke
                                </button>
                              </>
                            )}
                            <button onClick={() => openEditDialog(p)}
                              className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-all" title="Edit">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => { setDeleteTarget(p); setDeleteOpen(true); }}
                              className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-all" title="Delete">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
              <Plus size={16} /> New Work Permit
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Permit Type *</label>
              <select value={form.type} onChange={e => updateForm('type', e.target.value)} className="vc-input appearance-none">
                <option value="">Select type...</option>
                {PERMIT_TYPES.map(t => <option key={t} value={t}>{PERMIT_TYPE_EMOJI[t]} {t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Location *</label>
              <input type="text" value={form.location} onChange={e => updateForm('location', e.target.value)} placeholder="Work location" className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Issued To *</label>
              <input type="text" value={form.issuedTo} onChange={e => updateForm('issuedTo', e.target.value)} placeholder="Responsible person" className="vc-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Expiry *</label>
                <input type="datetime-local" value={form.expiry} onChange={e => updateForm('expiry', e.target.value)} className="vc-input" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label>
                <select value={form.status} onChange={e => updateForm('status', e.target.value)} className="vc-input appearance-none">
                  {['Active', 'Draft'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Description</label>
              <textarea value={form.description} onChange={e => updateForm('description', e.target.value)} rows={2} placeholder="Work description..." className="vc-input resize-none" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Safety Precautions</label>
              <textarea value={form.precautions} onChange={e => updateForm('precautions', e.target.value)} rows={2} placeholder="PPE & safety measures..." className="vc-input resize-none" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setCreateOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleCreate} disabled={submitting}
              className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Create Permit
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#00d4ff] flex items-center gap-2">
              <Pencil size={16} /> Edit Permit — {editTarget?.permitNo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Permit Type *</label>
              <select value={form.type} onChange={e => updateForm('type', e.target.value)} className="vc-input appearance-none">
                {PERMIT_TYPES.map(t => <option key={t} value={t}>{PERMIT_TYPE_EMOJI[t]} {t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Location *</label>
              <input type="text" value={form.location} onChange={e => updateForm('location', e.target.value)} className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Issued To *</label>
              <input type="text" value={form.issuedTo} onChange={e => updateForm('issuedTo', e.target.value)} className="vc-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Expiry</label>
                <input type="datetime-local" value={form.expiry} onChange={e => updateForm('expiry', e.target.value)} className="vc-input" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label>
                <select value={form.status} onChange={e => updateForm('status', e.target.value)} className="vc-input appearance-none">
                  {['Active', 'Draft', 'Expired', 'Revoked', 'Closed'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Description</label>
              <textarea value={form.description} onChange={e => updateForm('description', e.target.value)} rows={2} className="vc-input resize-none" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Safety Precautions</label>
              <textarea value={form.precautions} onChange={e => updateForm('precautions', e.target.value)} rows={2} className="vc-input resize-none" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleEdit} disabled={submitting}
              className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Update Permit
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d] flex items-center gap-2">
              <AlertTriangle size={16} /> Delete Permit
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Are you sure you want to delete permit <strong className="text-[#f5a623]">{deleteTarget?.permitNo}</strong> ({deleteTarget?.type}) at <strong className="text-[#e2e8f0]">{deleteTarget?.location}</strong>? This action cannot be undone.
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
