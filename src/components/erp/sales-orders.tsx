'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingCart, Plus, Pencil, Trash2, Loader2, X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';

interface SO { id: number; soNo: string; soDate: string; customerId: number; quotationId: number | null; status: string; totalAmount: number; createdAt: string; updatedAt: string; Customer?: { id: number; name: string }; Quotation?: { id: number; quotationNo: string } | null; SalesOrderItem?: Array<{ id?: number; itemId: number; qty: number; rate: number; amount: number; Item?: { id: number; sku: string; name: string } }>; }
interface Customer { id: number; name: string; }
interface Item_ { id: number; sku: string; name: string; }
interface FormData { soNo: string; soDate: string; customerId: number; quotationId: number | null; status: string; totalAmount: number; }
interface FormItem { itemId: number; qty: number; rate: number; amount: number; }
const EMPTY_FORM: FormData = { soNo: '', soDate: new Date().toISOString().split('T')[0], customerId: 0, quotationId: null, status: 'draft', totalAmount: 0 };

const SO_COLUMNS: ExportColumn<SO>[] = [
  { header: 'SO Number', accessor: 'soNo' },
  { header: 'SO Date', accessor: (r) => r.soDate?.split('T')[0] ?? '' },
  { header: 'Client', accessor: (r) => r.Customer?.name || '' },
  { header: 'Customer ID', accessor: (r) => r.customerId ?? '' },
  { header: 'Items', accessor: (r) => r.SalesOrderItem?.length ?? 0 },
  { header: 'Amount', accessor: 'totalAmount' },
  { header: 'Status', accessor: 'status' },
];

const SO_IMPORT_FIELDS: ImportField[] = [
  { key: 'soNo', label: 'SO Number', required: true },
  { key: 'soDate', label: 'SO Date', type: 'date' },
  { key: 'customerId', label: 'Customer ID', type: 'number' },
  { key: 'status', label: 'Status' },
  { key: 'totalAmount', label: 'Amount', type: 'number' },
];
const SO_SAMPLE_ROW = { soNo: 'SO-2026-001', soDate: '2026-01-10', customerId: 1, status: 'Confirmed', totalAmount: 590000 };

const EMPTY_LINE: FormItem = { itemId: 0, qty: 1, rate: 0, amount: 0 };
const recalc = (it: FormItem): FormItem => ({ ...it, amount: it.qty * it.rate });

