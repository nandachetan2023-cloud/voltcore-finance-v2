'use client';

/**
 * Notifications — every notification for the current user in one place.
 *
 * The header bell deliberately shows only unread items and only the latest
 * few. This module is the full history: read included, filterable by source
 * and severity, searchable, paginated, and with per-row mark/unmark/delete.
 *
 * Navigation targets come from lib/notification-routing so a row opens the
 * same screen here as it does from the bell.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell, Check, CheckCheck, Trash2, Search, RefreshCw, Inbox, Undo2, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';
import {
  resolveNotificationTarget, ENTITY_LABEL, TYPE_COLOR,
} from '@/lib/notification-routing';

interface Notif {
  id: string;
  title: string;
  message: string;
  time: string;
  createdAt: string;
  type: string;
  link: string;
  isRead: boolean;
  entityType: string;
  entityId: number | null;
}

const PAGE_SIZE = 30;

type StatusFilter = 'all' | 'unread' | 'read';

export default function NotificationsModule() {
  const { setActiveModule } = useERPStore();

  const [items, setItems] = useState<Notif[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [status, setStatus] = useState<StatusFilter>('all');
  const [entityType, setEntityType] = useState<string>('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [offset, setOffset] = useState(0);

  // Access context, mirroring what the header uses to route a click.
  const [userRole, setUserRole] = useState('admin');
  const [allowedModules, setAllowedModules] = useState('all');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('erp_auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        setUserRole(u.role || 'admin');
        setAllowedModules(u.allowedModules || 'all');
      }
    } catch { /* defaults are fine */ }
  }, []);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setOffset(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(async (nextOffset: number, append: boolean) => {
    append ? setBusy(true) : setLoading(true);
    try {
      const params = new URLSearchParams({
        status,
        limit: String(PAGE_SIZE),
        offset: String(nextOffset),
      });
      if (entityType) params.set('entityType', entityType);
      if (debounced) params.set('q', debounced);

      const res = await fetch(`/api/notifications?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load');

      const rows: Notif[] = json.data.notifications || [];
      setItems(prev => (append ? [...prev, ...rows] : rows));
      setTotal(json.data.total ?? rows.length);
      setUnreadCount(json.data.unreadCount ?? 0);
      setHasMore(!!json.data.hasMore);
      setOffset(nextOffset);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
      setBusy(false);
    }
  }, [status, entityType, debounced]);

  useEffect(() => { fetchPage(0, false); }, [fetchPage]);

  const setRead = async (id: string, read: boolean) => {
    // Optimistic — the row flips immediately, and we reconcile on failure.
    setItems(prev => prev.map(n => (n.id === id ? { ...n, isRead: read } : n)));
    setUnreadCount(c => Math.max(0, c + (read ? -1 : 1)));
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id, isRead: read }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    } catch {
      toast.error('Could not update notification');
      fetchPage(0, false);
    }
  };

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    setBusy(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`Marked ${json.data?.updated ?? 0} as read`);
      fetchPage(0, false);
    } catch {
      toast.error('Failed to mark all as read');
      setBusy(false);
    }
  };

  const removeOne = async (id: string) => {
    setItems(prev => prev.filter(n => n.id !== id));
    setTotal(t => Math.max(0, t - 1));
    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    } catch {
      toast.error('Could not delete notification');
      fetchPage(0, false);
    }
  };

  const clearRead = async () => {
    const readCount = total - unreadCount;
    if (readCount <= 0) { toast.info('No read notifications to clear'); return; }
    if (!confirm(`Delete all ${readCount} read notification(s)? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearRead: true }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`Cleared ${json.data?.deleted ?? 0} notification(s)`);
      fetchPage(0, false);
    } catch {
      toast.error('Failed to clear read notifications');
      setBusy(false);
    }
  };

  // Opening a row marks it read — unlike the bell, where the explicit button
  // is the only way, because here the row is unambiguously "opened".
  const open = (n: Notif) => {
    const target = resolveNotificationTarget(n, userRole, allowedModules);
    if (!n.isRead) setRead(n.id, true);
    if (target) setActiveModule(target as any);
    else toast.info('No linked screen for this notification');
  };

  // Source chips are built from what is actually present, so a tenant without
  // tours never sees a Tour filter that returns nothing.
  const sources = useMemo(() => {
    const present = new Set(items.map(n => n.entityType).filter(Boolean));
    return Object.keys(ENTITY_LABEL).filter(k => present.has(k));
  }, [items]);

  const chip = (active: boolean) =>
    `px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
      active ? 'bg-[#f5a623] text-black' : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#1a212c]'
    }`;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-[#e2e8f0]">Notifications</h2>
          <p className="text-sm text-[#5a6878]">
            {unreadCount > 0
              ? `${unreadCount} unread of ${total} total`
              : `${total} notification${total === 1 ? '' : 's'}, all read`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchPage(0, false)}
            className="p-2 text-[#5a6878] hover:text-[#e2e8f0] transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={markAllRead}
            disabled={busy || unreadCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[#8899aa] border border-[#2e3a48] hover:text-[#e2e8f0] hover:border-[#f5a623]/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCheck size={13} /> Mark all read
          </button>
          <button
            onClick={clearRead}
            disabled={busy || total - unreadCount <= 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[#8899aa] border border-[#2e3a48] hover:text-[#ff3d3d] hover:border-[#ff3d3d]/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 size={13} /> Clear read
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="vc-panel p-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'unread', 'read'] as StatusFilter[]).map(s => (
            <button key={s} onClick={() => { setStatus(s); setOffset(0); }} className={chip(status === s)}>
              {s === 'all' ? 'All' : s === 'unread' ? `Unread${unreadCount ? ` (${unreadCount})` : ''}` : 'Read'}
            </button>
          ))}

          <div className="w-px h-5 bg-[#2e3a48] mx-1" />

          <button onClick={() => { setEntityType(''); setOffset(0); }} className={chip(entityType === '')}>
            All sources
          </button>
          {sources.map(k => (
            <button key={k} onClick={() => { setEntityType(k); setOffset(0); }} className={chip(entityType === k)}>
              {ENTITY_LABEL[k]}
            </button>
          ))}

          <div className="relative ml-auto min-w-[200px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5a6878]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notifications..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#0d1117] border border-[#2e3a48] rounded-lg text-[11px] text-[#e2e8f0] outline-none focus:border-[#f5a623] placeholder:text-[#5a6878]"
            />
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-[#5a6878]">
          <Inbox size={44} className="mx-auto mb-3 opacity-50" />
          <p className="text-[13px]">
            {debounced || entityType || status !== 'all'
              ? 'No notifications match these filters.'
              : 'No notifications yet.'}
          </p>
          {(debounced || entityType || status !== 'all') && (
            <button
              onClick={() => { setStatus('all'); setEntityType(''); setSearch(''); }}
              className="mt-3 text-[11px] text-[#f5a623] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map(n => {
            const accent = TYPE_COLOR[n.type] || '#5a6878';
            const target = resolveNotificationTarget(n, userRole, allowedModules);
            return (
              <div
                key={n.id}
                onClick={() => open(n)}
                className={`group vc-panel border-l-[3px] p-3 transition-colors ${
                  target ? 'cursor-pointer hover:bg-[#1a212c]' : 'cursor-default'
                } ${n.isRead ? 'opacity-70' : ''}`}
                style={{ borderLeftColor: accent }}
              >
                <div className="flex items-start gap-3">
                  {/* Unread marker keeps its meaning without relying on colour alone */}
                  <div className="pt-1 shrink-0">
                    {n.isRead
                      ? <div className="w-2 h-2 rounded-full border border-[#2e3a48]" />
                      : <div className="w-2 h-2 rounded-full" style={{ background: accent }} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className={`text-[12px] leading-snug ${n.isRead ? 'font-medium text-[#8899aa]' : 'font-semibold text-[#e2e8f0]'}`}>
                        {n.title}
                      </div>
                      {n.entityType && ENTITY_LABEL[n.entityType] && (
                        <span
                          className="text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                          style={{ background: `${accent}20`, color: accent }}
                        >
                          {ENTITY_LABEL[n.entityType]}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#8899aa] mt-0.5 leading-snug">{n.message}</div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[9px] text-[#5a6878]">{n.time}</span>
                      {!target && (
                        <span className="text-[9px] text-[#5a6878] italic">no linked screen</span>
                      )}
                    </div>
                  </div>

                  {/* Row actions — revealed on hover, but always reachable by keyboard */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); setRead(n.id, !n.isRead); }}
                      title={n.isRead ? 'Mark as unread' : 'Mark as read'}
                      className="w-7 h-7 rounded flex items-center justify-center text-[#5a6878] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors"
                    >
                      {n.isRead ? <Undo2 size={13} /> : <Check size={13} />}
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); removeOne(n.id); }}
                      title="Delete"
                      className="w-7 h-7 rounded flex items-center justify-center text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => fetchPage(offset + PAGE_SIZE, true)}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-semibold text-[#8899aa] border border-[#2e3a48] hover:text-[#e2e8f0] hover:border-[#f5a623]/40 disabled:opacity-40 transition-colors"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
                {busy ? 'Loading…' : `Load more (${total - items.length} remaining)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
