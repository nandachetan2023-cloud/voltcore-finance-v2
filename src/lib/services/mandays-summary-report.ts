import { PrismaClient } from '@prisma/client'
import ExcelJS from 'exceljs'
import { getHolidaysInRange } from './holiday-service'

type DbClient = PrismaClient

// Reproduces the HIL "Summary Report" layout (excels/SummaryReport4_HIL.xls):
// one row per workman, one status cell per day of the month, then summary
// columns (Total OT, Total Half Day, Total Leave, Total Mandays, Total HL) and
// a grand-total footer row.
//
// Day-classification mirrors month-performance-report.ts so both exports agree:
//   HL (holiday) → 'HL'  | 'SP' if the workman still punched in
//   WO (week-off)→ 'WO'  | 'P/WO' if the workman still punched in
//   punched in   → 'P'   | 'HD' when worked hours < the shift's half-day floor
//   approved leave (no punch) → 'L'
//   nothing, past → 'A'  | future working days stay blank
//
// Mandays = Σ (P=1, P/WO=1, SP=1, HD=0.5). OT is decimal hours beyond shift.

const pad2 = (n: number) => String(n).padStart(2, '0')
const parseHM = (s?: string | null): number | null => {
  if (!s) return null
  const [h, m] = s.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}
const dateKey = (d: Date) =>
  `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`

const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export interface ManDaysSummaryOptions {
  month: number // 1-12
  year: number
  employeeIds?: number[] // omit → all active employees
  contractorName?: string
}

