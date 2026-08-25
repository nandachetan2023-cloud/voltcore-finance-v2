'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, Plus, Edit2, Trash2, Building2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';

interface Holiday {
  id: number;
  name: string;
  date: string;
  type: string;
  description?: string | null;
  isRecurring: boolean;
  applicableTo: string;
  branchId?: number | null;
  Branch?: {
    id: number;
    name: string;
  } | null;
}

interface HolidayFormData {
  name: string;
  date: string;
  type: string;
  description: string;
  isRecurring: boolean;
  applicableTo: string;
  branchId: string;
}

const EMPTY_FORM: HolidayFormData = {
  name: '',
  date: '',
  type: 'public',
  description: '',
  isRecurring: false,
  applicableTo: 'all',
  branchId: '',
};

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <Skeleton className="h-10 w-full bg-[#1e2630] rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-32 bg-[#1e2630] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function getTypeColor(type: string) {
  switch (type.toLowerCase()) {
    case 'public': return 'bg-[#a78bfa]/15 text-[#a78bfa] border-[#a78bfa]/30';
    case 'optional': return 'bg-[#00d4ff]/15 text-[#00d4ff] border-[#00d4ff]/30';
    case 'restricted': return 'bg-[#ffab40]/15 text-[#ffab40] border-[#ffab40]/30';
    default: return 'bg-[#5a6878]/15 text-[#5a6878] border-[#5a6878]/30';
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

function getMonthName(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'long' });
}

