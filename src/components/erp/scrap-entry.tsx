'use client';

import { useState, useEffect, useMemo } from 'react';
import { Recycle, Plus, Trash2, TrendingDown, RefreshCw, PackageX, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import SiteJobDropdown from './_site-job-dropdown';

interface ScrapRow {
  id: number; entryNo: string; postingDate: string; itemCode: string; itemName: string; unit: string;
  qtyOut: number; balanceQty: number; rate: number; valueOut: number;
  referenceNo: string | null; jobCode: string | null; siteCode: string | null; remarks: string | null;
}

const SCRAP_COLUMNS: ExportColumn<ScrapRow>[] = [
  { header: 'Entry', accessor: 'entryNo' },
  { header: 'Date', accessor: (r) => r.postingDate?.split('T')[0] ?? '' },
  { header: 'Item', accessor: 'itemName' },
  { header: 'Qty', accessor: 'qtyOut' },
  { header: 'Rate', accessor: 'rate' },
  { header: 'Value', accessor: 'valueOut' },
  { header: 'Balance', accessor: 'balanceQty' },
  { header: 'Job', accessor: (r) => r.jobCode ?? '' },
  { header: 'Remarks', accessor: (r) => r.remarks ?? '' },
];

function generateMock(): ScrapRow[] {
  return [
    { id: 1, entryNo: 'SCR-2026-001', postingDate: new Date(Date.now() - 86400000 * 8).toISOString().split('T')[0], itemCode: 'ITM-002', itemName: 'Structural Steel ISMB 300', unit: 'MT', qtyOut: 2.5, balanceQty: 115.5, rate: 18000, valueOut: 45000, referenceNo: 'SCR-0001', jobCode: 'JOB-2026-002', siteCode: 'NTPC', remarks: 'Cut-offs from fabrication' },
    { id: 2, entryNo: 'SCR-2026-002', postingDate: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0], itemCode: 'ITM-001', itemName: '33kV XLPE Cable', unit: 'Mtr', qtyOut: 120, balanceQty: 2380, rate: 900, valueOut: 108000, referenceNo: 'SCR-0002', jobCode: 'JOB-2026-001', siteCode: 'GODDA', remarks: 'Damaged cable ends' },
    { id: 3, entryNo: 'SCR-2026-003', postingDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], itemCode: 'ITM-003', itemName: 'OPC 53 Grade Cement', unit: 'MT', qtyOut: 8, balanceQty: 4792, rate: 2500, valueOut: 20000, referenceNo: 'SCR-0003', jobCode: 'JOB-2026-004', siteCode: 'KORBA', remarks: 'Moisture-damaged bags' },
  ];
}

