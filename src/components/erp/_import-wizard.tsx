'use client';
import { useCallback, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRightLeft, Upload as UploadIcon, Eye, CheckCircle2,
  FileSpreadsheet, Download, AlertTriangle, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { exportToCSV, type ExportColumn } from './_import-export';

export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
  type?: 'number' | 'date';
  /** Alternate header spellings (as shown in the export/table) that should
   *  auto-map to this field, e.g. aliases: ['Total'] for key 'totalAmount'. */
  aliases?: string[];
}

export interface CommitSummary { totalRows: number; created: number; updated: number; skipped: number; errors: number }

// A column shown in the downloaded template for reference (e.g. a computed
// field like a running balance) that isn't one of the mappable system fields.
export interface ReferenceColumn { label: string; sampleValue: string | number }

type Step = 'upload' | 'map' | 'preview' | 'status';
type Row = Record<string, string | number>;

const IGNORE = '__ignore__';

const STEPS: { key: Step; label: string; icon: typeof UploadIcon }[] = [
  { key: 'upload', label: 'Upload', icon: UploadIcon },
  { key: 'map', label: 'Map', icon: ArrowRightLeft },
  { key: 'preview', label: 'Preview', icon: Eye },
  { key: 'status', label: 'Status', icon: CheckCircle2 },
];

