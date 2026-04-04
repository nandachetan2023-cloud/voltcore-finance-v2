'use client'

import { useState, useEffect } from 'react'
import { Package, IndianRupee, Clock, AlertTriangle, Plus } from 'lucide-react'

interface PurchaseOrder {
  id: string
  poNo: string
  vendor: string
  item: string
  amount: number
  project: string
  delivery: string
  grn: string
  status: string
  createdAt: string
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    Open: 'bg-[#00d4ff]/15 text-[#00d4ff]',
    'In Progress': 'bg-[#f5a623]/15 text-[#f5a623]',
    Delivered: 'bg-[#00e676]/15 text-[#00e676]',
    Cancelled: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    Closed: 'bg-[#5a6878]/15 text-[#5a6878]',
    Overdue: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
  }
  return map[status] || map['Open']
}

function getGrnBadge(grn: string) {
  const map: Record<string, string> = {
    Awaiting: 'bg-[#ffab40]/15 text-[#ffab40]',
    Received: 'bg-[#00e676]/15 text-[#00e676]',
    Partial: 'bg-[#f5a623]/15 text-[#f5a623]',
  }
  return map[grn] || map['Awaiting']
}

export default function Purchases() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/purchases')
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        if (json.success) setOrders(json.data)
        else throw new Error(json.error || 'Unknown error')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const openCount = orders.filter(o => o.status === 'Open' || o.status === 'In Progress').length
  const totalValue = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + o.amount, 0)
  const pendingGrn = orders.filter(o => o.grn === 'Awaiting' || o.grn === 'Partial').length
  const overdueCount = orders.filter(o => o.status === 'Overdue').length

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="vc-stat-card">
              <div className="h-4 bg-[#252e3a] rounded w-20 mb-2" />
              <div className="h-6 bg-[#252e3a] rounded w-14" />
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
            <Package size={14} className="text-[#f5a623]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Open POs</span>
          </div>
          <div className="text-2xl font-bold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {openCount}
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(2)::before{background:#00e676}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee size={14} className="text-[#00e676]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">PO Value MTD</span>
          </div>
          <div className="text-2xl font-bold text-[#00e676]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            ₹{(totalValue / 100000).toFixed(0)}L
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(3)::before{background:#00d4ff}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-[#00d4ff]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Pending GRN</span>
          </div>
          <div className="text-2xl font-bold text-[#00d4ff]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {pendingGrn}
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(4)::before{background:#ff3d3d}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-[#ff3d3d]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Overdue</span>
          </div>
          <div className="text-2xl font-bold text-[#ff3d3d]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {overdueCount}
          </div>
        </div>
      </div>

      {/* Purchase Order Register Table */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Package size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Purchase Order Register</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{orders.length} Orders</span>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-[#161c24] z-10">
              <tr className="border-b border-[#252e3a]">
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">PO No.</th>
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Vendor</th>
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Item</th>
                <th className="text-right py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Amount</th>
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Project</th>
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Delivery</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">GRN</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-[#5a6878] text-[11px]">
                    No purchase orders found
                  </td>
                </tr>
              ) : (
                orders.map((po) => (
                  <tr key={po.id} className="border-b border-[#252e3a]/50 hover:bg-[#141920] transition-colors">
                    <td className="py-2.5 px-3 text-[#e2e8f0] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {po.poNo}
                    </td>
                    <td className="py-2.5 px-3 text-[#8899aa]">{po.vendor}</td>
                    <td className="py-2.5 px-3 text-[#e2e8f0]">{po.item}</td>
                    <td className="py-2.5 px-3 text-right text-[#e2e8f0] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      ₹{po.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-[#8899aa]">{po.project}</td>
                    <td className="py-2.5 px-3 text-[#5a6878]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {po.delivery}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`vc-badge ${getGrnBadge(po.grn)}`}>{po.grn}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`vc-badge ${getStatusBadge(po.status)}`}>{po.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raise PO Button */}
      <div className="flex justify-end">
        <button className="vc-btn-primary flex items-center gap-1.5 py-2 px-4">
          <Plus size={14} />
          Raise PO
        </button>
      </div>
    </div>
  )
}
