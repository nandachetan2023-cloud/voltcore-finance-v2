'use client'
import { useState, useCallback, useEffect, type ReactNode } from 'react'
import { ClipboardList, RefreshCw, Download } from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ReportShell, StatBox, SummaryRow, downloadExcel, downloadCSV, downloadPDF, fmtCurrency, TOOLTIP_STYLE } from './report-utils'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function ReportAttendance() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [siteFilter, setSiteFilter] = useState('all')
  const [deptFilter, setDeptFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [empSearch, setEmpSearch] = useState('')
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'pdf'>('excel')

  // ── Month Performance Register (eTimeOffice biometric format) ──────
  const now = new Date()
  const [mpMonth, setMpMonth] = useState(now.getMonth() + 1)
  const [mpYear, setMpYear] = useState(now.getFullYear())
  const [mpEmp, setMpEmp] = useState('all') // 'all' or an employee id
  const [employees, setEmployees] = useState<any[]>([])
  const [mpLoading, setMpLoading] = useState(false)

  useEffect(() => {
    window.fetch('/api/employees?limit=10000')
      .then(r => r.json())
      .then(res => { if (res.success) setEmployees(res.data) })
      .catch(() => {})
  }, [])

  const exportMonthPerformance = async () => {
    setMpLoading(true)
    try {
      const params = new URLSearchParams({ month: String(mpMonth), year: String(mpYear) })
      if (mpEmp !== 'all') params.set('employeeId', mpEmp)
      const res = await window.fetch(`/api/reports/month-performance?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Failed to generate report')
        return
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const filename = match?.[1] || `MonthPerformance_${MONTHS[mpMonth - 1]}${mpYear}.xlsx`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Month performance report downloaded')
    } catch {
      toast.error('Failed to generate report')
    } finally {
      setMpLoading(false)
    }
  }

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: 'attendance', startDate, endDate })
      const res = await window.fetch(`/api/reports?${params}`).then(r => r.json())
      if (res.success) { setData(res.data); setLoaded(true) }
      else toast.error(res.error)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [startDate, endDate])

  // Filter options derived from the loaded data.
  const sites = Array.from(new Set(data.map(a => a.Employee?.Branch?.name).filter(Boolean))).sort() as string[]
  const depts = Array.from(new Set(data.map(a => a.Employee?.Department?.name).filter(Boolean))).sort() as string[]
  const statuses = Array.from(new Set(data.map(a => a.status).filter(Boolean))).sort() as string[]

  // Apply all active filters (site + department + status + employee search).
  const q = empSearch.trim().toLowerCase()
  const view = data.filter(a => {
    if (siteFilter !== 'all' && (a.Employee?.Branch?.name || '') !== siteFilter) return false
    if (deptFilter !== 'all' && (a.Employee?.Department?.name || '') !== deptFilter) return false
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    if (q) {
      const name = `${a.Employee?.firstName || ''} ${a.Employee?.lastName || ''}`.toLowerCase()
      const code = (a.Employee?.employeeCode || '').toLowerCase()
      if (!name.includes(q) && !code.includes(q)) return false
    }
    return true
  })
  const filtersActive = siteFilter !== 'all' || deptFilter !== 'all' || statusFilter !== 'all' || q !== ''

  // "Present" = worked days (present + late + half-day). Late & Half Day are
  // still broken out separately below. Counting only strict 'present' hid the
  // late/half-day attendees. "Absent" counts explicit absent records (the report
  // only holds actual attendance rows, so it reflects marked absences only).
  const worked = view.filter(a => a.status === 'present' || a.status === 'late' || a.status === 'half_day').length
  const present = worked
  const absent = view.filter(a => a.status === 'absent').length
  const late = view.filter(a => a.status === 'late').length
  const halfDay = view.filter(a => a.status === 'half_day').length
  const totalFines = view.reduce((s, a) => s + Number(a.fineAmount || 0), 0)
  const totalLateMins = view.reduce((s, a) => s + (a.lateMinutes || 0), 0)

  const byDept = new Map<string, { present: number; absent: number; late: number }>()
  view.forEach(a => {
    const d = a.Employee?.Department?.name || 'Unassigned'
    const cur = byDept.get(d) || { present: 0, absent: 0, late: 0 }
    // Present column = worked (present/late/half-day); Late shown separately.
    if (a.status === 'present' || a.status === 'late' || a.status === 'half_day') cur.present++
    else if (a.status === 'absent') cur.absent++
    if (a.status === 'late') cur.late++
    byDept.set(d, cur)
  })

  const buildRows = () => {
    const headers = ['Date', 'Employee ID', 'Employee Name', 'Department', 'Site', 'Status', 'Punch In', 'Punch Out', 'Late Minutes', 'Fine Amount']
    const rows = view.map(a => [
      a.logDate ? new Date(a.logDate).toLocaleDateString('en-IN') : '',
      a.Employee?.employeeCode || '',
      `${a.Employee?.firstName || ''} ${a.Employee?.lastName || ''}`.trim(),
      a.Employee?.Department?.name || '',
      a.Employee?.Branch?.name || '',
      a.status || '',
      a.punchIn ? new Date(a.punchIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
      a.punchOut ? new Date(a.punchOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
      a.lateMinutes || 0,
      Number(a.fineAmount || 0).toFixed(2),
    ])
    return { headers, rows }
  }

  const handleDownload = (fmt: 'excel' | 'csv' | 'pdf' = exportFormat) => {
    if (!view.length) { toast.error('Generate the report first (no rows to export)'); return }
    const { headers, rows } = buildRows()
    const tags = [
      siteFilter !== 'all' ? siteFilter : '',
      deptFilter !== 'all' ? deptFilter : '',
      statusFilter !== 'all' ? statusFilter : '',
    ].filter(Boolean).map(t => `_${t.replace(/\s+/g, '')}`).join('')
    const base = `Attendance_Report_${startDate}_to_${endDate}${tags}`
    if (fmt === 'csv') downloadCSV(rows, headers, `${base}.csv`)
    else if (fmt === 'pdf') downloadPDF(rows, headers, `${base}.pdf`, `Attendance Report  ${startDate} to ${endDate}`)
    else downloadExcel(rows, headers, `${base}.xlsx`, 'Attendance', { statusColumn: 6, numericColumns: [9, 10] })
  }

  // ── Sitewise (ManHour) report — vertical, one row per employee per day,
  // grouped by employee, in the ManHour_HIL.xls column layout (only the columns
  // we hold). Status codes: P / A / WO / P/WO / SP.
  const MANHOUR_HEADERS = [
    'Contractor', 'Workmen', 'IDNo', 'Nature of Work', 'Date',
    'In Time', 'Out Time', 'Man Days', 'Man Hrs', 'OT', 'Status',
  ]

  const hoursBetween = (inT: string | null, outT: string | null): number => {
    if (!inT || !outT) return 0
    const ms = new Date(outT).getTime() - new Date(inT).getTime()
    // Handles overnight shifts (out < in → add a day).
    const h = ms >= 0 ? ms / 3.6e6 : (ms + 24 * 3.6e6) / 3.6e6
    return Math.max(0, Math.round(h * 100) / 100)
  }

  const manHourStatus = (a: any): string => {
    const s = (a.status || '').toLowerCase()
    if (s === 'week_off' || s === 'weekoff' || s === 'wo') return 'WO'
    if (s === 'absent') return 'A'
    if (a.punchIn && !a.punchOut) return 'SP'          // single punch — in, no out
    if (s === 'present' || s === 'late' || s === 'half_day') return 'P'
    return a.punchIn ? 'P' : 'A'
  }

  const fmtTime = (t: string | null) =>
    t ? new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-GB') : '' // dd/mm/yyyy

  const buildManHourRows = () => {
    // Group by employee, then order each employee's rows by date (ascending),
    // so the export reads as a per-person daily log like the reference.
    const byEmp = new Map<string, any[]>()
    for (const a of view) {
      const key = a.Employee?.employeeCode || `${a.Employee?.firstName || ''} ${a.Employee?.lastName || ''}`
      if (!byEmp.has(key)) byEmp.set(key, [])
      byEmp.get(key)!.push(a)
    }
    const rows: (string | number)[][] = []
    for (const recs of byEmp.values()) {
      recs.sort((x, y) => new Date(x.logDate).getTime() - new Date(y.logDate).getTime())
      for (const a of recs) {
        const worked = hoursBetween(a.punchIn, a.punchOut)
        // We don't store per-log OT, so derive it as worked hours beyond an
        // 8-hour standard day (0 when there's no complete in/out pair).
        const ot = worked > 8 ? Math.round((worked - 8) * 100) / 100 : 0
        const code = manHourStatus(a)
        const manDays = (code === 'P' || code === 'P/WO') ? 1 : 0
        rows.push([
          'UPASANA ASSOCIATE',
          `${a.Employee?.firstName || ''} ${a.Employee?.lastName || ''}`.trim(),
          a.Employee?.employeeCode || '',
          a.Employee?.Designation?.name || a.Employee?.Department?.name || '',
          fmtDate(a.logDate),
          fmtTime(a.punchIn),
          fmtTime(a.punchOut),
          manDays,
          worked,
          Math.round(ot * 100) / 100,
          code,
        ])
      }
    }
    return rows
  }

  const exportSitewise = () => {
    if (!view.length) { toast.error('Generate the report first (no rows to export)'); return }
    const rows = buildManHourRows()
    const site = siteFilter !== 'all' ? `_${siteFilter.replace(/\s+/g, '')}` : ''
    downloadExcel(rows, MANHOUR_HEADERS, `Sitewise_ManHour_${startDate}_to_${endDate}${site}.xlsx`, 'Attendance Report', { statusColumn: 11, numericColumns: [8, 9, 10] })
  }

  return (
    <ReportShell title="Attendance Report" icon={ClipboardList} color="#00e676" onDownload={() => handleDownload()} loading={loading}>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-[#5a6878] font-semibold uppercase">From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="vc-input py-1.5 px-2 text-[11px] w-[140px]" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-[#5a6878] font-semibold uppercase">To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="vc-input py-1.5 px-2 text-[11px] w-[140px]" />
        </div>
        <button onClick={fetch} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-[#00e676] text-black text-[12px] font-bold rounded-lg hover:bg-[#00c864] disabled:opacity-50">
          {loading ? <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <RefreshCw size={13} />}
          {loaded ? 'Refresh' : 'Generate Report'}
        </button>
        {!loaded && !loading && (
          <span className="text-[11px] text-[#5a6878]">Pick a date range and generate — filters, overview and all export formats appear below.</span>
        )}
      </div>

      {loaded && (
        <>
          {/* ── Filters ── */}
          <Section title="Filters">
            <div className="flex items-end gap-3 flex-wrap">
              <Field label="Site">
                <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="vc-input py-1.5 px-2 text-[11px] w-[150px]">
                  <option value="all">All Sites</option>
                  {sites.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Department">
                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="vc-input py-1.5 px-2 text-[11px] w-[150px]">
                  <option value="all">All Departments</option>
                  {depts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              {statuses.length > 0 && (
                <Field label="Status">
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="vc-input py-1.5 px-2 text-[11px] w-[130px]">
                    <option value="all">All Statuses</option>
                    {statuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Employee">
                <input value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder="Name or code…" className="vc-input py-1.5 px-2 text-[11px] w-[160px]" />
              </Field>
              {filtersActive && (
                <button
                  onClick={() => { setSiteFilter('all'); setDeptFilter('all'); setStatusFilter('all'); setEmpSearch('') }}
                  className="px-3 py-2 text-[11px] text-[#8899aa] hover:text-[#e2e8f0] border border-[#252e3a] rounded-lg"
                >
                  Clear filters
                </button>
              )}
              <div className="flex-1" />
              <span className="text-[11px] text-[#5a6878] pb-2">
                Showing <strong className="text-[#e2e8f0]">{view.length}</strong>{filtersActive ? ` of ${data.length}` : ''} records
              </span>
            </div>
          </Section>

          {/* ── Overview: stats + charts ── */}
          <Section title="Overview">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatBox label="Total Records" value={view.length} color="#e2e8f0" />
              <StatBox label="Present" value={present} color="#00e676" />
              <StatBox label="Absent" value={absent} color="#ff3d3d" />
              <StatBox label="Late" value={late} color="#ffab40" />
              <StatBox label="Half Day" value={halfDay} color="#00d4ff" />
              <StatBox label="Total Fines" value={fmtCurrency(totalFines)} color="#ff3d3d" />
            </div>

            {totalLateMins > 0 && <div className="mt-3"><SummaryRow label="Total Late Minutes" value={`${totalLateMins} min`} color="#ffab40" /></div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div className="bg-[#141920] border border-[#252e3a] rounded-lg p-4">
                <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-3">Status Distribution</div>
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ name: 'Present', value: present }, { name: 'Absent', value: absent }, { name: 'Late', value: late }, { name: 'Half Day', value: halfDay }].filter(d => d.value > 0)} barSize={32}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 9 }} width={25} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {['#00e676', '#ff3d3d', '#ffab40', '#00d4ff'].map((c, i) => <Cell key={i} fill={c} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {byDept.size > 0 && (
                <div className="bg-[#141920] border border-[#252e3a] rounded-lg p-4">
                  <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-3">By Department</div>
                  <div className="space-y-1.5 max-h-[184px] overflow-y-auto">
                    <div className="grid grid-cols-4 gap-2 px-3 py-1 text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold sticky top-0 bg-[#141920]">
                      <span>Department</span><span className="text-center text-[#00e676]">Present</span><span className="text-center text-[#ff3d3d]">Absent</span><span className="text-center text-[#ffab40]">Late</span>
                    </div>
                    {Array.from(byDept.entries()).map(([dept, counts]) => (
                      <div key={dept} className="grid grid-cols-4 gap-2 px-3 py-1.5 rounded bg-[#0f1419] border border-[#252e3a]/30 text-[10px]">
                        <span className="text-[#e2e8f0] truncate">{dept}</span>
                        <span className="text-center font-mono text-[#00e676]">{counts.present}</span>
                        <span className="text-center font-mono text-[#ff3d3d]">{counts.absent}</span>
                        <span className="text-center font-mono text-[#ffab40]">{counts.late}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* ── Export Reports ── */}
          <Section title="Export Reports">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Standard */}
              <ExportCard
                title="Standard Attendance"
                desc="Flat list of the filtered records — one row per attendance entry."
              >
                <div className="flex items-center gap-2">
                  <select value={exportFormat} onChange={e => setExportFormat(e.target.value as 'excel' | 'csv' | 'pdf')} className="vc-input py-1.5 px-2 text-[11px] w-[90px]">
                    <option value="excel">Excel</option>
                    <option value="csv">CSV</option>
                    <option value="pdf">PDF</option>
                  </select>
                  <button onClick={() => handleDownload()} className="flex items-center gap-1.5 px-3 py-2 bg-[#00d4ff] text-black text-[12px] font-bold rounded-lg hover:bg-[#00b8e0]">
                    <Download size={13} /> Export
                  </button>
                </div>
              </ExportCard>

              {/* Sitewise / ManHour */}
              <ExportCard
                title="Sitewise (ManHour)"
                desc="Vertical per-employee-per-day log — Man Days, Man Hrs, OT & status (P/A/WO). Respects the filters above."
              >
                <button onClick={exportSitewise} className="flex items-center gap-1.5 px-3 py-2 bg-[#00e676] text-black text-[12px] font-bold rounded-lg hover:bg-[#00c864]">
                  <Download size={13} /> Export Excel
                </button>
              </ExportCard>

              {/* Month Performance Register */}
              <ExportCard
                title="Month Performance Register"
                desc="Biometric per-day IN/OUT/WORK/OT grid with monthly totals (eTimeOffice layout)."
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <select value={mpMonth} onChange={e => setMpMonth(Number(e.target.value))} className="vc-input py-1.5 px-2 text-[11px] flex-1">
                      {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={mpYear} onChange={e => setMpYear(Number(e.target.value))} className="vc-input py-1.5 px-2 text-[11px] w-[80px]">
                      {Array.from({ length: 4 }, (_, i) => now.getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <select value={mpEmp} onChange={e => setMpEmp(e.target.value)} className="vc-input py-1.5 px-2 text-[11px] w-full">
                    <option value="all">All Employees</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.employeeCode} — {`${e.firstName || ''} ${e.lastName || ''}`.trim()}</option>
                    ))}
                  </select>
                  <button onClick={exportMonthPerformance} disabled={mpLoading} className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#00d4ff] text-black text-[12px] font-bold rounded-lg hover:bg-[#00b8e0] disabled:opacity-50">
                    {mpLoading ? <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Download size={13} />}
                    Export
                  </button>
                </div>
              </ExportCard>
            </div>
          </Section>
        </>
      )}
    </ReportShell>
  )
}

// ── Small layout helpers for an organised, sectioned report view ──
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
      <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-3">{title}</div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-[#5a6878] font-semibold uppercase">{label}</label>
      {children}
    </div>
  )
}

function ExportCard({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <div className="bg-[#141920] border border-[#252e3a] rounded-lg p-4 flex flex-col gap-3">
      <div>
        <div className="text-[12px] font-bold text-[#e2e8f0]">{title}</div>
        <div className="text-[10px] text-[#5a6878] mt-1 leading-relaxed">{desc}</div>
      </div>
      <div className="mt-auto">{children}</div>
    </div>
  )
}
