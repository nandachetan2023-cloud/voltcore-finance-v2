import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List all certifications
export async function GET(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const certifications = await db.certification.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: { certifications },
    })
  } catch (error) {
    console.error('Error fetching certifications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch certifications' },
      { status: 500 }
    )
  }
}

// POST: Create certification or training session
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const body = await request.json()

    if (type === 'cert') {
      const { empId, employeeName, name, issuedBy, issueDate, expiryDate, status, filePath } = body

      if (!empId || !employeeName || !name) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        )
      }

      const certification = await db.certification.create({
        data: {
          empId,
          employeeName,
          name,
          issuedBy: issuedBy || 'N/A',
          issueDate: issueDate || new Date().toISOString().split('T')[0],
          expiryDate: expiryDate || new Date().toISOString().split('T')[0],
          status: status || 'Valid',
          filePath: filePath || null,
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({ success: true, data: certification }, { status: 201 })
    } else if (type === 'training') {
      const { title, site, trainer, date, duration, attendees, status } = body

      if (!title || !site || !trainer || !date || !duration) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        )
      }

      const trainingSession = await db.trainingSession.create({
        data: {
          title,
          site,
          trainer,
          date,
          duration,
          attendees: Number(attendees) || 0,
          status: status || 'Scheduled',
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({ success: true, data: trainingSession }, { status: 201 })
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid type parameter' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error creating training record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create training record' },
      { status: 500 }
    )
  }
}

// PUT: Update by id
export async function PUT(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    if (type === 'cert') {
      const existing = await db.certification.findUnique({ where: { id: Number(id) } })
      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Certification not found' },
          { status: 404 }
        )
      }

      const certification = await db.certification.update({
        where: { id: Number(id) },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({ success: true, data: certification })
    } else if (type === 'training') {
      const existing = await db.trainingSession.findUnique({ where: { id: Number(id) } })
      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Training session not found' },
          { status: 404 }
        )
      }

      const trainingSession = await db.trainingSession.update({
        where: { id: Number(id) },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({ success: true, data: trainingSession })
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid type parameter' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error updating training record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update training record' },
      { status: 500 }
    )
  }
}

// DELETE: Delete by id
export async function DELETE(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    if (type === 'cert') {
      const existing = await db.certification.findUnique({ where: { id: Number(id) } })
      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Certification not found' },
          { status: 404 }
        )
      }

      await db.certification.delete({ where: { id: Number(id) } })
      return NextResponse.json({ success: true, data: { id } })
    } else if (type === 'training') {
      const existing = await db.trainingSession.findUnique({ where: { id: Number(id) } })
      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Training session not found' },
          { status: 404 }
        )
      }

      await db.trainingSession.delete({ where: { id: Number(id) } })
      return NextResponse.json({ success: true, data: { id } })
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid type parameter' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error deleting training record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete training record' },
      { status: 500 }
    )
  }
}
