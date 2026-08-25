'use client';

import { useState, useEffect, useMemo } from 'react';
import { PackageOpen, Plus, Trash2, RefreshCw, ArrowRight, Boxes, CircleDollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';

interface Issue {
  id: number; issueNo: string; issueDate: string; siteCode: string | null; jobCode: string; jobName: string;
  itemCode: string | null; itemName: string; description: string; qty: number; unit: string; rate: number; amount: number; wipAccount: string | null; status: string; remarks: string | null;
}

const ISSUE_COLUMNS: ExportColumn<Issue>[] = [
  { header: 'Issue No', accessor: 'issueNo' },
  { header: 'Date', accessor: (r) => r.issueDate?.split('T')[0] ?? '' },
  { header: 'Job', accessor: 'jobCode' },
  { header: 'Description', accessor: 'description' },
  { header: 'Qty', accessor: 'qty' },
  { header: 'Amount', accessor: 'amount' },
  { header: 'Status', accessor: 'status' },
];

function generateMock(): Issue[] {
  return [
    { id: 1, issueNo: 'MI-2026-001', issueDate: new Date(Date.now() - 86400000 * 6).toISOString().split('T')[0], jobCode: 'JOB-2026-001', jobName: 'Boiler Erection Phase 1', itemCode: 'CBL-33KV-400', itemName: '33kV XLPE Cable 3Cx400sqmm', description: '33kV XLPE Cable 3Cx400sqmm', qty: 850, unit: 'Mtr', rate: 4850, amount: 4122500, wipAccount: '1501', siteCode: 'BALCO', status: 'Posted', remarks: null },
    { id: 2, issueNo: 'MI-2026-002', issueDate: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0], jobCode: 'JOB-2026-003', jobName: 'TG Deck Civil', itemCode: 'STL-ISMB-300', itemName: 'Structural Steel ISMB 300', description: 'Structural Steel ISMB 300', qty: 42, unit: 'MT', rate: 72500, amount: 3045000, wipAccount: '1502', siteCode: 'NTPC', status: 'Posted', remarks: null },
    { id: 3, issueNo: 'MI-2026-003', issueDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], jobCode: 'JOB-2026-004', jobName: 'Cement Works', itemCode: 'CEM-OPC-53', itemName: 'OPC 53 Cement bulk', description: 'OPC 53 Cement bulk', qty: 1200, unit: 'MT', rate: 6250, amount: 7500000, wipAccount: '1503', siteCode: 'BALCO', status: 'Draft', remarks: 'Pending cost approval' },
  ];
}

