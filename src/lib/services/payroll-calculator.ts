// Payroll Calculation Service
// Handles all salary calculations, deductions, and attendance-based computations

export interface SalaryConfig {
  hraPercentage: number;
  pfRate: number;
  esiEmployeeRate: number;
  esiEmployerRate: number;
  esiGrossLimit: number;
  pfBasicLimit: number;
  otMultiplier: number;
  workingDaysPerMonth: number;
  standardHoursPerDay: number;
  professionalTax: { state: string; amount: number }[];
}

export interface AttendanceData {
  totalDays: number;
  presentDays: number;
  paidLeaveDays: number;
  weeklyOffs: number;
  holidays: number;
  lopDays: number;
  totalHours: number;
}

export interface SalaryComponents {
  basicSalary: number;
  hra: number;
  conveyanceAllowance: number;
  medicalAllowance: number;
  specialAllowance: number;
  otherAllowances: number;
}

export interface Deductions {
  pfDeduction: number;
  esiDeduction: number;
  ptDeduction: number;
  tdsDeduction: number;
  lopDeduction: number;
  otherDeductions: number;
}

export interface OTCalculation {
  hours: number;
  amount: number;
}

export interface PayrollItem {
  employeeId: number;
  month: number;
  year: number;
  workingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  lopDays: number;
  otHours: number;
  basicSalary: number;
  hra: number;
  conveyanceAllowance: number;
  medicalAllowance: number;
  specialAllowance: number;
  attendanceAllowance: number;
  phAmount: number;
  otAmount: number;
  grossEarnings: number;
  pfDeduction: number;
  esiDeduction: number;
  ptDeduction: number;
  tdsDeduction: number;
  lopDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  details: any;
}

const DEFAULT_CONFIG: SalaryConfig = {
  hraPercentage: 40,
  pfRate: 12,
  esiEmployeeRate: 0.75,
  esiEmployerRate: 3.25,
  esiGrossLimit: 21000,
  pfBasicLimit: 15000,
  otMultiplier: 1.5,
  workingDaysPerMonth: 26,
  standardHoursPerDay: 8,
  professionalTax: [
    { state: 'Maharashtra', amount: 200 },
    { state: 'Karnataka', amount: 200 },
    { state: 'West Bengal', amount: 150 },
  ],
};

export class PayrollCalculator {
  private config: SalaryConfig;

