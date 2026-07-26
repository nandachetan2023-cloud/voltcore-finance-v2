'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Trash2, Loader2, Send, Save, CircleDot, Pencil, Printer, Upload } from 'lucide-react';
import { toast } from 'sonner';
import InvoiceDocument from './fin-invoice-document';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';

interface Invoice {
  id: number; invoiceNo: string; siteId: number; partyId: number | null; poId?: number | null; jobCode?: string | null;
  invoiceDate: string; eInvoiceDate?: string | null; dueDate: string; invoiceValue: number; gstValue: number;
  grandTotal: number; balanceAmount: number; status: string; description: string | null;
  trackingNo?: string | null; poNo?: string | null; month?: string | null; area?: string | null;
  client?: string | null; financialYear?: string | null;
  tdsDeduction?: number; kpiDeduction?: number; safetyDeduction?: number; otherDeduction?: number;
  afterTdsBalance?: number; receivedAmount?: number; remarks?: string | null;
  site?: { name: string; location?: string | null; state?: string | null } | null;
  party?: { name: string; gstin?: string | null; address?: string | null; state?: string | null } | null;
}
interface Site { id: number; name: string; siteCode: string; }
interface Party { id: number; name: string; }
interface PoOption { id: number; poNo: string; vendorName: string; }

interface LineItem { id: number; description: string; area: string; month: string; quantity: number; rate: number; }
interface FormData { invoiceNo: string; siteId: number; partyId: number | null; poId: number | null; jobCode: string; invoiceDate: string; dueDate: string; description: string; status: string; poNo: string; trackingNo: string; }
const EMPTY_FORM: FormData = { invoiceNo: '', siteId: 0, partyId: null, poId: null, jobCode: '', invoiceDate: '', dueDate: '', description: '', status: 'Unpaid', poNo: '', trackingNo: '' };

const INVOICE_COLUMNS: ExportColumn<Invoice>[] = [
  { header: 'Invoice No', accessor: 'invoiceNo' },
  { header: 'Tracking No', accessor: 'trackingNo' },
  { header: 'PO No', accessor: 'poNo' },
  { header: 'Client', accessor: (r) => r.party?.name || r.client || '' },
  { header: 'Site', accessor: (r) => r.site?.name || '' },
  { header: 'Area', accessor: 'area' },
  { header: 'Month', accessor: 'month' },
  { header: 'Invoice Date', accessor: (r) => r.invoiceDate?.split('T')[0] || '' },
  { header: 'Due Date', accessor: (r) => r.dueDate?.split('T')[0] || '' },
  { header: 'Invoice Value', accessor: 'invoiceValue' },
  { header: 'GST Value', accessor: 'gstValue' },
  { header: 'Grand Total', accessor: 'grandTotal' },
  { header: 'Balance', accessor: 'balanceAmount' },
  { header: 'Status', accessor: 'status' },
];

const INVOICE_IMPORT_FIELDS: ImportField[] = [
  { key: 'invoiceNo', label: 'Invoice No', required: true },
  { key: 'trackingNo', label: 'Tracking No' },
  { key: 'poNo', label: 'PO No' },
  { key: 'client', label: 'Client / Party Name', required: true },
  { key: 'siteName', label: 'Site Name' },
  { key: 'area', label: 'Area' },
  { key: 'month', label: 'Month' },
  { key: 'invoiceDate', label: 'Invoice Date', type: 'date' },
  { key: 'dueDate', label: 'Due Date', type: 'date' },
  { key: 'eInvoiceDate', label: 'E-Invoice Date', type: 'date' },
  { key: 'invoiceValue', label: 'Invoice Value', type: 'number' },
  { key: 'gstValue', label: 'GST Value', type: 'number' },
  { key: 'grandTotal', label: 'Grand Total', type: 'number' },
  { key: 'balanceAmount', label: 'Balance Amount', type: 'number' },
  { key: 'description', label: 'Description' },
  { key: 'remarks', label: 'Remarks' },
  { key: 'status', label: 'Status' },
  { key: 'tdsDeduction', label: 'TDS Deduction', type: 'number' },
  { key: 'receivedAmount', label: 'Received Amount', type: 'number' },
];

