'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { PhoneCall, Plus, Pencil, Trash2, Loader2, RefreshCw, Upload, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';

interface PoRef { id: number; poNo: string; totalAmount: number; }
interface FollowUp {
  id: number; clientName: string; balanceAmount: number; poId: number | null; po: PoRef | null;
  invoiceNos: string | null; contactNo: string | null; contactPerson: string | null;
  matterDiscussed: string | null; callBackDate: string | null; remarks: string | null;
  status: string; followUpDate: string | null; createdAt: string;
}
interface FormData {
  clientName: string; balanceAmount: number; poId: string; invoiceNos: string;
  contactNo: string; contactPerson: string; matterDiscussed: string;
  callBackDate: string; remarks: string; status: string;
}
interface PoOption { id: number; poNo: string; vendorName: string; totalAmount: number; }

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Resolved', 'Closed'];

const STATUS_COLORS: Record<string, string> = {
  Pending: '#f5a623',
  'In Progress': '#00d4ff',
  Resolved: '#00e676',
  Closed: '#5a6878',
};

const EMPTY_FORM: FormData = {
  clientName: '', balanceAmount: 0, poId: '', invoiceNos: '',
  contactNo: '', contactPerson: '', matterDiscussed: '',
  callBackDate: '', remarks: '', status: 'Pending',
};

const fmtDate = (d: string | null | undefined) => d ? d.split('T')[0] : '';
const fmtCurrency = (n: number | null | undefined) => `₹${(n ?? 0).toLocaleString('en-IN')}`;

const PO_REF_COLUMNS: ExportColumn<FollowUp>[] = [
  { header: 'Client Name', accessor: 'clientName' },
  { header: 'Balance Amount', accessor: 'balanceAmount' },
  { header: 'Status', accessor: 'status' },
  { header: 'Contact Person', accessor: (r) => r.contactPerson ?? '' },
  { header: 'Call Back Date', accessor: (r) => r.callBackDate ?? '' },
  { header: 'Invoice Nos', accessor: (r) => r.invoiceNos ?? '' },
];

