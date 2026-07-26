'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Trash2, Loader2, Send, Save, Pencil, Printer, Upload, Search } from 'lucide-react';
import { toast } from 'sonner';
import SalesInvoiceDocument from './sales-invoice-document';

interface Item {
  id?: number; description: string; hsnSac: string; uom: string; quantity: number; rate: number;
  taxableValue: number; cgstPercent: number; sgstPercent: number; igstPercent: number;
  cgstAmount: number; sgstAmount: number; igstAmount: number; total: number;
}

interface Invoice {
  id: number; invoiceNo: string; invoiceDate: string; dueDate?: string | null;
  customerId: number; customerName: string; customerGstin?: string | null;
  customerStateCode?: string | null; placeOfSupply?: string | null; poNo?: string | null; poDate?: string | null;
  taxableAmount: number; cgstAmount: number; sgstAmount: number; igstAmount: number; totalAmount: number;
  amountInWords?: string | null; status: string; items?: Item[];
}

interface Customer { id: number; name: string; gstin?: string | null; stateCode?: string | null; address?: string | null; }

interface FormData {
  invoiceNo: string; invoiceDate: string; dueDate: string; customerId: number;
  placeOfSupply: string; poNo: string; gstMode: 'intra' | 'inter';
}
const EMPTY_FORM: FormData = { invoiceNo: '', invoiceDate: new Date().toISOString().split('T')[0], dueDate: '', customerId: 0, placeOfSupply: '', poNo: '', gstMode: 'intra' };
const EMPTY_ITEM: Item = { description: '', hsnSac: '998717', uom: 'LOT', quantity: 1, rate: 0, taxableValue: 0, cgstPercent: 9, sgstPercent: 9, igstPercent: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, total: 0 };

const mockCustomers: Customer[] = [
  { id: 1, name: 'Aarav Infotech Solutions', gstin: '24AAJCS1234A1Z5', stateCode: '24', address: 'SG Highway, Ahmedabad, Gujarat' },
  { id: 2, name: 'Meera Enterprises', gstin: '27AACPM5678B1Z6', stateCode: '27', address: 'FC Road, Pune, Maharashtra' },
  { id: 3, name: 'Vikram Traders', gstin: '29AAKPV9012C1Z7', stateCode: '29', address: 'MG Road, Bangalore, Karnataka' },
  { id: 4, name: 'Ananya Constructions', gstin: '08AAHCA3456D1Z8', stateCode: '08', address: 'MI Road, Jaipur, Rajasthan' },
];

