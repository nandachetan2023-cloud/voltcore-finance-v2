'use client'
import { useState, useCallback, useEffect } from 'react'
import { ClipboardList, RefreshCw, Download } from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ReportShell, StatBox, SummaryRow, downloadExcel, fmtCurrency, TOOLTIP_STYLE } from './report-utils'

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

  // Site/branch filter — narrow the loaded data to a single site if selected.
  const sites = Array.from(new Set(data.map(a => a.Employee?.Branch?.name).filter(Boolean))).sort() as string[]
  const view = siteFilter === 'all' ? data : data.filter(a => (a.Employee?.Branch?.name || '') === siteFilter)

  const present = view.filter(a => a.status === 'present').length
  const absent = view.filter(a => a.status === 'absent').length
  const late = view.filter(a => a.status === 'late').length
  const halfDay = view.filter(a => a.status === 'half_day').length
  const totalFines = view.reduce((s, a) => s + Number(a.fineAmount || 0), 0)
  const totalLateMins = view.reduce((s, a) => s + (a.lateMinutes || 0), 0)

  const byDept = new Map<string, { present: number; absent: number; late: number }>()
  view.forEach(a => {
    const d = a.Employee?.Department?.name || 'Unassigned'
    const cur = byDept.get(d) || { present: 0, absent: 0, late: 0 }
    if (a.status === 'present') cur.present++
    else if (a.status === 'absent') cur.absent++
    else if (a.status === 'late') cur.late++
    byDept.set(d, cur)
  })

  const handleDownload = () => {
    if (!view.length) { toast.error('Generate the report first'); return }
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
    const siteTag = siteFilter === 'all' ? '' : `_${siteFilter.replace(/\s+/g, '')}`
    downloadExcel(rows, headers, `Attendance_Report_${startDate}_to_${endDate}${siteTag}.xlsx`, 'Attendance')
  }

  return (
    <ReportShell title="Attendance Report" icon={ClipboardList} color="#00e676" onDownload={handleDownload} loading={loading}>
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
        {loaded && sites.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-[#5a6878] font-semibold uppercase">Site</label>
            <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="vc-input py-1.5 px-2 text-[11px] w-[160px]">
              <option value="all">All Sites</option>
              {sites.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
        {loaded && <span className="text-[11px] text-[#5a6878]">{view.length} records{siteFilter !== 'all' ? ` (of ${data.length})` : ''}</span>}
      </div>

      {/* Month Performance Register — eTimeOffice biometric block format */}
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 space-y-3">
        <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold">
          Month Performance Register (Biometric Format)
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#5a6878] font-semibold uppercase">Month</label>
            <select value={mpMonth} onChange={e => setMpMonth(Number(e.target.value))} className="vc-input py-1.5 px-2 text-[11px] w-[130px]">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#5a6878] font-semibold uppercase">Year</label>
            <select value={mpYear} onChange={e => setMpYear(Number(e.target.value))} className="vc-input py-1.5 px-2 text-[11px] w-[90px]">
              {Array.from({ length: 4 }, (_, i) => now.getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#5a6878] font-semibold uppercase">Employee</label>
            <select value={mpEmp} onChange={e => setMpEmp(e.target.value)} className="vc-input py-1.5 px-2 text-[11px] w-[240px]">
              <option value="all">All Employees</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.employeeCode} — {`${e.firstName || ''} ${e.lastName || ''}`.trim()}
                </option>
              ))}
            </select>
          </div>
          <button onClick={exportMonthPerformance} disabled={mpLoading} className="flex items-center gap-1.5 px-4 py-2 bg-[#00d4ff] text-black text-[12px] font-bold rounded-lg hover:bg-[#00b8e0] disabled:opacity-50">
            {mpLoading ? <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Download size={13} />}
            Export
          </button>
        </div>
        <div className="text-[10px] text-[#5a6878]">
          Exports the per-day IN/OUT/WORK/Break/OT/Status grid with monthly totals — one employee or all, in the biometric register layout.
        </div>
      </div>

      {loaded && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatBox label="Total Records" value={data.length} color="#e2e8f0" />
            <StatBox label="Present" value={present} color="#00e676" />
            <StatBox label="Absent" value={absent} color="#ff3d3d" />
            <StatBox label="Late" value={late} color="#ffab40" />
            <StatBox label="Half Day" value={halfDay} color="#00d4ff" />
            <StatBox label="Total Fines" value={fmtCurrency(totalFines)} color="#ff3d3d" />
          </div>

          {totalLateMins > 0 && <SummaryRow label="Total Late Minutes" value={`${totalLateMins} min`} color="#ffab40" />}

          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
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
            <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
              <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-3">By Department</div>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                <div className="grid grid-cols-4 gap-2 px-3 py-1 text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold">
                  <span>Department</span><span className="text-center text-[#00e676]">Present</span><span className="text-center text-[#ff3d3d]">Absent</span><span className="text-center text-[#ffab40]">Late</span>
                </div>
                {Array.from(byDept.entries()).map(([dept, counts]) => (
                  <div key={dept} className="grid grid-cols-4 gap-2 px-3 py-1.5 rounded bg-[#141920] border border-[#252e3a]/30 text-[10px]">
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
      )}
    </ReportShell>
  )
}
