'use client';

import { useState, useEffect } from 'react';
import { Shield, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AttendanceRule {
  id: number;
  name: string;
  ruleType: string;
  gracePeriodMinutes: number;
  lateMarkAfterMinutes: number;
  halfDayAfterMinutes: number;
  absentAfterMinutes: number;
  fineAmount: number;
  fineType: string;
  finePerMinute: number;
  maxFinePerDay: number;
  applyToShiftId: number | null;
  applyToDepartmentId: number | null;
  applyToBranchId: number | null;
  isActive: boolean;
}

interface Shift {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
}

const inputCls = "w-full bg-[#1a2332] border-[1.5px] border-[#2e3a48] rounded-lg px-3.5 py-2.5 text-[13px] text-[#e2e8f0] outline-none transition-all duration-200 placeholder:text-[#5a6878] hover:border-[#3a4858] hover:bg-[#1e2838] focus:border-[#f5a623] focus:bg-[#1e2838] focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)]";
const selectCls = "w-full bg-[#1a2332] border-[1.5px] border-[#2e3a48] rounded-lg px-3.5 py-2.5 text-[13px] text-[#e2e8f0] outline-none transition-all duration-200 hover:border-[#3a4858] hover:bg-[#1e2838] focus:border-[#f5a623] focus:bg-[#1e2838] focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)] appearance-none cursor-pointer";

export default function AttendanceRulesModule() {
  const [rules, setRules] = useState<AttendanceRule[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState({ 
    name: '', ruleType: 'late', gracePeriodMinutes: '0', lateMarkAfterMinutes: '0', 
    halfDayAfterMinutes: '0', absentAfterMinutes: '0', fineAmount: '0', fineType: 'fixed', 
    finePerMinute: '0', maxFinePerDay: '0', applyToShiftId: '', applyToDepartmentId: '', applyToBranchId: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRules();
    fetchDropdownData();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/attendance-rules');
      const data = await response.json();
      if (data.success) {
        setRules(data.data);
      }
    } catch (error) {
      console.error('Error fetching attendance rules:', error);
      toast.error('Failed to load attendance rules');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [shiftsRes, deptsRes, branchesRes] = await Promise.all([
        fetch('/api/shifts'),
        fetch('/api/departments'),
        fetch('/api/branches')
      ]);
      const [shiftsData, deptsData, branchesData] = await Promise.all([
        shiftsRes.json(),
        deptsRes.json(),
        branchesRes.json()
      ]);
      if (shiftsData.success) setShifts(shiftsData.data);
      if (deptsData.success) setDepartments(deptsData.data);
      if (branchesData.success) setBranches(branchesData.data);
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  const handleSubmit = async (mode: 'create' | 'edit') => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSubmitting(true);
    try {
      const method = mode === 'create' ? 'POST' : 'PUT';
      const body = mode === 'edit' ? { id: selectedId, ...form } : form;
      const res = await fetch('/api/attendance-rules', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(`Attendance rule ${mode === 'create' ? 'created' : 'updated'} successfully`);
        mode === 'create' ? setCreateOpen(false) : setEditOpen(false);
        setForm({ name: '', ruleType: 'late', gracePeriodMinutes: '0', lateMarkAfterMinutes: '0', halfDayAfterMinutes: '0', absentAfterMinutes: '0', fineAmount: '0', fineType: 'fixed', finePerMinute: '0', maxFinePerDay: '0', applyToShiftId: '', applyToDepartmentId: '', applyToBranchId: '' });
        fetchRules();
      } else { toast.error(json.error || `Failed to ${mode} rule`); }
    } catch { toast.error(`Failed to ${mode} rule`); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/attendance-rules', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedId }) });
      const json = await res.json();
      if (json.success) {
        toast.success('Attendance rule deleted successfully');
        setDeleteOpen(false);
        fetchRules();
      } else { toast.error(json.error || 'Failed to delete rule'); }
    } catch { toast.error('Failed to delete rule'); }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Shield size={16} className="text-[#a78bfa]" />
          <span className="text-[14px] font-bold text-[#e2e8f0]">Attendance Rules</span>
          <span className="ml-auto text-[11px] text-[#5a6878]">{rules.length} rules</span>
          <button className="vc-btn-primary ml-2 flex items-center gap-1.5" onClick={() => { setForm({ name: '', ruleType: 'late', gracePeriodMinutes: '0', lateMarkAfterMinutes: '0', halfDayAfterMinutes: '0', absentAfterMinutes: '0', fineAmount: '0', fineType: 'fixed', finePerMinute: '0', maxFinePerDay: '0', applyToShiftId: '', applyToDepartmentId: '', applyToBranchId: '' }); setCreateOpen(true); }}>
            <Plus size={14} /> Add Rule
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-[#1a2332] z-10">
              <tr className="border-b border-[#2e3a48]">
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Name</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Type</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Grace Period</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Late After</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Half Day After</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Fine</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-[#5a6878] text-[12px]">No attendance rules found</td></tr>
              ) : rules.map((rule) => (
                <tr key={rule.id} className="border-b border-[#1e252e] hover:bg-[#1a2028] transition-colors group">
                  <td className="px-4 py-3 font-semibold text-[#e2e8f0]">{rule.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-md text-[11px] font-semibold ${
                      rule.ruleType === 'late' ? 'bg-[#ffab40]/10 text-[#ffab40]' : 
                      rule.ruleType === 'early_departure' ? 'bg-[#ff3d3d]/10 text-[#ff3d3d]' : 
                      'bg-[#a78bfa]/10 text-[#a78bfa]'
                    }`}>
                      {rule.ruleType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-[#e2e8f0]">{rule.gracePeriodMinutes} min</td>
                  <td className="px-4 py-3 text-center text-[#e2e8f0]">{rule.lateMarkAfterMinutes} min</td>
                  <td className="px-4 py-3 text-center text-[#e2e8f0]">{rule.halfDayAfterMinutes} min</td>
                  <td className="px-4 py-3 text-center">
                    {rule.fineAmount > 0 && (
                      <span className="inline-flex px-2 py-1 rounded-md bg-[#ff3d3d]/10 text-[#ff3d3d] text-[11px] font-semibold">
                        ₹{rule.fineAmount}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" 
                        onClick={() => { 
                          setForm({ 
                            name: rule.name, ruleType: rule.ruleType, 
                            gracePeriodMinutes: rule.gracePeriodMinutes.toString(), 
                            lateMarkAfterMinutes: rule.lateMarkAfterMinutes.toString(), 
                            halfDayAfterMinutes: rule.halfDayAfterMinutes.toString(), 
                            absentAfterMinutes: rule.absentAfterMinutes.toString(), 
                            fineAmount: rule.fineAmount.toString(), fineType: rule.fineType, 
                            finePerMinute: rule.finePerMinute.toString(), 
                            maxFinePerDay: rule.maxFinePerDay.toString(), 
                            applyToShiftId: rule.applyToShiftId?.toString() || '', 
                            applyToDepartmentId: rule.applyToDepartmentId?.toString() || '', 
                            applyToBranchId: rule.applyToBranchId?.toString() || ''
                          }); 
                          setSelectedId(rule.id); 
                          setEditOpen(true); 
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" 
                        onClick={() => { setSelectedId(rule.id); setDeleteOpen(true); }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Create Attendance Rule</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Rule Name <span className="text-[#ff3d3d]">*</span></label>
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Standard Late Rule" />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Rule Type</label>
              <select className={selectCls} value={form.ruleType} onChange={e => setForm(f => ({ ...f, ruleType: e.target.value }))}>
                <option value="late">Late Arrival</option>
                <option value="early_departure">Early Departure</option>
                <option value="overtime">Overtime</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Grace Period (minutes)</label>
              <input type="number" className={inputCls} value={form.gracePeriodMinutes} onChange={e => setForm(f => ({ ...f, gracePeriodMinutes: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Late Mark After (minutes)</label>
              <input type="number" className={inputCls} value={form.lateMarkAfterMinutes} onChange={e => setForm(f => ({ ...f, lateMarkAfterMinutes: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Half Day After (minutes)</label>
              <input type="number" className={inputCls} value={form.halfDayAfterMinutes} onChange={e => setForm(f => ({ ...f, halfDayAfterMinutes: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Absent After (minutes)</label>
              <input type="number" className={inputCls} value={form.absentAfterMinutes} onChange={e => setForm(f => ({ ...f, absentAfterMinutes: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Fine Type</label>
              <select className={selectCls} value={form.fineType} onChange={e => setForm(f => ({ ...f, fineType: e.target.value }))}>
                <option value="fixed">Fixed Amount</option>
                <option value="per_minute">Per Minute</option>
                <option value="none">No Fine</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Fine Amount (₹)</label>
              <input type="number" step="0.01" className={inputCls} value={form.fineAmount} onChange={e => setForm(f => ({ ...f, fineAmount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Fine Per Minute (₹)</label>
              <input type="number" step="0.01" className={inputCls} value={form.finePerMinute} onChange={e => setForm(f => ({ ...f, finePerMinute: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Max Fine Per Day (₹)</label>
              <input type="number" step="0.01" className={inputCls} value={form.maxFinePerDay} onChange={e => setForm(f => ({ ...f, maxFinePerDay: e.target.value }))} />
            </div>
            <div className="col-span-2 border-t border-[#2e3a48] pt-4">
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-3">Apply To (Optional)</label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] text-[#5a6878] mb-2">Shift</label>
                  <select className={selectCls} value={form.applyToShiftId} onChange={e => setForm(f => ({ ...f, applyToShiftId: e.target.value }))}>
                    <option value="">All Shifts</option>
                    {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#5a6878] mb-2">Department</label>
                  <select className={selectCls} value={form.applyToDepartmentId} onChange={e => setForm(f => ({ ...f, applyToDepartmentId: e.target.value }))}>
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#5a6878] mb-2">Branch</label>
                  <select className={selectCls} value={form.applyToBranchId} onChange={e => setForm(f => ({ ...f, applyToBranchId: e.target.value }))}>
                    <option value="">All Branches</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#1a2332] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48]" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#a78bfa] text-black hover:bg-[#9370db] font-semibold" disabled={submitting} onClick={() => handleSubmit('create')}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Edit Attendance Rule</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Rule Name <span className="text-[#ff3d3d]">*</span></label>
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Rule Type</label>
              <select className={selectCls} value={form.ruleType} onChange={e => setForm(f => ({ ...f, ruleType: e.target.value }))}>
                <option value="late">Late Arrival</option>
                <option value="early_departure">Early Departure</option>
                <option value="overtime">Overtime</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Grace Period (minutes)</label>
              <input type="number" className={inputCls} value={form.gracePeriodMinutes} onChange={e => setForm(f => ({ ...f, gracePeriodMinutes: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Late Mark After (minutes)</label>
              <input type="number" className={inputCls} value={form.lateMarkAfterMinutes} onChange={e => setForm(f => ({ ...f, lateMarkAfterMinutes: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Half Day After (minutes)</label>
              <input type="number" className={inputCls} value={form.halfDayAfterMinutes} onChange={e => setForm(f => ({ ...f, halfDayAfterMinutes: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Absent After (minutes)</label>
              <input type="number" className={inputCls} value={form.absentAfterMinutes} onChange={e => setForm(f => ({ ...f, absentAfterMinutes: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Fine Type</label>
              <select className={selectCls} value={form.fineType} onChange={e => setForm(f => ({ ...f, fineType: e.target.value }))}>
                <option value="fixed">Fixed Amount</option>
                <option value="per_minute">Per Minute</option>
                <option value="none">No Fine</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Fine Amount (₹)</label>
              <input type="number" step="0.01" className={inputCls} value={form.fineAmount} onChange={e => setForm(f => ({ ...f, fineAmount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Fine Per Minute (₹)</label>
              <input type="number" step="0.01" className={inputCls} value={form.finePerMinute} onChange={e => setForm(f => ({ ...f, finePerMinute: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Max Fine Per Day (₹)</label>
              <input type="number" step="0.01" className={inputCls} value={form.maxFinePerDay} onChange={e => setForm(f => ({ ...f, maxFinePerDay: e.target.value }))} />
            </div>
            <div className="col-span-2 border-t border-[#2e3a48] pt-4">
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-3">Apply To (Optional)</label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] text-[#5a6878] mb-2">Shift</label>
                  <select className={selectCls} value={form.applyToShiftId} onChange={e => setForm(f => ({ ...f, applyToShiftId: e.target.value }))}>
                    <option value="">All Shifts</option>
                    {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#5a6878] mb-2">Department</label>
                  <select className={selectCls} value={form.applyToDepartmentId} onChange={e => setForm(f => ({ ...f, applyToDepartmentId: e.target.value }))}>
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#5a6878] mb-2">Branch</label>
                  <select className={selectCls} value={form.applyToBranchId} onChange={e => setForm(f => ({ ...f, applyToBranchId: e.target.value }))}>
                    <option value="">All Branches</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#1a2332] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48]" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('edit')}>
              {submitting ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base flex items-center gap-2"><AlertTriangle size={20} className="text-[#ff3d3d]" /> Delete Attendance Rule</DialogTitle></DialogHeader>
          <p className="text-[13px] text-[#8899aa]">Are you sure you want to delete this attendance rule? This action cannot be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#1a2332] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48]" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#e63535] font-semibold" disabled={submitting} onClick={handleDelete}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
