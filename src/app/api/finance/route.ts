import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Finance API',
    endpoints: [
      '/api/finance/import/os-details/preview',
      '/api/finance/import/os-details/commit',
      '/api/finance/import/work-order/preview',
      '/api/finance/import/work-order/commit',
      '/api/finance/import/payment-advice/preview',
      '/api/finance/import/payment-advice/commit',
    ],
  })
}