function generateMockInvoices(): Invoice[] {
  const today = new Date();
  const d = (offset: number) => { const dt = new Date(today); dt.setDate(dt.getDate() + offset); return dt.toISOString().split('T')[0]; };

  return [
    { id: 1, invoiceNo: 'GSTIN/2024-25/001', invoiceDate: d(-30), dueDate: d(-15), customerId: 1, customerName: 'Aarav Infotech Solutions', customerGstin: '24AAJCS1234A1Z5', customerStateCode: '24', placeOfSupply: 'Ahmedabad', poNo: 'PO-2024-001', poDate: d(-35), taxableAmount: 100000, cgstAmount: 9000, sgstAmount: 9000, igstAmount: 0, totalAmount: 118000, amountInWords: 'One Lakh Eighteen Thousand Only', status: 'Paid', items: [{ id: 1, description: 'Software Development Services', hsnSac: '998312', uom: 'LOT', quantity: 1, rate: 100000, taxableValue: 100000, cgstPercent: 9, sgstPercent: 9, igstPercent: 0, cgstAmount: 9000, sgstAmount: 9000, igstAmount: 0, total: 118000 }] },
    { id: 2, invoiceNo: 'GSTIN/2024-25/002', invoiceDate: d(-20), dueDate: d(-5), customerId: 2, customerName: 'Meera Enterprises', customerGstin: '27AACPM5678B1Z6', customerStateCode: '27', placeOfSupply: 'Pune', poNo: 'PO-2024-002', poDate: d(-25), taxableAmount: 250000, cgstAmount: 22500, sgstAmount: 22500, igstAmount: 0, totalAmount: 295000, amountInWords: 'Two Lakh Ninety-Five Thousand Only', status: 'Unpaid', items: [{ id: 2, description: 'Consulting & Advisory Services', hsnSac: '998314', uom: 'HRS', quantity: 50, rate: 5000, taxableValue: 250000, cgstPercent: 9, sgstPercent: 9, igstPercent: 0, cgstAmount: 22500, sgstAmount: 22500, igstAmount: 0, total: 295000 }] },
    { id: 3, invoiceNo: 'GSTIN/2024-25/003', invoiceDate: d(-45), dueDate: d(-30), customerId: 3, customerName: 'Vikram Traders', customerGstin: '29AAKPV9012C1Z7', customerStateCode: '29', placeOfSupply: 'Bangalore', poNo: 'PO-2024-003', poDate: d(-50), taxableAmount: 180000, cgstAmount: 0, sgstAmount: 0, igstAmount: 32400, totalAmount: 212400, amountInWords: 'Two Lakh Twelve Thousand Four Hundred Only', status: 'Overdue', items: [{ id: 3, description: 'IT Infrastructure Support', hsnSac: '998316', uom: 'MON', quantity: 3, rate: 60000, taxableValue: 180000, cgstPercent: 0, sgstPercent: 0, igstPercent: 18, cgstAmount: 0, sgstAmount: 0, igstAmount: 32400, total: 212400 }] },
    { id: 4, invoiceNo: 'GSTIN/2024-25/004', invoiceDate: d(-10), dueDate: d(5), customerId: 4, customerName: 'Ananya Constructions', customerGstin: '08AAHCA3456D1Z8', customerStateCode: '08', placeOfSupply: 'Jaipur', poNo: 'PO-2024-004', poDate: d(-15), taxableAmount: 75000, cgstAmount: 6750, sgstAmount: 6750, igstAmount: 0, totalAmount: 88500, amountInWords: 'Eighty-Eight Thousand Five Hundred Only', status: 'Paid', items: [{ id: 4, description: 'Structural Design & Drawing', hsnSac: '998323', uom: 'LOT', quantity: 1, rate: 75000, taxableValue: 75000, cgstPercent: 9, sgstPercent: 9, igstPercent: 0, cgstAmount: 6750, sgstAmount: 6750, igstAmount: 0, total: 88500 }] },
    { id: 5, invoiceNo: 'GSTIN/2024-25/005', invoiceDate: d(-60), dueDate: d(-45), customerId: 1, customerName: 'Aarav Infotech Solutions', customerGstin: '24AAJCS1234A1Z5', customerStateCode: '24', placeOfSupply: 'Ahmedabad', poNo: 'PO-2024-005', poDate: d(-65), taxableAmount: 450000, cgstAmount: 0, sgstAmount: 0, igstAmount: 81000, totalAmount: 531000, amountInWords: 'Five Lakh Thirty-One Thousand Only', status: 'Paid', items: [{ id: 5, description: 'Annual Maintenance Contract', hsnSac: '998315', uom: 'LOT', quantity: 1, rate: 450000, taxableValue: 450000, cgstPercent: 0, sgstPercent: 0, igstPercent: 18, cgstAmount: 0, sgstAmount: 0, igstAmount: 81000, total: 531000 }] },
    { id: 6, invoiceNo: 'GSTIN/2024-25/006', invoiceDate: d(-5), dueDate: d(10), customerId: 2, customerName: 'Meera Enterprises', customerGstin: '27AACPM5678B1Z6', customerStateCode: '27', placeOfSupply: 'Pune', poNo: 'PO-2024-006', poDate: d(-10), taxableAmount: 120000, cgstAmount: 10800, sgstAmount: 10800, igstAmount: 0, totalAmount: 141600, amountInWords: 'One Lakh Forty-One Thousand Six Hundred Only', status: 'Unpaid', items: [{ id: 6, description: 'Cloud Migration Services', hsnSac: '998318', uom: 'LOT', quantity: 1, rate: 120000, taxableValue: 120000, cgstPercent: 9, sgstPercent: 9, igstPercent: 0, cgstAmount: 10800, sgstAmount: 10800, igstAmount: 0, total: 141600 }] },
    { id: 7, invoiceNo: 'GSTIN/2024-25/007', invoiceDate: d(-90), dueDate: d(-75), customerId: 3, customerName: 'Vikram Traders', customerGstin: '29AAKPV9012C1Z7', customerStateCode: '29', placeOfSupply: 'Bangalore', poNo: 'PO-2024-007', poDate: d(-95), taxableAmount: 60000, cgstAmount: 5400, sgstAmount: 5400, igstAmount: 0, totalAmount: 70800, amountInWords: 'Seventy Thousand Eight Hundred Only', status: 'Cancelled', items: [{ id: 7, description: 'Website Development', hsnSac: '998312', uom: 'LOT', quantity: 1, rate: 60000, taxableValue: 60000, cgstPercent: 9, sgstPercent: 9, igstPercent: 0, cgstAmount: 5400, sgstAmount: 5400, igstAmount: 0, total: 70800 }] },
    { id: 8, invoiceNo: 'GSTIN/2024-25/008', invoiceDate: d(-15), dueDate: d(0), customerId: 4, customerName: 'Ananya Constructions', customerGstin: '08AAHCA3456D1Z8', customerStateCode: '08', placeOfSupply: 'Jaipur', poNo: 'PO-2024-008', poDate: d(-20), taxableAmount: 320000, cgstAmount: 0, sgstAmount: 0, igstAmount: 57600, totalAmount: 377600, amountInWords: 'Three Lakh Seventy-Seven Thousand Six Hundred Only', status: 'Overdue', items: [{ id: 8, description: 'Interior Design & Execution', hsnSac: '998324', uom: 'LOT', quantity: 1, rate: 320000, taxableValue: 320000, cgstPercent: 0, sgstPercent: 0, igstPercent: 18, cgstAmount: 0, sgstAmount: 0, igstAmount: 57600, total: 377600 }] },
  ];
}

