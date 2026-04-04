import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List all certifications and training sessions combined
export async function GET() {
  try {
    const [certifications, trainingSessions] = await Promise.all([
      db.certification.findMany({ orderBy: { createdAt: 'desc' } }),
      db.trainingSession.findMany({ orderBy: { createdAt: 'desc' } }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        certifications,
        trainingSessions,
      },
    })
  } catch (error) {
    console.error('Error fetching training data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch training data' },
      { status: 500 }
    )
  }
}

// POST: Create certification or training session (use ?type=cert or ?type=training)
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const body = await request.json()

    if (type === 'cert') {
      const { empId, employeeName, name, issuedBy, issueDate, expiryDate, status } = body

      if (!empId || !employeeName || !name || !issuedBy || !issueDate || !expiryDate) {
        return NextResponse.json(
          { success: false, error: 'empId, employeeName, name, issuedBy, issueDate, and expiryDate are required' },
          { status: 400 }
        )
      }

      const certification = await db.certification.create({
        data: {
          empId,
          employeeName,
          name,
          issuedBy,
          issueDate,
          expiryDate,
          status: status || 'Valid',
        },
      })

      return NextResponse.json({ success: true, data: { type: 'cert', ...certification } }, { status: 201 })
    } else if (type === 'training') {
      const { title, site, trainer, date, duration, attendees, status } = body

      if (!title || !site || !trainer || !date || !duration) {
        return NextResponse.json(
          { success: false, error: 'title, site, trainer, date, and duration are required' },
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
          attendees: attendees || 0,
          status: status || 'Scheduled',
        },
      })

      return NextResponse.json({ success: true, data: { type: 'training', ...trainingSession } }, { status: 201 })
    } else {
      return NextResponse.json(
        { success: false, error: 'Query parameter ?type=cert or ?type=training is required' },
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

// PUT: Update by id (accepts ?type=cert or ?type=training to determine model)
export async function PUT(request: NextRequest) {
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
      const existing = await db.certification.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Certification not found' },
          { status: 404 }
        )
      }

      const updated = await db.certification.update({ where: { id }, data })
      return NextResponse.json({ success: true, data: updated })
    } else if (type === 'training') {
      const existing = await db.trainingSession.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Training session not found' },
          { status: 404 }
        )
      }

      const updated = await db.trainingSession.update({ where: { id }, data })
      return NextResponse.json({ success: true, data: updated })
    } else {
      return NextResponse.json(
        { success: false, error: 'Query parameter ?type=cert or ?type=training is required' },
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

// DELETE: Delete by id (accepts ?type=cert or ?type=training to determine model)
export async function DELETE(request: NextRequest) {
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
      const existing = await db.certification.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Certification not found' },
          { status: 404 }
        )
      }

      await db.certification.delete({ where: { id } })
      return NextResponse.json({ success: true, data: { id } })
    } else if (type === 'training') {
      const existing = await db.trainingSession.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Training session not found' },
          { status: 404 }
        )
      }

      await db.trainingSession.delete({ where: { id } })
      return NextResponse.json({ success: true, data: { id } })
    } else {
      return NextResponse.json(
        { success: false, error: 'Query parameter ?type=cert or ?type=training is required' },
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
