'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FilePlus2,
  Loader2,
  Send,
  Save,
  MapPin,
  User,
  CalendarClock,
  XCircle,
  Pause,
  ArrowRight,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

/* ---------- types ---------- */

interface WorkPermit {
  id: string
  permitNo: string
  type: string
  location: string
  issuedTo: string
  expiry: string
  status: string
  description: string | null
  precautions: string | null
  createdAt: string
  updatedAt: string
}

interface PermitsApiResponse {
  success: boolean
  data?: WorkPermit[]
  error?: string
}

/* ---------- helpers ---------- */

const PERMIT_TYPE_EMOJI: Record<string, string> = {
  'Hot Work': '🔥',
  'Cold Work': '🧊',
  'Confined Space': '🕳️',
  'Electrical': '⚡',
  'Excavation': '⛏️',
  'Height Work': '🧗',
  'Radiation': '☢️',
  'General': '📋',
}

function getPermitEmoji(type: string): string {
  return PERMIT_TYPE_EMOJI[type] ?? '📋'
}

function formatExpiry(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return dateStr
  }
}

function getTimeUntil(dateStr: string): { hours: number; label: string } | null {
  try {
    const diff = new Date(dateStr).getTime() - Date.now()
    if (diff <= 0) return null
    const hours = diff / (1000 * 60 * 60)
    if (hours < 1) return { hours, label: `${Math.floor(diff / 60000)}m` }
    if (hours < 24) return { hours, label: `${Math.floor(hours)}h` }
    return { hours, label: `${Math.floor(hours / 24)}d` }
  } catch {
    return null
  }
}

/* ---------- status badge ---------- */

function PermitStatusBadge({ status, expiry }: { status: string; expiry?: string }) {
  const timeLeft = expiry ? getTimeUntil(expiry) : null

  const styles: Record<string, string> = {
    Active: 'bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30',
    Pending: 'bg-[#ffab40]/15 text-[#ffab40] border border-[#ffab40]/30',
    Expired: 'bg-[#ff3d3d]/15 text-[#ff3d3d] border border-[#ff3d3d]/30',
    Cancelled: 'bg-[#5a6878]/15 text-[#5a6878] border border-[#5a6878]/30',
    Suspended: 'bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30',
    Closed: 'bg-[#8899aa]/15 text-[#8899aa] border border-[#8899aa]/30',
  }

  return (
    <div className="flex items-center gap-1">
      <span
        className={`inline-flex items-center gap-1 px-2 py-[2px] rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${styles[status] ?? 'bg-[#5a6878]/15 text-[#5a6878] border border-[#5a6878]/30'}`}
      >
        {status === 'Active' && <CheckCircle2 size={10} />}
        {status === 'Pending' && <Clock size={10} />}
        {status === 'Expired' && <XCircle size={10} />}
        {status === 'Suspended' && <Pause size={10} />}
        {status === 'Cancelled' && <XCircle size={10} />}
        {status === 'Closed' && <CheckCircle2 size={10} />}
        {status}
      </span>
      {status === 'Active' && timeLeft && timeLeft.hours < 48 && (
        <span className="text-[8px] font-bold text-[#ff3d3d] bg-[#ff3d3d]/10 px-1.5 py-[1px] rounded">
          {timeLeft.label}
        </span>
      )}
    </div>
  )
}