export default function MaterialIssueWip() {
  const [rows, setRows] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const j = await fetch('/api/fin/material-issues').then(r => r.json());
      if (j.success && j.data?.length) setRows(j.data);
      else { setRows(generateMock()); toast.info('Sample data shown'); }
    } catch { setRows(generateMock()); toast.info('Sample data shown'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const tc = useTableControls(rows, (r) => `${r.issueNo} ${r.jobCode} ${r.description} ${r.jobName}`);

  const wipTotal = rows.filter(r => r.status === 'Posted').reduce((s, r) => s + (r.amount || 0), 0);
  const byJob = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) if (r.status === 'Posted') map.set(r.jobCode, (map.get(r.jobCode) || 0) + (r.amount || 0));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const del = async (id: number) => {
    if (!confirm('Delete this material issue? This will not reverse the linked Stock Ledger entry.')) return;
    try {
      const j = await fetch(`/api/fin/material-issues?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (j.success) { toast.success('Deleted'); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" /></div>;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#a78bfa]/10 rounded-xl flex items-center justify-center"><PackageOpen size={18} className="text-[#a78bfa]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Material Issue → Job WIP</h2>
            <p className="text-[11px] text-[#5a6878]">Issue material to a job and post to work-in-progress</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
          <ExportButton records={tc.pageItems} columns={ISSUE_COLUMNS} filename="material-issues" />
          <button onClick={() => setFormOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-[#00d4ff] text-black text-[12px] font-bold rounded-lg hover:bg-[#00b8d6]"><Plus size={13} /> Issue Material</button>
        </div>
      </div>

      {/* WIP summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3"><CircleDollarSign size={15} className="text-[#00d4ff]" /><h4 className="text-[11px] font-bold uppercase tracking-wider text-[#8899aa]">Job-wise WIP Postings</h4></div>
          <div className="space-y-2">
            {byJob.length === 0 && <div className="text-[11px] text-[#5a6878] py-2">No posted issues.</div>}
            {byJob.map(([job, amt]) => {
              const pct = wipTotal ? Math.round((amt / wipTotal) * 100) : 0;
              return (
                <div key={job}>
                  <div className="flex justify-between text-[11px] mb-1"><span className="text-[#e2e8f0] font-semibold">{job}</span><span className="font-mono text-[#00d4ff]">₹{amt.toLocaleString('en-IN')}</span></div>
                  <div className="h-1.5 bg-[#252e3a] rounded-full"><div className="h-1.5 bg-[#00d4ff] rounded-full" style={{ width: `${pct}%` }} /></div>
                  <div className="flex justify-between text-[8px] text-[#5a6878] mt-0.5"><span>{pct}%</span><span>of WIP</span></div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex flex-col justify-center items-center">
          <div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Total WIP (Posted)</div>
          <div className="mt-1 text-[28px] font-bold text-[#00e676] font-mono">₹{wipTotal.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-[#5a6878] mt-1">{rows.length} issues · {byJob.length} jobs</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3"><SearchInput value={tc.search} onChange={tc.setSearch} /></div>

      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
              {['Issue No', 'Date', 'Job', 'Description', 'Qty', 'Rate', 'Amount', 'WIP Acct', 'Status', ''].map(h => (
                <th key={h} className="text-left px-3 py-3 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {tc.pageItems.map(r => (
                <tr key={r.id} className="hover:bg-[#141920]">
                  <td className="py-2.5 px-3 font-mono text-[#8899aa]">{r.issueNo}</td>
                  <td className="py-2.5 px-3 text-[#5a6878]">{r.issueDate?.split('T')[0]}</td>
                  <td className="py-2.5 px-3"><div className="font-semibold text-[#e2e8f0]">{r.jobCode}</div><div className="text-[9px] text-[#5a6878]">{r.jobName}</div></td>
                  <td className="py-2.5 px-3 text-[#8899aa]">{r.description}</td>
                  <td className="py-2.5 px-3 font-mono text-[#e2e8f0]">{r.qty.toLocaleString()} {r.unit}</td>
                  <td className="py-2.5 px-3 font-mono text-[#8899aa]">₹{r.rate.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#e2e8f0]">₹{(r.amount || 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 font-mono text-[#a78bfa]">{r.wipAccount || '—'}</td>
                  <td className="py-2.5 px-3"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${r.status === 'Posted' ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-[#f5a623]/10 text-[#f5a623]'}`}>{r.status}</span></td>
                  <td className="py-2.5 px-3"><button onClick={() => del(r.id)} className="text-[#5a6878] hover:text-[#ff3d3d]"><Trash2 size={12} /></button></td>
                </tr>
              ))}
              {tc.pageItems.length === 0 && <tr><td colSpan={10} className="py-10 text-center text-[#5a6878]">No material issues.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="p-2 border-t border-[#252e3a]"><PaginationBar {...tc} /></div>
      </div>

      {formOpen && <IssueForm onClose={() => setFormOpen(false)} onSaved={async () => { setFormOpen(false); await fetchData(); }} saving={saving} setSaving={setSaving} />}
    </div>
  );
}

