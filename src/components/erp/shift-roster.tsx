'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock, Calendar, Plus, Pencil, Trash2, AlertTriangle, Loader2,
  Sun, Moon, Coffee, Users, ArrowRightLeft, RefreshCw
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';
import { FieldError, fieldBorderError } from '@/components/ui/field-error';
import { validateFields, isValid, type FieldErrors } from '@/lib/form-validation';

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
  const [shiftFieldErrors, setShiftFieldErrors] = useState<FieldErrors>({});
  const [bulkFieldErrors, setBulkFieldErrors] = useState<FieldErrors>({});

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

  // Map: employeeId → current active assignment (for UI indicators)
  const currentAssignmentMap = useMemo(() => {
    const map = new Map<number, ShiftAssignment>();
    const now = new Date();
    assignments.forEach(a => {
      if (!a.effectiveTo || new Date(a.effectiveTo) > now) {
        // Keep the most recent one per employee
        const existing = map.get(a.employeeId);
        if (!existing || new Date(a.effectiveFrom) > new Date(existing.effectiveFrom)) {
          map.set(a.employeeId, a);
        }
      }
    });
    return map;
  }, [assignments]);

  // For bulk assign: employees who will be reshuffled (already have a different shift)
  const reshufflePreview = useMemo(() => {
    if (!bulkShiftId) return [];
    return selectedEmployees
      .map(empId => {
        const current = currentAssignmentMap.get(empId);
        if (!current) return null;
        if (current.Shift.id === parseInt(bulkShiftId)) return null; // same shift, no change
        const emp = employees.find(e => e.id === empId);
        return { empId, empName: emp?.name || '', fromShift: current.Shift.name };
      })
      .filter(Boolean) as { empId: number; empName: string; fromShift: string }[];
  }, [selectedEmployees, bulkShiftId, currentAssignmentMap, employees]);

  const handleCreateShift = async () => {
    setSubmitting(true);
    try {
      const errors = validateFields([
        { field: 'name', value: shiftForm.name, label: 'Shift Name' },
        { field: 'startTime', value: shiftForm.startTime, label: 'Start Time' },
        { field: 'endTime', value: shiftForm.endTime, label: 'End Time' },
      ]);
      setShiftFieldErrors(errors);
      if (!isValid(errors)) {
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
        setShiftFieldErrors({});
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
    setShiftFieldErrors({});
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
    const errors: FieldErrors = {};
    if (selectedEmployees.length === 0) errors.employees = 'Please select at least one employee';
    if (!bulkShiftId) errors.bulkShiftId = 'Please select a shift';
    if (!bulkEffectiveFrom) errors.bulkEffectiveFrom = 'Effective From date is required';
    setBulkFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
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
      const jsons = await Promise.all(results.map(r => r.json()));
      const failed = jsons.filter(j => !j.success);

      if (failed.length === 0) {
        const reshuffled = reshufflePreview.length;
        const newAssigned = selectedEmployees.length - reshuffled;
        const parts: string[] = [];
        if (newAssigned > 0) parts.push(`${newAssigned} newly assigned`);
        if (reshuffled > 0) parts.push(`${reshuffled} reshuffled`);
        toast.success(`Shift updated — ${parts.join(', ')}`);
        setBulkAssignOpen(false);
        setSelectedEmployees([]);
        setBulkShiftId('');
        setBulkFieldErrors({});
        await fetchData();
      } else {
        toast.error(`${failed.length} assignment(s) failed. ${failed[0]?.error || ''}`);
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
          className={`${inputCls} ${fieldBorderError(shiftFieldErrors.name)}`}
          value={shiftForm.name}
          onChange={e => { setShiftForm(f => ({ ...f, name: e.target.value })); setShiftFieldErrors(fe => ({ ...fe, name: '' })); }}
          placeholder="e.g., Morning Shift, Night Shift"
        />
        <FieldError message={shiftFieldErrors.name} />
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
        <p className="text-[9px] text-[#5a6878] mt-1">Late arrival grace period — drives Late status unless an Attendance Rule overrides it</p>
      </div>

      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">
          Start Time <span className="text-[#ff3d3d]">*</span>
        </label>
        <input
          type="time"
          className={`${inputCls} ${fieldBorderError(shiftFieldErrors.startTime)}`}
          value={shiftForm.startTime}
          onChange={e => { setShiftForm(f => ({ ...f, startTime: e.target.value })); setShiftFieldErrors(fe => ({ ...fe, startTime: '' })); }}
        />
        <FieldError message={shiftFieldErrors.startTime} />
      </div>

      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">
          End Time <span className="text-[#ff3d3d]">*</span>
        </label>
        <input
          type="time"
          className={`${inputCls} ${fieldBorderError(shiftFieldErrors.endTime)}`}
          value={shiftForm.endTime}
          onChange={e => { setShiftForm(f => ({ ...f, endTime: e.target.value })); setShiftFieldErrors(fe => ({ ...fe, endTime: '' })); }}
        />
        <FieldError message={shiftFieldErrors.endTime} />
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
        <p className="text-[9px] text-[#5a6878] mt-1">Extra minutes beyond shift hours before OT starts counting (0 = count all extra time)</p>
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
          onClick={() => { setShiftForm(EMPTY_SHIFT_FORM); setShiftFieldErrors({}); setCreateShiftOpen(true); }}
        >
          <Plus size={13} /> Create Shift
        </button>
        <button 
          className="vc-btn-ghost flex items-center gap-1 border border-[#2e3a48]" 
          onClick={() => { setSelectedEmployees([]); setBulkShiftId(''); setBulkFieldErrors({}); setBulkAssignOpen(true); }}
        >
          <ArrowRightLeft size={13} /> Assign / Reshuffle
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
              ) : assignments.map(assignment => {
                const effectiveDate = new Date(assignment.effectiveFrom);
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const isRecent = effectiveDate >= today; // assigned today or future = reshuffle/new
                return (
                <tr key={assignment.id} className="border-b border-[#252e3a]/50 hover:bg-[#141920] transition-colors group">
                  <td className="py-2.5 px-3">
                    <div className="text-[#e2e8f0] font-medium">{assignment.Employee.firstName} {assignment.Employee.lastName}</div>
                    <div className="text-[9px] text-[#5a6878] font-mono">{assignment.Employee.employeeCode}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#e2e8f0]">{assignment.Shift.name}</span>
                      {isRecent && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#f5a623]/15 text-[#f5a623] border border-[#f5a623]/20">
                          <RefreshCw size={8} /> {effectiveDate.toDateString() === today.toDateString() ? 'Today' : 'Upcoming'}
                        </span>
                      )}
                    </div>
                  </td>
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
                );
              })}
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
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => { setCreateShiftOpen(false); setShiftFieldErrors({}); }}>Cancel</Button>
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
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => { setEditShiftOpen(false); setShiftFieldErrors({}); }}>Cancel</Button>
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
            <DialogTitle className="text-[#e2e8f0] text-base flex items-center gap-2">
              <ArrowRightLeft size={15} className="text-[#f5a623]" /> Assign / Reshuffle Shifts
            </DialogTitle>
            <p id="bulk-assign-description" className="text-[11px] text-[#5a6878] mt-1">
              Select employees and a target shift. Employees already on a different shift will be automatically moved.
            </p>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">
                  Target Shift <span className="text-[#ff3d3d]">*</span>
                </label>
                <select
                  className={`${selectCls} ${fieldBorderError(bulkFieldErrors.bulkShiftId)}`}
                  value={bulkShiftId}
                  onChange={e => { setBulkShiftId(e.target.value); setBulkFieldErrors(fe => ({ ...fe, bulkShiftId: '' })); }}
                >
                  <option value="">Select shift...</option>
                  {shifts.filter(s => s.isActive).map(shift => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name} ({shift.startTime} - {shift.endTime})
                    </option>
                  ))}
                </select>
                <FieldError message={bulkFieldErrors.bulkShiftId} />
              </div>
              <div>
                <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">
                  Effective From <span className="text-[#ff3d3d]">*</span>
                </label>
                <input
                  type="date"
                  className={`${inputCls} ${fieldBorderError(bulkFieldErrors.bulkEffectiveFrom)}`}
                  value={bulkEffectiveFrom}
                  onChange={e => { setBulkEffectiveFrom(e.target.value); setBulkFieldErrors(fe => ({ ...fe, bulkEffectiveFrom: '' })); }}
                />
                <FieldError message={bulkFieldErrors.bulkEffectiveFrom} />
              </div>
            </div>

            {/* Reshuffle preview — shown when some selected employees already have a different shift */}
            {reshufflePreview.length > 0 && bulkShiftId && (
              <div className="rounded-lg border border-[#f5a623]/30 bg-[#f5a623]/5 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <ArrowRightLeft size={12} className="text-[#f5a623]" />
                  <span className="text-[10px] font-bold text-[#f5a623] uppercase tracking-wider">
                    {reshufflePreview.length} employee{reshufflePreview.length !== 1 ? 's' : ''} will be reshuffled
                  </span>
                </div>
                <div className="space-y-1 max-h-[100px] overflow-y-auto">
                  {reshufflePreview.map(r => (
                    <div key={r.empId} className="flex items-center gap-2 text-[10px]">
                      <span className="text-[#e2e8f0] font-medium min-w-[120px] truncate">{r.empName}</span>
                      <span className="text-[#8899aa] bg-[#1a2332] px-1.5 py-0.5 rounded font-mono">{r.fromShift}</span>
                      <ArrowRightLeft size={9} className="text-[#f5a623] shrink-0" />
                      <span className="text-[#f5a623] font-semibold">
                        {shifts.find(s => s.id === parseInt(bulkShiftId))?.name || ''}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-[#8899aa] mt-2">Their previous assignment will be ended automatically.</p>
              </div>
            )}

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
                  {employees.map(emp => {
                    const current = currentAssignmentMap.get(emp.id);
                    const isSelected = selectedEmployees.includes(emp.id);
                    const willReshuffle = isSelected && current && bulkShiftId && current.Shift.id !== parseInt(bulkShiftId);
                    const isSameShift = isSelected && current && bulkShiftId && current.Shift.id === parseInt(bulkShiftId);
                    return (
                      <label
                        key={emp.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          isSelected
                            ? willReshuffle
                              ? 'bg-[#f5a623]/10 border border-[#f5a623]/40'
                              : isSameShift
                              ? 'bg-[#5a6878]/10 border border-[#5a6878]/30'
                              : 'bg-[#00e676]/8 border border-[#00e676]/20'
                            : 'hover:bg-[#141920] border border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleEmployeeSelection(emp.id)}
                          className="w-4 h-4 rounded border-[#2e3a48] bg-[#141920] text-[#f5a623] focus:ring-[#f5a623] shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-[#e2e8f0] font-medium truncate">{emp.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] text-[#5a6878] font-mono">{emp.employeeCode}</span>
                            {current ? (
                              <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${
                                willReshuffle
                                  ? 'bg-[#f5a623]/20 text-[#f5a623]'
                                  : 'bg-[#00d4ff]/15 text-[#00d4ff]'
                              }`}>
                                {willReshuffle && <ArrowRightLeft size={7} className="inline mr-0.5" />}
                                {current.Shift.name}
                              </span>
                            ) : (
                              <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-[#5a6878]/15 text-[#5a6878]">
                                Unassigned
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {employees.length === 0 && (
                  <div className="text-center py-4 text-[#5a6878] text-[11px]">
                    No active employees found. Please add employees first.
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[9px] text-[#5a6878]">{selectedEmployees.length} selected</span>
                {reshufflePreview.length > 0 && (
                  <span className="text-[9px] text-[#f5a623] font-semibold flex items-center gap-1">
                    <ArrowRightLeft size={8} /> {reshufflePreview.length} reshuffle{reshufflePreview.length !== 1 ? 's' : ''}
                  </span>
                )}
                {selectedEmployees.length - reshufflePreview.length > 0 && (
                  <span className="text-[9px] text-[#00e676] font-semibold">
                    {selectedEmployees.length - reshufflePreview.length} new assignment{selectedEmployees.length - reshufflePreview.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <FieldError message={bulkFieldErrors.employees} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="ghost" 
              className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" 
              onClick={() => { setBulkAssignOpen(false); setBulkFieldErrors({}); }}
            >
              Cancel
            </Button>
            <Button 
              className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" 
              disabled={submitting || selectedEmployees.length === 0 || !bulkShiftId} 
              onClick={handleBulkAssign}
            >
              {submitting ? 'Applying...' : reshufflePreview.length > 0
                ? `Apply (${reshufflePreview.length} reshuffle${reshufflePreview.length !== 1 ? 's' : ''}, ${selectedEmployees.length - reshufflePreview.length} new)`
                : `Assign ${selectedEmployees.length} Employee${selectedEmployees.length !== 1 ? 's' : ''}`}
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
