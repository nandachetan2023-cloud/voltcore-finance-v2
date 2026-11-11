import { NextRequest, NextResponse } from 'next/server';
import { getDbForRequest } from '@/lib/db';
import { assertPermission } from '@/lib/fin-rbac';
import { nextPrefixedCode } from '@/lib/auto-number';

export const dynamic = 'force-dynamic';

const INCLUDE = { site: { select: { id: true, name: true, siteCode: true } } };

// Gas Cylinder Register (client Excel format):
// Date | Gas Type | Cylinder No | Received | Issued | Condition | Remarks | Empty Return Date | Return Challan No

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request);
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const records = await pdb.finGasCylinderLog.findMany({
      where: siteId ? { siteId: Number(siteId) } : undefined,
      orderBy: { logDate: 'desc' },
      include: INCLUDE,
    });
    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error('Error fetching gas cylinder log:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pdb = getDbForRequest(request);
    if (!body.siteId || !body.gasType) {
      return NextResponse.json({ success: false, error: 'siteId and gasType are required' }, { status: 400 });
    }
    const site = await pdb.finSite.findUnique({ where: { id: Number(body.siteId) } });
    const denied = await assertPermission(pdb, body.actor || '', 'INVENTORY_CREATE', { request, module: 'Inventory', siteCode: site?.siteCode ?? null });
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to create gas cylinder log entries' }, { status: 403 });

    let logNo = body.logNo;
    if (!logNo) logNo = await nextPrefixedCode(pdb, 'finGasCylinderLog', 'logNo', `GC/${new Date().getFullYear()}/`, 4);

    const record = await pdb.finGasCylinderLog.create({
      data: {
        logNo,
        logDate: new Date(body.logDate || Date.now()),
        siteId: Number(body.siteId),
        gasType: body.gasType,
        cylinderNo: body.cylinderNo || null,
        direction: body.direction || 'Received',
        qty: Number(body.qty) || 1,
        issuedTo: body.issuedTo || null,
        condition: body.condition || null,
        emptyReturnDate: body.emptyReturnDate ? new Date(body.emptyReturnDate) : null,
        returnChallanNo: body.returnChallanNo || null,
        remarks: body.remarks || null,
      },
      include: INCLUDE,
    });
    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error('Error creating gas cylinder log entry:', error);
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
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to edit gas cylinder log entries' }, { status: 403 });

    const record = await pdb.finGasCylinderLog.update({
      where: { id: Number(id) },
      data: {
        ...(data.logDate !== undefined ? { logDate: new Date(data.logDate) } : {}),
        ...(data.siteId !== undefined ? { siteId: Number(data.siteId) } : {}),
        ...(data.gasType !== undefined ? { gasType: data.gasType } : {}),
        ...(data.cylinderNo !== undefined ? { cylinderNo: data.cylinderNo } : {}),
        ...(data.direction !== undefined ? { direction: data.direction } : {}),
        ...(data.qty !== undefined ? { qty: Number(data.qty) } : {}),
        ...(data.issuedTo !== undefined ? { issuedTo: data.issuedTo } : {}),
        ...(data.condition !== undefined ? { condition: data.condition } : {}),
        ...(data.emptyReturnDate !== undefined ? { emptyReturnDate: data.emptyReturnDate ? new Date(data.emptyReturnDate) : null } : {}),
        ...(data.returnChallanNo !== undefined ? { returnChallanNo: data.returnChallanNo } : {}),
        ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
      },
      include: INCLUDE,
    });
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error('Error updating gas cylinder log entry:', error);
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
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to delete gas cylinder log entries' }, { status: 403 });
    await pdb.finGasCylinderLog.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting gas cylinder log entry:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 });
  }
}
