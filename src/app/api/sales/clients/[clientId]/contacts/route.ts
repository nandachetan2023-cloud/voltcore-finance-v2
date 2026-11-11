import { NextRequest, NextResponse } from 'next/server';
import { getDbForRequest } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Contacts of a sales client. The screen used to call this path without a
// route behind it, so the request answered with Next's HTML 404 page and the
// client crashed on res.json() ("Unexpected token '<'").

export async function GET(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const { clientId } = await params;
    const pdb = getDbForRequest(request);
    const contacts = await pdb.finClientContact.findMany({
      where: { clientId: Number(clientId) },
      orderBy: { id: 'asc' },
    });
    return NextResponse.json({ success: true, data: contacts });
  } catch (error) {
    console.error('Error fetching client contacts:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const { clientId } = await params;
    const body = await request.json();
    const pdb = getDbForRequest(request);

    if (!body?.name) {
      return NextResponse.json({ success: false, error: 'Contact name is required' }, { status: 400 });
    }

    const contact = await pdb.finClientContact.create({
      data: {
        clientId: Number(clientId),
        name: body.name,
        role: body.role ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        notes: body.notes ?? null,
        strength: body.strength ?? 'Medium',
      },
    });
    return NextResponse.json({ success: true, data: contact }, { status: 201 });
  } catch (error) {
    console.error('Error creating client contact:', error);
    return NextResponse.json({ success: false, error: 'Failed to create contact' }, { status: 500 });
  }
}
