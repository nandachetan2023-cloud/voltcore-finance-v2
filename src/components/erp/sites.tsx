'use client'

import { useState, useEffect } from 'react'
import { MapPin, Globe, Users, Building2, User } from 'lucide-react'

interface Site {
  id: string
  name: string
  state: string
  project: string
  manpower: number
  incharge: string
  status: string
  createdAt: string
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    Active: 'bg-[#00e676]/15 text-[#00e676]',
    Closing: 'bg-[#00d4ff]/15 text-[#00d4ff]',
    Slow: 'bg-[#ffab40]/15 text-[#ffab40]',
    HO: 'bg-[#00e676]/15 text-[#00e676]',
    Inactive: 'bg-[#5a6878]/15 text-[#5a6878]',
  }
  return map[status] || map['Active']
}

export default function Sites() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/sites')
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        if (json.success) setSites(json.data)
        else throw new Error(json.error || 'Unknown error')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const activeSites = sites.filter(s => s.status === 'Active' || s.status === 'HO').length
  const uniqueStates = new Set(sites.map(s => s.state)).size
  const totalManpower = sites.reduce((s, site) => s + site.manpower, 0)

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
            <MapPin size={14} className="text-[#f5a623]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Active Sites</span>
          </div>
          <div className="text-2xl font-bold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {activeSites}
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(2)::before{background:#00d4ff}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <Globe size={14} className="text-[#00d4ff]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">States</span>
          </div>
          <div className="text-2xl font-bold text-[#00d4ff]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {uniqueStates}
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(3)::before{background:#00e676}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-[#00e676]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Total Manpower</span>
          </div>
          <div className="text-2xl font-bold text-[#00e676]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {totalManpower}
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(4)::before{background:#f5a623}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={14} className="text-[#f5a623]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Contract Value</span>
          </div>
          <div className="text-2xl font-bold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            ₹842Cr
          </div>
        </div>
      </div>

      {/* Site Overview Table */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <MapPin size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Site Overview</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{sites.length} Sites</span>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-[#161c24] z-10">
              <tr className="border-b border-[#252e3a]">
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Site Name</th>
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">State</th>
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Project</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Manpower</th>
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Area Incharge</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {sites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#5a6878] text-[11px]">
                    No sites found
                  </td>
                </tr>
              ) : (
                sites.map((site) => (
                  <tr key={site.id} className="border-b border-[#252e3a]/50 hover:bg-[#141920] transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-[#f5a623] shrink-0" />
                        <span className="text-[#e2e8f0] font-medium">{site.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[#8899aa]">{site.state}</td>
                    <td className="py-2.5 px-3 text-[#8899aa]">{site.project}</td>
                    <td className="py-2.5 px-3 text-center text-[#00e676] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {site.manpower}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <User size={11} className="text-[#5a6878]" />
                        <span className="text-[#e2e8f0]">{site.incharge}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`vc-badge ${getStatusBadge(site.status)}`}>{site.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
