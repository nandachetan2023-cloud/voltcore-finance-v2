'use client'
import { useState, useCallback } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { ReportShell, StatBox, downloadExcel, fmtCurrency, fmtDate } from './report-utils'

export default function ReportLateFine() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0] })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.fetch(`/api/reports?type=late-fine&startDate=${startDate}&endDate=${endDate}`).then(r => r.json())
      if (res.success) { setData(res.data); setLoaded(true) }
      else toast.error(res.error)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [startDate, endDate])

  const totalFines = data.reduce((s, a) => s + Number(a.fineAmount || 0), 0)
  const totalMins = data.reduce((s, a) => s + (a.lateMinutes || 0), 0)

  const byEmp = new Map<string, { name: string; dept: string; count: number; mins: number; fines: number }>()
  data.forEach(a => {
    const code = a.Employee?.employeeCode || '?'
    const name = `${a.Employee?.firstName || ''} ${a.Employee?.lastName || ''}`.trim()
    const dept = a.Employee?.Department?.name || ''
    const cur = byEmp.get(code) || { name, dept, count: 0, mins: 0, fines: 0 }
    cur.count++; cur.mins += (a.lateMinutes || 0); cur.fines += Number(a.fineAmount || 0)
    byEmp.set(code, cur)
  })
  const sorted = Array.from(byEmp.entries()).sort((a, b) => b[1].fines - a[1].fines)

  const handleDownload = () => {
    if (!data.length) { toast.error('Generate the report first'); return }
    const headers = ['Date', 'Employee ID', 'Employee Name', 'Department', 'Punch In', 'Late Minutes', 'Fine Amount']
    const rows = data.map(a => [
      fmtDate(a.logDate),
      a.Employee?.employeeCode || '',
      `${a.Employee?.firstName || ''} ${a.Employee?.lastName || ''}`.trim(),
      a.Employee?.Department?.name || '',
      a.punchIn ? new Date(a.punchIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
      a.lateMinutes || 0,
      Number(a.fineAmount || 0).toFixed(2),
    ])
    downloadExcel(rows, headers, `Late_Fine_Report_${startDate}_to_${endDate}.xlsx`, 'Late & Fines')
  }

  return (
    <ReportShell title="Late & Fine Report" icon={AlertTriangle} color="#ffab40" onDownload={handleDownload} loading={loading}>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-[#5a6878] font-semibold uppercase">From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="vc-input py-1.5 px-2 text-[11px] w-[140px]" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-[#5a6878] font-semibold uppercase">To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="vc-input py-1.5 px-2 text-[11px] w-[140px]" />
        </div>
        <button onClick={fetch} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-[#ffab40] text-black text-[12px] font-bold rounded-lg hover:bg-[#f59e0b] disabled:opacity-50">
          {loading ? <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <RefreshCw size={13} />}
          {loaded ? 'Refresh' : 'Generate Report'}
        </button>
        {loaded && <span className="text-[11px] text-[#5a6878]">{data.length} late incidents</span>}
      </div>

      {loaded && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="Late Incidents" value={data.length} color="#ffab40" />
            <StatBox label="Total Late Mins" value={`${totalMins} min`} color="#ffab40" />
            <StatBox label="Total Fines" value={fmtCurrency(totalFines)} color="#ff3d3d" />
          </div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
            <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-3">Employee-wise Summary (sorted by fines)</div>
            <div className="space-y-1 max-h-[320px] overflow-y-auto">
              <div className="grid grid-cols-5 gap-2 px-3 py-1 text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold">
                <span className="col-span-2">Employee</span><span className="text-center">Incidents</span><span className="text-center">Late Mins</span><span className="text-right">Fines</span>
              </div>
              {sorted.map(([code, v]) => (
                <div key={code} className="grid grid-cols-5 gap-2 px-3 py-1.5 rounded bg-[#141920] border border-[#252e3a]/30 text-[10px]">
                  <div className="col-span-2">
                    <div className="text-[#e2e8f0]">{v.name}</div>
                    <div className="text-[#5a6878] text-[9px]">{code} · {v.dept}</div>
                  </div>
                  <span className="text-center font-mono text-[#ffab40]">{v.count}x</span>
                  <span className="text-center font-mono text-[#ffab40]">{v.mins}</span>
                  <span className="text-right font-mono text-[#ff3d3d] font-bold">{fmtCurrency(v.fines)}</span>
                </div>
              ))}
              {sorted.length === 0 && <div className="text-center py-6 text-[#5a6878] text-[11px]">No late records in this period.</div>}
            </div>
          </div>
        </div>
      )}
    </ReportShell>
  )
}
