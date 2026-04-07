import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Clear all data before seeding (order matters for foreign keys)
async function clearAll() {
  console.log('🗑️  Clearing existing data...')
  const tablenames = [
    'Expense', 'Payroll', 'LeaveRequest', 'Attendance', 'ShiftSchedule', 'Certification',
    'Employee',
    'JournalEntry', 'TaxRecord', 'BudgetItem', 'AccountsReceivable', 'AccountsPayable',
    'BankAccount', 'LedgerAccount',
    'StockMovement', 'InventoryItem',
    'SalesOrder', 'Customer', 'CrmContact',
    'SupportTicket', 'KBArticle',
    'JobOpening', 'TrainingSession',
    'WorkPermit', 'Incident', 'Equipment', 'Subcontractor',
    'PurchaseOrder', 'Invoice', 'Site', 'Project',
    'CompanySettings', 'Department', 'Designation',
  ]
  for (const t of tablenames) {
    try {
      await (prisma as any)[t.charAt(0).toLowerCase() + t.slice(1)].deleteMany()
    } catch (e) { /* table may not exist */ }
  }
  console.log('  ✅ All tables cleared')
}

// ──────────────────────────────────────────────────
//  VoltCore ERP — Comprehensive Seed Data
//  Indian Construction & Engineering Company
// ──────────────────────────────────────────────────

const SITES = [
  { name: 'Mumbai Metro Line 7', state: 'Maharashtra', project: 'PRJ-001', manpower: 45, incharge: 'Rajesh Kumar', status: 'Active' },
  { name: 'Delhi Smart City Township', state: 'Delhi NCR', project: 'PRJ-002', manpower: 62, incharge: 'Amit Sharma', status: 'Active' },
  { name: 'Bangalore IT Park Phase 3', state: 'Karnataka', project: 'PRJ-003', manpower: 38, incharge: 'Priya Nair', status: 'Active' },
  { name: 'Hyderabad Expressway', state: 'Telangana', project: 'PRJ-004', manpower: 55, incharge: 'Suresh Reddy', status: 'Active' },
  { name: 'Chennai Port Expansion', state: 'Tamil Nadu', project: 'PRJ-005', manpower: 30, incharge: 'Karthik Rajan', status: 'Active' },
  { name: 'Pune Industrial Complex', state: 'Maharashtra', project: 'PRJ-006', manpower: 28, incharge: 'Vikram Patil', status: 'On Hold' },
  { name: 'Kolkata Bridge Repair', state: 'West Bengal', project: 'PRJ-007', manpower: 22, incharge: 'Arjun Das', status: 'Active' },
  { name: 'Ahmedabad Solar Farm', state: 'Gujarat', project: 'PRJ-008', manpower: 18, incharge: 'Meera Patel', status: 'Completed' },
]

const EMPLOYEES = [
  // Staff
  { empId: 'VC-001', name: 'Rajesh Kumar', email: 'rajesh@voltcore.in', phone: '9876543210', trade: 'Project Management', role: 'Project Manager', site: 'Mumbai Metro Line 7', type: 'Staff', status: 'Active', joiningDate: '2021-03-15', certifications: 'PMP, LEED AP' },
  { empId: 'VC-002', name: 'Amit Sharma', email: 'amit@voltcore.in', phone: '9876543211', trade: 'Project Management', role: 'Senior Engineer', site: 'Delhi Smart City Township', type: 'Staff', status: 'Active', joiningDate: '2021-06-01', certifications: 'B.E. Civil, Safety Officer' },
  { empId: 'VC-003', name: 'Priya Nair', email: 'priya@voltcore.in', phone: '9876543212', trade: 'Project Management', role: 'Site Engineer', site: 'Bangalore IT Park Phase 3', type: 'Staff', status: 'Active', joiningDate: '2022-01-10', certifications: 'M.Tech Structural' },
  { empId: 'VC-004', name: 'Suresh Reddy', email: 'suresh@voltcore.in', phone: '9876543213', trade: 'Project Management', role: 'Project Manager', site: 'Hyderabad Expressway', type: 'Staff', status: 'Active', joiningDate: '2020-09-20', certifications: 'PMP' },
  { empId: 'VC-005', name: 'Karthik Rajan', email: 'karthik@voltcore.in', phone: '9876543214', trade: 'Quality Control', role: 'QA/QC Manager', site: 'Chennai Port Expansion', type: 'Staff', status: 'Active', joiningDate: '2022-04-15', certifications: 'ISO 9001 Lead Auditor' },
  { empId: 'VC-006', name: 'Vikram Patil', email: 'vikram@voltcore.in', phone: '9876543215', trade: 'Site Operations', role: 'Site Supervisor', site: 'Pune Industrial Complex', type: 'Staff', status: 'Active', joiningDate: '2023-02-01', certifications: 'Safety Certificate' },
  { empId: 'VC-007', name: 'Arjun Das', email: 'arjun@voltcore.in', phone: '9876543216', trade: 'Structural', role: 'Structural Engineer', site: 'Kolkata Bridge Repair', type: 'Staff', status: 'Active', joiningDate: '2022-07-10', certifications: 'M.Tech Structures' },
  { empId: 'VC-008', name: 'Meera Patel', email: 'meera@voltcore.in', phone: '9876543217', trade: 'Electrical', role: 'Electrical Engineer', site: 'Ahmedabad Solar Farm', type: 'Staff', status: 'Active', joiningDate: '2023-01-20', certifications: 'B.E. Electrical' },
  { empId: 'VC-009', name: 'Deepa Menon', email: 'deepa@voltcore.in', phone: '9876543218', trade: 'HR', role: 'HR Manager', site: 'Mumbai Metro Line 7', type: 'Staff', status: 'Active', joiningDate: '2020-05-10', certifications: 'MBA HR' },
  { empId: 'VC-010', name: 'Sanjay Gupta', email: 'sanjay@voltcore.in', phone: '9876543219', trade: 'Finance', role: 'Accounts Manager', site: 'Mumbai Metro Line 7', type: 'Staff', status: 'Active', joiningDate: '2020-08-01', certifications: 'CA, CPA' },
  { empId: 'VC-011', name: 'Ritu Singh', email: 'ritu@voltcore.in', phone: '9876543220', trade: 'Procurement', role: 'Purchase Manager', site: 'Delhi Smart City Township', type: 'Staff', status: 'Active', joiningDate: '2021-11-15', certifications: 'MBA Supply Chain' },
  { empId: 'VC-012', name: 'Manish Tiwari', email: 'manish@voltcore.in', phone: '9876543221', trade: 'Safety', role: 'HSE Officer', site: 'Hyderabad Expressway', type: 'Staff', status: 'Active', joiningDate: '2022-03-01', certifications: 'NEBOSH IGC' },
  { empId: 'VC-013', name: 'Anjali Deshmukh', email: 'anjali@voltcore.in', phone: '9876543222', trade: 'Admin', role: 'Admin Executive', site: 'Mumbai Metro Line 7', type: 'Staff', status: 'Active', joiningDate: '2023-05-10', certifications: '' },
  { empId: 'VC-014', name: 'Rahul Verma', email: 'rahul@voltcore.in', phone: '9876543223', trade: 'IT', role: 'IT Administrator', site: 'Mumbai Metro Line 7', type: 'Staff', status: 'Active', joiningDate: '2022-09-01', certifications: 'CCNA, MCSA' },
  // Workers
  { empId: 'VC-015', name: 'Mohan Lal', email: '', phone: '8876543210', trade: 'Electrician', role: 'Foreman', site: 'Mumbai Metro Line 7', type: 'Worker', status: 'Active', joiningDate: '2022-01-05', certifications: 'ITI Electrician' },
  { empId: 'VC-016', name: 'Suresh Yadav', email: '', phone: '8876543211', trade: 'Welder', role: 'Skilled Worker', site: 'Mumbai Metro Line 7', type: 'Worker', status: 'Active', joiningDate: '2022-03-10', certifications: 'ITI Welder' },
  { empId: 'VC-017', name: 'Ramu Naik', email: '', phone: '8876543212', trade: 'Mason', role: 'Skilled Worker', site: 'Delhi Smart City Township', type: 'Worker', status: 'Active', joiningDate: '2021-08-15', certifications: '' },
  { empId: 'VC-018', name: 'Ganesh Patil', email: '', phone: '8876543213', trade: 'Plumber', role: 'Skilled Worker', site: 'Delhi Smart City Township', type: 'Worker', status: 'Active', joiningDate: '2022-06-20', certifications: '' },
  { empId: 'VC-019', name: 'Krishna Murthy', email: '', phone: '8876543214', trade: 'Bar Bender', role: 'Skilled Worker', site: 'Bangalore IT Park Phase 3', type: 'Worker', status: 'Active', joiningDate: '2023-01-10', certifications: '' },
  { empId: 'VC-020', name: 'Dinesh Kumar', email: '', phone: '8876543215', trade: 'Painter', role: 'Skilled Worker', site: 'Bangalore IT Park Phase 3', type: 'Worker', status: 'Active', joiningDate: '2022-11-01', certifications: '' },
  { empId: 'VC-021', name: 'Thangavelu', email: '', phone: '8876543216', trade: 'Carpenter', role: 'Skilled Worker', site: 'Chennai Port Expansion', type: 'Worker', status: 'Active', joiningDate: '2022-09-15', certifications: '' },
  { empId: 'VC-022', name: 'Ravi Shankar', email: '', phone: '8876543217', trade: 'Operator', role: 'Crane Operator', site: 'Hyderabad Expressway', type: 'Worker', status: 'Active', joiningDate: '2021-12-01', certifications: 'Heavy License' },
  { empId: 'VC-023', name: 'Pradeep Yadav', email: '', phone: '8876543218', trade: 'Operator', role: 'Excavator Operator', site: 'Hyderabad Expressway', type: 'Worker', status: 'Active', joiningDate: '2022-04-10', certifications: 'Heavy License' },
  { empId: 'VC-024', name: 'Lakshmanan', email: '', phone: '8876543219', trade: 'Fitter', role: 'Skilled Worker', site: 'Chennai Port Expansion', type: 'Worker', status: 'On Leave', joiningDate: '2022-02-01', certifications: '' },
  { empId: 'VC-025', name: 'Ashok Mehta', email: '', phone: '8876543220', trade: 'Electrician', role: 'Foreman', site: 'Pune Industrial Complex', type: 'Worker', status: 'Active', joiningDate: '2023-03-15', certifications: 'ITI Electrician' },
  { empId: 'VC-026', name: 'Biplab Das', email: '', phone: '8876543221', trade: 'Steel Fixer', role: 'Skilled Worker', site: 'Kolkata Bridge Repair', type: 'Worker', status: 'Active', joiningDate: '2022-08-01', certifications: '' },
  { empId: 'VC-027', name: 'Naveen Reddy', email: '', phone: '8876543222', trade: 'Scaffolder', role: 'Skilled Worker', site: 'Hyderabad Expressway', type: 'Worker', status: 'Active', joiningDate: '2023-02-20', certifications: '' },
  { empId: 'VC-028', name: 'Firoz Khan', email: '', phone: '8876543223', trade: 'Painter', role: 'Skilled Worker', site: 'Delhi Smart City Township', type: 'Worker', status: 'Active', joiningDate: '2023-04-01', certifications: '' },
  { empId: 'VC-029', name: 'Kumar Swamy', email: '', phone: '8876543224', trade: 'Helper', role: 'Unskilled Worker', site: 'Mumbai Metro Line 7', type: 'Worker', status: 'Active', joiningDate: '2024-01-10', certifications: '' },
  { empId: 'VC-030', name: 'Manoj Kumar', email: '', phone: '8876543225', trade: 'Helper', role: 'Unskilled Worker', site: 'Delhi Smart City Township', type: 'Worker', status: 'Inactive', joiningDate: '2022-05-15', certifications: '' },
]

