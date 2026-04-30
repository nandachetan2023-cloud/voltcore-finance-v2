'use client'
import { useState, useCallback } from 'react'
import { UserX, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { ReportShell, StatBox, SummaryRow, downloadExcel, fmtDate } from './report-utils'

export default function ReportTurnover() {
  const [data, setData] = useState<any[]>([])
  const [totalActive, setTotalActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.fetch('/api/reports?type=turnover').then(r => r.json())
      if (res.success) { setData(res.data); setTotalActive(res.totalActive || 0); setLoaded(true) }
      else toast.error(res.error)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [])

  const approved = data.filter(r => r.status === 'approved').length
  const pending = data.filter(r => r.status === 'pending').length
  const rate = totalActive > 0 ? ((approved / totalActive) * 100).toFixed(1) : '0'
  const reasons = new Map<string, number>()
  data.forEach(r => {
    const reason = r.exitInterview?.primaryReason || 'Not recorded'
    reasons.set(reason, (reasons.get(reason) || 0) + 1)
  })
  const wouldRejoin = data.filter(r => r.exitInterview?.wouldRejoin === true).length
  const withInterview = data.filter(r => r.exitInterview).length
  const avgRating = withInterview > 0
    ? (data.filter(r => r.exitInterview?.rating).reduce((s, r) => s + r.exitInterview.rating, 0) / data.filter(r => r.exitInterview?.rating).length)
    : 0

  const handleDownload = () => {
    if (!data.length) { toast.error('Generate the report first'); return }
    const headers = ['Employee ID', 'Employee Name', 'Department', 'Date of Joining', 'Resignation Status', 'Submitted On', 'Notice Period Days', 'Exit Reason', 'Would Rejoin', 'Rating']
    const rows = data.map(r => [
      r.Employee?.employeeCode || '',
      `${r.Employee?.firstName || ''} ${r.Employee?.lastName || ''}`.trim(),
      r.Employee?.Department?.name || '',
      fmtDate(r.Employee?.dateOfJoining),
      r.status || '',
      fmtDate(r.submittedAt),
      r.noticePeriodDays || 0,
      r.exitInterview?.primaryReason || '',
      r.exitInterview?.wouldRejoin === true ? 'Yes' : r.exitInterview?.wouldRejoin === false ? 'No' : '',
      r.exitInterview?.rating || '',
    ])
    downloadExcel(rows, headers, `Turnover_Exit_Report_${new Date().toISOString().split('T')[0]}.xlsx`, 'Turnover')
  }

  return (
    <ReportShell title="Turnover / Exit Report" icon={UserX} color="#ff3d3d" onDownload={handleDownload} loading={loading}>
      <div className="flex items-center gap-3">
        <button onClick={fetch} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-[#ff3d3d] text-white text-[12px] font-bold rounded-lg hover:bg-[#e03030] disabled:opacity-50">
          {loading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <RefreshCw size={13} />}
          {loaded ? 'Refresh' : 'Generate Report'}
        </button>
        {loaded && <span className="text-[11px] text-[#5a6878]">{data.length} resignations</span>}
      </div>

      {loaded && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Total Resignations" value={data.length} color="#ff3d3d" />
            <StatBox label="Approved" value={approved} color="#ffab40" />
            <StatBox label="Pending" value={pending} color="#00d4ff" />
            <StatBox label="Turnover Rate" value={`${rate}%`} color="#ff3d3d" />
          </div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 space-y-2">
            <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-1">Exit Interview Stats</div>
            <SummaryRow label="With Exit Interview" value={`${withInterview} / ${data.length}`} color="#a78bfa" />
            {wouldRejoin > 0 && <SummaryRow label="Would Rejoin" value={`${wouldRejoin} employees`} color="#00e676" />}
            {avgRating > 0 && <SummaryRow label="Avg Company Rating" value={`${avgRating.toFixed(1)} / 5`} color="#f5a623" />}
          </div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
            <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-3">Exit Reasons</div>
            <div className="space-y-1.5">
              {Array.from(reasons.entries()).sort((a, b) => b[1] - a[1]).map(([r, c]) => (
                <div key={r} className="flex items-center justify-between px-3 py-1.5 rounded bg-[#141920] border border-[#252e3a]/30 text-[10px]">
                  <span className="text-[#e2e8f0] capitalize">{r.replace(/_/g, ' ')}</span>
                  <span className="font-bold font-mono text-[#ff3d3d]">{c}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
            <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-3">Resignation List</div>
            <div className="space-y-1 max-h-[240px] overflow-y-auto">
              {data.map(r => (
                <div key={r.id} className="flex items-center justify-between px-3 py-1.5 rounded bg-[#141920] border border-[#252e3a]/30 text-[10px]">
                  <div>
                    <span className="text-[#e2e8f0]">{r.Employee?.firstName} {r.Employee?.lastName}</span>
                    <span className="text-[#5a6878] ml-2">{r.Employee?.Department?.name}</span>
                  </div>
                  <span className="text-[#5a6878]">{fmtDate(r.submittedAt)}</span>
                  <span className={`px-1.5 py-[1px] rounded text-[9px] font-bold ${r.status === 'approved' ? 'bg-[#00e676]/15 text-[#00e676]' : r.status === 'pending' ? 'bg-[#ffab40]/15 text-[#ffab40]' : 'bg-[#5a6878]/15 text-[#5a6878]'}`}>{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ReportShell>
  )
}
