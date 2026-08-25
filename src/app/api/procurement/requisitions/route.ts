import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

const INCLUDE = { items: true, approvals: true }

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finPurchaseRequisition.findMany({ include: INCLUDE, orderBy: { date: 'desc' } })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching PRs:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const { items, approvals, ...data } = body
    const year = new Date().getFullYear()
    const count = await pdb.finPurchaseRequisition.count()
    const record = await pdb.finPurchaseRequisition.create({
      data: {
        prNo: data.prNo || `PR-${year}-${String(count + 1).padStart(4, '0')}`,
        date: data.date ? new Date(data.date) : new Date(),
        requester: data.requester,
        project: data.project,
        requiredBy: data.requiredBy ? new Date(data.requiredBy) : null,
        totalEstCost: data.totalEstCost ?? (items ? items.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0) : 0),
        status: data.status || 'Draft',
        items: items ? { create: items.map((i: any) => ({ description: i.description, qty: i.qty, unit: i.unit, estCost: i.estCost, total: i.total })) } : undefined,
        approvals: approvals ? { create: approvals.map((a: any) => ({ role: a.role, label: a.label, status: a.status })) } : undefined,
      },
      include: INCLUDE,
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating PR:', error)
    return NextResponse.json({ success: false, error: 'Failed to create' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, items, approvals, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    if (items) {
      await pdb.finPRLineItem.deleteMany({ where: { prId: id } })
      await pdb.finPRLineItem.createMany({
        data: items.map((i: any) => ({ description: i.description, qty: i.qty, unit: i.unit, estCost: i.estCost, total: i.total, prId: id })),
      })
    }
    if (approvals) {
      await pdb.finPRApproval.deleteMany({ where: { prId: id } })
      await pdb.finPRApproval.createMany({ data: approvals.map((a: any) => ({ ...a, prId: id })) })
    }
    const record = await pdb.finPurchaseRequisition.update({ where: { id }, data, include: INCLUDE })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating PR:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    await pdb.finPurchaseRequisition.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting PR:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}
