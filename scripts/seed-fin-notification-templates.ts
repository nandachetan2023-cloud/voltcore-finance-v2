/**
 * Finance notification templates seed.
 *
 * Every Finance event passes a templateCode to the notification bus
 * (src/lib/notification-bus.ts). When a FinNotificationTemplate row exists for
 * that code, its title/message/priority/channel override the defaults in code,
 * so wording and urgency can be tuned per tenant without a deploy.
 * {{placeholders}} are filled from the event's vars; {{title}} and {{message}}
 * hold the detailed default text built in code.
 *
 * Re-runnable: rows are created only when missing, so edits made in the DB are
 * never overwritten. Pass --reset to restore these defaults.
 *
 *   npx tsx scripts/seed-fin-notification-templates.ts [--reset]
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const TEMPLATES: Array<{ code: string; titleTpl: string; messageTpl: string; priority: string }> = [
  { code: 'INVOICE_CREATED', titleTpl: 'New Invoice {{invoiceNo}}', messageTpl: '{{message}}', priority: 'P1' },
  { code: 'AR_OVERDUE', titleTpl: 'Invoice {{invoiceNo}} overdue by {{days}} days', messageTpl: '{{message}}', priority: 'P1' },
  { code: 'AR_OVERDUE_45D', titleTpl: 'Invoice {{invoiceNo}} overdue by {{days}} days', messageTpl: '{{message}}. 45+ days late — escalate collection.', priority: 'P0' },
  { code: 'CREDIT_NOTE_CREATED', titleTpl: 'Credit Note {{creditNoteNo}} issued', messageTpl: '{{message}}', priority: 'P1' },
  { code: 'AP_BILL_CREATED', titleTpl: 'New AP Bill {{billNo}}', messageTpl: '{{message}}', priority: 'P2' },
  { code: 'AP_BILL_DUE_SOON', titleTpl: 'New AP Bill {{billNo}} — due within 7 days', messageTpl: '{{message}}', priority: 'P1' },
  { code: 'AP_BILL_PAID', titleTpl: 'AP Bill {{billNo}} marked Paid', messageTpl: '{{message}}', priority: 'P2' },
  { code: 'AP_OVERDUE', titleTpl: 'AP Bill {{billNo}} overdue by {{days}} days', messageTpl: '{{message}}', priority: 'P1' },
  { code: 'AP_OVERDUE_45D', titleTpl: 'AP Bill {{billNo}} overdue by {{days}} days', messageTpl: '{{message}}. MSME 45-day limit crossed — pay immediately.', priority: 'P0' },
  { code: 'PAYMENT_MADE', titleTpl: 'Payment of {{amount}} to {{payee}}', messageTpl: '{{message}}', priority: 'P2' },
  { code: 'PO_CREATED', titleTpl: 'New Purchase Order {{poNo}}', messageTpl: '{{message}}', priority: 'P2' },
  { code: 'EXPENSE_CLAIM_CREATED', titleTpl: 'New Expense Claim {{claimNo}}', messageTpl: '{{message}}', priority: 'P2' },
  { code: 'SITE_EXPENSE_APPROVAL_REQUIRED', titleTpl: 'Approval Required: Site Expense {{claimNo}}', messageTpl: '{{message}}', priority: 'P1' },
  { code: 'SITE_EXPENSE_APPROVED', titleTpl: 'Your Site Expense {{claimNo}} was approved', messageTpl: '{{message}}', priority: 'P2' },
  { code: 'SITE_EXPENSE_REJECTED', titleTpl: 'Your Site Expense {{claimNo}} was rejected', messageTpl: '{{message}}', priority: 'P1' },
  { code: 'JE_APPROVAL_REQUIRED', titleTpl: 'Approval Required: Journal {{entryNo}}', messageTpl: '{{message}}', priority: 'P1' },
  { code: 'JE_APPROVED', titleTpl: 'Your Journal {{entryNo}} was approved', messageTpl: '{{message}}', priority: 'P2' },
  { code: 'JE_REJECTED', titleTpl: 'Your Journal {{entryNo}} was rejected', messageTpl: '{{message}}', priority: 'P1' },
  { code: 'PETTY_CASH_APPROVAL_REQUIRED', titleTpl: 'Approval Required: Petty Cash {{voucherNo}}', messageTpl: '{{message}}', priority: 'P1' },
  { code: 'PETTY_CASH_APPROVED', titleTpl: 'Your Petty Cash {{voucherNo}} was approved', messageTpl: '{{message}}', priority: 'P2' },
  { code: 'PETTY_CASH_REJECTED', titleTpl: 'Your Petty Cash {{voucherNo}} was rejected', messageTpl: '{{message}}', priority: 'P1' },
  { code: 'TALLY_FAILED', titleTpl: 'Tally sync failed: {{refType}} {{voucherNo}}', messageTpl: '{{message}}', priority: 'P0' },
]

async function main() {
  const reset = process.argv.includes('--reset')
  let created = 0
  let updated = 0
  for (const t of TEMPLATES) {
    const existing = await db.finNotificationTemplate.findUnique({ where: { code: t.code } })
    if (!existing) {
      await db.finNotificationTemplate.create({ data: { ...t, channel: 'inapp' } })
      created++
    } else if (reset) {
      await db.finNotificationTemplate.update({ where: { code: t.code }, data: { ...t, channel: 'inapp' } })
      updated++
    }
  }
  console.log(`✅ Finance notification templates — ${created} created, ${updated} reset, ${TEMPLATES.length} total.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
