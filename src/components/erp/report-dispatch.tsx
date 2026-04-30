'use client'
import { useState, useCallback } from 'react'
import { Send, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { ReportShell, StatBox, downloadExcel, MONTHS, MONTHS_SHORT } from './report-utils'

export default function ReportDispatch() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: 'dispatch', month: String(month), year: String(year) })
      const res = await window.fetch(`/api/reports?${params}`).then(r => r.json())
      if (res.success) { setData(res.data); setLoaded(true) }
      else toast.error(res.error)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [month, year])

  const totalRuns = data.length
  const fullyDispatched = data.filter(r => {
    const t = r.PayrollItem?.length || 0
    const d = r.PayrollItem?.filter((p: any) => p.payslipGenerated).length || 0
    return t > 0 && d === t
  }).length
  const totalItems = data.reduce((s, r) => s + (r.PayrollItem?.length || 0), 0)
  const totalDispatched = data.reduce((s, r) => s + (r.PayrollItem?.filter((p: any) => p.payslipGenerated).length || 0), 0)

  const handleDownload = () => {
    if (!data.length) { toast.error('Generate the report first'); return }
    const headers = ['Run Name', 'Month', 'Year', 'Type', 'Total Employees', 'Dispatched', 'Pending', 'Dispatch %', 'Status']
    const rows = data.map(r => {
      const total = r.PayrollItem?.length || 0
      const dispatched = r.PayrollItem?.filter((p: any) => p.payslipGenerated).length || 0
      return [
        r.name, MONTHS[r.month - 1], r.year, r.payrollType,
        total, dispatched, total - dispatched,
        total > 0 ? Math.round((dispatched / total) * 100) + '%' : '0%',
        r.status,
      ]
    })
    downloadExcel(rows, headers, `Payslip_Dispatch_Report_${MONTHS_SHORT[month - 1]}_${year}.xlsx`, 'Dispatch')
  }

  return (
    <ReportShell title="Payslip Dispatch Report" icon={Send} color="#00e676" onDownload={handleDownload} loading={loading}>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-[#5a6878] font-semibold uppercase">Month</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="vc-input py-1.5 px-2 text-[11px] w-[120px] appearance-none">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-[#5a6878] font-semibold uppercase">Year</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="vc-input py-1.5 px-2 text-[11px] w-[80px] appearance-none">
            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={fetch} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-[#00e676] text-black text-[12px] font-bold rounded-lg hover:bg-[#00c864] disabled:opacity-50">
          {loading ? <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <RefreshCw size={13} />}
          {loaded ? 'Refresh' : 'Generate Report'}
        </button>
        {loaded && <span className="text-[11px] text-[#5a6878]">{totalRuns} run{totalRuns !== 1 ? 's' : ''}</span>}
      </div>

      {loaded && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Total Runs" value={totalRuns} color="#f5a623" />
            <StatBox label="Fully Dispatched" value={fullyDispatched} color="#00e676" />
            <StatBox label="Total Payslips" value={totalItems} color="#00d4ff" />
            <StatBox label="Dispatched" value={totalDispatched} color="#00e676" />
          </div>
          {totalItems > 0 && (
            <div className="flex items-center justify-between px-3 py-2.5 bg-[#00e676]/8 border border-[#00e676]/20 rounded-lg">
              <span className="text-[12px] text-[#00e676] font-semibold">Overall Dispatch Rate</span>
              <span className="text-[18px] font-black font-mono text-[#00e676]">{Math.round((totalDispatched / totalItems) * 100)}%</span>
            </div>
          )}
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
            <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-3">Per Run Breakdown</div>
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {data.map(r => {
                const total = r.PayrollItem?.length || 0
                const dispatched = r.PayrollItem?.filter((p: any) => p.payslipGenerated).length || 0
                const pct = total > 0 ? Math.round((dispatched / total) * 100) : 0
                return (
                  <div key={r.id} className="px-3 py-2.5 rounded bg-[#141920] border border-[#252e3a]/30">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-[11px] font-semibold text-[#e2e8f0]">{MONTHS[r.month - 1]} {r.year}</span>
                        <span className="text-[9px] text-[#5a6878] ml-2">{r.payrollType}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[#5a6878]">{dispatched}/{total}</span>
                        <span className={`px-1.5 py-[1px] rounded text-[9px] font-bold ${pct === 100 ? 'bg-[#00e676]/15 text-[#00e676]' : pct > 0 ? 'bg-[#ffab40]/15 text-[#ffab40]' : 'bg-[#ff3d3d]/15 text-[#ff3d3d]'}`}>
                          {pct === 100 ? 'Complete' : pct > 0 ? 'Partial' : 'Not Sent'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-[4px] bg-[#252e3a] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? '#00e676' : '#f5a623' }} />
                      </div>
                      <span className="text-[9px] text-[#5a6878] font-mono w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                )
              })}
              {data.length === 0 && <div className="text-center py-6 text-[#5a6878] text-[11px]">No payroll runs found for this period.</div>}
            </div>
          </div>
        </div>
      )}
    </ReportShell>
  )
}
