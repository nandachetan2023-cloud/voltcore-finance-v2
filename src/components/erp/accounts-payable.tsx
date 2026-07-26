'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Loader2, Send, Save, FileText, CircleDot, Pencil, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';

interface APRecord {
  id: number; billNo: string; vendor: string; vendorCode: string | null;
  invoiceRef: string | null; description: string | null; amount: number;
  tax: number; totalAmount: number; dueDate: string; paidDate: string | null;
  paymentMethod: string | null; paymentRef: string | null; status: string; remarks: string | null;
  siteId: number | null; partyId: number | null; poId: number | null; jobCode: string | null;
  site?: { name: string; siteCode: string } | null;
}

interface LineItem { id: number; description: string; glAccount: string; costCenter: string; quantity: number; unitPrice: number; }
interface SiteRef { id: number; name: string; siteCode: string; }
interface PartyRef { id: number; name: string; }
interface PoRef { id: number; poNo: string; vendorName: string; }

interface FormData {
  billNo: string; vendor: string; vendorCode: string; invoiceRef: string;
  invoiceDate: string; dueDate: string; totalAmount: number; status: string;
  description: string; poReference: string;
  siteId: string; partyId: string; poId: string; jobCode: string;
}

const AP_COLUMNS: ExportColumn<APRecord>[] = [
  { header: 'Bill No', accessor: 'billNo' },
  { header: 'Vendor', accessor: 'vendor' },
  { header: 'Vendor Code', accessor: 'vendorCode' },
  { header: 'Invoice Ref', accessor: 'invoiceRef' },
  { header: 'Description', accessor: 'description' },
  { header: 'Amount', accessor: 'amount' },
  { header: 'Tax', accessor: 'tax' },
  { header: 'Total Amount', accessor: 'totalAmount' },
  { header: 'Due Date', accessor: (r) => r.dueDate?.split('T')[0] ?? '' },
  { header: 'Paid Date', accessor: (r) => r.paidDate?.split('T')[0] ?? '' },
  { header: 'Payment Method', accessor: 'paymentMethod' },
  { header: 'Payment Ref', accessor: 'paymentRef' },
  { header: 'Status', accessor: 'status' },
  { header: 'Remarks', accessor: 'remarks' },
];

const EMPTY_FORM: FormData = { billNo: '', vendor: '', vendorCode: '', invoiceRef: '', invoiceDate: '', dueDate: '', totalAmount: 0, status: 'Pending', description: '', poReference: '', siteId: '', partyId: '', poId: '', jobCode: '' };

const AP_IMPORT_FIELDS: ImportField[] = [
  { key: 'billNo', label: 'Bill No', required: true },
  { key: 'vendor', label: 'Vendor', required: true },
  { key: 'vendorCode', label: 'Vendor Code' },
  { key: 'invoiceRef', label: 'Invoice Ref' },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount', type: 'number' },
  { key: 'tax', label: 'Tax', type: 'number' },
  { key: 'totalAmount', label: 'Total Amount', type: 'number' },
  { key: 'dueDate', label: 'Due Date', required: true, type: 'date' },
  { key: 'status', label: 'Status' },
];
const AP_SAMPLE_ROW = { billNo: 'AP/2024-25/001', vendor: 'ABB India Ltd', vendorCode: 'ABB-001', invoiceRef: 'INV-ABB-001', description: 'HT panel supply', amount: 3200000, tax: 576000, totalAmount: 3776000, dueDate: '2025-02-20', status: 'Pending' };

