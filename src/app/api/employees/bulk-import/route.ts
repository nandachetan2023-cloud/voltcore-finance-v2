import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

// Support both old and new template formats
interface EmployeeRow {
  // Old format (legacy)
  'Sl.No.'?: number
  'Employee ID'?: string
  'Name of Employee'?: string
  'Username'?: string
  'Mobile No.'?: string
  'Email'?: string
  'Sex'?: string
  'Marital Status'?: string
  'Date of Birth'?: string
  'Blood Group'?: string
  'Religion'?: string
  'Present Address'?: string
  'Zip code'?: string
  'Nationality'?: string
  'Company'?: string
  'Department'?: string
  'Designation'?: string
  'Location'?: string
  'Role'?: string
  'Office Shift'?: string
  'Report To'?: string
  'Date of Joining'?: string
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
  
  // New format (current template)
  'Employee ID*'?: string
  'First Name*'?: string
  'Middle Name'?: string
  'Last Name*'?: string
  'Work Email'?: string
  'Personal Email'?: string
  'Phone*'?: string
  'Alternate Phone'?: string
  'Date of Birth* (YYYY-MM-DD)'?: string
  'Gender* (male/female/other)'?: string
  'Marital Status (single/married/divorced/widowed)'?: string
  'Blood Group (A+/A-/B+/B-/AB+/AB-/O+/O-)'?: string
  'Current Address'?: string
  'Current City'?: string
  'Current State'?: string
  'Current Pincode'?: string
  'Permanent Address (new)'?: string
  'Permanent City'?: string
  'Permanent State'?: string
  'Permanent Pincode'?: string
  'Department* (exact name from system)'?: string
  'Designation* (exact name from system)'?: string
  'Branch*'?: string
  'Grade'?: string
  'Reporting Manager (Employee Code)'?: string
  'Date of Joining* (YYYY-MM-DD)'?: string
  'Confirmation Date (YYYY-MM-DD)'?: string
  'Employment Type (permanent/contract/probation/intern/part_time)'?: string
  'Employment Status* (active/inactive)'?: string
  'Probation Months'?: number
  'Notice Period Days'?: number
  'PAN Number'?: string
  'Aadhar Number'?: string
  'UAN Number'?: string
  'ESIC Number'?: string
  'Bank Account Number'?: string
  'Bank IFSC Code'?: string
  'Emergency Contact Name'?: string
  'Emergency Contact Relation'?: string
  'Emergency Contact Phone'?: string
  "Father's Name (old)"?: string
  "Father's Name (new)"?: string
  'Permanent Address (old)'?: string
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
  const db = getDbForRequest(request)
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
    const result = await validateAndImport(db, data, dryRun)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Bulk import error:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Import failed'
    
