import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

// ── Chart of Accounts: hierarchical tree (parentId + sortOrder) ─────
// GET   -> flat records (each carries parentId for the client to build a tree)
// POST  -> create a new account (optionally under a parentId)
// PUT   -> rename / retype / toggle active
// PATCH -> move/reorder: set parentId + sortOrder (used by drag-drop)
// DELETE -> remove an account

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finAccount.findMany({
      orderBy: [{ sortOrder: 'asc' }, { accountCode: 'asc' }],
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching chart of accounts:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch chart of accounts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountCode, name, group, type, parentId, taxApplicable, description } = body
    if (!accountCode || !name) return NextResponse.json({ success: false, error: 'accountCode and name are required' }, { status: 400 })

    const pdb = getDbForRequest(request)
    // New siblings land at the end of their parent's sorted list.
    const siblings = await pdb.finAccount.findMany({
      where: { parentId: parentId ? Number(parentId) : null },
      select: { id: true, sortOrder: true },
    })
    const sortOrder = siblings.length ? Math.max(...siblings.map(s => s.sortOrder)) + 1 : 0

    const record = await pdb.finAccount.create({
      data: {
        accountCode,
        name,
        group: group || 'Assets',
        type: type || 'Asset',
        parentId: parentId ? Number(parentId) : null,
        sortOrder,
        taxApplicable: !!taxApplicable,
        description: description || null,
      },
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating account:', error)
    if (error?.code === 'P2002') return NextResponse.json({ success: false, error: 'Account code already exists' }, { status: 409 })
    return NextResponse.json({ success: false, error: 'Failed to create account' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, group, type, taxApplicable, isActive, description } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const record = await pdb.finAccount.update({
      where: { id: Number(id) },
      data: {
        ...(name ? { name } : {}),
        ...(group ? { group } : {}),
        ...(type ? { type } : {}),
        ...(typeof taxApplicable === 'boolean' ? { taxApplicable } : {}),
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
        ...(description != null ? { description: description || null } : {}),
      },
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating account:', error)
    return NextResponse.json({ success: false, error: 'Failed to update account' }, { status: 500 })
  }
}

// PATCH — drag-and-drop move. body: { id, parentId: number|null, sortOrder }
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, parentId, sortOrder } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    if (!('parentId' in body)) return NextResponse.json({ success: false, error: 'parentId required' }, { status: 400 })

    const pdb = getDbForRequest(request)
    // Prevent cycles: cannot set a node as its own ancestor.
    if (parentId != null && Number(parentId) !== Number(id)) {
      // walk up from the target parent to ensure id is not in its ancestor chain
      let cur: { id: number; parentId: number | null } | null = await pdb.finAccount.findUnique({
        where: { id: Number(parentId) },
        select: { id: true, parentId: true },
      })
      let guard = 0
      while (cur && guard < 200) {
        if (cur.id === Number(id)) {
          return NextResponse.json({ success: false, error: 'Cannot assign an account under its own descendant' }, { status: 400 })
        }
        if (cur.parentId == null) break
        cur = await pdb.finAccount.findUnique({ where: { id: cur.parentId }, select: { id: true, parentId: true } })
        guard++
      }
    }

    const record = await pdb.finAccount.update({
      where: { id: Number(id) },
      data: { parentId: parentId ?? null, sortOrder: Number(sortOrder) || 0 },
    })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error reordering account:', error)
    return NextResponse.json({ success: false, error: 'Failed to reorder account' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ids = (searchParams.get('ids') || searchParams.get('id') || '').split(',').map(Number).filter((n) => !isNaN(n))
    if (ids.length === 0) return NextResponse.json({ success: false, error: 'ids required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const result = await pdb.finAccount.deleteMany({ where: { id: { in: ids } } })
    return NextResponse.json({ success: true, deleted: result.count })
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete account (may have children or postings)' }, { status: 500 })
  }
}