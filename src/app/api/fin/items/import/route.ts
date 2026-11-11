import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { nextItemCode, withCodeRetry, isBlank } from '@/lib/auto-number'

export const dynamic = 'force-dynamic'

interface ImportRecord {
  itemCode?: string
  name: string
  specification?: string
  makeBrand?: string
  modelNo?: string
  sizeCapacity?: string
  description?: string
  category?: string
  uom?: string
  hsn?: string
  reorderLevel?: number | string
  rate?: number | string
  status?: string
}

function parseNum(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// Commits rows already mapped and reviewed client-side (Upload → Map → Preview
// wizard). Upserts by itemCode. Rows with a blank itemCode get a server-side,
// category-segmented code (CON-001…); ITM-001 for uncategorised rows.
export async function POST(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const body = await request.json()
    const records: ImportRecord[] = Array.isArray(body?.records) ? body.records : []
    if (records.length === 0) return NextResponse.json({ success: false, error: 'No records provided' }, { status: 400 })

    let created = 0, updated = 0, skipped = 0, errors = 0
    const errorRows: { row: number; message: string }[] = []

    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      if (isBlank(r.name) || String(r.name).trim().length < 2) { skipped++; continue }
      try {
        // Resolve the category by its 3-letter segment code, else by name.
        let category: { id: number; code: string } | null = null
        if (!isBlank(r.category)) {
          const q = String(r.category).trim().toUpperCase()
          category = await pdb.finItemCategory.findFirst({
            where: { OR: [{ code: q }, { name: { equals: String(r.category).trim() } }] },
            select: { id: true, code: true },
          })
          if (!category) {
            errorRows.push({ row: i + 1, message: `Category not found: ${r.category}` })
            errors++
            continue
          }
        }
        const data = {
          name: String(r.name).trim(),
          specification: r.specification || null,
          makeBrand: r.makeBrand || null,
          modelNo: r.modelNo || null,
          sizeCapacity: r.sizeCapacity || null,
          description: r.description || null,
          // Category omitted from the sheet → leave it untouched on update
          // (null only when explicitly resolved to an uncategorised row on create).
          ...(category ? { categoryId: category.id } : {}),
          uom: r.uom || 'Nos',
          hsn: r.hsn || null,
          reorderLevel: parseNum(r.reorderLevel),
          rate: parseNum(r.rate),
          isActive: (r.status || 'Active').toLowerCase() !== 'inactive',
        }
        if (isBlank(r.itemCode)) {
          await withCodeRetry(
            () => nextItemCode(pdb, category?.code ?? null),
            (code) => pdb.finItem.create({ data: { ...data, itemCode: code } }),
          )
          created++
        } else {
          const code = String(r.itemCode).trim().toUpperCase()
          const existing = await pdb.finItem.findUnique({ where: { itemCode: code } })
          if (existing) { await pdb.finItem.update({ where: { id: existing.id }, data }); updated++ }
          else { await pdb.finItem.create({ data: { ...data, itemCode: code } }); created++ }
        }
      } catch (e) {
        errors++
        errorRows.push({ row: i + 1, message: (e as Error).message })
      }
    }

    return NextResponse.json({
      success: true,
      summary: { totalRows: records.length, created, updated, skipped, errors },
      errorRows: errorRows.slice(0, 20),
    })
  } catch (error) {
    console.error('Items import error:', error)
    return NextResponse.json({ success: false, error: (error as Error).message || 'Import failed' }, { status: 500 })
  }
}
