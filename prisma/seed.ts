import { db } from '../src/lib/db';

async function main() {
  // Clear existing data
  await db.expense.deleteMany();
  await db.payroll.deleteMany();
  await db.leaveRequest.deleteMany();
  await db.attendance.deleteMany();
  await db.jobOpening.deleteMany();
  await db.subcontractor.deleteMany();
  await db.invoice.deleteMany();
  await db.purchaseOrder.deleteMany();
  await db.incident.deleteMany();
  await db.workPermit.deleteMany();
  await db.equipment.deleteMany();
  await db.site.deleteMany();
  await db.project.deleteMany();
  await db.employee.deleteMany();

  // Sites
  const sites = await Promise.all([
    db.site.create({ data: { name: 'Singrauli', state: 'Madhya Pradesh', project: 'Bharat STPP Unit-5', manpower: 82, incharge: 'Rajesh Kumar', status: 'Active' } }),
    db.site.create({ data: { name: 'Jaisalmer', state: 'Rajasthan', project: 'Rajasthan Solar Farm', manpower: 64, incharge: 'Anil Sharma', status: 'Active' } }),
    db.site.create({ data: { name: 'Mundra', state: 'Gujarat', project: 'Coastal Gas Turbine', manpower: 47, incharge: 'Meera Nair', status: 'Closing' } }),
    db.site.create({ data: { name: 'Uttarkashi', state: 'Uttarakhand', project: 'Hydro Unit O&M', manpower: 38, incharge: 'Deepak Rawat', status: 'Slow' } }),
    db.site.create({ data: { name: 'Dadri', state: 'Uttar Pradesh', project: 'NTPC Substation', manpower: 55, incharge: 'Vinod Sinha', status: 'Active' } }),
    db.site.create({ data: { name: 'Chennai', state: 'Tamil Nadu', project: 'HO / Mobilisation', manpower: 62, incharge: 'HR Team', status: 'HO' } }),
  ]);

  // Projects
  await Promise.all([
    db.project.create({ data: { code: 'VC-P001', name: 'Bharat STPP Unit-5', client: 'BSEB', type: 'EPC', contractValue: '184Cr', startDate: 'Jan 2022', endDate: 'Dec 2024', progress: 78, people: 82, status: 'On Track', site: 'Singrauli' } }),
    db.project.create({ data: { code: 'VC-P002', name: 'Rajasthan Solar Farm', client: 'SECI', type: 'BoP', contractValue: '124Cr', startDate: 'Sep 2023', endDate: 'Mar 2025', progress: 45, people: 64, status: 'At Risk', site: 'Jaisalmer' } }),
    db.project.create({ data: { code: 'VC-P003', name: 'Coastal Gas Turbine', client: 'GIPCL', type: 'Mech-Elec', contractValue: '98Cr', startDate: 'Jul 2022', endDate: 'Jul 2024', progress: 91, people: 47, status: 'Near Done', site: 'Mundra' } }),
    db.project.create({ data: { code: 'VC-P004', name: 'Hydro Unit O&M', client: 'UJVNL', type: 'O&M', contractValue: '42Cr', startDate: 'Feb 2024', endDate: 'Feb 2026', progress: 22, people: 38, status: 'Delayed', site: 'Uttarkashi' } }),
    db.project.create({ data: { code: 'VC-P005', name: 'NTPC Substation', client: 'NTPC', type: 'EPC', contractValue: '67Cr', startDate: 'May 2023', endDate: 'Nov 2024', progress: 60, people: 55, status: 'On Track', site: 'Dadri' } }),
  ]);

  // Employees
  const employees = await Promise.all([
    db.employee.create({ data: { empId: 'VC-0124', name: 'Amit Singh', email: 'amit.s@voltcore.in', trade: 'Electrical', role: 'Sr. Electrical Engineer', site: 'Singrauli', type: 'Staff', status: 'Active', joiningDate: '12 Jan 2021', certifications: 'CPRI,HV Safety' } }),
    db.employee.create({ data: { empId: 'VC-0187', name: 'Priya Krishnan', email: 'priya.k@voltcore.in', trade: 'Instrumentation', role: 'Instrumentation Tech', site: 'Mundra', type: 'Staff', status: 'Active', joiningDate: '05 Mar 2022', certifications: 'CSWIP' } }),
    db.employee.create({ data: { empId: 'VC-C041', name: 'Ramesh Mehta', trade: 'Welding', role: 'Boilermaker / Welder', site: 'Singrauli', type: 'Contract', status: 'Active', joiningDate: '10 Apr 2024', certifications: 'ASME IX,3G/4G' } }),
    db.employee.create({ data: { empId: 'VC-0098', name: 'Suresh Kumar', email: 'suresh.k@voltcore.in', trade: 'Civil', role: 'Civil Supervisor', site: 'Jaisalmer', type: 'Staff', status: 'On Leave', joiningDate: '22 Jun 2019', certifications: 'OSHA 30' } }),
    db.employee.create({ data: { empId: 'VC-C055', name: 'Dinesh Verma', trade: 'Rigging', role: 'Rigger / Helper', site: 'Uttarkashi', type: 'Contract', status: 'Terminated', joiningDate: '01 May 2024', certifications: '' } }),
    db.employee.create({ data: { empId: 'VC-0201', name: 'Nikhil Joshi', email: 'nikhil.j@voltcore.in', trade: 'Electrical', role: 'Electrical Engineer', site: 'Dadri', type: 'Staff', status: 'Active', joiningDate: '14 Aug 2023', certifications: 'CPRI,LV Safety' } }),
    db.employee.create({ data: { empId: 'VC-0089', name: 'Nalini Patel', email: 'nalini.p@voltcore.in', trade: 'Administration', role: 'HR Executive', site: 'Mundra', type: 'Staff', status: 'Active', joiningDate: '03 Feb 2020', certifications: '' } }),
    db.employee.create({ data: { empId: 'VC-C062', name: 'Arjun Tiwari', trade: 'Electrical', role: 'Electrician', site: 'Singrauli', type: 'Contract', status: 'Active', joiningDate: '18 Jan 2024', certifications: 'ITI Electrician' } }),
    db.employee.create({ data: { empId: 'VC-0156', name: 'Kavita Sharma', email: 'kavita.s@voltcore.in', trade: 'Safety', role: 'Safety Officer', site: 'Singrauli', type: 'Staff', status: 'Active', joiningDate: '11 Jul 2021', certifications: 'NEBOSH,OSHA 30' } }),
    db.employee.create({ data: { empId: 'VC-0302', name: 'Rahul Deshmukh', email: 'rahul.d@voltcore.in', trade: 'Mechanical', role: 'Mechanical Supervisor', site: 'Mundra', type: 'Staff', status: 'Active', joiningDate: '20 Sep 2022', certifications: 'BE Mech' } }),
  ]);

  // Attendance for today
  const today = new Date().toISOString().split('T')[0];
  const todayShort = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  await Promise.all([
    db.attendance.create({ data: { empId: employees[0].id, site: 'Singrauli', date: today, timeIn: '07:02', timeOut: '19:15', otHours: 2.2, shift: 'Day A', status: 'Present' } }),
    db.attendance.create({ data: { empId: employees[1].id, site: 'Mundra', date: today, timeIn: '06:58', timeOut: '15:10', otHours: 0, shift: 'Day A', status: 'Present' } }),
    db.attendance.create({ data: { empId: employees[2].id, site: 'Singrauli', date: today, timeIn: '08:32', timeOut: '20:00', otHours: 3.0, shift: 'Day A', status: 'Late' } }),
    db.attendance.create({ data: { empId: employees[3].id, site: 'Jaisalmer', date: today, status: 'On Leave', shift: '' } }),
    db.attendance.create({ data: { empId: employees[5].id, site: 'Dadri', date: today, timeIn: '19:05', otHours: 0, shift: 'Night B', status: 'Present' } }),
    db.attendance.create({ data: { empId: employees[6].id, site: 'Mundra', date: today, timeIn: '09:00', timeOut: '18:00', otHours: 0, shift: 'General', status: 'Present' } }),
    db.attendance.create({ data: { empId: employees[7].id, site: 'Singrauli', date: today, timeIn: '06:45', timeOut: '18:30', otHours: 1.5, shift: 'Day A', status: 'Present' } }),
    db.attendance.create({ data: { empId: employees[8].id, site: 'Singrauli', date: today, timeIn: '06:30', timeOut: '18:00', otHours: 0, shift: 'Day A', status: 'Present' } }),
    db.attendance.create({ data: { empId: employees[9].id, site: 'Mundra', date: today, timeIn: '07:15', timeOut: '19:00', otHours: 1.0, shift: 'Day A', status: 'Present' } }),
  ]);

  // Leave Requests
  await Promise.all([
    db.leaveRequest.create({ data: { empId: employees[0].id, site: 'Singrauli', type: 'EL', fromDate: '22 Jun', toDate: '26 Jun', days: 5, reason: 'Family function', status: 'Pending', appliedDate: '16 Jun' } }),
    db.leaveRequest.create({ data: { empId: employees[2].id, site: 'Singrauli', type: 'SL', fromDate: '19 Jun', toDate: '20 Jun', days: 2, reason: 'Medical', status: 'Pending', appliedDate: '18 Jun' } }),
    db.leaveRequest.create({ data: { empId: employees[6].id, site: 'Mundra', type: 'ML', fromDate: '01 Jul', toDate: '31 Aug', days: 62, reason: 'Maternity', status: 'Pending', appliedDate: '14 Jun' } }),
    db.leaveRequest.create({ data: { empId: employees[5].id, site: 'Dadri', type: 'EL', fromDate: '25 Jun', toDate: '27 Jun', days: 3, reason: 'Personal', status: 'Pending', appliedDate: '17 Jun' } }),
    db.leaveRequest.create({ data: { empId: employees[7].id, site: 'Singrauli', type: 'CL', fromDate: '21 Jun', toDate: '21 Jun', days: 1, reason: 'Personal work', status: 'Pending', appliedDate: '18 Jun' } }),
  ]);

  // Payroll
  await Promise.all([
    db.payroll.create({ data: { empId: employees[0].id, month: 'Jun 2024', days: 26, basic: 65000, hra: 26000, ot: 8400, gross: 111400, pf: 7800, esi: 833, tds: 4525, netPay: 98242, status: 'Processed' } }),
    db.payroll.create({ data: { empId: employees[1].id, month: 'Jun 2024', days: 27, basic: 45000, hra: 18000, ot: 0, gross: 71000, pf: 5400, esi: 533, tds: 2311, netPay: 62756, status: 'Processed' } }),
    db.payroll.create({ data: { empId: employees[2].id, month: 'Jun 2024', days: 24, basic: 22000, hra: 8800, ot: 4200, gross: 39400, pf: 2640, esi: 296, tds: 1378, netPay: 35086, status: 'Pending' } }),
  ]);

  // Work Permits
  await Promise.all([
    db.workPermit.create({ data: { permitNo: 'PTW-089', type: 'Hot Work', location: 'Singrauli U5 — Boiler', issuedTo: 'Ramesh M.', expiry: '18-Jun 23:00', status: 'Expiring' } }),
    db.workPermit.create({ data: { permitNo: 'PTW-090', type: 'LOTO', location: 'Mundra GT-2 MCC', issuedTo: 'Priya K.', expiry: '20-Jun 18:00', status: 'Active' } }),
    db.workPermit.create({ data: { permitNo: 'PTW-091', type: 'Height Work', location: 'Jaisalmer Module', issuedTo: 'Team B', expiry: '19-Jun 16:00', status: 'Active' } }),
    db.workPermit.create({ data: { permitNo: 'PTW-092', type: 'Confined Space', location: 'Dadri Sub — Tank', issuedTo: 'Nikhil J.', expiry: '19-Jun 08:00', status: 'Watch' } }),
  ]);

  // Incidents
  await Promise.all([
    db.incident.create({ data: { refNo: 'INC-024', date: '17 Jun', site: 'Singrauli', type: 'Near Miss', severity: 'High', person: 'Ramesh M.', status: 'Investigating' } }),
    db.incident.create({ data: { refNo: 'INC-023', date: '12 Jun', site: 'Mundra', type: 'First Aid', severity: 'Medium', person: 'Contractor', status: 'Closed' } }),
    db.incident.create({ data: { refNo: 'INC-022', date: '04 Jun', site: 'Dadri', type: 'Near Miss', severity: 'Low', person: 'Suresh K.', status: 'Closed' } }),
    db.incident.create({ data: { refNo: 'INC-021', date: '28 May', site: 'Jaisalmer', type: 'Property Damage', severity: 'High', person: 'Team C', status: 'Closed' } }),
  ]);

  // Equipment
  await Promise.all([
    db.equipment.create({ data: { name: '50T Mobile Crane', eqId: 'EQ-CR-001', site: 'Singrauli', status: 'Operational', lastPM: '02 Jun 2024', nextPM: '25 Jun 2024', assignedTo: 'Crane Team', utilization: 82 } }),
    db.equipment.create({ data: { name: 'DG Set 500KVA', eqId: 'EQ-DG-004', site: 'Mundra', status: 'Maintenance', issue: 'Coolant Leak', downSince: '15 Jun', etaRepair: '20 Jun', utilization: 35 } }),
    db.equipment.create({ data: { name: 'Welding Set ESAB', eqId: 'EQ-WS-012', site: 'Singrauli', status: 'Operational', nextPM: '30 Jul 2024', assignedTo: 'Ramesh M.', utilization: 94 } }),
    db.equipment.create({ data: { name: 'Tower Crane 10T', eqId: 'EQ-CR-002', site: 'Jaisalmer', status: 'Operational', lastPM: '05 Jun 2024', nextPM: '05 Jul 2024', utilization: 71 } }),
    db.equipment.create({ data: { name: 'Concrete Mixer 7.5Cu', eqId: 'EQ-CM-003', site: 'Singrauli', status: 'Operational', lastPM: '10 Jun 2024', nextPM: '10 Jul 2024', utilization: 68 } }),
    db.equipment.create({ data: { name: 'Earth Mover JCB', eqId: 'EQ-EM-001', site: 'Uttarkashi', status: 'Maintenance', issue: 'Hydraulic Leak', downSince: '14 Jun', etaRepair: '22 Jun', utilization: 20 } }),
  ]);

  // Expenses
  await Promise.all([
    db.expense.create({ data: { claimNo: 'EXP-0841', empId: employees[0].id, category: 'Travel & Accommodation', amount: 24800, project: 'VC-P001', date: '15 Jun', status: 'Pending' } }),
    db.expense.create({ data: { claimNo: 'EXP-0840', empId: employees[1].id, category: 'Tools & Consumables', amount: 6400, project: 'VC-P003', date: '14 Jun', status: 'Approved' } }),
    db.expense.create({ data: { claimNo: 'EXP-0839', empId: employees[2].id, category: 'Medical', amount: 3200, project: 'VC-P001', date: '12 Jun', status: 'Rejected' } }),
  ]);

  // Purchase Orders
  await Promise.all([
    db.purchaseOrder.create({ data: { poNo: 'PO-0441', vendor: 'L&T Electricals', item: 'HT Cable 11kV — 500m', amount: 820000, project: 'VC-P001', delivery: '25 Jun', grn: 'Awaited', status: 'Open' } }),
    db.purchaseOrder.create({ data: { poNo: 'PO-0440', vendor: 'Esab India', item: 'Welding Electrodes E7018', amount: 140000, project: 'VC-P001', delivery: '20 Jun', grn: 'Received', status: 'Closed' } }),
    db.purchaseOrder.create({ data: { poNo: 'PO-0439', vendor: 'ABB India', item: 'VFD Drive 75kW', amount: 460000, project: 'VC-P003', delivery: '10 Jun', grn: 'Partial', status: 'Pending' } }),
  ]);

  // Invoices
  await Promise.all([
    db.invoice.create({ data: { invNo: 'INV-0121', client: 'BSEB', project: 'Bharat STPP Unit-5', amount: '18.4 Cr', date: '01 Jun', dueDate: '30 Jun', status: 'Under Review' } }),
    db.invoice.create({ data: { invNo: 'INV-0120', client: 'GIPCL', project: 'Coastal Gas Turbine', amount: '9.2 Cr', date: '15 May', dueDate: '14 Jun', status: 'Paid' } }),
    db.invoice.create({ data: { invNo: 'INV-0119', client: 'SECI', project: 'Rajasthan Solar', amount: '6.1 Cr', date: '01 May', dueDate: '31 May', status: 'Overdue' } }),
  ]);

  // Subcontractors
  await Promise.all([
    db.subcontractor.create({ data: { name: 'Shree Balaji Contractors', trade: 'Civil & Structural', workers: 48, site: 'Singrauli', pfReg: 'Done', esiReg: 'Done', labourLic: 'Valid', compliance: 'Compliant' } }),
    db.subcontractor.create({ data: { name: 'Arjun Electricals Pvt Ltd', trade: 'Electrical Erection', workers: 32, site: 'Mundra', pfReg: 'Done', esiReg: 'Done', labourLic: 'Valid', compliance: 'Compliant' } }),
    db.subcontractor.create({ data: { name: 'Sai Welding Works', trade: 'Welding & Fabrication', workers: 28, site: 'Singrauli', pfReg: 'Missing', esiReg: 'Done', labourLic: 'Expired', compliance: 'Non-Compliant' } }),
  ]);

  // Job Openings
  await Promise.all([
    db.jobOpening.create({ data: { position: 'Sr. Electrical Engineer', site: 'Singrauli', openings: 2, applications: 18, priority: 'Urgent', status: 'Open' } }),
    db.jobOpening.create({ data: { position: 'Boilermaker (3G/4G)', site: 'Singrauli', openings: 5, applications: 32, priority: 'High', status: 'Open' } }),
    db.jobOpening.create({ data: { position: 'Instrumentation Tech', site: 'Mundra', openings: 3, applications: 14, priority: 'Medium', status: 'Open' } }),
    db.jobOpening.create({ data: { position: 'Safety Officer', site: 'Jaisalmer', openings: 1, applications: 9, priority: 'High', status: 'Shortlisting' } }),
  ]);

  console.log('Seed completed successfully!');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
