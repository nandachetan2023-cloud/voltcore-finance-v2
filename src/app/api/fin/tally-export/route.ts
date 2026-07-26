import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { testTallyConnection, sendToTally, DEFAULT_TALLY_CONNECTION } from '@/lib/tally-client'
import {
  partyToTallyMaster,
  invoiceToTallyVoucher,
  paymentToTallyVoucher,
  buildMastersBatchXml,
  buildVouchersBatchXml,
} from '@/lib/tally-xml'

export const dynamic = 'force-dynamic'

function getConnection(): { host: string; port: number; timeout: number } {
  return {
    host: process.env.TALLY_HOST || 'localhost',
    port: Number(process.env.TALLY_PORT) || 9000,
    timeout: Number(process.env.TALLY_TIMEOUT) || 30000,
  }
}

// ── GET: Test connection + return entity counts ───────────────────────
export async function GET(request: NextRequest) {
  try {
    const conn = getConnection()
    const testResult = await testTallyConnection(conn)
    const pdb = getDbForRequest(request)

    const [partyCount, invoiceCount, paymentCount, journalCount] = await Promise.all([
      pdb.finParty.count({ where: { isActive: true } }),
      pdb.finInvoice.count(),
      pdb.finPayment.count(),
      pdb.finJournalEntry.count({ where: { status: 'Posted' } }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        connection: { host: conn.host, port: conn.port, alive: testResult.alive, message: testResult.message },
        counts: { parties: partyCount, invoices: invoiceCount, payments: paymentCount, journalEntries: journalCount },
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}

// ── POST: Export data to Tally ────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { actions, companyName, since } = body
    // actions: array of "parties" | "invoices" | "payments" | "journal"
    // companyName: name of the Tally company to import into
    // since: ISO date string to filter records (optional)

    if (!companyName) {
      return NextResponse.json({ success: false, error: 'companyName is required' }, { status: 400 })
    }

    const selectedActions: string[] = Array.isArray(actions) && actions.length > 0
      ? actions
      : ['parties', 'invoices', 'payments']

    const conn = getConnection()
    const pdb = getDbForRequest(request)
    const tallyCompany = { name: companyName }
    const dateFilter = since ? { gte: new Date(since) } : undefined

    // ── 1. Pull data from ERP ──────────────────────────────────────────
    const parties = selectedActions.includes('parties')
      ? await pdb.finParty.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
      : []

    const invoices = selectedActions.includes('invoices')
      ? await pdb.finInvoice.findMany({
          where: dateFilter ? { invoiceDate: dateFilter } : {},
          include: { party: true },
          orderBy: { invoiceDate: 'asc' },
        })
      : []

    const payments = selectedActions.includes('payments')
      ? await pdb.finPayment.findMany({
          where: dateFilter ? { paymentDate: dateFilter } : {},
          include: { invoice: { include: { party: true } } },
          orderBy: { paymentDate: 'asc' },
        })
      : []

    // ── 2. Build Tally masters (parties as ledgers) ──────────────────
    const tallyParties = parties.map(p => partyToTallyMaster(p))

    // ── 3. Build Tally vouchers ──────────────────────────────────────
    const tallyVouchers: ReturnType<typeof invoiceToTallyVoucher>[] = []

    for (const inv of invoices) {
      if (!inv.party) continue
      tallyVouchers.push(invoiceToTallyVoucher({
        invoiceNo: inv.invoiceNo,
        invoiceDate: inv.invoiceDate,
        partyName: inv.party ? inv.party.name : inv.client || 'Unknown',
        taxableValue: inv.taxableValue,
        cgstAmount: inv.cgstAmount,
        sgstAmount: inv.sgstAmount,
        igstAmount: inv.igstAmount,
        grandTotal: inv.grandTotal,
        gstValue: inv.gstValue,
        status: inv.status,
        hsnSac: inv.hsnSac,
        description: inv.description,
      }))
    }

    for (const pay of payments) {
      const partyName = pay.invoice?.party?.name || pay.invoice?.client || 'Unknown'
      tallyVouchers.push(paymentToTallyVoucher({
        voucherNo: pay.voucherNo,
        paymentDate: pay.paymentDate,
        amount: pay.amount,
        invoiceNo: pay.invoice?.invoiceNo,
        partyName,
        mode: pay.paymentMode,
      }))
    }

    // ── 4. Build XML ─────────────────────────────────────────────────
    const xml = selectedActions.includes('parties')
      ? buildMastersBatchXml(tallyParties, tallyCompany)
      : buildVouchersBatchXml(tallyVouchers, tallyCompany)

    // ── 5. Send to Tally ──────────────────────────────────────────────
    const result = await sendToTally(xml, conn)

    // ── 6. Log the export ─────────────────────────────────────────────
    try {
      await pdb.finTallySync.create({
        data: {
          syncType: 'DayBook',
          fileName: `export-${companyName}-${Date.now()}`,
          totalRows: tallyParties.length + tallyVouchers.length,
          createdRows: result.success ? tallyParties.length + tallyVouchers.length : 0,
          updatedRows: 0,
          skippedRows: 0,
          errorRows: result.success ? 0 : 1,
          status: result.success ? 'Completed' : 'Failed',
          rawJson: JSON.stringify({ actions, partiesSent: tallyParties.length, vouchersSent: tallyVouchers.length }),
          log: result.message,
          syncedAt: new Date(),
        },
      })
    } catch { /* non-critical log write */ }

    return NextResponse.json({
      success: result.success,
      data: {
        connected: true,
        company: companyName,
        hosts: `${conn.host}:${conn.port}`,
        summary: {
          partiesSent: tallyParties.length,
          vouchersSent: tallyVouchers.length,
        },
        message: result.message,
        responseXml: result.rawXml.slice(0, 2000),
      },
      error: result.success ? undefined : result.message,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
