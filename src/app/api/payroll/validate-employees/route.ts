import { getDbForRequest } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

/**
 * Validate employee codes/names from uploaded salary sheet before import
 * Supports both compliance (24-col) and non-compliance (68-col) formats
 * Returns matched, unmatched, and suggestions
 */
export async function POST(request: NextRequest) {
  const db = getDbForRequest(request)
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sheetName = formData.get('sheetName') as string;
    const formatType = formData.get('formatType') as string; // 'compliance' or 'non-compliance'

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Read Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Use specified sheet or auto-detect based on format
    let targetSheet = sheetName;
    if (!targetSheet || !workbook.SheetNames.includes(targetSheet)) {
      if (formatType === 'compliance') {
        targetSheet = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('compliance') || 
          name.toLowerCase().includes('form')
        ) || workbook.SheetNames[0];
      } else {
        targetSheet = workbook.SheetNames.find(name =>
          name === 'NON-COMPLIANCE SALARY SHEET' ||
          name === 'COMBINED SALARY SHEET' ||
          name.toLowerCase().includes('non-compliance') ||
          name.toLowerCase().includes('salary')
        ) || workbook.SheetNames[0];
      }
    }
    
    const worksheet = workbook.Sheets[targetSheet];

    // Convert to JSON
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (rawData.length < 2) {
      return NextResponse.json(
        { success: false, error: 'File is empty or has no data rows' },
        { status: 400 }
      );
    }

    // Determine which row is the header (compliance format may have title rows)
    let headerRowIndex = 0;
    let dataStartIndex = 1;
    
    if (formatType === 'compliance') {
      // Find the header row (look for "Sl. No." or "Name of the workman")
      for (let i = 0; i < Math.min(15, rawData.length); i++) {
        const row = rawData[i];
        if (row && (
          String(row[0]).toLowerCase().includes('sl') ||
          String(row[1]).toLowerCase().includes('workman') ||
          String(row[1]).toLowerCase().includes('name')
        )) {
          headerRowIndex = i;
          dataStartIndex = i + 1;
          break;
        }
      }
    }

    // Skip to data rows
    const dataRows = rawData.slice(dataStartIndex);

    // Get all employees from database
    const allEmployees = await db.employee.findMany({
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        middleName: true,
        lastName: true,
        Department: { select: { name: true } },
        Designation: { select: { name: true } },
        employmentStatus: true,
      },
    });

    // Create lookup maps
    const employeeByCodeMap = new Map(
      allEmployees.map(emp => [emp.employeeCode.toLowerCase(), emp])
    );
    
    const employeeByNameMap = new Map(
      allEmployees.map(emp => {
        const fullName = `${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim().toLowerCase();
        return [fullName, emp];
      })
    );

    const matched: Array<{
      row: number;
      tokenNo: string;
      name: string;
      employeeId: number;
      employeeName: string;
      department: string;
      status: string;
    }> = [];

    const unmatched: Array<{
      row: number;
      tokenNo: string;
      name: string;
      suggestions: Array<{
        employeeCode: string;
        name: string;
        similarity: number;
      }>;
    }> = [];

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = dataStartIndex + i + 1;

      // Skip empty rows
      if (!row || row.length === 0) continue;

      let identifier = '';
      let nameInSheet = '';
      let employee = null;

      if (formatType === 'compliance') {
        // Compliance format (26-col): col 0 = Sl. No., col 1 = EMPLOYEE ID, col 2 = Name of workman
        const employeeId = String(row[1] || '').trim(); // EMPLOYEE ID (primary)
        nameInSheet     = String(row[2] || '').trim(); // Name of workman
        if (!nameInSheet && !employeeId) continue;

        identifier = employeeId || nameInSheet;

        // Try EMPLOYEE ID first (exact code match), then fall back to name
        employee = employeeByCodeMap.get(employeeId.toLowerCase());

        if (!employee && nameInSheet) {
          employee = employeeByNameMap.get(nameInSheet.toLowerCase());
          // Partial name match fallback
          if (!employee) {
            for (const [fullName, emp] of employeeByNameMap.entries()) {
              if (fullName.includes(nameInSheet.toLowerCase()) || nameInSheet.toLowerCase().includes(fullName)) {
                employee = emp;
                break;
              }
            }
          }
        }
      } else {
        // Non-compliance format (69-col):
        // col 0 = SL NO., col 1 = EMPLOYEE ID, col 2 = WORKMEN SL. NO., col 3 = TOKEN NO., col 4 = NAME
        const employeeId = String(row[1] || '').trim(); // EMPLOYEE ID (primary)
        const tokenNo    = String(row[3] || '').trim(); // TOKEN NO. (fallback)
        nameInSheet      = String(row[4] || '').trim(); // NAME OF EMPLOYEE

        identifier = employeeId || tokenNo;
        if (!identifier) continue;

        // Match by EMPLOYEE ID first, then TOKEN NO.
        employee = employeeByCodeMap.get(employeeId.toLowerCase()) ||
                   employeeByCodeMap.get(tokenNo.toLowerCase());
      }

      if (employee) {
        // Matched
        const fullName = `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.trim();
        matched.push({
          row: rowNumber,
          tokenNo: formatType === 'compliance' ? employee.employeeCode : identifier,
          name: nameInSheet,
          employeeId: employee.id,
          employeeName: fullName,
          department: employee.Department?.name || 'N/A',
          status: employee.employmentStatus,
        });
      } else {
        // Not matched - find suggestions
        const suggestions = findSimilarEmployees(identifier, nameInSheet, allEmployees, formatType === 'compliance');
        unmatched.push({
          row: rowNumber,
          tokenNo: identifier,
          name: nameInSheet,
          suggestions,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRows: dataRows.filter(r => r && r.length > 0).length,
        matched: matched.length,
        unmatched: unmatched.length,
        matchedEmployees: matched,
        unmatchedEmployees: unmatched,
        summary: {
          matchRate: matched.length + unmatched.length > 0 
            ? ((matched.length / (matched.length + unmatched.length)) * 100).toFixed(1)
            : '0',
          canProceed: unmatched.length === 0,
        },
      },
    });
  } catch (error) {
    console.error('Error validating employees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate employees' },
      { status: 500 }
    );
  }
}

/**
 * Find similar employees based on code and name
 */
function findSimilarEmployees(
  identifier: string,
  name: string,
  allEmployees: any[],
  matchByName: boolean = false
): Array<{ employeeCode: string; name: string; similarity: number }> {
  const suggestions: Array<{ employeeCode: string; name: string; similarity: number }> = [];

  for (const emp of allEmployees) {
    const fullName = `${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim();
    
    // Calculate similarity
    let similarity = 0;

    if (matchByName) {
      // For compliance format - prioritize name matching
      const nameSimilarity = calculateSimilarity(identifier.toLowerCase(), fullName.toLowerCase());
      similarity = nameSimilarity;
    } else {
      // For non-compliance format - prioritize code matching
      const codeSimilarity = calculateSimilarity(identifier.toLowerCase(), emp.employeeCode.toLowerCase());
      similarity += codeSimilarity * 0.6;

      // Name similarity
      const nameSimilarity = calculateSimilarity(name.toLowerCase(), fullName.toLowerCase());
      similarity += nameSimilarity * 0.4;
    }

    if (similarity > 0.5) {
      suggestions.push({
        employeeCode: emp.employeeCode,
        name: fullName,
        similarity: Math.round(similarity * 100),
      });
    }
  }

  // Sort by similarity and return top 3
  return suggestions
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
}

/**
 * Calculate string similarity (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
