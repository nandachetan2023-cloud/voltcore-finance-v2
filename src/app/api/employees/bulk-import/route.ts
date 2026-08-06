import { getDbForRequest } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import {
  HEADER_TO_KEY,
  LEGACY_HEADER_ALIASES,
} from '@/lib/services/employee-import-columns'

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
  
  // New format — resolved dynamically via HEADER_TO_KEY / LEGACY_HEADER_ALIASES
  // from src/lib/services/employee-import-columns.ts, which is the single
  // source of truth shared with the template and export. Only the two headers
  // used for format DETECTION are named here; the rest are read by caption.
  'Employee ID*'?: string
  'First Name*'?: string

  // Legacy-only captions that have no counterpart in the current column list.
  "Father's Name (old)"?: string
  'Permanent Address (old)'?: string

  // Any other column is looked up by its header string at runtime.
  [header: string]: any
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
    const overrideBranchId = formData.get('branchId') as string | null
    // Per-employee branch mapping: JSON string like {"UA0001": 2, "UA0002": 5}
    const branchMappingStr = formData.get('branchMapping') as string | null
    const branchMapping: Record<string, number> = branchMappingStr ? JSON.parse(branchMappingStr) : {}

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
    const result = await validateAndImport(db, data, dryRun, overrideBranchId ? parseInt(overrideBranchId) : undefined, branchMapping)

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
    // New format — resolved through the shared column definition so the
    // template, the export and this parser can never drift apart again.
    // Legacy captions from older template builds are still accepted.
    const v: Record<string, any> = {}
    for (const [header, value] of Object.entries(row)) {
      const key = HEADER_TO_KEY[header] ?? LEGACY_HEADER_ALIASES[header]
      // First non-empty wins, so a current caption beats a legacy alias when
      // a hand-merged sheet happens to carry both.
      if (key && (v[key] === undefined || v[key] === '' || v[key] === null)) {
        v[key] = value
      }
    }

    return {
      employeeId: v.employeeId,
      tokenNumber: v.tokenNumber,
      workmenSlNo: v.workmenSlNo,
      firstName: v.firstName,
      middleName: v.middleName,
      lastName: v.lastName,
      email: v.email,
      personalEmail: v.personalEmail,
      phone: v.phone,
      alternatePhone: v.alternatePhone,
      dateOfBirth: v.dateOfBirth,
      gender: v.gender,
      maritalStatus: v.maritalStatus,
      bloodGroup: v.bloodGroup,
      fatherName: v.fatherName,
      currentAddress: v.currentAddress,
      currentCity: v.currentCity,
      currentState: v.currentState,
      currentPincode: v.currentPincode,
      permanentAddress: v.permanentAddress,
      permanentCity: v.permanentCity,
      permanentState: v.permanentState,
      permanentPincode: v.permanentPincode,
      department: v.department,
      designation: v.designation,
      subDesignation: v.subDesignation,
      branch: v.branch,
      grade: v.grade,
      reportingManager: v.reportingManager,
      dateOfJoining: v.dateOfJoining,
      confirmationDate: v.confirmationDate,
      employmentType: v.employmentType,
      otType: v.otType,
      employmentStatus: v.employmentStatus,
      natureOfDesignation: v.natureOfDesignation,
      probationMonths: v.probationMonths,
      noticePeriodDays: v.noticePeriodDays,
      monthlyGrossSalary: v.monthlyGrossSalary,
      dailyWage: v.dailyWage,
      panNumber: v.panNumber,
      aadharNumber: v.aadharNumber,
      uanNumber: v.uanNumber,
      esicNumber: v.esicNumber,
      bankName: v.bankName,
      bankAccount: v.bankAccount,
      bankIfsc: v.bankIfsc,
      emergencyContactName: v.emergencyContactName,
      emergencyContactRelation: v.emergencyContactRelation,
      emergencyContactPhone: v.emergencyContactPhone,
      nomineeName: v.nomineeName,
      nomineeRelation: v.nomineeRelation,
      nomineeAddress: v.nomineeAddress,
    }
  } else {
    // Old format - parse name and map fields
    const nameParts = parseName(row['Name of Employee'] || '')
    const addressParts = (row['Present Address'] || '').split(',').map(p => p.trim())
    
    return {
      employeeId: row['Employee ID'],
      tokenNumber: null,
      workmenSlNo: null,
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
      subDesignation: null,
      branch: row['Company'] || row['Location'],
      grade: null,
      reportingManager: row['Report To'],
      dateOfJoining: row['Date of Joining'],
      confirmationDate: null,
      employmentType: row['Type of Employment'],
      otType: null,
      employmentStatus: row['Date of Exit'] ? 'separated' : 'active',
      natureOfDesignation: row['Skill Category'],
      probationMonths: null,
      noticePeriodDays: null,
      monthlyGrossSalary: row['Basic Salary'],
      dailyWage: null,
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
      nomineeName: null,
      nomineeRelation: null,
      nomineeAddress: null,
      dateOfExit: row['Date of Exit'],
      reasonOfExit: row['Reason of Exit'],
    }
  }
}

