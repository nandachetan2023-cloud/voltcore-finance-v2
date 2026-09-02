'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Users, UserX, CalendarOff, Clock, Plus, Pencil, Trash2,
  AlertTriangle, Loader2, Search, Info, X, ChevronDown
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';
import { calculateAttendanceStatus, getDisplayStatus, isFutureDate, isToday } from '@/lib/attendance-utils';

interface EmployeeInfo { id: string; empId: string; name: string; shiftId?: number; site?: string; isActive?: boolean; }

interface ShiftInfo {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  crossesMidnight: boolean;
}

interface AttendanceRecord {
  id: string;
  empId: string;
  site: string;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  otHours: number;
  shift: string | null;
  status: string;
  employee: EmployeeInfo;
  shiftInfo?: ShiftInfo;
}

interface AttendanceFormData {
  empId: string;
  site: string;
  date: string;
  timeIn: string;
  timeOut: string;
  otHours: number;
  shift: string;
  status: string;
}

const STATUSES = ['Present', 'Absent', 'Late', 'On Leave', 'Half Day'];

// Maps the backend's canonical status strings to the UI labels. Anything not
// listed falls back to 'Present' (a punched-in record with an unknown status).
const STATUS_LABELS: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  half_day: 'Half Day',
  on_leave: 'On Leave',
  leave: 'On Leave',
};

// Statuses that mean the employee physically worked/attended that day.
const WORKED_STATUSES = new Set(['Present', 'Late', 'Half Day']);

// Gross paid minutes of a shift ("HH:MM" start/end), net of the unpaid break.
// Handles shifts that cross midnight (end <= start). Returns null if unknown.
function shiftGrossMinutes(
  startTime?: string | null,
  endTime?: string | null,
  crossesMidnight?: boolean | null,
  breakMinutes?: number | null,
): number | null {
  if (!startTime || !endTime) return null;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if ([sh, sm, eh, em].some(n => Number.isNaN(n))) return null;
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0 || crossesMidnight) mins += 24 * 60; // wrap past midnight
  return Math.max(0, mins - (Number(breakMinutes) || 0));
}

const emptyForm: AttendanceFormData = {
  empId: '', site: '', date: '', timeIn: '', timeOut: '', otHours: 0, shift: '', status: 'Present',
};

const statusColor = (record: AttendanceRecord) => {
  // Use intelligent status calculation
  const displayStatus = getDisplayStatus({
    date: record.date,
    punchIn: record.timeIn ? `${record.date}T${record.timeIn}:00` : null,
    punchOut: record.timeOut ? `${record.date}T${record.timeOut}:00` : null,
    status: record.status,
    shiftTiming: record.shiftInfo ? {
      startTime: record.shiftInfo.startTime,
      endTime: record.shiftInfo.endTime,
      graceMinutes: record.shiftInfo.graceMinutes,
      crossesMidnight: record.shiftInfo.crossesMidnight,
    } : undefined,
  });
  
  return displayStatus.color;
};

const getStatusLabel = (record: AttendanceRecord) => {
  const displayStatus = getDisplayStatus({
    date: record.date,
    punchIn: record.timeIn ? `${record.date}T${record.timeIn}:00` : null,
    punchOut: record.timeOut ? `${record.date}T${record.timeOut}:00` : null,
    status: record.status,
    shiftTiming: record.shiftInfo ? {
      startTime: record.shiftInfo.startTime,
      endTime: record.shiftInfo.endTime,
      graceMinutes: record.shiftInfo.graceMinutes,
      crossesMidnight: record.shiftInfo.crossesMidnight,
    } : undefined,
  });
  
  return displayStatus.label;
};

const shiftColor = (s: string) => {
  switch (s) {
    case 'Day A': return 'bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30';
    case 'Day B': return 'bg-[#f5a623]/15 text-[#f5a623] border border-[#f5a623]/30';
    case 'Night B': return 'bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30';
    default: return 'bg-[#8899aa]/15 text-[#8899aa] border border-[#8899aa]/30';
  }
};

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number | string; color: string;
}) {
  return (
    <div className="vc-stat-card">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] text-[#5a6878] font-semibold uppercase tracking-wider mb-1">{label}</div>
          <div className="text-[28px] font-bold leading-none" style={{ fontFamily: "'Share Tech Mono', monospace", color }}>{value}</div>
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623]";
const selectCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623] appearance-none cursor-pointer";

