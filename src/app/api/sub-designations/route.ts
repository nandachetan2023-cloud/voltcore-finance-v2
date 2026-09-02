import { getDbForRequest } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: list sub-designations (optionally filtered by ?designationId=)
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const designationId = searchParams.get('designationId')
    const where = designationId ? { designationId: parseInt(designationId) } : {}
    const subs = await db.subDesignation.findMany({
      where,
      select: { id: true, name: true, designationId: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ success: true, data: subs })
  } catch (error) {
    console.error('Error fetching sub-designations:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch sub-designations' }, { status: 500 })
  }
}

// POST: create a sub-designation under a designation
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { name, designationId } = body
    if (!name || !designationId) {
      return NextResponse.json({ success: false, error: 'name and designationId are required' }, { status: 400 })
    }
    const parent = await db.designation.findUnique({ where: { id: parseInt(designationId) } })
    if (!parent) {
      return NextResponse.json({ success: false, error: 'Parent designation not found' }, { status: 404 })
    }
    const sub = await db.subDesignation.create({
      data: { name: String(name).trim(), designationId: parseInt(designationId) },
    })
    return NextResponse.json({ success: true, data: sub }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'That sub-designation already exists for this designation' }, { status: 409 })
    }
    console.error('Error creating sub-designation:', error)
    return NextResponse.json({ success: false, error: 'Failed to create sub-designation' }, { status: 500 })
  }
}

// PUT: rename a sub-designation
export async function PUT(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { id, name } = body
    if (!id || !name) {
      return NextResponse.json({ success: false, error: 'id and name are required' }, { status: 400 })
    }
    const sub = await db.subDesignation.update({
      where: { id: parseInt(id) },
      data: { name: String(name).trim() },
    })
    return NextResponse.json({ success: true, data: sub })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'That sub-designation already exists for this designation' }, { status: 409 })
    }
    console.error('Error updating sub-designation:', error)
    return NextResponse.json({ success: false, error: 'Failed to update sub-designation' }, { status: 500 })
  }
}

// DELETE: remove a sub-designation (blocked if employees still reference it)
export async function DELETE(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const body = await request.json()
    const { id } = body
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }
    const count = await db.employee.count({ where: { subDesignationId: parseInt(id), isDeleted: false } })
    if (count > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete — ${count} employee(s) use this sub-designation` },
        { status: 400 }
      )
    }
    await db.subDesignation.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting sub-designation:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete sub-designation' }, { status: 500 })
  }
}
