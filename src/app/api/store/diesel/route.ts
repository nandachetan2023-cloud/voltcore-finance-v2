import { NextRequest, NextResponse } from 'next/server';
import { getDbForRequest } from '@/lib/db';
import { assertPermission } from '@/lib/fin-rbac';
import { nextPrefixedCode } from '@/lib/auto-number';

export const dynamic = 'force-dynamic';

const INCLUDE = { site: { select: { id: true, name: true, siteCode: true } } };
const round3 = (n: number) => Math.round(n * 1000) / 1000;

// Diesel Register (client Excel format):
// Date | Vehicle/Equipment | Opening | Received | Consumed | Closing | Operator | Remarks

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request);
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const records = await pdb.finDieselLog.findMany({
      where: siteId ? { siteId: Number(siteId) } : undefined,
      orderBy: { logDate: 'desc' },
      include: INCLUDE,
    });
    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error('Error fetching diesel log:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pdb = getDbForRequest(request);
    if (!body.siteId || !body.vehicle) {
      return NextResponse.json({ success: false, error: 'siteId and vehicle are required' }, { status: 400 });
    }
    const site = await pdb.finSite.findUnique({ where: { id: Number(body.siteId) } });
    const denied = await assertPermission(pdb, body.actor || '', 'INVENTORY_CREATE', { request, module: 'Inventory', siteCode: site?.siteCode ?? null });
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to create diesel log entries' }, { status: 403 });

    let logNo = body.logNo;
    if (!logNo) logNo = await nextPrefixedCode(pdb, 'finDieselLog', 'logNo', `DS/${new Date().getFullYear()}/`, 4);

    const opening = Number(body.opening) || 0;
    const received = Number(body.received) || 0;
    const consumed = Number(body.consumed) || 0;
    const closing = round3(opening + received - consumed);

    const record = await pdb.finDieselLog.create({
      data: {
        logNo,
        logDate: new Date(body.logDate || Date.now()),
        siteId: Number(body.siteId),
        vehicle: body.vehicle,
        opening,
        received,
        consumed,
        closing,
        operatorName: body.operatorName || null,
        remarks: body.remarks || null,
      },
      include: INCLUDE,
    });
    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error('Error creating diesel log entry:', error);
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    const pdb = getDbForRequest(request);
    const denied = await assertPermission(pdb, data.actor || '', 'INVENTORY_EDIT', { request, module: 'Inventory', entityId: String(id) });
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to edit diesel log entries' }, { status: 403 });

    const existing = await pdb.finDieselLog.findUnique({ where: { id: Number(id) } });
    if (!existing) return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });

    const opening = data.opening !== undefined ? Number(data.opening) : existing.opening;
    const received = data.received !== undefined ? Number(data.received) : existing.received;
    const consumed = data.consumed !== undefined ? Number(data.consumed) : existing.consumed;

    const record = await pdb.finDieselLog.update({
      where: { id: Number(id) },
      data: {
        ...(data.logDate !== undefined ? { logDate: new Date(data.logDate) } : {}),
        ...(data.siteId !== undefined ? { siteId: Number(data.siteId) } : {}),
        ...(data.vehicle !== undefined ? { vehicle: data.vehicle } : {}),
        opening,
        received,
        consumed,
        closing: round3(opening + received - consumed),
        ...(data.operatorName !== undefined ? { operatorName: data.operatorName } : {}),
        ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
      },
      include: INCLUDE,
    });
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error('Error updating diesel log entry:', error);
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    const pdb = getDbForRequest(request);
    const actor = request.headers.get('x-actor-email') || '';
    const denied = await assertPermission(pdb, actor, 'INVENTORY_DELETE', { request, module: 'Inventory', entityId: id });
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to delete diesel log entries' }, { status: 403 });
    await pdb.finDieselLog.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting diesel log entry:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 });
  }
}
