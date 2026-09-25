'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { FolderKanban, ChevronRight, ChevronDown, Plus, Pencil, Trash2, Loader2, Briefcase, Layers, IndianRupee, RefreshCw, User, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useFormValidation, required } from './_form-controls';

interface SiteRef { id: number; siteCode: string; name: string; }
interface SubJob { id: number; jobCode: string; description: string | null; status: string; budget: number; site?: SiteRef | null; }
interface Job {
  id: number; jobCode: string; projectId: number | null; parentId: number | null;
  poId: number | null; siteId: number; description: string | null; budget: number; status: string;
  site?: SiteRef | null; project?: { id: number; projectCode: string; name: string } | null;
  children: SubJob[]; totalBudget?: number;
}
interface Project {
  id: number; projectCode: string; name: string; client: string; contractValue: number;
  sector: string | null; projectManager: string | null; startDate: string | null; endDate: string | null;
  status: string; description: string | null; jobs: Job[];
}

const PROJECT_STATUSES = ['Active', 'On Hold', 'Completed', 'Cancelled'];
const SECTORS = ['', 'Power', 'Mining', 'Industrial'];
const JOB_STATUSES = ['Active', 'Completed', 'On Hold', 'Closed'];

const fmtCur = (n: number) => '₹' + (n || 0).toLocaleString('en-IN');
const fmtCr = (n: number) => n >= 10000000 ? '₹' + (n / 10000000).toFixed(2) + ' Cr' : n >= 100000 ? '₹' + (n / 100000).toFixed(2) + ' L' : fmtCur(n);

function statusBadge(s: string) {
  if (s === 'Active') return 'bg-[#00e676]/15 text-[#00e676]';
  if (s === 'Completed') return 'bg-[#00d4ff]/15 text-[#00d4ff]';
  if (s === 'On Hold') return 'bg-[#f5a623]/15 text-[#f5a623]';
  return 'bg-[#5a6878]/15 text-[#5a6878]';
}

const lbl = 'block text-[10px] font-semibold text-[#8899aa] uppercase tracking-wider mb-1';

