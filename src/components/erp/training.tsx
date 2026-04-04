'use client'

import { useState } from 'react'
import { GraduationCap, Award, AlertTriangle, Clock, Plus, BookOpen, Calendar } from 'lucide-react'

interface Employee {
  id: string
  empId: string
  name: string
  email?: string
  phone?: string
  trade: string
  role: string
  site: string
  type: string
  status: string
  joiningDate: string
  certifications: string
  createdAt: string
  updatedAt: string
}

interface CertEntry {
  employee: Employee
  certification: string
  issuedBy: string
  issueDate: string
  expiry: string
  status: string
}

interface TrainingItem {
  id: string
  title: string
  date: string
  duration: string
  attendees: number
  type: string
}

const MOCK_CERTS: CertEntry[] = [
  { employee: { id: '1', empId: 'EMP001', name: 'Rajesh Kumar', trade: 'Electrical', role: 'Engineer', site: 'Singrauli', type: 'Staff', status: 'Active', joiningDate: '2022-03-15', certifications: '', createdAt: '', updatedAt: '' }, certification: 'BEE Certified Energy Manager', issuedBy: 'Bureau of Energy Efficiency', issueDate: '2024-01-15', expiry: '2025-01-15', status: 'Valid' },
  { employee: { id: '2', empId: 'EMP002', name: 'Amit Singh', trade: 'Safety', role: 'Safety Officer', site: 'Talcher', type: 'Staff', status: 'Active', joiningDate: '2021-06-01', certifications: '', createdAt: '', updatedAt: '' }, certification: 'NEBOSH IGC', issuedBy: 'NEBOSH UK', issueDate: '2023-06-10', expiry: '2024-06-10', status: 'Expiring Soon' },
  { employee: { id: '3', empId: 'EMP003', name: 'Priya Sharma', trade: 'Mechanical', role: 'Supervisor', site: 'Raigarh', type: 'Staff', status: 'Active', joiningDate: '2023-01-20', certifications: '', createdAt: '', updatedAt: '' }, certification: 'First Aid Certification', issuedBy: 'Red Cross India', issueDate: '2024-03-01', expiry: '2025-03-01', status: 'Valid' },
  { employee: { id: '4', empId: 'EMP004', name: 'Vikram Yadav', trade: 'Welding', role: 'Welder', site: 'Singrauli', type: 'Worker', status: 'Active', joiningDate: '2022-09-10', certifications: '', createdAt: '', updatedAt: '' }, certification: 'AWS CWI', issuedBy: 'American Welding Society', issueDate: '2024-02-20', expiry: '2027-02-20', status: 'Valid' },
  { employee: { id: '5', empId: 'EMP005', name: 'Deepak Tiwari', trade: 'Electrical', role: 'Technician', site: 'Vindhyachal', type: 'Staff', status: 'Active', joiningDate: '2023-05-01', certifications: '', createdAt: '', updatedAt: '' }, certification: 'Confined Space Entry', issuedBy: 'OSHA', issueDate: '2023-12-15', expiry: '2024-06-15', status: 'Expired' },
  { employee: { id: '6', empId: 'EMP006', name: 'Suresh Patel', trade: 'Civil', role: 'Foreman', site: 'Singrauli', type: 'Staff', status: 'Active', joiningDate: '2021-11-20', certifications: '', createdAt: '', updatedAt: '' }, certification: 'Height Work Safety', issuedBy: 'IRATA', issueDate: '2024-04-01', expiry: '2025-04-01', status: 'Valid' },
]

const MOCK_TRAINING: TrainingItem[] = [
  { id: '1', title: 'Fire Safety & Evacuation Drill', date: '2025-06-25', duration: '3 hours', attendees: 45, type: 'Safety' },
  { id: '2', title: 'Hazardous Material Handling', date: '2025-06-28', duration: '4 hours', attendees: 28, type: 'Safety' },
  { id: '3', title: 'Electrical Safety Refresher', date: '2025-07-02', duration: '2 hours', attendees: 62, type: 'Technical' },
  { id: '4', title: 'First Aid & CPR Training', date: '2025-07-05', duration: '6 hours', attendees: 35, type: 'Safety' },
  { id: '5', title: 'Leadership Development Program', date: '2025-07-10', duration: '8 hours', attendees: 18, type: 'Management' },
  { id: '6', title: 'Confined Space Entry Recertification', date: '2025-07-15', duration: '4 hours', attendees: 24, type: 'Safety' },
]

