#!/bin/bash

# Script to create stub implementations for all API routes that reference non-existent models

echo "Creating stub implementations for API routes with missing models..."

# List of API routes that need stub implementations (models don't exist in schema)
STUB_ROUTES=(
  "projects"
  "equipment"
  "incidents"
  "permits"
  "expenses"
  "subcontractors"
  "support"
  "knowledgebase"
  "journal-entries"
  "accounts-payable"
  "accounts-receivable"
  "bank-cash"
  "taxation"
  "budget"
  "ledger"
  "financial-reports"
  "finance-dashboard"
  "shifts"
)

STUB_TEMPLATE='import { NextRequest, NextResponse } from '\''next/server'\''

export const dynamic = '\''force-dynamic'\''

// NOTE: This module'\''s models don'\''t exist in current schema
// Returning empty data until models are added

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: [],
      message: '\''Module not yet implemented in database schema'\'',
    })
  } catch (error) {
    console.error('\''Error fetching data:'\'', error)
    return NextResponse.json(
      { success: false, error: '\''Failed to fetch data'\'' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(
      { success: false, error: '\''Module not yet implemented in database schema'\'' },
      { status: 501 }
    )
  } catch (error) {
    console.error('\''Error creating record:'\'', error)
    return NextResponse.json(
      { success: false, error: '\''Failed to create record'\'' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    return NextResponse.json(
      { success: false, error: '\''Module not yet implemented in database schema'\'' },
      { status: 501 }
    )
  } catch (error) {
    console.error('\''Error updating record:'\'', error)
    return NextResponse.json(
      { success: false, error: '\''Failed to update record'\'' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return NextResponse.json(
      { success: false, error: '\''Module not yet implemented in database schema'\'' },
      { status: 501 }
    )
  } catch (error) {
    console.error('\''Error deleting record:'\'', error)
    return NextResponse.json(
      { success: false, error: '\''Failed to delete record'\'' },
      { status: 500 }
    )
  }
}'

# Create stub implementations
for route in "${STUB_ROUTES[@]}"; do
  FILE="src/app/api/$route/route.ts"
  if [ -f "$FILE" ]; then
    echo "Creating stub for $route..."
    echo "$STUB_TEMPLATE" > "$FILE"
  fi
done

echo "Done! All stub implementations created."
echo ""
echo "Routes that now return empty data:"
for route in "${STUB_ROUTES[@]}"; do
  echo "  - /api/$route"
done
