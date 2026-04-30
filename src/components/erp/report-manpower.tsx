'use client'
import { useState, useCallback } from 'react'
import { Users, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ReportShell, StatBox, SummaryRow, downloadExcel, COLORS, TOOLTIP_STYLE, MONTHS_SHORT } from './report-utils'

export default function ReportManpower() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.fetch('/api/reports?type=manpower').then(r => r.json())
      if (res.success) { setData(res.data); setLoaded(true) }
      else toast.error(res.error)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [])

  const byDept = new Map<string, number>()
  const byDesig = new Map<string, number>()
  const byStatus = new Map<string, number>()
  const byBranch = new Map<string, number>()
  const byType = new Map<string, number>()
  data.forEach(e => {
    byDept.set(e.Department?.name || 'Unassigned', (byDept.get(e.Department?.name || 'Unassigned') || 0) + 1)
    byDesig.set(e.Designation?.name || 'Unassigned', (byDesig.get(e.Designation?.name || 'Unassigned') || 0) + 1)
    byStatus.set(e.employmentStatus || 'unknown', (byStatus.get(e.employmentStatus || 'unknown') || 0) + 1)
    byBranch.set(e.Branch?.name || 'Unassigned', (byBranch.get(e.Branch?.name || 'Unassigned') || 0) + 1)
    byType.set(e.employmentType || 'unknown', (byType.get(e.employmentType || 'unknown') || 0) + 1)
  })
  const deptArr = Array.from(byDept.entries()).sort((a, b) => b[1] - a[1])
  const STATUS_COLORS: Record<string, string> = { active: '#00e676', inactive: '#ff3d3d', notice_period: '#ffab40', on_leave: '#00d4ff', separated: '#5a6878' }

  const handleDownload = () => {
    if (!data.length) { toast.error('Generate the report first'); return }
    const headers = ['Employee ID', 'Name', 'Department', 'Designation', 'Branch', 'Employment Type', 'Status', 'Date of Joining']
    const rows = data.map(e => [
      e.employeeCode,
      `${e.firstName} ${e.lastName}`,
      e.Department?.name || '',
      e.Designation?.name || '',
      e.Branch?.name || '',
      e.employmentType || '',
      e.employmentStatus || '',
      e.dateOfJoining ? new Date(e.dateOfJoining).toLocaleDateString('en-IN') : '',
    ])
    downloadExcel(rows, headers, `Manpower_Report_${new Date().toISOString().split('T')[0]}.xlsx`, 'Manpower')
  }

  return (
    <ReportShell title="Manpower Report" icon={Users} color="#f5a623" onDownload={handleDownload} loading={loading}>
      <div className="flex items-center gap-3">
        <button onClick={fetch} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] disabled:opacity-50">
          {loading ? <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <RefreshCw size={13} />}
          {loaded ? 'Refresh' : 'Generate Report'}
        </button>
        {loaded && <span className="text-[11px] text-[#5a6878]">{data.length} employees</span>}
      </div>

      {loaded && data.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Total Employees" value={data.length} color="#f5a623" />
            <StatBox label="Departments" value={byDept.size} color="#00d4ff" />
            <StatBox label="Designations" value={byDesig.size} color="#a78bfa" />
            <StatBox label="Branches / Sites" value={byBranch.size} color="#00e676" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
              <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-3">By Employment Status</div>
              <div className="space-y-2">
                {Array.from(byStatus.entries()).map(([s, c]) => (
                  <div key={s} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#141920] border border-[#252e3a]/50">
                    <span className="text-[10px] font-semibold px-2 py-[2px] rounded-full capitalize" style={{ background: `${STATUS_COLORS[s] || '#5a6878'}15`, color: STATUS_COLORS[s] || '#5a6878' }}>{s.replace(/_/g, ' ')}</span>
                    <span className="text-[14px] font-bold font-mono" style={{ color: STATUS_COLORS[s] || '#5a6878' }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
              <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-3">By Employment Type</div>
              <div className="space-y-2">
                {Array.from(byType.entries()).map(([t, c]) => (
                  <SummaryRow key={t} label={t.replace(/_/g, ' ')} value={c} color="#00d4ff" />
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
            <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-3">Headcount by Department</div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptArr.slice(0, 12).map(([name, value]) => ({ name, value }))} barSize={22}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 9 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 9 }} width={25} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {deptArr.slice(0, 12).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
            <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-3">Top Designations</div>
            <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto">
              {Array.from(byDesig.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([d, c]) => (
                <div key={d} className="flex items-center justify-between px-3 py-1.5 rounded bg-[#141920] border border-[#252e3a]/30 text-[10px]">
                  <span className="text-[#e2e8f0] truncate flex-1">{d}</span>
                  <span className="font-bold font-mono text-[#a78bfa] ml-2">{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ReportShell>
  )
}
