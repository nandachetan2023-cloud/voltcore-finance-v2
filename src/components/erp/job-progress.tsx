'use client';

import { useState, useEffect } from 'react';
import { Gauge, Plus, Trash2, RefreshCw, Flag, CircleDot } from 'lucide-react';
import { toast } from 'sonner';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';

interface Milestone { id?: number; name: string; pct: number; achievedPct: number; done: boolean; dueDate: string | null; notes: string | null; }
interface Progress {
  id: number; jobCode: string; jobName: string; siteCode: string | null; overallPct: number; status: string; milestone: string | null; notes: string | null;
  milestones: Milestone[];
}

const PROG_COLUMNS: ExportColumn<Progress>[] = [
  { header: 'Job', accessor: 'jobCode' },
  { header: 'Job Name', accessor: 'jobName' },
  { header: 'Site', accessor: (r) => r.siteCode ?? '' },
  { header: 'Overall %', accessor: 'overallPct' },
  { header: 'Status', accessor: 'status' },
  { header: 'Current Milestone', accessor: (r) => r.milestone ?? '' },
];

function mockMilestones(): Milestone[] {
  return [
    { name: 'Civil & Foundations', pct: 20, achievedPct: 100, done: true, dueDate: null, notes: null },
    { name: 'Structural Erection', pct: 35, achievedPct: 80, done: false, dueDate: null, notes: null },
    { name: 'Equipment Installation', pct: 30, achievedPct: 40, done: false, dueDate: null, notes: null },
    { name: 'Testing & Commissioning', pct: 15, achievedPct: 0, done: false, dueDate: null, notes: null },
  ];
}

function generateMock(): Progress[] {
  return [
    { id: 1, jobCode: 'JOB-2026-001', jobName: 'Boiler Erection Phase 1', siteCode: 'SITE-001', overallPct: 62, status: 'In Progress', milestone: 'Equipment Installation', notes: null, milestones: mockMilestones() },
    { id: 2, jobCode: 'JOB-2026-002', jobName: 'TG Deck Civil', siteCode: 'SITE-002', overallPct: 78, status: 'In Progress', milestone: 'Structural Erection', notes: null, milestones: mockMilestones() },
    { id: 3, jobCode: 'JOB-2026-004', jobName: 'Cement Works', siteCode: 'SITE-004', overallPct: 35, status: 'On Hold', milestone: 'Civil & Foundations', notes: 'Awaiting approval', milestones: mockMilestones() },
  ];
}

