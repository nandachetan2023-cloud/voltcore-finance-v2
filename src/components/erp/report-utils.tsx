'use client'
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

// Fill/font colours for attendance-style status codes (used when the export
// declares a status column via options.statusColumn).
const STATUS_STYLE: Record<string, { fill: string; font: string }> = {
  present: { fill: 'FFE2EFDA', font: 'FF375623' },
  p: { fill: 'FFE2EFDA', font: 'FF375623' },
  late: { fill: 'FFFCE4D6', font: 'FF833C00' },
  half_day: { fill: 'FFFFF2CC', font: 'FF7F6000' },
  half: { fill: 'FFFFF2CC', font: 'FF7F6000' },
  hd: { fill: 'FFFFF2CC', font: 'FF7F6000' },
  absent: { fill: 'FFFCE4E4', font: 'FFC00000' },
  a: { fill: 'FFFCE4E4', font: 'FFC00000' },
  leave: { fill: 'FFDDEBF7', font: 'FF1F4E79' },
  on_leave: { fill: 'FFDDEBF7', font: 'FF1F4E79' },
  l: { fill: 'FFDDEBF7', font: 'FF1F4E79' },
  week_off: { fill: 'FFEDEDED', font: 'FF7F7F7F' },
  weekoff: { fill: 'FFEDEDED', font: 'FF7F7F7F' },
  wo: { fill: 'FFEDEDED', font: 'FF7F7F7F' },
  holiday: { fill: 'FFEDEDED', font: 'FF7F7F7F' },
  hl: { fill: 'FFEDEDED', font: 'FF7F7F7F' },
  'p/wo': { fill: 'FFC6E0B4', font: 'FF375623' },
  sp: { fill: 'FFC6E0B4', font: 'FF375623' },
}

/**
 * Styled Excel export via ExcelJS (SheetJS community build drops all cell styling
 * on write). Coloured title-less header band, borders, zebra striping, and — when
 * `options.statusColumn` (1-based) is given — the status cell is tinted by its
 * value so Present/Absent/Leave/etc. read at a glance.
 */
export async function downloadExcel(
  rows: any[][],
  headers: string[],
  filename: string,
  sheetName = 'Report',
  options?: { statusColumn?: number; numericColumns?: number[] },
) {
  try {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] })

    const C = { headBg: 'FF2E75B6', headFg: 'FFFFFFFF', border: 'FFBFBFBF', zebra: 'FFF2F6FC' }
    const thin = { style: 'thin' as const, color: { argb: C.border } }
    const allBorders = { top: thin, left: thin, bottom: thin, right: thin }
    const numericCols = new Set(options?.numericColumns ?? [])

    ws.columns = headers.map((h) => ({ width: Math.max(12, Math.min(30, h.length + 4)) }))

    // Header row
    const headerRow = ws.addRow(headers)
    headerRow.height = 22
    headerRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { bold: true, size: 10, color: { argb: C.headFg } }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headBg } }
      cell.border = allBorders
    })

    // Data rows
    rows.forEach((r, i) => {
      const row = ws.addRow(r)
      row.height = 15
      const zebra = i % 2 === 1
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { size: 9 }
        cell.border = allBorders
        cell.alignment = { vertical: 'middle', horizontal: numericCols.has(colNumber) ? 'right' : 'left' }
        if (options?.statusColumn && colNumber === options.statusColumn) {
          const key = String(cell.value ?? '').toLowerCase().replace(/[\s-]+/g, '_')
          const st = STATUS_STYLE[key] || STATUS_STYLE[key.replace(/_/g, '')]
          if (st) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: st.fill } }
            cell.font = { size: 9, bold: true, color: { argb: st.font } }
            cell.alignment = { vertical: 'middle', horizontal: 'center' }
          }
        } else if (zebra) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.zebra } }
        }
      })
    })

    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } }

    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.endsWith('.xlsx') ? filename : filename.replace(/\.[^.]+$/, '') + '.xlsx'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success('Report downloaded')
  } catch {
    toast.error('Failed to download report')
  }
}

// CSV export — opens cleanly in Excel/Sheets and needs no extra dependency.
export function downloadCSV(rows: any[][], headers: string[], filename: string) {
  try {
    const esc = (v: any) => {
      const s = v == null ? '' : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\n')
    // Prepend BOM so Excel reads UTF-8 (₹, accented names) correctly.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.endsWith('.csv') ? filename : filename.replace(/\.[^.]+$/, '') + '.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success('Report downloaded')
  } catch {
    toast.error('Failed to download report')
  }
}

// PDF export — landscape table via jsPDF + autotable, with an optional title.
export async function downloadPDF(rows: any[][], headers: string[], filename: string, title?: string) {
  try {
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    if (title) {
      doc.setFontSize(13)
      doc.text(title, 40, 32)
    }
    autoTable(doc, {
      head: [headers],
      body: rows.map(r => r.map(c => (c == null ? '' : String(c)))),
      startY: title ? 44 : 24,
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [22, 28, 36], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 20, right: 20 },
    })
    doc.save(filename.endsWith('.pdf') ? filename : filename.replace(/\.[^.]+$/, '') + '.pdf')
    toast.success('Report downloaded')
  } catch {
    toast.error('Failed to download PDF')
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
    <div className="p-4 space-y-4">
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
