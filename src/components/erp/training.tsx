'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { GraduationCap, Award, AlertTriangle, Clock, Plus, BookOpen, Calendar, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useERPStore } from '@/store/erp-store'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Certification {
  id: string
  empId: string
  employeeName: string
  name: string
  issuedBy: string
  issueDate: string
  expiryDate: string
  status: string
  createdAt: string
  updatedAt: string
}

interface TrainingSession {
  id: string
  title: string
  site: string
  trainer: string
  date: string
  duration: string
  attendees: number
  status: string
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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getCertStatusBadge(status: string) {
  const map: Record<string, string> = {
    Valid: 'bg-[#00e676]/15 text-[#00e676]',
    Expiring: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
    Expired: 'bg-[#5a6878]/15 text-[#5a6878]',
  }
  return map[status] || map['Valid']
}

function getTrainingStatusBadge(status: string) {
  const map: Record<string, string> = {
    Scheduled: 'bg-[#00d4ff]/15 text-[#00d4ff]',
    Completed: 'bg-[#00e676]/15 text-[#00e676]',
    Cancelled: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
  }
  return map[status] || map['Scheduled']
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

export default function Training() {
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('certifications')

  // Dialogs
  const [createCertOpen, setCreateCertOpen] = useState(false)
  const [editCertOpen, setEditCertOpen] = useState(false)
  const [deleteCertOpen, setDeleteCertOpen] = useState(false)
  const [createTrainingOpen, setCreateTrainingOpen] = useState(false)
  const [editTrainingOpen, setEditTrainingOpen] = useState(false)
  const [deleteTrainingOpen, setDeleteTrainingOpen] = useState(false)

  // Editing state
  const [editingCert, setEditingCert] = useState<Certification | null>(null)
  const [deletingCert, setDeletingCert] = useState<Certification | null>(null)
  const [editingTraining, setEditingTraining] = useState<TrainingSession | null>(null)
  const [deletingTraining, setDeletingTraining] = useState<TrainingSession | null>(null)

  // Cert form
  const [certForm, setCertForm] = useState({
    empId: '',
    name: '',
    issuedBy: '',
    issueDate: '',
    expiryDate: '',
    status: 'Valid',
  })

  // Training form
  const [trainingForm, setTrainingForm] = useState({
    title: '',
    site: '',
    trainer: '',
    date: '',
    duration: '',
    attendees: 0,
    status: 'Scheduled',
  })
  const { triggerCreate } = useERPStore()

  useEffect(() => { if (triggerCreate > 0) setCreateCertOpen(true) }, [triggerCreate])

  /* Fetch data */
  const fetchData = useCallback(async () => {
    try {
      const [trainingRes, empRes] = await Promise.all([
        fetch('/api/training'),
        fetch('/api/employees'),
      ])
      const trainingJson = await trainingRes.json()
      const empJson = await empRes.json()

      if (trainingJson.success) {
        setCertifications(trainingJson.data.certifications || [])
        setTrainingSessions(trainingJson.data.trainingSessions || [])
      }
      if (empJson.success) {
        setEmployees(empJson.data)
      }
    } catch {
      toast.error('Failed to fetch training data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* Computed stats */
  const stats = useMemo(() => {
    const validCerts = certifications.filter(c => c.status === 'Valid').length
    const now = new Date()
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const expiring = certifications.filter(c => {
      const exp = new Date(c.expiryDate)
      return exp > now && exp <= thirtyDaysLater
    }).length

    const thisMonth = new Date().getMonth()
    const thisYear = new Date().getFullYear()
    const trainingThisMonth = trainingSessions.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear
    }).length

    const avgHours = trainingSessions.length > 0
      ? (trainingSessions.reduce((sum, t) => {
          const hrs = parseFloat(t.duration) || 0
          return sum + hrs
        }, 0) / trainingSessions.length).toFixed(1)
      : '0'

    return { validCerts, expiring, trainingThisMonth, avgHours }
  }, [certifications, trainingSessions])

  /* Sites from employees */
  const sites = useMemo(() => {
    const unique = Array.from(new Set(employees.map(e => e.site))).filter(Boolean).sort()
    return unique
  }, [employees])

  /* ===== Cert CRUD ===== */
  const handleCreateCert = async () => {
    if (!certForm.empId || !certForm.name || !certForm.issuedBy || !certForm.issueDate || !certForm.expiryDate) {
      toast.error('All fields are required')
      return
    }
    const emp = employees.find(e => e.id === certForm.empId || e.empId === certForm.empId)
    if (!emp) { toast.error('Employee not found'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/training?type=cert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empId: emp.empId,
          employeeName: emp.name,
          name: certForm.name,
          issuedBy: certForm.issuedBy,
          issueDate: certForm.issueDate,
          expiryDate: certForm.expiryDate,
          status: certForm.status,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Certification added')
        setCreateCertOpen(false)
        resetCertForm()
        fetchData()
      } else {
        toast.error(json.error || 'Failed to add certification')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleEditCert = async () => {
    if (!editingCert) return
    setSaving(true)
    try {
      const res = await fetch('/api/training?type=cert', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingCert.id, ...certForm }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Certification updated')
        setEditCertOpen(false)
        resetCertForm()
        fetchData()
      } else {
        toast.error(json.error || 'Failed to update')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCert = async () => {
    if (!deletingCert) return
    setSaving(true)
    try {
      const res = await fetch('/api/training?type=cert', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingCert.id }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Certification deleted')
        setDeleteCertOpen(false)
        fetchData()
      } else {
        toast.error(json.error || 'Failed to delete')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  /* ===== Training CRUD ===== */
  const handleCreateTraining = async () => {
    if (!trainingForm.title || !trainingForm.site || !trainingForm.trainer || !trainingForm.date || !trainingForm.duration) {
      toast.error('All fields are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/training?type=training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trainingForm),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Training session created')
        setCreateTrainingOpen(false)
        resetTrainingForm()
        fetchData()
      } else {
        toast.error(json.error || 'Failed to create')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleEditTraining = async () => {
    if (!editingTraining) return
    setSaving(true)
    try {
      const res = await fetch('/api/training?type=training', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingTraining.id, ...trainingForm }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Training session updated')
        setEditTrainingOpen(false)
        resetTrainingForm()
        fetchData()
      } else {
        toast.error(json.error || 'Failed to update')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTraining = async () => {
    if (!deletingTraining) return
    setSaving(true)
    try {
      const res = await fetch('/api/training?type=training', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingTraining.id }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Training session deleted')
        setDeleteTrainingOpen(false)
        fetchData()
      } else {
        toast.error(json.error || 'Failed to delete')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  /* Reset forms */
  const resetCertForm = () => setCertForm({ empId: '', name: '', issuedBy: '', issueDate: '', expiryDate: '', status: 'Valid' })
  const resetTrainingForm = () => setTrainingForm({ title: '', site: '', trainer: '', date: '', duration: '', attendees: 0, status: 'Scheduled' })

  /* Open edit dialogs */
  const openEditCert = (c: Certification) => {
    setEditingCert(c)
    setCertForm({ empId: c.empId, name: c.name, issuedBy: c.issuedBy, issueDate: c.issueDate, expiryDate: c.expiryDate, status: c.status })
    setEditCertOpen(true)
  }

  const openEditTraining = (t: TrainingSession) => {
    setEditingTraining(t)
    setTrainingForm({ title: t.title, site: t.site, trainer: t.trainer, date: t.date, duration: t.duration, attendees: t.attendees, status: t.status })
    setEditTrainingOpen(true)
  }

  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="vc-panel animate-pulse">
          <div className="vc-panel-header">
            <div className="h-4 bg-[#252e3a] rounded w-32" />
          </div>
          <div className="vc-panel-body">
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
            <Award size={14} className="text-[#00e676]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Valid Certs</span>
          </div>
          <div className="text-2xl font-bold text-[#00e676]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {stats.validCerts}
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(2)::before{background:#ff3d3d}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-[#ff3d3d]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Expiring ≤30d</span>
          </div>
          <div className="text-2xl font-bold text-[#ff3d3d]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {stats.expiring}
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(3)::before{background:#00d4ff}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap size={14} className="text-[#00d4ff]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Training This Month</span>
          </div>
          <div className="text-2xl font-bold text-[#00d4ff]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {stats.trainingThisMonth}
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(4)::before{background:#f5a623}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-[#f5a623]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Avg Training hrs</span>
          </div>
          <div className="text-2xl font-bold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {stats.avgHours}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-2">
          <TabsList className="bg-[#141920] border border-[#252e3a]">
            <TabsTrigger value="certifications" className="text-[11px] data-[state=active]:bg-[#f5a623]/10 data-[state=active]:text-[#f5a623]">
              <Award size={13} className="mr-1" />
              Certifications ({certifications.length})
            </TabsTrigger>
            <TabsTrigger value="training" className="text-[11px] data-[state=active]:bg-[#f5a623]/10 data-[state=active]:text-[#f5a623]">
              <BookOpen size={13} className="mr-1" />
              Training Sessions ({trainingSessions.length})
            </TabsTrigger>
          </TabsList>

          {activeTab === 'certifications' && (
            <button onClick={() => { resetCertForm(); setCreateCertOpen(true) }} className="vc-btn-primary flex items-center gap-1.5 py-2 px-3">
              <Plus size={13} />
              Add Certificate
            </button>
          )}
          {activeTab === 'training' && (
            <button onClick={() => { resetTrainingForm(); setCreateTrainingOpen(true) }} className="vc-btn-primary flex items-center gap-1.5 py-2 px-3">
              <Plus size={13} />
              Add Training
            </button>
          )}
        </div>

        {/* ===== CERTIFICATIONS TAB ===== */}
        <TabsContent value="certifications">
          <div className="vc-panel">
            <div className="vc-panel-header">
              <Award size={15} className="text-[#f5a623]" />
              <span className="text-[12px] font-semibold text-[#e2e8f0]">Certification Tracker</span>
              <span className="vc-badge bg-[#00e676]/15 text-[#00e676] ml-auto">{stats.validCerts} Valid</span>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              {certifications.length === 0 ? (
                <div className="py-16 text-center">
                  <Award size={32} className="mx-auto text-[#5a6878] mb-3" />
                  <div className="text-[#5a6878] text-sm">No certifications found</div>
                </div>
              ) : (
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-[#161c24] z-10">
                    <tr className="border-b border-[#252e3a]">
                      <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Employee</th>
                      <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Certification</th>
                      <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Issued By</th>
                      <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Issue</th>
                      <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Expiry</th>
                      <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Status</th>
                      <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certifications.map((cert) => (
                      <tr key={cert.id} className="border-b border-[#252e3a]/50 hover:bg-[#141920] transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#f5a623] to-[#e8891a] flex items-center justify-center text-[9px] font-bold text-black shrink-0">
                              {cert.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[#e2e8f0] font-medium truncate">{cert.employeeName}</div>
                              <div className="text-[9px] text-[#5a6878]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{cert.empId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[#8899aa]">{cert.name}</td>
                        <td className="py-2.5 px-3 text-[#5a6878]">{cert.issuedBy}</td>
                        <td className="py-2.5 px-3 text-[#5a6878]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{cert.issueDate}</td>
                        <td className="py-2.5 px-3 text-[#5a6878]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{cert.expiryDate}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`vc-badge ${getCertStatusBadge(cert.status)}`}>{cert.status}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openEditCert(cert)} className="p-1.5 rounded hover:bg-[#f5a623]/10 text-[#8899aa] hover:text-[#f5a623] transition-colors" title="Edit">
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => { setDeletingCert(cert); setDeleteCertOpen(true) }} className="p-1.5 rounded hover:bg-[#ff3d3d]/10 text-[#8899aa] hover:text-[#ff3d3d] transition-colors" title="Delete">
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
          </div>
        </TabsContent>

        {/* ===== TRAINING TAB ===== */}
        <TabsContent value="training">
          <div className="vc-panel">
            <div className="vc-panel-header">
              <BookOpen size={15} className="text-[#00d4ff]" />
              <span className="text-[12px] font-semibold text-[#e2e8f0]">Training Sessions</span>
              <span className="vc-badge bg-[#00d4ff]/15 text-[#00d4ff] ml-auto">{trainingSessions.length}</span>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              {trainingSessions.length === 0 ? (
                <div className="py-16 text-center">
                  <BookOpen size={32} className="mx-auto text-[#5a6878] mb-3" />
                  <div className="text-[#5a6878] text-sm">No training sessions found</div>
                </div>
              ) : (
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-[#161c24] z-10">
                    <tr className="border-b border-[#252e3a]">
                      <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Title</th>
                      <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Site</th>
                      <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Trainer</th>
                      <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Date</th>
                      <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Duration</th>
                      <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Attendees</th>
                      <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Status</th>
                      <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainingSessions.map((t) => (
                      <tr key={t.id} className="border-b border-[#252e3a]/50 hover:bg-[#141920] transition-colors">
                        <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{t.title}</td>
                        <td className="py-2.5 px-3 text-[#8899aa]">{t.site}</td>
                        <td className="py-2.5 px-3 text-[#8899aa]">{t.trainer}</td>
                        <td className="py-2.5 px-3 text-[#5a6878]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.date}</td>
                        <td className="py-2.5 px-3 text-[#5a6878]">{t.duration}</td>
                        <td className="py-2.5 px-3 text-center text-[#8899aa]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.attendees}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`vc-badge ${getTrainingStatusBadge(t.status)}`}>{t.status}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openEditTraining(t)} className="p-1.5 rounded hover:bg-[#f5a623]/10 text-[#8899aa] hover:text-[#f5a623] transition-colors" title="Edit">
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => { setDeletingTraining(t); setDeleteTrainingOpen(true) }} className="p-1.5 rounded hover:bg-[#ff3d3d]/10 text-[#8899aa] hover:text-[#ff3d3d] transition-colors" title="Delete">
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
          </div>
        </TabsContent>
      </Tabs>

      {/* ===== CREATE CERT DIALOG ===== */}
      <Dialog open={createCertOpen} onOpenChange={setCreateCertOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623] text-sm flex items-center gap-2">
              <Plus size={14} /><Award size={14} />
              Add Certification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Employee</label>
              <select value={certForm.empId} onChange={(e) => setCertForm(f => ({ ...f, empId: e.target.value }))} className="vc-input">
                <option value="">Select employee...</option>
                {employees.filter(e => e.status === 'Active').map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.empId} – {emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Certification Name</label>
              <input type="text" value={certForm.name} onChange={(e) => setCertForm(f => ({ ...f, name: e.target.value }))} className="vc-input" placeholder="e.g., NEBOSH IGC" />
            </div>
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Issued By</label>
              <input type="text" value={certForm.issuedBy} onChange={(e) => setCertForm(f => ({ ...f, issuedBy: e.target.value }))} className="vc-input" placeholder="e.g., NEBOSH UK" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Issue Date</label>
                <input type="date" value={certForm.issueDate} onChange={(e) => setCertForm(f => ({ ...f, issueDate: e.target.value }))} className="vc-input" style={{ fontFamily: "'Share Tech Mono', monospace" }} />
              </div>
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Expiry Date</label>
                <input type="date" value={certForm.expiryDate} onChange={(e) => setCertForm(f => ({ ...f, expiryDate: e.target.value }))} className="vc-input" style={{ fontFamily: "'Share Tech Mono', monospace" }} />
              </div>
            </div>
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Status</label>
              <select value={certForm.status} onChange={(e) => setCertForm(f => ({ ...f, status: e.target.value }))} className="vc-input">
                <option value="Valid">Valid</option>
                <option value="Expiring">Expiring</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setCreateCertOpen(false)} className="vc-btn-ghost py-2 px-4">Cancel</button>
            <button onClick={handleCreateCert} disabled={saving} className="vc-btn-primary flex items-center gap-1.5 py-2 px-4 disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              {saving ? 'Saving...' : 'Add Certification'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== EDIT CERT DIALOG ===== */}
      <Dialog open={editCertOpen} onOpenChange={setEditCertOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#00d4ff] text-sm flex items-center gap-2">
              <Pencil size={14} /><Award size={14} />
              Edit Certification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Employee</label>
              <input type="text" value={editingCert?.employeeName || ''} disabled className="vc-input opacity-60" />
            </div>
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Certification Name</label>
              <input type="text" value={certForm.name} onChange={(e) => setCertForm(f => ({ ...f, name: e.target.value }))} className="vc-input" />
            </div>
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Issued By</label>
              <input type="text" value={certForm.issuedBy} onChange={(e) => setCertForm(f => ({ ...f, issuedBy: e.target.value }))} className="vc-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Issue Date</label>
                <input type="date" value={certForm.issueDate} onChange={(e) => setCertForm(f => ({ ...f, issueDate: e.target.value }))} className="vc-input" style={{ fontFamily: "'Share Tech Mono', monospace" }} />
              </div>
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Expiry Date</label>
                <input type="date" value={certForm.expiryDate} onChange={(e) => setCertForm(f => ({ ...f, expiryDate: e.target.value }))} className="vc-input" style={{ fontFamily: "'Share Tech Mono', monospace" }} />
              </div>
            </div>
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Status</label>
              <select value={certForm.status} onChange={(e) => setCertForm(f => ({ ...f, status: e.target.value }))} className="vc-input">
                <option value="Valid">Valid</option>
                <option value="Expiring">Expiring</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditCertOpen(false)} className="vc-btn-ghost py-2 px-4">Cancel</button>
            <button onClick={handleEditCert} disabled={saving} className="vc-btn-primary flex items-center gap-1.5 py-2 px-4 disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Pencil size={12} />}
              {saving ? 'Saving...' : 'Update'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DELETE CERT DIALOG ===== */}
      <Dialog open={deleteCertOpen} onOpenChange={setDeleteCertOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#ff3d3d] text-sm flex items-center gap-2">
              <AlertTriangle size={14} /> Delete Certification
            </DialogTitle>
          </DialogHeader>
          <p className="text-[12px] text-[#8899aa] py-2">
            Delete <span className="text-[#e2e8f0] font-semibold">{deletingCert?.name}</span> for {deletingCert?.employeeName}?
          </p>
          <DialogFooter>
            <button onClick={() => setDeleteCertOpen(false)} className="vc-btn-ghost py-2 px-4">Cancel</button>
            <button onClick={handleDeleteCert} disabled={saving} className="flex items-center gap-1.5 py-2 px-4 rounded bg-[#ff3d3d] text-white text-[11px] font-semibold cursor-pointer border-none hover:opacity-90 disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== CREATE TRAINING DIALOG ===== */}
      <Dialog open={createTrainingOpen} onOpenChange={setCreateTrainingOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623] text-sm flex items-center gap-2">
              <Plus size={14} /><BookOpen size={14} />
              Add Training Session
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Title</label>
              <input type="text" value={trainingForm.title} onChange={(e) => setTrainingForm(f => ({ ...f, title: e.target.value }))} className="vc-input" placeholder="e.g., Fire Safety Drill" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Site</label>
                <select value={trainingForm.site} onChange={(e) => setTrainingForm(f => ({ ...f, site: e.target.value }))} className="vc-input">
                  <option value="">Select site...</option>
                  {sites.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Trainer</label>
                <input type="text" value={trainingForm.trainer} onChange={(e) => setTrainingForm(f => ({ ...f, trainer: e.target.value }))} className="vc-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Date</label>
                <input type="date" value={trainingForm.date} onChange={(e) => setTrainingForm(f => ({ ...f, date: e.target.value }))} className="vc-input" style={{ fontFamily: "'Share Tech Mono', monospace" }} />
              </div>
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Duration (hrs)</label>
                <input type="text" value={trainingForm.duration} onChange={(e) => setTrainingForm(f => ({ ...f, duration: e.target.value }))} className="vc-input" placeholder="e.g., 4" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Attendees</label>
                <input type="number" value={trainingForm.attendees} onChange={(e) => setTrainingForm(f => ({ ...f, attendees: parseInt(e.target.value) || 0 }))} className="vc-input" />
              </div>
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Status</label>
                <select value={trainingForm.status} onChange={(e) => setTrainingForm(f => ({ ...f, status: e.target.value }))} className="vc-input">
                  <option value="Scheduled">Scheduled</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setCreateTrainingOpen(false)} className="vc-btn-ghost py-2 px-4">Cancel</button>
            <button onClick={handleCreateTraining} disabled={saving} className="vc-btn-primary flex items-center gap-1.5 py-2 px-4 disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              {saving ? 'Saving...' : 'Create Session'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== EDIT TRAINING DIALOG ===== */}
      <Dialog open={editTrainingOpen} onOpenChange={setEditTrainingOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#00d4ff] text-sm flex items-center gap-2">
              <Pencil size={14} /><BookOpen size={14} />
              Edit Training Session
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Title</label>
              <input type="text" value={trainingForm.title} onChange={(e) => setTrainingForm(f => ({ ...f, title: e.target.value }))} className="vc-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Site</label>
                <select value={trainingForm.site} onChange={(e) => setTrainingForm(f => ({ ...f, site: e.target.value }))} className="vc-input">
                  {sites.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Trainer</label>
                <input type="text" value={trainingForm.trainer} onChange={(e) => setTrainingForm(f => ({ ...f, trainer: e.target.value }))} className="vc-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Date</label>
                <input type="date" value={trainingForm.date} onChange={(e) => setTrainingForm(f => ({ ...f, date: e.target.value }))} className="vc-input" style={{ fontFamily: "'Share Tech Mono', monospace" }} />
              </div>
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Duration (hrs)</label>
                <input type="text" value={trainingForm.duration} onChange={(e) => setTrainingForm(f => ({ ...f, duration: e.target.value }))} className="vc-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Attendees</label>
                <input type="number" value={trainingForm.attendees} onChange={(e) => setTrainingForm(f => ({ ...f, attendees: parseInt(e.target.value) || 0 }))} className="vc-input" />
              </div>
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Status</label>
                <select value={trainingForm.status} onChange={(e) => setTrainingForm(f => ({ ...f, status: e.target.value }))} className="vc-input">
                  <option value="Scheduled">Scheduled</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditTrainingOpen(false)} className="vc-btn-ghost py-2 px-4">Cancel</button>
            <button onClick={handleEditTraining} disabled={saving} className="vc-btn-primary flex items-center gap-1.5 py-2 px-4 disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Pencil size={12} />}
              {saving ? 'Saving...' : 'Update'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DELETE TRAINING DIALOG ===== */}
      <Dialog open={deleteTrainingOpen} onOpenChange={setDeleteTrainingOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#ff3d3d] text-sm flex items-center gap-2">
              <AlertTriangle size={14} /> Delete Training Session
            </DialogTitle>
          </DialogHeader>
          <p className="text-[12px] text-[#8899aa] py-2">
            Delete <span className="text-[#e2e8f0] font-semibold">&quot;{deletingTraining?.title}&quot;</span>?
          </p>
          <DialogFooter>
            <button onClick={() => setDeleteTrainingOpen(false)} className="vc-btn-ghost py-2 px-4">Cancel</button>
            <button onClick={handleDeleteTraining} disabled={saving} className="flex items-center gap-1.5 py-2 px-4 rounded bg-[#ff3d3d] text-white text-[11px] font-semibold cursor-pointer border-none hover:opacity-90 disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
