'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, Users, UserCheck, Handshake, Plus, FileText, Pencil,
  Trash2, AlertTriangle, Mail, Phone, Building, Tag, Eye,
  IndianRupee, Calendar
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';

// ── Types ──────────────────────────────────────────────
interface Contact {
  id: string;
  name: string;
  company: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  stage: string;
  value: number;
  lastContact: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
}

interface ContactFormData {
  name: string;
  company: string;
  designation: string;
  email: string;
  phone: string;
  source: string;
  stage: string;
  value: string;
  lastContact: string;
  notes: string;
  status: string;
}

const emptyForm: ContactFormData = {
  name: '', company: '', designation: '', email: '', phone: '',
  source: 'Cold Outreach', stage: 'Lead', value: '', lastContact: '', notes: '', status: 'Active',
};

// ── Helpers ────────────────────────────────────────────
function stageColor(s: string) {
  switch (s?.toLowerCase()) {
    case 'lead': return 'bg-[#f5a623]/15 text-[#f5a623] border-[#f5a623]/40';
    case 'qualification': return 'bg-[#00d4ff]/15 text-[#00d4ff] border-[#00d4ff]/40';
    case 'proposal': return 'bg-[#b388ff]/15 text-[#b388ff] border-[#b388ff]/40';
    case 'negotiation': return 'bg-[#ffab40]/15 text-[#ffab40] border-[#ffab40]/40';
    case 'client': return 'bg-[#00e676]/15 text-[#00e676] border-[#00e676]/40';
    default: return 'bg-[#5a6878]/15 text-[#8899aa] border-[#5a6878]/40';
  }
}

function sourceColor(s: string) {
  switch (s?.toLowerCase()) {
    case 'existing client': return 'bg-[#00e676]/15 text-[#00e676] border-[#00e676]/40';
    case 'referral': return 'bg-[#b388ff]/15 text-[#b388ff] border-[#b388ff]/40';
    case 'industry event': return 'bg-[#00d4ff]/15 text-[#00d4ff] border-[#00d4ff]/40';
    case 'website': return 'bg-[#f5a623]/15 text-[#f5a623] border-[#f5a623]/40';
    default: return 'bg-[#5a6878]/15 text-[#8899aa] border-[#5a6878]/40';
  }
}

function statusDot(s: string) {
  return s?.toLowerCase() === 'active' ? 'bg-[#00e676]' : 'bg-[#5a6878]';
}

