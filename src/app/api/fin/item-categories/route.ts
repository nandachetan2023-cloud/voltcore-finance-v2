import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finItemCategory.findMany({ orderBy: { code: 'asc' }, include: { _count: { select: { items: true } } } })
    return NextResponse.json({
      success: true,
      data: records.map((c) => ({ id: c.id, code: c.code, name: c.name, isActive: c.isActive, itemCount: c._count.items })),
    })
  } catch (error) {
    console.error('Error fetching item categories:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const code = String(body.code || '').trim().toUpperCase().replace(/[^A-Z0-9&]/g, '')
    const name = String(body.name || '').trim()
    // Docx prefix master allows up to 4 chars incl. '&' (CON, P&M, T&T, PPE, GAS…)
    if (!/^[A-Z0-9&]{2,4}$/.test(code)) {
      return NextResponse.json({ success: false, error: 'Category code must be 2–4 characters: letters, digits or & (e.g. CON, P&M, T&T)' }, { status: 400 })
    }
    if (name.length < 2) return NextResponse.json({ success: false, error: 'Category name is required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const dup = await pdb.finItemCategory.findFirst({ where: { OR: [{ code }, { name }] } })
    if (dup) return NextResponse.json({ success: false, error: `Category already exists (code ${dup.code})` }, { status: 400 })
    const record = await pdb.finItemCategory.create({ data: { code, name } })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating item category:', error)
    return NextResponse.json({ success: false, error: 'Failed to create category' }, { status: 500 })
  }
}
