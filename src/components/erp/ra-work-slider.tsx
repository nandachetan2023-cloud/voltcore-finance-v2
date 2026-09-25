'use client';

import { useState, useEffect, useMemo } from 'react';
import { CirclePercent, Plus, Trash2, RefreshCw, Send, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';

interface RaBill {
  id: number; raNo: string; raDate: string; siteCode: string | null; jobCode: string; jobName: string;
  poNo: string | null; poTotal: number; workPercent: number; previousWork: number; billedSoFar: number;
  billAmount: number; deducted: number; withholding: number; netRavFor: number; invoiceNo: string | null; status: string; remarks: string | null;
}

const RA_COLUMNS: ExportColumn<RaBill>[] = [
  { header: 'RA No', accessor: 'raNo' },
  { header: 'Date', accessor: (r) => r.raDate?.split('T')[0] ?? '' },
  { header: 'Job', accessor: 'jobCode' },
  { header: 'Work %', accessor: 'workPercent' },
  { header: 'Bill Amount', accessor: 'billAmount' },
  { header: 'Net', accessor: 'netRavFor' },
  { header: 'Status', accessor: 'status' },
];

function generateMock(): RaBill[] {
  return [
    { id: 1, raNo: 'RA-2026-001', raDate: new Date(Date.now() - 86400000 * 25).toISOString().split('T')[0], siteCode: 'BALCO', jobCode: 'JOB-2026-001', jobName: 'Boiler Erection', poNo: 'PO-2026-021', poTotal: 29400000, workPercent: 30, previousWork: 0, billedSoFar: 0, billAmount: 8820000, deducted: 882000, withholding: 10, netRavFor: 7938000, invoiceNo: null, status: 'Approved', remarks: null },
    { id: 2, raNo: 'RA-2026-002', raDate: new Date(Date.now() - 86400000 * 8).toISOString().split('T')[0], siteCode: 'NTPC', jobCode: 'JOB-2026-002', jobName: 'TG Deck Civil', poNo: 'PO-2026-022', poTotal: 84000000, workPercent: 45, previousWork: 30, billedSoFar: 25200000, billAmount: 12600000, deducted: 0, withholding: 0, netRavFor: 12600000, invoiceNo: null, status: 'Submitted', remarks: 'Second RA' },
  ];
}

export default function RaWorkSlider() {
  const [rows, setRows] = useState<RaBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<RaBill | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const j = await fetch('/api/fin/ra-bills').then(r => r.json());
      if (j.success && j.data?.length) setRows(j.data);
      else { setRows(generateMock()); toast.info('Sample data shown'); }
    } catch { setRows(generateMock()); toast.info('Sample data shown'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const tc = useTableControls(rows, (r) => `${r.raNo} ${r.jobCode} ${r.poNo}`);

  const del = async (id: number) => {
    if (!confirm('Delete this RA bill?')) return;
    try {
      const j = await fetch(`/api/fin/ra-bills?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (j.success) { toast.success('Deleted'); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" /></div>;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f5a623]/10 rounded-xl flex items-center justify-center"><CirclePercent size={18} className="text-[#f5a623]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Running Account (RA) — % Work</h2>
            <p className="text-[11px] text-[#5a6878]">Slide % work complete to raise an RA bill against a job / PO</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
          <ExportButton records={tc.pageItems} columns={RA_COLUMNS} filename="ra-bills" />
          <button onClick={() => { setEdit(null); setFormOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 bg-[#00d4ff] text-black text-[12px] font-bold rounded-lg hover:bg-[#00b8d6]"><Plus size={13} /> New RA</button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3"><SearchInput value={tc.search} onChange={tc.setSearch} /></div>

      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
              {['RA No', 'Date', 'Job / PO', 'Work %', 'PO Total', 'Bill Amt', 'Withhold', 'Net Receivable', 'Status', 'Invoice', ''].map(h => (
                <th key={h} className="text-left px-3 py-3 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {tc.pageItems.map(r => (
                <tr key={r.id} className="hover:bg-[#141920]">
                  <td className="py-2.5 px-3 font-mono text-[#8899aa]">{r.raNo}</td>
                  <td className="py-2.5 px-3 text-[#5a6878]">{r.raDate?.split('T')[0]}</td>
                  <td className="py-2.5 px-3"><div className="font-semibold text-[#e2e8f0]">{r.jobCode}</div><div className="text-[9px] text-[#5a6878]">{r.jobName} · {r.poNo}</div></td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[#252e3a] rounded-full"><div className="h-1.5 bg-[#f5a623] rounded-full" style={{ width: `${r.workPercent}%` }} /></div>
                      <span className="font-mono font-bold text-[#f5a623]">{r.workPercent}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[#8899aa]">₹{(r.poTotal || 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#e2e8f0]">₹{(r.billAmount || 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 font-mono text-[#5a6878]">{r.withholding ? `${r.withholding}%` : '—'}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#00e676]">₹{(r.netRavFor || 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${r.status === 'Approved' ? 'bg-[#00e676]/10 text-[#00e676]' : r.status === 'Invoiced' ? 'bg-[#00d4ff]/10 text-[#00d4ff]' : 'bg-[#f5a623]/10 text-[#f5a623]'}`}>{r.status}</span></td>
                  <td className="py-2.5 px-3 text-[#8899aa]">{r.invoiceNo || '—'}</td>
                  <td className="py-2.5 px-3"><button onClick={() => del(r.id)} className="text-[#5a6878] hover:text-[#ff3d3d]"><Trash2 size={12} /></button></td>
                </tr>
              ))}
              {tc.pageItems.length === 0 && <tr><td colSpan={11} className="py-10 text-center text-[#5a6878]">No RA bills.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="p-2 border-t border-[#252e3a]"><PaginationBar {...tc} /></div>
      </div>

      {formOpen && <RaForm edit={edit} onClose={() => setFormOpen(false)} onSaved={async () => { setFormOpen(false); await fetchData(); }} saving={saving} setSaving={setSaving} />}
    </div>
  );
}

function RaForm({ edit, onClose, onSaved, saving, setSaving }: { edit: RaBill | null; onClose: () => void; onSaved: () => void; saving: boolean; setSaving: (b: boolean) => void }) {
  const [f, setF] = useState({
    jobCode: edit?.jobCode || '', jobName: edit?.jobName || '', siteCode: edit?.siteCode || '', poNo: edit?.poNo || '',
    poTotal: String(edit?.poTotal ?? 0), workPercent: String(edit?.workPercent ?? 0), previousWork: String(edit?.previousWork ?? 0), withholding: String(edit?.withholding ?? 0), status: edit?.status || 'Draft',
  });
  const [jobs, setJobs] = useState<{ jobCode: string; description: string | null; siteCode: string; poNo: string }[]>([]);
  useEffect(() => {
    fetch('/api/fin/jobs').then(r => r.json()).then(j => {
      if (j.success) setJobs(j.data.map((x: any) => ({ jobCode: x.jobCode, description: x.description, siteCode: x.site?.siteCode || '', poNo: x.po?.poNo || '' })));
    }).catch(() => {});
  }, []);
  const pickJob = (code: string) => {
    const job = jobs.find(j => j.jobCode === code);
    setF(x => ({ ...x, jobCode: code, jobName: job?.description || x.jobName, siteCode: job?.siteCode || x.siteCode, poNo: job?.poNo || x.poNo }));
  };
  const wp = Math.max(0, Math.min(100, Number(f.workPercent) || 0));
  const prev = Number(f.previousWork) || 0;
  const total = Number(f.poTotal) || 0;
  const incremental = Math.max(0, Math.min(wp - prev, 100 - prev));
  const bill = Math.round(incremental * 0.01 * total * 100) / 100;
  const withPct = Number(f.withholding) || 0;
  const deducted = Math.round(bill * (withPct / 100) * 100) / 100;
  const net = Math.round((bill - deducted) * 100) / 100;

  const save = async () => {
    if (!f.jobCode || !f.poTotal) { toast.error('Job and PO total required'); return; }
    setSaving(true);
    try {
      const body: any = { jobCode: f.jobCode.toUpperCase(), jobName: f.jobName, siteCode: f.siteCode || null, poNo: f.poNo || null, poTotal: total, workPercent: wp, previousWork: prev, withholding: withPct, status: f.status };
      const res = await fetch('/api/fin/ra-bills', { method: edit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(edit ? { id: edit.id, ...body } : body) });
      const j = await res.json();
      if (j.success) { toast.success(edit ? 'RA updated' : 'RA raised'); onSaved(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };
  const inp = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#00d4ff]/60 placeholder:text-[#5a6878]';
  const lbl = 'block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1';
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161c24] border border-[#f5a623]/25 rounded-xl p-4 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h4 className="text-[13px] font-bold text-[#e2e8f0] mb-3">{edit ? 'Edit RA' : 'Raise Running Account Bill'}</h4>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Job Code</label><input list="ra-job-codes" className={inp} value={f.jobCode} onChange={e => pickJob(e.target.value)} placeholder="Select existing job…" /><datalist id="ra-job-codes">{jobs.map(j => <option key={j.jobCode} value={j.jobCode}>{j.description || ''}</option>)}</datalist></div>
          <div><label className={lbl}>Job Name</label><input className={inp} value={f.jobName} onChange={e => setF(x => ({ ...x, jobName: e.target.value }))} /></div>
          <div><label className={lbl}>PO No</label><input className={inp} value={f.poNo} onChange={e => setF(x => ({ ...x, poNo: e.target.value }))} /></div>
          <div><label className={lbl}>Site</label><input className={inp} value={f.siteCode} onChange={e => setF(x => ({ ...x, siteCode: e.target.value }))} /></div>
          <div><label className={lbl}>PO Total (₹)</label><input type="number" className={inp} value={f.poTotal} onChange={e => setF(x => ({ ...x, poTotal: e.target.value }))} /></div>
          <div><label className={lbl}>Prev Billed %</label><input type="number" className={inp} value={f.previousWork} onChange={e => setF(x => ({ ...x, previousWork: e.target.value }))} /></div>
          <div className="col-span-2">
            <label className={lbl}>Work % Complete — {wp}%</label>
            <input type="range" min={prev} max={100} step={1} value={wp} onChange={e => setF(x => ({ ...x, workPercent: e.target.value }))} className="w-full accent-[#f5a623]" />
            <div className="flex justify-between text-[8px] text-[#5a6878] mt-0.5"><span>{prev}% (billed)</span><span>100%</span></div>
          </div>
          <div><label className={lbl}>Withholding %</label><input type="number" className={inp} value={f.withholding} onChange={e => setF(x => ({ ...x, withholding: e.target.value }))} /></div>
          <div><label className={lbl}>Status</label>
            <select className={inp} value={f.status} onChange={e => setF(x => ({ ...x, status: e.target.value }))}>
              {['Draft', 'Submitted', 'Approved', 'Invoiced'].map(s => <option key={s}>{s}</option>)}
            </select></div>
        </div>

        {/* live calc */}
        <div className="mt-4 bg-[#0d1117] border border-[#252e3a] rounded-lg p-3 grid grid-cols-3 gap-2 text-center">
          <div><div className="text-[8px] uppercase text-[#5a6878]">Bill Amount</div><div className="text-[14px] font-bold text-[#e2e8f0] font-mono">₹{bill.toLocaleString('en-IN')}</div></div>
          <div><div className="text-[8px] uppercase text-[#5a6878]">Withholding</div><div className="text-[14px] font-bold text-[#ff3d3d] font-mono">−₹{deducted.toLocaleString('en-IN')}</div></div>
          <div><div className="text-[8px] uppercase text-[#5a6878]">Net Receivable</div><div className="text-[14px] font-bold text-[#00e676] font-mono">₹{net.toLocaleString('en-IN')}</div></div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-[11px] text-[#8899aa] border border-[#252e3a] rounded-lg">Cancel</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 bg-[#f5a623] text-black text-[11px] font-bold rounded-lg disabled:opacity-50">{saving ? 'Saving…' : <><Send size={12} /> Raise RA</>}</button>
        </div>
      </div>
    </div>
  );
}