import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { SC_INCLUDE, toIsoDate } from '@/lib/procurement-subcontract'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

// Component calls POST /api/procurement/subcontracts/{id}/progress-claims
// and expects `data` to be the PARENT subcontract (it re-reads json.data.id).
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { id: idParam } = await ctx.params
    const id = Number(idParam)
    if (!id) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 })
    const pdb = getDbForRequest(request)
    const parent = await pdb.finSubcontract.findUnique({ where: { id } })
    if (!parent) return NextResponse.json({ success: false, error: 'Contractor not found' }, { status: 404 })
    const body = await request.json()
    const date = toIsoDate(body.date)
    if (!body.claimNo || !date) {
      return NextResponse.json({ success: false, error: 'claimNo and date are required' }, { status: 400 })
    }
    const amountClaimed = Number(body.amountClaimed) || 0
    const amountPaid = Number(body.amountPaid) || 0
    await pdb.finSubcontractProgressClaim.create({
      data: {
        subcontractId: id,
        claimNo: String(body.claimNo),
        date,
        amountClaimed,
        certifiedAmount: Number(body.certifiedAmount) || 0,
        amountPaid,
        balance: body.balance !== undefined ? Number(body.balance) : amountClaimed - amountPaid,
        status: String(body.status || 'Submitted'),
      },
    })
    const record = await pdb.finSubcontract.findUnique({ where: { id }, include: SC_INCLUDE })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error adding progress claim:', error)
    return NextResponse.json({ success: false, error: 'Failed to add claim' }, { status: 500 })
  }
}
