import { NextRequest, NextResponse } from 'next/server';
import { getDbForRequest } from '@/lib/db';

// GET - Fetch all holidays
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request);
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const branchId = searchParams.get('branchId');

    let whereClause: any = { isActive: true };

    if (year) {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31`);
      whereClause.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (branchId) {
      whereClause.OR = [
        { branchId: parseInt(branchId) },
        { branchId: null }, // Include company-wide holidays
      ];
    }

    const holidays = await db.holiday.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
      include: {
        Branch: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: holidays });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch holidays' },
      { status: 500 }
    );
  }
}

// POST - Create a new holiday
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request);
  try {
    const body = await request.json();
    const {
      name,
      date,
      type = 'public',
      description,
      isRecurring = false,
      applicableTo = 'all',
      branchId,
    } = body;

    if (!name || !date) {
      return NextResponse.json(
        { success: false, error: 'Name and date are required' },
        { status: 400 }
      );
    }

    const holiday = await db.holiday.create({
      data: {
        name,
        date: new Date(date),
        type,
        description,
        isRecurring,
        applicableTo,
        branchId: branchId ? parseInt(branchId) : null,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: holiday });
  } catch (error) {
    console.error('Error creating holiday:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create holiday' },
      { status: 500 }
    );
  }
}

// PUT - Update a holiday
export async function PUT(request: NextRequest) {
  const db = getDbForRequest(request);
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Holiday ID is required' },
        { status: 400 }
      );
    }

    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    if (updateData.branchId) {
      updateData.branchId = parseInt(updateData.branchId);
    }

    const holiday = await db.holiday.update({
      where: { id: parseInt(id) },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: holiday });
  } catch (error) {
    console.error('Error updating holiday:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update holiday' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a holiday
export async function DELETE(request: NextRequest) {
  const db = getDbForRequest(request);
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Holiday ID is required' },
        { status: 400 }
      );
    }

    await db.holiday.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete holiday' },
      { status: 500 }
    );
  }
}
