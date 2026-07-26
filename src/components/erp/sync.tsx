'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw,
  Users,
  Package,
  TrendingUp,
  FolderKanban,
  CreditCard,
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  Zap,
  Activity,
  Loader2,
  ArrowDownUp,
  XCircle,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SyncLog {
  id: string;
  module: string;
  action: string;
  recordId: string | null;
  status: string;
  direction: string;
  conflictReason: string | null;
  recordsSynced: number;
  duration: number;
  startedAt: string;
  completedAt: string | null;
}

interface SyncConfig {
  id: string;
  module: string;
  enabled: boolean;
  autoSync: boolean;
  lastSyncAt: string | null;
  lastStatus: string;
  totalSynced: number;
  totalErrors: number;
}

interface SyncStats {
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  totalRecordsSynced: number;
  overallStatus: string;
  activeSyncs: number;
  totalConflicts: number;
}

interface SyncState {
  syncStatus: 'idle' | 'syncing' | 'complete' | 'error';
  moduleStatuses: Map<string, { status: string; progress: number }>;
  syncLogs: SyncLog[];
  syncConfigs: SyncConfig[];
  stats: SyncStats;
}

type ModuleKey = 'employees' | 'projects' | 'finance' | 'equipment';

/* ------------------------------------------------------------------ */
/*  SSE Hook — real-time sync progress                                  */
/* ------------------------------------------------------------------ */

interface SyncStreamEvent {
  module?: string
  progress?: number
  recordsSynced?: number
  status?: string
  batchId?: string
  summary?: { totalRecordsSynced: number; totalErrors: number }
}

function useSyncStream(onComplete?: (summary: SyncStreamEvent['summary']) => void) {
  const moduleProgressRef = useRef<Map<string, { progress: number; recordsSynced: number }>>(new Map())
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Read the live batchId from the window variable set by triggerSync
    const getBatchId = () => (window as unknown as Record<string, unknown>).__currentSyncBatchId as string | null | undefined

    const connect = () => {
      const batchId = getBatchId()
      if (!batchId) return // not yet triggered

      esRef.current = new EventSource(`/api/sync/stream?batchId=${encodeURIComponent(batchId)}`)

      esRef.current.addEventListener('connected', () => {})

      esRef.current.addEventListener('progress', (e: MessageEvent) => {
        const data: SyncStreamEvent = JSON.parse(e.data)
        if (data.module) {
          moduleProgressRef.current.set(data.module, {
            progress: data.progress ?? 0,
            recordsSynced: data.recordsSynced ?? 0,
          })
        }
      })

      esRef.current.addEventListener('module_complete', (e: MessageEvent) => {
        const data: SyncStreamEvent = JSON.parse(e.data)
        if (data.module) {
          moduleProgressRef.current.set(data.module, {
            progress: 100,
            recordsSynced: data.recordsSynced ?? 0,
          })
        }
      })

      esRef.current.addEventListener('sync_complete', (e: MessageEvent) => {
        const data: SyncStreamEvent = JSON.parse(e.data)
        esRef.current?.close()
        onComplete?.(data.summary)
      })

      esRef.current.onerror = () => {
        esRef.current?.close()
      }
    }

    connect()
    return () => { esRef.current?.close() }
  }, [onComplete])

  return moduleProgressRef
}

/* ------------------------------------------------------------------ */
/*  Module definitions                                                  */
/* ------------------------------------------------------------------ */

const MODULE_DEFS: Record<ModuleKey, { name: string; icon: React.ElementType; color: string; description: string }> = {
  employees: {
    name: 'Employees',
    icon: Users,
    color: '#f5a623',
    description: 'HRMS module',
  },
  projects: {
    name: 'Projects',
    icon: FolderKanban,
    color: '#a78bfa',
    description: 'Projects & sites',
  },
  finance: {
    name: 'Finance',
    icon: CreditCard,
    color: '#ffab40',
    description: 'Ledger, invoices, POs',
  },
  equipment: {
    name: 'Equipment',
    icon: Wrench,
    color: '#ff3d3d',
    description: 'Equipment & permits',
  },
};

