'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TimerReset, ChevronLeft, ChevronRight, Clock, UserCheck,
  AlertCircle, Download, FileSpreadsheet
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

/* ── Types ── */
interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  isActive?: boolean;
  department?: { name: string };
  branch?: { name: string };
  employmentStatus: string;
}

interface AttendanceRecord {
  id: number;
  employeeId: number;
  logDate: string;
  punchIn: string | null;
  punchOut: string | null;
  status: string;
  biometricDeviceId: string | null;
  lateMinutes?: number;
  fineAmount?: number;
  shiftStartTime?: string | null;
  shiftEndTime?: string | null;
  shiftBreakMinutes?: number | null;
  shiftCrossesMidnight?: boolean | null;
  shiftOtThresholdMin?: number | null;
  Employee: {
    employeeCode: string;
    firstName: string;
    lastName: string;
  };
}

interface Holiday {
  id: number;
  name: string;
  date: string;
  type: string;
  description?: string | null;
}

/* ── Helpers ── */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getWeekDates(offset: number): Date[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  // Monday = 0 offset from Monday
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + offset * 7);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDisplayDate(d: Date): string {
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

function formatTime(dateTimeStr: string | null): string {
  if (!dateTimeStr) return '';
  try {
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}

function calcHours(punchIn: string | null, punchOut: string | null): number {
  if (!punchIn || !punchOut) return 0;
  try {
    const inTime = new Date(punchIn);
    const outTime = new Date(punchOut);
    const diff = outTime.getTime() - inTime.getTime();
    if (diff < 0) return 0;
    return Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
  } catch {
    return 0;
  }
}

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Net working hours from a record's shift (end − start − break, midnight-aware). Defaults to 8h. */
function shiftNetHours(rec: AttendanceRecord): number {
  if (!rec.shiftStartTime || !rec.shiftEndTime) return 8;
  const start = timeToMins(rec.shiftStartTime);
  const end = timeToMins(rec.shiftEndTime);
  let dur = end - start;
  if (rec.shiftCrossesMidnight || dur < 0) dur = (24 * 60 - start) + end;
  const net = dur - (rec.shiftBreakMinutes ?? 0);
  return net > 0 ? net / 60 : 8;
}

/** Shift-driven OT: hours beyond the shift's net hours, gated by the shift's OT threshold (minutes). */
function calcOtHours(totalHours: number, rec?: AttendanceRecord): number {
  const net = rec ? shiftNetHours(rec) : 8;
  const overage = totalHours - net;
  if (overage <= 0) return 0;
  const thresholdMin = rec?.shiftOtThresholdMin ?? 0;
  if (thresholdMin > 0 && overage * 60 < thresholdMin) return 0;
  return Math.round(overage * 100) / 100;
}

function getStatusStyle(status: string) {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case 'present': return 'bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30';
    case 'absent': return 'bg-[#ff3d3d]/15 text-[#ff3d3d] border border-[#ff3d3d]/30';
    case 'leave': return 'bg-[#ffab40]/15 text-[#ffab40] border border-[#ffab40]/30';
    case 'half_day': return 'bg-[#ffab40]/15 text-[#ffab40] border border-[#ffab40]/30';
    case 'holiday': return 'bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30';
    case 'late': return 'bg-[#ffab40]/15 text-[#ffab40] border border-[#ffab40]/30';
    default: return 'bg-[#5a6878]/15 text-[#5a6878] border border-[#5a6878]/30';
  }
}

function getStatusLabel(status: string): string {
  // Map every known status to a HIL-style code. Anything unrecognised (or an
  // empty status) returns '' rather than leaking a raw substring like "LA" /
  // "ON" / "WE" into the export.
  switch ((status || '').toLowerCase().replace(/[\s-]+/g, '_')) {
    case 'present':
    case 'late': return 'P';        // late is still present in the HIL layout
    case 'absent': return 'A';
    case 'leave':
    case 'on_leave': return 'L';
    case 'half_day':
    case 'halfday': return 'HD';
    case 'holiday': return 'HL';
    case 'week_off':
    case 'weekoff':
    case 'weekly_off': return 'WO';
    default: return '';
  }
}

// Fill colours (ARGB) for each export status code, so the sheet reads at a glance.
const STATUS_FILL: Record<string, string> = {
  P: 'FFE2EFDA',    // green tint  – present
  'P/WO': 'FFC6E0B4',// deeper green – present on a week-off
  SP: 'FFC6E0B4',   // present on a holiday
  A: 'FFFCE4E4',    // red tint    – absent
  HD: 'FFFFF2CC',   // amber tint  – half day
  L: 'FFDDEBF7',    // blue tint   – leave
  WO: 'FFEDEDED',   // grey        – week off
  HL: 'FFEDEDED',   // grey        – holiday
};
const STATUS_FONT: Record<string, string> = {
  P: 'FF375623', 'P/WO': 'FF375623', SP: 'FF375623',
  A: 'FFC00000', HD: 'FF7F6000', L: 'FF1F4E79', WO: 'FF7F7F7F', HL: 'FF7F7F7F',
};

/* ── Skeleton ── */
function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64 bg-[#1e2630] rounded-lg" />
        <Skeleton className="h-8 w-40 bg-[#1e2630] rounded-lg" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-20 bg-[#1e2630] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[400px] bg-[#1e2630] rounded-xl" />
    </div>
  );
}

/* ── Main Component ── */
export default function TimesheetModule() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [holidays, setHolidays] = useState<Record<string, Holiday>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [siteFilter, setSiteFilter] = useState('');
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [exporting, setExporting] = useState(false);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  
  // Get date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === 'daily') {
      const date = new Date(selectedDate);
      return { start: date, end: date, dates: [date] };
    } else if (viewMode === 'weekly') {
      return { start: weekDates[0], end: weekDates[6], dates: weekDates };
    } else {
      // Monthly
      const date = new Date(selectedDate);
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const dates: Date[] = [];
      for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
      return { start: firstDay, end: lastDay, dates };
    }
  }, [viewMode, weekDates, selectedDate]);
  
  const weekLabel = useMemo(() => {
    if (viewMode === 'daily') {
      const date = new Date(selectedDate);
      return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
    } else if (viewMode === 'weekly') {
      const start = weekDates[0];
      const end = weekDates[6];
      const sameMonth = start.getMonth() === end.getMonth();
      if (sameMonth) {
        return `${start.getDate()} – ${end.getDate()} ${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
      }
      return `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${start.getFullYear()}`;
    } else {
      const date = new Date(selectedDate);
      return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
    }
  }, [viewMode, weekDates, selectedDate]);

  const isCurrentWeek = weekOffset === 0 && viewMode === 'weekly';
  const isToday = selectedDate === new Date().toISOString().split('T')[0] && viewMode === 'daily';
  const isCurrentMonth = (() => {
    if (viewMode !== 'monthly') return false;
    const now = new Date();
    const selected = new Date(selectedDate);
    return now.getMonth() === selected.getMonth() && now.getFullYear() === selected.getFullYear();
  })();

  // Build attendance lookup: employeeCode + date -> record (using employeeCode for stability)
  const attMap = useMemo(() => {
    const map: Record<string, AttendanceRecord> = {};
    attendance.forEach(a => {
      const dateStr = new Date(a.logDate).toISOString().split('T')[0];
      // Use employeeCode from the attendance record's Employee object (PascalCase from API)
      const empCode = a.Employee?.employeeCode;
      if (empCode) {
        map[`${empCode}_${dateStr}`] = a;
      } else {
        console.warn('⚠️ Attendance record missing employee code:', a);
      }
    });
    console.log('🔍 Timesheet: Attendance map built with', Object.keys(map).length, 'entries');
    console.log('🔍 Timesheet: Sample map keys:', Object.keys(map).slice(0, 5));
    return map;
  }, [attendance]);

  // Filtered employees (deduplicate by employeeCode)
  const sites = useMemo(() => {
    const s = new Set(employees.map(e => e.branch?.name).filter(Boolean));
    return Array.from(s).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    // Only include active employees with a shift assignment
    let result = employees.filter(e => e.employmentStatus === 'active' && e.isActive !== false);
    if (siteFilter) result = result.filter(e => e.branch?.name === siteFilter);
    
    // Deduplicate by employeeCode (keep the first occurrence)
    const seen = new Set<string>();
    result = result.filter(e => {
      if (seen.has(e.employeeCode)) {
        console.warn(`Duplicate employee found: ${e.employeeCode} - ${e.firstName} ${e.lastName}`);
        return false;
      }
      seen.add(e.employeeCode);
      return true;
    });
    
    return result;
  }, [employees, siteFilter]);

  // Computed stats for the date range
  const stats = useMemo(() => {
    const startStr = formatDate(dateRange.start);
    const endStr = formatDate(dateRange.end);
    const rangeRecords = attendance.filter(a => {
      const dateStr = new Date(a.logDate).toISOString().split('T')[0];
      return dateStr >= startStr && dateStr <= endStr;
    });

    const present = rangeRecords.filter(a => a.status.toLowerCase() === 'present').length;
    const late = rangeRecords.filter(a => a.status.toLowerCase() === 'late').length;
    const absent = rangeRecords.filter(a => a.status.toLowerCase() === 'absent').length;
    const onLeave = rangeRecords.filter(a => a.status.toLowerCase() === 'leave').length;
    const totalFines = rangeRecords.reduce((s, a) => s + Number(a.fineAmount || 0), 0);
    
    let totalOt = 0;
    rangeRecords.forEach(a => {
      if (['present', 'late'].includes(a.status.toLowerCase()) && a.punchIn && a.punchOut) {
        const hours = calcHours(a.punchIn, a.punchOut);
        totalOt += calcOtHours(hours, a);
      }
    });
    
    const uniquePresent = new Set(
      rangeRecords
        .filter(a => ['present', 'late'].includes(a.status.toLowerCase()))
        .map(a => a.employeeId)
    ).size;

    return { present, late, absent, onLeave, totalOt: Math.round(totalOt * 10) / 10, uniquePresent, totalFines: Math.round(totalFines) };
  }, [attendance, dateRange]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch employees and attendance for the date range
      const startStr = formatDate(dateRange.start);
      const endStr = formatDate(dateRange.end);
      
      console.log('🔍 Timesheet: Fetching data for range:', startStr, 'to', endStr);
      console.log('🔍 Timesheet: View mode:', viewMode);
      
      const [empRes, attRes, holidayRes] = await Promise.all([
        fetch('/api/employees'),
        fetch(`/api/attendance?limit=10000`), // Get more records for monthly view
        fetch(`/api/timesheet/holidays?startDate=${startStr}&endDate=${endStr}`),
      ]);
      
      const empJson = await empRes.json();
      const attJson = await attRes.json();
      const holidayJson = await holidayRes.json();
      
      console.log('🔍 Timesheet: Employees fetched:', empJson.data?.length);
      console.log('🔍 Timesheet: Attendance records fetched:', attJson.data?.length);
      console.log('🔍 Timesheet: Holidays fetched:', holidayJson.data?.holidays?.length);
      
      if (empJson.success) {
        setEmployees(empJson.data || []);
      } else {
        throw new Error(empJson.error || 'Failed to fetch employees');
      }
      
      if (attJson.success) {
        // Filter attendance records to only include the current date range
        const rangeAttendance = (attJson.data || []).filter((a: AttendanceRecord) => {
          const dateStr = new Date(a.logDate).toISOString().split('T')[0];
          return dateStr >= startStr && dateStr <= endStr;
        });
        console.log('🔍 Timesheet: Filtered attendance for range:', rangeAttendance.length);
        console.log('🔍 Timesheet: Sample attendance:', rangeAttendance.slice(0, 3));
        setAttendance(rangeAttendance);
      } else {
        throw new Error(attJson.error || 'Failed to fetch attendance');
      }

      if (holidayJson.success && holidayJson.data?.holidayMap) {
        setHolidays(holidayJson.data.holidayMap);
        console.log('🔍 Timesheet: Holiday map:', holidayJson.data.holidayMap);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timesheet data');
    } finally {
      setLoading(false);
    }
  }, [dateRange, viewMode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Consistent day-cell code for the export — never mixes times and letters.
  // Holiday/week-off aware: SP = worked on a holiday, P/WO = worked on a week-off.
  const dayCodeFor = (date: Date, record: AttendanceRecord | undefined): string => {
    const dateStr = formatDate(date);
    const isHoliday = !!holidays[dateStr];
    const worked = !!(record && record.punchIn);
    if (isHoliday) return worked ? 'SP' : 'HL';
    if (record) {
      const code = getStatusLabel(record.status);
      if (code === 'WO') return worked ? 'P/WO' : 'WO';
      return code || (worked ? 'P' : 'A');
    }
    return date.getDay() === 0 ? 'WO' : 'A'; // no record: Sunday → WO, else Absent
  };

  const handleExport = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const dates = dateRange.dates;
    const dayHeaders = dates.map(d => formatDisplayDate(d));

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Timesheet');

    const C = {
      titleBg: 'FF1F4E79', titleFg: 'FFFFFFFF',
      headBg: 'FF2E75B6', headFg: 'FFFFFFFF',
      border: 'FFBFBFBF', zebra: 'FFF7FAFD', totalBg: 'FFFFF2CC',
    };
    const thin = { style: 'thin' as const, color: { argb: C.border } };
    const allBorders = { top: thin, left: thin, bottom: thin, right: thin };

    const fixedCols = ['Employee', 'Emp ID', 'Site'];
    const tailCols = ['Total Hrs', 'OT Hrs', 'Days Present'];
    const headerLabels = [...fixedCols, ...dayHeaders, ...tailCols];
    const colCount = headerLabels.length;
    const firstDayCol = fixedCols.length + 1;           // 1-based col of day 1
    const lastDayCol = fixedCols.length + dates.length; // 1-based col of last day

    // Column widths
    ws.getColumn(1).width = 24; // Employee
    ws.getColumn(2).width = 12; // Emp ID
    ws.getColumn(3).width = 16; // Site
    for (let c = firstDayCol; c <= lastDayCol; c++) ws.getColumn(c).width = 9;
    ws.getColumn(lastDayCol + 1).width = 11;
    ws.getColumn(lastDayCol + 2).width = 10;
    ws.getColumn(lastDayCol + 3).width = 13;

    // Row 1 — title band
    const rangeLabel = dates.length === 1
      ? formatDisplayDate(dates[0])
      : `${formatDisplayDate(dates[0])} – ${formatDisplayDate(dates[dates.length - 1])}`;
    ws.mergeCells(1, 1, 1, colCount);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = `TIMESHEET  •  ${rangeLabel}`;
    titleCell.font = { bold: true, size: 13, color: { argb: C.titleFg } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.titleBg } };
    ws.getRow(1).height = 22;

    // Row 2 — headers
    const headerRow = ws.getRow(2);
    headerLabels.forEach((v, i) => { headerRow.getCell(i + 1).value = v; });
    headerRow.height = 30;
    for (let c = 1; c <= colCount; c++) {
      const cell = headerRow.getCell(c);
      cell.font = { bold: true, size: 9, color: { argb: C.headFg } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headBg } };
      cell.border = allBorders;
    }

    // Data rows
    let rowIdx = 3;
    filteredEmployees.forEach((emp, i) => {
      const row = ws.getRow(rowIdx);
      row.getCell(1).value = `${emp.firstName} ${emp.lastName}`.trim();
      row.getCell(2).value = emp.employeeCode;
      row.getCell(3).value = emp.branch?.name || '';

      let totalHrs = 0, totalOt = 0, daysPresent = 0;

      dates.forEach((date, di) => {
        const dateStr = formatDate(date);
        const record = attMap[`${emp.employeeCode}_${dateStr}`];
        const code = dayCodeFor(date, record);
        if (record && record.punchIn && record.punchOut &&
            (code === 'P' || code === 'P/WO' || code === 'SP' || code === 'HD')) {
          const hrs = calcHours(record.punchIn, record.punchOut);
          totalHrs += hrs;
          totalOt += calcOtHours(hrs, record);
        }
        if (code === 'P' || code === 'P/WO' || code === 'SP') daysPresent++;

        const cell = row.getCell(firstDayCol + di);
        cell.value = code;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { size: 9, bold: code === 'A', color: { argb: STATUS_FONT[code] || 'FF000000' } };
        if (STATUS_FILL[code]) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STATUS_FILL[code] } };
      });

      row.getCell(lastDayCol + 1).value = Math.round(totalHrs * 100) / 100;
      row.getCell(lastDayCol + 2).value = Math.round(totalOt * 100) / 100;
      row.getCell(lastDayCol + 3).value = `${daysPresent}/${dates.length}`;

      const zebra = i % 2 === 1;
      for (let c = 1; c <= colCount; c++) {
        const cell = row.getCell(c);
        cell.border = allBorders;
        if (!cell.font) cell.font = { size: 9 };
        if (!cell.alignment) cell.alignment = { vertical: 'middle', horizontal: c >= lastDayCol + 1 ? 'center' : 'left' };
        if (c === lastDayCol + 1 || c === lastDayCol + 2) cell.numFmt = '0.00';
        // Zebra only on the fixed/total columns; day cells keep their status colour.
        if (zebra && (c < firstDayCol || c > lastDayCol) && !cell.fill) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.zebra } };
        }
      }
      row.height = 15;
      rowIdx++;
    });

    // Legend row (below the data) so the codes are self-documenting.
    const legendRow = ws.getRow(rowIdx + 1);
    legendRow.getCell(1).value =
      'Legend:  P = Present   A = Absent   HD = Half Day   L = Leave   WO = Week Off   HL = Holiday   P/WO = Present on Week Off   SP = Present on Holiday';
    ws.mergeCells(rowIdx + 1, 1, rowIdx + 1, colCount);
    legendRow.getCell(1).font = { italic: true, size: 8, color: { argb: 'FF5A6878' } };
    legendRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

    ws.views = [{ state: 'frozen', xSplit: 3, ySplit: 2 }];
    ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: colCount } };

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet-${viewMode}-${weekLabel.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Downloads the HIL "Summary Report" (.xlsx) for the selected month — one row
  // per workman, one status cell per day, plus OT/HD/Leave/Mandays/HL totals.
  const handleSummaryReport = async () => {
    const ref = new Date(selectedDate);
    const month = ref.getMonth() + 1;
    const year = ref.getFullYear();
    setExporting(true);
    try {
      const res = await fetch(`/api/reports/mandays-summary?month=${month}&year=${year}`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Failed to generate summary report');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      a.download = `SummaryReport_${MON[month - 1]}${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to generate summary report');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <LoadingSkeleton />;
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertCircle size={40} className="text-[#ff3d3d]" />
        <div className="text-sm text-[#e2e8f0] font-medium">{error}</div>
        <button className="vc-btn-primary mt-2" onClick={fetchData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#f5a623]/10 rounded-xl flex items-center justify-center">
            <TimerReset size={20} className="text-[#f5a623]" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {viewMode === 'daily' ? 'Daily' : viewMode === 'weekly' ? 'Weekly' : 'Monthly'} Timesheet
            </h2>
            <p className="text-[11px] text-[#5a6878]">HRMS › Time Tracking & Hours</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="vc-input w-[100px] text-[11px] appearance-none cursor-pointer"
            value={viewMode}
            onChange={e => setViewMode(e.target.value as 'daily' | 'weekly' | 'monthly')}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <select
            className="vc-input w-[120px] text-[11px] appearance-none cursor-pointer"
            value={siteFilter}
            onChange={e => setSiteFilter(e.target.value)}
          >
            <option value="">All Sites</option>
            {sites.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            className="vc-btn-ghost flex items-center gap-1.5"
            onClick={handleExport}
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50"
            onClick={handleSummaryReport}
            disabled={exporting}
            title="Download the monthly Summary Report (HIL format)"
          >
            <FileSpreadsheet size={13} />
            <span className="hidden sm:inline">{exporting ? 'Generating…' : 'Summary Report'}</span>
          </button>
        </div>
      </div>

      {/* ── Date Navigator ── */}
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-3 flex items-center justify-between">
        <button
          className="flex items-center gap-1.5 text-[#8899aa] hover:text-[#e2e8f0] transition-colors text-[12px] font-medium"
          onClick={() => {
            if (viewMode === 'weekly') {
              setWeekOffset(w => w - 1);
            } else if (viewMode === 'daily') {
              const date = new Date(selectedDate);
              date.setDate(date.getDate() - 1);
              setSelectedDate(date.toISOString().split('T')[0]);
            } else {
              const date = new Date(selectedDate);
              date.setMonth(date.getMonth() - 1);
              setSelectedDate(date.toISOString().split('T')[0]);
            }
          }}
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Prev {viewMode === 'daily' ? 'Day' : viewMode === 'weekly' ? 'Week' : 'Month'}</span>
        </button>
        <div className="text-center">
          <div className="text-[14px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {weekLabel}
          </div>
          {(isCurrentWeek || isToday || isCurrentMonth) && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#00e676] bg-[#00e676]/10 px-2 py-[1px] rounded">
              {viewMode === 'daily' ? 'Today' : viewMode === 'weekly' ? 'Current Week' : 'Current Month'}
            </span>
          )}
        </div>
        <button
          className={`flex items-center gap-1.5 text-[12px] font-medium transition-colors ${
            (viewMode === 'weekly' && weekOffset >= 0) || 
            (viewMode === 'daily' && selectedDate >= new Date().toISOString().split('T')[0]) ||
            (viewMode === 'monthly' && isCurrentMonth)
              ? 'text-[#5a6878] cursor-not-allowed' 
              : 'text-[#8899aa] hover:text-[#e2e8f0]'
          }`}
          onClick={() => {
            if (viewMode === 'weekly') {
              setWeekOffset(w => Math.min(w + 1, 0));
            } else if (viewMode === 'daily') {
              const date = new Date(selectedDate);
              const today = new Date().toISOString().split('T')[0];
              if (selectedDate < today) {
                date.setDate(date.getDate() + 1);
                setSelectedDate(date.toISOString().split('T')[0]);
              }
            } else {
              if (!isCurrentMonth) {
                const date = new Date(selectedDate);
                date.setMonth(date.getMonth() + 1);
                setSelectedDate(date.toISOString().split('T')[0]);
              }
            }
          }}
          disabled={
            (viewMode === 'weekly' && weekOffset >= 0) || 
            (viewMode === 'daily' && selectedDate >= new Date().toISOString().split('T')[0]) ||
            (viewMode === 'monthly' && isCurrentMonth)
          }
        >
          <span className="hidden sm:inline">Next {viewMode === 'daily' ? 'Day' : viewMode === 'weekly' ? 'Week' : 'Month'}</span>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: UserCheck, label: 'Present Entries', value: stats.present, sub: `${stats.uniquePresent} unique employees`, color: '#00e676' },
          { icon: AlertCircle, label: 'Late Entries', value: (stats as any).late || 0, sub: `₹${(stats as any).totalFines || 0} in fines`, color: '#f5a623' },
          { icon: AlertCircle, label: 'Absent Entries', value: stats.absent, sub: `This ${viewMode === 'daily' ? 'day' : viewMode === 'weekly' ? 'week' : 'month'}`, color: '#ff3d3d' },
          { icon: TimerReset, label: 'Total OT Hours', value: `${stats.totalOt}h`, sub: `Overtime this ${viewMode === 'daily' ? 'day' : viewMode === 'weekly' ? 'week' : 'month'}`, color: '#00d4ff' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="vc-stat-card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: stat.color }} />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">{stat.label}</div>
                  <div className="text-[20px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{stat.value}</div>
                  <div className="text-[10px] text-[#5a6878] mt-1">{stat.sub}</div>
                </div>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${stat.color}15` }}>
                  <Icon size={18} style={{ color: stat.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Timesheet Grid ── */}
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="vc-panel-header">
          <TimerReset size={14} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Timesheet Grid</span>
          <span className="ml-auto text-[10px] text-[#5a6878]">{filteredEmployees.length} employees</span>
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-[11px] min-w-[1200px]">
            <thead className="sticky top-0 bg-[#161c24] z-10">
              <tr className="border-b border-[#252e3a]">
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[180px]">Employee</th>
                <th className="text-center py-2.5 px-2 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[50px]">Site</th>
                {viewMode === 'daily' ? (
                  <>
                    <th className="text-center py-2.5 px-2 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] min-w-[80px]">Time In</th>
                    <th className="text-center py-2.5 px-2 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] min-w-[80px]">Time Out</th>
                    <th className="text-center py-2.5 px-2 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] min-w-[60px]">Hours</th>
                    <th className="text-center py-2.5 px-2 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] min-w-[50px]">OT</th>
                    <th className="text-center py-2.5 px-2 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] min-w-[60px]">Status</th>
                  </>
                ) : viewMode === 'weekly' ? (
                  <>
                    {DAYS.map((day, i) => (
                      <th key={day} className="text-center py-2.5 px-1 min-w-[110px]">
                        <div className="text-[9px] font-semibold uppercase tracking-wider text-[#8899aa]">{day}</div>
                        <div className="text-[10px] text-[#5a6878]">{formatDisplayDate(weekDates[i])}</div>
                      </th>
                    ))}
                    <th className="text-center py-2.5 px-2 text-[#00e676] font-bold text-[9px] uppercase tracking-wider min-w-[60px]">Total</th>
                    <th className="text-center py-2.5 px-2 text-[#00d4ff] font-bold text-[9px] uppercase tracking-wider min-w-[50px]">OT</th>
                    <th className="text-center py-2.5 px-2 text-[#f5a623] font-bold text-[9px] uppercase tracking-wider min-w-[50px]">Days</th>
                  </>
                ) : (
                  <>
                    {dateRange.dates.slice(0, 31).map((date, i) => (
                      <th key={i} className="text-center py-2.5 px-1 min-w-[40px]">
                        <div className="text-[9px] font-semibold text-[#8899aa]">{date.getDate()}</div>
                      </th>
                    ))}
                    <th className="text-center py-2.5 px-2 text-[#00e676] font-bold text-[9px] uppercase tracking-wider min-w-[60px]">Total</th>
                    <th className="text-center py-2.5 px-2 text-[#00d4ff] font-bold text-[9px] uppercase tracking-wider min-w-[50px]">OT</th>
                    <th className="text-center py-2.5 px-2 text-[#f5a623] font-bold text-[9px] uppercase tracking-wider min-w-[50px]">Days</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={viewMode === 'daily' ? 7 : viewMode === 'weekly' ? 12 : dateRange.dates.length + 5} className="py-10 text-center text-[#5a6878] text-[12px]">
                    No active employees found
                  </td>
                </tr>
              ) : filteredEmployees.map(emp => {
                let totalHrs = 0;
                let totalOt = 0;
                let daysPresent = 0;
                
                // For daily view, get single day record
                if (viewMode === 'daily') {
                  const dateStr = formatDate(dateRange.dates[0]);
                  const record = attMap[`${emp.employeeCode}_${dateStr}`];
                  
                  return (
                    <tr key={emp.employeeCode} className="border-b border-[#252e3a]/40 hover:bg-[#141920] transition-colors group">
                      <td className="py-2.5 px-3">
                        <div className="text-[12px] font-semibold text-[#e2e8f0] truncate max-w-[130px]">
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div className="text-[9px] text-[#5a6878] font-mono">{emp.employeeCode}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="text-[10px] text-[#8899aa]">{emp.branch?.name || '—'}</span>
                      </td>
                      {record ? (
                        <>
                          <td className="py-2.5 px-2 text-center">
                            <span className="text-[11px] text-[#e2e8f0] font-mono">{formatTime(record.punchIn)}</span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="text-[11px] text-[#e2e8f0] font-mono">{formatTime(record.punchOut)}</span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="text-[12px] font-bold text-[#00e676] font-mono">
                              {record.punchIn && record.punchOut ? `${calcHours(record.punchIn, record.punchOut).toFixed(2)}h` : '—'}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="text-[12px] font-bold text-[#00d4ff] font-mono">
                              {record.punchIn && record.punchOut ? `${calcOtHours(calcHours(record.punchIn, record.punchOut), record).toFixed(2)}h` : '—'}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={`inline-block px-2 py-[2px] rounded text-[10px] font-bold ${getStatusStyle(record.status)}`}>
                              {record.status}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 px-2 text-center" colSpan={4}>
                            <span className="text-[11px] text-[#5a6878] italic">No record</span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={`inline-block px-2 py-[2px] rounded text-[10px] font-bold ${getStatusStyle('absent')}`}>
                              Absent
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                }
                
                // For weekly and monthly views
                return (
                  <tr key={emp.employeeCode} className="border-b border-[#252e3a]/40 hover:bg-[#141920] transition-colors group">
                    <td className="py-2.5 px-3">
                      <div className="text-[12px] font-semibold text-[#e2e8f0] truncate max-w-[130px]">
                        {emp.firstName} {emp.lastName}
                      </div>
                      <div className="text-[9px] text-[#5a6878] font-mono">{emp.employeeCode}</div>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="text-[10px] text-[#8899aa]">{emp.branch?.name || '—'}</span>
                    </td>
                    {dateRange.dates.map((date, i) => {
                      const dateStr = formatDate(date);
                      const record = attMap[`${emp.employeeCode}_${dateStr}`];
                      const isWeekend = viewMode === 'weekly' && i >= 5;

                      if (record && record.status.toLowerCase() === 'present' && record.punchIn && record.punchOut) {
                        const hrs = calcHours(record.punchIn, record.punchOut);
                        const ot = calcOtHours(hrs, record);
                        totalHrs += hrs;
                        totalOt += ot;
                        daysPresent++;
                        
                        if (viewMode === 'monthly') {
                          return (
                            <td key={i} className="py-2 px-1 text-center">
                              <span className="text-[9px] font-bold text-[#00e676]">P</span>
                            </td>
                          );
                        }
                        
                        return (
                          <td key={i} className={`py-2 px-1 text-center ${isWeekend ? 'bg-[#141920]/50' : ''}`}>
                            <div className="flex flex-col items-center gap-[2px]">
                              <span className="text-[10px] text-[#8899aa] font-mono">
                                {formatTime(record.punchIn)}–{formatTime(record.punchOut)}
                              </span>
                              <span className="text-[11px] font-bold text-[#e2e8f0] font-mono">{hrs.toFixed(2)}h</span>
                              {ot > 0 && (
                                <span className="text-[9px] text-[#00d4ff] font-mono">+{ot.toFixed(2)}h OT</span>
                              )}
                            </div>
                          </td>
                        );
                      }

                      if (record) {
                        return (
                          <td key={i} className={`py-2 px-1 text-center ${isWeekend ? 'bg-[#141920]/50' : ''}`}>
                            <span className={`inline-block px-2 py-[2px] rounded text-[9px] font-bold ${getStatusStyle(record.status)}`}>
                              {getStatusLabel(record.status)}
                            </span>
                          </td>
                        );
                      }

                      // Check if date is a holiday
                      const holiday = holidays[dateStr];
                      if (holiday) {
                        return (
                          <td key={i} className="py-2 px-1 text-center bg-[#a78bfa]/10" title={`${holiday.name} - ${holiday.type}`}>
                            <span className="inline-block px-2 py-[2px] rounded text-[10px] font-bold bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30">
                              H
                            </span>
                          </td>
                        );
                      }

                      // No record
                      if (isWeekend) {
                        return (
                          <td key={i} className="py-2 px-1 text-center bg-[#141920]/50">
                            <span className="text-[9px] text-[#3a4858]">—</span>
                          </td>
                        );
                      }

                      // Check if date is in the future
                      const today = new Date().toISOString().split('T')[0];
                      if (dateStr > today) {
                        return (
                          <td key={i} className="py-2 px-1 text-center">
                            <span className="text-[9px] text-[#3a4858]">—</span>
                          </td>
                        );
                      }

                      // Past date with no record = no data
                      return (
                        <td key={i} className="py-2 px-1 text-center">
                          <span className="text-[9px] text-[#5a6878] italic">—</span>
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-2 text-center">
                      <span className="text-[13px] font-bold text-[#00e676] font-mono">{totalHrs > 0 ? `${totalHrs.toFixed(2)}h` : '—'}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="text-[13px] font-bold text-[#00d4ff] font-mono">{totalOt > 0 ? `${totalOt.toFixed(2)}h` : '—'}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="text-[13px] font-bold text-[#f5a623] font-mono">{daysPresent}/{dateRange.dates.length}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* ── Summary Footer ── */}
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#00e676]" />
            <span className="text-[#8899aa]">Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#ff3d3d]" />
            <span className="text-[#8899aa]">Absent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#ffab40]" />
            <span className="text-[#8899aa]">Leave</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#00d4ff]" />
            <span className="text-[#8899aa]">OT</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#5a6878]" />
            <span className="text-[#8899aa]">No Data</span>
          </div>
        </div>
        <div className="text-[10px] text-[#5a6878]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
          Showing {filteredEmployees.length} active employees · Week of {weekLabel}
        </div>
      </div>
    </div>
  );
}
