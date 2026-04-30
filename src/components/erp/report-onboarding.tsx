'use client'
import { useState, useCallback } from 'react'
import { UserCheck, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { ReportShell, StatBox, downloadExcel, fmtDate } from './report-utils'

export default function ReportOnboarding() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.fetch('/api/reports?type=onboarding').then(r => r.json())
      if (res.success) { setData(res.data); setLoaded(true) }
      else toast.error(res.error)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [])

  const completed = data.filter(c => c.status === 'completed').length
  const inProgress = data.filter(c => c.status === 'in_progress').length
  const now = new Date()
  let overdueTasks = 0
  data.forEach(c => (c.tasks || []).forEach((t: any) => {
    if (t.status !== 'completed' && t.status !== 'skipped' && t.dueDate && new Date(t.dueDate) < now) overdueTasks++
  }))

  const handleDownload = () => {
    if (!data.length) { toast.error('Generate the report first'); return }
    const headers = ['Employee ID', 'Employee Name', 'Department', 'Template', 'Status', 'Started', 'Completed', 'Total Tasks', 'Done Tasks', 'Overdue Tasks', 'Progress %']
    const rows = data.map(c => {
      const total = c.tasks?.length || 0
      const done = c.tasks?.filter((t: any) => t.status === 'completed' || t.status === 'skipped').length || 0
      const overdue = c.tasks?.filter((t: any) => t.status !== 'completed' && t.status !== 'skipped' && t.dueDate && new Date(t.dueDate) < now).length || 0
      return [
        c.Employee?.employeeCode || '',
        `${c.Employee?.firstName || ''} ${c.Employee?.lastName || ''}`.trim(),
        c.Employee?.Department?.name || '',
        c.template?.name || '',
        c.status || '',
        fmtDate(c.startedAt),
        fmtDate(c.completedAt),
        total, done, overdue,
        total > 0 ? Math.round((done / total) * 100) + '%' : '0%',
      ]
    })
    downloadExcel(rows, headers, `Onboarding_Status_Report_${new Date().toISOString().split('T')[0]}.xlsx`, 'Onboarding')
  }

  return (
    <ReportShell title="Onboarding Status Report" icon={UserCheck} color="#00d4ff" onDownload={handleDownload} loading={loading}>
      <div className="flex items-center gap-3">
        <button onClick={fetch} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-[#00d4ff] text-black text-[12px] font-bold rounded-lg hover:bg-[#00b8e0] disabled:opacity-50">
          {loading ? <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <RefreshCw size={13} />}
          {loaded ? 'Refresh' : 'Generate Report'}
        </button>
        {loaded && <span className="text-[11px] text-[#5a6878]">{data.length} checklists</span>}
      </div>

      {loaded && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="Total" value={data.length} color="#f5a623" />
            <StatBox label="Completed" value={completed} color="#00e676" />
            <StatBox label="In Progress" value={inProgress} color="#00d4ff" />
          </div>
          {overdueTasks > 0 && (
            <div className="flex items-center justify-between px-3 py-2.5 bg-[#ff3d3d]/8 border border-[#ff3d3d]/20 rounded-lg">
              <span className="text-[12px] text-[#ff3d3d] font-semibold">⚠ Overdue Tasks</span>
              <span className="text-[16px] font-bold font-mono text-[#ff3d3d]">{overdueTasks}</span>
            </div>
          )}
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
            <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-3">Checklist Progress</div>
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {data.map(c => {
                const total = c.tasks?.length || 0
                const done = c.tasks?.filter((t: any) => t.status === 'completed' || t.status === 'skipped').length || 0
                const pct = total > 0 ? Math.round((done / total) * 100) : 0
                return (
                  <div key={c.id} className="px-3 py-2.5 rounded bg-[#141920] border border-[#252e3a]/30">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-[11px] font-semibold text-[#e2e8f0]">{c.Employee?.firstName} {c.Employee?.lastName}</span>
                        <span className="text-[9px] text-[#5a6878] ml-2">{c.Employee?.employeeCode}</span>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-[2px] rounded-full ${c.status === 'completed' ? 'bg-[#00e676]/15 text-[#00e676]' : 'bg-[#00d4ff]/15 text-[#00d4ff]'}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-[4px] bg-[#252e3a] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? '#00e676' : '#f5a623' }} />
                      </div>
                      <span className="text-[9px] text-[#5a6878] font-mono">{done}/{total} · {pct}%</span>
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
