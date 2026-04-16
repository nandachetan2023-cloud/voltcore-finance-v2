import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

/**
 * Validate employee codes from uploaded salary sheet before import
 * Returns matched, unmatched, and suggestions
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sheetName = formData.get('sheetName') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Read Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Use specified sheet or find "COMBINED SALARY SHEET" or use first sheet
    let targetSheet = sheetName;
    if (!targetSheet || !workbook.SheetNames.includes(targetSheet)) {
      targetSheet = workbook.SheetNames.find(name => name === 'COMBINED SALARY SHEET') || workbook.SheetNames[0];
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

    // Skip header row
    const dataRows = rawData.slice(1);

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

    // Create lookup map
    const employeeMap = new Map(
      allEmployees.map(emp => [emp.employeeCode.toLowerCase(), emp])
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
      const rowNumber = i + 2;

      // Skip empty rows
      if (!row || row.length === 0 || !row[2]) continue;

      const tokenNo = String(row[2] || '').trim();
      const nameInSheet = String(row[3] || '').trim();

      if (!tokenNo) continue;

      // Try to find employee
      const employee = employeeMap.get(tokenNo.toLowerCase());

      if (employee) {
        // Matched
        const fullName = `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.trim();
        matched.push({
          row: rowNumber,
          tokenNo,
          name: nameInSheet,
          employeeId: employee.id,
          employeeName: fullName,
          department: employee.Department?.name || 'N/A',
          status: employee.employmentStatus,
        });
      } else {
        // Not matched - find suggestions
        const suggestions = findSimilarEmployees(tokenNo, nameInSheet, allEmployees);
        unmatched.push({
          row: rowNumber,
          tokenNo,
          name: nameInSheet,
          suggestions,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRows: dataRows.length,
        matched: matched.length,
        unmatched: unmatched.length,
        matchedEmployees: matched,
        unmatchedEmployees: unmatched,
        summary: {
          matchRate: ((matched.length / (matched.length + unmatched.length)) * 100).toFixed(1),
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
  tokenNo: string,
  name: string,
  allEmployees: any[]
): Array<{ employeeCode: string; name: string; similarity: number }> {
  const suggestions: Array<{ employeeCode: string; name: string; similarity: number }> = [];

  for (const emp of allEmployees) {
    const fullName = `${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim();
    
    // Calculate similarity
    let similarity = 0;

    // Code similarity (Levenshtein distance)
    const codeSimilarity = calculateSimilarity(tokenNo.toLowerCase(), emp.employeeCode.toLowerCase());
    similarity += codeSimilarity * 0.6;

    // Name similarity
    const nameSimilarity = calculateSimilarity(name.toLowerCase(), fullName.toLowerCase());
    similarity += nameSimilarity * 0.4;

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
