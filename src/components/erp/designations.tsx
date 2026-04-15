'use client';

import { useState, useEffect } from 'react';
import { Award, Plus, Pencil, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Designation {
  id: number;
  name: string;
  _count?: {
    Employee: number;
  };
}

export default function DesignationsModule() {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    fetchDesignations();
  }, []);

  const fetchDesignations = async () => {
    try {
      const response = await fetch('/api/designations');
      const data = await response.json();
      if (data.success) {
        setDesignations(data.data);
      }
    } catch (error) {
      console.error('Error fetching designations:', error);
      toast.error('Failed to load designations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Please enter designation name');
      return;
    }

    try {
      const url = editingId ? '/api/designations' : '/api/designations';
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...formData } : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(editingId ? 'Designation updated' : 'Designation created');
        setShowDialog(false);
        setFormData({ name: '' });
        setEditingId(null);
        fetchDesignations();
      } else {
        toast.error(data.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving designation:', error);
      toast.error('Failed to save designation');
    }
  };

  const handleEdit = (designation: Designation) => {
    setFormData({ name: designation.name });
    setEditingId(designation.id);
    setShowDialog(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this designation?')) return;

    try {
      const response = await fetch('/api/designations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Designation deleted');
        fetchDesignations();
      } else {
        toast.error(data.error || 'Failed to delete designation');
      }
    } catch (error) {
      console.error('Error deleting designation:', error);
      toast.error('Failed to delete designation');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#e2e8f0]">Designations</h2>
          <p className="text-sm text-[#5a6878]">Manage job roles and positions</p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: '' });
            setEditingId(null);
            setShowDialog(true);
          }}
          className="vc-btn-primary"
        >
          <Plus size={16} />
          Add Designation
        </button>
      </div>

      {/* Designations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {designations.map((designation) => (
          <div
            key={designation.id}
            className="bg-[#161c24] border border-[#252e3a] rounded-lg p-4 hover:border-[#f5a623]/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00d4ff]/10 rounded-lg flex items-center justify-center">
                  <Award size={20} className="text-[#00d4ff]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#e2e8f0]">{designation.name}</h3>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(designation)}
                  className="w-7 h-7 rounded flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(designation.id)}
                  className="w-7 h-7 rounded flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#8899aa]">
              <Users size={14} />
              <span>{designation._count?.Employee || 0} employees</span>
            </div>
          </div>
        ))}
      </div>

      {designations.length === 0 && (
        <div className="text-center py-12 text-[#5a6878]">
          <Award size={48} className="mx-auto mb-4 opacity-50" />
          <p>No designations found. Create your first designation.</p>
        </div>
      )}

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161c24] border border-[#252e3a] rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-[#e2e8f0] mb-4">
              {editingId ? 'Edit Designation' : 'Add Designation'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#e2e8f0] mb-2">
                  Designation Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#2e3a48] rounded-lg text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-[#f5a623]"
                  placeholder="e.g., Senior Engineer"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDialog(false);
                    setFormData({ name: '' });
                    setEditingId(null);
                  }}
                  className="flex-1 px-4 py-2 bg-[#252e3a] text-[#e2e8f0] rounded-lg hover:bg-[#2e3a48] transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 vc-btn-primary">
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
