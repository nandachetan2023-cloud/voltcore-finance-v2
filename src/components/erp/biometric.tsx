'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle2, XCircle, Clock, Database, Fingerprint, AlertCircle, Building2, Search, X } from 'lucide-react';

interface BiometricSite {
  id: string;
  name: string;
}

interface SyncLog {
  id: number;
  siteId?: string;
  siteName?: string | null;
  lastRecord: string;
  syncType: string;
  recordsFetched: number;
  recordsProcessed: number;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

interface SyncStatus {
  syncHistory: SyncLog[];
  unprocessedCount: number;
  lastSuccessfulSync?: SyncLog;
}

interface RawLog {
  id: number;
  empCode: string;
  enrolledId?: string;
  name: string;
  punchDate: string;
  deviceId?: string;
  siteId?: string;
  siteName?: string | null;
  processed: boolean;
  matched?: boolean;
  skipReason?: string | null;
  createdAt: string;
}

const inp = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]/60 transition-colors placeholder:text-[#5a6878]';

export default function BiometricPage() {
  const [sites, setSites] = useState<BiometricSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [rawLogs, setRawLogs] = useState<RawLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'pending' | 'matched' | 'unmatched'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [skippedRecords, setSkippedRecords] = useState<Array<{ empCode: string; name: string; date: string; reason: string }>>([]);

  useEffect(() => {
    fetchSites();
    fetchSyncStatus();
    fetchRawLogs();
  }, []);

  useEffect(() => {
    fetchSyncStatus();
    fetchRawLogs();
  }, [selectedSite]);

  useEffect(() => {
    fetchRawLogs();
  }, [logFilter]);

  const fetchSites = async () => {
    try {
      const res = await fetch('/api/biometric/sync');
      const data = await res.json();
      if (data.success) setSites(data.data || []);
    } catch {}
  };

  const fetchSyncStatus = async () => {
    try {
      const url = selectedSite !== 'all'
        ? `/api/biometric/sync-status?siteId=${selectedSite}`
        : '/api/biometric/sync-status';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setSyncStatus(data.data);
    } catch {}
  };

  const fetchRawLogs = async () => {
    setLoadingLogs(true);
    try {
      let url = '/api/biometric/logs?limit=50';
      if (logFilter === 'pending') url += '&processed=false';
      else if (logFilter === 'matched') url += '&matched=true';
      else if (logFilter === 'unmatched') url += '&processed=true&matched=false';
      if (selectedSite !== 'all') url += `&siteId=${selectedSite}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setRawLogs(data.data);
    } catch {}
    finally { setLoadingLogs(false); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const body = selectedSite !== 'all' ? { siteId: selectedSite } : {};
      const res = await fetch('/api/biometric/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        const fetched = Array.isArray(data.data?.sync)
          ? data.data.sync.reduce((s: number, r: any) => s + r.result.fetched, 0)
          : data.data?.sync?.fetched || 0;
        if (fetched === 0) {
          toast.info('No new punch data since last sync.');
        } else {
          toast.success(`Sync complete — ${fetched} new records fetched.`);
        }
        // Capture skipped records from processing
        const skipped = data.data?.skippedRecords || data.data?.processing?.skippedRecords || [];
        if (Array.isArray(skipped) && skipped.length > 0) {
          setSkippedRecords(skipped);
        } else if (data.data?.processing) {
          // Check nested processing results (multi-site)
          const nested = Array.isArray(data.data.processing)
            ? data.data.processing.flatMap((p: any) => p.result?.skippedRecords || [])
            : data.data.processing?.skippedRecords || [];
          if (nested.length > 0) setSkippedRecords(nested);
        }
        fetchSyncStatus();
        fetchRawLogs();
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch {
      toast.error('Sync failed. Check your connection.');
    } finally {
      setSyncing(false);
    }
  };

  const handleRetryUnmatched = async () => {
    setProcessing(true);
    try {
      const body: any = { rematch: true };
      if (selectedSite !== 'all') body.siteId = selectedSite;
      const res = await fetch('/api/biometric/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        const processed = data.data.processedCount || 0;
        const reset = data.data.resetCount || 0;
        const skipped = data.data.skippedRecords || [];
        if (processed > 0) {
          toast.success(`Re-matched ${processed} record(s)${reset ? ` (re-checked ${reset})` : ''}.`);
        }
        if (skipped.length > 0) {
          setSkippedRecords(skipped);
          toast.warning(`${skipped.length} record(s) still unmatched — see details below.`);
        } else if (processed === 0) {
          toast.info(reset > 0 ? 'Re-checked logs but none could be matched yet.' : 'No unmatched logs to re-check.');
        } else {
          setSkippedRecords([]);
        }
        fetchSyncStatus();
        fetchRawLogs();
      } else {
        toast.error(data.error || 'Re-match failed');
      }
    } catch {
      toast.error('Re-match failed.');
    } finally {
      setProcessing(false);
    }
  };

  const fmt = (d: string) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const fmtTime = (d: string) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const lastSync = syncStatus?.lastSuccessfulSync;
  const unprocessed = syncStatus?.unprocessedCount || 0;
  const activeSiteName = selectedSite === 'all' ? 'All Sites' : (sites.find(s => s.id === selectedSite)?.name || selectedSite);

  // Client-side search on top of the server-filtered logFilter/siteId results
  const filteredLogs = logSearch.trim()
    ? rawLogs.filter(log => {
        const q = logSearch.toLowerCase();
        return (
          (log.empCode || '').toLowerCase().includes(q) ||
          (log.enrolledId || '').toLowerCase().includes(q) ||
          (log.name || '').toLowerCase().includes(q)
        );
      })
    : rawLogs;

  return (
    <div className="p-4 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#f5a623]/10 rounded-xl flex items-center justify-center">
            <Fingerprint size={20} className="text-[#f5a623]" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Biometric Sync</h2>
            <p className="text-[11px] text-[#5a6878]">Pull punch data from biometric devices into attendance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Site selector */}
          {sites.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#161c24] border border-[#252e3a] rounded-lg px-3 py-1.5">
              <Building2 size={13} className="text-[#5a6878]" />
              <select
                value={selectedSite}
                onChange={e => setSelectedSite(e.target.value)}
                className="bg-transparent text-[12px] text-[#e2e8f0] outline-none cursor-pointer"
              >
                <option value="all">All Sites</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : `Sync ${selectedSite !== 'all' ? activeSiteName : 'All'}`}
          </button>
          <button
            onClick={handleRetryUnmatched}
            disabled={processing}
            title="Re-check logs that didn't match before (e.g. after assigning a shift or creating the employee). Respects the shift's effective date."
            className="flex items-center gap-2 px-4 py-2 bg-[#161c24] border border-[#2e3a48] text-[#e2e8f0] text-[12px] font-semibold rounded-lg hover:border-[#f5a623] disabled:opacity-50 transition-colors"
          >
            <Database size={14} className={processing ? 'animate-spin' : ''} />
            {processing ? 'Re-matching...' : 'Re-match Unmatched'}
          </button>
        </div>
      </div>

      {/* Sites overview — only when "All Sites" selected and multiple sites exist */}
      {sites.length > 1 && selectedSite === 'all' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {sites.map(site => (
            <button
              key={site.id}
              onClick={() => setSelectedSite(site.id)}
              className="bg-[#161c24] border border-[#252e3a] rounded-xl p-3 text-left hover:border-[#f5a623]/40 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={13} className="text-[#f5a623]" />
                <span className="text-[11px] font-semibold text-[#e2e8f0] group-hover:text-[#f5a623] transition-colors truncate">{site.name}</span>
              </div>
              <p className="text-[10px] text-[#5a6878]">Click to filter by this site</p>
            </button>
          ))}
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
          <p className="text-[10px] text-[#5a6878] uppercase tracking-wider mb-1">Last Sync</p>
          <p className="text-[13px] font-semibold text-[#e2e8f0]">
            {lastSync ? fmtTime(lastSync.createdAt) : '—'}
          </p>
        </div>
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
          <p className="text-[10px] text-[#5a6878] uppercase tracking-wider mb-1">Records Fetched</p>
          <p className="text-[22px] font-bold text-[#e2e8f0]">{lastSync?.recordsFetched ?? '—'}</p>
        </div>
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
          <p className="text-[10px] text-[#5a6878] uppercase tracking-wider mb-1">Processed</p>
          <p className="text-[22px] font-bold text-[#00e676]">{lastSync?.recordsProcessed ?? '—'}</p>
        </div>
        <div className={`bg-[#161c24] border rounded-xl p-4 ${unprocessed > 0 ? 'border-[#ffab40]/40' : 'border-[#252e3a]'}`}>
          <p className="text-[10px] text-[#5a6878] uppercase tracking-wider mb-1">Pending</p>
          <p className={`text-[22px] font-bold ${unprocessed > 0 ? 'text-[#ffab40]' : 'text-[#e2e8f0]'}`}>{unprocessed}</p>
        </div>
      </div>

      {/* Pending alert + retry */}
      {unprocessed > 0 && (
        <div className="bg-[#ffab40]/10 border border-[#ffab40]/30 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={16} className="text-[#ffab40] shrink-0" />
            <p className="text-[12px] text-[#ffab40]">
              <span className="font-semibold">{unprocessed} records</span> are pending — punch logs where the employee code wasn't matched. Retry after linking employees.
            </p>
          </div>
          <button
            onClick={handleRetryUnmatched}
            disabled={processing}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-[#ffab40] border border-[#ffab40]/40 rounded-lg hover:bg-[#ffab40]/10 disabled:opacity-50 transition-colors"
          >
            <Database size={12} className={processing ? 'animate-spin' : ''} />
            {processing ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      )}

      {/* Skipped Records — shows why processed logs didn't create attendance */}
      {skippedRecords.length > 0 && (
        <div className="bg-[#161c24] border border-[#ff3d3d]/30 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#252e3a]">
            <div className="flex items-center gap-2">
              <XCircle size={14} className="text-[#ff3d3d]" />
              <span className="text-[13px] font-semibold text-[#e2e8f0]">Skipped Records</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff3d3d]/10 text-[#ff3d3d] font-semibold">{skippedRecords.length}</span>
            </div>
            <button
              onClick={() => setSkippedRecords([])}
              className="text-[10px] text-[#5a6878] hover:text-[#e2e8f0] transition-colors"
            >
              Dismiss
            </button>
          </div>
          <div className="px-4 py-2 bg-[#ff3d3d]/5 border-b border-[#252e3a]">
            <p className="text-[11px] text-[#ff9999]">
              These punch logs were marked as processed but did NOT create attendance records. Fix the issue and re-sync to generate attendance.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[#252e3a] bg-[#141920]">
                  <th className="text-left px-4 py-2.5 text-[#5a6878] font-semibold uppercase tracking-wider">Employee</th>
                  <th className="text-left px-4 py-2.5 text-[#5a6878] font-semibold uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-2.5 text-[#5a6878] font-semibold uppercase tracking-wider">Reason</th>
                </tr>
              </thead>
              <tbody>
                {skippedRecords.map((rec, idx) => (
                  <tr key={idx} className="border-b border-[#1e252e] hover:bg-[#1a2028] transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-[#f5a623]">{rec.empCode}</span>
                      {rec.name && <span className="text-[#8899aa] ml-2">{rec.name}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-[#e2e8f0]">{rec.date}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-[#ff9999]">{rec.reason}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Punch Logs */}
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#252e3a] flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#e2e8f0]">Punch Logs</span>
            {selectedSite !== 'all' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f5a623]/10 text-[#f5a623] font-semibold">{activeSiteName}</span>
            )}
            <span className="text-[10px] text-[#5a6878]">{filteredLogs.length} records</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="flex items-center gap-1.5 bg-[#0d1117] border border-[#2e3a48] rounded-lg px-2.5 py-[5px] min-w-[160px]">
              <Search size={12} className="text-[#5a6878] shrink-0" />
              <input
                type="text"
                placeholder="Search by name or ID…"
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-[11px] text-[#e2e8f0] placeholder:text-[#5a6878] w-full"
              />
              {logSearch && (
                <button onClick={() => setLogSearch('')} className="text-[#5a6878] hover:text-[#e2e8f0]">
                  <X size={11} />
                </button>
              )}
            </div>
            {/* Status filter pills */}
            <div className="flex items-center gap-1">
              {(['all', 'pending', 'matched', 'unmatched'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors capitalize ${logFilter === f ? 'bg-[#f5a623] text-black' : 'text-[#5a6878] hover:text-[#e2e8f0]'}`}
                >
                  {f}
                </button>
              ))}
              <button onClick={fetchRawLogs} className="ml-1 p-1 text-[#5a6878] hover:text-[#e2e8f0] transition-colors">
                <RefreshCw size={12} className={loadingLogs ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        {loadingLogs ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={20} className="animate-spin text-[#5a6878]" />
          </div>
        ) : rawLogs.length === 0 ? (
          <div className="text-center py-12 text-[#5a6878] text-[12px]">No punch logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[#252e3a] bg-[#141920]">
                  <th className="text-left px-4 py-2.5 text-[#5a6878] font-semibold uppercase tracking-wider">Enrolled ID</th>
                  <th className="text-left px-4 py-2.5 text-[#5a6878] font-semibold uppercase tracking-wider">Punch Time</th>
                  <th className="text-left px-4 py-2.5 text-[#5a6878] font-semibold uppercase tracking-wider">Site</th>
                  <th className="text-left px-4 py-2.5 text-[#5a6878] font-semibold uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-[#5a6878] text-[11px]">No records match your search.</td></tr>
                ) : filteredLogs.map(log => (
                  <tr key={log.id} className="border-b border-[#1e252e] hover:bg-[#1a2028] transition-colors">
                    <td className="px-4 py-2.5">
                      {log.enrolledId
                        ? <span className="font-mono text-[#f5a623]">{log.enrolledId}</span>
                        : <span className="font-mono text-[#ff6b6b]" title="No enrolled ID — cannot be matched">—</span>}
                      {log.name && <span className="text-[#8899aa] ml-2">{log.name}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-[#e2e8f0]">{fmt(log.punchDate)}</td>
                    <td className="px-4 py-2.5">
                      {log.siteId ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00d4ff]/10 text-[#00d4ff] font-semibold">
                          {log.siteName || sites.find(s => s.id === log.siteId)?.name || log.siteId}
                        </span>
                      ) : <span className="text-[#5a6878]">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {!log.processed ? (
                        <span className="inline-flex items-center gap-1 text-[#ffab40] text-[10px] font-semibold">
                          <Clock size={11} /> Pending
                        </span>
                      ) : log.matched ? (
                        <span className="inline-flex items-center gap-1 text-[#00e676] text-[10px] font-semibold">
                          <CheckCircle2 size={11} /> Matched
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[#ff6b6b] text-[10px] font-semibold cursor-help"
                          title={log.skipReason || 'No matching employee'}
                        >
                          <AlertCircle size={11} /> Not Matched
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sync History */}
      {syncStatus?.syncHistory && syncStatus.syncHistory.length > 0 && (
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#252e3a]">
            <span className="text-[13px] font-semibold text-[#e2e8f0]">Recent Sync History</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[#252e3a] bg-[#141920]">
                  <th className="text-left px-4 py-2.5 text-[#5a6878] font-semibold uppercase tracking-wider">Time</th>
                  <th className="text-left px-4 py-2.5 text-[#5a6878] font-semibold uppercase tracking-wider">Site</th>
                  <th className="text-left px-4 py-2.5 text-[#5a6878] font-semibold uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-2.5 text-[#5a6878] font-semibold uppercase tracking-wider">Fetched</th>
                  <th className="text-left px-4 py-2.5 text-[#5a6878] font-semibold uppercase tracking-wider">Processed</th>
                  <th className="text-left px-4 py-2.5 text-[#5a6878] font-semibold uppercase tracking-wider">Result</th>
                </tr>
              </thead>
              <tbody>
                {syncStatus.syncHistory.slice(0, 10).map(log => (
                  <tr key={log.id} className="border-b border-[#1e252e] hover:bg-[#1a2028] transition-colors">
                    <td className="px-4 py-2.5 text-[#8899aa]">{fmtTime(log.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      {log.siteId ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00d4ff]/10 text-[#00d4ff] font-semibold">
                          {log.siteName || sites.find(s => s.id === log.siteId)?.name || log.siteId}
                        </span>
                      ) : <span className="text-[#5a6878] text-[10px]">All</span>}
                    </td>
                    <td className="px-4 py-2.5 text-[#e2e8f0] capitalize">{log.syncType}</td>
                    <td className="px-4 py-2.5 text-[#e2e8f0]">{log.recordsFetched}</td>
                    <td className="px-4 py-2.5 text-[#e2e8f0]">{log.recordsProcessed}</td>
                    <td className="px-4 py-2.5">
                      {log.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-[#00e676] text-[10px] font-semibold">
                          <CheckCircle2 size={11} /> Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#ff3d3d] text-[10px] font-semibold" title={log.errorMessage}>
                          <XCircle size={11} /> Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
