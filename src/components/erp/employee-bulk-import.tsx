'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

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
      
      // Read sheet names
      try {
        const buffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheets = workbook.SheetNames;
        
        setSheetNames(sheets);
        
        // Auto-select if only one sheet or if there's an "employee format" sheet
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
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    if (!selectedSheet) {
      toast.error('Please select a sheet');
      return;
    }

    try {
      setValidating(true);
      setValidationResult(null);
      setShowResults(false);
      
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
          toast.error(`Validation found ${data.summary.errorRows} errors. Please fix them before importing.`, {
            duration: 5000
          });
        } else if (data.summary.validRows === 0) {
          toast.error('No valid rows found in the file. Please check the template format.', {
            duration: 5000
          });
        } else {
          toast.success(`Validation complete: ${data.summary.validRows} valid rows, ${data.warnings.length} warnings`);
        }
      } else {
        throw new Error(data.error || 'Validation failed');
      }
    } catch (error) {
      console.error('Validation error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error('Validation failed: ' + message, {
        duration: 6000
      });
      
      // Show a generic result to help user understand what went wrong
      setValidationResult({
        success: false,
        summary: {
          totalRows: 0,
          validRows: 0,
          importedRows: 0,
          skippedRows: 0,
          errorRows: 1,
        },
        errors: [{
          row: 0,
          employeeCode: 'N/A',
          field: 'system',
          message: message
        }],
        warnings: [],
        imported: [],
      });
      setShowResults(true);
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    if (!selectedSheet) {
      toast.error('Please select a sheet');
      return;
    }
    
    if (!validationResult) {
      toast.error('Please validate the file first before importing');
      return;
    }
    
    if (validationResult.summary.errorRows > 0) {
      toast.error('Cannot import: Please fix all validation errors first');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sheetName', selectedSheet);
      formData.append('dryRun', 'false');

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
        toast.success(`Successfully imported ${data.summary.importedRows} employees!`, {
          duration: 5000
        });
        
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        throw new Error(data.error || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error('Import failed: ' + message, {
        duration: 6000
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Generate template dynamically with all Employee model fields
    const XLSX = require('xlsx');
    const headers = [
      'Employee ID*',
      'First Name*', 'Middle Name', 'Last Name*',
      'Work Email', 'Personal Email', 'Phone*', 'Alternate Phone',
      'Date of Birth* (YYYY-MM-DD)', 'Gender* (male/female/other)',
      'Marital Status (single/married/divorced/widowed)', 'Blood Group (A+/A-/B+/B-/AB+/AB-/O+/O-)',
      "Father's Name",
      'Current Address', 'Current City', 'Current State', 'Current Pincode',
      'Permanent Address', 'Permanent City', 'Permanent State', 'Permanent Pincode',
      'Department* (exact name from system)', 'Designation* (exact name from system)', 'Branch*', 'Grade',
      'Reporting Manager (Employee Code)',
      'Date of Joining* (YYYY-MM-DD)', 'Confirmation Date (YYYY-MM-DD)',
      'Employment Type (permanent/contract/probation/intern/part_time)',
      'Employment Status* (active/inactive)',
      'Probation Months', 'Notice Period Days',
      'PAN Number', 'Aadhar Number', 'UAN Number', 'ESIC Number',
      'Bank Name', 'Bank Account Number', 'Bank IFSC Code',
      'Emergency Contact Name', 'Emergency Contact Relation', 'Emergency Contact Phone',
    ];

    const sampleRow = [
      'UA00000001',  // Or just type "1" - it will auto-format to UA00000001
      'John', '', 'Doe',
      'john.doe@company.com', 'john.personal@email.com', '9876543210', '',
      '1990-01-15', 'male',
      'single', 'O+',
      'Parent Name',
      '123 Main Street', 'Mumbai', 'Maharashtra', '400001',
      '', '', '', '',
      'Engineering', 'Engineer', 'Main Office', 'L1',
      '',
      '2024-01-01', '',
      'permanent', 'active',
      '6', '30',
      'ABCDE1234F', '123456789012', '100123456789', '1234567890',
      'Bank Name', '1234567890123', 'BANK0001234',
      'Emergency Contact Name', 'Relation', '9876543210',
    ];

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
      ['DEPARTMENT & DESIGNATION ASSIGNMENT'],
      ['  Simply type the department and designation name you want.'],
      ['  If it does not exist in the system it will be AUTOMATICALLY CREATED during import.'],
      ['  Names are case-insensitive — "engineering", "Engineering", "ENGINEERING" are all treated the same.'],
      [''],
      ['REQUIRED FIELDS (marked with *)'],
      ['  Employee ID, First Name, Last Name, Phone,'],
      ['  Date of Birth, Date of Joining, Department, Designation, Branch, Employment Status'],
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
      ['EMPLOYMENT TYPE (optional)'],
      ['  Use: permanent / contract / probation / intern / part_time'],
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [{ wch: 90 }];

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    ws['!cols'] = headers.map((h: string, i: number) => ({ wch: i === 0 ? 14 : 22 }));

    // Style header row
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
      const headers = [
        'Employee ID*',
        'First Name*', 'Middle Name', 'Last Name*',
        'Work Email', 'Personal Email', 'Phone*', 'Alternate Phone',
        'Date of Birth* (YYYY-MM-DD)', 'Gender* (male/female/other)',
        'Marital Status (single/married/divorced/widowed)', 'Blood Group (A+/A-/B+/B-/AB+/AB-/O+/O-)',
        "Father's Name",
        'Current Address', 'Current City', 'Current State', 'Current Pincode',
        'Permanent Address', 'Permanent City', 'Permanent State', 'Permanent Pincode',
        'Department* (exact name from system)', 'Designation* (exact name from system)', 'Branch*', 'Grade',
        'Reporting Manager (Employee Code)',
        'Date of Joining* (YYYY-MM-DD)', 'Confirmation Date (YYYY-MM-DD)',
        'Employment Type (permanent/contract/probation/intern/part_time)',
        'Employment Status* (active/inactive)',
        'Probation Months', 'Notice Period Days',
        'PAN Number', 'Aadhar Number', 'UAN Number', 'ESIC Number',
        'Bank Name', 'Bank Account Number', 'Bank IFSC Code',
        'Emergency Contact Name', 'Emergency Contact Relation', 'Emergency Contact Phone',
      ];

      const fmt = (d: any) => d ? new Date(d).toISOString().split('T')[0] : '';

      const rows = json.data.map((e: any) => [
        e.employeeCode || '',
        e.firstName || '', e.middleName || '', e.lastName || '',
        e.email || '', e.personalEmail || '', e.phone || '', e.alternatePhone || '',
        fmt(e.dateOfBirth), e.gender || '',
        e.maritalStatus || '', e.bloodGroup || '',
        e.fatherName || '',
        e.currentAddress || '', e.currentCity || '', e.currentState || '', e.currentPincode || '',
        e.permanentAddress || '', e.permanentCity || '', e.permanentState || '', e.permanentPincode || '',
        e.Department?.name || '', e.Designation?.name || '', e.Branch?.name || '', e.Grade?.name || '',
        e.reportingManager?.employeeCode || '',
        fmt(e.dateOfJoining), fmt(e.confirmationDate),
        e.employmentType || '', e.employmentStatus || '',
        e.probationMonths ?? '', e.noticePeriodDays ?? '',
        e.panNumber || '', e.aadharNumber || '', e.uanNumber || '', e.esicNumber || '',
        e.bankName || '', e.bankAccount || '', e.bankIfsc || '',
        e.emergencyContactName || '', e.emergencyContactRelation || '', e.emergencyContactPhone || '',
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = headers.map((_: string, i: number) => ({ wch: i === 0 ? 14 : 22 }));
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
          <Button className="bg-[#f5a623] hover:bg-[#f5a623]/90">
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
        </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0d1117] border-[#30363d]">
        <DialogHeader>
          <DialogTitle className="text-white">Bulk Import Employees</DialogTitle>
          <DialogDescription>
            Upload an Excel file to import multiple employees at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload */}
          <Card className="bg-[#161b22] border-[#30363d]">
            <CardHeader>
              <CardTitle className="text-white text-sm">Step 1: Select Excel File</CardTitle>
              <CardDescription>
                Use the employee format template with all required fields
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
                          <p className="text-white font-medium">{file.name}</p>
                          <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(2)} KB</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-white">Click to select Excel file</p>
                          <p className="text-sm text-gray-400">or drag and drop</p>
                        </div>
                      )}
                    </div>
                  </div>
                </label>
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="border-[#30363d]"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Template
                </Button>
              </div>

              {/* Sheet Selector */}
              {file && sheetNames.length > 1 && (
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Select Sheet with Employee Data</label>
                  <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                    <SelectTrigger className="bg-[#0d1117] border-[#30363d] text-white">
                      <SelectValue placeholder="Choose a sheet..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#161b22] border-[#30363d]">
                      {sheetNames.map((name) => (
                        <SelectItem key={name} value={name} className="text-white">
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {file && (
                <div className="flex gap-3">
                  <Button
                    onClick={handleValidate}
                    disabled={validating}
                    variant="outline"
                    className="border-[#30363d]"
                  >
                    {validating ? 'Validating...' : 'Validate'}
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={uploading || !validationResult}
                    className="bg-[#f5a623] hover:bg-[#f5a623]/90"
                  >
                    {uploading ? 'Importing...' : 'Import'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Validation Results */}
          {showResults && validationResult && (
            <>
              {/* Summary */}
              <Card className="bg-[#161b22] border-[#30363d]">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Import Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {validationResult.summary.totalRows}
                      </div>
                      <div className="text-sm text-gray-400">Total Rows</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">
                        {validationResult.summary.validRows}
                      </div>
                      <div className="text-sm text-gray-400">Valid</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">
                        {validationResult.summary.importedRows}
                      </div>
                      <div className="text-sm text-gray-400">Imported</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-500">
                        {validationResult.warnings.length}
                      </div>
                      <div className="text-sm text-gray-400">Warnings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500">
                        {validationResult.summary.errorRows}
                      </div>
                      <div className="text-sm text-gray-400">Errors</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Imported Employees */}
              {validationResult.imported.length > 0 && (
                <Card className="bg-[#161b22] border-[#30363d]">
                  <CardHeader>
                    <CardTitle className="text-white text-sm flex items-center gap-2">
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
                              <TableCell className="text-white font-mono">{emp.employeeCode}</TableCell>
                              <TableCell className="text-white">{emp.name}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Warnings */}
              {validationResult.warnings.length > 0 && (
                <Card className="bg-[#161b22] border-[#30363d]">
                  <CardHeader>
                    <CardTitle className="text-white text-sm flex items-center gap-2">
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
                              <TableCell className="text-white font-mono">{warning.employeeCode}</TableCell>
                              <TableCell className="text-gray-300">{warning.message}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Errors */}
              {validationResult.errors.length > 0 && (
                <Card className="bg-[#161b22] border-[#30363d]">
                  <CardHeader>
                    <CardTitle className="text-white text-sm flex items-center gap-2">
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
                              <TableCell className="text-white font-mono">{error.employeeCode}</TableCell>
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
