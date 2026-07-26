'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowDownCircle, Plus, Pencil, Trash2, Loader2, Send, Save, CircleDot, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useERPStore } from '@/store/erp-store';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';

interface ARRecord {
  id: number; invoiceNo: string; client: string; clientCode: string | null;
  invoiceRef?: string | null; description: string | null; amount: number; tax: number; totalAmount: number;
  dueDate: string; receivedDate: string | null; status: string;
  siteId: number | null; partyId: number | null; jobCode: string | null;
  site?: { name: string; siteCode: string } | null;
}

interface LineItem { id: number; description: string; glAccount: string; quantity: number; unitPrice: number; }
interface SiteRef { id: number; name: string; siteCode: string; }
interface PartyRef { id: number; name: string; }

interface FormData {
  invoiceNo: string; client: string; clientCode: string; invoiceRef: string;
  description: string; invoiceDate: string; dueDate: string; totalAmount: number; status: string;
  siteId: string; partyId: string; jobCode: string;
}

const AR_COLUMNS: ExportColumn<ARRecord>[] = [
  { header: 'Invoice No', accessor: 'invoiceNo' },
  { header: 'Client', accessor: 'client' },
  { header: 'Client Code', accessor: 'clientCode' },
  { header: 'Invoice Ref', accessor: 'invoiceRef' },
  { header: 'Description', accessor: 'description' },
  { header: 'Amount', accessor: 'amount' },
  { header: 'Tax', accessor: 'tax' },
  { header: 'Total Amount', accessor: 'totalAmount' },
  { header: 'Due Date', accessor: (r) => r.dueDate?.split('T')[0] ?? '' },
  { header: 'Received Date', accessor: (r) => r.receivedDate?.split('T')[0] ?? '' },
  { header: 'Status', accessor: 'status' },
];

const AR_IMPORT_FIELDS: ImportField[] = [
  { key: 'invoiceNo', label: 'Invoice No', required: true },
  { key: 'client', label: 'Client', required: true },
  { key: 'clientCode', label: 'Client Code' },
  { key: 'invoiceRef', label: 'Invoice Ref' },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount', type: 'number' },
  { key: 'tax', label: 'Tax', type: 'number' },
  { key: 'totalAmount', label: 'Total Amount', type: 'number' },
  { key: 'dueDate', label: 'Due Date', required: true, type: 'date' },
  { key: 'status', label: 'Status' },
];
const AR_SAMPLE_ROW = { invoiceNo: 'AR/2024-25/001', client: 'NTPC Ltd', clientCode: 'NTPC-001', invoiceRef: 'REF-001', description: 'Electrical panel installation', amount: 4500000, tax: 810000, totalAmount: 5310000, dueDate: '2025-02-15', status: 'Pending' };

const EMPTY_FORM: FormData = { invoiceNo: '', client: '', clientCode: '', invoiceRef: '', description: '', invoiceDate: '', dueDate: '', totalAmount: 0, status: 'Pending', siteId: '', partyId: '', jobCode: '' };
const NEW_LINE = (): LineItem => ({ id: Date.now() + Math.random(), description: '', glAccount: '', quantity: 1, unitPrice: 0 });

