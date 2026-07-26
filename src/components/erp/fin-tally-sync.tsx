'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Upload, Database, RefreshCw, CheckCircle2, XCircle, Clock,
  FileSpreadsheet, Loader2, Download, AlertTriangle, Trash2,
  ArrowLeft, ChevronDown, Network, Send, Settings,
} from 'lucide-react';
import { toast } from 'sonner';

interface SyncRecord {
  id: number;
  syncType: string;
  fileName: string;
  periodFrom: string | null;
  periodTo: string | null;
  totalRows: number;
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  errorRows: number;
  status: string;
  log: string | null;
  syncedAt: string | null;
  createdAt: string;
}

type Tab = 'import' | 'export';
type Step = 'upload' | 'preview' | 'history';
type SyncType = 'DayBook' | 'TallyBook' | 'SundryDebtors' | 'SundryCreditors' | 'PettyCash' | 'ExpenseClaim';

const SYNC_TYPES: { value: SyncType; label: string; desc: string }[] = [
  { value: 'DayBook', label: 'DayBook', desc: 'Purchase & Sales Register (3-year summary)' },
  { value: 'TallyBook', label: 'Tally Book', desc: 'Monthly Purchase & Sales Register' },
  { value: 'SundryDebtors', label: 'Sundry Debtors', desc: 'Customer outstanding balances' },
  { value: 'SundryCreditors', label: 'Sundry Creditors', desc: 'Vendor outstanding balances' },
  { value: 'PettyCash', label: 'Petty Cash', desc: 'Petty Cash Register' },
  { value: 'ExpenseClaim', label: 'Expense Claim', desc: 'Employee Expense Claim Form' },
];

const SYNC_LABELS: Record<string, string> = {
  DayBook: 'DayBook',
  TallyBook: 'Tally Book',
  SundryDebtors: 'Sundry Debtors',
  SundryCreditors: 'Sundry Creditors',
  PettyCash: 'Petty Cash',
  ExpenseClaim: 'Expense Claim',
};

const ICONS: Record<string, typeof Upload> = {
  DayBook: FileSpreadsheet,
  TallyBook: FileSpreadsheet,
  SundryDebtors: Database,
  SundryCreditors: Database,
  PettyCash: Upload,
  ExpenseClaim: Upload,
};

const STATUS_BADGE: Record<string, string> = {
  Pending: 'bg-[#ffab40]/15 text-[#ffab40]',
  Processing: 'bg-[#00d4ff]/15 text-[#00d4ff]',
  Completed: 'bg-[#00e676]/15 text-[#00e676]',
  Failed: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
};

const fmtDate = (d: string | null) => d ? d.split('T')[0] : '—';
const fmtDateTime = (d: string | null) => d ? new Date(d).toLocaleString('en-IN') : '—';

