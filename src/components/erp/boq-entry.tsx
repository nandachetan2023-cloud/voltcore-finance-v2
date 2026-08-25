'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { ListTree, Plus, Trash2, RefreshCw, CheckCircle2, ClipboardList, FileText, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import SiteJobDropdown from './_site-job-dropdown';

interface BoqLine {
  id?: number; itemNo: string; description: string; uom: string; qty: number; rate: number; amount: number; sortOrder: number;
}
interface Boq {
  id: number; boqNo: string; title: string; siteCode: string | null; jobCode: string | null; jobName: string; poNo: string | null; project: string | null;
  version: string; status: string; totalQty: number; totalAmount: number; remarks: string | null;
  lines: BoqLine[];
}

const BOQ_COLUMNS: ExportColumn<Boq>[] = [
  { header: 'BOQ No', accessor: 'boqNo' },
  { header: 'Title', accessor: 'title' },
  { header: 'Version', accessor: 'version' },
  { header: 'Job', accessor: (r) => r.jobCode ?? '' },
  { header: 'Lines', accessor: (r) => r.lines?.length ?? 0 },
  { header: 'Total Amount', accessor: 'totalAmount' },
  { header: 'Status', accessor: 'status' },
];

function mockLines(): BoqLine[] {
  return [
    { itemNo: '1', description: 'Structural Steel ISMB 300', uom: 'MT', qty: 120, rate: 72500, amount: 8700000, sortOrder: 0 },
    { itemNo: '2', description: '33kV XLPE Cable 3Cx400sqmm', uom: 'Mtr', qty: 2500, rate: 4850, amount: 12125000, sortOrder: 1 },
    { itemNo: '3', description: 'OPC 53 Cement bulk', uom: 'MT', qty: 5000, rate: 6250, amount: 31250000, sortOrder: 2 },
    { itemNo: '4', description: 'Power Transformer 50 MVA', uom: 'Nos', qty: 2, rate: 4200000, amount: 8400000, sortOrder: 3 },
  ];
}

function generateMock(): Boq[] {
  return [
    { id: 1, boqNo: 'BOQ-2026-001', title: 'Boiler Erection — BoQ', siteCode: 'SITE-001', jobCode: 'JOB-2026-001', jobName: 'Boiler Erection Phase 1', poNo: 'PO-2026-021', project: 'TPP Adani Godda', version: 'V1', status: 'Approved', totalQty: 7622, totalAmount: 60475000, remarks: null, lines: mockLines() },
    { id: 2, boqNo: 'BOQ-2026-002', title: 'TG Deck Civil — BoQ', siteCode: 'SITE-002', jobCode: 'JOB-2026-002', jobName: 'TG Deck Civil', poNo: 'PO-2026-022', project: 'TPP NTPC Barh', version: 'V2', status: 'Draft', totalQty: 4800, totalAmount: 38900000, remarks: 'Pending review', lines: mockLines() },
  ];
}

