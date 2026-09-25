import { PrismaClient } from '@prisma/client'
import { PrismaClient as SuperAdminClient } from '@prisma/superadmin-client'

const db = new PrismaClient()
const sdb = new SuperAdminClient()

async function main() {
  console.log('🌱 Seeding example data for Finance, Purchase, Sales & Notifications...')

  // Ensure demo site/job exist
  const site = await db.finSite.findFirst({ where: { siteCode: 'SITE-004' } })
  if (!site) throw new Error('SITE-004 not found - run prisma/seed.ts first')
  const job = await db.finJob.findFirst({ where: { siteId: site.id } })
  if (!job) throw new Error('Job for SITE-004 not found')

  // ── 1. Purchase Orders (Finance) ───────────────────────────────
  for (let i=1; i<=3; i++) {
    const poNo = `PO-EXAMPLE-00${i}`
    const exists = await db.finPurchaseOrder.findUnique({ where: { poNo } })
    if (!exists) {
      await db.finPurchaseOrder.create({
        data: {
          poNo,
          vendorId: 'V001',
          vendorName: `Example Vendor ${i}`,
          siteId: site.id,
          jobCode: job.jobCode,
          costCenter: 'CC-004',
          department: 'Procurement',
          projectManager: 'Example PM',
          date: new Date(),
          descriptionOfWork: `Example Purchase ${i} - Site ${site.siteCode}`,
          subtotal: 100000 * i,
          taxAmount: 18000 * i,
          totalAmount: 118000 * i,
          status: 'Approved',
        }
      })
      console.log(`✅ PO ${poNo}`)
    }
  }

  // ── 2. Sales Invoices (Finance) ────────────────────────────────
  for (let i=1; i<=5; i++) {
    const invNo = `INV-EXAMPLE-00${i}`
    const exists = await db.finInvoice.findFirst({ where: { invoiceNo: invNo, financialYear: '2025-26' } })
    if (!exists) {
      const inv = await db.finInvoice.create({
        data: {
          invoiceNo: invNo,
          siteId: site.id,
          partyId: 208, // BALCO
          client: 'BALCO Industries',
          financialYear: '2025-26',
          invoiceDate: new Date(),
          dueDate: new Date(Date.now()+ 30*86400000),
          jobCode: job.jobCode,
          costCenter: 'CC-004',
          department: 'Finance',
          projectManager: 'Example PM',
          poNo: 'PO-EXAMPLE-001',
          taxableValue: 200000 * i,
          cgstAmount: 18000 * i,
          sgstAmount: 18000 * i,
          igstAmount: 0,
          gstValue: 36000 * i,
          grandTotal: 236000 * i,
          invoiceValue: 200000 * i,
          balanceAmount: 236000 * i,
          afterTdsBalance: 236000 * i - 5000*i,
          tdsDeduction: 5000*i,
          description: `Example Sales Invoice ${i}`,
          status: i%2===0 ? 'Paid' : 'Unpaid',
        }
      })
      console.log(`✅ Invoice ${invNo} id ${inv.id}`)
    }
  }

  // ── 3. Petty Cash (already seeded, add one more example) ───────
  const pcExists = await db.finPettyCash.findFirst({ where: { voucherNo: 'PV/2025-26/999' } })
  if (!pcExists) {
    await db.finPettyCash.create({
      data: {
        voucherNo: 'PV/2025-26/999',
        date: new Date(),
        description: 'Example: Tea & site consumables',
        amount: 2500,
        type: 'Debit',
        category: 'Refreshments',
        siteId: site.id,
        jobCode: job.jobCode,
        custodian: 'Example Custodian',
        limitAmount: 50000,
        paymentMode: 'Cash',
        balance: 15000,
        approvalStatus: 'Approved',
      }
    })
    console.log('✅ Petty Cash PV/2025-26/999')
  }

  // ── 4. Notifications Ultra - 3 example P0/P1/P2 ───────────────
  const notifExamples = [
    { title: 'AP Overdue 45d — Vendor Payment Due', message: 'Steel India Pvt Ltd — ₹4,20,000 overdue 47 days (SITE-004) — MSMED interest accrual', priority: 'P0', type: 'warning', siteCode: 'SITE-004', amount: 420000 },
    { title: 'New Invoice INV-EXAMPLE-001', message: 'BALCO Industries — ₹2,36,000 • Due 30 days • SITE-004 • FY 2025-26', priority: 'P1', type: 'success', siteCode: 'SITE-004', amount: 236000 },
    { title: 'Tally Sync Completed', message: 'VoltCore • FY 2025-26 — 12 parties + 15 vouchers pushed • Created 5 Altered 0', priority: 'P2', type: 'info', siteCode: null, amount: null },
  ]
  for (const n of notifExamples) {
    const hash = `example-${n.title.slice(0,10)}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
    try {
      await db.finNotification.create({
        data: {
          userEmail: 'finance_admin@voltcore.in',
          actorEmail: 'system@example',
          entityType: 'FinInvoice',
          entityId: 'example',
          title: n.title,
          message: n.message,
          type: n.type,
          priority: n.priority,
          channel: 'inapp',
          siteCode: n.siteCode,
          finYear: '2025-26',
          amount: n.amount,
          link: '/finance?module=fin-invoices',
          status: 'unread',
          isRead: false,
          hash: hash + n.priority,
        }
      })
      console.log(`✅ Notification ${n.priority}: ${n.title}`)
    } catch {}
  }

  // ── 5. Tally Sync history - 1 example Completed ───────────────
  const tallyExists = await db.finTallySync.findFirst({ where: { fileName: 'example-export-VoltCore' } })
  if (!tallyExists) {
    await db.finTallySync.create({
      data: {
        syncType: 'Export',
        fileName: 'example-export-VoltCore',
        totalRows: 15,
        createdRows: 12,
        updatedRows: 3,
        status: 'Completed',
        direction: 'Export',
        companyName: 'VoltCore',
        finYear: '2025-26',
        voucherType: 'Sales',
        trigger: 'manual',
        actorEmail: 'finance_admin@voltcore.in',
        hash: 'example-hash',
        log: 'Example sync — CA-grade',
        syncedAt: new Date(),
      }
    })
    console.log('✅ Tally Sync example')
  }

  console.log('🎉 Example data seeded!')
  console.log('→ Invoices: 5, POs: 3, Petty Cash: 1, Notifications: 3, TallySync: 1')
}

main().catch(e=>{ console.error(e); process.exit(1)}).finally(async()=>{ await db.$disconnect(); await sdb.$disconnect(); })
