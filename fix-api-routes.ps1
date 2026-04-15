# PowerShell script to create stub implementations for API routes with missing models

$stubTemplate = @'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// NOTE: This module's models don't exist in current schema
// Returning empty data until models are added

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: [],
      message: 'Module not yet implemented in database schema',
    })
  } catch (error) {
    console.error('Error fetching data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(
      { success: false, error: 'Module not yet implemented in database schema' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error creating record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create record' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    return NextResponse.json(
      { success: false, error: 'Module not yet implemented in database schema' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error updating record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update record' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return NextResponse.json(
      { success: false, error: 'Module not yet implemented in database schema' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error deleting record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete record' },
      { status: 500 }
    )
  }
}
'@

$stubRoutes = @(
  "equipment",
  "incidents",
  "permits",
  "expenses",
  "subcontractors",
  "support",
  "knowledgebase",
  "journal-entries",
  "accounts-payable",
  "accounts-receivable",
  "bank-cash",
  "taxation",
  "budget",
  "ledger",
  "financial-reports",
  "finance-dashboard",
  "shifts"
)

Write-Host "Creating stub implementations for API routes with missing models..." -ForegroundColor Cyan

foreach ($route in $stubRoutes) {
  $filePath = "src/app/api/$route/route.ts"
  if (Test-Path $filePath) {
    Write-Host "Creating stub for $route..." -ForegroundColor Yellow
    Set-Content -Path $filePath -Value $stubTemplate
  }
}

Write-Host ""
Write-Host "Done! All stub implementations created." -ForegroundColor Green
Write-Host ""
Write-Host "Routes that now return empty data:" -ForegroundColor Cyan
foreach ($route in $stubRoutes) {
  Write-Host "  - /api/$route" -ForegroundColor White
}
