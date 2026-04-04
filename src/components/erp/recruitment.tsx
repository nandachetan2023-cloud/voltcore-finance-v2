'use client'

import { useState, useEffect } from 'react'
import { Briefcase, Users, Send, UserCheck, Plus, ChevronRight } from 'lucide-react'

interface JobOpening {
  id: string
  position: string
  site: string
  openings: number
  applications: number
  priority: string
  status: string
  createdAt: string
}

const PIPELINE_STAGES = [
  { label: 'Applied', count: 87, color: 'text-[#e2e8f0]' },
  { label: 'Screening', count: 34, color: 'text-[#f5a623]' },
  { label: 'Interview', count: 18, color: 'text-[#00d4ff]' },
  { label: 'Technical Test', count: 12, color: 'text-[#a78bfa]' },
  { label: 'Offer Stage', count: 6, color: 'text-[#00e676]' },
  { label: 'Joined', count: 4, color: 'text-[#00e676]' },
]

function getPriorityBadge(priority: string) {
  const map: Record<string, string> = {
    High: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    Medium: 'bg-[#f5a623]/15 text-[#f5a623]',
    Low: 'bg-[#5a6878]/15 text-[#5a6878]',
  }
  return map[priority] || map['Medium']
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    Open: 'bg-[#00e676]/15 text-[#00e676]',
    Closed: 'bg-[#5a6878]/15 text-[#5a6878]',
    'On Hold': 'bg-[#ffab40]/15 text-[#ffab40]',
    Filled: 'bg-[#00d4ff]/15 text-[#00d4ff]',
  }
  return map[status] || map['Open']
}

export default function Recruitment() {
  const [openings, setOpenings] = useState<JobOpening[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/recruitment')
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        if (json.success) setOpenings(json.data)
        else throw new Error(json.error || 'Unknown error')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="vc-stat-card">
              <div className="h-4 bg-[#252e3a] rounded w-20 mb-2" />
              <div className="h-6 bg-[#252e3a] rounded w-12" />
            </div>
          ))}
        </div>
        <div className="h-64 bg-[#161c24] border border-[#252e3a] rounded-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="vc-panel p-6 text-center">
        <p className="text-[#ff3d3d] text-sm">{error}</p>
      </div>
    )
  }

  const totalApplications = openings.reduce((sum, o) => sum + o.applications, 0)

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="vc-stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase size={14} className="text-[#f5a623]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Open Positions</span>
          </div>
          <div className="text-2xl font-bold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {openings.length || 14}
          </div>
        </div>
        <div className="vc-stat-card" style={{ '--stat-color': '#00d4ff' } as React.CSSProperties}>
          <style>{`.vc-stat-card:nth-child(2)::before{background:#00d4ff}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-[#00d4ff]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Active Applicants</span>
          </div>
          <div className="text-2xl font-bold text-[#00d4ff]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {totalApplications || 87}
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(3)::before{background:#00e676}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <Send size={14} className="text-[#00e676]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Offers Sent</span>
          </div>
          <div className="text-2xl font-bold text-[#00e676]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            6
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(4)::before{background:#f5a623}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <UserCheck size={14} className="text-[#f5a623]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Hired This Month</span>
          </div>
          <div className="text-2xl font-bold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            12
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Job Openings Table */}
        <div className="lg:col-span-2 vc-panel">
          <div className="vc-panel-header">
            <Briefcase size={15} className="text-[#f5a623]" />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">Job Openings</span>
            <span className="vc-badge bg-[#f5a623]/15 text-[#f5a623] ml-auto">{openings.length} Open</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[#252e3a]">
                  <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Position</th>
                  <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Site</th>
                  <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Openings</th>
                  <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Apps</th>
                  <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Priority</th>
                  <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Status</th>
                </tr>
              </thead>
              <tbody className="max-h-96 overflow-y-auto">
                {openings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[#5a6878] text-[11px]">
                      No job openings found
                    </td>
                  </tr>
                ) : (
                  openings.slice(0, 10).map((job) => (
                    <tr key={job.id} className="border-b border-[#252e3a]/50 hover:bg-[#141920] transition-colors">
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{job.position}</td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{job.site}</td>
                      <td className="py-2.5 px-3 text-center text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{job.openings}</td>
                      <td className="py-2.5 px-3 text-center text-[#00d4ff]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{job.applications}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`vc-badge ${getPriorityBadge(job.priority)}`}>{job.priority}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`vc-badge ${getStatusBadge(job.status)}`}>{job.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Recruitment Pipeline */}
        <div className="vc-panel">
          <div className="vc-panel-header">
            <Users size={15} className="text-[#00d4ff]" />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">Recruitment Pipeline</span>
          </div>
          <div className="vc-panel-body space-y-2">
            {PIPELINE_STAGES.map((stage, idx) => (
              <div key={stage.label} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-[#141920] transition-colors group">
                <div className="w-7 h-7 rounded-md bg-[#141920] border border-[#2e3a48] flex items-center justify-center text-[10px] font-bold text-[#5a6878]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="text-[11px] font-medium text-[#e2e8f0]">{stage.label}</div>
                </div>
                <div className={`text-[14px] font-bold ${stage.color}`} style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {stage.count}
                </div>
                {idx < PIPELINE_STAGES.length - 1 && (
                  <ChevronRight size={12} className="text-[#2e3a48]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Post Job Button (floating) */}
      <div className="flex justify-end">
        <button className="vc-btn-primary flex items-center gap-1.5 py-2 px-4">
          <Plus size={14} />
          Post Job
        </button>
      </div>
    </div>
  )
}
