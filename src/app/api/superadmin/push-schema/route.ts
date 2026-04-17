import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { dbUrl } = await request.json()
    if (!dbUrl) return NextResponse.json({ success: false, error: 'dbUrl required' }, { status: 400 })

    // Push the main ERP schema to the target DB
    execSync(`npx prisma db push --schema=prisma/schema.prisma --skip-generate`, {
      env: { ...process.env, DATABASE_URL: dbUrl },
      timeout: 60000,
      stdio: 'pipe',
    })

    return NextResponse.json({ success: true, message: 'Schema pushed successfully' })
  } catch (e: any) {
    console.error('Push schema error:', e)
    return NextResponse.json({ success: false, error: e.message || 'Schema push failed' }, { status: 500 })
  }
}