/* ------------------------------------------------------------------ */
/*  Searchable Employee Select                                         */
/* ------------------------------------------------------------------ */

function EmployeeSearchSelect({
  employees,
  value,
  onChange,
}: {
  employees: EmployeeInfo[]
  value: string
  onChange: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = employees.find(e => e.id === value)

  const filtered = useMemo(() => {
    if (!query.trim()) return employees
    const q = query.toLowerCase()
    return employees.filter(e =>
      e.empId.toLowerCase().includes(q) ||
      e.name.toLowerCase().includes(q)
    )
  }, [employees, query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (emp: EmployeeInfo) => {
    onChange(emp.id)
    setQuery('')
    setOpen(false)
  }

  const handleClear = () => {
    onChange('')
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={selectCls + ' flex items-center gap-2 cursor-text !py-[7px]'}
        onClick={() => setOpen(true)}
      >
        <Search size={12} className="text-[#5a6878] shrink-0" />
        {open ? (
          <input
            autoFocus
            className="flex-1 bg-transparent outline-none text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878]"
            placeholder="Search by name or code..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        ) : (
          <span className={`flex-1 text-[12px] truncate ${selected ? 'text-[#e2e8f0]' : 'text-[#5a6878]'}`}>
            {selected ? `${selected.name} (${selected.empId})` : 'Select employee'}
          </span>
        )}
        {selected && !open && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); handleClear() }}
            className="text-[#5a6878] hover:text-[#ff3d3d] transition-colors shrink-0"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0d1117] border border-[#2e3a48] rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-[10px] text-[#5a6878]">
              No employees found
            </div>
          ) : (
            filtered.map(emp => (
              <button
                key={emp.id}
                type="button"
                onClick={() => handleSelect(emp)}
                className={`w-full text-left px-3 py-2 text-[11px] hover:bg-[#141920] transition-colors border-b border-[#1e252e] last:border-0 ${value === emp.id ? 'bg-[#f5a623]/10 text-[#f5a623]' : 'text-[#e2e8f0]'}`}
              >
                <span className="font-semibold" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {emp.empId}
                </span>
                <span className="text-[#8899aa] mx-1">–</span>
                {emp.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function AttendanceModule() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split('T')[0]);
  const [dateRangeMode, setDateRangeMode] = useState(false);
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeList, setEmployeeList] = useState<EmployeeInfo[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<AttendanceFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [shifts, setShifts] = useState<{ id: number; name: string; startTime: string; endTime: string }[]>([]);
  const [biometricSites, setBiometricSites] = useState<{ id: number; siteId: string; siteName: string }[]>([]);
  const [customSiteMode, setCustomSiteMode] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  const fetchData = useCallback(async () => {
    try {
      // Push the active date filter to the server so it returns the whole window
      // being viewed. Without this the API caps at the 100 most-recent rows, so
      // older months (e.g. May) never reach the client on data-heavy servers.
      const params = new URLSearchParams({ limit: '100000' });
      if (dateRangeMode) {
        if (fromDate) params.set('from', fromDate);
        if (toDate) params.set('to', toDate);
      } else if (dateFilter) {
        params.set('date', dateFilter);
      }
      const res = await fetch(`/api/attendance?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch attendance');
      const json = await res.json();
      if (json.success) {
        // Map API response to component format
        const mappedRecords = json.data.map((record: any) => {
          const punchIn = record.punchIn ? new Date(record.punchIn) : null;
          const punchOut = record.punchOut ? new Date(record.punchOut) : null;

          // Overtime = worked time beyond the assigned shift's paid duration,
          // NOT a flat "hours − 8" (that invented OT for any shift ≠ 8h and
          // ignored breaks). Worked minutes come from the punch timestamps
          // (absolute instants, so cross-midnight is handled correctly); the
          // shift's gross paid minutes and OT threshold come from the record.
          let otHours = 0;
          if (punchIn && punchOut) {
            // Elapsed clock time between punches. Employees don't punch out for
            // their break, so this span INCLUDES the break — compare it against
            // the shift's full in→out span (break included), not the paid net.
            const workedMin = (punchOut.getTime() - punchIn.getTime()) / 60000;
            const shiftSpanMin = shiftGrossMinutes(
              record.shiftStartTime, record.shiftEndTime,
              record.shiftCrossesMidnight, 0
            );
            // No shift info → fall back to an 8h (480 min) baseline.
            const baseline = shiftSpanMin ?? 480;
            const thresholdMin = Number(record.shiftOtThresholdMin) || 0;
            const overMin = workedMin - baseline;
            otHours = overMin > thresholdMin ? Math.max(0, overMin) / 60 : 0;
          }
          
          return {
            id: record.id.toString(),
            empId: record.employee?.employeeCode || record.employeeId?.toString() || '',
            site: record.siteName || record.biometricDeviceId || 'N/A',
            date: new Date(record.logDate).toISOString().split('T')[0],
            timeIn: punchIn ? punchIn.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : null,
            timeOut: punchOut ? punchOut.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : null,
            otHours: Math.round(otHours * 10) / 10, // Round to 1 decimal
            shift: record.shiftName || null,
            // Preserve the real classification instead of collapsing everything
            // that isn't 'present'/'absent' into 'Present' (which hid Late,
            // Half Day and On Leave and broke the stat counts).
            status: STATUS_LABELS[String(record.status)] || 'Present',
            employee: {
              id: record.employeeId?.toString() || '',
              empId: record.Employee?.employeeCode || '',
              name: record.Employee ? `${record.Employee.firstName} ${record.Employee.lastName}` : 'Unknown',
            },
          };
        });
        setRecords(mappedRecords);
      }
      else throw new Error(json.error || 'Unknown error');
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong'); }
    finally { setLoading(false); }
  }, [dateRangeMode, dateFilter, fromDate, toDate]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      const json = await res.json();
      if (json.success) {
        const mappedEmployees = json.data.map((e: any) => ({
          id: e.id.toString(),
          empId: e.employeeCode,
          name: `${e.firstName} ${e.lastName}`,
          site: e.Branch?.name || undefined,
          isActive: e.isActive !== false,
        }));
        setEmployeeList(mappedEmployees);
      }
    } catch { /* silent */ }
  }, []);

  const fetchShifts = useCallback(async () => {
    try {
      const res = await fetch('/api/shifts');
      const json = await res.json();
      if (json.success) setShifts(json.data);
    } catch { /* silent */ }
  }, []);

  const fetchBiometricSites = useCallback(async () => {
    try {
      const res = await fetch('/api/biometric/sites-list');
      const json = await res.json();
      if (json.success) setBiometricSites(json.data);
    } catch { /* silent — biometric sites are optional */ }
  }, []);

  // When employee changes in the form, auto-populate their active shift assignment
  const handleEmployeeChange = useCallback(async (empId: string) => {
    setForm(f => ({ ...f, empId, shift: '' }));
    if (!empId) return;
    try {
      // Find the employee's numeric ID from the list
      const emp = employeeList.find(e => e.empId === empId);
      if (!emp) return;
      const res = await fetch(`/api/shift-assignments?employeeId=${emp.id}&active=true`);
      const json = await res.json();
      if (json.success && json.data?.length > 0) {
        const activeAssignment = json.data[0];
        const shiftName = activeAssignment.Shift?.name || activeAssignment.shift?.name || '';
        if (shiftName) setForm(f => ({ ...f, shift: shiftName }));
      }
    } catch { /* silent — shift stays blank */ }
  }, [employeeList]);

  useEffect(() => { fetchData(); fetchEmployees(); fetchShifts(); fetchBiometricSites(); }, [fetchData, fetchEmployees, fetchShifts, fetchBiometricSites]);

  const filteredRecords = useMemo(() => {
    // 1) Narrow the real attendance records to the selected date window.
    let dated = records;
    if (dateRangeMode) {
      dated = dated.filter(r => r.date >= fromDate && r.date <= toDate);
    } else if (dateFilter) {
      dated = dated.filter(r => r.date === dateFilter);
    }

    // 2) In SINGLE-date mode, append a synthesized row for every active
    //    employee who has NO record that day — 'Absent' for a past/today date
    //    (they didn't punch in) or 'pending' for a future date (not due yet).
    //    Absent members are listed AFTER the ones who have records, so they can
    //    be seen, filtered and exported. Absent has no biometric row of its own,
    //    so this is the only place they can surface.
    let combined = dated;
    if (!dateRangeMode && dateFilter) {
      const haveRecord = new Set(dated.map(r => r.employee.id));
      const future = isFutureDate(dateFilter);
      // Future date → 'pending' (not due yet). Today or a past date with no
      // record → 'Absent' so they list after the present rows and the "Absent"
      // status filter/stat can surface them. (For today the row badge still
      // shows "—" via getDisplayStatus, since the day isn't over — the 'Absent'
      // value drives filtering/counting, not the visible badge.)
      const syntheticStatus = future ? 'pending' : 'Absent';
      const synthetic = employeeList
        .filter(emp => emp.isActive !== false && !haveRecord.has(emp.id))
        .map(emp => ({
          id: `${future ? 'pending' : 'absent'}-${emp.id}-${dateFilter}`,
          empId: emp.empId,
          site: emp.site || '—',
          date: dateFilter,
          timeIn: null,
          timeOut: null,
          otHours: 0,
          shift: null,
          status: syntheticStatus,
          employee: emp,
        }) as AttendanceRecord);
      combined = [...dated, ...synthetic]; // present first, absent/pending after
    }

    let filtered = combined;

    // Search by name or employee code
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.employee.name.toLowerCase().includes(q) ||
        r.employee.empId.toLowerCase().includes(q) ||
        (r.empId || '').toLowerCase().includes(q)
      );
    }

    // Site / branch filter
    if (siteFilter !== 'all') {
      filtered = filtered.filter(r => r.site === siteFilter);
    }

    // Status filter — runs AFTER synthetic absent rows are added, so selecting
    // "Absent" returns the no-record employees (not the present ones). A record
    // that has a punch-in but was rule-stamped 'Absent' (arrived past the
    // absent-after cutoff) is treated as 'Present' here, so the filter stays
    // consistent with the row badge and the Present/Absent stat counts.
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => {
        const effective = (r.status === 'Absent' && r.timeIn) ? 'Present' : r.status;
        return effective.toLowerCase() === statusFilter.toLowerCase();
      });
    }

    return filtered;
  }, [records, dateFilter, dateRangeMode, fromDate, toDate, search, siteFilter, statusFilter, employeeList]);

  // Calculate statistics
  const stats = useMemo(() => {
    // A physical punch-in means the person showed up. The attendance-rule engine
    // can stamp a punched-in record 'absent' (arrived past the absent-after
    // cutoff), but for the headcount they still attended, so anyone with a
    // timeIn counts as present — matching the row badge, which also never shows
    // Absent for a punched-in record. On Leave / Half Day are their own buckets.
    const hasPunchIn = (r: AttendanceRecord) => Boolean(r.timeIn);

    // Present = anyone who physically attended: has a punch-in, OR carries a
    // worked status (present/late/half-day) even without a parsed timeIn.
    const presentToday = filteredRecords.filter(
      r => (hasPunchIn(r) || WORKED_STATUSES.has(r.status)) && r.status !== 'On Leave'
    ).length;
    const onLeave = filteredRecords.filter(r => r.status === 'On Leave').length;

    // OT workers: records carrying overtime hours (computed server-side against
    // the shift). Falls back to the record's otHours field.
    const otWorkers = filteredRecords.filter(r => Number(r.otHours) > 0).length;

    // Absent is only meaningful for a single (non-future) day. Count 'Absent'
    // rows — the synthetic no-record employees plus any rule-engine 'absent' —
    // but exclude anyone who actually punched in (they're counted as present
    // above, so counting them here too would double-count and mislead).
    let absent = -1;
    if (!dateRangeMode && dateFilter && !isFutureDate(dateFilter)) {
      absent = filteredRecords.filter(r => r.status === 'Absent' && !hasPunchIn(r)).length;
    }

    return { presentToday, absent, onLeave, otWorkers };
  }, [filteredRecords, dateFilter, dateRangeMode]);

  // Dynamic filter options derived from loaded records
  const siteOptions = useMemo(() =>
    [...new Set(records.map(r => r.site).filter(s => s && s !== 'N/A' && s !== '—'))].sort(),
  [records]);

  const statusOptions = ['Present', 'Absent', 'Late', 'On Leave', 'Half Day'];

  const { presentToday, absent, onLeave, otWorkers } = stats;

  const openCreate = () => { 
    setForm({ ...emptyForm, date: dateFilter || new Date().toISOString().split('T')[0] }); 
    setCustomSiteMode(false);
    setCreateOpen(true); 
  };
  const openEdit = (r: AttendanceRecord) => {
    const formData = { 
      empId: r.employee.id, 
      site: r.site, 
      date: r.date, 
      timeIn: r.timeIn || '', 
      timeOut: r.timeOut || '', 
      otHours: r.otHours, 
      shift: r.shift || 'General', 
      status: r.status 
    };
    setForm(formData);
    setSelectedId(r.id);
    // Check if the site value matches any biometric site
    const matchesBiometricSite = biometricSites.some(site => site.siteId === r.site);
    setCustomSiteMode(!matchesBiometricSite);
    setEditOpen(true);
  };
  const openDelete = (id: string) => { setSelectedId(id); setDeleteOpen(true); };

  const handleSubmit = async (mode: 'create' | 'edit') => {
    setSubmitting(true);
    try {
      // Validate required fields
      const errors: string[] = [];
      
      if (!form.empId) errors.push('Employee is required');
      if (!form.date) errors.push('Date is required');
      if (!form.status) errors.push('Status is required');
      
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

      // Check if date is a holiday (only for create mode)
      if (mode === 'create') {
        const holidayCheckRes = await fetch(`/api/holidays/check?date=${form.date}`);
        const holidayCheck = await holidayCheckRes.json();
        
        if (holidayCheck.success && holidayCheck.data.isHoliday) {
          // Show warning but allow creation (for employees working on holidays)
          toast(
            <div>
              <div className="font-semibold mb-1 text-[#ffab40]">⚠️ Holiday Work Detected</div>
              <div className="text-xs">{holidayCheck.data.holiday.name} - {form.date}</div>
              <div className="text-xs mt-1 text-[#8899aa]">All hours will be counted as overtime</div>
            </div>,
            { duration: 5000 }
          );
        }
      }

      // Validate time logic
      if (form.timeIn && form.timeOut) {
        const timeIn = new Date(`2000-01-01 ${form.timeIn}`);
        const timeOut = new Date(`2000-01-01 ${form.timeOut}`);
        
        if (timeOut <= timeIn) {
          toast.error('Time Out must be after Time In');
          setSubmitting(false);
          return;
        }
      }

      // Prepare API payload
      const apiPayload: any = {
        employeeId: parseInt(form.empId),
        logDate: form.date,
        status: form.status.toLowerCase().replace(' ', '_'),
      };

      // Add times if provided
      if (form.timeIn) {
        apiPayload.punchIn = `${form.date}T${form.timeIn}:00`;
      }
      if (form.timeOut) {
        apiPayload.punchOut = `${form.date}T${form.timeOut}:00`;
      }

      const body = mode === 'edit' ? { id: parseInt(selectedId || '0'), ...apiPayload } : apiPayload;
      
      const res = await fetch('/api/attendance', { 
        method: mode === 'create' ? 'POST' : 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body) 
      });
      
      const json = await res.json();
      
      if (json.success) {
        const empName = employeeList.find(e => e.id === form.empId)?.name || 'Employee';
        toast.success(
          <div>
            <div className="font-semibold">{mode === 'create' ? 'Attendance Created!' : 'Attendance Updated!'}</div>
            <div className="text-xs mt-1">{empName} - {form.date}</div>
          </div>,
          { duration: 3000 }
        );
        if (mode === 'create') setCreateOpen(false); else setEditOpen(false);
        setForm(emptyForm);
        await fetchData(); // Wait for data to refresh
      } else {
        // Check if error is due to holiday
        if (json.holiday) {
          toast.error(
            <div>
              <div className="font-semibold mb-1">Cannot Create Attendance on Holiday</div>
              <div className="text-xs">{json.holiday.name} - {json.holiday.date}</div>
            </div>,
            { duration: 6000 }
          );
        } else {
          toast.error(
            <div>
              <div className="font-semibold mb-1">Failed to {mode} attendance</div>
              <div className="text-xs">{json.error || 'Unknown error occurred'}</div>
            </div>,
            { duration: 5000 }
          );
        }
      }
    } catch (error) {
      toast.error(
        <div>
          <div className="font-semibold mb-1">System Error</div>
          <div className="text-xs">{error instanceof Error ? error.message : 'Failed to process request'}</div>
        </div>,
        { duration: 5000 }
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/attendance', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedId }) });
      const json = await res.json();
      if (json.success) { toast.success('Attendance record deleted'); setDeleteOpen(false); fetchData(); }
      else { toast.error(json.error || 'Failed to delete'); }
    } catch { toast.error('Failed to delete'); }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="vc-stat-card"><Skeleton className="h-3 w-24 mb-2 bg-[#1e2630]" /><Skeleton className="h-8 w-16 bg-[#1e2630]" /></div>)}
        </div>
        <div className="vc-panel"><Skeleton className="h-64 w-full bg-[#1e2630]" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle size={40} className="text-[#ff3d3d]" />
        <p className="text-[#8899aa] text-sm">{error}</p>
        <button className="vc-btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const dialogContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">
          Employee <span className="text-[#ff3d3d]">*</span>
        </label>
        <EmployeeSearchSelect
          employees={employeeList}
          value={form.empId}
          onChange={handleEmployeeChange}
        />
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">
          Date <span className="text-[#ff3d3d]">*</span>
        </label>
        <input className={inputCls} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
      </div>
      <div>
        <label className="block text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">
          Status <span className="text-[#ff3d3d]">*</span>
        </label>
        <select className={selectCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Site</label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCustomSiteMode(false)}
              className={`flex-1 px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors ${
                !customSiteMode
                  ? 'bg-[#f5a623] text-black'
                  : 'bg-[#141920] text-[#8899aa] border border-[#2e3a48] hover:border-[#f5a623]'
              }`}
            >
              Select Site
            </button>
            <button
              type="button"
              onClick={() => setCustomSiteMode(true)}
              className={`flex-1 px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors ${
                customSiteMode
                  ? 'bg-[#f5a623] text-black'
                  : 'bg-[#141920] text-[#8899aa] border border-[#2e3a48] hover:border-[#f5a623]'
              }`}
            >
              Custom Value
            </button>
          </div>
          {!customSiteMode ? (
            <>
              <select 
                className={selectCls} 
                value={form.site} 
                onChange={e => setForm(f => ({ ...f, site: e.target.value }))}
                disabled={biometricSites.length === 0}
              >
                <option value="">
                  {biometricSites.length === 0 ? 'No biometric sites configured' : 'Select biometric site'}
                </option>
                {biometricSites.map(site => (
                  <option key={site.id} value={site.siteId}>
                    {site.siteName} ({site.siteId})
                  </option>
                ))}
              </select>
              {biometricSites.length === 0 && (
                <div className="bg-[#ffab40]/10 border border-[#ffab40]/30 rounded-md p-2 flex items-start gap-2">
                  <Info size={14} className="text-[#ffab40] mt-0.5 shrink-0" />
                  <div className="text-[9px] text-[#ffab40]">
                    No biometric sites found. Configure sites in <span className="font-semibold">Biometric Settings</span> or use Custom Value mode.
                  </div>
                </div>
              )}
            </>
          ) : (
            <input 
              className={inputCls} 
              value={form.site} 
              onChange={e => setForm(f => ({ ...f, site: e.target.value }))} 
              placeholder="Enter custom site name" 
            />
          )}
          <p className="text-[9px] text-[#5a6878]">
            {!customSiteMode 
              ? biometricSites.length > 0 
                ? `${biometricSites.length} biometric site(s) available. Switch to custom for manual entry.`
                : 'Switch to Custom Value to enter a site manually.'
              : 'Enter any custom site identifier'
            }
          </p>
        </div>
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Time In</label>
        <input className={inputCls} type="time" value={form.timeIn} onChange={e => setForm(f => ({ ...f, timeIn: e.target.value }))} />
        <p className="text-[9px] text-[#5a6878] mt-1">Optional: Leave empty if not applicable</p>
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Time Out</label>
        <input className={inputCls} type="time" value={form.timeOut} onChange={e => setForm(f => ({ ...f, timeOut: e.target.value }))} />
        <p className="text-[9px] text-[#5a6878] mt-1">Optional: Leave empty if not applicable</p>
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">OT Hours</label>
        <input className={inputCls} type="number" step="0.5" value={form.otHours} onChange={e => setForm(f => ({ ...f, otHours: parseFloat(e.target.value) || 0 }))} />
        <p className="text-[9px] text-[#5a6878] mt-1">Auto-calculated from time in/out</p>
      </div>
      <div>
        <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">Shift</label>
        <select className={selectCls} value={form.shift} onChange={e => setForm(f => ({ ...f, shift: e.target.value }))}>
          <option value="">Select shift</option>
          {shifts.map(s => (
            <option key={s.id} value={s.name}>
              {s.name}{s.startTime && s.endTime ? ` (${s.startTime}–${s.endTime})` : ''}
            </option>
          ))}
        </select>
        {form.empId && form.shift && (
          <p className="text-[9px] text-[#00e676] mt-1">Auto-filled from shift assignment</p>
        )}
        {form.empId && !form.shift && shifts.length > 0 && (
          <p className="text-[9px] text-[#ffab40] mt-1">No active shift assignment found</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Present" value={presentToday} color="#00e676" />
        <StatCard icon={UserX} label="Absent" value={absent < 0 ? '—' : absent} color="#ff3d3d" />
        <StatCard icon={CalendarOff} label="On Leave" value={onLeave} color="#ffab40" />
        <StatCard icon={Clock} label="OT Workers" value={otWorkers} color="#00d4ff" />
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header">
          <Clock size={14} className="text-[#f5a623]" />
          <span className="text-[13px] font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>ATTENDANCE LOG</span>
          <div className="ml-auto flex items-center gap-2">
            {/* Date filter mode toggle */}
            <div className="flex items-center gap-1 bg-[#141920] border border-[#2e3a48] rounded-md p-0.5">
              <button
                onClick={() => setDateRangeMode(false)}
                className={`px-2.5 py-1 rounded text-[9px] font-semibold uppercase tracking-wide transition-all ${
                  !dateRangeMode
                    ? 'bg-[#f5a623] text-black'
                    : 'text-[#8899aa] hover:text-[#e2e8f0]'
                }`}
              >
                Single Date
              </button>
              <button
                onClick={() => setDateRangeMode(true)}
                className={`px-2.5 py-1 rounded text-[9px] font-semibold uppercase tracking-wide transition-all ${
                  dateRangeMode
                    ? 'bg-[#f5a623] text-black'
                    : 'text-[#8899aa] hover:text-[#e2e8f0]'
                }`}
              >
                Date Range
              </button>
            </div>
            
            {/* Date inputs */}
            {dateRangeMode ? (
              <div className="flex items-center gap-2 bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-1">
                <span className="text-[10px] text-[#5a6878]">From:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="bg-transparent border-none text-[#e2e8f0] outline-none text-[11px] w-[110px]"
                />
                <span className="text-[10px] text-[#5a6878]">To:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="bg-transparent border-none text-[#e2e8f0] outline-none text-[11px] w-[110px]"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-1">
                <span className="text-[10px] text-[#5a6878]">Date:</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="bg-transparent border-none text-[#e2e8f0] outline-none text-[11px]"
                />
              </div>
            )}
            
            <span className="text-[10px] text-[#5a6878]">{filteredRecords.length} records</span>
          </div>
          <button className="vc-btn-primary ml-2 flex items-center gap-1" onClick={openCreate}><Plus size={13} /> New Record</button>
        </div>
        {/* ── Search & filter toolbar ── */}
        <div className="px-4 py-3 border-b border-[#252e3a] flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-[#141920] border border-[#2e3a48] rounded-lg px-3 py-[6px] flex-1 min-w-[180px] max-w-[320px]">
            <Search size={13} className="text-[#5a6878] shrink-0" />
            <input
              type="text"
              placeholder="Search by name or emp ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none text-[#e2e8f0] outline-none text-[12px] w-full placeholder:text-[#5a6878]"
            />
            {search && <button onClick={() => setSearch('')} className="text-[#5a6878] hover:text-[#e2e8f0]"><X size={12} /></button>}
          </div>
          {[
            { value: siteFilter,   set: setSiteFilter,   label: 'All Sites',   options: siteOptions },
            { value: statusFilter, set: setStatusFilter, label: 'All Status',  options: statusOptions },
          ].map((f, i) => (
            <div key={i} className="relative">
              <select
                value={f.value}
                onChange={e => f.set(e.target.value)}
                className="vc-input appearance-none pr-7 min-w-[130px] cursor-pointer text-[12px]"
              >
                <option value="all">{f.label}</option>
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5a6878] pointer-events-none" />
            </div>
          ))}
          {(search || siteFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setSiteFilter('all'); setStatusFilter('all'); }}
              className="text-[10px] text-[#5a6878] hover:text-[#ff3d3d] transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-[#161c24] z-10">
              <tr className="border-b border-[#252e3a]">
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">Date</th>
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">Emp ID</th>
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">Employee</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">Site</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">Time In</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">Time Out</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">OT (hrs)</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">Shift</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">Status</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr><td colSpan={10} className="py-8 text-center text-[#5a6878] text-[11px]">No attendance records for this {dateRangeMode ? 'date range' : 'date'}.</td></tr>
              ) : filteredRecords.map(r => {
                const statusLabel = getStatusLabel(r);
                const statusColorClass = statusColor(r);
                const shouldShowStatus = statusLabel !== '—';
                
                // Format date for display (e.g., "15 Jan" or "15 Jan 2024" if not current year)
                const recordDate = new Date(r.date);
                const currentYear = new Date().getFullYear();
                const dateDisplay = recordDate.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  ...(recordDate.getFullYear() !== currentYear ? { year: 'numeric' } : {})
                });
                
                // Highlight today's date
                const isDateToday = r.date === new Date().toISOString().split('T')[0];
                
                return (
                  <tr key={r.id} className="border-b border-[#252e3a]/50 hover:bg-[#141920] transition-colors group">
                    <td className="py-2.5 px-3 text-[10px] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      <span className={isDateToday ? 'text-[#00e676] font-semibold' : 'text-[#8899aa]'}>
                        {dateDisplay}
                      </span>
                      {isDateToday && (
                        <span className="ml-1 text-[8px] text-[#00e676] uppercase tracking-wider">Today</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[10px] text-[#8899aa]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{r.employee.empId}</td>
                    <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{r.employee.name}</td>
                    <td className="py-2.5 px-3 text-[#8899aa] text-center">{r.site}</td>
                    <td className="py-2.5 px-3 text-[#8899aa] font-mono text-[10px] text-center">{r.timeIn || '—'}</td>
                    <td className="py-2.5 px-3 text-[#8899aa] font-mono text-[10px] text-center">{r.timeOut || '—'}</td>
                    <td className="py-2.5 px-3 text-center"><span className={r.otHours > 0 ? 'text-[#00d4ff] font-semibold' : 'text-[#5a6878]'} style={{ fontFamily: "'Share Tech Mono', monospace" }}>{r.otHours > 0 ? r.otHours.toFixed(1) : '—'}</span></td>
                    <td className="py-2.5 px-3 text-center"><span className={`vc-badge ${shiftColor(r.shift || '')}`}>{r.shift || '—'}</span></td>
                    <td className="py-2.5 px-3 text-center">
                      {shouldShowStatus ? (
                        <span className={`vc-badge ${statusColorClass}`}>{statusLabel}</span>
                      ) : (
                        <span className="text-[#5a6878] text-[10px]" title={isFutureDate(r.date) ? 'Future date' : 'Pending'}>—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" onClick={() => openEdit(r)}><Pencil size={13} /></button>
                        <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" onClick={() => openDelete(r.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl" aria-describedby="create-attendance-description">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0] text-base">Create Attendance Record</DialogTitle>
            <p id="create-attendance-description" className="text-[11px] text-[#5a6878] mt-1">Fill in the attendance details below. Fields marked with * are required.</p>
          </DialogHeader>
          {dialogContent()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('create')}>{submitting ? 'Creating...' : 'Create Record'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl" aria-describedby="edit-attendance-description">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0] text-base">Edit Attendance Record</DialogTitle>
            <p id="edit-attendance-description" className="text-[11px] text-[#5a6878] mt-1">Update the attendance information below.</p>
          </DialogHeader>
          {dialogContent()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('edit')}>{submitting ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md" aria-describedby="delete-attendance-description">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Delete Attendance Record</DialogTitle></DialogHeader>
          <div id="delete-attendance-description" className="flex items-start gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-[#ff3d3d]/15 flex items-center justify-center shrink-0 mt-0.5"><AlertTriangle size={20} className="text-[#ff3d3d]" /></div>
            <div><p className="text-[13px] text-[#e2e8f0] mb-1">Are you sure you want to delete this attendance record?</p><p className="text-[11px] text-[#8899aa]">This action cannot be undone.</p></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#cc2020] font-semibold" disabled={submitting} onClick={handleDelete}>{submitting ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
