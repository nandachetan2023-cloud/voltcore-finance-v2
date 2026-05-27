import { getDbForRequest } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'non-compliance';
    const month = parseInt(searchParams.get('month') || '1');
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const departmentId = searchParams.get('departmentId');
    const designationId = searchParams.get('designationId');
    const branchId = searchParams.get('branchId');
    const employeeId = searchParams.get('employeeId');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Build where clause for employee filtering
    const employeeWhere: any = {};
    if (departmentId) employeeWhere.departmentId = parseInt(departmentId);
    if (designationId) employeeWhere.designationId = parseInt(designationId);
    if (branchId) employeeWhere.branchId = parseInt(branchId);
    if (employeeId) employeeWhere.id = parseInt(employeeId);
    if (!includeInactive) employeeWhere.employmentStatus = 'active';

    // Fetch employees with their salary structures and attendance
    const employees = await db.employee.findMany({
      where: employeeWhere,
      include: {
        Department: true,
        Designation: true,
        Branch: true,
        Grade: true,
        SalaryStructureAssignment: {
          where: {
            effectiveFrom: {
              lte: new Date(year, month - 1, 1),
            },
          },
          orderBy: {
            effectiveFrom: 'desc',
          },
          include: {
            SalaryStructure: {
              include: {
                SalaryStructureItem: {
                  include: {
                    SalaryComponent: true,
                  },
                },
              },
            },
          },
          take: 1,
        },
      },
      orderBy: [
        { Department: { name: 'asc' } },
        { employeeCode: 'asc' },
      ],
    });

    if (employees.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No employees found matching the filters' },
        { status: 404 }
      );
    }

    // Get attendance data for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const attendanceData = await db.attendanceLog.groupBy({
      by: ['employeeId'],
      where: {
        employeeId: { in: employees.map(e => e.id) },
        logDate: {
          gte: startDate,
          lte: endDate,
        },
        status: { in: ['present', 'half-day'] },
      },
      _count: {
        id: true,
      },
    });

    const attendanceMap = new Map(
      attendanceData.map(a => [a.employeeId, a._count?.id || 0])
    );

    // Calculate working days for the month
    const workingDays = endDate.getDate(); // Total days in month (simplified)

    // Fetch approved advances for the month
    const advanceData = await db.employeeRequest.findMany({
      where: {
        employeeId: { in: employees.map(e => e.id) },
        requestType: 'advance_payment',
        status: 'approved',
        approvedDate: {
          gte: startDate,
          lte: endDate,
        },
        isDeleted: false,
      },
      select: {
        employeeId: true,
        amount: true,
        approvedAmount: true,
      },
    });

    // Sum per employee: use approvedAmount if set, else amount
    const advanceMap = new Map<number, number>();
    advanceData.forEach(a => {
      const effectiveAmount = a.approvedAmount !== null
        ? parseFloat(a.approvedAmount.toString())
        : (a.amount ? parseFloat(a.amount.toString()) : 0);
      advanceMap.set(a.employeeId, (advanceMap.get(a.employeeId) || 0) + effectiveAmount);
    });

    // Generate Excel based on format
    const workbook = XLSX.utils.book_new();
    const sheetData: any[] = [];
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    if (format === 'compliance') {
      // Compliance Format - FORM XVII/XIII (24 columns) matching compliance_example.xlsx
      
      // Add title rows
      sheetData.push(['FORM NUMBER.XVII/XIII']);
      sheetData.push(['[See Rule78(1)(a)(1) of the C.L(R&A)(CENTRAL RULES 1971]']);
      sheetData.push(['  [See Rule72(2)(a) of the C.L(R&A)(ORISSA RULES 1975]']);
      sheetData.push(['REGISTER OF WAGES']);
      sheetData.push([`FOR THE MONTH OF:- ${monthNames[month - 1]}-${year}`]);
      sheetData.push(['Name & Address of the contractor:-']);
      sheetData.push(['Name & Address of the contractor:-']);
      sheetData.push(['AT HOUSE NO-G1/3 BINAYAKPURAM OPPOSITE OF MANMOHAN M.E. SCHOOL JHARSUGUDA']);
      sheetData.push(['Nature & location of work:- MECHANICAL JOB, GAP']);
      
      // Column headers (Row 10) — SL NO. first, EMPLOYEE ID second, then 24 compliance cols
      sheetData.push([
        'Sl. No.',
        'Employee ID',
        'Name of the workman',
        'Site',
        'UAN',
        'IP NO.',
        'Designation',
        'TOTAL NO OF DAYS WORKED',
        'O.Thours',
        'no.of work done',
        'daily rate of wages/piece rate/monthly',
        'Basic wages in Rs',
        'Dearness allowances   in Rs',
        'Overtime  in Rs',
        'Othercash payment   in Rs',
        'TOTAL WAGES FOR ESI DEDUCTION(TNP)',
        'E.P.F in Rs',
        'E.S.I in Rs',
        'House rent in Rs',
        'Other deduction in Rs(PT)',
        'Total deduction in Rs',
        'Net amount paid in Rs',
        'Time&date of payment',
        'Place of payment',
        'Signature or thumb Impression of  workmen',
      ]);

      // Data rows
      employees.forEach((employee, index) => {
        const fullName = `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.trim().toUpperCase();
        
        // Get salary structure
        const salaryAssignment = employee.SalaryStructureAssignment[0];
        let basicSalary = 0;
        let hra = 0;
        let conveyance = 0;
        let medical = 0;
        let special = 0;
        
        if (salaryAssignment) {
          const items = salaryAssignment.SalaryStructure.SalaryStructureItem;
          items.forEach(item => {
            const amount = Number(item.fixedAmount) || 0;
            const componentName = item.SalaryComponent.name.toLowerCase();
            
            if (componentName.includes('basic')) basicSalary = amount;
            else if (componentName.includes('hra') || componentName.includes('house')) hra = amount;
            else if (componentName.includes('conveyance') || componentName.includes('transport')) conveyance = amount;
            else if (componentName.includes('medical')) medical = amount;
            else if (componentName.includes('special')) special = amount;
          });
        }
        
        // Get attendance
        const presentDays = attendanceMap.get(employee.id) || 0;
        const otHours = 0; // Can be enhanced to fetch from attendance
        const otAmount = 0;
        
        // Calculate
        const dailyRate = basicSalary / workingDays;
        const dearnessAllowance = hra + conveyance + medical + special;
        const otherCashPayment = 0;
        const totalWagesForESI = basicSalary + dearnessAllowance + otAmount + otherCashPayment;
        
        // Deductions (simplified - can be enhanced)
        const pfDeduction = basicSalary * 0.12; // 12% of basic
        const esiDeduction = totalWagesForESI * 0.0075; // 0.75% of gross
        const ptDeduction = 200; // Fixed PT
        const totalDeduction = pfDeduction + esiDeduction + ptDeduction;
        const netPay = totalWagesForESI - totalDeduction;

        sheetData.push([
          index + 1,                    // Sl. No.
          employee.employeeCode,        // Employee ID
          fullName,                     // Name of the workman
          employee.Branch?.name || 'N/A', // Site
          employee.uanNumber || '',
          employee.esicNumber || '',
          employee.Designation?.name || '',
          presentDays,
          otHours,
          '',
          Math.round(dailyRate * 100) / 100,
          basicSalary,
          dearnessAllowance,
          otAmount,
          otherCashPayment,
          totalWagesForESI,
          Math.round(pfDeduction * 100) / 100,
          Math.round(esiDeduction * 100) / 100,
          hra,
          ptDeduction,
          Math.round(totalDeduction * 100) / 100,
          Math.round(netPay * 100) / 100,
          '',
          '',
          '',
        ]);
      });
    } else {
      // Non-Compliance Format - Detailed 69-column format (SL NO. + EMPLOYEE ID + 67 cols)
      sheetData.push([
        'SL NO.',
        'EMPLOYEE ID',
        'WORKMEN SL. NO.',
        'TOKEN NO.',
        'NAME OF EMPLOYEE',
        "FATHER'S NAME",
        'DOJ',
        'DOB',
        'BANK NAME',
        'ACCOUNT NO.',
        'IFSC CODE NO.',
        '',
        'UAN NO.',
        'ESIC IP NO',
        'DESIGNATION',
        'DEPARTMENT',
        'NATURE OF DESIGNATION',
        'MONTHLY GROSS SALARY',
        'ACTUAL ATTENDANCE',
        'LEAVE DAYS',
        'PH DAYS',
        'ACTUAL EARN WAGES',
        'ACTUAL OT HRS',
        'ACTUAL OT AMOUNT',
        'GROSS EARN WAGES',
        'BASIC WAGES/DAY',
        'MONTHLY WORKING DAYS',
        'OT. HRS',
        'ATTENDANCE',
        'PH',
        'WAGES/MONTH',
        'EARN WAGES',
        'PH AMOUNT',
        'TOTAL EARN WAGES',
        'OT HRS PAYMENT',
        'TOTAL NETT PAYBLE',
        'EPF',
        'ESIC',
        'PT',
        'TOTAL DEDUCTION',
        'NETT PAYBLE',
        'EMPLOYEE SIGNATURE/THUMB IMPRESSION ',
        '',
        '',
        'TOTAL NON COMPLIANCE AMOUNT',
        'ADVANCE',
        'AREEARS',
        'NETT PAYBLE NON COMPLIANCE',
        'GRAND TOTAL NETT PAYBLE SALARY',
        '',
        'LEAVE',
        'BONUS',
        '',
        '',
        '',
        'MONTHLY BASIC SALARY',
        'PH AMOUNT',
        'OT AMOUNT',
        'EARN SALARY',
        'MONTHLY House Rent Allow.',
        'Monthly Site Allow.',
        'Monthly Leave Travel Allow.',
        'Monthly Special Allow.',
        'MonthlyAttendence Allow.',
        'TOTAL SALARY',
        'EPF',
        'ESIC',
        'TDS',
        'ADVANCE',
      ]);

      employees.forEach((employee, index) => {
        const fullName = `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.trim().toUpperCase();
        
        // Get salary structure
        const salaryAssignment = employee.SalaryStructureAssignment[0];
        let basicSalary = 0;
        let hra = 0;
        let conveyance = 0;
        let medical = 0;
        let special = 0;
        
        if (salaryAssignment) {
          const items = salaryAssignment.SalaryStructure.SalaryStructureItem;
          items.forEach(item => {
            const amount = Number(item.fixedAmount) || 0;
            const componentName = item.SalaryComponent.name.toLowerCase();
            
            if (componentName.includes('basic')) basicSalary = amount;
            else if (componentName.includes('hra') || componentName.includes('house')) hra = amount;
            else if (componentName.includes('conveyance') || componentName.includes('transport')) conveyance = amount;
            else if (componentName.includes('medical')) medical = amount;
            else if (componentName.includes('special')) special = amount;
          });
        }
        
        const presentDays = attendanceMap.get(employee.id) || 0;
        const otHours = 0;
        const otAmount = 0;
        const phAmount = 0;
        const phDays = 0;
        const grossEarnings = basicSalary + hra + conveyance + medical + special;
        
        // Deductions
        const pfDeduction = basicSalary * 0.12;
        const esiDeduction = grossEarnings * 0.0075;
        const ptDeduction = 200;
        const tdsDeduction = 0;
        const totalDeduction = pfDeduction + esiDeduction + ptDeduction + tdsDeduction;
        const netPay = grossEarnings - totalDeduction;
        const advance = advanceMap.get(employee.id) || 0;

        const basicPerDay = basicSalary / workingDays;
        const earnWages = (presentDays / workingDays) * basicSalary;
        const totalEarnWages = earnWages + phAmount;
        const totalNettPayable = totalEarnWages + otAmount;
        const nettPayableAfterDeduction = totalNettPayable - totalDeduction;

        sheetData.push([
          index + 1,                    // SL NO.
          employee.employeeCode,        // EMPLOYEE ID
          index + 1,                    // WORKMEN SL. NO.
          employee.employeeCode,        // TOKEN NO.
          fullName,
          employee.fatherName || '',
          employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString('en-IN') : '',
          employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString('en-IN') : '',
          employee.bankName || 'BANDHAN BANK',
          employee.bankAccount || '',
          employee.bankIfsc || 'BDBL0001747',
          '',
          employee.uanNumber || '',
          employee.esicNumber || '',
          employee.Designation?.name || '',
          employee.Department?.name || '',
          'High Skilled',
          Math.round(grossEarnings * 100) / 100,
          presentDays,
          0,
          phDays,
          Math.round(earnWages * 100) / 100,
          otHours,
          otAmount,
          Math.round(grossEarnings * 100) / 100,
          Math.round(basicPerDay * 100) / 100,
          workingDays,
          otHours,
          presentDays,
          phDays,
          basicSalary,
          Math.round(earnWages * 100) / 100,
          phAmount,
          Math.round(totalEarnWages * 100) / 100,
          otAmount,
          Math.round(totalNettPayable * 100) / 100,
          Math.round(pfDeduction * 100) / 100,
          Math.round(esiDeduction * 100) / 100,
          ptDeduction,
          Math.round(totalDeduction * 100) / 100,
          Math.round(nettPayableAfterDeduction * 100) / 100,
          '',
          '',
          '',
          0,
          advance,
          0,
          Math.round(nettPayableAfterDeduction * 100) / 100,
          Math.round(nettPayableAfterDeduction * 100) / 100,
          '',
          0,
          0,
          '',
          '',
          '',
          basicSalary,
          phAmount,
          otAmount,
          Math.round(earnWages * 100) / 100,
          hra,
          conveyance,
          medical,
          special,
          0,
          Math.round(grossEarnings * 100) / 100,
          Math.round(pfDeduction * 100) / 100,
          Math.round(esiDeduction * 100) / 100,
          tdsDeduction,
          advance,
        ]);
      });
    }

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column widths based on format
    if (format === 'compliance') {
      const colWidths = [
        { wch: 8 },  // Sl. No.
        { wch: 14 }, // Employee ID
        { wch: 25 }, // Name
        { wch: 15 }, // Site
        { wch: 15 }, // UAN
        { wch: 15 }, // IP NO
        { wch: 20 }, // Designation
        { wch: 12 }, // Days worked
        { wch: 10 }, // OT hours
        { wch: 12 }, // Work done
        { wch: 15 }, // Daily rate
        { wch: 15 }, // Basic wages
        { wch: 15 }, // Dearness
        { wch: 12 }, // Overtime
        { wch: 15 }, // Other cash
        { wch: 18 }, // Total wages ESI
        { wch: 12 }, // EPF
        { wch: 12 }, // ESI
        { wch: 12 }, // House rent
        { wch: 12 }, // PT
        { wch: 15 }, // Total deduction
        { wch: 15 }, // Net amount
        { wch: 15 }, // Time & date
        { wch: 15 }, // Place
        { wch: 20 }, // Signature
      ];
      worksheet['!cols'] = colWidths;
    } else {
      // Non-compliance format column widths (69 cols)
      const colWidths = [
        { wch: 8 },  // SL NO
        { wch: 14 }, // EMPLOYEE ID
        { wch: 12 }, // WORKMEN SL NO
        { wch: 12 }, // TOKEN NO
        { wch: 25 }, // NAME
        { wch: 20 }, // FATHER'S NAME
        { wch: 12 }, // DOJ
        { wch: 12 }, // DOB
        { wch: 15 }, // BANK NAME
        { wch: 18 }, // ACCOUNT NO
        { wch: 15 }, // IFSC
      ];
      // Add remaining column widths (58 more columns)
      for (let i = 11; i < 69; i++) {
        colWidths.push({ wch: 12 });
      }
      worksheet['!cols'] = colWidths;
    }

    // Add worksheet to workbook
    const sheetName = format === 'compliance' ? 'REGISTER OF WAGES' : 'NON-COMPLIANCE SALARY SHEET';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const formatType = format === 'compliance' ? 'Compliance' : 'NonCompliance';
    const filename = `Payroll_${formatType}_${monthNames[month - 1]}_${year}.xlsx`;

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating payroll Excel:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate payroll Excel' },
      { status: 500 }
    );
  }
}
