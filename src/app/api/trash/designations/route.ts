import { NextRequest, NextResponse } from 'next/server';
import { getDbForRequest } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Designations are hard-deleted by /api/designations (the table carries no
// soft-delete flag), so there is nothing to restore from the recycle bin.
// The route still exists so the Trash screen never asks the API for a path
// that does not exist — an unmatched /api path answers with an HTML 404 page,
// and the client used to feed that page to res.json() ("Unexpected token '<'").

// GET - Fetch deleted designations
export async function GET() {
  return NextResponse.json({ success: true, data: [] });
}

// POST - Restore a designation
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request);
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Designation ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.designation.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Designation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: existing });
  } catch (error) {
    console.error('Error restoring designation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to restore designation' },
      { status: 500 }
    );
  }
}

// DELETE - Permanently delete a designation
export async function DELETE(request: NextRequest) {
  const db = getDbForRequest(request);
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Designation ID is required' },
        { status: 400 }
      );
    }

    await db.designation.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error permanently deleting designation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to permanently delete designation' },
      { status: 500 }
    );
  }
}
