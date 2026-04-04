'use client'

import { FileBarChart, BarChart3 } from 'lucide-react'

interface ReportCard {
  id: string
  emoji: string
  title: string
  description: string
}

const REPORTS: ReportCard[] = [
  {
    id: 'manpower',
    emoji: '👥',
    title: 'Manpower Report',
    description: 'Complete workforce analytics including headcount, site-wise distribution, trade breakdown, and manpower trends across all active projects.',
  },
  {
    id: 'attendance',
    emoji: '📋',
    title: 'Attendance Summary',
    description: 'Daily, weekly, and monthly attendance data with shift-wise breakdowns, late arrivals, early departures, and overtime summaries.',
  },
  {
    id: 'payroll',
    emoji: '💰',
    title: 'Payroll Summary',
    description: 'Monthly payroll processing details including gross pay, deductions (PF, ESI, TDS), net pay disbursements, and cost center analysis.',
  },
  {
    id: 'hse',
    emoji: '🦺',
    title: 'HSE Report',
    description: 'Health, Safety & Environment metrics covering incidents, near-misses, safety observations, work permits issued, and compliance scores.',
  },
  {
    id: 'training',
    emoji: '🎓',
    title: 'Training Matrix',
    description: 'Comprehensive skill and certification tracking matrix showing employee competencies, upcoming expiry, and training gap analysis.',
  },
  {
    id: 'statutory',
    emoji: '⚖️',
    title: 'Statutory Compliance',
    description: 'PF, ESI, Labour License, and other statutory compliance status tracker with renewal dates and penalty risk assessment.',
  },
]

export default function Reports() {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#f5a623]/10 flex items-center justify-center">
          <BarChart3 size={16} className="text-[#f5a623]" />
        </div>
        <div>
          <h2 className="text-[14px] font-bold text-[#e2e8f0]">Available Reports</h2>
          <p className="text-[10px] text-[#5a6878]">Generate and download operational reports</p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((report) => (
          <button
            key={report.id}
            className="group text-left p-4 rounded-lg bg-[#161c24] border border-[#252e3a] hover:border-[#f5a623] transition-all duration-200 hover:shadow-[0_0_20px_rgba(245,166,35,0.06)]"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#141920] border border-[#2e3a48] flex items-center justify-center text-[20px] shrink-0 group-hover:border-[#f5a623]/30 transition-colors">
                {report.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[12px] font-semibold text-[#e2e8f0] group-hover:text-[#f5a623] transition-colors">
                    {report.title}
                  </span>
                  <FileBarChart size={12} className="text-[#5a6878] group-hover:text-[#f5a623] transition-colors shrink-0" />
                </div>
                <p className="text-[10px] text-[#5a6878] leading-relaxed">
                  {report.description}
                </p>
              </div>
            </div>

            {/* Bottom action hint */}
            <div className="mt-3 pt-2.5 border-t border-[#252e3a] group-hover:border-[#f5a623]/20 transition-colors">
              <span className="text-[9px] text-[#5a6878] group-hover:text-[#f5a623] uppercase tracking-wider font-semibold transition-colors">
                Generate Report →
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
