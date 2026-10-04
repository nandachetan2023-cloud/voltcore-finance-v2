'use client';
import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Plus, Pin, Trash2, Pencil, RefreshCw, Users, Building2, Award } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  general: { label: 'General',  color: '#8899aa' },
  policy:  { label: 'Policy',   color: '#00d4ff' },
  payroll: { label: 'Payroll',  color: '#00e676' },
  safety:  { label: 'Safety',   color: '#ff3d3d' },
  hr:      { label: 'HR',       color: '#f5a623' },
  it:      { label: 'IT',       color: '#a78bfa' },
};

const EMPTY_FORM = { title: '', body: '', type: 'general', targetType: 'all', targetDept: '', targetDesig: '', isPinned: false, expiresAt: '' };

export default function NoticeBoardModule() {
  const [notices, setNotices] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [senderName, setSenderName] = useState('Admin');

  useEffect(() => {
    try {
      const u = localStorage.getItem('erp_auth_user');
      if (u) { const p = JSON.parse(u); setSenderName(p.name || 'Admin'); }
    } catch {}
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [nRes, dRes, desRes] = await Promise.all([
        fetch('/api/notices').then(r => r.json()),
        fetch('/api/departments').then(r => r.json()),
        fetch('/api/designations').then(r => r.json()),
      ]);
      if (nRes.success) setNotices(nRes.data);
      if (dRes.success) setDepartments(dRes.data);
      if (desRes.success) setDesignations(desRes.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = () => { setForm({ ...EMPTY_FORM }); setEditId(null); setShowForm(true); };
  const openEdit = (n: any) => {
    setForm({
      title: n.title, body: n.body, type: n.type,
      targetType: n.targetDept ? 'dept' : n.targetDesig ? 'desig' : 'all',
      targetDept: n.targetDept || '', targetDesig: n.targetDesig || '',
      isPinned: n.isPinned,
      expiresAt: n.expiresAt ? new Date(n.expiresAt).toISOString().split('T')[0] : '',
    });
    setEditId(n.id); setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) { toast.error('Title and body are required'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title, body: form.body, type: form.type,
        targetDept: form.targetType === 'dept' ? form.targetDept || null : null,
        targetDesig: form.targetType === 'desig' ? form.targetDesig || null : null,
        isPinned: form.isPinned,
        expiresAt: form.expiresAt || null,
        createdByName: senderName,
      };
      const res = await fetch('/api/notices', {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editId ? { id: editId, ...payload } : payload),
      });
      const data = await res.json();
      if (data.success) { toast.success(editId ? 'Notice updated' : 'Notice published'); setShowForm(false); fetchAll(); }
      else toast.error(data.error);
    } finally { setSaving(false); }
  };

  const deleteNotice = async (id: number) => {
    if (!confirm('Delete this notice?')) return;
    const res = await fetch('/api/notices', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const data = await res.json();
    if (data.success) { toast.success('Deleted'); fetchAll(); }
    else toast.error(data.error);
  };

  const togglePin = async (n: any) => {
    const res = await fetch('/api/notices', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id, isPinned: !n.isPinned }) });
    const data = await res.json();
    if (data.success) fetchAll();
  };

  const totalReads = notices.reduce((s, n) => s + (n._count?.reads || 0), 0);
  const pinned = notices.filter(n => n.isPinned).length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-7 h-7 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f5a623]/10 rounded-xl flex items-center justify-center">
            <Megaphone size={18} className="text-[#f5a623]" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Notice Board</h2>
            <p className="text-[11px] text-[#5a6878]">Publish notices to departments or all staff</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
          <button onClick={openCreate} className="vc-btn-primary flex items-center gap-1.5">
            <Plus size={13} /> New Notice
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Notices', value: notices.length, color: '#f5a623' },
          { label: 'Pinned', value: pinned, color: '#ffab40' },
          { label: 'Total Reads', value: totalReads, color: '#00e676' },
        ].map(s => (
          <div key={s.label} className="vc-stat-card">
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: s.color }} />
            <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">{s.label}</div>
            <div className="text-[22px] font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Notice list */}
      <div className="space-y-2">
        {notices.map(n => {
          const tc = TYPE_CONFIG[n.type] || TYPE_CONFIG.general;
          const target = n.targetDept ? `${n.targetDept} dept` : n.targetDesig ? `${n.targetDesig} designation` : 'All Staff';
          const readCount = n._count?.reads || 0;
          return (
            <div key={n.id} className={`bg-[#161c24] border rounded-xl p-4 ${n.isPinned ? 'border-[#f5a623]/40' : 'border-[#252e3a]'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {n.isPinned && <Pin size={11} className="text-[#f5a623] shrink-0" />}
                    <span className="text-[9px] font-bold px-2 py-[2px] rounded-full" style={{ background: `${tc.color}15`, color: tc.color }}>{tc.label}</span>
                    <span className="text-[13px] font-semibold text-[#e2e8f0]">{n.title}</span>
                  </div>
                  <p className="text-[11px] text-[#8899aa] line-clamp-2 mb-2">{n.body}</p>
                  <div className="flex items-center gap-3 flex-wrap text-[10px] text-[#5a6878]">
                    <span className="flex items-center gap-1">
                      {n.targetDept ? <Building2 size={10} /> : n.targetDesig ? <Award size={10} /> : <Users size={10} />}
                      {target}
                    </span>
                    <span>{new Date(n.publishedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    <span className="text-[#00e676] font-semibold">{readCount} read{readCount !== 1 ? 's' : ''}</span>
                    {n.expiresAt && <span className="text-[#ff3d3d]">Expires {new Date(n.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => togglePin(n)} title={n.isPinned ? 'Unpin' : 'Pin'}
                    className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${n.isPinned ? 'text-[#f5a623] bg-[#f5a623]/10' : 'text-[#5a6878] hover:text-[#f5a623] hover:bg-[#f5a623]/10'}`}>
                    <Pin size={13} />
                  </button>
                  <button onClick={() => openEdit(n)} className="w-7 h-7 rounded flex items-center justify-center text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => deleteNotice(n.id)} className="w-7 h-7 rounded flex items-center justify-center text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {notices.length === 0 && (
          <div className="text-center py-12 bg-[#161c24] border border-[#252e3a] rounded-xl">
            <Megaphone size={28} className="mx-auto text-[#5a6878] mb-2" />
            <p className="text-[12px] text-[#5a6878]">No notices published yet.</p>
          </div>
        )}
      </div>

      {/* Compose / Edit dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl w-full max-w-lg shadow-2xl space-y-4 p-5 max-h-[90vh] overflow-y-auto">
            <div className="text-[15px] font-bold text-[#e2e8f0]">{editId ? 'Edit Notice' : 'New Notice'}</div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5">Title *</label>
                <input className="vc-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Notice title..." />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5">Body *</label>
                <textarea className="vc-input resize-none" rows={4} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Notice content..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5">Type</label>
                  <select className="vc-input appearance-none" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {Object.entries(TYPE_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5">Target</label>
                  <select className="vc-input appearance-none" value={form.targetType} onChange={e => setForm(f => ({ ...f, targetType: e.target.value, targetDept: '', targetDesig: '' }))}>
                    <option value="all">All Staff</option>
                    <option value="dept">Specific Department</option>
                    <option value="desig">Specific Designation</option>
                  </select>
                </div>
              </div>
              {form.targetType === 'dept' && (
                <div>
                  <label className="block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5">Department</label>
                  <select className="vc-input appearance-none" value={form.targetDept} onChange={e => setForm(f => ({ ...f, targetDept: e.target.value }))}>
                    <option value="">Select department...</option>
                    {departments.map((d: any) => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              )}
              {form.targetType === 'desig' && (
                <div>
                  <label className="block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5">Designation</label>
                  <select className="vc-input appearance-none" value={form.targetDesig} onChange={e => setForm(f => ({ ...f, targetDesig: e.target.value }))}>
                    <option value="">Select designation...</option>
                    {designations.map((d: any) => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5">Expires On (optional)</label>
                  <input type="date" className="vc-input" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.isPinned} onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))} className="w-4 h-4 accent-[#f5a623]" />
                    <span className="text-[12px] text-[#8899aa] font-medium">Pin this notice</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 text-[12px] text-[#8899aa] border border-[#252e3a] rounded-lg hover:border-[#f5a623]">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] disabled:opacity-50">
                {saving ? 'Publishing...' : editId ? 'Update' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