const INVOICE_SAMPLE_ROW: Record<string, string | number> = {
  invoiceNo: 'INV/2025-26/001',
  trackingNo: 'TRK/25-26/001',
  poNo: 'PO/2025-26/001',
  client: 'NTPC Ltd',
  siteName: 'NTPC Rihand Dam Project',
  area: 'Block A',
  month: 'Jan 2026',
  invoiceDate: '2026-01-15',
  dueDate: '2026-04-15',
  eInvoiceDate: '2026-01-16',
  invoiceValue: 2500000,
  gstValue: 450000,
  grandTotal: 2950000,
  balanceAmount: 2950000,
  description: 'Civil works - Phase 1',
  status: 'Unpaid',
};

function generateMockInvoices(): Invoice[] {
  return [
    { id: 1, invoiceNo: 'INV/2024-25/001', siteId: 1, partyId: 1, invoiceDate: '2024-11-20T00:00:00', dueDate: '2025-02-20T00:00:00', invoiceValue: 2500000, gstValue: 450000, grandTotal: 2950000, balanceAmount: 2950000, status: 'Unpaid', description: 'Civil works - Phase 1', trackingNo: 'TRK/24-25/001', poNo: 'PO/2024-25/001', month: 'Nov 2024', area: 'Block A', client: 'NTPC Ltd', site: { name: 'NTPC Rihand Dam Project' }, party: { name: 'Bharat Heavy Electricals Ltd' } },
    { id: 2, invoiceNo: 'INV/2024-25/002', siteId: 2, partyId: 2, invoiceDate: '2024-12-10T00:00:00', dueDate: '2025-03-10T00:00:00', invoiceValue: 1800000, gstValue: 324000, grandTotal: 2124000, balanceAmount: 1062000, status: 'Partially Paid', description: 'Electrical panel installation', trackingNo: 'TRK/24-25/002', poNo: 'PO/2024-25/002', month: 'Dec 2024', area: 'Main Plant', client: 'BALCO', site: { name: 'BALCO Aluminium Smelter' }, party: { name: 'Tata Projects Ltd' } },
    { id: 3, invoiceNo: 'INV/2024-25/003', siteId: 3, partyId: 1, invoiceDate: '2025-01-05T00:00:00', dueDate: '2025-04-05T00:00:00', invoiceValue: 3200000, gstValue: 576000, grandTotal: 3776000, balanceAmount: 0, status: 'Paid', description: 'Coal conveyor belt system', trackingNo: 'TRK/24-25/003', poNo: 'PO/2024-25/003', month: 'Jan 2025', area: 'Stockyard', client: 'Coal India Ltd', site: { name: 'Coal India Eastern Coalfield' }, party: { name: 'Bharat Heavy Electricals Ltd' } },
    { id: 4, invoiceNo: 'INV/2024-25/004', siteId: 4, partyId: 3, invoiceDate: '2025-02-15T00:00:00', dueDate: '2025-05-15T00:00:00', invoiceValue: 4500000, gstValue: 810000, grandTotal: 5310000, balanceAmount: 5310000, status: 'Unpaid', description: 'Smelter expansion works', trackingNo: 'TRK/24-25/004', poNo: 'PO/2024-25/004', month: 'Feb 2025', area: 'Potline Area', client: 'Vedanta Ltd', site: { name: 'Vedanta Jharsuguda Smelter' }, party: { name: 'Larsen & Toubro Ltd' } },
    { id: 5, invoiceNo: 'INV/2024-25/005', siteId: 5, partyId: 2, invoiceDate: '2025-03-20T00:00:00', dueDate: '2025-06-20T00:00:00', invoiceValue: 1250000, gstValue: 225000, grandTotal: 1475000, balanceAmount: 1475000, status: 'Unpaid', description: 'Commissioning & testing', trackingNo: 'TRK/24-25/005', poNo: 'PO/2024-25/005', month: 'Mar 2025', area: 'Substation', client: 'Hindalco Industries', site: { name: 'Hindalco Mahan Aluminium' }, party: { name: 'Tata Projects Ltd' } },
  ];
}

