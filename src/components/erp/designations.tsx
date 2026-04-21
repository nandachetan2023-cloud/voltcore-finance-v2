'use client';

import { useState, useEffect } from 'react';
import { Award, Plus, Pencil, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Designation {
  id: number;
  name: string;
  _count?: { Employee: number };
}

export default function DesignationsModule() {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => { fetchDesignations(); }, []);

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
    if (!formData.name) { toast.error('Please enter designation name'); return; }
    try {
      const res = await fetch('/api/designations', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...formData } : formData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? 'Designation updated' : 'Designation created');
        setShowDialog(false); setFormData({ name: '' }); setEditingId(null);
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {designations.map(d => {
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

      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161c24] border border-[#252e3a] rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-[#e2e8f0] mb-4">{editingId ? 'Edit Designation' : 'Add Designation'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#e2e8f0] mb-2">Designation Name *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#2e3a48] rounded-lg text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-[#f5a623]"
                  placeholder="e.g., Senior Engineer" />
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
