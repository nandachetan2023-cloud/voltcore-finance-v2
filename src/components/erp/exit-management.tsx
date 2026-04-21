'use client';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, BarChart3, FileText, TrendingDown, Users, RefreshCw, CheckCircle2, Lock, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const REASONS = [
  { value: 'compensation', label: 'Compensation' },
  { value: 'growth', label: 'Career Growth' },
  { value: 'culture', label: 'Company Culture' },
  { value: 'personal', label: 'Personal Reasons' },
  { value: 'relocation', label: 'Relocation' },
  { value: 'other', label: 'Other' },
];

const REASON_COLORS: Record<string, string> = {
  compensation: '#ff3d3d', growth: '#f5a623', culture: '#a78bfa',
  personal: '#00d4ff', relocation: '#00e676', other: '#5a6878',
};

interface CurrentUser {
  isAdmin: boolean;
  isLevel1: boolean;
  deptName: string | null;
}

export default function ExitManagement() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [resignations, setResignations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser>({ isAdmin: false, isLevel1: false, deptName: null });
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [selectedResignation, setSelectedResignation] = useState<any>(null);
  const [existingInterview, setExistingInterview] = useState<any>(null);
  const [form, setForm] = useState({ primaryReason: '', cultureFeedback: '', managementFeedback: '', suggestions: '', wouldRejoin: '', rating: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, rRes] = await Promise.all([
        fetch('/api/exit-management').then(r => r.json()),
        fetch('/api/offboarding?status=approved').then(r => r.json()),
      ]);
      if (aRes.success) {
        setAnalytics(aRes.data);
        if (aRes.currentUser) setCurrentUser(aRes.currentUser);
      }
      if (rRes.success) setResignations(rRes.data);
    } catch { toast.error('Failed to load exit data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openInterview = async (r: any) => {
    setSelectedResignation(r);
    const res = await fetch(`/api/exit-management?resignationId=${r.id}`).then(d => d.json());
    const interview = res.success ? res.data : null;
    setExistingInterview(interview);
    if (interview) {
      setForm({
        primaryReason: interview.primaryReason || '',
        cultureFeedback: interview.cultureFeedback || '',
        managementFeedback: interview.managementFeedback || '',
        suggestions: interview.suggestions || '',
        wouldRejoin: interview.wouldRejoin?.toString() || '',
        rating: interview.rating?.toString() || '',
      });
    } else {
      setForm({ primaryReason: '', cultureFeedback: '', managementFeedback: '', suggestions: '', wouldRejoin: '', rating: '' });
    }
    setInterviewOpen(true);
  };

  const saveInterview = async () => {
    if (!selectedResignation) return;
    setSaving(true);
    try {
      const res = await fetch('/api/exit-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resignationId: selectedResignation.id,
          ...form,
          wouldRejoin: form.wouldRejoin === 'true' ? true : form.wouldRejoin === 'false' ? false : null,
          rating: form.rating ? parseInt(form.rating) : null,
        }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Exit interview saved'); setInterviewOpen(false); fetchData(); }
      else toast.error(data.error);
    } finally { setSaving(false); }
  };

  // Can the current user edit this interview?
  // - No existing interview → level-1 or admin can create
  // - Existing interview → only admin can edit
  const canEdit = (hasInterview: boolean) => {
    if (!hasInterview) return currentUser.isAdmin || currentUser.isLevel1;
    return currentUser.isAdmin;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" />
    </div>
  );

  // Block non-level-1, non-admin users
  if (!currentUser.isAdmin && !currentUser.isLevel1) {
    return (
      <div className="p-4 max-w-4xl">
        <div className="flex flex-col items-center justify-center h-[400px] bg-[#161c24] border border-[#252e3a] rounded-xl">
          <div className="w-16 h-16 bg-[#ff3d3d]/10 rounded-full flex items-center justify-center mb-4">
            <UserX size={32} className="text-[#ff3d3d]" />
          </div>
          <h3 className="text-[16px] font-bold text-[#e2e8f0] mb-2">Access Restricted</h3>
          <p className="text-[12px] text-[#5a6878] text-center max-w-md">
            Only Level-1 role employees and administrators can access exit management.
          </p>
          <p className="text-[11px] text-[#3a4a5a] mt-2">Contact your administrator if you need access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#a78bfa]/10 rounded-xl flex items-center justify-center">
            <ArrowLeft size={18} className="text-[#a78bfa]" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Exit Management</h2>
            <p className="text-[11px] text-[#5a6878]">Exit interviews, clearances, and turnover analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentUser.isAdmin && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-[#f5a623]/10 text-[#f5a623] border border-[#f5a623]/20 font-semibold">
              Admin
            </span>
          )}
          {!currentUser.isAdmin && currentUser.deptName && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20 font-semibold uppercase">
              {currentUser.deptName} dept
            </span>
          )}
          <button onClick={fetchData} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
        </div>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="vc-stat-card">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ff3d3d]" />
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Turnover Rate</div>
                <div className="text-[22px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{analytics.turnoverRate}%</div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#ff3d3d]/15 flex items-center justify-center"><TrendingDown size={18} className="text-[#ff3d3d]" /></div>
            </div>
          </div>
          <div className="vc-stat-card">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" />
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Resigned</div>
                <div className="text-[22px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{analytics.resigned}</div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#f5a623]/15 flex items-center justify-center"><FileText size={18} className="text-[#f5a623]" /></div>
            </div>
          </div>
          <div className="vc-stat-card col-span-2">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#a78bfa]" />
            <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-2">Exit Reasons</div>
            <div className="flex flex-wrap gap-2">
              {analytics.reasonBreakdown?.map((r: any) => (
                <div key={r.reason} className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: `${REASON_COLORS[r.reason] || '#5a6878'}15` }}>
                  <span className="text-[10px] font-semibold" style={{ color: REASON_COLORS[r.reason] || '#5a6878' }}>{REASONS.find(x => x.value === r.reason)?.label || r.reason}</span>
                  <span className="text-[9px] text-[#5a6878]">({r.count})</span>
                </div>
              ))}
              {(!analytics.reasonBreakdown || analytics.reasonBreakdown.length === 0) && (
                <span className="text-[11px] text-[#5a6878]">No exit interviews recorded yet</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Exit interviews list */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileText size={14} className="text-[#a78bfa]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Exit Interviews</span>
          <span className="ml-auto vc-badge bg-[#252e3a] text-[#8899aa]">{resignations.length}</span>
        </div>
        <div className="divide-y divide-[#1a2028]">
          {resignations.map(r => {
            const hasInterview = !!r.exitInterview;
            const allCleared = r.clearances?.every((c: any) => c.status === 'cleared');
            const editable = canEdit(hasInterview);
            return (
              <div key={r.id} className="flex items-center justify-between p-4 hover:bg-[#141920] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#a78bfa]/10 flex items-center justify-center text-[11px] font-bold text-[#a78bfa]">
                    {r.Employee?.firstName?.[0]}{r.Employee?.lastName?.[0]}
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-[#e2e8f0]">{r.Employee?.firstName} {r.Employee?.lastName}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#5a6878]">
                        LWD: {r.calculatedLwd ? new Date(r.calculatedLwd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </span>
                      {hasInterview && !currentUser.isAdmin && (
                        <span className="flex items-center gap-1 text-[9px] text-[#5a6878]">
                          <Lock size={9} /> saved — admin only edit
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {allCleared && <span className="text-[9px] text-[#00e676] flex items-center gap-1"><CheckCircle2 size={11} /> All Cleared</span>}
                  <button
                    onClick={() => openInterview(r)}
                    className={`px-3 py-1.5 text-[10px] font-semibold rounded-lg border transition-all
                      ${hasInterview
                        ? editable
                          ? 'bg-[#f5a623]/10 text-[#f5a623] border-[#f5a623]/20 hover:bg-[#f5a623]/20'
                          : 'bg-[#252e3a] text-[#5a6878] border-[#2e3a48]'
                        : 'bg-[#a78bfa]/10 text-[#a78bfa] border-[#a78bfa]/20 hover:bg-[#a78bfa]/20'
                      }`}
                  >
                    {hasInterview ? (editable ? 'Edit Interview' : 'View Interview') : 'Conduct Interview'}
                  </button>
                </div>
              </div>
            );
          })}
          {resignations.length === 0 && (
            <div className="py-10 text-center text-[#5a6878] text-[12px]">No approved resignations pending exit interviews.</div>
          )}
        </div>
      </div>

      {/* Exit Interview Dialog */}
      <Dialog open={interviewOpen} onOpenChange={setInterviewOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#a78bfa] flex items-center gap-2">
              <FileText size={16} />
              Exit Interview — {selectedResignation?.Employee?.firstName} {selectedResignation?.Employee?.lastName}
              {existingInterview && !currentUser.isAdmin && (
                <span className="ml-auto flex items-center gap-1 text-[9px] text-[#5a6878] font-normal">
                  <Lock size={10} /> read-only
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {/* Read-only notice for non-admin when interview exists */}
            {existingInterview && !currentUser.isAdmin && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#252e3a] border border-[#2e3a48] rounded-lg">
                <Lock size={12} className="text-[#5a6878] shrink-0" />
                <span className="text-[11px] text-[#5a6878]">This interview has been saved and can only be edited by an administrator.</span>
              </div>
            )}

            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Primary Reason for Leaving</label>
              <select
                className="vc-input appearance-none"
                value={form.primaryReason}
                onChange={e => setForm(f => ({ ...f, primaryReason: e.target.value }))}
                disabled={!!(existingInterview && !currentUser.isAdmin)}
              >
                <option value="">Select reason...</option>
                {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Company Culture Feedback</label>
              <textarea className="vc-input resize-none" rows={2} value={form.cultureFeedback} onChange={e => setForm(f => ({ ...f, cultureFeedback: e.target.value }))} placeholder="Feedback on culture..." disabled={!!(existingInterview && !currentUser.isAdmin)} />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Management Feedback</label>
              <textarea className="vc-input resize-none" rows={2} value={form.managementFeedback} onChange={e => setForm(f => ({ ...f, managementFeedback: e.target.value }))} placeholder="Feedback on management..." disabled={!!(existingInterview && !currentUser.isAdmin)} />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Suggestions for Improvement</label>
              <textarea className="vc-input resize-none" rows={2} value={form.suggestions} onChange={e => setForm(f => ({ ...f, suggestions: e.target.value }))} placeholder="What could we do better?" disabled={!!(existingInterview && !currentUser.isAdmin)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Would Rejoin?</label>
                <select className="vc-input appearance-none" value={form.wouldRejoin} onChange={e => setForm(f => ({ ...f, wouldRejoin: e.target.value }))} disabled={!!(existingInterview && !currentUser.isAdmin)}>
                  <option value="">Not answered</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Overall Rating (1-5)</label>
                <select className="vc-input appearance-none" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} disabled={!!(existingInterview && !currentUser.isAdmin)}>
                  <option value="">Not rated</option>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {'★'.repeat(n)}</option>)}
                </select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#1a2332] text-[#8899aa] border border-[#2e3a48]" onClick={() => setInterviewOpen(false)}>
              {existingInterview && !currentUser.isAdmin ? 'Close' : 'Cancel'}
            </Button>
            {/* Only show save if user can edit */}
            {canEdit(!!existingInterview) && (
              <Button className="bg-[#a78bfa] text-black hover:bg-[#9061f9] font-semibold" disabled={saving} onClick={saveInterview}>
                {saving ? 'Saving...' : 'Save Interview'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
