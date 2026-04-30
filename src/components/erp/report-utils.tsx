'use client'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'

export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
export const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export const COLORS = ['#f5a623','#00e676','#00d4ff','#ff3d3d','#a78bfa','#ffab40','#22d3ee','#f472b6']

export function fmtCurrency(n: number) {
  if (n >= 10000000) return `₹${(n/10000000).toFixed(2)} Cr`
  if (n >= 100000) return `₹${(n/100000).toFixed(2)} L`
  if (n >= 1000) return `₹${(n/1000).toFixed(1)} K`
  return `₹${n.toLocaleString('en-IN')}`
}

export function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function downloadExcel(rows: any[][], headers: string[], filename: string, sheetName = 'Report') {
  try {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = headers.map(() => ({ wch: 18 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, filename)
    toast.success('Report downloaded')
  } catch {
    toast.error('Failed to download report')
  }
}

export const TOOLTIP_STYLE = {
  background: '#1a2030', border: '1px solid #252e3a',
  borderRadius: '8px', fontSize: '11px', color: '#e2e8f0',
}

export function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="p-3 rounded-lg bg-[#141920] border border-[#252e3a] text-center">
      <div className="text-[20px] font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{value}</div>
      <div className="text-[9px] text-[#5a6878] mt-0.5 uppercase tracking-wider">{label}</div>
    </div>
  )
}

export function SummaryRow({ label, value, color = '#e2e8f0' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#141920] border border-[#252e3a]/50">
      <span className="text-[11px] text-[#8899aa]">{label}</span>
      <span className="text-[13px] font-bold font-mono" style={{ color }}>{value}</span>
    </div>
  )
}

export function ReportShell({
  title, icon: Icon, color, children, onDownload, loading,
}: {
  title: string; icon: any; color: string;
  children: React.ReactNode;
  onDownload: () => void;
  loading: boolean;
}) {
  return (
    <div className="p-4 max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
            <Icon size={18} style={{ color }} />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">{title}</h2>
            <p className="text-[11px] text-[#5a6878]">Live data from database</p>
          </div>
        </div>
        <button
          onClick={onDownload}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#00e676] text-black text-[12px] font-bold rounded-lg hover:bg-[#00c864] disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          )}
          Download Excel
        </button>
      </div>
      {children}
    </div>
  )
}
