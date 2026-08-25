import { PrismaClient } from '@prisma/client'

const TENANT_DB_URL = 'postgresql://postgres:postgres@localhost:5432/erp_finance_dev?schema=public&sslmode=disable'

const db = new PrismaClient()
const tenantDb = new PrismaClient({ datasources: { db: { url: TENANT_DB_URL } } })

async function seedOne(prisma: PrismaClient, label: string) {
  console.log(`\n📦 Seeding [${label}]...`)

  // ── 1. Customers ──
  console.log('  Seeding Customers...')
  const customers = [
    { name: 'Reliance Industries Ltd', contactPerson: 'Amit Shah', email: 'procurement@ril.com', phone: '+91-22-45678901', address: 'Maker Chamber IV, Nariman Point', city: 'Mumbai', state: 'Maharashtra', pincode: '400021', gstin: '27AAACR1234G1ZM', stateCode: '27' },
    { name: 'Tata Steel Ltd', contactPerson: 'Rajesh Kumar', email: 'sourcing@tatasteel.com', phone: '+91-657-2345678', address: 'Tata Centre, Bistupur', city: 'Jamshedpur', state: 'Jharkhand', pincode: '831001', gstin: '20AAACT4567H1ZP', stateCode: '20' },
    { name: 'NTPC Ltd', contactPerson: 'Suresh Reddy', email: 'contracts@ntpc.co.in', phone: '+91-11-24360123', address: 'NTPC Bhawan, Lodhi Road', city: 'New Delhi', state: 'Delhi', pincode: '110003', gstin: '07AAACN7890K1ZL', stateCode: '07' },
    { name: 'UltraTech Cement Ltd', contactPerson: 'Vikram Patel', email: 'purchase@ultratech.com', phone: '+91-22-66984321', address: 'Aditya Birla Centre, Worli', city: 'Mumbai', state: 'Maharashtra', pincode: '400030', gstin: '27AAACU1122M1ZQ', stateCode: '27' },
    { name: 'Indian Oil Corporation Ltd', contactPerson: 'Manish Gupta', email: 'materials@iocl.co.in', phone: '+91-11-26509900', address: 'Indian Oil Bhawan, Janpath', city: 'New Delhi', state: 'Delhi', pincode: '110001', gstin: '07AAACI3344N1ZP', stateCode: '07' },
    { name: 'JSW Steel Ltd', contactPerson: 'Arun Nair', email: 'supplychain@jsw.in', phone: '+91-80-26781500', address: 'JSW Centre, Bannerghatta Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560076', gstin: '29AAACJ5566P1ZR', stateCode: '29' },
    { name: 'Adani Power Ltd', contactPerson: 'Prakash Singh', email: 'procurement@adani.com', phone: '+91-79-25557111', address: 'Adani Corporate House, Shantigram', city: 'Ahmedabad', state: 'Gujarat', pincode: '382421', gstin: '24AAACA7788Q1ZS', stateCode: '24' },
    { name: 'Hindalco Industries Ltd', contactPerson: 'Ravi Verma', email: 'purchase@hindalco.com', phone: '+91-22-66627000', address: 'Birla Castle, Carmichael Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400026', gstin: '27AAACH9900R1ZT', stateCode: '27' },
    { name: 'Bharat Petroleum Corp Ltd', contactPerson: 'Sunil Tiwari', email: 'materials@bharatpetroleum.in', phone: '+91-22-22713000', address: 'Bharat Bhawan, Ballard Estate', city: 'Mumbai', state: 'Maharashtra', pincode: '400038', gstin: '27AAACB2233S1ZU', stateCode: '27' },
    { name: 'Larsen & Toubro Ltd', contactPerson: 'Deepak Joshi', email: 'suppliers@lnt.com', phone: '+91-22-67525600', address: 'L&T House, Ballard Estate', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', gstin: '27AAACL4455T1ZV', stateCode: '27' },
  ]
  for (const c of customers) {
    const existing = await prisma.customer.findFirst({ where: { name: c.name } })
    const data = { ...c, updatedAt: new Date() }
    if (existing) {
      await prisma.customer.update({ where: { id: existing.id }, data })
    } else {
      await prisma.customer.create({ data })
    }
  }
  console.log(`  ✓ ${customers.length} customers created`)

  // ── 2. Sales Tax Invoices ──
  console.log('  Seeding SalesTaxInvoice...')
  const custRecords = await prisma.customer.findMany()
  const ril = custRecords.find(c => c.name.includes('Reliance'))
  const tatasteel = custRecords.find(c => c.name.includes('Tata Steel'))
  const ntpc = custRecords.find(c => c.name.includes('NTPC'))
  if (!ril || !tatasteel || !ntpc) {
    console.log('  ⚠ Customers not found, skipping tax invoices')
    return
  }

  const invoices = [
    {
      invoiceNo: 'SI-2025-001', invoiceDate: new Date('2025-01-10'), dueDate: new Date('2025-02-10'),
      customerId: ril.id, customerName: ril.name, customerGstin: ril.gstin,
      customerAddress: ril.address, customerState: ril.state, customerStateCode: '27',
      billingAddress: ril.address, shippingAddress: ril.address,
      placeOfSupply: 'Maharashtra', poNo: 'RI-PO-AMC-Q1', poDate: new Date('2025-01-01'),
      taxableAmount: 6355932, cgstRate: 9, sgstRate: 9, igstRate: 0,
      cgstAmount: 572034, sgstAmount: 572034, igstAmount: 0, cessAmount: 0,
      totalAmount: 7500000, status: 'Issued',
      terms: 'Payment due within 30 days. Late payment attracts 18% interest p.a.',
      declaration: 'Certified that the above goods/services are as per the contract.',
      place: 'Mumbai',
    },
    {
      invoiceNo: 'SI-2025-002', invoiceDate: new Date('2025-01-15'), dueDate: new Date('2025-03-15'),
      customerId: tatasteel.id, customerName: tatasteel.name, customerGstin: tatasteel.gstin,
      customerAddress: tatasteel.address, customerState: tatasteel.state, customerStateCode: '20',
      billingAddress: tatasteel.address, shippingAddress: tatasteel.address,
      placeOfSupply: 'Jharkhand', poNo: 'TS-PO-SHD-BF3', poDate: new Date('2025-01-05'),
      taxableAmount: 8474576, cgstRate: 9, sgstRate: 9, igstRate: 0,
      cgstAmount: 762712, sgstAmount: 762712, igstAmount: 0, cessAmount: 0,
      totalAmount: 10000000, status: 'Issued',
      terms: '50% advance, 50% on completion. Retention @10% for 6 months.',
      declaration: 'Certified that the work has been completed as per scope.',
      place: 'Jamshedpur',
    },
    {
      invoiceNo: 'SI-2025-003', invoiceDate: new Date('2025-01-05'), dueDate: new Date('2025-02-28'),
      customerId: ntpc.id, customerName: ntpc.name, customerGstin: ntpc.gstin,
      customerAddress: ntpc.address, customerState: ntpc.state, customerStateCode: '07',
      billingAddress: ntpc.address, shippingAddress: ntpc.address,
      placeOfSupply: 'Delhi', poNo: 'NTPC-PO-OM-JAN', poDate: new Date('2024-12-15'),
      taxableAmount: 4237288, cgstRate: 9, sgstRate: 9, igstRate: 0,
      cgstAmount: 381356, sgstAmount: 381356, igstAmount: 0, cessAmount: 0,
      totalAmount: 5000000, status: 'Paid',
      terms: 'Net 45 days from invoice date.',
      declaration: 'Certified that O&M services for January 2025 are complete.',
      place: 'New Delhi',
    },
  ]
  for (const inv of invoices) {
    const now = new Date()
    await prisma.salesTaxInvoice.upsert({
      where: { invoiceNo: inv.invoiceNo },
      update: { updatedAt: now },
      create: { ...inv, updatedAt: now },
    })
  }
  console.log(`  ✓ ${invoices.length} tax invoices created`)

  // ── 3. Sales Tax Invoice Items ──
  console.log('  Seeding SalesTaxInvoiceItem...')
  const invRecords = await prisma.salesTaxInvoice.findMany()
  const itemsData: { invoiceNo: string; items: any[] }[] = [
    { invoiceNo: 'SI-2025-001', items: [
      { description: 'AMC Retainer Fee - Rotating Equipment Q1 FY25', hsnSac: '998713', uom: 'Nos', quantity: 1, rate: 6355932, taxableValue: 6355932, cgstPercent: 9, sgstPercent: 9, igstPercent: 0, cgstAmount: 572034, sgstAmount: 572034, total: 7500000 },
    ]},
    { invoiceNo: 'SI-2025-002', items: [
      { description: 'BF-3 Shutdown Mobilisation - Mechanical Work', hsnSac: '998715', uom: 'Lot', quantity: 1, rate: 5000000, taxableValue: 5000000, cgstPercent: 9, sgstPercent: 9, igstPercent: 0, cgstAmount: 450000, sgstAmount: 450000, total: 5900000 },
      { description: 'BF-3 Shutdown - Electrical & Instrumentation', hsnSac: '998716', uom: 'Lot', quantity: 1, rate: 3474576, taxableValue: 3474576, cgstPercent: 9, sgstPercent: 9, igstPercent: 0, cgstAmount: 312712, sgstAmount: 312712, total: 4100000 },
    ]},
    { invoiceNo: 'SI-2025-003', items: [
      { description: 'O&M January 2025 - Boiler Maintenance', hsnSac: '998713', uom: 'Month', quantity: 1, rate: 2500000, taxableValue: 2500000, cgstPercent: 9, sgstPercent: 9, igstPercent: 0, cgstAmount: 225000, sgstAmount: 225000, total: 2950000 },
      { description: 'O&M January 2025 - Turbine Maintenance', hsnSac: '998713', uom: 'Month', quantity: 1, rate: 1737288, taxableValue: 1737288, cgstPercent: 9, sgstPercent: 9, igstPercent: 0, cgstAmount: 156356, sgstAmount: 156356, total: 2050000 },
    ]},
  ]
  for (const group of itemsData) {
    const inv = invRecords.find(i => i.invoiceNo === group.invoiceNo)
    if (!inv) continue
    await prisma.salesTaxInvoiceItem.deleteMany({ where: { invoiceId: inv.id } })
    for (const item of group.items) {
      await prisma.salesTaxInvoiceItem.create({ data: { invoiceId: inv.id, ...item } })
    }
  }
  console.log(`  ✓ ${itemsData.reduce((s, g) => s + g.items.length, 0)} invoice items created`)
}

async function main() {
  console.log('🌱 Seeding customers and sales data...\n')

  await seedOne(db, 'default (erp)')
  try {
    await seedOne(tenantDb, 'tenant (erp_finance_dev)')
    await tenantDb.$disconnect()
  } catch (e: any) {
    console.log(`\n⚠ Tenant DB seed skipped: ${e.message}`)
  }

  await db.$disconnect()
  console.log('\n🎉 Sales seed complete!')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
