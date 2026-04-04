'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { RotateCcw, Sun, Moon, Coffee, Calendar, Plus, Pencil, Trash2, ChevronDown, AlertTriangle, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ShiftEntry {
  id: string
  empId: string
  employeeName: string
  site: string
  shift: string
  weekStart: string
  createdAt: string
  updatedAt: string
}

interface Employee {
  id: string
  empId: string
  name: string
  site: string
  status: string
}

const SHIFT_TYPES = ['Day A', 'Day B', 'Night B', 'General', 'Rest Day', 'OFF']

const SHIFT_BADGE_MAP: Record<string, { bg: string; color: string; label: string }> = {
  'Day A':   { bg: 'bg-[#00e676]/15', color: 'text-[#00e676]', label: 'Day A' },
  'Day B':   { bg: 'bg-[#00d4ff]/15', color: 'text-[#00d4ff]', label: 'Day B' },
  'Night B': { bg: 'bg-[#a78bfa]/15', color: 'text-[#a78bfa]', label: 'Night B' },
  'General': { bg: 'bg-[#f5a623]/15', color: 'text-[#f5a623]', label: 'GEN' },
  'Rest Day':{ bg: 'bg-[#ffab40]/15', color: 'text-[#ffab40]', label: 'REST' },
  'OFF':     { bg: 'bg-[#5a6878]/15', color: 'text-[#5a6878]', label: 'OFF' },
}

