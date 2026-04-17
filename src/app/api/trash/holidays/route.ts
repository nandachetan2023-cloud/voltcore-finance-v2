import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Fetch deleted holidays
export async function GET() {
  try {
    const deletedHolidays = await db.holiday.findMany({
      where: { isActive: false },
      orderBy: { updatedAt: 'desc' },
      include: {
        Branch: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: deletedHolidays });
  } catch (error) {
    console.error('Error fetching deleted holidays:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deleted holidays' },
      { status: 500 }
    );
  }
}

// POST - Restore a holiday
export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Holiday ID is required' },
        { status: 400 }
      );
    }

    const restored = await db.holiday.update({
      where: { id: parseInt(id) },
      data: { isActive: true, updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: restored });
  } catch (error) {
    console.error('Error restoring holiday:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to restore holiday' },
      { status: 500 }
    );
  }
}

// DELETE - Permanently delete a holiday
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

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
    console.error('Error permanently deleting holiday:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to permanently delete holiday' },
      { status: 500 }
    );
  }
}