interface PreviewRow {
  index: number;
  record: Row;
  valid: boolean;
  willUpdate: boolean;
  duplicateInFile: boolean;
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function autoDetect(fields: ImportField[], header: string): { key: string; quality: 'auto' | 'fuzzy' } | null {
  const norm = normalize(header);
  const exact = fields.find(f => normalize(f.label) === norm || normalize(f.key) === norm);
  if (exact) return { key: exact.key, quality: 'auto' };
  const alias = fields.find(f => f.aliases?.some(a => normalize(a) === norm));
  if (alias) return { key: alias.key, quality: 'auto' };
  const fuzzy = fields.find(f => normalize(f.key).length >= 4 && norm.includes(normalize(f.key)));
  if (fuzzy) return { key: fuzzy.key, quality: 'fuzzy' };
  return null;
}

function columnLetter(index: number): string {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

async function parseSpreadsheet(file: File): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  const XLSX = await import('xlsx');
  const wb = file.name.toLowerCase().endsWith('.csv')
    ? XLSX.read(await file.text(), { type: 'string', cellDates: true })
    : XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

function csvEscape(v: string) {
  return `"${v.replace(/"/g, '""')}"`;
}

function downloadTemplate(title: string, fields: ImportField[], sampleRow?: Row, referenceColumns: ReferenceColumn[] = []) {
  const headerLine = [...fields.map(f => f.label), ...referenceColumns.map(c => c.label)].map(csvEscape).join(',');
  const sampleLine = [
    ...fields.map(f => sampleRow?.[f.key] !== undefined ? String(sampleRow[f.key]) : ''),
    ...referenceColumns.map(c => String(c.sampleValue)),
  ].map(csvEscape).join(',');
  const csv = [headerLine, sampleLine].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-import-template.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-[#161c24] border border-[#252e3a] rounded-lg px-4 py-3">
      <div className="text-[9px] text-[#5a6878] uppercase font-semibold tracking-wider mb-1">{label}</div>
      <div className="text-[18px] font-bold font-mono" style={{ color }}>{value}</div>
    </div>
  );
}

export default function ImportWizard({ title, fields, keyField, existingKeys, commitEndpoint, onClose, onImported, sampleRow, referenceColumns, keyFn }: {
  title: string;
  fields: ImportField[];
  keyField: string;
  existingKeys: Set<string>;
  commitEndpoint: string;
  onClose: () => void;
  onImported: () => void;
  sampleRow?: Row;
  referenceColumns?: ReferenceColumn[];
  /** Override how the dedup/update key is computed per row (for composite keys
   *  like taxType + period). Defaults to the value of `keyField`. */
  keyFn?: (record: Row) => string;
}) {
  const [step, setStep] = useState<Step>('upload');
  const [maxStep, setMaxStep] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [matchQuality, setMatchQuality] = useState<Record<string, 'auto' | 'fuzzy'>>({});
  const [autoDetectedKey, setAutoDetectedKey] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CommitSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiredFields = fields.filter(f => f.required);
  const exportColumns: ExportColumn<Row>[] = fields.map(f => ({ header: f.label, accessor: f.key }));

  const searchText = useCallback((r: PreviewRow) => fields.map(f => String(r.record[f.key] ?? '')).join(' '), [fields]);
  const tc = useTableControls(previewRows, searchText);

  const advance = (s: Step) => { const idx = STEPS.findIndex(x => x.key === s); setMaxStep(m => Math.max(m, idx)); setStep(s); };
  const goToStep = (s: Step) => { if (STEPS.findIndex(x => x.key === s) <= maxStep) setStep(s); };

  const handleFile = useCallback(async (file: File) => {
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) { toast.error('Please upload a .xlsx, .xls, or .csv file'); return; }
    try {
      const { headers: h, rows } = await parseSpreadsheet(file);
      if (h.length === 0) { toast.error('No data found in file'); return; }
      const initialMapping: Record<string, string> = {};
      const quality: Record<string, 'auto' | 'fuzzy'> = {};
      const detectedKey: Record<string, string> = {};
      for (const header of h) {
        const detected = autoDetect(fields, header);
        if (detected) { initialMapping[header] = detected.key; quality[header] = detected.quality; detectedKey[header] = detected.key; }
        else initialMapping[header] = '';
      }
      setFileName(file.name);
      setHeaders(h);
      setRawRows(rows);
      setMapping(initialMapping);
      setMatchQuality(quality);
      setAutoDetectedKey(detectedKey);
      advance('map');
    } catch {
      toast.error('Failed to read file — is it a valid spreadsheet?');
    }
  }, [fields]);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const unmappedCount = headers.filter(h => mapping[h] === '').length;
  const mappedCount = headers.filter(h => mapping[h] !== '' && mapping[h] !== IGNORE).length;
  const qualityScore = headers.length ? Math.round(((headers.length - unmappedCount) / headers.length) * 100) : 0;

  const ignoreAllUnmapped = () => {
    setMapping(m => {
      const next = { ...m };
      for (const h of headers) if (next[h] === '') next[h] = IGNORE;
      return next;
    });
  };

  const validateMapping = () => {
    if (unmappedCount > 0) {
      toast.error(`${unmappedCount} column${unmappedCount > 1 ? 's' : ''} still need${unmappedCount > 1 ? '' : 's'} a mapping decision`);
      return;
    }
    const mappedFieldKeys = new Set(Object.values(mapping));
    const missingRequired = requiredFields.filter(f => !mappedFieldKeys.has(f.key));
    if (missingRequired.length > 0) {
      toast.error(`Map a column to: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }

    const seenKeys = new Set<string>();
    const rows: PreviewRow[] = rawRows.map((row, index) => {
      const record: Row = {};
      for (const f of fields) record[f.key] = '';
      for (const header of headers) {
        const key = mapping[header];
        if (!key || key === IGNORE) continue;
        const field = fields.find(f => f.key === key);
        if (!field) continue;
        const raw = row[header];
        if (field.type === 'number') record[key] = Number(raw) || 0;
        else if (field.type === 'date') record[key] = raw instanceof Date ? raw.toISOString().split('T')[0] : String(raw ?? '').trim();
        else record[key] = String(raw ?? '').trim();
      }
      const valid = requiredFields.every(f => String(record[f.key] ?? '').trim() !== '');
      const keyVal = (keyFn ? keyFn(record) : String(record[keyField] ?? '')).trim();
      const duplicateInFile = valid && keyVal !== '' && seenKeys.has(keyVal);
      if (valid && keyVal) seenKeys.add(keyVal);
      return { index, record, valid, willUpdate: valid && keyVal !== '' && existingKeys.has(keyVal), duplicateInFile };
    });

    setPreviewRows(rows);
    setSelected(new Set(rows.filter(r => r.valid).map(r => r.index)));
    advance('preview');
  };

  const totalRows = previewRows.length;
  const validatedCount = previewRows.filter(r => r.valid).length;
  const warningsCount = previewRows.filter(r => r.duplicateInFile).length;
  const willUpdateCount = previewRows.filter(r => r.willUpdate).length;

  const toggleRow = (index: number) => {
    setSelected(s => {
      const next = new Set(s);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };
  const toggleAllOnPage = () => {
    const pageIndexes = tc.pageItems.filter(r => r.valid).map(r => r.index);
    const allSelected = pageIndexes.length > 0 && pageIndexes.every(i => selected.has(i));
    setSelected(s => {
      const next = new Set(s);
      pageIndexes.forEach(i => allSelected ? next.delete(i) : next.add(i));
      return next;
    });
  };

  const handleCommit = async () => {
    const records = previewRows.filter(r => selected.has(r.index)).map(r => r.record);
    if (records.length === 0) { toast.error('No rows selected'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(commitEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });
      const json = await res.json();
      if (json.success) { setResult(json.summary); advance('status'); }
      else toast.error(json.error || 'Import failed');
    } catch { toast.error('Import failed — network error'); }
    finally { setSubmitting(false); }
  };

  const reset = () => {
    setStep('upload'); setMaxStep(0); setFileName(''); setHeaders([]); setRawRows([]);
    setMapping({}); setMatchQuality({}); setAutoDetectedKey({}); setPreviewRows([]); setSelected(new Set()); setResult(null);
  };

  const pageIndexesValid = tc.pageItems.filter(r => r.valid).map(r => r.index);
  const allPageSelected = pageIndexesValid.length > 0 && pageIndexesValid.every(i => selected.has(i));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <button onClick={onClose} className="flex items-center gap-1.5 text-[12px] font-semibold text-[#8899aa] hover:text-[#e2e8f0] transition-colors">
          <ArrowLeft size={15} /> Data Import
        </button>
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => {
            const active = s.key === step;
            const reached = i <= maxStep;
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => goToStep(s.key)}
                disabled={!reached}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                  active ? 'text-[#f5a623] bg-[#f5a623]/10' : reached ? 'text-[#8899aa] hover:text-[#e2e8f0]' : 'text-[#3a4452] cursor-not-allowed'
                }`}
              >
                <Icon size={13} /> {s.label}
              </button>
            );
          })}
        </div>
        <div className="w-[92px]" />
      </div>

      {step === 'upload' && (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4">
          <div>
            <div className="text-center mb-5">
              <h2 className="text-[20px] font-bold text-[#e2e8f0]">Import Excel Spreadsheet</h2>
              <p className="text-[12px] text-[#8899aa] mt-1">Upload your {title} data to begin the automated mapping process. We support .xlsx and .csv formats.</p>
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`vc-panel border-2 border-dashed ${dragOver ? 'border-[#f5a623] bg-[#f5a623]/5' : 'border-[#2e3a48]'} cursor-pointer flex flex-col items-center justify-center py-16 gap-3 transition-colors`}
            >
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileInputChange} />
              <div className="w-14 h-14 rounded-xl bg-[#f5a623]/15 flex items-center justify-center">
                <FileSpreadsheet size={26} className="text-[#f5a623]" />
              </div>
              <div className="text-[13px] font-semibold text-[#e2e8f0]">Drag and drop file here</div>
              <div className="text-[11px] text-[#5a6878]">or click to browse from your computer</div>
              <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="vc-btn-primary flex items-center gap-1.5 mt-2">
                <UploadIcon size={13} /> Select File
              </button>
            </div>
          </div>
          <div className="vc-panel p-4 space-y-3">
            <div className="text-[12px] font-semibold text-[#e2e8f0]">Setup Guide</div>
            <p className="text-[11px] text-[#8899aa] leading-relaxed">Ensure your data is structured correctly to minimize errors during the mapping phase.</p>
            <button onClick={() => downloadTemplate(title, fields, sampleRow, referenceColumns)} className="w-full vc-btn-ghost flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5"><FileSpreadsheet size={13} /> Download Template</span>
              <Download size={13} />
            </button>
            <ul className="space-y-2 pt-1">
              <li className="flex items-start gap-2 text-[11px] text-[#8899aa]">
                <CheckCircle2 size={13} className="text-[#00e676] shrink-0 mt-0.5" /> {requiredFields.map(f => f.label).join(' and ')} {requiredFields.length === 1 ? 'is' : 'are'} required for every row
              </li>
              <li className="flex items-start gap-2 text-[11px] text-[#8899aa]">
                <CheckCircle2 size={13} className="text-[#00e676] shrink-0 mt-0.5" /> First row must contain column headers
              </li>
            </ul>
          </div>
        </div>
      )}

      {step === 'map' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-[16px] font-bold text-[#e2e8f0]">Map Headers</h2>
              <p className="text-[11px] text-[#8899aa]">Connect columns from {fileName} to {title}&apos;s fields.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={ignoreAllUnmapped} className="vc-btn-ghost text-[11px]">Ignore All Unmapped</button>
              <button onClick={validateMapping} className="vc-btn-primary text-[11px]">Validate Mapping</button>
            </div>
          </div>
          <div className="vc-panel mt-3 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-[#0f1318] border-b border-[#252e3a]">
                  <th className="text-left py-2.5 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Source Header</th>
                  <th className="w-8"></th>
                  <th className="text-left py-2.5 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">System Field</th>
                  <th className="text-left py-2.5 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Sample Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                {headers.map((header, i) => {
                  const value = mapping[header];
                  const isUnset = value === '';
                  const quality = value !== '' && value === autoDetectedKey[header] ? matchQuality[header] : undefined;
                  const sample = rawRows[0]?.[header];
                  return (
                    <tr key={header}>
                      <td className="py-3 px-4">
                        <div className="text-[#e2e8f0] font-medium">{header}</div>
                        <div className="text-[9px] text-[#5a6878] uppercase tracking-wide">Column {columnLetter(i)}</div>
                      </td>
                      <td className="text-center">
                        {isUnset
                          ? <AlertTriangle size={13} className="text-[#ff3d3d] mx-auto" />
                          : value === IGNORE
                            ? <span className="text-[#5a6878]">—</span>
                            : <ArrowRightLeft size={12} className="text-[#5a6878] mx-auto" />}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={value}
                          onChange={(e) => setMapping(m => ({ ...m, [header]: e.target.value }))}
                          className={`bg-[#141920] border rounded-md px-2.5 py-1.5 text-[11px] text-[#e2e8f0] outline-none w-[190px] ${isUnset ? 'border-[#ff3d3d]' : 'border-[#2e3a48] focus:border-[#f5a623]'}`}
                        >
                          <option value="">Select System Field</option>
                          <option value={IGNORE}>-- Ignored --</option>
                          {fields.map(f => <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>)}
                        </select>
                        {isUnset && <div className="text-[9px] text-[#ff3d3d] mt-1">Required field mapping missing</div>}
                        {quality === 'auto' && <div className="text-[9px] text-[#00e676] mt-1 font-semibold uppercase tracking-wide">Auto-mapped</div>}
                        {quality === 'fuzzy' && <div className="text-[9px] text-[#ffab40] mt-1 font-semibold uppercase tracking-wide">Fuzzy match</div>}
                      </td>
                      <td className="py-3 px-4 text-[#8899aa] font-mono text-[10px]">{String(sample ?? '')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <MiniStat label="Mapped Columns" value={`${mappedCount} / ${headers.length}`} color="#e2e8f0" />
            <MiniStat label="Action Required" value={`${unmappedCount} ${unmappedCount === 1 ? 'Column' : 'Columns'}`} color="#ff3d3d" />
            <MiniStat label="Quality Score" value={`${qualityScore}%`} color="#00d4ff" />
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-[16px] font-bold text-[#e2e8f0]">Review Data Source</h2>
              <p className="text-[11px] text-[#8899aa]">{totalRows} rows detected from {fileName}.</p>
            </div>
            <button onClick={() => exportToCSV(previewRows.map(r => r.record), exportColumns, `${title.toLowerCase().replace(/\s+/g, '-')}-import-preview`)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]">
              <Download size={13} /> Export CSV
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-3">
            <MiniStat label="Total Rows" value={totalRows} color="#f5a623" />
            <MiniStat label="Validated" value={validatedCount} color="#00e676" />
            <MiniStat label="Warnings" value={warningsCount} color="#ffab40" />
            <MiniStat label="Will Update" value={willUpdateCount} color="#00d4ff" />
          </div>

          <div className="vc-panel">
            <div className="vc-panel-header">
              <SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search preview data..." />
              <span className="text-[11px] text-[#8899aa] ml-auto">Viewing {tc.from}-{tc.to} of {tc.total}</span>
            </div>
            <div className="overflow-x-auto">
              <div className="max-h-[420px] overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#0f1318]">
                      <th className="py-2 px-3 w-8"><Checkbox checked={allPageSelected} onCheckedChange={toggleAllOnPage} /></th>
                      {fields.map(f => (
                        <th key={f.key} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">{f.label}</th>
                      ))}
                      <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Row Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a2028]">
                    {tc.pageItems.map(r => (
                      <tr key={r.index} className={`hover:bg-[#141920] ${!r.valid ? 'opacity-60' : ''}`}>
                        <td className="py-2 px-3"><Checkbox checked={selected.has(r.index)} disabled={!r.valid} onCheckedChange={() => toggleRow(r.index)} /></td>
                        {fields.map(f => (
                          <td key={f.key} className={`py-2.5 px-3 whitespace-nowrap ${f.key === keyField ? 'text-[#f5a623] font-mono' : 'text-[#8899aa]'}`}>
                            {r.record[f.key] !== '' && r.record[f.key] !== undefined ? String(r.record[f.key]) : '—'}
                          </td>
                        ))}
                        <td className="py-2.5 px-3">
                          {!r.valid
                            ? <span className="vc-badge bg-[#ff3d3d]/15 text-[#ff3d3d]">Error</span>
                            : r.willUpdate
                              ? <span className="vc-badge bg-[#00d4ff]/15 text-[#00d4ff]">Update</span>
                              : <span className="vc-badge bg-[#00e676]/15 text-[#00e676]">New</span>}
                          {r.duplicateInFile && <span className="vc-badge bg-[#ffab40]/15 text-[#ffab40] ml-1">Dup</span>}
                        </td>
                      </tr>
                    ))}
                    {tc.pageItems.length === 0 && <tr><td colSpan={fields.length + 2} className="py-8 text-center text-[#5a6878]">No matching rows</td></tr>}
                  </tbody>
                </table>
              </div>
              <PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 bg-[#161c24] border border-[#252e3a] rounded-lg px-4 py-3">
            <div className="text-[11px] text-[#8899aa]">
              <span className="font-mono text-[#e2e8f0] font-semibold">{selected.size}</span> row{selected.size === 1 ? '' : 's'} selected
              <button onClick={() => setSelected(new Set())} className="ml-3 text-[#5a6878] hover:text-[#e2e8f0] underline">Clear all</button>
            </div>
            <button onClick={handleCommit} disabled={submitting || selected.size === 0} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              {submitting ? 'Importing...' : `Commit ${selected.size} Record${selected.size === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}

      {step === 'status' && result && (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-16 h-16 rounded-full bg-[#00e676]/15 flex items-center justify-center mb-4">
            <CheckCircle2 size={32} className="text-[#00e676]" />
          </div>
          <h2 className="text-[20px] font-bold text-[#e2e8f0]">Import Complete</h2>
          <p className="text-[12px] text-[#8899aa] mt-1 mb-6">Your data has been successfully processed and synced.</p>

          <div className="vc-panel w-full max-w-md p-5">
            <div className="text-[10px] text-[#5a6878] uppercase font-semibold tracking-wider mb-3">Summary Report</div>
            <div className="grid grid-cols-2 gap-4">
              <div><div className="text-[9px] text-[#5a6878] uppercase font-semibold">Total Records</div><div className="text-[20px] font-bold text-[#e2e8f0] font-mono">{result.totalRows}</div></div>
              <div><div className="text-[9px] text-[#5a6878] uppercase font-semibold">New Entities</div><div className="text-[20px] font-bold text-[#00e676] font-mono">{result.created}</div></div>
              <div><div className="text-[9px] text-[#5a6878] uppercase font-semibold">Updated</div><div className="text-[20px] font-bold text-[#00d4ff] font-mono">{result.updated}</div></div>
              <div><div className="text-[9px] text-[#5a6878] uppercase font-semibold">Errors</div><div className="text-[20px] font-bold text-[#ff3d3d] font-mono">{result.errors}</div></div>
            </div>
            <div className={`mt-4 rounded-md px-3 py-2 text-[10px] ${result.errors === 0 ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-[#ffab40]/10 text-[#ffab40]'}`}>
              {result.errors === 0 ? 'All records matched schema constraints. No manual reconciliation required.' : `${result.errors} row(s) failed — check the data and re-import if needed.`}
            </div>
            <div className="flex items-center gap-2 mt-5">
              <button onClick={() => { onImported(); onClose(); }} className="vc-btn-primary flex-1">View Data</button>
              <button onClick={reset} className="vc-btn-ghost flex-1">Import Another</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
