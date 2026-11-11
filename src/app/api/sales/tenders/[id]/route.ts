import { NextRequest, NextResponse } from 'next/server';
import { getDbForRequest } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Single tender (edit / delete / detail refresh). The screen used to call
// /api/sales/tenders/<id> without a route behind it, so the request answered
// with Next's HTML 404 page and the client crashed on res.json()
// ("Unexpected token '<'").

const INCLUDE = {
  documents: true,
  bidTeam: true,
  evaluation: true,
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pdb = getDbForRequest(request);
    const record = await pdb.finTender.findUnique({ where: { id: Number(id) }, include: INCLUDE });
    if (!record) {
      return NextResponse.json({ success: false, error: 'Tender not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error('Error fetching tender:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tender' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const pdb = getDbForRequest(request);

    const tenderId = Number(id);
    const existing = await pdb.finTender.findUnique({ where: { id: tenderId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Tender not found' }, { status: 404 });
    }

    const { id: _ignored, documents, bidTeam, evaluation, ...data } = body;

    if (documents) {
      await pdb.finTenderDocument.deleteMany({ where: { tenderId } });
      if (documents.length) {
        await pdb.finTenderDocument.createMany({ data: documents.map((d: any) => ({ ...d, tenderId })) });
      }
    }
    if (bidTeam) {
      await pdb.finTenderBidTeam.deleteMany({ where: { tenderId } });
      if (bidTeam.length) {
        await pdb.finTenderBidTeam.createMany({ data: bidTeam.map((m: any) => ({ ...m, tenderId })) });
      }
    }
    if (evaluation) {
      await pdb.finTenderEvaluation.deleteMany({ where: { tenderId } });
      await pdb.finTenderEvaluation.create({ data: { ...evaluation, tenderId } });
    }

    const record = await pdb.finTender.update({ where: { id: tenderId }, data, include: INCLUDE });
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error('Error updating tender:', error);
    return NextResponse.json({ success: false, error: 'Failed to update tender' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pdb = getDbForRequest(request);

    const tenderId = Number(id);
    const existing = await pdb.finTender.findUnique({ where: { id: tenderId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Tender not found' }, { status: 404 });
    }

    await pdb.finTender.delete({ where: { id: tenderId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tender:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete tender' }, { status: 500 });
  }
}
