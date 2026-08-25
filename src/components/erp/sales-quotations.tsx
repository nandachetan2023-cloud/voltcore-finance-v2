'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, Plus, Pencil, Trash2, Loader2, Search, ChevronDown, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';

interface Customer { id: number; name: string; }
interface Item { id: number; sku: string; name: string; sellingPrice: number; }
interface QuotationItem { id?: number; itemId: number; qty: number; rate: number; amount: number; Item?: Item; }
interface Quotation {
  id: number; quotationNo: string; quotationDate: string; customerId: number; validUntil?: string | null;
  status: string; subtotal: number; taxAmount: number; totalAmount: number;
  Customer?: Customer; QuotationItem?: QuotationItem[];
}

interface FormData { quotationNo: string; quotationDate: string; customerId: number; validUntil: string; status: string; }
const EMPTY_FORM: FormData = { quotationNo: '', quotationDate: new Date().toISOString().split('T')[0], customerId: 0, validUntil: '', status: 'draft' };
const EMPTY_LINE: QuotationItem = { itemId: 0, qty: 1, rate: 0, amount: 0 };

const QUOTATION_COLUMNS: ExportColumn<Quotation>[] = [
  { header: 'Quotation No', accessor: 'quotationNo' },
  { header: 'Date', accessor: (r) => r.quotationDate?.split('T')[0] ?? '' },
  { header: 'Client', accessor: (r) => r.Customer?.name || '' },
  { header: 'Customer ID', accessor: (r) => r.customerId ?? '' },
  { header: 'Valid Until', accessor: (r) => r.validUntil?.split('T')[0] ?? '' },
  { header: 'Status', accessor: 'status' },
  { header: 'Amount', accessor: 'totalAmount' },
];

const QUOTATION_IMPORT_FIELDS: ImportField[] = [
  { key: 'quotationNo', label: 'Quotation No', required: true },
  { key: 'quotationDate', label: 'Date', type: 'date' },
  { key: 'customerId', label: 'Customer ID', type: 'number' },
  { key: 'validUntil', label: 'Valid Until', type: 'date' },
  { key: 'status', label: 'Status' },
  { key: 'totalAmount', label: 'Amount', type: 'number' },
];
const QUOTATION_SAMPLE_ROW = { quotationNo: 'QTN-2026-001', quotationDate: '2026-01-05', customerId: 1, validUntil: '2026-02-28', status: 'sent', totalAmount: 885000 };

