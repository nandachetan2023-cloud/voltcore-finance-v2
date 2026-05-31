import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

function num(v: unknown): number {
  if (v === '' || v === null || v === undefined) return 0
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

function str(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

export async function POST(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const siteName = (formData.get('site') as string) || ''

    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })

    // Detect site name from filename or first sheet content
    let site = siteName
    if (!site) {
      const firstSheet = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: '' })
      const r2 = str((raw[1] as unknown[])?.[0] || '')
      // Extract site from "Atmastco Profit & Loss A/c(April-2025)"
      const m = r2.match(/^(.+?)\s*Profit\s*&?\s*Loss/i)
      if (m) site = m[1].trim()
      else site = 'Unknown Site'
    }

    // Delete existing entries for this site (re-import)
    await (pdb as any).profitLossEntry.deleteMany({ where: { site } })

    let totalCreated = 0

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName]
      const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '', blankrows: true })
      if (raw.length < 10) continue

      const month = sheetName // e.g. "April-25", "May-25"
      const entries: { site: string; month: string; side: string; category: string; particular: string; amount: number }[] = []

      // Parse left side (debit) — columns 0-2
      let currentCategory = ''
      for (let i = 4; i < raw.length; i++) {
        const row = raw[i] as unknown[]
        const col0 = str(row[0])
        const col1 = num(row[1])
        const col2 = num(row[2])

        if (!col0 || col0 === 'Total' || col0.toLowerCase().includes('gross profit') || col0.toLowerCase().includes('gross loss')) {
          if (col0.toLowerCase().includes('gross')) currentCategory = ''
          continue
        }

        // Category headers have amounts in col2 (subtotal)
        if (col2 > 0 && col1 === 0) {
          currentCategory = col0
          continue
        }

        // Line items have amounts in col1
        if (col1 > 0) {
          entries.push({ site, month, side: 'debit', category: currentCategory || 'Direct Expenses', particular: col0, amount: col1 })
        }
      }

      // Parse right side (credit) — columns 3-5
      currentCategory = ''
      for (let i = 4; i < raw.length; i++) {
        const row = raw[i] as unknown[]
        const col3 = str(row[3])
        const col4 = num(row[4])
        const col5 = num(row[5])

        if (!col3 || col3 === 'Total' || col3.toLowerCase().includes('gross loss') || col3.toLowerCase().includes('net loss') || col3.toLowerCase().includes('net profit')) continue

        if (col5 > 0 && col4 === 0) {
          currentCategory = col3
          continue
        }

        if (col4 > 0) {
          entries.push({ site, month, side: 'credit', category: currentCategory || 'Sales Accounts', particular: col3, amount: col4 })
        }
      }

      // Bulk create
      if (entries.length > 0) {
        for (const entry of entries) {
          await (pdb as any).profitLossEntry.create({ data: entry })
        }
        totalCreated += entries.length
      }
    }

    return NextResponse.json({
      success: true,
      summary: { site, sheets: wb.SheetNames.length, entries: totalCreated },
    })
  } catch (error) {
    console.error('P&L Import error:', error)
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
