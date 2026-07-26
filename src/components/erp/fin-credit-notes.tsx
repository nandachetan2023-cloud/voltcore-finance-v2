'use client';
import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Pencil, Trash2, Loader2, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';

interface Invoice { id: number; invoiceNo: string; }
interface Site { id: number; name: string; siteCode: string; }

const CN_COLUMNS: ExportColumn<CreditNote>[] = [
  { header: 'Credit Note No', accessor: 'creditNoteNo' },
  { header: 'Date', accessor: (r) => r.date?.split('T')[0] ?? '' },
  { header: 'Invoice', accessor: (r: any) => r.invoice?.invoiceNo || r.creditNoteAgainstInvoiceNo || '' },
  { header: 'Client', accessor: 'client' },
  { header: 'Invoice Value', accessor: 'invoiceValue' },
  { header: 'GST Value', accessor: 'gstValue' },
  { header: 'Total Invoice Value', accessor: 'totalInvoiceValue' },
  { header: 'Amount', accessor: 'amount' },
  { header: 'After TDS Balance', accessor: 'afterTdsBalance' },
  { header: 'Received Amount', accessor: 'receivedAmount' },
  { header: 'Received Date', accessor: (r) => r.receivedDate?.split('T')[0] ?? '' },
  { header: 'Reason', accessor: 'reason' },
  { header: 'Status', accessor: 'status' },
];

const CN_IMPORT_FIELDS: ImportField[] = [
  { key: 'creditNoteNo', label: 'Credit Note No', required: true },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'client', label: 'Client' },
  { key: 'invoiceId', label: 'Invoice ID', type: 'number' },
  { key: 'siteId', label: 'Site ID', type: 'number' },
  { key: 'invoiceValue', label: 'Invoice Value', type: 'number' },
  { key: 'gstValue', label: 'GST Value', type: 'number' },
  { key: 'totalInvoiceValue', label: 'Total Invoice Value', type: 'number' },
  { key: 'amount', label: 'Amount', type: 'number' },
  { key: 'afterTdsBalance', label: 'After TDS Balance', type: 'number' },
  { key: 'receivedAmount', label: 'Received Amount', type: 'number' },
  { key: 'status', label: 'Status' },
];
const CN_SAMPLE_ROW = { creditNoteNo: 'CN-2026-001', date: '2026-01-25', client: 'L&T Construction', invoiceId: 1, siteId: 1, invoiceValue: 2500000, gstValue: 450000, totalInvoiceValue: 2950000, amount: 50000, afterTdsBalance: 2800000, receivedAmount: 0, status: 'Issued' };

interface CreditNote {
  id: number; creditNoteNo: string; trackingNo?: string | null; poNo?: string | null;
  invoiceId: number; siteId: number; jobCode?: string | null;
  creditNoteAgainstInvoiceNo?: string | null; client?: string | null; area?: string | null;
  monthWork?: string | null; date: string;
  invoiceValue: number; gstValue: number; totalInvoiceValue: number; amount: number;
  afterTdsBalance: number; receivedAmount: number;
  receivedDate?: string | null; voucherNo?: string | null;
  debitAmount: number; holdAmount: number;
  reason?: string | null; remarks?: string | null;
  paymentDueDate?: string | null; status: string;
  invoice?: { invoiceNo: string } | null;
  site?: { name: string } | null;
}

interface FormData {
  creditNoteNo: string; date: string; invoiceId: number; siteId: number; jobCode: string;
  client: string; area: string; monthWork: string;
  invoiceValue: number; gstValue: number; totalInvoiceValue: number; amount: number;
  status: string;
  reason: string; remarks: string;
  voucherNo: string; receivedDate: string; receivedAmount: number; afterTdsBalance: number;
  debitAmount: number; holdAmount: number;
  creditNoteAgainstInvoiceNo: string; trackingNo: string; poNo: string;
  paymentDueDate: string;
}

const EMPTY_FORM: FormData = {
  creditNoteNo: '', date: new Date().toISOString().split('T')[0], invoiceId: 0, siteId: 0, jobCode: '',
  client: '', area: '', monthWork: '',
  invoiceValue: 0, gstValue: 0, totalInvoiceValue: 0, amount: 0,
  status: 'Issued',
  reason: '', remarks: '',
  voucherNo: '', receivedDate: '', receivedAmount: 0, afterTdsBalance: 0,
  debitAmount: 0, holdAmount: 0,
  creditNoteAgainstInvoiceNo: '', trackingNo: '', poNo: '',
  paymentDueDate: '',
};

