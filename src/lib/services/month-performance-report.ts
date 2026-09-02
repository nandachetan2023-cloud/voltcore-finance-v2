import { PrismaClient } from '@prisma/client'
import ExcelJS from 'exceljs'
import { getHolidaysInRange } from './holiday-service'

type DbClient = PrismaClient

// Reproduces the eTimeOffice "Month Performance Register" layout: one 10-row
// block per employee (header, summary, day numbers, weekday, then IN / OUT /
// WORK / Break / OT / Status rows across the days of the month).
//
// Verified math against a device export:
//   WORK = (OUT − IN) − break            (0 when OUT missing)
//   OT   = max(0, WORK − shiftGrossMins)  on normal working days
//   On a week-off / holiday day the whole worked span becomes OT and WORK = 0.
//   Buckets Present + WO + HL + LV + Absent = days in the month.
//   Tot. Work+OT (summary) = Σ WORK column;  Total OT = Σ OT column.

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad2 = (n: number) => String(n).padStart(2, '0')
const parseHM = (s?: string | null): number | null => {
  if (!s) return null
  const [h, m] = s.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}
// Daily cells use 2-digit padded hours ("00:00", "07:59"); summary totals use
// natural hours ("0:00", "6:17", "126:28") — matching the device export.
const fmtDurDay = (min: number) => `${pad2(Math.floor(min / 60))}:${pad2(Math.round(min % 60))}`
const fmtDur = (min: number) => `${Math.floor(min / 60)}:${pad2(Math.round(min % 60))}`
// Wall-clock time of a punch in IST → "HH:mm", or "--:--" when absent.
const fmtTime = (d?: Date | null) => {
  if (!d) return '--:--'
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata',
  }).formatToParts(d)
  const h = parts.find(p => p.type === 'hour')?.value ?? '00'
  const m = parts.find(p => p.type === 'minute')?.value ?? '00'
  return `${h}:${m}`
}
const dateKey = (d: Date) =>
  `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`

export interface MonthPerformanceOptions {
  month: number // 1-12
  year: number
  employeeIds?: number[] // omit → all active employees
  companyName?: string
}

