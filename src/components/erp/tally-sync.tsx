'use client';
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Send, CheckCircle2, AlertCircle, Database, Clock, Shield, FileSpreadsheet, Scale, Plug, Play, History, Download } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUserEmail } from '@/lib/current-user';

interface SyncRecord {
  id: number; syncType: string; fileName: string; totalRows: number; createdRows: number; errorRows: number;
  status: string; companyName?: string; finYear?: string; trigger?: string; actorEmail?: string;
  log?: string; syncedAt?: string; createdAt: string; direction?: string;
}
interface Counts { parties: number; invoices: number; payments: number; journalEntries: number; }
interface ReconcileDiff { accountCode: string; name: string; erpBalance: number; tallyBalance: number | null; diff: number | null; status: string; }

export default function TallySync() {
  const [activeTab, setActiveTab] = useState<'export'|'auto'|'history'|'reconcile'>('export');
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Counts>({ parties: 0, invoices: 0, payments: 0, journalEntries: 0 });
  const [alive, setAlive] = useState<boolean | null>(null);
  const [connMsg, setConnMsg] = useState('');
  const [companyName, setCompanyName] = useState('VoltCore');
  const [finYear, setFinYear] = useState(()=> {
    const d=new Date(); const y=d.getFullYear(); const m=d.getMonth();
    return m>=3 ? `${y}-${String(y+1).slice(-2)}` : `${y-1}-${String(y).slice(-2)}`;
  });
  const [selected, setSelected] = useState<Record<string, boolean>>({ parties: true, invoices: true, payments: false, journal: false, purchase: false });
  const [since, setSince] = useState('');
  const [pushing, setPushing] = useState(false);
  const [autoCfg, setAutoCfg] = useState<{enabled:boolean; autoSync:boolean; syncInterval:number} | null>(null);
  const [history, setHistory] = useState<SyncRecord[]>([]);
  const [reconcile, setReconcile] = useState<{ diffs: ReconcileDiff[]; summary: any; erp: any; tally: any } | null>(null);
  const [reconcileLoading, setReconcileLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [expRes, histRes, cfgRes] = await Promise.all([
        fetch('/api/fin/tally-export').then(r=>r.json()).catch(()=>null),
        fetch('/api/fin/tally-sync').then(r=>r.json()).catch(()=>null),
        fetch('/api/fin/sync-config').then(r=>r.json()).catch(()=>null),
      ]);
      if (expRes?.success) {
        setAlive(expRes.data.connection.alive);
        setConnMsg(expRes.data.connection.message);
        setCounts(expRes.data.counts);
      }
      if (histRes?.success) setHistory(histRes.data.slice(0,50));
      if (cfgRes?.success) {
        const tallyCfg = cfgRes.data.configs.find((c:any)=>c.module==='tally-export');
        if (tallyCfg) setAutoCfg({ enabled: tallyCfg.enabled, autoSync: tallyCfg.autoSync, syncInterval: tallyCfg.syncInterval });
      }
    } finally { setLoading(false); }
  }, []);
  useEffect(()=>{ fetchAll(); }, [fetchAll]);

  const handlePush = async (dryRun: boolean) => {
    const actions = Object.entries(selected).filter(([,v])=>v).map(([k])=>k);
    if (actions.length===0) { toast.error('Select at least one export type'); return; }
    setPushing(true);
    try {
      const res = await fetch('/api/fin/tally-export', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, finYear, since: since||undefined, actions, dryRun, trigger: 'manual', actor: getCurrentUserEmail() }),
      });
      const j = await res.json();
      if (j.success) {
        toast.success(dryRun ? `DryRun: ${j.data.partiesSent||j.data.parties||0} parties, ${j.data.vouchersSent||j.data.vouchers||0} vouchers` : `Pushed: Created ${j.data.summary?.created||0} Altered ${j.data.summary?.altered||0}`);
        if (!dryRun) fetchAll();
      } else toast.error(j.error || 'Export failed');
    } catch { toast.error('Network error'); } finally { setPushing(false); }
  };

  const toggleAuto = async (field: 'enabled'|'autoSync') => {
    if (!autoCfg) return;
    const newVal = !autoCfg[field];
    try {
      const res = await fetch('/api/fin/sync-config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: field==='enabled' ? 'toggle' : 'toggle-auto', module: 'tally-export', enabled: newVal }),
      });
      const j = await res.json();
      if (j.success) {
        setAutoCfg({...autoCfg, [field]: newVal});
        toast.success(`${field} ${newVal?'enabled':'disabled'}`);
      }
    } catch {}
  };

  const runReconcile = async () => {
    setReconcileLoading(true);
    try {
      const res = await fetch(`/api/fin/tally-reconcile?finYear=${encodeURIComponent(finYear)}&company=${encodeURIComponent(companyName)}&actor=${encodeURIComponent(getCurrentUserEmail())}`);
      const j = await res.json();
      if (j.success) { setReconcile({ diffs: j.data.diffs, summary: j.data.summary, erp: j.data.erp, tally: j.data.tally }); toast.success(j.data.summary.matched ? 'Reconciled - 0 diffs' : `${j.data.summary.diffCount} diffs found`); }
      else toast.error(j.error);
    } catch {} finally { setReconcileLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-[#e2e8f0] flex items-center gap-2"><Plug size={16} className="text-[#f5a623]" /> Tally Sync — CA-Grade</h2>
          <p className="text-[11px] text-[#5a6878]">ERP ↔ Tally Prime (port 9000) — FY-locked, GST/TDS, cost-centre, bill-wise, idempotent</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`vc-badge ${alive ? 'bg-[#00e676]/15 text-[#00e676]' : alive===false ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' : 'bg-[#252e3a] text-[#8899aa]'}`}>{alive ? 'Tally Alive' : alive===false ? 'Tally Offline' : 'Unknown'}</span>
          <button onClick={fetchAll} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><RefreshCw size={13} /> Refresh</button>
        </div>
      </div>

      {/* Connection + FY */}
      <div className="grid grid-cols-3 gap-3">
        <div className="vc-panel p-3">
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-2">Connection</div>
          <div className="text-[11px] text-[#e2e8f0]">{connMsg || 'localhost:9000'}</div>
          <div className="text-[10px] text-[#5a6878] mt-1">Counts: Parties {counts.parties} • Invoices {counts.invoices} • Payments {counts.payments} • Journals {counts.journalEntries}</div>
        </div>
        <div className="vc-panel p-3">
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-2">Company & FY</div>
          <div className="flex gap-2">
            <input value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Tally Company" className="vc-input flex-1" />
            <input value={finYear} onChange={e=>setFinYear(e.target.value)} placeholder="2025-26" className="vc-input w-[100px]" />
          </div>
          <div className="flex gap-2 mt-2">
            <input type="date" value={since} onChange={e=>setSince(e.target.value)} className="vc-input flex-1" placeholder="Since" />
            <span className="text-[10px] text-[#5a6878] flex items-center">Since filter</span>
          </div>
        </div>
        <div className="vc-panel p-3">
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-2">Auto Sync</div>
          {autoCfg ? (
            <div className="space-y-2 text-[11px]">
              <label className="flex items-center justify-between"><span className="text-[#8899aa]">Enabled</span><input type="checkbox" checked={autoCfg.enabled} onChange={()=>toggleAuto('enabled')} /></label>
              <label className="flex items-center justify-between"><span className="text-[#8899aa]">Scheduled</span><input type="checkbox" checked={autoCfg.autoSync} onChange={()=>toggleAuto('autoSync')} /></label>
              <div className="text-[10px] text-[#5a6878]">Interval: {autoCfg.syncInterval}s</div>
            </div>
          ) : <div className="text-[11px] text-[#5a6878]">No config — will auto-create on first auto run</div>}
          <button onClick={()=> fetch('/api/fin/tally-auto?dryRun=1&trigger=manual', { headers: { 'x-actor-email': getCurrentUserEmail() }}).then(r=>r.json()).then(j=> toast.info(j.success ? `Auto dryRun: ${j.data?.export?.data?.vouchers||0} vouchers` : j.error)).catch(()=>{})} className="vc-btn-ghost w-full mt-2 text-[11px]">Test Auto dryRun</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#252e3a] pb-2">
        {(['export','auto','history','reconcile'] as const).map(t=> (
          <button key={t} onClick={()=>setActiveTab(t)} className={`px-3 py-1.5 rounded text-[11px] font-semibold capitalize ${activeTab===t ? 'bg-[#f5a623] text-black' : 'bg-[#252e3a] text-[#8899aa]'}`}>{t}</button>
        ))}
      </div>

      {activeTab==='export' && (
        <div className="vc-panel p-4 space-y-3">
          <div className="text-[11px] font-bold text-[#f5a623] flex items-center gap-2"><Send size={14} /> Export ERP → Tally</div>
          <div className="grid grid-cols-3 gap-2">
            {Object.keys(selected).map(k=> (
              <label key={k} className="flex items-center gap-2 p-2 rounded bg-[#0a0d12] border border-[#252e3a] text-[11px] text-[#e2e8f0] capitalize"><input type="checkbox" checked={selected[k]} onChange={e=> setSelected(s=>({...s,[k]:e.target.checked}))} /> {k}</label>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={()=>handlePush(true)} disabled={pushing} className="vc-btn-ghost flex items-center gap-1.5 flex-1 justify-center"><FileSpreadsheet size={14} /> DryRun Preview</button>
            <button onClick={()=>handlePush(false)} disabled={pushing} className="vc-btn-primary flex items-center gap-1.5 flex-1 justify-center">{pushing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />} Push to Tally</button>
          </div>
          <div className="text-[10px] text-[#5a6878]">RBAC: GL_CREATE • FY {finYear} • Idempotent by hash • GST/TDS/CostCentre bill-wise • Journal included when checked</div>
        </div>
      )}

      {activeTab==='auto' && (
        <div className="vc-panel p-4 space-y-3">
          <div className="text-[11px] font-bold text-[#00d4ff] flex items-center gap-2"><Clock size={14} /> Triggers — All Above</div>
          <div className="grid grid-cols-3 gap-3 text-[11px]">
            <div className="p-3 rounded bg-[#0a0d12] border border-[#252e3a]"><div className="font-semibold text-[#e2e8f0] flex items-center gap-1.5"><Play size={12} /> Manual</div><div className="text-[#8899aa] mt-1">Export tab → Push button (dryRun + live)</div></div>
            <div className="p-3 rounded bg-[#0a0d12] border border-[#252e3a]"><div className="font-semibold text-[#e2e8f0] flex items-center gap-1.5"><Clock size={12} /> Scheduled</div><div className="text-[#8899aa] mt-1">Cron `GET /api/fin/tally-auto?trigger=scheduled` (reads SyncConfig autoSync)</div></div>
            <div className="p-3 rounded bg-[#0a0d12] border border-[#252e3a]"><div className="font-semibold text-[#e2e8f0] flex items-center gap-1.5"><Shield size={12} /> On Approve</div><div className="text-[#8899aa] mt-1">Journal `Posted` → auto via `tally-sync-engine` (best-effort)</div></div>
          </div>
          <div className="text-[10px] text-[#5a6878]">Enable `autoSync` in SyncConfig to activate scheduled + onApprove. Manual always works (RBAC).</div>
        </div>
      )}

      {activeTab==='history' && (
        <div className="vc-panel">
          <div className="vc-panel-header"><History size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Sync History (FinTallySync)</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{history.length}</span></div>
          <div className="max-h-[400px] overflow-y-auto">
            <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-[#0f1318]"><tr className="text-[#5a6878]"><th className="py-2 px-3 text-left">Time</th><th className="px-3">Company/FY</th><th className="px-3">Type/Trigger</th><th className="px-3">Rows</th><th className="px-3">Status</th><th className="px-3">Actor</th></tr></thead>
              <tbody className="divide-y divide-[#1a2028]">
                {history.map(h=> (
                  <tr key={h.id} className="hover:bg-[#141920]">
                    <td className="py-2 px-3 text-[#8899aa] font-mono">{new Date(h.syncedAt || h.createdAt).toLocaleString()}</td>
                    <td className="px-3 text-[#e2e8f0]">{h.companyName || '-'} / {h.finYear || '-'}</td>
                    <td className="px-3 text-[#00d4ff]">{h.syncType} / {h.trigger || h.direction}</td>
                    <td className="px-3 text-[#e2e8f0]">{h.totalRows} ({h.createdRows}c {h.errorRows}e)</td>
                    <td className="px-3"><span className={`vc-badge ${h.status==='Completed'?'bg-[#00e676]/15 text-[#00e676]':h.status==='Failed'?'bg-[#ff3d3d]/15 text-[#ff3d3d]':'bg-[#ffab40]/15 text-[#ffab40]'}`}>{h.status}</span></td>
                    <td className="px-3 text-[#8899aa]">{h.actorEmail || '-'}</td>
                  </tr>
                ))}
                {history.length===0 && <tr><td colSpan={6} className="py-8 text-center text-[#5a6878]">No syncs yet — push from Export tab</td></tr>}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {activeTab==='reconcile' && (
        <div className="vc-panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-[#a78bfa] flex items-center gap-2"><Scale size={14} /> Trial Balance Reconcile — ERP vs Tally</div>
            <button onClick={runReconcile} disabled={reconcileLoading} className="vc-btn-primary flex items-center gap-1.5 text-[11px]">{reconcileLoading ? <RefreshCw size={13} className="animate-spin" /> : <Scale size={13} />} Reconcile</button>
          </div>
          {reconcile && (
            <>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="p-2 rounded bg-[#0a0d12] border border-[#252e3a]"><div className="text-[#5a6878]">ERP Balanced</div><div className={`font-bold ${reconcile.erp.balanced?'text-[#00e676]':'text-[#ff3d3d]'}`}>{reconcile.erp.balanced?'Yes':'No'} • Dr {reconcile.erp.debitTotal?.toLocaleString()} Cr {reconcile.erp.creditTotal?.toLocaleString()}</div></div>
                <div className="p-2 rounded bg-[#0a0d12] border border-[#252e3a]"><div className="text-[#5a6878]">Tally</div><div className={`font-bold ${reconcile.tally?.alive?'text-[#00e676]':'text-[#ff3d3d]'}`}>{reconcile.tally?.alive?'Alive':'Offline'} • Ledgers {reconcile.tally?.ledgers||0}</div><div className="text-[10px] text-[#5a6878]">{reconcile.tally?.error||''}</div></div>
                <div className="p-2 rounded bg-[#0a0d12] border border-[#252e3a]"><div className="text-[#5a6878]">Diffs</div><div className={`font-bold ${reconcile.summary?.diffCount===0?'text-[#00e676]':'text-[#ff3d3d]'}`}>{reconcile.summary?.diffCount||0} diffs {reconcile.summary?.matched?'• Matched':''}</div></div>
              </div>
              <div className="max-h-[350px] overflow-y-auto border border-[#252e3a] rounded">
                <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-[#0f1318]"><tr className="text-[#5a6878]"><th className="py-2 px-3 text-left">Account</th><th className="px-3 text-right">ERP</th><th className="px-3 text-right">Tally</th><th className="px-3 text-right">Diff</th><th className="px-3">Status</th></tr></thead>
                  <tbody className="divide-y divide-[#1a2028]">
                    {reconcile.diffs.map((d,i)=> (
                      <tr key={i} className="hover:bg-[#141920]">
                        <td className="py-1.5 px-3 text-[#e2e8f0] font-mono">{d.accountCode} {d.name}</td>
                        <td className="px-3 text-right font-mono text-[#e2e8f0]">{d.erpBalance?.toLocaleString()}</td>
                        <td className="px-3 text-right font-mono text-[#8899aa]">{d.tallyBalance?.toLocaleString() ?? '-'}</td>
                        <td className={`px-3 text-right font-mono ${d.diff===0||d.diff===null?'text-[#5a6878]':'text-[#ff3d3d]'}`}>{d.diff?.toLocaleString() ?? '-'}</td>
                        <td className="px-3"><span className={`vc-badge ${d.status==='Matched'?'bg-[#00e676]/15 text-[#00e676]':'bg-[#ff3d3d]/15 text-[#ff3d3d]'}`}>{d.status}</span></td>
                      </tr>
                    ))}
                    {reconcile.diffs.length===0 && <tr><td colSpan={5} className="py-6 text-center text-[#00e676]">✓ All balances matched — TB is clean</td></tr>}
                  </tbody>
                </table>
                </div>
              </div>
              <div className="text-[10px] text-[#5a6878]">FY {reconcile.summary?.finYear || finYear} • Company {companyName} • Reconcile blocks FY close if diffs {'>'} 0</div>
            </>
          )}
          {!reconcile && <div className="text-[11px] text-[#5a6878] text-center py-6">Click Reconcile to compare ERP FinJournalLine vs Tally Trial Balance</div>}
        </div>
      )}
    </div>
  );
}
