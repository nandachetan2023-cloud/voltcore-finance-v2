'use client'
import { useState, useCallback } from 'react'
import { GraduationCap, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { ReportShell, StatBox, downloadExcel, fmtDate } from './report-utils'

export default function ReportTraining() {
  const [certs, setCerts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.fetch('/api/reports?type=training').then(r => r.json())
      if (res.success) { setCerts(res.data.certs || []); setLoaded(true) }
      else toast.error(res.error)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [])

  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 86400000)
  const valid = certs.filter(c => c.status === 'Valid').length
  const expiring = certs.filter(c => c.expiryDate && new Date(c.expiryDate) > now && new Date(c.expiryDate) < in30).length
  const expired = certs.filter(c => c.expiryDate && new Date(c.expiryDate) < now).length

  const handleDownloadCerts = () => {
    if (!certs.length) { toast.error('No certifications to download'); return }
    const headers = ['Employee ID', 'Employee Name', 'Certificate Name', 'Issued By', 'Issue Date', 'Expiry Date', 'Status']
    const rows = certs.map(c => [c.empId, c.employeeName, c.name, c.issuedBy, fmtDate(c.issueDate), fmtDate(c.expiryDate), c.status])
    downloadExcel(rows, headers, `Certifications_${new Date().toISOString().split('T')[0]}.xlsx`, 'Certifications')
  }

  return (
    <ReportShell title="Certificate Report" icon={GraduationCap} color="#a78bfa" onDownload={handleDownloadCerts} loading={loading}>
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={fetch} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-[#a78bfa] text-black text-[12px] font-bold rounded-lg hover:bg-[#9061f9] disabled:opacity-50">
          {loading ? <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <RefreshCw size={13} />}
          {loaded ? 'Refresh' : 'Generate Report'}
        </button>
      </div>

      {loaded && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Total" value={certs.length} color="#a78bfa" />
            <StatBox label="Valid" value={valid} color="#00e676" />
            <StatBox label="Expiring (30d)" value={expiring} color="#ffab40" />
            <StatBox label="Expired" value={expired} color="#ff3d3d" />
          </div>
          {expired > 0 && (
            <div className="flex items-center justify-between px-3 py-2.5 bg-[#ff3d3d]/8 border border-[#ff3d3d]/20 rounded-lg">
              <span className="text-[12px] text-[#ff3d3d] font-semibold">⚠ Expired Certificates</span>
              <span className="text-[16px] font-bold font-mono text-[#ff3d3d]">{expired}</span>
            </div>
          )}
          {expiring > 0 && (
            <div className="bg-[#161c24] border border-[#ffab40]/30 rounded-xl p-4">
              <div className="text-[10px] text-[#ffab40] uppercase tracking-wider font-semibold mb-3">Expiring in 30 Days</div>
              <div className="space-y-1 max-h-[160px] overflow-y-auto">
                {certs.filter(c => c.expiryDate && new Date(c.expiryDate) > now && new Date(c.expiryDate) < in30).map(c => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-1.5 rounded bg-[#141920] border border-[#ffab40]/20 text-[10px]">
                    <span className="text-[#e2e8f0]">{c.employeeName}</span>
                    <span className="text-[#5a6878]">{c.name}</span>
                    <span className="text-[#ffab40] font-mono font-bold">{fmtDate(c.expiryDate)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
            <div className="text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold mb-3">All Certificates</div>
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {certs.slice(0, 50).map(c => (
                <div key={c.id} className="flex items-center justify-between px-3 py-1.5 rounded bg-[#141920] border border-[#252e3a]/30 text-[10px]">
                  <span className="text-[#e2e8f0] flex-1 truncate">{c.employeeName}</span>
                  <span className="text-[#8899aa] mx-3 truncate">{c.name}</span>
                  <span className="text-[#5a6878] mr-3 font-mono">{fmtDate(c.expiryDate)}</span>
                  <span className={`px-1.5 py-[1px] rounded text-[9px] font-bold ${c.status === 'Valid' ? 'bg-[#00e676]/15 text-[#00e676]' : c.status === 'Expiring' ? 'bg-[#ffab40]/15 text-[#ffab40]' : 'bg-[#ff3d3d]/15 text-[#ff3d3d]'}`}>{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ReportShell>
  )
}
