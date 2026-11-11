import { NextRequest, NextResponse } from 'next/server';
import { getDbForRequest } from '@/lib/db';
import { assertPermission } from '@/lib/fin-rbac';
import { nextPrefixedCode } from '@/lib/auto-number';

export const dynamic = 'force-dynamic';

const INCLUDE = { site: { select: { id: true, name: true, siteCode: true } } };

// Daily Issue Register (client Excel format):
// Sl No | Date | Item Name | Qty | Receiver Name | Mobile Number | Purpose/Location | Return | Remarks

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request);
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const records = await pdb.finDailyIssue.findMany({
      where: siteId ? { siteId: Number(siteId) } : undefined,
      orderBy: { issueDate: 'desc' },
      include: INCLUDE,
    });
    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error('Error fetching daily issues:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pdb = getDbForRequest(request);
    if (!body.siteId || !body.itemName || !body.receiverName) {
      return NextResponse.json({ success: false, error: 'siteId, itemName and receiverName are required' }, { status: 400 });
    }
    const site = await pdb.finSite.findUnique({ where: { id: Number(body.siteId) } });
    const denied = await assertPermission(pdb, body.actor || '', 'INVENTORY_CREATE', { request, module: 'Inventory', siteCode: site?.siteCode ?? null });
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to create daily issue entries' }, { status: 403 });

    let issueNo = body.issueNo;
    if (!issueNo) issueNo = await nextPrefixedCode(pdb, 'finDailyIssue', 'issueNo', `DI/${new Date().getFullYear()}/`, 4);

    const record = await pdb.finDailyIssue.create({
      data: {
        issueNo,
        issueDate: new Date(body.issueDate || Date.now()),
        siteId: Number(body.siteId),
        itemName: body.itemName,
        itemCode: body.itemCode || null,
        qty: Number(body.qty) || 0,
        unit: body.unit || null,
        receiverName: body.receiverName,
        mobileNumber: body.mobileNumber || null,
        purposeLocation: body.purposeLocation || null,
        returned: !!body.returned,
        remarks: body.remarks || null,
      },
      include: INCLUDE,
    });
    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error('Error creating daily issue entry:', error);
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
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to edit daily issue entries' }, { status: 403 });

    const record = await pdb.finDailyIssue.update({
      where: { id: Number(id) },
      data: {
        ...(data.issueDate !== undefined ? { issueDate: new Date(data.issueDate) } : {}),
        ...(data.siteId !== undefined ? { siteId: Number(data.siteId) } : {}),
        ...(data.itemName !== undefined ? { itemName: data.itemName } : {}),
        ...(data.itemCode !== undefined ? { itemCode: data.itemCode } : {}),
        ...(data.qty !== undefined ? { qty: Number(data.qty) } : {}),
        ...(data.unit !== undefined ? { unit: data.unit } : {}),
        ...(data.receiverName !== undefined ? { receiverName: data.receiverName } : {}),
        ...(data.mobileNumber !== undefined ? { mobileNumber: data.mobileNumber } : {}),
        ...(data.purposeLocation !== undefined ? { purposeLocation: data.purposeLocation } : {}),
        ...(data.returned !== undefined ? { returned: !!data.returned } : {}),
        ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
      },
      include: INCLUDE,
    });
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error('Error updating daily issue entry:', error);
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
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to delete daily issue entries' }, { status: 403 });
    await pdb.finDailyIssue.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting daily issue entry:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 });
  }
}