function generateMockAR(): ARRecord[] {
  return [
    { id: 1, invoiceNo: 'AR/2024-25/001', client: 'NTPC Ltd', clientCode: 'NTPC-001', invoiceRef: 'REF-001', description: 'Electrical panel installation', amount: 4500000, tax: 810000, totalAmount: 5310000, dueDate: '2025-02-15T00:00:00', receivedDate: '2025-02-10T00:00:00', siteId: null, partyId: null, jobCode: null, status: 'Received' },
    { id: 2, invoiceNo: 'AR/2024-25/002', client: 'BALCO', clientCode: 'BALCO-002', invoiceRef: 'REF-002', description: 'Cable tray supply & installation', amount: 2800000, tax: 504000, totalAmount: 3304000, dueDate: '2025-03-20T00:00:00', receivedDate: null, siteId: null, partyId: null, jobCode: null, status: 'Pending' },
    { id: 3, invoiceNo: 'AR/2024-25/003', client: 'Coal India', clientCode: 'CIL-003', invoiceRef: 'REF-003', description: 'DG set annual maintenance', amount: 1200000, tax: 216000, totalAmount: 1416000, dueDate: '2025-01-10T00:00:00', receivedDate: null, siteId: null, partyId: null, jobCode: null, status: 'Overdue' },
    { id: 4, invoiceNo: 'AR/2024-25/004', client: 'Vedanta Ltd', clientCode: 'VED-004', invoiceRef: 'REF-004', description: 'Transformer oil filtration', amount: 3500000, tax: 630000, totalAmount: 4130000, dueDate: '2025-04-05T00:00:00', receivedDate: '2025-04-01T00:00:00', siteId: null, partyId: null, jobCode: null, status: 'Received' },
    { id: 5, invoiceNo: 'AR/2024-25/005', client: 'Hindalco', clientCode: 'HIN-005', invoiceRef: 'REF-005', description: 'Substation commissioning', amount: 6200000, tax: 1116000, totalAmount: 7316000, dueDate: '2025-05-15T00:00:00', receivedDate: null, siteId: null, partyId: null, jobCode: null, status: 'Pending' },
  ];
}

