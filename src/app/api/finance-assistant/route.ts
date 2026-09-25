import { NextRequest, NextResponse } from 'next/server'
import { run } from '@/lib/assistant/engine'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await run(request, {
      text: body.text ?? '',
      userEmail: body.userEmail ?? '',
      moduleId: body.moduleId ?? '',
      context: body.context,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('[finance-assistant] error:', error)
    return NextResponse.json({ success: false, action: 'error', message: 'The assistant hit an unexpected error.' }, { status: 500 })
  }
}
