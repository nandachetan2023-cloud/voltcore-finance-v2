'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Download, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  EMPLOYEE_IMPORT_COLUMNS,
  EMPLOYEE_IMPORT_HEADERS,
  EMPLOYEE_IMPORT_SAMPLE_ROW,
  EMPLOYEE_IMPORT_WIDTHS,
} from '@/lib/services/employee-import-columns';

interface ImportResult {
  success: boolean;
  summary: {
    totalRows: number;
    validRows: number;
    importedRows: number;
    skippedRows: number;
    errorRows: number;
  };
  errors: Array<{
    row: number;
    employeeCode: string;
    field: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    employeeCode: string;
    field: string;
    message: string;
  }>;
  imported: Array<{
    employeeCode: string;
    name: string;
  }>;
  validatedEmployees?: Array<{
    index: number;
    employeeCode: string;
    firstName: string;
    lastName: string;
  }>;
}

interface BranchInfo {
  id: number;
  name: string;
}

export default function EmployeeBulkImport({ onImportComplete }: { onImportComplete?: () => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ImportResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Site/Branch mapping state
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [showSiteMapping, setShowSiteMapping] = useState(false);
  // Per-employee branch mapping: employeeCode → branchId
  const [branchMap, setBranchMap] = useState<Record<string, string>>({});

  // Fetch available branches/sites
  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch('/api/branches');
      const json = await res.json();
      if (json.success) {
        setBranches(json.data);
      }
    } catch {
      console.error('Failed to fetch branches');
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchBranches();
    }
  }, [open, fetchBranches]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        toast.error('Please select an Excel file (.xlsx or .xls)');
        return;
      }
      
      setFile(selectedFile);
      setValidationResult(null);
      setShowResults(false);
      setShowSiteMapping(false);
      setBranchMap({});
      
      // Read sheet names
      try {
        const buffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheets = workbook.SheetNames;
        
        setSheetNames(sheets);
        
        if (sheets.length === 1) {
          setSelectedSheet(sheets[0]);
          toast.success('File loaded successfully');
        } else {
          const employeeSheet = sheets.find(name => 
            name.toLowerCase().includes('employee') || 
            name.toLowerCase().includes('format')
          );
          if (employeeSheet) {
            setSelectedSheet(employeeSheet);
            toast.success(`Auto-selected sheet: ${employeeSheet}`);
          } else {
            setSelectedSheet('');
            toast.info('Please select which sheet contains employee data');
          }
        }
      } catch (error) {
        toast.error('Failed to read Excel file');
        setFile(null);
      }
    }
  };

  const handleValidate = async () => {
    if (!file) { toast.error('Please select a file first'); return; }
    if (!selectedSheet) { toast.error('Please select a sheet'); return; }

    try {
      setValidating(true);
      setValidationResult(null);
      setShowResults(false);
      setShowSiteMapping(false);
      setBranchMap({});
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sheetName', selectedSheet);
      formData.append('dryRun', 'true');

      const response = await fetch('/api/employees/bulk-import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Validation failed');
      }

      if (data.success) {
        setValidationResult(data);
        setShowResults(true);
        
        if (data.summary.errorRows > 0) {
          toast.error(`Validation found ${data.summary.errorRows} errors. Please fix them before importing.`, { duration: 5000 });
        } else if (data.summary.validRows === 0) {
          toast.error('No valid rows found in the file. Please check the template format.', { duration: 5000 });
        } else {
          // Validation passed — show site mapping step
          setShowSiteMapping(true);
          // Pre-populate mapping with first branch if only one exists
          if (branches.length === 1 && data.validatedEmployees) {
            const defaultMap: Record<string, string> = {};
            data.validatedEmployees.forEach((emp: any) => {
              defaultMap[emp.employeeCode] = branches[0].id.toString();
            });
            setBranchMap(defaultMap);
          }
          toast.success(`Validation complete: ${data.summary.validRows} valid rows. Now assign sites to employees.`);
        }
      } else {
        throw new Error(data.error || 'Validation failed');
      }
    } catch (error) {
      console.error('Validation error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error('Validation failed: ' + message, { duration: 6000 });
      
      setValidationResult({
        success: false,
        summary: { totalRows: 0, validRows: 0, importedRows: 0, skippedRows: 0, errorRows: 1 },
        errors: [{ row: 0, employeeCode: 'N/A', field: 'system', message: message }],
        warnings: [],
        imported: [],
      });
      setShowResults(true);
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!file) { toast.error('Please select a file first'); return; }
    if (!selectedSheet) { toast.error('Please select a sheet'); return; }
    if (!validationResult) { toast.error('Please validate the file first'); return; }
    if (validationResult.summary.errorRows > 0) { toast.error('Please fix all validation errors first'); return; }

    // Check all employees have a site assigned
    const validatedEmps = validationResult.validatedEmployees || [];
    const unmapped = validatedEmps.filter(emp => !branchMap[emp.employeeCode]);
    if (unmapped.length > 0) {
      toast.error(`${unmapped.length} employee(s) don't have a site assigned. Please assign a site to all employees.`);
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sheetName', selectedSheet);
      formData.append('dryRun', 'false');
      
      // Send per-employee branch mapping as JSON: { "UA0001": 2, "UA0005": 3 }
      const numericMap: Record<string, number> = {};
      Object.entries(branchMap).forEach(([empCode, brId]) => {
        numericMap[empCode] = parseInt(brId);
      });
      formData.append('branchMapping', JSON.stringify(numericMap));

      const response = await fetch('/api/employees/bulk-import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Import failed');
      }

      if (data.success) {
        setValidationResult(data);
        setShowResults(true);
        setShowSiteMapping(false);
        toast.success(`Successfully imported ${data.summary.importedRows} employees!`, { duration: 5000 });
        if (onImportComplete) onImportComplete();
      } else {
        throw new Error(data.error || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error('Import failed: ' + message, { duration: 6000 });
    } finally {
      setUploading(false);
    }
  };

  // Set all employees to the same branch
  const setAllBranches = (branchId: string) => {
    if (!validationResult?.validatedEmployees) return;
    const newMap: Record<string, string> = {};
    validationResult.validatedEmployees.forEach(emp => {
      newMap[emp.employeeCode] = branchId;
    });
    setBranchMap(newMap);
  };

  // Count how many employees are mapped
  const mappedCount = validationResult?.validatedEmployees
    ? validationResult.validatedEmployees.filter(emp => branchMap[emp.employeeCode]).length
    : 0;
  const totalToMap = validationResult?.validatedEmployees?.length || 0;

  const downloadTemplate = () => {
    const XLSX = require('xlsx');
    // Headers/sample come from the shared column definition, which the export
    // and the server-side parser also use — so the three can no longer drift.
    const headers = EMPLOYEE_IMPORT_HEADERS;
    const sampleRow = EMPLOYEE_IMPORT_SAMPLE_ROW;

    const instructionsData = [
      ['Employee Bulk Import Template — Instructions'],
      [''],
      ['COLUMN 1 — Employee ID*'],
      ['  Enter the employee code in format: UA + last 4 digits of biometric Enrolled ID'],
      ['  Examples: UA0001, UA0005, UA0023, UA1234'],
      ['  TIP: You can type just the number (e.g. "5" becomes "UA0005" automatically)'],
      ['  The last 4 digits of the 8-digit Enrolled ID (EmpcardNo) from the biometric device'],
      ['  Example: If Enrolled ID is 00000005, use UA0005'],
      [''],
      ['SITE / BRANCH ASSIGNMENT'],
      ['  The "Site / Branch" column is optional and is IGNORED on import.'],
      ['  After you validate the data, the system shows all employees in a mapping table'],
      ['  where you assign the site per employee (or use "Set All").'],
      ['  The column exists so an exported file can be edited and re-imported unchanged.'],
      [''],
      ['DEPARTMENT & DESIGNATION ASSIGNMENT'],
      ['  Simply type the department and designation name you want.'],
      ['  If it does not exist in the system it will be AUTOMATICALLY CREATED during import.'],
      ['  Names are case-insensitive — "engineering", "Engineering", "ENGINEERING" are all treated the same.'],
      [''],
      ['SUB-DESIGNATION'],
      ['  Must already exist under the designation named in the same row.'],
      ['  Unlike departments and designations it is NOT auto-created — an unknown'],
      ['  name imports the employee without it and reports a warning.'],
      [''],
      ['REQUIRED FIELDS (marked with *)'],
      ['  Employee ID, First Name, Last Name, Phone,'],
      ['  Date of Birth, Date of Joining, Department, Designation, Employment Status'],
      ['  Site/Branch is assigned separately after validation.'],
      [''],
      ['OPTIONAL FIELDS'],
      ['  All other fields are optional including Work Email, Current Address, City, State, Pincode'],
      ['  If not provided, default or empty values will be used'],
      [''],
      ['DATE FORMAT'],
      ['  All dates must be in YYYY-MM-DD format (e.g. 2024-01-15)'],
      [''],
      ['GENDER'],
      ['  Use: male / female / other'],
      [''],
      ['EMPLOYMENT TYPE — drives payroll, please read'],
      ['  Use exactly: fixed  or  non_fixed'],
      ['  fixed     = earns over the site\'s monthly working days, no overtime'],
      ['  non_fixed = earns over 26 days and receives OT at the "OT Type" multiplier'],
      ['  If left blank it defaults to non_fixed (same as the employee form).'],
      [''],
      ['OT TYPE (non-fixed employees only)'],
      ['  1 = overtime paid at 1x the hourly rate'],
      ['  2 = overtime paid at 2x the hourly rate'],
      ['  Ignored for fixed employees. Blank defaults to 1.'],
      [''],
      ['TOKEN NUMBER'],
      ['  Must be unique across all employees if provided. Leave blank if unused.'],
      ['  This is the column the non-compliance salary sheet import matches on.'],
      [''],
      ['NATURE OF DESIGNATION (compliance register)'],
      ['  Use: Skilled / Semi-skilled / Unskilled / Highly Skilled'],
      [''],
      ['MONTHLY GROSS SALARY & DAILY WAGE'],
      ['  Numbers only — no currency symbols or thousands separators.'],
      ['  Daily Wage is the fixed daily rate used verbatim by compliance payroll.'],
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [{ wch: 90 }];

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    ws['!cols'] = EMPLOYEE_IMPORT_WIDTHS;
    headers.forEach((_: any, i: number) => {
      const cell = XLSX.utils.encode_cell({ r: 0, c: i });
      if (!ws[cell]) ws[cell] = {};
      ws[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: 'F5A623' } } };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, instructionsSheet, 'Instructions');
    XLSX.utils.book_append_sheet(wb, ws, 'Employee Import Template');
    XLSX.writeFile(wb, 'employee-import-template.xlsx');
  };

  const exportEmployees = async () => {
    try {
      const res = await fetch('/api/employees?limit=10000');
      const json = await res.json();
      if (!json.success) { toast.error('Failed to fetch employees'); return; }

      const XLSX = require('xlsx');
      // Same headers as the template, so export → edit → re-import round-trips.
      const headers = EMPLOYEE_IMPORT_HEADERS;

      const fmt = (d: any) => d ? new Date(d).toISOString().split('T')[0] : '';

      // The employees API returns reportingManagerId but no manager relation,
      // so resolve the code from the same payload rather than exporting blanks.
      const codeById = new Map<number, string>(
        json.data.map((e: any) => [e.id, e.employeeCode || ''])
      );

      // Keyed by column `key` rather than positionally: adding a column to the
      // shared definition can no longer silently shift every later value.
      const valueByKey = (e: any): Record<string, any> => ({
        employeeId: e.employeeCode || '',
        tokenNumber: e.tokenNumber || '',
        workmenSlNo: e.workmenSlNo || '',
        firstName: e.firstName || '',
        middleName: e.middleName || '',
        lastName: e.lastName || '',
        email: e.email || '',
        personalEmail: e.personalEmail || '',
        phone: e.phone || '',
        alternatePhone: e.alternatePhone || '',
        dateOfBirth: fmt(e.dateOfBirth),
        gender: e.gender || '',
        maritalStatus: e.maritalStatus || '',
        bloodGroup: e.bloodGroup || '',
        fatherName: e.fatherName || '',
        currentAddress: e.currentAddress || '',
        currentCity: e.currentCity || '',
        currentState: e.currentState || '',
        currentPincode: e.currentPincode || '',
        permanentAddress: e.permanentAddress || '',
        permanentCity: e.permanentCity || '',
        permanentState: e.permanentState || '',
        permanentPincode: e.permanentPincode || '',
        department: e.Department?.name || '',
        designation: e.Designation?.name || '',
        subDesignation: e.SubDesignation?.name || '',
        branch: e.Branch?.name || '',
        grade: e.Grade?.name || '',
        reportingManager: e.reportingManagerId ? (codeById.get(e.reportingManagerId) || '') : '',
        dateOfJoining: fmt(e.dateOfJoining),
        confirmationDate: fmt(e.confirmationDate),
        employmentType: e.employmentType || '',
        otType: e.otType ?? '',
        employmentStatus: e.employmentStatus || '',
        natureOfDesignation: e.natureOfDesignation || '',
        probationMonths: e.probationMonths ?? '',
        noticePeriodDays: e.noticePeriodDays ?? '',
        monthlyGrossSalary: e.monthlyGrossSalary ?? '',
        dailyWage: e.dailyWage ?? '',
        panNumber: e.panNumber || '',
        aadharNumber: e.aadharNumber || '',
        uanNumber: e.uanNumber || '',
        esicNumber: e.esicNumber || '',
        bankName: e.bankName || '',
        bankAccount: e.bankAccount || '',
        bankIfsc: e.bankIfsc || '',
        emergencyContactName: e.emergencyContactName || '',
        emergencyContactRelation: e.emergencyContactRelation || '',
        emergencyContactPhone: e.emergencyContactPhone || '',
        nomineeName: e.nomineeName || '',
        nomineeRelation: e.nomineeRelation || '',
        nomineeAddress: e.nomineeAddress || '',
      });

      const rows = json.data.map((e: any) => {
        const v = valueByKey(e);
        return EMPLOYEE_IMPORT_COLUMNS.map(c => v[c.key] ?? '');
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = EMPLOYEE_IMPORT_WIDTHS;
      headers.forEach((_: any, i: number) => {
        const cell = XLSX.utils.encode_cell({ r: 0, c: i });
        if (!ws[cell]) ws[cell] = {};
        ws[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: 'F5A623' } } };
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Employee Export');
      XLSX.writeFile(wb, `employee-export-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(`Exported ${rows.length} employees`);
    } catch (e) {
      toast.error('Export failed');
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={exportEmployees}
        className="border-[#30363d] text-[#e2e8f0]"
      >
        <Download className="w-4 h-4 mr-2" />
        Export All
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="vc-btn-primary">
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
        </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0d1117] border-[#30363d]">
        <DialogHeader>
          <DialogTitle className="text-[#e2e8f0]">Bulk Import Employees</DialogTitle>
          <DialogDescription>
            Upload an Excel file to import multiple employees at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: File Upload */}
          <Card className="bg-[#161b22] border-[#30363d]">
            <CardHeader>
              <CardTitle className="text-[#e2e8f0] text-sm">Step 1: Upload & Validate</CardTitle>
              <CardDescription>
                Upload your Excel file and validate the data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex-1">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <div className="flex items-center gap-3 p-4 border-2 border-dashed border-[#30363d] rounded-lg cursor-pointer hover:border-[#f5a623] transition-colors">
                    <FileSpreadsheet className="w-8 h-8 text-gray-400" />
                    <div className="flex-1">
                      {file ? (
                        <div>
                          <p className="text-[#e2e8f0] font-medium">{file.name}</p>
                          <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(2)} KB</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[#e2e8f0]">Click to select Excel file</p>
                          <p className="text-sm text-gray-400">or drag and drop</p>
                        </div>
                      )}
                    </div>
                  </div>
                </label>
                <Button variant="outline" onClick={downloadTemplate} className="border-[#30363d]">
                  <Download className="w-4 h-4 mr-2" />
                  Template
                </Button>
              </div>

              {file && sheetNames.length > 1 && (
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Select Sheet with Employee Data</label>
                  <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                    <SelectTrigger className="bg-[#0d1117] border-[#30363d] text-[#e2e8f0]">
                      <SelectValue placeholder="Choose a sheet..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#161b22] border-[#30363d]">
                      {sheetNames.map((name) => (
                        <SelectItem key={name} value={name} className="text-[#e2e8f0]">{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {file && (
                <Button onClick={handleValidate} disabled={validating} variant="outline" className="border-[#30363d]">
                  {validating ? 'Validating...' : 'Validate'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Site Mapping — shown after successful validation */}
          {showSiteMapping && validationResult && validationResult.summary.errorRows === 0 && validationResult.validatedEmployees && validationResult.validatedEmployees.length > 0 && (
            <Card className="bg-[#161b22] border-[#f5a623]/40 border-2">
              <CardHeader>
                <CardTitle className="text-[#e2e8f0] text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#f5a623]" />
                  Step 2: Assign Site / Branch to Each Employee
                </CardTitle>
                <CardDescription>
                  Map each employee to a site. Use "Set All" to quickly assign the same site to everyone.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick "Set All" controls */}
                <div className="flex items-center gap-3 p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
                  <span className="text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider whitespace-nowrap">
                    Set All:
                  </span>
                  <Select onValueChange={(val) => setAllBranches(val)}>
                    <SelectTrigger className="bg-[#161b22] border-[#30363d] text-[#e2e8f0] max-w-[200px]">
                      <SelectValue placeholder="Assign all to..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#161b22] border-[#30363d]">
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id.toString()} className="text-[#e2e8f0]">
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-[#5a6878] ml-auto">
                    {mappedCount}/{totalToMap} mapped
                  </span>
                </div>

                {branches.length === 0 && (
                  <p className="text-[11px] text-[#ff3d3d]">
                    No sites/branches found. Please create at least one in Settings → Branches.
                  </p>
                )}

                {/* Per-employee mapping table */}
                <div className="max-h-[300px] overflow-y-auto rounded-lg border border-[#30363d]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#30363d] bg-[#0d1117]">
                        <TableHead className="text-gray-400 text-[10px]">#</TableHead>
                        <TableHead className="text-gray-400 text-[10px]">Emp ID</TableHead>
                        <TableHead className="text-gray-400 text-[10px]">Name</TableHead>
                        <TableHead className="text-gray-400 text-[10px]">Site / Branch</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResult.validatedEmployees.map((emp, idx) => (
                        <TableRow key={emp.employeeCode} className="border-[#30363d]">
                          <TableCell className="text-[#5a6878] text-[10px] py-1.5">{idx + 1}</TableCell>
                          <TableCell className="text-[#e2e8f0] font-mono text-[11px] py-1.5">{emp.employeeCode}</TableCell>
                          <TableCell className="text-[#e2e8f0] text-[11px] py-1.5">{emp.firstName} {emp.lastName}</TableCell>
                          <TableCell className="py-1.5">
                            <select
                              value={branchMap[emp.employeeCode] || ''}
                              onChange={(e) => setBranchMap(prev => ({ ...prev, [emp.employeeCode]: e.target.value }))}
                              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-[#e2e8f0] outline-none focus:border-[#f5a623] transition-colors"
                            >
                              <option value="">Select site...</option>
                              {branches.map(b => (
                                <option key={b.id} value={b.id.toString()}>{b.name}</option>
                              ))}
                            </select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Import button */}
                <div className="flex items-center justify-between pt-2">
                  {mappedCount === totalToMap && totalToMap > 0 ? (
                    <p className="text-[11px] text-[#00e676]">
                      ✓ All {totalToMap} employees have a site assigned
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#ffab40]">
                      ⚠ {totalToMap - mappedCount} employee(s) still need a site
                    </p>
                  )}
                  <Button
                    onClick={handleImport}
                    disabled={uploading || mappedCount !== totalToMap || totalToMap === 0}
                    className="vc-btn-primary"
                  >
                    {uploading ? 'Importing...' : `Import ${totalToMap} Employees`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation/Import Results */}
          {showResults && validationResult && (
            <>
              <Card className="bg-[#161b22] border-[#30363d]">
                <CardHeader>
                  <CardTitle className="text-[#e2e8f0] text-sm">
                    {validationResult.summary.importedRows > 0 ? 'Import Summary' : 'Validation Summary'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#e2e8f0]">{validationResult.summary.totalRows}</div>
                      <div className="text-sm text-gray-400">Total Rows</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">{validationResult.summary.validRows}</div>
                      <div className="text-sm text-gray-400">Valid</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">{validationResult.summary.importedRows}</div>
                      <div className="text-sm text-gray-400">Imported</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-500">{validationResult.warnings.length}</div>
                      <div className="text-sm text-gray-400">Warnings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500">{validationResult.summary.errorRows}</div>
                      <div className="text-sm text-gray-400">Errors</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {validationResult.imported.length > 0 && (
                <Card className="bg-[#161b22] border-[#30363d]">
                  <CardHeader>
                    <CardTitle className="text-[#e2e8f0] text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Successfully Imported ({validationResult.imported.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-48 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-[#30363d]">
                            <TableHead className="text-gray-400">Employee Code</TableHead>
                            <TableHead className="text-gray-400">Name</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {validationResult.imported.slice(0, 50).map((emp, idx) => (
                            <TableRow key={idx} className="border-[#30363d]">
                              <TableCell className="text-[#e2e8f0] font-mono">{emp.employeeCode}</TableCell>
                              <TableCell className="text-[#e2e8f0]">{emp.name}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {validationResult.warnings.length > 0 && (
                <Card className="bg-[#161b22] border-[#30363d]">
                  <CardHeader>
                    <CardTitle className="text-[#e2e8f0] text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                      Warnings ({validationResult.warnings.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-48 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-[#30363d]">
                            <TableHead className="text-gray-400">Row</TableHead>
                            <TableHead className="text-gray-400">Employee Code</TableHead>
                            <TableHead className="text-gray-400">Message</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {validationResult.warnings.map((warning, idx) => (
                            <TableRow key={idx} className="border-[#30363d]">
                              <TableCell className="text-yellow-500">{warning.row}</TableCell>
                              <TableCell className="text-[#e2e8f0] font-mono">{warning.employeeCode}</TableCell>
                              <TableCell className="text-gray-300">{warning.message}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {validationResult.errors.length > 0 && (
                <Card className="bg-[#161b22] border-[#30363d]">
                  <CardHeader>
                    <CardTitle className="text-[#e2e8f0] text-sm flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      Errors ({validationResult.errors.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-48 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-[#30363d]">
                            <TableHead className="text-gray-400">Row</TableHead>
                            <TableHead className="text-gray-400">Employee Code</TableHead>
                            <TableHead className="text-gray-400">Message</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {validationResult.errors.map((error, idx) => (
                            <TableRow key={idx} className="border-[#30363d]">
                              <TableCell className="text-red-500">{error.row}</TableCell>
                              <TableCell className="text-[#e2e8f0] font-mono">{error.employeeCode}</TableCell>
                              <TableCell className="text-gray-300">{error.message}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
