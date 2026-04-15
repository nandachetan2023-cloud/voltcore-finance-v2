import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

interface EmployeeRow {
  'Sl.No.'?: number
  'Employee ID': string
  'Name of Employee': string
  'Username'?: string
  "Father's Name"?: string
  'Mobile No.': string
  'Email': string
  'Sex': string
  'Marital Status'?: string
  'Date of Birth': string
  'Blood Group'?: string
  'Religion'?: string
  'Permanent Address'?: string
  'Present Address': string
  'Zip code': string
  'Nationality'?: string
  'Company'?: string
  'Department': string
  'Designation': string
  'Location'?: string
  'Role'?: string
  'Office Shift'?: string
  'Report To'?: string
  'Date of Joining': string
  'Skill Category'?: string
  'Basic Salary'?: number
  'Bank Name'?: string
  'Branch'?: string
  'Bank A/C No.'?: string
  'IFSC Code'?: string
  'ESIC'?: string
  'UAN'?: string
  'Aadhar No.'?: string
  'PAN'?: string
  'LWF'?: string
  'Type of Employment'?: string
  'Date of Exit'?: string
  'Reason of Exit'?: string
}

interface ValidationError {
  row: number
  employeeCode: string
  field: string
  message: string
}

interface ImportResult {
  success: boolean
  summary: {
    totalRows: number
    validRows: number
    importedRows: number
    skippedRows: number
    errorRows: number
  }
  errors: ValidationError[]
  warnings: ValidationError[]
  imported: Array<{ employeeCode: string; name: string }>
}

// POST: Bulk import employees from Excel
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const sheetName = formData.get('sheetName') as string
    const dryRun = formData.get('dryRun') === 'true'

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Read Excel file
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    
    // Get the specified sheet or auto-detect
    let targetSheet = sheetName
    if (!targetSheet || !workbook.SheetNames.includes(targetSheet)) {
      // Try to find employee format sheet
      targetSheet = workbook.SheetNames.find(name => 
        name.toLowerCase().includes('employee') || name.toLowerCase().includes('format')
      ) || workbook.SheetNames[0]
    }
    
    const worksheet = workbook.Sheets[targetSheet]
    const data: EmployeeRow[] = XLSX.utils.sheet_to_json(worksheet)

    console.log('[Bulk Import] Sheet:', targetSheet)
    console.log('[Bulk Import] Total rows parsed:', data.length)
    console.log('[Bulk Import] First row sample:', data[0])

    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data found in Excel file' },
        { status: 400 }
      )
    }

    // Validate and prepare data
    const result = await validateAndImport(data, dryRun)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Bulk import error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Import failed',
      },
      { status: 500 }
    )
  }
}