const STATUSES = ['Issued', 'Received', 'Cancelled'];
const inputCls = "w-full bg-[#1a2332] border-[1.5px] border-[#2e3a48] rounded-lg px-3.5 py-2.5 text-[13px] text-[#e2e8f0] outline-none transition-all duration-200 placeholder:text-[#5a6878] hover:border-[#3a4858] hover:bg-[#1e2838] focus:border-[#f5a623] focus:bg-[#1e2838] focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)]";
const selectCls = inputCls + " appearance-none cursor-pointer";

function fmt(n: number) { return '₹' + (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }
function fmtCr(n: number) { return '₹' + (n / 10000000).toFixed(2) + ' Cr'; }

function generateMockCreditNotes(): CreditNote[] {
  return [
    { id: 1, creditNoteNo: 'CN/2024-25/001', invoiceId: 1, siteId: 1, date: '2024-12-20T00:00:00', invoiceValue: 2500000, gstValue: 450000, totalInvoiceValue: 2950000, amount: 150000, afterTdsBalance: 135000, receivedAmount: 135000, debitAmount: 0, holdAmount: 15000, status: 'Received', reason: 'Rate revision adjustment', client: 'NTPC Ltd', area: 'Block A', monthWork: 'Nov 2024', invoice: { invoiceNo: 'INV/2024-25/001' }, site: { name: 'NTPC Rihand Dam Project' } },
    { id: 2, creditNoteNo: 'CN/2024-25/002', invoiceId: 2, siteId: 2, date: '2025-01-15T00:00:00', invoiceValue: 1800000, gstValue: 324000, totalInvoiceValue: 2124000, amount: 85000, afterTdsBalance: 76500, receivedAmount: 0, debitAmount: 0, holdAmount: 8500, status: 'Issued', reason: 'Material shortage credit', client: 'BALCO', area: 'Main Plant', monthWork: 'Dec 2024', invoice: { invoiceNo: 'INV/2024-25/002' }, site: { name: 'BALCO Aluminium Smelter' } },
    { id: 3, creditNoteNo: 'CN/2024-25/003', invoiceId: 3, siteId: 3, date: '2025-02-10T00:00:00', invoiceValue: 3200000, gstValue: 576000, totalInvoiceValue: 3776000, amount: 220000, afterTdsBalance: 198000, receivedAmount: 198000, debitAmount: 0, holdAmount: 22000, status: 'Received', reason: 'Quality deduction on coal handling', client: 'Coal India Ltd', area: 'Stockyard', monthWork: 'Jan 2025', invoice: { invoiceNo: 'INV/2024-25/003' }, site: { name: 'Coal India Eastern Coalfield' } },
    { id: 4, creditNoteNo: 'CN/2024-25/004', invoiceId: 4, siteId: 4, date: '2025-03-05T00:00:00', invoiceValue: 4500000, gstValue: 810000, totalInvoiceValue: 5310000, amount: 350000, afterTdsBalance: 315000, receivedAmount: 0, debitAmount: 50000, holdAmount: 35000, status: 'Issued', reason: 'Delayed penalty — 15 days', client: 'Vedanta Ltd', area: 'Potline Area', monthWork: 'Feb 2025', invoice: { invoiceNo: 'INV/2024-25/004' }, site: { name: 'Vedanta Jharsuguda Smelter' } },
    { id: 5, creditNoteNo: 'CN/2024-25/005', invoiceId: 5, siteId: 5, date: '2025-04-20T00:00:00', invoiceValue: 1250000, gstValue: 225000, totalInvoiceValue: 1475000, amount: 60000, afterTdsBalance: 54000, receivedAmount: 54000, debitAmount: 0, holdAmount: 6000, status: 'Received', reason: 'Testing charge adjustment', client: 'Hindalco Industries', area: 'Substation', monthWork: 'Mar 2025', invoice: { invoiceNo: 'INV/2024-25/005' }, site: { name: 'Hindalco Mahan Aluminium' } },
  ];
}

function FormField({ label, children, span = false, required = false }: { label: string; children: React.ReactNode; span?: boolean; required?: boolean }) {
  return (
    <div className={span ? 'md:col-span-2' : ''}>
      <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">
        {label}
        {required && <span className="text-[#ff3d3d] ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function FinCreditNotes() {
  const [records, setRecords] = useState<CreditNote[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CreditNote | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CreditNote | null>(null);

  const tc = useTableControls(
    records,
    (r) => `${r.creditNoteNo} ${r.invoice?.invoiceNo ?? ''} ${r.client ?? ''} ${r.area ?? ''} ${r.status} ${r.creditNoteAgainstInvoiceNo ?? ''}`,
  );

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/fin/credit-notes');
      const rj = await r.json();
      if (rj.success && rj.data?.length) { setRecords(rj.data); }
      else { setRecords(generateMockCreditNotes()); toast.info('Sample data — no server records found'); }
    } catch { setRecords(generateMockCreditNotes()); toast.info('Sample data — API unavailable'); }
    try {
      const r = await fetch('/api/fin/sites');
      const rj = await r.json();
      if (rj.success && rj.data?.length) setSites(rj.data);
      else setSites([{ id: 1, name: 'TPP Adani Godda', siteCode: 'SITE-001' }, { id: 2, name: 'TPP NTPC Barh', siteCode: 'SITE-002' }, { id: 3, name: 'HO Mumbai', siteCode: 'SITE-003' }]);
    } catch { setSites([{ id: 1, name: 'TPP Adani Godda', siteCode: 'SITE-001' }, { id: 2, name: 'TPP NTPC Barh', siteCode: 'SITE-002' }, { id: 3, name: 'HO Mumbai', siteCode: 'SITE-003' }]); }
    try {
      const r = await fetch('/api/fin/invoices');
      const rj = await r.json();
      if (rj.success && rj.data?.length) setInvoices(rj.data);
      else setInvoices([{ id: 1, invoiceNo: 'INV-2026-001' }, { id: 2, invoiceNo: 'INV-2026-002' }]);
    } catch { setInvoices([{ id: 1, invoiceNo: 'INV-2026-001' }, { id: 2, invoiceNo: 'INV-2026-002' }]); }
    setLoading(false);
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (r: CreditNote) => {
    setEditTarget(r);
    setForm({
      creditNoteNo: r.creditNoteNo,
      date: r.date?.split('T')[0] || '',
      invoiceId: r.invoiceId,
      siteId: r.siteId,
      jobCode: r.jobCode || '',
      client: r.client || '',
      area: r.area || '',
      monthWork: r.monthWork || '',
      invoiceValue: r.invoiceValue,
      gstValue: r.gstValue,
      totalInvoiceValue: r.totalInvoiceValue,
      amount: r.amount,
      status: r.status,
      reason: r.reason || '',
      remarks: r.remarks || '',
      voucherNo: r.voucherNo || '',
      receivedDate: r.receivedDate?.split('T')[0] || '',
      receivedAmount: r.receivedAmount,
      afterTdsBalance: r.afterTdsBalance,
      debitAmount: r.debitAmount,
      holdAmount: r.holdAmount,
      creditNoteAgainstInvoiceNo: r.creditNoteAgainstInvoiceNo || '',
      trackingNo: r.trackingNo || '',
      poNo: r.poNo || '',
      paymentDueDate: r.paymentDueDate?.split('T')[0] || '',
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.creditNoteNo) { toast.error('Credit Note No is required'); return; }
    if (!form.invoiceId) { toast.error('Invoice is required'); return; }
    if (!form.siteId) { toast.error('Site is required'); return; }
    setSubmitting(true);
    try {
      const payload = {
        creditNoteNo: form.creditNoteNo,
        date: form.date ? new Date(form.date) : null,
        invoiceId: form.invoiceId,
        siteId: form.siteId,
        jobCode: form.jobCode || null,
        client: form.client || null,
        area: form.area || null,
        monthWork: form.monthWork || null,
        invoiceValue: Number(form.invoiceValue) || 0,
        gstValue: Number(form.gstValue) || 0,
        totalInvoiceValue: Number(form.totalInvoiceValue) || 0,
        amount: Number(form.amount) || 0,
        status: form.status,
        reason: form.reason || null,
        remarks: form.remarks || null,
        voucherNo: form.voucherNo || null,
        receivedDate: form.receivedDate ? new Date(form.receivedDate) : null,
        receivedAmount: Number(form.receivedAmount) || 0,
        afterTdsBalance: Number(form.afterTdsBalance) || 0,
        debitAmount: Number(form.debitAmount) || 0,
        holdAmount: Number(form.holdAmount) || 0,
        creditNoteAgainstInvoiceNo: form.creditNoteAgainstInvoiceNo || null,
        trackingNo: form.trackingNo || null,
        poNo: form.poNo || null,
        paymentDueDate: form.paymentDueDate ? new Date(form.paymentDueDate) : null,
      };
      const method = editTarget ? 'PUT' : 'POST';
      const body = editTarget ? { id: editTarget.id, ...payload } : payload;
      const res = await fetch('/api/fin/credit-notes', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) { toast.success(editTarget ? 'Credit Note updated' : 'Credit Note created'); setFormOpen(false); await fetch_(); }
      else toast.error(json.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/fin/credit-notes?id=${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { toast.success('Deleted'); setDeleteOpen(false); await fetch_(); }
      else toast.error(json.error || 'Failed');
    } catch { toast.error('Network error'); }
  };

  const totalInvoiceValue = records.reduce((s, r) => s + r.totalInvoiceValue, 0);
  const totalAmount = records.reduce((s, r) => s + r.amount, 0);
  const totalHold = records.reduce((s, r) => s + r.holdAmount, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  if (importOpen) {
    return (
      <ImportWizard
        title="Credit Notes"
        fields={CN_IMPORT_FIELDS}
        keyField="creditNoteNo"
        existingKeys={new Set(records.map(r => r.creditNoteNo))}
        commitEndpoint="/api/fin/credit-notes/import"
        sampleRow={CN_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetch_}
      />
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-4 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Credit Notes</div><div className="text-[20px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{records.length}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Invoice Value</div><div className="text-[20px] font-bold text-[#00d4ff]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmtCr(totalInvoiceValue)}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Amount</div><div className="text-[20px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmtCr(totalAmount)}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ff3d3d]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Hold Amount</div><div className="text-[20px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmtCr(totalHold)}</div></div>
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header"><FileText size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Credit Notes</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length}</span><div className="ml-2"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search credit notes..." /></div><button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button>
<ExportButton records={records} columns={CN_COLUMNS} filename="fin-credit-notes" /><button onClick={openCreate} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Credit Note</button></div>
        <div className="overflow-x-auto"><div className="max-h-[440px] overflow-y-auto"><table className="w-full text-[11px]">
          <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">{['Credit Note No', 'Date', 'Invoice', 'Client', 'Amount', 'Status', ''].map(h => <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">{tc.pageItems.map(r => (
            <tr key={r.id} className="hover:bg-[#141920]">
              <td className="py-2.5 px-3 text-[#f5a623] font-mono font-medium whitespace-nowrap">{r.creditNoteNo}</td>
              <td className="py-2.5 px-3 text-[#8899aa] font-mono whitespace-nowrap">{r.date?.split('T')[0]}</td>
              <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">{r.invoice?.invoiceNo || '—'}</td>
              <td className="py-2.5 px-3 text-[#e2e8f0] max-w-[160px] truncate">{r.client || '—'}</td>
              <td className="py-2.5 px-3 text-[#00e676] font-mono font-medium whitespace-nowrap">{fmt(r.amount)}</td>
              <td className="py-2.5 px-3"><span className={`vc-badge ${r.status === 'Received' ? 'bg-[#00e676]/15 text-[#00e676]' : r.status === 'Cancelled' ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' : 'bg-[#ffab40]/15 text-[#ffab40]'}`}>{r.status}</span></td>
              <td className="py-2.5 px-3"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button><button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button></div></td>
            </tr>
          ))}
          {records.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-[#5a6878]">No credit notes yet</td></tr>}
          {records.length > 0 && tc.pageItems.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-[#5a6878]">No matching credit notes</td></tr>}
          </tbody>
        </table></div><PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} /></div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget ? 'Edit Credit Note' : 'New Credit Note'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Credit Note No *</label><input value={form.creditNoteNo} onChange={e => setForm(p => ({ ...p, creditNoteNo: e.target.value }))} className="vc-input" placeholder="CN/..." /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Date *</label><input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="vc-input" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label><select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="vc-input appearance-none">{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Invoice *</label>
                <select value={form.invoiceId} onChange={e => {
                  const invId = Number(e.target.value);
                  const inv = invoices.find(i => i.id === invId);
                  setForm(p => ({ ...p, invoiceId: invId }));
                }} className="vc-input appearance-none">
                  <option value={0}>Select invoice...</option>
                  {invoices.map(i => <option key={i.id} value={i.id}>{i.invoiceNo}</option>)}
                </select>
              </div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Site *</label>
                <select value={form.siteId} onChange={e => setForm(p => ({ ...p, siteId: Number(e.target.value) }))} className="vc-input appearance-none">
                  <option value={0}>Select site...</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Client</label><input value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} className="vc-input" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Area</label><input value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} className="vc-input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Job Code</label><input value={form.jobCode} onChange={e => setForm(p => ({ ...p, jobCode: e.target.value }))} placeholder="JOB-2026-001" className="vc-input" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Invoice Value</label><input type="number" value={form.invoiceValue ?? ''} onChange={e => setForm(p => ({ ...p, invoiceValue: Number(e.target.value) }))} className="vc-input" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">GST</label><input type="number" value={form.gstValue ?? ''} onChange={e => setForm(p => ({ ...p, gstValue: Number(e.target.value) }))} className="vc-input" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Amount</label><input type="number" value={form.amount ?? ''} onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} className="vc-input" /></div>
            </div>
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Reason</label><input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} className="vc-input" placeholder="Reason for credit note" /></div>
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Remarks</label><input value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} className="vc-input" /></div>
          </div>
          <DialogFooter>
            <button onClick={() => setFormOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}{editTarget ? 'Update' : 'Create'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Credit Note</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.creditNoteNo}</strong>? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
