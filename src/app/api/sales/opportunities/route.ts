import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

const INCLUDE = {
  contacts: true,
  documents: true,
  bidCosts: true,
  competitors: true,
  goNoGo: true,
  stageHistory: true,
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finOpportunity.findMany({ include: INCLUDE, orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching opportunities:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const { contacts, documents, bidCosts, competitors, goNoGo, stageHistory, ...data } = body
    const record = await pdb.finOpportunity.create({
      data: {
        ...data,
        contacts: contacts ? { create: contacts } : undefined,
        documents: documents ? { create: documents } : undefined,
        bidCosts: bidCosts ? { create: bidCosts } : undefined,
        competitors: competitors ? { create: competitors } : undefined,
        goNoGo: goNoGo ? { create: goNoGo } : undefined,
        stageHistory: stageHistory ? { create: stageHistory } : undefined,
      },
      include: INCLUDE,
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating opportunity:', error)
    return NextResponse.json({ success: false, error: 'Failed to create' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, contacts, documents, bidCosts, competitors, goNoGo, stageHistory, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    if (contacts) {
      await pdb.finOpportunityContact.deleteMany({ where: { opportunityId: id } })
      await pdb.finOpportunityContact.createMany({ data: contacts.map((c: any) => ({ ...c, opportunityId: id })) })
    }
    if (documents) {
      await pdb.finOpportunityDocument.deleteMany({ where: { opportunityId: id } })
      await pdb.finOpportunityDocument.createMany({ data: documents.map((d: any) => ({ ...d, opportunityId: id })) })
    }
    if (bidCosts) {
      await pdb.finOpportunityBidCost.deleteMany({ where: { opportunityId: id } })
      await pdb.finOpportunityBidCost.createMany({ data: bidCosts.map((b: any) => ({ ...b, opportunityId: id })) })
    }
    if (competitors) {
      await pdb.finOpportunityCompetitor.deleteMany({ where: { opportunityId: id } })
      await pdb.finOpportunityCompetitor.createMany({ data: competitors.map((c: any) => ({ ...c, opportunityId: id })) })
    }
    if (goNoGo) {
      await pdb.finOppGoNoGo.deleteMany({ where: { opportunityId: id } })
      await pdb.finOppGoNoGo.createMany({ data: goNoGo.map((g: any) => ({ ...g, opportunityId: id })) })
    }
    if (stageHistory) {
      await pdb.finOppStageHistory.deleteMany({ where: { opportunityId: id } })
      await pdb.finOppStageHistory.createMany({ data: stageHistory.map((h: any) => ({ ...h, opportunityId: id })) })
    }
    const record = await pdb.finOpportunity.update({ where: { id }, data, include: INCLUDE })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating opportunity:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    await pdb.finOpportunity.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting opportunity:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}