export default function HolidaysModule() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<HolidayFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  // Fetch branches for the site-specific selector
  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(d => {
      if (d.success) setBranches(d.data || []);
    }).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/holidays?year=${yearFilter}`);
      const json = await res.json();
      if (json.success) {
        setHolidays(json.data || []);
      } else {
        toast.error(json.error || 'Failed to fetch holidays');
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
      toast.error('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  }, [yearFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group holidays by month
  const holidaysByMonth = useMemo(() => {
    const grouped: Record<string, Holiday[]> = {};
    holidays.forEach(holiday => {
      const month = getMonthName(holiday.date);
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(holiday);
    });
    return grouped;
  }, [holidays]);

  const updateForm = (field: keyof HolidayFormData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.name || !form.date) {
      toast.error('Please fill in name and date');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        name: form.name,
        date: form.date,
        type: form.type,
        description: form.description || null,
        isRecurring: form.isRecurring,
        applicableTo: form.applicableTo,
        branchId: form.branchId ? parseInt(form.branchId) : null,
      };
      
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      
      if (json.success) {
        toast.success('Holiday created successfully');
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to create holiday');
      }
    } catch (error) {
      console.error('Error creating holiday:', error);
      toast.error('Failed to create holiday');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedId || !form.name || !form.date) {
      toast.error('Please fill in name and date');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        id: selectedId,
        name: form.name,
        date: form.date,
        type: form.type,
        description: form.description || null,
        isRecurring: form.isRecurring,
        applicableTo: form.applicableTo,
        branchId: form.branchId ? parseInt(form.branchId) : null,
      };
      
      const res = await fetch('/api/holidays', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      
      if (json.success) {
        toast.success('Holiday updated successfully');
        setEditOpen(false);
        setForm(EMPTY_FORM);
        setSelectedId(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to update holiday');
      }
    } catch (error) {
      console.error('Error updating holiday:', error);
      toast.error('Failed to update holiday');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/holidays', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedId }),
      });
      const json = await res.json();
      
      if (json.success) {
        toast.success('Holiday deleted successfully');
        setDeleteOpen(false);
        setSelectedId(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to delete holiday');
      }
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error('Failed to delete holiday');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (holiday: Holiday) => {
    setSelectedId(holiday.id);
    setForm({
      name: holiday.name,
      date: holiday.date.split('T')[0],
      type: holiday.type,
      description: holiday.description || '',
      isRecurring: holiday.isRecurring,
      applicableTo: holiday.applicableTo,
      branchId: holiday.branchId?.toString() || '',
    });
    setEditOpen(true);
  };

  const openDelete = (id: number) => {
    setSelectedId(id);
    setDeleteOpen(true);
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#e2e8f0]">Holidays Calendar</h2>
          <p className="text-[11px] text-[#8899aa] mt-0.5">Manage company and branch-specific holidays</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[120px] bg-[#141920] border-[#2e3a48] text-[#e2e8f0]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a2332] border-[#2e3a48]">
              {[2024, 2025, 2026, 2027].map(year => (
                <SelectItem key={year} value={year.toString()} className="text-[#e2e8f0]">
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => setCreateOpen(true)}
            className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Holiday
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#141920] border border-[#252e3a] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-[#a78bfa]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wide">Total Holidays</span>
          </div>
          <div className="text-[24px] font-bold text-[#e2e8f0]">{holidays.length}</div>
        </div>
        <div className="bg-[#141920] border border-[#252e3a] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-[#00e676]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wide">Company-wide</span>
          </div>
          <div className="text-[24px] font-bold text-[#e2e8f0]">
            {holidays.filter(h => !h.branchId).length}
          </div>
        </div>
        <div className="bg-[#141920] border border-[#252e3a] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-[#00d4ff]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wide">Branch-specific</span>
          </div>
          <div className="text-[24px] font-bold text-[#e2e8f0]">
            {holidays.filter(h => h.branchId).length}
          </div>
        </div>
        <div className="bg-[#141920] border border-[#252e3a] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-[#ffab40]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wide">Upcoming</span>
          </div>
          <div className="text-[24px] font-bold text-[#e2e8f0]">
            {holidays.filter(h => new Date(h.date) > new Date()).length}
          </div>
        </div>
      </div>

      {/* Holidays by Month */}
      <div className="space-y-6">
        {Object.entries(holidaysByMonth).map(([month, monthHolidays]) => (
          <div key={month}>
            <h3 className="text-[14px] font-semibold text-[#e2e8f0] mb-3">{month}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {monthHolidays.map(holiday => (
                <div 
                  key={holiday.id}
                  className="bg-[#141920] border border-[#252e3a] rounded-xl p-4 hover:border-[#f5a623] transition-colors group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-[13px] font-semibold text-[#e2e8f0] mb-1">{holiday.name}</h4>
                      <p className="text-[11px] text-[#8899aa]">{formatDate(holiday.date)}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:bg-[#f5a623]/20 hover:text-[#f5a623]"
                        onClick={() => openEdit(holiday)}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:bg-[#ff3d3d]/20 hover:text-[#ff3d3d]"
                        onClick={() => openDelete(holiday.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold border ${getTypeColor(holiday.type)}`}>
                      {holiday.type.toUpperCase()}
                    </span>
                    {holiday.branchId ? (
                      <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30">
                        <Building2 className="w-3 h-3 inline mr-1" />
                        {holiday.Branch?.name}
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30">
                        <Globe className="w-3 h-3 inline mr-1" />
                        Company-wide
                      </span>
                    )}
                  </div>
                  {holiday.description && (
                    <p className="text-[10px] text-[#5a6878] mt-2 line-clamp-2">{holiday.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {holidays.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-[#5a6878] mx-auto mb-3" />
          <p className="text-[#8899aa] text-[13px]">No holidays found for {yearFilter}</p>
          <Button 
            onClick={() => setCreateOpen(true)}
            className="mt-4 bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add First Holiday
          </Button>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#0f1419] border-[#252e3a] text-[#e2e8f0] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-bold">Add New Holiday</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[11px] text-[#8899aa]">Holiday Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="e.g., Independence Day"
                className="bg-[#141920] border-[#2e3a48] text-[#e2e8f0] mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] text-[#8899aa]">Date *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => updateForm('date', e.target.value)}
                className="bg-[#141920] border-[#2e3a48] text-[#e2e8f0] mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] text-[#8899aa]">Type</Label>
              <Select value={form.type} onValueChange={(v) => updateForm('type', v)}>
                <SelectTrigger className="bg-[#141920] border-[#2e3a48] text-[#e2e8f0] mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-[#2e3a48]">
                  <SelectItem value="public" className="text-[#e2e8f0]">Public</SelectItem>
                  <SelectItem value="optional" className="text-[#e2e8f0]">Optional</SelectItem>
                  <SelectItem value="restricted" className="text-[#e2e8f0]">Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-[#8899aa]">Applicable To</Label>
              <Select value={form.branchId || 'all'} onValueChange={(v) => updateForm('branchId', v === 'all' ? '' : v)}>
                <SelectTrigger className="bg-[#141920] border-[#2e3a48] text-[#e2e8f0] mt-1">
                  <SelectValue placeholder="All branches (company-wide)" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-[#2e3a48]">
                  <SelectItem value="all" className="text-[#e2e8f0]">
                    <span className="flex items-center gap-2"><Globe className="w-3 h-3 text-[#00e676]" /> All Branches (Company-wide)</span>
                  </SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id.toString()} className="text-[#e2e8f0]">
                      <span className="flex items-center gap-2"><Building2 className="w-3 h-3 text-[#00d4ff]" /> {b.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[9px] text-[#5a6878] mt-1">
                {form.branchId
                  ? `Only employees at ${branches.find(b => b.id.toString() === form.branchId)?.name || 'this branch'} will observe this holiday.`
                  : 'All employees across all branches will observe this holiday.'}
              </p>
            </div>
            <div>
              <Label className="text-[11px] text-[#8899aa]">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder="Optional description"
                className="bg-[#141920] border-[#2e3a48] text-[#e2e8f0] mt-1 min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="ghost" 
              className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48]"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold"
              disabled={submitting}
              onClick={handleCreate}
            >
              {submitting ? 'Creating...' : 'Create Holiday'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#0f1419] border-[#252e3a] text-[#e2e8f0] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-bold">Edit Holiday</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[11px] text-[#8899aa]">Holiday Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                className="bg-[#141920] border-[#2e3a48] text-[#e2e8f0] mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] text-[#8899aa]">Date *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => updateForm('date', e.target.value)}
                className="bg-[#141920] border-[#2e3a48] text-[#e2e8f0] mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] text-[#8899aa]">Type</Label>
              <Select value={form.type} onValueChange={(v) => updateForm('type', v)}>
                <SelectTrigger className="bg-[#141920] border-[#2e3a48] text-[#e2e8f0] mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-[#2e3a48]">
                  <SelectItem value="public" className="text-[#e2e8f0]">Public</SelectItem>
                  <SelectItem value="optional" className="text-[#e2e8f0]">Optional</SelectItem>
                  <SelectItem value="restricted" className="text-[#e2e8f0]">Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-[#8899aa]">Applicable To</Label>
              <Select value={form.branchId || 'all'} onValueChange={(v) => updateForm('branchId', v === 'all' ? '' : v)}>
                <SelectTrigger className="bg-[#141920] border-[#2e3a48] text-[#e2e8f0] mt-1">
                  <SelectValue placeholder="All branches (company-wide)" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-[#2e3a48]">
                  <SelectItem value="all" className="text-[#e2e8f0]">
                    <span className="flex items-center gap-2"><Globe className="w-3 h-3 text-[#00e676]" /> All Branches (Company-wide)</span>
                  </SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id.toString()} className="text-[#e2e8f0]">
                      <span className="flex items-center gap-2"><Building2 className="w-3 h-3 text-[#00d4ff]" /> {b.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[9px] text-[#5a6878] mt-1">
                {form.branchId
                  ? `Only employees at ${branches.find(b => b.id.toString() === form.branchId)?.name || 'this branch'} will observe this holiday.`
                  : 'All employees across all branches will observe this holiday.'}
              </p>
            </div>
            <div>
              <Label className="text-[11px] text-[#8899aa]">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                className="bg-[#141920] border-[#2e3a48] text-[#e2e8f0] mt-1 min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="ghost" 
              className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48]"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold"
              disabled={submitting}
              onClick={handleEdit}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#0f1419] border-[#252e3a] text-[#e2e8f0] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-bold">Delete Holiday</DialogTitle>
          </DialogHeader>
          <p className="text-[12px] text-[#8899aa]">
            Are you sure you want to delete this holiday? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button 
              variant="ghost" 
              className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48]"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-[#ff3d3d] text-white hover:bg-[#cc2020] font-semibold"
              disabled={submitting}
              onClick={handleDelete}
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
