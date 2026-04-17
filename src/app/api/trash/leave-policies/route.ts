import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Fetch deleted leave policies
export async function GET() {
  try {
    const deletedPolicies = await db.leavePolicy.findMany({
      where: { isActive: false },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: deletedPolicies });
  } catch (error) {
    console.error('Error fetching deleted leave policies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deleted leave policies' },
      { status: 500 }
    );
  }
}

// POST - Restore a leave policy
export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Policy ID is required' },
        { status: 400 }
      );
    }

    const restored = await db.leavePolicy.update({
      where: { id: parseInt(id) },
      data: { isActive: true, updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: restored });
  } catch (error) {
    console.error('Error restoring leave policy:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to restore leave policy' },
      { status: 500 }
    );
  }
}

// DELETE - Permanently delete a leave policy
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

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
    console.error('Error permanently deleting leave policy:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to permanently delete leave policy' },
      { status: 500 }
    );
  }
}
