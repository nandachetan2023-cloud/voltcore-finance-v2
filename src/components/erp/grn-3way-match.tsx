'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  FileCheck2, Check, X, PackageCheck, Plus, Truck, ShieldCheck, Trash2,
  ClipboardList, AlertTriangle, Loader2, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import { getCurrentUserEmail } from '@/lib/current-user';

/* ── Types ────────────────────────────────────────── */
interface ItemRec { id: number; sku: string; name: string; costPrice: number; reorderLevel: number; reorderQty: number; }
interface PoLine { id: number; description: string; quantity: number; unitRate: number; unitOfMeasure: string; receivedQty: number; }
interface PoRec { id: number; poNo: string; vendorName: string; status: string; siteId: number; siteName: string; jobCode: string; items: PoLine[]; }

interface GrnLine {
  id?: number; itemId: number; poItemId: number | null; sku: string; description: string;
  qtyOrdered: number; qtyReceived: number; qtyAccepted: number; qtyRejected: number;
  rate: number; condition: string; remarks: string;
}
interface Grn {
  id: number; grnNo: string; grnDate: string; poId: number | null; poNo: string;
  vendorName: string; siteId: number; siteName: string; jobId: number | null; jobCode: string;
  dcNo: string; invoiceNo: string; status: string; remarks: string; lines: GrnLine[];
}

interface MatchRow {
  poNo: string; vendor: string; item: string;
  ordered: number; grnQty: number;
  poAmount: number; grnAmount: number; invAmount: number;
  qtyMatch: 'ok' | 'short'; amtMatch: 'ok' | 'var'; totalVariance: number;
}

const MATCH_COLUMNS: ExportColumn<MatchRow>[] = [
  { header: 'PO', accessor: 'poNo' },
  { header: 'Vendor', accessor: 'vendor' },
  { header: 'Item', accessor: 'item' },
  { header: 'Ordered', accessor: 'ordered' },
  { header: 'GRN Qty', accessor: 'grnQty' },
  { header: 'Variance', accessor: (r) => r.totalVariance },
  { header: 'Qty Match', accessor: (r) => r.qtyMatch },
  { header: 'Amount Match', accessor: (r) => r.amtMatch },
];

const GRN_COLUMNS: ExportColumn<Grn>[] = [
  { header: 'GRN No', accessor: 'grnNo' },
  { header: 'Date', accessor: (r) => r.grnDate?.split('T')[0] ?? '' },
  { header: 'Supplier', accessor: 'vendorName' },
  { header: 'PO', accessor: (r) => r.poNo || '—' },
  { header: 'Site', accessor: 'siteName' },
  { header: 'Status', accessor: 'status' },
];

const STATUS_STYLES: Record<string, string> = {
  Draft: 'bg-[#f5a623]/15 text-[#f5a623]',
  Posted: 'bg-[#00e676]/15 text-[#00e676]',
  Rejected: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
};

function buildFromPOs(pos: PoRec[]): MatchRow[] {
  const rows: MatchRow[] = [];
  for (const po of pos) {
    for (const it of (po.items || [])) {
      const ordered = it.quantity ?? 0;
      const received = it.receivedQty ?? 0;
      const poAmount = ordered * (it.unitRate ?? 0);
      const grnAmount = received * (it.unitRate ?? 0);
      const invAmount = poAmount;
      const qtyMatch: 'ok' | 'short' = received >= ordered ? 'ok' : 'short';
      const variance = invAmount - grnAmount;
      rows.push({
        poNo: po.poNo, vendor: po.vendorName || '', item: it.description,
        ordered, grnQty: received, poAmount, grnAmount, invAmount,
        qtyMatch, amtMatch: Math.abs(variance) < 1 ? 'ok' : 'var', totalVariance: variance,
      });
    }
  }
  return rows;
}