function IssueForm({ onClose, onSaved, saving, setSaving }: { onClose: () => void; onSaved: () => void; saving: boolean; setSaving: (b: boolean) => void }) {
  const [f, setF] = useState({ itemCode: '', jobCode: '', jobName: '', siteCode: '', description: '', qty: '', unit: 'Nos', rate: '', amount: '', wipAccount: '1501', status: 'Posted', remarks: '' });
  const [jobs, setJobs] = useState<{ jobCode: string; description: string | null; siteCode: string }[]>([]);
  useEffect(() => {
    fetch('/api/fin/jobs').then(r => r.json()).then(j => {
      if (j.success) setJobs(j.data.map((x: any) => ({ jobCode: x.jobCode, description: x.description, siteCode: x.site?.siteCode || '' })));
    }).catch(() => {});
  }, []);
  const pickJob = (code: string) => {
    const job = jobs.find(j => j.jobCode === code);
    setF(x => ({ ...x, jobCode: code, jobName: job?.description || x.jobName, siteCode: job?.siteCode || x.siteCode }));
  };
  const save = async () => {
    if (!f.jobCode || !f.description || !f.qty) { toast.error('Job, description and qty required'); return; }
    setSaving(true);
    try {
      const body: any = { itemCode: f.itemCode.trim() || null, jobCode: f.jobCode.toUpperCase(), jobName: f.jobName, siteCode: f.siteCode || null, description: f.description, qty: Number(f.qty), unit: f.unit, rate: Number(f.rate) || 0, amount: Number(f.amount) || (Number(f.qty) * Number(f.rate)) || 0, wipAccount: f.wipAccount || null, status: f.status, remarks: f.remarks || null };
      const j = await fetch('/api/fin/material-issues', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
      if (j.success) { toast.success('WIP posted'); onSaved(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };
  const inp = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#00d4ff]/60 placeholder:text-[#5a6878]';
  const lbl = 'block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1';
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161c24] border border-[#a78bfa]/25 rounded-xl p-4 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h4 className="text-[13px] font-bold text-[#e2e8f0] mb-3">Issue Material to Job</h4>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Job Code</label><input list="mi-job-codes" className={inp} value={f.jobCode} onChange={e => pickJob(e.target.value)} placeholder="Select existing job…" /><datalist id="mi-job-codes">{jobs.map(j => <option key={j.jobCode} value={j.jobCode}>{j.description || ''}</option>)}</datalist></div>
          <div><label className={lbl}>Job Name</label><input className={inp} value={f.jobName} onChange={e => setF(x => ({ ...x, jobName: e.target.value }))} /></div>
          <div className="col-span-2"><label className={lbl}>Material Description</label><input className={inp} value={f.description} onChange={e => setF(x => ({ ...x, description: e.target.value }))} /></div>
          <div><label className={lbl}>Item Code <span className="normal-case text-[#5a6878]">(posts Stock Ledger)</span></label><input className={inp} value={f.itemCode} onChange={e => setF(x => ({ ...x, itemCode: e.target.value }))} /></div>
          <div><label className={lbl}>Qty</label><input type="number" className={inp} value={f.qty} onChange={e => setF(x => ({ ...x, qty: e.target.value }))} /></div>
          <div><label className={lbl}>Unit</label><input className={inp} value={f.unit} onChange={e => setF(x => ({ ...x, unit: e.target.value }))} /></div>
          <div><label className={lbl}>Rate</label><input type="number" className={inp} value={f.rate} onChange={e => setF(x => ({ ...x, rate: e.target.value }))} /></div>
          <div><label className={lbl}>Amount</label><input type="number" className={inp} value={f.amount} onChange={e => setF(x => ({ ...x, amount: e.target.value }))} /></div>
          <div><label className={lbl}>Site</label><input className={inp} value={f.siteCode} onChange={e => setF(x => ({ ...x, siteCode: e.target.value }))} /></div>
          <div><label className={lbl}>WIP Account</label><input className={inp} value={f.wipAccount} onChange={e => setF(x => ({ ...x, wipAccount: e.target.value }))} /></div>
          <div><label className={lbl}>Status</label>
            <select className={inp} value={f.status} onChange={e => setF(x => ({ ...x, status: e.target.value }))}>
              {['Draft', 'Posted', 'Reversed'].map(s => <option key={s}>{s}</option>)}
            </select></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-[11px] text-[#8899aa] border border-[#252e3a] rounded-lg">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-1.5 bg-[#a78bfa] text-black text-[11px] font-bold rounded-lg disabled:opacity-50">{saving ? 'Posting…' : 'Post to WIP'}</button>
        </div>
      </div>
    </div>
  );
}