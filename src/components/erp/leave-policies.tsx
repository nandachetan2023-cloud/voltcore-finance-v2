'use client';

import { useState, useEffect } from 'react';
import { FileText, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LeavePolicy {
  id: number;
  name: string;
  code: string;
  leaveType: string;
  annualQuota: number;
  carryForward: boolean;
  maxCarryForward: number;
  encashable: boolean;
  maxEncashment: number;
  minDaysNotice: number;
  maxConsecutiveDays: number;
  applicableAfterMonths: number;
  applicableGender: string;
  requiresDocument: boolean;
  isActive: boolean;
}

const inputCls = "w-full bg-[#1a2332] border-[1.5px] border-[#2e3a48] rounded-lg px-3.5 py-2.5 text-[13px] text-[#e2e8f0] outline-none transition-all duration-200 placeholder:text-[#5a6878] hover:border-[#3a4858] hover:bg-[#1e2838] focus:border-[#f5a623] focus:bg-[#1e2838] focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)]";
const selectCls = "w-full bg-[#1a2332] border-[1.5px] border-[#2e3a48] rounded-lg px-3.5 py-2.5 text-[13px] text-[#e2e8f0] outline-none transition-all duration-200 hover:border-[#3a4858] hover:bg-[#1e2838] focus:border-[#f5a623] focus:bg-[#1e2838] focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)] appearance-none cursor-pointer";

export default function LeavePoliciesModule() {
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState({ 
    name: '', code: '', leaveType: 'paid', annualQuota: '0', carryForward: false, maxCarryForward: '0', 
    encashable: false, maxEncashment: '0', minDaysNotice: '0', maxConsecutiveDays: '0', 
    applicableAfterMonths: '0', applicableGender: 'all', applicableTo: 'all', 
    departmentId: '', designationId: '', requiresDocument: false 
  });

  const resetForm = () => {
    setForm({ 
      name: '', code: '', leaveType: 'paid', annualQuota: '0', carryForward: false, maxCarryForward: '0', 
      encashable: false, maxEncashment: '0', minDaysNotice: '0', maxConsecutiveDays: '0', 
      applicableAfterMonths: '0', applicableGender: 'all', applicableTo: 'all', 
      departmentId: '', designationId: '', requiresDocument: false 
    });
  };
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPolicies();
    fetchDepartments();
    fetchDesignations();
  }, []);

  const fetchPolicies = async () => {
    try {
      const response = await fetch('/api/leave-policies');
      const data = await response.json();
      if (data.success) {
        setPolicies(data.data);
      }
    } catch (error) {
      console.error('Error fetching leave policies:', error);
      toast.error('Failed to load leave policies');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      const data = await response.json();
      if (data.success) {
        setDepartments(data.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchDesignations = async () => {
    try {
      const response = await fetch('/api/designations');
      const data = await response.json();
      if (data.success) {
        setDesignations(data.data);
      }
    } catch (error) {
      console.error('Error fetching designations:', error);
    }
  };

  const handleSubmit = async (mode: 'create' | 'edit') => {
    if (!form.name.trim() || !form.code.trim()) { toast.error('Name and code are required'); return; }
    setSubmitting(true);
    try {
      const method = mode === 'create' ? 'POST' : 'PUT';
      const body = mode === 'edit' ? { id: selectedId, ...form } : form;
      const res = await fetch('/api/leave-policies', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(`Leave policy ${mode === 'create' ? 'created' : 'updated'} successfully`);
        mode === 'create' ? setCreateOpen(false) : setEditOpen(false);
        resetForm();
        fetchPolicies();
      } else { toast.error(json.error || `Failed to ${mode} policy`); }
    } catch { toast.error(`Failed to ${mode} policy`); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/leave-policies', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedId }) });
      
      if (!res.ok) {
        const text = await res.text();
        console.error('Delete failed:', res.status, text);
        toast.error(`Failed to delete policy: ${res.status}`);
        return;
      }
      
      const json = await res.json();
      if (json.success) {
        toast.success('Leave policy deleted successfully');
        setDeleteOpen(false);
        fetchPolicies();
      } else { 
        console.error('Delete error:', json.error);
        toast.error(json.error || 'Failed to delete policy'); 
      }
    } catch (error) { 
      console.error('Delete exception:', error);
      toast.error('Failed to delete policy'); 
    }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileText size={16} className="text-[#00d4ff]" />
          <span className="text-[14px] font-bold text-[#e2e8f0]">Leave Policies</span>
          <span className="ml-auto text-[11px] text-[#5a6878]">{policies.length} policies</span>
          <button className="vc-btn-primary ml-2 flex items-center gap-1.5" onClick={() => { resetForm(); setCreateOpen(true); }}>
            <Plus size={14} /> Add Policy
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-[#1a2332] z-10">
              <tr className="border-b border-[#2e3a48]">
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Name</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Code</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Type</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Annual Quota</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Carry Forward</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Encashable</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {policies.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-[#5a6878] text-[12px]">No leave policies found</td></tr>
              ) : policies.map((policy) => (
                <tr key={policy.id} className="border-b border-[#1e252e] hover:bg-[#1a2028] transition-colors group">
                  <td className="px-4 py-3 font-semibold text-[#e2e8f0]">{policy.name}</td>
                  <td className="px-4 py-3 text-[#8899aa] font-mono text-[11px]">{policy.code}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-md text-[11px] font-semibold ${
                      policy.leaveType === 'paid' ? 'bg-[#00e676]/10 text-[#00e676]' : 
                      policy.leaveType === 'sick' ? 'bg-[#ff3d3d]/10 text-[#ff3d3d]' : 
                      'bg-[#a78bfa]/10 text-[#a78bfa]'
                    }`}>
                      {policy.leaveType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-[#e2e8f0] font-semibold">{policy.annualQuota} days</td>
                  <td className="px-4 py-3 text-center">
                    {policy.carryForward && <span className="inline-flex px-2 py-1 rounded-md bg-[#00d4ff]/10 text-[#00d4ff] text-[11px] font-semibold">{policy.maxCarryForward} days</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {policy.encashable && <span className="inline-flex px-2 py-1 rounded-md bg-[#f5a623]/10 text-[#f5a623] text-[11px] font-semibold">{policy.maxEncashment} days</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" 
                        onClick={() => { 
                          setForm({ 
                            name: policy.name, code: policy.code, leaveType: policy.leaveType, 
                            annualQuota: policy.annualQuota.toString(), carryForward: policy.carryForward, 
                            maxCarryForward: policy.maxCarryForward.toString(), encashable: policy.encashable, 
                            maxEncashment: policy.maxEncashment.toString(), minDaysNotice: policy.minDaysNotice.toString(), 
                            maxConsecutiveDays: policy.maxConsecutiveDays.toString(), applicableAfterMonths: policy.applicableAfterMonths.toString(), 
                            applicableGender: policy.applicableGender, applicableTo: (policy as any).applicableTo || 'all',
                            departmentId: (policy as any).departmentId?.toString() || '', designationId: (policy as any).designationId?.toString() || '',
                            requiresDocument: policy.requiresDocument 
                          }); 
                          setSelectedId(policy.id); 
                          setEditOpen(true); 
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" 
                        onClick={() => { setSelectedId(policy.id); setDeleteOpen(true); }}
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
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Create Leave Policy</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Policy Name <span className="text-[#ff3d3d]">*</span></label>
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, code: e.target.value.toUpperCase().replace(/\s+/g, '_').substring(0, 10) }))} placeholder="Paid Leave" />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Code <span className="text-[#ff3d3d]">*</span></label>
              <input className={inputCls} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="PL" />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Leave Type</label>
              <select className={selectCls} value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))}>
                <option value="paid">Paid</option>
                <option value="sick">Sick</option>
                <option value="casual">Casual</option>
                <option value="maternity">Maternity</option>
                <option value="paternity">Paternity</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Annual Quota (days) <span className="text-[#ff3d3d]">*</span></label>
              <input type="number" step="0.5" className={inputCls} value={form.annualQuota} onChange={e => setForm(f => ({ ...f, annualQuota: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Min Days Notice</label>
              <input type="number" className={inputCls} value={form.minDaysNotice} onChange={e => setForm(f => ({ ...f, minDaysNotice: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Max Consecutive Days</label>
              <input type="number" className={inputCls} value={form.maxConsecutiveDays} onChange={e => setForm(f => ({ ...f, maxConsecutiveDays: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Applicable After (months)</label>
              <input type="number" className={inputCls} value={form.applicableAfterMonths} onChange={e => setForm(f => ({ ...f, applicableAfterMonths: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Applicable Gender</label>
              <select className={selectCls} value={form.applicableGender} onChange={e => setForm(f => ({ ...f, applicableGender: e.target.value }))}>
                <option value="all">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Applicable To</label>
              <select className={selectCls} value={form.applicableTo} onChange={e => setForm(f => ({ ...f, applicableTo: e.target.value }))}>
                <option value="all">All Employees</option>
                <option value="department">Specific Department</option>
                <option value="designation">Specific Designation</option>
                <option value="both">Department & Designation</option>
              </select>
            </div>
            {(form.applicableTo === 'department' || form.applicableTo === 'both') && (
              <div>
                <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Department</label>
                <select className={selectCls} value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}>
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            )}
            {(form.applicableTo === 'designation' || form.applicableTo === 'both') && (
              <div>
                <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Designation</label>
                <select className={selectCls} value={form.designationId} onChange={e => setForm(f => ({ ...f, designationId: e.target.value }))}>
                  <option value="">Select Designation</option>
                  {designations.map(desig => (
                    <option key={desig.id} value={desig.id}>{desig.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="col-span-2 space-y-3 border-t border-[#2e3a48] pt-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="carryForward" checked={form.carryForward} onChange={e => setForm(f => ({ ...f, carryForward: e.target.checked }))} className="w-4 h-4" />
                <label htmlFor="carryForward" className="text-[12px] text-[#e2e8f0]">Allow Carry Forward</label>
                {form.carryForward && (
                  <input type="number" step="0.5" className={`${inputCls} w-24 ml-4`} value={form.maxCarryForward} onChange={e => setForm(f => ({ ...f, maxCarryForward: e.target.value }))} placeholder="Max days" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="encashable" checked={form.encashable} onChange={e => setForm(f => ({ ...f, encashable: e.target.checked }))} className="w-4 h-4" />
                <label htmlFor="encashable" className="text-[12px] text-[#e2e8f0]">Encashable</label>
                {form.encashable && (
                  <input type="number" step="0.5" className={`${inputCls} w-24 ml-4`} value={form.maxEncashment} onChange={e => setForm(f => ({ ...f, maxEncashment: e.target.value }))} placeholder="Max days" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="requiresDocument" checked={form.requiresDocument} onChange={e => setForm(f => ({ ...f, requiresDocument: e.target.checked }))} className="w-4 h-4" />
                <label htmlFor="requiresDocument" className="text-[12px] text-[#e2e8f0]">Requires Document (Medical Certificate)</label>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#1a2332] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48]" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#00d4ff] text-black hover:bg-[#00b8d4] font-semibold" disabled={submitting} onClick={() => handleSubmit('create')}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Same structure */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Edit Leave Policy</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Policy Name <span className="text-[#ff3d3d]">*</span></label>
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Code <span className="text-[#ff3d3d]">*</span></label>
              <input className={inputCls} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Leave Type</label>
              <select className={selectCls} value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))}>
                <option value="paid">Paid</option>
                <option value="sick">Sick</option>
                <option value="casual">Casual</option>
                <option value="maternity">Maternity</option>
                <option value="paternity">Paternity</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Annual Quota (days) <span className="text-[#ff3d3d]">*</span></label>
              <input type="number" step="0.5" className={inputCls} value={form.annualQuota} onChange={e => setForm(f => ({ ...f, annualQuota: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Min Days Notice</label>
              <input type="number" className={inputCls} value={form.minDaysNotice} onChange={e => setForm(f => ({ ...f, minDaysNotice: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Max Consecutive Days</label>
              <input type="number" className={inputCls} value={form.maxConsecutiveDays} onChange={e => setForm(f => ({ ...f, maxConsecutiveDays: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Applicable After (months)</label>
              <input type="number" className={inputCls} value={form.applicableAfterMonths} onChange={e => setForm(f => ({ ...f, applicableAfterMonths: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Applicable Gender</label>
              <select className={selectCls} value={form.applicableGender} onChange={e => setForm(f => ({ ...f, applicableGender: e.target.value }))}>
                <option value="all">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Applicable To</label>
              <select className={selectCls} value={form.applicableTo} onChange={e => setForm(f => ({ ...f, applicableTo: e.target.value }))}>
                <option value="all">All Employees</option>
                <option value="department">Specific Department</option>
                <option value="designation">Specific Designation</option>
                <option value="both">Department & Designation</option>
              </select>
            </div>
            {(form.applicableTo === 'department' || form.applicableTo === 'both') && (
              <div>
                <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Department</label>
                <select className={selectCls} value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}>
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            )}
            {(form.applicableTo === 'designation' || form.applicableTo === 'both') && (
              <div>
                <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-2">Designation</label>
                <select className={selectCls} value={form.designationId} onChange={e => setForm(f => ({ ...f, designationId: e.target.value }))}>
                  <option value="">Select Designation</option>
                  {designations.map(desig => (
                    <option key={desig.id} value={desig.id}>{desig.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="col-span-2 space-y-3 border-t border-[#2e3a48] pt-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="carryForward-edit" checked={form.carryForward} onChange={e => setForm(f => ({ ...f, carryForward: e.target.checked }))} className="w-4 h-4" />
                <label htmlFor="carryForward-edit" className="text-[12px] text-[#e2e8f0]">Allow Carry Forward</label>
                {form.carryForward && (
                  <input type="number" step="0.5" className={`${inputCls} w-24 ml-4`} value={form.maxCarryForward} onChange={e => setForm(f => ({ ...f, maxCarryForward: e.target.value }))} />
                )}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="encashable-edit" checked={form.encashable} onChange={e => setForm(f => ({ ...f, encashable: e.target.checked }))} className="w-4 h-4" />
                <label htmlFor="encashable-edit" className="text-[12px] text-[#e2e8f0]">Encashable</label>
                {form.encashable && (
                  <input type="number" step="0.5" className={`${inputCls} w-24 ml-4`} value={form.maxEncashment} onChange={e => setForm(f => ({ ...f, maxEncashment: e.target.value }))} />
                )}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="requiresDocument-edit" checked={form.requiresDocument} onChange={e => setForm(f => ({ ...f, requiresDocument: e.target.checked }))} className="w-4 h-4" />
                <label htmlFor="requiresDocument-edit" className="text-[12px] text-[#e2e8f0]">Requires Document</label>
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
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base flex items-center gap-2"><AlertTriangle size={20} className="text-[#ff3d3d]" /> Delete Leave Policy</DialogTitle></DialogHeader>
          <p className="text-[13px] text-[#8899aa]">Are you sure you want to delete this leave policy? This action cannot be undone.</p>
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
