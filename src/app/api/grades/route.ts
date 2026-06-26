import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getDbForRequest } from '@/lib/db';

// GET - Fetch all grades
export async function GET(request: NextRequest) {
  const prisma = getDbForRequest(request);
  try {
    const grades = await prisma.grade.findMany({
      where: { isActive: true },
      orderBy: { level: 'asc' },
      include: {
        _count: {
          select: { Employee: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: grades });
  } catch (error) {
    console.error('Error fetching grades:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch grades' },
      { status: 500 }
    );
  }
}

// POST - Create a new grade
export async function POST(request: NextRequest) {
  const prisma = getDbForRequest(request);
  try {
    const body = await request.json();
    const {
      name,
      code,
      level,
      minSalary = 0,
      maxSalary = 0,
      description,
      benefits,
    } = body;

    if (!name || !code || level === undefined) {
      return NextResponse.json(
        { success: false, error: 'Name, code, and level are required' },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await prisma.grade.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Grade code already exists' },
        { status: 400 }
      );
    }

    const grade = await prisma.grade.create({
      data: {
        name,
        code,
        level: parseInt(level),
        minSalary: new Prisma.Decimal(minSalary),
        maxSalary: new Prisma.Decimal(maxSalary),
        description,
        benefits,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: grade });
  } catch (error) {
    console.error('Error creating grade:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create grade' },
      { status: 500 }
    );
  }
}

// PUT - Update a grade
export async function PUT(request: NextRequest) {
  const prisma = getDbForRequest(request);
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Grade ID is required' },
        { status: 400 }
      );
    }

    // Convert numeric fields
    if (updateData.level !== undefined) {
      updateData.level = parseInt(updateData.level);
    }
    if (updateData.minSalary !== undefined) {
      updateData.minSalary = new Prisma.Decimal(updateData.minSalary);
    }
    if (updateData.maxSalary !== undefined) {
      updateData.maxSalary = new Prisma.Decimal(updateData.maxSalary);
    }

    const grade = await prisma.grade.update({
      where: { id: parseInt(id) },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: grade });
  } catch (error) {
    console.error('Error updating grade:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update grade' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a grade
export async function DELETE(request: NextRequest) {
  const prisma = getDbForRequest(request);
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Grade ID is required' },
        { status: 400 }
      );
    }

    // Check if any employees are assigned to this grade
    const employeeCount = await prisma.employee.count({
      where: { gradeId: parseInt(id) },
    });

    if (employeeCount > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete grade. ${employeeCount} employee(s) are assigned to this grade.` },
        { status: 400 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.grade.update({
      where: { id: parseInt(id) },
      data: { isActive: false, updatedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting grade:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete grade' },
      { status: 500 }
    );
  }
}
