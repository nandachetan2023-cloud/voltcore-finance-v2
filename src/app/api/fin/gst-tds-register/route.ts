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
        ? { gte: from ? new Date(`${from}T00:00:00`) : undefined, lte: to ? new Date(`${to}T23:59:59.999`) : undefined }
        : undefined

    if (type === 'gst-sales') {
      const invoices = await pdb.finInvoice.findMany({
        where: {
          ...(dateFilter ? { invoiceDate: dateFilter } : {}),
          status: { notIn: ['Draft', 'Rejected', 'Cancelled'] },
        },
        include: { party: true, site: true, taxCode: true },
        orderBy: { invoiceDate: 'desc' },
      })
      const rows = invoices.filter((invoice: any) => invoice.taxCode?.status === 'Approved').map((i: any) => ({
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
      const bills = await pdb.accountsPayable.findMany({
        where: {
          ...(dateFilter ? { billDate: dateFilter } : {}),
          itcEligible: true,
          itcReviewedAt: { not: null },
          status: { in: ['Approved', 'Partially Paid', 'Paid'] },
        },
        include: { site: true, taxCode: true },
        orderBy: { billDate: 'desc' },
      })
      const rows = bills.filter((bill: any) => bill.taxCode?.status === 'Approved').map((bill: any) => ({
        billNo: bill.billNo,
        date: bill.billDate,
        vendor: bill.vendor,
        siteCode: bill.site?.siteCode || null,
        taxableValue: bill.amount,
        gstItc: bill.tax,
        total: bill.totalAmount,
        status: bill.status,
      }))
      const totals = rows.reduce(
        (a, r) => ({ taxableValue: a.taxableValue + r.taxableValue, gstItc: a.gstItc + r.gstItc, total: a.total + r.total }),
        { taxableValue: 0, gstItc: 0, total: 0 }
      )
      return NextResponse.json({ success: true, data: { rows, totals } })
    }

    if (type === 'gstr3b') {
      const invoiceRecords = await pdb.finInvoice.findMany({
        where: {
          ...(dateFilter ? { invoiceDate: dateFilter } : {}),
          status: { notIn: ['Draft', 'Rejected', 'Cancelled'] },
        },
        include: { taxCode: true },
      })
      const invoices = invoiceRecords.filter((invoice: any) => invoice.taxCode?.status === 'Approved')
      const bills = await pdb.accountsPayable.findMany({
        where: {
          ...(dateFilter ? { billDate: dateFilter } : {}),
          itcEligible: true,
          itcReviewedAt: { not: null },
          status: { in: ['Approved', 'Partially Paid', 'Paid'] },
        },
        include: { taxCode: true },
      })
      const eligibleBills = bills.filter((bill: any) => bill.taxCode?.status === 'Approved')
      const outwardTaxable = invoices.reduce((s, i) => s + i.taxableValue, 0)
      const outputCgst = invoices.reduce((s, i) => s + i.cgstAmount, 0)
      const outputSgst = invoices.reduce((s, i) => s + i.sgstAmount, 0)
      const outputIgst = invoices.reduce((s, i) => s + i.igstAmount, 0)
      const itcAvailable = eligibleBills.reduce((sum: number, bill: any) => sum + bill.tax, 0)
      const outputTaxTotal = outputCgst + outputSgst + outputIgst
      return NextResponse.json({
        success: true,
        data: {
          outwardTaxableValue: outwardTaxable,
          outputCgst, outputSgst, outputIgst, outputTaxTotal,
          itcAvailable,
          netPayable: Math.max(0, outputTaxTotal - itcAvailable),
          invoiceCount: invoices.length,
          poCount: eligibleBills.length,
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

    if (type === 'gstr1') {
      const invoices = await pdb.finInvoice.findMany({
        where: {
          ...(dateFilter ? { invoiceDate: dateFilter } : {}),
          status: { notIn: ['Draft', 'Rejected', 'Cancelled'] },
        },
        include: { party: true, site: true, taxCode: true },
        orderBy: { invoiceDate: 'desc' },
      })
      const approved = invoices.filter((invoice: any) => invoice.taxCode?.status === 'Approved')
      const rows = approved.map((i: any) => ({
        gstin: i.party?.gstin || null,
        party: i.party?.name || '—',
        invoiceNo: i.invoiceNo,
        invoiceDate: i.invoiceDate,
        invoiceValue: i.grandTotal || i.invoiceValue,
        placeOfSupply: i.placeOfSupply || null,
        rate: i.taxCode?.rate || null,
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

    if (type === 'form-26q') {
      const rows = await pdb.finTdsDeduction.findMany({
        where: dateFilter ? { deductionDate: dateFilter } : undefined,
        include: { party: true },
        orderBy: { deductionDate: 'desc' },
      })
      const bySection = new Map<string, { section: string; count: number; taxable: number; deducted: number }>()
      for (const r of rows) {
        const key = r.section || 'Unspecified'
        const cur = bySection.get(key) || { section: key, count: 0, taxable: 0, deducted: 0 }
        cur.count += 1
        cur.taxable += r.taxableAmount
        cur.deducted += r.deductionAmount
        bySection.set(key, cur)
      }
      const sections = Array.from(bySection.values()).sort((a, b) => b.deducted - a.deducted)
      const totalPayable = sections.reduce((s, r) => s + r.deducted, 0)
      const detailRows = rows.map((r) => ({
        deducteeName: r.party?.name || '—',
        pan: r.party?.pan || '',
        section: r.section,
        rate: r.rate,
        taxableAmount: r.taxableAmount,
        deductionAmount: r.deductionAmount,
        paidAmount: r.paidAmount,
        status: r.status,
        documentId: r.documentId,
        date: r.deductionDate,
      }))
      return NextResponse.json({ success: true, data: { detailRows, sections, totalPayable } })
    }

    return NextResponse.json({ success: false, error: `Unknown report type: ${type}` }, { status: 400 })
  } catch (error) {
    console.error('Error building GST/TDS register:', error)
    return NextResponse.json({ success: false, error: 'Failed to build report' }, { status: 500 })
  }
}
