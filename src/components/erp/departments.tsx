'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, Pencil, Trash2, Users, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface Department {
  id: number;
  name: string;
  code: string;
  _count?: { Employee: number };
}

// Auto-generated codes from bulk import follow pattern: XXXXXX-YYYY (hyphen + 4 alphanumeric)
function isAutoCreated(code: string) {
  return /^.+-[A-Z0-9]{4}$/.test(code);
}

export default function DepartmentsModule() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '' });

  useEffect(() => { fetchDepartments(); }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      if (data.success) setDepartments(data.data);
    } catch { toast.error('Failed to load departments'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) { toast.error('Please fill all required fields'); return; }
    try {
      const res = await fetch('/api/departments', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...formData } : formData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? 'Department updated' : 'Department created');
        setShowDialog(false); setFormData({ name: '', code: '' }); setEditingId(null);
        fetchDepartments();
      } else toast.error(data.error || 'Operation failed');
    } catch { toast.error('Failed to save department'); }
  };

  const handleEdit = (dept: Department) => {
    setFormData({ name: dept.name, code: dept.code });
    setEditingId(dept.id);
    setShowDialog(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      const res = await fetch('/api/departments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Department deleted'); fetchDepartments(); }
      else toast.error(data.error || 'Failed to delete department');
    } catch { toast.error('Failed to delete department'); }
  };

  const autoCount = departments.filter(d => isAutoCreated(d.code)).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#e2e8f0]">Departments</h2>
          <p className="text-sm text-[#5a6878] flex items-center gap-2">
            Manage organizational departments
            {autoCount > 0 && (
              <span className="text-[10px] px-2 py-[2px] rounded-full bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20 font-semibold">
                {autoCount} auto-created via import
              </span>
            )}
          </p>
        </div>
        <button onClick={() => { setFormData({ name: '', code: '' }); setEditingId(null); setShowDialog(true); }} className="vc-btn-primary">
          <Plus size={16} /> Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map(dept => (
          <div key={dept.id} className={`bg-[#161c24] border rounded-lg p-4 hover:border-[#f5a623]/30 transition-colors ${isAutoCreated(dept.code) ? 'border-[#00d4ff]/30' : 'border-[#252e3a]'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isAutoCreated(dept.code) ? 'bg-[#00d4ff]/10' : 'bg-[#f5a623]/10'}`}>
                  {isAutoCreated(dept.code)
                    ? <Upload size={18} className="text-[#00d4ff]" />
                    : <Building2 size={20} className="text-[#f5a623]" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#e2e8f0]">{dept.name}</h3>
                    {isAutoCreated(dept.code) && (
                      <span className="text-[9px] px-1.5 py-[1px] rounded bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20 font-semibold">AUTO</span>
                    )}
                  </div>
                  <p className="text-xs text-[#5a6878]">Code: {dept.code}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleEdit(dept)} className="w-7 h-7 rounded flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors"><Pencil size={14} /></button>
                <button onClick={() => handleDelete(dept.id)} className="w-7 h-7 rounded flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#8899aa]">
              <Users size={14} /><span>{dept._count?.Employee || 0} employees</span>
            </div>
          </div>
        ))}
      </div>

      {departments.length === 0 && (
        <div className="text-center py-12 text-[#5a6878]">
          <Building2 size={48} className="mx-auto mb-4 opacity-50" />
          <p>No departments found. Create your first department.</p>
        </div>
      )}

      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161c24] border border-[#252e3a] rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-[#e2e8f0] mb-4">{editingId ? 'Edit Department' : 'Add Department'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#e2e8f0] mb-2">Department Name *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#2e3a48] rounded-lg text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-[#f5a623]"
                  placeholder="e.g., Engineering" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#e2e8f0] mb-2">Department Code *</label>
                <input type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#2e3a48] rounded-lg text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-[#f5a623]"
                  placeholder="e.g., ENG" maxLength={10} />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => { setShowDialog(false); setFormData({ name: '', code: '' }); setEditingId(null); }}
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
