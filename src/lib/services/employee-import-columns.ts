/**
 * Single source of truth for the employee bulk-import Excel format.
 *
 * The template download, the "Export All" download and the server-side parser
 * all derive from this one list. Previously each maintained its own header
 * array, which had drifted apart in ways that silently lost data:
 *
 *   - the template emitted "Permanent Address" while the parser read
 *     "Permanent Address (new)", so permanent addresses never imported;
 *   - the export emitted 42 columns and the template 41 (export alone had
 *     "Site / Branch"), so export → edit → re-import did not round-trip;
 *   - ten fields the manual form and API had gained (tokenNumber, dailyWage,
 *     otType, subDesignation, nominee…) existed in neither.
 *
 * Adding a field here wires it into all three at once. `key` is the property
 * on the normalised row; `header` is the exact Excel column caption and is the
 * contract with the user's spreadsheet — changing it breaks existing files.
 */

export interface EmployeeImportColumn {
  /** Normalised field name used by the parser and importer. */
  key: string
  /** Exact Excel header text. This is the user-facing contract. */
  header: string
  /** Sample value shown in the template's example row. */
  sample: string
  /** Column width in the generated sheet. */
  width?: number
  /** Marked required — validated by the importer. */
  required?: boolean
}

/**
 * Employment type drives payroll, so the template must offer exactly the two
 * values the schema and the manual form use. The older template advertised
 * permanent/contract/probation/intern/part_time, which payroll cannot read.
 */
export const EMPLOYMENT_TYPE_VALUES = ['fixed', 'non_fixed'] as const
export const EMPLOYMENT_STATUS_VALUES = ['active', 'inactive', 'notice_period', 'separated'] as const
export const NATURE_OF_DESIGNATION_VALUES = ['Skilled', 'Semi-skilled', 'Unskilled', 'Highly Skilled'] as const