export default function FinTallySync() {
  const [tab, setTab] = useState<Tab>('import');
  const [step, setStep] = useState<Step>('history');
  const [syncs, setSyncs] = useState<SyncRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);

  // Export state
  const [companyName, setCompanyName] = useState('My Company');
  const [tallyHost, setTallyHost] = useState('localhost');
  const [tallyPort, setTallyPort] = useState(9000);
  const [exportSince, setExportSince] = useState('');
  const [exportActions, setExportActions] = useState<string[]>(['parties', 'invoices', 'payments']);
  const [connecting, setConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ alive: boolean; message: string } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<Record<string, unknown> | null>(null);
  const [entityCounts, setEntityCounts] = useState<Record<string, number> | null>(null);

  // Upload state
  const [syncType, setSyncType] = useState<SyncType>('DayBook');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [syncId, setSyncId] = useState<number | null>(null);
  const [periodFrom, setPeriodFrom] = useState<string | null>(null);
  const [periodTo, setPeriodTo] = useState<string | null>(null);

  const fetchSyncs = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/fin/tally-sync');
      const j = await r.json();
      if (j.success) setSyncs(j.data);
    } catch { toast.error('Failed to load sync history'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSyncs(); }, [fetchSyncs]);

  // ── Export handlers ──────────────────────────────────────────────────
  const handleTestConnection = async () => {
    setConnecting(true);
    setConnectionStatus(null);
    setEntityCounts(null);
    try {
      const r = await fetch('/api/fin/tally-export');
      const j = await r.json();
      if (j.success) {
        setConnectionStatus(j.data.connection);
        setEntityCounts(j.data.counts);
        if (j.data.connection.alive) toast.success('Tally is reachable');
        else toast.error(j.data.connection.message);
      } else toast.error(j.error || 'Connection test failed');
    } catch { toast.error('Network error'); }
    finally { setConnecting(false); }
  };

  const handleExport = async () => {
    if (!companyName.trim()) { toast.error('Enter a company name'); return; }
    if (exportActions.length === 0) { toast.error('Select at least one data type'); return; }
    setExporting(true);
    setExportResult(null);
    try {
      const r = await fetch('/api/fin/tally-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actions: exportActions,
          companyName: companyName.trim(),
          since: exportSince || undefined,
        }),
      });
      const j = await r.json();
      setExportResult(j);
      if (j.success) toast.success(j.data?.message || 'Export completed');
      else toast.error(j.error || 'Export failed');
      await fetchSyncs();
    } catch { toast.error('Export failed — network error'); }
    finally { setExporting(false); }
  };

  const toggleExportAction = (action: string) => {
    setExportActions(prev =>
      prev.includes(action) ? prev.filter(a => a !== action) : [...prev, action]
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleUpload = async () => {
    if (!file) { toast.error('Select a file'); return; }
    setUploading(true);
    setPreview([]);
    setSyncId(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', syncType);
      const r = await fetch('/api/fin/tally-sync', { method: 'POST', body: fd });
      const j = await r.json();
      if (j.success) {
        setPreview(j.preview || []);
        setTotalRows(j.totalRows);
        setSyncId(j.syncId);
        setPeriodFrom(j.periodFrom);
        setPeriodTo(j.periodTo);
        setStep('preview');
        toast.success(`Parsed ${j.totalRows} records from ${file.name}`);
      } else toast.error(j.error || 'Upload failed');
    } catch { toast.error('Upload failed — network error'); }
    finally { setUploading(false); }
  };

  const handleCommit = async () => {
    if (!syncId) { toast.error('No pending sync'); return; }
    setCommitting(true);
    try {
      const r = await fetch('/api/fin/tally-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncId }),
      });
      const j = await r.json();
      if (j.success) {
        toast.success(`Sync complete: ${j.summary.created} created, ${j.summary.updated} updated, ${j.summary.errors} errors`);
        setStep('history');
        setFile(null);
        setPreview([]);
        setSyncId(null);
        await fetchSyncs();
      } else toast.error(j.error || 'Commit failed');
    } catch { toast.error('Commit failed — network error'); }
    finally { setCommitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this sync record?')) return;
    try {
      const r = await fetch(`/api/fin/tally-sync?id=${id}`, { method: 'DELETE' });
      const j = await r.json();
      if (j.success) { toast.success('Deleted'); await fetchSyncs(); }
      else toast.error(j.error);
    } catch { toast.error('Network error'); }
  };

  const previewColumns = preview.length > 0 ? Object.keys(preview[0]).filter(k => k !== 'sheet') : [];
  const isCompleted = syncs.length > 0;

  if (loading && syncs.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database size={18} className="text-[#f5a623]" />
          <span className="text-[16px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed',sans-serif" }}>Tally Sync Management</span>
        </div>
        <div className="flex items-center gap-2">
          {step === 'preview' && (
            <button onClick={() => setStep('upload')} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]">
              <ArrowLeft size={13} /> Back
            </button>
          )}
          <button onClick={fetchSyncs} className="vc-btn-ghost flex items-center gap-1 text-[11px]">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-[#0a0d12] rounded-lg p-1 border border-[#252e3a] w-fit">
        <button
          onClick={() => setTab('import')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[11px] transition-colors ${tab === 'import' ? 'bg-[#f5a623] text-[#0a0d12] font-semibold' : 'text-[#5a6878] hover:text-[#e2e8f0]'}`}
        >
          <Download size={13} /> Import from Tally
        </button>
        <button
          onClick={() => setTab('export')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[11px] transition-colors ${tab === 'export' ? 'bg-[#f5a623] text-[#0a0d12] font-semibold' : 'text-[#5a6878] hover:text-[#e2e8f0]'}`}
        >
          <Upload size={13} /> Export to Tally
        </button>
      </div>

      {/* ===================== IMPORT TAB ===================== */}
      {tab === 'import' && (<>
        {step !== 'preview' && (
          <button onClick={() => { setStep('upload'); setFile(null); setPreview([]); }} className="vc-btn-primary flex items-center gap-1.5 text-[11px]">
            <Upload size={13} /> New Sync
          </button>
        )}
      
        {step === 'upload' && (
        <div className="vc-panel">
          <div className="p-5 space-y-4">
            <h3 className="text-[13px] font-semibold text-[#e2e8f0]">Upload Tally Export File</h3>
            <p className="text-[11px] text-[#5a6878]">Select the type of Tally report and upload the corresponding Excel file.</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1.5 block">Report Type</label>
                <select
                  value={syncType}
                  onChange={e => setSyncType(e.target.value as SyncType)}
                  className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none"
                >
                  {SYNC_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1.5 block">Excel File</label>
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center gap-2 bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#8899aa] cursor-pointer hover:border-[#f5a623] transition-colors">
                    <FileSpreadsheet size={14} className="text-[#f5a623]" />
                    <span className="truncate">{file ? file.name : 'Choose .xlsx file...'}</span>
                    <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
                  </label>
                  <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="vc-btn-primary flex items-center gap-1.5 text-[11px] disabled:opacity-50"
                  >
                    {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    Upload & Parse
                  </button>
                </div>
              </div>
            </div>

            {/* Quick reference */}
            <div className="bg-[#0a0d12] border border-[#252e3a] rounded-lg p-3">
              <div className="text-[10px] font-semibold text-[#5a6878] uppercase tracking-[1px] mb-2">Supported Files & Structure</div>
              <div className="grid grid-cols-3 gap-3 text-[11px]">
                <div className="space-y-1">
                  <div className="text-[#f5a623] font-medium">DayBook.xlsx</div>
                  <div className="text-[#5a6878]">Purchase Register (96 rows)</div>
                  <div className="text-[#5a6878]">Sales Register (50 rows)</div>
                  <div className="text-[#5a6878]">3-year monthly summary</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[#f5a623] font-medium">Tally Book.xlsx</div>
                  <div className="text-[#5a6878]">Purchase Register (93 rows)</div>
                  <div className="text-[#5a6878]">Sales Register (20 rows)</div>
                  <div className="text-[#5a6878]">Monthly transaction detail</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[#f5a623] font-medium">Sundry Debtors & Creditors.xlsx</div>
                  <div className="text-[#5a6878]">40 debtors / 88 creditors</div>
                  <div className="text-[#5a6878]">Closing balances</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

      {/* Preview Step */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="vc-stat-card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" />
              <div className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-0.5">File</div>
              <div className="text-[13px] font-semibold text-[#e2e8f0] truncate">{file?.name || '—'}</div>
            </div>
            <div className="vc-stat-card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" />
              <div className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-0.5">Type</div>
              <div className="text-[13px] font-semibold text-[#e2e8f0]">{SYNC_LABELS[syncType] || syncType}</div>
            </div>
            <div className="vc-stat-card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" />
              <div className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-0.5">Records</div>
              <div className="text-[13px] font-semibold text-[#e2e8f0]">{totalRows}</div>
            </div>
            <div className="vc-stat-card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#a78bfa]" />
              <div className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-0.5">Period</div>
              <div className="text-[11px] font-semibold text-[#e2e8f0]">{periodFrom ? `${fmtDate(periodFrom)} – ${fmtDate(periodTo)}` : 'N/A'}</div>
            </div>
          </div>

          <div className="vc-panel">
            <div className="vc-panel-header">
              <FileSpreadsheet size={14} className="text-[#f5a623]" />
              <span className="text-[12px] font-semibold text-[#e2e8f0]">Parsed Data Preview</span>
              <span className="text-[10px] text-[#5a6878] ml-1">({preview.length} of {totalRows} shown)</span>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#0f1318]">
                    {previewColumns.map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2028]">
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-[#141920]">
                      {previewColumns.map(col => (
                        <td key={col} className="py-2 px-3 text-[#8899aa] max-w-[200px] truncate">
                          {String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {preview.length === 0 && (
                    <tr><td colSpan={previewColumns.length} className="py-8 text-center text-[#5a6878]">No records parsed</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button onClick={() => setStep('upload')} className="vc-btn-ghost text-[11px]">Cancel</button>
            <button
              onClick={handleCommit}
              disabled={committing || preview.length === 0}
              className="vc-btn-primary flex items-center gap-1.5 text-[11px] disabled:opacity-50"
            >
              {committing ? <Loader2 size={13} className="animate-spin" /> : <Database size={13} />}
              {committing ? 'Syncing...' : `Sync ${totalRows} Records`}
            </button>
          </div>
        </div>
      )}

      {/* History Step */}
      {step === 'history' && (
        <div className="vc-panel">
          <div className="vc-panel-header">
            <Clock size={14} className="text-[#a78bfa]" />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">Sync History</span>
            <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{syncs.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-[#0f1318] border-b border-[#252e3a]">
                  {['Date', 'File', 'Type', 'Period', 'Rows', 'Created', 'Updated', 'Skipped', 'Errors', 'Status', ''].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                {syncs.map(s => (
                  <tr key={s.id} className="hover:bg-[#141920]">
                    <td className="py-2.5 px-3 text-[#8899aa] font-mono text-[10px] whitespace-nowrap">{fmtDateTime(s.createdAt)}</td>
                    <td className="py-2.5 px-3 text-[#e2e8f0] max-w-[160px] truncate">{s.fileName}</td>
                    <td className="py-2.5 px-3"><span className="vc-badge bg-[#252e3a] text-[#8899aa]">{SYNC_LABELS[s.syncType] || s.syncType}</span></td>
                    <td className="py-2.5 px-3 text-[#8899aa] font-mono text-[10px] whitespace-nowrap">{s.periodFrom ? `${fmtDate(s.periodFrom)} – ${fmtDate(s.periodTo)}` : '—'}</td>
                    <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">{s.totalRows}</td>
                    <td className="py-2.5 px-3 text-[#00e676] font-mono">{s.createdRows}</td>
                    <td className="py-2.5 px-3 text-[#00d4ff] font-mono">{s.updatedRows}</td>
                    <td className="py-2.5 px-3 text-[#5a6878] font-mono">{s.skippedRows}</td>
                    <td className="py-2.5 px-3 text-[#ff3d3d] font-mono">{s.errorRows}</td>
                    <td className="py-2.5 px-3"><span className={`vc-badge ${STATUS_BADGE[s.status] || 'bg-[#5a6878]/15 text-[#5a6878]'}`}>{s.status}</span></td>
                    <td className="py-2.5 px-3">
                      <button onClick={() => handleDelete(s.id)} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {syncs.length === 0 && (
                  <tr><td colSpan={11} className="py-10 text-center text-[#5a6878]">No sync history yet. Click "New Sync" to upload a Tally file.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}</>
      )}

      {/* ===================== EXPORT TAB ===================== */}
      {tab === 'export' && (
        <div className="grid grid-cols-3 gap-4">
          {/* Left: Settings */}
          <div className="col-span-2 space-y-4">
            <div className="vc-panel">
              <div className="vc-panel-header">
                <Settings size={14} className="text-[#f5a623]" />
                <span className="text-[12px] font-semibold text-[#e2e8f0]">Tally Connection</span>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1.5 block">Tally Host</label>
                    <input
                      value={tallyHost}
                      onChange={e => setTallyHost(e.target.value)}
                      className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none"
                      placeholder="localhost"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1.5 block">Port</label>
                    <input
                      type="number"
                      value={tallyPort}
                      onChange={e => setTallyPort(Number(e.target.value))}
                      className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1.5 block">Tally Company Name</label>
                    <input
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none"
                      placeholder="My Company"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTestConnection}
                    disabled={connecting}
                    className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"
                  >
                    {connecting ? <Loader2 size={13} className="animate-spin" /> : <Network size={13} />}
                    Test Connection
                  </button>
                  {connectionStatus && (
                    <span className={`flex items-center gap-1 text-[10px] ${connectionStatus.alive ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>
                      {connectionStatus.alive ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                      {connectionStatus.message}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="vc-panel">
              <div className="vc-panel-header">
                <Database size={14} className="text-[#00d4ff]" />
                <span className="text-[12px] font-semibold text-[#e2e8f0]">Data to Export</span>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'parties', label: 'Parties (Ledgers)', desc: `${entityCounts?.parties ?? '?'}` },
                    { id: 'invoices', label: 'Sales Invoices', desc: `${entityCounts?.invoices ?? '?'}` },
                    { id: 'payments', label: 'Payments', desc: `${entityCounts?.payments ?? '?'}` },
                  ].map(action => (
                    <label
                      key={action.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                        exportActions.includes(action.id)
                          ? 'border-[#f5a623] bg-[#f5a623]/10 text-[#e2e8f0]'
                          : 'border-[#252e3a] bg-[#0a0d12] text-[#5a6878] hover:text-[#e2e8f0]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={exportActions.includes(action.id)}
                        onChange={() => toggleExportAction(action.id)}
                        className="sr-only"
                      />
                      <CheckCircle2 size={12} className={exportActions.includes(action.id) ? 'text-[#f5a623]' : 'text-transparent'} />
                      <div>
                        <div>{action.label}</div>
                        <div className="text-[9px] text-[#5a6878]">{action.desc} records in DB</div>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1.5 block">Export Since (optional)</label>
                    <input
                      type="date"
                      value={exportSince}
                      onChange={e => setExportSince(e.target.value)}
                      className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={handleExport}
                  disabled={exporting || exportActions.length === 0}
                  className="vc-btn-primary flex items-center gap-1.5 text-[11px] disabled:opacity-50"
                >
                  {exporting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  {exporting ? 'Exporting...' : 'Export to Tally'}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Result / Summary */}
          <div className="space-y-4">
            <div className="vc-panel">
              <div className="vc-panel-header">
                <CheckCircle2 size={14} className="text-[#a78bfa]" />
                <span className="text-[12px] font-semibold text-[#e2e8f0]">Export Result</span>
              </div>
              <div className="p-4">
                {exportResult === null && !exporting && (
                  <div className="text-[11px] text-[#5a6878] text-center py-8">
                    Configure connection settings and click "Export to Tally"
                  </div>
                )}
                {exporting && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-[#f5a623]" />
                  </div>
                )}
                {exportResult && (
                  <div className="space-y-3">
                    <div className={`flex items-center gap-2 text-[12px] ${exportResult.success ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>
                      {exportResult.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {exportResult.success ? 'Export Successful' : 'Export Failed'}
                    </div>
                    {(() => {
                      const d = exportResult.data as Record<string, unknown> | undefined
                      const summary = d?.summary as Record<string, number> | undefined
                      const msg = d?.message as string | undefined
                      return (<>
                        {summary && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-[#0a0d12] rounded-lg p-2 text-center">
                              <div className="text-[18px] font-bold text-[#f5a623] font-mono">{summary.partiesSent ?? 0}</div>
                              <div className="text-[9px] text-[#5a6878]">Parties</div>
                            </div>
                            <div className="bg-[#0a0d12] rounded-lg p-2 text-center">
                              <div className="text-[18px] font-bold text-[#00d4ff] font-mono">{summary.vouchersSent ?? 0}</div>
                              <div className="text-[9px] text-[#5a6878]">Vouchers</div>
                            </div>
                          </div>
                        )}
                        {msg && (
                          <div className="bg-[#0a0d12] rounded-lg p-2 text-[10px] text-[#8899aa] font-mono break-words max-h-[120px] overflow-y-auto">
                            {msg}
                          </div>
                        )}
                        {exportResult.error && (
                          <div className="bg-[#0a0d12] rounded-lg p-2 text-[10px] text-[#ff3d3d] font-mono break-words">
                            {String(exportResult.error)}
                          </div>
                        )}
                      </>)
                    })()}
                  </div>
                )}
              </div>
            </div>

            <div className="vc-panel">
              <div className="vc-panel-header">
                <Clock size={14} className="text-[#5a6878]" />
                <span className="text-[12px] font-semibold text-[#e2e8f0]">Recent Exports</span>
              </div>
              <div className="p-2 max-h-[250px] overflow-y-auto">
                {syncs.filter(s => s.fileName.startsWith('export-')).slice(0, 5).map(s => (
                  <div key={s.id} className="flex items-center justify-between py-1.5 px-2 text-[10px] border-b border-[#1a2028] last:border-0">
                    <div className="text-[#8899aa] truncate max-w-[120px]">{s.fileName.replace('export-', '')}</div>
                    <span className={`vc-badge ${STATUS_BADGE[s.status] || 'bg-[#5a6878]/15 text-[#5a6878]'}`}>{s.status}</span>
                  </div>
                ))}
                {syncs.filter(s => s.fileName.startsWith('export-')).length === 0 && (
                  <div className="text-[10px] text-[#5a6878] text-center py-4">No exports yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
