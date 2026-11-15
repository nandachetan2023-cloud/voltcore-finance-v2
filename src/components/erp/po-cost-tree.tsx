'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { RefreshCw, ChevronRight, ChevronDown, FolderTree, Building2, AlertCircle } from 'lucide-react';

interface PO { id: number; poNo: string; vendorName: string; siteId: number; site?: { name?: string } | null; jobCode: string; descriptionOfWork: string | null; totalAmount: number; status: string; }

// Cost rollup: Site → Job (jobCode) → PO.
interface JobNode { siteId: number | null; jobCode: string; pos: PO[]; poTotal: number; }
interface SiteTree { siteKey: string; siteName: string; jobs: JobNode[]; total: number; }

const isDraft = (s?: string | null) => (s || '').toLowerCase() === 'draft';

function buildTree(pos: PO[]): SiteTree[] {
  const bySite = new Map<string, PO[]>();
  for (const po of pos) {
    const key = po.siteId != null ? String(po.siteId) : 'unassigned';
    if (!bySite.has(key)) bySite.set(key, []);
    bySite.get(key)!.push(po);
  }
  const sites: SiteTree[] = [];
  for (const [key, posList] of bySite) {
    const siteName = posList[0].site?.name || (key === 'unassigned' ? 'Unassigned' : 'Site');
    const jobs = new Map<string, JobNode>();
    for (const po of posList) {
      const jk = po.jobCode || 'No Job';
      const cur = jobs.get(jk) || { siteId: po.siteId, jobCode: jk, pos: [], poTotal: 0 };
      cur.pos.push(po);
      if (!isDraft(po.status)) cur.poTotal = Math.round((cur.poTotal + (po.totalAmount || 0)) * 100) / 100;
      jobs.set(jk, cur);
    }
    const jobList = [...jobs.values()].sort((a, b) => b.poTotal - a.poTotal);
    const total = Math.round(jobList.reduce((s, j) => s + j.poTotal, 0) * 100) / 100;
    sites.push({ siteKey: key, siteName, jobs: jobList, total });
  }
  return sites.sort((a, b) => b.total - a.total);
}

