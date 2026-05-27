'use client';
import { useState, useEffect, useCallback } from 'react';
import { Bell, Pin, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, Building2, Award, Users, Briefcase, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  general: { label: 'General',  color: '#8899aa' },
  policy:  { label: 'Policy',   color: '#00d4ff' },
  payroll: { label: 'Payroll',  color: '#00e676' },
  safety:  { label: 'Safety',   color: '#ff3d3d' },
  hr:      { label: 'HR',       color: '#f5a623' },
  it:      { label: 'IT',       color: '#a78bfa' },
};

type Filter = 'all' | 'unread' | 'pinned';

export default function MyNotices() {
  const [notices, setNotices] = useState<any[]>([]);
  const [jobOpenings, setJobOpenings] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [hasEmployee, setHasEmployee] = useState(true);

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const [noticeRes, jobRes] = await Promise.all([
        fetch('/api/notices/my').then(r => r.json()),
        fetch('/api/recruitment/openings').then(r => r.json()).catch(() => ({ success: false, data: [] })),
      ]);
      if (noticeRes.success) { setNotices(noticeRes.data); setUnreadCount(noticeRes.unreadCount); }
      else if (noticeRes.error?.includes('Not linked')) setHasEmployee(false);
      if (jobRes.success) setJobOpenings(jobRes.data || []);
    } catch { toast.error('Failed to load notices'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);

  const markRead = async (noticeId: number) => {
    const notice = notices.find(n => n.id === noticeId);
    if (notice?.isRead) return;
    try {
      await fetch('/api/notices/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ noticeId }) });
      setNotices(prev => prev.map(n => n.id === noticeId ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch {}
  };

  const toggleExpand = (id: number) => {
    setExpanded(s => {
      const n = new Set(s);
      if (n.has(id)) { n.delete(id); } else { n.add(id); markRead(id); }
      return n;
    });
  };

  const filtered = notices.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'pinned') return n.isPinned;
    return true;
  });

  if (!hasEmployee) return (
    <div className="p-6 text-center">
      <AlertTriangle size={32} className="mx-auto text-[#f5a623] mb-3" />
      <p className="text-[13px] font-semibold text-[#e2e8f0] mb-1">Employee profile not linked</p>
      <p className="text-[11px] text-[#5a6878]">Contact your administrator to link your account to an employee record.</p>
    </div>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-7 h-7 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f5a623]/10 rounded-xl flex items-center justify-center relative">
            <Bell size={18} className="text-[#f5a623]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ff3d3d] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">My Notices</h2>
            <p className="text-[11px] text-[#5a6878]">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
          </div>
        </div>
        <button onClick={fetchNotices} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-[#0d1117] rounded-lg p-1 border border-[#252e3a]">
        {(['all', 'unread', 'pinned'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md capitalize transition-all ${filter === f ? 'bg-[#161c24] text-[#f5a623] border border-[#252e3a]' : 'text-[#5a6878] hover:text-[#8899aa]'}`}>
            {f}{f === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(n => {
          const tc = TYPE_CONFIG[n.type] || TYPE_CONFIG.general;
          const isExpanded = expanded.has(n.id);
          const target = n.targetDept ? n.targetDept : n.targetDesig ? n.targetDesig : null;
          return (
            <div key={n.id} className={`bg-[#161c24] border rounded-xl overflow-hidden transition-all ${
              n.isPinned ? 'border-[#f5a623]/40' : !n.isRead ? 'border-l-[3px] border-l-[#f5a623] border-[#252e3a]' : 'border-[#252e3a]'
            }`}>
              <button className="w-full flex items-start gap-3 p-4 text-left hover:bg-[#1a2028] transition-colors" onClick={() => toggleExpand(n.id)}>
                <div className="shrink-0 mt-1">
                  {n.isPinned
                    ? <Pin size={11} className="text-[#f5a623]" />
                    : !n.isRead
                      ? <div className="w-2 h-2 rounded-full bg-[#f5a623]" />
                      : <div className="w-2 h-2 rounded-full bg-[#252e3a]" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-[9px] font-bold px-2 py-[2px] rounded-full" style={{ background: `${tc.color}15`, color: tc.color }}>{tc.label}</span>
                    <span className={`text-[13px] font-semibold ${n.isRead ? 'text-[#8899aa]' : 'text-[#e2e8f0]'}`}>{n.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[#5a6878]">
                    <span>From {n.createdByName}</span>
                    <span>·</span>
                    <span>{new Date(n.publishedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    {target && <><span>·</span><span className="flex items-center gap-1">{n.targetDept ? <Building2 size={9} /> : <Award size={9} />}{target}</span></>}
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={14} className="text-[#5a6878] shrink-0 mt-1" /> : <ChevronDown size={14} className="text-[#5a6878] shrink-0 mt-1" />}
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-[#252e3a]">
                  <p className="text-[12px] text-[#8899aa] leading-relaxed whitespace-pre-wrap pt-3">{n.body}</p>
                  {n.expiresAt && <p className="text-[10px] text-[#ff3d3d] mt-2">Expires: {new Date(n.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 bg-[#161c24] border border-[#252e3a] rounded-xl">
            <Bell size={28} className="mx-auto text-[#5a6878] mb-2" />
            <p className="text-[12px] text-[#5a6878]">{filter === 'unread' ? 'No unread notices.' : filter === 'pinned' ? 'No pinned notices.' : 'No notices yet.'}</p>
          </div>
        )}
      </div>

      {/* Job Openings Section */}
      {jobOpenings.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase size={14} className="text-[#00d4ff]" />
            <h3 className="text-[13px] font-bold text-[#e2e8f0]">Open Positions</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00d4ff]/10 text-[#00d4ff] font-semibold">{jobOpenings.length}</span>
          </div>
          <div className="space-y-2">
            {jobOpenings.map(job => (
              <div key={job.id} className="bg-[#161c24] border border-[#00d4ff]/20 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-semibold text-[#e2e8f0]">{job.position}</span>
                      <span className={`text-[9px] font-bold px-2 py-[2px] rounded-full ${
                        job.priority === 'High' ? 'bg-[#ff3d3d]/10 text-[#ff3d3d]' :
                        job.priority === 'Medium' ? 'bg-[#ffab40]/10 text-[#ffab40]' :
                        'bg-[#00e676]/10 text-[#00e676]'
                      }`}>{job.priority}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#5a6878]">
                      <span className="flex items-center gap-1"><MapPin size={10} /> {job.site}</span>
                      <span>{job.openings} opening{job.openings !== 1 ? 's' : ''}</span>
                      <span>{job.applications} application{job.applications !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#5a6878] shrink-0">
                    {new Date(job.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
