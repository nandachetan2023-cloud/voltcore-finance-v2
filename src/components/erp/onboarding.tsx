'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, UserCheck, CheckCircle2, Clock, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Upload, FileText, X, Download, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { FieldError, fieldBorderError } from '@/components/ui/field-error';
import { type FieldErrors } from '@/lib/form-validation';

// Confirmation dialog component
function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Yes', danger = false }: {
  open: boolean; title: string; message: string;
  onConfirm: () => void; onCancel: () => void;
  confirmLabel?: string; danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5 w-[340px] shadow-2xl space-y-4">
        <div className="text-[14px] font-bold text-[#e2e8f0]">{title}</div>
        <div className="text-[12px] text-[#8899aa] leading-relaxed">{message}</div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-[12px] text-[#8899aa] border border-[#252e3a] rounded-lg hover:border-[#f5a623]">Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-[12px] font-bold rounded-lg ${danger ? 'bg-[#ff3d3d] text-white hover:bg-[#e03030]' : 'bg-[#00e676] text-black hover:bg-[#00c864]'}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = { pending: '#ffab40', in_progress: '#00d4ff', completed: '#00e676', skipped: '#5a6878' };
const ROLE_COLORS: Record<string, string> = { hr: '#f5a623', it: '#00d4ff', manager: '#00e676', finance: '#a78bfa', admin: '#ff3d3d' };

export default function OnboardingModule() {
  const [checklists, setChecklists] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [newEmpId, setNewEmpId] = useState('');
  const [newTplId, setNewTplId] = useState('');
  const [creating, setCreating] = useState(false);
  const [checklistFieldErrors, setChecklistFieldErrors] = useState<FieldErrors>({});
  const [uploading, setUploading] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetTaskId, setUploadTargetTaskId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<{ isAdmin: boolean; isLevel1: boolean } | null>(null);
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; taskId: number | null; requiresDocument: boolean; hasDocument: boolean;
  }>({ open: false, taskId: null, requiresDocument: false, hasDocument: false });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, eRes, tRes] = await Promise.all([
        fetch('/api/onboarding').then(r => r.json()),
        fetch('/api/employees').then(r => r.json()),
        fetch('/api/checklist-templates').then(r => r.json()),
      ]);
      if (cRes.success) {
        setChecklists(cRes.data);
        if (cRes.currentUser) setCurrentUser(cRes.currentUser);
      }
      if (eRes.success) setEmployees(eRes.data.filter((e: any) => e.employmentStatus === 'active'));
      if (tRes.success) setTemplates(tRes.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createChecklist = async () => {
    const errors: FieldErrors = {}
    if (!newEmpId) errors.newEmpId = 'Employee is required'
    if (!newTplId) errors.newTplId = 'Template is required'
    setChecklistFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    setCreating(true);
    try {
      const res = await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: newEmpId, templateId: newTplId }) });
      const data = await res.json();
      if (data.success) { toast.success('Onboarding checklist created'); fetchData(); setShowCreate(false); setNewEmpId(''); setNewTplId(''); setChecklistFieldErrors({}); }
      else toast.error(data.error);
    } finally { setCreating(false); }
  };

  const updateTask = async (taskId: number, status: string) => {
    const res = await fetch('/api/onboarding', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId, status }) });
    const data = await res.json();
    if (data.success) {
      fetchData();
      if (data.checklistCompleted) toast.success('🎉 Onboarding checklist fully completed!', { duration: 5000 });
      else toast.success('Task updated');
    } else toast.error(data.error);
  };

  // Called when user clicks the checkbox to mark complete
  const requestMarkComplete = (task: any, isBlocked: boolean) => {
    if (isBlocked) return;
    const requiresDocument = !!task.templateTask?.requiresDocument;
    const docNecessary = !!task.templateTask?.documentNecessary;
    const hasDocument = !!task.documentPath;
    // Hard block at UI level — API also enforces this
    if (docNecessary && !hasDocument) return;
    setConfirmDialog({ open: true, taskId: task.id, requiresDocument, hasDocument });
  };

  const handleConfirmComplete = async () => {
    const { taskId } = confirmDialog;
    setConfirmDialog({ open: false, taskId: null, requiresDocument: false, hasDocument: false });
    if (taskId !== null) await updateTask(taskId, 'completed');
  };

  const handleCancelConfirm = () => {
    setConfirmDialog({ open: false, taskId: null, requiresDocument: false, hasDocument: false });
  };

  const triggerUpload = (taskId: number) => {
    setUploadTargetTaskId(taskId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetTaskId) return;
    setUploading(uploadTargetTaskId);
    try {
      const fd = new FormData();
      fd.append('taskId', uploadTargetTaskId.toString());
      fd.append('file', file);
      const res = await fetch('/api/onboarding/document', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) { toast.success(`Document "${file.name}" uploaded`); fetchData(); }
      else toast.error(data.error);
    } finally { setUploading(null); setUploadTargetTaskId(null); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const downloadDoc = (taskId: number, fileName: string) => {
    const a = document.createElement('a');
    a.href = `/api/onboarding/document?taskId=${taskId}`;
    a.download = fileName;
    a.click();
  };

  const removeDoc = async (taskId: number) => {
    const res = await fetch('/api/onboarding/document', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId }) });
    const data = await res.json();
    if (data.success) { toast.success('Document removed'); fetchData(); }
    else toast.error(data.error);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-7 h-7 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" /></div>;

  // Block anyone who is not admin or level-1
  if (currentUser && !currentUser.isAdmin && !currentUser.isLevel1) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center h-[400px] bg-[#161c24] border border-[#252e3a] rounded-xl">
          <div className="w-16 h-16 bg-[#00e676]/10 rounded-full flex items-center justify-center mb-4">
            <Lock size={32} className="text-[#00e676]" />
          </div>
          <h3 className="text-[16px] font-bold text-[#e2e8f0] mb-2">Access Restricted</h3>
          <p className="text-[12px] text-[#5a6878] text-center max-w-md">
            Only Level-1 role employees and administrators can access the onboarding module.
          </p>
          <p className="text-[11px] text-[#3a4a5a] mt-2">Contact your administrator if you need access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={handleFileChange} />

      {/* Confirmation dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title="Mark Task as Complete?"
        message={
          confirmDialog.requiresDocument && !confirmDialog.hasDocument
            ? "⚠️ This task requires a document but none has been uploaded. The task will be marked complete with the document marked as unavailable. Are you sure you want to proceed?"
            : "Are you sure you want to mark this task as complete? This action cannot be undone."
        }
        confirmLabel="Yes, Mark Complete"
        onConfirm={handleConfirmComplete}
        onCancel={handleCancelConfirm}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#00e676]/10 rounded-xl flex items-center justify-center"><UserCheck size={18} className="text-[#00e676]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Onboarding</h2>
            <p className="text-[11px] text-[#5a6878]">Track new employee onboarding progress</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
          <button onClick={() => { setShowCreate(true); setChecklistFieldErrors({}); }} className="flex items-center gap-1.5 px-3 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a]"><Plus size={13} /> Start Onboarding</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'In Progress', value: checklists.filter(c => c.status === 'in_progress').length, color: '#00d4ff', icon: Clock },
          { label: 'Completed', value: checklists.filter(c => c.status === 'completed').length, color: '#00e676', icon: CheckCircle2 },
          { label: 'Total', value: checklists.length, color: '#f5a623', icon: UserCheck },
        ].map(s => (
          <div key={s.label} className="vc-stat-card">
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: s.color }} />
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">{s.label}</div>
                <div className="text-[22px] font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: s.color }}>{s.value}</div>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15` }}><s.icon size={18} style={{ color: s.color }} /></div>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 space-y-3">
          <div className="text-[13px] font-semibold text-[#e2e8f0]">Start New Onboarding</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5">Employee *</label>
              <select className={`w-full bg-[#0d1117] border rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none ${checklistFieldErrors.newEmpId ? 'border-[#ff3d3d]/60 focus:border-[#ff3d3d]' : 'border-[#2e3a48]'}`} value={newEmpId} onChange={e => { setNewEmpId(e.target.value); setChecklistFieldErrors(fe => ({ ...fe, newEmpId: '' })); }}>
                <option value="">Select employee...</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.employeeCode} — {e.firstName} {e.lastName}</option>)}
              </select>
              <FieldError message={checklistFieldErrors.newEmpId} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5">Template *</label>
              <select className={`w-full bg-[#0d1117] border rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none ${checklistFieldErrors.newTplId ? 'border-[#ff3d3d]/60 focus:border-[#ff3d3d]' : 'border-[#2e3a48]'}`} value={newTplId} onChange={e => { setNewTplId(e.target.value); setChecklistFieldErrors(fe => ({ ...fe, newTplId: '' })); }}>
                <option value="">Select template...</option>
                {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <FieldError message={checklistFieldErrors.newTplId} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={createChecklist} disabled={creating} className="px-4 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] disabled:opacity-50">{creating ? 'Creating...' : 'Create Checklist'}</button>
            <button onClick={() => { setShowCreate(false); setChecklistFieldErrors({}); }} className="px-4 py-2 text-[12px] text-[#8899aa] border border-[#252e3a] rounded-lg hover:border-[#f5a623]">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {checklists.map(c => {
          const completedCount = c.tasks?.filter((t: any) => t.status === 'completed' || t.status === 'skipped').length || 0;
          const totalCount = c._count?.tasks || c.tasks?.length || 0;
          const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
          const isExpanded = expanded.has(c.id);
          return (
            <div key={c.id} className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#1a2028]" onClick={() => setExpanded(s => { const n = new Set(s); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#f5a623]/10 flex items-center justify-center text-[12px] font-bold text-[#f5a623]">
                    {c.Employee?.firstName?.[0]}{c.Employee?.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-[#e2e8f0]">{c.Employee?.firstName} {c.Employee?.lastName}</span>
                      <span className="text-[9px] text-[#5a6878]">{c.Employee?.employeeCode}</span>
                      <span className="text-[9px] px-2 py-[2px] rounded-full" style={{ background: `${STATUS_COLORS[c.status]}15`, color: STATUS_COLORS[c.status] }}>{c.status.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex-1 h-[4px] bg-[#252e3a] rounded-full overflow-hidden max-w-[200px]">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? '#00e676' : '#f5a623' }} />
                      </div>
                      <span className="text-[10px] text-[#5a6878]">{completedCount}/{totalCount} · {pct}%</span>
                    </div>
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={14} className="text-[#5a6878] shrink-0" /> : <ChevronDown size={14} className="text-[#5a6878] shrink-0" />}
              </div>

              {isExpanded && c.tasks && (
                <div className="border-t border-[#252e3a] p-4 space-y-2">
                  {c.tasks.map((task: any) => {
                    const isDone = task.status === 'completed' || task.status === 'skipped';
                    const isBlocked = task.templateTask?.dependsOnTaskId &&
                      c.tasks.find((t: any) => t.templateTaskId === task.templateTask.dependsOnTaskId)?.status !== 'completed';
                    const docNecessary = !!task.templateTask?.documentNecessary;
                    const hasDoc = !!task.documentPath;
                    // Hard block: documentNecessary + no document uploaded
                    const isDocBlocked = docNecessary && !hasDoc && !isDone;
                    return (
                      <div key={task.id} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ${isBlocked ? 'bg-[#0d1117] opacity-50' : 'bg-[#0d1117]'}`}>
                        {/* Checkbox — hidden once completed */}
                        {!isDone ? (
                          <button
                            onClick={() => !isDocBlocked && requestMarkComplete(task, !!isBlocked)}
                            disabled={!!isBlocked || uploading === task.id || isDocBlocked}
                            title={isDocBlocked ? 'Upload the required document before marking complete' : undefined}
                            className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              isBlocked || isDocBlocked
                                ? 'border-[#ff3d3d]/40 cursor-not-allowed'
                                : 'border-[#2e3a48] hover:border-[#00e676]'
                            }`}>
                            {isDocBlocked && <span className="text-[#ff3d3d] text-[8px] font-bold">!</span>}
                          </button>
                        ) : (
                          <div className="w-5 h-5 rounded bg-[#00e676] border border-[#00e676] flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 size={12} className="text-black" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className={`text-[11px] font-semibold flex items-center gap-1.5 flex-wrap ${isDone ? 'line-through text-[#5a6878]' : 'text-[#e2e8f0]'}`}>
                            {task.templateTask?.title}
                            {isBlocked && <span className="text-[9px] text-[#ffab40] font-normal no-underline">⚠ Blocked — complete previous task first</span>}
                            {docNecessary && !isDone && (
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#ff3d3d]/15 text-[#ff3d3d] no-underline" style={{ textDecoration: 'none' }}>
                                NECESSARY
                              </span>
                            )}
                          </div>
                          {task.templateTask?.description && <div className="text-[10px] text-[#5a6878] mt-0.5">{task.templateTask.description}</div>}
                          {task.dueDate && (
                            <div className={`text-[9px] mt-0.5 ${new Date(task.dueDate) < new Date() && !isDone ? 'text-[#ff3d3d]' : 'text-[#5a6878]'}`}>
                              Due: {new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              {new Date(task.dueDate) < new Date() && !isDone && ' — Overdue'}
                            </div>
                          )}

                          {/* Document section */}
                          {task.templateTask?.requiresDocument && (
                            <div className="mt-1.5">
                              {task.documentPath ? (
                                <div className="flex items-center gap-2 px-2 py-1 bg-[#00e676]/8 border border-[#00e676]/20 rounded-md">
                                  <FileText size={11} className="text-[#00e676] shrink-0" />
                                  <span className="text-[10px] text-[#00e676] flex-1 truncate">{task.documentPath}</span>
                                  <button onClick={() => downloadDoc(task.id, task.documentPath)} className="text-[#5a6878] hover:text-[#00e676]"><Download size={11} /></button>
                                  <button onClick={() => removeDoc(task.id)} className="text-[#5a6878] hover:text-[#ff3d3d]"><X size={11} /></button>
                                </div>
                              ) : isDone ? (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-[#ff3d3d]/8 border border-[#ff3d3d]/30 rounded-md">
                                  <AlertTriangle size={10} className="text-[#ff3d3d] shrink-0" />
                                  <span className="text-[10px] text-[#ff3d3d] font-semibold">Document Not Available</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => !isBlocked && triggerUpload(task.id)}
                                  disabled={!!isBlocked || uploading === task.id}
                                  className={`flex items-center gap-1.5 px-2 py-1 text-[10px] border rounded-md transition-colors disabled:opacity-40 ${
                                    docNecessary
                                      ? 'text-[#ff3d3d] border-[#ff3d3d]/40 hover:bg-[#ff3d3d]/10 font-semibold'
                                      : 'text-[#f5a623] border-[#f5a623]/30 hover:bg-[#f5a623]/10'
                                  }`}>
                                  {uploading === task.id ? <RefreshCw size={10} className="animate-spin" /> : <Upload size={10} />}
                                  {uploading === task.id
                                    ? 'Uploading...'
                                    : docNecessary
                                    ? 'Upload Required to Complete ↑'
                                    : 'Upload Document *'}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Hard block notice */}
                          {isDocBlocked && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-[#ff3d3d]">
                              <AlertTriangle size={9} />
                              <span>Document upload is required before this task can be marked complete.</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] font-bold px-2 py-[2px] rounded-full" style={{ background: `${ROLE_COLORS[task.templateTask?.assignedRole]}15`, color: ROLE_COLORS[task.templateTask?.assignedRole] }}>
                            {task.templateTask?.assignedRole?.toUpperCase()}
                          </span>
                          {task.status === 'completed' && !isDone && (
                            <button onClick={() => updateTask(task.id, 'skipped')} className="text-[9px] text-[#5a6878] hover:text-[#ffab40]">Skip</button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Completion banner */}
                  {c.status === 'completed' && (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-[#00e676]/8 border border-[#00e676]/20 rounded-lg mt-2">
                      <CheckCircle2 size={16} className="text-[#00e676]" />
                      <div>
                        <div className="text-[12px] font-semibold text-[#00e676]">Onboarding Complete!</div>
                        {c.completedAt && <div className="text-[10px] text-[#5a6878]">Completed on {new Date(c.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {checklists.length === 0 && <div className="text-center py-12 bg-[#161c24] border border-[#252e3a] rounded-xl"><UserCheck size={28} className="mx-auto text-[#5a6878] mb-2" /><p className="text-[12px] text-[#5a6878]">No onboarding checklists yet.</p></div>}
      </div>
    </div>
  );
}

