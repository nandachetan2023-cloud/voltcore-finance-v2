'use client';
import { useState, useEffect, useCallback } from 'react';
import { FolderOpen, FileText, Award, Search, ChevronDown, ChevronUp, RefreshCw, Download, AlertTriangle, CheckCircle2, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';

interface DocEntry {
  id: number;
  type: 'onboarding' | 'certificate';
  title: string;
  description: string | null;
  fileName: string | null;
  mimeType: string | null;
  uploadedAt: string | null;
  expiryDate?: string | null;
  status?: string;
  downloadUrl: string | null;
}

interface EmployeeRow {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  Department: { name: string } | null;
  Designation: { name: string } | null;
  employmentStatus: string;
  documents: DocEntry[];
  onboardingCount: number;
  certCount: number;
}

const STATUS_COLORS: Record<string, string> = {
  Valid: '#00e676',
  Expiring: '#ffab40',
  Expired: '#ff3d3d',
};

export default function EmployeeDocuments() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<'all' | 'onboarding' | 'certificate'>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employee-documents').then(r => r.json());
      if (res.success) setEmployees(res.data);
      else toast.error(res.error || 'Failed to load documents');
    } catch { toast.error('Failed to load documents'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = employees.filter(emp => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      emp.firstName.toLowerCase().includes(q) ||
      emp.lastName.toLowerCase().includes(q) ||
      emp.employeeCode.toLowerCase().includes(q) ||
      emp.Department?.name.toLowerCase().includes(q);
    const matchesFilter =
      filter === 'all' ||
      (filter === 'onboarding' && emp.onboardingCount > 0) ||
      (filter === 'certificate' && emp.certCount > 0);
    return matchesSearch && matchesFilter;
  });

  const totalOnboarding = employees.reduce((s, e) => s + e.onboardingCount, 0);
  const totalCerts = employees.reduce((s, e) => s + e.certCount, 0);
  const withDocs = employees.filter(e => e.documents.length > 0).length;

  const toggleExpand = (id: number) =>
    setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 max-w-5xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#a78bfa]/10 rounded-xl flex items-center justify-center">
            <FolderOpen size={18} className="text-[#a78bfa]" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Employee Documents</h2>
            <p className="text-[11px] text-[#5a6878]">Onboarding documents & training certificates per employee</p>
          </div>
        </div>
        <button onClick={fetchData} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Employees with Docs', value: withDocs, color: '#a78bfa', icon: Users },
          { label: 'Onboarding Docs', value: totalOnboarding, color: '#00e676', icon: FileText },
          { label: 'Certificates', value: totalCerts, color: '#f5a623', icon: Award },
        ].map(s => (
          <div key={s.label} className="vc-stat-card">
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: s.color }} />
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">{s.label}</div>
                <div className="text-[22px] font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: s.color }}>{s.value}</div>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15` }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6878]" />
          <input
            className="w-full bg-[#161c24] border border-[#252e3a] rounded-lg pl-8 pr-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#a78bfa]/50 placeholder:text-[#3a4a5a]"
            placeholder="Search by name, code or department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {(['all', 'onboarding', 'certificate'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 text-[11px] font-semibold rounded-lg border transition-all capitalize ${filter === f ? 'bg-[#a78bfa]/15 border-[#a78bfa]/40 text-[#a78bfa]' : 'bg-[#161c24] border-[#252e3a] text-[#5a6878] hover:border-[#a78bfa]/30'}`}
          >
            {f === 'all' ? 'All' : f === 'onboarding' ? 'Onboarding' : 'Certificates'}
          </button>
        ))}
      </div>

      {/* Employee list */}
      <div className="space-y-2">
        {filtered.map(emp => {
          const isExpanded = expanded.has(emp.id);
          const visibleDocs = filter === 'all'
            ? emp.documents
            : emp.documents.filter(d => d.type === filter);

          return (
            <div key={emp.id} className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
              {/* Row header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#1a2028] transition-colors"
                onClick={() => toggleExpand(emp.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#a78bfa]/10 flex items-center justify-center text-[11px] font-bold text-[#a78bfa]">
                    {emp.firstName[0]}{emp.lastName[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-[#e2e8f0]">{emp.firstName} {emp.lastName}</span>
                      <span className="text-[9px] text-[#5a6878] font-mono">{emp.employeeCode}</span>
                      {emp.Department && <span className="text-[9px] text-[#5a6878]">{emp.Department.name}</span>}
                      {emp.Designation && <span className="text-[9px] text-[#3a4a5a]">· {emp.Designation.name}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {emp.onboardingCount > 0 && (
                        <span className="flex items-center gap-1 text-[9px] px-1.5 py-[2px] rounded bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/20">
                          <FileText size={9} /> {emp.onboardingCount} onboarding
                        </span>
                      )}
                      {emp.certCount > 0 && (
                        <span className="flex items-center gap-1 text-[9px] px-1.5 py-[2px] rounded bg-[#f5a623]/10 text-[#f5a623] border border-[#f5a623]/20">
                          <Award size={9} /> {emp.certCount} cert{emp.certCount > 1 ? 's' : ''}
                        </span>
                      )}
                      {emp.documents.length === 0 && (
                        <span className="text-[9px] text-[#3a4a5a] italic">no documents</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold text-[#5a6878]">{visibleDocs.length} doc{visibleDocs.length !== 1 ? 's' : ''}</span>
                  {isExpanded ? <ChevronUp size={14} className="text-[#5a6878]" /> : <ChevronDown size={14} className="text-[#5a6878]" />}
                </div>
              </div>

              {/* Documents list */}
              {isExpanded && (
                <div className="border-t border-[#252e3a] p-4">
                  {visibleDocs.length === 0 ? (
                    <p className="text-[11px] text-[#3a4a5a] italic text-center py-4">No documents in this category.</p>
                  ) : (
                    <div className="space-y-2">
                      {visibleDocs.map(doc => (
                        <div key={`${doc.type}-${doc.id}`} className="flex items-start gap-3 px-3 py-2.5 bg-[#0d1117] rounded-lg">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${doc.type === 'certificate' ? 'bg-[#f5a623]/10' : 'bg-[#00e676]/10'}`}>
                            {doc.type === 'certificate'
                              ? <Award size={13} className="text-[#f5a623]" />
                              : <FileText size={13} className="text-[#00e676]" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[12px] font-semibold text-[#e2e8f0]">{doc.title}</span>
                              <span className={`text-[9px] px-1.5 py-[1px] rounded font-semibold ${doc.type === 'certificate' ? 'bg-[#f5a623]/10 text-[#f5a623]' : 'bg-[#00e676]/10 text-[#00e676]'}`}>
                                {doc.type === 'certificate' ? 'Certificate' : 'Onboarding'}
                              </span>
                              {doc.status && (
                                <span className="text-[9px] px-1.5 py-[1px] rounded font-semibold" style={{ background: `${STATUS_COLORS[doc.status] || '#5a6878'}15`, color: STATUS_COLORS[doc.status] || '#5a6878' }}>
                                  {doc.status}
                                </span>
                              )}
                            </div>
                            {doc.description && <div className="text-[10px] text-[#5a6878] mt-0.5">{doc.description}</div>}
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {doc.uploadedAt && (
                                <span className="text-[9px] text-[#3a4a5a]">
                                  {doc.type === 'certificate' ? 'Issued' : 'Uploaded'}: {new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                              )}
                              {doc.expiryDate && (
                                <span className={`text-[9px] ${new Date(doc.expiryDate) < new Date() ? 'text-[#ff3d3d]' : 'text-[#3a4a5a]'}`}>
                                  Expires: {new Date(doc.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  {new Date(doc.expiryDate) < new Date() && ' — Expired'}
                                </span>
                              )}
                              {doc.fileName && <span className="text-[9px] text-[#3a4a5a] font-mono truncate max-w-[200px]">{doc.fileName}</span>}
                            </div>
                          </div>
                          {doc.downloadUrl && (
                            <a
                              href={doc.downloadUrl}
                              download={doc.fileName || true}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 p-1.5 text-[#5a6878] hover:text-[#a78bfa] transition-colors"
                              title="Download"
                            >
                              <Download size={13} />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-[#161c24] border border-[#252e3a] rounded-xl">
            <FolderOpen size={28} className="mx-auto text-[#5a6878] mb-2" />
            <p className="text-[12px] text-[#5a6878]">No employees found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
