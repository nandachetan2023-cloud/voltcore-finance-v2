import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { getDbForRequest } from '@/lib/db'
import { assertPermission } from '@/lib/fin-rbac'
import { nextPrefixedCode, withCodeRetry } from '@/lib/auto-number'

export const dynamic = 'force-dynamic'

const INCLUDE = {
  customer: { select: { id: true, name: true, code: true } },
  site: { select: { id: true, name: true, siteCode: true } },
}

const AMOUNT_FIELDS = [
  'bgAmount',
  'totalAmount',
  'unexecutedWorkAmount',
  'amountBookedLastFY',
  'amountBookedCurrentFY',
  'amountToBeBookedByEndFY',
  'billRaisedAmount',
  'amountReceivedOutOfBill',
  'workDoneNotBilled',
] as const

function validDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

async function validateWorkOrder(db: any, data: Record<string, any>) {
  const customerId = Number(data.customerId)
  const siteId = Number(data.siteId)
  if (!Number.isInteger(customerId) || customerId <= 0) return { error: 'Select a valid customer' } as const
  if (!Number.isInteger(siteId) || siteId <= 0) return { error: 'Select a valid site' } as const
  if (!String(data.jobCode || '').trim()) return { error: 'Job Code is required' } as const

  const [customer, site, job] = await Promise.all([
    db.finParty.findUnique({ where: { id: customerId }, select: { id: true, partyType: true, isActive: true } }),
    db.finSite.findUnique({ where: { id: siteId }, select: { id: true, siteCode: true, customerId: true } }),
    db.finJob.findUnique({ where: { jobCode: String(data.jobCode).trim() }, select: { siteId: true } }),
  ])
  if (!customer || customer.partyType !== 'Customer' || !customer.isActive) return { error: 'Selected party is not an active customer' } as const
  if (!site) return { error: 'Selected site was not found' } as const
  if (site.customerId !== customerId) return { error: 'Selected customer does not own the selected site' } as const
  if (!job) return { error: 'Selected job was not found' } as const
  if (job.siteId !== siteId) return { error: 'Selected job does not belong to the selected site' } as const
  for (const key of ['costCenter', 'department', 'projectManager']) {
    if (!String(data[key] || '').trim()) return { error: `${key} is required` } as const
  }

  for (const key of AMOUNT_FIELDS) {
    if (data[key] === undefined || data[key] === null || data[key] === '') continue
    const amount = Number(data[key])
    if (!Number.isFinite(amount) || amount < 0) return { error: `${key} must be a non-negative number` } as const
    data[key] = amount
  }

  const start = validDate(data.orderInitiationDate)
  const end = validDate(data.orderCompletionDate)
  if (data.orderInitiationDate && !start) return { error: 'Order initiation date is invalid' } as const
  if (data.orderCompletionDate && !end) return { error: 'Order completion date is invalid' } as const
  if (start && end && end < start) return { error: 'Order completion date must be on or after initiation date' } as const
  if (!['Active', 'Completed', 'On Hold', 'Cancelled'].includes(String(data.status || 'Active'))) {
    return { error: 'Select a valid Work Order status' } as const
  }

  return { customerId, siteId, siteCode: site.siteCode, jobCode: String(data.jobCode).trim(), start, end } as const
}

function toRecordData(data: Record<string, any>, validated: Exclude<Awaited<ReturnType<typeof validateWorkOrder>>, { error: string }>): Prisma.FinWorkOrderUncheckedCreateInput {
  const { customerId, siteId, jobCode, start, end } = validated
  const record: Prisma.FinWorkOrderUncheckedCreateInput = {
    workOrderNo: String(data.workOrderNo || '').trim(),
    customerId,
    siteId,
    jobCode,
    costCenter: String(data.costCenter || '').trim() || null,
    department: String(data.department || '').trim() || null,
    projectManager: String(data.projectManager || '').trim() || null,
    date: start || validDate(data.date) || new Date(),
    descriptionOfWork: String(data.descriptionOfWork || '').trim() || null,
    orderInitiationDate: start,
    orderCompletionDate: end,
    bgAmount: Number(data.bgAmount) || 0,
    bgSource: String(data.bgSource || '').trim() || null,
    totalAmount: Number(data.totalAmount) || 0,
    unexecutedWorkAmount: Number(data.unexecutedWorkAmount) || 0,
    amountBookedLastFY: Number(data.amountBookedLastFY) || 0,
    amountBookedCurrentFY: Number(data.amountBookedCurrentFY) || 0,
    amountToBeBookedByEndFY: Number(data.amountToBeBookedByEndFY) || 0,
    billRaisedAmount: Number(data.billRaisedAmount) || 0,
    amountReceivedOutOfBill: Number(data.amountReceivedOutOfBill) || 0,
    workDoneNotBilled: Number(data.workDoneNotBilled) || 0,
    delayExtensionLetter: String(data.delayExtensionLetter || '').trim() || null,
    reasonOfDelay: String(data.reasonOfDelay || '').trim() || null,
    subcontractedTo: String(data.subcontractedTo || '').trim() || null,
    status: String(data.status || 'Active').trim(),
  }
  return record
}