const MODULE_KEYS: ModuleKey[] = ['employees', 'projects', 'finance', 'equipment'];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ${secs % 60}s`;
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'synced':
    case 'success':
    case 'completed':
      return CheckCircle2;
    case 'pending':
      return Clock;
    case 'syncing':
    case 'in_progress':
      return Loader2;
    case 'error':
      return XCircle;
    case 'conflict':
      return AlertCircle;
    default:
      return AlertTriangle;
  }
}

function getStatusColor(status: string): { bg: string; text: string; border: string; dot: string } {
  switch (status) {
    case 'synced':
    case 'success':
    case 'completed':
      return { bg: 'bg-[#00e676]/10', text: 'text-[#00e676]', border: 'border-[#00e676]/20', dot: 'bg-[#00e676]' };
    case 'pending':
      return { bg: 'bg-[#8899aa]/10', text: 'text-[#8899aa]', border: 'border-[#8899aa]/20', dot: 'bg-[#8899aa]' };
    case 'syncing':
    case 'in_progress':
      return { bg: 'bg-[#3b82f6]/10', text: 'text-[#3b82f6]', border: 'border-[#3b82f6]/20', dot: 'bg-[#3b82f6]' };
    case 'error':
      return { bg: 'bg-[#ff3d3d]/10', text: 'text-[#ff3d3d]', border: 'border-[#ff3d3d]/20', dot: 'bg-[#ff3d3d]' };
    case 'conflict':
      return { bg: 'bg-[#f59e0b]/10', text: 'text-[#f59e0b]', border: 'border-[#f59e0b]/20', dot: 'bg-[#f59e0b]' };
    default:
      return { bg: 'bg-[#8899aa]/10', text: 'text-[#8899aa]', border: 'border-[#8899aa]/20', dot: 'bg-[#8899aa]' };
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'synced':
    case 'success':
    case 'completed':
      return 'Synced';
    case 'pending':
      return 'Pending';
    case 'syncing':
    case 'in_progress':
      return 'Syncing';
    case 'error':
      return 'Error';
    case 'conflict':
      return 'Conflict';
    default:
      return status;
  }
}

/* ------------------------------------------------------------------ */
/*  Animated dots                                                       */
/* ------------------------------------------------------------------ */

function AnimatedDots() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return <span>{dots}</span>;
}

/* ------------------------------------------------------------------ */
/*  Pulsing sync indicator                                              */
/* ------------------------------------------------------------------ */

function PulsingSyncIcon({ color }: { color: string }) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <div
        className="absolute inset-0 rounded-full animate-ping opacity-30"
        style={{ background: color }}
      />
      <RefreshCw
        size={18}
        className="animate-spin relative"
        style={{ color }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton loaders                                                   */
/* ------------------------------------------------------------------ */

function StatusBarSkeleton() {
  return (
    <div className="vc-panel">
      <div className="vc-panel-body">
        <div className="flex items-center gap-4 flex-wrap">
          <Skeleton className="h-10 w-10 rounded-full bg-[#1e252e]" />
          <div className="space-y-2 flex-1 min-w-[200px]">
            <Skeleton className="h-5 w-32 rounded bg-[#1e252e]" />
            <Skeleton className="h-3 w-48 rounded bg-[#1e252e]" />
          </div>
          <Skeleton className="h-9 w-24 rounded-md bg-[#1e252e]" />
        </div>
      </div>
    </div>
  );
}

function ModuleCardSkeleton() {
  return (
    <div className="vc-panel">
      <div className="vc-panel-body space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg bg-[#1e252e]" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-24 rounded bg-[#1e252e]" />
            <Skeleton className="h-3 w-16 rounded bg-[#1e252e]" />
          </div>
          <Skeleton className="h-5 w-16 rounded bg-[#1e252e]" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full bg-[#1e252e]" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20 rounded bg-[#1e252e]" />
          <Skeleton className="h-7 w-16 rounded-md bg-[#1e252e]" />
        </div>
      </div>
    </div>
  );
}

function LogSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e252e]">
      <Skeleton className="h-4 w-16 rounded bg-[#1e252e] shrink-0" />
      <Skeleton className="h-4 w-20 rounded bg-[#1e252e] shrink-0" />
      <Skeleton className="h-4 w-10 rounded bg-[#1e252e] shrink-0" />
      <Skeleton className="h-4 w-12 rounded bg-[#1e252e] shrink-0" />
      <Skeleton className="h-5 w-14 rounded bg-[#1e252e] shrink-0" />
      <Skeleton className="h-4 w-10 rounded bg-[#1e252e] shrink-0" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function SyncDashboard() {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'complete' | 'error'>('idle');
  const [moduleStatuses, setModuleStatuses] = useState<Map<string, { status: string; progress: number }>>(new Map());
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [syncConfigs, setSyncConfigs] = useState<SyncConfig[]>([]);
  const [stats, setStats] = useState<SyncStats>({
    lastSyncAt: null,
    nextSyncAt: null,
    totalRecordsSynced: 0,
    overallStatus: 'idle',
    activeSyncs: 0,
    totalConflicts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingConflict, setResolvingConflict] = useState<string | null>(null);
  const [syncingModules, setSyncingModules] = useState<Set<string>>(new Set());
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'error' | 'conflict'>('all');
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Fetch sync data                                                  */
  /* ---------------------------------------------------------------- */

  const fetchSyncData = useCallback(async () => {
    try {
      const res = await fetch('/api/sync');
      if (!res.ok) throw new Error('Failed to fetch sync status');
      const json = await res.json();

      if (json.success) {
        const data = json.data;
        setSyncConfigs(data.configs || []);
        setSyncLogs(data.recentLogs || []);
        setStats({
          lastSyncAt: null,
          nextSyncAt: null,
          totalRecordsSynced: data.summary?.totalRecordsSynced || 0,
          overallStatus: data.summary?.totalErrors > 0 ? 'error' : 'idle',
          activeSyncs: 0,
          totalConflicts: data.summary?.totalConflicts || 0,
        } as SyncStats);

        // Build module statuses from configs
        const statuses = new Map<string, { status: string; progress: number }>();
        (data.configs || []).forEach((cfg: SyncConfig) => {
          statuses.set(cfg.module, {
            status: cfg.lastStatus || 'idle',
            progress: cfg.lastStatus === 'syncing' ? 0 : 100,
          });
        });

        // Check if any modules are actively syncing
        const hasActiveSync = (data.configs || []).some(
          (cfg: SyncConfig) => cfg.lastStatus === 'syncing' || cfg.lastStatus === 'in_progress'
        );

        if (hasActiveSync) {
          setSyncStatus('syncing');
          const activeModules = new Set<string>(
            (data.configs || [])
              .filter((cfg: SyncConfig) => cfg.lastStatus === 'syncing' || cfg.lastStatus === 'in_progress')
              .map((cfg: SyncConfig) => cfg.module)
          );
          setSyncingModules(activeModules);

          // Simulate progress for actively syncing modules
          activeModules.forEach((mod) => {
            const current = statuses.get(mod);
            if (current && current.progress === 0) {
              statuses.set(mod, { status: 'syncing', progress: Math.floor(Math.random() * 40) + 10 });
            }
          });
        } else {
          setSyncStatus('idle');
          setSyncingModules(new Set());
        }

        setModuleStatuses(statuses);
      }
    } catch (err) {
      console.error('Fetch sync data error:', err);
      // Don't overwrite existing data on poll failure
      if (loading) {
        setError(err instanceof Error ? err.message : 'Failed to load sync data');
      }
    } finally {
      setLoading(false);
    }
  }, [loading]);

  /* ---------------------------------------------------------------- */
  /*  Initial fetch                                                    */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    fetchSyncData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Real-time sync progress via SSE                                  */
  /* ---------------------------------------------------------------- */

  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSyncComplete = useCallback((summary?: { totalRecordsSynced: number; totalErrors: number }) => {
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current)
    setSyncStatus('complete')
    setSyncingModules(new Set())
    if (summary) {
      setStats(prev => ({
        ...prev,
        totalRecordsSynced: summary.totalRecordsSynced,
        overallStatus: summary.totalErrors > 0 ? 'error' : 'idle',
      }))
    }
    fetchSyncData()
    setTimeout(() => setSyncStatus('idle'), 3000)
  }, [fetchSyncData])

  const moduleProgressRef = useSyncStream(handleSyncComplete)

  /* ---------------------------------------------------------------- */
  /*  Sync progress from SSE into moduleStatuses                        */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (syncStatus !== 'syncing') return

    const interval = setInterval(() => {
      const progress = moduleProgressRef.current
      if (progress.size === 0) return

      setModuleStatuses(prev => {
        const next = new Map(prev)
        let changed = false
        progress.forEach((val, mod) => {
          const cur = next.get(mod)
          if (!cur || cur.progress !== val.progress) {
            next.set(mod, { status: val.progress >= 100 ? 'success' : 'syncing', progress: val.progress })
            changed = true
          }
        })
        return changed ? next : prev
      })
    }, 500)

    return () => clearInterval(interval)
  }, [syncStatus, moduleProgressRef])

  /* ---------------------------------------------------------------- */
  /*  Trigger full sync                                                */
  /* ---------------------------------------------------------------- */

  const triggerSync = useCallback(async (modules?: ModuleKey[]) => {
    try {
      setSyncStatus('syncing');
      setModuleStatuses(prev => {
        const next = new Map(prev);
        (modules || MODULE_KEYS).forEach(m => next.set(m, { status: 'syncing', progress: 0 }));
        return next;
      });

      const body = modules
        ? { action: 'trigger' as const, modules }
        : { action: 'trigger' as const };

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Sync failed');
      const json = await res.json();

      const newBatchId: string = json.data?.batchId ?? null
      // Store batchId in a module-level variable accessible by the SSE hook
      ;(window as unknown as Record<string, unknown>).__currentSyncBatchId = newBatchId
      setSyncingModules(new Set(modules || MODULE_KEYS))

      // Safety timeout — if SSE doesn't fire sync_complete within 2 min, treat as done
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current)
      safetyTimeoutRef.current = setTimeout(() => {
        setSyncStatus('complete');
        setSyncingModules(new Set());
        fetchSyncData();
        setTimeout(() => setSyncStatus('idle'), 3000);
      }, 120_000)
    } catch (err) {
      setSyncStatus('error');
      setSyncingModules(new Set());
      setError(err instanceof Error ? err.message : 'Sync failed');
      setTimeout(() => {
        setSyncStatus('idle');
        setError(null);
      }, 3000);
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Trigger single module sync                                       */
  /* ---------------------------------------------------------------- */

  const triggerModuleSync = useCallback(async (moduleKey: ModuleKey) => {
    await triggerSync([moduleKey]);
  }, [triggerSync]);

  /* ---------------------------------------------------------------- */
  /*  Toggle auto-sync                                                 */
  /* ---------------------------------------------------------------- */

  const toggleAutoSync = useCallback(async (moduleKey: string, enabled: boolean) => {
    // Optimistic update
    setSyncConfigs(prev =>
      prev.map(cfg => (cfg.module === moduleKey ? { ...cfg, autoSync: enabled } : cfg))
    );

    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-auto', module: moduleKey, enabled }),
      });
    } catch {
      // Revert on error
      setSyncConfigs(prev =>
        prev.map(cfg => (cfg.module === moduleKey ? { ...cfg, autoSync: !enabled } : cfg))
      );
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Resolve conflict                                                 */
  /* ---------------------------------------------------------------- */

  const resolveConflict = useCallback(async (logId: string) => {
    setResolvingConflict(logId);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', logId }),
      });
      if (res.ok) {
        // Update log locally
        setSyncLogs(prev =>
          prev.map(log => (log.id === logId ? { ...log, status: 'resolved' } : log))
        );
      }
    } catch {
      // ignore
    } finally {
      setResolvingConflict(null);
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Derived values                                                   */
  /* ---------------------------------------------------------------- */

  const overallHealthColor = syncStatus === 'syncing'
    ? '#3b82f6'
    : stats.overallStatus === 'error'
    ? '#ff3d3d'
    : stats.totalConflicts > 0
    ? '#f59e0b'
    : '#00e676';

  const overallHealthLabel = syncStatus === 'syncing'
    ? 'Syncing'
    : syncStatus === 'error'
    ? 'Error'
    : stats.overallStatus === 'error'
    ? 'Error'
    : stats.totalConflicts > 0
    ? 'Has Conflicts'
    : 'All Synced';

  const filteredLogs = logFilter === 'all'
    ? syncLogs
    : syncLogs.filter(log => {
        if (logFilter === 'success') return log.status === 'success' || log.status === 'completed';
        if (logFilter === 'error') return log.status === 'error';
        if (logFilter === 'conflict') return log.status === 'conflict';
        return true;
      });

  /* ---------------------------------------------------------------- */
  /*  Loading state                                                    */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="space-y-4">
        <StatusBarSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ModuleCardSkeleton key={i} />
          ))}
        </div>
        <div className="vc-panel">
          <div className="vc-panel-header">
            <Skeleton className="h-4 w-32 rounded bg-[#1e252e]" />
          </div>
          <div className="vc-panel-body p-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <LogSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Error state                                                      */
  /* ---------------------------------------------------------------- */

  if (error && syncStatus !== 'syncing') {
    return (
      <div className="vc-panel">
        <div className="vc-panel-body text-center py-12">
          <AlertTriangle size={40} className="mx-auto text-[#ff3d3d] mb-3" />
          <div className="text-[#e2e8f0] text-sm font-semibold mb-1">Failed to load sync dashboard</div>
          <div className="text-[#8899aa] text-xs mb-4">{error}</div>
          <button className="vc-btn-primary" onClick={fetchSyncData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-4 p-6">
      {/* ============================================================ */}
      {/*  TOP SECTION — Sync Status Bar                                */}
      {/* ============================================================ */}
      <div className="vc-panel">
        <div className="vc-panel-body">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Health Indicator */}
            <div className="flex items-center gap-3">
              {syncStatus === 'syncing' ? (
                <PulsingSyncIcon color={overallHealthColor} />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: `${overallHealthColor}15`, border: `2px solid ${overallHealthColor}40` }}
                >
                  {syncStatus === 'error' || stats.overallStatus === 'error' ? (
                    <XCircle size={20} style={{ color: overallHealthColor }} />
                  ) : (
                    <ShieldCheck size={20} style={{ color: overallHealthColor }} />
                  )}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[13px] font-bold"
                    style={{ color: overallHealthColor }}
                  >
                    {overallHealthLabel}
                    {syncStatus === 'syncing' && <AnimatedDots />}
                  </span>
                  {syncStatus === 'complete' && (
                    <span className="text-[10px] text-[#00e676] font-semibold animate-pulse">
                      ✓ Done
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[#5a6878]">
                  {stats.lastSyncAt
                    ? `Last sync: ${timeAgo(stats.lastSyncAt)}`
                    : 'Never synced'}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-10 bg-[#252e3a]" />

            {/* Stats */}
            <div className="flex items-center gap-5 flex-wrap flex-1">
              <div className="flex items-center gap-2">
                <Activity size={13} className="text-[#8899aa]" />
                <div>
                  <div
                    className="text-[16px] font-bold leading-none"
                    style={{ fontFamily: "'Share Tech Mono', monospace", color: '#e2e8f0' }}
                  >
                    {(stats.totalRecordsSynced ?? 0).toLocaleString()}
                  </div>
                  <div className="text-[9px] text-[#5a6878] font-medium uppercase tracking-wider">
                    Records Synced
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock size={13} className="text-[#8899aa]" />
                <div>
                  <div
                    className="text-[12px] font-semibold leading-none text-[#e2e8f0]"
                  >
                    {stats.nextSyncAt
                      ? new Date(stats.nextSyncAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })
                      : '--:--'}
                  </div>
                  <div className="text-[9px] text-[#5a6878] font-medium uppercase tracking-wider">
                    Next Sync
                  </div>
                </div>
              </div>

              {stats.activeSyncs > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse" />
                  <div>
                    <div
                      className="text-[12px] font-semibold leading-none text-[#3b82f6]"
                    >
                      {stats.activeSyncs}
                    </div>
                    <div className="text-[9px] text-[#5a6878] font-medium uppercase tracking-wider">
                      Active
                    </div>
                  </div>
                </div>
              )}

              {stats.totalConflicts > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle size={13} className="text-[#f59e0b]" />
                  <div>
                    <div
                      className="text-[12px] font-semibold leading-none text-[#f59e0b]"
                    >
                      {stats.totalConflicts}
                    </div>
                    <div className="text-[9px] text-[#5a6878] font-medium uppercase tracking-wider">
                      Conflicts
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sync Now Button */}
            <button
              className="vc-btn-primary flex items-center gap-2 !px-5 !py-2.5 !text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={syncStatus === 'syncing'}
              onClick={() => triggerSync()}
            >
              {syncStatus === 'syncing' ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Syncing<AnimatedDots />
                </>
              ) : (
                <>
                  <Zap size={14} />
                  Sync Now
                </>
              )}
            </button>
          </div>

          {/* Overall progress bar during sync */}
          {syncStatus === 'syncing' && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-[#5a6878] font-medium uppercase tracking-wider">
                  Overall Progress
                </span>
                <span className="text-[10px] text-[#3b82f6] font-semibold" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {syncingModules.size > 0
                    ? `${Array.from(moduleStatuses.entries())
                        .filter(([key]) => syncingModules.has(key))
                        .reduce((acc, [, val]) => acc + val.progress, 0) /
                        Math.max(syncingModules.size, 1)}%`
                    : '0%'}
                </span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#1e252e' }}>
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${syncingModules.size > 0
                      ? Array.from(moduleStatuses.entries())
                          .filter(([key]) => syncingModules.has(key))
                          .reduce((acc, [, val]) => acc + val.progress, 0) /
                        Math.max(syncingModules.size, 1)
                      : 0}%`,
                    background: 'linear-gradient(90deg, #3b82f6, #00d4ff)',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  MIDDLE SECTION — Module Sync Cards Grid                       */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {MODULE_KEYS.map((moduleKey) => {
          const def = MODULE_DEFS[moduleKey];
          const config = syncConfigs.find(c => c.module === moduleKey);
          const moduleState = moduleStatuses.get(moduleKey) || { status: 'idle', progress: 100 };
          const isSyncing = syncingModules.has(moduleKey);
          const statusColors = getStatusColor(moduleState.status);
          const StatusIcon = getStatusIcon(moduleState.status);

          return (
            <div
              key={moduleKey}
              className="vc-panel transition-all duration-200 hover:border-[#2e3a48] group"
              style={isSyncing ? { borderColor: '#3b82f640' } : {}}
            >
              <div className="vc-panel-body space-y-3">
                {/* Header row */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                    style={{ background: `${def.color}15` }}
                  >
                    {isSyncing ? (
                      <Loader2 size={18} className="animate-spin" style={{ color: def.color }} />
                    ) : (
                      <def.icon size={18} style={{ color: def.color }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-[#e2e8f0]">{def.name}</div>
                    <div className="text-[10px] text-[#5a6878]">{def.description}</div>
                  </div>
                  <span
                    className={`vc-badge ${statusColors.bg} ${statusColors.text}`}
                    style={{ border: `1px solid ${statusColors.border}` }}
                  >
                    <StatusIcon
                      size={9}
                      className={moduleState.status === 'syncing' || moduleState.status === 'in_progress' ? 'animate-spin' : ''}
                    />
                    {getStatusLabel(moduleState.status)}
                  </span>
                </div>

                {/* Progress bar */}
                {isSyncing && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[#5a6878]">
                        Syncing<AnimatedDots />
                      </span>
                      <span
                        className="text-[10px] text-[#3b82f6] font-semibold"
                        style={{ fontFamily: "'Share Tech Mono', monospace" }}
                      >
                        {Math.round(moduleState.progress)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1e252e' }}>
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${moduleState.progress}%`,
                          background: `linear-gradient(90deg, ${def.color}, ${def.color}88)`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Stats row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={11} className="text-[#5a6878]" />
                      <span
                        className="text-[11px] text-[#8899aa]"
                        style={{ fontFamily: "'Share Tech Mono', monospace" }}
                      >
                        {config?.totalSynced || 0}
                      </span>
                    </div>
                    {config && config.totalErrors > 0 && (
                      <div className="flex items-center gap-1.5">
                        <XCircle size={11} className="text-[#ff3d3d]" />
                        <span
                          className="text-[11px] text-[#ff3d3d]"
                          style={{ fontFamily: "'Share Tech Mono', monospace" }}
                        >
                          {config.totalErrors}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-[#5a6878]">
                    {config?.lastSyncAt ? timeAgo(config.lastSyncAt) : 'Never'}
                  </span>
                </div>

                {/* Actions row */}
                <div className="flex items-center justify-between pt-2 border-t border-[#1e252e]">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config?.autoSync ?? false}
                      onCheckedChange={(checked) => toggleAutoSync(moduleKey, checked)}
                      className="scale-75 origin-left"
                      disabled={isSyncing}
                    />
                    <span className="text-[10px] text-[#5a6878]">Auto-sync</span>
                  </div>
                  <button
                    className="vc-btn-ghost flex items-center gap-1.5 !text-[10px] !py-1.5 disabled:opacity-40"
                    disabled={isSyncing}
                    onClick={() => triggerModuleSync(moduleKey)}
                  >
                    <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
                    Sync
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/*  BOTTOM SECTION — Sync Activity Log                           */}
      {/* ============================================================ */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Activity size={14} className="text-[#00d4ff]" />
          <span
            className="text-[13px] font-semibold"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            SYNC ACTIVITY LOG
          </span>
          <span className="ml-auto text-[10px] text-[#5a6878]">
            {filteredLogs.length} operation{filteredLogs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-[#252e3a]">
          {([
            { key: 'all' as const, label: 'All', color: '#8899aa' },
            { key: 'success' as const, label: 'Success', color: '#00e676' },
            { key: 'conflict' as const, label: 'Conflicts', color: '#f59e0b' },
            { key: 'error' as const, label: 'Errors', color: '#ff3d3d' },
          ]).map(tab => {
            const count = tab.key === 'all'
              ? syncLogs.length
              : syncLogs.filter(l => {
                  if (tab.key === 'success') return l.status === 'success' || l.status === 'completed';
                  return l.status === tab.key;
                }).length;
            return (
              <button
                key={tab.key}
                className={`px-3 py-1 rounded text-[10px] font-semibold transition-colors ${
                  logFilter === tab.key
                    ? 'text-[#e2e8f0]'
                    : 'text-[#5a6878] hover:text-[#8899aa]'
                }`}
                style={
                  logFilter === tab.key
                    ? { background: `${tab.color}15`, color: tab.color }
                    : {}
                }
                onClick={() => setLogFilter(tab.key)}
              >
                {tab.label}
                <span className="ml-1 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Log list */}
        <div className="max-h-[380px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#5a6878]">
              <ArrowDownUp size={28} className="mb-2 opacity-40" />
              <span className="text-[11px]">No sync activity recorded</span>
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div className="grid grid-cols-[70px_1fr_90px_80px_80px_70px_70px] gap-2 px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-[#5a6878] border-b border-[#252e3a] sticky top-0 bg-[#161c24] z-10">
                <span>Time</span>
                <span>Module</span>
                <span>Direction</span>
                <span>Records</span>
                <span>Status</span>
                <span>Duration</span>
                <span className="text-right">Action</span>
              </div>

              {filteredLogs.map((log) => {
                const logStatusColors = getStatusColor(log.status);
                const LogStatusIcon = getStatusIcon(log.status);
                const isConflict = log.status === 'conflict';
                const isResolving = resolvingConflict === log.id;

                return (
                  <div
                    key={log.id}
                    className={`grid grid-cols-[70px_1fr_90px_80px_80px_70px_70px] gap-2 px-4 py-2.5 items-center border-b border-[#1e252e] last:border-0 transition-colors ${
                      isConflict ? 'bg-[#f59e0b]/5' : 'hover:bg-[#141920]'
                    }`}
                  >
                    {/* Time */}
                    <span
                      className="text-[10px] text-[#5a6878] whitespace-nowrap"
                      style={{ fontFamily: "'Share Tech Mono', monospace" }}
                    >
                      {formatTimestamp(log.startedAt)}
                    </span>

                    {/* Module */}
                    <div className="flex items-center gap-2 min-w-0">
                      {(() => {
                        const modDef = MODULE_DEFS[log.module as ModuleKey];
                        const ModIcon = modDef?.icon || Package;
                        const modColor = modDef?.color || '#8899aa';
                        return (
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                            style={{ background: `${modColor}15` }}
                          >
                            <ModIcon size={11} style={{ color: modColor }} />
                          </div>
                        );
                      })()}
                      <span className="text-[11px] text-[#e2e8f0] font-medium truncate">
                        {log.module}
                      </span>
                    </div>

                    {/* Direction */}
                    <div className="flex items-center gap-1.5">
                      {log.direction === 'pull' ? (
                        <>
                          <ArrowDownToLine size={11} className="text-[#3b82f6]" />
                          <span className="text-[10px] text-[#8899aa]">Pull</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpFromLine size={11} className="text-[#a78bfa]" />
                          <span className="text-[10px] text-[#8899aa]">Push</span>
                        </>
                      )}
                    </div>

                    {/* Records */}
                    <span
                      className="text-[11px] text-[#e2e8f0] font-semibold"
                      style={{ fontFamily: "'Share Tech Mono', monospace" }}
                    >
                      {log.recordsSynced > 0 ? log.recordsSynced : '—'}
                    </span>

                    {/* Status */}
                    <span
                      className={`vc-badge ${logStatusColors.bg} ${logStatusColors.text}`}
                      style={{ border: `1px solid ${logStatusColors.border}` }}
                    >
                      <LogStatusIcon
                        size={8}
                        className={log.status === 'syncing' || log.status === 'in_progress' ? 'animate-spin' : ''}
                      />
                      {log.status === 'completed' ? 'Success' : log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                    </span>

                    {/* Duration */}
                    <span
                      className="text-[10px] text-[#5a6878]"
                      style={{ fontFamily: "'Share Tech Mono', monospace" }}
                    >
                      {log.completedAt
                        ? formatDuration(new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime())
                        : '—'}
                    </span>

                    {/* Action */}
                    <div className="flex justify-end">
                      {isConflict ? (
                        <button
                          className="vc-btn-primary !text-[9px] !py-1 !px-2 flex items-center gap-1 disabled:opacity-50"
                          disabled={isResolving}
                          onClick={() => resolveConflict(log.id)}
                        >
                          {isResolving ? (
                            <>
                              <Loader2 size={9} className="animate-spin" />
                              Fixing
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={9} />
                              Resolve
                            </>
                          )}
                        </button>
                      ) : log.conflictReason ? (
                        <span className="text-[9px] text-[#5a6878] italic">Resolved</span>
                      ) : (
                        <ChevronRight size={12} className="text-[#2e3a48]" />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Conflict details for last conflict */}
              {filteredLogs.some(l => l.status === 'conflict' && l.conflictReason) && (
                <div className="px-4 py-2 bg-[#f59e0b]/5 border-t border-[#f59e0b]/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={12} className="text-[#f59e0b] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-[#f59e0b] font-semibold">Conflict Details: </span>
                      <span className="text-[10px] text-[#8899aa]">
                        {filteredLogs.find(l => l.status === 'conflict' && l.conflictReason)?.conflictReason}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Completion Toast (inline)                                    */}
      {/* ============================================================ */}
      {syncStatus === 'complete' && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#161c24] border border-[#00e676]/30 shadow-2xl animate-in slide-in-from-right">
          <div className="w-8 h-8 rounded-full bg-[#00e676]/15 flex items-center justify-center">
            <CheckCircle2 size={16} className="text-[#00e676]" />
          </div>
          <div>
            <div className="text-[12px] font-semibold text-[#e2e8f0]">Sync Complete</div>
            <div className="text-[10px] text-[#5a6878]">All modules synchronized successfully</div>
          </div>
          <button
            className="ml-4 text-[#5a6878] hover:text-[#e2e8f0] transition-colors"
            onClick={() => setSyncStatus('idle')}
          >
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* Error Toast */}
      {syncStatus === 'error' && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#161c24] border border-[#ff3d3d]/30 shadow-2xl animate-in slide-in-from-right">
          <div className="w-8 h-8 rounded-full bg-[#ff3d3d]/15 flex items-center justify-center">
            <XCircle size={16} className="text-[#ff3d3d]" />
          </div>
          <div>
            <div className="text-[12px] font-semibold text-[#e2e8f0]">Sync Failed</div>
            <div className="text-[10px] text-[#5a6878]">{error || 'An error occurred during sync'}</div>
          </div>
          <button
            className="ml-4 text-[#5a6878] hover:text-[#e2e8f0] transition-colors"
            onClick={() => setSyncStatus('idle')}
          >
            <XCircle size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
