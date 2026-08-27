import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { testTallyConnection, sendToTally, DEFAULT_TALLY_CONNECTION } from '@/lib/tally-client'
import {
  partyToTallyMaster,
  invoiceToTallyVoucher,
  paymentToTallyVoucher,
  journalEntryToTallyVoucher,
  purchaseToTallyVoucher,
  deriveFinYear,
  buildMastersBatchXml,
  buildVouchersBatchXml,
  buildCombinedBatchXml,
} from '@/lib/tally-xml'
import { assertPermission } from '@/lib/fin-rbac'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function getConnection(): { host: string; port: number; timeout: number } {
  return {
    host: process.env.TALLY_HOST || 'localhost',
    port: Number(process.env.TALLY_PORT) || 9000,
    timeout: Number(process.env.TALLY_TIMEOUT) || 30000,
  }
}

function hashOf(obj: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 16)
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
        connection: { host: conn.host, port: conn.port, alive: testResult.alive, message: testResult.message, companies: (testResult as any).companies },
        counts: { parties: partyCount, invoices: invoiceCount, payments: paymentCount, journalEntries: journalCount },
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}

// ── POST: Export data to Tally ────────────────────────────────────────
export async function POST(request: NextRequest) {
  const start = Date.now()
  try {
    const body = await request.json()
    const { actions, companyName, since, finYear: finYearParam, dryRun, trigger = 'manual' } = body
    // actions: array of "parties" | "invoices" | "payments" | "journal" | "purchase" | "grn" | "creditNotes"
    // companyName: Tally company, finYear: "2025-26", dryRun: boolean, trigger: manual|scheduled|onApprove

    if (!companyName) {
      return NextResponse.json({ success: false, error: 'companyName is required' }, { status: 400 })
    }

    const pdb = getDbForRequest(request)
    // RBAC: Export requires GL_CREATE or AR_CREATE/AP_CREATE - Finance Head or higher
    const actor = body.actor || request.headers.get('x-actor-email') || ''
    const denied = await assertPermission(pdb, actor, 'GL_CREATE', { request, module: 'GL' } as any)
    if (!denied.allowed) {
      // Fallback: try AR_CREATE if GL fails (for sales-only export)
      const denied2 = await assertPermission(pdb, actor, 'AR_CREATE', { request, module: 'AR' } as any)
      if (!denied2.allowed) return NextResponse.json({ success: false, error: denied.reason || denied2.reason || 'Not allowed to export to Tally' }, { status: 403 })
    }

    const selectedActions: string[] = Array.isArray(actions) && actions.length > 0
      ? actions
      : ['parties', 'invoices', 'payments']

    const conn = getConnection()
    const tallyCompany = { name: companyName }
    // FY: derive from since or finYearParam or today
    const finYear = finYearParam || (since ? deriveFinYear(new Date(since)) : deriveFinYear(new Date()))
    const dateFilter = since ? { gte: new Date(since) } : undefined
    // Also filter by FY if provided
    const finYearFilter = finYear ? { financialYear: finYear } : undefined

    // ── 1. Pull data from ERP ──────────────────────────────────────────
    const parties = selectedActions.includes('parties')
      ? await pdb.finParty.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
      : []

    const invoices = selectedActions.includes('invoices')
      ? await pdb.finInvoice.findMany({
          where: {
            ...(dateFilter ? { invoiceDate: dateFilter } : {}),
            ...(finYearFilter ? { financialYear: finYear } : {}),
            status: { not: 'Draft' },
          },
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

    const journals = selectedActions.includes('journal')
      ? await pdb.finJournalEntry.findMany({
          where: {
            status: 'Posted',
            ...(dateFilter ? { entryDate: dateFilter } : {}),
          },
          include: { lines: { include: { account: true } } },
          orderBy: { entryDate: 'asc' },
        })
      : []

    const purchaseOrders = selectedActions.includes('purchase')
      ? await pdb.finPurchaseOrder.findMany({
          where: dateFilter ? { date: dateFilter } : {},
          orderBy: { date: 'asc' },
        })
      : []

    // ── 2. Build Tally masters ──────────────────────────────────────────
    const tallyParties = parties.map(p => partyToTallyMaster(p))

    // ── 3. Build Tally vouchers with idempotency check ──────────────────
    const tallyVouchers: ReturnType<typeof invoiceToTallyVoucher>[] = []
    const skipped: string[] = []

    for (const inv of invoices) {
      if (!inv.party) continue
      const keyHash = hashOf({ type: 'Sales', no: inv.invoiceNo, fy: finYear })
      const existing = await pdb.finTallyVoucher.findFirst({
        where: { companyName, finYear, voucherType: 'Sales', voucherNo: inv.invoiceNo, hash: keyHash, status: 'Acked' }
      })
      if (existing) { skipped.push(`Sales:${inv.invoiceNo}`); continue }
      tallyVouchers.push(invoiceToTallyVoucher({
        invoiceNo: inv.invoiceNo,
        invoiceDate: inv.invoiceDate,
        partyName: inv.party ? inv.party.name : inv.client || 'Unknown',
        taxableValue: inv.taxableValue,
        cgstAmount: inv.cgstAmount,
        sgstAmount: inv.sgstAmount,
        igstAmount: inv.igstAmount,
        cessAmount: (inv as any).cessAmount || 0,
        grandTotal: inv.grandTotal,
        gstValue: inv.gstValue,
        tdsDeduction: inv.tdsDeduction,
        retentionAmount: (inv as any).retentionAmount || 0,
        kpiDeduction: (inv as any).kpiDeduction || 0,
        safetyDeduction: (inv as any).safetyDeduction || 0,
        roundoffAmount: (inv as any).roundoffAmount || 0,
        hsnSac: inv.hsnSac,
        description: inv.description,
        placeOfSupply: (inv as any).placeOfSupply || (inv as any).state || undefined,
        costCentre: inv.costCenter || undefined,
        jobCode: inv.jobCode || undefined,
      }))
    }

    for (const pay of payments) {
      const partyName = pay.invoice?.party?.name || pay.invoice?.client || 'Unknown'
      const keyHash = hashOf({ type: 'Payment', no: pay.voucherNo, amt: pay.amount, date: pay.paymentDate })
      const existing = await pdb.finTallyVoucher.findFirst({
        where: { companyName, finYear, voucherType: 'Payment', voucherNo: pay.voucherNo || '', hash: keyHash, status: 'Acked' }
      })
      if (existing) { skipped.push(`Payment:${pay.voucherNo}`); continue }
      tallyVouchers.push(paymentToTallyVoucher({
        voucherNo: pay.voucherNo,
        paymentDate: pay.paymentDate,
        amount: pay.amount,
        invoiceNo: pay.invoice?.invoiceNo,
        partyName,
        mode: pay.paymentMode,
        costCentre: (pay as any).costCentre || undefined,
        isReceipt: false,
      }))
    }

    for (const je of journals) {
      const keyHash = hashOf({ type: 'Journal', no: je.entryNo, fy: finYear })
      const existing = await pdb.finTallyVoucher.findFirst({
        where: { companyName, finYear, voucherType: 'Journal', voucherNo: je.entryNo, hash: keyHash, status: 'Acked' }
      })
      if (existing) { skipped.push(`Journal:${je.entryNo}`); continue }
      tallyVouchers.push(journalEntryToTallyVoucher({
        entryNo: je.entryNo,
        entryDate: je.entryDate,
        description: je.description,
        costCentre: je.costCenter || undefined,
        jobCode: je.jobCode || undefined,
        lines: je.lines.map((l: any) => ({
          accountName: l.account?.name || l.account?.accountCode || 'Unknown',
          debit: l.debit || 0,
          credit: l.credit || 0,
          costCentre: l.costCenter || undefined,
          jobCode: l.jobCode || undefined,
        })),
      }))
    }

    for (const po of purchaseOrders) {
      // Purchase voucher for PO (if needed for Tally Purchase register)
      tallyVouchers.push(purchaseToTallyVoucher({
        poNo: po.poNo,
        date: po.date,
        partyName: po.vendorName,
        subtotal: po.subtotal,
        taxAmount: po.taxAmount,
        totalAmount: po.totalAmount,
        costCentre: po.costCenter || undefined,
        jobCode: po.jobCode || undefined,
      }))
    }

    // ── 4. Build XML (fix: combined when both) ─────────────────────────
    let xml = ''
    const hasParties = tallyParties.length > 0
    const hasVouchers = tallyVouchers.length > 0
    if (hasParties && hasVouchers) {
      xml = buildCombinedBatchXml(tallyParties, tallyVouchers, tallyCompany)
    } else if (hasParties) {
      xml = buildMastersBatchXml(tallyParties, tallyCompany)
    } else if (hasVouchers) {
      xml = buildVouchersBatchXml(tallyVouchers, tallyCompany)
    } else {
      return NextResponse.json({ success: true, data: { message: 'Nothing to export (all filtered or already Acked)', skipped, finYear, company: companyName } })
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        data: {
          dryRun: true,
          finYear,
          company: companyName,
          parties: tallyParties.length,
          vouchers: tallyVouchers.length,
          skipped,
          xmlPreview: xml.slice(0, 3000),
          vouchersPreview: tallyVouchers.slice(0, 2),
        }
      })
    }

    // ── 5. Send to Tally ──────────────────────────────────────────────
    const result = await sendToTally(xml, conn)
    const durationMs = Date.now() - start
    const hash = hashOf({ companyName, finYear, parties: tallyParties.length, vouchers: tallyVouchers.map(v=>v.voucherNumber).join(',') })

    // ── 6. Log & create FinTallyVoucher links ──────────────────────────
    try {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
      await pdb.finTallySync.create({
        data: {
          syncType: 'Export',
          fileName: `export-${companyName}-${finYear}-${Date.now()}`,
          totalRows: tallyParties.length + tallyVouchers.length,
          createdRows: result.created,
          updatedRows: result.altered,
          skippedRows: skipped.length,
          errorRows: result.rejected,
          status: result.success ? 'Completed' : 'Failed',
          rawJson: JSON.stringify({ actions, partiesSent: tallyParties.length, vouchersSent: tallyVouchers.length, skipped }),
          log: result.message + (result.errors.length ? ` | Errors: ${result.errors.join('; ')}` : ''),
          syncedAt: new Date(),
          direction: 'Export',
          companyName,
          finYear,
          voucherType: hasVouchers ? tallyVouchers[0]?.voucherTypeName : 'Masters',
          trigger,
          hash,
          alterID: result.alterIDs[0] || null,
          actorEmail: actor || null,
          actorIp: ip || null,
          durationMs,
          attemptCount: 1,
        },
      })

      // Create per-voucher links for idempotency
      for (let i = 0; i < tallyVouchers.length; i++) {
        const v = tallyVouchers[i]
        const vHash = hashOf({ type: v.voucherTypeName, no: v.voucherNumber, fy: finYear })
        const alterID = result.alterIDs[i] || null
        await pdb.finTallyVoucher.upsert({
          where: { companyName_finYear_voucherType_voucherNo: { companyName, finYear, voucherType: v.voucherTypeName, voucherNo: v.voucherNumber } },
          update: { hash: vHash, status: result.success ? 'Acked' : 'Failed', tallyAlterID: alterID, responseXml: result.rawXml.slice(0, 8000) },
          create: {
            companyName, finYear, voucherType: v.voucherTypeName, voucherNo: v.voucherNumber,
            erpRefType: v.voucherTypeName === 'Sales' ? 'FinInvoice' : v.voucherTypeName === 'Journal' ? 'FinJournalEntry' : 'AccountsPayable',
            erpRefId: 0,
            hash: vHash, status: result.success ? 'Acked' : 'Failed', tallyAlterID: alterID,
            jsonPayload: v as any, responseXml: result.rawXml.slice(0, 8000), createdBy: actor || null,
          },
        }).catch(()=>{})
      }
    } catch { /* non-critical */ }

    return NextResponse.json({
      success: result.success,
      data: {
        connected: true,
        company: companyName,
        finYear,
        hosts: `${conn.host}:${conn.port}`,
        summary: {
          partiesSent: tallyParties.length,
          vouchersSent: tallyVouchers.length,
          skipped: skipped.length,
          created: result.created,
          altered: result.altered,
          rejected: result.rejected,
        },
        message: result.message,
        errors: result.errors,
        alterIDs: result.alterIDs,
        responseXml: result.rawXml.slice(0, 3000),
        trigger,
        dryRun: false,
      },
      error: result.success ? undefined : result.message,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
