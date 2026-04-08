'use client'

import { useState } from 'react'
import { FileBarChart, BarChart3, Loader2, Calendar, Users, ClipboardList, IndianRupee, ShieldAlert, Wrench, Receipt } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

const CHART_COLORS = ['#f5a623', '#00e676', '#00d4ff', '#ff3d3d', '#a78bfa', '#ffab40', '#22d3ee', '#f472b6']

/* ------------------------------------------------------------------ */
/*  Report Definitions                                                 */
/* ------------------------------------------------------------------ */

interface ReportDef {
  id: string
  emoji: string
  title: string
  description: string
  color: string
  endpoint: string
}

const REPORTS: ReportDef[] = [
  {
    id: 'manpower',
    emoji: '👥',
    title: 'Manpower Report',
    description: 'Workforce analytics — headcount by site, trade, and status.',
    color: '#f5a623',
    endpoint: '/api/employees',
  },
  {
    id: 'attendance',
    emoji: '📋',
    title: 'Attendance Report',
    description: 'Present/absent/OT summary with date range filtering.',
    color: '#00e676',
    endpoint: '/api/attendance',
  },
  {
    id: 'payroll',
    emoji: '💰',
    title: 'Payroll Report',
    description: 'Monthly payroll — gross/net/PF/ESI totals.',
    color: '#00d4ff',
    endpoint: '/api/payroll',
  },
  {
    id: 'hse',
    emoji: '🦺',
    title: 'HSE Report',
    description: 'Incident counts by type and severity analysis.',
    color: '#ff3d3d',
    endpoint: '/api/incidents',
  },
  {
    id: 'equipment',
    emoji: '⚙️',
    title: 'Equipment Report',
    description: 'Operational vs maintenance status overview.',
    color: '#a78bfa',
    endpoint: '/api/equipment',
  },
  {
    id: 'expenses',
    emoji: '🧾',
    title: 'Expense Report',
    description: 'Pending/approved/rejected expense totals.',
    color: '#ffab40',
    endpoint: '/api/expenses',
  },
]

/* ------------------------------------------------------------------ */
/*  Report content generators                                          */
/* ------------------------------------------------------------------ */

