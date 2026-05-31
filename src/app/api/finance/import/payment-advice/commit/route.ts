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

async function getOrCreateInvoice(invoiceNo: string) {
  if (!invoiceNo) return null
  return db.finInvoice.findUnique({ where: { invoiceNo } })
}

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    const importedBy = String(form.get('importedBy') ?? 'Payment Advice Import')
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
    const idx = (name: string) => header.findIndex(h => h.toLowerCase() === name.toLowerCase())

    const required = ['ADVICE NO', 'AMOUNT']
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
        summaryJson: { sheetName, rowCount: rows.length - 1, type: 'payment-advice' },
      },
    })

    let createdAdvices = 0
    let createdLines = 0
    let rowErrors = 0

    const col = {
      adviceNo: idx('ADVICE NO'),
      party: idx('PARTY'),
      invoiceIds: idx('INVOICE IDS'),
      totalAmount: idx('AMOUNT'),
      paymentDate: idx('PAYMENT DATE'),
      paymentMode: idx('PAYMENT MODE'),
      referenceNo: idx('REFERENCE NO'),
      notes: idx('NOTES'),
    }

    for (let r = 1; r < rows.length; r++) {
      const rawRow = rows[r] || []
      const rowNumber = r + 1

      const rawAdviceNo = rawRow[col.adviceNo]
      const adviceNo = String(rawAdviceNo ?? '').trim()
      if (!adviceNo) continue

      const partyName = String(col.party >= 0 ? rawRow[col.party] : '').trim()
      const party = partyName ? await getOrCreateParty(partyName) : null

      const totalAmount = col.totalAmount >= 0 ? toFloat(rawRow[col.totalAmount]) : 0
      const paymentDate = col.paymentDate >= 0 ? toDate(rawRow[col.paymentDate]) ?? undefined : undefined
      const referenceNo = col.referenceNo >= 0 ? String(rawRow[col.referenceNo] ?? '').trim() || null : null
      const notes = col.notes >= 0 ? String(rawRow[col.notes] ?? '').trim() || null : null

      let existing = await db.finPaymentAdvice.findUnique({
        where: { adviceNo },
      }).catch(() => null)

      const advice = existing
        ? await db.finPaymentAdvice.update({
            where: { id: existing.id },
            data: {
              partyId: party?.id,
              totalAmount,
              paymentDate,
              referenceNo,
              notes,
            },
          })
        : await db.finPaymentAdvice.create({
            data: {
              adviceNo,
              partyId: party?.id,
              totalAmount,
              paymentDate,
              referenceNo,
              notes,
            },
          })

      createdAdvices++

      // Handle invoice lines
      const invoiceIdsRaw = col.invoiceIds >= 0 ? String(rawRow[col.invoiceIds] ?? '').trim() : ''
      if (invoiceIdsRaw) {
        const invoiceNos = invoiceIdsRaw.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean)
        for (const invNo of invoiceNos) {
          await db.finPaymentAdviceLine.create({
            data: {
              adviceId: advice.id,
              billNo: invNo,
              amount: totalAmount / invoiceNos.length,
            },
          })
          createdLines++
        }
      }
    }

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      summary: {
        sheetName,
        createdAdvices,
        createdLines,
        rowErrors,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Commit failed' }, { status: 500 })
  }
}