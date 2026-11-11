import { NextRequest, NextResponse } from 'next/server';
import { getDbForRequest } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ clientId: string; contactId: string }> }) {
  try {
    const { clientId, contactId } = await params;
    const body = await request.json();
    const pdb = getDbForRequest(request);

    const existing = await pdb.finClientContact.findUnique({ where: { id: Number(contactId) } });
    if (!existing || existing.clientId !== Number(clientId)) {
      return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
    }

    const contact = await pdb.finClientContact.update({
      where: { id: Number(contactId) },
      data: {
        name: body.name ?? existing.name,
        role: body.role ?? existing.role,
        phone: body.phone ?? existing.phone,
        email: body.email ?? existing.email,
        notes: body.notes ?? existing.notes,
        strength: body.strength ?? existing.strength,
      },
    });
    return NextResponse.json({ success: true, data: contact });
  } catch (error) {
    console.error('Error updating client contact:', error);
    return NextResponse.json({ success: false, error: 'Failed to update contact' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ clientId: string; contactId: string }> }) {
  try {
    const { clientId, contactId } = await params;
    const pdb = getDbForRequest(request);

    const existing = await pdb.finClientContact.findUnique({ where: { id: Number(contactId) } });
    if (!existing || existing.clientId !== Number(clientId)) {
      return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
    }

    await pdb.finClientContact.delete({ where: { id: Number(contactId) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client contact:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete contact' }, { status: 500 });
  }
}