function getShiftBadge(shift: string) {
  const cfg = SHIFT_BADGE_MAP[shift]
  if (!cfg) return <span className="inline-flex items-center justify-center px-2 h-5 rounded text-[9px] font-bold bg-[#5a6878]/15 text-[#5a6878]">{shift}</span>
  return <span className={`inline-flex items-center justify-center px-2 h-5 rounded text-[9px] font-bold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
}

function getWeekStarts(): string[] {
  const weeks: string[] = []
  const now = new Date()
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1
  for (let i = 0; i < 4; i++) {
    const monday = new Date(now)
    monday.setDate(now.getDate() - dayOfWeek - i * 7)
    weeks.push(monday.toISOString().split('T')[0])
  }
  return weeks
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = d.toLocaleString('en', { month: 'short' })
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

function formatDateRange(weekStart: string): string {
  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return `${formatDate(weekStart)} – ${formatDate(end.toISOString().split('T')[0])}`
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                          */
/* ------------------------------------------------------------------ */

function SkeletonCard() {
  return (
    <div className="vc-stat-card animate-pulse">
      <div className="h-4 bg-[#252e3a] rounded w-24 mb-2" />
      <div className="h-6 bg-[#252e3a] rounded w-12" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function Shift() {
  const [shifts, setShifts] = useState<ShiftEntry[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [sites, setSites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Filters
  const weekStarts = useMemo(() => getWeekStarts(), [])
  const [selectedWeek, setSelectedWeek] = useState(weekStarts[0])
  const [selectedSite, setSelectedSite] = useState<string>('')
  const [weekOpen, setWeekOpen] = useState(false)
  const [siteOpen, setSiteOpen] = useState(false)

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<ShiftEntry | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingEntry, setDeletingEntry] = useState<ShiftEntry | null>(null)

  // Form state
  const [formEmpId, setFormEmpId] = useState('')
  const [formSite, setFormSite] = useState('')
  const [formShift, setFormShift] = useState('Day A')
  const [formWeekStart, setFormWeekStart] = useState(weekStarts[0])

  /* fetch shifts */
  const fetchShifts = useCallback(async () => {
    try {
      let url = '/api/shifts?'
      const params: string[] = []
      if (selectedWeek) params.push(`weekStart=${selectedWeek}`)
      if (selectedSite) params.push(`site=${encodeURIComponent(selectedSite)}`)
      url += params.join('&')

      const res = await fetch(url)
      const json = await res.json()
      if (json.success) setShifts(json.data)
      else toast.error('Failed to fetch shifts')
    } catch {
      toast.error('Network error fetching shifts')
    }
  }, [selectedWeek, selectedSite])

  /* fetch employees and sites */
  useEffect(() => {
    async function fetchMeta() {
      try {
        const [empRes, shiftRes] = await Promise.all([
          fetch('/api/employees'),
          fetch('/api/shifts'),
        ])
        const empJson = await empRes.json()
        const shiftJson = await shiftRes.json()

        if (empJson.success) {
          setEmployees(empJson.data)
          const uniqueSites = Array.from(new Set(empJson.data.map((e: Employee) => e.site))).filter(Boolean).sort()
          setSites(uniqueSites)
        }
        if (shiftJson.success) {
          // Also get unique sites from shift data
          const shiftSites = Array.from(new Set(shiftJson.data.map((s: ShiftEntry) => s.site))).filter(Boolean).sort()
          setSites(prev => {
            const combined = Array.from(new Set([...prev, ...shiftSites]))
            return combined.sort()
          })
        }
      } catch {
        // silently fail for meta data
      } finally {
        setLoading(false)
      }
    }
    fetchMeta()
  }, [])

  useEffect(() => {
    if (!loading) fetchShifts()
  }, [fetchShifts, loading])

  /* computed stats */
  const stats = useMemo(() => {
    const dayA = shifts.filter(s => s.shift === 'Day A').length
    const dayB = shifts.filter(s => s.shift === 'Day B').length
    const nightB = shifts.filter(s => s.shift === 'Night B').length
    const generalRest = shifts.filter(s => s.shift === 'General' || s.shift === 'Rest Day').length
    return { dayA, dayB, nightB, generalRest }
  }, [shifts])

  /* Create */
  const handleCreate = async () => {
    if (!formEmpId) { toast.error('Select an employee'); return }
    if (!formSite) { toast.error('Select a site'); return }

    const emp = employees.find(e => e.id === formEmpId || e.empId === formEmpId)
    if (!emp) { toast.error('Employee not found'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empId: emp.empId,
          employeeName: emp.name,
          site: formSite,
          shift: formShift,
          weekStart: formWeekStart,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Shift assignment created')
        setCreateOpen(false)
        resetForm()
        fetchShifts()
      } else {
        toast.error(json.error || 'Failed to create shift')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  /* Edit */
  const handleEdit = async () => {
    if (!editingEntry) return
    setSaving(true)
    try {
      const res = await fetch('/api/shifts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEntry.id,
          shift: formShift,
          site: formSite,
          weekStart: formWeekStart,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Shift updated')
        setEditOpen(false)
        resetForm()
        fetchShifts()
      } else {
        toast.error(json.error || 'Failed to update shift')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  /* Delete */
  const handleDelete = async () => {
    if (!deletingEntry) return
    setSaving(true)
    try {
      const res = await fetch('/api/shifts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingEntry.id }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Shift deleted')
        setDeleteOpen(false)
        fetchShifts()
      } else {
        toast.error(json.error || 'Failed to delete shift')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormEmpId('')
    setFormSite('')
    setFormShift('Day A')
    setFormWeekStart(weekStarts[0])
  }

  const openEditDialog = (entry: ShiftEntry) => {
    setEditingEntry(entry)
    setFormShift(entry.shift)
    setFormSite(entry.site)
    setFormWeekStart(entry.weekStart)
    setFormEmpId(entry.empId)
    setEditOpen(true)
  }

  const openDeleteDialog = (entry: ShiftEntry) => {
    setDeletingEntry(entry)
    setDeleteOpen(true)
  }

  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="vc-panel animate-pulse">
          <div className="vc-panel-header">
            <div className="h-4 bg-[#252e3a] rounded w-32" />
          </div>
          <div className="vc-panel-body">
            <div className="h-10 bg-[#252e3a] rounded w-full mb-2" />
            <div className="h-10 bg-[#252e3a] rounded w-full mb-2" />
            <div className="h-10 bg-[#252e3a] rounded w-full" />
          </div>
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
            <Sun size={14} className="text-[#00e676]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Day Shift A</span>
          </div>
          <div className="text-2xl font-bold text-[#00e676]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {stats.dayA}
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(2)::before{background:#00d4ff}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <Moon size={14} className="text-[#00d4ff]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Day Shift B</span>
          </div>
          <div className="text-2xl font-bold text-[#00d4ff]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {stats.dayB}
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(3)::before{background:#a78bfa}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <Coffee size={14} className="text-[#a78bfa]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Night Shift B</span>
          </div>
          <div className="text-2xl font-bold text-[#a78bfa]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {stats.nightB}
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(4)::before{background:#f5a623}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={14} className="text-[#f5a623]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">General / Rest</span>
          </div>
          <div className="text-2xl font-bold text-[#f5a623]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {stats.generalRest}
          </div>
        </div>
      </div>

      {/* Weekly Roster */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <RotateCcw size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Weekly Roster</span>
          <span className="text-[10px] text-[#5a6878] ml-1">{shifts.length} assignments</span>

          {/* Filters */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Site Filter */}
            <div className="relative">
              <button
                onClick={() => setSiteOpen(!siteOpen)}
                className="vc-btn-ghost flex items-center gap-1.5 text-[10px] py-1.5 px-2.5"
              >
                <span style={{ fontFamily: "'Share Tech Mono', monospace" }}>{selectedSite || 'All Sites'}</span>
                <ChevronDown size={12} className={`transition-transform ${siteOpen ? 'rotate-180' : ''}`} />
              </button>
              {siteOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-[#161c24] border border-[#2e3a48] rounded-lg shadow-xl z-20 py-1">
                  <button
                    onClick={() => { setSelectedSite(''); setSiteOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-[10px] transition-colors ${
                      !selectedSite ? 'bg-[#f5a623]/10 text-[#f5a623]' : 'text-[#8899aa] hover:bg-[#141920] hover:text-[#e2e8f0]'
                    }`}
                  >
                    All Sites
                  </button>
                  {sites.map((site) => (
                    <button
                      key={site}
                      onClick={() => { setSelectedSite(site); setSiteOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-[10px] transition-colors ${
                        selectedSite === site ? 'bg-[#f5a623]/10 text-[#f5a623]' : 'text-[#8899aa] hover:bg-[#141920] hover:text-[#e2e8f0]'
                      }`}
                    >
                      {site}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Week Selector */}
            <div className="relative">
              <button
                onClick={() => setWeekOpen(!weekOpen)}
                className="vc-btn-ghost flex items-center gap-1.5 text-[10px] py-1.5 px-2.5"
              >
                <Calendar size={12} />
                <span style={{ fontFamily: "'Share Tech Mono', monospace" }}>{formatDateRange(selectedWeek)}</span>
                <ChevronDown size={12} className={`transition-transform ${weekOpen ? 'rotate-180' : ''}`} />
              </button>
              {weekOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-[#161c24] border border-[#2e3a48] rounded-lg shadow-xl z-20 py-1">
                  {weekStarts.map((ws) => (
                    <button
                      key={ws}
                      onClick={() => { setSelectedWeek(ws); setWeekOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-[10px] transition-colors ${
                        selectedWeek === ws
                          ? 'bg-[#f5a623]/10 text-[#f5a623]'
                          : 'text-[#8899aa] hover:bg-[#141920] hover:text-[#e2e8f0]'
                      }`}
                      style={{ fontFamily: "'Share Tech Mono', monospace" }}
                    >
                      {formatDateRange(ws)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Add Button */}
            <button
              onClick={() => { resetForm(); setFormWeekStart(selectedWeek); setCreateOpen(true); }}
              className="vc-btn-primary flex items-center gap-1.5 py-1.5 px-3"
            >
              <Plus size={12} />
              Assign
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          {shifts.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar size={32} className="mx-auto text-[#5a6878] mb-3" />
              <div className="text-[#5a6878] text-sm">No shift assignments for this week</div>
              <div className="text-[#5a6878] text-xs mt-1">Click &quot;Assign&quot; to add shift entries</div>
            </div>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-[#161c24] z-10">
                <tr className="border-b border-[#252e3a]">
                  <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] min-w-[180px]">Employee</th>
                  <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] min-w-[80px]">Emp ID</th>
                  <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] min-w-[100px]">Site</th>
                  <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] min-w-[80px]">Shift</th>
                  <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] min-w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((entry) => (
                  <tr key={entry.id} className="border-b border-[#252e3a]/50 hover:bg-[#141920] transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#f5a623] to-[#e8891a] flex items-center justify-center text-[9px] font-bold text-black shrink-0">
                          {entry.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="text-[#e2e8f0] font-medium">{entry.employeeName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[#8899aa]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {entry.empId}
                    </td>
                    <td className="py-2.5 px-3 text-[#8899aa]">{entry.site}</td>
                    <td className="py-2.5 px-3 text-center">{getShiftBadge(entry.shift)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditDialog(entry)}
                          className="p-1.5 rounded hover:bg-[#f5a623]/10 text-[#8899aa] hover:text-[#f5a623] transition-colors"
                          title="Edit"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => openDeleteDialog(entry)}
                          className="p-1.5 rounded hover:bg-[#ff3d3d]/10 text-[#8899aa] hover:text-[#ff3d3d] transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Legend */}
        <div className="px-3 py-2.5 border-t border-[#252e3a] flex items-center gap-4 flex-wrap">
          <span className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold">Legend:</span>
          {Object.entries(SHIFT_BADGE_MAP).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`inline-flex items-center justify-center px-1.5 h-4 rounded text-[8px] font-bold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
              <span className="text-[9px] text-[#5a6878]">{key}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== CREATE DIALOG ===== */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623] text-sm flex items-center gap-2">
              <Plus size={14} />
              Assign Shift
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Employee */}
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Employee</label>
              <select
                value={formEmpId}
                onChange={(e) => setFormEmpId(e.target.value)}
                className="vc-input"
              >
                <option value="">Select employee...</option>
                {employees
                  .filter(e => e.status === 'Active')
                  .map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.empId} – {emp.name}
                    </option>
                  ))}
              </select>
            </div>
            {/* Site */}
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Site</label>
              <select
                value={formSite}
                onChange={(e) => setFormSite(e.target.value)}
                className="vc-input"
              >
                <option value="">Select site...</option>
                {sites.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {/* Shift */}
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Shift</label>
              <select
                value={formShift}
                onChange={(e) => setFormShift(e.target.value)}
                className="vc-input"
              >
                {SHIFT_TYPES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {/* Week Start */}
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Week Start (Monday)</label>
              <input
                type="date"
                value={formWeekStart}
                onChange={(e) => setFormWeekStart(e.target.value)}
                className="vc-input"
                style={{ fontFamily: "'Share Tech Mono', monospace" }}
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setCreateOpen(false)} className="vc-btn-ghost py-2 px-4">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="vc-btn-primary flex items-center gap-1.5 py-2 px-4 disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              {saving ? 'Saving...' : 'Create'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== EDIT DIALOG ===== */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#00d4ff] text-sm flex items-center gap-2">
              <Pencil size={14} />
              Edit Shift – {editingEntry?.employeeName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Employee</label>
              <input
                type="text"
                value={editingEntry?.employeeName || ''}
                disabled
                className="vc-input opacity-60"
              />
            </div>
            {/* Site */}
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Site</label>
              <select
                value={formSite}
                onChange={(e) => setFormSite(e.target.value)}
                className="vc-input"
              >
                {sites.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {/* Shift */}
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Shift</label>
              <select
                value={formShift}
                onChange={(e) => setFormShift(e.target.value)}
                className="vc-input"
              >
                {SHIFT_TYPES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {/* Week Start */}
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Week Start (Monday)</label>
              <input
                type="date"
                value={formWeekStart}
                onChange={(e) => setFormWeekStart(e.target.value)}
                className="vc-input"
                style={{ fontFamily: "'Share Tech Mono', monospace" }}
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditOpen(false)} className="vc-btn-ghost py-2 px-4">
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={saving}
              className="vc-btn-primary flex items-center gap-1.5 py-2 px-4 disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Pencil size={12} />}
              {saving ? 'Saving...' : 'Update'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DELETE DIALOG ===== */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#ff3d3d] text-sm flex items-center gap-2">
              <AlertTriangle size={14} />
              Delete Shift Assignment
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-[12px] text-[#8899aa]">
              Are you sure you want to delete the shift assignment for{' '}
              <span className="text-[#e2e8f0] font-semibold">{deletingEntry?.employeeName}</span>?
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <button onClick={() => setDeleteOpen(false)} className="vc-btn-ghost py-2 px-4">
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="flex items-center gap-1.5 py-2 px-4 rounded bg-[#ff3d3d] text-white text-[11px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              {saving ? 'Deleting...' : 'Delete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
