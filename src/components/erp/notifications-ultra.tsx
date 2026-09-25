'use client';
import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCircle2, Clock, Filter, RefreshCw, Archive, Eye, EyeOff, Settings, Calendar, ExternalLink, Megaphone, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useERPStore, isModuleAllowed, MODULE_CONFIG, SUB_MODULES } from '@/store/erp-store';
import { getCurrentUserEmail } from '@/lib/current-user';

interface FinNotification {
  id: number; title: string; message: string; type: string; priority: string; status: string;
  entityType: string; entityId: string; siteCode?: string; finYear?: string; amount?: number;
  link?: string; createdAt: string; isRead: boolean;
}

interface FinRole { id: number; code: string; name: string; isActive: boolean }
interface FinSiteRow { id: number; siteCode: string; name: string }
interface Broadcast {
  entityId: string; title: string; message: string; type: string; priority: string;
  siteCode: string | null; createdAt: string; recipientCount: number;
}

type Channels = { inapp: boolean; email: boolean; whatsapp: boolean };
type AudienceKind = 'all' | 'role' | 'site' | 'emails';

// Screens worth linking a broadcast to — the same set the sidebar shows
// under Finance & Accounts.
const LINK_OPTIONS = SUB_MODULES['finance-accounts'] || [];

const STATUS_OPTIONS = [
  { value: '', label: 'Active (not archived)' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
  { value: 'actioned', label: 'Actioned' },
  { value: 'snoozed', label: 'Snoozed' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'Everything' },
];

export default function NotificationsUltra() {
  const { setActiveModule, allowedModules } = useERPStore();
  const [activeTab, setActiveTab] = useState<'inbox'|'digest'|'prefs'|'admin'>('inbox');
  const [notifications, setNotifications] = useState<FinNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterSite, setFilterSite] = useState<string>('all');
  const [filterFinYear, setFilterFinYear] = useState<string>('all');
  const [sites, setSites] = useState<string[]>([]);
  const [finYears, setFinYears] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [digest, setDigest] = useState<string>('realtime');
  const [channels, setChannels] = useState<Channels>({ inapp: true, email: true, whatsapp: false });

  // Admin broadcast — sending finance-wide alerts/info, gated server-side by ADMIN_CREATE.
  const [canBroadcast, setCanBroadcast] = useState(false);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [roles, setRoles] = useState<FinRole[]>([]);
  const [bcSites, setBcSites] = useState<FinSiteRow[]>([]);
  const [sending, setSending] = useState(false);
  const [bcForm, setBcForm] = useState({
    title: '', message: '', type: 'info', priority: 'P2',
    audienceKind: 'all' as AudienceKind, role: '', siteCode: '', emails: '', link: '',
  });

  // The server identifies the inbox owner from the login cookie — no email is sent from here.
  const fetchInbox = useCallback(async () => {
    try {
      const params = new URLSearchParams({ take: '100' });
      if (filterStatus) params.set('status', filterStatus);
      if (filterPriority !== 'all') params.set('priority', filterPriority);
      if (filterSite !== 'all') params.set('siteCode', filterSite);
      if (filterFinYear !== 'all') params.set('finYear', filterFinYear);
      const res = await fetch(`/api/notifications/ultra?${params.toString()}`);
      if (res.status === 401) { setSignedOut(true); return; }
      const j = await res.json();
      if (j.success) {
        setNotifications(j.data.notifications);
        setUnreadCount(j.data.unreadCount);
        setSites(j.data.sites || []);
        setFinYears(j.data.finYears || []);
      }
    } finally { setLoading(false); }
  }, [filterStatus, filterPriority, filterSite, filterFinYear]);

  useEffect(()=>{ fetchInbox(); }, [fetchInbox]);

  useEffect(() => {
    fetch('/api/notifications/ultra/preferences')
      .then(r => r.json())
      .then(j => { if (j.success) { setDigest(j.data.digest); setChannels(j.data.channels); } })
      .catch(() => {});
  }, []);

  const fetchBroadcasts = useCallback(async () => {
    const j = await fetch('/api/notifications/ultra/broadcast').then(r => r.json()).catch(() => null);
    if (j?.success) { setCanBroadcast(j.data.canBroadcast); setBroadcasts(j.data.broadcasts || []); }
  }, []);

  useEffect(() => { fetchBroadcasts(); }, [fetchBroadcasts]);

  // Role/site pickers for the audience selector — same admin endpoints
  // Finance Access Control uses, gated the same way (ADMIN_VIEW / public).
  useEffect(() => {
    if (!canBroadcast) return;
    const email = getCurrentUserEmail();
    fetch('/api/fin/rbac/roles', { headers: email ? { 'x-actor-email': email } : {} })
      .then(r => r.json()).then(j => { if (j.success) setRoles(j.data.filter((r: FinRole) => r.isActive)); }).catch(() => {});
    fetch('/api/fin/sites').then(r => r.json()).then(j => { if (j.success) setBcSites(j.data); }).catch(() => {});
  }, [canBroadcast]);

  const sendBroadcast = async () => {
    if (!bcForm.title.trim() || !bcForm.message.trim()) { toast.error('Title and message are required'); return; }
    const audience =
      bcForm.audienceKind === 'all' ? { kind: 'all' } :
      bcForm.audienceKind === 'role' ? { kind: 'role', role: bcForm.role, siteCode: bcForm.siteCode || null } :
      bcForm.audienceKind === 'site' ? { kind: 'site', siteCode: bcForm.siteCode } :
      { kind: 'emails', emails: bcForm.emails.split(/[,\n]/).map(e => e.trim()).filter(Boolean) };
    if (bcForm.audienceKind === 'role' && !bcForm.role) { toast.error('Pick a role'); return; }
    if (bcForm.audienceKind === 'site' && !bcForm.siteCode) { toast.error('Pick a site'); return; }
    if (bcForm.audienceKind === 'emails' && !(audience as any).emails.length) { toast.error('Enter at least one email'); return; }

    setSending(true);
    try {
      const res = await fetch('/api/notifications/ultra/broadcast', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: bcForm.title.trim(), message: bcForm.message.trim(), type: bcForm.type, priority: bcForm.priority, link: bcForm.link || null, audience }),
      });
      const j = await res.json();
      if (j.success) {
        toast.success(`Sent to ${j.sent} recipient${j.sent === 1 ? '' : 's'}`);
        setBcForm({ title: '', message: '', type: 'info', priority: 'P2', audienceKind: 'all', role: '', siteCode: '', emails: '', link: '' });
        fetchBroadcasts();
      } else toast.error(j.error || 'Could not send');
    } finally { setSending(false); }
  };

  // SSE live
  useEffect(()=>{
    const es = new EventSource('/api/notifications/stream');
    es.onmessage = (e)=>{
      try {
        const data = JSON.parse(e.data);
        if (data.type==='update' && data.notifications?.length) fetchInbox();
      } catch {}
    };
    return ()=> es.close();
  }, [fetchInbox]);

  const postAction = async (action: string, ids: number[]) => {
    const res = await fetch('/api/notifications/ultra', {
      method: 'POST', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ action, ids }),
    });
    return res.json();
  };

  const bulkAction = async (action: string) => {
    if (selected.size===0) { toast.error('Select notifications first'); return; }
    const j = await postAction(action, Array.from(selected));
    if (j.success) { toast.success(`${action}: ${j.updated} item${j.updated === 1 ? '' : 's'}`); setSelected(new Set()); fetchInbox(); }
    else toast.error(j.error);
  };

  const openNotification = async (n: FinNotification) => {
    if (!n.link) return;
    if (!isModuleAllowed(n.link, allowedModules)) { toast.error('You do not have access to that screen'); return; }
    if (n.status === 'unread') await postAction('read', [n.id]).catch(() => {});
    setActiveModule(n.link as any);
  };

  const savePrefs = async (patch: { digest?: string; channels?: Channels }) => {
    const res = await fetch('/api/notifications/ultra/preferences', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
    const j = await res.json();
    if (j.success) { setDigest(j.data.digest); setChannels({ ...channels, ...j.data.channels }); toast.success('Preferences saved'); }
    else toast.error(j.error || 'Could not save preferences');
  };

  const priorityColor = (p:string)=> p==='P0' ? 'bg-[#ff3d3d]/15 text-[#ff3d3d] border-[#ff3d3d]/30' : p==='P1' ? 'bg-[#ffab40]/15 text-[#ffab40] border-[#ffab40]/30' : 'bg-[#00e676]/10 text-[#00e676] border-[#00e676]/20';

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin text-[#f5a623]" size={24} /></div>;
  if (signedOut) return <div className="p-6 text-center text-[#5a6878] text-[12px]">Sign in again to see your finance notifications.</div>;

  const allSelected = notifications.length > 0 && notifications.every(n => selected.has(n.id));

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-[#e2e8f0] flex items-center gap-2"><Bell size={16} className="text-[#f5a623]" /> Notifications Ultra</h2>
          <p className="text-[11px] text-[#5a6878]">Finance alerts — invoices, AP, payments, POs, approvals, overdue items and Tally failures</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="vc-badge bg-[#ff3d3d]/15 text-[#ff3d3d]">{unreadCount} unread</span>
          <button onClick={fetchInbox} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><RefreshCw size={13} /> Refresh</button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-[#252e3a] pb-2">
        {(['inbox','digest','prefs', ...(canBroadcast ? ['admin' as const] : [])] as const).map(t=> (
          <button key={t} onClick={()=>setActiveTab(t)} className={`px-3 py-1.5 rounded text-[11px] font-semibold capitalize flex items-center gap-1 ${activeTab===t?'bg-[#f5a623] text-black':'bg-[#252e3a] text-[#8899aa]'}`}>
            {t === 'admin' && <Megaphone size={12} />}
            {t === 'prefs' ? 'Preferences' : t === 'admin' ? 'Send Alert' : t}
          </button>
        ))}
      </div>

      {activeTab==='inbox' && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex flex-wrap items-center gap-1.5"><Filter size={12} className="text-[#5a6878]" />
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="vc-input text-[11px] py-1">
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select value={filterPriority} onChange={e=>setFilterPriority(e.target.value)} className="vc-input text-[11px] py-1"><option value="all">All Priorities</option><option value="P0">P0 Immediate</option><option value="P1">P1 Today</option><option value="P2">P2 Digest</option></select>
              <select value={filterSite} onChange={e=>setFilterSite(e.target.value)} className="vc-input text-[11px] py-1">
                <option value="all">All Sites</option>
                {sites.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterFinYear} onChange={e=>setFilterFinYear(e.target.value)} className="vc-input text-[11px] py-1">
                <option value="all">All FY</option>
                {finYears.map(fy => <option key={fy} value={fy}>{fy}</option>)}
              </select>
            </div>
            <div className="ml-auto flex flex-wrap gap-1.5">
              <button onClick={()=>bulkAction('read')} className="vc-btn-ghost text-[11px] flex items-center gap-1"><Eye size={12} /> Read</button>
              <button onClick={()=>bulkAction('unread')} className="vc-btn-ghost text-[11px] flex items-center gap-1"><EyeOff size={12} /> Unread</button>
              <button onClick={()=>bulkAction('actioned')} className="vc-btn-ghost text-[11px] flex items-center gap-1"><CheckCircle2 size={12} /> Actioned</button>
              <button onClick={()=>bulkAction('snooze')} className="vc-btn-ghost text-[11px] flex items-center gap-1"><Clock size={12} /> Snooze 1h</button>
              <button onClick={()=>bulkAction('archive')} className="vc-btn-ghost text-[11px] flex items-center gap-1"><Archive size={12} /> Archive</button>
            </div>
          </div>

          <div className="vc-panel">
            {notifications.length > 0 && (
              <label className="flex items-center gap-2 px-3 py-2 border-b border-[#1a2028] text-[10px] text-[#5a6878]">
                <input type="checkbox" checked={allSelected} onChange={e => setSelected(e.target.checked ? new Set(notifications.map(n => n.id)) : new Set())} />
                Select all ({notifications.length})
              </label>
            )}
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
                      {n.status !== 'unread' && <span className="vc-badge text-[10px] bg-[#252e3a] text-[#8899aa] capitalize">{n.status}</span>}
                      {n.siteCode && <span className="text-[10px] font-mono text-[#00d4ff] bg-[#00d4ff]/10 px-1.5 py-0.5 rounded">{n.siteCode}</span>}
                      {n.finYear && <span className="text-[10px] font-mono text-[#a78bfa] bg-[#a78bfa]/10 px-1.5 py-0.5 rounded">{n.finYear}</span>}
                      <span className="text-[10px] text-[#5a6878] ml-auto">{new Date(n.createdAt).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="text-[12px] font-semibold text-[#e2e8f0] mt-1">{n.title}</div>
                    <div className="text-[11px] text-[#8899aa] line-clamp-2">{n.message}</div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[#5a6878]">
                      <span>{n.entityType} #{n.entityId}</span>
                      {n.amount!=null && <span className="font-mono text-[#f5a623]">₹{Number(n.amount).toLocaleString('en-IN')}</span>}
                      {n.link && isModuleAllowed(n.link, allowedModules) && (
                        <button onClick={() => openNotification(n)} className="text-[#00d4ff] hover:underline flex items-center gap-1">
                          Open {MODULE_CONFIG[n.link]?.title || n.link} <ExternalLink size={10} />
                        </button>
                      )}
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {['realtime','hourly','daily','off'].map(v=> (
              <button key={v} onClick={()=>savePrefs({ digest: v })} className={`p-3 rounded border text-[11px] capitalize ${digest===v?'bg-[#f5a623] text-black border-[#f5a623]':'bg-[#0a0d12] text-[#8899aa] border-[#252e3a]'}`}>{v}</button>
            ))}
          </div>
          <div className="text-[10px] text-[#5a6878]">
            <b>Off</b> stops new P1/P2 notifications for you; P0 (Tally failures, 45+ day overdue) always come through.
            Hourly/Daily are saved for the email digest, which is not connected yet — the in-app inbox stays live either way.
          </div>
        </div>
      )}

      {activeTab==='prefs' && (
        <div className="vc-panel p-4 space-y-3">
          <div className="text-[11px] font-bold text-[#a78bfa] flex items-center gap-2"><Settings size={14} /> Channel Preferences</div>
          <div className="space-y-2 text-[11px]">
            {([['inapp', 'In-App'], ['email', 'Email'], ['whatsapp', 'WhatsApp']] as const).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between p-2 rounded bg-[#0a0d12] border border-[#252e3a]">
                <span className="text-[#e2e8f0]">{label}{key !== 'inapp' && <span className="ml-2 text-[9px] text-[#5a6878]">(delivery not connected yet)</span>}</span>
                <input type="checkbox" checked={channels[key]} onChange={e => savePrefs({ channels: { ...channels, [key]: e.target.checked } })} />
              </label>
            ))}
          </div>
          <div className="text-[10px] text-[#5a6878]">Turning In-App off stops new P1/P2 finance notifications for you. P0 alerts are always delivered.</div>
        </div>
      )}

      {activeTab==='admin' && canBroadcast && (
        <div className="space-y-4">
          <div className="vc-panel p-4 space-y-3">
            <div className="text-[11px] font-bold text-[#f5a623] flex items-center gap-2"><Megaphone size={14} /> Send a Finance Notification</div>
            <p className="text-[10px] text-[#5a6878]">Use this for things the automatic alerts don't cover — a Tally maintenance window, a policy change, a filing-deadline reminder. You won't receive a copy yourself.</p>

            <input value={bcForm.title} onChange={e=>setBcForm({...bcForm, title: e.target.value})} placeholder="Title, e.g. GST filing deadline — Friday" className="vc-input text-[12px] w-full" maxLength={120} />
            <textarea value={bcForm.message} onChange={e=>setBcForm({...bcForm, message: e.target.value})} placeholder="Message" rows={3} className="vc-input text-[12px] w-full resize-none" maxLength={1000} />

            <div className="flex flex-wrap gap-2">
              <select value={bcForm.type} onChange={e=>setBcForm({...bcForm, type: e.target.value})} className="vc-input text-[11px] py-1">
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
              <select value={bcForm.priority} onChange={e=>setBcForm({...bcForm, priority: e.target.value})} className="vc-input text-[11px] py-1">
                <option value="P2">P2 — Digest</option>
                <option value="P1">P1 — Today</option>
                <option value="P0">P0 — Immediate (bypasses mute)</option>
              </select>
              <select value={bcForm.link} onChange={e=>setBcForm({...bcForm, link: e.target.value})} className="vc-input text-[11px] py-1">
                <option value="">No linked screen</option>
                {LINK_OPTIONS.map((m: any) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {([['all','Everyone'],['role','By Role'],['site','By Site'],['emails','Specific Emails']] as const).map(([k,label]) => (
                  <button key={k} onClick={()=>setBcForm({...bcForm, audienceKind: k})} className={`px-2.5 py-1 rounded text-[10px] font-semibold ${bcForm.audienceKind===k?'bg-[#00d4ff] text-black':'bg-[#0a0d12] text-[#8899aa] border border-[#252e3a]'}`}>{label}</button>
                ))}
              </div>
              {bcForm.audienceKind === 'role' && (
                <div className="flex flex-wrap gap-2">
                  <select value={bcForm.role} onChange={e=>setBcForm({...bcForm, role: e.target.value})} className="vc-input text-[11px] py-1">
                    <option value="">Pick a role…</option>
                    {roles.map(r => <option key={r.id} value={r.code}>{r.name}</option>)}
                  </select>
                  <select value={bcForm.siteCode} onChange={e=>setBcForm({...bcForm, siteCode: e.target.value})} className="vc-input text-[11px] py-1">
                    <option value="">All sites</option>
                    {bcSites.map(s => <option key={s.id} value={s.siteCode}>{s.siteCode} — {s.name}</option>)}
                  </select>
                </div>
              )}
              {bcForm.audienceKind === 'site' && (
                <select value={bcForm.siteCode} onChange={e=>setBcForm({...bcForm, siteCode: e.target.value})} className="vc-input text-[11px] py-1">
                  <option value="">Pick a site…</option>
                  {bcSites.map(s => <option key={s.id} value={s.siteCode}>{s.siteCode} — {s.name}</option>)}
                </select>
              )}
              {bcForm.audienceKind === 'emails' && (
                <textarea value={bcForm.emails} onChange={e=>setBcForm({...bcForm, emails: e.target.value})} placeholder="One email per line or comma-separated" rows={2} className="vc-input text-[11px] w-full resize-none" />
              )}
            </div>

            <button onClick={sendBroadcast} disabled={sending} className="vc-btn-primary flex items-center gap-1.5 text-[11px] disabled:opacity-50">
              <Send size={13} /> {sending ? 'Sending…' : 'Send'}
            </button>
          </div>

          <div className="vc-panel">
            <div className="p-3 border-b border-[#1a2028] text-[11px] font-semibold text-[#e2e8f0]">Recently sent</div>
            <div className="max-h-[320px] overflow-y-auto divide-y divide-[#1a2028]">
              {broadcasts.map(b => (
                <div key={b.entityId} className="p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`vc-badge text-[10px] border ${priorityColor(b.priority)}`}>{b.priority}</span>
                    {b.siteCode && <span className="text-[10px] font-mono text-[#00d4ff] bg-[#00d4ff]/10 px-1.5 py-0.5 rounded">{b.siteCode}</span>}
                    <span className="text-[10px] text-[#5a6878]">{b.recipientCount} recipient{b.recipientCount === 1 ? '' : 's'}</span>
                    <span className="text-[10px] text-[#5a6878] ml-auto">{new Date(b.createdAt).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-[12px] font-semibold text-[#e2e8f0] mt-1">{b.title}</div>
                  <div className="text-[11px] text-[#8899aa] line-clamp-2">{b.message}</div>
                </div>
              ))}
              {broadcasts.length === 0 && <div className="py-8 text-center text-[#5a6878] text-[11px]">Nothing sent yet</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
