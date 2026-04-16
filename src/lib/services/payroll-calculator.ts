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

    // Professional Tax (state-specific)
    const ptConfig = this.config.professionalTax.find(pt => pt.state === state);
    const ptDeduction = ptConfig ? ptConfig.amount : 0;

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
    
    return {
      company: {
        name: company.name || 'Upasana Associate',
        address: company.address || 'Flat No. G+1/3, Vinayakpuram, In front of MME Ground, Jharsuguda, Odisha-768201',
        principalEmployer: company.principalEmployer || 'Hindalco Industries Ltd., Lapanga, Sambalpur-768212',
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
        basicSalary: payrollItem.basicSalary,
        hra: payrollItem.hra,
        siteAllowance: payrollItem.conveyanceAllowance,
        travelAllowance: payrollItem.medicalAllowance,
        specialAllowance: payrollItem.specialAllowance,
        attendanceAllowance: 0,
        overtime: payrollItem.otAmount,
        phAmount: 0,
        total: payrollItem.grossEarnings,
      },
      deductions: {
        pf: payrollItem.pfDeduction,
        esi: payrollItem.esiDeduction,
        pt: payrollItem.ptDeduction,
        advance: payrollItem.otherDeductions,
        other: 0,
        total: payrollItem.totalDeductions,
      },
      attendance: {
        workingDays: payrollItem.workingDays,
        presentDays: payrollItem.presentDays,
      },
      netSalary: payrollItem.netSalary,
    };
  }
}
