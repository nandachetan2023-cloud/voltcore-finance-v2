import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getDbForRequest } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Fetch all leave policies
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url);
    const leaveType = searchParams.get('leaveType');
    const isActive = searchParams.get('isActive');

    let whereClause: any = {
      isActive: true, // Default to only active policies
    };

    if (leaveType) {
      whereClause.leaveType = leaveType;
    }

    // Allow overriding the isActive filter if explicitly provided
    if (isActive !== null && isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    const policies = await db.leavePolicy.findMany({
      where: whereClause,
      include: {
        Department: { select: { id: true, name: true } },
        Designation: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: policies });
  } catch (error) {
    console.error('Error fetching leave policies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leave policies' },
      { status: 500 }
    );
  }
}

// POST - Create a new leave policy
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json();
    const {
      name,
      code,
      leaveType,
      annualQuota = 0,
      carryForward = false,
      maxCarryForward = 0,
      encashable = false,
      maxEncashment = 0,
      minDaysNotice = 0,
      maxConsecutiveDays = 0,
      applicableAfterMonths = 0,
      applicableGender = 'all',
      applicableTo = 'all',
      departmentId,
      designationId,
      requiresDocument = false,
    } = body;

    if (!name || !code || !leaveType) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${!name ? 'name' : ''}${!code ? ' code' : ''}${!leaveType ? ' leave type' : ''}`.trim() },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await db.leavePolicy.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `A leave policy with code "${code}" already exists. Please use a different code.` },
        { status: 400 }
      );
    }

    const policy = await db.leavePolicy.create({
      data: {
        name,
        code,
        leaveType,
        annualQuota: new Prisma.Decimal(annualQuota),
        carryForward,
        maxCarryForward: new Prisma.Decimal(maxCarryForward),
        encashable,
        maxEncashment: new Prisma.Decimal(maxEncashment),
        minDaysNotice: parseInt(minDaysNotice) || 0,
        maxConsecutiveDays: parseInt(maxConsecutiveDays) || 0,
        applicableAfterMonths: parseInt(applicableAfterMonths) || 0,
        applicableGender,
        applicableTo,
        departmentId: departmentId ? parseInt(departmentId) : null,
        designationId: designationId ? parseInt(designationId) : null,
        requiresDocument,
        isActive: true,
        updatedAt: new Date(),
      },
      include: {
        Department: { select: { id: true, name: true } },
        Designation: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: policy });
  } catch (error) {
    console.error('Error creating leave policy:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create leave policy' },
      { status: 500 }
    );
  }
}

// PUT - Update a leave policy
export async function PUT(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Policy ID is required' },
        { status: 400 }
      );
    }

    // Convert numeric fields to Decimal and integers
    if (updateData.annualQuota !== undefined) {
      updateData.annualQuota = new Prisma.Decimal(updateData.annualQuota);
    }
    if (updateData.maxCarryForward !== undefined) {
      updateData.maxCarryForward = new Prisma.Decimal(updateData.maxCarryForward);
    }
    if (updateData.maxEncashment !== undefined) {
      updateData.maxEncashment = new Prisma.Decimal(updateData.maxEncashment);
    }
    if (updateData.minDaysNotice !== undefined) {
      updateData.minDaysNotice = parseInt(updateData.minDaysNotice) || 0;
    }
    if (updateData.maxConsecutiveDays !== undefined) {
      updateData.maxConsecutiveDays = parseInt(updateData.maxConsecutiveDays) || 0;
    }
    if (updateData.applicableAfterMonths !== undefined) {
      updateData.applicableAfterMonths = parseInt(updateData.applicableAfterMonths) || 0;
    }
    if (updateData.departmentId !== undefined) {
      updateData.departmentId = updateData.departmentId ? parseInt(updateData.departmentId) : null;
    }
    if (updateData.designationId !== undefined) {
      updateData.designationId = updateData.designationId ? parseInt(updateData.designationId) : null;
    }

    const policy = await db.leavePolicy.update({
      where: { id: parseInt(id) },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: {
        Department: { select: { id: true, name: true } },
        Designation: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: policy });
  } catch (error) {
    console.error('Error updating leave policy:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update leave policy' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a leave policy
export async function DELETE(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Policy ID is required' },
        { status: 400 }
      );
    }

    await db.leavePolicy.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting leave policy:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete leave policy' },
      { status: 500 }
    );
  }
}