export default function PoCostTree() {
  const [pos, setPos] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const didInitExpand = useRef(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const j = await fetch('/api/fin/purchase-orders').then(r => r.json());
      if (j.success) { setPos(Array.isArray(j.data) ? j.data : []); setError(''); }
      else setError(j.error || 'Failed to load purchase orders');
    } catch (e: any) { setError(e?.message || 'Network error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const tree = useMemo(() => buildTree(pos), [pos]);
  const grand = Math.round(tree.reduce((s, s0) => s + s0.total, 0) * 100) / 100;
  useEffect(() => {
    if (didInitExpand.current) return;
    if (tree.length === 0) return;
    setExpanded(new Set(tree.map(s => s.siteKey)));
    didInitExpand.current = true;
  }, [tree]);

  const toggle = (k: string) => setExpanded(prev => { const s = new Set(prev); if (s.has(k)) s.delete(k); else s.add(k); return s; });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" /></div>;

  if (error) return (
    <div className="p-6 text-center text-[#ff3d3d]">
      <AlertCircle size={32} className="mx-auto mb-2" />
      <p>{error}</p>
      <button className="vc-btn-primary mt-3" onClick={fetchData}>Retry</button>
    </div>
  );

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f5a623]/10 rounded-xl flex items-center justify-center"><FolderTree size={18} className="text-[#f5a623]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">PO-wise Cost Tree</h2>
            <p className="text-[11px] text-[#5a6878]">Site → Job → PO cost roll-up · {pos.length} purchase orders</p>
          </div>
        </div>
        <button onClick={fetchData} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi label="Sites" value={tree.length} color="#e2e8f0" />
        <Kpi label="Jobs" value={tree.reduce((s, s0) => s + s0.jobs.length, 0)} color="#00d4ff" />
        <Kpi label="POs" value={pos.length} color="#a78bfa" />
        <Kpi label="Total Value" value={grand} color="#f5a623" money />
      </div>

      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
            <th className="text-left px-4 py-3 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]">Cost Node</th>
            <th className="text-left px-3 py-3 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]">Level</th>
            <th className="text-right px-4 py-3 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]">Amount</th>
          </tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {tree.map(site => <SiteRow key={site.siteKey} site={site} expanded={expanded} onToggle={toggle} grand={grand} />)}
            {tree.length === 0 && <tr><td colSpan={3} className="py-10 text-center text-[#5a6878]">No purchase orders.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function SiteRow({ site, expanded, onToggle, grand }: { site: SiteTree; expanded: Set<string>; onToggle: (k: string) => void; grand: number }) {
  const open = expanded.has(site.siteKey);
  return (
    <>
      <tr className="bg-[#0a0d12]/70 hover:bg-[#141920] cursor-pointer" onClick={() => onToggle(site.siteKey)}>
        <td className="py-3 pl-4 pr-3">
          <div className="flex items-center gap-1.5">
            {open ? <ChevronDown size={14} className="text-[#5a6878]" /> : <ChevronRight size={14} className="text-[#5a6878]" />}
            <Building2 size={14} className="text-[#00d4ff]" />
            <span className="font-bold text-[#e2e8f0]">{site.siteName}</span>
            <span className="text-[9px] text-[#5a6878]">({site.jobs.length} jobs)</span>
          </div>
        </td>
        <td className="px-3 py-3 text-[#8899aa]">Site</td>
        <td className="px-4 py-3 text-right font-mono font-bold text-[#00d4ff]">₹{site.total.toLocaleString('en-IN')}</td>
      </tr>
      {open && site.jobs.map(job => (
        <JobRow key={job.jobCode} job={job} depth={0} expanded={expanded} onToggle={onToggle} />
      ))}
    </>
  );
}

function JobRow({ job, depth, expanded, onToggle }: { job: JobNode; depth: number; expanded: Set<string>; onToggle: (k: string) => void; }) {
  const key = `${job.siteId ?? 'unassigned'}-${depth}-${job.jobCode}`;
  const open = expanded.has(key);
  return (
    <>
      <tr className="hover:bg-[#141920] cursor-pointer" onClick={() => onToggle(key)}>
        <td className="py-2.5 pr-3" style={{ paddingLeft: 24 + depth * 22 }}>
          <div className="flex items-center gap-1.5">
            {open ? <ChevronDown size={12} className="text-[#5a6878]" /> : <ChevronRight size={12} className="text-[#5a6878]" />}
            <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]" />
            <span className="font-semibold text-[#e2e8f0]">{job.jobCode}</span>
            <span className="text-[9px] text-[#5a6878]">({job.pos.length} POs)</span>
          </div>
        </td>
        <td className="px-3 py-2.5 text-[#5a6878]">Job</td>
        <td className="px-4 py-2.5 text-right font-mono font-bold text-[#e2e8f0]">₹{job.poTotal.toLocaleString('en-IN')}</td>
      </tr>
      {open && job.pos.map(po => (
        <tr key={po.id} className="hover:bg-[#141920]">
          <td className="py-2.5 pr-3" style={{ paddingLeft: 24 + (depth + 1) * 22 }}>
            <div className="flex items-center gap-1.5">
              <span className="w-[12px]" />
              <span className="w-2 h-2 rounded-sm bg-[#f5a623]" />
              <span className="text-[#8899aa]">{po.poNo}</span>
              <span className="text-[9px] text-[#5a6878] truncate">{po.vendorName && `· ${po.vendorName}`} {po.descriptionOfWork ? `· ${po.descriptionOfWork}` : ''}</span>
            </div>
          </td>
          <td className="px-3 py-2.5 text-[#5a6878]">PO</td>
          <td className="px-4 py-2.5 text-right font-mono text-[#8899aa]">₹{(po.totalAmount || 0).toLocaleString('en-IN')}</td>
        </tr>
      ))}
    </>
  );
}

function Kpi({ label, value, color, money }: { label: string; value: number; color: string; money?: boolean }) {
  return (
    <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold">{label}</div>
      <div className="mt-1 text-[18px] font-bold font-mono" style={{ color }}>{money ? `₹${value.toLocaleString('en-IN')}` : value}</div>
    </div>
  );
}
