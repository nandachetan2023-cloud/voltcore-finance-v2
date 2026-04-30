'use client'
import { useState, useCallback } from 'react'
import { CalendarDays, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ReportShell, StatBox, downloadExcel, fmtDate, TOOLTIP_STYLE, COLORS } from './report-utils'

export default function ReportLeave() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setMonth(0, 1); return d.toISOString().split('T')[0] })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.fetch(`/api/reports?type=leave&startDate=${startDate}&endDate=${endDate}`).then(r => r.json())
      if (res.success) { setData(res.data); setLoaded(true) }
      else toast.error(res.error)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [startDate, endDate])

  const approved = data.filter(l => l.status === 'approved').length
  const pending = data.filter(l => l.status === 'pending').length
  const rejected = data.filter(l => l.status === 'rejected').length
  const totalDays = data.filter(l => l.status === 'approved').reduce((s, l) => s + Number(l.days || 0), 0)
  const byType = new Map<string, number>()
  const byDept = new Map<string, number>()
  data.forEach(l => {
    byType.set(l.leaveType || 'Unknown', (byType.get(l.leaveType || 'Unknown') || 0) + 1)
    const d = l.Employee?.Department?.name || 'Unassigned'
    byDept.set(d, (byDept.get(d) || 0) + 1)
  })

  const handleDownload = () => {
    if (!data.length) { toast.error('Generate the report first'); return }
    const headers = ['Employee ID', 'Employee Name', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Total Days', 'Status', 'Reason']
    const rows = data.map(l => [
      l.Employee?.employeeCode || '',
      `${l.Employee?.firstName || ''} ${l.Employee?.lastName || ''}`.trim(),
      l.Employee?.Department?.name || '',
      l.leaveType || '', fmtDate(l.fromDate), fmtDate(l.toDate),
      Number(l.days || 0), l.status || '', l.reason || '',
    ])
    downloadExcel(rows, headers, `Leave_Report_${startDate}_to_${endDate}.xlsx`, 'Leave')
  }

  return (
    <ReportShell title="Leave Report" icon={CalendarDays} color="#a78bfa" onDownload={handleDownload} loading={loading}>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-[#5a6878] font-semibold uppercase">From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="vc-input py-1.5 px-2 text-[11px] w-[140px]" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-[#5a6878] font-semibold uppercase">To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="vc-input py-1.5 px-2 text-[11px] w-[140px]" />
        </div>
        <button onClick={fetch} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-[#a78bfa] text-black text-[12px] font-bold rounded-lg hover:bg-[#9061f9] disabled:opacity-50">
          {loading ? <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <RefreshCw size={13} />}
          {loaded ? 'Refresh' : 'Generate Report'}
        </button>
        {loaded && <span className="text-[11px] text-[#5a6878]">{data.length} requests</span>}
      </div>

      {loaded && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Total Requests" value={data.length} color="#e2e8f0" />
            <StatBox label="Approved" value={approved} color="#00e676" />
            <StatBox label="Pending" value={pending} color="#ffab40" />
            <StatBox label="Rejected" value={rejected} color="#ff3d3d" />
          </div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#8899aa]">Total Approved Days</span>
              <span className="text-[16px] font-bold font-mono text-[#00e676]">{totalDays} days</span>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
              <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-3">By Leave Type</div>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Array.from(byType.entries()).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))} barSize={22}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 9 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 9 }} width={20} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {Array.from(byType.keys()).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
              <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-3">By Department</div>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                {Array.from(byDept.entries()).sort((a, b) => b[1] - a[1]).map(([d, c]) => (
                  <div key={d} className="flex items-center justify-between px-3 py-1.5 rounded bg-[#141920] border border-[#252e3a]/30 text-[10px]">
                    <span className="text-[#e2e8f0]">{d}</span>
                    <span className="font-bold font-mono text-[#a78bfa]">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </ReportShell>
  )
}