export default function ScrapEntry() {
  const [rows, setRows] = useState<ScrapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const j = await fetch('/api/fin/scrap').then(r => r.json());
      if (j.success && j.data?.length) setRows(j.data);
      else { setRows(generateMock()); toast.info('Sample data shown'); }
    } catch { setRows(generateMock()); toast.info('Sample data shown'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const tc = useTableControls(rows, (r) => `${r.entryNo} ${r.itemName} ${r.itemCode} ${r.remarks} ${r.jobCode}`);

  const totalQty = rows.reduce((s, r) => s + (r.qtyOut || 0), 0);
  const totalValue = rows.reduce((s, r) => s + (r.valueOut || 0), 0);

  const del = async (id: number) => {
    if (!confirm('Delete this scrap entry?')) return;
    try {
      const j = await fetch(`/api/fin/scrap?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (j.success) { toast.success('Deleted'); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" /></div>;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#00e676]/10 rounded-xl flex items-center justify-center"><Recycle size={18} className="text-[#00e676]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Scrap Entry</h2>
            <p className="text-[11px] text-[#5a6878]">Record scrap disposal and credit it out of stock</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
          <ExportButton records={tc.pageItems} columns={SCRAP_COLUMNS} filename="scrap-entries" />
          <button onClick={() => setFormOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-[#00e676] text-black text-[12px] font-bold rounded-lg hover:bg-[#00c866]"><Plus size={13} /> Record Scrap</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00e676]/10 flex items-center justify-center"><PackageX size={18} className="text-[#00e676]" /></div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Total Scrap Qty</div>
            <div className="text-[20px] font-bold text-[#e2e8f0] font-mono">{totalQty.toLocaleString()}</div>
          </div>
        </div>
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#f5a623]/10 flex items-center justify-center"><IndianRupee size={18} className="text-[#f5a623]" /></div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Scrap Realisable Value</div>
            <div className="text-[20px] font-bold text-[#f5a623] font-mono">₹{totalValue.toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#a78bfa]/10 flex items-center justify-center"><TrendingDown size={18} className="text-[#a78bfa]" /></div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Scrap Lines</div>
            <div className="text-[20px] font-bold text-[#a78bfa] font-mono">{rows.length}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3"><SearchInput value={tc.search} onChange={tc.setSearch} /></div>

      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
              {['Entry', 'Date', 'Item', 'Qty', 'Rate', 'Value', 'Balance', 'Job', 'Remarks', ''].map(h => (
                <th key={h} className="text-left px-3 py-3 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {tc.pageItems.map(r => (
                <tr key={r.id} className="hover:bg-[#141920]">
                  <td className="py-2.5 px-3 font-mono text-[#8899aa]">{r.entryNo}</td>
                  <td className="py-2.5 px-3 text-[#5a6878]">{r.postingDate?.split('T')[0]}</td>
                  <td className="py-2.5 px-3"><div className="font-semibold text-[#e2e8f0]">{r.itemName}</div><div className="text-[9px] text-[#5a6878]">{r.itemCode}</div></td>
                  <td className="py-2.5 px-3 font-mono text-[#e2e8f0]">{r.qtyOut.toLocaleString()} {r.unit}</td>
                  <td className="py-2.5 px-3 font-mono text-[#8899aa]">₹{r.rate.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#f5a623]">₹{(r.valueOut || 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 font-mono text-[#00e676]">{r.balanceQty.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-[#a78bfa]">{r.jobCode || '—'}</td>
                  <td className="py-2.5 px-3 text-[#5a6878] max-w-[160px] truncate">{r.remarks || '—'}</td>
                  <td className="py-2.5 px-3"><button onClick={() => del(r.id)} className="text-[#5a6878] hover:text-[#ff3d3d]"><Trash2 size={12} /></button></td>
                </tr>
              ))}
              {tc.pageItems.length === 0 && <tr><td colSpan={10} className="py-10 text-center text-[#5a6878]">No scrap entries.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="p-2 border-t border-[#252e3a]"><PaginationBar {...tc} /></div>
      </div>

      {formOpen && <ScrapForm onClose={() => setFormOpen(false)} onSaved={async () => { setFormOpen(false); await fetchData(); }} saving={saving} setSaving={setSaving} />}
    </div>
  );
}

function ScrapForm({ onClose, onSaved, saving, setSaving }: { onClose: () => void; onSaved: () => void; saving: boolean; setSaving: (b: boolean) => void }) {
  const [sel, setSel] = useState<{ siteId: number | null; jobId: number | null }>({ siteId: null, jobId: null });
  const [jobCode, setJobCode] = useState<string | null>(null);
  const [f, setF] = useState({ itemCode: '', itemName: '', description: '', qty: '', unit: 'Nos', rate: '', remarks: '' });
  const [items, setItems] = useState<{ sku: string; name: string; unit: string }[]>([]);
  useEffect(() => {
    fetch('/api/items').then(r => r.json()).then(j => {
      if (j.success) setItems(j.data.map((x: any) => ({ sku: x.sku, name: x.name, unit: x.unit || 'Nos' })));
    }).catch(() => {});
  }, []);
  const pickItem = (sku: string) => {
    const item = items.find(i => i.sku === sku);
    setF(x => ({ ...x, itemCode: sku, itemName: item?.name || x.itemName, unit: item?.unit || x.unit }));
  };

  const save = async () => {
    if (!f.itemCode || !f.qty) { toast.error('Item code and qty required'); return; }
    setSaving(true);
    try {
      const body: any = {
        itemCode: f.itemCode.trim(), itemName: f.itemName.trim() || f.itemCode.trim(),
        unit: f.unit, qty: Number(f.qty), rate: Number(f.rate) || 0,
        siteId: sel.siteId, jobCode,
        remarks: f.remarks || null,
      };
      const j = await fetch('/api/fin/scrap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
      if (j.success) { toast.success('Scrap recorded & stock credited'); onSaved(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const inp = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#00e676]/60 placeholder:text-[#5a6878]';
  const lbl = 'block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1';
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161c24] border border-[#00e676]/25 rounded-xl p-4 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h4 className="text-[13px] font-bold text-[#e2e8f0] mb-3">Record Scrap Disposal</h4>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Item Code</label><input list="scrap-item-codes" className={inp} value={f.itemCode} onChange={e => pickItem(e.target.value)} placeholder="Select existing item…" /><datalist id="scrap-item-codes">{items.map(i => <option key={i.sku} value={i.sku}>{i.name}</option>)}</datalist></div>
          <div><label className={lbl}>Item Name</label><input className={inp} value={f.itemName} onChange={e => setF(x => ({ ...x, itemName: e.target.value }))} /></div>
          <div className="col-span-2"><SiteJobDropdown value={sel} onChange={(siteId, jobId, code) => { setSel({ siteId, jobId }); setJobCode(code); }} /></div>
          <div><label className={lbl}>Scrap Qty</label><input type="number" className={inp} value={f.qty} onChange={e => setF(x => ({ ...x, qty: e.target.value }))} /></div>
          <div><label className={lbl}>Unit</label><input className={inp} value={f.unit} onChange={e => setF(x => ({ ...x, unit: e.target.value }))} /></div>
          <div><label className={lbl}>Rate (₹)</label><input type="number" className={inp} value={f.rate} onChange={e => setF(x => ({ ...x, rate: e.target.value }))} /></div>
          <div className="col-span-2"><label className={lbl}>Remarks</label><input className={inp} value={f.remarks} onChange={e => setF(x => ({ ...x, remarks: e.target.value }))} placeholder="e.g. damaged material, cut-offs" /></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-[11px] text-[#8899aa] border border-[#252e3a] rounded-lg">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-1.5 bg-[#00e676] text-black text-[11px] font-bold rounded-lg disabled:opacity-50">{saving ? 'Recording…' : 'Credit Stock'}</button>
        </div>
      </div>
    </div>
  );
}