/* ---------- stat card ---------- */

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="vc-stat-card">
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: color }}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">
            {label}
          </div>
          <div
            className="text-[22px] font-bold text-[#e2e8f0]"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {value}
          </div>
        </div>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color}15` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  )
}

/* ---------- skeleton ---------- */

function StatSkeleton() {
  return (
    <div className="vc-stat-card">
      <Skeleton className="h-3 w-24 mb-2 bg-[#1e2630]" />
      <Skeleton className="h-6 w-16 bg-[#1e2630]" />
    </div>
  )
}

/* ---------- form types ---------- */

interface PermitFormData {
  type: string
  site: string
  description: string
  assignedTo: string
  startDateTime: string
  expiryDateTime: string
  precautions: string
}

const INITIAL_FORM: PermitFormData = {
  type: '',
  site: '',
  description: '',
  assignedTo: '',
  startDateTime: '',
  expiryDateTime: '',
  precautions: '',
}

const PERMIT_TYPES = [
  'Hot Work',
  'Cold Work',
  'Confined Space',
  'Electrical',
  'Excavation',
  'Height Work',
  'Radiation',
  'General',
]

const SITES = [
  'Mumbai Central Tower',
  'Pune Industrial Park',
  'Delhi Metro Site A',
  'Bangalore Tech Hub',
  'Hyderabad Bridge Project',
  'Chennai Port Extension',
]

/* ---------- main component ---------- */

export default function PermitsModule() {
  const [data, setData] = useState<WorkPermit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<PermitFormData>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    async function fetchPermits() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/permits')
        const json: PermitsApiResponse = await res.json()
        if (json.success && json.data) {
          setData(json.data)
        } else {
          setError(json.error ?? 'Failed to load permits')
        }
      } catch {
        setError('Network error while fetching permits')
      } finally {
        setLoading(false)
      }
    }
    fetchPermits()
  }, [])

  /* ---------- computed stats ---------- */

  const stats = useMemo(() => {
    const active = data.filter(
      (p) => p.status === 'Active' || p.status === 'Pending'
    )
    const now = Date.now()
    const expiring48h = data.filter((p) => {
      if (p.status !== 'Active') return false
      const diff = new Date(p.expiry).getTime() - now
      return diff > 0 && diff <= 48 * 60 * 60 * 1000
    })
    const approvedToday = data.filter((p) => {
      const today = new Date().toDateString()
      return (
        new Date(p.createdAt).toDateString() === today && p.status === 'Active'
      )
    })
    const pending = data.filter((p) => p.status === 'Pending')
    return {
      active: active.length,
      expiring48h: expiring48h.length,
      approvedToday: approvedToday.length,
      pending: pending.length,
    }
  }, [data])

  /* ---------- find critical permit ── the one expiring soonest ---------- */

  const criticalPermit = useMemo(() => {
    const active = data.filter((p) => p.status === 'Active')
    if (!active.length) return null
    const sorted = [...active].sort(
      (a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime()
    )
    const soonest = sorted[0]
    const timeLeft = getTimeUntil(soonest.expiry)
    if (timeLeft && timeLeft.hours <= 6) return soonest
    return null
  }, [data])

  /* ---------- form handlers ---------- */

  function updateForm(field: keyof PermitFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(draft: boolean) {
    try {
      setSubmitting(true)
      setSubmitError(null)
      setSubmitSuccess(false)

      if (!draft) {
        if (!form.type || !form.site || !form.assignedTo || !form.expiryDateTime) {
          setSubmitError('Please fill in all required fields (Type, Site, Assigned To, Expiry)')
          setSubmitting(false)
          return
        }
      }

      // Generate permit number
      const nextNum = (data.length + 1).toString().padStart(3, '0')
      const permitNo = `PTW-${nextNum}`

      const res = await fetch('/api/permits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permitNo,
          type: form.type || 'General',
          location: form.site,
          issuedTo: form.assignedTo,
          expiry: form.expiryDateTime || new Date(Date.now() + 86400000).toISOString(),
          status: draft ? 'Pending' : 'Active',
          description: form.description || null,
          precautions: form.precautions || null,
        }),
      })

      const json = await res.json()
      if (json.success && json.data) {
        setData((prev) => [json.data, ...prev])
        setForm(INITIAL_FORM)
        setSubmitSuccess(true)
        setTimeout(() => setSubmitSuccess(false), 3000)
      } else {
        setSubmitError(json.error ?? 'Failed to create permit')
      }
    } catch {
      setSubmitError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------- render ---------- */

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertTriangle size={40} className="text-[#ff3d3d]" />
        <div className="text-sm text-[#e2e8f0] font-medium">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="vc-btn-primary mt-2"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Alert Strip ── */}
      {!loading && criticalPermit && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#ff3d3d]/10 border border-[#ff3d3d]/30 animate-pulse">
          <AlertTriangle size={18} className="text-[#ff3d3d] shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[12px] font-bold text-[#ff3d3d]">
              CRITICAL:{' '}
            </span>
            <span className="text-[11px] text-[#e2e8f0]">
              Permit{' '}
              <span className="font-bold text-[#ffab40]">
                {criticalPermit.permitNo}
              </span>{' '}
              ({criticalPermit.type}) at {criticalPermit.location} expires in{' '}
              <span className="font-bold text-[#ff3d3d]">
                {getTimeUntil(criticalPermit.expiry)?.label ?? '< 1h'}
              </span>{' '}
              — Immediate action required
            </span>
          </div>
          <ArrowRight size={16} className="text-[#ff3d3d] shrink-0" />
        </div>
      )}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Active Permits"
              value={stats.active}
              icon={ShieldAlert}
              color="#00e676"
            />
            <StatCard
              label="Expiring ≤48hr"
              value={stats.expiring48h}
              icon={Clock}
              color="#ff3d3d"
            />
            <StatCard
              label="Approved Today"
              value={stats.approvedToday}
              icon={CheckCircle2}
              color="#f5a623"
            />
            <StatCard
              label="Pending Approval"
              value={stats.pending}
              icon={FilePlus2}
              color="#00d4ff"
            />
          </>
        )}
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[60%_1fr] gap-4">
        {/* ── LEFT: Active Permits Table ── */}
        {loading ? (
          <div className="vc-panel">
            <div className="vc-panel-header">
              <Skeleton className="h-4 w-32 bg-[#1e2630]" />
            </div>
            <div className="p-3 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-[#1e2630]" />
              ))}
            </div>
          </div>
        ) : (
          <div className="vc-panel flex flex-col">
            <div className="vc-panel-header justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert size={15} className="text-[#f5a623]" />
                <span className="text-[12px] font-semibold text-[#e2e8f0]">
                  Active Permits
                </span>
              </div>
              <span className="text-[10px] text-[#5a6878]">
                {data.length} total
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-[#141920] text-[#5a6878] uppercase tracking-wider text-[9px]">
                    <th className="text-left py-2 px-3 font-semibold whitespace-nowrap">
                      PTW No.
                    </th>
                    <th className="text-left py-2 px-2 font-semibold whitespace-nowrap">
                      Type
                    </th>
                    <th className="text-left py-2 px-2 font-semibold whitespace-nowrap">
                      Location
                    </th>
                    <th className="text-left py-2 px-2 font-semibold whitespace-nowrap">
                      Issued To
                    </th>
                    <th className="text-left py-2 px-2 font-semibold whitespace-nowrap">
                      Expiry
                    </th>
                    <th className="text-center py-2 px-3 font-semibold whitespace-nowrap">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2630]">
                  {data.map((permit) => {
                    const timeLeft = getTimeUntil(permit.expiry)
                    const isExpiring =
                      permit.status === 'Active' &&
                      timeLeft &&
                      timeLeft.hours <= 48

                    return (
                      <tr
                        key={permit.id}
                        className={`
                          transition-colors duration-100
                          ${isExpiring ? 'bg-[#ff3d3d]/5' : 'hover:bg-[#141920]'}
                        `}
                      >
                        <td className="py-[10px] px-3">
                          <span className="font-bold text-[#f5a623] font-mono text-[11px]">
                            {permit.permitNo}
                          </span>
                        </td>
                        <td className="py-[10px] px-2">
                          <span className="inline-flex items-center gap-1">
                            <span className="text-[13px]">
                              {getPermitEmoji(permit.type)}
                            </span>
                            <span className="text-[#e2e8f0] font-medium whitespace-nowrap">
                              {permit.type}
                            </span>
                          </span>
                        </td>
                        <td className="py-[10px] px-2">
                          <div className="flex items-center gap-1">
                            <MapPin size={10} className="text-[#5a6878] shrink-0" />
                            <span className="text-[#8899aa] whitespace-nowrap">
                              {permit.location}
                            </span>
                          </div>
                        </td>
                        <td className="py-[10px] px-2">
                          <div className="flex items-center gap-1">
                            <User size={10} className="text-[#5a6878] shrink-0" />
                            <span className="text-[#8899aa] whitespace-nowrap">
                              {permit.issuedTo}
                            </span>
                          </div>
                        </td>
                        <td className="py-[10px] px-2">
                          <div className="flex items-center gap-1">
                            <CalendarClock
                              size={10}
                              className={`shrink-0 ${isExpiring ? 'text-[#ff3d3d]' : 'text-[#5a6878]'}`}
                            />
                            <span
                              className={`whitespace-nowrap ${isExpiring ? 'text-[#ff3d3d] font-semibold' : 'text-[#8899aa]'}`}
                            >
                              {formatExpiry(permit.expiry)}
                            </span>
                          </div>
                        </td>
                        <td className="py-[10px] px-3 text-center">
                          <PermitStatusBadge
                            status={permit.status}
                            expiry={permit.expiry}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {data.length === 0 && (
              <div className="py-12 text-center">
                <ShieldAlert size={32} className="text-[#2e3a48] mx-auto mb-2" />
                <div className="text-[12px] text-[#5a6878]">
                  No permits found. Create a new permit to get started.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── RIGHT: New Permit Request Form ── */}
        <div className="vc-panel">
          <div className="vc-panel-header">
            <div className="flex items-center gap-2">
              <FilePlus2 size={14} className="text-[#00d4ff]" />
              <span className="text-[12px] font-semibold text-[#e2e8f0]">
                New Permit Request
              </span>
            </div>
          </div>
          <div className="vc-panel-body space-y-3">
            {/* Permit Type */}
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">
                Permit Type *
              </label>
              <select
                value={form.type}
                onChange={(e) => updateForm('type', e.target.value)}
                className="vc-input appearance-none cursor-pointer"
              >
                <option value="">Select type...</option>
                {PERMIT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {getPermitEmoji(t)} {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Site */}
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">
                Site *
              </label>
              <select
                value={form.site}
                onChange={(e) => updateForm('site', e.target.value)}
                className="vc-input appearance-none cursor-pointer"
              >
                <option value="">Select site...</option>
                {SITES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Work Description */}
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">
                Work Description
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder="Brief description of the work..."
                className="vc-input"
              />
            </div>

            {/* Assigned To */}
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">
                Assigned To *
              </label>
              <input
                type="text"
                value={form.assignedTo}
                onChange={(e) => updateForm('assignedTo', e.target.value)}
                placeholder="Person responsible..."
                className="vc-input"
              />
            </div>

            {/* Date/Time row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">
                  Start Date/Time
                </label>
                <input
                  type="datetime-local"
                  value={form.startDateTime}
                  onChange={(e) => updateForm('startDateTime', e.target.value)}
                  className="vc-input"
                />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">
                  Expiry *
                </label>
                <input
                  type="datetime-local"
                  value={form.expiryDateTime}
                  onChange={(e) => updateForm('expiryDateTime', e.target.value)}
                  className="vc-input"
                />
              </div>
            </div>

            {/* Precautions */}
            <div>
              <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">
                Safety Precautions
              </label>
              <textarea
                value={form.precautions}
                onChange={(e) => updateForm('precautions', e.target.value)}
                placeholder="List safety measures and PPE requirements..."
                rows={3}
                className="vc-input resize-none"
              />
            </div>

            {/* Submit feedback */}
            {submitError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#ff3d3d]/10 border border-[#ff3d3d]/30">
                <XCircle size={14} className="text-[#ff3d3d] shrink-0" />
                <span className="text-[11px] text-[#ff3d3d]">{submitError}</span>
              </div>
            )}

            {submitSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00e676]/10 border border-[#00e676]/30">
                <CheckCircle2 size={14} className="text-[#00e676] shrink-0" />
                <span className="text-[11px] text-[#00e676]">
                  Permit submitted successfully!
                </span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                Submit
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={submitting}
                className="vc-btn-ghost flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Save size={13} />
                )}
                Save Draft
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