function formatCurrency(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)} K`
  return `₹${n.toLocaleString('en-IN')}`
}

interface ReportContentProps {
  reportId: string
  data: any[]
  startDate: string
  endDate: string
}

function ReportContent({ reportId, data, startDate, endDate }: ReportContentProps) {
  if (!data || data.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="text-[#5a6878] text-sm">No data found for this report.</div>
      </div>
    )
  }

  switch (reportId) {
    case 'manpower': {
      // Group by site, trade, status
      const bySite = new Map<string, number>()
      const byTrade = new Map<string, number>()
      const byStatus = new Map<string, number>()
      data.forEach((e: any) => {
        bySite.set(e.site, (bySite.get(e.site) || 0) + 1)
        byTrade.set(e.trade, (byTrade.get(e.trade) || 0) + 1)
        byStatus.set(e.status, (byStatus.get(e.status) || 0) + 1)
      })
      const sortedSite = Array.from(bySite.entries()).sort((a, b) => b[1] - a[1])
      const sortedTrade = Array.from(byTrade.entries()).sort((a, b) => b[1] - a[1])
      const sortedStatus = Array.from(byStatus.entries()).sort((a, b) => b[1] - a[1])

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Employees', value: data.length, color: '#f5a623' },
              { label: 'Sites', value: bySite.size, color: '#00d4ff' },
              { label: 'Trades', value: byTrade.size, color: '#00e676' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-lg bg-[#141920] border border-[#252e3a] text-center">
                <div className="text-xl font-bold" style={{ fontFamily: "'Share Tech Mono', monospace", color: s.color }}>{s.value}</div>
                <div className="text-[9px] text-[#5a6878] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-2">By Site</div>
            <div className="space-y-1.5">
              {sortedSite.map(([site, count]) => (
                <div key={site} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#141920] border border-[#252e3a]/50">
                  <span className="text-[11px] text-[#e2e8f0]">{site || 'Unassigned'}</span>
                  <span className="text-[12px] font-bold text-[#f5a623]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-2">By Trade</div>
            <div className="space-y-1.5">
              {sortedTrade.map(([trade, count]) => (
                <div key={trade} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#141920] border border-[#252e3a]/50">
                  <span className="text-[11px] text-[#e2e8f0]">{trade || 'Unassigned'}</span>
                  <span className="text-[12px] font-bold text-[#00e676]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-2">By Status</div>
            <div className="space-y-1.5">
              {sortedStatus.map(([status, count]) => (
                <div key={status} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#141920] border border-[#252e3a]/50">
                  <span className={`vc-badge ${status === 'Active' ? 'bg-[#00e676]/15 text-[#00e676]' : 'bg-[#5a6878]/15 text-[#5a6878]'}`}>{status}</span>
                  <span className="text-[12px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
          {sortedSite.length > 0 && (
            <div className="mt-4">
              <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-2">Headcount by Site</div>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedSite.map(([name, value]) => ({ name, value }))} barSize={24}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 9 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 9 }} width={30} />
                    <Tooltip contentStyle={{ background: '#1a2030', border: '1px solid #252e3a', borderRadius: '8px', fontSize: '11px', color: '#e2e8f0' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {sortedSite.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )
    }

    case 'attendance': {
      const filtered = data.filter((a: any) => {
        if (startDate && a.date < startDate) return false
        if (endDate && a.date > endDate) return false
        return true
      })
      const present = filtered.filter((a: any) => a.status === 'Present').length
      const absent = filtered.filter((a: any) => a.status === 'Absent').length
      const onLeave = filtered.filter((a: any) => a.status === 'On Leave').length
      const totalOT = filtered.reduce((s: number, a: any) => s + (a.otHours || 0), 0).toFixed(1)

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Records', value: filtered.length, color: '#e2e8f0' },
              { label: 'Present', value: present, color: '#00e676' },
              { label: 'Absent', value: absent, color: '#ff3d3d' },
              { label: 'On Leave', value: onLeave, color: '#a78bfa' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-lg bg-[#141920] border border-[#252e3a] text-center">
                <div className="text-xl font-bold" style={{ fontFamily: "'Share Tech Mono', monospace", color: s.color }}>{s.value}</div>
                <div className="text-[9px] text-[#5a6878] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#00d4ff]/5 border border-[#00d4ff]/15">
            <span className="text-[11px] text-[#8899aa]">Total OT Hours</span>
            <span className="text-[16px] font-bold text-[#00d4ff]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{totalOT}</span>
          </div>
          <div className="h-[160px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Present', value: present, fill: '#00e676' },
                { name: 'Absent', value: absent, fill: '#ff3d3d' },
                { name: 'On Leave', value: onLeave, fill: '#a78bfa' },
              ].filter(d => d.value > 0)} layout="vertical" barSize={20}>
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 9 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 10 }} width={60} />
                <Tooltip contentStyle={{ background: '#1a2030', border: '1px solid #252e3a', borderRadius: '8px', fontSize: '11px', color: '#e2e8f0' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {['#00e676', '#ff3d3d', '#a78bfa'].map((color, i) => <Cell key={i} fill={color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-2">Recent Records</div>
            <div className="max-h-[200px] overflow-y-auto space-y-1">
              {filtered.slice(0, 15).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between px-3 py-1.5 rounded bg-[#141920] border border-[#252e3a]/30 text-[10px]">
                  <span className="text-[#e2e8f0]">{a.employee?.name || a.empId}</span>
                  <span className="text-[#5a6878]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{a.date}</span>
                  <span className={`vc-badge ${a.status === 'Present' ? 'bg-[#00e676]/15 text-[#00e676]' : a.status === 'Absent' ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' : 'bg-[#a78bfa]/15 text-[#a78bfa]'}`}>{a.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    case 'payroll': {
      const totalGross = data.reduce((s: number, p: any) => s + (p.gross || 0), 0)
      const totalNet = data.reduce((s: number, p: any) => s + (p.netPay || 0), 0)
      const totalPF = data.reduce((s: number, p: any) => s + (p.pf || 0), 0)
      const totalESI = data.reduce((s: number, p: any) => s + (p.esi || 0), 0)
      const totalTDS = data.reduce((s: number, p: any) => s + (p.tds || 0), 0)
      const paid = data.filter((p: any) => p.status === 'Paid').length
      const pending = data.filter((p: any) => p.status === 'Pending').length

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Employees', value: data.length, color: '#e2e8f0' },
              { label: 'Paid', value: paid, color: '#00e676' },
              { label: 'Pending', value: pending, color: '#f5a623' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-lg bg-[#141920] border border-[#252e3a] text-center">
                <div className="text-xl font-bold" style={{ fontFamily: "'Share Tech Mono', monospace", color: s.color }}>{s.value}</div>
                <div className="text-[9px] text-[#5a6878] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[
              { label: 'Total Gross Pay', value: totalGross, color: '#00d4ff' },
              { label: 'Total Net Pay', value: totalNet, color: '#00e676' },
              { label: 'Total PF Deduction', value: totalPF, color: '#ff3d3d' },
              { label: 'Total ESI Deduction', value: totalESI, color: '#ff3d3d' },
              { label: 'Total TDS', value: totalTDS, color: '#ffab40' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#141920] border border-[#252e3a]/50">
                <span className="text-[11px] text-[#8899aa]">{row.label}</span>
                <span className="text-[13px] font-bold" style={{ fontFamily: "'Share Tech Mono', monospace", color: row.color }}>{formatCurrency(row.value)}</span>
              </div>
            ))}
          </div>
          <div className="h-[180px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Gross', value: totalGross },
                { name: 'Net Pay', value: totalNet },
                { name: 'PF', value: totalPF },
                { name: 'ESI', value: totalESI },
                { name: 'TDS', value: totalTDS },
              ]} barSize={24}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 9 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 9 }} width={40} tickFormatter={(v) => v >= 100000 ? `${(v/100000).toFixed(1)}L` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
                <Tooltip contentStyle={{ background: '#1a2030', border: '1px solid #252e3a', borderRadius: '8px', fontSize: '11px', color: '#e2e8f0' }} formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, '']} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {['#00d4ff', '#00e676', '#ff3d3d', '#ffab40', '#a78bfa'].map((color, i) => <Cell key={i} fill={color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )
    }

    case 'hse': {
      const byType = new Map<string, number>()
      const bySeverity = new Map<string, number>()
      const byStatus = new Map<string, number>()
      data.forEach((i: any) => {
        byType.set(i.type, (byType.get(i.type) || 0) + 1)
        bySeverity.set(i.severity, (bySeverity.get(i.severity) || 0) + 1)
        byStatus.set(i.status, (byStatus.get(i.status) || 0) + 1)
      })

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Incidents', value: data.length, color: '#ff3d3d' },
              { label: 'Under Investigation', value: byStatus.get('Investigating') || 0, color: '#ffab40' },
              { label: 'Closed', value: byStatus.get('Closed') || 0, color: '#00e676' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-lg bg-[#141920] border border-[#252e3a] text-center">
                <div className="text-xl font-bold" style={{ fontFamily: "'Share Tech Mono', monospace", color: s.color }}>{s.value}</div>
                <div className="text-[9px] text-[#5a6878] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-2">By Type</div>
            {Array.from(byType.entries()).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#141920] border border-[#252e3a]/50 mb-1.5">
                <span className="text-[11px] text-[#e2e8f0]">{type}</span>
                <span className="text-[12px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{count}</span>
              </div>
            ))}
          </div>
          {byType.size > 0 && (
            <div className="mt-4">
              <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-2">Incidents by Type</div>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Array.from(byType.entries()).map(([name, value]) => ({ name, value }))} barSize={24}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 9 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 9 }} width={20} />
                    <Tooltip contentStyle={{ background: '#1a2030', border: '1px solid #252e3a', borderRadius: '8px', fontSize: '11px', color: '#e2e8f0' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {Array.from(byType.keys()).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <div>
            <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-2">By Severity</div>
            {Array.from(bySeverity.entries()).map(([sev, count]) => {
              const color = sev === 'High' ? '#ff3d3d' : sev === 'Medium' ? '#ffab40' : '#00e676'
              return (
                <div key={sev} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#141920] border border-[#252e3a]/50 mb-1.5">
                  <span className="text-[11px] text-[#e2e8f0]">{sev}</span>
                  <span className="text-[12px] font-bold" style={{ fontFamily: "'Share Tech Mono', monospace", color }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    case 'equipment': {
      const byStatus = new Map<string, number>()
      data.forEach((e: any) => {
        byStatus.set(e.status, (byStatus.get(e.status) || 0) + 1)
      })
      const operational = byStatus.get('Operational') || 0
      const maintenance = byStatus.get('Under Maintenance') || 0
      const breakdown = byStatus.get('Breakdown') || 0

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Equipment', value: data.length, color: '#e2e8f0' },
              { label: 'Operational', value: operational, color: '#00e676' },
              { label: 'Under Maintenance', value: maintenance, color: '#f5a623' },
              { label: 'Breakdown', value: breakdown, color: '#ff3d3d' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-lg bg-[#141920] border border-[#252e3a] text-center">
                <div className="text-xl font-bold" style={{ fontFamily: "'Share Tech Mono', monospace", color: s.color }}>{s.value}</div>
                <div className="text-[9px] text-[#5a6878] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          {(operational > 0 || maintenance > 0 || breakdown > 0) && (
            <div className="mt-4">
              <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-2">Status Distribution</div>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[
                      { name: 'Operational', value: operational },
                      { name: 'Maintenance', value: maintenance },
                      { name: 'Breakdown', value: breakdown },
                    ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                      {['#00e676', '#f5a623', '#ff3d3d'].map((color, i) => <Cell key={i} fill={color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1a2030', border: '1px solid #252e3a', borderRadius: '8px', fontSize: '11px', color: '#e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <div>
            <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-2">Equipment List</div>
            <div className="max-h-[200px] overflow-y-auto space-y-1">
              {data.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between px-3 py-1.5 rounded bg-[#141920] border border-[#252e3a]/30 text-[10px]">
                  <span className="text-[#e2e8f0]">{e.name}</span>
                  <span className="text-[#5a6878]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{e.eqId}</span>
                  <span className={`vc-badge ${e.status === 'Operational' ? 'bg-[#00e676]/15 text-[#00e676]' : e.status === 'Under Maintenance' ? 'bg-[#f5a623]/15 text-[#f5a623]' : 'bg-[#ff3d3d]/15 text-[#ff3d3d]'}`}>{e.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    case 'expenses': {
      const pending = data.filter((e: any) => e.status === 'Pending').length
      const approved = data.filter((e: any) => e.status === 'Approved').length
      const rejected = data.filter((e: any) => e.status === 'Rejected').length
      const pendingAmt = data.filter((e: any) => e.status === 'Pending').reduce((s: number, e: any) => s + (e.amount || 0), 0)
      const approvedAmt = data.filter((e: any) => e.status === 'Approved').reduce((s: number, e: any) => s + (e.amount || 0), 0)
      const totalAmt = data.reduce((s: number, e: any) => s + (e.amount || 0), 0)

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Claims', value: data.length, color: '#e2e8f0' },
              { label: 'Pending', value: pending, color: '#f5a623' },
              { label: 'Approved', value: approved, color: '#00e676' },
              { label: 'Rejected', value: rejected, color: '#ff3d3d' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-lg bg-[#141920] border border-[#252e3a] text-center">
                <div className="text-xl font-bold" style={{ fontFamily: "'Share Tech Mono', monospace", color: s.color }}>{s.value}</div>
                <div className="text-[9px] text-[#5a6878] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[
              { label: 'Total Amount', value: totalAmt, color: '#00d4ff' },
              { label: 'Pending Amount', value: pendingAmt, color: '#f5a623' },
              { label: 'Approved Amount', value: approvedAmt, color: '#00e676' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#141920] border border-[#252e3a]/50">
                <span className="text-[11px] text-[#8899aa]">{row.label}</span>
                <span className="text-[13px] font-bold" style={{ fontFamily: "'Share Tech Mono', monospace", color: row.color }}>{formatCurrency(row.value)}</span>
              </div>
            ))}
          </div>
          <div className="h-[180px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Pending', value: pendingAmt },
                { name: 'Approved', value: approvedAmt },
                { name: 'Total', value: totalAmt },
              ].filter(d => d.value > 0)} barSize={24}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 9 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 9 }} width={40} tickFormatter={(v) => v >= 100000 ? `${(v/100000).toFixed(1)}L` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
                <Tooltip contentStyle={{ background: '#1a2030', border: '1px solid #252e3a', borderRadius: '8px', fontSize: '11px', color: '#e2e8f0' }} formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, '']} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {['#f5a623', '#00e676', '#00d4ff'].map((color, i) => <Cell key={i} fill={color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-2">Recent Claims</div>
            <div className="max-h-[200px] overflow-y-auto space-y-1">
              {data.slice(0, 15).map((e: any) => (
                <div key={e.id} className="flex items-center justify-between px-3 py-1.5 rounded bg-[#141920] border border-[#252e3a]/30 text-[10px]">
                  <span className="text-[#e2e8f0]">{e.employee?.name || e.empId}</span>
                  <span className="text-[#5a6878]">{e.category}</span>
                  <span className="text-[#00d4ff]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{formatCurrency(e.amount)}</span>
                  <span className={`vc-badge ${e.status === 'Approved' ? 'bg-[#00e676]/15 text-[#00e676]' : e.status === 'Pending' ? 'bg-[#f5a623]/15 text-[#f5a623]' : 'bg-[#ff3d3d]/15 text-[#ff3d3d]'}`}>{e.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    default:
      return <div className="text-[#5a6878] text-sm py-4">Unknown report type.</div>
  }
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function Reports() {
  const [generating, setGenerating] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any[] | null>(null)
  const [activeReport, setActiveReport] = useState<ReportDef | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const handleGenerate = async (report: ReportDef) => {
    setGenerating(report.id)
    setReportData(null)

    try {
      const res = await fetch(report.endpoint)
      const json = await res.json()

      if (json.success) {
        setReportData(json.data)
        setActiveReport(report)
        setDialogOpen(true)
        toast.success(`${report.title} generated`)
      } else {
        toast.error('Failed to generate report')
      }
    } catch {
      toast.error('Network error generating report')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#f5a623]/10 flex items-center justify-center">
            <BarChart3 size={16} className="text-[#f5a623]" />
          </div>
          <div>
            <h2 className="text-[14px] font-bold text-[#e2e8f0]">Available Reports</h2>
            <p className="text-[10px] text-[#5a6878]">Generate and download operational reports</p>
          </div>
        </div>
        {/* Date range filter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Calendar size={12} className="text-[#5a6878]" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="vc-input py-1 px-2 text-[10px] w-[140px]"
              style={{ fontFamily: "'Share Tech Mono', monospace" }}
            />
          </div>
          <span className="text-[#5a6878] text-[10px]">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="vc-input py-1 px-2 text-[10px] w-[140px]"
            style={{ fontFamily: "'Share Tech Mono', monospace" }}
          />
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((report) => (
          <div
            key={report.id}
            className="group p-4 rounded-lg bg-[#161c24] border border-[#252e3a] hover:border-[#252e3a] transition-all duration-200"
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-lg bg-[#141920] border border-[#2e3a48] flex items-center justify-center text-[20px] shrink-0 group-hover:border-[#2e3a48] transition-colors"
              >
                {report.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[12px] font-semibold text-[#e2e8f0] group-hover:text-[#e2e8f0] transition-colors">
                    {report.title}
                  </span>
                  <FileBarChart size={12} className="text-[#5a6878] shrink-0" />
                </div>
                <p className="text-[10px] text-[#5a6878] leading-relaxed">
                  {report.description}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleGenerate(report)}
              disabled={generating === report.id}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer disabled:opacity-50"
              style={{
                background: `${report.color}15`,
                color: report.color,
                borderColor: `${report.color}30`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${report.color}25`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `${report.color}15`
              }}
            >
              {generating === report.id ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileBarChart size={12} />
                  Generate Report
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* ===== REPORT DIALOG ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2" style={{ color: activeReport?.color || '#f5a623' }}>
              <FileBarChart size={14} />
              {activeReport?.title}
            </DialogTitle>
            <div className="text-[10px] text-[#5a6878] mt-1">
              {reportData?.length || 0} records{startDate && endDate ? ` from ${startDate} to ${endDate}` : ''}
            </div>
          </DialogHeader>
          {reportData ? (
            <ReportContent
              reportId={activeReport?.id || ''}
              data={reportData}
              startDate={startDate}
              endDate={endDate}
            />
          ) : (
            <div className="py-8 text-center">
              <Loader2 size={24} className="animate-spin mx-auto text-[#5a6878] mb-3" />
              <div className="text-[#5a6878] text-sm">Loading report...</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
