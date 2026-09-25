import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

function normHeader(s: unknown) {
  return String(s ?? '').trim().replace(/\s+/g, ' ')
}

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Missing file (field name: file)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })

    const sheetName = wb.SheetNames.includes('PAYMENT ADVICE') ? 'PAYMENT ADVICE' : wb.SheetNames[0]
    const ws = wb.Sheets[sheetName]
    if (!ws) return NextResponse.json({ success: false, error: 'No sheets found' }, { status: 400 })

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]
    if (rows.length < 2) return NextResponse.json({ success: false, error: 'Sheet has no data rows' }, { status: 400 })

    const header = (rows[0] || []).map(normHeader)
    const sample = rows.slice(1, 21).map((r) => {
      const obj: Record<string, any> = {}
      for (let i = 0; i < header.length; i++) obj[header[i] || `UNNAMED_${i + 1}`] = r?.[i] ?? ''
      return obj
    })

    return NextResponse.json({
      success: true,
      sheetName,
      header,
      rowCount: rows.length - 1,
      sample,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Preview failed' }, { status: 500 })
  }
}