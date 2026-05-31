import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function normHeader(s: unknown) {
  return String(s ?? '').trim().replace(/\s+/g, ' ')
}

function toFloat(v: any): number {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const s = String(v).trim()
  if (!s || s.toLowerCase() === 'na') return 0
  const cleaned = s.replace(/,/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

function toDate(v: any): Date | null {
  if (!v) return null
  if (v instanceof Date && !isNaN(v.getTime())) return v

  // XLSX may give Excel serial numbers
  if (typeof v === 'number' && Number.isFinite(v)) {
    const d = XLSX.SSF.parse_date_code(v)
    if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d))
  }

  const s = String(v).trim()
  if (!s || s.toLowerCase() === 'na') return null
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d
  return null
}

function deriveFinancialYear(invoiceNo: string): string | null {
  // e.g. UA/24-25/015 -> 2024-25
  const m = invoiceNo.match(/(\d{2})-(\d{2})/)
  if (!m) return null
  const a = Number(m[1])
  const b = Number(m[2])
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return `20${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`
}

async function getOrCreateDefaultSite() {
  const siteCode = 'FIN_DEFAULT'
  const existing = await db.finSite.findUnique({ where: { siteCode } })
  if (existing) return existing
  return db.finSite.create({
    data: {
      siteCode,
      name: 'Finance Default',
      status: 'Active',
    },
  })
}

