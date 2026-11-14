'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Wallet, Loader2, UserCog, Pencil, Check, X, AlertTriangle, Workflow, Landmark, ArrowLeftRight, Coins, Receipt, ListChecks, BookOpen, RefreshCcw, Scale, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useERPStore, type ModuleId } from '@/store/erp-store';
import { toast } from 'sonner';

interface Site {
  id: number; name: string; siteCode: string; responsiblePerson: string | null;
  contactEmail: string | null; contactPhone: string | null; pettyCashLimit: number | null; status: string;
}
interface PettyCashRecord { id: number; siteId: number | null; type: string; amount: number; approvalStatus: string; linkedType?: string | null; billAttachmentPath?: string | null; category?: string | null; site?: { name: string } | null; }
interface Fund { id: number; fundCode: string; status: string; }

function fmt(n: number) { return '₹' + (n ?? 0).toLocaleString('en-IN'); }

export default function FinPettyCashCustodian() {
  const setActiveModule = useERPStore((s) => s.setActiveModule);
  const [sites, setSites] = useState<Site[]>([]);
  const [records, setRecords] = useState<PettyCashRecord[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [reconCount, setReconCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingSiteId, setEditingSiteId] = useState<number | null>(null);
  const [editCustodian, setEditCustodian] = useState('');
  const [editLimit, setEditLimit] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sitesRes, pcRes, reconRes, fundsRes] = await Promise.all([
        fetch('/api/fin/sites'),
        fetch('/api/fin/petty-cash'),
        fetch('/api/fin/petty-cash/reconciliations'),
        fetch('/api/fin/funds'),
      ]);
      const sitesJson = await sitesRes.json();
      const pcJson = await pcRes.json();
      const reconJson = await reconRes.json();
      const fundsJson = await fundsRes.json();
      if (sitesJson.success) setSites(sitesJson.data);
      if (pcJson.success) setRecords(pcJson.data);
      if (reconJson.success && Array.isArray(reconJson.data)) setReconCount(reconJson.data.length);
      if (fundsJson.success && Array.isArray(fundsJson.data)) setFunds(fundsJson.data);
    } catch { toast.error('Failed to load custodian data'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Balance is scoped per site (Approved cash in minus cash out) — the FinPettyCash.balance
  // column itself is a single global running total across all sites, not usable here.
  const balanceBySite = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of records) {
      if (!r.siteId || r.approvalStatus !== 'Approved') continue;
      const cur = map.get(r.siteId) || 0;
      map.set(r.siteId, cur + (r.type === 'Credit' ? r.amount : -r.amount));
    }
    return map;
  }, [records]);

  const activeSites = useMemo(() => sites.filter(s => s.status === 'Active'), [sites]);

  const totals = useMemo(() => {
    const limit = activeSites.reduce((s, site) => s + (site.pettyCashLimit || 0), 0);
    const balance = activeSites.reduce((s, site) => s + (balanceBySite.get(site.id) || 0), 0);
    return { limit, balance };
  }, [activeSites, balanceBySite]);

  // Live counts powering the Petty Cash Lifecycle flow strip
  const lc = useMemo(() => ({
    fundsCreated: funds.filter(f => f.status === 'Active').length,
    hoReceipts: records.filter(r => r.category === 'HO FUND').length,
    siteAllocations: records.filter(r => r.category === 'SITE FUND').length,
    advances: records.filter(r => r.linkedType !== 'Fund' && r.type === 'Credit').length,
    withReceipts: records.filter(r => r.type === 'Debit' && r.billAttachmentPath).length,
    pending: records.filter(r => r.approvalStatus === 'Pending').length,
    posted: records.filter(r => r.approvalStatus === 'Approved' && r.type === 'Debit').length,
    overLimit: activeSites.filter(s => (s.pettyCashLimit || 0) > 0 && (balanceBySite.get(s.id) || 0) < 0).length,
  }), [activeSites, records, balanceBySite, funds]);

  const lifecycle: { n: number; icon: LucideIcon; label: string; sub: string; target: ModuleId; alert?: boolean }[] = [
    { n: 1, icon: Landmark, label: 'Fund Creation', sub: `${lc.fundsCreated} funds · sent to HO`, target: 'fin-fund-master' },
    { n: 2, icon: ArrowLeftRight, label: 'Fund Allocation', sub: `${lc.hoReceipts} HO receipts · ${lc.siteAllocations} sites`, target: 'fin-petty-cash-fund-allocation' },
    { n: 3, icon: Coins, label: 'Cash Utilization', sub: `${lc.advances} advances`, target: 'fin-petty-cash' },
    { n: 4, icon: Receipt, label: 'Expense Submission', sub: `${lc.withReceipts} with receipts`, target: 'fin-petty-cash' },
    { n: 5, icon: ListChecks, label: 'Approval & Verification', sub: lc.pending > 0 ? `${lc.pending} awaiting` : 'All clear', target: 'fin-petty-cash-approval-queue', alert: lc.pending > 0 },
    { n: 6, icon: BookOpen, label: 'Expense Posting', sub: `${lc.posted} posted to ledger`, target: 'fin-petty-cash-ledger' },
    { n: 7, icon: RefreshCcw, label: 'Cash Replenishment', sub: lc.overLimit > 0 ? `${lc.overLimit} sites over limit` : 'All funded', target: 'fin-petty-cash-replenishment', alert: lc.overLimit > 0 },
    { n: 8, icon: Scale, label: 'Reconciliation', sub: `${reconCount} counts done`, target: 'fin-petty-cash-reconciliation' },
  ];

  const startEdit = (site: Site) => {
    setEditingSiteId(site.id);
    setEditCustodian(site.responsiblePerson || '');
    setEditLimit(site.pettyCashLimit || 0);
  };

  const saveEdit = async (siteId: number) => {
    setSaving(true);
    try {
      const r = await fetch('/api/fin/sites', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: siteId, responsiblePerson: editCustodian || null, pettyCashLimit: editLimit }),
      });
      const j = await r.json();
      if (j.success) { toast.success('Custodian details updated'); setEditingSiteId(null); await fetchAll(); }
      else toast.error(j.error || 'Update failed');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Sanctioned Limit</div><div className="text-[20px] font-bold text-[#f5a623]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{fmt(totals.limit)}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Current Balance</div><div className="text-[20px] font-bold text-[#00e676]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{fmt(totals.balance)}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Sites Tracked</div><div className="text-[20px] font-bold text-[#00d4ff]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{activeSites.length}</div></div>
      </div>

      {/* Petty Cash Lifecycle flow — Fund Creation → ... → Reconciliation & Closing */}
      <div className="vc-panel">
        <div className="vc-panel-header"><Workflow size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Petty Cash Lifecycle — Fund to Close</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">Click a step to open its screen</span></div>
        <div className="p-3 flex items-stretch flex-wrap gap-y-2">
          {lifecycle.map((s, i) => (
            <div key={s.n} className="flex items-center">
              <button onClick={() => setActiveModule(s.target)} className={`flex flex-col items-start gap-1 w-[122px] shrink-0 border rounded-lg px-2.5 py-2 text-left transition-colors ${s.alert ? 'border-[#ffab40]/50 bg-[#ffab40]/5 hover:bg-[#ffab40]/10' : 'border-[#252e3a] bg-[#0f1318]/50 hover:border-[#00d4ff]/40 hover:bg-[#00d4ff]/5'}`}>
                <div className="flex items-center gap-1.5">
                  <span className={`flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-bold shrink-0 ${s.alert ? 'bg-[#ffab40] text-[#0d1117]' : 'bg-[#f5a623]/15 text-[#f5a623]'}`}>{s.n}</span>
                  <s.icon size={13} className={s.alert ? 'text-[#ffab40]' : 'text-[#00d4ff]'} />
                </div>
                <div className="text-[10px] font-semibold text-[#e2e8f0] leading-tight">{s.label}</div>
                <div className={`text-[8.5px] font-mono ${s.alert ? 'text-[#ffab40]' : 'text-[#5a6878]'}`}>{s.sub}</div>
              </button>
              {i < lifecycle.length - 1 && <ChevronRight size={12} className="text-[#3a4654] shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header"><Wallet size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Custodian Dashboard — Fund Limit &amp; Balance by Site</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{activeSites.length} sites</span></div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {activeSites.map(site => {
            const balance = balanceBySite.get(site.id) || 0;
            const limit = site.pettyCashLimit || 0;
            const utilization = limit > 0 ? Math.min(100, Math.round(((limit - balance) / limit) * 100)) : 0;
            const overLimit = limit > 0 && balance < 0;
            const nearLimit = limit > 0 && !overLimit && utilization >= 80;
            const isEditing = editingSiteId === site.id;
            return (
              <div key={site.id} className={`border rounded-lg p-3 bg-[#0f1318]/50 ${overLimit ? 'border-[#ff3d3d]/50' : nearLimit ? 'border-[#ffab40]/50' : 'border-[#252e3a]'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-[12px] font-semibold text-[#e2e8f0]">{site.name}</div>
                    <div className="text-[9px] text-[#5a6878] font-mono">{site.siteCode}</div>
                  </div>
                  {!isEditing && <button onClick={() => startEdit(site)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={12} /></button>}
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <div>
                      <label className="text-[9px] uppercase tracking-[1px] text-[#5a6878] font-bold mb-0.5 block">Custodian</label>
                      <input value={editCustodian} onChange={e => setEditCustodian(e.target.value)} className="vc-input text-[11px] py-1" placeholder="Site Incharge / Admin Executive" />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-[1px] text-[#5a6878] font-bold mb-0.5 block">Fund Limit (₹)</label>
                      <input type="number" value={editLimit || ''} onChange={e => setEditLimit(Number(e.target.value))} className="vc-input text-[11px] py-1" />
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      <button onClick={() => saveEdit(site.id)} disabled={saving} className="vc-btn-primary text-[10px] py-1 flex items-center gap-1 disabled:opacity-50"><Check size={11} /> Save</button>
                      <button onClick={() => setEditingSiteId(null)} className="vc-btn-ghost text-[10px] py-1 flex items-center gap-1"><X size={11} /> Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#8899aa] mb-2">
                      <UserCog size={12} className="shrink-0" />
                      <span className="truncate">{site.responsiblePerson || 'No custodian assigned'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <div className="text-[9px] uppercase tracking-[1px] text-[#5a6878]">Fund Limit</div>
                        <div className="text-[13px] font-mono font-semibold text-[#e2e8f0]">{fmt(limit)}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-[1px] text-[#5a6878]">Balance</div>
                        <div className={`text-[13px] font-mono font-semibold ${overLimit ? 'text-[#ff3d3d]' : 'text-[#00e676]'}`}>{fmt(balance)}</div>
                      </div>
                    </div>
                    {limit > 0 && (
                      <div className="h-1.5 w-full bg-[#252e3a] rounded-full overflow-hidden">
                        <div className={`h-full ${overLimit ? 'bg-[#ff3d3d]' : nearLimit ? 'bg-[#ffab40]' : 'bg-[#00e676]'}`} style={{ width: `${Math.max(0, utilization)}%` }} />
                      </div>
                    )}
                    {overLimit && <div className="flex items-center gap-1 text-[10px] text-[#ff3d3d] mt-1.5"><AlertTriangle size={11} /> Over sanctioned limit — replenishment needed</div>}
                    {nearLimit && !overLimit && <div className="flex items-center gap-1 text-[10px] text-[#ffab40] mt-1.5"><AlertTriangle size={11} /> Nearing sanctioned limit</div>}
                  </>
                )}
              </div>
            );
          })}
          {activeSites.length === 0 && <div className="col-span-full py-8 text-center text-[#5a6878] text-[12px]">No active sites found</div>}
        </div>
      </div>
    </div>
  );
}
