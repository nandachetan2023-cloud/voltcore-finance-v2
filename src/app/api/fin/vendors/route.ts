import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finVendor.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching vendors:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch vendors' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    if (!body.name || !body.region) {
      return NextResponse.json({ success: false, error: 'Name and region are required' }, { status: 400 })
    }
    const record = await pdb.finVendor.create({
      data: {
        name: String(body.name).trim(),
        categories: Array.isArray(body.categories) ? body.categories : [],
        region: String(body.region),
        status: body.status || 'standard',
        rating: Number(body.rating) || 3.0,
        contactPerson: body.contactPerson || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        notes: body.notes || null,
        certificates: Array.isArray(body.certificates) ? body.certificates : [],
        metrics: body.metrics || {},
        blacklistLog: Array.isArray(body.blacklistLog) ? body.blacklistLog : [],
      },
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating vendor:', error)
    return NextResponse.json({ success: false, error: 'Failed to create vendor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const id = Number(body.id)
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const record = await pdb.finVendor.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name).trim() : undefined,
        categories: Array.isArray(body.categories) ? body.categories : undefined,
        region: body.region !== undefined ? String(body.region) : undefined,
        status: body.status || undefined,
        rating: body.rating !== undefined ? Number(body.rating) : undefined,
        contactPerson: body.contactPerson ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        address: body.address ?? null,
        notes: body.notes ?? null,
        certificates: Array.isArray(body.certificates) ? body.certificates : undefined,
        metrics: body.metrics !== undefined ? body.metrics : undefined,
        blacklistLog: Array.isArray(body.blacklistLog) ? body.blacklistLog : undefined,
      },
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating vendor:', error)
    return NextResponse.json({ success: false, error: 'Failed to update vendor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    await pdb.finVendor.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vendor:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete vendor' }, { status: 500 })
  }
}
