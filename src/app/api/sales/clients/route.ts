import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

const INCLUDE = {
  contacts: true,
  projects: true,
  opportunities: true,
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const records = await pdb.finClient.findMany({ include: INCLUDE, orderBy: { name: 'asc' } })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)
    const { contacts, projects, opportunities, ...data } = body
    const record = await pdb.finClient.create({
      data: {
        ...data,
        contacts: contacts ? { create: contacts } : undefined,
        projects: projects ? { create: projects } : undefined,
        opportunities: opportunities ? { create: opportunities } : undefined,
      },
      include: INCLUDE,
    })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json({ success: false, error: 'Failed to create' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, contacts, projects, opportunities, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    if (contacts) {
      await pdb.finClientContact.deleteMany({ where: { clientId: id } })
      await pdb.finClientContact.createMany({ data: contacts.map((c: any) => ({ ...c, clientId: id })) })
    }
    if (projects) {
      await pdb.finClientProject.deleteMany({ where: { clientId: id } })
      await pdb.finClientProject.createMany({ data: projects.map((p: any) => ({ ...p, clientId: id })) })
    }
    if (opportunities) {
      await pdb.finClientOpportunity.deleteMany({ where: { clientId: id } })
      await pdb.finClientOpportunity.createMany({ data: opportunities.map((o: any) => ({ ...o, clientId: id })) })
    }
    const record = await pdb.finClient.update({ where: { id }, data, include: INCLUDE })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const pdb = getDbForRequest(request)
    await pdb.finClient.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}