export default function JobProgress() {
  const [rows, setRows] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const j = await fetch('/api/projects/job-progress').then(r => r.json());
      if (j.success && j.data?.length) setRows(j.data);
      else { setRows(generateMock()); toast.info('Sample data shown'); }
    } catch { setRows(generateMock()); toast.info('Sample data shown'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const tc = useTableControls(rows, (r) => `${r.jobCode} ${r.jobName} ${r.status} ${r.milestone}`);

  const avgPct = rows.length ? rows.reduce((s, r) => s + (r.overallPct || 0), 0) / rows.length : 0;
  const completed = rows.filter(r => r.status === 'Completed').length;

  const del = async (id: number) => {
    if (!confirm('Delete this job progress record?')) return;
    try {
      const j = await fetch(`/api/projects/job-progress?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (j.success) { toast.success('Deleted'); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" /></div>;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#00d4ff]/10 rounded-xl flex items-center justify-center"><Gauge size={18} className="text-[#00d4ff]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Job Progress & Milestones</h2>
            <p className="text-[11px] text-[#5a6878]">Track %-completion and milestone checklists per job</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
          <ExportButton records={tc.pageItems} columns={PROG_COLUMNS} filename="job-progress" />
          <button onClick={() => setFormOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-[#00d4ff] text-black text-[12px] font-bold rounded-lg hover:bg-[#00b8d6]"><Plus size={13} /> Update Progress</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00d4ff]/10 flex items-center justify-center"><CircleDot size={18} className="text-[#00d4ff]" /></div>
          <div><div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Avg Completion</div><div className="text-[20px] font-bold text-[#00d4ff] font-mono">{avgPct.toFixed(1)}%</div></div>
        </div>
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00e676]/10 flex items-center justify-center"><Flag size={18} className="text-[#00e676]" /></div>
          <div><div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Completed Jobs</div><div className="text-[20px] font-bold text-[#00e676] font-mono">{completed}</div></div>
        </div>
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#f5a623]/10 flex items-center justify-center"><Flag size={18} className="text-[#f5a623]" /></div>
          <div><div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Active Jobs</div><div className="text-[20px] font-bold text-[#f5a623] font-mono">{rows.filter(r => r.status !== 'Completed').length}</div></div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3"><SearchInput value={tc.search} onChange={tc.setSearch} /></div>

      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
              {['Job', 'Overall %', 'Status', 'Current Milestone', 'Milestones', ''] .map(h => (
                <th key={h} className="text-left px-3 py-3 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {tc.pageItems.map(r => (
                <tr key={r.id} className="hover:bg-[#141920]">
                  <td className="py-2.5 px-3"><div className="font-semibold text-[#e2e8f0]">{r.jobCode}</div><div className="text-[9px] text-[#5a6878]">{r.jobName}</div></td>
                  <td className="py-2.5 px-3 w-40">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#252e3a] rounded-full"><div className="h-1.5 rounded-full" style={{ width: `${Math.min(r.overallPct, 100)}%`, background: r.overallPct >= 100 ? '#00e676' : r.overallPct >= 50 ? '#00d4ff' : '#f5a623' }} /></div>
                      <span className="font-mono text-[#e2e8f0]">{(Number.isFinite(r.overallPct) ? r.overallPct : 0)}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${r.status === 'Completed' ? 'bg-[#00e676]/10 text-[#00e676]' : r.status === 'On Hold' ? 'bg-[#f5a623]/10 text-[#f5a623]' : 'bg-[#00d4ff]/10 text-[#00d4ff]'}`}>{r.status}</span></td>
                  <td className="py-2.5 px-3 text-[#8899aa]">{r.milestone || '—'}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex -space-x-1">
                      {(r.milestones || []).map((m, i) => (
                        <div key={i} title={m.name} className={`w-4 h-4 rounded-full border-2 ${m.done ? 'bg-[#00e676] border-[#00e676]' : 'bg-[#252e3a] border-[#3a4656]'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-3"><button onClick={() => del(r.id)} className="text-[#5a6878] hover:text-[#ff3d3d]"><Trash2 size={12} /></button></td>
                </tr>
              ))}
              {tc.pageItems.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-[#5a6878]">No progress records.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="p-2 border-t border-[#252e3a]"><PaginationBar {...tc} /></div>
      </div>

      {formOpen && <ProgressForm onClose={() => setFormOpen(false)} onSaved={async () => { setFormOpen(false); await fetchData(); }} saving={saving} setSaving={setSaving} />}
    </div>
  );
}

function ProgressForm({ onClose, onSaved, saving, setSaving }: { onClose: () => void; onSaved: () => void; saving: boolean; setSaving: (b: boolean) => void }) {
  const [f, setF] = useState({ jobCode: '', jobName: '', siteCode: '', overallPct: 0, status: 'In Progress', notes: '' });
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
  const [miles, setMiles] = useState<Milestone[]>([
    { name: 'Civil & Foundations', pct: 20, achievedPct: 0, done: false, dueDate: null, notes: null },
    { name: 'Structural Erection', pct: 35, achievedPct: 0, done: false, dueDate: null, notes: null },
  ]);

  const save = async () => {
    if (!f.jobCode) { toast.error('Job code required'); return; }
    setSaving(true);
    try {
      const body: any = {
        jobCode: f.jobCode.toUpperCase(), jobName: f.jobName, siteCode: f.siteCode || null, overallPct: Number(f.overallPct) || 0, status: f.status, notes: f.notes || null,
        milestones: miles.map(m => ({ name: m.name, pct: Number(m.pct) || 0, achievedPct: Number(m.achievedPct) || 0, done: (Number(m.achievedPct) || 0) >= 100, notes: m.notes })),
      };
      const j = await fetch('/api/projects/job-progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
      if (j.success) { toast.success('Progress updated'); onSaved(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const inp = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#00d4ff]/60 placeholder:text-[#5a6878]';
  const lbl = 'block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1';
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161c24] border border-[#00d4ff]/25 rounded-xl p-4 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h4 className="text-[13px] font-bold text-[#e2e8f0] mb-3">Update Job Progress</h4>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Job Code</label><input list="jp-job-codes" className={inp} value={f.jobCode} onChange={e => pickJob(e.target.value)} placeholder="Select existing job…" /><datalist id="jp-job-codes">{jobs.map(j => <option key={j.jobCode} value={j.jobCode}>{j.description || ''}</option>)}</datalist></div>
          <div><label className={lbl}>Job Name</label><input className={inp} value={f.jobName} onChange={e => setF(x => ({ ...x, jobName: e.target.value }))} /></div>
          <div><label className={lbl}>Site Code</label><input className={inp} value={f.siteCode} onChange={e => setF(x => ({ ...x, siteCode: e.target.value }))} /></div>
          <div><label className={lbl}>Overall %</label><input type="number" min={0} max={100} className={inp} value={f.overallPct} onChange={e => setF(x => ({ ...x, overallPct: Number(e.target.value) }))} /></div>
          <div><label className={lbl}>Status</label>
            <select className={inp} value={f.status} onChange={e => setF(x => ({ ...x, status: e.target.value }))}>
              {['Not Started', 'In Progress', 'On Hold', 'Completed'].map(s => <option key={s}>{s}</option>)}
            </select></div>
          <div><label className={lbl}>Notes</label><input className={inp} value={f.notes} onChange={e => setF(x => ({ ...x, notes: e.target.value }))} /></div>
        </div>

        <div className="mt-4 mb-2 flex items-center justify-between">
          <label className={lbl}>Milestones</label>
          <button onClick={() => setMiles(prev => [...prev, { name: '', pct: 10, achievedPct: 0, done: false, dueDate: null, notes: null }])} className="flex items-center gap-1 text-[10px] text-[#00d4ff]"><Plus size={11} /> Add milestone</button>
        </div>
        <div className="space-y-2">
          {miles.map((m, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4"><input placeholder="Milestone" className={inp} value={m.name} onChange={e => setMiles(prev => prev.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} /></div>
              <div className="col-span-2"><input type="number" placeholder="Weight%" className={inp} value={m.pct} onChange={e => setMiles(prev => prev.map((x, idx) => idx === i ? { ...x, pct: Number(e.target.value) } : x))} /></div>
              <div className="col-span-2"><input type="number" placeholder="Achieved%" className={inp} value={m.achievedPct} onChange={e => setMiles(prev => prev.map((x, idx) => idx === i ? { ...x, achievedPct: Number(e.target.value) } : x))} /></div>
              <div className="col-span-3 text-right font-mono text-[11px] text-[#00e676]">{m.done ? '✓ done' : '—'}</div>
              <div className="col-span-1"><button onClick={() => setMiles(prev => prev.filter((_, idx) => idx !== i))} className="text-[#5a6878] hover:text-[#ff3d3d]"><Trash2 size={12} /></button></div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-[11px] text-[#8899aa] border border-[#252e3a] rounded-lg">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-1.5 bg-[#00d4ff] text-black text-[11px] font-bold rounded-lg disabled:opacity-50">{saving ? 'Saving…' : 'Save Progress'}</button>
        </div>
      </div>
    </div>
  );
}