export default function AccountsReceivable() {
  const [records, setRecords] = useState<ARRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editTarget, setEditTarget] = useState<ARRecord | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ARRecord | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [lines, setLines] = useState<LineItem[]>([{ id: 1, description: '', glAccount: '', quantity: 1, unitPrice: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [importOpen, setImportOpen] = useState(false);
  const [sites, setSites] = useState<SiteRef[]>([]);
  const [parties, setParties] = useState<PartyRef[]>([]);
  const { triggerCreate } = useERPStore();

  useEffect(() => {
    fetch('/api/fin/sites').then(r => r.json()).then(j => { if (j.success) setSites(j.data); }).catch(() => {});
    fetch('/api/fin/parties').then(r => r.json()).then(j => { if (j.success) setParties(j.data); }).catch(() => {});
  }, []);

  const statuses = useMemo(() => [...new Set(records.map(r => r.status))], [records]);
  const statusFiltered = useMemo(
    () => statusFilter === 'all' ? records : records.filter(r => r.status === statusFilter),
    [records, statusFilter]
  );
  const tc = useTableControls(statusFiltered, (r) => `${r.invoiceNo} ${r.client} ${r.clientCode ?? ''} ${r.description ?? ''} ${r.status}`);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/accounts-receivable');
      const json = await res.json();
      if (json.success && json.data?.length) { setRecords(json.data); }
      else { setRecords(generateMockAR()); toast.info('Sample data — no server records found'); }
    } catch { setRecords(generateMockAR()); toast.info('Sample data — API unavailable'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = useCallback(() => { setEditTarget(null); setForm(EMPTY_FORM); setLines([{ id: 1, description: '', glAccount: '', quantity: 1, unitPrice: 0 }]); setView('form'); }, []);

  useEffect(() => { if (triggerCreate > 0) openCreate(); }, [triggerCreate, openCreate]);

  const openEdit = (r: ARRecord) => {
    setEditTarget(r);
    setForm({ invoiceNo: r.invoiceNo, client: r.client, clientCode: r.clientCode || '', invoiceRef: r.invoiceRef || '', description: r.description || '', invoiceDate: '', dueDate: r.dueDate?.split('T')[0] || '', totalAmount: r.totalAmount, status: r.status, siteId: r.siteId ? String(r.siteId) : '', partyId: r.partyId ? String(r.partyId) : '', jobCode: r.jobCode || '' });
    setLines([{ id: 1, description: r.description || '', glAccount: '', quantity: 1, unitPrice: r.amount }]);
    setView('form');
  };

  const addLine = () => setLines(prev => [...prev, NEW_LINE()]);
  const removeLine = (i: number) => setLines(prev => prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof LineItem, value: string | number) => setLines(prev => { const u = [...prev]; u[i] = { ...u[i], [field]: value }; return u; });
  const lineTotal = lines.reduce((s, l) => s + (l.quantity * l.unitPrice), 0);

  const subtotal = lineTotal || form.totalAmount || 0;
  const gst = subtotal * 0.18;
  const grandTotal = subtotal + gst;

  const handleSubmit = async (status: string) => {
    if (!form.invoiceNo || !form.client || !form.dueDate) { toast.error('Invoice No, Client, and Due Date are required'); return; }
    setSubmitting(true);
    const amount = subtotal;
    const tax = amount * 0.18;
    try {
      const method = editTarget ? 'PUT' : 'POST';
      const payload = {
        invoiceNo: form.invoiceNo, client: form.client, clientCode: form.clientCode,
        invoiceRef: form.invoiceRef, description: form.description,
        amount, tax, totalAmount: amount + tax, dueDate: new Date(form.dueDate), status,
        siteId: form.siteId ? Number(form.siteId) : null,
        partyId: form.partyId ? Number(form.partyId) : null,
        jobCode: form.jobCode || null,
      };
      const body = editTarget ? { id: editTarget.id, ...payload } : payload;
      const res = await fetch('/api/accounts-receivable', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) { toast.success(editTarget ? 'Invoice updated' : status === 'Pending' ? 'Saved as draft' : 'Invoice created'); setView('list'); await fetchData(); }
      else { toast.error(json.error || 'Operation failed'); }
    } catch { toast.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/accounts-receivable?id=${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { toast.success('Record deleted'); setDeleteOpen(false); await fetchData(); }
      else { toast.error(json.error || 'Delete failed'); }
    } catch { toast.error('Network error'); }
  };

  const statusBadge = (s: string) => {
    if (s === 'Received') return 'bg-[#00e676]/15 text-[#00e676]';
    if (s === 'Pending') return 'bg-[#ffab40]/15 text-[#ffab40]';
    if (s === 'Overdue') return 'bg-[#ff3d3d]/15 text-[#ff3d3d]';
    if (s === 'Partially Received') return 'bg-[#00d4ff]/15 text-[#00d4ff]';
    return 'bg-[#5a6878]/15 text-[#5a6878]';
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  if (importOpen) {
    return (
      <ImportWizard
        title="Accounts Receivable"
        fields={AR_IMPORT_FIELDS}
        keyField="invoiceNo"
        existingKeys={new Set(records.map(r => r.invoiceNo))}
        commitEndpoint="/api/accounts-receivable/import"
        sampleRow={AR_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetchData}
      />
    );
  }

  // ═══════════════════════════════════════════════════════
  // FORM VIEW — invoice-style full page (new + edit)
  // ═══════════════════════════════════════════════════════
  if (view === 'form') {
    return (
      <div className="space-y-5 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] text-[#f5a623] mb-1"><button onClick={() => setView('list')} className="hover:underline">Accounts Receivable</button><span className="text-[#5a6878]">{' > '}</span><span className="text-[#e2e8f0]">{editTarget ? `Edit ${editTarget.invoiceNo}` : 'New Invoice'}</span></div>
            <h2 className="text-[24px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{editTarget ? 'Edit AR Invoice' : 'Raise AR Invoice'}</h2>
            <p className="text-[11px] text-[#5a6878] mt-0.5">{editTarget ? 'Update client invoice details and line allocations.' : 'Raise a receivable invoice against a client.'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleSubmit('Pending')} disabled={submitting} className="px-4 py-2 rounded-lg border border-[#f5a623] text-[#f5a623] text-[12px] font-semibold hover:bg-[#f5a623]/10 disabled:opacity-50 flex items-center gap-1.5"><Save size={13} /> Save Draft</button>
            <button onClick={() => handleSubmit(editTarget ? form.status : 'Pending')} disabled={submitting} className="px-4 py-2 rounded-lg bg-[#f5a623] text-[#0a0d12] text-[12px] font-semibold hover:bg-[#e8991a] disabled:opacity-50 flex items-center gap-1.5">{submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} {editTarget ? 'Update Invoice' : 'Submit Invoice'}</button>
          </div>
        </div>

        {/* Invoice totals */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center justify-between"><span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Subtotal</span><span className="text-[14px] font-bold text-[#e2e8f0] font-mono">&#8377;{(subtotal ?? 0).toLocaleString('en-IN')}</span></div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center justify-between"><span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">GST (18%)</span><span className="text-[14px] font-bold text-[#ffab40] font-mono">&#8377;{(gst ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center justify-between"><span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Grand Total</span><span className="text-[14px] font-bold text-[#00e676] font-mono">&#8377;{(grandTotal ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
        </div>

        {/* Invoice Details */}
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Client (Linked)</label>
              <select value={form.partyId} onChange={e => { const id = e.target.value; const party = parties.find(p => String(p.id) === id); setForm(p => ({ ...p, partyId: id, client: party?.name || p.client })); }} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none">
                <option value="">{form.client || 'Select client...'}</option>
                {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Client Name (if not in master)</label>
              <input value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} placeholder="Free-text client name" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Client Code</label>
              <input value={form.clientCode} onChange={e => setForm(p => ({ ...p, clientCode: e.target.value }))} placeholder="CL-0000" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Site</label>
              <select value={form.siteId} onChange={e => setForm(p => ({ ...p, siteId: e.target.value }))} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none">
                <option value="">— Unassigned —</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>)}
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Job Code</label>
              <input value={form.jobCode} onChange={e => setForm(p => ({ ...p, jobCode: e.target.value }))} placeholder="JOB-2026-001" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Invoice No *</label><input value={form.invoiceNo} onChange={e => setForm(p => ({ ...p, invoiceNo: e.target.value }))} placeholder="INV-2025-001" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></div>
            <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Invoice Date</label><input type="date" value={form.invoiceDate} onChange={e => setForm(p => ({ ...p, invoiceDate: e.target.value }))} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none" /></div>
            <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Due Date *</label><input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none" /></div>
            <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">PO / Ref No</label><input value={form.invoiceRef} onChange={e => setForm(p => ({ ...p, invoiceRef: e.target.value }))} placeholder="PO-XXXX" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3"><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Description</label><input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Work description..." className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></div>
            <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Status</label><select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none"><option value="Pending">Pending</option><option value="Received">Received</option><option value="Partially Received">Partially Received</option><option value="Overdue">Overdue</option></select></div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#252e3a]">
            <h3 className="text-[13px] font-semibold text-[#e2e8f0]">Line Item Allocations</h3>
            <button onClick={addLine} className="flex items-center gap-1.5 text-[#f5a623] text-[12px] font-semibold hover:text-[#e8991a] transition-colors"><Plus size={14} className="border border-[#f5a623] rounded-full" /> ADD LINE</button>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-[11px]"><thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
            <th className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[40%]">Description</th>
            <th className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[23%]">GL Account</th>
            <th className="text-right py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[12%]">Qty</th>
            <th className="text-right py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[15%]">Unit Price</th>
            <th className="text-right py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[15%]">Amount</th>
            <th className="w-[5%]"></th>
          </tr></thead><tbody>
            {lines.map((line, i) => (
              <tr key={line.id} className="border-b border-[#1a2028] hover:bg-[#141920]">
                <td className="py-3 px-4"><input value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Item description..." className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-3 px-4"><input value={line.glAccount} onChange={e => updateLine(i, 'glAccount', e.target.value)} placeholder="4100 - Service Revenue" className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-3 px-4"><input type="number" value={line.quantity || ''} onChange={e => updateLine(i, 'quantity', Number(e.target.value) || 0)} className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[13px] text-right text-[#e2e8f0] font-mono focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-3 px-4"><input type="number" value={line.unitPrice || ''} onChange={e => updateLine(i, 'unitPrice', Number(e.target.value) || 0)} placeholder="0.00" className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[13px] text-right text-[#e2e8f0] font-mono focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-3 px-4 text-right text-[13px] text-[#8899aa] font-mono">&#8377;{((line.quantity ?? 0) * (line.unitPrice ?? 0)).toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-center"><button onClick={() => removeLine(i)} className="p-1.5 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            <tr className="bg-[#0a0d12] border-t border-[#252e3a]">
              <td colSpan={4} className="py-3 px-4 text-right"><span className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Subtotal</span></td>
              <td className="py-3 px-4 text-right"><span className="text-[14px] font-bold text-[#e2e8f0] font-mono">&#8377;{(subtotal ?? 0).toLocaleString('en-IN')}</span></td>
              <td></td>
            </tr>
          </tbody></table></div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#161c24] border border-[#252e3a] rounded-xl">
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Grand Total: <span className="text-[#f5a623]">&#8377;{(grandTotal ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></span>
          <div className="flex items-center gap-4 text-[11px] text-[#5a6878]">
            <div className="flex items-center gap-1.5"><CircleDot size={12} className="text-[#00e676]" /> GST @18% applied</div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════════════════════
  const totalPending = records.filter(r => r.status === 'Pending' || r.status === 'Partially Received').reduce((s, r) => s + r.totalAmount, 0);
  const totalReceived = records.filter(r => r.status === 'Received').reduce((s, r) => s + r.totalAmount, 0);
  const totalOverdue = records.filter(r => r.status === 'Overdue').reduce((s, r) => s + r.totalAmount, 0);

  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ffab40]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Pending</div><div className="text-[20px] font-bold text-[#ffab40]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalPending / 10000000).toFixed(2)} Cr</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Received</div><div className="text-[20px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalReceived / 10000000).toFixed(2)} Cr</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ff3d3d]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Overdue</div><div className="text-[20px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalOverdue / 100000).toFixed(2)} L</div></div>
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header">
          <ArrowDownCircle size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Accounts Receivable</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length} Invoices</span>
          <div className="flex items-center gap-2 ml-2">
            <button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button>
            <ExportButton records={records} columns={AR_COLUMNS} filename="accounts-receivable" />
          </div>
          <button onClick={openCreate} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Invoice</button>
        </div>
        <div className="px-4 py-3 border-b border-[#252e3a] flex items-center gap-3 flex-wrap">
          <SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search invoice, client..." />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none min-w-[130px]"><option value="all">All Status</option>{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select>
          {(tc.search || statusFilter !== 'all') && <button onClick={() => { tc.setSearch(''); setStatusFilter('all'); }} className="text-[11px] text-[#f5a623] hover:underline">Clear</button>}
        </div>
        <div className="overflow-x-auto"><div className="max-h-[480px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
              {['Invoice No', 'Client', 'Site', 'Job Code', 'Amount', 'Tax', 'Total', 'Due Date', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {tc.pageItems.map(r => (
                <tr key={r.id} className="hover:bg-[#141920] transition-colors">
                  <td className="py-2.5 px-3 text-[#f5a623] font-mono font-medium">{r.invoiceNo}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0]">{r.client}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.site?.siteCode || '—'}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.jobCode || '—'}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">₹{(r.amount ?? 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">₹{(r.tax ?? 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-mono font-medium">₹{(r.totalAmount ?? 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.dueDate?.split('T')[0]}</td>
                  <td className="py-2.5 px-3"><span className={`vc-badge ${statusBadge(r.status)}`}>{r.status}</span></td>
                  <td className="py-2.5 px-3"><div className="flex items-center gap-1">
                    <button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button>
                    <button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
                  </div></td>
                </tr>
              ))}
              {tc.pageItems.length === 0 && <tr><td colSpan={10} className="py-10 text-center text-[#5a6878]">No records found.</td></tr>}
            </tbody>
          </table>
        </div><PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} /></div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Invoice</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.invoiceNo}</strong> from {deleteTarget?.client}?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