async function seedCompanySettings() {
  console.log('🌱 Seeding CompanySettings...')
  const data = [
    { key: 'company_name', value: 'VoltCore Engineering Pvt. Ltd.', label: 'Company Name' },
    { key: 'company_gst', value: '27AADCV1234F1ZP', label: 'GST Number' },
    { key: 'company_pan', value: 'AADCV1234F', label: 'PAN Number' },
    { key: 'company_address', value: 'VoltCore Tower, BKC, Mumbai 400051', label: 'Registered Address' },
    { key: 'company_phone', value: '+91-22-4567-8900', label: 'Office Phone' },
    { key: 'company_email', value: 'info@voltcore.in', label: 'Official Email' },
    { key: 'pf_esi_rate', value: '12,1.75', label: 'PF & ESI Rate (%)' },
    { key: 'financial_year', value: '2025-26', label: 'Current Financial Year' },
  ]
  await prisma.companySettings.createMany({ data })
  console.log(`  ✅ ${data.length} settings created`)
}

async function seedDepartments() {
  console.log('🌱 Seeding Departments...')
  const data = [
    { name: 'Engineering', head: 'Amit Sharma', location: 'Mumbai HQ', employeeCount: 8, status: 'Active' },
    { name: 'Human Resources', head: 'Deepa Menon', location: 'Mumbai HQ', employeeCount: 4, status: 'Active' },
    { name: 'Finance & Accounts', head: 'Sanjay Gupta', location: 'Mumbai HQ', employeeCount: 5, status: 'Active' },
    { name: 'Procurement', head: 'Ritu Singh', location: 'Delhi Office', employeeCount: 3, status: 'Active' },
    { name: 'Site Operations', head: 'Rajesh Kumar', location: 'Multiple Sites', employeeCount: 15, status: 'Active' },
    { name: 'QA/QC', head: 'Karthik Rajan', location: 'Chennai Office', employeeCount: 4, status: 'Active' },
    { name: 'HSE', head: 'Manish Tiwari', location: 'Hyderabad Office', employeeCount: 3, status: 'Active' },
    { name: 'IT', head: 'Rahul Verma', location: 'Mumbai HQ', employeeCount: 2, status: 'Active' },
    { name: 'Admin', head: 'Anjali Deshmukh', location: 'Mumbai HQ', employeeCount: 3, status: 'Active' },
    { name: 'Contracts & Legal', head: 'Vikram Patil', location: 'Pune Office', employeeCount: 2, status: 'Active' },
  ]
  await prisma.department.createMany({ data })
  console.log(`  ✅ ${data.length} departments created`)
}

async function seedDesignations() {
  console.log('🌱 Seeding Designations...')
  const data = [
    { title: 'Managing Director', department: 'Engineering', level: 'L1', minSalary: 250000, maxSalary: 350000, status: 'Active' },
    { title: 'Project Manager', department: 'Engineering', level: 'L2', minSalary: 120000, maxSalary: 180000, status: 'Active' },
    { title: 'Senior Engineer', department: 'Engineering', level: 'L3', minSalary: 80000, maxSalary: 120000, status: 'Active' },
    { title: 'Site Engineer', department: 'Engineering', level: 'L4', minSalary: 45000, maxSalary: 70000, status: 'Active' },
    { title: 'HR Manager', department: 'Human Resources', level: 'L2', minSalary: 80000, maxSalary: 120000, status: 'Active' },
    { title: 'HR Executive', department: 'Human Resources', level: 'L4', minSalary: 30000, maxSalary: 45000, status: 'Active' },
    { title: 'Accounts Manager', department: 'Finance & Accounts', level: 'L2', minSalary: 70000, maxSalary: 100000, status: 'Active' },
    { title: 'Purchase Manager', department: 'Procurement', level: 'L2', minSalary: 65000, maxSalary: 95000, status: 'Active' },
    { title: 'QA/QC Manager', department: 'QA/QC', level: 'L2', minSalary: 75000, maxSalary: 110000, status: 'Active' },
    { title: 'HSE Officer', department: 'HSE', level: 'L3', minSalary: 50000, maxSalary: 80000, status: 'Active' },
    { title: 'Site Supervisor', department: 'Site Operations', level: 'L3', minSalary: 40000, maxSalary: 60000, status: 'Active' },
    { title: 'Foreman', department: 'Site Operations', level: 'L4', minSalary: 25000, maxSalary: 35000, status: 'Active' },
    { title: 'Skilled Worker', department: 'Site Operations', level: 'L5', minSalary: 18000, maxSalary: 28000, status: 'Active' },
    { title: 'Unskilled Worker', department: 'Site Operations', level: 'L6', minSalary: 12000, maxSalary: 18000, status: 'Active' },
    { title: 'IT Administrator', department: 'IT', level: 'L3', minSalary: 50000, maxSalary: 80000, status: 'Active' },
  ]
  await prisma.designation.createMany({ data })
  console.log(`  ✅ ${data.length} designations created`)
}

async function seedSites() {
  console.log('🌱 Seeding Sites...')
  await prisma.site.createMany({ data: SITES })
  console.log(`  ✅ ${SITES.length} sites created`)
}

async function seedProjects() {
  console.log('🌱 Seeding Projects...')
  // contractValue stored as number in Lakhs (formatCurrency handles Cr/L display)
  const data = [
    { code: 'PRJ-001', name: 'Mumbai Thermal Plant 500MW', client: 'NTPC Limited', type: 'Thermal', contractValue: '2450', startDate: '2024-01-15', endDate: '2027-06-30', progress: 42, people: 45, status: 'On Track', site: 'Mumbai Metro Line 7' },
    { code: 'PRJ-002', name: 'Delhi Substation 400kV', client: 'PGCIL', type: 'Substation', contractValue: '890', startDate: '2023-06-01', endDate: '2026-12-31', progress: 58, people: 62, status: 'On Track', site: 'Delhi Smart City Township' },
    { code: 'PRJ-003', name: 'Bangalore Solar Park 100MW', client: 'Karnataka Energy', type: 'Solar', contractValue: '560', startDate: '2024-03-01', endDate: '2026-09-30', progress: 31, people: 38, status: 'On Track', site: 'Bangalore IT Park Phase 3' },
    { code: 'PRJ-004', name: 'Hyderabad Transmission Line', client: 'TSTRANSCO', type: 'Transmission', contractValue: '1200', startDate: '2023-09-15', endDate: '2027-03-31', progress: 45, people: 55, status: 'Delayed', site: 'Hyderabad Expressway' },
    { code: 'PRJ-005', name: 'Chennai Plant Maintenance O&M', client: 'TNEB', type: 'Maintenance', contractValue: '780', startDate: '2024-06-01', endDate: '2027-05-30', progress: 22, people: 30, status: 'On Track', site: 'Chennai Port Expansion' },
    { code: 'PRJ-006', name: 'Pune Thermal Unit 3 Overhaul', client: 'MAHAGENCO', type: 'Maintenance', contractValue: '340', startDate: '2024-04-01', endDate: '2026-10-31', progress: 18, people: 28, status: 'At Risk', site: 'Pune Industrial Complex' },
    { code: 'PRJ-007', name: 'Kolkata Substation 220kV', client: 'WBSEDCL', type: 'Substation', contractValue: '220', startDate: '2024-08-01', endDate: '2026-08-31', progress: 15, people: 22, status: 'On Track', site: 'Kolkata Bridge Repair' },
    { code: 'PRJ-008', name: 'Ahmedabad Solar Farm 50MW', client: 'Gujarat Energy', type: 'Solar', contractValue: '185', startDate: '2023-11-01', endDate: '2025-06-30', progress: 92, people: 18, status: 'Near Done', site: 'Ahmedabad Solar Farm' },
  ]
  await prisma.project.createMany({ data })
  console.log(`  ✅ ${data.length} projects created`)
}

async function seedEmployees(): Promise<Map<string, string>> {
  console.log('🌱 Seeding Employees...')
  const empIdMap = new Map<string, string>()
  for (const emp of EMPLOYEES) {
    const created = await prisma.employee.create({ data: emp })
    empIdMap.set(emp.empId, created.id)
  }
  console.log(`  ✅ ${EMPLOYEES.length} employees created`)
  return empIdMap
}

