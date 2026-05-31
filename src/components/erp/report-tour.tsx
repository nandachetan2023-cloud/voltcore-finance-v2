'use client'
import { useState, useCallback } from 'react'
import { Plane, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ReportShell, StatBox, downloadExcel, fmtDate, TOOLTIP_STYLE, COLORS } from './report-utils'

interface TourRow {
  id: number
  fromDate: string
  toDate: string
  days: number
  destination: string
  purpose: string
  status: string
  appliedDate: string
  Employee: {
    employeeCode: string
    firstName: string
    lastName: string
    Department?: { name: string } | null
    Branch?: { name: string } | null
  }
}

const STATUS_COLOR: Record<string, string> = {
  approved: '#00e676', pending: '#ffab40', rejected: '#ff3d3d',
}

export default function ReportTour() {
  const [data, setData] = useState<TourRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setMonth(0, 1); return d.toISOString().split('T')[0] })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.fetch(`/api/reports?type=tour&startDate=${startDate}&endDate=${endDate}`).then(r => r.json())
      if (res.success) { setData(res.data); setLoaded(true) }
      else toast.error(res.error)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [startDate, endDate])

  const total = data.length
  const approved = data.filter(t => t.status?.toLowerCase() === 'approved').length
  const pending = data.filter(t => t.status?.toLowerCase() === 'pending').length
  const rejected = data.filter(t => t.status?.toLowerCase() === 'rejected').length
  const totalDays = data.reduce((s, t) => s + Number(t.days || 0), 0)

  // Top destinations chart
  const byDestination = (() => {
    const m: Record<string, number> = {}
    data.forEach(t => { const d = t.destination || 'Unknown'; m[d] = (m[d] || 0) + 1 })
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8)
  })()

  const handleDownload = () => {
    const headers = ['Emp Code', 'Name', 'Department', 'Site', 'Destination', 'Purpose', 'From', 'To', 'Days', 'Status', 'Applied']
    const rows = data.map(t => [
      t.Employee.employeeCode,
      `${t.Employee.firstName} ${t.Employee.lastName}`.trim(),
      t.Employee.Department?.name || '—',
      t.Employee.Branch?.name || '—',
      t.destination,
      t.purpose,
      fmtDate(t.fromDate),
      fmtDate(t.toDate),
      Number(t.days || 0),
      t.status,
      fmtDate(t.appliedDate),
    ])
    downloadExcel(rows, headers, `Tour_Report_${startDate}_to_${endDate}.xlsx`, 'Tour Requests')
  }

  return (
    <ReportShell title="Tour Requests Report" icon={Plane} color="#a78bfa" onDownload={handleDownload} loading={loading}>
      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-[10px] text-[#5a6878] uppercase tracking-wider mb-1.5">From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="vc-input" />
        </div>
        <div>
          <label className="block text-[10px] text-[#5a6878] uppercase tracking-wider mb-1.5">To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="vc-input" />
        </div>
        <button onClick={fetch} disabled={loading} className="vc-btn-primary flex items-center gap-1.5">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {loaded ? 'Refresh' : 'Load Report'}
        </button>
      </div>

      {!loaded ? (
        <div className="text-center py-12 text-[#5a6878] text-[12px]">Select a date range and load the report.</div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-[#5a6878] text-[12px]">No tour requests in this period.</div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatBox label="Total" value={total} color="#a78bfa" />
            <StatBox label="Approved" value={approved} color="#00e676" />
            <StatBox label="Pending" value={pending} color="#ffab40" />
            <StatBox label="Rejected" value={rejected} color="#ff3d3d" />
            <StatBox label="Total Days" value={totalDays} color="#00d4ff" />
          </div>

          {/* Top destinations */}
          {byDestination.length > 0 && (
            <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
              <p className="text-[11px] font-semibold text-[#e2e8f0] mb-3">Top Destinations</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byDestination}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#5a6878' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#5a6878' }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(167,139,250,0.08)' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {byDestination.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detail table */}
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-[#252e3a] bg-[#141920] text-[#5a6878]">
                    <th className="text-left py-2.5 px-3 font-semibold">Employee</th>
                    <th className="text-left py-2.5 px-3 font-semibold">Department</th>
                    <th className="text-left py-2.5 px-3 font-semibold">Destination</th>
                    <th className="text-left py-2.5 px-3 font-semibold">Purpose</th>
                    <th className="text-left py-2.5 px-3 font-semibold">Dates</th>
                    <th className="text-center py-2.5 px-3 font-semibold">Days</th>
                    <th className="text-center py-2.5 px-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(t => {
                    const color = STATUS_COLOR[t.status?.toLowerCase()] || '#5a6878'
                    return (
                      <tr key={t.id} className="border-b border-[#1e252e] last:border-0 hover:bg-[#1a2028]">
                        <td className="py-2.5 px-3">
                          <div className="text-[#e2e8f0] font-medium">{t.Employee.firstName} {t.Employee.lastName}</div>
                          <div className="text-[9px] text-[#5a6878] font-mono">{t.Employee.employeeCode}</div>
                        </td>
                        <td className="py-2.5 px-3 text-[#8899aa]">{t.Employee.Department?.name || '—'}</td>
                        <td className="py-2.5 px-3 text-[#e2e8f0]">{t.destination}</td>
                        <td className="py-2.5 px-3 text-[#8899aa] max-w-[200px] truncate">{t.purpose}</td>
                        <td className="py-2.5 px-3 text-[#8899aa] whitespace-nowrap">{fmtDate(t.fromDate)} → {fmtDate(t.toDate)}</td>
                        <td className="py-2.5 px-3 text-center text-[#e2e8f0] font-semibold">{Number(t.days)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="vc-badge" style={{ background: `${color}15`, color }}>{t.status}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </ReportShell>
  )
}
