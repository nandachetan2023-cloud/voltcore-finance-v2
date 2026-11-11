import { NextRequest, NextResponse } from 'next/server';
import { getDbForRequest } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Recycle bin for employees.
 *
 * /api/employees soft-deletes an employee (isDeleted = true) and frees the
 * email + employee code for reuse by suffixing them with `.deleted.<ts>`.
 * Restoring puts the original values back when they are still free, and
 * otherwise keeps the suffixed ones so a unique index is never violated.
 */

const fullName = (e: any) => [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ').trim()

const stripDeletedSuffix = (value: string | null | undefined) =>
  typeof value === 'string' ? value.replace(/\.deleted\.\d+$/, '') : value

// GET - Fetch deleted employees
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request);
  try {
    const deletedEmployees = await db.employee.findMany({
      where: { isDeleted: true },
      orderBy: { updatedAt: 'desc' },
      include: {
        Department: { select: { id: true, name: true, code: true } },
        Designation: { select: { id: true, name: true } },
      },
    });

    const data = deletedEmployees.map((e: any) => ({
      ...e,
      name: fullName(e),
      email: stripDeletedSuffix(e.email),
      employeeCode: stripDeletedSuffix(e.employeeCode),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching deleted employees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deleted employees' },
      { status: 500 }
    );
  }
}

// POST - Restore an employee
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request);
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    const employeeId = parseInt(id);
    const existing = await db.employee.findUnique({ where: { id: employeeId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const originalEmail = stripDeletedSuffix(existing.email) ?? null;
    const originalCode = stripDeletedSuffix(existing.employeeCode) ?? existing.employeeCode;

    const emailTaken = originalEmail
      ? await db.employee.findFirst({ where: { email: originalEmail, id: { not: employeeId } } })
      : null
    const codeTaken = originalCode
      ? await db.employee.findFirst({ where: { employeeCode: originalCode, id: { not: employeeId } } })
      : null

    const restored = await db.employee.update({
      where: { id: employeeId },
      data: {
        isDeleted: false,
        isActive: true,
        employmentStatus: 'active',
        email: emailTaken ? existing.email : originalEmail,
        employeeCode: codeTaken ? existing.employeeCode : originalCode,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: { ...restored, name: fullName(restored) } });
  } catch (error) {
    console.error('Error restoring employee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to restore employee' },
      { status: 500 }
    );
  }
}

// DELETE - Permanently delete an employee
export async function DELETE(request: NextRequest) {
  const db = getDbForRequest(request);
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    await db.employee.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error permanently deleting employee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to permanently delete employee' },
      { status: 500 }
    );
  }
}
