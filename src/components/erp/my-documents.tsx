'use client';
import { useState, useEffect } from 'react';
import { FolderOpen, FileText, Award, AlertTriangle, RefreshCw, Download, CheckCircle2, MessageSquare, ThumbsUp, X } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = { Valid: '#00e676', Expiring: '#ffab40', Expired: '#ff3d3d' };

const inpCls = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]/60 transition-colors placeholder:text-[#5a6878]';

export default function MyDocuments() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasEmployee, setHasEmployee] = useState(true);
  const [filter, setFilter] = useState<'all' | 'onboarding' | 'certificate'>('all');
  const [modalTask, setModalTask] = useState<any>(null);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleConfirm = async (taskId: number) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/employee-self/documents/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, action: 'confirm' }),
      }).then(r => r.json());
      if (res.success) {
        toast.success('Document confirmed');
        fetchDocs();
      } else toast.error(res.error);
    } catch { toast.error('Failed to confirm'); }
    finally { setSubmitting(false); }
  };

  const handleDispute = async () => {
    if (!modalTask) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/employee-self/documents/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: modalTask.id, action: 'dispute', remark }),
      }).then(r => r.json());
      if (res.success) {
        toast.success('Issue reported to admin');
        setModalTask(null);
        setRemark('');
        fetchDocs();
      } else toast.error(res.error);
    } catch { toast.error('Failed to submit'); }
    finally { setSubmitting(false); }
  };

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
        {filtered.map(doc => {
          const isOnboarding = doc.type === 'onboarding';
          const canVerify = isOnboarding && !doc.employeeVerifiedAt && !doc.employeeRemark;
          const isVerified = isOnboarding && doc.employeeVerifiedAt;
          const isDisputed = isOnboarding && doc.employeeRemark;

          return (
            <div key={`${doc.type}-${doc.id}`} className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-start gap-3 hover:bg-[#1a2028] transition-colors">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${doc.type === 'certificate' ? 'bg-[#f5a623]/10' : isVerified ? 'bg-[#00e676]/10' : isDisputed ? 'bg-[#ff3d3d]/10' : 'bg-[#00e676]/10'}`}>
                {doc.type === 'certificate' ? <Award size={16} className="text-[#f5a623]" /> : <FileText size={16} className={isVerified ? 'text-[#00e676]' : isDisputed ? 'text-[#ff3d3d]' : 'text-[#00e676]'} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-[13px] font-semibold text-[#e2e8f0]">{doc.title}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-[1px] rounded ${doc.type === 'certificate' ? 'bg-[#f5a623]/15 text-[#f5a623]' : isVerified ? 'bg-[#00e676]/15 text-[#00e676]' : isDisputed ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' : 'bg-[#00e676]/15 text-[#00e676]'}`}>
                    {doc.type === 'certificate' ? 'Certificate' : isVerified ? 'Confirmed' : isDisputed ? 'Issue Reported' : 'Onboarding'}
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
                  {doc.employeeVerifiedAt && <span className="text-[#00e676]">Verified: {new Date(doc.employeeVerifiedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                  {doc.employeeRemark && <span className="text-[#ff3d3d]">Remark: {doc.employeeRemark}</span>}
                  {doc.expiryDate && (
                    <span className={new Date(doc.expiryDate) < new Date() ? 'text-[#ff3d3d]' : ''}>
                      Expires: {new Date(doc.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {new Date(doc.expiryDate) < new Date() && ' — Expired'}
                    </span>
                  )}
                  {doc.fileName && <span className="font-mono truncate max-w-[180px]">{doc.fileName}</span>}
                </div>

                {canVerify && (
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={() => handleConfirm(doc.id)} disabled={submitting}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#00e676]/15 text-[#00e676] text-[10px] font-semibold rounded-lg hover:bg-[#00e676]/25 transition-colors border border-[#00e676]/30">
                      <ThumbsUp size={11} /> Confirm — Everything is Correct
                    </button>
                    <button onClick={() => { setModalTask(doc); setRemark(''); }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#ff3d3d]/10 text-[#ff3d3d] text-[10px] font-semibold rounded-lg hover:bg-[#ff3d3d]/20 transition-colors border border-[#ff3d3d]/20">
                      <MessageSquare size={11} /> Report Issue
                    </button>
                  </div>
                )}
              </div>
              {doc.downloadUrl && (
                <a href={doc.downloadUrl} download={doc.fileName || true} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 p-1.5 text-[#5a6878] hover:text-[#a78bfa] transition-colors" title="Download">
                  <Download size={14} />
                </a>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 bg-[#161c24] border border-[#252e3a] rounded-xl">
            <FolderOpen size={28} className="mx-auto text-[#5a6878] mb-2" />
            <p className="text-[12px] text-[#5a6878]">No documents found.</p>
          </div>
        )}
      </div>

      {/* Report Issue Modal */}
      {modalTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={() => setModalTask(null)}>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-bold text-[#e2e8f0]">Report Issue — {modalTask.title}</span>
              <button onClick={() => setModalTask(null)} className="text-[#5a6878] hover:text-[#e2e8f0]"><X size={15} /></button>
            </div>
            <textarea className={inpCls + ' resize-none h-24'} value={remark} onChange={e => setRemark(e.target.value)}
              placeholder="Describe what's incorrect or missing..." />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setModalTask(null)}
                className="px-3 py-1.5 text-[11px] text-[#5a6878] bg-[#0d1117] rounded-lg hover:text-[#e2e8f0] transition-colors">Cancel</button>
              <button onClick={handleDispute} disabled={submitting || !remark.trim()}
                className="px-3 py-1.5 bg-[#ff3d3d] text-white text-[11px] font-semibold rounded-lg hover:bg-[#d32f2f] disabled:opacity-50 transition-colors">
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