export default function Grn3WayMatch() {
  /* ── GRN receipt state ── */
  const [grns, setGrns] = useState<Grn[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'receipt' | 'match'>('receipt');
  const [listSearch, setListSearch] = useState('');

  /* ── New/Edit GRN dialog ── */
  const [dlgOpen, setDlgOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editGrnId, setEditGrnId] = useState<number | null>(null);
  const [pos, setPos] = useState<PoRec[]>([]);
  const [items, setItems] = useState<ItemRec[]>([]);
  const [jobs, setJobs] = useState<{ id: number; jobCode: string }[]>([]);
  const [poId, setPoId] = useState('');
  const [hdr, setHdr] = useState({ grnDate: new Date().toISOString().split('T')[0], dcNo: '', invoiceNo: '', remarks: '', siteId: '', jobCode: '', vendorName: '' });
  const [formLines, setFormLines] = useState<GrnLine[]>([]);

  const mapGrn = (r: Record<string, unknown>): Grn => {
    const g = r as { id: number; grnNo: string; grnDate: string; poId: number | null; po?: { poNo: string; vendorName: string } | null; vendorName: string | null; siteId: number; site?: { name: string } | null; jobId: number | null; job?: { jobCode: string } | null; dcNo: string | null; invoiceNo: string | null; status: string; remarks: string | null; lines?: Array<Record<string, unknown>> };
    return {
      id: g.id, grnNo: g.grnNo, grnDate: g.grnDate, poId: g.poId, poNo: g.po?.poNo || '',
      vendorName: g.vendorName || g.po?.vendorName || '', siteId: g.siteId, siteName: g.site?.name || '',
      jobId: g.jobId, jobCode: g.job?.jobCode || '', dcNo: g.dcNo || '', invoiceNo: g.invoiceNo || '',
      status: g.status || 'Draft', remarks: g.remarks || '',
      lines: (g.lines || []).map(l => {
        const ln = l as { id: number; itemId: number; poItemId: number | null; qtyOrdered: number; qtyReceived: number; qtyAccepted: number; qtyRejected: number; rate: number; condition: string; remarks: string | null; item?: { sku: string; name: string } };
        return {
          id: ln.id, itemId: ln.itemId, poItemId: ln.poItemId, sku: ln.item?.sku || '', description: ln.item?.name || '',
          qtyOrdered: ln.qtyOrdered, qtyReceived: ln.qtyReceived, qtyAccepted: ln.qtyAccepted, qtyRejected: ln.qtyRejected,
          rate: ln.rate, condition: ln.condition || 'Good', remarks: ln.remarks || '',
        };
      }),
    };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [gRes, poRes, iRes, jRes] = await Promise.all([
        fetch('/api/store/grn').then(r => r.json()).catch(() => null),
        fetch('/api/fin/purchase-orders').then(r => r.json()).catch(() => null),
        fetch('/api/items').then(r => r.json()).catch(() => null),
        fetch('/api/fin/jobs').then(r => r.json()).catch(() => null),
      ]);
      if (gRes?.success) setGrns((gRes.data || []).map(mapGrn));
      if (poRes?.success) setPos((poRes.data || []).filter((p: { items?: unknown[] }) => p.items?.length).map((p: { id: number; poNo: string; vendorName: string; status: string; siteId: number; site?: { name: string }; jobCode: string; items: PoLine[] }) => ({
        id: p.id, poNo: p.poNo, vendorName: p.vendorName || '', status: p.status, siteId: p.siteId, siteName: p.site?.name || '', jobCode: p.jobCode || '', items: p.items || [],
      })));
      if (iRes?.success) setItems((iRes.data || []).map((i: ItemRec) => ({ id: i.id, sku: i.sku, name: i.name, costPrice: Number(i.costPrice) || 0, reorderLevel: Number(i.reorderLevel) || 0, reorderQty: Number(i.reorderQty) || 0 })));
      if (jRes?.success) setJobs((jRes.data || []).map((j: { id: number; jobCode: string }) => ({ id: j.id, jobCode: j.jobCode })));
    } catch { /* empty state */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (grns.length && (selectedId == null || !grns.some(g => g.id === selectedId))) setSelectedId(grns[0].id); }, [grns, selectedId]);

  const selected = grns.find(g => g.id === selectedId) || null;

  /* ── Match tab data ── */
  const [matchRows, setMatchRows] = useState<MatchRow[]>([]);
  const [matchFilter, setMatchFilter] = useState<'all' | 'issues'>('all');
  useEffect(() => {
    fetch('/api/fin/purchase-orders').then(r => r.json()).then(j => {
      if (j.success) setMatchRows(buildFromPOs(j.data || []));
    }).catch(() => {});
  }, []);
  const tc = useTableControls(matchFilter === 'all' ? matchRows : matchRows.filter(r => r.qtyMatch === 'short' || r.amtMatch === 'var'), (r) => `${r.poNo} ${r.vendor} ${r.item}`);

  /* ── New / Edit GRN ── */
  const openNew = () => {
    setEditGrnId(null);
    setPoId('');
    setHdr({ grnDate: new Date().toISOString().split('T')[0], dcNo: '', invoiceNo: '', remarks: '', siteId: '', jobCode: '', vendorName: '' });
    setFormLines([]);
    setDlgOpen(true);
  };

  const openEdit = (g: Grn) => {
    if (g.status === 'Posted') { toast.error('Posted GRNs are read-only'); return; }
    setEditGrnId(g.id);
    setPoId(g.poId ? String(g.poId) : '');
    setHdr({ grnDate: g.grnDate.split('T')[0], dcNo: g.dcNo, invoiceNo: g.invoiceNo, remarks: g.remarks, siteId: String(g.siteId || ''), jobCode: g.jobCode, vendorName: g.vendorName });
    setFormLines(g.lines.map(l => ({ ...l })));
    setDlgOpen(true);
  };

  const onPickPO = (value: string) => {
    setPoId(value);
    const po = pos.find(p => p.id === Number(value));
    if (!po) return;
    setHdr(h => ({ ...h, vendorName: po.vendorName, siteId: String(po.siteId), jobCode: po.jobCode }));
    setFormLines(po.items.map(it => {
      const q = it.description.toLowerCase();
      const match = items.find(i => i.name.toLowerCase() === q || q.includes(i.name.toLowerCase()) || i.name.toLowerCase().includes(q));
      const remaining = it.quantity - (it.receivedQty || 0);
      const received = remaining > 0 ? remaining : it.quantity;
      return {
        itemId: match?.id ?? 0, poItemId: it.id, sku: match?.sku || '', description: it.description,
        qtyOrdered: it.quantity, qtyReceived: received, qtyAccepted: received, qtyRejected: 0,
        rate: it.unitRate, condition: 'Good', remarks: '',
      };
    }));
  };

  const updateLine = (idx: number, patch: Partial<GrnLine>) => {
    setFormLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const next = { ...l, ...patch };
      if (patch.qtyReceived !== undefined || patch.qtyAccepted !== undefined) {
        next.qtyRejected = Math.max(0, next.qtyReceived - next.qtyAccepted);
      }
      return next;
    }));
  };

  const totals = useMemo(() => ({
    accepted: formLines.reduce((s, l) => s + (Number(l.qtyAccepted) || 0), 0),
    rejected: formLines.reduce((s, l) => s + (Number(l.qtyRejected) || 0), 0),
    value: formLines.reduce((s, l) => s + (Number(l.qtyAccepted) || 0) * (Number(l.rate) || 0), 0),
  }), [formLines]);

  const validLines = () => formLines.filter(l => l.itemId > 0 && (Number(l.qtyReceived) || 0) > 0);

  const saveGrn = async (post: boolean): Promise<Grn | null> => {
    if (!hdr.siteId) { toast.error('Select a PO or destination site'); return null; }
    const lines = validLines();
    if (!lines.length) { toast.error('At least one line with an item and received qty is required'); return null; }
    const unresolved = formLines.filter(l => l.itemId === 0 && (Number(l.qtyReceived) || 0) > 0);
    if (unresolved.length) { toast.error(`Map ${unresolved.length} line(s) to an inventory item`); return null; }
    const body = {
      ...(editGrnId ? { id: editGrnId } : {}),
      siteId: Number(hdr.siteId),
      jobId: jobs.find(j => j.jobCode === hdr.jobCode)?.id || null,
      poId: poId ? Number(poId) : null,
      vendorName: hdr.vendorName || null,
      grnDate: new Date(hdr.grnDate).toISOString(),
      dcNo: hdr.dcNo || null,
      invoiceNo: hdr.invoiceNo || null,
      remarks: hdr.remarks || null,
      status: 'Draft',
      actor: getCurrentUserEmail(),
      lines: lines.map(l => ({
        itemId: l.itemId, poItemId: l.poItemId || null,
        qtyOrdered: Number(l.qtyOrdered) || 0, qtyReceived: Number(l.qtyReceived) || 0,
        qtyAccepted: Number(l.qtyAccepted) || 0, qtyRejected: Number(l.qtyRejected) || 0,
        rate: Number(l.rate) || 0, condition: l.condition, remarks: l.remarks || null,
      })),
    };
    const res = await fetch(editGrnId ? '/api/store/grn' : '/api/store/grn', {
      method: editGrnId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.success) { toast.error(json.error || 'Failed to save GRN'); return null; }
    return mapGrn(json.data);
  };

  const handleSave = async (post: boolean) => {
    setSaving(true);
    try {
      const saved = await saveGrn(post);
      if (!saved) return;
      if (post) {
        const pRes = await fetch(`/api/store/grn/${saved.id}/post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-actor-email': getCurrentUserEmail() },
          body: JSON.stringify({ actor: getCurrentUserEmail() }),
        });
        const pJson = await pRes.json();
        if (!pJson.success) { toast.error(pJson.error || 'Saved, but posting failed'); await fetchData(); setDlgOpen(false); setSelectedId(saved.id); return; }
        toast.success(`${saved.grnNo} posted to inventory`);
      } else {
        toast.success(`${saved.grnNo} saved as draft`);
      }
      await fetchData();
      setDlgOpen(false);
      setSelectedId(saved.id);
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const postSelected = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/store/grn/${selected.id}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-actor-email': getCurrentUserEmail() },
        body: JSON.stringify({ actor: getCurrentUserEmail() }),
      });
      const json = await res.json();
      if (json.success) { toast.success(`${selected.grnNo} posted to inventory`); await fetchData(); }
      else toast.error(json.error || 'Failed to post');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const deleteSelected = async () => {
    if (!selected || selected.status === 'Posted') return;
    try {
      const res = await fetch(`/api/store/grn?id=${selected.id}`, { method: 'DELETE', headers: { 'x-actor-email': getCurrentUserEmail() } });
      const json = await res.json();
      if (json.success) { toast.success('GRN deleted'); setSelectedId(null); await fetchData(); }
      else toast.error(json.error || 'Failed to delete');
    } catch { toast.error('Network error'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#00e676]/30 border-t-[#00e676] rounded-full animate-spin" /></div>;

  const inputCls = 'w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#00e676] focus:outline-none transition-colors';
  const lbl = 'text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold mb-1.5 block';
  const selGrn = selected;
  const preview = selGrn ? {
    accepted: selGrn.lines.reduce((s, l) => s + l.qtyAccepted, 0),
    rejected: selGrn.lines.reduce((s, l) => s + l.qtyRejected, 0),
    value: selGrn.lines.reduce((s, l) => s + l.qtyAccepted * l.rate, 0),
  } : null;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#00e676]/10 rounded-xl flex items-center justify-center"><FileCheck2 size={18} className="text-[#00e676]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">GRN &amp; Quality Inspection</h2>
            <p className="text-[11px] text-[#5a6878]">Verify received materials and post to inventory</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 mr-2">
            <button onClick={() => setTab('receipt')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 ${tab === 'receipt' ? 'bg-[#00e676] text-black' : 'bg-[#252e3a] text-[#8899aa] hover:text-[#e2e8f0]'}`}><ClipboardList size={12} /> Receipt &amp; Inspection</button>
            <button onClick={() => setTab('match')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 ${tab === 'match' ? 'bg-[#00d4ff] text-black' : 'bg-[#252e3a] text-[#8899aa] hover:text-[#e2e8f0]'}`}><PackageCheck size={12} /> 3-Way Match</button>
          </div>
          {tab === 'receipt' && (
            <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 bg-[#00e676] text-black text-[12px] font-bold rounded-lg hover:bg-[#00c853]"><Plus size={14} /> New GRN Receipt</button>
          )}
          {tab === 'match' && <ExportButton records={tc.pageItems} columns={MATCH_COLUMNS} filename="grn-3way-match" />}
        </div>
      </div>

      {tab === 'receipt' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* GRN list */}
          <div className="lg:col-span-1 bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
            <div className="p-3 border-b border-[#252e3a]"><SearchInput value={listSearch} onChange={setListSearch} /></div>
            <div className="max-h-[560px] overflow-y-auto divide-y divide-[#1a2028]">
              {grns.filter(g => !listSearch.trim() || `${g.grnNo} ${g.vendorName} ${g.poNo} ${g.siteName}`.toLowerCase().includes(listSearch.toLowerCase())).map(g => (
                <button key={g.id} onClick={() => setSelectedId(g.id)} className={`w-full text-left px-3 py-3 transition-colors ${selectedId === g.id ? 'bg-[#00e676]/10' : 'hover:bg-[#141920]'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#e2e8f0] font-mono">{g.grnNo}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${STATUS_STYLES[g.status] || 'bg-[#252e3a] text-[#8899aa]'}`}>{g.status}</span>
                  </div>
                  <div className="text-[10px] text-[#8899aa] truncate mt-0.5">{g.vendorName || '—'}</div>
                  <div className="text-[9px] text-[#5a6878] mt-0.5">{g.grnDate.split('T')[0]} · {g.lines.length} lines</div>
                </button>
              ))}
              {grns.length === 0 && <div className="py-10 px-4 text-center text-[#5a6878] text-[11px]">No GRNs yet — click <b>New GRN Receipt</b> against a purchase order.</div>}
            </div>
          </div>

          {/* Detail — PDF: receipt details + inspection table + posting preview */}
          <div className="lg:col-span-3 space-y-4">
            {!selGrn ? (
              <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-10 text-center text-[#5a6878] text-[12px]">Select a GRN or create a new receipt.</div>
            ) : (
              <>
                <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 flex-1">
                      {[
                        { label: 'PO Reference', value: selGrn.poNo || '—' },
                        { label: 'Supplier', value: selGrn.vendorName || '—' },
                        { label: 'Delivery Note / Ref', value: selGrn.dcNo || '—' },
                        { label: 'Receipt Date', value: selGrn.grnDate.split('T')[0] },
                        { label: 'Posting Target', value: `${selGrn.siteName || '—'}${selGrn.jobCode ? ` · ${selGrn.jobCode}` : ''}` },
                      ].map(f => (
                        <div key={f.label}>
                          <div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold mb-1">{f.label}</div>
                          <div className="text-[12px] text-[#e2e8f0] font-medium">{f.value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono ${STATUS_STYLES[selGrn.status] || 'bg-[#252e3a] text-[#8899aa]'}`}>{selGrn.grnNo} · {selGrn.status.toUpperCase()}</span>
                      <div className="flex gap-1.5">
                        {selGrn.status === 'Draft' && (
                          <>
                            <button onClick={() => openEdit(selGrn)} className="px-2.5 py-1.5 rounded-lg bg-[#252e3a] text-[#8899aa] hover:text-[#e2e8f0] text-[10px] font-bold">Edit</button>
                            <button onClick={deleteSelected} className="p-1.5 rounded-lg text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10" title="Delete"><Trash2 size={13} /></button>
                            <button onClick={postSelected} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00e676] text-black text-[11px] font-bold hover:bg-[#00c853] disabled:opacity-50">
                              {saving ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />} Post to Inventory
                            </button>
                          </>
                        )}
                        {selGrn.status === 'Posted' && <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00e676]/15 text-[#00e676] text-[11px] font-bold"><Check size={12} /> Posted</span>}
                      </div>
                    </div>
                  </div>

                  {/* Material receipt & inspection table */}
                  <div className="overflow-x-auto border border-[#1a2028] rounded-lg">
                    <table className="w-full text-[11px]">
                      <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
                        {['Item Code / Spec', 'Ordered', 'Received', 'Accepted', 'Rejected', 'Batch / Serial', 'Inspection Result'].map((h, i) => (
                          <th key={h} className={`${i === 0 ? 'text-left' : i < 5 ? 'text-right' : 'text-left'} px-3 py-2.5 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]`}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody className="divide-y divide-[#1a2028]">
                        {selGrn.lines.map((l, i) => (
                          <tr key={l.id ?? i} className="hover:bg-[#141920]">
                            <td className="py-2.5 px-3">
                              <div className="text-[#e2e8f0] font-semibold">{l.description}</div>
                              <div className="text-[9px] text-[#5a6878] font-mono">{l.sku || `ITEM-${l.itemId}`}</div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-[#8899aa]">{l.qtyOrdered.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-[#e2e8f0]">{l.qtyReceived.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-[#00e676] font-bold">{l.qtyAccepted.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-[#ff3d3d]">{l.qtyRejected > 0 ? l.qtyRejected.toLocaleString() : '—'}</td>
                            <td className="py-2.5 px-3 text-[#8899aa] font-mono text-[10px]">{l.remarks || '—'}</td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold ${l.condition === 'Good' ? 'bg-[#00e676]/10 text-[#00e676]' : l.condition === 'Damaged' ? 'bg-[#ff3d3d]/10 text-[#ff3d3d]' : 'bg-[#f5a623]/10 text-[#f5a623]'}`}>
                                {l.condition === 'Good' ? <Check size={9} /> : <AlertTriangle size={9} />} {l.condition}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {!selGrn.lines.length && <tr><td colSpan={7} className="py-8 text-center text-[#5a6878]">No lines on this GRN.</td></tr>}
                      </tbody>
                    </table>
                  </div>

                  {/* Inspection documentation + Inventory posting preview (PDF) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                    <div className="bg-[#0a0d12] rounded-lg p-4 border border-[#1a2028]">
                      <div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold mb-2">Quality Inspector Notes</div>
                      <p className="text-[11px] text-[#8899aa] leading-relaxed">{selGrn.remarks || 'No inspection notes recorded.'}</p>
                      {selGrn.invoiceNo && <div className="mt-3 text-[10px] text-[#5a6878]">Invoice ref: <span className="text-[#e2e8f0] font-mono">{selGrn.invoiceNo}</span></div>}
                    </div>
                    <div className="bg-[#0a0d12] rounded-lg p-4 border border-[#1a2028]">
                      <div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold mb-3">Inventory Posting Preview</div>
                      <div className="space-y-1.5 text-[12px]">
                        <div className="flex justify-between"><span className="text-[#8899aa]">Total Items Accepted</span><span className="font-mono text-[#00e676] font-bold">{preview?.accepted.toLocaleString()} units</span></div>
                        <div className="flex justify-between"><span className="text-[#8899aa]">Rejected Items (Quarantine)</span><span className="font-mono text-[#ff3d3d]">{preview?.rejected.toLocaleString()} units</span></div>
                        <div className="flex justify-between"><span className="text-[#8899aa]">Inventory Value Addition</span><span className="font-mono text-[#f5a623] font-bold">+₹{(preview?.value || 0).toLocaleString('en-IN')}</span></div>
                        <div className="flex justify-between border-t border-[#252e3a] pt-1.5 mt-1.5"><span className="text-[10px] text-[#5a6878]">Posting Target</span><span className="text-[11px] text-[#e2e8f0]">{selGrn.siteName || '—'}</span></div>
                      </div>
                      <div className="mt-3 text-[10px] text-[#5a6878] leading-relaxed">
                        Posting this GRN will update the material ledger and trigger accounts payable reconciliation.
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* ── 3-Way Match tab ── */
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Stat label="Line Items" value={matchRows.length} color="#e2e8f0" />
            <Stat label="Matched ✓" value={matchRows.filter(r => r.qtyMatch === 'ok' && r.amtMatch === 'ok').length} color="#00e676" />
            <Stat label="Short Receive" value={matchRows.filter(r => r.qtyMatch === 'short').length} color="#f5a623" />
            <Stat label="Amount Variance" value={matchRows.filter(r => r.amtMatch === 'var').length} color="#ff3d3d" />
          </div>
          <div className="flex items-center gap-3 mb-3">
            <SearchInput value={tc.search} onChange={tc.setSearch} />
            <div className="flex gap-1.5">
              <button onClick={() => setMatchFilter('all')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${matchFilter === 'all' ? 'bg-[#00d4ff] text-black' : 'bg-[#252e3a] text-[#8899aa]'}`}>All</button>
              <button onClick={() => setMatchFilter('issues')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${matchFilter === 'issues' ? 'bg-[#00d4ff] text-black' : 'bg-[#252e3a] text-[#8899aa]'}`}>Exceptions</button>
            </div>
          </div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
                  {['PO / Item', 'PO Qty', 'GRN Qty', 'PO Amt', 'GRN Amt', 'Inv Amt', 'Variance', 'Qty', 'Amt'].map((h, i) => (
                    <th key={i} className={`${i === 0 ? 'text-left' : 'text-right'} px-3 py-3 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]`}>{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-[#1a2028]">
                  {tc.pageItems.map((r, idx) => (
                    <tr key={idx} className={`hover:bg-[#141920] ${(r.qtyMatch === 'short' || r.amtMatch === 'var') ? 'bg-[#ff3d3d]/[0.02]' : ''}`}>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#e2e8f0]">{r.poNo}</div>
                        <div className="text-[9px] text-[#5a6878]">{r.vendor} · {r.item}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#8899aa]">{r.ordered.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#e2e8f0]">{r.grnQty.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#e2e8f0]">₹{(r.poAmount || 0).toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#00e676]">₹{(r.grnAmount || 0).toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#e2e8f0]">₹{(r.invAmount || 0).toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#ffab40]">₹{(r.totalVariance || 0).toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-right">{r.qtyMatch === 'ok' ? <OkChip /> : <ShortChip />}</td>
                      <td className="py-2.5 px-3 text-right">{r.amtMatch === 'ok' ? <OkChip /> : <ErrorChip label="Var" />}</td>
                    </tr>
                  ))}
                  {tc.pageItems.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-[#5a6878]">No PO lines to match yet.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="p-2 border-t border-[#252e3a]"><PaginationBar {...tc} /></div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          New / Edit GRN — PDF screen 6 receipt form
         ══════════════════════════════════════════════ */}
      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border border-[#252e3a] text-[#e2e8f0] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-[#252e3a] pb-4">
            <DialogTitle className="text-[#00e676] text-[16px]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {editGrnId ? 'Edit GRN Receipt' : 'Material Receipt & Inspection'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className={lbl}>PO Reference</label>
                <select value={poId} onChange={e => onPickPO(e.target.value)} disabled={!!editGrnId} className={inputCls}>
                  <option value="">Select purchase order…</option>
                  {pos.map(p => <option key={p.id} value={p.id}>{p.poNo} — {p.vendorName} ({p.items.length} items)</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Receipt Date</label>
                <input type="date" value={hdr.grnDate} onChange={e => setHdr({ ...hdr, grnDate: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={lbl}>Supplier</label>
                <input value={hdr.vendorName} onChange={e => setHdr({ ...hdr, vendorName: e.target.value })} className={inputCls} placeholder="Auto from PO" />
              </div>
              <div>
                <label className={lbl}>Delivery Note / Ref</label>
                <input value={hdr.dcNo} onChange={e => setHdr({ ...hdr, dcNo: e.target.value })} className={inputCls} placeholder="DN-…" />
              </div>
              <div>
                <label className={lbl}>Invoice No</label>
                <input value={hdr.invoiceNo} onChange={e => setHdr({ ...hdr, invoiceNo: e.target.value })} className={inputCls} placeholder="Optional" />
              </div>
            </div>

            {/* Lines */}
            <div className="border border-[#1a2028] rounded-lg overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
                  {['Item', 'Ordered', 'Received', 'Accepted', 'Rate', 'Condition', 'Batch / Serial'].map((h, i) => (
                    <th key={h} className={`${i === 0 ? 'text-left' : 'text-right'} px-2.5 py-2.5 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]`}>{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-[#1a2028]">
                  {formLines.map((l, i) => (
                    <tr key={i} className="hover:bg-[#141920]">
                      <td className="py-2 px-2.5 min-w-[220px]">
                        {l.itemId > 0 ? (
                          <>
                            <div className="text-[#e2e8f0] font-semibold">{l.description}</div>
                            <div className="text-[9px] text-[#5a6878] font-mono">{l.sku}</div>
                          </>
                        ) : (
                          <select value="" onChange={e => {
                            const it = items.find(x => x.id === Number(e.target.value));
                            if (it) updateLine(i, { itemId: it.id, sku: it.sku });
                          }} className={inputCls}>
                            <option value="">Map to inventory item…</option>
                            {items.map(it => <option key={it.id} value={it.id}>{it.sku} — {it.name}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-[#8899aa]">{l.qtyOrdered.toLocaleString()}</td>
                      <td className="py-2 px-2.5 text-right">
                        <input type="number" min={0} value={l.qtyReceived} onChange={e => updateLine(i, { qtyReceived: Number(e.target.value), qtyAccepted: Math.min(Number(e.target.value), l.qtyAccepted) })}
                          className="w-20 bg-[#0a0d12] border border-[#252e3a] rounded px-2 py-1 text-[11px] text-[#e2e8f0] text-right font-mono focus:border-[#00e676] outline-none" />
                      </td>
                      <td className="py-2 px-2.5 text-right">
                        <input type="number" min={0} max={l.qtyReceived} value={l.qtyAccepted} onChange={e => updateLine(i, { qtyAccepted: Math.min(Number(e.target.value), l.qtyReceived) })}
                          className="w-20 bg-[#0a0d12] border border-[#252e3a] rounded px-2 py-1 text-[11px] text-[#00e676] text-right font-mono focus:border-[#00e676] outline-none" />
                      </td>
                      <td className="py-2 px-2.5 text-right">
                        <input type="number" min={0} value={l.rate} onChange={e => updateLine(i, { rate: Number(e.target.value) })}
                          className="w-24 bg-[#0a0d12] border border-[#252e3a] rounded px-2 py-1 text-[11px] text-[#e2e8f0] text-right font-mono focus:border-[#00e676] outline-none" />
                      </td>
                      <td className="py-2 px-2.5 text-right">
                        <select value={l.condition} onChange={e => updateLine(i, { condition: e.target.value })}
                          className="bg-[#0a0d12] border border-[#252e3a] rounded px-2 py-1 text-[11px] text-[#e2e8f0] focus:border-[#00e676] outline-none">
                          <option>Good</option><option>Damaged</option><option>Partial</option>
                        </select>
                      </td>
                      <td className="py-2 px-2.5">
                        <input value={l.remarks} onChange={e => updateLine(i, { remarks: e.target.value })} placeholder="BT-… / serial"
                          className="w-full min-w-[110px] bg-[#0a0d12] border border-[#252e3a] rounded px-2 py-1 text-[11px] text-[#e2e8f0] font-mono focus:border-[#00e676] outline-none" />
                      </td>
                    </tr>
                  ))}
                  {!formLines.length && (
                    <tr><td colSpan={7} className="py-8 text-center text-[#5a6878]">Select a PO to load its line items for inspection.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <label className={lbl}>Quality Inspector Notes</label>
              <textarea rows={2} value={hdr.remarks} onChange={e => setHdr({ ...hdr, remarks: e.target.value })} className={inputCls}
                placeholder="Describe any defects, discrepancies or testing results…" />
            </div>

            {/* Posting preview inside dialog */}
            {formLines.length > 0 && (
              <div className="bg-[#0a0d12] rounded-lg p-3.5 border border-[#1a2028] flex flex-wrap gap-6">
                <div><div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold">Accepted</div><div className="text-[15px] font-bold font-mono text-[#00e676]">{totals.accepted.toLocaleString()} units</div></div>
                <div><div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold">Rejected (Quarantine)</div><div className="text-[15px] font-bold font-mono text-[#ff3d3d]">{totals.rejected.toLocaleString()} units</div></div>
                <div><div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold">Value Addition</div><div className="text-[15px] font-bold font-mono text-[#f5a623]">+₹{totals.value.toLocaleString('en-IN')}</div></div>
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-[#252e3a] pt-4">
            <button onClick={() => setDlgOpen(false)} className="h-9 px-4 rounded-lg border border-[#252e3a] text-[#8899aa] hover:text-[#e2e8f0] transition-all text-[11px] font-medium">Cancel</button>
            <button onClick={() => handleSave(false)} disabled={saving}
              className="h-9 px-4 rounded-lg border border-[#252e3a] text-[#e2e8f0] hover:bg-[#252e3a] transition-all text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Truck size={13} />} Hold Shipment
            </button>
            <button onClick={() => handleSave(true)} disabled={saving}
              className="h-9 px-4 rounded-lg bg-[#00e676] text-black hover:bg-[#00c853] transition-all text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} Post to Inventory <ArrowRight size={12} />
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold">{label}</div>
      <div className="mt-1 text-[22px] font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
function OkChip() { return <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#00e676]/10 text-[#00e676]"><Check size={9} /> OK</span>; }
function ShortChip() { return <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#f5a623]/10 text-[#f5a623]"><PackageCheck size={9} /> Short</span>; }
function ErrorChip({ label }: { label: string }) { return <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#ff3d3d]/10 text-[#ff3d3d]"><X size={9} /> {label}</span>; }
