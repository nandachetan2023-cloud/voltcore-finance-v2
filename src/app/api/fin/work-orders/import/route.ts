import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

const AMOUNTS = [
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

const text = (value: unknown) => String(value ?? '').trim()
const number = (value: unknown) => value === '' || value === null || value === undefined ? 0 : Number(value)

function parseDate(value: unknown): Date | null {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

export async function POST(request: NextRequest) {
  try {
    const db = getDbForRequest(request)
    const body = await request.json()
    const records = Array.isArray(body?.records) ? body.records as Record<string, unknown>[] : []
    if (!records.length) return NextResponse.json({ success: false, error: 'No records provided' }, { status: 400 })

    let created = 0
    let updated = 0
    let skipped = 0
    let errors = 0
    const errorRows: { row: number; message: string }[] = []

    for (let index = 0; index < records.length; index++) {
      const row = records[index]
      const workOrderNo = text(row.workOrderNo)
      const customerName = text(row.customerName)
      const siteCode = text(row.siteCode)
      const jobCode = text(row.jobCode)
      if (!workOrderNo || !customerName || !siteCode || !jobCode) {
        skipped++
        continue
      }

      try {
        const customer = await db.finParty.findFirst({ where: { name: customerName, partyType: 'Customer' } })
        if (!customer || !customer.isActive) throw new Error('Customer was not found or is inactive in the Finance party register')

        const site = await db.finSite.findUnique({ where: { siteCode } })
        if (!site || site.customerId !== customer.id) throw new Error('Site does not belong to the selected customer')
        const job = await db.finJob.findUnique({ where: { jobCode }, select: { siteId: true } })
        if (!job || job.siteId !== site.id) throw new Error('Job does not belong to the selected site')
        for (const field of ['costCenter', 'department', 'projectManager']) {
          if (!text(row[field])) throw new Error(`${field} is required`)
        }

        const orderInitiationDate = parseDate(row.orderInitiationDate)
        const orderCompletionDate = parseDate(row.orderCompletionDate)
        if (row.orderInitiationDate && !orderInitiationDate) throw new Error('Order initiation date is invalid')
        if (row.orderCompletionDate && !orderCompletionDate) throw new Error('Order completion date is invalid')
        if (orderInitiationDate && orderCompletionDate && orderCompletionDate < orderInitiationDate) {
          throw new Error('Order completion date must be on or after initiation date')
        }

        const data: Prisma.FinWorkOrderUncheckedCreateInput = {
          workOrderNo,
          customerId: customer.id,
          siteId: site.id,
          jobCode,
          costCenter: text(row.costCenter) || null,
          department: text(row.department) || null,
          projectManager: text(row.projectManager) || null,
          date: orderInitiationDate || new Date(),
          descriptionOfWork: text(row.descriptionOfWork) || null,
          orderInitiationDate,
          orderCompletionDate,
          bgSource: text(row.bgSource) || null,
          delayExtensionLetter: text(row.delayExtensionLetter) || null,
          reasonOfDelay: text(row.reasonOfDelay) || null,
          subcontractedTo: text(row.subcontractedTo) || null,
          status: text(row.status) || 'Active',
        }
        if (!['Active', 'Completed', 'On Hold', 'Cancelled'].includes(String(data.status))) throw new Error('Select a valid Work Order status')

        for (const field of AMOUNTS) {
          const value = number(row[field])
          if (!Number.isFinite(value) || value < 0) throw new Error(`${field} must be a non-negative number`)
          data[field] = value
        }

        const existing = await db.finWorkOrder.findUnique({ where: { workOrderNo } })
        if (existing) {
          await db.finWorkOrder.update({ where: { id: existing.id }, data })
          updated++
        } else {
          await db.finWorkOrder.create({ data: { ...data, workOrderNo } })
          created++
        }
      } catch (error) {
        errors++
        errorRows.push({ row: index + 1, message: error instanceof Error ? error.message : 'Row could not be imported' })
      }
    }

    return NextResponse.json({
      success: true,
      summary: { totalRows: records.length, created, updated, skipped, errors },
      errorRows: errorRows.slice(0, 20),
    })
  } catch (error) {
    console.error('Customer Work Order import error:', error)
    return NextResponse.json({ success: false, error: 'Failed to import customer Work Orders' }, { status: 500 })
  }
}