    if (error instanceof Error) {
      errorMessage = error.message
      
      // Check for common issues
      if (error.message.includes('sheet')) {
        errorMessage = 'Could not read the Excel sheet. Please ensure the file is not corrupted and contains the correct format.'
      } else if (error.message.includes('parse')) {
        errorMessage = 'Failed to parse Excel data. Please check that your file matches the template format.'
      } else if (error.message.includes('database') || error.message.includes('Prisma')) {
        errorMessage = 'Database error: ' + error.message
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// Helper to normalize row data from different template formats
function normalizeRow(row: EmployeeRow) {
  // Detect which format is being used
  const isNewFormat = 'Employee ID*' in row || 'First Name*' in row
  
  if (isNewFormat) {
    // New format - direct mapping
    return {
      employeeId: row['Employee ID*'],
      firstName: row['First Name*'],
      middleName: row['Middle Name'],
      lastName: row['Last Name*'],
      email: row['Work Email'],
      personalEmail: row['Personal Email'],
      phone: row['Phone*'],
      alternatePhone: row['Alternate Phone'],
      dateOfBirth: row['Date of Birth* (YYYY-MM-DD)'],
      gender: row['Gender* (male/female/other)'],
      maritalStatus: row['Marital Status (single/married/divorced/widowed)'],
      bloodGroup: row['Blood Group (A+/A-/B+/B-/AB+/AB-/O+/O-)'],
      fatherName: row["Father's Name (new)"],
      currentAddress: row['Current Address'],
      currentCity: row['Current City'],
      currentState: row['Current State'],
      currentPincode: row['Current Pincode'],
      permanentAddress: row['Permanent Address (new)'],
      permanentCity: row['Permanent City'],
      permanentState: row['Permanent State'],
      permanentPincode: row['Permanent Pincode'],
      department: row['Department* (exact name from system)'],
      designation: row['Designation* (exact name from system)'],
      branch: row['Branch*'],
      grade: row['Grade'],
      reportingManager: row['Reporting Manager (Employee Code)'],
      dateOfJoining: row['Date of Joining* (YYYY-MM-DD)'],
      confirmationDate: row['Confirmation Date (YYYY-MM-DD)'],
      employmentType: row['Employment Type (permanent/contract/probation/intern/part_time)'],
      employmentStatus: row['Employment Status* (active/inactive)'],
      probationMonths: row['Probation Months'],
      noticePeriodDays: row['Notice Period Days'],
      panNumber: row['PAN Number'],
      aadharNumber: row['Aadhar Number'],
      uanNumber: row['UAN Number'],
      esicNumber: row['ESIC Number'],
      bankName: row['Bank Name'],
      bankAccount: row['Bank Account Number'],
      bankIfsc: row['Bank IFSC Code'],
      emergencyContactName: row['Emergency Contact Name'],
      emergencyContactRelation: row['Emergency Contact Relation'],
      emergencyContactPhone: row['Emergency Contact Phone'],
    }
  } else {
    // Old format - parse name and map fields
    const nameParts = parseName(row['Name of Employee'] || '')
    const addressParts = (row['Present Address'] || '').split(',').map(p => p.trim())
    
    return {
      employeeId: row['Employee ID'],
      firstName: nameParts.firstName,
      middleName: nameParts.middleName,
      lastName: nameParts.lastName,
      email: row['Email'],
      personalEmail: null,
      phone: row['Mobile No.'],
      alternatePhone: null,
      dateOfBirth: row['Date of Birth'],
      gender: row['Sex'],
      maritalStatus: row['Marital Status'],
      bloodGroup: row['Blood Group'],
      fatherName: row["Father's Name (old)"],
      currentAddress: row['Present Address'],
      currentCity: addressParts.length > 1 ? addressParts[addressParts.length - 2] : 'Unknown',
      currentState: addressParts.length > 2 ? addressParts[addressParts.length - 1] : 'Unknown',
      currentPincode: row['Zip code'],
      permanentAddress: row['Permanent Address (old)'],
      permanentCity: null,
      permanentState: null,
      permanentPincode: null,
      department: row['Department'],
      designation: row['Designation'],
      branch: row['Company'] || row['Location'],
      grade: null,
      reportingManager: row['Report To'],
      dateOfJoining: row['Date of Joining'],
      confirmationDate: null,
      employmentType: row['Type of Employment'],
      employmentStatus: row['Date of Exit'] ? 'separated' : 'active',
      probationMonths: null,
      noticePeriodDays: null,
      panNumber: row['PAN'],
      aadharNumber: row['Aadhar No.'],
      uanNumber: row['UAN'],
      esicNumber: row['ESIC'],
      bankName: row['Bank Name'],
      bankAccount: row['Bank A/C No.'],
      bankIfsc: row['IFSC Code'],
      emergencyContactName: null,
      emergencyContactRelation: null,
      emergencyContactPhone: null,
      dateOfExit: row['Date of Exit'],
      reasonOfExit: row['Reason of Exit'],
    }
  }
}

async function validateAndImport(
  db: any,
  rows: EmployeeRow[],
  dryRun: boolean
): Promise<ImportResult> {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const validRows: any[] = []
  const imported: Array<{ employeeCode: string; name: string }> = []

  console.log('[Validation] Starting validation for', rows.length, 'rows')
  
  // Log first row to help debug format issues
  if (rows.length > 0) {
    console.log('[Validation] First row keys:', Object.keys(rows[0]))
    console.log('[Validation] First row sample:', rows[0])
  }

  const existingEmployees = await db.employee.findMany({
    select: { employeeCode: true, email: true },
  })
  const existingCodes = new Set(existingEmployees.map(e => e.employeeCode))
  const existingEmails = new Set(existingEmployees.map(e => e.email))

  // Load existing departments, designations, branches (case-insensitive lookup cache)
  let departments = await db.department.findMany()
  let designations = await db.designation.findMany()
  const branches = await db.branch.findMany()

  // In-memory caches so we don't re-create within the same import run
  const deptCache = new Map<string, number>() // normalised name → id
  const desigCache = new Map<string, number>()
  departments.forEach(d => deptCache.set(d.name.toLowerCase().trim(), d.id))
  designations.forEach(d => desigCache.set(d.name.toLowerCase().trim(), d.id))

  const defaultBranchId = branches[0]?.id

  // Helper: get or create department (case-insensitive, auto-create if missing)
  const getOrCreateDept = async (name: string): Promise<number> => {
    const key = name.toLowerCase().trim()
    if (deptCache.has(key)) return deptCache.get(key)!
    if (!dryRun) {
      // Auto-generate a code from the name: take first 3 uppercase letters + id suffix
      const baseCode = name.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 6) || 'DEPT'
      // Ensure code uniqueness by appending a timestamp fragment
      const code = `${baseCode}-${Date.now().toString(36).toUpperCase().slice(-4)}`
      const created = await db.department.create({
        data: { name: name.trim(), code },
      })
      deptCache.set(key, created.id)
      return created.id
    }
    deptCache.set(key, -1)
    return -1
  }

  // Helper: get or create designation (case-insensitive, auto-create if missing)
  const getOrCreateDesig = async (name: string): Promise<number> => {
    const key = name.toLowerCase().trim()
    if (desigCache.has(key)) return desigCache.get(key)!
    if (!dryRun) {
      const created = await db.designation.create({
        data: { name: name.trim() },
      })
      desigCache.set(key, created.id)
      return created.id
    }
    desigCache.set(key, -1)
    return -1
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    // Normalize row data from either format
    const data = normalizeRow(row)

    // Skip completely empty rows
    if (!data.employeeId && !data.firstName && !data.lastName) continue

    const rowErrors: string[] = []
    const rowWarnings: string[] = []

    // Normalize employee ID: accept bare numbers and format as UA + last 4 digits
    let normalizedEmployeeId = data.employeeId?.trim().toUpperCase() || ''
    if (normalizedEmployeeId && /^\d{1,4}$/.test(normalizedEmployeeId)) {
      normalizedEmployeeId = `UA${normalizedEmployeeId.padStart(4, '0')}`
    }

    // Validate required fields
    if (!normalizedEmployeeId) rowErrors.push('Employee ID is required')
    else if (!/^UA\d{4}$/.test(normalizedEmployeeId)) {
      rowErrors.push('Employee ID must be UA + 4 digits (e.g. UA0001, UA0023) or just the number (auto-formatted)')
    }
    if (!data.firstName) rowErrors.push('First Name is required')
    if (!data.lastName) rowErrors.push('Last Name is required')
    if (!data.phone) rowErrors.push('Phone is required')
    if (!data.dateOfBirth) rowErrors.push('Date of Birth is required')
    if (!data.dateOfJoining) rowErrors.push('Date of Joining is required')
    if (!data.department) rowErrors.push('Department is required')
    if (!data.designation) rowErrors.push('Designation is required')

    // Validate duplicates using normalized employee ID
    if (normalizedEmployeeId && existingCodes.has(normalizedEmployeeId)) {
      rowErrors.push('Employee ID already exists in database')
    }
    if (data.email && existingEmails.has(data.email)) {
      rowErrors.push('Email already exists in database')
    }
    
    // Validate email format (only if provided)
    if (data.email && !isValidEmail(data.email)) {
      rowErrors.push('Email format is invalid')
    }

    // Validate gender
    if (data.gender) {
      const normalizedGender = normalizeGender(data.gender)
      if (!['male', 'female', 'other'].includes(normalizedGender)) {
        rowWarnings.push('Gender should be male/female/other, defaulting to male')
      }
    } else {
      rowWarnings.push('Gender not provided, defaulting to male')
    }

    // Report errors if any
    if (rowErrors.length > 0) {
      rowErrors.forEach(msg => 
        errors.push({ 
          row: rowNum, 
          employeeCode: data.employeeId || 'N/A', 
          field: '', 
          message: msg 
        })
      )
      continue
    }

    // Report warnings if any
    rowWarnings.forEach(msg => 
      warnings.push({ 
        row: rowNum, 
        employeeCode: data.employeeId!, 
        field: '', 
        message: msg 
      })
    )

    // Resolve department — auto-create if not found (case-insensitive)
    const departmentId = await getOrCreateDept(data.department!)

    // Resolve designation — auto-create if not found (case-insensitive)
    const designationId = await getOrCreateDesig(data.designation!)

    // Resolve branch
    let branchId = defaultBranchId
    if (data.branch) {
      const branchIdentifier = data.branch.toLowerCase()
      const branch = branches.find(b => b.name.toLowerCase() === branchIdentifier)
      if (branch) branchId = branch.id
    }

    if (!branchId) {
      errors.push({ 
        row: rowNum, 
        employeeCode: data.employeeId!, 
        field: 'branch', 
        message: 'No branch found. Please create at least one branch in the system first.' 
      })
      continue
    }

    // Prepare employee data for import
    const employeeData = {
      employeeCode: normalizedEmployeeId,  // Use normalized ID (UA + 8 digits)
      firstName: data.firstName!,
      middleName: data.middleName || null,
      lastName: data.lastName!,
      email: data.email || `${normalizedEmployeeId}@temp.local`, // Use normalized ID for temp email
      personalEmail: data.personalEmail || null,
      phone: data.phone ? String(data.phone) : '',
      alternatePhone: data.alternatePhone ? String(data.alternatePhone) : null,
      dateOfBirth: parseDate(data.dateOfBirth!),
      gender: normalizeGender(data.gender),
      maritalStatus: data.maritalStatus ? normalizeMaritalStatus(data.maritalStatus) : null,
      bloodGroup: data.bloodGroup || null,
      fatherName: data.fatherName || null,
      currentAddress: data.currentAddress || 'Not Provided',
      currentCity: data.currentCity || 'Not Provided',
      currentState: data.currentState || 'Not Provided',
      currentPincode: data.currentPincode ? String(data.currentPincode) : '000000',
      permanentAddress: data.permanentAddress || null,
      permanentCity: data.permanentCity || null,
      permanentState: data.permanentState || null,
      permanentPincode: data.permanentPincode ? String(data.permanentPincode) : null,
      departmentId,
      designationId,
      branchId,
      gradeId: null, // TODO: Handle grade lookup
      reportingManagerId: null, // TODO: Handle reporting manager lookup
      dateOfJoining: parseDate(data.dateOfJoining!),
      confirmationDate: data.confirmationDate ? parseDate(data.confirmationDate) : null,
      employmentType: normalizeEmploymentType(data.employmentType),
      employmentStatus: normalizeEmploymentStatus(data.employmentStatus),
      probationMonths: data.probationMonths || 6,
      noticePeriodDays: data.noticePeriodDays || 30,
      separationDate: data.dateOfExit ? parseDate(data.dateOfExit) : null,
      separationType: null,
      separationReason: data.reasonOfExit || null,
      panNumber: data.panNumber ? String(data.panNumber) : null,
      aadharNumber: data.aadharNumber ? String(data.aadharNumber) : null,
      uanNumber: data.uanNumber ? String(data.uanNumber) : null,
      esicNumber: data.esicNumber ? String(data.esicNumber) : null,
      bankName: data.bankName || null,
      bankAccount: data.bankAccount ? String(data.bankAccount) : null,
      bankIfsc: data.bankIfsc ? String(data.bankIfsc) : null,
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactRelation: data.emergencyContactRelation || null,
      emergencyContactPhone: data.emergencyContactPhone ? String(data.emergencyContactPhone) : null,
      isActive: data.employmentStatus !== 'separated' && !data.dateOfExit,
      isDeleted: false,
      updatedAt: new Date(),
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
      totalRows: rows.filter(r => r['Employee ID'] || r['Name of Employee']).length,
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

function parseDate(dateStr: any): Date {
  // Handle Excel date serial numbers
  if (typeof dateStr === 'number') {
    // Excel date serial: days since 1900-01-01 (with 1900 bug)
    const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
    const days = Math.floor(dateStr);
    const milliseconds = days * 24 * 60 * 60 * 1000;
    return new Date(excelEpoch.getTime() + milliseconds);
  }
  
  // Handle string dates
  if (typeof dateStr === 'string') {
    return new Date(dateStr);
  }
  
  // Handle Date objects
  if (dateStr instanceof Date) {
    return dateStr;
  }
  
  // Fallback
  return new Date(dateStr);
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

function normalizeEmploymentType(type?: string): string | null {
  if (!type) return null
  const t = type.toLowerCase()
  if (t.includes('contract')) return 'contract'
  if (t.includes('intern')) return 'intern'
  if (t.includes('consultant')) return 'consultant'
  if (t.includes('probation')) return 'probation'
  if (t.includes('part')) return 'part_time'
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
