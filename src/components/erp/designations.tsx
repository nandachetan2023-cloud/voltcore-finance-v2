'use client';

import { useState, useEffect, useMemo } from 'react';
import { Award, Plus, Pencil, Trash2, Users } from 'lucide-react';
import { SearchInput, matchesSearch } from './search-input';
import { toast } from 'sonner';
import { FieldError, fieldBorderError } from '@/components/ui/field-error';
import { validateFields, isValid, type FieldErrors } from '@/lib/form-validation';

interface SubDesignation {
  id: number;
  name: string;
  designationId: number;
}

interface Designation {
  id: number;
  name: string;
  SubDesignation?: SubDesignation[];
  _count?: { Employee: number };
}

export default function DesignationsModule() {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // Per-card "add sub-designation" text inputs, keyed by designation id.
  const [subInput, setSubInput] = useState<Record<number, string>>({});
  const [subBusy, setSubBusy] = useState(false);

  useEffect(() => { fetchDesignations(); }, []);

  const addSub = async (designationId: number) => {
    const name = (subInput[designationId] || '').trim();
    if (!name) return;
    setSubBusy(true);
    try {
      const res = await fetch('/api/sub-designations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, designationId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to add');
      setSubInput(s => ({ ...s, [designationId]: '' }));
      await fetchDesignations();
      toast.success('Sub-designation added');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add sub-designation');
    } finally {
      setSubBusy(false);
    }
  };

  const deleteSub = async (id: number) => {
    try {
      const res = await fetch('/api/sub-designations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to delete');
      await fetchDesignations();
      toast.success('Sub-designation removed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete sub-designation');
    }
  };

  const fetchDesignations = async () => {
    try {
      const res = await fetch('/api/designations');
      const data = await res.json();
      if (data.success) setDesignations(data.data);
    } catch { toast.error('Failed to load designations'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateFields([{ field: 'name', value: formData.name, label: 'Designation Name' }]);
    setFieldErrors(errors);
    if (!isValid(errors)) return;
    try {
      const res = await fetch('/api/designations', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...formData } : formData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? 'Designation updated' : 'Designation created');
        setShowDialog(false); setFormData({ name: '' }); setEditingId(null); setFieldErrors({});
        fetchDesignations();
      } else toast.error(data.error || 'Operation failed');
    } catch { toast.error('Failed to save designation'); }
  };

  const handleEdit = (d: Designation) => { setFormData({ name: d.name }); setEditingId(d.id); setShowDialog(true); };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this designation?')) return;
    try {
      const res = await fetch('/api/designations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Designation deleted'); fetchDesignations(); }
      else toast.error(data.error || 'Failed to delete designation');
    } catch { toast.error('Failed to delete designation'); }
  };

  const filteredDesignations = useMemo(
    () => designations.filter(d => matchesSearch(search, [d.name])),
    [designations, search]
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#e2e8f0]">Designations</h2>
          <p className="text-sm text-[#5a6878]">Manage job roles and positions</p>
        </div>
        <button onClick={() => { setFormData({ name: '' }); setEditingId(null); setShowDialog(true); }} className="vc-btn-primary">
          <Plus size={16} /> Add Designation
        </button>
      </div>

      {designations.length > 0 && (
        <SearchInput value={search} onChange={setSearch} placeholder="Search designations by name..." />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDesignations.map(d => {
          // 0 employees = likely auto-created via bulk import
          const isAuto = d._count?.Employee === 0;
          return (
            <div key={d.id} className={`bg-[#161c24] border rounded-lg p-4 hover:border-[#f5a623]/30 transition-colors ${isAuto ? 'border-[#00d4ff]/20' : 'border-[#252e3a]'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#00d4ff]/10 rounded-lg flex items-center justify-center">
                    <Award size={20} className="text-[#00d4ff]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#e2e8f0]">{d.name}</h3>
                    {isAuto && (
                      <span className="text-[9px] px-1.5 py-[1px] rounded bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20 font-semibold">AUTO</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(d)} className="w-7 h-7 rounded flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(d.id)} className="w-7 h-7 rounded flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#8899aa]">
                <Users size={14} /><span>{d._count?.Employee || 0} employees</span>
              </div>

              {/* Sub-designations */}
              <div className="mt-3 pt-3 border-t border-[#252e3a]">
                <div className="text-[9px] uppercase tracking-wider text-[#5a6878] mb-1.5 font-semibold">Sub-Designations</div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(d.SubDesignation || []).length === 0 && (
                    <span className="text-[10px] text-[#5a6878] italic">None yet</span>
                  )}
                  {(d.SubDesignation || []).map(sub => (
                    <span key={sub.id} className="group/sub inline-flex items-center gap-1 text-[10px] px-2 py-[2px] rounded-full bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20">
                      {sub.name}
                      <button onClick={() => deleteSub(sub.id)} title="Remove" className="opacity-60 hover:opacity-100 hover:text-[#ff3d3d] transition">
                        <Trash2 size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    value={subInput[d.id] || ''}
                    onChange={e => setSubInput(s => ({ ...s, [d.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') addSub(d.id); }}
                    placeholder="Add sub-designation..."
                    className="flex-1 min-w-0 bg-[#0f141a] border border-[#2e3a48] rounded px-2 py-1 text-[10px] text-[#e2e8f0] focus:border-[#f5a623] outline-none placeholder:text-[#5a6878]"
                  />
                  <button
                    onClick={() => addSub(d.id)}
                    disabled={subBusy || !(subInput[d.id] || '').trim()}
                    className="shrink-0 w-6 h-6 rounded flex items-center justify-center bg-[#00d4ff]/10 text-[#00d4ff] hover:bg-[#00d4ff]/20 disabled:opacity-40 transition"
                    title="Add"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {designations.length === 0 && (
        <div className="text-center py-12 text-[#5a6878]">
          <Award size={48} className="mx-auto mb-4 opacity-50" />
          <p>No designations found. Create your first designation.</p>
        </div>
      )}
      {designations.length > 0 && filteredDesignations.length === 0 && (
        <div className="text-center py-12 text-[#5a6878]">
          <Award size={48} className="mx-auto mb-4 opacity-50" />
          <p>No designations match &quot;{search}&quot;.</p>
        </div>
      )}

      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161c24] border border-[#252e3a] rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-[#e2e8f0] mb-4">{editingId ? 'Edit Designation' : 'Add Designation'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#e2e8f0] mb-2">Designation Name *</label>
                <input type="text" value={formData.name} onChange={e => { setFormData({ name: e.target.value }); setFieldErrors({}); }}
                  className={`w-full px-3 py-2 bg-[#0d1117] border rounded-lg text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-[#f5a623] ${fieldBorderError(fieldErrors.name) || 'border-[#2e3a48]'}`}
                  placeholder="e.g., Senior Engineer" />
                <FieldError message={fieldErrors.name} />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => { setShowDialog(false); setFormData({ name: '' }); setEditingId(null); }}
                  className="flex-1 px-4 py-2 bg-[#252e3a] text-[#e2e8f0] rounded-lg hover:bg-[#2e3a48] transition-colors">Cancel</button>
                <button type="submit" className="flex-1 vc-btn-primary">{editingId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
