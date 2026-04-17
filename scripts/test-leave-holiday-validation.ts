#!/usr/bin/env tsx
/**
 * Test Leave Request Holiday Validation
 */

async function testLeaveValidation() {
  console.log('='.repeat(60))
  console.log('Testing Leave Request Holiday Validation')
  console.log('='.repeat(60))

  const baseUrl = 'http://localhost:3000'

  try {
    // Test 1: Try to apply leave on a single holiday
    console.log('\n1. Testing leave on single holiday (should fail):')
    const res1 = await fetch(`${baseUrl}/api/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: 1,
        leaveType: 'casual',
        fromDate: '2026-08-15',
        toDate: '2026-08-15',
        reason: 'Personal work'
      })
    })
    const json1 = await res1.json()
    console.log('   Status:', res1.status)
    console.log('   Success:', json1.success)
    console.log('   Error:', json1.error)
    if (json1.holidays) {
      console.log('   Conflicting holidays:', json1.holidays.map((h: any) => h.name).join(', '))
    }

    // Test 2: Try to apply leave spanning multiple holidays
    console.log('\n2. Testing leave spanning multiple holidays (should fail):')
    const res2 = await fetch(`${baseUrl}/api/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: 1,
        leaveType: 'casual',
        fromDate: '2026-11-04',
        toDate: '2026-11-07',
        reason: 'Personal work'
      })
    })
    const json2 = await res2.json()
    console.log('   Status:', res2.status)
    console.log('   Success:', json2.success)
    console.log('   Error:', json2.error)
    if (json2.holidays) {
      console.log('   Conflicting holidays:', json2.holidays.map((h: any) => `${h.name} (${h.date})`).join(', '))
    }

    // Test 3: Apply leave on non-holiday dates (should succeed)
    console.log('\n3. Testing leave on non-holiday dates (should succeed):')
    const res3 = await fetch(`${baseUrl}/api/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: 1,
        leaveType: 'casual',
        fromDate: '2026-08-18',
        toDate: '2026-08-20',
        reason: 'Personal work'
      })
    })
    const json3 = await res3.json()
    console.log('   Status:', res3.status)
    console.log('   Success:', json3.success)
    if (json3.success) {
      console.log('   Leave ID:', json3.data?.id)
      console.log('   Days:', json3.data?.days)
      console.log('   ✅ Leave created successfully')
      
      // Clean up - delete the test leave
      if (json3.data?.id) {
        await fetch(`${baseUrl}/api/leave`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: json3.data.id })
        })
        console.log('   🧹 Test leave cleaned up')
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Leave Validation Tests Completed')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('\n❌ Error testing leave validation:', error)
    console.log('\nNote: Make sure the dev server is running (npm run dev)')
  }
}

testLeaveValidation()
