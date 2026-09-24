/**
 * Daily overdue reminders for Finance.
 *
 *  - AP bills past due and not Paid     → Finance team (P1; P0 once 45+ days late)
 *  - AR invoices past due with a balance → Finance team (P1; P0 once 45+ days late)
 *
 * Each bill/invoice notifies at most once per calendar day (dedupeKey), so the
 * sweep is safe to run as often as you like — from /api/cron/fin-overdue, or
 * opportunistically when someone opens their finance inbox.
 */
import { emitNotification, deriveFinYear, FIN_TEAM, inr } from '@/lib/notification-bus'

const CLOSED = ['Paid', 'Cancelled', 'Draft']
const DAY = 86400000

export async function runFinOverdueAlerts(pdb: any): Promise<{ ap: number; ar: number }> {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  let ap = 0
  let ar = 0

  const bills = await pdb.accountsPayable.findMany({
    where: { dueDate: { lt: now }, status: { notIn: CLOSED } },
    include: { site: { select: { siteCode: true } } },
    take: 500,
  }).catch(() => [])
  for (const b of bills) {
    const balance = (b.totalAmount || 0) - (b.paidAmount || 0)
    if (balance <= 0) continue
    const days = Math.floor((now.getTime() - new Date(b.dueDate).getTime()) / DAY)
    const siteCode = b.site?.siteCode ?? null
    ap += await emitNotification(pdb, {
      entityType: 'AccountsPayable',
      entityId: String(b.id),
      templateCode: days >= 45 ? 'AP_OVERDUE_45D' : 'AP_OVERDUE',
      vars: { billNo: b.billNo, vendor: b.vendor, amount: inr(balance), days },
      title: `AP Bill ${b.billNo} overdue by ${days} day${days === 1 ? '' : 's'}`,
      message: `${b.vendor} — ${inr(balance)} outstanding${siteCode ? ` • ${siteCode}` : ''}`,
      type: days >= 45 ? 'error' : 'warning',
      priority: days >= 45 ? 'P0' : 'P1',
      siteCode,
      jobCode: b.jobCode || null,
      finYear: deriveFinYear(b.dueDate),
      amount: balance,
      link: 'accounts-payable',
      dedupeKey: `AP_OVERDUE:${b.id}:${today}`,
      recipients: FIN_TEAM(siteCode),
    })
  }

  const invoices = await pdb.finInvoice.findMany({
    where: { dueDate: { lt: now }, status: { notIn: CLOSED } },
    include: { site: { select: { siteCode: true } } },
    take: 500,
  }).catch(() => [])
  for (const inv of invoices) {
    const balance = (inv.grandTotal || 0) - (inv.receivedAmount || 0)
    if (balance <= 0) continue
    const days = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / DAY)
    const siteCode = inv.site?.siteCode ?? null
    ar += await emitNotification(pdb, {
      entityType: 'FinInvoice',
      entityId: String(inv.id),
      templateCode: days >= 45 ? 'AR_OVERDUE_45D' : 'AR_OVERDUE',
      vars: { invoiceNo: inv.invoiceNo, client: inv.client || 'Client', amount: inr(balance), days },
      title: `Invoice ${inv.invoiceNo} overdue by ${days} day${days === 1 ? '' : 's'}`,
      message: `${inv.client || 'Client'} — ${inr(balance)} to collect${siteCode ? ` • ${siteCode}` : ''}`,
      type: days >= 45 ? 'error' : 'warning',
      priority: days >= 45 ? 'P0' : 'P1',
      siteCode,
      jobCode: inv.jobCode || null,
      finYear: deriveFinYear(inv.dueDate),
      amount: balance,
      link: 'fin-client-follow-up',
      dedupeKey: `AR_OVERDUE:${inv.id}:${today}`,
      recipients: FIN_TEAM(siteCode),
    })
  }

  return { ap, ar }
}

// Opportunistic trigger: at most once an hour per tenant DB per server process.
const lastRun = new Map<any, number>()
export function maybeRunFinOverdueAlerts(pdb: any): void {
  const t = lastRun.get(pdb) || 0
  if (Date.now() - t < 3600000) return
  lastRun.set(pdb, Date.now())
  runFinOverdueAlerts(pdb).catch(() => {})
}