export const EMPLOYEE_IMPORT_COLUMNS: EmployeeImportColumn[] = [
  // ── Identity ──────────────────────────────────────────────────
  { key: 'employeeId', header: 'Employee ID*', sample: 'UA0001', width: 14, required: true },
  { key: 'tokenNumber', header: 'Token Number', sample: '1001', width: 14 },
  { key: 'workmenSlNo', header: 'Workmen Sl. No.', sample: '', width: 14 },

  // ── Name ──────────────────────────────────────────────────────
  { key: 'firstName', header: 'First Name*', sample: 'John', required: true },
  { key: 'middleName', header: 'Middle Name', sample: '' },
  { key: 'lastName', header: 'Last Name*', sample: 'Doe', required: true },

  // ── Contact ───────────────────────────────────────────────────
  { key: 'email', header: 'Work Email', sample: 'john.doe@company.com' },
  { key: 'personalEmail', header: 'Personal Email', sample: 'john.personal@email.com' },
  { key: 'phone', header: 'Phone*', sample: '9876543210', required: true },
  { key: 'alternatePhone', header: 'Alternate Phone', sample: '' },

  // ── Personal ──────────────────────────────────────────────────
  { key: 'dateOfBirth', header: 'Date of Birth* (YYYY-MM-DD)', sample: '1990-01-15', required: true },
  { key: 'gender', header: 'Gender* (male/female/other)', sample: 'male', required: true },
  { key: 'maritalStatus', header: 'Marital Status (single/married/divorced/widowed)', sample: 'single' },
  { key: 'bloodGroup', header: 'Blood Group (A+/A-/B+/B-/AB+/AB-/O+/O-)', sample: 'O+' },
  { key: 'fatherName', header: "Father's Name", sample: 'Parent Name' },

  // ── Address ───────────────────────────────────────────────────
  { key: 'currentAddress', header: 'Current Address', sample: '123 Main Street' },
  { key: 'currentCity', header: 'Current City', sample: 'Mumbai' },
  { key: 'currentState', header: 'Current State', sample: 'Maharashtra' },
  { key: 'currentPincode', header: 'Current Pincode', sample: '400001' },
  { key: 'permanentAddress', header: 'Permanent Address', sample: '' },
  { key: 'permanentCity', header: 'Permanent City', sample: '' },
  { key: 'permanentState', header: 'Permanent State', sample: '' },
  { key: 'permanentPincode', header: 'Permanent Pincode', sample: '' },

  // ── Org placement ─────────────────────────────────────────────
  // Site/Branch is present in BOTH template and export so the round trip
  // works; on import it is overridden by the per-employee mapping step.
  { key: 'department', header: 'Department* (exact name from system)', sample: 'Engineering', required: true },
  { key: 'designation', header: 'Designation* (exact name from system)', sample: 'Engineer', required: true },
  { key: 'subDesignation', header: 'Sub-Designation (must belong to the Designation)', sample: '' },
  { key: 'branch', header: 'Site / Branch', sample: '' },
  { key: 'grade', header: 'Grade', sample: 'L1' },
  { key: 'reportingManager', header: 'Reporting Manager (Employee Code)', sample: '' },

  // ── Employment ────────────────────────────────────────────────
  { key: 'dateOfJoining', header: 'Date of Joining* (YYYY-MM-DD)', sample: '2024-01-01', required: true },
  { key: 'confirmationDate', header: 'Confirmation Date (YYYY-MM-DD)', sample: '' },
  { key: 'employmentType', header: 'Employment Type (fixed/non_fixed)', sample: 'non_fixed' },
  { key: 'otType', header: 'OT Type (1 = 1x, 2 = 2x — non-fixed only)', sample: '1' },
  { key: 'employmentStatus', header: 'Employment Status* (active/inactive/notice_period/separated)', sample: 'active', required: true },
  { key: 'natureOfDesignation', header: 'Nature of Designation (Skilled/Semi-skilled/Unskilled/Highly Skilled)', sample: 'Skilled' },
  { key: 'probationMonths', header: 'Probation Months', sample: '6' },
  { key: 'noticePeriodDays', header: 'Notice Period Days', sample: '30' },

  // ── Payroll ───────────────────────────────────────────────────
  { key: 'monthlyGrossSalary', header: 'Monthly Gross Salary', sample: '25000' },
  { key: 'dailyWage', header: 'Daily Wage (fixed daily rate — compliance)', sample: '' },

  // ── Statutory ─────────────────────────────────────────────────
  { key: 'panNumber', header: 'PAN Number', sample: 'ABCDE1234F' },
  { key: 'aadharNumber', header: 'Aadhar Number', sample: '123456789012' },
  { key: 'uanNumber', header: 'UAN Number', sample: '100123456789' },
  { key: 'esicNumber', header: 'ESIC Number', sample: '1234567890' },

  // ── Bank ──────────────────────────────────────────────────────
  { key: 'bankName', header: 'Bank Name', sample: 'Bank Name' },
  { key: 'bankAccount', header: 'Bank Account Number', sample: '1234567890123' },
  { key: 'bankIfsc', header: 'Bank IFSC Code', sample: 'BANK0001234' },

  // ── Emergency contact ─────────────────────────────────────────
  { key: 'emergencyContactName', header: 'Emergency Contact Name', sample: 'Emergency Contact Name' },
  { key: 'emergencyContactRelation', header: 'Emergency Contact Relation', sample: 'Relation' },
  { key: 'emergencyContactPhone', header: 'Emergency Contact Phone', sample: '9876543210' },

  // ── Nominee ───────────────────────────────────────────────────
  { key: 'nomineeName', header: 'Nominee Name', sample: '' },
  { key: 'nomineeRelation', header: 'Nominee Relation', sample: '' },
  { key: 'nomineeAddress', header: 'Nominee Address', sample: '' },
]

/** Header captions, in sheet order. Used by template, export and parser. */
export const EMPLOYEE_IMPORT_HEADERS = EMPLOYEE_IMPORT_COLUMNS.map(c => c.header)

/** Example row matching EMPLOYEE_IMPORT_HEADERS, for the template. */
export const EMPLOYEE_IMPORT_SAMPLE_ROW = EMPLOYEE_IMPORT_COLUMNS.map(c => c.sample)

/** Per-column widths for the generated sheet. */
export const EMPLOYEE_IMPORT_WIDTHS = EMPLOYEE_IMPORT_COLUMNS.map(c => ({ wch: c.width ?? 22 }))

/** header → key, so the parser can read a sheet by caption. */
export const HEADER_TO_KEY: Record<string, string> = Object.fromEntries(
  EMPLOYEE_IMPORT_COLUMNS.map(c => [c.header, c.key])
)

/**
 * Legacy header aliases still accepted on import, mapped to the current key.
 * Files produced by older builds of the template must keep importing — most
 * importantly "Permanent Address (new)", which the parser used to require, and
 * the old employment-type caption.
 */
export const LEGACY_HEADER_ALIASES: Record<string, string> = {
  'Permanent Address (new)': 'permanentAddress',
  "Father's Name (new)": 'fatherName',
  'Site / Branch*': 'branch',
  'Branch*': 'branch',
  'Employment Type (permanent/contract/probation/intern/part_time)': 'employmentType',
  'Employment Status* (active/inactive)': 'employmentStatus',
}