export async function GET(request: NextRequest) {
  try {
    const db = getDbForRequest(request)
    const records = await db.finWorkOrder.findMany({ include: INCLUDE, orderBy: { date: 'desc' } })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching customer work orders:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch customer work orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const db = getDbForRequest(request)
    const validated = await validateWorkOrder(db, body)
    if ('error' in validated) return NextResponse.json({ success: false, error: validated.error }, { status: 400 })
    const denied = await assertPermission(db, body.actor || '', 'AR_CREATE', { request, module: 'AR', siteCode: validated.siteCode })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to create customer work orders' }, { status: 403 })

    const data = toRecordData(body, validated)
    const create = (workOrderNo: string) => db.finWorkOrder.create({
      data: { ...data, workOrderNo },
      include: INCLUDE,
    })
    const record = String(body.workOrderNo || '').trim()
      ? await create(String(body.workOrderNo).trim())
      : await withCodeRetry(
        () => nextPrefixedCode(db, 'finWorkOrder', 'workOrderNo', `WO/${new Date().getFullYear()}/`, 4),
        create,
      )
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating customer work order:', error)
    return NextResponse.json({ success: false, error: 'Failed to create customer work order' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const id = Number(body.id)
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const db = getDbForRequest(request)
    const current = await db.finWorkOrder.findUnique({ where: { id } })
    if (!current) return NextResponse.json({ success: false, error: 'Customer work order not found' }, { status: 404 })
    const merged = { ...current, ...body }
    const validated = await validateWorkOrder(db, merged)
    if ('error' in validated) return NextResponse.json({ success: false, error: validated.error }, { status: 400 })
    const denied = await assertPermission(db, body.actor || '', 'AR_EDIT', { request, module: 'AR', entityId: String(id), siteCode: validated.siteCode })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to edit customer work orders' }, { status: 403 })

    const data = toRecordData(merged, validated)
    if (body.workOrderNo !== undefined) data.workOrderNo = String(body.workOrderNo).trim()
    const record = await db.finWorkOrder.update({ where: { id }, data, include: INCLUDE })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating customer work order:', error)
    return NextResponse.json({ success: false, error: 'Failed to update customer work order' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')
    const id = Number(searchParams.get('id'))
    const ids = idsParam
      ? idsParam.split(',').map(value => Number(value)).filter(value => Number.isInteger(value) && value > 0)
      : Number.isInteger(id) && id > 0 ? [id] : []
    if (!ids.length) return NextResponse.json({ success: false, error: 'id or ids is required' }, { status: 400 })

    const db = getDbForRequest(request)
    const records = await db.finWorkOrder.findMany({ where: { id: { in: ids } }, select: { id: true, siteId: true } })
    if (records.length !== ids.length) return NextResponse.json({ success: false, error: 'One or more customer work orders were not found' }, { status: 404 })
    const site = await db.finSite.findUnique({ where: { id: records[0].siteId }, select: { siteCode: true } })
    const denied = await assertPermission(db, request.headers.get('x-actor-email') || '', 'AR_DELETE', { request, module: 'AR', entityId: ids.join(','), siteCode: site?.siteCode ?? null })
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to delete customer work orders' }, { status: 403 })

    const linkedInvoices = await db.finInvoice.count({ where: { workOrderId: { in: ids } } })
    const linkedAr = await db.accountsReceivable.count({ where: { workOrderId: { in: ids } } })
    if (linkedInvoices || linkedAr) {
      return NextResponse.json({ success: false, error: 'Cannot delete a work order linked to an invoice' }, { status: 409 })
    }

    const result = await db.finWorkOrder.deleteMany({ where: { id: { in: ids } } })
    return NextResponse.json({ success: true, deleted: result.count })
  } catch (error) {
    console.error('Error deleting customer work order:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete customer work order' }, { status: 500 })
  }
}
