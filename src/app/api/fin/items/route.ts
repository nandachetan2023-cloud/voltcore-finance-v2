import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { nextItemCode, withCodeRetry, isBlank } from '@/lib/auto-number'

export const dynamic = 'force-dynamic'

function parseNum(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// Item codes live as plain strings in the ledger (no FK). A soft check so a
// delete doesn't strand ledger history — the fix is deactivating the item.
async function itemsInUse(pdb: any, ids: number[]): Promise<Set<number>> {
  const items: Array<{ id: number; itemCode: string }> = await pdb.finItem.findMany({
    where: { id: { in: ids } },
    select: { id: true, itemCode: true },
  })
  if (items.length === 0) return new Set()
  const codes = items.map((i) => i.itemCode)
  const refs: Array<{ itemCode: string }> = await pdb.finStockLedger.findMany({
    where: { itemCode: { in: codes } },
    select: { itemCode: true },
    distinct: ['itemCode'],
  })
  const usedCodes = new Set(refs.map((r) => r.itemCode))
  return new Set(items.filter((i) => usedCodes.has(i.itemCode)).map((i) => i.id))
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
      const n = Number(body.categoryId)
      if (!Number.isFinite(n)) return NextResponse.json({ success: false, error: 'categoryId must be a number' }, { status: 400 })
      const cat = await pdb.finItemCategory.findUnique({ where: { id: n } })
      if (!cat) return NextResponse.json({ success: false, error: 'Category not found' }, { status: 400 })
      categoryId = cat.id
      categoryCode = cat.code
    }
    const data = {
      name: String(body.name).trim(),
      specification: body.specification || null,
      makeBrand: body.makeBrand || null,
      modelNo: body.modelNo || null,
      sizeCapacity: body.sizeCapacity || null,
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
    const idNum = Number(id)
    if (!Number.isFinite(idNum)) return NextResponse.json({ success: false, error: 'id must be a number' }, { status: 400 })
    if (rest.name !== undefined && String(rest.name).trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Item name must be at least 2 characters' }, { status: 400 })
    }
    if (rest.categoryId !== undefined && !isBlank(rest.categoryId)) {
      const n = Number(rest.categoryId)
      if (!Number.isFinite(n)) return NextResponse.json({ success: false, error: 'categoryId must be a number' }, { status: 400 })
    }
    // itemCode is immutable — PRs/grids reference it, so edits keep the code.
    void itemCode
    const pdb = getDbForRequest(request)
    const data: Record<string, unknown> = {}
    if (rest.name !== undefined) data.name = String(rest.name).trim()
    if (rest.specification !== undefined) data.specification = rest.specification || null
    if (rest.makeBrand !== undefined) data.makeBrand = rest.makeBrand || null
    if (rest.modelNo !== undefined) data.modelNo = rest.modelNo || null
    if (rest.sizeCapacity !== undefined) data.sizeCapacity = rest.sizeCapacity || null
    if (rest.description !== undefined) data.description = rest.description || null
    if (rest.categoryId !== undefined) data.categoryId = isBlank(rest.categoryId) ? null : Number(rest.categoryId)
    if (rest.uom !== undefined) data.uom = rest.uom
    if (rest.hsn !== undefined) data.hsn = rest.hsn || null
    if (rest.reorderLevel !== undefined) data.reorderLevel = parseNum(rest.reorderLevel)
    if (rest.rate !== undefined) data.rate = parseNum(rest.rate)
    if (rest.isActive !== undefined) data.isActive = !!rest.isActive
    if (rest.status !== undefined) data.isActive = String(rest.status).toLowerCase() !== 'inactive'
    const record = await pdb.finItem.update({ where: { id: idNum }, data, include: { category: { select: { id: true, code: true, name: true } } } })
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
      const idList = [...new Set(ids.split(',').map(Number).filter((n) => Number.isFinite(n) && n > 0))]
      if (idList.length === 0) return NextResponse.json({ success: false, error: 'No valid ids' }, { status: 400 })
      const blocked = await itemsInUse(pdb, idList)
      const deletable = idList.filter((n) => !blocked.has(n))
      const result = deletable.length ? await pdb.finItem.deleteMany({ where: { id: { in: deletable } } }) : { count: 0 }
      return NextResponse.json({
        success: true,
        deleted: result.count,
        skipped: blocked.size,
        message: blocked.size ? `${blocked.size} item(s) in use by the stock ledger were skipped — deactivate them instead` : undefined,
      })
    }
    const id = Number(searchParams.get('id'))
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const blocked = await itemsInUse(pdb, [id])
    if (blocked.has(id)) {
      return NextResponse.json({ success: false, error: 'Item is referenced by the stock ledger — deactivate it instead of deleting' }, { status: 409 })
    }
    await pdb.finItem.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete item' }, { status: 500 })
  }
}