async function getOrCreateParty(nameRaw: string | null | undefined) {
  const name = String(nameRaw ?? '').trim()
  if (!name) return null
  const existing = await db.finParty.findUnique({ where: { name } })
  if (existing) return existing
  return db.finParty.create({ data: { name, isActive: true } })
}

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    const importedBy = String(form.get('importedBy') ?? '')
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Missing file (field name: file)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex')

    const wb = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = wb.SheetNames.includes('OS DETAILS') ? 'OS DETAILS' : wb.SheetNames[0]
    const ws = wb.Sheets[sheetName]
    if (!ws) return NextResponse.json({ success: false, error: 'No sheets found' }, { status: 400 })

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]
    if (rows.length < 2) return NextResponse.json({ success: false, error: 'Sheet has no data rows' }, { status: 400 })

    const header = (rows[0] || []).map(normHeader)
    const idx = (name: string) => header.findIndex(h => h.toLowerCase() === name.toLowerCase())

    const required = ['BILL NO.', 'CLIENT', 'BILL DATE']
    const missing = required.filter(r => idx(r) === -1)
    if (missing.length) {
      return NextResponse.json({ success: false, error: `Missing required columns: ${missing.join(', ')}` }, { status: 400 })
    }

    const batch = await db.finImportBatch.create({
      data: {
        templateId: null,
        fileName: file.name,
        fileHash,
        importedBy,
        status: 'completed',
        summaryJson: { sheetName, rowCount: rows.length - 1 },
      },
    })

    const defaultSite = await getOrCreateDefaultSite()

    let createdInvoices = 0
    let updatedInvoices = 0
    let createdPayments = 0
    let createdDeductions = 0
    let createdCreditNotes = 0
    let rowErrors = 0

    // Column names from OS DETAILS (as seen in profile)
    const col = {
      trackingNo: idx('TRACKING NO.'),
      poNo: idx('PO NO.'),
      billNo: idx('BILL NO.'),
      client: idx('CLIENT'),
      area: idx('AREA'),
      month: idx('MONTH'),
      billDate: idx('BILL DATE'),
      invoiceValue: idx('INVOICE VALUE'),
      gstValue: idx('GST VALUE'),
      totalInvoice: idx('TOTAL INVOICE VALUE'),
      tds: idx('TDS DEDUCTION'),
      kpi: idx('KPI DEDUCTION'),
      safety: idx('SAFETY DEDUCTION/Retention'),
      creditNote: idx('Credit Note'),
      otherDed: idx('OTHER/ADVANCE DEDUCTION'),
      totalDed: idx('TOTAL DEDUCTION'),
      afterTds: idx('AFTER TDS BALANCE AMT.'),
      received1: idx('RECEIVED AMOUNT'),
      received2: idx('RECEIVED AMOUNT-2 PH'),
      receivedDate: idx('RECEIVED DATE'),
      voucherNo: idx('VOUCHER NO.'),
      roundoff: idx('ROUNDOFF AMOUNT'),
      balance: idx('BALANCE AMOUNT'),
      remarks: idx('REMARKS'),
    } as const

    for (let r = 1; r < rows.length; r++) {
      const rawRow = rows[r] || []
      const rowNumber = r + 1 // Excel row number (1-based)

      const rawBillNo = rawRow[col.billNo]
      const invoiceNo = String(rawBillNo ?? '').trim()
      if (!invoiceNo) continue

      const partyName = String(rawRow[col.client] ?? '').trim()
      const party = await getOrCreateParty(partyName)
      if (!party) {
        rowErrors++
        await db.finImportRowError.create({
          data: {
            batchId: batch.id,
            sheetName,
            rowNumber,
            column: 'CLIENT',
            message: 'CLIENT is required',
            severity: 'error',
          },
        })
        continue
      }

      const fy = deriveFinancialYear(invoiceNo)
      const billDate = toDate(rawRow[col.billDate])
      const dueDate = billDate ?? new Date()
      const invoiceDate = billDate ?? new Date()

      const trackingNo = String(rawRow[col.trackingNo] ?? '').trim() || null
      const poNo = String(rawRow[col.poNo] ?? '').trim() || null
      const area = String(rawRow[col.area] ?? '').trim() || null
      const month = String(rawRow[col.month] ?? '').trim() || null
      const remarks = String(rawRow[col.remarks] ?? '').trim() || null

      const invoiceValue = toFloat(rawRow[col.invoiceValue])
      const gstValue = toFloat(rawRow[col.gstValue])
      const grandTotal = col.totalInvoice >= 0 ? toFloat(rawRow[col.totalInvoice]) : invoiceValue + gstValue

      const tds = col.tds >= 0 ? toFloat(rawRow[col.tds]) : 0
      const kpi = col.kpi >= 0 ? toFloat(rawRow[col.kpi]) : 0
      const safety = col.safety >= 0 ? toFloat(rawRow[col.safety]) : 0
      const otherDeduction = col.otherDed >= 0 ? toFloat(rawRow[col.otherDed]) : 0
      const roundoffAmount = col.roundoff >= 0 ? toFloat(rawRow[col.roundoff]) : 0
      const creditNoteAmt = col.creditNote >= 0 ? toFloat(rawRow[col.creditNote]) : 0

      const totalDeduction = col.totalDed >= 0
        ? toFloat(rawRow[col.totalDed])
        : (tds + kpi + safety + otherDeduction + creditNoteAmt + roundoffAmount)

      const afterTdsBalance = col.afterTds >= 0 ? toFloat(rawRow[col.afterTds]) : Math.max(0, grandTotal - totalDeduction)
      const balanceAmount = col.balance >= 0 ? toFloat(rawRow[col.balance]) : afterTdsBalance

      const receivedDate = col.receivedDate >= 0 ? toDate(rawRow[col.receivedDate]) : null
      const voucherNo = col.voucherNo >= 0 ? String(rawRow[col.voucherNo] ?? '').trim() || null : null
      const received1 = col.received1 >= 0 ? toFloat(rawRow[col.received1]) : 0
      const received2 = col.received2 >= 0 ? toFloat(rawRow[col.received2]) : 0
      const totalReceived = received1 + received2

      const importRow = await db.finImportRow.create({
        data: {
          batchId: batch.id,
          sheetName,
          rowNumber,
          raw: Object.fromEntries(header.map((h, i) => [h || `UNNAMED_${i + 1}`, rawRow[i] ?? ''])),
        },
      })

      try {
        const existing = await db.finInvoice.findUnique({
          where: {
            partyId_invoiceNo_financialYear: {
              partyId: party.id,
              invoiceNo,
              financialYear: fy ?? '',
            },
          },
        }).catch(() => null)

        const invData = {
          invoiceNo,
          trackingNo,
          poNo,
          siteId: defaultSite.id,
          partyId: party.id,
          client: partyName || null,
          area,
          month,
          financialYear: fy ?? '',
          invoiceDate,
          dueDate,
          invoiceValue,
          gstValue,
          grandTotal,
          tdsDeduction: tds,
          kpiDeduction: kpi,
          safetyDeduction: safety,
          otherDeduction,
          totalDeduction,
          afterTdsBalance,
          receivedAmount: totalReceived,
          receivedDate: receivedDate ?? undefined,
          voucherNo: voucherNo ?? undefined,
          roundoffAmount,
          balanceAmount,
          remarks,
          status: balanceAmount <= 0 ? 'Paid' : 'Unpaid',
        }

        const invoice = existing
          ? await db.finInvoice.update({ where: { id: existing.id }, data: invData })
          : await db.finInvoice.create({ data: invData })

        if (existing) updatedInvoices++
        else createdInvoices++

        // Deductions (normalized)
        const deductions: Array<[string, number]> = [
          ['TDS', tds],
          ['KPI', kpi],
          ['SAFETY', safety],
          ['OTHER', otherDeduction],
          ['ROUND_OFF', roundoffAmount],
          ['CREDIT_NOTE', creditNoteAmt],
        ]
        for (const [type, amount] of deductions) {
          if (!amount) continue
          await db.finInvoiceDeduction.create({
            data: { invoiceId: invoice.id, type, amount, remarks: `Imported from OS DETAILS (${file.name})` },
          })
          createdDeductions++
        }

        // Receipts (split into many rows; keep voucherNo in payments)
        if (received1 > 0) {
          await db.finPayment.create({
            data: {
              invoiceId: invoice.id,
              amount: received1,
              paymentDate: receivedDate ?? invoiceDate,
              paymentMode: 'Bank Transfer',
              voucherNo,
              referenceNo: voucherNo,
              remarks: 'Imported (RECEIVED AMOUNT)',
            },
          })
          createdPayments++
        }
        if (received2 > 0) {
          await db.finPayment.create({
            data: {
              invoiceId: invoice.id,
              amount: received2,
              paymentDate: receivedDate ?? invoiceDate,
              paymentMode: 'Bank Transfer',
              voucherNo,
              referenceNo: voucherNo,
              remarks: 'Imported (RECEIVED AMOUNT-2 PH)',
            },
          })
          createdPayments++
        }

        // Credit note (amount only; detailed CN import should come from Credit Note workbook)
        if (creditNoteAmt > 0) {
          await db.finCreditNote.create({
            data: {
              creditNoteNo: `AUTO-CN-${invoiceNo}-${batch.id.slice(0, 8)}-${rowNumber}`,
              trackingNo,
              poNo,
              invoiceId: invoice.id,
              siteId: defaultSite.id,
              creditNoteAgainstInvoiceNo: invoiceNo,
              client: partyName || null,
              area,
              monthWork: month,
              date: invoiceDate,
              amount: creditNoteAmt,
              status: 'Issued',
              remarks: 'Auto-created from OS DETAILS (amount only)',
            },
          })
          createdCreditNotes++
        }

        // Link row error relation is optional; keep for future
        void importRow
      } catch (err: any) {
        rowErrors++
        await db.finImportRowError.create({
          data: {
            batchId: batch.id,
            rowId: importRow.id,
            sheetName,
            rowNumber,
            message: err?.message || 'Import failed for row',
            severity: 'error',
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      summary: {
        sheetName,
        createdInvoices,
        updatedInvoices,
        createdPayments,
        createdDeductions,
        createdCreditNotes,
        rowErrors,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Commit failed' }, { status: 500 })
  }
}