  constructor(config?: Partial<SalaryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate overtime from attendance logs
   */
  calculateOT(attendanceLogs: Array<{ totalHours: number }>): OTCalculation {
    let totalOTHours = 0;

    for (const log of attendanceLogs) {
      const hours = log.totalHours || 0;
      const otHours = Math.max(0, hours - this.config.standardHoursPerDay);
      totalOTHours += otHours;
    }

    return {
      hours: totalOTHours,
      amount: 0, // Will be calculated based on basic salary
    };
  }

  /**
   * Calculate OT amount based on basic salary
   */
  calculateOTAmount(basicSalary: number, otHours: number): number {
    const perDayRate = basicSalary / this.config.workingDaysPerMonth;
    const perHourRate = perDayRate / this.config.standardHoursPerDay;
    const otRate = perHourRate * this.config.otMultiplier;
    return otHours * otRate;
  }

  /**
   * Calculate LOP (Loss of Pay) deduction
   */
  calculateLOP(
    grossSalary: number,
    presentDays: number,
    paidLeaveDays: number,
    totalWorkingDays: number
  ): { lopDays: number; lopAmount: number } {
    const paidDays = presentDays + paidLeaveDays;
    const lopDays = Math.max(0, totalWorkingDays - paidDays);
    const perDayRate = grossSalary / this.config.workingDaysPerMonth;
    const lopAmount = lopDays * perDayRate;

    return { lopDays, lopAmount };
  }

  /**
   * Calculate all deductions
   */
  calculateDeductions(
    grossSalary: number,
    basicSalary: number,
    state: string = 'Maharashtra',
    tdsAmount: number = 0,
    otherDeductions: number = 0
  ): Deductions {
    // PF Calculation (12% of basic, applicable if basic <= limit or opted)
    const pfDeduction = basicSalary <= this.config.pfBasicLimit 
      ? (basicSalary * this.config.pfRate) / 100 
      : 0;

    // ESI Calculation (0.75% of gross, applicable if gross <= limit)
    const esiDeduction = grossSalary <= this.config.esiGrossLimit 
      ? (grossSalary * this.config.esiEmployeeRate) / 100 
      : 0;

    // Professional Tax — not deducted by the company
    const ptDeduction = 0;

    return {
      pfDeduction: Math.round(pfDeduction * 100) / 100,
      esiDeduction: Math.round(esiDeduction * 100) / 100,
      ptDeduction,
      tdsDeduction: tdsAmount,
      lopDeduction: 0, // Calculated separately
      otherDeductions,
    };
  }

  /**
   * Main salary calculation function
   */
  calculateSalary(
    employee: {
      id: number;
      basicSalary: number;
      hra?: number;
      conveyanceAllowance?: number;
      medicalAllowance?: number;
      specialAllowance?: number;
      state?: string;
    },
    attendance: AttendanceData,
    month: number,
    year: number,
    otHours: number = 0,
    tdsAmount: number = 0,
    otherDeductions: number = 0
  ): PayrollItem {
    // Calculate salary components
    const basicSalary = employee.basicSalary;
    const hra = employee.hra || (basicSalary * this.config.hraPercentage) / 100;
    const conveyanceAllowance = employee.conveyanceAllowance || 0;
    const medicalAllowance = employee.medicalAllowance || 0;
    const specialAllowance = employee.specialAllowance || 0;

    // Calculate OT amount
    const otAmount = this.calculateOTAmount(basicSalary, otHours);

    // Calculate gross earnings (before LOP)
    const grossEarnings =
      basicSalary +
      hra +
      conveyanceAllowance +
      medicalAllowance +
      specialAllowance +
      otAmount;

    // Calculate LOP
    const { lopDays, lopAmount } = this.calculateLOP(
      grossEarnings,
      attendance.presentDays,
      attendance.paidLeaveDays,
      this.config.workingDaysPerMonth
    );

    // Adjust gross for LOP
    const adjustedGross = grossEarnings - lopAmount;

    // Calculate deductions
    const deductions = this.calculateDeductions(
      adjustedGross,
      basicSalary,
      employee.state,
      tdsAmount,
      otherDeductions
    );

    // Total deductions
    const totalDeductions =
      deductions.pfDeduction +
      deductions.esiDeduction +
      deductions.ptDeduction +
      deductions.tdsDeduction +
      lopAmount +
      deductions.otherDeductions;

    // Net salary
    const netSalary = adjustedGross - totalDeductions;

    return {
      employeeId: employee.id,
      month,
      year,
      workingDays: this.config.workingDaysPerMonth,
      presentDays: attendance.presentDays,
      paidLeaveDays: attendance.paidLeaveDays,
      lopDays,
      otHours,
      basicSalary: Math.round(basicSalary * 100) / 100,
      hra: Math.round(hra * 100) / 100,
      conveyanceAllowance: Math.round(conveyanceAllowance * 100) / 100,
      medicalAllowance: Math.round(medicalAllowance * 100) / 100,
      specialAllowance: Math.round(specialAllowance * 100) / 100,
      attendanceAllowance: 0,
      phAmount: 0,
      otAmount: Math.round(otAmount * 100) / 100,
      grossEarnings: Math.round(grossEarnings * 100) / 100,
      pfDeduction: deductions.pfDeduction,
      esiDeduction: deductions.esiDeduction,
      ptDeduction: deductions.ptDeduction,
      tdsDeduction: deductions.tdsDeduction,
      lopDeduction: Math.round(lopAmount * 100) / 100,
      otherDeductions: deductions.otherDeductions,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netSalary: Math.round(netSalary * 100) / 100,
      details: {
        attendance,
        config: this.config,
        calculatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Generate payslip data structure for new format
   */
  generatePayslipData(payrollItem: PayrollItem, employee: any, company: any): any {
    const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    // The payslip must be OBEDIENT to the uploaded sheet — display the values the
    // user filled in, not recomputed ones. The import stores the parsed sheet in
    // details.rawData, so read from there; fall back to the DB fields only for
    // records imported before rawData capture.
    const raw = (payrollItem.details && typeof payrollItem.details === 'object'
      ? (payrollItem.details as Record<string, unknown>).rawData
      : null) as Record<string, number> | null;
    const rv = (key: string, fallback: number): number => {
      const n = raw ? Number(raw[key]) : NaN;
      return Number.isFinite(n) ? n : fallback;
    };

    // Earning lines (mirrors the reference payslip's 8 rows). conveyanceAllowance
    // holds the Site allowance and medicalAllowance holds the Travel allowance.
    const earn = {
      basicSalary: rv('monthlyBasicSalary', Number(payrollItem.basicSalary) || 0),
      hra: rv('monthlyHRA', Number(payrollItem.hra) || 0),
      siteAllowance: rv('monthlySiteAllow', Number(payrollItem.conveyanceAllowance) || 0),
      travelAllowance: rv('monthlyLTA', Number(payrollItem.medicalAllowance) || 0),
      specialAllowance: rv('monthlySpecialAllow', Number(payrollItem.specialAllowance) || 0),
      attendanceAllowance: rv('monthlyAttendanceAllow', Number(payrollItem.attendanceAllowance) || 0),
      overtime: rv('actualOtAmount', Number(payrollItem.otAmount) || 0),
      phAmount: rv('phAmount', Number(payrollItem.phAmount) || 0),
    };
    // Gross = the uploaded GROSS EARN WAGES / TOTAL SALARY (what the user filled),
    // not a re-sum of the split allowances (which round independently).
    const grossTotal = rv('grossEarnWages',
      rv('totalSalary',
        earn.basicSalary + earn.hra + earn.siteAllowance + earn.travelAllowance +
        earn.specialAllowance + earn.attendanceAllowance + earn.overtime + earn.phAmount));

    const ded = {
      pf: rv('epf', Number(payrollItem.pfDeduction) || 0),
      esi: rv('esic', Number(payrollItem.esiDeduction) || 0),
      pt: 0, // PT is not deducted by the company — kept at 0, not shown on the slip
      advance: rv('advance', Number(payrollItem.otherDeductions) || 0),
      other: 0,
    };
    const deductionTotal = ded.pf + ded.esi + ded.advance + ded.other;

    return {
      company: {
        name: company.name || 'Upasana Associate',
        address: company.address || 'UPASANA VILLA, KHATA NO-747/5139, PLOT NO-666/11857,\nINFRONT OF MAMTA MARBLE, BRUNDABAN COLONY,\nJHARSUGUDA, Jharsuguda, Odisha, 768203',
        principalEmployer: company.principalEmployer || 'Hindalco Industries Ltd., Lapanga, Sambalpur-768212',
        logo: company.logo || null,
      },
      employee: {
        code: employee.employeeCode,
        name: `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.trim(),
        department: employee.Department?.name || 'N/A',
        designation: employee.Designation?.name || 'N/A',
        dateOfJoining: employee.dateOfJoining,
        bankAccount: employee.bankAccount || 'N/A',
        bankName: employee.bankName || 'BANDHAN BANK',
        ifscCode: employee.bankIfsc || 'BDBL0001747',
        panNumber: employee.panNumber || 'N/A',
        uanNumber: employee.uanNumber || '0',
        epfNumber: employee.epfNumber || '0',
        esicNumber: employee.esicNumber || '0',
      },
      period: {
        month: payrollItem.month,
        year: payrollItem.year,
        monthName: `${MONTHS[payrollItem.month - 1]}-${payrollItem.year.toString().slice(-2)}`,
        dateOfPayment: '', // Can be set from company settings if needed
      },
      earnings: {
        basicSalary: earn.basicSalary,
        hra: earn.hra,
        siteAllowance: earn.siteAllowance,
        travelAllowance: earn.travelAllowance,
        specialAllowance: earn.specialAllowance,
        attendanceAllowance: earn.attendanceAllowance,
        overtime: earn.overtime,
        phAmount: earn.phAmount,
        // Gross = the uploaded GROSS EARN WAGES (user-entered), not a re-sum.
        total: grossTotal,
      },
      deductions: {
        pf: ded.pf,
        esi: ded.esi,
        pt: ded.pt,
        advance: ded.advance,
        other: ded.other,
        total: deductionTotal,
      },
      attendance: {
        workingDays: payrollItem.workingDays,
        presentDays: payrollItem.presentDays,
      },
      // Net Payable = Gross Earnings − Total Deductions, matching the reference
      // payslip layout (Net = B20 − E20). Arrears are NOT part of this slip.
      netSalary: grossTotal - deductionTotal,
    };
  }
}
