'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  User,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

/* ---------- helpers ---------- */

const formatCurrency = (val: number) => '₹' + val.toLocaleString('en-IN')

const formatLakhs = (val: number) => {
  if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + 'Cr'
  if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + 'L'
  return formatCurrency(val)
}

/* ---------- types ---------- */

interface EmployeeInfo {
  id: string
  empId: string
  name: string
  role: string
  site: string
}

interface PayrollRecord {
  id: string
  empId: string
  month: string
  days: number
  basic: number
  hra: number
  ot: number
  gross: number
  pf: number
  esi: number
  tds: number
  netPay: number
  status: string
  createdAt: string
  updatedAt: string
  employee: EmployeeInfo
}

interface PayrollApiResponse {
  success: boolean
  data?: PayrollRecord[]
  error?: string
}

/* ---------- status badge ---------- */

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Paid: 'bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30',
    Pending: 'bg-[#ffab40]/15 text-[#ffab40] border border-[#ffab40]/30',
    Processing: 'bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30',
    Failed: 'bg-[#ff3d3d]/15 text-[#ff3d3d] border border-[#ff3d3d]/30',
    Hold: 'bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-[2px] rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${styles[status] ?? 'bg-[#5a6878]/15 text-[#5a6878] border border-[#5a6878]/30'}`}
    >
      {status === 'Paid' && <CheckCircle2 size={10} />}
      {status === 'Pending' && <Clock size={10} />}
      {status === 'Processing' && <Loader2 size={10} className="animate-spin" />}
      {status === 'Failed' && <XCircle size={10} />}
      {status === 'Hold' && <AlertTriangle size={10} />}
      {status}
    </span>
  )
}

