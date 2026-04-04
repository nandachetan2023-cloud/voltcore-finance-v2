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
  await db.companySettings.deleteMany();

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
