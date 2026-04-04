'use client'

import { useState, useEffect } from 'react'
import { Handshake, Users, ShieldCheck, ShieldAlert, Plus, CheckCircle, XCircle } from 'lucide-react'

interface Subcontractor {
  id: string
  name: string
  trade: string
  workers: number
  site: string
  pfReg: string
  esiReg: string
  labourLic: string
  compliance: string
  createdAt: string
}

function getComplianceBadge(compliance: string) {
  if (compliance === 'Compliant') return 'bg-[#00e676]/15 text-[#00e676]'
  return 'bg-[#ff3d3d]/15 text-[#ff3d3d]'
}

function getRegIcon(status: string) {
  if (status === 'Verified' || status === 'Yes' || status === 'Active') {
    return <CheckCircle size={12} className="text-[#00e676]" />
  }
  return <XCircle size={12} className="text-[#ff3d3d]" />
}

function getLicBadge(licence: string) {
  if (licence === 'Verified' || licence === 'Active' || licence === 'Valid') {
    return 'bg-[#00e676]/15 text-[#00e676]'
  }
  if (licence === 'Pending') {
    return 'bg-[#ffab40]/15 text-[#ffab40]'
  }
  return 'bg-[#ff3d3d]/15 text-[#ff3d3d]'
}

export default function Subcontractors() {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/subcontractors')
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        if (json.success) setSubcontractors(json.data)
        else throw new Error(json.error || 'Unknown error')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const totalWorkers = subcontractors.reduce((s, sc) => s + sc.workers, 0)
  const compliantCount = subcontractors.filter(sc => sc.compliance === 'Compliant').length
  const nonCompliantCount = subcontractors.filter(sc => sc.compliance !== 'Compliant').length

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

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(1)::before{background:#f5a623}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <Handshake size={14} className="text-[#f5a623]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Active Subcontractors</span>
          </div>
          <div className="text-2xl font-bold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {subcontractors.length}
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(2)::before{background:#00d4ff}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-[#00d4ff]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Workers Deployed</span>
          </div>
          <div className="text-2xl font-bold text-[#00d4ff]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {totalWorkers}
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(3)::before{background:#00e676}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={14} className="text-[#00e676]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Compliant</span>
          </div>
          <div className="text-2xl font-bold text-[#00e676]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {compliantCount}
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(4)::before{background:#ff3d3d}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert size={14} className="text-[#ff3d3d]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Non-Compliant</span>
          </div>
          <div className="text-2xl font-bold text-[#ff3d3d]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {nonCompliantCount}
          </div>
        </div>
      </div>

      {/* Subcontractor Register Table */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Handshake size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Subcontractor Register</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{subcontractors.length} Total</span>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-[#161c24] z-10">
              <tr className="border-b border-[#252e3a]">
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Name</th>
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Trade</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Workers</th>
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Site</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">PF Reg</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">ESI Reg</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Labour Lic</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Compliance</th>
              </tr>
            </thead>
            <tbody>
              {subcontractors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-[#5a6878] text-[11px]">
                    No subcontractors found
                  </td>
                </tr>
              ) : (
                subcontractors.map((sc) => (
                  <tr key={sc.id} className="border-b border-[#252e3a]/50 hover:bg-[#141920] transition-colors">
                    <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{sc.name}</td>
                    <td className="py-2.5 px-3 text-[#8899aa]">{sc.trade}</td>
                    <td className="py-2.5 px-3 text-center text-[#00d4ff] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {sc.workers}
                    </td>
                    <td className="py-2.5 px-3 text-[#8899aa]">{sc.site}</td>
                    <td className="py-2.5 px-3 text-center">
                      {getRegIcon(sc.pfReg)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {getRegIcon(sc.esiReg)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`vc-badge ${getLicBadge(sc.labourLic)}`}>{sc.labourLic}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`vc-badge ${getComplianceBadge(sc.compliance)}`}>{sc.compliance}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Button */}
      <div className="flex justify-end">
        <button className="vc-btn-primary flex items-center gap-1.5 py-2 px-4">
          <Plus size={14} />
          Add
        </button>
      </div>
    </div>
  )
}
