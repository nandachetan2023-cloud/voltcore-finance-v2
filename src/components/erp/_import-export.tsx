'use client';
import { useRef } from 'react';
import { Download, Upload, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

/* ── Column definition for CSV/Excel export ── */
export interface ExportColumn<T = Record<string, unknown>> {
  header: string;
  accessor: string | ((row: T) => string | number);
}

/* ── Client-side CSV export ── */
export function exportToCSV<T>(records: T[], columns: ExportColumn<T>[], filename: string) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = columns.map(c => escape(c.header)).join(',');
  const rows = records.map(r =>
    columns.map(c => {
      const val = typeof c.accessor === 'function' ? c.accessor(r) : (r as Record<string, unknown>)[c.accessor];
      return escape(String(val ?? ''));
    }).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`Exported ${records.length} rows`);
}

/* ── Client-side XLSX export (simple) ── */
export async function exportToXLSX<T>(records: T[], columns: ExportColumn<T>[], filename: string) {
  try {
    const XLSX = await import('xlsx');
    const data = records.map(r =>
      Object.fromEntries(columns.map(c => {
        const val = typeof c.accessor === 'function' ? c.accessor(r) : (r as Record<string, unknown>)[c.accessor];
        return [c.header, val ?? ''];
      }))
    );
    if (data.length === 0) data.push(Object.fromEntries(columns.map(c => [c.header, ''])));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
    toast.success(`Exported ${records.length} rows to Excel`);
  } catch {
    toast.error('Failed to export Excel — xlsx library not loaded');
  }
}

/* ── Import Button (hidden file input + FormData POST) ── */
export function ImportButton({ accept = '.xlsx,.xls', endpoint, label = 'Import', onImported }: {
  accept?: string;
  endpoint: string;
  label?: string;
  onImported?: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      toast.info('Importing...');
      const res = await fetch(endpoint, { method: 'POST', body: fd });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || json.summary
          ? `Imported: ${json.summary?.created ?? 0} created, ${json.summary?.skipped ?? 0} skipped, ${json.summary?.errors ?? 0} errors`
          : 'Import successful');
        onImported?.();
      } else {
        toast.error(json.error || 'Import failed');
      }
    } catch {
      toast.error('Import failed — network error');
    }
    e.target.value = '';
  };
  return (
    <>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={handleChange} />
      <button onClick={() => ref.current?.click()} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]">
        <Upload size={13} /> {label}
      </button>
    </>
  );
}

/* ── Export Button (client-side CSV) ── */
export function ExportButton<T>({ records, columns, filename, format = 'csv', label = 'Export' }: {
  records: T[];
  columns: ExportColumn<T>[];
  filename: string;
  format?: 'csv' | 'xlsx';
  label?: string;
}) {
  const handleClick = () => {
    if (format === 'xlsx') { exportToXLSX(records, columns, filename); }
    else { exportToCSV(records, columns, filename); }
  };
  return (
    <button onClick={handleClick} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]" title={`Export as ${format.toUpperCase()}`}>
      <Download size={13} /> {label}
    </button>
  );
}

/* ── Combined Import/Export toolbar ── */
export function ImportExportToolbar<T>({ records, columns, filename, importEndpoint, format = 'csv', onImported }: {
  records: T[];
  columns: ExportColumn<T>[];
  filename: string;
  importEndpoint?: string;
  format?: 'csv' | 'xlsx';
  onImported?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 ml-auto">
      {importEndpoint && <ImportButton endpoint={importEndpoint} onImported={onImported} />}
      {records.length > 0 && <ExportButton records={records} columns={columns} filename={filename} format={format} />}
    </div>
  );
}
