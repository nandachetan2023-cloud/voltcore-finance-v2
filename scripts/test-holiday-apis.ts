#!/usr/bin/env tsx
/**
 * Test Holiday APIs
 * Tests the actual API endpoints
 */

async function testAPIs() {
  console.log('='.repeat(60))
  console.log('Testing Holiday API Endpoints')
  console.log('='.repeat(60))

  const baseUrl = 'http://localhost:3000'

  try {
    // Test 1: Check single date
    console.log('\n1. Testing /api/holidays/check (single date):')
    const res1 = await fetch(`${baseUrl}/api/holidays/check?date=2026-08-15`)
    const json1 = await res1.json()
    console.log('   Status:', res1.status)
    console.log('   Response:', JSON.stringify(json1, null, 2))

    // Test 2: Check date range
    console.log('\n2. Testing /api/holidays/check (date range):')
    const res2 = await fetch(`${baseUrl}/api/holidays/check?startDate=2026-08-01&endDate=2026-08-31`)
    const json2 = await res2.json()
    console.log('   Status:', res2.status)
    console.log('   Holidays found:', json2.data?.count)
    console.log('   Dates:', json2.data?.dates)

    // Test 3: Get timesheet holidays
    console.log('\n3. Testing /api/timesheet/holidays:')
    const res3 = await fetch(`${baseUrl}/api/timesheet/holidays?startDate=2026-08-01&endDate=2026-08-31`)
    const json3 = await res3.json()
    console.log('   Status:', res3.status)
    console.log('   Holidays:', json3.data?.holidays?.length)
    console.log('   Holiday Map:', Object.keys(json3.data?.holidayMap || {}))

    // Test 4: Try to create attendance on holiday (should fail)
    console.log('\n4. Testing attendance validation (should fail):')
    const res4 = await fetch(`${baseUrl}/api/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: 1,
        logDate: '2026-08-15',
        status: 'present'
      })
    })
    const json4 = await res4.json()
    console.log('   Status:', res4.status)
    console.log('   Success:', json4.success)
    console.log('   Error:', json4.error)
    console.log('   Holiday:', json4.holiday?.name)

    console.log('\n' + '='.repeat(60))
    console.log('✅ API Tests Completed')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('\n❌ Error testing APIs:', error)
    console.log('\nNote: Make sure the dev server is running (npm run dev)')
  }
}

testAPIs()
