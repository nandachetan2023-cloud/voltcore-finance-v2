'use client';

import { useState, useEffect, useMemo } from 'react';
import { Boxes, Plus, Trash2, TrendingUp, TrendingDown, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';

interface LedgerRow {
  id: number; entryNo: string; postingDate: string; itemCode: string; itemName: string; unit: string;
  qtyIn: number; qtyOut: number; balanceQty: number; rate: number; valueIn: number; valueOut: number;
  referenceType: string; referenceNo: string | null; jobCode: string | null; siteCode: string | null; remarks: string | null;
}

const LEDGER_COLUMNS: ExportColumn<LedgerRow>[] = [
  { header: 'Entry', accessor: 'entryNo' },
  { header: 'Date', accessor: (r) => r.postingDate?.split('T')[0] ?? '' },
  { header: 'Item', accessor: 'itemName' },
  { header: 'Type', accessor: 'referenceType' },
  { header: 'In', accessor: 'qtyIn' },
  { header: 'Out', accessor: 'qtyOut' },
  { header: 'Balance', accessor: 'balanceQty' },
  { header: 'Rate', accessor: 'rate' },
];

function generateMock(): LedgerRow[] {
  const items = [
    { code: 'ITM-001', name: '33kV XLPE Cable', unit: 'Mtr', ref: 'GRN' },
    { code: 'ITM-002', name: 'Structural Steel ISMB 300', unit: 'MT', ref: 'GRN' },
    { code: 'ITM-003', name: 'OPC 53 Grade Cement', unit: 'MT', ref: 'GRN' },
    { code: 'ITM-004', name: 'Power Transformer 50 MVA', unit: 'Nos', ref: 'GRN' },
  ];
  const rows: LedgerRow[] = [];
  let id = 1;
  for (const it of items) {
    let bal = 0;
    for (let d = 20; d >= 0; d -= 5) {
      const isIn = d % 10 === 0;
      const qty = isIn ? Math.round(40 + Math.random() * 80) : Math.round(15 + Math.random() * 40);
      bal = isIn ? bal + qty : bal - qty;
      rows.push({ id: id++, entryNo: `SL-${String(id).padStart(3, '0')}`, postingDate: new Date(Date.now() - d * 86400000).toISOString().split('T')[0], itemCode: it.code, itemName: it.name, unit: it.unit, qtyIn: isIn ? qty : 0, qtyOut: isIn ? 0 : qty, balanceQty: bal, rate: it.code === 'ITM-003' ? 6250 : it.code === 'ITM-002' ? 72500 : it.code === 'ITM-004' ? 4200000 : 4850, valueIn: isIn ? qty * 0 : 0, valueOut: isIn ? 0 : 0, referenceType: isIn ? 'Stock Receipt' : 'Material Issue', referenceNo: it.ref, jobCode: isIn ? null : 'JOB-2026-00' + d, siteCode: 'BALCO', remarks: null });
    }
  }
  return rows;
}

export default function StockLedger() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const j = await fetch('/api/fin/stock-ledger').then(r => r.json());
      if (j.success && j.data?.length) { setRows(j.data); }
      else { setRows(generateMock()); toast.info('Sample data shown'); }
    } catch { setRows(generateMock()); toast.info('Sample data shown'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const tc = useTableControls(rows, (r) => `${r.entryNo} ${r.itemName} ${r.itemCode} ${r.referenceType}`);

  const items = useMemo(() => {
    const map = new Map<string, { balanceQty: number; qtyIn: number; qtyOut: number; unit: string }>();
    for (const r of rows) {
      const key = r.itemCode;
      const cur = map.get(key) || { balanceQty: 0, qtyIn: 0, qtyOut: 0, unit: r.unit };
      cur.qtyIn += r.qtyIn; cur.qtyOut += r.qtyOut; cur.balanceQty = r.balanceQty;
      map.set(key, cur);
    }
    return [...map.entries()].map(([code, v]) => ({ code, ...v }));
  }, [rows]);

  const del = async (id: number) => {
    if (!confirm('Delete this ledger entry?')) return;
    try {
      const j = await fetch(`/api/fin/stock-ledger?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (j.success) { toast.success('Entry deleted'); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" /></div>;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#00e676]/10 rounded-xl flex items-center justify-center"><Boxes size={18} className="text-[#00e676]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Stock Ledger</h2>
            <p className="text-[11px] text-[#5a6878]">Running balance per item · {items.length} items · {rows.length} postings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
          <ExportButton records={tc.pageItems} columns={LEDGER_COLUMNS} filename="stock-ledger" />
          <button onClick={() => setFormOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-[#00d4ff] text-black text-[12px] font-bold rounded-lg hover:bg-[#00b8d6]"><Plus size={13} /> Post Entry</button>
        </div>
      </div>

      {/* item summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {items.slice(0, 4).map(it => (
          <div key={it.code} className="bg-[#161c24] border border-[#252e3a] rounded-xl p-3">
            <div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold">{it.code}</div>
            <div className="text-[11px] text-[#e2e8f0] font-semibold truncate">{it.code}</div>
            <div className={`mt-1 text-[16px] font-bold ${it.balanceQty >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>{it.balanceQty.toLocaleString()} <span className="text-[9px] text-[#5a6878] font-normal">{it.unit}</span></div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-3"><SearchInput value={tc.search} onChange={tc.setSearch} /></div>

      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
              {['Entry', 'Date', 'Item', 'Type', 'In', 'Out', 'Balance', 'Rate', 'Job', ''].map(h => (
                <th key={h} className="text-left px-3 py-3 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {tc.pageItems.map(r => (
                <tr key={r.id} className="hover:bg-[#141920]">
                  <td className="py-2.5 px-3 font-mono text-[#8899aa]">{r.entryNo}</td>
                  <td className="py-2.5 px-3 text-[#5a6878]">{r.postingDate?.split('T')[0]}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-[#e2e8f0]">{r.itemName}</div>
                    <div className="text-[9px] text-[#5a6878]">{r.itemCode} · {r.unit}</div>
                  </td>
                  <td className="py-2.5 px-3"><span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#252e3a] text-[#8899aa]">{r.referenceType}</span></td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#00e676]">{r.qtyIn ? r.qtyIn.toLocaleString() : '—'}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#ff3d3d]">{r.qtyOut ? r.qtyOut.toLocaleString() : '—'}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#e2e8f0]">{r.balanceQty.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#8899aa]">{r.rate ? `₹${r.rate.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="py-2.5 px-3 text-[#8899aa]">{r.jobCode || '—'}</td>
                  <td className="py-2.5 px-3"><button onClick={() => del(r.id)} className="text-[#5a6878] hover:text-[#ff3d3d]"><Trash2 size={12} /></button></td>
                </tr>
              ))}
              {tc.pageItems.length === 0 && <tr><td colSpan={10} className="py-10 text-center text-[#5a6878]">No stock postings.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="p-2 border-t border-[#252e3a]"><PaginationBar {...tc} /></div>
      </div>

      {formOpen && <PostForm onClose={() => setFormOpen(false)} onSaved={async () => { setFormOpen(false); await fetchData(); }} saving={saving} setSaving={setSaving} />}
    </div>
  );
}

function PostForm({ onClose, onSaved, saving, setSaving }: { onClose: () => void; onSaved: () => void; saving: boolean; setSaving: (b: boolean) => void }) {
  const [f, setF] = useState({ itemCode: '', itemName: '', unit: 'Nos', qtyIn: '', qtyOut: '', rate: '', referenceType: 'Stock Receipt', jobCode: '', remarks: '' });
  const [items, setItems] = useState<{ sku: string; name: string; unit: string }[]>([]);
  const [jobs, setJobs] = useState<{ jobCode: string; description: string | null }[]>([]);
  useEffect(() => {
    fetch('/api/items').then(r => r.json()).then(j => {
      if (j.success) setItems(j.data.map((x: any) => ({ sku: x.sku, name: x.name, unit: x.Uom?.name || x.uom?.name || 'Nos' })));
    }).catch(() => {});
    fetch('/api/fin/jobs').then(r => r.json()).then(j => {
      if (j.success) setJobs(j.data.map((x: any) => ({ jobCode: x.jobCode, description: x.description })));
    }).catch(() => {});
  }, []);
  const pickItem = (sku: string) => {
    const item = items.find(i => i.sku === sku);
    setF(x => ({ ...x, itemCode: sku, itemName: item?.name || x.itemName, unit: item?.unit || x.unit }));
  };
  const save = async () => {
    if (!f.itemCode) { toast.error('Item code required'); return; }
    setSaving(true);
    try {
      const body: any = { itemCode: f.itemCode.toUpperCase(), itemName: f.itemName || f.itemCode, unit: f.unit, qtyIn: Number(f.qtyIn) || 0, qtyOut: Number(f.qtyOut) || 0, rate: Number(f.rate) || 0, referenceType: f.referenceType, jobCode: f.jobCode || null, remarks: f.remarks || null };
      const j = await fetch('/api/fin/stock-ledger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
      if (j.success) { toast.success('Entry posted'); onSaved(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };
  const inp = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#00d4ff]/60 placeholder:text-[#5a6878]';
  const lbl = 'block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1';
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161c24] border border-[#00d4ff]/25 rounded-xl p-4 max-w-lg w-full">
        <h4 className="text-[13px] font-bold text-[#e2e8f0] mb-3">Post Stock Entry</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className={lbl}>Item Code</label><input list="sl-item-codes" className={inp} value={f.itemCode} onChange={e => pickItem(e.target.value)} placeholder="Select existing item…" /><datalist id="sl-item-codes">{items.map(i => <option key={i.sku} value={i.sku}>{i.name}</option>)}</datalist></div>
          <div className="col-span-2"><label className={lbl}>Item Name</label><input className={inp} value={f.itemName} onChange={e => setF(x => ({ ...x, itemName: e.target.value }))} /></div>
          <div><label className={lbl}>Unit</label><input className={inp} value={f.unit} onChange={e => setF(x => ({ ...x, unit: e.target.value }))} /></div>
          <div><label className={lbl}>Type</label>
            <select className={inp} value={f.referenceType} onChange={e => setF(x => ({ ...x, referenceType: e.target.value }))}>
              {['Stock Receipt', 'Material Issue', 'Stock Transfer', 'Adjustment'].map(t => <option key={t}>{t}</option>)}
            </select></div>
          <div><label className={lbl}>Qty In</label><input type="number" className={inp} value={f.qtyIn} onChange={e => setF(x => ({ ...x, qtyIn: e.target.value }))} /></div>
          <div><label className={lbl}>Qty Out</label><input type="number" className={inp} value={f.qtyOut} onChange={e => setF(x => ({ ...x, qtyOut: e.target.value }))} /></div>
          <div><label className={lbl}>Rate</label><input type="number" className={inp} value={f.rate} onChange={e => setF(x => ({ ...x, rate: e.target.value }))} /></div>
          <div><label className={lbl}>Job</label><input list="sl-job-codes" className={inp} value={f.jobCode} onChange={e => setF(x => ({ ...x, jobCode: e.target.value }))} placeholder="Optional — existing job" /><datalist id="sl-job-codes">{jobs.map(j => <option key={j.jobCode} value={j.jobCode}>{j.description || ''}</option>)}</datalist></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-[11px] text-[#8899aa] border border-[#252e3a] rounded-lg">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-1.5 bg-[#00d4ff] text-black text-[11px] font-bold rounded-lg disabled:opacity-50">{saving ? 'Posting…' : 'Post Entry'}</button>
        </div>
      </div>
    </div>
  );
}