async function validateAndImport(
  rows: EmployeeRow[],
  dryRun: boolean
): Promise<ImportResult> {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const validRows: any[] = []
  const imported: Array<{ employeeCode: string; name: string }> = []

  console.log('[Validation] Starting validation for', rows.length, 'rows')

  // Get existing data for validation
  const existingEmployees = await db.employee.findMany({
    select: { employeeCode: true, email: true },
  })
  const existingCodes = new Set(existingEmployees.map(e => e.employeeCode))
  const existingEmails = new Set(existingEmployees.map(e => e.email))

  const departments = await db.department.findMany()
  const designations = await db.designation.findMany()
  const branches = await db.branch.findMany()

  console.log('[Validation] Found:', departments.length, 'departments,', designations.length, 'designations,', branches.length, 'branches')

  // Default IDs if not found
  const defaultDepartmentId = departments[0]?.id
  const defaultDesignationId = designations[0]?.id
  const defaultBranchId = branches[0]?.id

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // Excel row number (1-indexed + header)

    console.log(`[Validation] Row ${rowNum}:`, {
      employeeId: row['Employee ID'],
      name: row['Name of Employee'],
      email: row['Email'],
    })

    // Skip empty rows
    if (!row['Employee ID'] && !row['Name of Employee']) {
      console.log(`[Validation] Row ${rowNum}: Skipped (empty)`)
      continue
    }

    const rowErrors: string[] = []
    const rowWarnings: string[] = []

    // Validate required fields
    if (!row['Employee ID']) {
      rowErrors.push('Employee ID is required')
    }
    if (!row['Name of Employee']) {
      rowErrors.push('Name of Employee is required')
    }
    if (!row['Email']) {
      rowErrors.push('Email is required')
    }
    if (!row['Mobile No.']) {
      rowErrors.push('Mobile No. is required')
    }
    if (!row['Date of Birth']) {
      rowErrors.push('Date of Birth is required')
    }
    if (!row['Date of Joining']) {
      rowErrors.push('Date of Joining is required')
    }
    if (!row['Present Address']) {
      rowErrors.push('Present Address is required')
    }
    if (!row['Zip code']) {
      rowErrors.push('Zip code is required')
    }
    if (!row['Department']) {
      rowErrors.push('Department is required')
    }
    if (!row['Designation']) {
      rowErrors.push('Designation is required')
    }

    // Check duplicates
    if (row['Employee ID'] && existingCodes.has(`EMP${row['Employee ID']}`)) {
      rowErrors.push('Employee ID already exists')
    }
    if (row['Email'] && existingEmails.has(row['Email'])) {
      rowErrors.push('Email already exists')
    }

    // Validate email format
    if (row['Email'] && !isValidEmail(row['Email'])) {
      rowErrors.push('Email is invalid')
    }

    // Parse name
    const nameParts = parseName(row['Name of Employee'] || '')
    if (!nameParts.firstName || !nameParts.lastName) {
      rowErrors.push('Name must have at least first and last name')
    }

    // Validate gender
    const gender = row['Sex']
    if (gender && !['Male', 'Female', 'male', 'female', 'M', 'F', 'Other'].includes(gender)) {
      rowWarnings.push('Sex should be Male/Female/Other, defaulting to Male')
    }

    // If there are errors, skip this row
    if (rowErrors.length > 0) {
      rowErrors.forEach(msg => {
        errors.push({
          row: rowNum,
          employeeCode: row['Employee ID'] || 'N/A',
          field: '',
          message: msg,
        })
      })
      continue
    }

    // Add warnings
    rowWarnings.forEach(msg => {
      warnings.push({
        row: rowNum,
        employeeCode: row['Employee ID'],
        field: '',
        message: msg,
      })
    })

    // Find department, designation, branch
    let departmentId = defaultDepartmentId
    let designationId = defaultDesignationId
    let branchId = defaultBranchId

    if (row['Department']) {
      const dept = departments.find(d => 
        d.name.toLowerCase() === row['Department'].toLowerCase() ||
        d.code?.toLowerCase() === row['Department'].toLowerCase()
      )
      if (dept) departmentId = dept.id
      else rowWarnings.push(`Department '${row['Department']}' not found, using default`)
    }

    if (row['Designation']) {
      const desig = designations.find(d => 
        d.name.toLowerCase() === row['Designation'].toLowerCase()
      )
      if (desig) designationId = desig.id
      else rowWarnings.push(`Designation '${row['Designation']}' not found, using default`)
    }

    if (row['Company'] || row['Location']) {
      const branchIdentifier = row['Company'] || row['Location']
      const branch = branches.find(b => 
        b.name.toLowerCase() === branchIdentifier?.toLowerCase()
      )
      if (branch) branchId = branch.id
      else rowWarnings.push(`Branch '${branchIdentifier}' not found, using default`)
    }

    if (!departmentId || !designationId || !branchId) {
      errors.push({
        row: rowNum,
        employeeCode: row['Employee ID'],
        field: 'department/designation/branch',
        message: 'No default department, designation, or branch found. Please create at least one of each.',
      })
      continue
    }

    // Parse address - extract city and state from Present Address
    const presentAddress = row['Present Address'] || 'N/A'
    const permanentAddress = row['Permanent Address'] || null
    
    // Try to extract city and state (assuming format like "Address, City, State")
    const addressParts = presentAddress.split(',').map(p => p.trim())
    const currentCity = addressParts.length > 1 ? addressParts[addressParts.length - 2] : 'Unknown'
    const currentState = addressParts.length > 2 ? addressParts[addressParts.length - 1] : 'Unknown'

    // Prepare employee data
    const employeeData = {
      employeeCode: `EMP${row['Employee ID']}`, // Add EMP prefix
      firstName: nameParts.firstName,
      middleName: nameParts.middleName || null,
      lastName: nameParts.lastName,
      email: row['Email'],
      phone: row['Mobile No.'].toString(),
      alternatePhone: null,
      dateOfBirth: parseDate(row['Date of Birth']),
      gender: normalizeGender(row['Sex']),
      maritalStatus: row['Marital Status'] ? normalizeMaritalStatus(row['Marital Status']) : null,
      bloodGroup: row['Blood Group'] || null,
      personalEmail: null,
      currentAddress: presentAddress,
      currentCity,
      currentState,
      currentPincode: row['Zip code'].toString(),
      permanentAddress,
      permanentCity: null,
      permanentState: null,
      permanentPincode: null,
      departmentId,
      designationId,
      branchId,
      reportingManagerId: null, // Can be set later based on 'Report To'
      dateOfJoining: parseDate(row['Date of Joining']),
      confirmationDate: null,
      employmentType: normalizeEmploymentType(row['Type of Employment']),
      employmentStatus: row['Date of Exit'] ? 'separated' : 'active',
      probationMonths: 6,
      noticePeriodDays: 30,
      separationDate: row['Date of Exit'] ? parseDate(row['Date of Exit']) : null,
      separationType: null,
      separationReason: row['Reason of Exit'] || null,
      panNumber: row['PAN'] || null,
      aadharNumber: row['Aadhar No.']?.toString() || null,
      uanNumber: row['UAN'] || null,
      esicNumber: row['ESIC'] || null,
      emergencyContactName: null,
      emergencyContactRelation: null,
      emergencyContactPhone: null,
      isActive: !row['Date of Exit'],
      isDeleted: false,
    }

    validRows.push(employeeData)
  }

  // Import if not dry run
  if (!dryRun && validRows.length > 0) {
    try {
      // Insert in batches of 100
      const batchSize = 100
      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize)
        await db.employee.createMany({
          data: batch,
          skipDuplicates: true,
        })
        
        // Track imported
        batch.forEach(emp => {
          imported.push({
            employeeCode: emp.employeeCode,
            name: `${emp.firstName} ${emp.lastName}`,
          })
        })
      }
    } catch (error) {
      console.error('Import error:', error)
      throw new Error('Failed to import employees: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  return {
    success: true,
    summary: {
      totalRows: rows.filter(r => r.employee_id || r.full_name).length,
      validRows: validRows.length,
      importedRows: dryRun ? 0 : imported.length,
      skippedRows: errors.length,
      errorRows: errors.length,
    },
    errors,
    warnings,
    imported: dryRun ? [] : imported,
  }
}

