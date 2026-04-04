'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Plus, FileText, Pencil, Trash2, AlertTriangle,
  AlertCircle, CheckCircle2, Clock, Play, CircleCheck, Eye,
  User, Calendar, Tag, ArrowUpCircle
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';

// ── Types ──────────────────────────────────────────────
interface Ticket {
  id: string;
  ticketNo: string;
  title: string;
  raisedBy: string;
  category: string;
  priority: string;
  status: string;
  assignedTo: string | null;
  description: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TicketFormData {
  title: string;
  raisedBy: string;
  category: string;
  priority: string;
  assignedTo: string;
  description: string;
  status: string;
}

const emptyForm: TicketFormData = {
  title: '', raisedBy: '', category: 'Technical', priority: 'Medium',
  assignedTo: '', description: '', status: 'Open',
};

// ── Helpers ────────────────────────────────────────────
function priorityColor(p: string) {
  switch (p?.toLowerCase()) {
    case 'low': return 'bg-[#5a6878]/15 text-[#8899aa] border-[#5a6878]/40';
    case 'medium': return 'bg-[#f5a623]/15 text-[#f5a623] border-[#f5a623]/40';
    case 'high': return 'bg-[#ff3d3d]/15 text-[#ff3d3d] border-[#ff3d3d]/40';
    case 'critical': return 'bg-[#ff3d3d]/25 text-[#ff3d3d] border-[#ff3d3d]/60 animate-pulse';
    default: return 'bg-[#5a6878]/15 text-[#8899aa] border-[#5a6878]/40';
  }
}

function statusColor(s: string) {
  switch (s?.toLowerCase()) {
    case 'open': return 'bg-[#f5a623]/15 text-[#f5a623] border-[#f5a623]/40';
    case 'in progress': return 'bg-[#00d4ff]/15 text-[#00d4ff] border-[#00d4ff]/40';
    case 'resolved': return 'bg-[#00e676]/15 text-[#00e676] border-[#00e676]/40';
    case 'closed': return 'bg-[#5a6878]/15 text-[#8899aa] border-[#5a6878]/40';
    default: return 'bg-[#5a6878]/15 text-[#8899aa] border-[#5a6878]/40';
  }
}

function categoryColor(c: string) {
  switch (c?.toLowerCase()) {
    case 'technical': return 'text-[#00d4ff]';
    case 'finance': return 'text-[#00e676]';
    case 'hr': return 'text-[#b388ff]';
    case 'feature request': return 'text-[#f5a623]';
    default: return 'text-[#8899aa]';
  }
}

function formatDate(d: string) {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

function formatDateFull(d: string) {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
export default function SupportModule() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [form, setForm] = useState<TicketFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/support');
      const json = await res.json();
      if (json.success) setTickets(json.data || []);
      else setError(json.error || 'Failed to load support tickets');
    } catch { setError('Network error fetching support tickets'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalTickets = tickets.length;
  const openCount = tickets.filter(t => t.status === 'Open').length;
  const inProgressCount = tickets.filter(t => t.status === 'In Progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;

  const openCreate = () => { setForm(emptyForm); setCreateOpen(true); };
  const openEdit = (t: Ticket) => {
    setForm({
      title: t.title, raisedBy: t.raisedBy, category: t.category,
      priority: t.priority, assignedTo: t.assignedTo || '',
      description: t.description || '', status: t.status,
    });
    setSelectedId(t.id);
    setEditOpen(true);
  };
  const openView = (t: Ticket) => {
    setSelectedTicket(t);
    setViewOpen(true);
  };
  const openDelete = (id: string) => { setSelectedId(id); setDeleteOpen(true); };

  const handleSubmit = async (mode: 'create' | 'edit') => {
    setSubmitting(true);
    try {
      const url = '/api/support';
      const method = mode === 'create' ? 'POST' : 'PUT';
      const body = mode === 'edit' ? { id: selectedId, ...form } : form;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(mode === 'create' ? 'Ticket created successfully' : 'Ticket updated successfully');
        if (mode === 'create') setCreateOpen(false); else setEditOpen(false);
        fetchData();
      } else {
        toast.error(json.error || `Failed to ${mode} ticket`);
      }
    } catch { toast.error(`Failed to ${mode} ticket`); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/support', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedId }) });
      const json = await res.json();
      if (json.success) {
        toast.success('Ticket deleted successfully');
        setDeleteOpen(false);
        fetchData();
      } else { toast.error(json.error || 'Failed to delete ticket'); }
    } catch { toast.error('Failed to delete ticket'); }
    finally { setSubmitting(false); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Ticket status updated to ${status}`);
        fetchData();
      } else {
        toast.error(json.error || 'Failed to update ticket status');
      }
    } catch { toast.error('Failed to update ticket status'); }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <MessageSquare size={40} className="text-[#ff3d3d]" />
        <p className="text-[#8899aa] text-sm">{error}</p>
        <button className="vc-btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (loading) return <LoadingSkeleton />;

  const dialogContent = (isEdit: boolean) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
      <FormField label="Ticket Title">
        <input className={inputCls} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Unable to access project files" />
      </FormField>
      <FormField label="Raised By">
        <input className={inputCls} value={form.raisedBy} onChange={e => setForm(f => ({ ...f, raisedBy: e.target.value }))} placeholder="Rajesh Kumar" />
      </FormField>
      <FormField label="Category">
        <select className={selectCls} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
          <option value="Technical">Technical</option>
          <option value="Finance">Finance</option>
          <option value="HR">HR</option>
          <option value="Feature Request">Feature Request</option>
          <option value="General">General</option>
        </select>
      </FormField>
      <FormField label="Priority">
        <select className={selectCls} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
      </FormField>
      <FormField label="Assigned To">
        <input className={inputCls} value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="Support Team" />
      </FormField>
      {isEdit && (
        <FormField label="Status">
          <select className={selectCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </FormField>
      )}
      <FormField label="Description" span>
        <textarea className={`${inputCls} min-h-[100px] resize-none`} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the issue in detail..." />
      </FormField>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} label="Total Tickets" value={totalTickets} color="#f5a623" sub="All time" />
        <StatCard icon={AlertCircle} label="Open" value={openCount} color="#f5a623" sub="Awaiting action" />
        <StatCard icon={Clock} label="In Progress" value={inProgressCount} color="#00d4ff" sub="Being worked on" />
        <StatCard icon={CheckCircle2} label="Resolved" value={resolvedCount} color="#00e676" sub="Closed tickets" />
      </div>

      {/* ── Tickets Table ── */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <MessageSquare size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-bold text-[#e2e8f0]">Support Tickets</span>
          <span className="ml-auto text-[10px] text-[#5a6878]">{tickets.length} tickets</span>
          <button className="vc-btn-primary ml-2 flex items-center gap-1" onClick={openCreate}>
            <Plus size={13} /> New Ticket
          </button>
        </div>

        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#5a6878]">
            <MessageSquare size={36} className="mb-2 opacity-40" />
            <p className="text-[12px]">No tickets found</p>
            <p className="text-[10px] mt-1">Create a new support ticket to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[#252e3a] bg-[#141920]/50">
                  {['Ticket No', 'Title', 'Raised By', 'Category', 'Priority', 'Status', 'Assigned To', 'Created', '', ''].map(h => (
                    <th key={h} className="text-left px-3 py-[9px] text-[9px] font-bold uppercase tracking-wider text-[#5a6878] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} className="border-b border-[#252e3a]/60 hover:bg-[#141920] transition-colors group">
                    <td className="px-3 py-[10px] font-semibold text-[#f5a623] whitespace-nowrap cursor-pointer hover:text-[#e8891a]" style={{ fontFamily: "'Share Tech Mono', monospace" }} onClick={() => openView(t)}>
                      {t.ticketNo}
                    </td>
                    <td className="px-3 py-[10px] text-[#e2e8f0] whitespace-nowrap max-w-[200px] truncate font-medium cursor-pointer hover:text-[#f5a623]" onClick={() => openView(t)}>
                      {t.title}
                    </td>
                    <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap max-w-[120px] truncate">
                      <span className="flex items-center gap-1"><User size={10} className="text-[#5a6878] shrink-0" />{t.raisedBy}</span>
                    </td>
                    <td className="px-3 py-[10px] whitespace-nowrap font-medium">
                      <span className={categoryColor(t.category)}>{t.category}</span>
                    </td>
                    <td className="px-3 py-[10px] whitespace-nowrap">
                      <span className={`vc-badge border ${priorityColor(t.priority)}`}>{t.priority}</span>
                    </td>
                    <td className="px-3 py-[10px] whitespace-nowrap">
                      <span className={`vc-badge border ${statusColor(t.status)}`}>{t.status}</span>
                    </td>
                    <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap max-w-[120px] truncate">{t.assignedTo || '—'}</td>
                    <td className="px-3 py-[10px] text-[#5a6878] whitespace-nowrap">{formatDate(t.createdAt)}</td>
                    <td className="px-3 py-[10px] whitespace-nowrap">
                      {t.status === 'Open' && (
                        <button
                          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-[#00d4ff]/15 text-[#00d4ff] hover:bg-[#00d4ff]/25 border border-[#00d4ff]/30 transition-colors"
                          onClick={() => handleStatusChange(t.id, 'In Progress')}
                        >
                          <Play size={10} /> Start
                        </button>
                      )}
                      {t.status === 'In Progress' && (
                        <button
                          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-[#00e676]/15 text-[#00e676] hover:bg-[#00e676]/25 border border-[#00e676]/30 transition-colors"
                          onClick={() => handleStatusChange(t.id, 'Resolved')}
                        >
                          <CircleCheck size={10} /> Resolve
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-[10px] whitespace-nowrap">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" onClick={() => openEdit(t)}><Pencil size={13} /></button>
                        <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" onClick={() => openDelete(t.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Create New Ticket</DialogTitle></DialogHeader>
          {dialogContent(false)}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('create')}>
              {submitting ? 'Creating...' : 'Create Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Edit Ticket</DialogTitle></DialogHeader>
          {dialogContent(true)}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('edit')}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Dialog ── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-xl">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <span className="text-[#f5a623] font-bold text-sm" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{selectedTicket.ticketNo}</span>
                  <span className={`vc-badge border ${statusColor(selectedTicket.status)}`}>{selectedTicket.status}</span>
                  <span className={`vc-badge border ${priorityColor(selectedTicket.priority)}`}>{selectedTicket.priority}</span>
                </div>
                <DialogTitle className="text-[#e2e8f0] text-base">{selectedTicket.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <div>
                    <span className="text-[10px] text-[#5a6878] uppercase tracking-wider font-semibold">Raised By</span>
                    <p className="text-[#e2e8f0]">{selectedTicket.raisedBy}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#5a6878] uppercase tracking-wider font-semibold">Category</span>
                    <p className={categoryColor(selectedTicket.category)}>{selectedTicket.category}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#5a6878] uppercase tracking-wider font-semibold">Assigned To</span>
                    <p className="text-[#e2e8f0]">{selectedTicket.assignedTo || 'Unassigned'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#5a6878] uppercase tracking-wider font-semibold">Created</span>
                    <p className="text-[#e2e8f0]">{formatDateFull(selectedTicket.createdAt)}</p>
                  </div>
                </div>
                {selectedTicket.description && (
                  <div>
                    <span className="text-[10px] text-[#5a6878] uppercase tracking-wider font-semibold">Description</span>
                    <div className="mt-1 p-3 rounded-md bg-[#141920] border border-[#2e3a48] text-[12px] text-[#8899aa] whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                      {selectedTicket.description}
                    </div>
                  </div>
                )}
                {selectedTicket.resolution && (
                  <div>
                    <span className="text-[10px] text-[#5a6878] uppercase tracking-wider font-semibold">Resolution</span>
                    <div className="mt-1 p-3 rounded-md bg-[#00e676]/5 border border-[#00e676]/20 text-[12px] text-[#00e676] whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                      {selectedTicket.resolution}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Delete Ticket</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-[#ff3d3d]/15 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={20} className="text-[#ff3d3d]" />
            </div>
            <div>
              <p className="text-[13px] text-[#e2e8f0] mb-1">Are you sure you want to delete this ticket?</p>
              <p className="text-[11px] text-[#8899aa]">This action cannot be undone. All associated data will be permanently removed.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#cc2020] font-semibold" disabled={submitting} onClick={handleDelete}>
              {submitting ? 'Deleting...' : 'Delete Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