export default function BoqEntry() {
  const [rows, setRows] = useState<Boq[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const j = await fetch('/api/projects/boq').then(r => r.json());
      if (j.success && j.data?.length) setRows(j.data);
      else { setRows(generateMock()); toast.info('Sample data shown'); }
    } catch { setRows(generateMock()); toast.info('Sample data shown'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const tc = useTableControls(rows, (r) => `${r.boqNo} ${r.title} ${r.jobCode} ${r.poNo}`);

  const grandTotal = rows.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const approvedTotal = rows.filter(r => r.status === 'Approved').reduce((s, r) => s + (r.totalAmount || 0), 0);

  const del = async (id: number) => {
    if (!confirm('Delete this BOQ?')) return;
    try {
      const j = await fetch(`/api/projects/boq?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (j.success) { toast.success('Deleted'); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin" /></div>;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#a78bfa]/10 rounded-xl flex items-center justify-center"><ListTree size={18} className="text-[#a78bfa]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">BOQ Entry & Tracking</h2>
            <p className="text-[11px] text-[#5a6878]">Bill of Quantities with line items for budget-vs-actual tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
          <ExportButton records={tc.pageItems} columns={BOQ_COLUMNS} filename="boq-list" />
          <button onClick={() => setFormOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-[#a78bfa] text-black text-[12px] font-bold rounded-lg hover:bg-[#9a6ff5]"><Plus size={13} /> New BOQ</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#a78bfa]/10 flex items-center justify-center"><ClipboardList size={18} className="text-[#a78bfa]" /></div>
          <div><div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Total BOQs</div><div className="text-[20px] font-bold text-[#e2e8f0] font-mono">{rows.length}</div></div>
        </div>
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#f5a623]/10 flex items-center justify-center"><IndianRupee size={18} className="text-[#f5a623]" /></div>
          <div><div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Total BOQ Value</div><div className="text-[20px] font-bold text-[#f5a623] font-mono">₹{grandTotal.toLocaleString('en-IN')}</div></div>
        </div>
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00e676]/10 flex items-center justify-center"><CheckCircle2 size={18} className="text-[#00e676]" /></div>
          <div><div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Approved Value</div><div className="text-[20px] font-bold text-[#00e676] font-mono">₹{approvedTotal.toLocaleString('en-IN')}</div></div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3"><SearchInput value={tc.search} onChange={tc.setSearch} /></div>

      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
              {['', 'BOQ No', 'Title', 'Job', 'Version', 'Lines', 'Total Amount', 'Status', ''].map((h, i) => (
                <th key={`hdr-${i}`} className="text-left px-3 py-3 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {tc.pageItems.map(b => (
                <Fragment key={b.id}>
                  <tr className="hover:bg-[#141920]">
                    <td className="py-2.5 px-3"><button onClick={() => setExpanded(expanded === b.id ? null : b.id)} className="text-[#a78bfa]"><FileText size={13} /></button></td>
                    <td className="py-2.5 px-3 font-mono text-[#8899aa]">{b.boqNo}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#e2e8f0]">{b.title}</td>
                    <td className="py-2.5 px-3 text-[#5a6878]">{b.jobCode || '—'}</td>
                    <td className="py-2.5 px-3 text-[#a78bfa]">{b.version}</td>
                    <td className="py-2.5 px-3 font-mono text-[#8899aa]">{b.lines?.length ?? 0}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#f5a623]">₹{(b.totalAmount || 0).toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${b.status === 'Approved' ? 'bg-[#00e676]/10 text-[#00e676]' : b.status === 'Closed' ? 'bg-[#00d4ff]/10 text-[#00d4ff]' : 'bg-[#f5a623]/10 text-[#f5a623]'}`}>{b.status}</span></td>
                    <td className="py-2.5 px-3"><button onClick={() => del(b.id)} className="text-[#5a6878] hover:text-[#ff3d3d]"><Trash2 size={12} /></button></td>
                  </tr>
                  {expanded === b.id && (
                    <tr key={`${b.id}-lines`}>
                      <td colSpan={9} className="px-4 py-3 bg-[#0a0d12]">
                        <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase text-[#5a6878] mb-1 px-2">
                          <div className="col-span-1">#</div><div className="col-span-5">Description</div><div className="col-span-1">UOM</div><div className="col-span-1 text-right">Qty</div><div className="col-span-2 text-right">Rate</div><div className="col-span-2 text-right">Amount</div>
                        </div>
                        {(b.lines || []).map(l => (
                          <div key={l.id || l.itemNo} className="grid grid-cols-12 gap-2 text-[11px] text-[#e2e8f0] px-2 py-1.5 border-b border-[#1a2028] last:border-0">
                            <div className="col-span-1 text-[#8899aa]">{l.itemNo}</div>
                            <div className="col-span-5">{l.description}</div>
                            <div className="col-span-1 text-[#8899aa]">{l.uom}</div>
                            <div className="col-span-1 text-right font-mono">{l.qty.toLocaleString()}</div>
                            <div className="col-span-2 text-right font-mono text-[#8899aa]">₹{l.rate.toLocaleString('en-IN')}</div>
                            <div className="col-span-2 text-right font-mono font-bold text-[#00d4ff]">₹{(l.amount || 0).toLocaleString('en-IN')}</div>
                          </div>
                        ))}
                        {(!b.lines || b.lines.length === 0) && <div className="text-[11px] text-[#5a6878] px-2">No line items.</div>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {tc.pageItems.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-[#5a6878]">No BOQs.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="p-2 border-t border-[#252e3a]"><PaginationBar {...tc} /></div>
      </div>

      {formOpen && <BoqForm onClose={() => setFormOpen(false)} onSaved={async () => { setFormOpen(false); await fetchData(); }} saving={saving} setSaving={setSaving} />}
    </div>
  );
}

function BoqForm({ onClose, onSaved, saving, setSaving }: { onClose: () => void; onSaved: () => void; saving: boolean; setSaving: (b: boolean) => void }) {
  const [sel, setSel] = useState<{ siteId: number | null; jobId: number | null }>({ siteId: null, jobId: null });
  const [jobCode, setJobCode] = useState<string | null>(null);
  const [f, setF] = useState({ title: '', project: '', poNo: '', version: 'V1', status: 'Draft', remarks: '' });
  const [lines, setLines] = useState<BoqLine[]>([{ itemNo: '1', description: '', uom: 'Nos', qty: 1, rate: 0, amount: 0, sortOrder: 0 }]);

  const updateLine = (i: number, patch: Partial<BoqLine>) => {
    setLines(prev => prev.map((l, idx) => {
      if (idx !== i) return l;
      const next = { ...l, ...patch };
      next.amount = Math.round((Number(next.qty) || 0) * (Number(next.rate) || 0) * 100) / 100;
      return next;
    }));
  };

  const save = async () => {
    if (!f.title) { toast.error('BOQ title required'); return; }
    const validLines = lines.filter(l => l.description);
    if (!validLines.length) { toast.error('Add at least one line item'); return; }
    setSaving(true);
    try {
      const body: any = {
        title: f.title, project: f.project || null, poNo: f.poNo || null, version: f.version, status: f.status,
        siteId: sel.siteId, jobCode, remarks: f.remarks || null,
        lines: validLines.map((l, i) => ({ ...l, sortOrder: i })),
      };
      const j = await fetch('/api/projects/boq', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
      if (j.success) { toast.success('BOQ saved'); onSaved(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const inp = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#a78bfa]/60 placeholder:text-[#5a6878]';
  const lbl = 'block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161c24] border border-[#a78bfa]/25 rounded-xl p-4 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h4 className="text-[13px] font-bold text-[#e2e8f0] mb-3">Create BOQ</h4>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div><label className={lbl}>Title</label><input className={inp} value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))} /></div>
          <div><label className={lbl}>Project</label><input className={inp} value={f.project} onChange={e => setF(x => ({ ...x, project: e.target.value }))} /></div>
          <div><label className={lbl}>PO No</label><input className={inp} value={f.poNo} onChange={e => setF(x => ({ ...x, poNo: e.target.value }))} /></div>
          <div><label className={lbl}>Version</label><input className={inp} value={f.version} onChange={e => setF(x => ({ ...x, version: e.target.value }))} /></div>
          <div className="col-span-2"><label className={lbl}>Site & Job</label><SiteJobDropdown value={sel} onChange={(siteId, jobId, code) => { setSel({ siteId, jobId }); setJobCode(code); }} /></div>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <label className={lbl}>BOQ Line Items</label>
          <button onClick={() => setLines(prev => [...prev, { itemNo: String(prev.length + 1), description: '', uom: 'Nos', qty: 1, rate: 0, amount: 0, sortOrder: prev.length }])} className="flex items-center gap-1 text-[10px] text-[#a78bfa]"><Plus size={11} /> Add line</button>
        </div>
        <div className="space-y-2 mb-4">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4"><input placeholder="Description" className={inp} value={l.description} onChange={e => updateLine(i, { description: e.target.value })} /></div>
              <div className="col-span-2"><input placeholder="UOM" className={inp} value={l.uom} onChange={e => updateLine(i, { uom: e.target.value })} /></div>
              <div className="col-span-2"><input type="number" placeholder="Qty" className={inp} value={l.qty} onChange={e => updateLine(i, { qty: Number(e.target.value) })} /></div>
              <div className="col-span-2"><input type="number" placeholder="Rate" className={inp} value={l.rate} onChange={e => updateLine(i, { rate: Number(e.target.value) })} /></div>
              <div className="col-span-1 text-right font-mono text-[11px] text-[#00d4ff]">₹{(l.amount || 0).toLocaleString('en-IN')}</div>
              <div className="col-span-1"><button onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i))} className="text-[#5a6878] hover:text-[#ff3d3d]"><Trash2 size={12} /></button></div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-[11px] text-[#8899aa] border border-[#252e3a] rounded-lg">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-1.5 bg-[#a78bfa] text-black text-[11px] font-bold rounded-lg disabled:opacity-50">{saving ? 'Saving…' : 'Save BOQ'}</button>
        </div>
      </div>
    </div>
  );
}
