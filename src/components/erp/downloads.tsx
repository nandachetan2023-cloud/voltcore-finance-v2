'use client';

import { useState, useEffect } from 'react';
import { useERPStore } from '@/store/erp-store';
import {
  Download, FileText, Database, Table, BookOpen, FileType,
  Clock, HardDrive, CheckCircle2, Loader2, RefreshCw,
  FileSpreadsheet, File, Archive
} from 'lucide-react';
import { toast } from 'sonner';

interface DownloadFile {
  name: string;
  filename: string;
  size: string;
  lastModified: string;
  type: string;
  description: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  'SQL Script': Database,
  'Prisma Schema': Database,
  'Excel Spreadsheet': FileSpreadsheet,
  'PDF Document': FileText,
  'Markdown': FileType,
};

const TYPE_COLORS: Record<string, string> = {
  'SQL Script': '#00d4ff',
  'Prisma Schema': '#a78bfa',
  'Excel Spreadsheet': '#00e676',
  'PDF Document': '#ff3d3d',
  'Markdown': '#f5a623',
};

export default function DownloadsPage() {
  const { triggerCreate } = useERPStore();
  const [files, setFiles] = useState<DownloadFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/downloads');
      const json = await res.json();
      if (json.success) setFiles(json.data.files);
      else toast.error('Failed to load files');
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    if (triggerCreate > 0) fetchFiles();
  }, [triggerCreate]);

  const handleDownload = async (file: DownloadFile) => {
    setDownloading(file.filename);
    try {
      const res = await fetch('/api/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.filename }),
      });

      if (!res.ok) {
        toast.error('Download failed');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${file.name}`);
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="vc-panel animate-pulse">
              <div className="vc-panel-body">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#252e3a]" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-[#252e3a] rounded w-2/3" />
                    <div className="h-3 bg-[#252e3a] rounded w-full" />
                    <div className="h-3 bg-[#252e3a] rounded w-4/5" />
                    <div className="flex gap-3 mt-2">
                      <div className="h-6 bg-[#252e3a] rounded w-16" />
                      <div className="h-6 bg-[#252e3a] rounded w-20" />
                      <div className="h-6 bg-[#252e3a] rounded w-24" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[18px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Project Downloads
          </h2>
          <p className="text-[11px] text-[#5a6878] mt-1">
            Exportable files, database schemas, and documentation for VoltCore ERP
          </p>
        </div>
        <button onClick={fetchFiles} className="vc-btn-ghost flex items-center gap-1.5">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="vc-stat-card">
          <div className="text-[10px] text-[#5a6878] uppercase tracking-wider mb-1">Total Files</div>
          <div className="text-[22px] font-bold text-[#f5a623]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {files.length}
          </div>
        </div>
        <div className="vc-stat-card">
          <div className="text-[10px] text-[#5a6878] uppercase tracking-wider mb-1">Modules Covered</div>
          <div className="text-[22px] font-bold text-[#00d4ff]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            12
          </div>
        </div>
        <div className="vc-stat-card">
          <div className="text-[10px] text-[#5a6878] uppercase tracking-wider mb-1">Database Tables</div>
          <div className="text-[22px] font-bold text-[#00e676]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            34
          </div>
        </div>
      </div>

      {/* File Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {files.map((file) => {
          const Icon = ICON_MAP[file.type] || File;
          const color = TYPE_COLORS[file.type] || '#f5a623';

          return (
            <div key={file.filename} className="vc-panel hover:border-[#f5a623]/30 transition-all duration-200 group">
              <div className="vc-panel-body">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <Icon size={22} style={{ color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[13px] font-semibold text-[#e2e8f0] truncate">
                        {file.name}
                      </h3>
                      <span
                        className="vc-badge shrink-0"
                        style={{
                          backgroundColor: `${color}15`,
                          color,
                        }}
                      >
                        {file.type}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#5a6878] leading-relaxed mb-3 line-clamp-2">
                      {file.description}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-[10px] text-[#5a6878]">
                      <span className="flex items-center gap-1">
                        <HardDrive size={10} /> {file.size}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {file.lastModified}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={10} /> Ready
                      </span>
                    </div>
                  </div>

                  {/* Download Button */}
                  <button
                    onClick={() => handleDownload(file)}
                    disabled={downloading === file.filename}
                    className="vc-btn-primary shrink-0 flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                  >
                    {downloading === file.filename ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Download size={12} />
                    )}
                    {downloading === file.filename ? 'Saving...' : 'Download'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Banner */}
      <div className="mt-6 p-4 rounded-xl bg-[#161c24] border border-[#252e3a]">
        <div className="flex items-start gap-3">
          <BookOpen size={16} className="text-[#f5a623] mt-0.5 shrink-0" />
          <div>
            <h4 className="text-[12px] font-semibold text-[#e2e8f0] mb-1">Database Setup Guide</h4>
            <p className="text-[11px] text-[#5a6878] leading-relaxed">
              <strong className="text-[#8899aa]">MySQL:</strong> Import <code className="text-[#f5a623] bg-[#141920] px-1.5 py-0.5 rounded text-[10px]">voltcore_erp_mysql.sql</code> into MySQL 8.0+ and update your <code className="text-[#f5a623] bg-[#141920] px-1.5 py-0.5 rounded text-[10px]">DATABASE_URL</code> in <code className="text-[#f5a623] bg-[#141920] px-1.5 py-0.5 rounded text-[10px]">.env</code>.
              <br />
              <strong className="text-[#8899aa]">SQLite:</strong> The Prisma schema is configured for local development. Run <code className="text-[#f5a623] bg-[#141920] px-1.5 py-0.5 rounded text-[10px]">bun run db:push && bun run db:seed</code> to set up.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
