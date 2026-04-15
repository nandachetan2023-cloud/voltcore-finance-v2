// Test API endpoints to verify data is being returned correctly
const BASE_URL = 'http://localhost:3000'

interface TestResult {
  endpoint: string
  success: boolean
  status?: number
  count?: number
  error?: string
  sample?: any
}

const endpoints = [
  { path: '/api/employees', name: 'Employees' },
  { path: '/api/departments', name: 'Departments' },
  { path: '/api/designations', name: 'Designations' },
  { path: '/api/attendance', name: 'Attendance' },
  { path: '/api/shifts', name: 'Shifts' },
  { path: '/api/payroll', name: 'Payroll' },
  { path: '/api/leave', name: 'Leave' },
  { path: '/api/biometric/logs', name: 'Biometric Logs' },
  { path: '/api/biometric/sync-status', name: 'Biometric Sync Status' },
  { path: '/api/organization', name: 'Organization' },
]

async function testEndpoint(path: string, name: string): Promise<TestResult> {
  try {
    const response = await fetch(`${BASE_URL}${path}`)
    const status = response.status
    
    if (!response.ok) {
      return {
        endpoint: name,
        success: false,
        status,
        error: `HTTP ${status}`,
      }
    }

    const data = await response.json()
    
    if (!data.success) {
      return {
        endpoint: name,
        success: false,
        status,
        error: data.error || 'API returned success: false',
      }
    }

    // Determine count based on response structure
    let count = 0
    let sample = null

    if (Array.isArray(data.data)) {
      count = data.data.length
      sample = data.data[0]
    } else if (data.data && typeof data.data === 'object') {
      // Check for common array properties
      if (data.data.employees) count = data.data.employees.length
      else if (data.data.departments) count = data.data.departments.length
      else if (data.data.designations) count = data.data.designations.length
      else if (data.data.records) count = data.data.records.length
      else if (data.data.items) count = data.data.items.length
      
      sample = data.data
    }

    return {
      endpoint: name,
      success: true,
      status,
      count,
      sample,
    }
  } catch (error) {
    return {
      endpoint: name,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║              API ENDPOINT VERIFICATION TEST                    ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')
  console.log(`Testing against: ${BASE_URL}\n`)

  const results: TestResult[] = []

  for (const endpoint of endpoints) {
    process.stdout.write(`Testing ${endpoint.name}...`.padEnd(40))
    
    const result = await testEndpoint(endpoint.path, endpoint.name)
    results.push(result)

    if (result.success) {
      console.log(`✓ ${result.status} - ${result.count || 0} records`)
    } else {
      console.log(`✗ FAILED`)
      if (result.error) {
        console.log(`  Error: ${result.error}`)
      }
    }
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════════╗')
  console.log('║                        SUMMARY                                 ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  console.log(`Total Endpoints Tested: ${endpoints.length}`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)

  console.log('\n╔════════════════════════════════════════════════════════════════╗')
  console.log('║                    ENDPOINT BREAKDOWN                          ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  results.forEach(r => {
    const status = r.success ? '✓' : '✗'
    const countStr = r.count !== undefined ? `${r.count} records` : 'N/A'
    console.log(`${status} ${r.endpoint.padEnd(30)} ${countStr}`)
  })

  if (failed > 0) {
    console.log('\n⚠️  Some endpoints have issues.')
    console.log('Make sure the development server is running: npm run dev')
  } else {
    console.log('\n✓ All endpoints are working correctly!')
  }
}

main().catch(console.error)