// Helper functions
function parseName(fullName: string): { firstName: string; middleName?: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] }
  } else if (parts.length === 2) {
    return { firstName: parts[0], lastName: parts[1] }
  } else {
    return {
      firstName: parts[0],
      middleName: parts.slice(1, -1).join(' '),
      lastName: parts[parts.length - 1],
    }
  }
}

function parseDate(dateStr: string): Date {
  // Handle Excel date serial numbers
  if (typeof dateStr === 'number') {
    return XLSX.SSF.parse_date_code(dateStr)
  }
  return new Date(dateStr)
}

function normalizeGender(gender?: string): string {
  if (!gender) return 'male'
  const g = gender.toLowerCase()
  if (g === 'm' || g === 'male') return 'male'
  if (g === 'f' || g === 'female') return 'female'
  return 'other'
}

function normalizeMaritalStatus(status?: string): string {
  if (!status) return 'single'
  const s = status.toLowerCase()
  if (s.includes('married')) return 'married'
  if (s.includes('divorced')) return 'divorced'
  if (s.includes('widow')) return 'widowed'
  return 'single'
}

function normalizeEmploymentType(type?: string): string {
  if (!type) return 'permanent'
  const t = type.toLowerCase()
  if (t.includes('contract')) return 'contract'
  if (t.includes('intern')) return 'intern'
  if (t.includes('consultant')) return 'consultant'
  return 'permanent'
}

function normalizeEmploymentStatus(status?: string): string {
  if (!status) return 'active'
  const s = status.toLowerCase()
  if (s.includes('inactive') || s.includes('separated')) return 'separated'
  if (s.includes('leave')) return 'on_leave'
  if (s.includes('notice')) return 'notice_period'
  return 'active'
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