export async function buildMonthPerformanceWorkbook(
  db: DbClient,
  { month, year, employeeIds, companyName = '' }: MonthPerformanceOptions,
): Promise<Buffer> {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const monthStart = new Date(Date.UTC(year, month - 1, 1))
  const monthEnd = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59))
  const monthLabel = `${MON[month - 1]}-${year}`

  const now = new Date()
  const todayKey = `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}`

  // ── Employees (serial order by code) ──────────────────────────────
  const employees = await db.employee.findMany({
    where: {
      isDeleted: false,
      ...(employeeIds && employeeIds.length ? { id: { in: employeeIds } } : {}),
    },
    select: {
      id: true, employeeCode: true, firstName: true, middleName: true, lastName: true,
      branchId: true, Department: { select: { name: true } },
    },
    orderBy: { employeeCode: 'asc' },
  })
  const empIds = employees.map(e => e.id)

  // ── Bulk-load everything for the month (no per-day/per-employee N+1) ──
  const [logs, assignments, leaves, holidays] = await Promise.all([
    db.attendanceLog.findMany({
      where: { employeeId: { in: empIds }, logDate: { gte: monthStart, lte: monthEnd } },
      select: { employeeId: true, logDate: true, punchIn: true, punchOut: true },
    }),
    db.shiftAssignment.findMany({
      where: {
        employeeId: { in: empIds },
        effectiveFrom: { lte: monthEnd },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: monthStart } }],
      },
      include: { Shift: { select: { startTime: true, endTime: true, crossesMidnight: true, breakMinutes: true, weekOffDays: true } } },
      orderBy: { effectiveFrom: 'desc' },
    }),
    db.leaveRequest.findMany({
      where: {
        employeeId: { in: empIds }, status: 'approved', isDeleted: false,
        fromDate: { lte: monthEnd }, toDate: { gte: monthStart },
      },
      select: { employeeId: true, fromDate: true, toDate: true },
    }),
    getHolidaysInRange(monthStart, monthEnd, null, db),
  ])

  // Index attendance by "empId|YYYY-MM-DD"
  const logByKey = new Map<string, { punchIn: Date | null; punchOut: Date | null }>()
  for (const l of logs) logByKey.set(`${l.employeeId}|${dateKey(new Date(l.logDate))}`, { punchIn: l.punchIn, punchOut: l.punchOut })

  // One representative shift per employee (most recent assignment overlapping the month).
  const shiftByEmp = new Map<number, typeof assignments[number]['Shift']>()
  for (const a of assignments) if (!shiftByEmp.has(a.employeeId)) shiftByEmp.set(a.employeeId, a.Shift)

  // Approved-leave day set per employee.
  const leaveByEmp = new Map<number, Set<string>>()
  for (const lv of leaves) {
    const set = leaveByEmp.get(lv.employeeId) ?? new Set<string>()
    const from = new Date(lv.fromDate), to = new Date(lv.toDate)
    for (let t = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
      t <= to.getTime(); t += 86400000) {
      set.add(dateKey(new Date(t)))
    }
    leaveByEmp.set(lv.employeeId, set)
  }

  const holidaySet = new Set(holidays.map(h => dateKey(new Date(h.date))))

  // ── Build the sheet as an array-of-arrays, block by block ─────────
  const aoa: (string | number)[][] = []
  const cell = (row: (string | number)[], idx: number, val: string | number) => { row[idx] = val }

  for (const emp of employees) {
    const shift = shiftByEmp.get(emp.id)
    const weekOff = new Set<number>(shift?.weekOffDays ?? [0]) // default Sunday off
    const breakMin = shift?.breakMinutes ?? 60
    const startMin = parseHM(shift?.startTime) ?? 9 * 60
    let endMin = parseHM(shift?.endTime) ?? 18 * 60
    if (shift?.crossesMidnight && endMin <= startMin) endMin += 1440
    const shiftGross = Math.max(0, endMin - startMin) // e.g. 08:30–17:30 = 540
    const leaveSet = leaveByEmp.get(emp.id) ?? new Set<string>()
    const name = [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(' ')

    const dayNums: (string | number)[] = ['']
    const dayWk: (string | number)[] = ['']
    const rIn: (string | number)[] = ['IN']
    const rOut: (string | number)[] = ['OUT']
    const rWork: (string | number)[] = ['WORK']
    const rBreak: (string | number)[] = ['Break']
    const rOt: (string | number)[] = ['OT']
    const rStatus: (string | number)[] = ['Status']

    let present = 0, wo = 0, hl = 0, lv = 0, absent = 0
    let totWorkOT = 0, totalOT = 0

    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(Date.UTC(year, month - 1, d))
      const k = dateKey(dt)
      const dow = dt.getUTCDay()
      const log = logByKey.get(`${emp.id}|${k}`)
      const hasIn = !!log?.punchIn
      const hasOut = !!log?.punchOut

      const gross = hasIn && hasOut ? Math.max(0, (log!.punchOut!.getTime() - log!.punchIn!.getTime()) / 60000) : 0
      const brk = hasIn && hasOut ? breakMin : 0
      const work = Math.max(0, gross - brk)

      const isHL = holidaySet.has(k)
      const isWO = weekOff.has(dow)
      const isLV = leaveSet.has(k)
      const isFuture = k > todayKey

      let workCell = 0, otCell = 0, status = ''
      if (isHL) { status = 'HL'; hl++; if (work > 0) otCell = work }
      else if (isWO) { status = 'WO'; wo++; if (work > 0) otCell = work }
      else if (hasIn) { status = 'P'; present++; workCell = work; otCell = Math.max(0, work - shiftGross) }
      else if (isLV) { status = 'LV'; lv++ }
      else if (!isFuture) { status = 'A'; absent++ }
      // future working days → blank status, no bucket

      totWorkOT += workCell
      totalOT += otCell

      cell(dayNums, d, d)
      cell(dayWk, d, DOW[dow])
      cell(rIn, d, fmtTime(log?.punchIn))
      cell(rOut, d, fmtTime(log?.punchOut))
      cell(rWork, d, fmtDurDay(workCell))
      cell(rBreak, d, fmtDurDay(brk))
      cell(rOt, d, fmtDurDay(otCell))
      cell(rStatus, d, status)
    }

    // Row 0 — Dept / Company / Report Month
    const r0: (string | number)[] = []
    cell(r0, 0, 'Dept. Name'); cell(r0, 2, emp.Department?.name || '')
    cell(r0, 11, 'CompName'); cell(r0, 15, companyName)
    cell(r0, 26, 'Report Month'); cell(r0, 29, monthLabel)

    // Row 1 — Empcode / Name / summary counts
    const r1: (string | number)[] = []
    cell(r1, 0, 'Empcode'); cell(r1, 2, emp.employeeCode || '')
    cell(r1, 5, 'Name'); cell(r1, 7, name)
    cell(r1, 12, 'Present'); cell(r1, 14, present)
    cell(r1, 15, 'WO'); cell(r1, 16, wo)
    cell(r1, 17, 'HL'); cell(r1, 18, hl)
    cell(r1, 19, 'LV'); cell(r1, 20, lv)
    cell(r1, 21, 'Absent'); cell(r1, 23, absent)
    cell(r1, 24, 'Tot. Work+OT'); cell(r1, 26, fmtDur(totWorkOT))
    cell(r1, 28, 'Total OT'); cell(r1, 30, fmtDur(totalOT))

    aoa.push(r0, r1, dayNums, dayWk, rIn, rOut, rWork, rBreak, rOt, rStatus)
  }

  // ── Render with ExcelJS so the register is colour-coded & bordered ──
  // (SheetJS community build silently drops all styling on write.)
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Sheet1', { views: [{ state: 'frozen', xSplit: 1 }] })

  const C = {
    deptBg: 'FF1F4E79', deptFg: 'FFFFFFFF',   // dept/company band
    sumBg: 'FF2E75B6', sumFg: 'FFFFFFFF',      // summary band
    dayBg: 'FFDDEBF7', dayFg: 'FF1F4E79',      // day-number / weekday header
    labelBg: 'FFF2F2F2', border: 'FFD9D9D9',
  }
  const STATUS_FILL: Record<string, { fill: string; font: string }> = {
    P: { fill: 'FFE2EFDA', font: 'FF375623' },
    A: { fill: 'FFFCE4E4', font: 'FFC00000' },
    WO: { fill: 'FFEDEDED', font: 'FF7F7F7F' },
    HL: { fill: 'FFEDEDED', font: 'FF7F7F7F' },
    LV: { fill: 'FFDDEBF7', font: 'FF1F4E79' },
    HD: { fill: 'FFFFF2CC', font: 'FF7F6000' },
  }
  const thin = { style: 'thin' as const, color: { argb: C.border } }
  const allBorders = { top: thin, left: thin, bottom: thin, right: thin }
  const totalCols = daysInMonth + 1 // col 0 label + day columns

  // Column widths: label column wider, day columns compact.
  ws.getColumn(1).width = 10
  for (let c = 2; c <= totalCols; c++) ws.getColumn(c).width = 6

  // Each employee occupies a 10-row block in the same order they were pushed:
  //   0 r0(dept) 1 r1(summary) 2 dayNums 3 dayWk 4 IN 5 OUT 6 WORK 7 Break 8 OT 9 Status
  aoa.forEach((rowVals, i) => {
    const kind = i % 10
    const row = ws.addRow(rowVals as ExcelJS.CellValue[])
    row.height = kind === 0 || kind === 1 ? 18 : 15
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = allBorders
      cell.alignment = { horizontal: colNumber === 1 ? 'left' : 'center', vertical: 'middle' }
      cell.font = { size: 9 }
      if (kind === 0) {
        cell.font = { size: 10, bold: true, color: { argb: C.deptFg } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.deptBg } }
      } else if (kind === 1) {
        cell.font = { size: 9, bold: true, color: { argb: C.sumFg } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.sumBg } }
      } else if (kind === 2 || kind === 3) {
        // day-number & weekday rows → light-blue header band
        cell.font = { size: 9, bold: true, color: { argb: C.dayFg } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.dayBg } }
      } else if (kind === 9) {
        // Status row — colour each day cell by its code; label cell stays plain.
        if (colNumber === 1) {
          cell.font = { size: 9, bold: true }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.labelBg } }
        } else {
          const code = String(cell.value ?? '').toUpperCase()
          const st = STATUS_FILL[code]
          if (st) {
            cell.font = { size: 9, bold: true, color: { argb: st.font } }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: st.fill } }
          }
        }
      } else if (colNumber === 1) {
        // IN/OUT/WORK/Break/OT row labels
        cell.font = { size: 9, bold: true }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.labelBg } }
      }
    })
  })

  return Buffer.from(await wb.xlsx.writeBuffer())
}