async function validateAndImport(
  db: any,
  rows: EmployeeRow[],
  dryRun: boolean,
  overrideBranchId?: number,
  branchMapping?: Record<string, number>
): Promise<ImportResult & { validatedEmployees?: any[] }> {
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

  // Existing sub-designations, keyed "<designationId>::<lowercased name>".
  // Look-up only — never auto-created (see the call site for why).
  const subDesigs = await db.subDesignation.findMany({
    select: { id: true, name: true, designationId: true },
  }).catch(() => [] as any[])
  const subDesigCache = new Map<string, number>()
  for (const s of subDesigs) {
    subDesigCache.set(`${s.designationId}::${s.name.toLowerCase().trim()}`, s.id)
  }
  const resolveSubDesig = async (designationId: number, name: string): Promise<number | null> => {
    // On a dry run the parent designation may not exist yet (id -1), so the
    // pairing cannot be verified — skip rather than report a bogus warning.
    if (designationId <= 0) return null
    return subDesigCache.get(`${designationId}::${name.toLowerCase().trim()}`) ?? null
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

    // Resolve sub-designation — must belong to the row's designation. Unlike
    // dept/designation this is NOT auto-created: a sub-designation is only
    // meaningful under its parent, and inventing one from a typo would quietly
    // pollute the list. An unknown name is a warning and imports as null.
    let subDesignationId: number | null = null
    if (data.subDesignation && String(data.subDesignation).trim()) {
      const subName = String(data.subDesignation).trim()
      subDesignationId = await resolveSubDesig(designationId, subName)
      // designationId <= 0 means the parent is being auto-created in this same
      // run, so the pairing genuinely cannot be checked yet — stay quiet then.
      if (subDesignationId === null && designationId > 0) {
        warnings.push({
          row: rowNum,
          employeeCode: data.employeeId!,
          field: 'subDesignation',
          message: `Sub-designation "${subName}" does not exist under designation "${data.designation}" — imported without it.`,
        })
      }
    }

    // Resolve branch — priority: per-employee mapping > global override > Excel column > default
    let branchId: number | undefined
    if (branchMapping && branchMapping[normalizedEmployeeId]) {
      branchId = branchMapping[normalizedEmployeeId]
    } else if (overrideBranchId) {
      branchId = overrideBranchId
    } else if (data.branch) {
      const branchIdentifier = data.branch.toLowerCase()
      const branch = branches.find(b => b.name.toLowerCase() === branchIdentifier)
      if (branch) branchId = branch.id
      else branchId = defaultBranchId
    } else {
      branchId = defaultBranchId
    }

    if (!branchId) {
      errors.push({ 
        row: rowNum, 
        employeeCode: data.employeeId!, 
        field: 'branch', 
        message: 'No branch/site found. Please select a site in the mapping step or create one in Settings.' 
      })
      continue
    }

    // Prepare employee data for import
    const employeeData = {
      employeeCode: normalizedEmployeeId,  // Use normalized ID (UA + 8 digits)
      // tokenNumber is UNIQUE in the schema, so a blank cell must stay null
      // rather than becoming "" — two blanks would collide on the second row.
      tokenNumber: data.tokenNumber != null && String(data.tokenNumber).trim()
        ? String(data.tokenNumber).trim()
        : null,
      workmenSlNo: data.workmenSlNo != null && String(data.workmenSlNo).trim()
        ? String(data.workmenSlNo).trim()
        : null,
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
      subDesignationId,
      branchId,
      gradeId: null, // TODO: Handle grade lookup
      reportingManagerId: null, // TODO: Handle reporting manager lookup
      dateOfJoining: parseDate(data.dateOfJoining!),
      confirmationDate: data.confirmationDate ? parseDate(data.confirmationDate) : null,
      employmentType: normalizeEmploymentType(data.employmentType),
      otType: normalizeOtType(data.otType),
      employmentStatus: normalizeEmploymentStatus(data.employmentStatus),
      natureOfDesignation: normalizeNatureOfDesignation(data.natureOfDesignation),
      monthlyGrossSalary: parseDecimal(data.monthlyGrossSalary),
      dailyWage: parseDecimal(data.dailyWage),
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
      nomineeName: data.nomineeName || null,
      nomineeRelation: data.nomineeRelation || null,
      nomineeAddress: data.nomineeAddress || null,
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
      // Count non-empty rows in EITHER format. This previously tested only the
      // legacy 'Employee ID' / 'Name of Employee' captions, so a new-format
      // file always reported "0 total rows" next to a correct valid count.
      totalRows: rows.filter(r =>
        r['Employee ID*'] || r['First Name*'] || r['Employee ID'] || r['Name of Employee']
      ).length,
      validRows: validRows.length,
      importedRows: dryRun ? 0 : imported.length,
      skippedRows: errors.length,
      errorRows: errors.length,
    },
    errors,
    warnings,
    imported: dryRun ? [] : imported,
    // Return validated employees list for site mapping step (dry run only)
    validatedEmployees: dryRun ? validRows.map((emp, idx) => ({
      index: idx,
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      department: emp.departmentId, // ID — frontend won't need this detail
    })) : [],
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

/**
 * employmentType classifies PAYROLL behaviour and only has two legal values:
 * "fixed" (earns over the branch's monthly working days, no OT) and
 * "non_fixed" (earns over 26 days, gets OT at the otType multiplier).
 *
 * Older templates offered permanent/contract/probation/intern/part_time and
 * this function passed them straight through, so every bulk-imported employee
 * ended up with a value payroll could not interpret. Those legacy words are
 * now mapped onto the two real ones instead: only an explicit "fixed" (or the
 * salaried-style words that imply it) becomes fixed; everything else defaults
 * to non_fixed, matching the manual employee form's default.
 */
function normalizeEmploymentType(type?: string): string {
  if (!type) return 'non_fixed'
  const t = String(type).toLowerCase().replace(/[\s-]+/g, '_')
  if (t === 'fixed') return 'fixed'
  if (t === 'non_fixed' || t === 'nonfixed') return 'non_fixed'
  // Legacy captions: permanent/probation staff were salaried → fixed.
  if (t.includes('permanent') || t.includes('probation') || t.includes('confirm')) return 'fixed'
  // contract / intern / part_time / consultant / anything else → non_fixed
  return 'non_fixed'
}

/** OT multiplier class: 1 = 1x, 2 = 2x. Anything else falls back to 1. */
function normalizeOtType(value?: any): number {
  const n = parseInt(String(value ?? '').trim(), 10)
  return n === 2 ? 2 : 1
}

/** Nature of designation — matched case-insensitively to the canonical labels. */
function normalizeNatureOfDesignation(value?: string): string | null {
  if (!value) return null
  const v = String(value).toLowerCase().replace(/[\s-]+/g, '')
  if (v === 'highlyskilled') return 'Highly Skilled'
  if (v === 'semiskilled') return 'Semi-skilled'
  if (v === 'skilled') return 'Skilled'
  if (v === 'unskilled') return 'Unskilled'
  return null
}

/** Parse a money/decimal cell. Blank, junk or negative → null. */
function parseDecimal(value?: any): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[,\s₹]/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : null
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