export default function SalesTaxInvoices() {
  const [records, setRecords] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editTarget, setEditTarget] = useState<Invoice | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [items, setItems] = useState<Item[]>([{ ...EMPTY_ITEM }]);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      const [inv, c] = await Promise.all([fetch('/api/sales/tax-invoices'), fetch('/api/customers')]);
      const [ij, cj] = await Promise.all([inv.json(), c.json()]);
      const invOk = ij.success && Array.isArray(ij.data) && ij.data.length > 0;
      const custOk = cj.success && Array.isArray(cj.data) && cj.data.length > 0;
      if (invOk) setRecords(ij.data);
      else { setRecords(generateMockInvoices()); toast.info('Showing sample data — API unavailable'); }
      if (custOk) setCustomers(cj.data);
      else setCustomers(mockCustomers);
    } catch {
      setRecords(generateMockInvoices());
      setCustomers(mockCustomers);
      toast.info('Showing sample data — API unavailable');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/sales/tax-invoices/import', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.success) { toast.success(`Imported ${json.summary.created} invoices (${json.summary.skipped} skipped, ${json.summary.errors} errors)`); await fetch_(); }
      else toast.error(json.error || 'Import failed');
    } catch { toast.error('Import failed — network error'); }
    finally { setImporting(false); e.target.value = ''; }
  };

  // ── Item math ──
  const recalcItem = (it: Item, gstMode: 'intra' | 'inter'): Item => {
    const taxable = it.quantity * it.rate;
    const cgstP = gstMode === 'intra' ? 9 : 0;
    const sgstP = gstMode === 'intra' ? 9 : 0;
    const igstP = gstMode === 'inter' ? 18 : 0;
    const cgstA = taxable * cgstP / 100;
    const sgstA = taxable * sgstP / 100;
    const igstA = taxable * igstP / 100;
    return { ...it, taxableValue: taxable, cgstPercent: cgstP, sgstPercent: sgstP, igstPercent: igstP, cgstAmount: cgstA, sgstAmount: sgstA, igstAmount: igstA, total: taxable + cgstA + sgstA + igstA };
  };

  const updateItem = (i: number, field: keyof Item, value: string | number) => {
    const u = [...items];
    u[i] = recalcItem({ ...u[i], [field]: value }, form.gstMode);
    setItems(u);
  };
  const addItem = () => setItems([...items, recalcItem({ ...EMPTY_ITEM }, form.gstMode)]);
  const removeItem = (i: number) => { if (items.length <= 1) return; setItems(items.filter((_, idx) => idx !== i)); };

  const totals = items.reduce((acc, it) => ({
    taxable: acc.taxable + it.taxableValue,
    cgst: acc.cgst + it.cgstAmount,
    sgst: acc.sgst + it.sgstAmount,
    igst: acc.igst + it.igstAmount,
    total: acc.total + it.total,
  }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setItems([{ ...EMPTY_ITEM }]); setView('form'); };
  const openEdit = (r: Invoice) => {
    setEditTarget(r);
    setForm({ invoiceNo: r.invoiceNo, invoiceDate: r.invoiceDate?.split('T')[0] || '', dueDate: r.dueDate?.split('T')[0] || '', customerId: r.customerId, placeOfSupply: r.placeOfSupply || '', poNo: r.poNo || '', gstMode: Number(r.igstAmount) > 0 ? 'inter' : 'intra' });
    setItems(r.items && r.items.length ? r.items.map(it => ({ ...it, quantity: Number(it.quantity), rate: Number(it.rate), taxableValue: Number(it.taxableValue), cgstPercent: Number(it.cgstPercent), sgstPercent: Number(it.sgstPercent), igstPercent: Number(it.igstPercent), cgstAmount: Number(it.cgstAmount), sgstAmount: Number(it.sgstAmount), igstAmount: Number(it.igstAmount), total: Number(it.total) })) : [{ ...EMPTY_ITEM }]);
    setView('form');
  };

  const handleSubmit = async (status: string) => {
    if (!form.invoiceNo || !form.customerId || !form.invoiceDate) { toast.error('Invoice No, Customer, and Date required'); return; }
    setSubmitting(true);
    const cust = customers.find(c => c.id === form.customerId);
    try {
      const method = editTarget ? 'PUT' : 'POST';
      const body: Record<string, unknown> = {
        invoiceNo: form.invoiceNo, invoiceDate: form.invoiceDate, dueDate: form.dueDate || null,
        customerId: form.customerId, customerName: cust?.name || '', customerGstin: cust?.gstin || null,
        customerStateCode: cust?.stateCode || null, customerAddress: cust?.address || null,
        placeOfSupply: form.placeOfSupply || null, poNo: form.poNo || null,
        taxableAmount: totals.taxable, cgstRate: form.gstMode === 'intra' ? 9 : 0, sgstRate: form.gstMode === 'intra' ? 9 : 0, igstRate: form.gstMode === 'inter' ? 18 : 0,
        cgstAmount: totals.cgst, sgstAmount: totals.sgst, igstAmount: totals.igst, totalAmount: totals.total,
        status, updatedAt: new Date(),
        items: items.map(it => ({ description: it.description, hsnSac: it.hsnSac, uom: it.uom, quantity: it.quantity, rate: it.rate, taxableValue: it.taxableValue, cgstPercent: it.cgstPercent, sgstPercent: it.sgstPercent, igstPercent: it.igstPercent, cgstAmount: it.cgstAmount, sgstAmount: it.sgstAmount, igstAmount: it.igstAmount, total: it.total })),
      };
      if (editTarget) body.id = editTarget.id;
      const res = await fetch('/api/sales/tax-invoices', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) { toast.success(editTarget ? 'Invoice updated' : 'Invoice created'); setView('list'); await fetch_(); }
      else toast.error(json.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => { try { const r = await fetch(`/api/sales/tax-invoices?id=${id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { toast.success('Deleted'); await fetch_(); } else toast.error(j.error); } catch { toast.error('Network error'); } };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  // ═══════════════════════════════════════════ FORM VIEW
  if (view === 'form') {
    return (
      <div className="space-y-5 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] text-[#f5a623] mb-1"><button onClick={() => setView('list')} className="hover:underline">Tax Invoices</button><span className="text-[#5a6878]"> › </span><span className="text-[#e2e8f0]">{editTarget ? 'Edit' : 'New Invoice'}</span></div>
            <h2 className="text-[24px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Create Tax Invoice</h2>
            <p className="text-[11px] text-[#5a6878] mt-0.5">GST-compliant sales tax invoice with CGST/SGST/IGST.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => handleSubmit('Draft')} disabled={submitting} className="text-[#f5a623] text-[13px] font-semibold hover:underline underline-offset-4 disabled:opacity-50 flex items-center gap-1.5"><Save size={14} /> Save Draft</button>
            <span className="text-[#252e3a]">|</span>
            <button onClick={() => handleSubmit('Submitted')} disabled={submitting} className="text-[#f5a623] text-[13px] font-semibold hover:underline underline-offset-4 disabled:opacity-50 flex items-center gap-1.5">{submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={14} />} Submit Invoice</button>
          </div>
        </div>

        {/* Summary badges */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center justify-between"><span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Taxable</span><span className="text-[13px] font-bold text-[#e2e8f0] font-mono">₹{(totals.taxable ?? 0).toLocaleString('en-IN')}</span></div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center justify-between"><span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">CGST+SGST</span><span className="text-[13px] font-bold text-[#ffab40] font-mono">₹{((totals.cgst ?? 0) + (totals.sgst ?? 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center justify-between"><span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">IGST</span><span className="text-[13px] font-bold text-[#ffab40] font-mono">₹{(totals.igst ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center justify-between"><span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Grand Total</span><span className="text-[13px] font-bold text-[#00e676] font-mono">₹{(totals.total ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
        </div>

        {/* Invoice details */}
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Customer *</label><select value={form.customerId} onChange={e => setForm(p => ({ ...p, customerId: Number(e.target.value) }))} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none"><option value={0}>Select customer...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">GST Type</label><select value={form.gstMode} onChange={e => { const mode = e.target.value as 'intra' | 'inter'; setForm(p => ({ ...p, gstMode: mode })); setItems(items.map(it => recalcItem(it, mode))); }} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none"><option value="intra">Intra-State (CGST 9% + SGST 9%)</option><option value="inter">Inter-State (IGST 18%)</option></select></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Invoice No *</label><input value={form.invoiceNo} onChange={e => setForm(p => ({ ...p, invoiceNo: e.target.value }))} placeholder="UA/25-26/001" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></div>
            <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Invoice Date *</label><input type="date" value={form.invoiceDate} onChange={e => setForm(p => ({ ...p, invoiceDate: e.target.value }))} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none" /></div>
            <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">PO No</label><input value={form.poNo} onChange={e => setForm(p => ({ ...p, poNo: e.target.value }))} placeholder="PO-XXXX" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></div>
            <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Place of Supply</label><input value={form.placeOfSupply} onChange={e => setForm(p => ({ ...p, placeOfSupply: e.target.value }))} placeholder="Area / State" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#252e3a]">
            <h3 className="text-[13px] font-semibold text-[#e2e8f0]">Line Items</h3>
            <button onClick={addItem} className="flex items-center gap-1.5 text-[#f5a623] text-[12px] font-semibold hover:text-[#e8991a]"><Plus size={14} className="border border-[#f5a623] rounded-full" /> ADD ITEM</button>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-[11px]"><thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
            <th className="text-left py-3 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[28%]">Description</th>
            <th className="text-left py-3 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">HSN/SAC</th>
            <th className="text-left py-3 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">UOM</th>
            <th className="text-right py-3 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Qty</th>
            <th className="text-right py-3 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Rate</th>
            <th className="text-right py-3 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Taxable</th>
            <th className="text-right py-3 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">GST</th>
            <th className="text-right py-3 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Total</th>
            <th className="w-[4%]"></th>
          </tr></thead><tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b border-[#1a2028] hover:bg-[#141920]">
                <td className="py-2.5 px-3"><input value={it.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Service description..." className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-2.5 px-3"><input value={it.hsnSac} onChange={e => updateItem(i, 'hsnSac', e.target.value)} className="w-20 bg-transparent border-b border-[#252e3a] pb-1 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-2.5 px-3"><input value={it.uom} onChange={e => updateItem(i, 'uom', e.target.value)} className="w-14 bg-transparent border-b border-[#252e3a] pb-1 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-2.5 px-3"><input type="number" value={it.quantity || ''} onChange={e => updateItem(i, 'quantity', Number(e.target.value) || 0)} className="w-16 bg-transparent border-b border-[#252e3a] pb-1 text-[12px] text-right text-[#e2e8f0] font-mono focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-2.5 px-3"><input type="number" value={it.rate || ''} onChange={e => updateItem(i, 'rate', Number(e.target.value) || 0)} placeholder="0.00" className="w-24 bg-transparent border-b border-[#252e3a] pb-1 text-[12px] text-right text-[#e2e8f0] font-mono focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-2.5 px-3 text-right text-[#8899aa] font-mono">{(it.taxableValue ?? 0).toLocaleString('en-IN')}</td>
                <td className="py-2.5 px-3 text-right text-[#ffab40] font-mono">{((it.cgstAmount ?? 0) + (it.sgstAmount ?? 0) + (it.igstAmount ?? 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                <td className="py-2.5 px-3 text-right text-[#00e676] font-mono font-medium">{(it.total ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                <td className="py-2.5 px-3 text-center"><button onClick={() => removeItem(i)} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button></td>
              </tr>
            ))}
            <tr className="bg-[#0a0d12] border-t border-[#252e3a] font-bold">
              <td colSpan={5} className="py-2.5 px-3 text-right text-[10px] uppercase tracking-[1.5px] text-[#5a6878]">Totals</td>
              <td className="py-2.5 px-3 text-right text-[#e2e8f0] font-mono">{(totals.taxable ?? 0).toLocaleString('en-IN')}</td>
              <td className="py-2.5 px-3 text-right text-[#ffab40] font-mono">{((totals.cgst ?? 0) + (totals.sgst ?? 0) + (totals.igst ?? 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
              <td className="py-2.5 px-3 text-right text-[#00e676] font-mono">{(totals.total ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
              <td></td>
            </tr>
          </tbody></table></div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════ LIST VIEW
  // Filter records
  const filtered = records.filter(r => {
    const matchesSearch = search === '' ||
      r.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (r.poNo || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.placeOfSupply || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totalValue = filtered.reduce((s, r) => s + Number(r.totalAmount), 0);
  const submitted = filtered.filter(r => r.status === 'Submitted' || r.status === 'Paid').length;
  const creditNotes = filtered.filter(r => r.status === 'Credit Note').length;

  // Unique statuses for filter
  const statuses = [...new Set(records.map(r => r.status))];

  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-4 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Value</div><div className="text-[20px] font-bold text-[#00d4ff]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalValue / 10000000).toFixed(2)} Cr</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Submitted</div><div className="text-[20px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{submitted}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#a78bfa]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Credit Notes</div><div className="text-[20px] font-bold text-[#a78bfa]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{creditNotes}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Showing</div><div className="text-[20px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{filtered.length}<span className="text-[12px] text-[#5a6878] font-normal"> / {records.length}</span></div></div>
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileText size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Sales Tax Invoices</span>
          <label className="vc-btn-ghost flex items-center gap-1.5 ml-auto cursor-pointer">{importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Import<input type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" disabled={importing} /></label>
          <button onClick={openCreate} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Invoice</button>
        </div>

        {/* Search + Filter bar */}
        <div className="px-4 py-3 border-b border-[#252e3a] flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6878]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by invoice no, client, PO, area..."
              className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg pl-9 pr-3 py-2 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none min-w-[140px]"
          >
            <option value="all">All Status</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {(search || statusFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setStatusFilter('all'); }} className="text-[11px] text-[#f5a623] hover:underline">Clear filters</button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto"><table className="w-full text-[11px]">
          <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">{['Bill No.', 'Client', 'Place of Supply', 'PO No.', 'Inv Date', 'Taxable Value', 'GST Value', 'Total Inv Value', 'Status', ''].map(h => <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">{paged.map(r => {
            const gst = Number(r.cgstAmount) + Number(r.sgstAmount) + Number(r.igstAmount);
            return (
              <tr key={r.id} onClick={() => setViewInvoice(r)} className="hover:bg-[#141920] cursor-pointer">
                <td className="py-2.5 px-3 text-[#f5a623] font-mono font-medium whitespace-nowrap">{r.invoiceNo}</td>
                <td className="py-2.5 px-3 text-[#e2e8f0] max-w-[200px] truncate">{r.customerName}</td>
                <td className="py-2.5 px-3 text-[#8899aa] max-w-[120px] truncate">{r.placeOfSupply || '—'}</td>
                <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.poNo || 'NA'}</td>
                <td className="py-2.5 px-3 text-[#8899aa] font-mono whitespace-nowrap">{r.invoiceDate?.split('T')[0]}</td>
                <td className="py-2.5 px-3 text-[#e2e8f0] font-mono text-right whitespace-nowrap">₹{(Number(r.taxableAmount) || 0).toLocaleString('en-IN')}</td>
                <td className="py-2.5 px-3 text-[#ffab40] font-mono text-right whitespace-nowrap">₹{(gst ?? 0).toLocaleString('en-IN')}</td>
                <td className="py-2.5 px-3 text-[#00e676] font-mono text-right font-medium whitespace-nowrap">₹{(Number(r.totalAmount) || 0).toLocaleString('en-IN')}</td>
                <td className="py-2.5 px-3"><span className={`vc-badge ${r.status === 'Paid' ? 'bg-[#00e676]/15 text-[#00e676]' : r.status === 'Credit Note' ? 'bg-[#a78bfa]/15 text-[#a78bfa]' : r.status === 'Draft' ? 'bg-[#5a6878]/15 text-[#5a6878]' : 'bg-[#00d4ff]/15 text-[#00d4ff]'}`}>{r.status}</span></td>
                <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}><div className="flex gap-1">
                  <button onClick={() => setViewInvoice(r)} className="p-1 rounded text-[#5a6878] hover:text-[#f5a623] hover:bg-[#f5a623]/10" title="View / Print"><Printer size={13} /></button>
                  <button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10" title="Edit"><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(r.id)} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10" title="Delete"><Trash2 size={13} /></button>
                </div></td>
              </tr>
            );
          })}
          {paged.length === 0 && <tr><td colSpan={10} className="py-10 text-center text-[#5a6878]">{search || statusFilter !== 'all' ? 'No invoices match your filters.' : 'No tax invoices yet.'}</td></tr>}
          </tbody>
        </table></div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[#252e3a] flex items-center justify-between">
            <div className="text-[11px] text-[#5a6878]">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded text-[11px] font-medium bg-[#0a0d12] border border-[#252e3a] text-[#e2e8f0] hover:border-[#f5a623] disabled:opacity-40 disabled:hover:border-[#252e3a] transition-colors"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) pageNum = i + 1;
                else if (page <= 4) pageNum = i + 1;
                else if (page >= totalPages - 3) pageNum = totalPages - 6 + i;
                else pageNum = page - 3 + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded text-[11px] font-medium transition-colors ${page === pageNum ? 'bg-[#f5a623] text-[#0a0d12]' : 'bg-[#0a0d12] border border-[#252e3a] text-[#8899aa] hover:border-[#f5a623] hover:text-[#e2e8f0]'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded text-[11px] font-medium bg-[#0a0d12] border border-[#252e3a] text-[#e2e8f0] hover:border-[#f5a623] disabled:opacity-40 disabled:hover:border-[#252e3a] transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {viewInvoice && <SalesInvoiceDocument invoice={viewInvoice as never} onClose={() => setViewInvoice(null)} />}
    </div>
  );
}
