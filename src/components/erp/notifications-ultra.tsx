'use client';
import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCircle2, Clock, AlertTriangle, Filter, RefreshCw, Archive, Eye, Send, History, Settings, Calendar, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUserEmail } from '@/lib/current-user';

interface FinNotification {
  id: number; title: string; message: string; type: string; priority: string; status: string;
  entityType: string; entityId: string; siteCode?: string; finYear?: string; amount?: number;
  link?: string; createdAt: string; isRead: boolean;
}

export default function NotificationsUltra() {
  const [activeTab, setActiveTab] = useState<'inbox'|'digest'|'prefs'|'history'>('inbox');
  const [notifications, setNotifications] = useState<FinNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterSite, setFilterSite] = useState<string>('all');
  const [filterFinYear, setFilterFinYear] = useState<string>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [digest, setDigest] = useState<string>('realtime');

  const actor = getCurrentUserEmail() || 'finance_admin@voltcore.com';

  const fetchInbox = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ actor, take: '50' });
      if (filterPriority !== 'all') params.set('priority', filterPriority);
      if (filterSite !== 'all') params.set('siteCode', filterSite);
      if (filterFinYear !== 'all') params.set('finYear', filterFinYear);
      const res = await fetch(`/api/notifications/ultra?${params.toString()}`, { headers: { 'x-actor-email': actor } });
      const j = await res.json();
      if (j.success) {
        setNotifications(j.data.notifications);
        setUnreadCount(j.data.unreadCount);
      }
    } finally { setLoading(false); }
  }, [actor, filterPriority, filterSite, filterFinYear]);

  useEffect(()=>{ fetchInbox(); }, [fetchInbox]);

  // SSE live
  useEffect(()=>{
    const es = new EventSource(`/api/notifications/stream?actor=${encodeURIComponent(actor)}`);
    es.onmessage = (e)=>{
      try {
        const data = JSON.parse(e.data);
        if (data.type==='update' && data.notifications?.length) {
          fetchInbox();
        }
      } catch {}
    };
    return ()=> es.close();
  }, [actor, fetchInbox]);

  const bulkAction = async (action: string) => {
    if (selected.size===0) { toast.error('Select notifications first'); return; }
    const ids = Array.from(selected);
    const res = await fetch('/api/notifications/ultra', {
      method: 'POST', headers: { 'Content-Type':'application/json', 'x-actor-email': actor },
      body: JSON.stringify({ action, ids, actor }),
    });
    const j = await res.json();
    if (j.success) { toast.success(`${action} ${j.updated} items`); setSelected(new Set()); fetchInbox(); }
    else toast.error(j.error);
  };

  const priorityColor = (p:string)=> p==='P0' ? 'bg-[#ff3d3d]/15 text-[#ff3d3d] border-[#ff3d3d]/30' : p==='P1' ? 'bg-[#ffab40]/15 text-[#ffab40] border-[#ffab40]/30' : 'bg-[#00e676]/10 text-[#00e676] border-[#00e676]/20';

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-[#e2e8f0] flex items-center gap-2"><Bell size={16} className="text-[#f5a623]" /> Notifications Ultra</h2>
          <p className="text-[11px] text-[#5a6878]">Purchase & Sales — FY-locked, site-scoped, P0/P1/P2, inapp+email, digest, SSE live</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="vc-badge bg-[#ff3d3d]/15 text-[#ff3d3d]">{unreadCount} unread</span>
          <button onClick={fetchInbox} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><RefreshCw size={13} /> Refresh</button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-[#252e3a] pb-2">
        {(['inbox','digest','prefs','history'] as const).map(t=> (
          <button key={t} onClick={()=>setActiveTab(t)} className={`px-3 py-1.5 rounded text-[11px] font-semibold capitalize ${activeTab===t?'bg-[#f5a623] text-black':'bg-[#252e3a] text-[#8899aa]'}`}>{t}</button>
        ))}
      </div>

      {activeTab==='inbox' && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1.5"><Filter size={12} className="text-[#5a6878]" />
              <select value={filterPriority} onChange={e=>setFilterPriority(e.target.value)} className="vc-input text-[11px] py-1"><option value="all">All Priorities</option><option value="P0">P0 Immediate</option><option value="P1">P1 Today</option><option value="P2">P2 Digest</option></select>
              <select value={filterSite} onChange={e=>setFilterSite(e.target.value)} className="vc-input text-[11px] py-1"><option value="all">All Sites</option><option value="SITE-004">SITE-004</option><option value="SITE-001">SITE-001</option></select>
              <select value={filterFinYear} onChange={e=>setFilterFinYear(e.target.value)} className="vc-input text-[11px] py-1"><option value="all">All FY</option><option value="2025-26">2025-26</option><option value="2026-27">2026-27</option></select>
            </div>
            <div className="ml-auto flex gap-1.5">
              <button onClick={()=>bulkAction('read')} className="vc-btn-ghost text-[11px] flex items-center gap-1"><Eye size={12} /> Read</button>
              <button onClick={()=>bulkAction('actioned')} className="vc-btn-ghost text-[11px] flex items-center gap-1"><CheckCircle2 size={12} /> Actioned</button>
              <button onClick={()=>bulkAction('snooze')} className="vc-btn-ghost text-[11px] flex items-center gap-1"><Clock size={12} /> Snooze 1h</button>
              <button onClick={()=>bulkAction('archive')} className="vc-btn-ghost text-[11px] flex items-center gap-1"><Archive size={12} /> Archive</button>
            </div>
          </div>

          <div className="vc-panel">
            <div className="max-h-[480px] overflow-y-auto divide-y divide-[#1a2028]">
              {notifications.map(n=> (
                <div key={n.id} className={`p-3 flex items-start gap-3 hover:bg-[#141920] ${n.status==='unread'?'bg-[#f5a623]/5':''}`}>
                  <input type="checkbox" checked={selected.has(n.id)} onChange={e=> {
                    const s=new Set(selected); if(e.target.checked) s.add(n.id); else s.delete(n.id); setSelected(s);
                  }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`vc-badge text-[10px] border ${priorityColor(n.priority)}`}>{n.priority}</span>
                      <span className={`vc-badge text-[10px] ${n.type==='error'?'bg-[#ff3d3d]/15 text-[#ff3d3d]':n.type==='warning'?'bg-[#ffab40]/15 text-[#ffab40]':'bg-[#00e676]/10 text-[#00e676]'}`}>{n.type}</span>
                      {n.siteCode && <span className="text-[10px] font-mono text-[#00d4ff] bg-[#00d4ff]/10 px-1.5 py-0.5 rounded">{n.siteCode}</span>}
                      {n.finYear && <span className="text-[10px] font-mono text-[#a78bfa] bg-[#a78bfa]/10 px-1.5 py-0.5 rounded">{n.finYear}</span>}
                      <span className="text-[10px] text-[#5a6878] ml-auto">{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-[12px] font-semibold text-[#e2e8f0] mt-1">{n.title}</div>
                    <div className="text-[11px] text-[#8899aa] line-clamp-2">{n.message}</div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[#5a6878]">
                      <span>{n.entityType} #{n.entityId}</span>
                      {n.amount!=null && <span className="font-mono text-[#f5a623]">₹{Number(n.amount).toLocaleString('en-IN')}</span>}
                      {n.link && <a href={n.link} className="text-[#00d4ff] hover:underline">Open →</a>}
                    </div>
                  </div>
                </div>
              ))}
              {notifications.length===0 && <div className="py-12 text-center text-[#5a6878] text-[11px]">No notifications — all caught up 🎉</div>}
            </div>
          </div>
        </>
      )}

      {activeTab==='digest' && (
        <div className="vc-panel p-4 space-y-3">
          <div className="text-[11px] font-bold text-[#00d4ff] flex items-center gap-2"><Calendar size={14} /> Digest Settings</div>
          <div className="grid grid-cols-4 gap-2">
            {['realtime','hourly','daily','off'].map(v=> (
              <button key={v} onClick={()=>{ setDigest(v); toast.success(`Digest: ${v}`); }} className={`p-3 rounded border text-[11px] capitalize ${digest===v?'bg-[#f5a623] text-black border-[#f5a623]':'bg-[#0a0d12] text-[#8899aa] border-[#252e3a]'}`}>{v}</button>
            ))}
          </div>
          <div className="text-[10px] text-[#5a6878]">P0 always realtime • P1/P2 batched per digest. Quiet hours 22:00-07:00 suppresses P2.</div>
        </div>
      )}

      {activeTab==='prefs' && (
        <div className="vc-panel p-4 space-y-3">
          <div className="text-[11px] font-bold text-[#a78bfa] flex items-center gap-2"><Settings size={14} /> Channel Preferences</div>
          <div className="space-y-2 text-[11px]">
            <label className="flex items-center justify-between p-2 rounded bg-[#0a0d12] border border-[#252e3a]"><span className="text-[#e2e8f0]">In-App</span><input type="checkbox" defaultChecked /></label>
            <label className="flex items-center justify-between p-2 rounded bg-[#0a0d12] border border-[#252e3a]"><span className="text-[#e2e8f0]">Email</span><input type="checkbox" defaultChecked /></label>
            <label className="flex items-center justify-between p-2 rounded bg-[#0a0d12] border border-[#252e3a]"><span className="text-[#e2e8f0]">WhatsApp</span><input type="checkbox" /></label>
          </div>
          <div className="text-[10px] text-[#5a6878]">Per-user FinNotificationPreference • stored in DB, not yet wired to email provider.</div>
        </div>
      )}

      {activeTab==='history' && (
        <div className="vc-panel p-6 text-center text-[#5a6878] text-[11px]">
          <History size={24} className="mx-auto mb-2 text-[#5a6878]" />
          History is the Inbox with status=read/actioned/archived — use filters above. Full audit via FinTallySync + FinAccessAuditLog.
        </div>
      )}
    </div>
  );
}