function formatDate(d: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

function formatCurrency(val: number) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val.toLocaleString('en-IN')}`;
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
export default function CrmModule() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/crm');
      const json = await res.json();
      if (json.success) setContacts(json.data.contacts);
      else setError(json.error || 'Failed to load CRM contacts');
    } catch { setError('Network error fetching CRM contacts'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalContacts = contacts.length;
  const leadsCount = contacts.filter(c => c.stage === 'Lead').length;
  const proposalsCount = contacts.filter(c => c.stage === 'Proposal').length;
  const clientsCount = contacts.filter(c => c.stage === 'Client').length;
  const totalValue = contacts.reduce((sum, c) => sum + (c.value || 0), 0);

  const openCreate = () => { setForm(emptyForm); setCreateOpen(true); };
  const openEdit = (c: Contact) => {
    setForm({
      name: c.name, company: c.company, designation: c.designation || '',
      email: c.email || '', phone: c.phone || '', source: c.source, stage: c.stage,
      value: String(c.value || ''), lastContact: c.lastContact ? c.lastContact.split('T')[0] : '',
      notes: c.notes || '', status: c.status,
    });
    setSelectedId(c.id);
    setEditOpen(true);
  };
  const openDelete = (id: string) => { setSelectedId(id); setDeleteOpen(true); };

  const handleSubmit = async (mode: 'create' | 'edit') => {
    setSubmitting(true);
    try {
      const url = '/api/crm';
      const method = mode === 'create' ? 'POST' : 'PUT';
      const body = mode === 'edit' ? { id: selectedId, ...form, value: parseFloat(form.value) || 0 } : { ...form, value: parseFloat(form.value) || 0 };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(mode === 'create' ? 'Contact created successfully' : 'Contact updated successfully');
        if (mode === 'create') setCreateOpen(false); else setEditOpen(false);
        fetchData();
      } else {
        toast.error(json.error || `Failed to ${mode} contact`);
      }
    } catch { toast.error(`Failed to ${mode} contact`); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/crm', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedId }) });
      const json = await res.json();
      if (json.success) {
        toast.success('Contact deleted successfully');
        setDeleteOpen(false);
        fetchData();
      } else { toast.error(json.error || 'Failed to delete contact'); }
    } catch { toast.error('Failed to delete contact'); }
    finally { setSubmitting(false); }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Briefcase size={40} className="text-[#ff3d3d]" />
        <p className="text-[#8899aa] text-sm">{error}</p>
        <button className="vc-btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (loading) return <LoadingSkeleton />;

  const dialogContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
      <FormField label="Contact Name">
        <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Rajesh Sharma" />
      </FormField>
      <FormField label="Company">
        <input className={inputCls} value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Tata Power" />
      </FormField>
      <FormField label="Designation">
        <input className={inputCls} value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="Project Manager" />
      </FormField>
      <FormField label="Email">
        <input className={inputCls} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="rajesh@tata.com" />
      </FormField>
      <FormField label="Phone">
        <input className={inputCls} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
      </FormField>
      <FormField label="Source">
        <select className={selectCls} value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
          <option value="Cold Outreach">Cold Outreach</option>
          <option value="Existing Client">Existing Client</option>
          <option value="Referral">Referral</option>
          <option value="Industry Event">Industry Event</option>
          <option value="Website">Website</option>
        </select>
      </FormField>
      <FormField label="Stage">
        <select className={selectCls} value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
          <option value="Lead">Lead</option>
          <option value="Qualification">Qualification</option>
          <option value="Proposal">Proposal</option>
          <option value="Negotiation">Negotiation</option>
          <option value="Client">Client</option>
        </select>
      </FormField>
      <FormField label="Deal Value (₹)">
        <input className={inputCls} type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="5000000" />
      </FormField>
      <FormField label="Last Contact Date">
        <input className={inputCls} type="date" value={form.lastContact} onChange={e => setForm(f => ({ ...f, lastContact: e.target.value }))} />
      </FormField>
      <FormField label="Status">
        <select className={selectCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Lost">Lost</option>
        </select>
      </FormField>
      <FormField label="Notes" span>
        <textarea className={`${inputCls} min-h-[80px] resize-none`} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes about this contact..." />
      </FormField>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Contacts" value={totalContacts} color="#f5a623" sub="All pipeline" />
        <StatCard icon={Briefcase} label="Leads" value={leadsCount} color="#f5a623" sub="New prospects" />
        <StatCard icon={FileText} label="Proposals" value={proposalsCount} color="#b388ff" sub="Awaiting response" />
        <StatCard icon={UserCheck} label="Clients" value={clientsCount} color="#00e676" sub={`Pipeline value ${formatCurrency(totalValue)}`} />
      </div>

      {/* ── Contacts Table ── */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Briefcase size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-bold text-[#e2e8f0]">CRM Pipeline</span>
          <span className="ml-auto text-[10px] text-[#5a6878]">{contacts.length} contacts</span>
          <button className="vc-btn-primary ml-2 flex items-center gap-1" onClick={openCreate}>
            <Plus size={13} /> New Contact
          </button>
        </div>

        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#5a6878]">
            <Briefcase size={36} className="mb-2 opacity-40" />
            <p className="text-[12px]">No contacts found</p>
            <p className="text-[10px] mt-1">Add your first CRM contact to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[#252e3a] bg-[#141920]/50">
                  {['Name', 'Company', 'Designation', 'Email', 'Phone', 'Source', 'Stage', 'Value', 'Last Contact', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-3 py-[9px] text-[9px] font-bold uppercase tracking-wider text-[#5a6878] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} className="border-b border-[#252e3a]/60 hover:bg-[#141920] transition-colors group">
                    <td className="px-3 py-[10px] whitespace-nowrap max-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${statusDot(c.status)}`} />
                        <span className="text-[#e2e8f0] font-medium truncate">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap max-w-[120px] truncate">{c.company}</td>
                    <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap max-w-[110px] truncate">{c.designation || '—'}</td>
                    <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap max-w-[150px] truncate">
                      {c.email ? (
                        <span className="flex items-center gap-1"><Mail size={10} className="text-[#5a6878] shrink-0" />{c.email}</span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap">
                      {c.phone ? (
                        <span className="flex items-center gap-1"><Phone size={10} className="text-[#5a6878] shrink-0" />{c.phone}</span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-[10px] whitespace-nowrap">
                      <span className={`vc-badge border ${sourceColor(c.source)}`}>{c.source}</span>
                    </td>
                    <td className="px-3 py-[10px] whitespace-nowrap">
                      <span className={`vc-badge border ${stageColor(c.stage)}`}>{c.stage}</span>
                    </td>
                    <td className="px-3 py-[10px] whitespace-nowrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      <span className="text-[#00e676]">{c.value > 0 ? formatCurrency(c.value) : '—'}</span>
                    </td>
                    <td className="px-3 py-[10px] text-[#5a6878] whitespace-nowrap">{formatDate(c.lastContact)}</td>
                    <td className="px-3 py-[10px] whitespace-nowrap">
                      <span className={`vc-badge border ${c.status === 'Active' ? 'bg-[#00e676]/15 text-[#00e676] border-[#00e676]/40' : c.status === 'Inactive' ? 'bg-[#5a6878]/15 text-[#8899aa] border-[#5a6878]/40' : 'bg-[#ff3d3d]/15 text-[#ff3d3d] border-[#ff3d3d]/40'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-[10px] whitespace-nowrap">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" onClick={() => openEdit(c)}><Pencil size={13} /></button>
                        <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" onClick={() => openDelete(c.id)}><Trash2 size={13} /></button>
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
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Add New Contact</DialogTitle></DialogHeader>
          {dialogContent()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('create')}>
              {submitting ? 'Creating...' : 'Create Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Edit Contact</DialogTitle></DialogHeader>
          {dialogContent()}
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
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Delete Contact</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-[#ff3d3d]/15 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={20} className="text-[#ff3d3d]" />
            </div>
            <div>
              <p className="text-[13px] text-[#e2e8f0] mb-1">Are you sure you want to delete this contact?</p>
              <p className="text-[11px] text-[#8899aa]">This action cannot be undone. All associated data will be permanently removed.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#cc2020] font-semibold" disabled={submitting} onClick={handleDelete}>
              {submitting ? 'Deleting...' : 'Delete Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