function generateMockAP(): APRecord[] {
  return [
    { id: 1, billNo: 'AP/2024-25/001', vendor: 'ABB India Ltd', vendorCode: 'ABB-001', invoiceRef: 'INV-ABB-001', description: 'HT panel supply', amount: 3200000, tax: 576000, totalAmount: 3776000, dueDate: '2025-02-20T00:00:00', paidDate: '2025-02-15T00:00:00', paymentMethod: 'NEFT', paymentRef: 'NEFT-78452', status: 'Paid', siteId: null, partyId: null, poId: null, jobCode: null, remarks: '' },
    { id: 2, billNo: 'AP/2024-25/002', vendor: 'Siemens India', vendorCode: 'SIE-002', invoiceRef: 'INV-SIE-002', description: 'Transformer supply', amount: 5800000, tax: 1044000, totalAmount: 6844000, dueDate: '2025-03-15T00:00:00', paidDate: null, paymentMethod: null, paymentRef: null, status: 'Pending', siteId: null, partyId: null, poId: null, jobCode: null, remarks: '' },
    { id: 3, billNo: 'AP/2024-25/003', vendor: 'L&T Construction', vendorCode: 'LNT-003', invoiceRef: 'INV-LNT-003', description: 'Civil works — Phase 2', amount: 1250000, tax: 225000, totalAmount: 1475000, dueDate: '2025-01-05T00:00:00', paidDate: null, paymentMethod: null, paymentRef: null, status: 'Overdue', siteId: null, partyId: null, poId: null, jobCode: null, remarks: 'Payment delayed — vendor follow-up' },
    { id: 4, billNo: 'AP/2024-25/004', vendor: 'Havells India', vendorCode: 'HAV-004', invoiceRef: 'INV-HAV-004', description: 'Cable and wire supply', amount: 980000, tax: 176400, totalAmount: 1156400, dueDate: '2025-04-10T00:00:00', paidDate: '2025-04-05T00:00:00', paymentMethod: 'RTGS', paymentRef: 'RTGS-33219', status: 'Paid', siteId: null, partyId: null, poId: null, jobCode: null, remarks: '' },
    { id: 5, billNo: 'AP/2024-25/005', vendor: 'BHEL', vendorCode: 'BHEL-005', invoiceRef: 'INV-BHEL-005', description: 'DG set spares', amount: 2100000, tax: 378000, totalAmount: 2478000, dueDate: '2025-05-20T00:00:00', paidDate: null, paymentMethod: null, paymentRef: null, status: 'Pending', siteId: null, partyId: null, poId: null, jobCode: null, remarks: '' },
  ];
}

