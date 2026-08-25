import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

const INCLUDE = {
  documents: true,
  bidTeam: true,
  evaluation: true,
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finTender.findMany({ include: INCLUDE, orderBy: { rftIssueDate: 'desc' } })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching tenders:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const { documents, bidTeam, evaluation, ...data } = body
    if (!data.tenderNo) {
      const year = new Date().getFullYear()
      const count = (await pdb.finTender.count()) + 1
      data.tenderNo = `TDR/${year}/${String(count).padStart(3, '0')}`
    }
    const record = await pdb.finTender.create({
      data: {
        ...data,
        documents: documents ? { create: documents } : undefined,
        bidTeam: bidTeam ? { create: bidTeam } : undefined,
        evaluation: evaluation ? { create: evaluation } : undefined,
      },
      include: INCLUDE,
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating tender:', error)
    return NextResponse.json({ success: false, error: 'Failed to create' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, documents, bidTeam, evaluation, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    if (documents) {
      await pdb.finTenderDocument.deleteMany({ where: { tenderId: id } })
      await pdb.finTenderDocument.createMany({ data: documents.map((d: any) => ({ ...d, tenderId: id })) })
    }
    if (bidTeam) {
      await pdb.finTenderBidTeam.deleteMany({ where: { tenderId: id } })
      await pdb.finTenderBidTeam.createMany({ data: bidTeam.map((m: any) => ({ ...m, tenderId: id })) })
    }
    if (evaluation) {
      await pdb.finTenderEvaluation.deleteMany({ where: { tenderId: id } })
      await pdb.finTenderEvaluation.create({ data: { ...evaluation, tenderId: id } })
    }
    const record = await pdb.finTender.update({ where: { id }, data, include: INCLUDE })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating tender:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    await pdb.finTender.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tender:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}
