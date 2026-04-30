'use client'
import { useState, useCallback } from 'react'
import { Bell, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { ReportShell, StatBox, downloadExcel, fmtDate } from './report-utils'

export default function ReportNotices() {
  const [data, setData] = useState<any[]>([])
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.fetch('/api/reports?type=notices').then(r => r.json())
      if (res.success) { setData(res.data); setTotalEmployees(res.totalEmployees || 0); setLoaded(true) }
      else toast.error(res.error)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [])

  const totalReads = data.reduce((s, n) => s + (n._count?.reads || 0), 0)
  const pinned = data.filter(n => n.isPinned).length
  const avgRate = data.length > 0 && totalEmployees > 0
    ? Math.round((totalReads / (data.length * totalEmployees)) * 100)
    : 0

  const handleDownload = () => {
    if (!data.length) { toast.error('Generate the report first'); return }
    const headers = ['Title', 'Type', 'Target Dept', 'Target Designation', 'Published', 'Expires', 'Pinned', 'Reads', 'Total Employees', 'Read Rate %', 'Sender']
    const rows = data.map(n => [
      n.title, n.type,
      n.targetDept || 'All Staff',
      n.targetDesig || 'All',
      fmtDate(n.publishedAt), fmtDate(n.expiresAt),
      n.isPinned ? 'Yes' : 'No',
      n._count?.reads || 0,
      totalEmployees,
      totalEmployees > 0 ? Math.round(((n._count?.reads || 0) / totalEmployees) * 100) + '%' : '0%',
      n.createdByName || '',
    ])
    downloadExcel(rows, headers, `Notice_Read_Rate_Report_${new Date().toISOString().split('T')[0]}.xlsx`, 'Notices')
  }

  return (
    <ReportShell title="Notice Read Rate Report" icon={Bell} color="#f5a623" onDownload={handleDownload} loading={loading}>
      <div className="flex items-center gap-3">
        <button onClick={fetch} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] disabled:opacity-50">
          {loading ? <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <RefreshCw size={13} />}
          {loaded ? 'Refresh' : 'Generate Report'}
        </button>
        {loaded && <span className="text-[11px] text-[#5a6878]">{data.length} notices · {totalEmployees} employees</span>}
      </div>

      {loaded && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Total Notices" value={data.length} color="#f5a623" />
            <StatBox label="Pinned" value={pinned} color="#ffab40" />
            <StatBox label="Total Reads" value={totalReads} color="#00e676" />
            <StatBox label="Avg Read Rate" value={`${avgRate}%`} color="#00d4ff" />
          </div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
            <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-3">Read Rate per Notice</div>
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {data.map(n => {
                const reads = n._count?.reads || 0
                const pct = totalEmployees > 0 ? Math.round((reads / totalEmployees) * 100) : 0
                return (
                  <div key={n.id} className="px-3 py-2.5 rounded bg-[#141920] border border-[#252e3a]/30">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {n.isPinned && <span className="text-[#f5a623] text-[10px]">📌</span>}
                        <span className="text-[11px] font-semibold text-[#e2e8f0] truncate">{n.title}</span>
                        <span className="text-[9px] px-1.5 py-[1px] rounded font-bold shrink-0" style={{ background: '#f5a62315', color: '#f5a623' }}>{n.type}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#00e676] ml-3 shrink-0">{reads}/{totalEmployees}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-[4px] bg-[#252e3a] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#00e676]" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[9px] text-[#5a6878] font-mono w-8 text-right">{pct}%</span>
                    </div>
                    <div className="text-[9px] text-[#5a6878] mt-1">
                      {n.targetDept ? `Dept: ${n.targetDept}` : n.targetDesig ? `Desig: ${n.targetDesig}` : 'All Staff'} · {fmtDate(n.publishedAt)} · By {n.createdByName}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </ReportShell>
  )
}