export default function AccountsPayable() {
  const [records, setRecords] = useState<APRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editTarget, setEditTarget] = useState<APRecord | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [lines, setLines] = useState<LineItem[]>([{ id: 1, description: '', glAccount: '', costCenter: '', quantity: 1, unitPrice: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [importOpen, setImportOpen] = useState(false);
  const [sites, setSites] = useState<SiteRef[]>([]);
  const [parties, setParties] = useState<PartyRef[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PoRef[]>([]);
  const { triggerCreate } = useERPStore();

  useEffect(() => {
    fetch('/api/fin/sites').then(r => r.json()).then(j => { if (j.success) setSites(j.data); }).catch(() => {});
    fetch('/api/fin/parties').then(r => r.json()).then(j => { if (j.success) setParties(j.data); }).catch(() => {});
    fetch('/api/fin/purchase-orders').then(r => r.json()).then(j => { if (j.success) setPurchaseOrders(j.data); }).catch(() => {});
  }, []);

  const statusFiltered = useMemo(
    () => statusFilter === 'all' ? records : records.filter(r => r.status === statusFilter),
    [records, statusFilter]
  );
  const tc = useTableControls(statusFiltered, (r) => `${r.billNo} ${r.vendor} ${r.vendorCode ?? ''} ${r.description ?? ''} ${r.status}`);

  useEffect(() => { if (triggerCreate > 0) openCreate(); }, [triggerCreate]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/accounts-payable');
      const json = await res.json();
      if (json.success && json.data?.length) { setRecords(json.data); }
      else { setRecords(generateMockAP()); toast.info('Sample data — no server records found'); }
    } catch { setRecords(generateMockAP()); toast.info('Sample data — API unavailable'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setLines([{ id: 1, description: '', glAccount: '', costCenter: '', quantity: 1, unitPrice: 0 }]); setView('form'); };
  const openEdit = (r: APRecord) => {
    setEditTarget(r);
    setForm({ billNo: r.billNo, vendor: r.vendor, vendorCode: r.vendorCode || '', invoiceRef: r.invoiceRef || '', invoiceDate: '', dueDate: r.dueDate?.split('T')[0] || '', totalAmount: r.totalAmount, status: r.status, description: r.description || '', poReference: '', siteId: r.siteId ? String(r.siteId) : '', partyId: r.partyId ? String(r.partyId) : '', poId: r.poId ? String(r.poId) : '', jobCode: r.jobCode || '' });
    setLines([{ id: 1, description: r.description || '', glAccount: '', costCenter: '', quantity: 1, unitPrice: r.amount }]);
    setView('form');
  };

  const addLine = () => { setLines([...lines, { id: Date.now(), description: '', glAccount: '', costCenter: '', quantity: 1, unitPrice: 0 }]); };
  const removeLine = (i: number) => { if (lines.length <= 1) return; setLines(lines.filter((_, idx) => idx !== i)); };
  const updateLine = (i: number, field: keyof LineItem, value: string | number) => { const u = [...lines]; u[i] = { ...u[i], [field]: value }; setLines(u); };
  const lineTotal = lines.reduce((s, l) => s + (l.quantity * l.unitPrice), 0);

  const handleSubmit = async (status: string) => {
    if (!form.billNo || !form.vendor || !form.dueDate) { toast.error('Bill No, Vendor, and Due Date required'); return; }
    setSubmitting(true);
    const amount = lineTotal || form.totalAmount;
    const tax = amount * 0.18;
    try {
      const method = editTarget ? 'PUT' : 'POST';
      const common = {
        billNo: form.billNo, vendor: form.vendor, vendorCode: form.vendorCode, invoiceRef: form.invoiceRef,
        description: form.description, amount, tax, totalAmount: amount + tax, dueDate: new Date(form.dueDate), status,
        siteId: form.siteId ? Number(form.siteId) : null,
        partyId: form.partyId ? Number(form.partyId) : null,
        poId: form.poId ? Number(form.poId) : null,
        jobCode: form.jobCode || null,
      };
      const body = editTarget ? { id: editTarget.id, ...common } : common;
      const res = await fetch('/api/accounts-payable', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) { toast.success(status === 'Pending' ? 'Saved as draft' : 'Submitted'); setView('list'); await fetchData(); }
      else toast.error(json.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    try { const res = await fetch(`/api/accounts-payable?id=${id}`, { method: 'DELETE' }); const json = await res.json(); if (json.success) { toast.success('Deleted'); await fetchData(); } else toast.error(json.error); }
    catch { toast.error('Network error'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  if (importOpen) {
    return (
      <ImportWizard
        title="Accounts Payable"
        fields={AP_IMPORT_FIELDS}
        keyField="billNo"
        existingKeys={new Set(records.map(r => r.billNo))}
        commitEndpoint="/api/accounts-payable/import"
        sampleRow={AP_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetchData}
      />
    );
  }

  // ═══════════════════════════════════════════════════════
  // FORM VIEW — with Invoice Scan panel on right
  // ═══════════════════════════════════════════════════════
  if (view === 'form') {
    return (
      <div className="space-y-5 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] text-[#f5a623] mb-1"><button onClick={() => setView('list')} className="hover:underline">Accounts Payable</button><span className="text-[#5a6878]">{' > '}</span><span className="text-[#e2e8f0]">{editTarget ? `Edit ${editTarget.billNo}` : 'New AP Invoice'}</span></div>
            <h2 className="text-[24px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{editTarget ? 'Edit AP Invoice' : 'Capture AP Invoice'}</h2>
            <p className="text-[11px] text-[#5a6878] mt-0.5">{editTarget ? 'Update vendor bill details and line allocations.' : 'Manual data entry for plant expenditure verification.'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleSubmit('Pending')} disabled={submitting} className="px-4 py-2 rounded-lg border border-[#f5a623] text-[#f5a623] text-[12px] font-semibold hover:bg-[#f5a623]/10 disabled:opacity-50 flex items-center gap-1.5"><Save size={13} /> Save Draft</button>
            <button onClick={() => handleSubmit('Pending')} disabled={submitting} className="px-4 py-2 rounded-lg bg-[#f5a623] text-[#0a0d12] text-[12px] font-semibold hover:bg-[#e8991a] disabled:opacity-50 flex items-center gap-1.5">{submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} {editTarget ? 'Update Invoice' : 'Submit for Approval'}</button>
          </div>
        </div>

        {/* Two-column: Form left, Invoice Scan right */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          {/* LEFT — Form */}
          <div className="space-y-5">
            {/* Invoice totals */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center justify-between"><span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Subtotal</span><span className="text-[14px] font-bold text-[#e2e8f0] font-mono">&#8377;{(lineTotal || form.totalAmount || 0).toLocaleString('en-IN')}</span></div>
              <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center justify-between"><span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">GST (18%)</span><span className="text-[14px] font-bold text-[#ffab40] font-mono">&#8377;{((lineTotal || form.totalAmount || 0) * 0.18).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
              <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center justify-between"><span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Grand Total</span><span className="text-[14px] font-bold text-[#00e676] font-mono">&#8377;{((lineTotal || form.totalAmount || 0) * 1.18).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
            </div>

            {/* Vendor + fields */}
            <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Vendor (Linked)</label>
                  <select value={form.partyId} onChange={e => { const id = e.target.value; const party = parties.find(p => String(p.id) === id); setForm(p => ({ ...p, partyId: id, vendor: party?.name || p.vendor })); }} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none">
                    <option value="">{form.vendor || 'Select vendor...'}</option>
                    {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Vendor Name (if not in master)</label><input value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))} placeholder="Free-text vendor name" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Invoice #</label><input value={form.billNo} onChange={e => setForm(p => ({ ...p, billNo: e.target.value }))} placeholder="INV-0000" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></div>
                <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Invoice Date</label><input type="date" value={form.invoiceDate} onChange={e => setForm(p => ({ ...p, invoiceDate: e.target.value }))} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none" /></div>
                <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Due Date</label><input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none" /></div>
                <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Total (₹)</label><input type="number" value={lineTotal || form.totalAmount || ''} readOnly className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] opacity-70 font-mono" /></div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Site</label>
                  <select value={form.siteId} onChange={e => setForm(p => ({ ...p, siteId: e.target.value }))} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none">
                    <option value="">— Unassigned —</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Purchase Order</label>
                  <select value={form.poId} onChange={e => setForm(p => ({ ...p, poId: e.target.value }))} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none">
                    <option value="">— None —</option>
                    {purchaseOrders.map(po => <option key={po.id} value={po.id}>{po.poNo} — {po.vendorName}</option>)}
                  </select>
                </div>
                <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Job Code</label><input value={form.jobCode} onChange={e => setForm(p => ({ ...p, jobCode: e.target.value }))} placeholder="JOB-2026-001" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></div>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#252e3a]">
                <h3 className="text-[13px] font-semibold text-[#e2e8f0]">Line Item Allocations</h3>
                <button onClick={addLine} className="flex items-center gap-1.5 text-[#f5a623] text-[12px] font-semibold hover:text-[#e8991a]"><Plus size={14} className="border border-[#f5a623] rounded-full" /> ADD LINE</button>
              </div>
              <div className="overflow-x-auto"><table className="w-full text-[11px]"><thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
                <th className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Description</th>
                <th className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">GL Account</th>
                <th className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Cost Center</th>
                <th className="text-right py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Quantity</th>
                <th className="text-right py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Unit Price</th>
                <th className="w-10"></th>
              </tr></thead><tbody>
                {lines.map((line, i) => (
                  <tr key={line.id} className="border-b border-[#1a2028] hover:bg-[#141920]">
                    <td className="py-3 px-4"><input value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Item description..." className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></td>
                    <td className="py-3 px-4"><input value={line.glAccount} onChange={e => updateLine(i, 'glAccount', e.target.value)} placeholder="5400 - Raw Materials" className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></td>
                    <td className="py-3 px-4"><input value={line.costCenter} onChange={e => updateLine(i, 'costCenter', e.target.value)} placeholder="CC-402-PROD" className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></td>
                    <td className="py-3 px-4"><input type="number" value={line.quantity || ''} onChange={e => updateLine(i, 'quantity', Number(e.target.value) || 0)} className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[13px] text-right text-[#e2e8f0] font-mono focus:border-[#f5a623] focus:outline-none" /></td>
                    <td className="py-3 px-4"><input type="number" value={line.unitPrice || ''} onChange={e => updateLine(i, 'unitPrice', Number(e.target.value) || 0)} placeholder="0.00" className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[13px] text-right text-[#e2e8f0] font-mono focus:border-[#f5a623] focus:outline-none" /></td>
                    <td className="py-3 px-4 text-center"><button onClick={() => removeLine(i)} className="p-1.5 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody></table></div>
            </div>

            {/* Approval banner */}
            <div className="bg-[#f5a623]/10 border border-[#f5a623]/30 rounded-xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#f5a623]/20 flex items-center justify-center"><CircleDot size={16} className="text-[#f5a623]" /></div>
              <div><div className="text-[12px] font-semibold text-[#f5a623]">Approval Workflow Detected</div><div className="text-[11px] text-[#8899aa]">Next Approver: Finance Controller</div></div>
            </div>
          </div>

          {/* RIGHT — Invoice Scan Panel */}
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl flex flex-col h-fit lg:sticky lg:top-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#252e3a]">
              <span className="text-[12px] font-semibold text-[#e2e8f0]">Invoice Scan</span>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded text-[#5a6878] hover:text-[#f5a623] hover:bg-[#f5a623]/10" title="Zoom In"><Search size={13} /></button>
                <button className="p-1.5 rounded text-[#5a6878] hover:text-[#f5a623] hover:bg-[#f5a623]/10" title="Expand"><FileText size={13} /></button>
              </div>
            </div>
            <div className="p-4">
              <div className="bg-[#0a0d12] border border-[#252e3a] rounded-lg min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
                <div className="w-[85%] bg-white rounded shadow-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1"><div className="h-2 w-24 bg-[#ddd] rounded" /><div className="h-1.5 w-16 bg-[#eee] rounded" /></div>
                    <div className="bg-[#f5a623] text-white text-[8px] font-bold px-2 py-1 rounded">INVOICE</div>
                  </div>
                  <div className="text-[7px] text-[#999] font-mono">#{form.billNo || 'INV-0000'}</div>
                  <div className="space-y-1.5 pt-2"><div className="h-1.5 w-full bg-[#f0f0f0] rounded" /><div className="h-1.5 w-[90%] bg-[#f0f0f0] rounded" /><div className="h-1.5 w-[75%] bg-[#f0f0f0] rounded" /></div>
                  <div className="border-t border-[#eee] pt-2 space-y-1">
                    <div className="flex gap-2"><div className="h-1.5 w-[40%] bg-[#e8e8e8] rounded" /><div className="h-1.5 w-[20%] bg-[#e8e8e8] rounded" /><div className="h-1.5 w-[15%] bg-[#e8e8e8] rounded" /></div>
                    <div className="flex gap-2"><div className="h-1.5 w-[40%] bg-[#f5f5f5] rounded" /><div className="h-1.5 w-[20%] bg-[#f5f5f5] rounded" /><div className="h-1.5 w-[15%] bg-[#f5f5f5] rounded" /></div>
                    <div className="flex gap-2"><div className="h-1.5 w-[40%] bg-[#f5f5f5] rounded" /><div className="h-1.5 w-[20%] bg-[#f5f5f5] rounded" /><div className="h-1.5 w-[15%] bg-[#f5f5f5] rounded" /></div>
                  </div>
                  <div className="flex justify-end pt-2"><div className="bg-[#f5a623]/20 border border-[#f5a623]/40 rounded px-3 py-1"><div className="text-[7px] text-[#999]">AMOUNT</div><div className="text-[9px] font-bold text-[#333]">&#8377;{(lineTotal || form.totalAmount || 0).toLocaleString('en-IN')}</div></div></div>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-[#252e3a] flex items-center justify-between">
              <div><div className="text-[10px] text-[#8899aa]">File: {form.billNo ? `${form.billNo.replace(/\//g, '_')}_INV.pdf` : 'No file'}</div><div className="text-[10px] text-[#00d4ff]">OCR Confidence: 98.2%</div></div>
              <label className="p-2 rounded-lg bg-[#252e3a] hover:bg-[#2a3545] cursor-pointer"><Upload size={14} className="text-[#8899aa]" /><input type="file" accept=".pdf,.jpg,.png" className="hidden" /></label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // LIST VIEW with search, filter, paging
  // ═══════════════════════════════════════════════════════
  const totalPending = statusFiltered.filter(r => r.status === 'Pending' || r.status === 'Partially Paid').reduce((s, r) => s + r.totalAmount, 0);
  const totalPaid = statusFiltered.filter(r => r.status === 'Paid').reduce((s, r) => s + r.totalAmount, 0);
  const totalOverdue = statusFiltered.filter(r => r.status === 'Overdue').reduce((s, r) => s + r.totalAmount, 0);
  const statuses = [...new Set(records.map(r => r.status))];
  const statusBadge = (s: string) => { if (s === 'Paid') return 'bg-[#00e676]/15 text-[#00e676]'; if (s === 'Pending') return 'bg-[#ffab40]/15 text-[#ffab40]'; if (s === 'Overdue') return 'bg-[#ff3d3d]/15 text-[#ff3d3d]'; return 'bg-[#00d4ff]/15 text-[#00d4ff]'; };

  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ffab40]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Pending</div><div className="text-[20px] font-bold text-[#ffab40]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>&#8377;{(totalPending / 100000).toFixed(2)} L</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Paid</div><div className="text-[20px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>&#8377;{(totalPaid / 100000).toFixed(2)} L</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ff3d3d]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Overdue</div><div className="text-[20px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>&#8377;{(totalOverdue / 100000).toFixed(2)} L</div></div>
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header"><FileText size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">AP Invoices</span><div className="flex items-center gap-2 ml-auto"><button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={records} columns={AP_COLUMNS} filename="accounts-payable" /></div><button onClick={openCreate} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Entry</button></div>
        <div className="px-4 py-3 border-b border-[#252e3a] flex items-center gap-3 flex-wrap">
          <SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search bill no, vendor..." />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none min-w-[130px]"><option value="all">All Status</option>{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select>
          {(tc.search || statusFilter !== 'all') && <button onClick={() => { tc.setSearch(''); setStatusFilter('all'); }} className="text-[11px] text-[#f5a623] hover:underline">Clear</button>}
        </div>

        <div className="overflow-x-auto"><table className="w-full text-[11px]"><thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">{['Bill No', 'Vendor', 'Site', 'Job Code', 'Amount', 'Tax', 'Total', 'Due Date', 'Status', ''].map(h => <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">{tc.pageItems.map(r => (
            <tr key={r.id} className="hover:bg-[#141920]">
              <td className="py-2.5 px-3 text-[#f5a623] font-mono font-medium">{r.billNo}</td>
              <td className="py-2.5 px-3 text-[#e2e8f0]">{r.vendor}</td>
              <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.site?.siteCode || '—'}</td>
              <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.jobCode || '—'}</td>
              <td className="py-2.5 px-3 text-[#8899aa] font-mono">&#8377;{(r.amount ?? 0).toLocaleString('en-IN')}</td>
              <td className="py-2.5 px-3 text-[#8899aa] font-mono">&#8377;{(r.tax ?? 0).toLocaleString('en-IN')}</td>
              <td className="py-2.5 px-3 text-[#e2e8f0] font-mono font-medium">&#8377;{(r.totalAmount ?? 0).toLocaleString('en-IN')}</td>
              <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.dueDate?.split('T')[0]}</td>
              <td className="py-2.5 px-3"><span className={`vc-badge ${statusBadge(r.status)}`}>{r.status}</span></td>
              <td className="py-2.5 px-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button><button onClick={() => handleDelete(r.id)} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button></div></td>
            </tr>
          ))}{tc.pageItems.length === 0 && <tr><td colSpan={10} className="py-10 text-center text-[#5a6878]">No records found.</td></tr>}</tbody>
        </table></div>

        <PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} />
      </div>
    </div>
  );
}
