import { NextRequest, NextResponse } from 'next/server';
import { getDbForRequest } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDbForRequest(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientName = searchParams.get('clientName');

    const where: any = {};
    if (status) where.status = status;
    if (clientName) where.clientName = { contains: clientName };

    const records = await db.finClientFollowUp.findMany({
      where,
      include: { po: { select: { id: true, poNo: true, totalAmount: true } } },
      orderBy: [{ callBackDate: 'asc' }, { clientName: 'asc' }],
    });

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error('Error fetching client follow-ups:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch client follow-ups' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDbForRequest(request);
    const body = await request.json();

    if (body.action === 'import') {
      const records: any[] = body.records || [];

      // The sheet carries a human-readable PO number ("PO No"), but poId is
      // an Int FK to FinPurchaseOrder — resolve it by lookup instead of
      // trying to store the string directly (that was throwing on every row).
      const pos = await db.finPurchaseOrder.findMany({ select: { id: true, poNo: true } });
      const poByNo = new Map(pos.map((p) => [p.poNo.trim().toLowerCase(), p.id]));

      let created = 0, skipped = 0, errors = 0;
      const errorRows: { row: number; message: string }[] = [];

      for (let i = 0; i < records.length; i++) {
        const item = records[i];
        const clientName = String(item.clientName || item['Client Name'] || '').trim();
        if (!clientName) { skipped++; continue }

        try {
          const rawBalance = item.balanceAmount ?? item['Balance Amount'] ?? 0;
          const balanceAmount = Number(rawBalance);
          const poRef = String(item.poId || item['PO No'] || '').trim();
          const invoiceNos = item.invoiceNos || item['Invoice '] || '';
          const contactNo = item.contactNo || item['Contact No.'] || '';
          const contactPerson = item.contactPerson || item['Name of Contact Person'] || '';
          const matterDiscussed = item.matterDiscussed || item['Matter Discussed'] || '';
          const callBackDateStr = item.callBackDate || item['Call Back Date'] || null;
          const remarks = item.remarks || item['Remarks'] || '';
          const callBackDate = callBackDateStr ? new Date(callBackDateStr) : null;

          await db.finClientFollowUp.create({
            data: {
              clientName,
              balanceAmount: Number.isFinite(balanceAmount) ? balanceAmount : 0,
              poId: poRef ? poByNo.get(poRef.toLowerCase()) ?? null : null,
              invoiceNos,
              contactNo,
              contactPerson,
              matterDiscussed,
              callBackDate: callBackDate && !isNaN(callBackDate.getTime()) ? callBackDate : null,
              remarks,
              status: 'Pending',
            },
          });
          created++;
        } catch (e) {
          errors++;
          errorRows.push({ row: i + 1, message: (e as Error).message });
        }
      }

      return NextResponse.json({ success: true, created, summary: { totalRows: records.length, created, skipped, errors }, errorRows: errorRows.slice(0, 20) });
    }

    const { clientName, balanceAmount, poId, invoiceNos, contactNo, contactPerson, matterDiscussed, callBackDate: callBackDateStr, remarks } = body;
    const callBackDate = callBackDateStr ? new Date(callBackDateStr) : null;

    const data: any = {
      clientName,
      balanceAmount: parseFloat(balanceAmount ?? 0),
      invoiceNos,
      contactNo,
      contactPerson,
      matterDiscussed,
      callBackDate,
      remarks,
      status: 'Pending',
    };
    if (poId) data.poId = poId;

    const record = await db.finClientFollowUp.create({ data });

    if (callBackDate) {
      await db.finAlert.create({
        data: {
          type: 'FollowUp',
          title: `Follow-up due: ${clientName}`,
          message: `Follow-up scheduled for ${callBackDate.toISOString()} - ${matterDiscussed}`,
          poId: poId || null,
        },
      });
    }

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error('Error creating client follow-up:', error);
    return NextResponse.json({ success: false, error: 'Failed to create client follow-up' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const db = await getDbForRequest(request);
    const body = await request.json();
    const { id, clientName, balanceAmount, poId, invoiceNos, contactNo, contactPerson, matterDiscussed, callBackDate: callBackDateStr, remarks, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const callBackDate = callBackDateStr ? new Date(callBackDateStr) : null;

    const data: any = {};
    if (clientName !== undefined) data.clientName = clientName;
    if (balanceAmount !== undefined) data.balanceAmount = parseFloat(balanceAmount);
    if (poId !== undefined) data.poId = poId;
    if (invoiceNos !== undefined) data.invoiceNos = invoiceNos;
    if (contactNo !== undefined) data.contactNo = contactNo;
    if (contactPerson !== undefined) data.contactPerson = contactPerson;
    if (matterDiscussed !== undefined) data.matterDiscussed = matterDiscussed;
    if (callBackDate !== undefined) data.callBackDate = callBackDate;
    if (remarks !== undefined) data.remarks = remarks;
    if (status !== undefined) data.status = status;

    const record = await db.finClientFollowUp.update({ where: { id }, data });

    if (callBackDate && clientName) {
      const existingAlert = await db.finAlert.findFirst({
        where: { title: { contains: `Follow-up due: ${clientName}` } },
      });
      if (existingAlert) {
        await db.finAlert.update({
          where: { id: existingAlert.id },
          data: {
            message: `Follow-up scheduled for ${callBackDate.toISOString()} - ${matterDiscussed || ''}`,
            poId: poId !== undefined ? poId : existingAlert.poId,
          },
        });
      }
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error('Error updating client follow-up:', error);
    return NextResponse.json({ success: false, error: 'Failed to update client follow-up' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = await getDbForRequest(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const record = await db.finClientFollowUp.findUnique({ where: { id: Number(id) } });
    if (!record) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }

    await db.finClientFollowUp.delete({ where: { id: Number(id) } });

    await db.finAlert.deleteMany({
      where: { title: { contains: `Follow-up due: ${record.clientName}` } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client follow-up:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete client follow-up' }, { status: 500 });
  }
}
