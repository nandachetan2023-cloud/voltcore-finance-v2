'use client';

import { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, FileText, Shield, Calendar, Building2, Award, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeletedItem {
  id: number;
  name: string;
  type: 'leave-policy' | 'attendance-rule' | 'holiday' | 'department' | 'designation' | 'employee';
  deletedAt: string;
  details?: string;
}

export default function TrashModule() {
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DeletedItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'leave-policy' | 'attendance-rule' | 'holiday' | 'department' | 'designation' | 'employee'>('all');

  useEffect(() => {
    fetchDeletedItems();
  }, []);

  const fetchDeletedItems = async () => {
    setLoading(true);
    try {
      const [policiesRes, rulesRes, holidaysRes, deptsRes, desigRes, empsRes] = await Promise.all([
        fetch('/api/trash/leave-policies'),
        fetch('/api/trash/attendance-rules'),
        fetch('/api/trash/holidays'),
        fetch('/api/trash/departments'),
        fetch('/api/trash/designations'),
        fetch('/api/trash/employees'),
      ]);

      const [policiesData, rulesData, holidaysData, deptsData, desigData, empsData] = await Promise.all([
        policiesRes.json(),
        rulesRes.json(),
        holidaysRes.json(),
        deptsRes.json(),
        desigRes.json(),
        empsRes.json(),
      ]);

      const allItems: DeletedItem[] = [];

      if (policiesData.success) {
        policiesData.data.forEach((p: any) => {
          allItems.push({
            id: p.id,
            name: p.name,
            type: 'leave-policy',
            deletedAt: p.updatedAt,
            details: `${p.code} - ${p.leaveType}`,
          });
        });
      }

      if (rulesData.success) {
        rulesData.data.forEach((r: any) => {
          allItems.push({
            id: r.id,
            name: r.name,
            type: 'attendance-rule',
            deletedAt: r.updatedAt,
            details: r.ruleType,
          });
        });
      }

      if (holidaysData.success) {
        holidaysData.data.forEach((h: any) => {
          allItems.push({
            id: h.id,
            name: h.name,
            type: 'holiday',
            deletedAt: h.updatedAt,
            details: new Date(h.date).toLocaleDateString(),
          });
        });
      }

      if (deptsData.success) {
        deptsData.data.forEach((d: any) => {
          allItems.push({
            id: d.id,
            name: d.name,
            type: 'department',
            deletedAt: d.updatedAt,
            details: d.code,
          });
        });
      }

      if (desigData.success) {
        desigData.data.forEach((d: any) => {
          allItems.push({
            id: d.id,
            name: d.name,
            type: 'designation',
            deletedAt: d.updatedAt,
            details: d.code,
          });
        });
      }

      if (empsData.success) {
        empsData.data.forEach((e: any) => {
          allItems.push({
            id: e.id,
            name: e.name,
            type: 'employee',
            deletedAt: e.updatedAt,
            details: `${e.employeeCode} - ${e.Department?.name || 'N/A'}`,
          });
        });
      }

      // Sort by deletion date (most recent first)
      allItems.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
      setItems(allItems);
    } catch (error) {
      console.error('Error fetching deleted items:', error);
      toast.error('Failed to load deleted items');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      const endpointMap: Record<string, string> = {
        'leave-policy': 'leave-policies',
        'attendance-rule': 'attendance-rules',
        'holiday': 'holidays',
        'department': 'departments',
        'designation': 'designations',
        'employee': 'employees',
      };
      const endpoint = `/api/trash/${endpointMap[selectedItem.type]}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedItem.id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`${selectedItem.name} restored successfully`);
        setRestoreOpen(false);
        fetchDeletedItems();
      } else {
        toast.error(json.error || 'Failed to restore item');
      }
    } catch {
      toast.error('Failed to restore item');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      const endpoint = `/api/trash/${selectedItem.type === 'leave-policy' ? 'leave-policies' : selectedItem.type === 'attendance-rule' ? 'attendance-rules' : 'holidays'}`;
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedItem.id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`${selectedItem.name} permanently deleted`);
        setDeleteOpen(false);
        fetchDeletedItems();
      } else {
        toast.error(json.error || 'Failed to delete item');
      }
    } catch {
      toast.error('Failed to delete item');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'leave-policy': return <FileText size={14} className="text-[#00d4ff]" />;
      case 'attendance-rule': return <Shield size={14} className="text-[#a78bfa]" />;
      case 'holiday': return <Calendar size={14} className="text-[#00e676]" />;
      default: return <Trash2 size={14} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'leave-policy': return 'Leave Policy';
      case 'attendance-rule': return 'Attendance Rule';
      case 'holiday': return 'Holiday';
      default: return type;
    }
  };

  const filteredItems = activeTab === 'all' ? items : items.filter(item => item.type === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#ff3d3d]/30 border-t-[#ff3d3d] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Trash2 size={16} className="text-[#ff3d3d]" />
          <span className="text-[14px] font-bold text-[#e2e8f0]">Recycle Bin</span>
          <span className="ml-auto text-[11px] text-[#5a6878]">{filteredItems.length} deleted items</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 py-3 border-b border-[#2e3a48]">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${
              activeTab === 'all' ? 'bg-[#f5a623] text-black' : 'bg-[#1a2332] text-[#8899aa] hover:text-[#e2e8f0]'
            }`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('leave-policy')}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${
              activeTab === 'leave-policy' ? 'bg-[#00d4ff] text-black' : 'bg-[#1a2332] text-[#8899aa] hover:text-[#e2e8f0]'
            }`}
          >
            Leave Policies ({items.filter(i => i.type === 'leave-policy').length})
          </button>
          <button
            onClick={() => setActiveTab('attendance-rule')}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${
              activeTab === 'attendance-rule' ? 'bg-[#a78bfa] text-black' : 'bg-[#1a2332] text-[#8899aa] hover:text-[#e2e8f0]'
            }`}
          >
            Attendance Rules ({items.filter(i => i.type === 'attendance-rule').length})
          </button>
          <button
            onClick={() => setActiveTab('holiday')}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${
              activeTab === 'holiday' ? 'bg-[#00e676] text-black' : 'bg-[#1a2332] text-[#8899aa] hover:text-[#e2e8f0]'
            }`}
          >
            Holidays ({items.filter(i => i.type === 'holiday').length})
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-[#1a2332] z-10">
              <tr className="border-b border-[#2e3a48]">
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Type</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Name</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Details</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Deleted</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#5a6878] text-[12px]">
                    <Trash2 size={32} className="mx-auto mb-2 opacity-30" />
                    No deleted items
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="border-b border-[#1e252e] hover:bg-[#1a2028] transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.type)}
                        <span className="text-[11px] text-[#8899aa]">{getTypeLabel(item.type)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#e2e8f0]">{item.name}</td>
                    <td className="px-4 py-3 text-[#8899aa] text-[11px]">{item.details}</td>
                    <td className="px-4 py-3 text-[#8899aa] text-[11px]">
                      {new Date(item.deletedAt).toLocaleDateString()} {new Date(item.deletedAt).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8899aa] hover:text-[#00e676] hover:bg-[#00e676]/10 transition-colors"
                          onClick={() => {
                            setSelectedItem(item);
                            setRestoreOpen(true);
                          }}
                          title="Restore"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors"
                          onClick={() => {
                            setSelectedItem(item);
                            setDeleteOpen(true);
                          }}
                          title="Permanently Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restore Dialog */}
      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0] text-base flex items-center gap-2">
              <RotateCcw size={20} className="text-[#00e676]" /> Restore Item
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-[#8899aa]">
            Are you sure you want to restore <span className="text-[#e2e8f0] font-semibold">{selectedItem?.name}</span>? It will be moved back to the active list.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#1a2332] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48]" onClick={() => setRestoreOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#00e676] text-black hover:bg-[#00c853] font-semibold" disabled={submitting} onClick={handleRestore}>
              {submitting ? 'Restoring...' : 'Restore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0] text-base flex items-center gap-2">
              <AlertTriangle size={20} className="text-[#ff3d3d]" /> Permanently Delete
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[13px] text-[#8899aa]">
              Are you sure you want to <span className="text-[#ff3d3d] font-semibold">permanently delete</span>{' '}
              <span className="text-[#e2e8f0] font-semibold">{selectedItem?.name}</span>?
            </p>
            <div className="bg-[#ff3d3d]/10 border border-[#ff3d3d]/30 rounded-lg p-3">
              <p className="text-[11px] text-[#ff3d3d] font-semibold">⚠️ WARNING: This action cannot be undone!</p>
              <p className="text-[11px] text-[#8899aa] mt-1">The data will be permanently removed from the database.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#1a2332] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48]" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#e63535] font-semibold" disabled={submitting} onClick={handlePermanentDelete}>
              {submitting ? 'Deleting...' : 'Permanently Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
