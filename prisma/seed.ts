import { db } from "../src/lib/db";

async function main() {
  console.log("🌱 Seeding database with Indian power plant contractor data...");

  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentYear = now.getFullYear();

  // ============================================================
  // 1. DELETE ALL RECORDS IN DEPENDENCY ORDER (reverse creation)
  // ============================================================
  console.log("🗑️  Deleting existing records...");

  await db.attendance.deleteMany();
  await db.leaveRequest.deleteMany();
  await db.payroll.deleteMany();
  await db.expense.deleteMany();
  await db.shiftSchedule.deleteMany();
  await db.certification.deleteMany();
  await db.trainingSession.deleteMany();
  await db.jobOpening.deleteMany();
  await db.subcontractor.deleteMany();
  await db.invoice.deleteMany();
  await db.purchaseOrder.deleteMany();
  await db.equipment.deleteMany();
  await db.incident.deleteMany();
  await db.workPermit.deleteMany();
  await db.employee.deleteMany();
  await db.site.deleteMany();
  await db.project.deleteMany();
  await db.department.deleteMany();
  await db.designation.deleteMany();
  await db.inventoryItem.deleteMany();
  await db.stockMovement.deleteMany();
  await db.customer.deleteMany();
  await db.salesOrder.deleteMany();
  await db.crmContact.deleteMany();
  await db.supportTicket.deleteMany();
  await db.kBArticle.deleteMany();
  await db.companySettings.deleteMany();
  await db.journalEntry.deleteMany();
  await db.taxRecord.deleteMany();
  await db.budgetItem.deleteMany();
  await db.bankAccount.deleteMany();
  await db.accountsReceivable.deleteMany();
  await db.accountsPayable.deleteMany();
  await db.ledgerAccount.deleteMany();

  console.log("✅ All existing records deleted.");

  // ============================================================
  // 2. CREATE COMPANY SETTINGS (8 entries)
  // ============================================================
  console.log("⚙️  Creating CompanySettings...");

  await db.companySettings.createMany({
    data: [
      { key: "company_name", value: "Shakti Engineering & Construction Pvt. Ltd.", label: "Company Name" },
      { key: "pan", value: "AAECS5678K", label: "PAN Number" },
      { key: "gst", value: "27AAECS5678K1Z5", label: "GST Registration Number" },
      { key: "pf_reg", value: "PFBOM0012345000", label: "PF Registration Number" },
      { key: "esi_reg", value: "31000123456789", label: "ESI Registration Number" },
      { key: "address", value: "Plot No. 42, MIDC Industrial Area, Andheri East, Mumbai - 400093, Maharashtra", label: "Registered Office Address" },
      { key: "el_balance", value: "15", label: "Earned Leave Balance (days)" },
      { key: "sl_balance", value: "7", label: "Sick Leave Balance (days)" },
      { key: "cl_balance", value: "12", label: "Casual Leave Balance (days)" },
      { key: "ml_balance", value: "180", label: "Maternity Leave Balance (days)" },
    ],
  });

  console.log("✅ CompanySettings created.");

  // ============================================================
  // 3. CREATE 6 SITES (Indian power plant locations)
  // ============================================================
  console.log("🏗️  Creating Sites...");

  const sites = await db.site.createMany({
    data: [
      { name: "Singrauli Super Thermal Power Plant", state: "Madhya Pradesh", project: "NTPC-SGR-EPC", manpower: 145, incharge: "Rajesh Kumar Singh", status: "Active" },
      { name: "Jaisalmer Solar Park", state: "Rajasthan", project: "SECI-JSM-SOLAR", manpower: 78, incharge: "Vikram Mehta", status: "Active" },
      { name: "Mundra Ultra Mega Power Plant", state: "Gujarat", project: "GIPCL-MUN-BOP", manpower: 210, incharge: "Arun Patel", status: "Active" },
      { name: "Uttarkashi Hydro Electric Project", state: "Uttarakhand", project: "UJVNL-UKH-HYDRO", manpower: 92, incharge: "Deepak Rawat", status: "Active" },
      { name: "Dadri Gas Power Station", state: "Uttar Pradesh", project: "NTPC-DDR-GAS", manpower: 168, incharge: "Suresh Yadav", status: "Active" },
      { name: "Chennai Thermal Power Station", state: "Tamil Nadu", project: "BSEB-CHN-EPC", manpower: 55, incharge: "Karthik Rajan", status: "Active" },
    ],
  });

  console.log("✅ Sites created.");

  // ============================================================
  // 4. CREATE 5 PROJECTS
  // ============================================================
  console.log("📋 Creating Projects...");

  await db.project.createMany({
    data: [
      {
        code: "NTPC-SGR-EPC",
        name: "NTPC Singrauli Unit-5 Boiler EPC",
        client: "NTPC Limited",
        type: "EPC",
        contractValue: "₹487,50,00,000",
        startDate: "2024-03-01",
        endDate: "2027-02-28",
        progress: 34,
        people: 145,
        status: "On Track",
        site: "Singrauli Super Thermal Power Plant",
      },
      {
        code: "SECI-JSM-SOLAR",
        name: "SECI Jaisalmer 500MW Solar Park O&M",
        client: "Solar Energy Corporation of India",
        type: "O&M",
        contractValue: "₹125,00,00,000",
        startDate: "2023-06-15",
        endDate: "2028-06-14",
        progress: 52,
        people: 78,
        status: "On Track",
        site: "Jaisalmer Solar Park",
      },
      {
        code: "GIPCL-MUN-BOP",
        name: "GIPCL Mundra 2x660MW BoP Package",
        client: "Gujarat Industries Power Company Ltd.",
        type: "BoP",
        contractValue: "₹218,75,00,000",
        startDate: "2024-01-10",
        endDate: "2026-12-31",
        progress: 18,
        people: 210,
        status: "Delayed",
        site: "Mundra Ultra Mega Power Plant",
      },
      {
        code: "UJVNL-UKH-HYDRO",
        name: "UJVNL Uttarkashi 120MW Hydro EPC",
        client: "Uttarakhand Jal Vidyut Nigam Ltd.",
        type: "EPC",
        contractValue: "₹340,00,00,000",
        startDate: "2023-09-01",
        endDate: "2027-08-31",
        progress: 41,
        people: 92,
        status: "On Track",
        site: "Uttarkashi Hydro Electric Project",
      },
      {
        code: "BSEB-CHN-EPC",
        name: "BSEB Chennai Unit-3 TG Island EPC",
        client: "Bihar State Electricity Board",
        type: "EPC",
        contractValue: "₹95,60,00,000",
        startDate: "2024-07-01",
        endDate: "2026-06-30",
        progress: 8,
        people: 55,
        status: "On Track",
        site: "Chennai Thermal Power Station",
      },
    ],
  });

  console.log("✅ Projects created.");

  // ============================================================
  // 5. CREATE 15 EMPLOYEES
  // ============================================================
  console.log("👷 Creating Employees...");

  const employeeData = [
    { empId: "EMP-001", name: "Rajesh Kumar Singh", email: "rajesh.singh@shaktiengg.in", phone: "9425012345", trade: "Administration", role: "Project Manager", site: "Singrauli Super Thermal Power Plant", type: "Staff", status: "Active", joiningDate: "2021-03-15", certifications: "PMP, NEBOSH IG" },
    { empId: "EMP-002", name: "Amit Sharma", email: "amit.sharma@shaktiengg.in", phone: "9425012346", trade: "Electrical", role: "Site Engineer", site: "Singrauli Super Thermal Power Plant", type: "Staff", status: "Active", joiningDate: "2022-07-01", certifications: "CPRI Certified" },
    { empId: "EMP-003", name: "Sunil Kumar Yadav", email: "sunil.yadav@shaktiengg.in", phone: "9425012347", trade: "Mechanical", role: "Supervisor", site: "Singrauli Super Thermal Power Plant", type: "Staff", status: "Active", joiningDate: "2020-11-20", certifications: "CSWIP 3.1" },
    { empId: "EMP-004", name: "Mohammed Irfan", email: "irfan.m@shaktiengg.in", phone: "9425012348", trade: "Welding", role: "Foreman", site: "Singrauli Super Thermal Power Plant", type: "Contract", status: "Active", joiningDate: "2023-01-10", certifications: "ASME IX, CSWIP 3.2" },
    { empId: "EMP-005", name: "Vikram Mehta", email: "vikram.mehta@shaktiengg.in", phone: "9414012345", trade: "Electrical", role: "Project Manager", site: "Jaisalmer Solar Park", type: "Staff", status: "Active", joiningDate: "2020-06-01", certifications: "PMP, CPRI" },
    { empId: "EMP-006", name: "Ramesh Chandra", email: "ramesh.c@shaktiengg.in", phone: "9414012346", trade: "Instrumentation", role: "Technician", site: "Jaisalmer Solar Park", type: "Contract", status: "Active", joiningDate: "2023-04-15", certifications: "DCS Certified" },
    { empId: "EMP-007", name: "Arun Patel", email: "arun.patel@shaktiengg.in", phone: "9427312345", trade: "Civil", role: "Site Engineer", site: "Mundra Ultra Mega Power Plant", type: "Staff", status: "Active", joiningDate: "2022-01-20", certifications: "NEBOSH IG" },
    { empId: "EMP-008", name: "Deepak Rawat", email: "deepak.rawat@shaktiengg.in", phone: "9410112345", trade: "Safety", role: "Safety Officer", site: "Uttarkashi Hydro Electric Project", type: "Staff", status: "Active", joiningDate: "2021-09-01", certifications: "NEBOSH IGC, OSHA 30" },
    { empId: "EMP-009", name: "Prakash Tiwari", email: "prakash.tiwari@shaktiengg.in", phone: "9837012345", trade: "Mechanical", role: "Supervisor", site: "Dadri Gas Power Station", type: "Staff", status: "Active", joiningDate: "2022-05-10", certifications: "CSWIP 3.1, ASME IX" },
    { empId: "EMP-010", name: "Suresh Verma", email: "suresh.verma@shaktiengg.in", phone: "9837012346", trade: "Rigging", role: "Foreman", site: "Dadri Gas Power Station", type: "Contract", status: "Active", joiningDate: "2023-02-28", certifications: "Crane Operator License" },
    { empId: "EMP-011", name: "Karthik Rajan", email: "karthik.rajan@shaktiengg.in", phone: "9789012345", trade: "Administration", role: "Site Incharge", site: "Chennai Thermal Power Station", type: "Staff", status: "Active", joiningDate: "2021-01-15", certifications: "PMP" },
    { empId: "EMP-012", name: "Manoj Kumar Gupta", email: "manoj.gupta@shaktiengg.in", phone: "9425012350", trade: "Welding", role: "Welder", site: "Mundra Ultra Mega Power Plant", type: "Contract", status: "Active", joiningDate: "2023-06-01", certifications: "ASME IX" },
    { empId: "EMP-013", name: "Santosh Kumar Mishra", email: "santosh.m@shaktiengg.in", phone: "9425012351", trade: "Mechanical", role: "Fitter", site: "Singrauli Super Thermal Power Plant", type: "Contract", status: "On Leave", joiningDate: "2022-08-15", certifications: "" },
    { empId: "EMP-014", name: "Anil Kumar Pandey", email: "anil.pandey@shaktiengg.in", phone: "9425012352", trade: "Civil", role: "Mason", site: "Uttarkashi Hydro Electric Project", type: "Contract", status: "Terminated", joiningDate: "2023-03-10", certifications: "" },
    { empId: "EMP-015", name: "Priya Nair", email: "priya.nair@shaktiengg.in", phone: "9789012346", trade: "Administration", role: "HR Executive", site: "Chennai Thermal Power Station", type: "Staff", status: "Active", joiningDate: "2022-11-01", certifications: "" },
  ];

  const employees = await db.employee.createMany({ data: employeeData });
  console.log("✅ Employees created.");

  // Fetch created employees for FK references
  const allEmployees = await db.employee.findMany();
  const empMap: Record<string, string> = {};
  allEmployees.forEach((e) => {
    empMap[e.empId] = e.id;
  });

  const activeEmployees = allEmployees.filter(
    (e) => e.status === "Active"
  );
  const onLeaveEmployees = allEmployees.filter(
    (e) => e.status === "On Leave"
  );

  // ============================================================
  // 6. CREATE ATTENDANCE FOR TODAY (active + on leave employees)
  // ============================================================
  console.log("📝 Creating Attendance records for today...");

  const attendanceData: Array<{
    empId: string;
    site: string;
    date: string;
    timeIn: string | null;
    timeOut: string | null;
    otHours: number;
    shift: string | null;
    status: string;
  }> = [];

  // Active employees - mix of Present and Late
  const presentStatuses = ["Present", "Present", "Present", "Present", "Present", "Present", "Present", "Present", "Late", "Late"];
  activeEmployees.forEach((emp, idx) => {
    const status = presentStatuses[idx % presentStatuses.length];
    if (status === "Late") {
      attendanceData.push({
        empId: emp.id,
        site: emp.site,
        date: today,
        timeIn: "09:45",
        timeOut: null,
        otHours: 0,
        shift: "Day A",
        status: "Late",
      });
    } else {
      attendanceData.push({
        empId: emp.id,
        site: emp.site,
        date: today,
        timeIn: "08:00",
        timeOut: null,
        otHours: 0,
        shift: "Day A",
        status: "Present",
      });
    }
  });

  // On Leave employees
  onLeaveEmployees.forEach((emp) => {
    attendanceData.push({
      empId: emp.id,
      site: emp.site,
      date: today,
      timeIn: null,
      timeOut: null,
      otHours: 0,
      shift: null,
      status: "On Leave",
    });
  });

  await db.attendance.createMany({ data: attendanceData });
  console.log("✅ Attendance records created.");

  // ============================================================
  // 7. CREATE 6 LEAVE REQUESTS
  // ============================================================
  console.log("📨 Creating Leave Requests...");

  await db.leaveRequest.createMany({
    data: [
      {
        empId: empMap["EMP-001"],
        site: "Singrauli Super Thermal Power Plant",
        type: "CL",
        fromDate: `${currentYear}-07-10`,
        toDate: `${currentYear}-07-11`,
        days: 2,
        reason: "Personal work - daughter's school admission",
        status: "Approved",
        appliedDate: `${currentYear}-07-01`,
      },
      {
        empId: empMap["EMP-005"],
        site: "Jaisalmer Solar Park",
        type: "EL",
        fromDate: `${currentYear}-08-05`,
        toDate: `${currentYear}-08-12`,
        days: 6,
        reason: "Family vacation to Goa",
        status: "Pending",
        appliedDate: `${currentYear}-07-20`,
      },
      {
        empId: empMap["EMP-008"],
        site: "Uttarkashi Hydro Electric Project",
        type: "SL",
        fromDate: today,
        toDate: today,
        days: 1,
        reason: "Fever and body ache",
        status: "Approved",
        appliedDate: `${currentYear}-07-15`,
      },
      {
        empId: empMap["EMP-003"],
        site: "Singrauli Super Thermal Power Plant",
        type: "CL",
        fromDate: `${currentYear}-07-22`,
        toDate: `${currentYear}-07-23`,
        days: 2,
        reason: "Attend cousin's wedding in Lucknow",
        status: "Pending",
        appliedDate: `${currentYear}-07-10`,
      },
      {
        empId: empMap["EMP-011"],
        site: "Chennai Thermal Power Station",
        type: "ML",
        fromDate: `${currentYear}-06-01`,
        toDate: `${currentYear}-11-27`,
        days: 180,
        reason: "Maternity leave as per Maternity Benefit Act 1961",
        status: "Approved",
        appliedDate: `${currentYear}-05-01`,
      },
      {
        empId: empMap["EMP-007"],
        site: "Mundra Ultra Mega Power Plant",
        type: "EL",
        fromDate: `${currentYear}-07-28`,
        toDate: `${currentYear}-07-30`,
        days: 3,
        reason: "House warming ceremony in Ahmedabad",
        status: "Rejected",
        appliedDate: `${currentYear}-07-18`,
      },
    ],
  });

  console.log("✅ Leave Requests created.");

  // ============================================================
  // 8. CREATE 5 PAYROLL RECORDS (current month)
  // ============================================================
  console.log("💰 Creating Payroll records...");

  await db.payroll.createMany({
    data: [
      {
        empId: empMap["EMP-001"],
        month: currentMonth,
        days: 26,
        basic: 65000,
        hra: 19500,
        ot: 0,
        gross: 84500,
        pf: 7800,
        esi: 0,
        tds: 8500,
        netPay: 68200,
        status: "Processed",
      },
      {
        empId: empMap["EMP-002"],
        month: currentMonth,
        days: 26,
        basic: 38000,
        hra: 11400,
        ot: 2400,
        gross: 51800,
        pf: 4560,
        esi: 0,
        tds: 3200,
        netPay: 44040,
        status: "Processed",
      },
      {
        empId: empMap["EMP-004"],
        month: currentMonth,
        days: 25,
        basic: 22000,
        hra: 6600,
        ot: 3600,
        gross: 32200,
        pf: 2640,
        esi: 480,
        tds: 0,
        netPay: 29080,
        status: "Pending",
      },
      {
        empId: empMap["EMP-005"],
        month: currentMonth,
        days: 26,
        basic: 72000,
        hra: 21600,
        ot: 0,
        gross: 93600,
        pf: 8640,
        esi: 0,
        tds: 10200,
        netPay: 74760,
        status: "Processed",
      },
      {
        empId: empMap["EMP-008"],
        month: currentMonth,
        days: 24,
        basic: 45000,
        hra: 13500,
        ot: 1800,
        gross: 60300,
        pf: 5400,
        esi: 0,
        tds: 4800,
        netPay: 50100,
        status: "Pending",
      },
    ],
  });

  console.log("✅ Payroll records created.");

  // ============================================================
  // 9. CREATE 5 WORK PERMITS
  // ============================================================
  console.log("📋 Creating Work Permits...");

  await db.workPermit.createMany({
    data: [
      {
        permitNo: "WP-2025-001",
        type: "Hot Work",
        location: "Singrauli - Boiler Elev. +42m",
        issuedTo: "Mohammed Irfan",
        expiry: `${currentYear}-07-20`,
        status: "Active",
        description: "Welding of HP steam line support brackets inside boiler casing",
        precautions: "Fire blanket, 2x CO2 extinguishers, fire watcher posted, gas testing done, area barricaded",
      },
      {
        permitNo: "WP-2025-002",
        type: "LOTO",
        location: "Mundra - TG Hall Cable Tray Zone",
        issuedTo: "Prakash Tiwari",
        expiry: `${currentYear}-07-18`,
        status: "Active",
        description: "Isolation and lockout of 6.6kV cable tray for cable pulling activity near live bus duct",
        precautions: "Electrical isolation verified with VT, danger tags, try-out procedure completed, authorised person signed off",
      },
      {
        permitNo: "WP-2025-003",
        type: "Height Work",
        location: "Uttarkashi - Penstock Anchor Block-3",
        issuedTo: "Deepak Rawat",
        expiry: `${currentYear}-07-25`,
        status: "Active",
        description: "Concrete inspection and chipping at penstock anchor block elevation +65m above ground",
        precautions: "Full body harness with double lanyard, safety net below, helmet with chin strap, tool lanyards mandatory",
      },
      {
        permitNo: "WP-2025-004",
        type: "Confined Space",
        location: "Dadri - Condenser Water Box",
        issuedTo: "Amit Sharma",
        expiry: `${currentYear}-07-17`,
        status: "Expired",
        description: "Tube inspection and plug insertion inside condenser water box during planned outage",
        precautions: "Gas testing (O2, H2S, LEL) every 2 hours, rescue tripod with winch deployed, standby rescue man, BA set available",
      },
      {
        permitNo: "WP-2025-005",
        type: "Excavation",
        location: "Jaisalmer - Inverter Station Trench",
        issuedTo: "Vikram Mehta",
        expiry: `${currentYear}-07-22`,
        status: "Active",
        description: "Cable trench excavation for 33kV cable laying from inverter station to pooling substation",
        precautions: "Shoring provided for depth >1.5m, barricading with warning tape, locate existing UG cables before dig, competent supervisor present",
      },
    ],
  });

  console.log("✅ Work Permits created.");

  // ============================================================
  // 10. CREATE 5 INCIDENTS
  // ============================================================
  console.log("⚠️  Creating Incidents...");

  await db.incident.createMany({
    data: [
      {
        refNo: "INC-2025-001",
        date: `${currentYear}-07-05`,
        site: "Singrauli Super Thermal Power Plant",
        type: "Near Miss",
        severity: "Low",
        person: "Santosh Kumar Mishra",
        status: "Closed",
        description: "Scaffolding platform nearly collapsed when an unsecured pipe fell from +28m elevation missing workers by 2 feet",
        action: "Toolbox talk conducted, scaffolding inspection schedule enhanced to daily, secured loose materials at height",
      },
      {
        refNo: "INC-2025-002",
        date: `${currentYear}-07-08`,
        site: "Mundra Ultra Mega Power Plant",
        type: "First Aid",
        severity: "Low",
        person: "Manoj Kumar Gupta",
        status: "Closed",
        description: "Minor burn on left forearm during GTAW welding due to hot slag splatter",
        action: "First aid given at site medical room, burnol applied and bandaged, PPE compliance checked",
      },
      {
        refNo: "INC-2025-003",
        date: `${currentYear}-07-10`,
        site: "Dadri Gas Power Station",
        type: "Property Damage",
        severity: "Medium",
        person: "Suresh Verma",
        status: "Under Investigation",
        description: "50MT mobile crane boom made contact with overhead 220kV transmission line causing flashover and damage to crane electronics",
        action: "Crane grounded, area cordoned, Electrical Inspector intimated, DGMS report being prepared",
      },
      {
        refNo: "INC-2025-004",
        date: `${currentYear}-07-12`,
        site: "Uttarkashi Hydro Electric Project",
        type: "LTI",
        severity: "High",
        person: "Anil Kumar Pandey",
        status: "Under Investigation",
        description: "Labourer slipped from wet formwork at tunnel portal and sustained fracture in right leg tibia",
        action: "Victim hospitalised at District Hospital Uttarkashi, work stopped at tunnel portal, root cause analysis initiated, anti-skid measures ordered",
      },
      {
        refNo: "INC-2025-005",
        date: today,
        site: "Chennai Thermal Power Station",
        type: "Hazard ID",
        severity: "Medium",
        person: "Priya Nair",
        status: "Investigating",
        description: "Cracks identified in structural steel of temporary stores building near coal handling plant, risk of collapse during monsoon",
        action: "Area evacuated, temporary barricading done, structural consultant called for assessment, alternative storage arranged",
      },
    ],
  });

  console.log("✅ Incidents created.");

  // ============================================================
  // 11. CREATE 6 EQUIPMENT ITEMS
  // ============================================================
  console.log("🔧 Creating Equipment...");

  await db.equipment.createMany({
    data: [
      {
        name: "Liebherr Crawler Crane 100T",
        eqId: "EQ-CR-001",
        site: "Singrauli Super Thermal Power Plant",
        status: "Operational",
        lastPM: `${currentYear}-06-15`,
        nextPM: `${currentYear}-09-15`,
        issue: null,
        downSince: null,
        etaRepair: null,
        assignedTo: "Rajesh Kumar Singh",
        utilization: 78,
      },
      {
        name: "Cummins DG Set 500 KVA",
        eqId: "EQ-DG-001",
        site: "Jaisalmer Solar Park",
        status: "Operational",
        lastPM: `${currentYear}-06-20`,
        nextPM: `${currentYear}-08-20`,
        issue: null,
        downSince: null,
        etaRepair: null,
        assignedTo: "Vikram Mehta",
        utilization: 45,
      },
      {
        name: "Lincoln V350 Pro Welding Set",
        eqId: "EQ-WD-001",
        site: "Mundra Ultra Mega Power Plant",
        status: "Under Maintenance",
        lastPM: `${currentYear}-07-01`,
        nextPM: `${currentYear}-10-01`,
        issue: "Wire feeder jamming intermittently, torch cable worn out",
        downSince: `${currentYear}-07-14`,
        etaRepair: `${currentYear}-07-19`,
        assignedTo: "Mohammed Irfan",
        utilization: 92,
      },
      {
        name: "Potain Tower Crane MCT 205",
        eqId: "EQ-TC-001",
        site: "Uttarkashi Hydro Electric Project",
        status: "Operational",
        lastPM: `${currentYear}-07-05`,
        nextPM: `${currentYear}-10-05`,
        issue: null,
        downSince: null,
        etaRepair: null,
        assignedTo: "Deepak Rawat",
        utilization: 65,
      },
      {
        name: "Astromix Concrete Mixer 10/7 CFT",
        eqId: "EQ-CM-001",
        site: "Dadri Gas Power Station",
        status: "Operational",
        lastPM: `${currentYear}-06-10`,
        nextPM: `${currentYear}-09-10`,
        issue: null,
        downSince: null,
        etaRepair: null,
        assignedTo: "Prakash Tiwari",
        utilization: 55,
      },
      {
        name: "JCB 3DX Backhoe Loader",
        eqId: "EQ-EM-001",
        site: "Chennai Thermal Power Station",
        status: "Operational",
        lastPM: `${currentYear}-07-01`,
        nextPM: `${currentYear}-10-01`,
        issue: "Hydraulic hose minor leak at boom joint",
        downSince: null,
        etaRepair: null,
        assignedTo: "Karthik Rajan",
        utilization: 72,
      },
    ],
  });

  console.log("✅ Equipment created.");

  // ============================================================
  // 12. CREATE 5 EXPENSES
  // ============================================================
  console.log("🧾 Creating Expenses...");

  await db.expense.createMany({
    data: [
      {
        claimNo: "EXP-2025-001",
        empId: empMap["EMP-001"],
        category: "Travel",
        amount: 18500,
        project: "NTPC-SGR-EPC",
        date: `${currentYear}-07-02`,
        status: "Approved",
      },
      {
        claimNo: "EXP-2025-002",
        empId: empMap["EMP-004"],
        category: "Tools",
        amount: 4250,
        project: "NTPC-SGR-EPC",
        date: `${currentYear}-07-06`,
        status: "Pending",
      },
      {
        claimNo: "EXP-2025-003",
        empId: empMap["EMP-008"],
        category: "Medical",
        amount: 3200,
        project: "UJVNL-UKH-HYDRO",
        date: `${currentYear}-07-09`,
        status: "Approved",
      },
      {
        claimNo: "EXP-2025-004",
        empId: empMap["EMP-005"],
        category: "Communication",
        amount: 2500,
        project: "SECI-JSM-SOLAR",
        date: `${currentYear}-07-11`,
        status: "Pending",
      },
      {
        claimNo: "EXP-2025-005",
        empId: empMap["EMP-011"],
        category: "Transport",
        amount: 8700,
        project: "BSEB-CHN-EPC",
        date: `${currentYear}-07-08`,
        status: "Rejected",
      },
    ],
  });

  console.log("✅ Expenses created.");

  // ============================================================
  // 13. CREATE 5 PURCHASE ORDERS
  // ============================================================
  console.log("📦 Creating Purchase Orders...");

  await db.purchaseOrder.createMany({
    data: [
      {
        poNo: "PO-2025-001",
        vendor: "Bhel Industrial Supplies, Bhopal",
        item: "SA 387 Gr.11 Cl.1 Plates - 50MT",
        amount: 3750000,
        project: "NTPC-SGR-EPC",
        delivery: `${currentYear}-08-15`,
        grn: "Received",
        status: "Closed",
      },
      {
        poNo: "PO-2025-002",
        vendor: "SolarEdge Technologies India, Gurugram",
        item: "String Inverters 110kW - 25 Nos",
        amount: 8750000,
        project: "SECI-JSM-SOLAR",
        delivery: `${currentYear}-09-01`,
        grn: "Awaited",
        status: "Open",
      },
      {
        poNo: "PO-2025-003",
        vendor: "Godrej & Boyce Mfg Co., Mumbai",
        item: "Structural Steel ISMC 200 - 120MT",
        amount: 10800000,
        project: "GIPCL-MUN-BOP",
        delivery: `${currentYear}-08-30`,
        grn: "Partial",
        status: "Open",
      },
      {
        poNo: "PO-2025-004",
        vendor: "KRBL Safety Equipments, Delhi",
        item: "Full Body Harness, Helmets, Safety Shoes - 500 Sets",
        amount: 750000,
        project: "UJVNL-UKH-HYDRO",
        delivery: `${currentYear}-07-25`,
        grn: "Awaited",
        status: "Open",
      },
      {
        poNo: "PO-2025-005",
        vendor: "Siemens Limited India, Chennai",
        item: "33kV VCB Panel - 8 Nos",
        amount: 24000000,
        project: "BSEB-CHN-EPC",
        delivery: `${currentYear}-10-15`,
        grn: "Awaited",
        status: "Open",
      },
    ],
  });

  console.log("✅ Purchase Orders created.");

  // ============================================================
  // 14. CREATE 4 INVOICES
  // ============================================================
  console.log("📄 Creating Invoices...");

  await db.invoice.createMany({
    data: [
      {
        invNo: "INV-2025-001",
        client: "NTPC Limited",
        project: "NTPC-SGR-EPC",
        amount: "₹12,45,00,000",
        date: `${currentYear}-07-01`,
        dueDate: `${currentYear}-07-31`,
        status: "Under Review",
      },
      {
        invNo: "INV-2025-002",
        client: "Solar Energy Corporation of India",
        project: "SECI-JSM-SOLAR",
        amount: "₹3,20,00,000",
        date: `${currentYear}-06-25`,
        dueDate: `${currentYear}-07-25`,
        status: "Approved",
      },
      {
        invNo: "INV-2025-003",
        client: "Uttarakhand Jal Vidyut Nigam Ltd.",
        project: "UJVNL-UKH-HYDRO",
        amount: "₹8,75,00,000",
        date: `${currentYear}-07-05`,
        dueDate: `${currentYear}-08-05`,
        status: "Under Review",
      },
      {
        invNo: "INV-2025-004",
        client: "Gujarat Industries Power Company Ltd.",
        project: "GIPCL-MUN-BOP",
        amount: "₹5,60,00,000",
        date: `${currentYear}-07-10`,
        dueDate: `${currentYear}-08-10`,
        status: "Pending",
      },
    ],
  });

  console.log("✅ Invoices created.");

  // ============================================================
  // 15. CREATE 4 SUBCONTRACTORS
  // ============================================================
  console.log("🤝 Creating Subcontractors...");

  await db.subcontractor.createMany({
    data: [
      {
        name: "Shree Krishna Scaffolding Works",
        trade: "Scaffolding & Rigging",
        workers: 35,
        site: "Singrauli Super Thermal Power Plant",
        pfReg: "Registered",
        esiReg: "Registered",
        labourLic: "Valid",
        compliance: "Compliant",
      },
      {
        name: "Patel & Sons Electrical Contractors",
        trade: "Cable Laying & Termination",
        workers: 22,
        site: "Mundra Ultra Mega Power Plant",
        pfReg: "Registered",
        esiReg: "Pending",
        labourLic: "Valid",
        compliance: "Partially Compliant",
      },
      {
        name: "Ganga Earthworks Pvt. Ltd.",
        trade: "Civil & Excavation",
        workers: 48,
        site: "Uttarkashi Hydro Electric Project",
        pfReg: "Registered",
        esiReg: "Registered",
        labourLic: "Valid",
        compliance: "Compliant",
      },
      {
        name: "Jai Ambey Welding Services",
        trade: "Welding & NDT",
        workers: 18,
        site: "Dadri Gas Power Station",
        pfReg: "Pending",
        esiReg: "Pending",
        labourLic: "Expired",
        compliance: "Non-Compliant",
      },
    ],
  });

  console.log("✅ Subcontractors created.");

  // ============================================================
  // 16. CREATE 5 JOB OPENINGS
  // ============================================================
  console.log("🔎 Creating Job Openings...");

  await db.jobOpening.createMany({
    data: [
      {
        position: "QA/QC Engineer - Welding",
        site: "Singrauli Super Thermal Power Plant",
        openings: 2,
        applications: 8,
        priority: "High",
        status: "Open",
      },
      {
        position: "Safety Supervisor",
        site: "Mundra Ultra Mega Power Plant",
        openings: 1,
        applications: 12,
        priority: "High",
        status: "Open",
      },
      {
        position: "Instrumentation Technician",
        site: "Jaisalmer Solar Park",
        openings: 3,
        applications: 5,
        priority: "Medium",
        status: "Open",
      },
      {
        position: "Civil Site Engineer",
        site: "Uttarkashi Hydro Electric Project",
        openings: 1,
        applications: 15,
        priority: "High",
        status: "Interviewing",
      },
      {
        position: "Crane Operator (50T+)",
        site: "Dadri Gas Power Station",
        openings: 2,
        applications: 3,
        priority: "Low",
        status: "Open",
      },
    ],
  });

  console.log("✅ Job Openings created.");

  // ============================================================
  // 17. CREATE 12 SHIFT SCHEDULES
  // ============================================================
  console.log("🕐 Creating Shift Schedules...");

  // Calculate week start (Monday of current week)
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  await db.shiftSchedule.createMany({
    data: [
      { empId: empMap["EMP-001"], employeeName: "Rajesh Kumar Singh", site: "Singrauli Super Thermal Power Plant", shift: "Day A", weekStart: weekStartStr },
      { empId: empMap["EMP-002"], employeeName: "Amit Sharma", site: "Singrauli Super Thermal Power Plant", shift: "Day A", weekStart: weekStartStr },
      { empId: empMap["EMP-003"], employeeName: "Sunil Kumar Yadav", site: "Singrauli Super Thermal Power Plant", shift: "Day B", weekStart: weekStartStr },
      { empId: empMap["EMP-004"], employeeName: "Mohammed Irfan", site: "Singrauli Super Thermal Power Plant", shift: "Day B", weekStart: weekStartStr },
      { empId: empMap["EMP-005"], employeeName: "Vikram Mehta", site: "Jaisalmer Solar Park", shift: "General", weekStart: weekStartStr },
      { empId: empMap["EMP-006"], employeeName: "Ramesh Chandra", site: "Jaisalmer Solar Park", shift: "Day A", weekStart: weekStartStr },
      { empId: empMap["EMP-007"], employeeName: "Arun Patel", site: "Mundra Ultra Mega Power Plant", shift: "Day A", weekStart: weekStartStr },
      { empId: empMap["EMP-008"], employeeName: "Deepak Rawat", site: "Uttarkashi Hydro Electric Project", shift: "Night B", weekStart: weekStartStr },
      { empId: empMap["EMP-009"], employeeName: "Prakash Tiwari", site: "Dadri Gas Power Station", shift: "Day A", weekStart: weekStartStr },
      { empId: empMap["EMP-010"], employeeName: "Suresh Verma", site: "Dadri Gas Power Station", shift: "Day B", weekStart: weekStartStr },
      { empId: empMap["EMP-011"], employeeName: "Karthik Rajan", site: "Chennai Thermal Power Station", shift: "General", weekStart: weekStartStr },
      { empId: empMap["EMP-012"], employeeName: "Manoj Kumar Gupta", site: "Mundra Ultra Mega Power Plant", shift: "OFF", weekStart: weekStartStr },
    ],
  });

  console.log("✅ Shift Schedules created.");

  // ============================================================
  // 18. CREATE 10 CERTIFICATIONS
  // ============================================================
  console.log("🎓 Creating Certifications...");

  await db.certification.createMany({
    data: [
      { empId: empMap["EMP-002"], employeeName: "Amit Sharma", name: "CPRI Certified Electrical Supervisor", issuedBy: "Central Power Research Institute, Bangalore", issueDate: "2024-01-15", expiryDate: "2027-01-14", status: "Valid" },
      { empId: empMap["EMP-004"], employeeName: "Mohammed Irfan", name: "CSWIP 3.2 Welding Inspector", issuedBy: "TWI (India), Chennai", issueDate: "2023-06-10", expiryDate: "2026-06-09", status: "Valid" },
      { empId: empMap["EMP-012"], employeeName: "Manoj Kumar Gupta", name: "ASME IX Welder Qualification", issuedBy: "Lloyd's Register India, Mumbai", issueDate: "2024-03-20", expiryDate: "2027-03-19", status: "Valid" },
      { empId: empMap["EMP-008"], employeeName: "Deepak Rawat", name: "NEBOSH International General Certificate", issuedBy: "NEBOSH, UK", issueDate: "2022-09-05", expiryDate: "2025-09-04", status: "Valid" },
      { empId: empMap["EMP-008"], employeeName: "Deepak Rawat", name: "OSHA 30-Hour Construction Safety", issuedBy: "OSHA, USA", issueDate: "2023-02-18", expiryDate: "2028-02-17", status: "Valid" },
      { empId: empMap["EMP-003"], employeeName: "Sunil Kumar Yadav", name: "CSWIP 3.1 Welding Inspector", issuedBy: "TWI (India), Chennai", issueDate: "2022-11-12", expiryDate: "2025-11-11", status: "Valid" },
      { empId: empMap["EMP-010"], employeeName: "Suresh Verma", name: "Crane Operator License (50T+)", issuedBy: "Directorate General Factory Advice Service & Labour Institutes, Mumbai", issueDate: "2023-08-01", expiryDate: "2026-07-31", status: "Valid" },
      { empId: empMap["EMP-001"], employeeName: "Rajesh Kumar Singh", name: "PMP Certified Project Manager", issuedBy: "Project Management Institute, USA", issueDate: "2021-04-22", expiryDate: "2027-04-21", status: "Valid" },
      { empId: empMap["EMP-007"], employeeName: "Arun Patel", name: "NEBOSH International General Certificate", issuedBy: "NEBOSH, UK", issueDate: "2023-05-10", expiryDate: "2026-05-09", status: "Valid" },
      { empId: empMap["EMP-009"], employeeName: "Prakash Tiwari", name: "ASME IX Welding Procedure Qualification", issuedBy: "TUV India Pvt. Ltd., Pune", issueDate: "2024-01-08", expiryDate: "2027-01-07", status: "Valid" },
    ],
  });

  console.log("✅ Certifications created.");

  // ============================================================
  // 19. CREATE 6 TRAINING SESSIONS
  // ============================================================
  console.log("📚 Creating Training Sessions...");

  await db.trainingSession.createMany({
    data: [
      {
        title: "Fire Safety & Emergency Evacuation Drill",
        site: "Singrauli Super Thermal Power Plant",
        trainer: "Rajeev Sharma (Fire Safety Officer)",
        date: `${currentYear}-07-20`,
        duration: "3 hours",
        attendees: 85,
        status: "Scheduled",
      },
      {
        title: "Working at Heights - Fall Protection",
        site: "Uttarkashi Hydro Electric Project",
        trainer: "Deepak Rawat (Safety Officer)",
        date: `${currentYear}-07-15`,
        duration: "4 hours",
        attendees: 42,
        status: "Completed",
      },
      {
        title: "LOTO Procedure Refresher Training",
        site: "Dadri Gas Power Station",
        trainer: "Sanjay Verma (Electrical Consultant)",
        date: `${currentYear}-07-18`,
        duration: "2 hours",
        attendees: 38,
        status: "Completed",
      },
      {
        title: "First Aid & CPR Training",
        site: "Mundra Ultra Mega Power Plant",
        trainer: "Red Cross Society, Ahmedabad",
        date: `${currentYear}-07-25`,
        duration: "6 hours",
        attendees: 60,
        status: "Scheduled",
      },
      {
        title: "Confined Space Entry & Rescue",
        site: "Chennai Thermal Power Station",
        trainer: "National Safety Council, Chennai",
        date: `${currentYear}-07-22`,
        duration: "5 hours",
        attendees: 30,
        status: "Scheduled",
      },
      {
        title: "Solar Panel Cleaning & Maintenance",
        site: "Jaisalmer Solar Park",
        trainer: "Adani Solar Technical Team",
        date: `${currentYear}-07-12`,
        duration: "2 hours",
        attendees: 25,
        status: "Completed",
      },
    ],
  });

  console.log("✅ Training Sessions created.");

  // ============================================================
  // 20. CREATE DEPARTMENTS
  // ============================================================
  console.log("🏢 Creating Departments...");

  await db.department.createMany({
    data: [
      { name: "Project Management", head: "Rajesh Kumar Singh", location: "Head Office - Mumbai", employeeCount: 8, status: "Active" },
      { name: "Engineering - Electrical", head: "Amit Sharma", location: "Site - Singrauli", employeeCount: 22, status: "Active" },
      { name: "Engineering - Mechanical", head: "Sunil Kumar Yadav", location: "Site - Singrauli", employeeCount: 18, status: "Active" },
      { name: "Engineering - Civil", head: "Arun Patel", location: "Site - Mundra", employeeCount: 15, status: "Active" },
      { name: "Safety & HSE", head: "Deepak Rawat", location: "Site - Uttarkashi", employeeCount: 6, status: "Active" },
      { name: "Finance & Accounts", head: "Priya Nair", location: "Head Office - Mumbai", employeeCount: 5, status: "Active" },
      { name: "Human Resources", head: "Priya Nair", location: "Head Office - Mumbai", employeeCount: 4, status: "Active" },
      { name: "Procurement", head: "Vikram Mehta", location: "Head Office - Mumbai", employeeCount: 6, status: "Active" },
    ],
  });

  console.log("✅ Departments created.");

  // ============================================================
  // 21. CREATE DESIGNATIONS
  // ============================================================
  console.log("📋 Creating Designations...");

  await db.designation.createMany({
    data: [
      { title: "Project Manager", department: "Project Management", level: "L5", minSalary: 65000, maxSalary: 95000, status: "Active" },
      { title: "Site Engineer", department: "Engineering - Electrical", level: "L3", minSalary: 30000, maxSalary: 45000, status: "Active" },
      { title: "Supervisor", department: "Engineering - Mechanical", level: "L2", minSalary: 22000, maxSalary: 35000, status: "Active" },
      { title: "Foreman", department: "Engineering - Mechanical", level: "L1", minSalary: 18000, maxSalary: 28000, status: "Active" },
      { title: "Safety Officer", department: "Safety & HSE", level: "L3", minSalary: 35000, maxSalary: 55000, status: "Active" },
      { title: "Technician", department: "Engineering - Electrical", level: "L1", minSalary: 15000, maxSalary: 25000, status: "Active" },
      { title: "Welder", department: "Engineering - Mechanical", level: "L1", minSalary: 18000, maxSalary: 30000, status: "Active" },
      { title: "HR Executive", department: "Human Resources", level: "L3", minSalary: 25000, maxSalary: 40000, status: "Active" },
      { title: "Accountant", department: "Finance & Accounts", level: "L3", minSalary: 25000, maxSalary: 40000, status: "Active" },
      { title: "Site Incharge", department: "Project Management", level: "L4", minSalary: 45000, maxSalary: 65000, status: "Active" },
    ],
  });

  console.log("✅ Designations created.");

  // ============================================================
  // 22. CREATE INVENTORY ITEMS
  // ============================================================
  console.log("📦 Creating Inventory Items...");

  await db.inventoryItem.createMany({
    data: [
      { itemCode: "INV-001", name: "SA 387 Gr.11 Cl.1 Steel Plate (12mm)", category: "Raw Materials", unit: "MT", currentStock: 45, minStock: 10, maxStock: 100, unitCost: 75000, warehouse: "Central Store - Mumbai", status: "In Stock" },
      { itemCode: "INV-002", name: "E7018 Low Hydrogen Welding Electrode (3.2mm)", category: "Consumables", unit: "KG", currentStock: 2800, minStock: 500, maxStock: 5000, unitCost: 185, warehouse: "Site Store - Singrauli", status: "In Stock" },
      { itemCode: "INV-003", name: "ISMC 200 Structural Steel Channel", category: "Raw Materials", unit: "MT", currentStock: 22, minStock: 5, maxStock: 50, unitCost: 90000, warehouse: "Central Store - Mumbai", status: "In Stock" },
      { itemCode: "INV-004", name: "XLPE 33kV Power Cable (3cx300sqmm)", category: "Electrical", unit: "MTR", currentStock: 850, minStock: 200, maxStock: 2000, unitCost: 3200, warehouse: "Site Store - Mundra", status: "In Stock" },
      { itemCode: "INV-005", name: "Full Body Harness (Double Lanyard)", category: "Safety", unit: "Nos", currentStock: 120, minStock: 30, maxStock: 200, unitCost: 4500, warehouse: "Site Store - Singrauli", status: "In Stock" },
      { itemCode: "INV-006", name: "Bhel Make 6.6kV VCB Panel", category: "Electrical", unit: "Nos", currentStock: 3, minStock: 2, maxStock: 10, unitCost: 3000000, warehouse: "Central Store - Mumbai", status: "In Stock" },
      { itemCode: "INV-007", name: "Portland Cement (OPC 53 Grade)", category: "Consumables", unit: "Bags", currentStock: 4500, minStock: 1000, maxStock: 10000, unitCost: 380, warehouse: "Site Store - Uttarkashi", status: "In Stock" },
      { itemCode: "INV-008", name: "Fire Extinguisher CO2 (5kg)", category: "Safety", unit: "Nos", currentStock: 8, minStock: 10, maxStock: 30, unitCost: 2800, warehouse: "Site Store - Singrauli", status: "Low Stock" },
    ],
  });

  console.log("✅ Inventory Items created.");

  // ============================================================
  // 23. CREATE STOCK MOVEMENTS
  // ============================================================
  console.log("🔄 Creating Stock Movements...");

  await db.stockMovement.createMany({
    data: [
      { itemCode: "INV-001", itemName: "SA 387 Gr.11 Steel Plate", type: "Inward", quantity: 50, fromWarehouse: "Vendor - Bhel", toWarehouse: "Central Store - Mumbai", reference: "PO-2025-001", date: currentMonth + "-05", remarks: "Received against PO-2025-001" },
      { itemCode: "INV-002", itemName: "E7018 Welding Electrode", type: "Issue", quantity: 200, fromWarehouse: "Site Store - Singrauli", toWarehouse: "Boiler Work Area", reference: "MTL-001", date: currentMonth + "-10", remarks: "Issued for boiler welding" },
      { itemCode: "INV-005", itemName: "Full Body Harness", type: "Inward", quantity: 50, fromWarehouse: "Vendor - KRBL Safety", toWarehouse: "Site Store - Singrauli", reference: "PO-2025-004", date: currentMonth + "-08", remarks: "Safety equipment received" },
      { itemCode: "INV-004", itemName: "33kV XLPE Cable", type: "Transfer", quantity: 500, fromWarehouse: "Central Store - Mumbai", toWarehouse: "Site Store - Mundra", reference: "TRF-001", date: currentMonth + "-12", remarks: "Inter-store transfer for TG cabling" },
      { itemCode: "INV-007", itemName: "Portland Cement OPC 53", type: "Issue", quantity: 800, fromWarehouse: "Site Store - Uttarkashi", toWarehouse: "Penstock Works", reference: "MTL-002", date: currentMonth + "-15", remarks: "Consumed for penstock anchor block concreting" },
    ],
  });

  console.log("✅ Stock Movements created.");

  // ============================================================
  // 24. CREATE CUSTOMERS
  // ============================================================
  console.log("👥 Creating Customers...");

  await db.customer.createMany({
    data: [
      { code: "CUST-001", name: "NTPC Limited", contactPerson: "A.K. Verma", email: "procurement@ntpc.co.in", phone: "011-24360100", address: "NTPC Bhawan, Scope Complex, New Delhi - 110003", gst: "07AAACT2727Q1ZV", city: "New Delhi", state: "Delhi", totalOrders: 3, totalRevenue: 145600000, status: "Active" },
      { code: "CUST-002", name: "Solar Energy Corporation of India", contactPerson: "R. Sundar", email: "tenders@seci.co.in", phone: "011-26890500", address: "1st Floor, August Kranti Bhawan, New Delhi - 110016", gst: "07AAACG5266Q1Z7", city: "New Delhi", state: "Delhi", totalOrders: 2, totalRevenue: 62500000, status: "Active" },
      { code: "CUST-003", name: "Gujarat Industries Power Company Ltd.", contactPerson: "M.D. Patel", email: "projects@gipcl.guj.gov.in", phone: "02692-228100", address: "GIPCL House, Race Course Circle, Vadodara - 390007", gst: "24AAACG1065G1Z6", city: "Vadodara", state: "Gujarat", totalOrders: 1, totalRevenue: 218750000, status: "Active" },
      { code: "CUST-004", name: "Uttarakhand Jal Vidyut Nigam Ltd.", contactPerson: "D.S. Rawat", email: "engg@ujvnl.uk.gov.in", phone: "0135-2710400", address: "UJVN Bhawan, Subhash Nagar, Dehradun - 248001", gst: "05AAACU2858H1Z5", city: "Dehradun", state: "Uttarakhand", totalOrders: 2, totalRevenue: 85000000, status: "Active" },
      { code: "CUST-005", name: "Bihar State Electricity Board", contactPerson: "S.K. Mishra", email: "tender@bseb.bih.nic.in", phone: "0612-2212100", address: "Vidyut Bhawan, Bailey Road, Patna - 800001", gst: "10AAABB4512B1Z3", city: "Patna", state: "Bihar", totalOrders: 1, totalRevenue: 47900000, status: "Active" },
    ],
  });

  console.log("✅ Customers created.");

  // ============================================================
  // 25. CREATE SALES ORDERS
  // ============================================================
  console.log("💰 Creating Sales Orders...");

  await db.salesOrder.createMany({
    data: [
      { soNo: "SO-2025-001", customer: "NTPC Limited", project: "NTPC-SGR-EPC", item: "Boiler EPC - Unit 5", quantity: 1, unitPrice: 487500000, amount: 487500000, orderDate: "2024-03-01", deliveryDate: "2027-02-28", status: "In Progress" },
      { soNo: "SO-2025-002", customer: "Solar Energy Corporation of India", project: "SECI-JSM-SOLAR", item: "O&M Services - 500MW Solar Park", quantity: 1, unitPrice: 62500000, amount: 62500000, orderDate: "2023-06-15", deliveryDate: "2028-06-14", status: "In Progress" },
      { soNo: "SO-2025-003", customer: "Gujarat Industries Power Company Ltd.", project: "GIPCL-MUN-BOP", item: "BoP Package - 2x660MW", quantity: 1, unitPrice: 218750000, amount: 218750000, orderDate: "2024-01-10", deliveryDate: "2026-12-31", status: "In Progress" },
      { soNo: "SO-2025-004", customer: "Uttarakhand Jal Vidyut Nigam Ltd.", project: "UJVNL-UKH-HYDRO", item: "EPC - 120MW Hydro", quantity: 1, unitPrice: 340000000, amount: 340000000, orderDate: "2023-09-01", deliveryDate: "2027-08-31", status: "In Progress" },
      { soNo: "SO-2025-005", customer: "Bihar State Electricity Board", project: "BSEB-CHN-EPC", item: "TG Island EPC - Unit 3", quantity: 1, unitPrice: 47900000, amount: 47900000, orderDate: "2024-07-01", deliveryDate: "2026-06-30", status: "In Progress" },
    ],
  });

  console.log("✅ Sales Orders created.");

  // ============================================================
  // 26. CREATE CRM CONTACTS
  // ============================================================
  console.log("🤝 Creating CRM Contacts...");

  await db.crmContact.createMany({
    data: [
      { name: "Mr. A.K. Verma", company: "NTPC Limited", designation: "General Manager (Projects)", email: "ak.verma@ntpc.co.in", phone: "9810012345", source: "Existing Client", stage: "Client", value: 633000000, lastContact: currentMonth + "-01", notes: "Key decision maker for Singrauli project", status: "Active" },
      { name: "Mr. R. Sundar", company: "Solar Energy Corporation of India", designation: "Director (Projects)", email: "r.sundar@seci.co.in", phone: "9810023456", source: "Existing Client", stage: "Client", value: 125000000, lastContact: currentMonth + "-05", notes: "Interested in expanding O&M scope to 1GW", status: "Active" },
      { name: "Mr. Suresh Jain", company: "Adani Power Ltd.", designation: "VP - Procurement", email: "s.jain@adanipower.com", phone: "9810034567", source: "Cold Outreach", stage: "Proposal", value: 250000000, lastContact: currentMonth + "-10", notes: "Discussed EPC for Mundra expansion Phase-3", status: "Active" },
      { name: "Ms. Kavita Reddy", company: "Tata Power Solar", designation: "Head - EPC", email: "k.reddy@tatapowersolar.com", phone: "9810045678", source: "Referral", stage: "Lead", value: 180000000, lastContact: currentMonth + "-08", notes: "Exploring partnership for solar EPC in Rajasthan", status: "Active" },
      { name: "Mr. D.K. Sharma", company: "NHPC Limited", designation: "Executive Director", email: "dk.sharma@nhpc.nic.in", phone: "9810056789", source: "Industry Event", stage: "Qualification", value: 500000000, lastContact: currentMonth + "-12", notes: "Pre-qualification for upcoming hydro projects in Himachal", status: "Active" },
      { name: "Mr. Ravi Kumar", company: "Power Grid Corporation", designation: "CGM (Projects)", email: "r.kumar@powergridindia.com", phone: "9810067890", source: "Existing Client", stage: "Client", value: 85000000, lastContact: currentMonth + "-03", notes: "Completed substation work, exploring transmission line package", status: "Active" },
    ],
  });

  console.log("✅ CRM Contacts created.");

  // ============================================================
  // 27. CREATE SUPPORT TICKETS
  // ============================================================
  console.log("🎫 Creating Support Tickets...");

  await db.supportTicket.createMany({
    data: [
      { ticketNo: "TKT-001", title: "Unable to submit monthly timesheet", raisedBy: "Mohammed Irfan", category: "Technical", priority: "High", status: "In Progress", assignedTo: "IT Support", description: "Timesheet submission page shows 500 error when selecting 'Night B' shift for current week", resolution: null },
      { ticketNo: "TKT-002", title: "Payroll report shows incorrect PF deduction", raisedBy: "Amit Sharma", category: "Finance", priority: "High", status: "Open", assignedTo: "Finance Team", description: "March 2026 payroll shows PF deduction of 12% on gross instead of basic pay", resolution: null },
      { ticketNo: "TKT-003", title: "New employee onboarding - documents not uploading", raisedBy: "Priya Nair", category: "Technical", priority: "Medium", status: "Open", assignedTo: "IT Support", description: "Document upload for new joinee EMP-015 keeps failing with timeout error", resolution: null },
      { ticketNo: "TKT-004", title: "Request for additional safety report format", raisedBy: "Deepak Rawat", category: "Feature Request", priority: "Low", status: "Open", assignedTo: null, description: "Need HSE monthly report in DGMS format for regulatory submission", resolution: null },
      { ticketNo: "TKT-005", title: "Leave balance not updating after approval", raisedBy: "Sunil Kumar Yadav", category: "HR", priority: "Medium", status: "Resolved", assignedTo: "HR Team", description: "After CL approval, balance showed 11 instead of 10 days", resolution: "Fixed leave balance calculation to use approved days count" },
    ],
  });

  console.log("✅ Support Tickets created.");

  // ============================================================
  // 28. CREATE KNOWLEDGEBASE ARTICLES
  // ============================================================
  console.log("📚 Creating KB Articles...");

  await db.kBArticle.createMany({
    data: [
      { title: "How to Submit a Leave Request", category: "HR & Leave", content: "Step 1: Navigate to Leave Management from sidebar.\nStep 2: Click '+ New' button.\nStep 3: Select employee, leave type (EL/SL/CL/ML), from and to dates.\nStep 4: Provide reason and submit.\n\nNote: Leave requires manager approval. Check status in the Leave Management table.", author: "Priya Nair", tags: "leave,apply,hr,request", views: 45, helpful: 12, status: "Published" },
      { title: "Work Permit (PTW) Issue Process", category: "Safety & HSE", content: "This guide covers the complete Permit to Work process:\n\n1. Identify work type (Hot Work, LOTO, Height Work, Confined Space, Excavation)\n2. Navigate to Work Permits module\n3. Click '+ New' and fill in all required fields\n4. Ensure precautions are listed\n5. Set expiry date/time\n6. Submit for safety officer approval\n\nPermits must be closed after work completion.", author: "Deepak Rawat", tags: "permit,ptw,safety,hot work", views: 38, helpful: 8, status: "Published" },
      { title: "Purchase Order Creation Guide", category: "Procurement", content: "To create a Purchase Order:\n\n1. Go to Purchase Orders under Payroll & Finance\n2. Click '+ New'\n3. Fill vendor name, item description, amount\n4. Select project and expected delivery date\n5. Submit for approval\n\nTrack GRN status: Awaiting → Partial → Received", author: "Vikram Mehta", tags: "purchase,order,procurement,po", views: 22, helpful: 5, status: "Published" },
      { title: "Payroll Processing Monthly Checklist", category: "Finance", content: "Monthly payroll processing steps:\n\n1. Verify attendance records for all sites (1st-5th)\n2. Check OT hours and approvals\n3. Process PF/ESI calculations (12% PF, 0.75% ESI)\n4. Apply TDS as per income tax slab\n5. Generate payslips\n6. Submit for finance manager approval\n7. Initiate bank transfer\n\nDeadline: 28th of every month", author: "Priya Nair", tags: "payroll,salary,pf,esi,tds,monthly", views: 56, helpful: 15, status: "Published" },
      { title: "Incident Reporting & Investigation Procedure", category: "Safety & HSE", content: "All incidents must be reported within 24 hours:\n\n1. Navigate to Safety & HSE module\n2. Click '+ New' to create incident report\n3. Classify: Near Miss, First Aid, LTI, Property Damage, Hazard ID\n4. Set severity: Low, Medium, High, Critical\n5. Describe the incident in detail\n6. List immediate corrective actions\n7. Submit for investigation\n\nCritical/High severity incidents require DGMS notification.", author: "Deepak Rawat", tags: "incident,safety,reporting,accident,hse", views: 34, helpful: 10, status: "Published" },
      { title: "Equipment Maintenance Schedule Guidelines", category: "Operations", content: "Preventive Maintenance (PM) Schedule:\n\n- Cranes: Quarterly PM + Annual certification\n- DG Sets: Monthly run test + Quarterly service\n- Welding Sets: Monthly calibration check\n- Concrete Mixers: Weekly inspection\n- Safety Equipment: Monthly inspection\n\nTrack PM dates in Equipment module. Set alerts 30 days before due.", author: "Prakash Tiwari", tags: "equipment,maintenance,pm,schedule", views: 19, helpful: 4, status: "Published" },
    ],
  });

  console.log("✅ KB Articles created.");

  // ============================================================
  // 29. CREATE FINANCE MODULE DATA
  // ============================================================
  console.log("💰 Creating Finance Module Data...");

  // Helper for prev months
  const prevMonth = (offset: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const m1 = prevMonth(5), m2 = prevMonth(4), m3 = prevMonth(3), m4 = prevMonth(2), m5 = prevMonth(1), m6 = currentMonth;

  // --- Ledger Accounts ---
  await db.ledgerAccount.createMany({
    data: [
      { accountCode: "1001", name: "Cash & Bank", group: "Current Assets", type: "Asset", balance: 4850000, status: "Active" },
      { accountCode: "1002", name: "Accounts Receivable", group: "Current Assets", type: "Asset", balance: 30000000, status: "Active" },
      { accountCode: "1003", name: "Inventory - Materials", group: "Current Assets", type: "Asset", balance: 12500000, status: "Active" },
      { accountCode: "1004", name: "Work in Progress", group: "Current Assets", type: "Asset", balance: 8500000, status: "Active" },
      { accountCode: "2001", name: "Accounts Payable", group: "Current Liabilities", type: "Liability", balance: 22000000, status: "Active" },
      { accountCode: "2002", name: "PF Payable", group: "Current Liabilities", type: "Liability", balance: 29040, status: "Active" },
      { accountCode: "2003", name: "ESI Payable", group: "Current Liabilities", type: "Liability", balance: 480, status: "Active" },
      { accountCode: "2004", name: "TDS Payable", group: "Current Liabilities", type: "Liability", balance: 26700, status: "Active" },
      { accountCode: "2005", name: "GST Payable", group: "Current Liabilities", type: "Liability", balance: 4500000, status: "Active" },
      { accountCode: "3001", name: "Share Capital", group: "Equity", type: "Equity", balance: 50000000, status: "Active" },
      { accountCode: "3002", name: "Retained Earnings", group: "Equity", type: "Equity", balance: 18500000, status: "Active" },
      { accountCode: "4001", name: "Project Revenue", group: "Income", type: "Revenue", balance: 0, status: "Active" },
      { accountCode: "5001", name: "Salaries & Wages", group: "Direct Costs", type: "Expense", balance: 0, status: "Active" },
      { accountCode: "5002", name: "Materials & Consumables", group: "Direct Costs", type: "Expense", balance: 0, status: "Active" },
      { accountCode: "5003", name: "Subcontractor Costs", group: "Direct Costs", type: "Expense", balance: 0, status: "Active" },
      { accountCode: "5004", name: "Plant & Machinery", group: "Overheads", type: "Expense", balance: 0, status: "Active" },
      { accountCode: "5005", name: "Site Overheads", group: "Overheads", type: "Expense", balance: 0, status: "Active" },
      { accountCode: "5006", name: "Administration", group: "Overheads", type: "Expense", balance: 0, status: "Active" },
    ],
  });

  // --- Bank Accounts ---
  await db.bankAccount.createMany({
    data: [
      { accountName: "HDFC Current Account", bankName: "HDFC Bank Ltd.", accountNo: "HDFC-2025-1048273615", type: "Current", balance: 3250000, status: "Active" },
      { accountName: "SBI Savings Account", bankName: "State Bank of India", accountNo: "SBIN-2025-3847261935", type: "Savings", balance: 1875000, status: "Active" },
      { accountName: "Cash in Hand", bankName: "On-site Cash", accountNo: "CASH-HO-001", type: "Cash", balance: 250000, status: "Active" },
      { accountName: "Petty Cash", bankName: "Office Petty Cash", accountNo: "PETTY-001", type: "Cash", balance: 50000, status: "Active" },
      { accountName: "ICICI Overdraft Facility", bankName: "ICICI Bank Ltd.", accountNo: "ICICI-OD-2025-7482910", type: "OD", balance: 750000, status: "Active" },
      { accountName: "Axis Term Deposit", bankName: "Axis Bank Ltd.", accountNo: "AXIS-TD-2025-927365", type: "FD", balance: 5000000, status: "Active" },
    ],
  });

  // --- Accounts Payable ---
  await db.accountsPayable.createMany({
    data: [
      { billNo: "AP-2025-001", vendor: "Bhel Industrial Supplies, Bhopal", description: "Steel plates - 3rd lot delivery", amount: 3750000, dueDate: `${currentYear}-08-15`, paidDate: `${currentYear}-07-10`, status: "Paid" },
      { billNo: "AP-2025-002", vendor: "Godrej & Boyce Mfg Co., Mumbai", description: "Structural steel ISMC 200 - partial delivery", amount: 5400000, dueDate: `${currentYear}-09-30`, paidDate: null, status: "Pending" },
      { billNo: "AP-2025-003", vendor: "KRBL Safety Equipments, Delhi", description: "PPE items - batch delivery", amount: 750000, dueDate: `${currentYear}-07-25`, paidDate: null, status: "Overdue" },
      { billNo: "AP-2025-004", vendor: "SolarEdge Technologies India, Gurugram", description: "String inverters - advance payment", amount: 4375000, dueDate: `${currentYear}-10-01`, paidDate: null, status: "Pending" },
      { billNo: "AP-2025-005", vendor: "Siemens Limited India, Chennai", description: "VCB panels - milestone 1", amount: 12000000, dueDate: `${currentYear}-11-15`, paidDate: null, status: "Pending" },
      { billNo: "AP-2025-006", vendor: "Tata Steel Ltd., Jamshedpur", description: "Hot rolled steel coils", amount: 2800000, dueDate: `${currentYear}-07-05`, paidDate: `${currentYear}-07-01`, status: "Paid" },
      { billNo: "AP-2025-007", vendor: "Shree Krishna Scaffolding Works", description: "Scaffolding rental - July", amount: 385000, dueDate: `${currentYear}-07-31`, paidDate: null, status: "Pending" },
    ],
  });

  // --- Accounts Receivable ---
  await db.accountsReceivable.createMany({
    data: [
      { invoiceNo: "AR-2025-001", client: "NTPC Limited", description: "Singrauli Unit-5 boiler work - Milestone 3", amount: 124500000, dueDate: `${currentYear}-07-31`, receivedDate: null, status: "Pending" },
      { invoiceNo: "AR-2025-002", client: "Solar Energy Corporation of India", description: "Jaisalmer O&M - quarterly billing", amount: 32000000, dueDate: `${currentYear}-07-25`, receivedDate: `${currentYear}-07-20`, status: "Received" },
      { invoiceNo: "AR-2025-003", client: "Uttarakhand Jal Vidyut Nigam Ltd.", description: "Uttarkashi hydro - tunnel excavation", amount: 87500000, dueDate: `${currentYear}-08-05`, receivedDate: null, status: "Pending" },
      { invoiceNo: "AR-2025-004", client: "Gujarat Industries Power Company Ltd.", description: "Mundra BoP - civil works milestone", amount: 56000000, dueDate: `${currentYear}-08-10`, receivedDate: null, status: "Pending" },
      { invoiceNo: "AR-2025-005", client: "NTPC Limited", description: "Singrauli Unit-5 - advance recovery", amount: 48750000, dueDate: `${currentYear}-06-30`, receivedDate: `${currentYear}-06-28`, status: "Received" },
      { invoiceNo: "AR-2025-006", client: "Bihar State Electricity Board", description: "Chennai TG Island - mobilization advance", amount: 9560000, dueDate: `${currentYear}-08-30`, receivedDate: null, status: "Pending" },
    ],
  });

  // --- Budget Items ---
  await db.budgetItem.createMany({
    data: [
      { category: "Salaries & Wages", description: "Monthly payroll for all staff and contract employees", planned: 4200000, actual: 3890000, period: m6, status: "On Track" },
      { category: "Materials & Consumables", description: "Steel, welding consumables, electrical items", planned: 6500000, actual: 7200000, period: m6, status: "Over Budget" },
      { category: "Subcontractor Costs", description: "Scaffolding, civil, welding subcontractors", planned: 2800000, actual: 2650000, period: m6, status: "On Track" },
      { category: "Plant & Machinery", description: "Crane hire, equipment maintenance, fuel", planned: 1800000, actual: 1750000, period: m6, status: "On Track" },
      { category: "Site Overheads", description: "Power, water, camp maintenance, transport", planned: 950000, actual: 890000, period: m6, status: "On Track" },
      { category: "Administration", description: "Office rent, IT, travel, communication", planned: 450000, actual: 420000, period: m6, status: "On Track" },
      { category: "Safety & Training", description: "PPE, safety training, certifications", planned: 350000, actual: 380000, period: m6, status: "Over Budget" },
      { category: "Contingency", description: "10% project contingency reserve", planned: 1750000, actual: 200000, period: m6, status: "On Track" },
    ],
  });

  // --- Tax Records ---
  await db.taxRecord.createMany({
    data: [
      { taxType: "GST (CGST + SGST)", period: m6, amount: 2250000, dueDate: `${currentYear}-07-20`, paidDate: `${currentYear}-07-18`, status: "Paid" },
      { taxType: "GST (CGST + SGST)", period: m5, amount: 1980000, dueDate: `${currentYear}-06-20`, paidDate: `${currentYear}-06-19`, status: "Paid" },
      { taxType: "TDS - Salaries", period: m6, amount: 26700, dueDate: `${currentYear}-07-31`, paidDate: null, status: "Pending" },
      { taxType: "TDS - Contractors", period: m6, amount: 54000, dueDate: `${currentYear}-07-31`, paidDate: null, status: "Pending" },
      { taxType: "Professional Tax", period: m6, amount: 9750, dueDate: `${currentYear}-07-31`, paidDate: null, status: "Pending" },
      { taxType: "PF Contribution", period: m6, amount: 29040, dueDate: `${currentYear}-07-15`, paidDate: `${currentYear}-07-14`, status: "Paid" },
    ],
  });

  // --- Journal Entries (recent transactions for table display) ---
  await db.journalEntry.createMany({
    data: [
      { entryNo: "JE-2025-001", date: `${currentYear}-07-15`, account: "Cash & Bank", debit: 32000000, credit: 0, description: "AR received - SECI Jaisalmer O&M billing", reference: "AR-2025-002", status: "Posted" },
      { entryNo: "JE-2025-002", date: `${currentYear}-07-14`, account: "Cash & Bank", debit: 0, credit: 3750000, description: "Payment to Bhel Industrial - steel plates", reference: "AP-2025-001", status: "Posted" },
      { entryNo: "JE-2025-003", date: `${currentYear}-07-12`, account: "Materials & Consumables", debit: 2800000, credit: 0, description: "Purchase of hot rolled steel coils from Tata Steel", reference: "PO-2025-006", status: "Posted" },
      { entryNo: "JE-2025-004", date: `${currentYear}-07-10`, account: "Salaries & Wages", debit: 266180, credit: 0, description: "Monthly payroll processing - net pay disbursement", reference: `PAY-${m6}`, status: "Posted" },
      { entryNo: "JE-2025-005", date: `${currentYear}-07-08`, account: "Cash & Bank", debit: 0, credit: 890000, description: "Site overheads - power, water, transport for all sites", reference: "SOH-JUL", status: "Posted" },
      { entryNo: "JE-2025-006", date: `${currentYear}-07-05`, account: "PF Payable", debit: 29040, credit: 0, description: "PF contribution payment for current month", reference: "PF-JUL", status: "Posted" },
      { entryNo: "JE-2025-007", date: `${currentYear}-07-03`, account: "Subcontractor Costs", debit: 385000, credit: 0, description: "Scaffolding rental payment - Shree Krishna Works", reference: "AP-2025-007", status: "Posted" },
      { entryNo: "JE-2025-008", date: `${currentYear}-07-01`, account: "Cash & Bank", debit: 0, credit: 2250000, description: "GST payment - CGST + SGST for June", reference: "GST-JUN", status: "Posted" },
      { entryNo: "JE-2025-009", date: `${currentYear}-06-28`, account: "Cash & Bank", debit: 48750000, credit: 0, description: "AR received - NTPC Singrauli advance recovery", reference: "AR-2025-005", status: "Posted" },
      { entryNo: "JE-2025-010", date: `${currentYear}-06-25`, account: "Plant & Machinery", debit: 450000, credit: 0, description: "DG set monthly service - Cummins service contract", reference: "EQ-SVC-JUN", status: "Posted" },
      { entryNo: "JE-2025-011", date: `${currentYear}-06-20`, account: "Insurance", debit: 185000, credit: 0, description: "Workmen compensation insurance premium renewal", reference: "INS-2025-WC", status: "Posted" },
      { entryNo: "JE-2025-012", date: `${currentYear}-06-15`, account: "Travel & Transport", debit: 67500, credit: 0, description: "Site mobilisation transport - equipment shifting to Chennai", reference: "TRP-CHN-001", status: "Draft" },
      { entryNo: "JE-2025-013", date: `${currentYear}-06-10`, account: "Depreciation", debit: 0, credit: 95000, description: "Monthly depreciation - Tower crane, cranes, welding sets", reference: "DEPR-JUN", status: "Posted" },
      { entryNo: "JE-2025-014", date: `${currentYear}-06-05`, account: "Cash & Bank", debit: 0, credit: 154000, description: "Tata Steel partial advance payment for HR coils", reference: "AP-2025-006-ADV", status: "Posted" },
    ],
  });

  console.log("✅ Finance Module Data created.");

  // ============================================================
  // SEEDING COMPLETE
  // ============================================================
  console.log("🎉 Seed completed successfully!");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await db.$disconnect();
    process.exit(1);
  });
