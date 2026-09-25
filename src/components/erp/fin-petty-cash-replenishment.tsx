'use client';
import { useState, useEffect, useCallback } from 'react';
import { HandCoins, Loader2, Send, Info, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUserEmail } from '@/lib/current-user';

interface Site { id: number; name: string; siteCode: string; responsiblePerson: string | null; pettyCashLimit: number | null; }
interface PettyCashRecord { id: number; voucherNo: string; date: string; amount: number; siteId: number | null; approvalStatus: string; site: { name: string } | null; }
interface RbacAssignment { id: number; siteCode: string | null; role: { code: string; name: string; level: number } | null; }
interface JobOption { id: number; jobCode: string; description: string | null; siteId: number | null; status: string; }

function fmt(n: number) { return '₹' + (n ?? 0).toLocaleString('en-IN'); }

export default function FinPettyCashReplenishment() {
  const [sites, setSites] = useState<Site[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [recent, setRecent] = useState<PettyCashRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteId, setSiteId] = useState('');
  const [jobCode, setJobCode] = useState('');
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [assignments, setAssignments] = useState<RbacAssignment[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const email = getCurrentUserEmail();
      const [sitesRes, pcRes, jobsRes, rbacRes] = await Promise.all([
        fetch('/api/fin/sites'),
        fetch('/api/fin/petty-cash'),
        fetch('/api/fin/jobs'),
        email ? fetch(`/api/fin/rbac/assignments?email=${encodeURIComponent(email)}`) : Promise.resolve(null),
      ]);
      const sitesJson = await sitesRes.json();
      const pcJson = await pcRes.json();
      const jobsJson = await jobsRes.json();
      if (sitesJson.success) setSites(sitesJson.data);
      if (jobsJson.success) setJobs((jobsJson.data ?? []).map((j: any) => ({ id: j.id, jobCode: j.jobCode, description: j.description ?? null, siteId: j.siteId ?? null, status: j.status })));
      if (pcJson.success) setRecent(pcJson.data.filter((r: any) => r.category === 'Replenishment').slice(0, 15));
      if (rbacRes) { const rbacJson = await rbacRes.json(); if (rbacJson.success) setAssignments(rbacJson.data ?? []); }
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const selectedSite = sites.find(s => String(s.id) === siteId) || null;
  // Cash is requested against a job code of the chosen site — never another
  // site's job, so the list is filtered by the selected site.
  const siteJobs = selectedSite
    ? jobs.filter(j => j.siteId === selectedSite.id && j.status !== 'Closed')
    : [];

  // Anyone holding an approve-capable role (level >= 2, not Custodian) for the selected site
  // (or all-sites) can push cash directly instead of filing a request.
  const canAllocate = assignments.some(a => {
    if (!a.role || a.role.code === 'CUSTODIAN' || a.role.level < 2) return false;
    return !a.siteCode || (selectedSite && a.siteCode === selectedSite.siteCode);
  });

  const handleSubmit = async () => {
    if (!siteId) { toast.error('Select a site'); return; }
    if (siteJobs.length > 0 && !jobCode) { toast.error('Select the job code this cash is for'); return; }
    if (!amount || amount <= 0) { toast.error('Enter a requested amount'); return; }
    setSubmitting(true);
    try {
      // 1. Create the replenishment voucher as a Draft (existing /api/fin/petty-cash endpoint,
      //    unmodified — only `siteId` is required when type=Credit + category=Replenishment).
      const createRes = await fetch('/api/fin/petty-cash', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          description: reason ? `Replenishment request: ${reason}` : 'Replenishment request',
          amount, type: 'Credit', category: 'Replenishment', siteId: Number(siteId),
          jobCode: jobCode || null,
          custodian: selectedSite?.responsiblePerson || null,
          authorizedBy: getCurrentUserEmail() || selectedSite?.responsiblePerson || null,
          remarks: reason || null,
        }),
      });
      const createJson = await createRes.json();
      if (!createJson.success) { toast.error(createJson.error || 'Failed to create request'); return; }

      // 2. Finance Head (or anyone holding an approve-capable role for this site) can push the
      //    cash directly — 'allocate' skips the Pending queue. Everyone else 'submit's it for
      //    approval; the server-side SoD check means whoever created it cannot also approve it.
      const action = canAllocate ? 'allocate' : 'submit';
      const submitRes = await fetch('/api/fin/petty-cash/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: createJson.data.id, action, actor: getCurrentUserEmail() }),
      });
      const submitJson = await submitRes.json();
      if (submitJson.success) {
        toast.success(canAllocate ? 'Cash allocated to site' : 'Replenishment request submitted for approval');
        setSiteId(''); setAmount(0); setReason('');
        await fetchAll();
      } else {
        toast.error(submitJson.error || 'Request created but could not be submitted');
      }
    } catch { toast.error('Network error'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="p-6 max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      <div className="lg:col-span-2 space-y-4">
        <div className="vc-panel">
          <div className="vc-panel-header"><HandCoins size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Petty Cash Replenishment Request</span></div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Site *</label>
                <select value={siteId} onChange={e => { setSiteId(e.target.value); setJobCode(''); }} className="vc-input appearance-none">
                  <option value="">— Select Site —</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Custodian</label>
                <input value={selectedSite?.responsiblePerson || ''} readOnly className="vc-input opacity-60" placeholder="Auto-filled from site" />
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Job Code {siteJobs.length > 0 ? '*' : ''}</label>
              <select value={jobCode} onChange={e => setJobCode(e.target.value)} disabled={!selectedSite} className="vc-input appearance-none disabled:opacity-50">
                <option value="">{!selectedSite ? '— Select a site first —' : siteJobs.length === 0 ? '— No active jobs for this site —' : '— Select Job —'}</option>
                {siteJobs.map(j => <option key={j.id} value={j.jobCode}>{j.jobCode} — {j.description || 'Untitled'}</option>)}
              </select>
              <p className="text-[9px] text-[#5a6878] mt-1">The float is requested against this job, so the spend lands on the right cost centre.</p>
            </div>
            {selectedSite?.pettyCashLimit ? (
              <div className="text-[10px] text-[#5a6878]">Sanctioned fund limit for this site: <span className="text-[#e2e8f0] font-mono">{fmt(selectedSite.pettyCashLimit)}</span></div>
            ) : null}
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Requested Amount (₹) *</label>
              <input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Reason</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} className="vc-input min-h-[70px]" placeholder="Why is replenishment needed..." />
            </div>
            <button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} {canAllocate ? 'Allocate Now' : 'Submit Replenishment Request'}
            </button>
            <p className="text-[10px] text-[#5a6878]">
              {canAllocate
                ? 'You hold an approval role for this site — cash is allocated immediately, no queue.'
                : 'Submitted requests land in the Approval Queue as Pending. Segregation of Duties is enforced server-side — the person who submits a request cannot also approve it.'}
            </p>
          </div>
        </div>

        <div className="vc-panel">
          <div className="vc-panel-header"><span className="text-[12px] font-semibold text-[#e2e8f0]">Recent Replenishment Requests</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{recent.length}</span></div>
          <div className="overflow-x-auto"><table className="w-full text-[11px]">
            <thead><tr className="bg-[#0f1318]">{['Voucher', 'Date', 'Site', 'Amount', 'Status'].map(h => <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {recent.map(r => (
                <tr key={r.id} className="hover:bg-[#141920]">
                  <td className="py-2.5 px-3 text-[#f5a623] font-mono">{r.voucherNo}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.date?.split('T')[0]}</td>
                  <td className="py-2.5 px-3 text-[#8899aa]">{r.site?.name || '—'}</td>
                  <td className="py-2.5 px-3 text-[#00e676] font-mono">{fmt(r.amount)}</td>
                  <td className="py-2.5 px-3"><span className={`vc-badge ${r.approvalStatus === 'Approved' ? 'bg-[#00e676]/15 text-[#00e676]' : r.approvalStatus === 'Rejected' ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' : r.approvalStatus === 'Pending' ? 'bg-[#ffab40]/15 text-[#ffab40]' : 'bg-[#5a6878]/15 text-[#5a6878]'}`}>{r.approvalStatus}</span></td>
                </tr>
              ))}
              {recent.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-[#5a6878]">No replenishment requests yet</td></tr>}
            </tbody>
          </table></div>
        </div>
      </div>

      <div className="lg:sticky lg:top-4 space-y-4">
        <div className="vc-panel">
          <div className="vc-panel-header"><Info size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">What is a Replenishment Request?</span></div>
          <div className="p-4 space-y-3 text-[11px] text-[#8899aa] leading-relaxed">
            <p>This is how a site's petty cash float gets topped up. A site spends its cash on day-to-day expenses (fuel, travel, consumables); once that float runs low, someone requests fresh cash here.</p>
            <div className="flex items-start gap-2">
              <div className="mt-0.5 h-4 w-4 rounded-full bg-[#f5a623]/15 text-[#f5a623] flex items-center justify-center text-[9px] font-bold shrink-0">1</div>
              <p><span className="text-[#e2e8f0] font-medium">Pick the site</span> — custodian and fund limit auto-fill from the Site Master.</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5 h-4 w-4 rounded-full bg-[#f5a623]/15 text-[#f5a623] flex items-center justify-center text-[9px] font-bold shrink-0">2</div>
              <p><span className="text-[#e2e8f0] font-medium">Enter the amount &amp; reason</span> — a Credit voucher is created as a Draft.</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5 h-4 w-4 rounded-full bg-[#f5a623]/15 text-[#f5a623] flex items-center justify-center text-[9px] font-bold shrink-0">3</div>
              <p><span className="text-[#e2e8f0] font-medium">Routed automatically</span> — if you hold an approval role for that site, cash is allocated instantly. Otherwise it goes to the Approval Queue as Pending.</p>
            </div>
          </div>
        </div>

        <div className="vc-panel">
          <div className="vc-panel-header"><ShieldCheck size={15} className="text-[#00e676]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Who does what</span></div>
          <div className="p-4 space-y-2 text-[11px] text-[#8899aa]">
            <div className="flex items-center gap-2"><ArrowRight size={11} className="text-[#5a6878] shrink-0" /><span><span className="text-[#e2e8f0]">Site Employee</span> — requests cash for a job code</span></div>
            <div className="flex items-center gap-2"><ArrowRight size={11} className="text-[#5a6878] shrink-0" /><span><span className="text-[#e2e8f0]">Site Manager</span> — approves expense requests for their site</span></div>
            <div className="flex items-center gap-2"><ArrowRight size={11} className="text-[#5a6878] shrink-0" /><span><span className="text-[#e2e8f0]">Finance Head</span> — allocates float to sites directly, no queue</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
