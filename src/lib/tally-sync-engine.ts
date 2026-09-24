// ── Tally Sync Engine ──────────────────────────────────────────────
// Central helper for auto-push (manual/scheduled/onApprove) + FY/series

import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import { deriveFinYear } from './tally-xml'
import { sendToTally } from './tally-client'
import { invoiceToTallyVoucher, journalEntryToTallyVoucher, paymentToTallyVoucher } from './tally-xml'
import { buildVouchersBatchXml } from './tally-xml'

export function getFinYear(d: Date): string {
  return deriveFinYear(d)
}

export async function allocateVoucherNo(pdb: any, finYear: string, type: string, prefix: string): Promise<string> {
  // Gapless via FinVoucherSeries with row lock (transaction)
  return await pdb.$transaction(async (tx: any) => {
    const series = await tx.finVoucherSeries.upsert({
      where: { finYear_type: { finYear, type } },
      update: {},
      create: { finYear, type, lastNo: 0 },
    })
    const next = series.lastNo + 1
    await tx.finVoucherSeries.update({ where: { id: series.id }, data: { lastNo: next } })
    return `${prefix}/${finYear.slice(2)}/${String(next).padStart(4,'0')}`
  })
}

export async function autoPushSingle(
  pdb: any,
  refType: string,
  refId: number,
  opts: { trigger: string; actor: string; companyName: string; finYear?: string }
): Promise<{ success: boolean; message: string }> {
  try {
    const cfg = await pdb.syncConfig.findUnique({ where: { module: 'tally-export' } })
    if (cfg && cfg.enabled === false) return { success: false, message: 'Tally auto-sync disabled' }
    if (opts.trigger === 'onApprove' && cfg && cfg.autoSync === false) return { success: false, message: 'onApprove auto-sync disabled in config' }

    const companyName = opts.companyName
    let voucher: any = null
    let finYear = opts.finYear || ''
    let hash = ''

    if (refType === 'FinJournalEntry') {
      const je = await pdb.finJournalEntry.findUnique({ where: { id: refId }, include: { lines: { include: { account: true } } } })
      if (!je) return { success: false, message: 'Journal not found' }
      finYear = finYear || getFinYear(je.entryDate)
      voucher = journalEntryToTallyVoucher({
        entryNo: je.entryNo,
        entryDate: je.entryDate,
        description: je.description,
        costCentre: je.costCenter,
        jobCode: je.jobCode,
        lines: je.lines.map((l: any) => ({ accountName: l.account?.name || l.account?.accountCode || 'Unknown', debit: l.debit, credit: l.credit, costCentre: l.costCentre, jobCode: l.jobCode })),
      })
      hash = crypto.createHash('sha256').update(JSON.stringify(voucher)).digest('hex').slice(0,16)
    } else if (refType === 'FinInvoice') {
      const inv = await pdb.finInvoice.findUnique({ where: { id: refId }, include: { party: true } })
      if (!inv) return { success: false, message: 'Invoice not found' }
      finYear = finYear || getFinYear(inv.invoiceDate)
      voucher = invoiceToTallyVoucher({
        invoiceNo: inv.invoiceNo,
        invoiceDate: inv.invoiceDate,
        partyName: inv.party?.name || inv.client || 'Unknown',
        taxableValue: inv.taxableValue,
        cgstAmount: inv.cgstAmount,
        sgstAmount: inv.sgstAmount,
        igstAmount: inv.igstAmount,
        cessAmount: (inv as any).cessAmount || 0,
        grandTotal: inv.grandTotal,
        tdsDeduction: inv.tdsDeduction,
        retentionAmount: (inv as any).retentionAmount,
        hsnSac: inv.hsnSac,
        description: inv.description,
        costCentre: inv.costCenter,
        jobCode: inv.jobCode,
      })
      hash = crypto.createHash('sha256').update(JSON.stringify(voucher)).digest('hex').slice(0,16)
    } else {
      return { success: false, message: `Unsupported refType ${refType}` }
    }

    // Idempotency: skip if already Acked with same hash
    const existing = await pdb.finTallyVoucher.findFirst({
      where: { companyName, finYear, voucherType: voucher.voucherTypeName, voucherNo: voucher.voucherNumber, hash, status: 'Acked' }
    })
    if (existing) return { success: true, message: `Already synced: ${voucher.voucherTypeName} ${voucher.voucherNumber}` }

    const conn = { host: process.env.TALLY_HOST || 'localhost', port: Number(process.env.TALLY_PORT) || 9000, timeout: 30000 }
    const xml = buildVouchersBatchXml([voucher], { name: companyName })
    const result = await sendToTally(xml, conn)

    await pdb.finTallySync.create({
      data: {
        syncType: 'Export',
        fileName: `auto-${refType}-${refId}-${Date.now()}`,
        totalRows: 1,
        createdRows: result.created,
        updatedRows: result.altered,
        errorRows: result.rejected,
        status: result.success ? 'Completed' : 'Failed',
        rawJson: JSON.stringify(voucher),
        log: result.message,
        syncedAt: new Date(),
        direction: 'Export',
        companyName,
        finYear,
        voucherType: voucher.voucherTypeName,
        trigger: opts.trigger,
        hash,
        alterID: result.alterIDs[0] || null,
        actorEmail: opts.actor || null,
        durationMs: 0,
      }
    })

    await pdb.finTallyVoucher.upsert({
      where: { companyName_finYear_voucherType_voucherNo: { companyName, finYear, voucherType: voucher.voucherTypeName, voucherNo: voucher.voucherNumber } },
      update: { hash, status: result.success ? 'Acked' : 'Failed', tallyAlterID: result.alterIDs[0] || null, responseXml: result.rawXml.slice(0,8000) },
      create: {
        companyName, finYear, voucherType: voucher.voucherTypeName, voucherNo: voucher.voucherNumber,
        erpRefType: refType, erpRefId: refId, hash, status: result.success ? 'Acked' : 'Failed',
        tallyAlterID: result.alterIDs[0] || null, jsonPayload: voucher as any, responseXml: result.rawXml.slice(0,8000), createdBy: opts.actor || null,
      }
    }).catch(()=>{})

    if (!result.success) await notifyTallyFailure(pdb, refType, refId, voucher.voucherNumber, finYear, result.message)
    return { success: result.success, message: result.message }
  } catch (e: any) {
    await notifyTallyFailure(pdb, refType, refId, String(refId), null, e.message || 'autoPush failed')
    return { success: false, message: e.message || 'autoPush failed' }
  }
}

async function notifyTallyFailure(pdb: any, refType: string, refId: number | string, voucherNo: string, finYear: string | null, reason: string) {
  const { emitNotification, FIN_APPROVERS } = await import('@/lib/notification-bus')
  await emitNotification(pdb, {
    entityType: refType,
    entityId: String(refId),
    templateCode: 'TALLY_FAILED',
    vars: { refType, voucherNo, reason },
    title: `Tally sync failed: ${refType} ${voucherNo}`,
    message: reason || 'Tally rejected the voucher or was unreachable',
    type: 'error',
    priority: 'P0',
    finYear,
    link: 'tally-sync',
    // Same failure reported at most once per hour per voucher.
    dedupeKey: `TALLY_FAILED:${refType}:${refId}:${Math.floor(Date.now() / 3600000)}`,
    recipients: FIN_APPROVERS(),
  }).catch(() => 0)
}