export default function SalesOrders() {
  const [records, setRecords] = useState<SO[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availableItems, setAvailableItems] = useState<Item_[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SO | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [lineItems, setLineItems] = useState<FormItem[]>([{ ...EMPTY_LINE }]);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const tc = useTableControls(records, (r) => `${r.soNo} ${r.Customer?.name ?? ''} ${r.status}`);
  const [custSearch, setCustSearch] = useState('');
  const [custOpen, setCustOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState<Record<number, string>>({});
  const [itemOpen, setItemOpen] = useState<Record<number, boolean>>({});
  const custRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      const [so, cus] = await Promise.all([fetch('/api/sales/orders'), fetch('/api/customers')]);
      const [soj, cj] = await Promise.all([so.json(), cus.json()]);
      if (soj.success) setRecords(soj.data);
      if (cj.success) setCustomers(cj.data);
      try { const ir = await fetch('/api/items'); const ij = await ir.json(); if (ij.success) setAvailableItems(ij.data); } catch {}
    } catch {
      toast.error('Failed to load orders');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (custRef.current && !custRef.current.contains(e.target as Node)) setCustOpen(false);
      Object.entries(itemRefs.current).forEach(([idx, ref]) => { if (ref && !ref.contains(e.target as Node)) setItemOpen(p => ({ ...p, [Number(idx)]: false })); });
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const generateSoNo = () => {
    const year = new Date().getFullYear();
    const existing = new Set(records.map(r => r.soNo));
    let seq = records.length + 1;
    let candidate = `SO/${year}/${String(seq).padStart(4, '0')}`;
    while (existing.has(candidate)) { seq += 1; candidate = `SO/${year}/${String(seq).padStart(4, '0')}`; }
    return candidate;
  };

  const openEdit = (r: SO) => {
    setEditTarget(r);
    setForm({ soNo: r.soNo, soDate: r.soDate?.split('T')[0] || '', customerId: r.customerId, quotationId: r.quotationId, status: r.status, totalAmount: Number(r.totalAmount) });
    setLineItems(r.SalesOrderItem?.length ? r.SalesOrderItem.map(it => ({ itemId: it.itemId, qty: Number(it.qty), rate: Number(it.rate), amount: Number(it.amount) })) : [{ ...EMPTY_LINE }]);
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.soNo || !form.customerId || !form.soDate) { toast.error('SO No, Customer, and Date required'); return; }
    setSubmitting(true);
    try {
      const method = editTarget ? 'PUT' : 'POST';
      const body: Record<string, unknown> = { ...form, soDate: new Date(form.soDate), quotationId: form.quotationId || null, totalAmount: lineItems.reduce((s, it) => s + it.qty * it.rate, 0), items: lineItems.filter(it => it.itemId > 0).map(it => ({ itemId: it.itemId, qty: it.qty, rate: it.rate, amount: it.qty * it.rate })) };
      if (editTarget) body.id = editTarget.id;
      const r = await fetch('/api/sales/orders', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.success) { toast.success(editTarget ? 'Updated' : 'Created'); setFormOpen(false); await fetch_(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { const r = await fetch(`/api/sales/orders?id=${deleteTarget.id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { toast.success('Deleted'); setDeleteOpen(false); await fetch_(); } else toast.error(j.error); } catch { toast.error('Network error'); }
  };

  const updateLine = (i: number, field: keyof FormItem, value: number) => { const u = [...lineItems]; u[i] = recalc({ ...u[i], [field]: value }); setLineItems(u); };
  const addLine = () => setLineItems([...lineItems, { ...EMPTY_LINE }]);
  const removeLine = (i: number) => { if (lineItems.length <= 1) return; setLineItems(lineItems.filter((_, idx) => idx !== i)); };
  const formTotal = lineItems.reduce((s, it) => s + it.amount, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  if (importOpen) {
    return (
      <ImportWizard
        title="Sales Orders"
        fields={SO_IMPORT_FIELDS}
        keyField="soNo"
        existingKeys={new Set(records.map(r => r.soNo))}
        commitEndpoint="/api/sales/orders/import"
        sampleRow={SO_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetch_}
      />
    );
  }

  const totalValue = records.reduce((s, r) => s + Number(r.totalAmount), 0);
  const draftCount = records.filter(r => r.status === 'draft').length;
  const submittedCount = records.filter(r => r.status === 'submitted' || r.status === 'confirmed').length;

  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-4 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Orders</div><div className="text-[20px] font-bold text-[#00d4ff]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{records.length}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Value</div><div className="text-[20px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalValue / 100000).toFixed(2)}L</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Draft</div><div className="text-[20px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{draftCount}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#a78bfa]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Submitted / Confirmed</div><div className="text-[20px] font-bold text-[#a78bfa]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{submittedCount}</div></div>
      </div>

      <div className="vc-panel"><div className="vc-panel-header"><ShoppingCart size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Sales Orders</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length}</span><div className="ml-2"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search orders..." /></div><button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={records} columns={SO_COLUMNS} filename="sales-orders" /><button onClick={() => { setEditTarget(null); setForm({ ...EMPTY_FORM, soNo: generateSoNo() }); setLineItems([{ ...EMPTY_LINE }]); setFormOpen(true); }} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Order</button></div>
        <div className="overflow-x-auto"><div className="max-h-[520px] overflow-y-auto"><table className="w-full text-[11px]"><thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">{['SO No','Customer','Date','Items','Amount','Status',''].map(h=><th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead><tbody className="divide-y divide-[#1a2028]">{tc.pageItems.map(r=><tr key={r.id} className="hover:bg-[#141920]"><td className="py-2.5 px-3 text-[#f5a623] font-mono">{r.soNo}</td><td className="py-2.5 px-3 text-[#e2e8f0]">{r.Customer?.name||'—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.soDate?.split('T')[0]}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.SalesOrderItem?.length||0}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-mono">₹{(Number(r.totalAmount) || 0).toLocaleString('en-IN')}</td><td className="py-2.5 px-3"><span className={`vc-badge ${r.status==='confirmed'?'bg-[#00e676]/15 text-[#00e676]':r.status==='draft'?'bg-[#5a6878]/15 text-[#5a6878]':r.status==='submitted'?'bg-[#00d4ff]/15 text-[#00d4ff]':'bg-[#ffab40]/15 text-[#ffab40]'}`}>{r.status}</span></td><td className="py-2.5 px-3"><div className="flex gap-1"><button onClick={()=>openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13}/></button><button onClick={()=>{setDeleteTarget(r);setDeleteOpen(true);}} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13}/></button></div></td></tr>)}{tc.pageItems.length===0&&<tr><td colSpan={7} className="py-8 text-center text-[#5a6878]">No matching sales orders</td></tr>}</tbody></table></div><PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} /></div></div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit' : 'New'} Sales Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">SO No</label>
                <input value={form.soNo} readOnly className="vc-input opacity-60" placeholder="Auto-generated" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">SO Date</label>
                <input type="date" value={form.soDate} onChange={e => setForm({...form, soDate: e.target.value})} className="vc-input" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Customer</label>
                <select value={form.customerId} onChange={e => setForm({...form, customerId: Number(e.target.value)})} className="vc-input">
                  <option value={0}>Select customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="vc-input">
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="confirmed">Confirmed</option>
                </select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-[#8899aa]">Line Items</label>
                <button onClick={addLine} className="text-[10px] text-[#f5a623] hover:underline flex items-center gap-1"><Plus size={11} /> Add Item</button>
              </div>
              <div className="space-y-2">
                {lineItems.map((it, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-[9px] text-[#8899aa]">Item</label>
                      <select value={it.itemId} onChange={e => updateLine(i, 'itemId', Number(e.target.value))} className="vc-input text-[11px]">
                        <option value={0}>Select item</option>
                        {availableItems.map(ai => <option key={ai.id} value={ai.id}>{ai.name}</option>)}
                      </select>
                    </div>
                    <div className="w-16">
                      <label className="text-[9px] text-[#8899aa]">Qty</label>
                      <input type="number" value={it.qty} onChange={e => updateLine(i, 'qty', Number(e.target.value))} className="vc-input text-[11px]" min={1} />
                    </div>
                    <div className="w-20">
                      <label className="text-[9px] text-[#8899aa]">Rate</label>
                      <input type="number" value={it.rate} onChange={e => updateLine(i, 'rate', Number(e.target.value))} className="vc-input text-[11px]" min={0} />
                    </div>
                    <div className="w-20">
                      <label className="text-[9px] text-[#8899aa]">Amount</label>
                      <div className="text-[#e2e8f0] text-[11px] py-1.5">₹{it.amount.toLocaleString('en-IN')}</div>
                    </div>
                    {lineItems.length > 1 && (
                      <button onClick={() => removeLine(i)} className="p-1 mb-1 text-[#ff3d3d] hover:bg-[#ff3d3d]/10 rounded"><X size={13} /></button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-2 pt-2 border-t border-[#252e3a]">
                <span className="text-[12px] text-[#f5a623] font-bold">Total: ₹{formTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setFormOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleSubmit} className="vc-btn-primary">{editTarget ? 'Update' : 'Create'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Sales Order</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.soNo}</strong>? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
