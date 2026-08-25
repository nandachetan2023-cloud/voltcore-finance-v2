'use client'
import { useState, useCallback } from 'react'
import { IndianRupee, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ReportShell, StatBox, SummaryRow, downloadExcel, fmtCurrency, MONTHS, MONTHS_SHORT, TOOLTIP_STYLE, COLORS } from './report-utils'

export default function ReportPayroll() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: 'payroll', month: String(month), year: String(year) })
      const res = await window.fetch(`/api/reports?${params}`).then(r => r.json())
      if (res.success) { setData(res.data); setLoaded(true) }
      else toast.error(res.error)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [month, year])

  const allItems = data.flatMap((r: any) => r.PayrollItem || [])
  const totalGross = allItems.reduce((s, p) => s + Number(p.grossEarning || 0), 0)
  const totalNet = allItems.reduce((s, p) => s + Number(p.netPay || 0), 0)
  const totalPF = allItems.reduce((s, p) => s + Number(p.pfDeduction || 0), 0)
  const totalESI = allItems.reduce((s, p) => s + Number(p.esiDeduction || 0), 0)
  const totalPT = allItems.reduce((s, p) => s + Number(p.ptDeduction || 0), 0)
  const totalTDS = allItems.reduce((s, p) => s + Number(p.tdsDeduction || 0), 0)

  const byDept = new Map<string, number>()
  allItems.forEach(p => {
    const d = p.Employee?.Department?.name || 'Unassigned'
    byDept.set(d, (byDept.get(d) || 0) + Number(p.netPay || 0))
  })

  const handleDownload = () => {
    if (!allItems.length) { toast.error('Generate the report first'); return }
    const headers = ['Payroll Run', 'Month', 'Year', 'Type', 'Employee ID', 'Employee Name', 'Department', 'Basic Salary', 'Gross Earning', 'PF', 'ESI', 'PT', 'TDS', 'Total Deduction', 'Net Pay', 'Days Present', 'Working Days']
    const rows = data.flatMap((r: any) =>
      (r.PayrollItem || []).map((p: any) => [
        r.name, MONTHS[r.month - 1], r.year, r.payrollType,
        p.Employee?.employeeCode || '',
        `${p.Employee?.firstName || ''} ${p.Employee?.lastName || ''}`.trim(),
        p.Employee?.Department?.name || '',
        Number(p.basicSalary || 0).toFixed(2),
        Number(p.grossEarning || 0).toFixed(2),
        Number(p.pfDeduction || 0).toFixed(2),
        Number(p.esiDeduction || 0).toFixed(2),
        Number(p.ptDeduction || 0).toFixed(2),
        Number(p.tdsDeduction || 0).toFixed(2),
        Number(p.totalDeduction || 0).toFixed(2),
        Number(p.netPay || 0).toFixed(2),
        p.presentDays || 0, p.workingDays || 0,
      ])
    )
    downloadExcel(rows, headers, `Payroll_Report_${MONTHS_SHORT[month - 1]}_${year}.xlsx`, 'Payroll')
  }

  return (
    <ReportShell title="Payroll Report" icon={IndianRupee} color="#00d4ff" onDownload={handleDownload} loading={loading}>
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
        <button onClick={fetch} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-[#00d4ff] text-black text-[12px] font-bold rounded-lg hover:bg-[#00b8e0] disabled:opacity-50">
          {loading ? <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <RefreshCw size={13} />}
          {loaded ? 'Refresh' : 'Generate Report'}
        </button>
        {loaded && <span className="text-[11px] text-[#5a6878]">{allItems.length} employees · {data.length} run{data.length !== 1 ? 's' : ''}</span>}
      </div>

      {loaded && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatBox label="Payroll Runs" value={data.length} color="#f5a623" />
            <StatBox label="Employees" value={allItems.length} color="#00d4ff" />
            <StatBox label="Total Net Pay" value={fmtCurrency(totalNet)} color="#00e676" />
          </div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 space-y-2">
            <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-1">Summary</div>
            <SummaryRow label="Total Gross Pay" value={fmtCurrency(totalGross)} color="#00d4ff" />
            <SummaryRow label="Total Net Pay" value={fmtCurrency(totalNet)} color="#00e676" />
            <SummaryRow label="Total PF Deduction" value={fmtCurrency(totalPF)} color="#ff3d3d" />
            <SummaryRow label="Total ESI Deduction" value={fmtCurrency(totalESI)} color="#ff3d3d" />
            <SummaryRow label="Total PT" value={fmtCurrency(totalPT)} color="#ffab40" />
            <SummaryRow label="Total TDS" value={fmtCurrency(totalTDS)} color="#ffab40" />
          </div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
            <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-3">Earnings vs Deductions</div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ name: 'Gross', value: totalGross }, { name: 'Net Pay', value: totalNet }, { name: 'PF', value: totalPF }, { name: 'ESI', value: totalESI }, { name: 'TDS', value: totalTDS }]} barSize={28}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 9 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 9 }} width={45} tickFormatter={v => v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, '']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {['#00d4ff', '#00e676', '#ff3d3d', '#ffab40', '#a78bfa'].map((c, i) => <Cell key={i} fill={c} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {byDept.size > 0 && (
            <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
              <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-3">Net Pay by Department</div>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {Array.from(byDept.entries()).sort((a, b) => b[1] - a[1]).map(([d, v]) => (
                  <div key={d} className="flex items-center justify-between px-3 py-1.5 rounded bg-[#141920] border border-[#252e3a]/30 text-[10px]">
                    <span className="text-[#e2e8f0]">{d}</span>
                    <span className="font-bold font-mono text-[#00e676]">{fmtCurrency(v)}</span>
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
