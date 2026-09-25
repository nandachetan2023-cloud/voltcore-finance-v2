import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Read-only aggregation over existing Fin models — no new tables. Backs the
// GST & TDS Register tab in taxation.tsx (Finance & Accounts spec section 6).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'gst-sales'
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const pdb = getDbForRequest(request)

    const dateFilter =
      from || to
        ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined }
        : undefined

    if (type === 'gst-sales') {
      const invoices = await pdb.finInvoice.findMany({
        where: dateFilter ? { invoiceDate: dateFilter } : undefined,
        include: { party: true, site: true },
        orderBy: { invoiceDate: 'desc' },
      })
      const rows = invoices.map((i) => ({
        invoiceNo: i.invoiceNo,
        date: i.invoiceDate,
        party: i.party?.name || i.client || '—',
        gstin: i.party?.gstin || null,
        siteCode: i.site?.siteCode || null,
        taxableValue: i.taxableValue,
        cgst: i.cgstAmount,
        sgst: i.sgstAmount,
        igst: i.igstAmount,
        cess: i.cessAmount,
        total: i.grandTotal || i.invoiceValue,
      }))
      const totals = rows.reduce(
        (a, r) => ({
          taxableValue: a.taxableValue + r.taxableValue,
          cgst: a.cgst + r.cgst,
          sgst: a.sgst + r.sgst,
          igst: a.igst + r.igst,
          cess: a.cess + r.cess,
          total: a.total + r.total,
        }),
        { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, total: 0 }
      )
      return NextResponse.json({ success: true, data: { rows, totals } })
    }

    if (type === 'gst-purchase') {
      const pos = await pdb.finPurchaseOrder.findMany({
        where: dateFilter ? { date: dateFilter } : undefined,
        include: { site: true },
        orderBy: { date: 'desc' },
      })
      const rows = pos.map((p) => ({
        poNo: p.poNo,
        date: p.date,
        vendor: p.vendorName,
        siteCode: p.site?.siteCode || null,
        taxableValue: p.subtotal,
        gstItc: p.taxAmount,
        total: p.totalAmount,
        status: p.status,
      }))
      const totals = rows.reduce(
        (a, r) => ({ taxableValue: a.taxableValue + r.taxableValue, gstItc: a.gstItc + r.gstItc, total: a.total + r.total }),
        { taxableValue: 0, gstItc: 0, total: 0 }
      )
      return NextResponse.json({ success: true, data: { rows, totals } })
    }

    if (type === 'gstr3b') {
      const invoices = await pdb.finInvoice.findMany({ where: dateFilter ? { invoiceDate: dateFilter } : undefined })
      const pos = await pdb.finPurchaseOrder.findMany({ where: dateFilter ? { date: dateFilter } : undefined })
      const outwardTaxable = invoices.reduce((s, i) => s + i.taxableValue, 0)
      const outputCgst = invoices.reduce((s, i) => s + i.cgstAmount, 0)
      const outputSgst = invoices.reduce((s, i) => s + i.sgstAmount, 0)
      const outputIgst = invoices.reduce((s, i) => s + i.igstAmount, 0)
      const itcAvailable = pos.reduce((s, p) => s + p.taxAmount, 0)
      const outputTaxTotal = outputCgst + outputSgst + outputIgst
      return NextResponse.json({
        success: true,
        data: {
          outwardTaxableValue: outwardTaxable,
          outputCgst, outputSgst, outputIgst, outputTaxTotal,
          itcAvailable,
          netPayable: Math.max(0, outputTaxTotal - itcAvailable),
          invoiceCount: invoices.length,
          poCount: pos.length,
        },
      })
    }

    if (type === 'tds-register') {
      const rows = await pdb.finTdsDeduction.findMany({
        where: dateFilter ? { deductionDate: dateFilter } : undefined,
        include: { party: true },
        orderBy: { deductionDate: 'desc' },
      })
      const totals = rows.reduce(
        (a, r) => ({ taxable: a.taxable + r.taxableAmount, deducted: a.deducted + r.deductionAmount, paid: a.paid + r.paidAmount }),
        { taxable: 0, deducted: 0, paid: 0 }
      )
      return NextResponse.json({
        success: true,
        data: {
          rows: rows.map((r) => ({
            documentId: r.documentId,
            date: r.deductionDate,
            party: r.party?.name || '—',
            section: r.section,
            rate: r.rate,
            taxableAmount: r.taxableAmount,
            deductionAmount: r.deductionAmount,
            paidAmount: r.paidAmount,
            status: r.status,
          })),
          totals,
        },
      })
    }

    if (type === 'tds-payable') {
      const rows = await pdb.finTdsDeduction.findMany({ where: { status: 'Deducted' } })
      const bySection = new Map<string, { section: string; taxable: number; deducted: number; count: number }>()
      for (const r of rows) {
        const key = r.section || 'Unspecified'
        const cur = bySection.get(key) || { section: key, taxable: 0, deducted: 0, count: 0 }
        cur.taxable += r.taxableAmount
        cur.deducted += r.deductionAmount
        cur.count += 1
        bySection.set(key, cur)
      }
      const sections = Array.from(bySection.values()).sort((a, b) => b.deducted - a.deducted)
      const totalPayable = sections.reduce((s, r) => s + r.deducted, 0)
      return NextResponse.json({ success: true, data: { sections, totalPayable } })
    }

    return NextResponse.json({ success: false, error: `Unknown report type: ${type}` }, { status: 400 })
  } catch (error) {
    console.error('Error building GST/TDS register:', error)
    return NextResponse.json({ success: false, error: 'Failed to build report' }, { status: 500 })
  }
}
