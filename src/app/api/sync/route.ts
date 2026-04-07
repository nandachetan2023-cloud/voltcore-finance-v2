import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const ALL_MODULES = [
  'employees',
  'inventory',
  'sales',
  'projects',
  'finance',
  'equipment',
  'attendance',
  'payroll',
] as const
type SyncModule = (typeof ALL_MODULES)[number]

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randFloat(min: number, max: number, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

// ─────────────────────────────────────────────
// Realistic Indian Data Pools
// ─────────────────────────────────────────────

const INDIAN_FIRST = [
  'Rajesh', 'Priya', 'Amit', 'Sunita', 'Vikram', 'Anita', 'Suresh', 'Meena',
  'Mohan', 'Kavita', 'Arjun', 'Deepa', 'Ravi', 'Pooja', 'Sanjay', 'Rekha',
  'Ashok', 'Neeta', 'Ramesh', 'Suman', 'Dinesh', 'Lakshmi', 'Harish', 'Sarita',
  'Naveen', 'Swati', 'Pradeep', 'Geeta', 'Manoj', 'Kiran',
]
const INDIAN_LAST = [
  'Kumar', 'Sharma', 'Patel', 'Singh', 'Reddy', 'Gupta', 'Verma', 'Iyer',
  'Nair', 'Joshi', 'Rao', 'Menon', 'Pillai', 'Chauhan', 'Mehta', 'Das',
  'Mishra', 'Agarwal', 'Chopra', 'Malhotra', 'Bhatia', 'Kulkarni', 'Deshmukh', 'Nayak',
  'Pandey', 'Tiwari', 'Saxena', 'Bansal', 'Chawla', 'Garg',
]
const TRADES = [
  'Electrician', 'Welder', 'Fitter', 'Plumber', 'Mason', 'Painter',
  'Carpenter', 'Instrument Technician', 'Mechanic', 'Rigger',
  'Scaffolder', 'Crane Operator', 'Steel Fixer', 'HVAC Technician', 'Civil Foreman',
]
const ROLES = [
  'Supervisor', 'Foreman', 'Chargehand', 'Skilled Worker', 'Semi-Skilled Worker',
  'Helper', 'Site Engineer', 'Safety Officer', 'QC Inspector', 'Project Manager',
]
const SITES = [
  'TPP Adani Godda', 'TPP NTPC Barh', 'TPP Tata Mundra', 'TPP Reliance Sasan',
  'SPPL Jhajjar', 'TPP Vedanta Jharsuguda', 'Substation Dadri', 'TPP NLC Neyveli',
]
const INVENTORY_NAMES: Record<string, string[]> = {
  Electrical: [
    'Circuit Breaker 32A', 'Circuit Breaker 63A', 'MCCB 100A', 'MCCB 250A',
    'Cable 4mm 100m', 'Cable 6mm 100m', 'Cable 10mm 100m', 'Cable 16mm 100m',
    'XLPE Cable 3Cx240mm', 'HT Cable 11kV', 'Cable Tray 300x100', 'GI Conduit 25mm',
    'PVC Conduit 20mm', 'Earthing Strip 50x6mm', 'Lightning Arrester 11kV',
  ],
  Mechanical: [
    'Pipe ERW 50mm', 'Pipe ERW 80mm', 'Pipe CS 150mm NB', 'Flange WN 150#',
    'Gate Valve 50mm', 'Globe Valve 80mm', 'Check Valve 100mm', 'Gasket Spiral Wound',
    'Stud Bolt M20x80', 'Welding Rod E7018 3.2mm', 'Welding Rod E6013 2.5mm',
    'Grinding Wheel 100mm', 'Cutting Wheel 125mm', 'Bearing 6205 2RS',
  ],
  Civil: [
    'OPC Cement 50kg', 'Steel Bar TMT 12mm', 'Steel Bar TMT 16mm',
    'Steel Bar TMT 20mm', 'MS Plate 6mm', 'MS Angle 50x50x6',
    'Concrete Mix M25', 'Sand River', 'Aggregate 20mm', 'Brick 1st Class',
    'Waterproofing Compound', 'Formwork Plywood 12mm',
  ],
  Safety: [
    'Safety Helmet', 'Safety Shoes IS 15298', 'Safety Goggle', 'Hand Gloves Rubber',
    'Full Body Harness', 'Safety Belt', 'Ear Plug 3M', 'Fire Extinguisher ABC 5kg',
    'Safety Cone', 'Reflective Jacket', 'Welding Mask', 'Respirator 3M 6200',
  ],
  Instrumentation: [
    'Pressure Gauge 0-10kg', 'Temperature Sensor PT100', 'Flow Meter DN50',
    'Level Transmitter', 'Control Valve DN80', 'PLC Module Siemens S7',
    'Cable TRS 2x1.5mm', 'Instrument Air Filter', 'RTD Thermocouple',
  ],
}
const INVENTORY_CATEGORIES = Object.keys(INVENTORY_NAMES)
const WAREHOUSES = ['WH-A Main Store', 'WH-B Electrical Store', 'WH-C Mechanical Store', 'WH-D Yard Store']
const UNITS = ['Nos', 'Meters', 'Kg', 'Bags', 'Boxes', 'Rolls', 'Pcs', 'Sets', 'Litres']
const INDIAN_COMPANIES = [
  'L&T Construction', 'Tata Projects', 'BHEL', 'Reliance Infrastructure',
  'Adani Power', 'NTPC Ltd', 'JSW Energy', 'Sterling and Wilson',
  'Thermal Power Corp', 'KEC International', 'Kalpataru Power', 'Gammon India',
]
const PROJECT_TYPES = ['Erection', 'Commissioning', 'Maintenance', 'EPC', 'Turnkey']
const PROJECT_NAMES = [
  '660MW Supercritical Unit 5 Erection', '500MW Unit 3 Overhaul',
  '220kV Switchyard Commissioning', 'Boiler TG Package Erection',
  'CW Pipe Line Installation', 'Ash Handling Plant Maintenance',
  'FGD System Installation', 'ESP Erection & Commissioning',
  'Coal Handling Plant EPC', 'Cooling Tower Civil Works',
  'HRSG Duct Erection', 'Turbine Bypass System',
]
const VENDORS = [
  'Siemens India Ltd', 'ABB India Ltd', 'Schneider Electric', 'Legrand India',
  'Havells India', 'Crompton Greaves', 'Polycab India', 'Finolex Cables',
  'KEI Industries', 'Sterlite Technologies', 'Jindal Steel & Power', 'SAIL',
  'Ultratech Cement', 'ACC Ltd', 'Ambuja Cements',
]
const EQUIPMENT_NAMES = [
  'Tower Crane TC-5610', 'Mobile Crane 50T', 'EOT Crane 10T',
  'Welding Machine Lincoln 350', 'Generator Set 500kVA', 'Generator Set 250kVA',
  'Air Compressor 10bar', 'Concrete Pump 45m', 'Batching Plant 30m³/hr',
  'Excavator CAT 320', 'JCB 3DX Backhoe Loader', 'Vibratory Roller 8T',
  'Transit Mixer 6m³', 'Manlift 18m', 'Scaffolding Set 6m',
  'NDT Machine Ultrasonic', 'DTH Drilling Rig', 'DG Set Cummins 1000kVA',
]
const WORK_PERMIT_TYPES = [
  'Hot Work', 'Height Work', 'Confined Space', 'Excavation',
  'Electrical Isolation', 'Radiography', 'Chemical Handling', 'Crane Operation',
]
const LEDGER_ACCOUNTS = [
  { code: '1001', name: 'Cash in Hand', group: 'Current Assets', type: 'Asset' },
  { code: '1101', name: 'SBI Current Account', group: 'Bank Accounts', type: 'Asset' },
  { code: '1102', name: 'HDFC Term Deposit', group: 'Bank Accounts', type: 'Asset' },
  { code: '1201', name: 'Accounts Receivable', group: 'Current Assets', type: 'Asset' },
  { code: '1301', name: 'Inventory - Materials', group: 'Current Assets', type: 'Asset' },
  { code: '1401', name: 'Work in Progress', group: 'Current Assets', type: 'Asset' },
  { code: '2001', name: 'Accounts Payable', group: 'Current Liabilities', type: 'Liability' },
  { code: '2101', name: 'TDS Payable', group: 'Statutory Dues', type: 'Liability' },
  { code: '2102', name: 'GST Payable', group: 'Statutory Dues', type: 'Liability' },
  { code: '2103', name: 'PF Payable', group: 'Statutory Dues', type: 'Liability' },
  { code: '2104', name: 'ESI Payable', group: 'Statutory Dues', type: 'Liability' },
  { code: '2201', name: 'Bank OD', group: 'Secured Loans', type: 'Liability' },
  { code: '3001', name: 'Share Capital', group: 'Equity', type: 'Equity' },
  { code: '3101', name: 'Retained Earnings', group: 'Equity', type: 'Equity' },
  { code: '4001', name: 'Project Revenue', group: 'Income', type: 'Income' },
  { code: '4101', name: 'Other Income', group: 'Income', type: 'Income' },
  { code: '5001', name: 'Labour Cost', group: 'Project Cost', type: 'Expense' },
  { code: '5101', name: 'Material Cost', group: 'Project Cost', type: 'Expense' },
  { code: '5201', name: 'Plant & Machinery Cost', group: 'Project Cost', type: 'Expense' },
  { code: '5301', name: 'Subcontractor Cost', group: 'Project Cost', type: 'Expense' },
  { code: '5401', name: 'Admin & Overheads', group: 'Indirect Cost', type: 'Expense' },
  { code: '5501', name: 'Depreciation', group: 'Indirect Cost', type: 'Expense' },
]

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function futureDate(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function pastDate(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

// ─────────────────────────────────────────────
// Module Sync Functions
// ─────────────────────────────────────────────

async function syncEmployees(batchId: string) {
  const startedAt = new Date()
  let recordsSynced = 0
  let errors = 0
  const logs: { module: string; action: string; recordId: string; status: string; recordData?: string; conflictReason?: string; duration: number; recordsSynced: number }[] = []

  const count = randInt(3, 6)

  // Get existing employee count to generate unique empIds
  const existing = await db.employee.findMany({ select: { empId: true } })
  const existingIds = new Set(existing.map((e: { empId: string }) => e.empId))

  for (let i = 0; i < count; i++) {
    const firstName = pick(INDIAN_FIRST)
    const lastName = pick(INDIAN_LAST)
    const name = `${firstName} ${lastName}`
    const trade = pick(TRADES)
    const role = pick(ROLES)
    const site = pick(SITES)
    const type = Math.random() > 0.4 ? 'Staff' : 'Labour'
    const status = Math.random() > 0.1 ? 'Active' : pick(['On Leave', 'Transferred', 'Notice Period'])

    // Generate unique empId
    let empId: string
    let attempt = 0
    do {
      empId = `EMP-${String(existingIds.size + i + 1 + attempt).padStart(3, '0')}`
      attempt++
    } while (existingIds.has(empId) && attempt < 100)

    const joiningDate = pastDate(randInt(30, 730))
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@voltcore.in`
    const phone = `+91-${randInt(7000, 9999)}${randInt(100000, 999999)}`
    const certs = Math.random() > 0.5
      ? `${pick(['BOCW', 'NEBOSH', 'IOSH', 'First Aid', 'Fire Safety'])}, ${pick(['Gas Testing', 'Scaffolding', 'Welding AWS', 'Electrical Safety', 'Crane Operation'])}`
      : ''

    const isConflict = Math.random() < 0.1

    try {
      const employee = await db.employee.create({
        data: {
          empId,
          name,
          email,
          phone,
          trade,
          role,
          site,
          type,
          status,
          joiningDate,
          certifications: certs,
        },
      })

      recordsSynced++

      // Create attendance for today
      try {
        const attendanceStatus = Math.random() > 0.08 ? 'Present' : pick(['Absent', 'Leave', 'Half Day'])
        await db.attendance.create({
          data: {
            empId: employee.id,
            site,
            date: todayStr(),
            timeIn: attendanceStatus === 'Present' || attendanceStatus === 'Half Day'
              ? `0${randInt(6, 9)}:${String(randInt(0, 59)).padStart(2, '0')}`
              : null,
            timeOut: attendanceStatus === 'Present' ? `${randInt(16, 19)}:${String(randInt(0, 59)).padStart(2, '0')}` : null,
            otHours: Math.random() > 0.7 ? randFloat(1, 4) : 0,
            shift: pick(['Day', 'Night']),
            status: attendanceStatus,
          },
        })
        recordsSynced++
      } catch {
        // Attendance already exists for today, skip
      }

      // Create leave request (small chance)
      if (Math.random() > 0.75) {
        try {
          await db.leaveRequest.create({
            data: {
              empId: employee.id,
              site,
              type: pick(['Casual Leave', 'Sick Leave', 'Earned Leave', 'Compensatory Off']),
              fromDate: futureDate(randInt(1, 30)),
              toDate: futureDate(randInt(2, 5)),
              days: randInt(1, 3),
              reason: `${pick(['Family function', 'Medical', 'Personal work', 'Travel', 'Festival'])}`,
              status: 'Pending',
              appliedDate: todayStr(),
            },
          })
          recordsSynced++
        } catch {
          // Skip
        }
      }

      logs.push({
        module: 'employees',
        action: 'CREATE',
        recordId: employee.id,
        status: isConflict ? 'Conflict' : 'Success',
        recordData: JSON.stringify({ empId, name, trade, site }),
        conflictReason: isConflict ? 'Duplicate record detected in external ERP - requires manual review' : undefined,
        duration: randInt(50, 300),
        recordsSynced: 1,
      })
    } catch (err: unknown) {
      errors++
      const errMsg = err instanceof Error ? err.message : String(err)
      logs.push({
        module: 'employees',
        action: 'CREATE',
        recordId: empId,
        status: 'Error',
        recordData: JSON.stringify({ empId, name }),
        conflictReason: undefined,
        duration: randInt(50, 200),
        recordsSynced: 0,
      })
      // Log error to SyncLog
      await db.syncLog.create({
        data: {
          module: 'employees',
          action: 'CREATE',
          recordId: empId,
          status: 'Error',
          direction: 'Pull',
          syncBatchId: batchId,
          duration: randInt(50, 200),
          recordsSynced: 0,
          errorMessage: errMsg.substring(0, 500),
          startedAt,
          completedAt: new Date(),
        },
      })
    }
  }

  const completedAt = new Date()
  const duration = Math.round((completedAt.getTime() - startedAt.getTime()))

  return { recordsSynced, errors, logs, startedAt, completedAt, duration }
}

async function syncInventory(batchId: string) {
  const startedAt = new Date()
  let recordsSynced = 0
  let errors = 0
  const logs: { module: string; action: string; recordId: string; status: string; recordData?: string; conflictReason?: string; duration: number; recordsSynced: number }[] = []

  const count = randInt(4, 8)
  const existingItems = await db.inventoryItem.findMany({ select: { itemCode: true } })
  const existingCodes = new Set(existingItems.map((i: { itemCode: string }) => i.itemCode))

  for (let i = 0; i < count; i++) {
    const category = pick(INVENTORY_CATEGORIES)
    const names = INVENTORY_NAMES[category]
    const name = pick(names)
    const unit = pick(UNITS)
    const warehouse = pick(WAREHOUSES)
    const currentStock = randInt(5, 500)
    const minStock = randInt(10, 50)
    const maxStock = currentStock + randInt(100, 500)
    const unitCost = randFloat(50, 25000)
    const status = currentStock < minStock ? 'Low Stock' : 'In Stock'

    let itemCode: string
    let attempt = 0
    do {
      itemCode = `ITM-${String(existingCodes.size + i + 1 + attempt).padStart(3, '0')}`
      attempt++
    } while (existingCodes.has(itemCode) && attempt < 100)

    const isConflict = Math.random() < 0.1

    try {
      const item = await db.inventoryItem.create({
        data: {
          itemCode,
          name,
          category,
          unit,
          currentStock,
          minStock,
          maxStock,
          unitCost,
          warehouse,
          status,
        },
      })
      recordsSynced++

      // Create stock movement
      try {
        const moveType = pick(['Inward', 'Inward', 'Issue', 'Return', 'Transfer'])
        await db.stockMovement.create({
          data: {
            itemCode,
            itemName: name,
            type: moveType,
            quantity: randInt(1, 50),
            fromWarehouse: moveType === 'Transfer' ? warehouse : undefined,
            toWarehouse: moveType === 'Transfer' ? pick(WAREHOUSES.filter(w => w !== warehouse)) : undefined,
            reference: `ERP-${batchId.substring(0, 8)}`,
            date: todayStr(),
            remarks: `${moveType} via ERP sync`,
          },
        })
        recordsSynced++
      } catch {
        // Skip
      }

      logs.push({
        module: 'inventory',
        action: 'CREATE',
        recordId: item.id,
        status: isConflict ? 'Conflict' : 'Success',
        recordData: JSON.stringify({ itemCode, name, category, currentStock }),
        conflictReason: isConflict ? 'Stock quantity mismatch between ERP and local - verification needed' : undefined,
        duration: randInt(30, 200),
        recordsSynced: 1,
      })
    } catch (err: unknown) {
      errors++
      const errMsg = err instanceof Error ? err.message : String(err)
      await db.syncLog.create({
        data: {
          module: 'inventory',
          action: 'CREATE',
          recordId: itemCode,
          status: 'Error',
          direction: 'Pull',
          syncBatchId: batchId,
          duration: randInt(30, 150),
          recordsSynced: 0,
          errorMessage: errMsg.substring(0, 500),
          startedAt,
          completedAt: new Date(),
        },
      })
    }
  }

  const completedAt = new Date()
  const duration = Math.round((completedAt.getTime() - startedAt.getTime()))

  return { recordsSynced, errors, logs, startedAt, completedAt, duration }
}

async function syncSales(batchId: string) {
  const startedAt = new Date()
  let recordsSynced = 0
  let errors = 0
  const logs: { module: string; action: string; recordId: string; status: string; recordData?: string; conflictReason?: string; duration: number; recordsSynced: number }[] = []

  // Create/update customers
  const customerCount = randInt(2, 4)
  const existingCustomers = await db.customer.findMany({ select: { code: true } })
  const existingCustCodes = new Set(existingCustomers.map((c: { code: string }) => c.code))
  const createdCustomerNames: string[] = []

  for (let i = 0; i < customerCount; i++) {
    let code: string
    let attempt = 0
    do {
      code = `CUST-${String(existingCustCodes.size + i + 1 + attempt).padStart(3, '0')}`
      attempt++
    } while (existingCustCodes.has(code) && attempt < 100)

    const name = pick(INDIAN_COMPANIES)
    const contactPerson = `${pick(INDIAN_FIRST)} ${pick(INDIAN_LAST)}`
    const email = `purchase.${name.split(' ')[0].toLowerCase()}@example.in`
    const phone = `+91-${randInt(11, 99)}-${randInt(10000000, 99999999)}`
    const gst = `${String(randInt(10, 37)).padStart(2, '0')}AABCT${randInt(1000, 9999)}Q1Z${randInt(1, 9)}`
    const city = pick(['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'])
    const state = pick(['Maharashtra', 'Delhi', 'Karnataka', 'Telangana', 'Tamil Nadu', 'West Bengal', 'Gujarat', 'Rajasthan', 'Uttar Pradesh'])

    try {
      const customer = await db.customer.create({
        data: {
          code,
          name,
          contactPerson,
          email,
          phone,
          address: `${randInt(1, 500)}, ${pick(['Industrial Area', 'MG Road', ' Nehru Nagar', 'Station Road', 'SH Zone'])}`,
          gst,
          city,
          state,
          totalOrders: randInt(1, 20),
          totalRevenue: randFloat(500000, 50000000),
          status: Math.random() > 0.15 ? 'Active' : 'Inactive',
        },
      })
      recordsSynced++
      createdCustomerNames.push(name)

      logs.push({
        module: 'sales',
        action: 'CREATE_CUSTOMER',
        recordId: customer.id,
        status: 'Success',
        recordData: JSON.stringify({ code, name, city }),
        duration: randInt(30, 150),
        recordsSynced: 1,
      })
    } catch (err: unknown) {
      errors++
      const errMsg = err instanceof Error ? err.message : String(err)
      await db.syncLog.create({
        data: {
          module: 'sales',
          action: 'CREATE_CUSTOMER',
          recordId: code,
          status: 'Error',
          direction: 'Pull',
          syncBatchId: batchId,
          duration: randInt(30, 150),
          recordsSynced: 0,
          errorMessage: errMsg.substring(0, 500),
          startedAt,
          completedAt: new Date(),
        },
      })
    }
  }

  // Create sales orders
  const orderCount = randInt(2, 4)
  const existingOrders = await db.salesOrder.findMany({ select: { soNo: true } })
  const existingSoNos = new Set(existingOrders.map((o: { soNo: string }) => o.soNo))

  for (let i = 0; i < orderCount; i++) {
    let soNo: string
    let attempt = 0
    do {
      soNo = `SO-2025-${String(existingSoNos.size + i + 1 + attempt).padStart(4, '0')}`
      attempt++
    } while (existingSoNos.has(soNo) && attempt < 100)

    const customerName = createdCustomerNames.length > 0 ? pick(createdCustomerNames) : pick(INDIAN_COMPANIES)
    const projectName = pick(PROJECT_NAMES)
    const category = pick(INVENTORY_CATEGORIES)
    const itemName = pick(INVENTORY_NAMES[category])
    const quantity = randInt(1, 100)
    const unitPrice = randFloat(500, 50000)
    const amount = parseFloat((quantity * unitPrice).toFixed(2))
    const statuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered']
    const status = pick(statuses)

    const isConflict = Math.random() < 0.1

    try {
      const order = await db.salesOrder.create({
        data: {
          soNo,
          customer: customerName,
          project: projectName,
          item: itemName,
          quantity,
          unitPrice,
          amount,
          orderDate: pastDate(randInt(1, 60)),
          deliveryDate: status === 'Delivered' ? pastDate(randInt(0, 5)) : futureDate(randInt(5, 60)),
          status,
        },
      })
      recordsSynced++

      logs.push({
        module: 'sales',
        action: 'CREATE_ORDER',
        recordId: order.id,
        status: isConflict ? 'Conflict' : 'Success',
        recordData: JSON.stringify({ soNo, customer: customerName, amount }),
        conflictReason: isConflict ? 'Order amount differs from external ERP - possible currency conversion issue' : undefined,
        duration: randInt(30, 200),
        recordsSynced: 1,
      })
    } catch (err: unknown) {
      errors++
      const errMsg = err instanceof Error ? err.message : String(err)
      await db.syncLog.create({
        data: {
          module: 'sales',
          action: 'CREATE_ORDER',
          recordId: soNo,
          status: 'Error',
          direction: 'Pull',
          syncBatchId: batchId,
          duration: randInt(30, 150),
          recordsSynced: 0,
          errorMessage: errMsg.substring(0, 500),
          startedAt,
          completedAt: new Date(),
        },
      })
    }
  }

  const completedAt = new Date()
  const duration = Math.round((completedAt.getTime() - startedAt.getTime()))

  return { recordsSynced, errors, logs, startedAt, completedAt, duration }
}

async function syncProjects(batchId: string) {
  const startedAt = new Date()
  let recordsSynced = 0
  let errors = 0
  const logs: { module: string; action: string; recordId: string; status: string; recordData?: string; conflictReason?: string; duration: number; recordsSynced: number }[] = []

  const count = randInt(1, 3)
  const existingProjects = await db.project.findMany({ select: { code: true } })
  const existingPrjCodes = new Set(existingProjects.map((p: { code: string }) => p.code))

  for (let i = 0; i < count; i++) {
    let code: string
    let attempt = 0
    do {
      code = `PRJ-${String(existingPrjCodes.size + i + 1 + attempt).padStart(3, '0')}`
      attempt++
    } while (existingPrjCodes.has(code) && attempt < 100)

    const name = pick(PROJECT_NAMES)
    const client = pick(INDIAN_COMPANIES)
    const type = pick(PROJECT_TYPES)
    const contractValue = `₹${(randFloat(5, 500)).toFixed(2)} Cr`
    const startDaysAgo = randInt(30, 365)
    const startDate = pastDate(startDaysAgo)
    const endDate = futureDate(randInt(90, 730))
    const progress = Math.min(95, Math.round((startDaysAgo / (startDaysAgo + 365)) * 100 * Math.random()))
    const people = randInt(20, 500)
    const statusOpts = ['On Track', 'On Track', 'On Track', 'Delayed', 'Critical', 'Completed']
    const status = pick(statusOpts)
    const site = pick(SITES)

    const isConflict = Math.random() < 0.1

    try {
      const project = await db.project.create({
        data: {
          code,
          name,
          client,
          type,
          contractValue,
          startDate,
          endDate,
          progress,
          people,
          status,
          site,
        },
      })
      recordsSynced++

      // Create a site record
      try {
        await db.site.create({
          data: {
            name: site,
            state: pick(['Jharkhand', 'Bihar', 'Gujarat', 'Madhya Pradesh', 'Odisha', 'Rajasthan', 'Chhattisgarh', 'Maharashtra', 'Tamil Nadu']),
            project: name,
            manpower: people,
            incharge: `${pick(INDIAN_FIRST)} ${pick(INDIAN_LAST)}`,
            status: 'Active',
          },
        })
        recordsSynced++
      } catch {
        // Site may already exist
      }

      logs.push({
        module: 'projects',
        action: 'CREATE',
        recordId: project.id,
        status: isConflict ? 'Conflict' : 'Success',
        recordData: JSON.stringify({ code, name, client, progress }),
        conflictReason: isConflict ? 'Project progress mismatch - external shows different completion percentage' : undefined,
        duration: randInt(50, 300),
        recordsSynced: 1,
      })
    } catch (err: unknown) {
      errors++
      const errMsg = err instanceof Error ? err.message : String(err)
      await db.syncLog.create({
        data: {
          module: 'projects',
          action: 'CREATE',
          recordId: code,
          status: 'Error',
          direction: 'Pull',
          syncBatchId: batchId,
          duration: randInt(50, 200),
          recordsSynced: 0,
          errorMessage: errMsg.substring(0, 500),
          startedAt,
          completedAt: new Date(),
        },
      })
    }
  }

  const completedAt = new Date()
  const duration = Math.round((completedAt.getTime() - startedAt.getTime()))

  return { recordsSynced, errors, logs, startedAt, completedAt, duration }
}

async function syncFinance(batchId: string) {
  const startedAt = new Date()
  let recordsSynced = 0
  let errors = 0
  const logs: { module: string; action: string; recordId: string; status: string; recordData?: string; conflictReason?: string; duration: number; recordsSynced: number }[] = []

  // Purchase Orders
  const poCount = randInt(2, 4)
  const existingPOs = await db.purchaseOrder.findMany({ select: { poNo: true } })
  const existingPONos = new Set(existingPOs.map((p: { poNo: string }) => p.poNo))

  for (let i = 0; i < poCount; i++) {
    let poNo: string
    let attempt = 0
    do {
      poNo = `PO-2025-${String(existingPONos.size + i + 1 + attempt).padStart(4, '0')}`
      attempt++
    } while (existingPONos.has(poNo) && attempt < 100)

    const vendor = pick(VENDORS)
    const category = pick(INVENTORY_CATEGORIES)
    const item = pick(INVENTORY_NAMES[category])
    const amount = randFloat(25000, 2500000)
    const project = pick(PROJECT_NAMES)
    const statuses = ['Open', 'Approved', 'Partial', 'Received', 'Closed']
    const status = pick(statuses)
    const grn = status === 'Received' || status === 'Closed' ? 'Received' : 'Awaited'

    try {
      const po = await db.purchaseOrder.create({
        data: {
          poNo,
          vendor,
          item,
          amount,
          project,
          delivery: futureDate(randInt(7, 60)),
          grn,
          status,
        },
      })
      recordsSynced++

      logs.push({
        module: 'finance',
        action: 'CREATE_PO',
        recordId: po.id,
        status: 'Success',
        recordData: JSON.stringify({ poNo, vendor, amount }),
        duration: randInt(30, 150),
        recordsSynced: 1,
      })
    } catch (err: unknown) {
      errors++
      const errMsg = err instanceof Error ? err.message : String(err)
      await db.syncLog.create({
        data: {
          module: 'finance',
          action: 'CREATE_PO',
          recordId: poNo,
          status: 'Error',
          direction: 'Pull',
          syncBatchId: batchId,
          duration: randInt(30, 150),
          recordsSynced: 0,
          errorMessage: errMsg.substring(0, 500),
          startedAt,
          completedAt: new Date(),
        },
      })
    }
  }

  // Invoices with items
  const invCount = randInt(1, 3)
  const existingInvs = await db.invoice.findMany({ select: { invNo: true } })
  const existingInvNos = new Set(existingInvs.map((inv: { invNo: string }) => inv.invNo))

  for (let i = 0; i < invCount; i++) {
    let invNo: string
    let attempt = 0
    do {
      invNo = `INV-2025-${String(existingInvNos.size + i + 1 + attempt).padStart(4, '0')}`
      attempt++
    } while (existingInvNos.has(invNo) && attempt < 100)

    const client = pick(INDIAN_COMPANIES)
    const project = pick(PROJECT_NAMES)
    const itemCount = randInt(2, 4)
    const items: { slNo: number; itemName: string; quantity: number; unit: string; unitPrice: number; taxPercent: number; taxAmount: number; amount: number }[] = []
    let subtotal = 0
    let totalTax = 0

    for (let j = 1; j <= itemCount; j++) {
      const cat = pick(INVENTORY_CATEGORIES)
      const iname = pick(INVENTORY_NAMES[cat])
      const qty = randInt(1, 50)
      const up = randFloat(500, 50000)
      const amt = parseFloat((qty * up).toFixed(2))
      const taxPct = 18
      const tax = parseFloat((amt * taxPct / 100).toFixed(2))
      items.push({ slNo: j, itemName: iname, quantity: qty, unit: pick(UNITS), unitPrice: up, taxPercent: taxPct, taxAmount: tax, amount: parseFloat((amt + tax).toFixed(2)) })
      subtotal += amt
      totalTax += tax
    }

    const totalAmount = parseFloat((subtotal + totalTax).toFixed(2))
    const invDate = pastDate(randInt(1, 30))
    const dueDate = futureDate(randInt(15, 45))
    const invStatuses = ['Under Review', 'Approved', 'Sent', 'Paid']
    const status = pick(invStatuses)

    const isConflict = Math.random() < 0.1

    try {
      const invoice = await db.invoice.create({
        data: {
          invNo,
          client,
          project,
          amount: totalAmount.toString(),
          date: invDate,
          dueDate,
          status,
          items: {
            create: items,
          },
        },
      })
      recordsSynced += 1 + itemCount

      logs.push({
        module: 'finance',
        action: 'CREATE_INVOICE',
        recordId: invoice.id,
        status: isConflict ? 'Conflict' : 'Success',
        recordData: JSON.stringify({ invNo, client, totalAmount }),
        conflictReason: isConflict ? 'Invoice amount discrepancy - GST calculation differs between systems' : undefined,
        duration: randInt(50, 250),
        recordsSynced: 1 + itemCount,
      })
    } catch (err: unknown) {
      errors++
      const errMsg = err instanceof Error ? err.message : String(err)
      await db.syncLog.create({
        data: {
          module: 'finance',
          action: 'CREATE_INVOICE',
          recordId: invNo,
          status: 'Error',
          direction: 'Pull',
          syncBatchId: batchId,
          duration: randInt(50, 200),
          recordsSynced: 0,
          errorMessage: errMsg.substring(0, 500),
          startedAt,
          completedAt: new Date(),
        },
      })
    }
  }

  // Ledger accounts (only create if they don't exist)
  const ledgerCount = randInt(3, 6)
  const shuffledLedgers = [...LEDGER_ACCOUNTS].sort(() => Math.random() - 0.5)
  for (let i = 0; i < ledgerCount; i++) {
    const ledgerDef = shuffledLedgers[i]
    try {
      await db.ledgerAccount.create({
        data: {
          accountCode: ledgerDef.code,
          name: ledgerDef.name,
          group: ledgerDef.group,
          type: ledgerDef.type,
          balance: randFloat(0, 10000000),
          status: 'Active',
        },
      })
      recordsSynced++
    } catch {
      // Already exists - try update
      try {
        const existing = await db.ledgerAccount.findUnique({ where: { accountCode: ledgerDef.code } })
        if (existing) {
          await db.ledgerAccount.update({
            where: { accountCode: ledgerDef.code },
            data: { balance: randFloat(0, 10000000) },
          })
          recordsSynced++
        }
      } catch {
        errors++
      }
    }
  }

  // Journal entries
  const jeCount = randInt(2, 4)
  const existingJEs = await db.journalEntry.findMany({ select: { entryNo: true } })
  const existingJENos = new Set(existingJEs.map((j: { entryNo: string }) => j.entryNo))

  for (let i = 0; i < jeCount; i++) {
    let entryNo: string
    let attempt = 0
    do {
      entryNo = `JE-2025-${String(existingJENos.size + i + 1 + attempt).padStart(4, '0')}`
      attempt++
    } while (existingJENos.has(entryNo) && attempt < 100)

    const debitAcc = pick(shuffledLedgers)
    const creditAcc = pick(shuffledLedgers.filter(l => l.code !== debitAcc.code))
    const amt = randFloat(5000, 500000)

    try {
      await db.journalEntry.create({
        data: {
          entryNo,
          date: todayStr(),
          account: `${debitAcc.name} / ${creditAcc.name}`,
          debit: amt,
          credit: 0,
          description: `Being ${pick(['material purchase', 'service charges', 'wages payment', 'contractor bill', 'rent paid', 'TDS deposited', 'GST remittance'])} booked`,
          reference: `ERP-${batchId.substring(0, 8)}`,
          status: 'Posted',
        },
      })
      recordsSynced++

      // Credit entry
      let creditEntryNo: string
      let cAttempt = 0
      do {
        creditEntryNo = `JE-2025-${String(existingJENos.size + jeCount + i + 1 + cAttempt).padStart(4, '0')}`
        cAttempt++
      } while (existingJENos.has(creditEntryNo) && cAttempt < 100)

      try {
        await db.journalEntry.create({
          data: {
            entryNo: creditEntryNo,
            date: todayStr(),
            account: `${creditAcc.name} / ${debitAcc.name}`,
            debit: 0,
            credit: amt,
            description: `Contra entry for ${entryNo}`,
            reference: entryNo,
            status: 'Posted',
          },
        })
        recordsSynced++
      } catch {
        // Skip contra if it fails
      }
    } catch (err: unknown) {
      errors++
      const errMsg = err instanceof Error ? err.message : String(err)
      await db.syncLog.create({
        data: {
          module: 'finance',
          action: 'CREATE_JOURNAL',
          recordId: entryNo,
          status: 'Error',
          direction: 'Pull',
          syncBatchId: batchId,
          duration: randInt(30, 150),
          recordsSynced: 0,
          errorMessage: errMsg.substring(0, 500),
          startedAt,
          completedAt: new Date(),
        },
      })
    }
  }

  logs.push({
    module: 'finance',
    action: 'SYNC_COMPLETE',
    recordId: '',
    status: 'Success',
    duration: randInt(100, 400),
    recordsSynced,
  })

  const completedAt = new Date()
  const duration = Math.round((completedAt.getTime() - startedAt.getTime()))

  return { recordsSynced, errors, logs, startedAt, completedAt, duration }
}

async function syncEquipment(batchId: string) {
  const startedAt = new Date()
  let recordsSynced = 0
  let errors = 0
  const logs: { module: string; action: string; recordId: string; status: string; recordData?: string; conflictReason?: string; duration: number; recordsSynced: number }[] = []

  const count = randInt(2, 4)
  const existingEquipment = await db.equipment.findMany({ select: { eqId: true } })
  const existingEqIds = new Set(existingEquipment.map((e: { eqId: string }) => e.eqId))

  for (let i = 0; i < count; i++) {
    let eqId: string
    let attempt = 0
    do {
      eqId = `EQ-${String(existingEqIds.size + i + 1 + attempt).padStart(3, '0')}`
      attempt++
    } while (existingEqIds.has(eqId) && attempt < 100)

    const name = pick(EQUIPMENT_NAMES)
    const site = pick(SITES)
    const statuses = ['Operational', 'Operational', 'Operational', 'Under Maintenance', 'Idle', 'Down']
    const status = pick(statuses)
    const lastPM = pastDate(randInt(10, 90))
    const nextPM = futureDate(randInt(10, 60))
    const issue = status === 'Under Maintenance' || status === 'Down'
      ? pick(['Hydraulic leak', 'Engine overheating', 'Electrical fault', 'Worn out bearings', 'Cable damage', 'Filter replacement needed'])
      : null
    const utilization = status === 'Operational' ? randInt(40, 98) : randInt(0, 20)

    const isConflict = Math.random() < 0.1

    try {
      const equipment = await db.equipment.create({
        data: {
          name,
          eqId,
          site,
          status,
          lastPM,
          nextPM,
          issue,
          utilization,
        },
      })
      recordsSynced++

      // Create work permit for some equipment
      if (Math.random() > 0.5) {
        try {
          const wpTypes = WORK_PERMIT_TYPES
          const existingWPs = await db.workPermit.findMany({ select: { permitNo: true } })
          const wpNo = `WP-${String(existingWPs.length + i + 1).padStart(4, '0')}`
          await db.workPermit.create({
            data: {
              permitNo: wpNo,
              type: pick(wpTypes),
              location: site,
              issuedTo: `${pick(INDIAN_FIRST)} ${pick(INDIAN_LAST)}`,
              expiry: futureDate(randInt(1, 7)),
              status: Math.random() > 0.2 ? 'Active' : 'Expired',
              description: `Work permit for ${name} operation at ${site}`,
              precautions: 'Use PPE, follow LOTO procedure, gas test before entry, barricading required',
            },
          })
          recordsSynced++
        } catch {
          // Work permit may already exist
        }
      }

      logs.push({
        module: 'equipment',
        action: 'CREATE',
        recordId: equipment.id,
        status: isConflict ? 'Conflict' : 'Success',
        recordData: JSON.stringify({ eqId, name, site, status }),
        conflictReason: isConflict ? 'Equipment status conflict - local shows Operational, external shows Under Maintenance' : undefined,
        duration: randInt(50, 250),
        recordsSynced: 1,
      })
    } catch (err: unknown) {
      errors++
      const errMsg = err instanceof Error ? err.message : String(err)
      await db.syncLog.create({
        data: {
          module: 'equipment',
          action: 'CREATE',
          recordId: eqId,
          status: 'Error',
          direction: 'Pull',
          syncBatchId: batchId,
          duration: randInt(50, 200),
          recordsSynced: 0,
          errorMessage: errMsg.substring(0, 500),
          startedAt,
          completedAt: new Date(),
        },
      })
    }
  }

  const completedAt = new Date()
  const duration = Math.round((completedAt.getTime() - startedAt.getTime()))

  return { recordsSynced, errors, logs, startedAt, completedAt, duration }
}

async function syncAttendance(batchId: string) {
  const startedAt = new Date()
  let recordsSynced = 0
  let errors = 0
  const logs: { module: string; action: string; recordId: string; status: string; recordData?: string; conflictReason?: string; duration: number; recordsSynced: number }[] = []

  const employees = await db.employee.findMany({ select: { id: true, name: true, site: true }, take: 15 })
  const today = todayStr()

  for (const emp of employees) {
    const statuses = ['Present', 'Present', 'Present', 'Present', 'Half Day', 'Absent', 'Leave', 'Weekly Off']
    const status = pick(statuses)

    try {
      await db.attendance.create({
        data: {
          empId: emp.id,
          site: emp.site,
          date: today,
          timeIn: (status === 'Present' || status === 'Half Day')
            ? `0${randInt(6, 9)}:${String(randInt(0, 59)).padStart(2, '0')}`
            : null,
          timeOut: status === 'Present'
            ? `${randInt(16, 19)}:${String(randInt(0, 59)).padStart(2, '0')}`
            : null,
          otHours: Math.random() > 0.7 ? randFloat(1, 4) : 0,
          shift: pick(['Day', 'Night']),
          status,
        },
      })
      recordsSynced++
    } catch {
      // Already exists for today, try updating
      try {
        await db.attendance.updateMany({
          where: { empId: emp.id, date: today },
          data: { status, otHours: Math.random() > 0.7 ? randFloat(1, 4) : 0 },
        })
        recordsSynced++
      } catch {
        errors++
      }
    }
  }

  const isConflict = Math.random() < 0.1
  logs.push({
    module: 'attendance',
    action: 'SYNC',
    recordId: '',
    status: isConflict ? 'Conflict' : 'Success',
    recordData: JSON.stringify({ date: today, employees: employees.length }),
    conflictReason: isConflict ? 'Time-in discrepancy between biometric system and ERP records' : undefined,
    duration: randInt(100, 300),
    recordsSynced,
  })

  const completedAt = new Date()
  const duration = Math.round((completedAt.getTime() - startedAt.getTime()))

  return { recordsSynced, errors, logs, startedAt, completedAt, duration }
}

async function syncPayroll(batchId: string) {
  const startedAt = new Date()
  let recordsSynced = 0
  let errors = 0
  const logs: { module: string; action: string; recordId: string; status: string; recordData?: string; conflictReason?: string; duration: number; recordsSynced: number }[] = []

  const employees = await db.employee.findMany({ select: { id: true, name: true, type: true }, take: 10 })
  const months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06']
  const currentMonth = months[new Date().getMonth()] || '2025-06'

  for (const emp of employees) {
    const isStaff = emp.type === 'Staff'
    const basic = isStaff ? randFloat(18000, 80000) : randFloat(12000, 25000)
    const hra = parseFloat((basic * 0.4).toFixed(2))
    const days = randInt(20, 31)
    const ot = randFloat(0, 3000)
    const gross = parseFloat((basic + hra + ot).toFixed(2))
    const pf = parseFloat((basic * 0.12).toFixed(2))
    const esi = isStaff ? 0 : parseFloat((gross * 0.0075).toFixed(2))
    const tds = gross > 50000 ? parseFloat((gross * 0.1).toFixed(2)) : 0
    const netPay = parseFloat((gross - pf - esi - tds).toFixed(2))

    try {
      await db.payroll.create({
        data: {
          empId: emp.id,
          month: currentMonth,
          days,
          basic,
          hra,
          ot,
          gross,
          pf,
          esi,
          tds,
          netPay,
          status: pick(['Pending', 'Pending', 'Processed', 'Paid']),
        },
      })
      recordsSynced++
    } catch {
      // Payroll for this month may already exist
      try {
        await db.payroll.updateMany({
          where: { empId: emp.id, month: currentMonth },
          data: { basic, hra, ot, gross, pf, esi, tds, netPay },
        })
        recordsSynced++
      } catch {
        errors++
      }
    }
  }

  const isConflict = Math.random() < 0.1
  logs.push({
    module: 'payroll',
    action: 'SYNC',
    recordId: '',
    status: isConflict ? 'Conflict' : 'Success',
    recordData: JSON.stringify({ month: currentMonth, employees: employees.length }),
    conflictReason: isConflict ? 'PF calculation mismatch - employer contribution differs between systems' : undefined,
    duration: randInt(100, 300),
    recordsSynced,
  })

  const completedAt = new Date()
  const duration = Math.round((completedAt.getTime() - startedAt.getTime()))

  return { recordsSynced, errors, logs, startedAt, completedAt, duration }
}

// ─────────────────────────────────────────────
// Module Sync Dispatcher
// ─────────────────────────────────────────────

const MODULE_SYNCERS: Record<string, (batchId: string) => Promise<{ recordsSynced: number; errors: number; logs: any[]; startedAt: Date; completedAt: Date; duration: number }>> = {
  employees: syncEmployees,
  inventory: syncInventory,
  sales: syncSales,
  projects: syncProjects,
  finance: syncFinance,
  equipment: syncEquipment,
  attendance: syncAttendance,
  payroll: syncPayroll,
}

// ─────────────────────────────────────────────
// GET: Sync status & logs
// ─────────────────────────────────────────────

export async function GET() {
  try {
    const [configs, recentLogs] = await Promise.all([
      db.syncConfig.findMany({ orderBy: { module: 'asc' } }),
      db.syncLog.findMany({ orderBy: { startedAt: 'desc' }, take: 50 }),
    ])

    const totalSuccess = recentLogs.filter((l: { status: string }) => l.status === 'Success').length
    const totalConflicts = recentLogs.filter((l: { status: string }) => l.status === 'Conflict').length
    const totalErrors = recentLogs.filter((l: { status: string }) => l.status === 'Error').length
    const totalRecordsSynced = recentLogs.reduce((sum: number, l: { recordsSynced: number }) => sum + l.recordsSynced, 0)

    // Module-level status summary
    const moduleStatus = configs.map((c: { module: string; enabled: boolean; autoSync: boolean; lastSyncAt: Date | null; lastStatus: string; totalSynced: number; totalErrors: number }) => ({
      module: c.module,
      enabled: c.enabled,
      autoSync: c.autoSync,
      lastSyncAt: c.lastSyncAt,
      lastStatus: c.lastStatus,
      totalSynced: c.totalSynced,
      totalErrors: c.totalErrors,
    }))

    return NextResponse.json({
      success: true,
      data: {
        configs,
        moduleStatus,
        recentLogs,
        summary: {
          totalLogs: recentLogs.length,
          totalSuccess,
          totalConflicts,
          totalErrors,
          totalRecordsSynced,
          activeModules: configs.filter((c: { enabled: boolean }) => c.enabled).length,
          configuredModules: configs.length,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching sync status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sync status' },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────
// POST: Trigger sync / resolve conflict / get status
// ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, modules, logId } = body

    // ── Action: status ──
    if (action === 'status') {
      const configs = await db.syncConfig.findMany({ orderBy: { module: 'asc' } })
      return NextResponse.json({
        success: true,
        data: {
          status: 'ready',
          configs: configs.map((c: { module: string; enabled: boolean; lastSyncAt: Date | null; lastStatus: string; totalSynced: number; totalErrors: number }) => ({
            module: c.module,
            enabled: c.enabled,
            lastSyncAt: c.lastSyncAt,
            lastStatus: c.lastStatus,
            totalSynced: c.totalSynced,
            totalErrors: c.totalErrors,
          })),
          timestamp: new Date().toISOString(),
        },
      })
    }

    // ── Action: resolve ──
    if (action === 'resolve') {
      if (!logId) {
        return NextResponse.json(
          { success: false, error: 'logId is required for resolve action' },
          { status: 400 }
        )
      }

      const log = await db.syncLog.findUnique({ where: { id: logId } })
      if (!log) {
        return NextResponse.json(
          { success: false, error: 'Sync log not found' },
          { status: 404 }
        )
      }

      const updated = await db.syncLog.update({
        where: { id: logId },
        data: {
          resolved: true,
          status: 'Resolved',
        },
      })

      return NextResponse.json({
        success: true,
        data: updated,
        message: `Conflict ${logId} resolved successfully`,
      })
    }

    // ── Action: trigger ──
    if (action === 'trigger') {
      const batchId = crypto.randomUUID()
      const syncModules: string[] = modules && modules.length > 0
        ? modules.filter((m: string) => ALL_MODULES.includes(m as SyncModule))
        : [...ALL_MODULES]

      if (syncModules.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid modules specified for sync' },
          { status: 400 }
        )
      }

      // Ensure SyncConfig entries exist for all modules
      for (const mod of syncModules) {
        try {
          await db.syncConfig.upsert({
            where: { module: mod },
            update: {},
            create: {
              module: mod,
              enabled: true,
              autoSync: false,
              syncInterval: 300,
              lastStatus: 'Syncing',
              endpoint: `https://erp.voltcore.in/api/${mod}`,
              authKey: `vk_${mod}_${Math.random().toString(36).substring(2, 15)}`,
            },
          })
        } catch {
          // Config may already exist
        }
      }

      // Sync each module
      const results: Record<string, { recordsSynced: number; errors: number; duration: number; status: string; logs: any[] }> = {}
      let totalRecordsSynced = 0
      let totalErrors = 0
      const allSyncLogs: any[] = []

      for (const mod of syncModules) {
        const syncer = MODULE_SYNCERS[mod]
        if (!syncer) continue

        // Simulate realistic delay per module
        await delay(randInt(200, 800))

        try {
          const result = await syncer(batchId)
          const moduleStatus = result.errors > 0 ? 'Completed with Errors' : 'Success'

          results[mod] = {
            recordsSynced: result.recordsSynced,
            errors: result.errors,
            duration: result.duration,
            status: moduleStatus,
            logs: result.logs,
          }

          totalRecordsSynced += result.recordsSynced
          totalErrors += result.errors

          // Create sync log entries
          for (const log of result.logs) {
            await db.syncLog.create({
              data: {
                module: log.module || mod,
                action: log.action,
                recordId: log.recordId || null,
                recordData: log.recordData || null,
                status: log.status,
                direction: 'Pull',
                conflictReason: log.conflictReason || null,
                syncBatchId: batchId,
                duration: log.duration,
                recordsSynced: log.recordsSynced || 0,
                startedAt: result.startedAt,
                completedAt: result.completedAt,
              },
            }).catch(() => {
              // Skip individual log creation errors
            })
          }

          // Update SyncConfig
          await db.syncConfig.update({
            where: { module: mod },
            data: {
              lastSyncAt: new Date(),
              lastStatus: moduleStatus,
              totalSynced: { increment: result.recordsSynced },
              totalErrors: { increment: result.errors },
              nextSyncAt: new Date(Date.now() + 300 * 1000), // 5 min
            },
          }).catch(() => {
            // Skip config update errors
          })
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err)
          results[mod] = {
            recordsSynced: 0,
            errors: 1,
            duration: 0,
            status: 'Failed',
            logs: [],
          }
          totalErrors++

          await db.syncLog.create({
            data: {
              module: mod,
              action: 'SYNC',
              status: 'Error',
              direction: 'Pull',
              syncBatchId: batchId,
              errorMessage: errMsg.substring(0, 500),
              startedAt: new Date(),
              completedAt: new Date(),
            },
          }).catch(() => {})

          await db.syncConfig.update({
            where: { module: mod },
            data: {
              lastSyncAt: new Date(),
              lastStatus: 'Failed',
              totalErrors: { increment: 1 },
            },
          }).catch(() => {})
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          batchId,
          triggeredAt: new Date().toISOString(),
          modules: syncModules,
          results,
          summary: {
            totalModules: syncModules.length,
            totalRecordsSynced,
            totalErrors,
            status: totalErrors > 0 ? 'Completed with Errors' : 'Success',
          },
        },
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "trigger", "status", or "resolve".' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in sync POST:', error)
    return NextResponse.json(
      { success: false, error: 'Sync operation failed' },
      { status: 500 }
    )
  }
}
