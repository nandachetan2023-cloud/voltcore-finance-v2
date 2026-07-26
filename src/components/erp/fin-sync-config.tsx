'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Database, CheckCircle2, XCircle, Clock, Loader2,
  Settings, Activity, ToggleLeft, Trash2, AlertTriangle, Zap, Server,
} from 'lucide-react';
import { toast } from 'sonner';

interface SyncConfig {
  module: string;
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number;
  lastSyncAt: string | null;
  lastStatus: string;
  totalSynced: number;
  totalErrors: number;
  endpoint: string | null;
  authKey: string | null;
  nextSyncAt: string | null;
}

interface SyncLog {
  id: number;
  module: string;
  action: string;
  recordId: string | null;
  status: string;
  direction: string;
  recordsSynced: number;
  duration: number;
  errorMessage: string | null;
  startedAt: string | null;
  createdAt: string;
}

const ALL_SYNC_MODULES = [
  { id: 'employees', label: 'Employees', color: '#f5a623' },
  { id: 'inventory', label: 'Inventory', color: '#00d4ff' },
  { id: 'sales', label: 'Sales', color: '#00e676' },
  { id: 'projects', label: 'Projects', color: '#a78bfa' },
  { id: 'finance', label: 'Finance', color: '#ffab40' },
  { id: 'equipment', label: 'Equipment', color: '#ff6b6b' },
  { id: 'attendance', label: 'Attendance', color: '#4ecdc4' },
  { id: 'payroll', label: 'Payroll', color: '#95e1d3' },
];

const STATUS_BADGE: Record<string, string> = {
  Never: 'bg-[#5a6878]/15 text-[#5a6878]',
  Syncing: 'bg-[#00d4ff]/15 text-[#00d4ff]',
  Success: 'bg-[#00e676]/15 text-[#00e676]',
  'Completed with Errors': 'bg-[#f5a623]/15 text-[#f5a623]',
  Failed: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
};

const fmtDate = (d: string | null) => d ? new Date(d).toLocaleString('en-IN') : '—';

