import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getDbForRequest } from '@/lib/db';

// GET - Fetch all attendance rules
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const rules = await db.attendanceRule.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        Shift: { select: { id: true, name: true } },
        Department: { select: { id: true, name: true } },
        Branch: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: rules });
  } catch (error) {
    console.error('Error fetching attendance rules:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attendance rules' },
      { status: 500 }
    );
  }
}

// POST - Create a new attendance rule
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json();
    const {
      name,
      ruleType,
      gracePeriodMinutes = 0,
      lateMarkAfterMinutes = 0,
      halfDayAfterMinutes = 0,
      absentAfterMinutes = 0,
      fineAmount = 0,
      fineType = 'fixed',
      finePerMinute = 0,
      maxFinePerDay = 0,
      applyToShiftId,
      applyToDepartmentId,
      applyToBranchId,
    } = body;

    if (!name || !ruleType) {
      return NextResponse.json(
        { success: false, error: 'Name and rule type are required' },
        { status: 400 }
      );
    }

    const rule = await db.attendanceRule.create({
      data: {
        name,
        ruleType,
        gracePeriodMinutes: parseInt(gracePeriodMinutes) || 0,
        lateMarkAfterMinutes: parseInt(lateMarkAfterMinutes) || 0,
        halfDayAfterMinutes: parseInt(halfDayAfterMinutes) || 0,
        absentAfterMinutes: parseInt(absentAfterMinutes) || 0,
        fineAmount: new Prisma.Decimal(fineAmount),
        fineType,
        finePerMinute: new Prisma.Decimal(finePerMinute),
        maxFinePerDay: new Prisma.Decimal(maxFinePerDay),
        applyToShiftId: applyToShiftId ? parseInt(applyToShiftId) : null,
        applyToDepartmentId: applyToDepartmentId ? parseInt(applyToDepartmentId) : null,
        applyToBranchId: applyToBranchId ? parseInt(applyToBranchId) : null,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    console.error('Error creating attendance rule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create attendance rule' },
      { status: 500 }
    );
  }
}

// PUT - Update an attendance rule
export async function PUT(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Rule ID is required' },
        { status: 400 }
      );
    }

    // Convert numeric fields to Decimal and integers
    if (updateData.fineAmount !== undefined) {
      updateData.fineAmount = new Prisma.Decimal(updateData.fineAmount);
    }
    if (updateData.finePerMinute !== undefined) {
      updateData.finePerMinute = new Prisma.Decimal(updateData.finePerMinute);
    }
    if (updateData.maxFinePerDay !== undefined) {
      updateData.maxFinePerDay = new Prisma.Decimal(updateData.maxFinePerDay);
    }
    if (updateData.gracePeriodMinutes !== undefined) {
      updateData.gracePeriodMinutes = parseInt(updateData.gracePeriodMinutes) || 0;
    }
    if (updateData.lateMarkAfterMinutes !== undefined) {
      updateData.lateMarkAfterMinutes = parseInt(updateData.lateMarkAfterMinutes) || 0;
    }
    if (updateData.halfDayAfterMinutes !== undefined) {
      updateData.halfDayAfterMinutes = parseInt(updateData.halfDayAfterMinutes) || 0;
    }
    if (updateData.absentAfterMinutes !== undefined) {
      updateData.absentAfterMinutes = parseInt(updateData.absentAfterMinutes) || 0;
    }

    // Convert IDs to integers
    if (updateData.applyToShiftId) {
      updateData.applyToShiftId = parseInt(updateData.applyToShiftId);
    }
    if (updateData.applyToDepartmentId) {
      updateData.applyToDepartmentId = parseInt(updateData.applyToDepartmentId);
    }
    if (updateData.applyToBranchId) {
      updateData.applyToBranchId = parseInt(updateData.applyToBranchId);
    }

    const rule = await db.attendanceRule.update({
      where: { id: parseInt(id) },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    console.error('Error updating attendance rule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update attendance rule' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an attendance rule
export async function DELETE(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Rule ID is required' },
        { status: 400 }
      );
    }

    await db.attendanceRule.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting attendance rule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete attendance rule' },
      { status: 500 }
    );
  }
}
