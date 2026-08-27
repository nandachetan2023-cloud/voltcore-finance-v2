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
      branchIds,
    } = body;

    if (!name || !date) {
      return NextResponse.json(
        { success: false, error: 'Name and date are required' },
        { status: 400 }
      );
    }

    // A holiday can now be declared for SEVERAL sites at once. Each selected
    // site gets its own Holiday row rather than the rows sharing a join table,
    // because every consumer — getHolidaysInRange, the payroll working-day
    // calculations, the timesheet — filters on the scalar `branchId`. One row
    // per site keeps all of that correct and lets a site's holiday be edited or
    // deleted on its own afterwards.
    //
    // `branchIds` is the multi-select path; `branchId` is kept for existing
    // callers and for the company-wide case (null = all sites).
    const ids: number[] = Array.isArray(branchIds)
      ? [...new Set(
          branchIds
            .map((b: unknown) => parseInt(String(b)))
            .filter((n: number) => Number.isFinite(n))
        )]
      : [];

    const baseData = {
      name,
      date: new Date(date),
      type,
      description,
      isRecurring,
      applicableTo,
      isActive: true,
      updatedAt: new Date(),
    };

    if (ids.length > 0) {
      // Skip sites that already have this holiday on this date, so re-submitting
      // a partially-created set does not produce duplicates.
      const existing = await db.holiday.findMany({
        where: {
          date: new Date(date),
          branchId: { in: ids },
          isActive: true,
        },
        select: { branchId: true },
      });
      const already = new Set(existing.map((h: { branchId: number | null }) => h.branchId));
      const toCreate = ids.filter(id => !already.has(id));

      if (toCreate.length === 0) {
        return NextResponse.json(
          { success: false, error: 'This holiday already exists on that date for every selected site.' },
          { status: 409 }
        );
      }

      // Created one at a time rather than with createMany, which is a single
      // statement — one bad row would abort the whole batch.
      const created: unknown[] = [];
      for (const id of toCreate) {
        created.push(await db.holiday.create({ data: { ...baseData, branchId: id } }));
      }

      return NextResponse.json({
        success: true,
        data: created,
        created: created.length,
        skipped: ids.length - toCreate.length,
      });
    }

    const holiday = await db.holiday.create({
      data: { ...baseData, branchId: branchId ? parseInt(branchId) : null },
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
