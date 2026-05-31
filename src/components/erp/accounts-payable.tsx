'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2, Send, Save, CheckCircle2, FileText, CircleDot, Pencil, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';

interface APRecord {
  id: number; billNo: string; vendor: string; vendorCode: string | null;
  invoiceRef: string | null; description: string | null; amount: number;
  tax: number; totalAmount: number; dueDate: string; paidDate: string | null;
  paymentMethod: string | null; paymentRef: string | null; status: string; remarks: string | null;
}

interface LineItem { id: number; description: string; glAccount: string; costCenter: string; quantity: number; unitPrice: number; }

interface FormData {
  billNo: string; vendor: string; vendorCode: string; invoiceRef: string;
  invoiceDate: string; dueDate: string; totalAmount: number; status: string;
  description: string; poReference: string;
}

const EMPTY_FORM: FormData = { billNo: '', vendor: '', vendorCode: '', invoiceRef: '', invoiceDate: '', dueDate: '', totalAmount: 0, status: 'Pending', description: '', poReference: '' };

export default function AccountsPayable() {
  const [records, setRecords] = useState<APRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editTarget, setEditTarget] = useState<APRecord | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [lines, setLines] = useState<LineItem[]>([{ id: 1, description: '', glAccount: '', costCenter: '', quantity: 1, unitPrice: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) openCreate(); }, [triggerCreate]);
  useEffect(() => { setPage(1); }, [searchTerm, statusFilter]);

  const fetchData = useCallback(async () => {
    try { setLoading(true); const res = await fetch('/api/accounts-payable'); const json = await res.json(); if (json.success) setRecords(json.data); }
    catch { toast.error('Failed to fetch'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setLines([{ id: 1, description: '', glAccount: '', costCenter: '', quantity: 1, unitPrice: 0 }]); setView('form'); };
  const openEdit = (r: APRecord) => {
    setEditTarget(r);
    setForm({ billNo: r.billNo, vendor: r.vendor, vendorCode: r.vendorCode || '', invoiceRef: r.invoiceRef || '', invoiceDate: '', dueDate: r.dueDate?.split('T')[0] || '', totalAmount: r.totalAmount, status: r.status, description: r.description || '', poReference: '' });
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
      const body = editTarget
        ? { id: editTarget.id, billNo: form.billNo, vendor: form.vendor, vendorCode: form.vendorCode, invoiceRef: form.invoiceRef, description: form.description, amount, tax, totalAmount: amount + tax, dueDate: new Date(form.dueDate), status }
        : { billNo: form.billNo, vendor: form.vendor, vendorCode: form.vendorCode, invoiceRef: form.invoiceRef, description: form.description, amount, tax, totalAmount: amount + tax, dueDate: new Date(form.dueDate), status };
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

  // ═══════════════════════════════════════════════════════
  // FORM VIEW — with Invoice Scan panel on right
  // ═══════════════════════════════════════════════════════
  if (view === 'form') {
    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] text-[#f5a623] mb-1"><button onClick={() => setView('list')} className="hover:underline">Accounts Payable</button><span className="text-[#5a6878]">{' > '}</span><span className="text-[#e2e8f0]">{editTarget ? 'Edit' : 'Capture AP Invoice'}</span></div>
            <h2 className="text-[24px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Capture AP Invoice</h2>
            <p className="text-[11px] text-[#5a6878] mt-0.5">Manual data entry for plant expenditure verification.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleSubmit('Pending')} disabled={submitting} className="px-4 py-2 rounded-lg border border-[#f5a623] text-[#f5a623] text-[12px] font-semibold hover:bg-[#f5a623]/10 disabled:opacity-50 flex items-center gap-1.5"><Save size={13} /> Save Draft</button>
            <button onClick={() => handleSubmit('Pending')} disabled={submitting} className="px-4 py-2 rounded-lg bg-[#f5a623] text-[#0a0d12] text-[12px] font-semibold hover:bg-[#e8991a] disabled:opacity-50 flex items-center gap-1.5">{submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Submit for Approval</button>
          </div>
        </div>

        {/* Two-column: Form left, Invoice Scan right */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          {/* LEFT — Form */}
          <div className="space-y-5">
            {/* Status badges */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-3 flex items-center justify-between"><span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">PO Reference</span><span className="flex items-center gap-1.5 text-[12px] font-mono text-[#e2e8f0]">{form.poReference || 'N/A'}<CheckCircle2 size={13} className="text-[#00e676]" /></span></div>
              <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-3 flex items-center justify-between"><span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Receipt Status</span><span className="flex items-center gap-1.5 text-[12px] font-mono text-[#e2e8f0]">{form.invoiceRef || 'Pending'}<CheckCircle2 size={13} className="text-[#ffab40]" /></span></div>
              <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-3 flex items-center justify-between"><span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Match Variance</span><span className="flex items-center gap-1.5 text-[12px] font-mono text-[#00e676]">0.00%<CheckCircle2 size={13} className="text-[#00e676]" /></span></div>
            </div>

            {/* Vendor + fields */}
            <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5 space-y-4">
              <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Vendor Selection</label><input value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))} placeholder="Search vendor..." className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Invoice #</label><input value={form.billNo} onChange={e => setForm(p => ({ ...p, billNo: e.target.value }))} placeholder="INV-0000" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></div>
                <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Invoice Date</label><input type="date" value={form.invoiceDate} onChange={e => setForm(p => ({ ...p, invoiceDate: e.target.value }))} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none" /></div>
                <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Due Date</label><input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none" /></div>
                <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Total (₹)</label><input type="number" value={lineTotal || form.totalAmount || ''} readOnly className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] opacity-70 font-mono" /></div>
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
  const filtered = records.filter(r => {
    const matchSearch = searchTerm === '' || r.billNo.toLowerCase().includes(searchTerm.toLowerCase()) || r.vendor.toLowerCase().includes(searchTerm.toLowerCase()) || (r.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPending = filtered.filter(r => r.status === 'Pending' || r.status === 'Partially Paid').reduce((s, r) => s + r.totalAmount, 0);
  const totalPaid = filtered.filter(r => r.status === 'Paid').reduce((s, r) => s + r.totalAmount, 0);
  const totalOverdue = filtered.filter(r => r.status === 'Overdue').reduce((s, r) => s + r.totalAmount, 0);
  const statuses = [...new Set(records.map(r => r.status))];
  const statusBadge = (s: string) => { if (s === 'Paid') return 'bg-[#00e676]/15 text-[#00e676]'; if (s === 'Pending') return 'bg-[#ffab40]/15 text-[#ffab40]'; if (s === 'Overdue') return 'bg-[#ff3d3d]/15 text-[#ff3d3d]'; return 'bg-[#00d4ff]/15 text-[#00d4ff]'; };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ffab40]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Pending</div><div className="text-[20px] font-bold text-[#ffab40]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>&#8377;{(totalPending / 100000).toFixed(2)} L</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Paid</div><div className="text-[20px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>&#8377;{(totalPaid / 100000).toFixed(2)} L</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ff3d3d]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Overdue</div><div className="text-[20px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>&#8377;{(totalOverdue / 100000).toFixed(2)} L</div></div>
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header"><FileText size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">AP Invoices</span><button onClick={openCreate} className="vc-btn-primary flex items-center gap-1.5 ml-auto"><Plus size={13} /> New Entry</button></div>
        <div className="px-4 py-3 border-b border-[#252e3a] flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6878]" /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search bill no, vendor..." className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg pl-9 pr-3 py-2 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none min-w-[130px]"><option value="all">All Status</option>{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select>
          {(searchTerm || statusFilter !== 'all') && <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); }} className="text-[11px] text-[#f5a623] hover:underline">Clear</button>}
        </div>

        <div className="overflow-x-auto"><table className="w-full text-[11px]"><thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">{['Bill No', 'Vendor', 'Amount', 'Tax', 'Total', 'Due Date', 'Status', ''].map(h => <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">{paged.map(r => (
            <tr key={r.id} className="hover:bg-[#141920]">
              <td className="py-2.5 px-3 text-[#f5a623] font-mono font-medium">{r.billNo}</td>
              <td className="py-2.5 px-3 text-[#e2e8f0]">{r.vendor}</td>
              <td className="py-2.5 px-3 text-[#8899aa] font-mono">&#8377;{r.amount.toLocaleString('en-IN')}</td>
              <td className="py-2.5 px-3 text-[#8899aa] font-mono">&#8377;{r.tax.toLocaleString('en-IN')}</td>
              <td className="py-2.5 px-3 text-[#e2e8f0] font-mono font-medium">&#8377;{r.totalAmount.toLocaleString('en-IN')}</td>
              <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.dueDate?.split('T')[0]}</td>
              <td className="py-2.5 px-3"><span className={`vc-badge ${statusBadge(r.status)}`}>{r.status}</span></td>
              <td className="py-2.5 px-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button><button onClick={() => handleDelete(r.id)} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button></div></td>
            </tr>
          ))}{paged.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-[#5a6878]">No records found.</td></tr>}</tbody>
        </table></div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[#252e3a] flex items-center justify-between">
            <span className="text-[11px] text-[#5a6878]">Showing {(page-1)*pageSize+1}–{Math.min(page*pageSize, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="px-3 py-1.5 rounded text-[11px] bg-[#0a0d12] border border-[#252e3a] text-[#e2e8f0] hover:border-[#f5a623] disabled:opacity-40">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="px-3 py-1.5 rounded text-[11px] bg-[#0a0d12] border border-[#252e3a] text-[#e2e8f0] hover:border-[#f5a623] disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
