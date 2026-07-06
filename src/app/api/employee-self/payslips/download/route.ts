import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { PayslipGenerator } from '@/lib/services/payslip-generator'
import { PayrollCalculator } from '@/lib/services/payroll-calculator'
import { getTenantLogo } from '@/lib/tenant-branding'

export const dynamic = 'force-dynamic'

// Self-service payslip PDF download. Mirrors the admin generator
// (/api/payroll/generate-payslips) but scopes the lookup to the CALLER's own
// employee record and to already-dispatched payslips, so an employee can only
// ever download their own visible payslips — never another employee's by id.
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const cookieEmpId = request.cookies.get('erp_employee_id')?.value
    if (!cookieEmpId) {
      return NextResponse.json({ success: false, error: 'Not linked to an employee record' }, { status: 400 })
    }
    const employeeId = parseInt(cookieEmpId)

    const { payrollItemId } = await request.json()
    if (!payrollItemId) {
      return NextResponse.json({ success: false, error: 'payrollItemId is required' }, { status: 400 })
    }

    // Ownership + visibility enforced in the query itself: the item must belong
    // to this employee and be a dispatched (generated) payslip.
    const payrollItem = await db.payrollItem.findFirst({
      where: {
        id: parseInt(String(payrollItemId)),
        employeeId,
        payslipGenerated: true,
      },
      include: {
        Employee: { include: { Department: true, Designation: true, Branch: true } },
        PayrollRun: true,
      },
    })

    if (!payrollItem) {
      return NextResponse.json(
        { success: false, error: 'Payslip not found or not available for download' },
        { status: 404 }
      )
    }

    const generator = new PayslipGenerator()
    const calculator = new PayrollCalculator()

    // Company info (logo comes from the superadmin-managed tenant branding)
    const logo = await getTenantLogo(request)
    const companyInfo = {
      name: 'Upasana Associate',
      address: 'UPASANA VILLA, KHATA NO-747/5139, PLOT NO-666/11857,\nINFRONT OF MAMTA MARBLE, BRUNDABAN COLONY,\nJHARSUGUDA, Jharsuguda, Odisha, 768203',
      principalEmployer: 'Hindalco Industries Ltd., Lapanga, Sambalpur-768212',
      logo,
    }

    const payslipData = calculator.generatePayslipData(
      {
        employeeId: payrollItem.employeeId,
        month: payrollItem.PayrollRun.month,
        year: payrollItem.PayrollRun.year,
        workingDays: payrollItem.workingDays || 26,
        presentDays: payrollItem.presentDays || 0,
        paidLeaveDays: payrollItem.paidLeaveDays || 0,
        lopDays: payrollItem.lopDays || 0,
        otHours: Number(payrollItem.otHours) || 0,
        basicSalary: Number(payrollItem.basicSalary) || 0,
        hra: Number(payrollItem.hra) || 0,
        conveyanceAllowance: Number(payrollItem.conveyanceAllowance) || 0,
        medicalAllowance: Number(payrollItem.medicalAllowance) || 0,
        specialAllowance: Number(payrollItem.specialAllowance) || 0,
        otAmount: Number(payrollItem.otAmount) || 0,
        grossEarnings: Number(payrollItem.grossEarning),
        pfDeduction: Number(payrollItem.pfDeduction) || 0,
        esiDeduction: Number(payrollItem.esiDeduction) || 0,
        ptDeduction: Number(payrollItem.ptDeduction) || 0,
        tdsDeduction: Number(payrollItem.tdsDeduction) || 0,
        lopDeduction: Number(payrollItem.lopDeduction) || 0,
        otherDeductions: Number(payrollItem.otherDeductions) || 0,
        totalDeductions: Number(payrollItem.totalDeduction),
        netSalary: Number(payrollItem.netPay),
        details: payrollItem.details || {},
      },
      payrollItem.Employee,
      companyInfo
    )

    const pdfBlob = await generator.generateSinglePayslip(payslipData)
    const filename = generator.getPayslipFilename(
      payrollItem.Employee.employeeCode,
      payrollItem.PayrollRun.month,
      payrollItem.PayrollRun.year
    )

    const buffer = Buffer.from(await pdfBlob.arrayBuffer())
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[Self Payslip Download] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate payslip' },
      { status: 500 }
    )
  }
}
