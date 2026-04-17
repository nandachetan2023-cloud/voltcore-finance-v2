'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock, Calendar, Plus, Pencil, Trash2, AlertTriangle, Loader2,
  Sun, Moon, Coffee, Users
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';

interface Shift {
  id: number;
  name: string;
  type: string;
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
  breakMinutes: number;
  graceMinutes: number;
  otThresholdMin: number;
  weekOffDays: number[];
  isActive: boolean;
}

interface Employee {
  id: number;
  employeeCode: string;
  name: string;
}

interface ShiftAssignment {
  id: number;
  employeeId: number;
  shiftId: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  Employee: {
    id: number;
    employeeCode: string;
    firstName: string;
    lastName: string;
  };
  Shift: Shift;
}

interface ShiftFormData {
  name: string;
  type: string;
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
  breakMinutes: number;
  graceMinutes: number;
  otThresholdMin: number;
  weekOffDays: number[];
}

interface AssignmentFormData {
  employeeId: string;
  shiftId: string;
  effectiveFrom: string;
  effectiveTo: string;
}

const EMPTY_SHIFT_FORM: ShiftFormData = {
  name: '',
  type: 'fixed',
  startTime: '09:00',
  endTime: '18:00',
  crossesMidnight: false,
  breakMinutes: 60,
  graceMinutes: 10,
  otThresholdMin: 30,
  weekOffDays: [0], // Sunday
};

const EMPTY_ASSIGNMENT_FORM: AssignmentFormData = {
  employeeId: '',
  shiftId: '',
  effectiveFrom: new Date().toISOString().split('T')[0],
  effectiveTo: '',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const inputCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623]";
const selectCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623] appearance-none cursor-pointer";

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number; color: string;
}) {
  return (
    <div className="vc-stat-card">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] text-[#5a6878] font-semibold uppercase tracking-wider mb-1">{label}</div>
          <div className="text-[26px] font-bold leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{value}</div>
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

export default function ShiftRosterModule() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Dialogs
  const [createShiftOpen, setCreateShiftOpen] = useState(false);
  const [editShiftOpen, setEditShiftOpen] = useState(false);
  const [deleteShiftOpen, setDeleteShiftOpen] = useState(false);
  const [assignShiftOpen, setAssignShiftOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [deleteAssignmentOpen, setDeleteAssignmentOpen] = useState(false);

  const [shiftForm, setShiftForm] = useState<ShiftFormData>(EMPTY_SHIFT_FORM);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormData>(EMPTY_ASSIGNMENT_FORM);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [bulkShiftId, setBulkShiftId] = useState<string>('');
  const [bulkEffectiveFrom, setBulkEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);

  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateShiftOpen(true); }, [triggerCreate]);

  const fetchData = useCallback(async () => {
    try {
      const [shiftsRes, employeesRes, assignmentsRes] = await Promise.all([
        fetch('/api/shifts'),
        fetch('/api/employees'),
        fetch('/api/shift-assignments?active=true'),
      ]);

      // Safe JSON parse — guard against empty or non-JSON responses
      const safeJson = async (res: Response, label: string) => {
        const text = await res.text();
        if (!text || !text.trim()) {
          console.warn(`[ShiftRoster] Empty response from ${label} (${res.status})`);
          return { success: false, data: [] };
        }
        try { return JSON.parse(text); }
        catch (e) {
          console.warn(`[ShiftRoster] Invalid JSON from ${label}:`, text.slice(0, 200));
          return { success: false, data: [] };
        }
      };

      const [shiftsJson, employeesJson, assignmentsJson] = await Promise.all([
        safeJson(shiftsRes, '/api/shifts'),
        safeJson(employeesRes, '/api/employees'),
        safeJson(assignmentsRes, '/api/shift-assignments'),
      ]);

      if (shiftsJson.success) {
        setShifts(shiftsJson.data);
      } else {
        console.error('Failed to fetch shifts:', shiftsJson.error);
      }
      
      if (employeesJson.success) {
        console.log('Shift Roster - Raw employee data sample:', employeesJson.data.slice(0, 3));
        console.log('Shift Roster - Total employees from API:', employeesJson.data.length);
        
        const activeEmployees = employeesJson.data.filter((e: any) => e.employmentStatus?.toLowerCase() === 'active');
        console.log('Shift Roster - Active employees count:', activeEmployees.length);
        
        const mappedEmployees = activeEmployees.map((e: any) => ({
          id: e.id,
          employeeCode: e.employeeCode,
          name: `${e.firstName} ${e.lastName}`,
        }));
        
        console.log('Shift Roster - Mapped employees sample:', mappedEmployees.slice(0, 3));
        console.log('Shift Roster - Total mapped employees:', mappedEmployees.length);
        
        setEmployees(mappedEmployees);
      } else {
        console.error('Shift Roster - Failed to fetch employees:', employeesJson.error);
      }

      if (assignmentsJson.success) {
        setAssignments(assignmentsJson.data);
      } else {
        console.error('Failed to fetch assignments:', assignmentsJson.error);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = useMemo(() => {
    const totalShifts = shifts.filter(s => s.isActive).length;
    const dayShifts = shifts.filter(s => s.isActive && !s.crossesMidnight).length;
    const nightShifts = shifts.filter(s => s.isActive && s.crossesMidnight).length;
    const totalAssignments = assignments.filter(a => !a.effectiveTo || new Date(a.effectiveTo) > new Date()).length;

    return { totalShifts, dayShifts, nightShifts, totalAssignments };
  }, [shifts, assignments]);

  const handleCreateShift = async () => {
    setSubmitting(true);
    try {
      const errors: string[] = [];
      
      if (!shiftForm.name.trim()) errors.push('Shift name is required');
      if (!shiftForm.startTime) errors.push('Start time is required');
      if (!shiftForm.endTime) errors.push('End time is required');

      if (errors.length > 0) {
        toast.error(
          <div>
            <div className="font-semibold mb-1">Please fix the following errors:</div>
            <ul className="list-disc list-inside text-xs">
              {errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>,
          { duration: 5000 }
        );
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shiftForm),
      });

      const json = await res.json();

      if (json.success) {
        toast.success('Shift created successfully');
        setCreateShiftOpen(false);
        setShiftForm(EMPTY_SHIFT_FORM);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to create shift');
      }
    } catch (error) {
      toast.error('Failed to create shift');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateShift = async () => {
    if (!selectedShiftId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/shifts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedShiftId, ...shiftForm }),
      });

      const json = await res.json();

      if (json.success) {
        toast.success('Shift updated successfully');
        setEditShiftOpen(false);
        setShiftForm(EMPTY_SHIFT_FORM);
        setSelectedShiftId(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to update shift');
      }
    } catch (error) {
      toast.error('Failed to update shift');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteShift = async () => {
    if (!selectedShiftId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/shifts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedShiftId }),
      });

      const json = await res.json();

      if (json.success) {
        toast.success('Shift deleted successfully');
        setDeleteShiftOpen(false);
        setSelectedShiftId(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to delete shift');
      }
    } catch (error) {
      toast.error('Failed to delete shift');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditShift = (shift: Shift) => {
    setShiftForm({
      name: shift.name,
      type: shift.type,
      startTime: shift.startTime,
      endTime: shift.endTime,
      crossesMidnight: shift.crossesMidnight,
      breakMinutes: shift.breakMinutes,
      graceMinutes: shift.graceMinutes,
      otThresholdMin: shift.otThresholdMin,
      weekOffDays: shift.weekOffDays,
    });
    setSelectedShiftId(shift.id);
    setEditShiftOpen(true);
  };

  const openDeleteShift = (shiftId: number) => {
    setSelectedShiftId(shiftId);
    setDeleteShiftOpen(true);
  };

  const toggleWeekOffDay = (day: number) => {
    setShiftForm(prev => ({
      ...prev,
      weekOffDays: prev.weekOffDays.includes(day)
        ? prev.weekOffDays.filter(d => d !== day)
        : [...prev.weekOffDays, day].sort(),
    }));
  };

  const toggleEmployeeSelection = (employeeId: number) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleBulkAssign = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }
    if (!bulkShiftId) {
      toast.error('Please select a shift');
      return;
    }

    setSubmitting(true);
    try {
      // Create shift assignments for all selected employees
      const promises = selectedEmployees.map(employeeId =>
        fetch('/api/shift-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId,
            shiftId: parseInt(bulkShiftId),
            effectiveFrom: bulkEffectiveFrom,
          }),
        })
      );

      const results = await Promise.all(promises);
      const allSuccess = results.every(r => r.ok);

      if (allSuccess) {
        toast.success(`Successfully assigned ${selectedEmployees.length} employees to shift`);
        setBulkAssignOpen(false);
        setSelectedEmployees([]);
        setBulkShiftId('');
        await fetchData();
      } else {
        toast.error('Some assignments failed. Please try again.');
      }
    } catch (error) {
      toast.error('Failed to assign shifts');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!selectedAssignmentId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/shift-assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedAssignmentId }),
      });

      const json = await res.json();

      if (json.success) {
        toast.success('Shift assignment removed successfully');
        setDeleteAssignmentOpen(false);
        setSelectedAssignmentId(null);
        await fetchData();
      } else {
        toast.error(json.error || 'Failed to remove assignment');
      }
    } catch (error) {
      toast.error('Failed to remove assignment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="vc-stat-card">
              <div className="h-3 w-24 mb-2 bg-[#1e2630] rounded" />
              <div className="h-8 w-16 bg-[#1e2630] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const shiftFormDialog = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
      <div className="md:col-span-2">
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">
          Shift Name <span className="text-[#ff3d3d]">*</span>
        </label>
        <input
          className={inputCls}
          value={shiftForm.name}
          onChange={e => setShiftForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g., Morning Shift, Night Shift"
        />
      </div>

      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">
          Shift Type <span className="text-[#ff3d3d]">*</span>
        </label>
        <select
          className={selectCls}
          value={shiftForm.type}
          onChange={e => setShiftForm(f => ({ ...f, type: e.target.value }))}
        >
          <option value="fixed">Fixed</option>
          <option value="flexi">Flexible</option>
        </select>
      </div>

      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">
          Grace Minutes
        </label>
        <input
          type="number"
          className={inputCls}
          value={shiftForm.graceMinutes}
          onChange={e => setShiftForm(f => ({ ...f, graceMinutes: parseInt(e.target.value) || 0 }))}
        />
        <p className="text-[9px] text-[#5a6878] mt-1">Late arrival grace period</p>
      </div>

      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">
          Start Time <span className="text-[#ff3d3d]">*</span>
        </label>
        <input
          type="time"
          className={inputCls}
          value={shiftForm.startTime}
          onChange={e => setShiftForm(f => ({ ...f, startTime: e.target.value }))}
        />
      </div>

      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">
          End Time <span className="text-[#ff3d3d]">*</span>
        </label>
        <input
          type="time"
          className={inputCls}
          value={shiftForm.endTime}
          onChange={e => setShiftForm(f => ({ ...f, endTime: e.target.value }))}
        />
      </div>

      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">
          Break Minutes
        </label>
        <input
          type="number"
          className={inputCls}
          value={shiftForm.breakMinutes}
          onChange={e => setShiftForm(f => ({ ...f, breakMinutes: parseInt(e.target.value) || 0 }))}
        />
      </div>

      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">
          OT Threshold (min)
        </label>
        <input
          type="number"
          className={inputCls}
          value={shiftForm.otThresholdMin}
          onChange={e => setShiftForm(f => ({ ...f, otThresholdMin: parseInt(e.target.value) || 0 }))}
        />
        <p className="text-[9px] text-[#5a6878] mt-1">Minimum minutes for OT</p>
      </div>

      <div className="md:col-span-2">
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={shiftForm.crossesMidnight}
            onChange={e => setShiftForm(f => ({ ...f, crossesMidnight: e.target.checked }))}
            className="w-4 h-4 rounded border-[#2e3a48] bg-[#141920] text-[#f5a623] focus:ring-[#f5a623]"
          />
          <span className="text-[11px] text-[#e2e8f0]">Shift crosses midnight (night shift)</span>
        </label>
      </div>

      <div className="md:col-span-2">
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">
          Week Off Days
        </label>
        <div className="flex gap-2 flex-wrap">
          {WEEKDAYS.map((day, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => toggleWeekOffDay(idx)}
              className={`px-3 py-1.5 rounded text-[10px] font-semibold transition-colors ${
                shiftForm.weekOffDays.includes(idx)
                  ? 'bg-[#f5a623] text-black'
                  : 'bg-[#141920] text-[#8899aa] border border-[#2e3a48] hover:border-[#f5a623]'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Clock} label="Total Shifts" value={stats.totalShifts} color="#f5a623" />
        <StatCard icon={Sun} label="Day Shifts" value={stats.dayShifts} color="#00e676" />
        <StatCard icon={Moon} label="Night Shifts" value={stats.nightShifts} color="#a78bfa" />
        <StatCard icon={Users} label="Assignments" value={stats.totalAssignments} color="#00d4ff" />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button 
          className="vc-btn-primary flex items-center gap-1" 
          onClick={() => { setShiftForm(EMPTY_SHIFT_FORM); setCreateShiftOpen(true); }}
        >
          <Plus size={13} /> Create Shift
        </button>
        <button 
          className="vc-btn-ghost flex items-center gap-1 border border-[#2e3a48]" 
          onClick={() => { setSelectedEmployees([]); setBulkShiftId(''); setBulkAssignOpen(true); }}
        >
          <Users size={13} /> Bulk Assign
        </button>
      </div>

      {/* Current Assignments */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Users size={14} className="text-[#00d4ff]" />
          <span className="text-[13px] font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>CURRENT SHIFT ASSIGNMENTS</span>
          <span className="ml-auto text-[10px] text-[#5a6878]">{assignments.length} active assignments</span>
        </div>
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-[#161c24] z-10">
              <tr className="border-b border-[#252e3a]">
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Employee</th>
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Shift</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Timing</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Effective From</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-[#5a6878] text-[11px]">No active shift assignments</td></tr>
              ) : assignments.map(assignment => (
                <tr key={assignment.id} className="border-b border-[#252e3a]/50 hover:bg-[#141920] transition-colors group">
                  <td className="py-2.5 px-3">
                    <div className="text-[#e2e8f0] font-medium">{assignment.Employee.firstName} {assignment.Employee.lastName}</div>
                    <div className="text-[9px] text-[#5a6878] font-mono">{assignment.Employee.employeeCode}</div>
                  </td>
                  <td className="py-2.5 px-3 text-[#e2e8f0]">{assignment.Shift.name}</td>
                  <td className="py-2.5 px-3 text-center text-[#8899aa] font-mono text-[10px]">
                    {assignment.Shift.startTime} - {assignment.Shift.endTime}
                  </td>
                  <td className="py-2.5 px-3 text-center text-[#8899aa] text-[10px]">
                    {new Date(assignment.effectiveFrom).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" 
                        onClick={() => {
                          setSelectedAssignmentId(assignment.id);
                          setDeleteAssignmentOpen(true);
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shifts List */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Clock size={14} className="text-[#f5a623]" />
          <span className="text-[13px] font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>SHIFT DEFINITIONS</span>
          <span className="ml-auto text-[10px] text-[#5a6878]">{shifts.length} shifts</span>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-[#161c24] z-10">
              <tr className="border-b border-[#252e3a]">
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Name</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Type</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Timing</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Grace</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Break</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Week Off</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Status</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shifts.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-[#5a6878] text-[11px]">No shifts defined yet</td></tr>
              ) : shifts.map(shift => (
                <tr key={shift.id} className="border-b border-[#252e3a]/50 hover:bg-[#141920] transition-colors group">
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{shift.name}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`vc-badge ${shift.type === 'fixed' ? 'bg-[#00d4ff]/10 text-[#00d4ff]' : 'bg-[#a78bfa]/10 text-[#a78bfa]'}`}>
                      {shift.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-[#8899aa] font-mono text-[10px]">
                    {shift.startTime} - {shift.endTime}
                    {shift.crossesMidnight && <span className="ml-1 text-[#a78bfa]">🌙</span>}
                  </td>
                  <td className="py-2.5 px-3 text-center text-[#8899aa]">{shift.graceMinutes}m</td>
                  <td className="py-2.5 px-3 text-center text-[#8899aa]">{shift.breakMinutes}m</td>
                  <td className="py-2.5 px-3 text-center text-[#8899aa] text-[9px]">
                    {shift.weekOffDays.map(d => WEEKDAYS[d]).join(', ') || 'None'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`vc-badge ${shift.isActive ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-[#5a6878]/10 text-[#5a6878]'}`}>
                      {shift.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" onClick={() => openEditShift(shift)}>
                        <Pencil size={13} />
                      </button>
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" onClick={() => openDeleteShift(shift.id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Shift Dialog */}
      <Dialog open={createShiftOpen} onOpenChange={setCreateShiftOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl" aria-describedby="create-shift-description">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0] text-base">Create Shift</DialogTitle>
            <p id="create-shift-description" className="text-[11px] text-[#5a6878] mt-1">Define a new shift with timing and rules</p>
          </DialogHeader>
          {shiftFormDialog()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setCreateShiftOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={handleCreateShift}>
              {submitting ? 'Creating...' : 'Create Shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Shift Dialog */}
      <Dialog open={editShiftOpen} onOpenChange={setEditShiftOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl" aria-describedby="edit-shift-description">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0] text-base">Edit Shift</DialogTitle>
            <p id="edit-shift-description" className="text-[11px] text-[#5a6878] mt-1">Update shift details</p>
          </DialogHeader>
          {shiftFormDialog()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setEditShiftOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={handleUpdateShift}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Shift Dialog */}
      <Dialog open={deleteShiftOpen} onOpenChange={setDeleteShiftOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md" aria-describedby="delete-shift-description">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Delete Shift</DialogTitle></DialogHeader>
          <div id="delete-shift-description" className="flex items-start gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-[#ff3d3d]/15 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={20} className="text-[#ff3d3d]" />
            </div>
            <div>
              <p className="text-[13px] text-[#e2e8f0] mb-1">Are you sure you want to delete this shift?</p>
              <p className="text-[11px] text-[#8899aa]">This action cannot be undone.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setDeleteShiftOpen(false)}>Cancel</Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#cc2020] font-semibold" disabled={submitting} onClick={handleDeleteShift}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-3xl" aria-describedby="bulk-assign-description">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0] text-base">Bulk Assign Shift</DialogTitle>
            <p id="bulk-assign-description" className="text-[11px] text-[#5a6878] mt-1">
              Select multiple employees and assign them to a shift
            </p>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">
                  Select Shift <span className="text-[#ff3d3d]">*</span>
                </label>
                <select
                  className={selectCls}
                  value={bulkShiftId}
                  onChange={e => setBulkShiftId(e.target.value)}
                >
                  <option value="">Select shift...</option>
                  {shifts.filter(s => s.isActive).map(shift => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name} ({shift.startTime} - {shift.endTime})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">
                  Effective From <span className="text-[#ff3d3d]">*</span>
                </label>
                <input
                  type="date"
                  className={inputCls}
                  value={bulkEffectiveFrom}
                  onChange={e => setBulkEffectiveFrom(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider">
                  Select Employees <span className="text-[#ff3d3d]">*</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEmployees(employees.map(e => e.id))}
                    className="text-[10px] text-[#00d4ff] hover:text-[#00e8ff] font-semibold"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEmployees([])}
                    className="text-[10px] text-[#ff3d3d] hover:text-[#ff5555] font-semibold"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="bg-[#0f1318] border border-[#2e3a48] rounded-lg p-3 max-h-[300px] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {employees.map(emp => (
                    <label
                      key={emp.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                        selectedEmployees.includes(emp.id)
                          ? 'bg-[#f5a623]/10 border border-[#f5a623]/30'
                          : 'hover:bg-[#141920] border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(emp.id)}
                        onChange={() => toggleEmployeeSelection(emp.id)}
                        className="w-4 h-4 rounded border-[#2e3a48] bg-[#141920] text-[#f5a623] focus:ring-[#f5a623]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-[#e2e8f0] font-medium truncate">
                          {emp.name}
                        </div>
                        <div className="text-[9px] text-[#5a6878] font-mono">{emp.employeeCode}</div>
                      </div>
                    </label>
                  ))}
                </div>
                {employees.length === 0 && (
                  <div className="text-center py-4 text-[#5a6878] text-[11px]">
                    No active employees found. Please add employees first.
                  </div>
                )}
              </div>
              <p className="text-[9px] text-[#5a6878] mt-1">
                {selectedEmployees.length} employee(s) selected
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="ghost" 
              className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" 
              onClick={() => setBulkAssignOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" 
              disabled={submitting || selectedEmployees.length === 0 || !bulkShiftId} 
              onClick={handleBulkAssign}
            >
              {submitting ? 'Assigning...' : `Assign ${selectedEmployees.length} Employee(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Assignment Dialog */}
      <Dialog open={deleteAssignmentOpen} onOpenChange={setDeleteAssignmentOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md" aria-describedby="delete-assignment-description">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Remove Shift Assignment</DialogTitle></DialogHeader>
          <div id="delete-assignment-description" className="flex items-start gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-[#ff3d3d]/15 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={20} className="text-[#ff3d3d]" />
            </div>
            <div>
              <p className="text-[13px] text-[#e2e8f0] mb-1">Are you sure you want to remove this shift assignment?</p>
              <p className="text-[11px] text-[#8899aa]">The employee will no longer be assigned to this shift.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setDeleteAssignmentOpen(false)}>Cancel</Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#cc2020] font-semibold" disabled={submitting} onClick={handleDeleteAssignment}>
              {submitting ? 'Removing...' : 'Remove Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
