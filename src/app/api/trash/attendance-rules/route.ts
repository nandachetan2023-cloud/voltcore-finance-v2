import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Fetch deleted attendance rules
export async function GET() {
  try {
    const deletedRules = await db.attendanceRule.findMany({
      where: { isActive: false },
      orderBy: { updatedAt: 'desc' },
      include: {
        Shift: { select: { id: true, name: true } },
        Department: { select: { id: true, name: true } },
        Branch: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: deletedRules });
  } catch (error) {
    console.error('Error fetching deleted attendance rules:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deleted attendance rules' },
      { status: 500 }
    );
  }
}

// POST - Restore an attendance rule
export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Rule ID is required' },
        { status: 400 }
      );
    }

    const restored = await db.attendanceRule.update({
      where: { id: parseInt(id) },
      data: { isActive: true, updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: restored });
  } catch (error) {
    console.error('Error restoring attendance rule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to restore attendance rule' },
      { status: 500 }
    );
  }
}

// DELETE - Permanently delete an attendance rule
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

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
    console.error('Error permanently deleting attendance rule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to permanently delete attendance rule' },
      { status: 500 }
    );
  }
}
