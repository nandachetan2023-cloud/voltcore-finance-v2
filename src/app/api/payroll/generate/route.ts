import { getDbForRequest } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { PayrollCalculator } from '@/lib/services/payroll-calculator';
import { getHolidaysInRange } from '@/lib/services/holiday-service';
import { calculateTotalOvertimeHours } from '@/lib/services/overtime-calculator';
import { getActiveShiftAssignment } from '@/lib/services/attendance-rule-service';

export const dynamic = 'force-dynamic';

interface GeneratePayrollRequest {
  mode: 'single' | 'bulk';
  month: number;
  year: number;
  employeeId?: number;
  employeeIds?: number[];
  filters?: {
    departmentId?: number;
    designationId?: number;
    branchId?: number;
    employmentType?: string;
  };
}

export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body: GeneratePayrollRequest = await request.json();
    const { mode, month, year, employeeId, employeeIds, filters } = body;

    // Validation
    if (!mode || !month || !year) {
      return NextResponse.json(
        { success: false, error: 'mode, month, and year are required' },
        { status: 400 }
      );
    }

    if (mode === 'single' && !employeeId) {
      return NextResponse.json(
        { success: false, error: 'employeeId is required for single mode' },
        { status: 400 }
      );
    }

    // Get employees to process
    let employees: any[] = [];

    if (mode === 'single') {
      const emp = await db.employee.findUnique({
        where: { id: employeeId },
        include: {
          Department: true,
          Designation: true,
          Branch: true,
        },
      });
      if (!emp) {
        return NextResponse.json(
          { success: false, error: 'Employee not found' },
          { status: 404 }
        );
      }
      employees = [emp];
    } else {
      // Bulk mode
      const where: any = { isActive: true, isDeleted: false };

      if (employeeIds && employeeIds.length > 0) {
        where.id = { in: employeeIds };
      } else if (filters) {
        if (filters.departmentId) where.departmentId = filters.departmentId;
        if (filters.designationId) where.designationId = filters.designationId;
        if (filters.branchId) where.branchId = filters.branchId;
        if (filters.employmentType) where.employmentType = filters.employmentType;
      }

      employees = await db.employee.findMany({
        where,
        include: {
          Department: true,
          Designation: true,
          Branch: true,
        },
      });
    }

    if (employees.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No employees found matching criteria' },
        { status: 404 }
      );
    }

    // Create payroll run
    const payrollRun = await db.payrollRun.create({
      data: {
        name: `Payroll - ${getMonthName(month)} ${year}`,
        month,
        year,
        status: 'processing',
        totalEmployees: employees.length,
        totalGross: 0,
        totalNet: 0,
      },
    });

    const calculator = new PayrollCalculator();
    const errors: Array<{ employeeId: number; error: string }> = [];
    let totalGross = 0;
    let totalNet = 0;

    // Process each employee
    for (const employee of employees) {
      try {
        // ── Shift guard: skip employees without an active shift ──
        const payrollDate = new Date(year, month - 1, 1)
        const shiftAssignment = await getActiveShiftAssignment(employee.id, payrollDate, db)
        if (!shiftAssignment) {
          errors.push({ employeeId: employee.id, error: 'Skipped: no active shift assignment. Assign a shift to include in payroll.' })
          continue
        }

        // Check for duplicate
        const existing = await db.payrollItem.findFirst({
          where: {
            employeeId: employee.id,
            payrollRunId: payrollRun.id,
          },
        });

        if (existing) {
          errors.push({
            employeeId: employee.id,
            error: 'Payroll already exists for this period',
          });
          continue;
        }

        // Get attendance data for the month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        // Get holidays for the month
        const holidays = await getHolidaysInRange(startDate, endDate, employee.branchId);
        const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]));

        const attendanceLogs = await db.attendanceLog.findMany({
          where: {
            employeeId: employee.id,
            logDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        // Calculate attendance (excluding holidays)
        const presentDays = attendanceLogs.filter(log =>
          ['present', 'late', 'half_day'].includes(log.status)
        ).length;

        // Sum attendance fines for the period
        const totalAttendanceFines = attendanceLogs.reduce(
          (sum, log) => sum + Number(log.fineAmount || 0), 0
        );
        
        // Get paid leave days
        const leaveRequests = await db.leaveRequest.findMany({
          where: {
            employeeId: employee.id,
            status: 'approved',
            fromDate: { lte: endDate },
            toDate: { gte: startDate },
          },
        });

        let paidLeaveDays = 0;
        for (const leave of leaveRequests) {
          const leaveStart = new Date(Math.max(leave.fromDate.getTime(), startDate.getTime()));
          const leaveEnd = new Date(Math.min(leave.toDate.getTime(), endDate.getTime()));
          const days = Math.ceil((leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          paidLeaveDays += days;
        }

        // Get approved tour days (count as paid attendance)
        const tourRequests = await db.tourRequest.findMany({
          where: {
            employeeId: employee.id,
            status: 'approved',
            isDeleted: false,
            fromDate: { lte: endDate },
            toDate: { gte: startDate },
          },
        });

        for (const tour of tourRequests) {
          const tourStart = new Date(Math.max(tour.fromDate.getTime(), startDate.getTime()));
          const tourEnd = new Date(Math.min(tour.toDate.getTime(), endDate.getTime()));
          const days = Math.ceil((tourEnd.getTime() - tourStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          paidLeaveDays += days; // Tour days count as paid days (same as leave)
        }

        // Calculate OT hours — driven by the employee's shift (net working hours
        // + OT threshold). Holiday work counts fully as OT. Falls back to 8h if
        // the shift is somehow missing.
        const totalOTHours = await calculateTotalOvertimeHours(
          attendanceLogs.map(log => ({
            punchIn: log.punchIn,
            punchOut: log.punchOut,
            logDate: log.logDate
          })),
          employee.branchId,
          shiftAssignment.Shift, // shift-driven OT config
        );

        // Get salary structure (for now, use basic values from employee or defaults)
        // In production, fetch from SalaryStructureAssignment
        const basicSalary = 15000; // Default, should come from salary structure
        const hra = basicSalary * 0.4;

        const attendanceData = {
          totalDays: endDate.getDate(),
          presentDays,
          paidLeaveDays,
          weeklyOffs: 4, // Approximate
          holidays: holidays.length, // Include actual holiday count
          lopDays: 0,
          totalHours: presentDays * 8,
        };

        const payrollItem = calculator.calculateSalary(
          {
            id: employee.id,
            basicSalary,
            hra,
            conveyanceAllowance: 1600,
            medicalAllowance: 1250,
            specialAllowance: 2000,
            state: 'Maharashtra',
          },
          attendanceData,
          month,
          year,
          totalOTHours,
          0, // TDS
          totalAttendanceFines  // Attendance rule fines as other deductions
        );

        // Create payroll item
        await db.payrollItem.create({
          data: {
            payrollRunId: payrollRun.id,
            employeeId: employee.id,
            workingDays: payrollItem.workingDays,
            presentDays: payrollItem.presentDays,
            paidLeaveDays: payrollItem.paidLeaveDays,
            lopDays: payrollItem.lopDays,
            otHours: payrollItem.otHours,
            basicSalary: payrollItem.basicSalary,
            hra: payrollItem.hra,
            conveyanceAllowance: payrollItem.conveyanceAllowance,
            medicalAllowance: payrollItem.medicalAllowance,
            specialAllowance: payrollItem.specialAllowance,
            otAmount: payrollItem.otAmount,
            grossEarning: payrollItem.grossEarnings,
            pfDeduction: payrollItem.pfDeduction,
            esiDeduction: payrollItem.esiDeduction,
            ptDeduction: payrollItem.ptDeduction,
            tdsDeduction: payrollItem.tdsDeduction,
            lopDeduction: payrollItem.lopDeduction,
            otherDeductions: payrollItem.otherDeductions,
            totalDeduction: payrollItem.totalDeductions,
            netPay: payrollItem.netSalary,
            status: 'pending',
            payslipGenerated: false,
            details: payrollItem.details,
          },
        });

        totalGross += payrollItem.grossEarnings;
        totalNet += payrollItem.netSalary;
      } catch (error) {
        console.error(`Error processing employee ${employee.id}:`, error);
        errors.push({
          employeeId: employee.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Update payroll run with totals
    await db.payrollRun.update({
      where: { id: payrollRun.id },
      data: {
        status: errors.length === employees.length ? 'failed' : 'completed',
        totalGross,
        totalNet,
        processedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        payrollRunId: payrollRun.id,
        itemsCreated: employees.length - errors.length,
        totalEmployees: employees.length,
        errors,
      },
    });
  } catch (error) {
    console.error('Error generating payroll:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate payroll' },
      { status: 500 }
    );
  }
}

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
}
