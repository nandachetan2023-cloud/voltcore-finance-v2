import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

function normHeader(s: unknown) {
  return String(s ?? '').trim().replace(/\s+/g, ' ')
}

function toFloat(v: any): number {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const s = String(v ?? '').trim()
  if (!s || s.toLowerCase() === 'na') return 0
  const cleaned = s.replace(/,/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

function toDate(v: any): Date | null {
  if (!v) return null
  if (v instanceof Date && !isNaN(v.getTime())) return v
  if (typeof v === 'number' && Number.isFinite(v)) {
    const d = XLSX.SSF.parse_date_code(v)
    if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d))
  }
  const s = String(v ?? '').trim()
  if (!s || s.toLowerCase() === 'na') return null
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d
  return null
}

async function getOrCreateParty(nameRaw: string | null | undefined) {
  const name = String(nameRaw ?? '').trim()
  if (!name) return null
  const existing = await db.finParty.findUnique({ where: { name } })
  if (existing) return existing
  return db.finParty.create({ data: { name, isActive: true } })
}

async function getOrCreateSite(siteCodeRaw: string | null | undefined) {
  const siteCode = String(siteCodeRaw ?? '').trim()
  if (!siteCode) return null
  const existing = await db.finSite.findUnique({ where: { siteCode } })
  if (existing) return existing
  return db.finSite.create({
    data: { siteCode, name: siteCode, status: 'Active' },
  })
}

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    const importedBy = String(form.get('importedBy') ?? 'Work Order Import')
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Missing file (field name: file)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = wb.SheetNames.includes('WORK ORDER') ? 'WORK ORDER' : wb.SheetNames[0]
    const ws = wb.Sheets[sheetName]
    if (!ws) return NextResponse.json({ success: false, error: 'No sheets found' }, { status: 400 })

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]
    if (rows.length < 2) return NextResponse.json({ success: false, error: 'Sheet has no data rows' }, { status: 400 })

    const header = (rows[0] || []).map(normHeader)
    const idx = (name: string) => header.findIndex(h => h.toLowerCase() === name.toLowerCase())

    const required = ['WORK ORDER NO', 'PARTY']
    const missing = required.filter(r => idx(r) === -1)
    if (missing.length) {
      return NextResponse.json({ success: false, error: `Missing required columns: ${missing.join(', ')}` }, { status: 400 })
    }

    const batch = await db.finImportBatch.create({
      data: {
        fileName: file.name,
        fileHash: '',
        importedBy,
        status: 'completed',
        summaryJson: { sheetName, rowCount: rows.length - 1, type: 'work-order' },
      },
    })

    let createdWorkOrders = 0
    let updatedWorkOrders = 0
    let rowErrors = 0

    const col = {
      workOrderNo: idx('WORK ORDER NO'),
      party: idx('PARTY'),
      site: idx('SITE'),
      description: idx('DESCRIPTION'),
      initiationDate: idx('INITIATION DATE'),
      completionDate: idx('COMPLETION DATE'),
      amount: idx('ORDER AMOUNT'),
      financialYear: idx('FINANCIAL YEAR'),
    }

    for (let r = 1; r < rows.length; r++) {
      const rawRow = rows[r] || []
      const rowNumber = r + 1

      const rawWoNo = rawRow[col.workOrderNo]
      const woNo = String(rawWoNo ?? '').trim()
      if (!woNo) continue

      const partyName = String(rawRow[col.party] ?? '').trim()
      const party = await getOrCreateParty(partyName)
      if (!party) {
        rowErrors++
        continue
      }

      const siteCode = String(rawRow[col.site] ?? '').trim()
      const site = siteCode ? await getOrCreateSite(siteCode) : null

      const woData = {
        partyId: party.id,
        siteId: site?.id,
        workOrderNo: woNo,
        description: String(rawRow[col.description] ?? '').trim() || null,
        initiationDate: col.initiationDate >= 0 ? toDate(rawRow[col.initiationDate]) ?? undefined : undefined,
        completionDate: col.completionDate >= 0 ? toDate(rawRow[col.completionDate]) ?? undefined : undefined,
        orderAmount: col.amount >= 0 ? toFloat(rawRow[col.amount]) : 0,
        financialYear: col.financialYear >= 0 ? String(rawRow[col.financialYear] ?? '').trim() || null : null,
      }

      const existing = await db.finWorkOrder.findUnique({
        where: { partyId_workOrderNo: { partyId: party.id, workOrderNo: woNo } },
      }).catch(() => null)

      if (existing) {
        await db.finWorkOrder.update({ where: { id: existing.id }, data: woData })
        updatedWorkOrders++
      } else {
        await db.finWorkOrder.create({ data: woData })
        createdWorkOrders++
      }
    }

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      summary: {
        sheetName,
        createdWorkOrders,
        updatedWorkOrders,
        rowErrors,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Commit failed' }, { status: 500 })
  }
}