import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finMaterialTrackingItem.findMany({ orderBy: { scheduledDate: 'desc' } })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching material tracking:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const record = await pdb.finMaterialTrackingItem.create({ data: body })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating material tracking:', error)
    return NextResponse.json({ success: false, error: 'Failed to create' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const record = await pdb.finMaterialTrackingItem.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating material tracking:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    await pdb.finMaterialTrackingItem.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting material tracking:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}
