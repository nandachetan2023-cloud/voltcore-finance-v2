'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Wallet, Loader2, UserCog, Pencil, Check, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Site {
  id: number; name: string; siteCode: string; responsiblePerson: string | null;
  contactEmail: string | null; contactPhone: string | null; pettyCashLimit: number | null; status: string;
}
interface PettyCashRecord { id: number; siteId: number | null; type: string; amount: number; approvalStatus: string; site?: { name: string } | null; }

function fmt(n: number) { return '₹' + (n ?? 0).toLocaleString('en-IN'); }

export default function FinPettyCashCustodian() {
  const [sites, setSites] = useState<Site[]>([]);
  const [records, setRecords] = useState<PettyCashRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSiteId, setEditingSiteId] = useState<number | null>(null);
  const [editCustodian, setEditCustodian] = useState('');
  const [editLimit, setEditLimit] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sitesRes, pcRes] = await Promise.all([
        fetch('/api/fin/sites'),
        fetch('/api/fin/petty-cash'),
      ]);
      const sitesJson = await sitesRes.json();
      const pcJson = await pcRes.json();
      if (sitesJson.success) setSites(sitesJson.data);
      if (pcJson.success) setRecords(pcJson.data);
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
