'use client'

import React, { useEffect, useState } from 'react'
import { useERPStore } from '@/store/erp-store'
import {
  FileEdit, ShoppingBag, Package, Clock, ClipboardList, ArrowRight,
  Scale, TrendingUp, AlertTriangle, Inbox,
} from 'lucide-react'

type ModuleTarget = Parameters<ReturnType<typeof useERPStore>['setActiveModule']>[0]

interface KpiDef {
  key: string
  label: string
  hint: string
  icon: React.ElementType
  color: string
  target: ModuleTarget
}

const KPIS: KpiDef[] = [
  { key: 'pr', label: 'PRs Awaiting Approval', hint: 'Purchase requisitions pending sign-off', icon: FileEdit, color: '#f5a623', target: 'procurement-pr' },
  { key: 'po', label: 'Pending POs', hint: 'Purchase orders pending approval', icon: ShoppingBag, color: '#00d4ff', target: 'po-approval-stepper' },
  { key: 'grn', label: 'GRNs Awaiting Posting', hint: 'Receipts not yet posted to inventory', icon: Package, color: '#00e676', target: 'grn-3way-match' },
  { key: 'aging', label: 'Aging Open POs', hint: 'Open POs older than 30 days', icon: Clock, color: '#ff3d3d', target: 'procurement-po-register' },
]

interface RecentGrn { id: number; grnNo: string; grnDate: string; vendorName?: string | null; status: string }

/**
 * Purchase Management module root dashboard (PDF screen 1): KPI cards over the
 * sub-module tile grid. Rendered by erp-layout above SubModuleGrid tiles.
 */
