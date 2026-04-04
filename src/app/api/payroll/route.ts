import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const records = await db.payroll.findMany({
      orderBy: { month: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            empId: true,
            name: true,
            role: true,
            site: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('[API /payroll GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payroll records' },
      { status: 500 }
    )
  }
}
