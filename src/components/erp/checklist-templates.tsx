'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, GripVertical, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { SubDesignationSelect } from './sub-designation-select';

const inp = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]/60 transition-colors placeholder:text-[#5a6878]';
const lbl = 'block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5';

export default function ChecklistTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: '', description: '', departmentId: '', designationId: '', subDesignationId: '' });
  const [tasks, setTasks] = useState<{ title: string; description: string; dueDayOffset: number; requiresDocument: boolean; documentNecessary: boolean }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, dRes, desRes] = await Promise.all([
        fetch('/api/checklist-templates').then(r => r.json()),
        fetch('/api/departments').then(r => r.json()),
        fetch('/api/designations').then(r => r.json()),
      ]);
      if (tRes.success) setTemplates(tRes.data);
      if (dRes.success) setDepartments(dRes.data);
      if (desRes.success) setDesignations(desRes.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEdit = (t: any) => {
    setForm({ name: t.name, description: t.description || '', departmentId: t.departmentId?.toString() || '', designationId: t.designationId?.toString() || '', subDesignationId: t.subDesignationId?.toString() || '' });
    setTasks(t.tasks.map((tk: any) => ({ title: tk.title, description: tk.description || '', dueDayOffset: tk.dueDayOffset, requiresDocument: tk.requiresDocument, documentNecessary: tk.documentNecessary || false })));
    setEditId(t.id);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name) { toast.error('Template name is required'); return; }
    if (tasks.length === 0) { toast.error('Add at least one task'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/checklist-templates', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editId ? { id: editId, ...form, tasks } : { ...form, tasks }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editId ? 'Template updated' : 'Template created');
        fetchData();
        setShowForm(false);
        setForm({ name: '', description: '', departmentId: '', designationId: '', subDesignationId: '' });
        setTasks([]);
        setEditId(null);
      } else toast.error(data.error);
    } finally { setSaving(false); }
  };

  const del = async (id: number, name: string) => {
    if (!confirm(`Delete template "${name}"?`)) return;
    const res = await fetch('/api/checklist-templates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const data = await res.json();
    if (data.success) { toast.success('Template deleted'); fetchData(); }
    else toast.error(data.error);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-7 h-7 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f5a623]/10 rounded-xl flex items-center justify-center"><ClipboardList size={18} className="text-[#f5a623]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Checklist Templates</h2>
            <p className="text-[11px] text-[#5a6878]">Define reusable onboarding checklists by department or designation</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(true); setForm({ name: '', description: '', departmentId: '', designationId: '', subDesignationId: '' }); setTasks([]); setEditId(null); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] transition-colors">
          <Plus size={13} /> New Template
        </button>
      </div>

      {showForm && (
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold">{editId ? 'Edit Template' : 'New Template'}</span>
            <button onClick={() => setShowForm(false)}><X size={15} className="text-[#5a6878]" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={lbl}>Template Name *</label>
              <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Software Engineer Onboarding" />
            </div>
            <div>
              <label className={lbl}>Department (optional)</label>
              <select className={inp} value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}>
                <option value="">All Departments</option>
                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Designation (optional)</label>
              <select className={inp} value={form.designationId} onChange={e => setForm(f => ({ ...f, designationId: e.target.value, subDesignationId: '' }))}>
                <option value="">All Designations</option>
                {designations.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <SubDesignationSelect
              designations={designations}
              designationId={form.designationId}
              value={form.subDesignationId}
              onChange={v => setForm(f => ({ ...f, subDesignationId: v }))}
              className={inp}
              label="Sub-Designation (optional)"
              noneLabel="All Sub-Designations"
              labelClassName={lbl}
            />
          </div>

          {/* Tasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={lbl + ' mb-0'}>Tasks ({tasks.length})</label>
              <button onClick={() => setTasks(t => [...t, { title: '', description: '', dueDayOffset: 1, requiresDocument: false, documentNecessary: false }])}
                className="text-[10px] text-[#f5a623] hover:text-[#e8891a] font-semibold flex items-center gap-1">
                <Plus size={11} /> Add Task
              </button>
            </div>
            <div className="space-y-2">
              {tasks.map((task, i) => (
                <div key={i} className="bg-[#0d1117] border border-[#252e3a] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <GripVertical size={12} className="text-[#5a6878]" />
                    <span className="text-[10px] font-bold text-[#5a6878] uppercase">Task {i + 1}</span>
                    <button onClick={() => setTasks(t => t.filter((_, idx) => idx !== i))} className="ml-auto text-[#5a6878] hover:text-[#ff3d3d]"><X size={12} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <input className={inp} value={task.title} onChange={e => setTasks(t => t.map((tk, idx) => idx === i ? { ...tk, title: e.target.value } : tk))} placeholder="Task title *" />
                    </div>
                    <div className="col-span-2">
                      <input className={inp} value={task.description} onChange={e => setTasks(t => t.map((tk, idx) => idx === i ? { ...tk, description: e.target.value } : tk))} placeholder="Description (optional)" />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" min="1" className={inp + ' w-20'} value={task.dueDayOffset} onChange={e => setTasks(t => t.map((tk, idx) => idx === i ? { ...tk, dueDayOffset: parseInt(e.target.value) || 1 } : tk))} />
                      <span className="text-[10px] text-[#5a6878]">day(s) after joining</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-4 flex-wrap">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={task.requiresDocument}
                          onChange={e => setTasks(t => t.map((tk, idx) => idx === i ? {
                            ...tk,
                            requiresDocument: e.target.checked,
                            // clear documentNecessary if unchecking requiresDocument
                            documentNecessary: e.target.checked ? tk.documentNecessary : false,
                          } : tk))}
                          className="accent-[#f5a623]" />
                        <span className="text-[11px] text-[#8899aa]">Requires document upload</span>
                      </label>
                      {task.requiresDocument && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={task.documentNecessary}
                            onChange={e => setTasks(t => t.map((tk, idx) => idx === i ? { ...tk, documentNecessary: e.target.checked } : tk))}
                            className="accent-[#ff3d3d]" />
                          <span className="text-[11px] text-[#ff3d3d] font-semibold">Necessary</span>
                          <span className="text-[10px] text-[#5a6878]">(task cannot be completed without upload)</span>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="text-center py-4 text-[#5a6878] text-[11px] border border-dashed border-[#252e3a] rounded-lg">
                  No tasks yet. Click "Add Task" to build the checklist.
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Template'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-[12px] text-[#8899aa] border border-[#252e3a] rounded-lg hover:border-[#f5a623]">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {templates.map(t => (
          <div key={t.id} className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#1a2028]"
              onClick={() => setExpanded(s => { const n = new Set(s); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n; })}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#f5a623]/10 rounded-xl flex items-center justify-center"><ClipboardList size={16} className="text-[#f5a623]" /></div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-[#e2e8f0]">{t.name}</span>
                    {t.Department && <span className="text-[9px] px-2 py-[2px] rounded-full bg-[#00d4ff]/10 text-[#00d4ff]">{t.Department.name}</span>}
                    {t.Designation && <span className="text-[9px] px-2 py-[2px] rounded-full bg-[#a78bfa]/10 text-[#a78bfa]">{t.Designation.name}</span>}
                    <span className="text-[9px] text-[#5a6878]">{t.tasks.length} tasks · {t._count?.instances || 0} active</span>
                  </div>
                  {t.description && <p className="text-[10px] text-[#5a6878] mt-0.5">{t.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={e => { e.stopPropagation(); openEdit(t); }} className="p-1.5 text-[#5a6878] hover:text-[#f5a623]"><Pencil size={13} /></button>
                <button onClick={e => { e.stopPropagation(); del(t.id, t.name); }} className="p-1.5 text-[#5a6878] hover:text-[#ff3d3d]"><Trash2 size={13} /></button>
                {expanded.has(t.id) ? <ChevronUp size={14} className="text-[#5a6878]" /> : <ChevronDown size={14} className="text-[#5a6878]" />}
              </div>
            </div>
            {expanded.has(t.id) && (
              <div className="border-t border-[#252e3a] p-4 space-y-2">
                {t.tasks.map((task: any, i: number) => (
                  <div key={task.id} className="flex items-center gap-3 px-3 py-2 bg-[#0d1117] rounded-lg">
                    <span className="text-[10px] font-bold text-[#5a6878] w-5">{i + 1}</span>
                    <div className="flex-1">
                      <div className="text-[11px] font-semibold text-[#e2e8f0]">{task.title}</div>
                      {task.description && <div className="text-[10px] text-[#5a6878]">{task.description}</div>}
                    </div>
                    <span className="text-[9px] text-[#5a6878]">Day {task.dueDayOffset}</span>
                    {task.requiresDocument && <span className="text-[9px] text-[#f5a623]">📎 Doc</span>}
                    {task.documentNecessary && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ff3d3d]/15 text-[#ff3d3d]">Necessary</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {templates.length === 0 && (
          <div className="text-center py-12 bg-[#161c24] border border-[#252e3a] rounded-xl">
            <ClipboardList size={28} className="mx-auto text-[#5a6878] mb-2" />
            <p className="text-[12px] text-[#5a6878]">No templates yet. Create your first checklist template.</p>
          </div>
        )}
      </div>
    </div>
  );
}
