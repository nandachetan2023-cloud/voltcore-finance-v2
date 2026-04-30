'use client';
import { useState, useEffect } from 'react';
import { FolderOpen, FileText, Award, AlertTriangle, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = { Valid: '#00e676', Expiring: '#ffab40', Expired: '#ff3d3d' };

export default function MyDocuments() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasEmployee, setHasEmployee] = useState(true);
  const [filter, setFilter] = useState<'all' | 'onboarding' | 'certificate'>('all');

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employee-self/documents').then(r => r.json());
      if (res.success) setDocuments(res.data);
      else if (res.error?.includes('Not linked')) setHasEmployee(false);
      else toast.error(res.error);
    } catch { toast.error('Failed to load documents'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDocs(); }, []);

  const filtered = documents.filter(d => filter === 'all' || d.type === filter);
  const onboardingCount = documents.filter(d => d.type === 'onboarding').length;
  const certCount = documents.filter(d => d.type === 'certificate').length;

  if (!hasEmployee) return (
    <div className="p-6 text-center">
      <AlertTriangle size={32} className="mx-auto text-[#f5a623] mb-3" />
      <p className="text-[13px] font-semibold text-[#e2e8f0] mb-1">Employee profile not linked</p>
      <p className="text-[11px] text-[#5a6878]">Contact your administrator to link your account.</p>
    </div>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-7 h-7 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#a78bfa]/10 rounded-xl flex items-center justify-center">
            <FolderOpen size={18} className="text-[#a78bfa]" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">My Documents</h2>
            <p className="text-[11px] text-[#5a6878]">{onboardingCount} onboarding · {certCount} certificate{certCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={fetchDocs} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
      </div>

      <div className="flex gap-1 bg-[#0d1117] rounded-lg p-1 border border-[#252e3a]">
        {(['all', 'onboarding', 'certificate'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md capitalize transition-all ${filter === f ? 'bg-[#161c24] text-[#f5a623] border border-[#252e3a]' : 'text-[#5a6878] hover:text-[#8899aa]'}`}>
            {f === 'all' ? 'All' : f === 'onboarding' ? 'Onboarding' : 'Certificates'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(doc => (
          <div key={`${doc.type}-${doc.id}`} className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-start gap-3 hover:bg-[#1a2028] transition-colors">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${doc.type === 'certificate' ? 'bg-[#f5a623]/10' : 'bg-[#00e676]/10'}`}>
              {doc.type === 'certificate' ? <Award size={16} className="text-[#f5a623]" /> : <FileText size={16} className="text-[#00e676]" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-[13px] font-semibold text-[#e2e8f0]">{doc.title}</span>
                <span className={`text-[9px] font-bold px-1.5 py-[1px] rounded ${doc.type === 'certificate' ? 'bg-[#f5a623]/15 text-[#f5a623]' : 'bg-[#00e676]/15 text-[#00e676]'}`}>
                  {doc.type === 'certificate' ? 'Certificate' : 'Onboarding'}
                </span>
                {doc.status && (
                  <span className="text-[9px] font-bold px-1.5 py-[1px] rounded" style={{ background: `${STATUS_COLORS[doc.status] || '#5a6878'}15`, color: STATUS_COLORS[doc.status] || '#5a6878' }}>
                    {doc.status}
                  </span>
                )}
              </div>
              {doc.description && <div className="text-[11px] text-[#5a6878]">{doc.description}</div>}
              <div className="flex items-center gap-3 mt-1 text-[10px] text-[#5a6878] flex-wrap">
                {doc.uploadedAt && <span>{doc.type === 'certificate' ? 'Issued' : 'Uploaded'}: {new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                {doc.expiryDate && (
                  <span className={new Date(doc.expiryDate) < new Date() ? 'text-[#ff3d3d]' : ''}>
                    Expires: {new Date(doc.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {new Date(doc.expiryDate) < new Date() && ' — Expired'}
                  </span>
                )}
                {doc.fileName && <span className="font-mono truncate max-w-[180px]">{doc.fileName}</span>}
              </div>
            </div>
            {doc.downloadUrl && (
              <a href={doc.downloadUrl} download={doc.fileName || true} target="_blank" rel="noopener noreferrer"
                className="shrink-0 p-1.5 text-[#5a6878] hover:text-[#a78bfa] transition-colors" title="Download">
                <Download size={14} />
              </a>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 bg-[#161c24] border border-[#252e3a] rounded-xl">
            <FolderOpen size={28} className="mx-auto text-[#5a6878] mb-2" />
            <p className="text-[12px] text-[#5a6878]">No documents found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