export default function SalesQuotations() {
  const [records, setRecords] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Quotation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [lines, setLines] = useState<QuotationItem[]>([{ ...EMPTY_LINE }]);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState<Record<number, string>>({});
  const [openCombobox, setOpenCombobox] = useState<number | null>(null);
  const comboboxRef = useRef<HTMLDivElement>(null);

  const tc = useTableControls(records, (r) => `${r.quotationNo} ${r.Customer?.name ?? ''} ${r.status}`);

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      const [q, c, i] = await Promise.all([fetch('/api/sales/quotations'), fetch('/api/customers'), fetch('/api/items')]);
      const [qj, cj, ij] = await Promise.all([q.json(), c.json(), i.json()]);
      if (qj.success) setRecords(qj.data);
      if (cj.success) setCustomers(cj.data);
      if (ij.success) setItems(ij.data);
    } catch {
      toast.error('Failed to load quotations');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) setOpenCombobox(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const recalc = (line: QuotationItem): QuotationItem => ({ ...line, amount: line.qty * line.rate });

  const updateLine = (i: number, field: keyof QuotationItem, value: number) => {
    const u = [...lines]; u[i] = recalc({ ...u[i], [field]: value }); setLines(u);
  };

  const selectItem = (i: number, item: Item) => {
    const u = [...lines]; u[i] = recalc({ ...u[i], itemId: item.id, rate: Number(item.sellingPrice) || 0 }); setLines(u);
    setItemSearch(p => ({ ...p, [i]: item.name })); setOpenCombobox(null);
  };

  const addLine = () => { setLines([...lines, { ...EMPTY_LINE }]); };
  const removeLine = (i: number) => { if (lines.length <= 1) return; const u = lines.filter((_, idx) => idx !== i); setLines(u); setItemSearch(p => { const n = { ...p }; delete n[i]; return Object.fromEntries(Object.entries(n).map(([k, v], idx) => [idx, v])); }); };

  const totals = lines.reduce((acc, l) => ({ subtotal: acc.subtotal + l.amount, taxAmount: 0, totalAmount: acc.totalAmount + l.amount }), { subtotal: 0, taxAmount: 0, totalAmount: 0 });

  const generateQuotationNo = () => {
    const year = new Date().getFullYear();
    const existing = new Set(records.map(r => r.quotationNo));
    let seq = records.length + 1;
    let candidate = `QT/${year}/${String(seq).padStart(3, '0')}`;
    while (existing.has(candidate)) { seq += 1; candidate = `QT/${year}/${String(seq).padStart(3, '0')}`; }
    return candidate;
  };
  const openCreate = () => { setEditTarget(null); setForm({ ...EMPTY_FORM, quotationNo: generateQuotationNo() }); setLines([{ ...EMPTY_LINE }]); setItemSearch({}); setFormOpen(true); };

  const openEdit = (r: Quotation) => {
    setEditTarget(r);
    setForm({ quotationNo: r.quotationNo, quotationDate: r.quotationDate?.split('T')[0] || '', customerId: r.customerId, validUntil: r.validUntil?.split('T')[0] || '', status: r.status });
    const its = r.QuotationItem && r.QuotationItem.length ? r.QuotationItem.map(it => ({ itemId: it.itemId, qty: Number(it.qty), rate: Number(it.rate), amount: Number(it.amount), Item: it.Item })) : [{ ...EMPTY_LINE }];
    setLines(its);
    const searchMap: Record<number, string> = {};
    its.forEach((it, idx) => { if (it.Item) searchMap[idx] = it.Item.name; });
    setItemSearch(searchMap);
    setFormOpen(true);
  };

  const handleSubmit = async (status: string) => {
    if (!form.quotationNo || !form.customerId || !form.quotationDate) { toast.error('Quotation No, Customer, and Date required'); return; }
    if (!lines.some(l => l.itemId && l.qty > 0)) { toast.error('At least one line item required'); return; }
    setSubmitting(true);
    try {
      const method = editTarget ? 'PUT' : 'POST';
      const body: Record<string, unknown> = {
        ...form, quotationDate: form.quotationDate, validUntil: form.validUntil || null,
        subtotal: totals.subtotal, taxAmount: 0, totalAmount: totals.totalAmount, status,
        items: lines.map(l => ({ itemId: l.itemId, qty: l.qty, rate: l.rate, amount: l.amount })),
      };
      if (editTarget) body.id = editTarget.id;
      const r = await fetch('/api/sales/quotations', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.success) { toast.success(editTarget ? 'Updated' : 'Created'); setFormOpen(false); await fetch_(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { const r = await fetch(`/api/sales/quotations?id=${deleteTarget.id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { toast.success('Deleted'); setDeleteOpen(false); await fetch_(); } else toast.error(j.error); } catch { toast.error('Network error'); }
  };

  const filteredItems = (search: string) => items.filter(it => it.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  if (importOpen) {
    return (
      <ImportWizard
        title="Quotations"
        fields={QUOTATION_IMPORT_FIELDS}
        keyField="quotationNo"
        existingKeys={new Set(records.map(r => r.quotationNo))}
        commitEndpoint="/api/sales/quotations/import"
        sampleRow={QUOTATION_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetch_}
      />
    );
  }

  const totalValue = records.reduce((s, r) => s + Number(r.totalAmount), 0);
  const draftCount = records.filter(r => r.status === 'draft').length;
  const submittedCount = records.filter(r => r.status === 'submitted' || r.status === 'accepted').length;

  return (
    <div className="space-y-4 p-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Quotations</div><div className="text-[20px] font-bold text-[#00d4ff]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{records.length}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Draft</div><div className="text-[20px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{draftCount}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Submitted / Accepted</div><div className="text-[20px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{submittedCount}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#a78bfa]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Amount</div><div className="text-[20px] font-bold text-[#a78bfa]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalValue ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div></div>
      </div>

      {/* Table Panel */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileText size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Sales Quotations</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{tc.total}</span>
          <div className="ml-2"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search quotations..." /></div>
          <button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={records} columns={QUOTATION_COLUMNS} filename="sales-quotations" />
          <button onClick={openCreate} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Quotation</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
              <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Quotation No</th>
              <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Date</th>
              <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Customer</th>
              <th className="text-right py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Total</th>
              <th className="text-center py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Status</th>
              <th className="w-[10%]"></th>
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">{tc.pageItems.map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2.5 px-3 text-[#f5a623] font-mono font-medium">{r.quotationNo}</td>
                <td className="py-2.5 px-3 text-[#8899aa] font-mono whitespace-nowrap">{r.quotationDate?.split('T')[0]}</td>
                <td className="py-2.5 px-3 text-[#e2e8f0] max-w-[200px] truncate">{r.Customer?.name || '—'}</td>
                <td className="py-2.5 px-3 text-right text-[#00e676] font-mono font-medium">₹{(Number(r.totalAmount) || 0).toLocaleString('en-IN')}</td>
                <td className="py-2.5 px-3 text-center"><span className={`vc-badge ${
                  r.status === 'draft' ? 'bg-[#5a6878]/15 text-[#5a6878]' :
                  r.status === 'submitted' ? 'bg-[#00d4ff]/15 text-[#00d4ff]' :
                  r.status === 'accepted' ? 'bg-[#00e676]/15 text-[#00e676]' :
                  r.status === 'rejected' ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' :
                  'bg-[#a78bfa]/15 text-[#a78bfa]'
                }`}>{r.status}</span></td>
                <td className="py-2.5 px-3"><div className="flex gap-1 justify-end">
                  <button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button>
                  <button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
                </div></td>
              </tr>
            ))}{tc.pageItems.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-[#5a6878]">No quotations found</td></tr>}</tbody>
          </table>
        </div>
        <PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} />
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit' : 'New'} Quotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Quotation No</label>
                <input value={form.quotationNo} readOnly className="vc-input opacity-60" placeholder="Auto-generated" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Quotation Date</label>
                <input type="date" value={form.quotationDate} onChange={e => setForm({...form, quotationDate: e.target.value})} className="vc-input" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Customer</label>
                <select value={form.customerId} onChange={e => setForm({...form, customerId: Number(e.target.value)})} className="vc-input">
                  <option value={0}>Select customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Valid Until</label>
                <input type="date" value={form.validUntil} onChange={e => setForm({...form, validUntil: e.target.value})} className="vc-input" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setFormOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={() => handleSubmit('draft')} className="vc-btn-ghost">Save as Draft</button>
            <button onClick={() => handleSubmit('submitted')} className="vc-btn-primary">Submit</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Quotation</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.quotationNo}</strong> by {deleteTarget?.Customer?.name}? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
