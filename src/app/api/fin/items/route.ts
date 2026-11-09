import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { nextItemCode, withCodeRetry, isBlank } from '@/lib/auto-number'

export const dynamic = 'force-dynamic'

function parseNum(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finItem.findMany({
      include: { category: { select: { id: true, code: true, name: true } } },
      orderBy: { itemCode: 'asc' },
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching items:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.name || String(body.name).trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Item name must be at least 2 characters' }, { status: 400 })
    }
    const pdb = getDbForRequest(request)
    let categoryId: number | null = null
    let categoryCode: string | null = null
    if (!isBlank(body.categoryId)) {
      const cat = await pdb.finItemCategory.findUnique({ where: { id: Number(body.categoryId) } })
      if (!cat) return NextResponse.json({ success: false, error: 'Category not found' }, { status: 400 })
      categoryId = cat.id
      categoryCode = cat.code
    }
    const data = {
      name: String(body.name).trim(),
      description: body.description || null,
      categoryId,
      uom: body.uom || 'Nos',
      hsn: body.hsn || null,
      reorderLevel: parseNum(body.reorderLevel),
      rate: parseNum(body.rate),
      isActive: body.isActive ?? body.status !== 'Inactive',
    }
    // The item code is generated here, segmented by category (e.g. ELC-0007);
    // a caller-supplied one (Excel import) is honoured.
    const record = isBlank(body.itemCode)
      ? await withCodeRetry(() => nextItemCode(pdb, categoryCode), (code) => pdb.finItem.create({ data: { ...data, itemCode: code } }))
      : await pdb.finItem.create({ data: { ...data, itemCode: String(body.itemCode).trim().toUpperCase() } })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating item:', error)
    return NextResponse.json({ success: false, error: 'Failed to create item' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, itemCode, ...rest } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    // itemCode is immutable — PRs/grids reference it, so edits keep the code.
    void itemCode
    const pdb = getDbForRequest(request)
    const data: Record<string, unknown> = {}
    if (rest.name !== undefined) data.name = String(rest.name).trim()
    if (rest.description !== undefined) data.description = rest.description || null
    if (rest.categoryId !== undefined) data.categoryId = isBlank(rest.categoryId) ? null : Number(rest.categoryId)
    if (rest.uom !== undefined) data.uom = rest.uom
    if (rest.hsn !== undefined) data.hsn = rest.hsn || null
    if (rest.reorderLevel !== undefined) data.reorderLevel = parseNum(rest.reorderLevel)
    if (rest.rate !== undefined) data.rate = parseNum(rest.rate)
    if (rest.isActive !== undefined) data.isActive = !!rest.isActive
    if (rest.status !== undefined) data.isActive = String(rest.status).toLowerCase() !== 'inactive'
    const record = await pdb.finItem.update({ where: { id: Number(id) }, data, include: { category: { select: { id: true, code: true, name: true } } } })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating item:', error)
    return NextResponse.json({ success: false, error: 'Failed to update item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const ids = searchParams.get('ids')
    if (ids) {
      const idList = ids.split(',').map(Number).filter(Boolean)
      if (idList.length === 0) return NextResponse.json({ success: false, error: 'No valid ids' }, { status: 400 })
      const result = await pdb.finItem.deleteMany({ where: { id: { in: idList } } })
      return NextResponse.json({ success: true, deleted: result.count })
    }
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    await pdb.finItem.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete item' }, { status: 500 })
  }
}
