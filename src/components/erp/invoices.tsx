'use client'

import { useState, useEffect } from 'react'
import { FileText, TrendingUp, AlertTriangle, Clock, Plus } from 'lucide-react'

interface Invoice {
  id: string
  invNo: string
  client: string
  project: string
  amount: string
  date: string
  dueDate: string
  status: string
  createdAt: string
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    'Under Review': 'bg-[#00d4ff]/15 text-[#00d4ff]',
    Approved: 'bg-[#00e676]/15 text-[#00e676]',
    Paid: 'bg-[#00e676]/15 text-[#00e676]',
    'Partially Paid': 'bg-[#f5a623]/15 text-[#f5a623]',
    Overdue: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    Cancelled: 'bg-[#5a6878]/15 text-[#5a6878]',
    Rejected: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
  }
  return map[status] || map['Under Review']
}

function parseAmount(amountStr: string): number {
  const cleaned = amountStr.replace(/[^0-9.]/g, '')
  return parseFloat(cleaned) || 0
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/invoices')
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        if (json.success) setInvoices(json.data)
        else throw new Error(json.error || 'Unknown error')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const totalAmount = invoices.reduce((s, inv) => s + parseAmount(inv.amount), 0)
  const paidAmount = invoices.filter(i => i.status === 'Paid').reduce((s, inv) => s + parseAmount(inv.amount), 0)
  const outstandingAmount = invoices.filter(i => i.status === 'Overdue' || i.status === 'Partially Paid' || i.status === 'Under Review').reduce((s, inv) => s + parseAmount(inv.amount), 0)
  const underReviewCount = invoices.filter(i => i.status === 'Under Review').length

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="vc-stat-card">
              <div className="h-4 bg-[#252e3a] rounded w-20 mb-2" />
              <div className="h-6 bg-[#252e3a] rounded w-16" />
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
            <FileText size={14} className="text-[#f5a623]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Total Invoices</span>
          </div>
          <div className="text-2xl font-bold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {invoices.length}
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(2)::before{background:#00e676}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-[#00e676]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Received YTD</span>
          </div>
          <div className="text-xl font-bold text-[#00e676]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            ₹{(paidAmount / 10000000).toFixed(0)}Cr
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(3)::before{background:#ff3d3d}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-[#ff3d3d]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Outstanding</span>
          </div>
          <div className="text-xl font-bold text-[#ff3d3d]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            ₹{(outstandingAmount / 10000000).toFixed(0)}Cr
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(4)::before{background:#00d4ff}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-[#00d4ff]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Under Review</span>
          </div>
          <div className="text-2xl font-bold text-[#00d4ff]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {underReviewCount}
          </div>
        </div>
      </div>

      {/* Invoice Tracker Table */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileText size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Invoice Tracker</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{invoices.length} Invoices</span>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-[#161c24] z-10">
              <tr className="border-b border-[#252e3a]">
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Invoice No.</th>
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Client</th>
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Project</th>
                <th className="text-right py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Amount</th>
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Date</th>
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Due Date</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#5a6878] text-[11px]">
                    No invoices found
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[#252e3a]/50 hover:bg-[#141920] transition-colors">
                    <td className="py-2.5 px-3 text-[#e2e8f0] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {inv.invNo}
                    </td>
                    <td className="py-2.5 px-3 text-[#8899aa]">{inv.client}</td>
                    <td className="py-2.5 px-3 text-[#8899aa]">{inv.project}</td>
                    <td className="py-2.5 px-3 text-right text-[#e2e8f0] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {inv.amount}
                    </td>
                    <td className="py-2.5 px-3 text-[#5a6878]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {inv.date}
                    </td>
                    <td className="py-2.5 px-3 text-[#5a6878]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {inv.dueDate}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`vc-badge ${getStatusBadge(inv.status)}`}>{inv.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Invoice Button */}
      <div className="flex justify-end">
        <button className="vc-btn-primary flex items-center gap-1.5 py-2 px-4">
          <Plus size={14} />
          New Invoice
        </button>
      </div>
    </div>
  )
}