export default function FinInvoices() {
  const [records, setRecords] = useState<Invoice[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editTarget, setEditTarget] = useState<Invoice | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [lines, setLines] = useState<LineItem[]>([{ id: 1, description: '', area: '', month: '', quantity: 1, rate: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const tc = useTableControls(records, (r) => `${r.invoiceNo} ${r.trackingNo ?? ''} ${r.poNo ?? ''} ${r.party?.name ?? ''} ${r.client ?? ''} ${r.area ?? ''} ${r.month ?? ''} ${r.status}`);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/fin/invoices');
      const rj = await r.json();
      if (rj.success && rj.data?.length) { setRecords(rj.data); }
      else { setRecords(generateMockInvoices()); toast.info('Sample data — no server records found'); }
    } catch { setRecords(generateMockInvoices()); toast.info('Sample data — API unavailable'); }
    try {
      const r = await fetch('/api/fin/sites');
      const rj = await r.json();
      if (rj.success && rj.data?.length) setSites(rj.data);
      else setSites([{ id: 1, name: 'TPP Adani Godda', siteCode: 'SITE-001' }, { id: 2, name: 'TPP NTPC Barh', siteCode: 'SITE-002' }, { id: 3, name: 'HO Mumbai', siteCode: 'SITE-003' }]);
    } catch { setSites([{ id: 1, name: 'TPP Adani Godda', siteCode: 'SITE-001' }, { id: 2, name: 'TPP NTPC Barh', siteCode: 'SITE-002' }, { id: 3, name: 'HO Mumbai', siteCode: 'SITE-003' }]); }
    try {
      const r = await fetch('/api/fin/parties');
      const rj = await r.json();
      if (rj.success && rj.data?.length) setParties(rj.data);
      else setParties([{ id: 1, name: 'L&T Construction' }, { id: 2, name: 'Siemens India Ltd' }, { id: 3, name: 'Tata Projects' }]);
    } catch { setParties([{ id: 1, name: 'L&T Construction' }, { id: 2, name: 'Siemens India Ltd' }, { id: 3, name: 'Tata Projects' }]); }
    try {
      const r = await fetch('/api/fin/purchase-orders');
      const rj = await r.json();
      if (rj.success && rj.data?.length) setPurchaseOrders(rj.data);
    } catch { /* PO list is optional — form still works with free-text PO No */ }
    setLoading(false);
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setLines([{ id: 1, description: '', area: '', month: '', quantity: 1, rate: 0 }]); setView('form'); };
  const openEdit = (r: Invoice) => { setEditTarget(r); setForm({ invoiceNo: r.invoiceNo, siteId: r.siteId, partyId: r.partyId, poId: r.poId ?? null, jobCode: r.jobCode || '', invoiceDate: r.invoiceDate?.split('T')[0] || '', dueDate: r.dueDate?.split('T')[0] || '', description: r.description || '', status: r.status, poNo: r.poNo || '', trackingNo: r.trackingNo || '' }); setLines([{ id: 1, description: r.description || '', area: '', month: '', quantity: 1, rate: r.invoiceValue }]); setView('form'); };

  const addLine = () => { setLines([...lines, { id: Date.now(), description: '', area: '', month: '', quantity: 1, rate: 0 }]); };
  const removeLine = (i: number) => { if (lines.length <= 1) return; setLines(lines.filter((_, idx) => idx !== i)); };
  const updateLine = (i: number, field: keyof LineItem, value: string | number) => { const u = [...lines]; u[i] = { ...u[i], [field]: value }; setLines(u); };

  const invoiceValue = lines.reduce((s, l) => s + (l.quantity * l.rate), 0);
  const gstValue = invoiceValue * 0.18;
  const grandTotal = invoiceValue + gstValue;

  const handleSubmit = async (status: string) => {
    if (!form.invoiceNo || !form.siteId || !form.invoiceDate || !form.dueDate) { toast.error('Invoice No, Site, dates required'); return; }
    setSubmitting(true);
    try {
      const method = editTarget ? 'PUT' : 'POST';
      const common = { invoiceNo: form.invoiceNo, siteId: form.siteId, partyId: form.partyId, poId: form.poId, jobCode: form.jobCode || null, invoiceDate: new Date(form.invoiceDate), dueDate: new Date(form.dueDate), invoiceValue, gstValue, grandTotal, balanceAmount: grandTotal, description: form.description, status, poNo: form.poNo, trackingNo: form.trackingNo };
      const body = editTarget ? { id: editTarget.id, ...common } : common;
      const res = await fetch('/api/fin/invoices', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) { toast.success(status === 'Unpaid' ? 'Invoice saved' : 'Invoice submitted'); setView('list'); await fetch_(); }
      else toast.error(json.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => { try { const r = await fetch(`/api/fin/invoices?id=${id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { toast.success('Deleted'); await fetch_(); } else toast.error(j.error); } catch { toast.error('Network error'); } };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  // ═══════════════════════════════════════════════════════
  // FORM VIEW
  // ═══════════════════════════════════════════════════════
  if (view === 'form') {
    return (
      <div className="space-y-5 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] text-[#f5a623] mb-1"><button onClick={() => setView('list')} className="hover:underline">Site Invoices</button><span className="text-[#5a6878]"> › </span><span className="text-[#e2e8f0]">{editTarget ? 'Edit' : 'New Invoice'}</span></div>
            <h2 className="text-[24px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Create Site Invoice</h2>
            <p className="text-[11px] text-[#5a6878] mt-0.5">Raise invoice against client for site work completed.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleSubmit('Unpaid')} disabled={submitting} className="text-[#f5a623] text-[13px] font-semibold hover:underline underline-offset-4 transition-colors disabled:opacity-50 flex items-center gap-1.5"><Save size={14} /> Save Draft</button>
            <span className="text-[#252e3a]">|</span>
            <button onClick={() => handleSubmit('Unpaid')} disabled={submitting} className="text-[#f5a623] text-[13px] font-semibold hover:underline underline-offset-4 transition-colors disabled:opacity-50 flex items-center gap-1.5">{submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={14} />} Submit Invoice</button>
          </div>
        </div>

        {/* Status Badges */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Invoice Value</span>
            <span className="text-[14px] font-bold text-[#e2e8f0] font-mono">₹{(invoiceValue ?? 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">GST (18%)</span>
            <span className="text-[14px] font-bold text-[#ffab40] font-mono">₹{(gstValue ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Grand Total</span>
            <span className="text-[14px] font-bold text-[#00e676] font-mono">₹{(grandTotal ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Client / Party *</label>
              <select value={form.partyId ?? ''} onChange={e => setForm(p => ({ ...p, partyId: e.target.value ? Number(e.target.value) : null }))} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none">
                <option value="">Select client...</option>{parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Site *</label>
              <select value={form.siteId} onChange={e => setForm(p => ({ ...p, siteId: Number(e.target.value) }))} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none">
                <option value={0}>Select site...</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Invoice No *</label><input value={form.invoiceNo} onChange={e => setForm(p => ({ ...p, invoiceNo: e.target.value }))} placeholder="INV-2025-001" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></div>
            <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Invoice Date *</label><input type="date" value={form.invoiceDate} onChange={e => setForm(p => ({ ...p, invoiceDate: e.target.value }))} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none" /></div>
            <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Due Date *</label><input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none" /></div>
            <div>
              <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">PO No</label>
              <select value={form.poId ?? ''} onChange={e => { const id = e.target.value ? Number(e.target.value) : null; const po = purchaseOrders.find(p => p.id === id); setForm(p => ({ ...p, poId: id, poNo: po?.poNo || '' })); }} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none">
                <option value="">{form.poNo || 'No linked PO...'}</option>
                {purchaseOrders.map(po => <option key={po.id} value={po.id}>{po.poNo} — {po.vendorName}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Job Code</label><input value={form.jobCode} onChange={e => setForm(p => ({ ...p, jobCode: e.target.value }))} placeholder="JOB-2026-001" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></div>
          </div>
          <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Description</label><input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Work description..." className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></div>
        </div>

        {/* Line Items */}
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#252e3a]">
            <h3 className="text-[13px] font-semibold text-[#e2e8f0]">Work Items / Line Allocations</h3>
            <button onClick={addLine} className="flex items-center gap-1.5 text-[#f5a623] text-[12px] font-semibold hover:text-[#e8991a] transition-colors"><Plus size={14} className="border border-[#f5a623] rounded-full" /> ADD LINE</button>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-[11px]"><thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
            <th className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[35%]">Description</th>
            <th className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[18%]">Area</th>
            <th className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[15%]">Month</th>
            <th className="text-right py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[12%]">Qty</th>
            <th className="text-right py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[15%]">Rate (₹)</th>
            <th className="w-[5%]"></th>
          </tr></thead><tbody>
            {lines.map((line, i) => (
              <tr key={line.id} className="border-b border-[#1a2028] hover:bg-[#141920]">
                <td className="py-3 px-4"><input value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Work item..." className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-3 px-4"><input value={line.area} onChange={e => updateLine(i, 'area', e.target.value)} placeholder="Area name" className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-3 px-4"><input value={line.month} onChange={e => updateLine(i, 'month', e.target.value)} placeholder="Jan 2025" className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-3 px-4"><input type="number" value={line.quantity ?? ''} onChange={e => updateLine(i, 'quantity', Number(e.target.value) || 0)} className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[13px] text-right text-[#e2e8f0] font-mono focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-3 px-4"><input type="number" value={line.rate ?? ''} onChange={e => updateLine(i, 'rate', Number(e.target.value) || 0)} placeholder="0.00" className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[13px] text-right text-[#e2e8f0] font-mono focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-3 px-4 text-center"><button onClick={() => removeLine(i)} className="p-1.5 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            <tr className="bg-[#0a0d12] border-t border-[#252e3a]">
              <td colSpan={4} className="py-3 px-4 text-right"><span className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Subtotal</span></td>
              <td className="py-3 px-4 text-right"><span className="text-[14px] font-bold text-[#e2e8f0] font-mono">₹{(invoiceValue ?? 0).toLocaleString('en-IN')}</span></td>
              <td></td>
            </tr>
          </tbody></table></div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#161c24] border border-[#252e3a] rounded-xl">
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Grand Total: <span className="text-[#f5a623]">₹{(grandTotal ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></span>
          <div className="flex items-center gap-4 text-[11px] text-[#5a6878]">
            <div className="flex items-center gap-1.5"><CircleDot size={12} className="text-[#00e676]" /> GST @18% applied</div>
          </div>
        </div>
      </div>
    );
  }

  if (importOpen) {
    return (
      <ImportWizard
        title="Site Invoices"
        fields={INVOICE_IMPORT_FIELDS}
        keyField="invoiceNo"
        existingKeys={new Set(records.map(r => r.invoiceNo))}
        commitEndpoint="/api/fin/invoices/import"
        sampleRow={INVOICE_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetch_}
      />
    );
  }

  // ═══════════════════════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════════════════════
  const totalValue = records.reduce((s, r) => s + r.grandTotal, 0);
  const totalBalance = records.reduce((s, r) => s + r.balanceAmount, 0);

  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Invoiced</div><div className="text-[20px] font-bold text-[#00d4ff]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalValue / 10000000).toFixed(2)} Cr</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ff3d3d]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Outstanding</div><div className="text-[20px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalBalance / 10000000).toFixed(2)} Cr</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Invoices</div><div className="text-[20px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{records.length}</div></div>
      </div>

      <div className="vc-panel"><div className="vc-panel-header"><FileText size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Site Invoices</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length}</span><div className="ml-2"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search invoices..." /></div><div className="flex items-center gap-2 ml-2"><button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={records} columns={INVOICE_COLUMNS} filename="fin-invoices" /></div><button onClick={openCreate} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Invoice</button></div>
        <div className="overflow-x-auto"><div className="max-h-[440px] overflow-y-auto"><table className="w-full text-[11px]"><thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">{['Tracking No.', 'PO No.', 'Bill No.', 'Client', 'Area', 'Month', 'Bill Date', 'E-Inv Date', 'Invoice Value', 'GST Value', 'Total Inv Value', 'Status', ''].map(h => <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>)}</tr></thead><tbody className="divide-y divide-[#1a2028]">{tc.pageItems.map(r => <tr key={r.id} onClick={() => setViewInvoice(r)} className="hover:bg-[#141920] cursor-pointer"><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.trackingNo || 'NA'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.poNo || 'NA'}</td><td className="py-2.5 px-3 text-[#f5a623] font-mono font-medium whitespace-nowrap">{r.invoiceNo}</td><td className="py-2.5 px-3 text-[#e2e8f0] max-w-[180px] truncate">{r.party?.name || r.client || '—'}</td><td className="py-2.5 px-3 text-[#8899aa] max-w-[120px] truncate">{r.area || '—'}</td><td className="py-2.5 px-3 text-[#8899aa] whitespace-nowrap">{r.month || '—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono whitespace-nowrap">{r.invoiceDate?.split('T')[0]}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono whitespace-nowrap">{r.eInvoiceDate?.split('T')[0] || '—'}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-mono text-right whitespace-nowrap">₹{(r.invoiceValue ?? 0).toLocaleString('en-IN')}</td><td className="py-2.5 px-3 text-[#ffab40] font-mono text-right whitespace-nowrap">₹{(r.gstValue ?? 0).toLocaleString('en-IN')}</td><td className="py-2.5 px-3 text-[#00e676] font-mono text-right font-medium whitespace-nowrap">₹{(r.grandTotal ?? 0).toLocaleString('en-IN')}</td><td className="py-2.5 px-3"><span className={`vc-badge ${r.status === 'Paid' ? 'bg-[#00e676]/15 text-[#00e676]' : r.status === 'Unpaid' ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' : r.status === 'Cancelled' ? 'bg-[#5a6878]/15 text-[#5a6878]' : 'bg-[#ffab40]/15 text-[#ffab40]'}`}>{r.status}</span></td><td className="py-2.5 px-3" onClick={e => e.stopPropagation()}><div className="flex gap-1"><button onClick={() => setViewInvoice(r)} className="p-1 rounded text-[#5a6878] hover:text-[#f5a623] hover:bg-[#f5a623]/10" title="View / Print"><Printer size={13} /></button><button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10" title="Edit"><Pencil size={13} /></button><button onClick={() => handleDelete(r.id)} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10" title="Delete"><Trash2 size={13} /></button></div></td></tr>)}{tc.pageItems.length === 0 && <tr><td colSpan={13} className="py-8 text-center text-[#5a6878]">No matching invoices</td></tr>}</tbody></table></div><PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} /></div></div>

      {viewInvoice && <InvoiceDocument invoice={viewInvoice} onClose={() => setViewInvoice(null)} />}
    </div>
  );
}