/* ---------- stat card ---------- */

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  label: string
  value: string
  icon: React.ElementType
  color: string
  subtitle?: string
}) {
  return (
    <div className="vc-stat-card relative overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: color }}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">
            {label}
          </div>
          <div className="text-[20px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {value}
          </div>
          {subtitle && (
            <div className="text-[10px] text-[#5a6878] mt-1">{subtitle}</div>
          )}
        </div>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color}15` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  )
}

/* ---------- avatar ---------- */

function EmpAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const colors = ['#f5a623', '#00d4ff', '#00e676', '#a78bfa', '#ff3d3d', '#ffab40']
  const idx = name.length % colors.length

  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-black shrink-0"
      style={{ background: colors[idx] }}
    >
      {initials}
    </div>
  )
}

/* ---------- skeleton loaders ---------- */

function StatSkeleton() {
  return (
    <div className="vc-stat-card">
      <Skeleton className="h-3 w-24 mb-2 bg-[#1e2630]" />
      <Skeleton className="h-6 w-32 bg-[#1e2630]" />
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="vc-panel">
      <div className="vc-panel-header">
        <Skeleton className="h-4 w-36 bg-[#1e2630]" />
      </div>
      <div className="p-3 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full bg-[#1e2630]" />
        ))}
      </div>
    </div>
  )
}

/* ---------- main component ---------- */

export default function PayrollModule() {
  const [data, setData] = useState<PayrollRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPayroll() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/payroll')
        const json: PayrollApiResponse = await res.json()
        if (json.success && json.data) {
          setData(json.data)
        } else {
          setError(json.error ?? 'Failed to load payroll data')
        }
      } catch {
        setError('Network error while fetching payroll')
      } finally {
        setLoading(false)
      }
    }
    fetchPayroll()
  }, [])

  /* ---------- computed stats ---------- */

  const stats = useMemo(() => {
    if (!data.length) return { gross: 0, net: 0, pfEsi: 0, ot: 0 }
    const gross = data.reduce((s, r) => s + r.gross, 0)
    const net = data.reduce((s, r) => s + r.netPay, 0)
    const pfEsi = data.reduce((s, r) => s + r.pf + r.esi, 0)
    const ot = data.reduce((s, r) => s + r.ot, 0)
    return { gross, net, pfEsi, ot }
  }, [data])

  /* ---------- selected employee payslip ---------- */

  const selectedRecord = data[selectedIdx] ?? null

  /* ---------- statutory compliance ---------- */

  const complianceItems = [
    { label: 'PF Filed', period: 'Jan 2025', status: 'Filed' },
    { label: 'ESI Return', period: 'Q4 2024', status: 'Filed' },
    { label: 'PT Paid', period: 'Feb 2025', status: 'Paid' },
    { label: 'TDS Challan', period: 'Jan 2025', status: 'Paid' },
  ]

  /* ---------- render ---------- */

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertTriangle size={40} className="text-[#ff3d3d]" />
        <div className="text-sm text-[#e2e8f0] font-medium">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="vc-btn-primary mt-2"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Gross Payroll"
              value={formatLakhs(stats.gross)}
              icon={TrendingUp}
              color="#f5a623"
              subtitle="This month"
            />
            <StatCard
              label="Net Disbursed"
              value={formatLakhs(stats.net)}
              icon={TrendingDown}
              color="#00e676"
              subtitle="After deductions"
            />
            <StatCard
              label="PF + ESI"
              value={formatLakhs(stats.pfEsi)}
              icon={ShieldCheck}
              color="#00d4ff"
              subtitle="Employer + Employee"
            />
            <StatCard
              label="OT Paid"
              value={formatLakhs(stats.ot)}
              icon={Clock}
              color="#a78bfa"
              subtitle="Overtime hours"
            />
          </>
        )}
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[65%_1fr] gap-4">
        {/* ── LEFT: Payroll Register Table ── */}
        {loading ? (
          <TableSkeleton />
        ) : (
          <div className="vc-panel flex flex-col">
            <div className="vc-panel-header justify-between">
              <div className="flex items-center gap-2">
                <IndianRupee size={15} className="text-[#f5a623]" />
                <span className="text-[12px] font-semibold text-[#e2e8f0]">
                  Payroll Register
                </span>
              </div>
              <span className="text-[10px] text-[#5a6878]">
                {data.length} records
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-[#141920] text-[#5a6878] uppercase tracking-wider text-[9px]">
                    <th className="text-left py-2 px-3 font-semibold whitespace-nowrap">
                      Employee
                    </th>
                    <th className="text-center py-2 px-2 font-semibold whitespace-nowrap">
                      Days
                    </th>
                    <th className="text-right py-2 px-2 font-semibold whitespace-nowrap">
                      Basic
                    </th>
                    <th className="text-right py-2 px-2 font-semibold whitespace-nowrap">
                      HRA
                    </th>
                    <th className="text-right py-2 px-2 font-semibold whitespace-nowrap">
                      OT
                    </th>
                    <th className="text-right py-2 px-2 font-semibold whitespace-nowrap">
                      Gross
                    </th>
                    <th className="text-right py-2 px-2 font-semibold whitespace-nowrap">
                      PF
                    </th>
                    <th className="text-right py-2 px-2 font-semibold whitespace-nowrap">
                      Net Pay
                    </th>
                    <th className="text-center py-2 px-3 font-semibold whitespace-nowrap">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2630]">
                  {data.map((rec, idx) => {
                    const isSelected = idx === selectedIdx
                    const isExpanded = expandedRow === rec.id
                    return (
                      <tr
                        key={rec.id}
                        onClick={() => {
                          setSelectedIdx(idx)
                          setExpandedRow(isExpanded ? null : rec.id)
                        }}
                        className={`
                          cursor-pointer transition-colors duration-100
                          ${isSelected ? 'bg-[#f5a623]/5' : 'hover:bg-[#141920]'}
                        `}
                      >
                        <td className="py-[10px] px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <EmpAvatar name={rec.employee.name} />
                            <div>
                              <div className="font-semibold text-[#e2e8f0] text-[11px]">
                                {rec.employee.name}
                              </div>
                              <div className="text-[9px] text-[#5a6878]">
                                {rec.employee.role} · {rec.employee.site}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center py-[10px] px-2 text-[#8899aa]">
                          {rec.days}
                        </td>
                        <td className="text-right py-[10px] px-2 text-[#8899aa]">
                          {formatCurrency(rec.basic)}
                        </td>
                        <td className="text-right py-[10px] px-2 text-[#8899aa]">
                          {formatCurrency(rec.hra)}
                        </td>
                        <td className="text-right py-[10px] px-2 text-[#a78bfa]">
                          {rec.ot > 0 ? formatCurrency(rec.ot) : '—'}
                        </td>
                        <td className="text-right py-[10px] px-2 font-semibold text-[#e2e8f0]">
                          {formatCurrency(rec.gross)}
                        </td>
                        <td className="text-right py-[10px] px-2 text-[#ff3d3d]/80">
                          {formatCurrency(rec.pf)}
                        </td>
                        <td className="text-right py-[10px] px-2 font-bold text-[#00e676] text-[12px]">
                          {formatCurrency(rec.netPay)}
                        </td>
                        <td className="text-center py-[10px] px-3">
                          <StatusBadge status={rec.status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {data.length === 0 && (
              <div className="py-12 text-center">
                <User size={32} className="text-[#2e3a48] mx-auto mb-2" />
                <div className="text-[12px] text-[#5a6878]">
                  No payroll records found
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── RIGHT column ── */}
        <div className="space-y-4">
          {/* ── Payslip Card ── */}
          {loading ? (
            <div className="vc-panel">
              <div className="vc-panel-header">
                <Skeleton className="h-4 w-28 bg-[#1e2630]" />
              </div>
              <div className="vc-panel-body space-y-3">
                <Skeleton className="h-4 w-full bg-[#1e2630]" />
                <Skeleton className="h-4 w-3/4 bg-[#1e2630]" />
                <Skeleton className="h-8 w-1/2 bg-[#1e2630]" />
              </div>
            </div>
          ) : selectedRecord ? (
            <div className="vc-panel">
              <div className="vc-panel-header justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck size={14} className="text-[#00d4ff]" />
                  <span className="text-[12px] font-semibold text-[#e2e8f0]">
                    Payslip
                  </span>
                </div>
                <span className="text-[9px] text-[#5a6878] uppercase tracking-wider">
                  {selectedRecord.month}
                </span>
              </div>
              <div className="vc-panel-body space-y-3">
                {/* Employee header */}
                <div className="flex items-center gap-3 pb-3 border-b border-[#252e3a]">
                  <EmpAvatar name={selectedRecord.employee.name} />
                  <div>
                    <div className="text-[12px] font-semibold text-[#e2e8f0]">
                      {selectedRecord.employee.name}
                    </div>
                    <div className="text-[10px] text-[#5a6878]">
                      {selectedRecord.employee.role} · {selectedRecord.employee.empId}
                    </div>
                  </div>
                  <StatusBadge status={selectedRecord.status} />
                </div>

                {/* Earnings */}
                <div>
                  <div className="text-[9px] uppercase tracking-[1.5px] text-[#00e676] font-bold mb-2">
                    Earnings
                  </div>
                  <div className="space-y-1">
                    {[
                      { label: 'Basic Pay', value: selectedRecord.basic },
                      { label: 'HRA', value: selectedRecord.hra },
                      {
                        label: 'Site Allowance',
                        value: selectedRecord.basic * 0.1,
                      },
                      { label: 'Overtime', value: selectedRecord.ot },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex justify-between text-[11px]"
                      >
                        <span className="text-[#8899aa]">{item.label}</span>
                        <span className="text-[#e2e8f0]">
                          {formatCurrency(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <div className="text-[9px] uppercase tracking-[1.5px] text-[#ff3d3d] font-bold mb-2">
                    Deductions
                  </div>
                  <div className="space-y-1">
                    {[
                      { label: 'PF', value: selectedRecord.pf },
                      { label: 'ESI', value: selectedRecord.esi },
                      { label: 'TDS', value: selectedRecord.tds },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex justify-between text-[11px]"
                      >
                        <span className="text-[#8899aa]">{item.label}</span>
                        <span className="text-[#ff3d3d]/80">
                          −{formatCurrency(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Net Pay total */}
                <div className="pt-3 border-t border-[#252e3a]">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-bold text-[#e2e8f0] uppercase tracking-wider">
                      NET PAY
                    </span>
                    <span className="text-[18px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {formatCurrency(selectedRecord.netPay)}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#5a6878] mt-1">
                    Days worked: {selectedRecord.days} · Credit to bank
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="vc-panel">
              <div className="vc-panel-body py-8 text-center">
                <div className="text-[11px] text-[#5a6878]">
                  Select a record to view payslip
                </div>
              </div>
            </div>
          )}

          {/* ── Statutory Compliance ── */}
          {loading ? (
            <div className="vc-panel">
              <div className="vc-panel-header">
                <Skeleton className="h-4 w-32 bg-[#1e2630]" />
              </div>
              <div className="vc-panel-body space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full bg-[#1e2630]" />
                ))}
              </div>
            </div>
          ) : (
            <div className="vc-panel">
              <div className="vc-panel-header">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-[#00d4ff]" />
                  <span className="text-[12px] font-semibold text-[#e2e8f0]">
                    Statutory Compliance
                  </span>
                </div>
              </div>
              <div className="vc-panel-body space-y-2">
                {complianceItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#141920] border border-[#1e2630]"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-[#00e676]" />
                      <span className="text-[11px] text-[#e2e8f0] font-medium">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#5a6878]">
                        {item.period}
                      </span>
                      <span className="inline-flex items-center gap-1 px-[6px] py-[1px] rounded text-[8px] font-bold uppercase tracking-wider bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30">
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
