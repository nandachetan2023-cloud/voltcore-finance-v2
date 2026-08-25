'use client';

import { useEffect, useState } from 'react';
import { MapPin, Briefcase, ChevronDown } from 'lucide-react';

export interface SiteOption { id: number; siteCode: string; name: string; }
export interface JobOption { id: number; jobCode: string; siteId: number; description?: string | null; }

interface SiteJobDropdownProps {
  value?: { siteId: number | null; jobId: number | null };
  /** jobCode is the real job code string (e.g. "JOB-2026-001") — use this for
   * anything sent to the API, not a value built from jobId (a DB row id). */
  onChange?: (siteId: number | null, jobId: number | null, jobCode: string | null) => void;
  /** When provided, only jobs belonging to this site are valid in the job select. */
  label?: string;
  className?: string;
  /** Allow a job without restricting to a site (Site→Job cascade). Default true. */
  requireSite?: boolean;
}

const inp = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#00d4ff]/60 transition-colors placeholder:text-[#5a6878] appearance-none';
const lbl = 'block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5';

/**
 * Hierarchical Site → Job cascading dropdown.
 * Selecting a Site scopes the Job list to jobs belonging to that site.
 */
export default function SiteJobDropdown({ value, onChange, label = 'Site & Job', className, requireSite = true }: SiteJobDropdownProps) {
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [siteId, setSiteId] = useState<number | null>(value?.siteId ?? null);
  const [jobId, setJobId] = useState<number | null>(value?.jobId ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch('/api/fin/sites').then(r => r.json()).then(j => { if (j.success) setSites(j.data || []); }).catch(() => {}); }, []);

  // Load all jobs once (the jobs API returns siteId), filter client-side by site.
  useEffect(() => {
    setLoading(true);
    fetch('/api/fin/jobs').then(r => r.json()).then(j => { if (j.success) setJobs(j.data || []); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const pickSite = (id: number | null) => {
    setSiteId(id);
    setJobId(null);
    onChange?.(id, null, null);
  };

  const pickJob = (id: number | null) => {
    setJobId(id);
    const job = jobs.find(j => j.id === id);
    onChange?.(siteId, id, job?.jobCode ?? null);
  };

  const scopedJobs = siteId ? jobs.filter(j => j.siteId === siteId) : jobs;

  return (
    <div className={className}>
      <label className={lbl}>{label}</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="relative">
          <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6878] pointer-events-none" />
          <select
            className={inp + ' pl-8'}
            value={siteId ?? ''}
            onChange={e => pickSite(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">{loading ? 'Loading sites…' : '— Select Site —'}</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6878] pointer-events-none" />
        </div>
        <div className="relative">
          <Briefcase size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6878] pointer-events-none" />
          <select
            className={inp + ' pl-8'}
            value={jobId ?? ''}
            onChange={e => pickJob(e.target.value ? Number(e.target.value) : null)}
            disabled={requireSite && !siteId}
          >
            <option value="">
              {requireSite && !siteId ? 'Select a site first' : '— Select Job —'}
            </option>
            {scopedJobs.map(j => (
              <option key={j.id} value={j.id}>{j.jobCode}{j.description ? ` — ${j.description}` : ''}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6878] pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