export async function buildManDaysSummaryWorkbook(
  db: DbClient,
  { month, year, employeeIds, contractorName = 'UPASANA ASSOCIATE' }: ManDaysSummaryOptions,
): Promise<Buffer> {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const monthStart = new Date(Date.UTC(year, month - 1, 1))
  const monthEnd = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59))

  const now = new Date()
  const todayKey = `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}`

  // ── Employees (serial order by code) ──────────────────────────────
  const employees = await db.employee.findMany({
    where: {
      isDeleted: false,
      employmentStatus: 'active',
      ...(employeeIds && employeeIds.length ? { id: { in: employeeIds } } : {}),
    },
    select: {
      id: true, employeeCode: true, firstName: true, middleName: true, lastName: true,
      Grade: { select: { name: true } },
      Designation: { select: { name: true } },
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
      include: {
        Shift: {
          select: {
            startTime: true, endTime: true, crossesMidnight: true, breakMinutes: true,
            weekOffDays: true, minHalfDayHours: true, minPresentHours: true,
          },
        },
      },
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

  const logByKey = new Map<string, { punchIn: Date | null; punchOut: Date | null }>()
  for (const l of logs) logByKey.set(`${l.employeeId}|${dateKey(new Date(l.logDate))}`, { punchIn: l.punchIn, punchOut: l.punchOut })

  const shiftByEmp = new Map<number, typeof assignments[number]['Shift']>()
  for (const a of assignments) if (!shiftByEmp.has(a.employeeId)) shiftByEmp.set(a.employeeId, a.Shift)

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

  // ── Workbook ──────────────────────────────────────────────────────
  const workbook = new ExcelJS.Workbook()
  const ws = workbook.addWorksheet('Summary Report')

  const C = {
    titleBg: 'FF1F4E79', titleFg: 'FFFFFFFF',
    headBg: 'FF2E75B6', headFg: 'FFFFFFFF',
    zebra: 'FFF2F6FC', border: 'FFBFBFBF',
    woBg: 'FFEDEDED', absentFg: 'FFC00000', presentFg: 'FF375623', totalBg: 'FFFFF2CC',
  }
  const thin = { style: 'thin' as const, color: { argb: C.border } }
  const allBorders = { top: thin, left: thin, bottom: thin, right: thin }

  const fixedCols = 6 // Contractor, Workmen, (blank), Category, Designation, ID No — starts at col B(2)
  const firstDayCol = 8 // day 1 lives in column H (index 8, 1-based)
  const lastDayCol = firstDayCol + daysInMonth - 1
  const otCol = lastDayCol + 1
  const hdCol = otCol + 1
  const leaveCol = hdCol + 1
  const mandaysCol = leaveCol + 1
  const hlCol = mandaysCol + 1
  const totalCols = hlCol

  // Column widths
  ws.getColumn(1).width = 6   // A: contractor-group label
  ws.getColumn(2).width = 20  // Contractor
  ws.getColumn(3).width = 26  // Workmen
  ws.getColumn(4).width = 3   // blank
  ws.getColumn(5).width = 14  // Category
  ws.getColumn(6).width = 20  // Designation
  ws.getColumn(7).width = 12  // ID No
  for (let c = firstDayCol; c <= lastDayCol; c++) ws.getColumn(c).width = 6
  ws.getColumn(otCol).width = 9
  ws.getColumn(hdCol).width = 9
  ws.getColumn(leaveCol).width = 9
  ws.getColumn(mandaysCol).width = 11
  ws.getColumn(hlCol).width = 8

  // ── Title band (row 1) ────────────────────────────────────────────
  const titleText = `SUMMARY REPORT — ${MON[month - 1].toUpperCase()} ${year}`
  ws.mergeCells(1, 1, 1, totalCols)
  const titleCell = ws.getCell(1, 1)
  titleCell.value = titleText
  titleCell.font = { bold: true, size: 13, color: { argb: C.titleFg } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.titleBg } }
  ws.getRow(1).height = 24

  // ── Header (row 2) ────────────────────────────────────────────────
  const header: (string | number)[] = ['']
  header[1] = 'Contractor'
  header[2] = 'Workmen'
  header[3] = ''
  header[4] = 'Category'
  header[5] = 'Designation'
  header[6] = 'ID No'
  for (let d = 1; d <= daysInMonth; d++) header[firstDayCol - 1 + d - 1] = d // firstDayCol is 1-based; array is 0-based
  header[otCol - 1] = 'Total OT'
  header[hdCol - 1] = 'Total Half Day'
  header[leaveCol - 1] = 'Total Leave'
  header[mandaysCol - 1] = 'Total Mandays'
  header[hlCol - 1] = 'Total HL'

  const headerRow = ws.getRow(2)
  header.forEach((v, i) => { headerRow.getCell(i + 1).value = v })
  headerRow.height = 30
  for (let c = 1; c <= totalCols; c++) {
    const cell = headerRow.getCell(c)
    cell.font = { bold: true, size: 9, color: { argb: C.headFg } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headBg } }
    cell.border = allBorders
  }

  // ── Employee rows ─────────────────────────────────────────────────
  let rowIdx = 3
  let gTotOT = 0, gTotHD = 0, gTotLeave = 0, gTotMandays = 0, gTotHL = 0

  for (const emp of employees) {
    const shift = shiftByEmp.get(emp.id)
    const weekOff = new Set<number>(shift?.weekOffDays ?? [0])
    const breakMin = shift?.breakMinutes ?? 60
    const startMin = parseHM(shift?.startTime) ?? 9 * 60
    let endMin = parseHM(shift?.endTime) ?? 18 * 60
    if (shift?.crossesMidnight && endMin <= startMin) endMin += 1440
    const shiftGross = Math.max(0, endMin - startMin)
    const minHalfDay = shift?.minHalfDayHours ?? 4
    const leaveSet = leaveByEmp.get(emp.id) ?? new Set<string>()
    const name = [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(' ')

    const row = ws.getRow(rowIdx)
    row.getCell(2).value = contractorName
    row.getCell(3).value = name
    row.getCell(5).value = emp.Grade?.name || ''
    row.getCell(6).value = emp.Designation?.name || ''
    row.getCell(7).value = emp.employeeCode || ''

    let totOT = 0, totHD = 0, totLeave = 0, mandays = 0, totHL = 0

    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(Date.UTC(year, month - 1, d))
      const k = dateKey(dt)
      const dow = dt.getUTCDay()
      const log = logByKey.get(`${emp.id}|${k}`)
      const hasIn = !!log?.punchIn
      const hasOut = !!log?.punchOut

      const grossMin = hasIn && hasOut ? Math.max(0, (log!.punchOut!.getTime() - log!.punchIn!.getTime()) / 60000) : 0
      const workMin = Math.max(0, grossMin - (hasIn && hasOut ? breakMin : 0))
      const workedHours = workMin / 60

      const isHL = holidaySet.has(k)
      const isWO = weekOff.has(dow)
      const isLV = leaveSet.has(k)
      const isFuture = k > todayKey

      let status = ''
      let otHours = 0
      if (isHL) {
        // Holiday: 'SP' if the workman still worked, else 'HL'.
        if (hasIn) { status = 'SP'; mandays += 1; if (workMin > 0) otHours = workMin / 60 }
        else { status = 'HL'; totHL += 1 }
      } else if (isWO) {
        // Week-off: 'P/WO' if worked (whole span is OT), else 'WO'.
        if (hasIn) { status = 'P/WO'; mandays += 1; if (workMin > 0) otHours = workMin / 60 }
        else { status = 'WO' }
      } else if (hasIn) {
        // Normal working day with a punch.
        if (hasOut && workedHours > 0 && workedHours < minHalfDay) {
          status = 'HD'; mandays += 0.5; totHD += 1
        } else {
          status = 'P'; mandays += 1
          otHours = Math.max(0, (workMin - shiftGross) / 60)
        }
      } else if (isLV) {
        status = 'L'; totLeave += 1
      } else if (!isFuture) {
        status = 'A'
      }
      // future working days → blank

      totOT += otHours

      const cell = row.getCell(firstDayCol + d - 1)
      cell.value = status
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.font = { size: 9, bold: status === 'A', color: { argb: status === 'A' ? C.absentFg : status.startsWith('P') || status === 'SP' ? C.presentFg : 'FF000000' } }
      if (status === 'WO' || status === 'HL') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.woBg } }
    }

    // Summary cells
    row.getCell(otCol).value = Math.round(totOT * 100) / 100
    row.getCell(hdCol).value = totHD
    row.getCell(leaveCol).value = totLeave
    row.getCell(mandaysCol).value = mandays
    row.getCell(hlCol).value = totHL

    gTotOT += totOT; gTotHD += totHD; gTotLeave += totLeave; gTotMandays += mandays; gTotHL += totHL

    // Row styling: borders, zebra, number formats
    const zebra = (rowIdx - 3) % 2 === 1
    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c)
      cell.border = allBorders
      if (!cell.font) cell.font = { size: 9 }
      if (!cell.alignment) cell.alignment = { vertical: 'middle' }
      if (c >= otCol) { cell.numFmt = '0.##'; cell.alignment = { horizontal: 'center', vertical: 'middle' } }
      if (zebra && !cell.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.zebra } }
    }
    row.height = 15
    rowIdx++
  }

  // ── Grand total footer row ────────────────────────────────────────
  const totalRow = ws.getRow(rowIdx)
  totalRow.getCell(2).value = 'Total'
  totalRow.getCell(otCol).value = Math.round(gTotOT * 100) / 100
  totalRow.getCell(hdCol).value = gTotHD
  totalRow.getCell(leaveCol).value = gTotLeave
  totalRow.getCell(mandaysCol).value = gTotMandays
  totalRow.getCell(hlCol).value = gTotHL
  totalRow.height = 18
  for (let c = 1; c <= totalCols; c++) {
    const cell = totalRow.getCell(c)
    cell.font = { bold: true, size: 9, color: { argb: C.titleFg } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.titleBg } }
    cell.border = allBorders
    cell.alignment = { horizontal: c >= otCol ? 'center' : 'left', vertical: 'middle' }
    if (c >= otCol) cell.numFmt = '0.##'
  }

  // Freeze the ID columns + header; add autofilter over the fixed columns.
  ws.views = [{ state: 'frozen', xSplit: 7, ySplit: 2 }]

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