function getCertStatusBadge(status: string) {
  const map: Record<string, string> = {
    Valid: 'bg-[#00e676]/15 text-[#00e676]',
    'Expiring Soon': 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    Expired: 'bg-[#5a6878]/15 text-[#5a6878]',
  }
  return map[status] || map['Valid']
}

function getTrainingTypeBadge(type: string) {
  const map: Record<string, string> = {
    Safety: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    Technical: 'bg-[#00d4ff]/15 text-[#00d4ff]',
    Management: 'bg-[#f5a623]/15 text-[#f5a623]',
  }
  return map[type] || 'bg-[#5a6878]/15 text-[#5a6878]'
}

export default function Training() {
  const [loading, setLoading] = useState(false)

  const validCerts = MOCK_CERTS.filter(c => c.status === 'Valid').length
  const expiringSoon = MOCK_CERTS.filter(c => c.status === 'Expiring Soon').length

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="vc-stat-card">
              <div className="h-4 bg-[#252e3a] rounded w-24 mb-2" />
              <div className="h-6 bg-[#252e3a] rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(1)::before{background:#00e676}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <Award size={14} className="text-[#00e676]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Valid Certs</span>
          </div>
          <div className="text-2xl font-bold text-[#00e676]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            412
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(2)::before{background:#ff3d3d}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-[#ff3d3d]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Expiring ≤30d</span>
          </div>
          <div className="text-2xl font-bold text-[#ff3d3d]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            18
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(3)::before{background:#00d4ff}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap size={14} className="text-[#00d4ff]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Training This Month</span>
          </div>
          <div className="text-2xl font-bold text-[#00d4ff]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            6
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(4)::before{background:#f5a623}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-[#f5a623]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Avg Training hrs</span>
          </div>
          <div className="text-2xl font-bold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            28
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Certification Tracker */}
        <div className="lg:col-span-2 vc-panel">
          <div className="vc-panel-header">
            <Award size={15} className="text-[#f5a623]" />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">Certification Tracker</span>
            <span className="vc-badge bg-[#00e676]/15 text-[#00e676] ml-auto">{validCerts} Valid</span>
          </div>
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-[#161c24] z-10">
                <tr className="border-b border-[#252e3a]">
                  <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Employee</th>
                  <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Certification</th>
                  <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Issued By</th>
                  <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Issue Date</th>
                  <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Expiry</th>
                  <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_CERTS.map((cert, idx) => (
                  <tr key={idx} className="border-b border-[#252e3a]/50 hover:bg-[#141920] transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#f5a623] to-[#e8891a] flex items-center justify-center text-[9px] font-bold text-black shrink-0">
                          {cert.employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="text-[#e2e8f0] font-medium">{cert.employee.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[#8899aa]">{cert.certification}</td>
                    <td className="py-2.5 px-3 text-[#5a6878]">{cert.issuedBy}</td>
                    <td className="py-2.5 px-3 text-[#5a6878]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {cert.issueDate}
                    </td>
                    <td className="py-2.5 px-3 text-[#5a6878]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {cert.expiry}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`vc-badge ${getCertStatusBadge(cert.status)}`}>{cert.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Upcoming Training */}
        <div className="vc-panel">
          <div className="vc-panel-header">
            <BookOpen size={15} className="text-[#00d4ff]" />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">Upcoming Training</span>
            <span className="vc-badge bg-[#00d4ff]/15 text-[#00d4ff] ml-auto">{MOCK_TRAINING.length}</span>
          </div>
          <div className="vc-panel-body space-y-2 max-h-[420px] overflow-y-auto">
            {MOCK_TRAINING.map((training) => (
              <div key={training.id} className="p-3 rounded-lg bg-[#141920] border border-[#252e3a]/50 hover:border-[#2e3a48] transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-[#e2e8f0] leading-tight">{training.title}</span>
                  <span className={`vc-badge ${getTrainingTypeBadge(training.type)} shrink-0`}>{training.type}</span>
                </div>
                <div className="flex items-center gap-3 text-[9px] text-[#5a6878]">
                  <div className="flex items-center gap-1">
                    <Calendar size={10} />
                    <span style={{ fontFamily: "'Share Tech Mono', monospace" }}>{training.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={10} />
                    <span style={{ fontFamily: "'Share Tech Mono', monospace" }}>{training.duration}</span>
                  </div>
                </div>
                <div className="text-[9px] text-[#8899aa] mt-1.5">
                  {training.attendees} attendees
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Certificate Button */}
      <div className="flex justify-end">
        <button className="vc-btn-primary flex items-center gap-1.5 py-2 px-4">
          <Plus size={14} />
          Add Certificate
        </button>
      </div>
    </div>
  )
}