export default function FinClientFollowUp() {
  const [records, setRecords] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [poFilter, setPoFilter] = useState('');
  const [poOptions, setPoOptions] = useState<PoOption[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchRecords = useCallback(async (status: string, q: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      if (q.trim()) params.set('clientName', q.trim());
      const r = await fetch(`/api/fin/client-follow-up?${params.toString()}`);
      const j = await r.json();
      if (j.success) setRecords(j.data ?? []);
      else toast.error(j.error || 'Failed to fetch records');
    } catch { toast.error('Network error fetching records'); }
    finally { setLoading(false); }
  }, []);

  const fetchPoOptions = useCallback(async () => {
    try {
      const r = await fetch('/api/fin/purchase-orders');
      const j = await r.json();
      if (j.success) setPoOptions(j.data?.map((p: any) => ({ id: p.id, poNo: p.poNo, vendorName: p.vendorName, totalAmount: p.totalAmount })) ?? []);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { fetchRecords(statusFilter, search); }, [fetchRecords, statusFilter, search]);
  useEffect(() => { fetchPoOptions(); }, [fetchPoOptions]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const total = records.length;
    const pending = records.filter(r => r.status === 'Pending').length;
    const inProgress = records.filter(r => r.status === 'In Progress').length;
    const resolved = records.filter(r => r.status === 'Resolved' || r.status === 'Closed').length;
    const overdue = records.filter(r => r.callBackDate && r.callBackDate < today && r.status !== 'Resolved' && r.status !== 'Closed').length;
    return { total, pending, inProgress, resolved, overdue };
  }, [records]);

  const tc = useTableControls(records, (r) => `${r.clientName} ${r.contactPerson ?? ''} ${r.invoiceNos ?? ''} ${r.status}`);

  const toggleRow = (id: number) => setSelected(s => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const pageIds = tc.pageItems.map(r => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const toggleAllOnPage = () => setSelected(s => {
    const next = new Set(s);
    pageIds.forEach(id => allPageSelected ? next.delete(id) : next.add(id));
    return next;
  });

  const openAdd = () => { setEditId(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (r: FollowUp) => {
    setEditId(r.id);
    setForm({
      clientName: r.clientName,
      balanceAmount: r.balanceAmount,
      poId: r.poId?.toString() || '',
      invoiceNos: r.invoiceNos || '',
      contactNo: r.contactNo || '',
      contactPerson: r.contactPerson || '',
      matterDiscussed: r.matterDiscussed || '',
      callBackDate: r.callBackDate ? r.callBackDate.split('T')[0] : '',
      remarks: r.remarks || '',
      status: r.status,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.clientName) { toast.error('Client Name is required'); return; }
    setSaving(true);
    try {
      const method = editId ? 'PUT' : 'POST';
      const body: any = editId ? { id: editId, ...form } : { ...form };
      body.balanceAmount = Number(body.balanceAmount);
      body.poId = body.poId ? Number(body.poId) : null;
      delete body.po;
      const r = await fetch('/api/fin/client-follow-up', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (j.success) { toast.success(editId ? 'Updated' : 'Created'); setShowForm(false); fetchRecords(statusFilter, search); }
      else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      const r = await fetch(`/api/fin/client-follow-up?id=${id}`, { method: 'DELETE' });
      const j = await r.json();
      if (j.success) { toast.success('Deleted'); fetchRecords(statusFilter, search); }
      else toast.error(j.error);
    } catch { toast.error('Network error'); }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const ids = [...selected];
      const r = await fetch(`/api/fin/client-follow-up?ids=${ids.join(',')}`, { method: 'DELETE' });
      const j = await r.json();
      if (j.success) { toast.success(`Deleted ${j.deleted ?? selected.size} record${selected.size === 1 ? '' : 's'}`); setSelected(new Set()); setBulkDeleteOpen(false); fetchRecords(statusFilter, search); }
      else toast.error(j.error || 'Bulk delete failed');
    } catch { toast.error('Network error'); }
    finally { setBulkDeleting(false); }
  };

  const handleImportExcel = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const buffer = await file.arrayBuffer();
        const XLSX = await import('xlsx');
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws, { defval: '' });
        const records = rows.map(r => ({
          clientName: String(r['Client Name'] || r['clientName'] || ''),
          balanceAmount: Number(r['Balance Amount'] || r['balanceAmount'] || 0),
          poId: String(r['PO No'] || r['poId'] || ''),
          invoiceNos: String(r['Invoice '] || r['invoiceNos'] || r['Invoice'] || ''),
          contactNo: String(r['Contact No.'] || r['contactNo'] || ''),
          contactPerson: String(r['Name of Contact Person'] || r['contactPerson'] || ''),
          matterDiscussed: String(r['Matter Discussed'] || r['matterDiscussed'] || ''),
          callBackDate: String(r['Call Back Date'] || r['callBackDate'] || '') || null,
          remarks: String(r['Remarks'] || r['remarks'] || ''),
        }));
        const res = await fetch('/api/fin/client-follow-up', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'import', records }),
        });
        const j = await res.json();
        if (j.success) {
          const s = j.summary;
          const extra = s && (s.skipped > 0 || s.errors > 0) ? ` (${s.skipped} skipped, ${s.errors} failed)` : '';
          toast.success(`Imported ${j.created} of ${s?.totalRows ?? j.created} records from ${file.name}${extra}`);
          fetchRecords(statusFilter, search);
        } else toast.error(j.error || 'Import failed');
      } catch (err) { toast.error('Import failed: ' + ((err as Error).message || 'Parse error')); }
    };
    input.click();
  };

  const statCard = (label: string, value: number | string, color: string, accent: string) => (
    <div className="vc-stat-card relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: color }} />
      <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">{label}</div>
      <div className="text-[20px] font-bold" style={{ color, fontFamily: "'Barlow Condensed',sans-serif" }}>{value}</div>
    </div>
  );

  if (loading && records.length === 0) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-5 gap-3">
        {statCard('Pending', stats.pending, '#f5a623', '#f5a623')}
        {statCard('In Progress', stats.inProgress, '#00d4ff', '#00d4ff')}
        {statCard('Resolved', stats.resolved, '#00e676', '#00e676')}
        {statCard('Overdue', stats.overdue, '#ff3d3d', '#ff3d3d')}
        {statCard('Total', stats.total, '#5a6878', '#5a6878')}
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header">
          <PhoneCall size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Client Follow Up</span>
          <span className="vc-badge bg-[#f5a623]/15 text-[#f5a623] text-[9px]">{records.length}</span>
          <div className="ml-auto">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by client name..." />
          </div>
          <div className="flex items-center gap-2 ml-2">
            <button onClick={handleImportExcel} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import Excel</button>
            <button onClick={openAdd} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> Add Follow Up</button>
            <button onClick={() => fetchRecords(statusFilter, search)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><RefreshCw size={13} /> Refresh</button>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-[#252e3a] flex items-center gap-3 flex-wrap">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none min-w-[120px]">
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={poFilter} onChange={e => setPoFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none min-w-[150px]">
            <option value="">All POs</option>
            {poOptions.map(po => <option key={po.id} value={String(po.id)}>{po.poNo} - {po.vendorName}</option>)}
          </select>
          {stats.overdue > 0 && (
            <span className="vc-badge bg-[#ff3d3d]/15 text-[#ff3d3d] flex items-center gap-1 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff3d3d] animate-pulse" /> {stats.overdue} Overdue
            </span>
          )}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[11px] text-[#8899aa]"><span className="font-mono text-[#e2e8f0] font-semibold">{selected.size}</span> selected</span>
              <button onClick={() => setSelected(new Set())} className="text-[11px] text-[#5a6878] hover:text-[#e2e8f0] underline">Clear</button>
              <button onClick={() => setBulkDeleteOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px] !text-[#ff3d3d] !border-[#ff3d3d]/40 hover:!bg-[#ff3d3d]/10"><Trash2 size={13} /> Delete Selected</button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <div className="max-h-[440px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0f1318]">
                  <th className="py-2 px-3 w-8"><Checkbox checked={allPageSelected} onCheckedChange={toggleAllOnPage} /></th>
                  {['Client Name', 'PO Ref', 'Balance', 'Invoices', 'Contact', 'Person', 'Call Back', 'Discussion', 'Status', ''].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                {tc.pageItems.map(r => {
                  const statusColor = STATUS_COLORS[r.status] || '#5a6878';
                  return (
                    <tr key={r.id} className="hover:bg-[#141920]">
                      <td className="py-2.5 px-3"><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleRow(r.id)} /></td>
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-medium max-w-[150px] truncate" title={r.clientName}>{r.clientName}</td>
                      <td className="py-2.5 px-3">
                        {r.po ? (
                          <span className="vc-badge bg-[#00d4ff]/15 text-[#00d4ff] font-mono">{r.po.poNo}</span>
                        ) : (
                          <span className="text-[#5a6878]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-mono font-medium">{fmtCurrency(r.balanceAmount)}</td>
                      <td className="py-2.5 px-3 text-[#8899aa] max-w-[120px] truncate" title={r.invoiceNos ?? ''}>{r.invoiceNos || '—'}</td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{r.contactNo || '—'}</td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{r.contactPerson || '—'}</td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{r.callBackDate ? fmtDate(r.callBackDate) : '—'}</td>
                      <td className="py-2.5 px-3 text-[#8899aa] max-w-[140px] truncate" title={r.matterDiscussed ?? ''}>{r.matterDiscussed || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span className="vc-badge" style={{ backgroundColor: `${statusColor}26`, color: statusColor }}>{r.status}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(r)} className="p-1.5 rounded text-[#8899aa] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10" title="Edit"><Pencil size={13} /></button>
                          <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10" title="Delete"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {tc.pageItems.length === 0 && (
                  <tr><td colSpan={11} className="py-8 text-center text-[#5a6878]">No follow-up records found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} />
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623]">{editId ? 'Edit Follow Up' : 'Add Follow Up'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Client Name *</label>
                <input value={form.clientName} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))} className="vc-input" placeholder="Enter client name" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Balance Amount</label>
                <input type="number" value={form.balanceAmount || ''} onChange={e => setForm(p => ({ ...p, balanceAmount: Number(e.target.value) }))} className="vc-input" placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">PO</label>
                <select value={form.poId} onChange={e => setForm(p => ({ ...p, poId: e.target.value }))} className="vc-input appearance-none">
                  <option value="">— Select PO —</option>
                  {poOptions.map(po => (
                    <option key={po.id} value={po.id}>{po.poNo} - {po.vendorName} (₹{po.totalAmount.toLocaleString('en-IN')})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Invoices</label>
                <input value={form.invoiceNos} onChange={e => setForm(p => ({ ...p, invoiceNos: e.target.value }))} className="vc-input" placeholder="INV-001, INV-002" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Contact Person</label>
                <input value={form.contactPerson} onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))} className="vc-input" placeholder="Person name" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Contact No</label>
                <input value={form.contactNo} onChange={e => setForm(p => ({ ...p, contactNo: e.target.value }))} className="vc-input" placeholder="+91-XXXXXXXXXX" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Call Back Date</label>
                <input type="date" value={form.callBackDate} onChange={e => setForm(p => ({ ...p, callBackDate: e.target.value }))} className="vc-input" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="vc-input appearance-none">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Matter Discussed</label>
              <textarea value={form.matterDiscussed} onChange={e => setForm(p => ({ ...p, matterDiscussed: e.target.value }))} className="vc-input min-h-[60px] resize-y" placeholder="Details of discussion..." />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Remarks</label>
              <textarea value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} className="vc-input min-h-[60px] resize-y" placeholder="Additional notes..." />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowForm(false)} className="vc-btn-ghost text-[11px]">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="vc-btn-primary text-[11px] disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d]">Delete {selected.size} Record{selected.size === 1 ? '' : 's'}</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              This will permanently delete <strong className="text-[#f5a623]">{selected.size}</strong> selected follow-up record{selected.size === 1 ? '' : 's'}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkDeleting} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg disabled:opacity-50">{bulkDeleting ? 'Deleting...' : 'Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
