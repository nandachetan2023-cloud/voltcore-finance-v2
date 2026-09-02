
'use client'
import { useERPStore } from '@/store/erp-store'
import { BarChart3, Users, ClipboardList, IndianRupee, CalendarDays, AlertTriangle, UserCheck, UserX, GraduationCap, Bell, Send, Plane } from 'lucide-react'

const REPORT_CARDS = [
  { id: 'report-manpower',   icon: Users,         label: 'Manpower',         desc: 'Headcount by dept, designation, branch and status.',    color: '#f5a623' },
  { id: 'report-attendance', icon: ClipboardList,  label: 'Attendance',       desc: 'Present/absent/late summary with fines by date range.', color: '#00e676' },
  { id: 'report-payroll',    icon: IndianRupee,    label: 'Payroll',          desc: 'Gross/net/PF/ESI totals by month and year.',            color: '#00d4ff' },
  { id: 'report-leave',      icon: CalendarDays,   label: 'Leave',            desc: 'Leave requests by type, status and department.',        color: '#a78bfa' },
  { id: 'report-tour',       icon: Plane,          label: 'Tour Requests',    desc: 'Tour requests by destination, status and days.',        color: '#a78bfa' },
  { id: 'report-late-fine',  icon: AlertTriangle,  label: 'Late & Fines',     desc: 'Late arrivals and fine totals per employee.',           color: '#ffab40' },
  { id: 'report-onboarding', icon: UserCheck,      label: 'Onboarding',       desc: 'Checklist completion rates and overdue tasks.',         color: '#00d4ff' },
  { id: 'report-turnover',   icon: UserX,          label: 'Turnover / Exit',  desc: 'Resignation rate, exit reasons and feedback.',          color: '#ff3d3d' },
  { id: 'report-training',   icon: GraduationCap,  label: 'Certificates',     desc: 'Certificate expiry status and employee compliance.',    color: '#a78bfa' },
  { id: 'report-notices',    icon: Bell,           label: 'Notice Read Rate', desc: 'Per-notice read rate across all employees.',            color: '#f5a623' },
  { id: 'report-dispatch',   icon: Send,           label: 'Payslip Dispatch', desc: 'Dispatched vs pending payslips per payroll run.',       color: '#00e676' },
]

export default function Reports() {
  const { setActiveModule } = useERPStore()

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-[#f5a623]/10 rounded-xl flex items-center justify-center">
          <BarChart3 size={18} className="text-[#f5a623]" />
        </div>
        <div>
          <h2 className="text-[16px] font-bold text-[#e2e8f0]">Reports</h2>
          <p className="text-[11px] text-[#5a6878]">{REPORT_CARDS.length} live reports — all backed by real database data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {REPORT_CARDS.map(r => {
          const Icon = r.icon
          return (
            <button
              key={r.id}
              onClick={() => setActiveModule(r.id as any)}
              className="group p-4 rounded-xl bg-[#161c24] border border-[#252e3a] text-left hover:border-[#2e3a48] transition-all"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors" style={{ background: `${r.color}15` }}>
                <Icon size={20} style={{ color: r.color }} />
              </div>
              <div className="text-[13px] font-semibold text-[#e2e8f0] mb-1 group-hover:text-[#f5a623] transition-colors">{r.label}</div>
              <div className="text-[10px] text-[#5a6878] leading-relaxed">{r.desc}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