export default function FinSyncConfig() {
  const [configs, setConfigs] = useState<SyncConfig[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [dbMode, setDbMode] = useState<{ current: string; label: string }>({ current: 'actual', label: 'Actual Data' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [switchingDb, setSwitchingDb] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/fin/sync-config');
      const j = await r.json();
      if (j.success) {
        setConfigs(j.data.configs);
        setLogs(j.data.logs);
        if (j.data.dbMode) setDbMode(j.data.dbMode);
      }
    } catch { toast.error('Failed to load sync config'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleToggle = async (module: string) => {
    setSaving(module);
    try {
      const r = await fetch('/api/fin/sync-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', module }),
      });
      const j = await r.json();
      if (j.success) {
        setConfigs(prev => prev.map(c => c.module === module ? { ...c, enabled: j.data.enabled } : c));
        toast.success(`${module} ${j.data.enabled ? 'enabled' : 'disabled'}`);
      } else toast.error(j.error);
    } catch { toast.error('Network error'); }
    finally { setSaving(null); }
  };

  const handleSave = async (cfg: SyncConfig) => {
    // Validate sync interval: min 60s, max 86400s (1 day)
    if (cfg.syncInterval < 60 || cfg.syncInterval > 86400) {
      toast.error('Sync interval must be between 60 seconds and 86400 seconds (1 day)');
      return;
    }
    setSaving(cfg.module);
    try {
      const r = await fetch('/api/fin/sync-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert', config: cfg }),
      });
      const j = await r.json();
      if (j.success) { toast.success(`${cfg.module} config saved`); await fetchAll(); }
      else toast.error(j.error);
    } catch { toast.error('Network error'); }
    finally { setSaving(null); }
  };

  const handleClearLogs = async () => {
    if (!confirm('Clear all sync logs? This cannot be undone.')) return;
    try {
      const r = await fetch('/api/fin/sync-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-logs' }),
      });
      const j = await r.json();
      if (j.success) { toast.success('Logs cleared'); setLogs([]); }
      else toast.error(j.error);
    } catch { toast.error('Network error'); }
  };

  const handleDbModeToggle = async () => {
    const newMode = dbMode.current === 'sample' ? 'actual' : 'sample';
    setSwitchingDb(true);
    try {
      const r = await fetch('/api/fin/sync-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-db-mode', mode: newMode }),
      });
      const j = await r.json();
      if (j.success) {
        toast.success(`Switched to ${newMode === 'sample' ? 'Sample Data' : 'Actual Data'}`);
        setDbMode(prev => ({ ...prev, current: newMode, label: newMode === 'sample' ? 'Sample Data' : 'Actual Data' }));
      } else toast.error(j.error);
    } catch { toast.error('Network error'); }
    finally { setSwitchingDb(false); }
  };

  const handleDeleteLog = async (id: number) => {
    if (!confirm('Delete this log entry?')) return;
    try {
      const r = await fetch('/api/fin/sync-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-log', logId: id }),
      });
      const j = await r.json();
      if (j.success) { setLogs(prev => prev.filter(l => l.id !== id)); toast.success('Log deleted'); }
      else toast.error(j.error);
    } catch { toast.error('Network error'); }
  };

  const mergedModules = ALL_SYNC_MODULES.map(mod => {
    const cfg = configs.find(c => c.module === mod.id);
    return {
      ...mod,
      enabled: cfg?.enabled ?? false,
      autoSync: cfg?.autoSync ?? false,
      syncInterval: cfg?.syncInterval ?? 300,
      lastSyncAt: cfg?.lastSyncAt ?? null,
      lastStatus: cfg?.lastStatus ?? 'Never',
      totalSynced: cfg?.totalSynced ?? 0,
      totalErrors: cfg?.totalErrors ?? 0,
    };
  });

  if (loading && configs.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings size={18} className="text-[#f5a623]" />
          <span className="text-[16px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed',sans-serif" }}>Data Sync Configuration</span>
          <span className="text-[10px] text-[#5a6878] bg-[#0f1318] px-2 py-0.5 rounded-full">{configs.length} configured</span>
        </div>
        <button onClick={fetchAll} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header">
          <Activity size={14} className="text-[#00d4ff]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Sync Module Configuration</span>
        </div>
        <div className="divide-y divide-[#1a2028]">
          {mergedModules.map(mod => {
            const Icon = mod.enabled ? CheckCircle2 : XCircle;
            const iconColor = mod.enabled ? '#00e676' : '#5a6878';
            return (
              <div key={mod.id} className="p-4 flex items-center justify-between hover:bg-[#141920] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${mod.color}15` }}>
                    <Icon size={14} style={{ color: iconColor }} />
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-[#e2e8f0]">{mod.label}</div>
                    <div className="text-[10px] text-[#5a6878]">Last sync: {fmtDate(mod.lastSyncAt)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`vc-badge text-[9px] ${STATUS_BADGE[mod.lastStatus] || 'bg-[#5a6878]/15 text-[#5a6878]'}`}>
                    {mod.lastStatus}
                  </span>
                  <span className="text-[10px] text-[#8899aa] font-mono">{mod.totalSynced} synced</span>
                  <button
                    onClick={() => handleToggle(mod.id)}
                    disabled={saving === mod.id}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-colors ${
                      mod.enabled
                        ? 'bg-[#00e676]/10 text-[#00e676] border-[#00e676]/30 hover:bg-[#00e676]/20'
                        : 'text-[#5a6878] border-[#252e3a] hover:border-[#00e676]/30'
                    }`}
                  >
                    {saving === mod.id ? '...' : mod.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Database Mode */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Server size={14} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Database Mode</span>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${dbMode.current === 'sample' ? 'bg-[#00e676]/15' : 'bg-[#00d4ff]/15'}`}>
                <Database size={18} className={dbMode.current === 'sample' ? 'text-[#00e676]' : 'text-[#00d4ff]'} />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[#e2e8f0]">{dbMode.label}</div>
                <div className="text-[10px] text-[#5a6878]">
                  {dbMode.current === 'sample'
                    ? 'Using demo/sample database with test data'
                    : 'Using actual production database'}
                </div>
              </div>
            </div>
            <button
              onClick={handleDbModeToggle}
              disabled={switchingDb}
              className={`px-4 py-2 text-[11px] font-bold rounded-lg border transition-colors ${
                dbMode.current === 'sample'
                  ? 'bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/30 hover:bg-[#00d4ff]/20'
                  : 'bg-[#00e676]/10 text-[#00e676] border-[#00e676]/30 hover:bg-[#00e676]/20'
              }`}
            >
              {switchingDb ? (
                <><Loader2 size={12} className="animate-spin inline mr-1" /> Switching...</>
              ) : (
                <>Switch to {dbMode.current === 'sample' ? 'Actual Data' : 'Sample Data'}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sync Logs */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Clock size={14} className="text-[#a78bfa]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Sync Logs</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{logs.length}</span>
          {logs.length > 0 && (
            <button onClick={handleClearLogs} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 ml-2">
              <Trash2 size={13} />
            </button>
          )}
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#0f1318] border-b border-[#252e3a]">
                {['Time', 'Module', 'Action', 'Direction', 'Records', 'Duration', 'Status', 'Error', ''].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a2028]">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-[#141920]">
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono text-[10px] whitespace-nowrap">{fmtDate(l.createdAt)}</td>
                  <td className="py-2.5 px-3"><span className="vc-badge bg-[#252e3a] text-[#8899aa]">{l.module}</span></td>
                  <td className="py-2.5 px-3 text-[#e2e8f0]">{l.action}</td>
                  <td className="py-2.5 px-3 text-[#5a6878]">{l.direction}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">{l.recordsSynced}</td>
                  <td className="py-2.5 px-3 text-[#5a6878] font-mono">{l.duration}ms</td>
                  <td className="py-2.5 px-3">
                    <span className={`vc-badge text-[9px] ${
                      l.status === 'Success' ? 'bg-[#00e676]/15 text-[#00e676]' :
                      l.status === 'Error' ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' :
                      l.status === 'Conflict' ? 'bg-[#f5a623]/15 text-[#f5a623]' :
                      'bg-[#5a6878]/15 text-[#5a6878]'
                    }`}>{l.status}</span>
                  </td>
                  <td className="py-2.5 px-3 text-[#ff3d3d] max-w-[200px] truncate text-[10px]">{l.errorMessage || '—'}</td>
                  <td className="py-2.5 px-3">
                    <button onClick={() => handleDeleteLog(l.id)} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10">
                      <XCircle size={12} />
                    </button>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={9} className="py-10 text-center text-[#5a6878]">No sync logs yet. Run a sync from the Sync Manager to see logs here.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