async function seedAttendance(empIdMap: Map<string, string>) {
  console.log('🌱 Seeding Attendance...')
  const records = []
  const months = [
    { m: '05', year: '2025' }, { m: '06', year: '2025' },
  ]
  const shifts = ['Day', 'Night']
  const statuses = ['Present', 'Present', 'Present', 'Present', 'Present', 'Present', 'Present', 'Half Day', 'Absent', 'Present']
  let count = 0

  for (const emp of EMPLOYEES) {
    if (emp.status === 'Inactive') continue
    const empDbId = empIdMap.get(emp.empId)!
    for (const { m, year } of months) {
      const daysInMonth = new Date(parseInt(year), parseInt(m), 0).getDate()
      const daysToGen = m === '06' ? Math.min(new Date().getDate(), daysInMonth) : daysInMonth
      for (let d = 1; d <= daysToGen; d++) {
        const dayOfWeek = new Date(parseInt(year), parseInt(m) - 1, d).getDay()
        if (dayOfWeek === 0) continue // Skip Sundays
        const date = `${year}-${m}-${String(d).padStart(2, '0')}`
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        const shift = shifts[Math.floor(Math.random() * shifts.length)]
        records.push({
          empId: empDbId,
          site: emp.site,
          date,
          timeIn: status === 'Absent' ? null : `${6 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
          timeOut: status === 'Absent' ? null : `${17 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
          otHours: status === 'Present' ? Math.round(Math.random() * 3 * 10) / 10 : 0,
          shift,
          status,
        })
        count++
      }
    }
  }

  // Insert in batches to avoid SQLite limits
  const batchSize = 200
  for (let i = 0; i < records.length; i += batchSize) {
    await prisma.attendance.createMany({ data: records.slice(i, i + batchSize) })
  }
  console.log(`  ✅ ${count} attendance records created`)
}

async function seedLeaveRequests(empIdMap: Map<string, string>) {
  console.log('🌱 Seeding LeaveRequests...')
  const types = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Compensatory Off', 'Maternity Leave']
  const statuses = ['Pending', 'Pending', 'Approved', 'Approved', 'Rejected', 'Approved']
  const reasons = ['Family function', 'Medical appointment', 'Personal work', 'Fever', 'Travel', 'Marriage ceremony']
  const data = []

  const empSubset = EMPLOYEES.filter(e => e.type === 'Staff' && e.status === 'Active').slice(0, 15)
  for (let i = 0; i < 20; i++) {
    const emp = empSubset[i % empSubset.length]
    const month = String(3 + Math.floor(Math.random() * 4)).padStart(2, '0')
    const day = String(1 + Math.floor(Math.random() * 25)).padStart(2, '0')
    const fromDay = parseInt(day)
    const days = 1 + Math.floor(Math.random() * 4)
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    data.push({
      empId: empIdMap.get(emp.empId)!,
      site: emp.site,
      type: types[Math.floor(Math.random() * types.length)],
      fromDate: `2025-${month}-${day}`,
      toDate: `2025-${month}-${String(Math.min(fromDay + days, 28)).padStart(2, '0')}`,
      days,
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      status,
      appliedDate: `2025-${month}-${String(Math.max(1, fromDay - 3)).padStart(2, '0')}`,
    })
  }
  await prisma.leaveRequest.createMany({ data })
  console.log(`  ✅ ${data.length} leave requests created`)
}

async function seedShiftSchedules(empIdMap: Map<string, string>) {
  console.log('🌱 Seeding ShiftSchedules...')
  const data = []
  const shifts = ['Day 6AM-2PM', 'Day 2PM-10PM', 'Night 10PM-6AM']
  const weeks = ['2025-06-16', '2025-06-23']

  for (const emp of EMPLOYEES.filter(e => e.type === 'Worker' && e.status === 'Active').slice(0, 15)) {
    for (const weekStart of weeks) {
      data.push({
        empId: empIdMap.get(emp.empId)!,
        employeeName: emp.name,
        site: emp.site,
        shift: shifts[Math.floor(Math.random() * shifts.length)],
        weekStart,
      })
    }
  }
  await prisma.shiftSchedule.createMany({ data })
  console.log(`  ✅ ${data.length} shift schedules created`)
}

async function seedPayroll(empIdMap: Map<string, string>) {
  console.log('🌱 Seeding Payroll...')
  const data = []
  const months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06']

  for (const emp of EMPLOYEES) {
    if (emp.status === 'Inactive') continue
    const isStaff = emp.type === 'Staff'
    const basic = isStaff ? (30000 + Math.floor(Math.random() * 70000)) : (12000 + Math.floor(Math.random() * 16000))
    const hra = Math.round(basic * 0.4)
    const isLastMonth = months.indexOf('2025-06') >= 0
    const days = isLastMonth ? Math.min(new Date().getDate(), 30) : (25 + Math.floor(Math.random() * 5))

    for (const month of months) {
      const ot = isStaff ? 0 : Math.round(Math.random() * 5000)
      const gross = basic + hra + ot
      const pf = Math.round(gross * 0.12)
      const esi = isStaff ? 0 : Math.round(gross * 0.0175)
      const tds = gross > 50000 ? Math.round(gross * 0.1) : 0
      const netPay = gross - pf - esi - tds
      const status = month === '2025-06' ? 'Pending' : 'Processed'

      data.push({ empId: empIdMap.get(emp.empId)!, month, days, basic, hra, ot, gross, pf, esi, tds, netPay, status })
    }
  }

  const batchSize = 100
  for (let i = 0; i < data.length; i += batchSize) {
    await prisma.payroll.createMany({ data: data.slice(i, i + batchSize) })
  }
  console.log(`  ✅ ${data.length} payroll records created`)
}

async function seedExpenses(empIdMap: Map<string, string>) {
  console.log('🌱 Seeding Expenses...')
  const categories = ['Travel', 'Food & Accommodation', 'Material Purchase', 'Equipment Rental', 'Vehicle Fuel', 'Communication', 'Site Maintenance', 'Safety Equipment', 'Office Supplies', 'Client Entertainment']
  const statuses = ['Pending', 'Approved', 'Approved', 'Rejected', 'Pending']
  const data = []

  const staffEmps = EMPLOYEES.filter(e => e.type === 'Staff')
  const siteNames = SITES.map(s => s.name)

  for (let i = 0; i < 25; i++) {
    const emp = staffEmps[i % staffEmps.length]
    const month = String(1 + Math.floor(Math.random() * 6)).padStart(2, '0')
    const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')
    data.push({
      claimNo: `EXP-2025-${String(i + 1).padStart(4, '0')}`,
      empId: empIdMap.get(emp.empId)!,
      category: categories[Math.floor(Math.random() * categories.length)],
      amount: 500 + Math.floor(Math.random() * 45000),
      project: siteNames[Math.floor(Math.random() * siteNames.length)],
      date: `2025-${month}-${day}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
    })
  }
  await prisma.expense.createMany({ data })
  console.log(`  ✅ ${data.length} expenses created`)
}

async function seedPurchaseOrders() {
  console.log('🌱 Seeding PurchaseOrders...')
  const vendors = ['Tata Steel', 'UltraTech Cement', 'KEI Industries', 'Havells India', 'L&T Equipments', 'JCB India', 'Godrej Locks', 'Asian Paints', 'Finolex Cables', 'KEC International']
  const items = ['TMT Bars Fe500 (500 MT)', 'OPC 53 Grade Cement (1000 Bags)', 'HT XLPE Cables (3x240mm)', 'LED Panel Lights (200 Nos)', 'Tower Crane TC-5610', 'Backhoe Loader 3DX', 'Fire Rated Doors (50 Nos)', 'Exterior Emulsion (500 Ltrs)', 'LT Cables (4-core)', 'Transformer 630KVA']
  const statuses = ['Open', 'Open', 'Delivered', 'Delivered', 'Partial', 'Open', 'Cancelled']
  const data = []

  const siteNames = SITES.map(s => s.name)
  for (let i = 0; i < 15; i++) {
    const month = String(1 + Math.floor(Math.random() * 6)).padStart(2, '0')
    data.push({
      poNo: `PO-2025-${String(i + 1).padStart(4, '0')}`,
      vendor: vendors[i % vendors.length],
      item: items[i % items.length],
      amount: 50000 + Math.floor(Math.random() * 2500000),
      project: siteNames[Math.floor(Math.random() * siteNames.length)],
      delivery: `2025-${String(Math.min(parseInt(month) + 1, 12)).padStart(2, '0')}-15`,
      grn: statuses[i % statuses.length] === 'Delivered' ? 'Received' : statuses[i % statuses.length] === 'Partial' ? 'Partial' : 'Awaited',
      status: statuses[i % statuses.length],
    })
  }
  await prisma.purchaseOrder.createMany({ data })
  console.log(`  ✅ ${data.length} purchase orders created`)
}

async function seedInvoices() {
  console.log('🌱 Seeding Invoices...')
  const clients = ['MMRDA', 'DLF Ltd', 'Infosys Ltd', 'NHAI', 'Chennai Port Trust', 'MIDC', 'Kolkata Port Trust', 'Gujarat Energy']
  const statuses = ['Under Review', 'Approved', 'Approved', 'Paid', 'Overdue', 'Paid']
  const amounts = ['₹12,45,00,000', '₹8,90,00,000', '₹4,56,00,000', '₹15,20,00,000', '₹2,34,00,000', '₹6,78,00,000', '₹3,45,00,000', '₹1,89,00,000', '₹5,67,00,000', '₹9,12,00,000', '₹7,23,00,000', '₹11,56,00,000', '₹3,89,00,000', '₹6,45,00,000', '₹8,34,00,000']
  const data = []

  const siteNames = SITES.map(s => s.name)
  for (let i = 0; i < 15; i++) {
    const month = String(1 + Math.floor(Math.random() * 5)).padStart(2, '0')
    const day = String(1 + Math.floor(Math.random() * 25)).padStart(2, '0')
    data.push({
      invNo: `INV-2025-${String(i + 1).padStart(4, '0')}`,
      client: clients[i % clients.length],
      project: siteNames[i % siteNames.length],
      amount: amounts[i],
      date: `2025-${month}-${day}`,
      dueDate: `2025-${String(Math.min(parseInt(month) + 1, 12)).padStart(2, '0')}-28`,
      status: statuses[i % statuses.length],
    })
  }
  await prisma.invoice.createMany({ data })
  console.log(`  ✅ ${data.length} invoices created`)
}

async function seedWorkPermits() {
  console.log('🌱 Seeding WorkPermits...')
  const data = [
    { permitNo: 'PTW-2025-001', type: 'Hot Work', location: 'Mumbai Metro Line 7', issuedTo: 'Mohan Lal', expiry: '2025-07-15', status: 'Active', description: 'Welding at pier 12', precautions: 'Fire extinguisher, fire watcher, gas testing' },
    { permitNo: 'PTW-2025-002', type: 'Confined Space', location: 'Delhi Smart City Township', issuedTo: 'Ramu Naik', expiry: '2025-07-10', status: 'Active', description: 'Manhole entry for drainage work', precautions: 'Gas monitor, rescue team standby, ventilation' },
    { permitNo: 'PTW-2025-003', type: 'Height Work', location: 'Bangalore IT Park Phase 3', issuedTo: 'Krishna Murthy', expiry: '2025-06-30', status: 'Expired', description: 'Rebar fixing at Level 8', precautions: 'Safety harness, toe board, safety net' },
    { permitNo: 'PTW-2025-004', type: 'Electrical', location: 'Chennai Port Expansion', issuedTo: 'Lakshmanan', expiry: '2025-07-20', status: 'Active', description: 'Cable termination at panel board', precautions: 'LOTO, insulated tools, PPE' },
    { permitNo: 'PTW-2025-005', type: 'Excavation', location: 'Hyderabad Expressway', issuedTo: 'Naveen Reddy', expiry: '2025-07-25', status: 'Active', description: 'Trench excavation for cable laying', precautions: 'Shoring, barricading, competent person' },
    { permitNo: 'PTW-2025-006', type: 'Crane Lift', location: 'Mumbai Metro Line 7', issuedTo: 'Ravi Shankar', expiry: '2025-07-18', status: 'Active', description: 'Steel girder placement', precautions: 'Rigger, signalman, exclusion zone' },
    { permitNo: 'PTW-2025-007', type: 'Demolition', location: 'Kolkata Bridge Repair', issuedTo: 'Biplab Das', expiry: '2025-08-05', status: 'Active', description: 'Partial demolition of expansion joint', precautions: 'Dust control, debris net, PPE' },
    { permitNo: 'PTW-2025-008', type: 'Hot Work', location: 'Pune Industrial Complex', issuedTo: 'Ashok Mehta', expiry: '2025-06-20', status: 'Expired', description: 'Gas cutting for structural modification', precautions: 'Fire extinguisher, clear area, fire blanket' },
  ]
  await prisma.workPermit.createMany({ data })
  console.log(`  ✅ ${data.length} work permits created`)
}

async function seedIncidents() {
  console.log('🌱 Seeding Incidents...')
  const data = [
    { refNo: 'INC-2025-001', date: '2025-03-15', site: 'Mumbai Metro Line 7', type: 'Near Miss', severity: 'Low', person: 'Mohan Lal', status: 'Closed', description: 'Tool fell from scaffolding, no injury', action: 'Tool lanyard rule enforced, toolbox talk conducted' },
    { refNo: 'INC-2025-002', date: '2025-04-22', site: 'Delhi Smart City Township', type: 'First Aid', severity: 'Low', person: 'Ramu Naik', status: 'Closed', description: 'Minor cut on hand while handling rebar', action: 'First aid provided, gloves distributed' },
    { refNo: 'INC-2025-003', date: '2025-05-10', site: 'Hyderabad Expressway', type: 'Lost Time Injury', severity: 'Medium', person: 'Pradeep Yadav', status: 'Investigating', description: 'Back injury while lifting heavy material', action: 'Medical leave granted, ergonomic assessment pending' },
    { refNo: 'INC-2025-004', date: '2025-05-28', site: 'Chennai Port Expansion', type: 'Property Damage', severity: 'Medium', person: 'Thangavelu', status: 'Investigating', description: 'Concrete batcher malfunction causing material wastage', action: 'Equipment inspection scheduled, vendor notified' },
    { refNo: 'INC-2025-005', date: '2025-06-05', site: 'Bangalore IT Park Phase 3', type: 'Near Miss', severity: 'Low', person: 'Dinesh Kumar', status: 'Closed', description: 'Scaffolding swayed during high winds', action: 'Scaffolding anchored, wind speed monitoring added' },
    { refNo: 'INC-2025-006', date: '2025-06-12', site: 'Kolkata Bridge Repair', type: 'Environmental', severity: 'Medium', person: 'Biplab Das', status: 'Open', description: 'Cement spillage into drainage channel', action: 'Cleanup in progress, containment barriers installed' },
  ]
  await prisma.incident.createMany({ data })
  console.log(`  ✅ ${data.length} incidents created`)
}

async function seedEquipment() {
  console.log('🌱 Seeding Equipment...')
  const data = [
    { name: 'Tower Crane TC-5610', eqId: 'EQ-001', site: 'Mumbai Metro Line 7', status: 'Operational', lastPM: '2025-05-15', nextPM: '2025-08-15', utilization: 82, assignedTo: 'Ravi Shankar' },
    { name: 'Excavator 320D', eqId: 'EQ-002', site: 'Hyderabad Expressway', status: 'Operational', lastPM: '2025-05-20', nextPM: '2025-08-20', utilization: 78, assignedTo: 'Pradeep Yadav' },
    { name: 'Bar Bending Machine', eqId: 'EQ-003', site: 'Delhi Smart City Township', status: 'Operational', lastPM: '2025-06-01', nextPM: '2025-09-01', utilization: 65, assignedTo: 'Ramu Naik' },
    { name: 'Concrete Mixer 10/7', eqId: 'EQ-004', site: 'Bangalore IT Park Phase 3', status: 'Under Repair', lastPM: '2025-04-10', nextPM: '2025-07-10', issue: 'Drum bearing worn out', downSince: '2025-06-18', etaRepair: '2025-07-05', utilization: 45 },
    { name: 'Generator 500KVA', eqId: 'EQ-005', site: 'Chennai Port Expansion', status: 'Operational', lastPM: '2025-05-25', nextPM: '2025-08-25', utilization: 90, assignedTo: 'Lakshmanan' },
    { name: 'JCB 3DX Backhoe', eqId: 'EQ-006', site: 'Kolkata Bridge Repair', status: 'Operational', lastPM: '2025-06-01', nextPM: '2025-09-01', utilization: 72, assignedTo: 'Biplab Das' },
    { name: 'Tower Crane QTZ80', eqId: 'EQ-007', site: 'Delhi Smart City Township', status: 'Operational', lastPM: '2025-05-10', nextPM: '2025-08-10', utilization: 88, assignedTo: 'Ravi Shankar' },
    { name: 'Welding Machine 400A', eqId: 'EQ-008', site: 'Mumbai Metro Line 7', status: 'Operational', lastPM: '2025-06-05', nextPM: '2025-09-05', utilization: 70, assignedTo: 'Suresh Yadav' },
    { name: 'Vibratory Roller 10T', eqId: 'EQ-009', site: 'Hyderabad Expressway', status: 'Operational', lastPM: '2025-04-20', nextPM: '2025-07-20', utilization: 60 },
    { name: 'Transit Mixer 6m3', eqId: 'EQ-010', site: 'Pune Industrial Complex', status: 'Idle', lastPM: '2025-05-30', nextPM: '2025-08-30', utilization: 15 },
    { name: 'Scaffolding Set (100 units)', eqId: 'EQ-011', site: 'Bangalore IT Park Phase 3', status: 'Operational', lastPM: '2025-06-10', nextPM: '2025-09-10', utilization: 95 },
    { name: 'Dewatering Pump 5HP', eqId: 'EQ-012', site: 'Kolkata Bridge Repair', status: 'Under Repair', lastPM: '2025-05-15', nextPM: '2025-08-15', issue: 'Seal leakage', downSince: '2025-06-20', etaRepair: '2025-06-28', utilization: 55 },
  ]
  await prisma.equipment.createMany({ data })
  console.log(`  ✅ ${data.length} equipment created`)
}

async function seedSubcontractors() {
  console.log('🌱 Seeding Subcontractors...')
  const data = [
    { name: 'Shree Ram Constructions', trade: 'Civil Works', workers: 35, site: 'Mumbai Metro Line 7', pfReg: 'Registered', esiReg: 'Registered', labourLic: 'Valid', compliance: 'Compliant' },
    { name: 'Krishna Electricals', trade: 'Electrical', workers: 12, site: 'Delhi Smart City Township', pfReg: 'Registered', esiReg: 'Pending', labourLic: 'Valid', compliance: 'Partially Compliant' },
    { name: 'Singh & Sons Plumbing', trade: 'Plumbing & MEP', workers: 18, site: 'Bangalore IT Park Phase 3', pfReg: 'Registered', esiReg: 'Registered', labourLic: 'Valid', compliance: 'Compliant' },
    { name: 'Reddy Steel Fabricators', trade: 'Structural Steel', workers: 25, site: 'Hyderabad Expressway', pfReg: 'Pending', esiReg: 'Pending', labourLic: 'Expired', compliance: 'Non-Compliant' },
    { name: 'Patel Painting Works', trade: 'Painting & Finishing', workers: 15, site: 'Chennai Port Expansion', pfReg: 'Registered', esiReg: 'Registered', labourLic: 'Valid', compliance: 'Compliant' },
    { name: 'Das Earthmovers', trade: 'Earthwork', workers: 8, site: 'Kolkata Bridge Repair', pfReg: 'Registered', esiReg: 'Pending', labourLic: 'Valid', compliance: 'Partially Compliant' },
    { name: 'Khan Welding Services', trade: 'Welding & Cutting', workers: 10, site: 'Mumbai Metro Line 7', pfReg: 'Pending', esiReg: 'Pending', labourLic: 'Pending', compliance: 'Non-Compliant' },
    { name: 'Nair Interiors', trade: 'False Ceiling & Partitions', workers: 20, site: 'Pune Industrial Complex', pfReg: 'Registered', esiReg: 'Registered', labourLic: 'Valid', compliance: 'Compliant' },
  ]
  await prisma.subcontractor.createMany({ data })
  console.log(`  ✅ ${data.length} subcontractors created`)
}

async function seedJobOpenings() {
  console.log('🌱 Seeding JobOpenings...')
  const data = [
    { position: 'Site Engineer - Civil', site: 'Mumbai Metro Line 7', openings: 2, applications: 8, priority: 'High', status: 'Open' },
    { position: 'QA/QC Inspector', site: 'Chennai Port Expansion', openings: 1, applications: 5, priority: 'Medium', status: 'Open' },
    { position: 'Safety Officer', site: 'Hyderabad Expressway', openings: 1, applications: 3, priority: 'High', status: 'Open' },
    { position: 'Electrician (Skilled)', site: 'Delhi Smart City Township', openings: 5, applications: 12, priority: 'Medium', status: 'Open' },
    { position: 'Crane Operator', site: 'Bangalore IT Park Phase 3', openings: 2, applications: 4, priority: 'High', status: 'Open' },
    { position: 'Surveyor', site: 'Hyderabad Expressway', openings: 1, applications: 6, priority: 'Medium', status: 'Closed' },
    { position: 'Accountant', site: 'Mumbai Metro Line 7', openings: 1, applications: 10, priority: 'Low', status: 'Open' },
  ]
  await prisma.jobOpening.createMany({ data })
  console.log(`  ✅ ${data.length} job openings created`)
}

async function seedCertifications(empIdMap: Map<string, string>) {
  console.log('🌱 Seeding Certifications...')
  const data = [
    { empId: empIdMap.get('VC-001')!, employeeName: 'Rajesh Kumar', name: 'PMP Certification', issuedBy: 'PMI', issueDate: '2022-03-10', expiryDate: '2025-03-10', status: 'Valid' },
    { empId: empIdMap.get('VC-005')!, employeeName: 'Karthik Rajan', name: 'ISO 9001 Lead Auditor', issuedBy: 'Bureau Veritas', issueDate: '2023-06-15', expiryDate: '2026-06-15', status: 'Valid' },
    { empId: empIdMap.get('VC-012')!, employeeName: 'Manish Tiwari', name: 'NEBOSH IGC', issuedBy: 'NEBOSH UK', issueDate: '2023-01-20', expiryDate: '2026-01-20', status: 'Valid' },
    { empId: empIdMap.get('VC-015')!, employeeName: 'Mohan Lal', name: 'ITI Electrician', issuedBy: 'NCVT', issueDate: '2019-05-10', expiryDate: '2029-05-10', status: 'Valid' },
    { empId: empIdMap.get('VC-016')!, employeeName: 'Suresh Yadav', name: 'ITI Welder', issuedBy: 'NCVT', issueDate: '2020-08-15', expiryDate: '2030-08-15', status: 'Valid' },
    { empId: empIdMap.get('VC-022')!, employeeName: 'Ravi Shankar', name: 'Heavy Vehicle License', issuedBy: 'RTO Mumbai', issueDate: '2021-03-01', expiryDate: '2026-03-01', status: 'Valid' },
    { empId: empIdMap.get('VC-023')!, employeeName: 'Pradeep Yadav', name: 'Heavy Vehicle License', issuedBy: 'RTO Hyderabad', issueDate: '2022-06-10', expiryDate: '2027-06-10', status: 'Valid' },
    { empId: empIdMap.get('VC-003')!, employeeName: 'Priya Nair', name: 'M.Tech Structural Engg', issuedBy: 'VTU Belgaum', issueDate: '2021-07-30', expiryDate: '2031-07-30', status: 'Valid' },
    { empId: empIdMap.get('VC-010')!, employeeName: 'Sanjay Gupta', name: 'Chartered Accountant', issuedBy: 'ICAI', issueDate: '2018-11-15', expiryDate: '2025-11-15', status: 'Valid' },
    { empId: empIdMap.get('VC-001')!, employeeName: 'Rajesh Kumar', name: 'LEED AP', issuedBy: 'USGBC', issueDate: '2023-09-01', expiryDate: '2026-09-01', status: 'Valid' },
  ]
  await prisma.certification.createMany({ data })
  console.log(`  ✅ ${data.length} certifications created`)
}

async function seedTrainingSessions() {
  console.log('🌱 Seeding TrainingSessions...')
  const data = [
    { title: 'Fire Safety & Evacuation Drill', site: 'Mumbai Metro Line 7', trainer: 'Manish Tiwari', date: '2025-06-10', duration: '2 hours', attendees: 45, status: 'Completed' },
    { title: 'Working at Heights - Safety', site: 'Bangalore IT Park Phase 3', trainer: 'Manish Tiwari', date: '2025-06-15', duration: '3 hours', attendees: 32, status: 'Completed' },
    { title: 'First Aid Training', site: 'Delhi Smart City Township', trainer: 'Red Cross India', date: '2025-06-20', duration: '4 hours', attendees: 55, status: 'Scheduled' },
    { title: 'Concrete Quality Control', site: 'Hyderabad Expressway', trainer: 'Karthik Rajan', date: '2025-06-25', duration: '2 hours', attendees: 28, status: 'Scheduled' },
    { title: 'Electrical Safety - LOTO', site: 'Chennai Port Expansion', trainer: 'Meera Patel', date: '2025-05-28', duration: '2 hours', attendees: 22, status: 'Completed' },
    { title: 'Scaffold Safety Awareness', site: 'Mumbai Metro Line 7', trainer: 'Manish Tiwari', date: '2025-07-02', duration: '2 hours', attendees: 40, status: 'Scheduled' },
    { title: 'ERP System Training', site: 'Mumbai Metro Line 7', trainer: 'Rahul Verma', date: '2025-06-05', duration: '3 hours', attendees: 14, status: 'Completed' },
    { title: 'New Machine Operation - Batching Plant', site: 'Delhi Smart City Township', trainer: 'Equipment Vendor', date: '2025-07-08', duration: '4 hours', attendees: 15, status: 'Scheduled' },
  ]
  await prisma.trainingSession.createMany({ data })
  console.log(`  ✅ ${data.length} training sessions created`)
}

async function seedInventory() {
  console.log('🌱 Seeding Inventory...')
  const data = [
    { itemCode: 'MAT-001', name: 'OPC 53 Grade Cement', category: 'Cement', unit: 'Bags', currentStock: 2500, minStock: 500, maxStock: 5000, unitCost: 380, warehouse: 'Central Store Mumbai', status: 'In Stock' },
    { itemCode: 'MAT-002', name: 'TMT Fe500D 12mm Rebar', category: 'Steel', unit: 'MT', currentStock: 85, minStock: 20, maxStock: 200, unitCost: 52000, warehouse: 'Steel Yard Mumbai', status: 'In Stock' },
    { itemCode: 'MAT-003', name: 'TMT Fe500D 16mm Rebar', category: 'Steel', unit: 'MT', currentStock: 120, minStock: 30, maxStock: 250, unitCost: 53500, warehouse: 'Steel Yard Mumbai', status: 'In Stock' },
    { itemCode: 'MAT-004', name: 'TMT Fe500D 20mm Rebar', category: 'Steel', unit: 'MT', currentStock: 45, minStock: 15, maxStock: 150, unitCost: 55000, warehouse: 'Steel Yard Delhi', status: 'In Stock' },
    { itemCode: 'MAT-005', name: 'M Sand (River Sand)', category: 'Aggregates', unit: 'Cu.M', currentStock: 320, minStock: 100, maxStock: 600, unitCost: 1200, warehouse: 'Site Store Delhi', status: 'In Stock' },
    { itemCode: 'MAT-006', name: '20mm Aggregate', category: 'Aggregates', unit: 'Cu.M', currentStock: 180, minStock: 80, maxStock: 400, unitCost: 950, warehouse: 'Site Store Delhi', status: 'In Stock' },
    { itemCode: 'MAT-007', name: 'HT XLPE Cable 3x240mm', category: 'Electrical', unit: 'Meters', currentStock: 450, minStock: 200, maxStock: 1000, unitCost: 1800, warehouse: 'Electrical Store Chennai', status: 'In Stock' },
    { itemCode: 'MAT-008', name: 'PVC Conduit 32mm', category: 'Electrical', unit: 'Nos', currentStock: 25, minStock: 50, maxStock: 500, unitCost: 45, warehouse: 'Electrical Store Chennai', status: 'Low Stock' },
    { itemCode: 'MAT-009', name: 'CPVC Pipe 25mm', category: 'Plumbing', unit: 'Nos', currentStock: 12, minStock: 100, maxStock: 500, unitCost: 85, warehouse: 'Site Store Bangalore', status: 'Low Stock' },
    { itemCode: 'MAT-010', name: 'Plywood 12mm BWR', category: 'Formwork', unit: 'Sheets', currentStock: 340, minStock: 100, maxStock: 800, unitCost: 650, warehouse: 'Central Store Mumbai', status: 'In Stock' },
    { itemCode: 'MAT-011', name: 'Mild Steel Plate 6mm', category: 'Steel', unit: 'KG', currentStock: 2200, minStock: 500, maxStock: 5000, unitCost: 62, warehouse: 'Steel Yard Mumbai', status: 'In Stock' },
    { itemCode: 'MAT-012', name: 'Welding Rod E6013 3.2mm', category: 'Welding', unit: 'KG', currentStock: 180, minStock: 50, maxStock: 500, unitCost: 95, warehouse: 'Site Store Mumbai', status: 'In Stock' },
    { itemCode: 'MAT-013', name: 'Safety Helmet', category: 'Safety', unit: 'Nos', currentStock: 85, minStock: 30, maxStock: 200, unitCost: 220, warehouse: 'Safety Store Mumbai', status: 'In Stock' },
    { itemCode: 'MAT-014', name: 'Safety Harness', category: 'Safety', unit: 'Nos', currentStock: 8, minStock: 20, maxStock: 100, unitCost: 2800, warehouse: 'Safety Store Mumbai', status: 'Low Stock' },
    { itemCode: 'MAT-015', name: 'LED Panel Light 2x2', category: 'Electrical', unit: 'Nos', currentStock: 120, minStock: 50, maxStock: 300, unitCost: 850, warehouse: 'Electrical Store Mumbai', status: 'In Stock' },
    { itemCode: 'MAT-016', name: ' Bearing NU 312', category: 'Mechanical', unit: 'Nos', currentStock: 4, minStock: 5, maxStock: 20, unitCost: 4500, warehouse: 'Mechanical Store Delhi', status: 'Low Stock' },
    { itemCode: 'MAT-017', name: 'Hydraulic Oil 68', category: 'Mechanical', unit: 'Litres', currentStock: 200, minStock: 50, maxStock: 500, unitCost: 280, warehouse: 'Mechanical Store Delhi', status: 'In Stock' },
    { itemCode: 'MAT-018', name: 'Fire Extinguisher ABC 9KG', category: 'Safety', unit: 'Nos', currentStock: 32, minStock: 10, maxStock: 50, unitCost: 1800, warehouse: 'Safety Store Mumbai', status: 'In Stock' },
    { itemCode: 'MAT-019', name: 'Gypsum Board 12mm', category: 'Finishing', unit: 'Sheets', currentStock: 0, minStock: 100, maxStock: 500, unitCost: 520, warehouse: 'Site Store Pune', status: 'Out of Stock' },
    { itemCode: 'MAT-020', name: 'Primer 20 Litres', category: 'Painting', unit: 'Litres', currentStock: 320, minStock: 100, maxStock: 500, unitCost: 210, warehouse: 'Site Store Chennai', status: 'In Stock' },
  ]
  await prisma.inventoryItem.createMany({ data })
  console.log(`  ✅ ${data.length} inventory items created`)
}

async function seedStockMovements() {
  console.log('🌱 Seeding StockMovements...')
  const types = ['Inward', 'Inward', 'Inward', 'Outward', 'Outward', 'Transfer']
  const data = []
  const warehouses = ['Central Store Mumbai', 'Steel Yard Mumbai', 'Site Store Delhi', 'Electrical Store Chennai', 'Site Store Bangalore']
  const items = [
    { itemCode: 'MAT-001', itemName: 'OPC 53 Grade Cement' },
    { itemCode: 'MAT-002', itemName: 'TMT Fe500D 12mm Rebar' },
    { itemCode: 'MAT-003', itemName: 'TMT Fe500D 16mm Rebar' },
    { itemCode: 'MAT-005', itemName: 'M Sand (River Sand)' },
    { itemCode: 'MAT-007', itemName: 'HT XLPE Cable 3x240mm' },
    { itemCode: 'MAT-010', itemName: 'Plywood 12mm BWR' },
    { itemCode: 'MAT-012', itemName: 'Welding Rod E6013 3.2mm' },
    { itemCode: 'MAT-013', itemName: 'Safety Helmet' },
  ]

  for (let i = 0; i < 35; i++) {
    const month = String(1 + Math.floor(Math.random() * 6)).padStart(2, '0')
    const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')
    const type = types[Math.floor(Math.random() * types.length)]
    const item = items[i % items.length]
    data.push({
      itemCode: item.itemCode,
      itemName: item.itemName,
      type,
      quantity: 5 + Math.floor(Math.random() * 200),
      fromWarehouse: type === 'Outward' || type === 'Transfer' ? warehouses[Math.floor(Math.random() * warehouses.length)] : undefined,
      toWarehouse: type === 'Inward' || type === 'Transfer' ? warehouses[Math.floor(Math.random() * warehouses.length)] : undefined,
      reference: `MR-${2025}${month}${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
      date: `2025-${month}-${day}`,
      remarks: type === 'Transfer' ? 'Site transfer' : type === 'Inward' ? 'PO receipt' : 'Site consumption',
    })
  }
  await prisma.stockMovement.createMany({ data })
  console.log(`  ✅ ${data.length} stock movements created`)
}

async function seedCustomers() {
  console.log('🌱 Seeding Customers...')
  const data = [
    { code: 'CUS-001', name: 'MMRDA', contactPerson: 'Sunil Joshi', email: 'sunil.j@mmrda.gov.in', phone: '022-26591000', address: 'MMRDA Building, Bandra Kurla Complex', gst: '27AADCM1234F1ZP', city: 'Mumbai', state: 'Maharashtra', totalOrders: 8, totalRevenue: 245000000, status: 'Active' },
    { code: 'CUS-002', name: 'DLF Ltd', contactPerson: 'Anand Sharma', email: 'anand.s@dlf.in', phone: '011-26621000', address: 'DLF Centre, Shivaji Marg', gst: '07AADCD5678G1Z3', city: 'New Delhi', state: 'Delhi', totalOrders: 5, totalRevenue: 890000000, status: 'Active' },
    { code: 'CUS-003', name: 'Infosys Ltd', contactPerson: 'Krishna Prasad', email: 'krishna.p@infosys.com', phone: '080-28521000', address: 'Electronics City', gst: '29AABCI1234F1ZP', city: 'Bangalore', state: 'Karnataka', totalOrders: 3, totalRevenue: 560000000, status: 'Active' },
    { code: 'CUS-004', name: 'NHAI', contactPerson: 'R.K. Singh', email: 'rk.singh@nhai.gov.in', phone: '011-23781000', address: 'NHAI HQ, New Delhi', gst: '07AAAGH5678F1Z3', city: 'New Delhi', state: 'Delhi', totalOrders: 2, totalRevenue: 1200000000, status: 'Active' },
    { code: 'CUS-005', name: 'Chennai Port Trust', contactPerson: 'Murugan', email: 'murugan@chennaiport.gov.in', phone: '044-25361000', address: 'Rajaji Salai, Chennai', gst: '33AAACH1234F1ZP', city: 'Chennai', state: 'Tamil Nadu', totalOrders: 2, totalRevenue: 780000000, status: 'Active' },
    { code: 'CUS-006', name: 'Gujarat Energy Ltd', contactPerson: 'Rakesh Patel', email: 'rakesh.p@gujaratenergy.in', phone: '079-26581000', address: 'Energy House, Gandhinagar', gst: '24AABCG5678F1Z3', city: 'Ahmedabad', state: 'Gujarat', totalOrders: 1, totalRevenue: 185000000, status: 'Active' },
    { code: 'CUS-007', name: 'MIDC', contactPerson: 'Suresh Kulkarni', email: 'suresh.k@midc.gov.in', phone: '020-26121000', address: 'MIDC Bhavan, Pune', gst: '27AABCM1234F1ZP', city: 'Pune', state: 'Maharashtra', totalOrders: 1, totalRevenue: 340000000, status: 'Active' },
    { code: 'CUS-008', name: 'L&T Construction', contactPerson: 'Venkatesh', email: 'venkatesh@lntecc.com', phone: '044-23751000', address: 'L&T Campus, Chennai', gst: '33AABCL1234F1ZP', city: 'Chennai', state: 'Tamil Nadu', totalOrders: 4, totalRevenue: 650000000, status: 'Active' },
  ]
  await prisma.customer.createMany({ data })
  console.log(`  ✅ ${data.length} customers created`)
}

async function seedSalesOrders() {
  console.log('🌱 Seeding SalesOrders...')
  const data = [
    { soNo: 'SO-2025-001', customer: 'L&T Construction', project: 'Chennai Metro', item: 'Pre-cast Girders', quantity: 50, unitPrice: 450000, amount: 22500000, orderDate: '2025-01-15', deliveryDate: '2025-04-15', status: 'Delivered' },
    { soNo: 'SO-2025-002', customer: 'MMRDA', project: 'Mumbai Metro', item: 'Steel Bridge Sections', quantity: 20, unitPrice: 850000, amount: 17000000, orderDate: '2025-02-10', deliveryDate: '2025-05-20', status: 'Delivered' },
    { soNo: 'SO-2025-003', customer: 'DLF Ltd', project: 'Smart City', item: 'Pile Foundation Work', quantity: 100, unitPrice: 120000, amount: 12000000, orderDate: '2025-03-05', deliveryDate: '2025-07-30', status: 'In Progress' },
    { soNo: 'SO-2025-004', customer: 'NHAI', project: 'Hyderabad ORR', item: 'Crash Barriers', quantity: 500, unitPrice: 18000, amount: 9000000, orderDate: '2025-03-20', deliveryDate: '2025-06-25', status: 'Shipped' },
    { soNo: 'SO-2025-005', customer: 'Infosys Ltd', project: 'IT Park', item: 'Structural Steel Fabrication', quantity: 200, unitPrice: 75000, amount: 15000000, orderDate: '2025-04-12', deliveryDate: '2025-08-15', status: 'In Progress' },
    { soNo: 'SO-2025-006', customer: 'L&T Construction', project: 'Mumbai Trans Harbour', item: 'Concrete Blocks', quantity: 10000, unitPrice: 45, amount: 450000, orderDate: '2025-04-25', deliveryDate: '2025-05-20', status: 'Delivered' },
    { soNo: 'SO-2025-007', customer: 'Gujarat Energy', project: 'Solar Farm', item: 'Solar Panel Mounting Structure', quantity: 5000, unitPrice: 3500, amount: 17500000, orderDate: '2025-05-08', deliveryDate: '2025-07-08', status: 'In Progress' },
    { soNo: 'SO-2025-008', customer: 'MIDC', project: 'Industrial Complex', item: 'Pre-engineered Building', quantity: 3, unitPrice: 5500000, amount: 16500000, orderDate: '2025-05-15', deliveryDate: '2025-10-15', status: 'Pending' },
    { soNo: 'SO-2025-009', customer: 'NHAI', project: 'Delhi-Agra Expressway', item: 'Noise Barriers', quantity: 300, unitPrice: 25000, amount: 7500000, orderDate: '2025-06-01', deliveryDate: '2025-09-01', status: 'Pending' },
    { soNo: 'SO-2025-010', customer: 'Chennai Port Trust', project: 'Port Expansion', item: 'Dolphins & Fenders', quantity: 15, unitPrice: 950000, amount: 14250000, orderDate: '2025-06-10', deliveryDate: '2025-09-30', status: 'Pending' },
  ]
  await prisma.salesOrder.createMany({ data })
  console.log(`  ✅ ${data.length} sales orders created`)
}

async function seedCrmContacts() {
  console.log('🌱 Seeding CRM Contacts...')
  const data = [
    { name: 'Sunil Joshi', company: 'MMRDA', designation: 'Chief Engineer', email: 'sunil.j@mmrda.gov.in', phone: '9898980001', source: 'Referral', stage: 'Client', value: 245000000, lastContact: '2025-06-18', notes: 'Key decision maker for Metro projects', status: 'Active' },
    { name: 'Anand Sharma', company: 'DLF Ltd', designation: 'VP Construction', email: 'anand.s@dlf.in', phone: '9898980002', source: 'Cold Call', stage: 'Client', value: 890000000, lastContact: '2025-06-15', notes: 'Interested in township expansion phase 2', status: 'Active' },
    { name: 'Priya Kapoor', company: 'Adani Realty', designation: 'Project Director', email: 'priya.k@adani.com', phone: '9898980003', source: 'LinkedIn', stage: 'Proposal', value: 150000000, lastContact: '2025-06-20', notes: 'Awaiting RFP for Ahmedabad township', status: 'Active' },
    { name: 'Vikram Iyer', company: 'TCS', designation: 'Facilities Head', email: 'vikram.i@tcs.com', phone: '9898980004', source: 'Website', stage: 'Lead', value: 50000000, lastContact: '2025-06-10', notes: 'Datacenter construction inquiry', status: 'Active' },
    { name: 'Deepak Joshi', company: 'Shapoorji Pallonji', designation: 'GM Procurement', email: 'deepak.j@spgroup.com', phone: '9898980005', source: 'Trade Show', stage: 'Negotiation', value: 320000000, lastContact: '2025-06-22', notes: 'Negotiating steel supply terms', status: 'Active' },
    { name: 'Neha Gupta', company: 'Godrej Properties', designation: 'Construction Manager', email: 'neha.g@godrej.com', phone: '9898980006', source: 'Referral', stage: 'Proposal', value: 95000000, lastContact: '2025-06-12', notes: 'Submitted proposal for Mumbai residential', status: 'Active' },
    { name: 'Rajiv Mehta', company: 'Reliance Industries', designation: 'VP Engineering', email: 'rajiv.m@ril.com', phone: '9898980007', source: 'Direct', stage: 'Lead', value: 500000000, lastContact: '2025-05-28', notes: 'Large refinery expansion project', status: 'Active' },
    { name: 'Arun Kumar', company: 'IRCON International', designation: 'Project Director', email: 'arun.k@ircon.org', phone: '9898980008', source: 'Govt Portal', stage: 'Lead', value: 280000000, lastContact: '2025-06-05', notes: 'Railway bridge project in Kerala', status: 'Active' },
    { name: 'Suman Das', company: 'WBHIDCO', designation: 'CEO', email: 'suman.d@wbhidco.gov.in', phone: '9898980009', source: 'Referral', stage: 'Qualified', value: 180000000, lastContact: '2025-06-08', notes: 'Smart city project in Kolkata', status: 'Active' },
    { name: 'Kavitha Reddy', company: 'My Home Group', designation: 'Director', email: 'kavitha.r@myhomegroup.com', phone: '9898980010', source: 'LinkedIn', stage: 'Lead', value: 75000000, lastContact: '2025-05-30', notes: 'Hyderabad residential project', status: 'Active' },
  ]
  await prisma.crmContact.createMany({ data })
  console.log(`  ✅ ${data.length} CRM contacts created`)
}

async function seedSupportTickets() {
  console.log('🌱 Seeding SupportTickets...')
  const data = [
    { ticketNo: 'TKT-2025-001', title: 'ERP login issue for new employee', raisedBy: 'Deepa Menon', category: 'IT Support', priority: 'High', status: 'Resolved', assignedTo: 'Rahul Verma', description: 'New joinee VC-029 unable to login to ERP portal', resolution: 'Account created and credentials shared' },
    { ticketNo: 'TKT-2025-002', title: 'Printer not working at Delhi site office', raisedBy: 'Amit Sharma', category: 'IT Support', priority: 'Low', status: 'Open', assignedTo: 'Rahul Verma', description: 'HP LaserJet at Delhi site office showing paper jam error' },
    { ticketNo: 'TKT-2025-003', title: 'Salary slip download issue', raisedBy: 'Mohan Lal', category: 'HR', priority: 'Medium', status: 'Resolved', assignedTo: 'Deepa Menon', description: 'Unable to download March 2025 salary slip from portal', resolution: 'Payroll data re-synced, issue resolved' },
    { ticketNo: 'TKT-2025-004', title: 'Vendor payment delayed', raisedBy: 'Ritu Singh', category: 'Finance', priority: 'High', status: 'In Progress', assignedTo: 'Sanjay Gupta', description: 'Tata Steel payment pending for 45 days, vendor following up' },
    { ticketNo: 'TKT-2025-005', title: 'Site vehicle tyre replacement', raisedBy: 'Vikram Patil', category: 'Admin', priority: 'Medium', status: 'Open', description: 'Bolero at Pune site needs all 4 tyres replaced' },
    { ticketNo: 'TKT-2025-006', title: 'Safety equipment shortage at Hyderabad site', raisedBy: 'Manish Tiwari', category: 'Procurement', priority: 'High', status: 'In Progress', assignedTo: 'Ritu Singh', description: 'Running low on safety harnesses, need urgent procurement' },
    { ticketNo: 'TKT-2025-007', title: 'Attendance biometric device malfunction', raisedBy: 'Priya Nair', category: 'IT Support', priority: 'Medium', status: 'Resolved', assignedTo: 'Rahul Verma', description: 'Biometric device at Bangalore site showing error code E-404', resolution: 'Firmware updated, device recalibrated' },
    { ticketNo: 'TKT-2025-008', title: 'Insurance renewal due for equipment', raisedBy: 'Sanjay Gupta', category: 'Finance', priority: 'Medium', status: 'Open', description: 'Equipment insurance for EQ-001 to EQ-006 expiring on 2025-07-15' },
  ]
  await prisma.supportTicket.createMany({ data })
  console.log(`  ✅ ${data.length} support tickets created`)
}

async function seedKBArticles() {
  console.log('🌱 Seeding KBArticles...')
  const data = [
    { title: 'How to Apply for Leave in ERP', category: 'HR', content: 'Step 1: Login to VoltCore ERP portal. Step 2: Navigate to HRMS > Leave Management. Step 3: Click "Apply Leave". Step 4: Select leave type, dates, and reason. Step 5: Submit for approval. Your manager will be notified automatically.', author: 'Deepa Menon', tags: 'leave,hrms,application', views: 156, helpful: 89, status: 'Published' },
    { title: 'Expense Claim Submission Guide', category: 'Finance', content: 'All expense claims must be submitted within 7 days of the expense date. Attach original bills/receipts. Claims above ₹10,000 require manager approval. Claims above ₹50,000 require director approval. Processing time is 5-7 working days.', author: 'Sanjay Gupta', tags: 'expense,claim,reimbursement', views: 203, helpful: 112, status: 'Published' },
    { title: 'Safety Helmet Usage Policy', category: 'Safety', content: 'Safety helmets must be worn at all times on construction sites. Replace helmet every 3 years or after any impact. Color coding: White=Visitors, Yellow=Workers, Blue=Supervisors, Red=Safety Officers. Report any damage immediately.', author: 'Manish Tiwari', tags: 'safety,helmet,ppe', views: 287, helpful: 145, status: 'Published' },
    { title: 'Purchase Order Creation Process', category: 'Procurement', content: '1. Raise material requisition from site. 2. Get approval from Site Engineer. 3. Procurement team obtains 3 quotes. 4. Comparative statement prepared. 5. PO approved by Purchase Manager. 6. PO issued to selected vendor. 7. Follow up for delivery and GRN.', author: 'Ritu Singh', tags: 'purchase,order,procurement', views: 178, helpful: 95, status: 'Published' },
    { title: 'Work Permit (PTW) Requirements', category: 'Safety', content: 'Work permits required for: Hot Work, Height Work (>3m), Confined Space, Electrical, Excavation, Crane Operations. Permit valid for single shift only. Must be signed by HSE officer and Area Incharge. Emergency contact details must be updated on permit board.', author: 'Manish Tiwari', tags: 'safety,permit,ptw', views: 312, helpful: 167, status: 'Published' },
    { title: 'Payroll Processing Timeline', category: 'Finance', content: 'Salary processed on 25th of every month. Cut-off date for attendance: 22nd. Overtime claims: Submit by 20th. Salary credits by 28th. Payslips available on portal by 30th. For queries, contact accounts@voltcore.in.', author: 'Sanjay Gupta', tags: 'payroll,salary,dates', views: 245, helpful: 134, status: 'Published' },
    { title: 'Incident Reporting Procedure', category: 'Safety', content: '1. Provide immediate first aid. 2. Secure the area. 3. Report to HSE Officer within 15 minutes. 4. HSE Officer fills Incident Report Form. 5. Root cause analysis within 24 hours. 6. Corrective actions implemented. 7. Report to management within 48 hours.', author: 'Manish Tiwari', tags: 'incident,safety,reporting', views: 198, helpful: 121, status: 'Published' },
    { title: 'Inventory Material Request Guide', category: 'Operations', content: '1. Check current stock in ERP > Inventory. 2. Create material requisition with required quantity. 3. Site Engineer approval required. 4. Central store issues material. 5. Site confirms receipt. 6. Stock updated automatically. Minimum order quantity: Check with store keeper.', author: 'Anjali Deshmukh', tags: 'inventory,material,request', views: 134, helpful: 78, status: 'Published' },
  ]
  await prisma.kBArticle.createMany({ data })
  console.log(`  ✅ ${data.length} KB articles created`)
}

async function seedFinance() {
  console.log('🌱 Seeding Finance Module...')

  // Ledger Accounts
  const ledgerData = [
    { accountCode: '1001', name: 'Cash in Hand', group: 'Current Assets', type: 'Asset', balance: 250000, status: 'Active' },
    { accountCode: '1002', name: 'SBI Current Account', group: 'Current Assets', type: 'Asset', balance: 18500000, status: 'Active' },
    { accountCode: '1003', name: 'HDFC Current Account', group: 'Current Assets', type: 'Asset', balance: 12300000, status: 'Active' },
    { accountCode: '1004', name: 'Accounts Receivable', group: 'Current Assets', type: 'Asset', balance: 45000000, status: 'Active' },
    { accountCode: '1005', name: 'Inventory - Cement', group: 'Current Assets', type: 'Asset', balance: 950000, status: 'Active' },
    { accountCode: '1006', name: 'Inventory - Steel', group: 'Current Assets', type: 'Asset', balance: 14200000, status: 'Active' },
    { accountCode: '1007', name: 'Fixed Assets - Equipment', group: 'Fixed Assets', type: 'Asset', balance: 85000000, status: 'Active' },
    { accountCode: '1008', name: 'Fixed Assets - Vehicles', group: 'Fixed Assets', type: 'Asset', balance: 22000000, status: 'Active' },
    { accountCode: '2001', name: 'Accounts Payable', group: 'Current Liabilities', type: 'Liability', balance: 28000000, status: 'Active' },
    { accountCode: '2002', name: 'GST Payable', group: 'Current Liabilities', type: 'Liability', balance: 4500000, status: 'Active' },
    { accountCode: '2003', name: 'TDS Payable', group: 'Current Liabilities', type: 'Liability', balance: 1800000, status: 'Active' },
    { accountCode: '2004', name: 'PF Payable', group: 'Current Liabilities', type: 'Liability', balance: 3200000, status: 'Active' },
    { accountCode: '2005', name: 'Bank Loan - SBI', group: 'Long Term Liabilities', type: 'Liability', balance: 120000000, status: 'Active' },
    { accountCode: '3001', name: 'Share Capital', group: 'Equity', type: 'Equity', balance: 500000000, status: 'Active' },
    { accountCode: '3002', name: 'Retained Earnings', group: 'Equity', type: 'Equity', balance: 85000000, status: 'Active' },
    { accountCode: '4001', name: 'Project Revenue', group: 'Income', type: 'Income', balance: 320000000, status: 'Active' },
    { accountCode: '4002', name: 'Sales Revenue', group: 'Income', type: 'Income', balance: 85000000, status: 'Active' },
    { accountCode: '5001', name: 'Employee Cost', group: 'Direct Expenses', type: 'Expense', balance: 65000000, status: 'Active' },
    { accountCode: '5002', name: 'Material Cost', group: 'Direct Expenses', type: 'Expense', balance: 120000000, status: 'Active' },
    { accountCode: '5003', name: 'Equipment Cost', group: 'Direct Expenses', type: 'Expense', balance: 15000000, status: 'Active' },
    { accountCode: '5004', name: 'Subcontractor Cost', group: 'Direct Expenses', type: 'Expense', balance: 45000000, status: 'Active' },
    { accountCode: '5005', name: 'Admin Expenses', group: 'Indirect Expenses', type: 'Expense', balance: 8500000, status: 'Active' },
  ]
  await prisma.ledgerAccount.createMany({ data: ledgerData })
  console.log(`  ✅ ${ledgerData.length} ledger accounts created`)

  // Bank Accounts
  const bankData = [
    { accountName: 'VoltCore Operations', bankName: 'State Bank of India', accountNo: '3826451234', type: 'Current', balance: 18500000, status: 'Active' },
    { accountName: 'VoltCore Salaries', bankName: 'HDFC Bank', accountNo: '501001234567', type: 'Current', balance: 12300000, status: 'Active' },
    { accountName: 'VoltCore Term Deposit', bankName: 'ICICI Bank', accountNo: '021501234567', type: 'Fixed Deposit', balance: 50000000, status: 'Active' },
    { accountName: 'VoltCore Project Fund', bankName: 'Bank of Baroda', accountNo: '412101234567', type: 'Current', balance: 32000000, status: 'Active' },
  ]
  await prisma.bankAccount.createMany({ data: bankData })
  console.log(`  ✅ ${bankData.length} bank accounts created`)

  // Accounts Payable
  const apData = [
    { billNo: 'AP-2025-001', vendor: 'Tata Steel', description: 'TMT Bars supply - May 2025', amount: 4500000, dueDate: '2025-05-30', paidDate: '2025-05-28', status: 'Paid' },
    { billNo: 'AP-2025-002', vendor: 'UltraTech Cement', description: 'Cement supply - May 2025', amount: 2850000, dueDate: '2025-06-10', paidDate: '2025-06-09', status: 'Paid' },
    { billNo: 'AP-2025-003', vendor: 'KEI Industries', description: 'HT Cables for Chennai site', amount: 6200000, dueDate: '2025-06-25', paidDate: null, status: 'Pending' },
    { billNo: 'AP-2025-004', vendor: 'L&T Equipments', description: 'Crane rental - Apr-May 2025', amount: 3800000, dueDate: '2025-06-15', paidDate: null, status: 'Overdue' },
    { billNo: 'AP-2025-005', vendor: 'Havells India', description: 'LED lights for Bangalore site', amount: 1850000, dueDate: '2025-07-05', paidDate: null, status: 'Pending' },
    { billNo: 'AP-2025-006', vendor: 'JCB India', description: 'Excavator maintenance and parts', amount: 750000, dueDate: '2025-06-30', paidDate: null, status: 'Pending' },
    { billNo: 'AP-2025-007', vendor: 'Asian Paints', description: 'Exterior paint for Mumbai site', amount: 2100000, dueDate: '2025-07-10', paidDate: null, status: 'Pending' },
    { billNo: 'AP-2025-008', vendor: 'Finolex Cables', description: 'LT cables for Delhi site', amount: 3400000, dueDate: '2025-05-20', paidDate: null, status: 'Overdue' },
    { billNo: 'AP-2025-009', vendor: 'KEC International', description: 'Transformer supply', amount: 8500000, dueDate: '2025-07-20', paidDate: null, status: 'Pending' },
    { billNo: 'AP-2025-010', vendor: 'Godrej Locks', description: 'Fire rated doors - batch 2', amount: 950000, dueDate: '2025-06-20', paidDate: '2025-06-19', status: 'Paid' },
    { billNo: 'AP-2025-011', vendor: 'Reddy Steel Fabricators', description: 'Steel fabrication for ORR project', amount: 5200000, dueDate: '2025-06-28', paidDate: null, status: 'Pending' },
    { billNo: 'AP-2025-012', vendor: 'Shree Ram Constructions', description: 'Subcontractor work - Mumbai Metro', amount: 15000000, dueDate: '2025-07-15', paidDate: null, status: 'Pending' },
  ]
  await prisma.accountsPayable.createMany({ data: apData })
  console.log(`  ✅ ${apData.length} accounts payable created`)

  // Accounts Receivable
  const arData = [
    { invoiceNo: 'AR-2025-001', client: 'MMRDA', description: 'Running bill RAB-15 - Metro work', amount: 8500000, dueDate: '2025-04-30', receivedDate: '2025-04-25', status: 'Received' },
    { invoiceNo: 'AR-2025-002', client: 'DLF Ltd', description: 'Running bill RAB-22 - Township', amount: 12000000, dueDate: '2025-05-15', receivedDate: '2025-05-12', status: 'Received' },
    { invoiceNo: 'AR-2025-003', client: 'Infosys Ltd', description: 'Running bill RAB-08 - IT Park', amount: 6800000, dueDate: '2025-06-20', receivedDate: null, status: 'Pending' },
    { invoiceNo: 'AR-2025-004', client: 'NHAI', description: 'Running bill RAB-30 - Expressway', amount: 15000000, dueDate: '2025-06-30', receivedDate: null, status: 'Pending' },
    { invoiceNo: 'AR-2025-005', client: 'Chennai Port Trust', description: 'Running bill RAB-12 - Port expansion', amount: 9200000, dueDate: '2025-07-15', receivedDate: null, status: 'Pending' },
    { invoiceNo: 'AR-2025-006', client: 'Gujarat Energy', description: 'Final bill - Solar Farm', amount: 4500000, dueDate: '2025-05-30', receivedDate: '2025-05-30', status: 'Received' },
    { invoiceNo: 'AR-2025-007', client: 'L&T Construction', description: 'Supply bill SO-2025-002', amount: 17000000, dueDate: '2025-06-10', receivedDate: '2025-06-08', status: 'Received' },
    { invoiceNo: 'AR-2025-008', client: 'MIDC', description: 'Advance payment - Industrial Complex', amount: 5000000, dueDate: '2025-07-30', receivedDate: null, status: 'Pending' },
    { invoiceNo: 'AR-2025-009', client: 'MMRDA', description: 'Running bill RAB-16 - Metro work', amount: 9800000, dueDate: '2025-05-31', receivedDate: null, status: 'Pending' },
    { invoiceNo: 'AR-2025-010', client: 'DLF Ltd', description: 'Running bill RAB-23 - Township', amount: 13500000, dueDate: '2025-07-10', receivedDate: null, status: 'Pending' },
    { invoiceNo: 'AR-2025-011', client: 'NHAI', description: 'Running bill RAB-31 - Expressway', amount: 11000000, dueDate: '2025-05-15', receivedDate: null, status: 'Pending' },
    { invoiceNo: 'AR-2025-012', client: 'L&T Construction', description: 'Supply bill SO-2025-004', amount: 7500000, dueDate: '2025-07-25', receivedDate: null, status: 'Pending' },
  ]
  await prisma.accountsReceivable.createMany({ data: arData })
  console.log(`  ✅ ${arData.length} accounts receivable created`)

  // Journal Entries
  const jeData = [
    { entryNo: 'JE-2025-001', date: '2025-01-31', account: 'Employee Cost', debit: 10800000, credit: 0, description: 'Monthly payroll provision', reference: 'PAY-2025-01' },
    { entryNo: 'JE-2025-002', date: '2025-01-31', account: 'SBI Current Account', debit: 0, credit: 10800000, description: 'Salary disbursement', reference: 'PAY-2025-01' },
    { entryNo: 'JE-2025-003', date: '2025-02-10', account: 'Inventory - Steel', debit: 4500000, credit: 0, description: 'TMT Steel purchase', reference: 'PO-2025-0015' },
    { entryNo: 'JE-2025-004', date: '2025-02-10', account: 'Accounts Payable', debit: 0, credit: 4500000, description: 'Tata Steel creditor', reference: 'AP-2025-001' },
    { entryNo: 'JE-2025-005', date: '2025-02-28', account: 'Accounts Receivable', debit: 8500000, credit: 0, description: 'MMRDA running bill', reference: 'AR-2025-001' },
    { entryNo: 'JE-2025-006', date: '2025-02-28', account: 'Project Revenue', debit: 0, credit: 8500000, description: 'Metro project revenue recognition', reference: 'INV-2025-0015' },
    { entryNo: 'JE-2025-007', date: '2025-03-15', account: 'Material Cost', debit: 12000000, credit: 0, description: 'Cement & aggregate consumption', reference: 'CM-2025-03' },
    { entryNo: 'JE-2025-008', date: '2025-03-15', account: 'Inventory - Cement', debit: 0, credit: 4800000, description: 'Cement issued to sites', reference: 'CM-2025-03' },
    { entryNo: 'JE-2025-009', date: '2025-03-15', account: 'Inventory - Steel', debit: 0, credit: 7200000, description: 'Steel issued to sites', reference: 'CM-2025-03' },
    { entryNo: 'JE-2025-010', date: '2025-03-31', account: 'Equipment Cost', debit: 2500000, credit: 0, description: 'Crane rental expense', reference: 'PO-2025-0018' },
    { entryNo: 'JE-2025-011', date: '2025-03-31', account: 'Accounts Payable', debit: 0, credit: 2500000, description: 'L&T Equipment creditor', reference: 'AP-2025-004' },
    { entryNo: 'JE-2025-012', date: '2025-04-10', account: 'GST Payable', debit: 1500000, credit: 0, description: 'GST payment to government', reference: 'GST-2025-Q1' },
    { entryNo: 'JE-2025-013', date: '2025-04-10', account: 'SBI Current Account', debit: 0, credit: 1500000, description: 'GST payment via bank', reference: 'GST-2025-Q1' },
    { entryNo: 'JE-2025-014', date: '2025-04-30', account: 'Accounts Receivable', debit: 12000000, credit: 0, description: 'DLF running bill', reference: 'AR-2025-002' },
    { entryNo: 'JE-2025-015', date: '2025-04-30', account: 'Project Revenue', debit: 0, credit: 12000000, description: 'Township revenue recognition', reference: 'INV-2025-0002' },
    { entryNo: 'JE-2025-016', date: '2025-05-15', account: 'Subcontractor Cost', debit: 5000000, credit: 0, description: 'Shree Ram Constructions work', reference: 'SO-2025-003' },
    { entryNo: 'JE-2025-017', date: '2025-05-15', account: 'Accounts Payable', debit: 0, credit: 5000000, description: 'Subcontractor payable', reference: 'AP-2025-012' },
    { entryNo: 'JE-2025-018', date: '2025-05-20', account: 'TDS Payable', debit: 850000, credit: 0, description: 'TDS deducted on vendor payments', reference: 'TDS-2025-05' },
    { entryNo: 'JE-2025-019', date: '2025-05-20', account: 'Accounts Payable', debit: 0, credit: 850000, description: 'TDS liability offset', reference: 'TDS-2025-05' },
    { entryNo: 'JE-2025-020', date: '2025-05-31', account: 'Admin Expenses', debit: 1200000, credit: 0, description: 'Office rent and utilities', reference: 'ADM-2025-05' },
    { entryNo: 'JE-2025-021', date: '2025-05-31', account: 'SBI Current Account', debit: 0, credit: 1200000, description: 'Office expenses paid', reference: 'ADM-2025-05' },
    { entryNo: 'JE-2025-022', date: '2025-06-05', account: 'Inventory - Cement', debit: 2850000, credit: 0, description: 'Cement purchase from UltraTech', reference: 'PO-2025-0002' },
    { entryNo: 'JE-2025-023', date: '2025-06-05', account: 'Accounts Payable', debit: 0, credit: 2850000, description: 'UltraTech creditor', reference: 'AP-2025-002' },
    { entryNo: 'JE-2025-024', date: '2025-06-15', account: 'Sales Revenue', debit: 0, credit: 22500000, description: 'L&T pre-cast girders delivery', reference: 'SO-2025-001' },
    { entryNo: 'JE-2025-025', date: '2025-06-15', account: 'Accounts Receivable', debit: 22500000, credit: 0, description: 'L&T receivable for girders', reference: 'AR-2025-007' },
  ]
  await prisma.journalEntry.createMany({ data: jeData })
  console.log(`  ✅ ${jeData.length} journal entries created`)

  // Tax Records
  const taxData = [
    { taxType: 'GST (CGST+SGST)', period: '2025-Q1 (Jan-Mar)', amount: 4500000, dueDate: '2025-04-20', paidDate: '2025-04-18', status: 'Paid' },
    { taxType: 'GST (CGST+SGST)', period: '2025-Q2 (Apr-Jun)', amount: 5200000, dueDate: '2025-07-20', paidDate: null, status: 'Pending' },
    { taxType: 'TDS - Salaries', period: '2025-Apr', amount: 850000, dueDate: '2025-05-07', paidDate: '2025-05-06', status: 'Paid' },
    { taxType: 'TDS - Salaries', period: '2025-May', amount: 920000, dueDate: '2025-06-07', paidDate: '2025-06-05', status: 'Paid' },
    { taxType: 'TDS - Contractors', period: '2025-May', amount: 540000, dueDate: '2025-06-07', paidDate: null, status: 'Pending' },
    { taxType: 'TDS - Contractors', period: '2025-Jun', amount: 480000, dueDate: '2025-07-07', paidDate: null, status: 'Pending' },
    { taxType: 'Provident Fund', period: '2025-May', amount: 3200000, dueDate: '2025-06-15', paidDate: '2025-06-14', status: 'Paid' },
    { taxType: 'Provident Fund', period: '2025-Jun', amount: 3350000, dueDate: '2025-07-15', paidDate: null, status: 'Pending' },
    { taxType: 'Professional Tax', period: '2025-Jun', amount: 45000, dueDate: '2025-07-31', paidDate: null, status: 'Pending' },
    { taxType: 'ESI Contribution', period: '2025-May', amount: 280000, dueDate: '2025-06-15', paidDate: '2025-06-14', status: 'Paid' },
  ]
  await prisma.taxRecord.createMany({ data: taxData })
  console.log(`  ✅ ${taxData.length} tax records created`)

  // Budget Items
  const budgetData = [
    { category: 'Employee Cost', description: 'Salaries, wages, benefits across all sites', planned: 78000000, actual: 65000000, period: '2025-26', status: 'On Track' },
    { category: 'Material - Cement', description: 'Cement procurement for all projects', planned: 35000000, actual: 28500000, period: '2025-26', status: 'On Track' },
    { category: 'Material - Steel', description: 'TMT bars, structural steel, fabrication', planned: 130000000, actual: 120000000, period: '2025-26', status: 'On Track' },
    { category: 'Equipment & Machinery', description: 'Rental, maintenance, fuel for equipment', planned: 18000000, actual: 15000000, period: '2025-26', status: 'On Track' },
    { category: 'Subcontractors', description: 'Outsourced works - civil, electrical, plumbing', planned: 55000000, actual: 45000000, period: '2025-26', status: 'On Track' },
    { category: 'Site Overheads', description: 'Power, water, temporary structures, security', planned: 12000000, actual: 14000000, period: '2025-26', status: 'Over Budget' },
    { category: 'Travel & Transport', description: 'Site travel, vehicle maintenance, freight', planned: 5000000, actual: 6200000, period: '2025-26', status: 'Over Budget' },
    { category: 'Admin & Office', description: 'Office rent, utilities, IT, supplies', planned: 10000000, actual: 8500000, period: '2025-26', status: 'On Track' },
    { category: 'Safety & Training', description: 'PPE, training programs, compliance', planned: 3000000, actual: 2200000, period: '2025-26', status: 'On Track' },
    { category: 'Insurance & Legal', description: 'Equipment insurance, professional indemnity', planned: 4500000, actual: 3800000, period: '2025-26', status: 'On Track' },
    { category: 'Quality Control', description: 'Testing labs, third-party inspections', planned: 2500000, actual: 1800000, period: '2025-26', status: 'On Track' },
    { category: 'Contingency', description: 'Unforeseen expenses buffer', planned: 8000000, actual: 4500000, period: '2025-26', status: 'On Track' },
  ]
  await prisma.budgetItem.createMany({ data: budgetData })
  console.log(`  ✅ ${budgetData.length} budget items created`)
}

// ── MAIN ──
async function main() {
  console.log('\n🏗️  VoltCore ERP — Database Seeding')
  console.log('===================================\n')

  // 0. Clear all existing data
  await clearAll()

  // 1. No-dependency tables first
  await seedCompanySettings()
  await seedDepartments()
  await seedDesignations()
  await seedSites()
  await seedProjects()

  // 2. Employees (needed for related tables)
  const empIdMap = await seedEmployees()

  // 3. Dependent on employees
  await seedAttendance(empIdMap)
  await seedLeaveRequests(empIdMap)
  await seedShiftSchedules(empIdMap)
  await seedPayroll(empIdMap)
  await seedExpenses(empIdMap)
  await seedCertifications(empIdMap)

  // 4. Independent modules
  await seedWorkPermits()
  await seedIncidents()
  await seedEquipment()
  await seedSubcontractors()
  await seedJobOpenings()
  await seedTrainingSessions()
  await seedPurchaseOrders()
  await seedInvoices()
  await seedInventory()
  await seedStockMovements()
  await seedCustomers()
  await seedSalesOrders()
  await seedCrmContacts()
  await seedSupportTickets()
  await seedKBArticles()

  // 5. Finance module (large)
  await seedFinance()

  console.log('\n✅ All seed data inserted successfully!')
  console.log('===================================\n')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
