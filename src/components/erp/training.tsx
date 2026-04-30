'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Award, AlertTriangle, Clock, Plus, Trash2, Loader2, FileText, Search, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
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
  filePath?: string | null
  createdAt: string
  updatedAt: string
}

interface Employee {
  id: number
  employeeCode: string
  firstName: string
  lastName: string
  employmentStatus: string
  Designation?: {
    id: number
    name: string
  }
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

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
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
/*  Searchable Employee Select                                         */
/* ------------------------------------------------------------------ */

function EmployeeSearchSelect({
  employees,
  value,
  onChange,
}: {
  employees: Employee[]
  value: number
  onChange: (id: number) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = employees.find(e => e.id === value)

  const filtered = useMemo(() => {
    if (!query.trim()) return employees
    const q = query.toLowerCase()
    return employees.filter(e =>
      e.employeeCode.toLowerCase().includes(q) ||
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      (e.Designation?.name || '').toLowerCase().includes(q)
    )
  }, [employees, query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (emp: Employee) => {
    onChange(emp.id)
    setQuery('')
    setOpen(false)
  }

  const handleClear = () => {
    onChange(0)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="vc-input flex items-center gap-2 cursor-text"
        onClick={() => setOpen(true)}
      >
        <Search size={12} className="text-[#5a6878] shrink-0" />
        {open ? (
          <input
            autoFocus
            className="flex-1 bg-transparent outline-none text-[11px] text-[#e2e8f0] placeholder:text-[#5a6878]"
            placeholder="Search by name or code..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        ) : (
          <span className={`flex-1 text-[11px] truncate ${selected ? 'text-[#e2e8f0]' : 'text-[#5a6878]'}`}>
            {selected
              ? `${selected.employeeCode} – ${selected.firstName} ${selected.lastName}${selected.Designation ? ` (${selected.Designation.name})` : ''}`
              : 'Select employee...'}
          </span>
        )}
        {selected && !open && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); handleClear() }}
            className="text-[#5a6878] hover:text-[#ff3d3d] transition-colors shrink-0"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0d1117] border border-[#2e3a48] rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-[10px] text-[#5a6878]">
              No employees found
            </div>
          ) : (
            filtered.map(emp => (
              <button
                key={emp.id}
                type="button"
                onClick={() => handleSelect(emp)}
                className={`w-full text-left px-3 py-2 text-[11px] hover:bg-[#141920] transition-colors border-b border-[#1e252e] last:border-0 ${value === emp.id ? 'bg-[#f5a623]/10 text-[#f5a623]' : 'text-[#e2e8f0]'}`}
              >
                <span className="font-semibold" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {emp.employeeCode}
                </span>
                <span className="text-[#8899aa] mx-1">–</span>
                {emp.firstName} {emp.lastName}
                {emp.Designation && (
                  <span className="text-[9px] text-[#5a6878] ml-1">({emp.Designation.name})</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function Training() {
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Dialogs
  const [createCertOpen, setCreateCertOpen] = useState(false)
  const [deleteCertOpen, setDeleteCertOpen] = useState(false)
  const [deletingCert, setDeletingCert] = useState<Certification | null>(null)

  // Cert form
  const [certForm, setCertForm] = useState({
    empId: 0,
    name: '',
    issuedBy: '',
    issueDate: '',
    expiryDate: '',
    status: 'Valid',
  })
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const { triggerCreate } = useERPStore()
  useEffect(() => { if (triggerCreate > 0) setCreateCertOpen(true) }, [triggerCreate])

  /* ── Fetch ── */
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees')
      const json = await res.json()
      if (json.success) setEmployees(json.data)
    } catch { /* silent */ }
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/training')
      const json = await res.json()
      if (json.success) setCertifications(json.data.certifications || [])
    } catch {
      toast.error('Failed to fetch certifications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    fetchEmployees()
  }, [fetchData, fetchEmployees])

  /* ── Stats ── */
  const stats = useMemo(() => {
    const validCerts = certifications.filter(c => c.status === 'Valid').length
    const now = new Date()
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const expiring = certifications.filter(c => {
      const exp = new Date(c.expiryDate)
      return exp > now && exp <= thirtyDaysLater
    }).length
    const expired = certifications.filter(c => c.status === 'Expired').length
    return { total: certifications.length, validCerts, expiring, expired }
  }, [certifications])

  /* ── Cert CRUD ── */
  const resetCertForm = () => {
    setCertForm({ empId: 0, name: '', issuedBy: '', issueDate: '', expiryDate: '', status: 'Valid' })
    setUploadedFile(null)
  }

  const handleCreateCert = async () => {
    if (!certForm.empId || !uploadedFile) {
      toast.error('Please select an employee and upload a certificate file')
      return
    }
    const emp = employees.find(e => e.id === certForm.empId)
    if (!emp) { toast.error('Employee not found'); return }

    setSaving(true)
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', uploadedFile)
      const uploadRes = await fetch('/api/upload/certificate', { method: 'POST', body: formData })
      const uploadJson = await uploadRes.json()
      setUploading(false)

      if (!uploadJson.success) {
        toast.error(uploadJson.error || 'Failed to upload file')
        setSaving(false)
        return
      }

      const certData = {
        empId: emp.employeeCode,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        name: certForm.name || uploadedFile.name,
        issuedBy: certForm.issuedBy || 'N/A',
        issueDate: certForm.issueDate || new Date().toISOString().split('T')[0],
        expiryDate: certForm.expiryDate || new Date().toISOString().split('T')[0],
        status: certForm.status,
        filePath: uploadJson.data.path,
      }

      const res = await fetch('/api/training?type=cert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(certData),
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
      setUploading(false)
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

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="vc-panel animate-pulse">
          <div className="vc-panel-header"><div className="h-4 bg-[#252e3a] rounded w-32" /></div>
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
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="vc-stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Award size={14} className="text-[#f5a623]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Total</span>
          </div>
          <div className="text-2xl font-bold text-[#f5a623]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {stats.total}
          </div>
        </div>
        <div className="vc-stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Award size={14} className="text-[#00e676]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Valid</span>
          </div>
          <div className="text-2xl font-bold text-[#00e676]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {stats.validCerts}
          </div>
        </div>
        <div className="vc-stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-[#ffab40]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Expiring ≤30d</span>
          </div>
          <div className="text-2xl font-bold text-[#ffab40]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {stats.expiring}
          </div>
        </div>
        <div className="vc-stat-card">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-[#ff3d3d]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Expired</span>
          </div>
          <div className="text-2xl font-bold text-[#ff3d3d]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {stats.expired}
          </div>
        </div>
      </div>

      {/* Certifications Panel */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Award size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Certification Tracker</span>
          <span className="vc-badge bg-[#00e676]/15 text-[#00e676] ml-auto">{stats.validCerts} Valid</span>
          <button
            onClick={() => { resetCertForm(); setCreateCertOpen(true) }}
            className="vc-btn-primary flex items-center gap-1.5 py-1.5 px-3"
          >
            <Plus size={13} />
            Add Certificate
          </button>
        </div>
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          {certifications.length === 0 ? (
            <div className="py-16 text-center">
              <Award size={32} className="mx-auto text-[#5a6878] mb-3" />
              <div className="text-[#5a6878] text-sm">No certifications found</div>
              <button
                onClick={() => { resetCertForm(); setCreateCertOpen(true) }}
                className="vc-btn-primary mt-4 flex items-center gap-1.5 mx-auto py-2 px-4"
              >
                <Plus size={13} /> Add First Certificate
              </button>
            </div>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-[#161c24] z-10">
                <tr className="border-b border-[#252e3a]">
                  <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Employee</th>
                  <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Certification</th>
                  <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Issued By</th>
                  <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Issue Date</th>
                  <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Expiry Date</th>
                  <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Status</th>
                  <th className="text-center py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">File</th>
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
                      {cert.filePath ? (
                        <a
                          href={cert.filePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 p-1.5 rounded hover:bg-[#00d4ff]/10 text-[#8899aa] hover:text-[#00d4ff] transition-colors"
                          title="View Certificate"
                        >
                          <FileText size={12} />
                        </a>
                      ) : (
                        <span className="text-[#5a6878] text-[9px]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => { setDeletingCert(cert); setDeleteCertOpen(true) }}
                        className="p-1.5 rounded hover:bg-[#ff3d3d]/10 text-[#8899aa] hover:text-[#ff3d3d] transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ===== ADD CERT DIALOG ===== */}
      <Dialog open={createCertOpen} onOpenChange={setCreateCertOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#f5a623] text-sm flex items-center gap-2">
              <Plus size={14} /><Award size={14} />
              Add Certification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">
                Employee <span className="text-[#ff3d3d]">*</span>
              </label>
              <EmployeeSearchSelect
                employees={employees.filter(e => e.employmentStatus?.toLowerCase() === 'active')}
                value={certForm.empId}
                onChange={(id) => setCertForm(f => ({ ...f, empId: id }))}
              />
            </div>
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">
                Certificate File <span className="text-[#ff3d3d]">*</span>
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setUploadedFile(file)
                    if (!certForm.name) {
                      setCertForm(f => ({ ...f, name: file.name.replace(/\.[^/.]+$/, '') }))
                    }
                  }
                }}
                className="vc-input text-[11px]"
              />
              {uploadedFile && (
                <div className="mt-1 text-[10px] text-[#00e676] flex items-center gap-1">
                  <span>✓</span>
                  <span>{uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
              <div className="mt-1 text-[9px] text-[#5a6878]">Accepted: PDF, JPG, PNG (Max 10MB)</div>
            </div>
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">
                Certification Name
              </label>
              <input
                type="text"
                value={certForm.name}
                onChange={(e) => setCertForm(f => ({ ...f, name: e.target.value }))}
                className="vc-input"
                placeholder="Auto-filled from filename"
              />
            </div>
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">
                Issued By
              </label>
              <input
                type="text"
                value={certForm.issuedBy}
                onChange={(e) => setCertForm(f => ({ ...f, issuedBy: e.target.value }))}
                className="vc-input"
                placeholder="e.g., NEBOSH UK (Optional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={certForm.issueDate}
                  onChange={(e) => setCertForm(f => ({ ...f, issueDate: e.target.value }))}
                  className="vc-input"
                  style={{ fontFamily: "'Share Tech Mono', monospace" }}
                />
              </div>
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={certForm.expiryDate}
                  onChange={(e) => setCertForm(f => ({ ...f, expiryDate: e.target.value }))}
                  className="vc-input"
                  style={{ fontFamily: "'Share Tech Mono', monospace" }}
                />
              </div>
            </div>
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Status</label>
              <select
                value={certForm.status}
                onChange={(e) => setCertForm(f => ({ ...f, status: e.target.value }))}
                className="vc-input"
              >
                <option value="Valid">Valid</option>
                <option value="Expiring">Expiring</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => { setCreateCertOpen(false); resetCertForm() }} className="vc-btn-ghost py-2 px-4">Cancel</button>
            <button onClick={handleCreateCert} disabled={saving || uploading} className="vc-btn-primary flex items-center gap-1.5 py-2 px-4 disabled:opacity-50">
              {(saving || uploading) ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              {uploading ? 'Uploading...' : saving ? 'Saving...' : 'Add Certification'}
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
    </div>
  )
}