export function ProcurementDashboard() {
  const setActiveModule = useERPStore((s) => s.setActiveModule)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [openRfqs, setOpenRfqs] = useState(0)
  const [approvedPrs, setApprovedPrs] = useState(0)
  const [recentGrns, setRecentGrns] = useState<RecentGrn[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const get = async (url: string) => {
      try {
        const r = await fetch(url)
        const j = await r.json()
        return j?.success && Array.isArray(j.data) ? j.data : []
      } catch { return [] }
    }
    ;(async () => {
      const [prs, pos, grns, rfqs] = await Promise.all([
        get('/api/procurement/requisitions'),
        get('/api/fin/purchase-orders'),
        get('/api/store/grn'),
        get('/api/procurement/rfqs'),
      ])
      if (!alive) return
      const cutoff = Date.now() - 30 * 864e5
      const openPoStatuses = new Set(['Draft', 'Pending Approval', 'Approved'])
      setCounts({
        pr: prs.filter((p: any) => p.status === 'Pending Approval').length,
        po: pos.filter((p: any) => p.status === 'Pending Approval').length,
        grn: grns.filter((g: any) => g.status !== 'Posted' && g.status !== 'Rejected').length,
        aging: pos.filter((p: any) => openPoStatuses.has(p.status) && p.date && new Date(p.date).getTime() < cutoff).length,
      })
      setOpenRfqs(rfqs.filter((r: any) => ['Draft', 'Sent', 'Responses Received'].includes(r.status)).length)
      setApprovedPrs(prs.filter((p: any) => p.status === 'Approved').length)
      setRecentGrns(
        grns
          .slice()
          .sort((a: any, b: any) => new Date(b.grnDate).getTime() - new Date(a.grnDate).getTime())
          .slice(0, 5)
          .map((g: any) => ({ id: g.id, grnNo: g.grnNo, grnDate: g.grnDate, vendorName: g.vendorName, status: g.status })),
      )
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  const card = 'bg-[#161c24] border border-[#252e3a] rounded-xl'

  return (
    <div className="pb-5 space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {KPIS.map((k) => {
          const Icon = k.icon
          return (
            <button
              key={k.key}
              onClick={() => setActiveModule(k.target)}
              className={`${card} p-4 text-left hover:border-[#f5a623]/50 transition-colors group`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-[#8899aa] uppercase tracking-wide truncate">{k.label}</div>
                  <div className="text-[26px] font-bold mt-1.5 tabular-nums" style={{ color: k.color }}>
                    {loading ? '…' : counts[k.key] ?? 0}
                  </div>
                  <div className="text-[10px] text-[#5a6878] mt-0.5 truncate">{k.hint}</div>
                </div>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${k.color}1a` }}>
                  <Icon size={17} style={{ color: k.color }} />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2.5 text-[10px] font-semibold text-[#5a6878] group-hover:text-[#f5a623] transition-colors">
                Open <ArrowRight size={10} />
              </div>
            </button>
          )
        })}
      </div>

      {/* Workflow widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* PR → RFQ conversion queue */}
        <div className={`${card} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <Inbox size={14} className="text-[#f5a623]" />
            <div className="text-[12px] font-semibold text-[#e2e8f0]">Ready to Convert</div>
          </div>
          <div className="text-[22px] font-bold text-[#f5a623] tabular-nums">{loading ? '…' : approvedPrs}</div>
          <div className="text-[10px] text-[#5a6878] mb-3">Approved PRs awaiting RFQ / PO conversion</div>
          <button
            onClick={() => setActiveModule('procurement-pr')}
            className="w-full px-3 py-1.5 text-[11px] font-semibold rounded-md bg-[#f5a623]/10 border border-[#f5a623]/30 text-[#f5a623] hover:bg-[#f5a623]/20 transition-colors"
          >
            Open Purchase Requisitions
          </button>
        </div>

        {/* Open RFQs */}
        <div className={`${card} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={14} className="text-[#00d4ff]" />
            <div className="text-[12px] font-semibold text-[#e2e8f0]">Open RFQs</div>
          </div>
          <div className="text-[22px] font-bold text-[#00d4ff] tabular-nums">{loading ? '…' : openRfqs}</div>
          <div className="text-[10px] text-[#5a6878] mb-3">Draft, sent, or collecting quotations</div>
          <button
            onClick={() => setActiveModule('procurement-rfq')}
            className="w-full px-3 py-1.5 text-[11px] font-semibold rounded-md bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] hover:bg-[#00d4ff]/20 transition-colors"
          >
            Open RFQ Management
          </button>
        </div>

        {/* Recent GRNs */}
        <div className={`${card} p-4 flex flex-col`}>
          <div className="flex items-center gap-2 mb-3">
            <Scale size={14} className="text-[#00e676]" />
            <div className="text-[12px] font-semibold text-[#e2e8f0]">Recent GRNs</div>
            <button
              onClick={() => setActiveModule('grn-3way-match')}
              className="ml-auto text-[10px] font-semibold text-[#00e676] hover:underline"
            >
              View all
            </button>
          </div>
          <div className="space-y-1.5 flex-1">
            {loading && <div className="text-[11px] text-[#5a6878]">Loading…</div>}
            {!loading && recentGrns.length === 0 && (
              <div className="text-[11px] text-[#5a6878] py-2">No GRNs recorded yet</div>
            )}
            {!loading && recentGrns.map((g) => (
              <button
                key={g.id}
                onClick={() => setActiveModule('grn-3way-match')}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md bg-[#141920] border border-[#252e3a] hover:border-[#00e676]/40 transition-colors text-left"
              >
                <span className="text-[10px] font-mono text-[#e2e8f0] truncate flex-1">{g.grnNo}</span>
                <span className="text-[9px] text-[#5a6878] shrink-0">{String(g.grnDate).slice(0, 10)}</span>
                <span
                  className="text-[8px] font-bold px-1.5 py-[1px] rounded shrink-0"
                  style={g.status === 'Posted'
                    ? { background: '#00e6761a', color: '#00e676' }
                    : { background: '#ffab401a', color: '#ffab40' }}
                >
                  {g.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Aging / shortage strip */}
      {(counts.aging ?? 0) > 0 && !loading && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#ff3d3d]/8 border border-[#ff3d3d]/25">
          <AlertTriangle size={14} className="text-[#ff3d3d] shrink-0" />
          <div className="text-[11px] text-[#e2e8f0]">
            <span className="font-bold text-[#ff3d3d]">{counts.aging}</span> open {counts.aging === 1 ? 'PO is' : 'POs are'} older than 30 days — review delivery status in PO Register.
          </div>
          <button
            onClick={() => setActiveModule('procurement-po-register')}
            className="ml-auto text-[10px] font-semibold text-[#ff3d3d] hover:underline shrink-0"
          >
            Review →
          </button>
        </div>
      )}

      <div className="flex items-center gap-1.5 pt-1 text-[10px] text-[#5a6878]">
        <TrendingUp size={11} />
        <span>Full purchase management flow: Purchase Requisition → RFQ → Quotation Comparison → PO Approval → GRN → Inventory posting</span>
      </div>
    </div>
  )
}