function ProjectForm({ onClose, onSaved, existing }: {
  onClose: () => void; onSaved: () => void; existing: Project | null;
}) {
  const [f, setF] = useState({
    projectCode: existing?.projectCode ?? '', name: existing?.name ?? '', client: existing?.client ?? '',
    contractValue: existing?.contractValue ? String(existing.contractValue) : '', sector: existing?.sector ?? '',
    projectManager: existing?.projectManager ?? '', startDate: existing?.startDate?.slice(0, 10) ?? '',
    endDate: existing?.endDate?.slice(0, 10) ?? '', status: existing?.status ?? 'Active', description: existing?.description ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const { errors, validate } = useFormValidation<typeof f>({ name: required('Project name') });
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!validate(f)) return;
    setSubmitting(true);
    try {
      const method = existing ? 'PUT' : 'POST';
      const body = existing ? { id: existing.id, ...f } : f;
      const r = await fetch('/api/projects/hierarchy', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.success) { toast.success(existing ? 'Project updated' : 'Project created'); onSaved(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
    finally { setSubmitting(false); }
  };

  return (
    <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-xl">
      <DialogHeader><DialogTitle className="text-[#f5a623]">{existing ? 'Edit Project' : 'New Project (Contract)'}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lbl}>Project Code</label><input className="vc-input" value={f.projectCode} onChange={e => set('projectCode', e.target.value)} placeholder="DEL-METRO-01" /></div>
        <div><label className={lbl}>Name *</label><input className="vc-input" value={f.name} onChange={e => set('name', e.target.value)} placeholder="Delhi Metro Phase-IV EPC Contract" /></div>
        <div><label className={lbl}>Client</label><input className="vc-input" value={f.client} onChange={e => set('client', e.target.value)} placeholder="DMRC / NTPC / BALCO" /></div>
        <div><label className={lbl}>Contract Value (₹)</label><input className="vc-input" value={f.contractValue} onChange={e => set('contractValue', e.target.value)} placeholder="245000000" /></div>
        <div><label className={lbl}>Sector</label>
          <select className="vc-input" value={f.sector} onChange={e => set('sector', e.target.value)}>{SECTORS.map(s => <option key={s} value={s}>{s || '— Select —'}</option>)}</select>
        </div>
        <div><label className={lbl}>Project Manager</label><input className="vc-input" value={f.projectManager} onChange={e => set('projectManager', e.target.value)} placeholder="Rohan Deshpande" /></div>
        <div><label className={lbl}>Start Date</label><input type="date" className="vc-input" value={f.startDate} onChange={e => set('startDate', e.target.value)} /></div>
        <div><label className={lbl}>End Date</label><input type="date" className="vc-input" value={f.endDate} onChange={e => set('endDate', e.target.value)} /></div>
        <div><label className={lbl}>Status</label>
          <select className="vc-input" value={f.status} onChange={e => set('status', e.target.value)}>{PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
        </div>
        <div><label className={lbl}>Description</label><input className="vc-input" value={f.description} onChange={e => set('description', e.target.value)} placeholder="Turnkey EPC scope summary" /></div>
      </div>
      <DialogFooter>
        <button onClick={onClose} className="vc-btn-ghost">Cancel</button>
        <button onClick={save} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}{existing ? 'Update' : 'Create'}</button>
      </DialogFooter>
    </DialogContent>
  );
}

function JobForm({ onClose, onSaved, existing, projects, sites, defaultProjectId, defaultParentId }: {
  onClose: () => void; onSaved: () => void; existing: Job | null; projects: Project[];
  sites: SiteRef[]; defaultProjectId: number | null; defaultParentId: number | null;
}) {
  const allJobCodes = useMemo(() => projects.flatMap(p => p.jobs.map(j => j.jobCode)), [projects]);
  const generateJobCode = () => {
    const year = new Date().getFullYear();
    const existingSet = new Set(allJobCodes);
    let seq = allJobCodes.filter(c => c.startsWith(`JOB-${year}-`)).length + 1;
    let candidate = `JOB-${year}-${String(seq).padStart(3, '0')}`;
    while (existingSet.has(candidate)) { seq += 1; candidate = `JOB-${year}-${String(seq).padStart(3, '0')}`; }
    return candidate;
  };
  const [f, setF] = useState({
    jobCode: existing?.jobCode ?? generateJobCode(), projectId: existing?.projectId ? String(existing.projectId) : defaultProjectId ? String(defaultProjectId) : '',
    parentId: existing?.parentId ? String(existing.parentId) : defaultParentId ? String(defaultParentId) : '',
    siteId: existing?.siteId ? String(existing.siteId) : '', budget: existing?.budget ? String(existing.budget) : '',
    description: existing?.description ?? '', status: existing?.status ?? 'Active',
  });
  const [submitting, setSubmitting] = useState(false);
  const { errors, validate } = useFormValidation<typeof f>({ siteId: required('Site') });
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const allJobs = projects.flatMap(p => p.jobs.map(j => ({ id: j.id, label: `${j.jobCode} · ${j.description || ''}` })));

  const save = async () => {
    if (!validate(f)) return;
    setSubmitting(true);
    try {
      const method = existing ? 'PUT' : 'POST';
      const body = existing ? { id: existing.id, ...f } : f;
      const r = await fetch('/api/fin/jobs', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.success) { toast.success(existing ? 'Job updated' : 'Job created'); onSaved(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
    finally { setSubmitting(false); }
  };

  return (
    <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-lg">
      <DialogHeader><DialogTitle className="text-[#f5a623]">{existing ? 'Edit Job' : defaultParentId ? 'New Sub-Job' : 'New Job'}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><label className={lbl}>Job Code</label><input className="vc-input opacity-60" value={f.jobCode} readOnly placeholder="Auto-generated" /></div>
        <div><label className={lbl}>Project</label>
          <select className="vc-input" value={f.projectId} onChange={e => set('projectId', e.target.value)}>
            <option value="">— None —</option>
            {projects.map(p => <option key={p.id} value={String(p.id)}>{p.projectCode} · {p.name}</option>)}
          </select>
        </div>
        {!defaultParentId && (
          <div><label className={lbl}>Parent Job (for sub-job)</label>
            <select className="vc-input" value={f.parentId} onChange={e => set('parentId', e.target.value)}>
              <option value="">— Top-level job —</option>
              {allJobs.map(j => <option key={j.id} value={String(j.id)}>{j.label}</option>)}
            </select>
          </div>
        )}
        <div><label className={lbl}>Site *</label>
          <select className="vc-input" value={f.siteId} onChange={e => set('siteId', e.target.value)}>
            <option value="">— Select site —</option>
            {sites.map(s => <option key={s.id} value={String(s.id)}>{s.name} ({s.siteCode})</option>)}
          </select>
        </div>
        <div><label className={lbl}>Budget (₹)</label><input className="vc-input" value={f.budget} onChange={e => set('budget', e.target.value)} placeholder="82000000" /></div>
        <div><label className={lbl}>Description</label><input className="vc-input" value={f.description} onChange={e => set('description', e.target.value)} placeholder="Phase 1 — Viaduct Section" /></div>
        <div><label className={lbl}>Status</label>
          <select className="vc-input" value={f.status} onChange={e => set('status', e.target.value)}>
            {JOB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <DialogFooter>
        <button onClick={onClose} className="vc-btn-ghost">Cancel</button>
        <button onClick={save} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}{existing ? 'Update' : 'Create'}</button>
      </DialogFooter>
    </DialogContent>
  );
}

export default function ProjectHierarchy() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<SiteRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJobs, setExpandedJobs] = useState<Set<number>>(new Set());
  const [expandedProj, setExpandedProj] = useState<Set<number>>(new Set());

  const [projForm, setProjForm] = useState<{ open: boolean; target: Project | null }>({ open: false, target: null });
  const [jobForm, setJobForm] = useState<{ open: boolean; target: Job | null; projId: number | null; parentId: number | null }>({ open: false, target: null, projId: null, parentId: null });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [hj, sj] = await Promise.all([
        fetch('/api/projects/hierarchy').then(r => r.json()),
        fetch('/api/fin/sites').then(r => r.json()),
      ]);
      if (hj.success) setProjects(hj.data);
      if (sj.success) setSites(sj.data.map((s: any) => ({ id: s.id, siteCode: s.siteCode, name: s.name })));
    } catch { toast.error('Failed to load hierarchy'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleProj = (id: number) => setExpandedProj(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleJob = (id: number) => setExpandedJobs(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const r = await fetch(`/api/projects/hierarchy?id=${deleteTarget.id}`, { method: 'DELETE' });
      const j = await r.json();
      if (j.success) { toast.success('Project deleted'); setDeleteOpen(false); await fetchData(); } else toast.error(j.error);
    } catch { toast.error('Network error'); }
  };

  const t = useMemo(() => {
    let contractValue = 0, budget = 0, jobs = 0, subJobs = 0;
    for (const p of projects) {
      contractValue += p.contractValue || 0;
      for (const j of p.jobs) { budget += j.totalBudget ?? j.budget ?? 0; jobs++; subJobs += (j.children?.length ?? 0); }
    }
    return { contractValue, budget, jobs, subJobs, projects: projects.length };
  }, [projects]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { l: 'Projects', v: t.projects, c: '#00d4ff', i: FolderKanban },
          { l: 'Jobs', v: t.jobs, c: '#f5a623', i: Briefcase },
          { l: 'Sub-Jobs', v: t.subJobs, c: '#a78bfa', i: Layers },
          { l: 'Contract Value', v: fmtCr(t.contractValue), c: '#00e676', i: IndianRupee },
          { l: 'Allocated Budget', v: fmtCr(t.budget), c: '#ffb300', i: IndianRupee },
        ].map(c => (
          <div key={c.l} className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2"><span className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">{c.l}</span><c.i size={16} style={{ color: c.c }} /></div>
            <div className="text-[20px] font-bold" style={{ color: c.c, fontFamily: "'Share Tech Mono', monospace" }}>{c.v}</div>
          </div>
        ))}
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header">
          <FolderKanban size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Project / Job Hierarchy</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{projects.length} projects</span>
          <button onClick={fetchData} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
          <button onClick={() => setProjForm({ open: true, target: null })} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Project</button>
        </div>

        <div className="divide-y divide-[#1a2028]">
          {projects.length === 0 && <div className="py-12 text-center text-[#5a6878] text-[12px]">No projects yet. Create your first contract-level project.</div>}
          {projects.map(p => {
            const isOpen = expandedProj.has(p.id);
            return (
              <div key={p.id} className="p-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleProj(p.id)} className="text-[#5a6878] hover:text-[#f5a623]">{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
                  <span className="text-[#f5a623]"><FolderKanban size={16} /></span>
                  <span className="font-mono text-[11px] text-[#5a6878]">{p.projectCode}</span>
                  <span className="font-semibold text-[#e2e8f0] text-[13px]">{p.name}</span>
                  <span className={`vc-badge ${statusBadge(p.status)}`}>{p.status}</span>
                  <span className="vc-badge bg-[#00e676]/10 text-[#00e676]">{fmtCr(p.contractValue)}</span>
                  <span className="text-[10px] text-[#5a6878] hidden md:inline">· {p.client}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <button onClick={() => setJobForm({ open: true, target: null, projId: p.id, parentId: null })} className="p-1 rounded text-[#5a6878] hover:text-[#00e676] hover:bg-[#00e676]/10" title="Add Job"><Plus size={13} /></button>
                    <button onClick={() => setProjForm({ open: true, target: p })} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button>
                    <button onClick={() => { setDeleteTarget(p); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
                  </div>
                </div>

                {p.description && <div className="ml-9 mt-1 text-[11px] text-[#5a6878]">{p.description}</div>}
                <div className="ml-9 mt-1 flex flex-wrap gap-3 text-[10px] text-[#5a6878]">
                  {p.projectManager && <span className="flex items-center gap-1"><User size={11} /> {p.projectManager}</span>}
                  {p.sector && <span>{p.sector}</span>}
                </div>

                {isOpen && (
                  <div className="ml-6 mt-3 space-y-1.5">
                    {p.jobs.length === 0 && <div className="text-[11px] text-[#5a6878] pl-4">No jobs under this project.</div>}
                    {p.jobs.map(j => {
                      const jobOpen = expandedJobs.has(j.id);
                      const hasSub = (j.children?.length ?? 0) > 0;
                      return (
                        <div key={j.id} className="bg-[#0f1318] border border-[#1a2028] rounded-lg p-2.5">
                          <div className="flex items-center gap-2">
                            {hasSub ? (
                              <button onClick={() => toggleJob(j.id)} className="text-[#5a6878] hover:text-[#f5a623]">{jobOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
                            ) : <span className="w-3.5" />}
                            <Briefcase size={13} className="text-[#a78bfa]" />
                            <span className="font-mono text-[11px] text-[#a78bfa]">{j.jobCode}</span>
                            <span className="text-[12px] text-[#e2e8f0]">{j.description || '—'}</span>
                            <span className={`vc-badge ${statusBadge(j.status)}`}>{j.status}</span>
                            <span className="text-[10px] text-[#5a6878] flex items-center gap-1"><MapPin size={11} /> {j.site?.siteCode || '—'}</span>
                            <span className="vc-badge bg-[#ffb300]/10 text-[#ffb300] ml-auto">{fmtCr(j.totalBudget ?? j.budget ?? 0)}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setJobForm({ open: true, target: null, projId: p.id, parentId: j.id })} className="p-1 rounded text-[#5a6878] hover:text-[#00e676] hover:bg-[#00e676]/10" title="Add Sub-Job"><Plus size={12} /></button>
                              <button onClick={() => setJobForm({ open: true, target: j, projId: p.id, parentId: null })} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={12} /></button>
                            </div>
                          </div>
                          {jobOpen && hasSub && (
                            <div className="ml-7 mt-1.5 space-y-1">
                              {j.children.map(s => (
                                <div key={s.id} className="flex items-center gap-2 text-[11px] py-1 px-2 bg-[#161c24]/60 rounded border border-dashed border-[#252e3a]">
                                  <span className="w-3.5" />
                                  <Layers size={11} className="text-[#00d4ff]" />
                                  <span className="font-mono text-[#00d4ff]">{s.jobCode}</span>
                                  <span className="text-[#e2e8f0]">{s.description || '—'}</span>
                                  <span className="text-[10px] text-[#5a6878] flex items-center gap-1"><MapPin size={10} /> {s.site?.siteCode || '—'}</span>
                                  <span className="vc-badge bg-[#ffb300]/10 text-[#ffb300] ml-auto">{fmtCr(s.budget || 0)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {projForm.open && (
        <Dialog open onOpenChange={() => setProjForm({ open: false, target: null })}>
          <ProjectForm existing={projForm.target} onClose={() => setProjForm({ open: false, target: null })} onSaved={async () => { setProjForm({ open: false, target: null }); await fetchData(); }} />
        </Dialog>
      )}

      {jobForm.open && (
        <Dialog open onOpenChange={() => setJobForm({ open: false, target: null, projId: null, parentId: null })}>
          <JobForm existing={jobForm.target} projects={projects} sites={sites} defaultProjectId={jobForm.projId} defaultParentId={jobForm.parentId} onClose={() => setJobForm({ open: false, target: null, projId: null, parentId: null })} onSaved={async () => { setJobForm({ open: false, target: null, projId: null, parentId: null }); await fetchData(); }} />
        </Dialog>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d]">Delete Project</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Delete <strong className="text-[#f5a623]">{deleteTarget?.projectCode}</strong> — {deleteTarget?.name}? Its jobs will remain but be detached from the project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
