/**
 * Superadmin Trash API
 * Connects to a specific tenant's DB and manages soft-deleted records.
 * Query params: tenantId, type (leave-policy|attendance-rule|holiday|department|designation|employee)
 */
import { NextRequest, NextResponse } from 'next/server'
import { superadminDb } from '@/lib/superadmin-db'
import { getClientForUrl } from '@/lib/db'
import type { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

async function getTenantDb(tenantId: string): Promise<PrismaClient | null> {
  const tenant = await superadminDb.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) return null
  return getClientForUrl(tenant.dbUrl)
}

// GET: fetch deleted items of a given type from a tenant's DB
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId')
  const type = searchParams.get('type')

  if (!tenantId) return NextResponse.json({ success: false, error: 'tenantId required' }, { status: 400 })

  const db = await getTenantDb(tenantId)
  if (!db) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })

  try {
    let data: any[] = []

    if (!type || type === 'leave-policy') {
      const items = await db.leavePolicy.findMany({ where: { isActive: false }, orderBy: { updatedAt: 'desc' } })
      data.push(...items.map(i => ({ ...i, _type: 'leave-policy' })))
    }
    if (!type || type === 'attendance-rule') {
      const items = await db.attendanceRule.findMany({ where: { isActive: false }, orderBy: { updatedAt: 'desc' } })
      data.push(...items.map(i => ({ ...i, _type: 'attendance-rule' })))
    }
    if (!type || type === 'holiday') {
      const items = await db.holiday.findMany({ where: { isActive: false }, orderBy: { updatedAt: 'desc' } })
      data.push(...items.map(i => ({ ...i, _type: 'holiday' })))
    }
    if (!type || type === 'department') {
      // Departments don't have isActive — check if they have isDeleted or just list all
      // They use a different soft-delete pattern — skip if not applicable
      try {
        const items = await (db as any).department.findMany({ where: { isDeleted: true }, orderBy: { updatedAt: 'desc' } })
        data.push(...items.map((i: any) => ({ ...i, _type: 'department' })))
      } catch { /* department may not have isDeleted */ }
    }
    if (!type || type === 'designation') {
      try {
        const items = await (db as any).designation.findMany({ where: { isDeleted: true }, orderBy: { updatedAt: 'desc' } })
        data.push(...items.map((i: any) => ({ ...i, _type: 'designation' })))
      } catch { /* designation may not have isDeleted */ }
    }
    if (!type || type === 'employee') {
      const items = await db.employee.findMany({
        where: { isDeleted: true },
        include: { Department: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
      })
      data.push(...items.map(i => ({ ...i, _type: 'employee' })))
    }

    // Sort all by updatedAt desc
    data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    return NextResponse.json({ success: true, data })
  } catch (e) {
    console.error('Trash GET error:', e)
    return NextResponse.json({ success: false, error: 'Failed to fetch deleted items' }, { status: 500 })
  }
}

// POST: restore an item
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId')

  if (!tenantId) return NextResponse.json({ success: false, error: 'tenantId required' }, { status: 400 })

  const db = await getTenantDb(tenantId)
  if (!db) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })

  try {
    const { id, type } = await request.json()
    if (!id || !type) return NextResponse.json({ success: false, error: 'id and type required' }, { status: 400 })

    let result: any
    switch (type) {
      case 'leave-policy':
        result = await db.leavePolicy.update({ where: { id: parseInt(id) }, data: { isActive: true, updatedAt: new Date() } })
        break
      case 'attendance-rule':
        result = await db.attendanceRule.update({ where: { id: parseInt(id) }, data: { isActive: true, updatedAt: new Date() } })
        break
      case 'holiday':
        result = await db.holiday.update({ where: { id: parseInt(id) }, data: { isActive: true, updatedAt: new Date() } })
        break
      case 'employee':
        result = await db.employee.update({ where: { id: parseInt(id) }, data: { isDeleted: false, isActive: true, updatedAt: new Date() } })
        break
      default:
        return NextResponse.json({ success: false, error: `Restore not supported for type: ${type}` }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    console.error('Trash POST error:', e)
    return NextResponse.json({ success: false, error: 'Failed to restore item' }, { status: 500 })
  }
}

// DELETE: permanently delete an item
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId')

  if (!tenantId) return NextResponse.json({ success: false, error: 'tenantId required' }, { status: 400 })

  const db = await getTenantDb(tenantId)
  if (!db) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })

  try {
    const { id, type } = await request.json()
    if (!id || !type) return NextResponse.json({ success: false, error: 'id and type required' }, { status: 400 })

    switch (type) {
      case 'leave-policy':
        await db.leavePolicy.delete({ where: { id: parseInt(id) } })
        break
      case 'attendance-rule':
        await db.attendanceRule.delete({ where: { id: parseInt(id) } })
        break
      case 'holiday':
        await db.holiday.delete({ where: { id: parseInt(id) } })
        break
      case 'employee':
        await db.employee.delete({ where: { id: parseInt(id) } })
        break
      default:
        return NextResponse.json({ success: false, error: `Permanent delete not supported for type: ${type}` }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Trash DELETE error:', e)
    return NextResponse.json({ success: false, error: 'Failed to permanently delete item' }, { status: 500 })
  }
}
