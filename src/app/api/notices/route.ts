import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: list all notices (admin/HR side) with read counts
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const dept = searchParams.get('targetDept')
    const desig = searchParams.get('targetDesig')

    const where: any = {}
    if (dept) where.targetDept = dept
    if (desig) where.targetDesig = desig

    const notices = await db.notice.findMany({
      where,
      include: { _count: { select: { reads: true } } },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
    })
    return NextResponse.json({ success: true, data: notices })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch notices' }, { status: 500 })
  }
}

// POST: create a notice
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { title, body, type, targetDept, targetDesig, isPinned, expiresAt, createdByName, createdBy } = await request.json()
    if (!title || !body || !createdByName) {
      return NextResponse.json({ success: false, error: 'title, body and createdByName are required' }, { status: 400 })
    }
    const notice = await db.notice.create({
      data: {
        title, body,
        type: type || 'general',
        targetDept: targetDept || null,
        targetDesig: targetDesig || null,
        isPinned: isPinned ?? false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdByName,
        createdBy: createdBy ? parseInt(createdBy) : null,
        publishedAt: new Date(),
      },
    })
    return NextResponse.json({ success: true, data: notice }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to create notice' }, { status: 500 })
  }
}

// PATCH: update a notice
export async function PATCH(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { id, title, body, type, isPinned, expiresAt, targetDept, targetDesig } = await request.json()
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const notice = await db.notice.update({
      where: { id: parseInt(id) },
      data: {
        ...(title !== undefined && { title }),
        ...(body !== undefined && { body }),
        ...(type !== undefined && { type }),
        ...(isPinned !== undefined && { isPinned }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(targetDept !== undefined && { targetDept: targetDept || null }),
        ...(targetDesig !== undefined && { targetDesig: targetDesig || null }),
      },
    })
    return NextResponse.json({ success: true, data: notice })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to update notice' }, { status: 500 })
  }
}

// DELETE: delete a notice
export async function DELETE(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    await db.notice.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to delete notice' }, { status: 500 })
  }
}
