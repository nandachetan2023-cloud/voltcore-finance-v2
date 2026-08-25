'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ListChecks, Loader2, Send, CheckCircle2, XCircle, UserCog, History } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getCurrentUserEmail } from '@/lib/current-user';

interface Site { id: number; name: string; siteCode: string; }
interface PettyCashRecord {
  id: number; voucherNo: string; date: string; description: string; amount: number; type: string;
  category: string | null; siteId: number | null; approvalStatus: string; jobCode: string | null;
  submittedBy: string | null; custodian: string | null; authorizedBy: string | null;
  site: { id: number; name: string } | null;
}
interface RbacAssignment {
  id: number; userEmail: string; userName: string | null; siteCode: string | null; isActive: boolean;
  role: { id: number; code: string; name: string; level: number; readOnly: boolean } | null;
}

function fmt(n: number) { return '₹' + (n ?? 0).toLocaleString('en-IN'); }

export default function FinPettyCashApprovalQueue() {
  const [records, setRecords] = useState<PettyCashRecord[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [assignments, setAssignments] = useState<RbacAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<PettyCashRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const email = getCurrentUserEmail();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pcRes, sitesRes, roleRes] = await Promise.all([
        fetch('/api/fin/petty-cash'),
        fetch('/api/fin/sites'),
        email ? fetch(`/api/fin/rbac/assignments?email=${encodeURIComponent(email)}`) : Promise.resolve(null),
      ]);
      const pcJson = await pcRes.json();
      const sitesJson = await sitesRes.json();
      if (pcJson.success) setRecords(pcJson.data);
      if (sitesJson.success) setSites(sitesJson.data);
      if (roleRes) {
        const roleJson = await roleRes.json();
        if (roleJson.success) setAssignments((roleJson.data || []).filter((a: RbacAssignment) => a.isActive));
      }
    } catch { toast.error('Failed to load approval queue'); }
    finally { setLoading(false); }
  }, [email]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const runAction = async (id: number, action: 'submit' | 'approve' | 'reject', comments?: string) => {
    setActionSubmitting(true);
    try {
      const r = await fetch('/api/fin/petty-cash/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, comments, actor: email }),
      });
      const j = await r.json();
      if (j.success) {
        toast.success(action === 'submit' ? 'Submitted for approval' : action === 'approve' ? 'Voucher approved' : 'Voucher rejected');
        setRejectTarget(null); setRejectReason('');
        await fetchAll();
      } else toast.error(j.error || 'Action failed');
    } catch { toast.error('Network error'); }
    finally { setActionSubmitting(false); }
  };

  const { isCustodian, isApprover, siteCodes, siteNames, highestLevel } = useMemo(() => {
    const held = assignments.filter(a => a.role);
    const codes = new Set(held.map(a => a.role!.code));
    const levels = held.map(a => a.role!.level);
    // An all-sites assignment (siteCode === null) means every site; otherwise
    // the union of the assigned site codes.
    const anyAllSites = held.some(a => !a.siteCode);
    const scoped = new Set(held.map(a => a.siteCode).filter((s): s is string => !!s));
    const siteCodesForScoping = anyAllSites ? [] : Array.from(scoped);
    return {
      isCustodian: codes.has('CUSTODIAN'),
      isApprover: !codes.has('CUSTODIAN') && levels.some(l => l >= 2),
      siteCodes: siteCodesForScoping,
      siteNames: anyAllSites ? sites : sites.filter(s => scoped.has(s.siteCode)),
      highestLevel: levels.length ? Math.max(...levels) : 0,
    };
  }, [assignments, sites]);

  const queue = useMemo(() => {
    const scoped = (r: PettyCashRecord) => {
      if (!siteCodes.length) return true; // all-sites authority
      if (!r.siteId) return false;
      const site = sites.find(s => s.id === r.siteId);
      return !!site && siteCodes.includes(site.siteCode);
    };
    if (!assignments.length) return [];
    // Custodian sees drafts/rejected it created; approvers see pending.
    if (isCustodian) {
      return records.filter(r => (r.approvalStatus === 'Draft' || r.approvalStatus === 'Rejected') && scoped(r));
    }
    if (isApprover) return records.filter(r => r.approvalStatus === 'Pending' && scoped(r));
    return [];
  }, [records, assignments, siteCodes, sites, isCustodian, isApprover]);

  const roleBadges = assignments.map((a, i) => (
    <span key={a.id || i} className="vc-badge bg-[#f5a623]/15 text-[#f5a623]">
      {a.role?.name}{a.siteCode ? ` — ${a.siteCode}` : ' — All Sites'}
    </span>
  ));

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4 p-6">
      <div className="vc-panel">
        <div className="vc-panel-header"><UserCog size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Approving As</span>
          <div className="ml-2 flex flex-wrap gap-1.5 items-center">
            {roleBadges.length ? roleBadges :
              <span className="vc-badge bg-[#5a6878]/15 text-[#5a6878]">No finance role assigned yet</span>}
          </div>
          {!assignments.length && (
            <span className="text-[10px] text-[#ff3d3d] ml-auto">Ask an admin to assign you a finance role in Finance User Management.</span>
          )}
        </div>
      </div>

      {assignments.length > 0 && (
        <div className="vc-panel">
          <div className="vc-panel-header"><ListChecks size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">
            {isCustodian ? 'Vouchers Awaiting Your Submission' : isApprover ? 'Vouchers Awaiting Your Approval' : 'Pending Vouchers'}
          </span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{queue.length}</span></div>
          <div className="overflow-x-auto"><table className="w-full text-[11px]">
            <thead><tr className="bg-[#0f1318]">{['Voucher', 'Date', 'Description', 'Site', 'Job Code', 'Type', 'Amount', 'Submitted By', ''].map(h => <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {queue.map(r => (
                <tr key={r.id} className="hover:bg-[#141920]">
                  <td className="py-2.5 px-3 text-[#f5a623] font-mono">{r.voucherNo}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.date?.split('T')[0]}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] max-w-[200px] truncate" title={r.description}>{r.description}</td>
                  <td className="py-2.5 px-3 text-[#8899aa]">{r.site?.name || '—'}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.jobCode || '—'}</td>
                  <td className="py-2.5 px-3"><span className={`vc-badge ${r.type === 'Credit' ? 'bg-[#00e676]/15 text-[#00e676]' : 'bg-[#ff3d3d]/15 text-[#ff3d3d]'}`}>{r.type}</span></td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-mono font-medium">{fmt(r.amount)}</td>
                  <td className="py-2.5 px-3 text-[#8899aa]">{r.submittedBy || r.custodian || r.authorizedBy || '—'}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex gap-1">
                      {isCustodian ? (
                        <button onClick={() => runAction(r.id, 'submit')} disabled={actionSubmitting} className="p-1 rounded text-[#5a6878] hover:text-[#f5a623] hover:bg-[#f5a623]/10 disabled:opacity-50" title="Submit for approval"><Send size={13} /></button>
                      ) : (
                        <>
                          <button onClick={() => runAction(r.id, 'approve')} disabled={actionSubmitting} className="p-1 rounded text-[#5a6878] hover:text-[#00e676] hover:bg-[#00e676]/10 disabled:opacity-50" title="Approve"><CheckCircle2 size={13} /></button>
                          <button onClick={() => { setRejectTarget(r); setRejectReason(''); }} disabled={actionSubmitting} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 disabled:opacity-50" title="Reject"><XCircle size={13} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {queue.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-[#5a6878]">Nothing waiting on you right now</td></tr>}
            </tbody>
          </table></div>
        </div>
      )}

      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader><DialogTitle className="text-[#ff3d3d] flex items-center gap-2"><XCircle size={16} /> Reject Voucher {rejectTarget?.voucherNo}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Reason for Rejection *</label><textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="vc-input min-h-[80px]" placeholder="Explain what needs to be fixed before resubmission..." /></div>
          </div>
          <DialogFooter>
            <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} className="vc-btn-ghost text-[11px]">Cancel</button>
            <button onClick={() => rejectTarget && runAction(rejectTarget.id, 'reject', rejectReason)} disabled={!rejectReason.trim() || actionSubmitting} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg px-4 py-2 text-[11px] font-semibold disabled:opacity-50">{actionSubmitting ? 'Rejecting...' : 'Reject Voucher'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {assignments.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-[#5a6878]">
          <History size={11} /> Segregation of Duties is enforced server-side — you cannot approve a voucher you submitted yourself.
        </div>
      )}
    </div>
  );
}
