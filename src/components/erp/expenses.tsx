'use client'

import { useState, useEffect, useCallback } from 'react'
import { Receipt, CheckCircle, Plane, XCircle, Plus, RefreshCw } from 'lucide-react'

interface Expense {
  id: string
  claimNo: string
  empId: string
  employee: {
    id: string
    empId: string
    name: string
    role: string
    site: string
  }
  category: string
  amount: number
  project: string
  date: string
  status: string
  createdAt: string
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    Pending: 'bg-[#ffab40]/15 text-[#ffab40]',
    Approved: 'bg-[#00e676]/15 text-[#00e676]',
    Rejected: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
  }
  return map[status] || map['Pending']
}

function getCategoryIcon(category: string) {
  if (category.toLowerCase().includes('travel') || category.toLowerCase().includes('stay'))
    return <Plane size={12} className="text-[#00d4ff]" />
  return <Receipt size={12} className="text-[#8899aa]" />
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch('/api/expenses')
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      if (json.success) setExpenses(json.data)
      else throw new Error(json.error || 'Unknown error')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const handleAction = async (id: string, status: 'Approved' | 'Rejected') => {
    setActionLoading(id)
    try {
      const res = await fetch('/api/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error('Action failed')
      await fetchExpenses()
    } catch (err) {
      console.error('Failed to update expense:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const pendingCount = expenses.filter(e => e.status === 'Pending').length
  const approvedTotal = expenses.filter(e => e.status === 'Approved').reduce((s, e) => s + e.amount, 0)
  const travelTotal = expenses.filter(e => e.category.toLowerCase().includes('travel') || e.category.toLowerCase().includes('stay')).reduce((s, e) => s + e.amount, 0)
  const rejectedCount = expenses.filter(e => e.status === 'Rejected').length

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="vc-stat-card">
              <div className="h-4 bg-[#252e3a] rounded w-24 mb-2" />
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
        <button onClick={fetchExpenses} className="vc-btn-ghost mt-3 flex items-center gap-1.5 mx-auto">
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(1)::before{background:#ffab40}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <Receipt size={14} className="text-[#ffab40]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Pending Claims</span>
          </div>
          <div className="text-2xl font-bold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {pendingCount}
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(2)::before{background:#00e676}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={14} className="text-[#00e676]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Approved MTD</span>
          </div>
          <div className="text-2xl font-bold text-[#00e676]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            ₹{(approvedTotal / 100000).toFixed(1)}L
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(3)::before{background:#00d4ff}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <Plane size={14} className="text-[#00d4ff]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Travel & Stay</span>
          </div>
          <div className="text-2xl font-bold text-[#00d4ff]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            ₹{(travelTotal / 100000).toFixed(1)}L
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(4)::before{background:#ff3d3d}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={14} className="text-[#ff3d3d]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Rejected</span>
          </div>
          <div className="text-2xl font-bold text-[#ff3d3d]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {rejectedCount}
          </div>
        </div>
      </div>

      {/* Expense Claims Table */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Receipt size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Expense Claims</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{expenses.length} Total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[#252e3a]">
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Claim No.</th>
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Employee</th>
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Category</th>
                <th className="text-right py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Amount</th>
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Project</th>
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Date</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Status</th>
                <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Actions</th>
              </tr>
            </thead>
            <tbody className="max-h-96 overflow-y-auto">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-[#5a6878] text-[11px]">
                    No expense claims found
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-[#252e3a]/50 hover:bg-[#141920] transition-colors">
                    <td className="py-2.5 px-3 text-[#e2e8f0] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {exp.claimNo}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#f5a623] to-[#e8891a] flex items-center justify-center text-[9px] font-bold text-black shrink-0">
                          {exp.employee?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                        </div>
                        <div>
                          <div className="text-[#e2e8f0] font-medium">{exp.employee?.name || 'Unknown'}</div>
                          <div className="text-[#5a6878] text-[9px]">{exp.employee?.role || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 text-[#8899aa]">
                        {getCategoryIcon(exp.category)}
                        {exp.category}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#e2e8f0] font-medium" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      ₹{exp.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-[#8899aa]">{exp.project}</td>
                    <td className="py-2.5 px-3 text-[#5a6878]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {exp.date}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`vc-badge ${getStatusBadge(exp.status)}`}>{exp.status}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {exp.status === 'Pending' ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleAction(exp.id, 'Approved')}
                            disabled={actionLoading === exp.id}
                            className="px-2 py-1 rounded text-[9px] font-semibold bg-[#00e676]/15 text-[#00e676] hover:bg-[#00e676]/25 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === exp.id ? <RefreshCw size={10} className="animate-spin" /> : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleAction(exp.id, 'Rejected')}
                            disabled={actionLoading === exp.id}
                            className="px-2 py-1 rounded text-[9px] font-semibold bg-[#ff3d3d]/15 text-[#ff3d3d] hover:bg-[#ff3d3d]/25 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[#5a6878] text-[9px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Claim Button */}
      <div className="flex justify-end">
        <button className="vc-btn-primary flex items-center gap-1.5 py-2 px-4">
          <Plus size={14} />
          New Claim
        </button>
      </div>
    </div>
  )
}
