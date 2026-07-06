'use client';

import { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, X, AlertTriangle, Search, UserCheck, UserX } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ImportResult {
  success: boolean;
  imported: number;
  updated?: number;
  failed: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

interface DuplicateRecord {
  row: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  month: number;
  year: number;
  existingData: {
    payrollItemId: number;
    netPay: number;
    grossEarning: number;
    advance: number;
    arrears: number;
    createdAt: string;
    updatedAt: string;
  };
  newData: {
    netPay: number;
    grossEarning: number;
    advance: number;
    arrears: number;
  };
}

interface ValidationResult {
  totalRows: number;
  matched: number;
  unmatched: number;
  matchedEmployees: Array<{
    row: number;
    tokenNo: string;
    name: string;
    employeeId: number;
    employeeName: string;
    department: string;
    status: string;
  }>;
  unmatchedEmployees: Array<{
    row: number;
    tokenNo: string;
    name: string;
    suggestions: Array<{
      employeeCode: string;
      name: string;
      similarity: number;
    }>;
  }>;
  summary: {
    matchRate: string;
    canProceed: boolean;
  };
}

interface ManualMapping {
  row: number;
  tokenNo: string;
  mappedEmployeeCode: string | null;
  action: 'map' | 'skip';
}

interface AllEmployee {
  employeeCode: string;
  name: string;
  department: string;
}

interface SheetInfo {
  name: string;
  rowCount: number;
}

export default function SalaryNonComplianceBulkImport({ onImportComplete }: { onImportComplete: () => void }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showMappingUI, setShowMappingUI] = useState(false);
  const [manualMappings, setManualMappings] = useState<Map<number, ManualMapping>>(new Map());
  const [allEmployees, setAllEmployees] = useState<AllEmployee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<SheetInfo[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Duplicate handling states
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateRecord[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateActions, setDuplicateActions] = useState<Map<number, 'update' | 'keep'>>(new Map());
  const [sessionData, setSessionData] = useState<string | null>(null);
  const [duplicateMonth, setDuplicateMonth] = useState<number>(0);
  const [duplicateYear, setDuplicateYear] = useState<number>(0);

  // Period this sheet is for. Defaults to the current month but the user MUST be
  // able to pick an older month (e.g. importing May's sheet in July) — otherwise
  // the data gets filed under the wrong month.
  const [importMonth, setImportMonth] = useState<number>(new Date().getMonth() + 1);
  const [importYear, setImportYear] = useState<number>(new Date().getFullYear());

  const downloadTemplate = () => {
    try {
      const XLSX = require('xlsx');

      // 69-column non-compliance format: SL NO. first, then EMPLOYEE ID, then original 67 columns
      const headers = [
        'SL NO.',
        'EMPLOYEE ID',
        'WORKMEN SL. NO.',
        'TOKEN NO.',
        'NAME OF EMPLOYEE',
        "FATHER'S NAME",
        'DOJ',
        'DOB',
        'BANK NAME',
        'ACCOUNT NO.',
        'IFSC CODE NO.',
        '',           // col 11 empty
        'UAN NO.',
        'ESIC IP NO',
        'DESIGNATION',
        'DEPARTMENT',
        'NATURE OF DESIGNATION',
        'MONTHLY GROSS SALARY',
        'ACTUAL ATTENDANCE',
        'LEAVE DAYS',
        'PH DAYS',
        'ACTUAL EARN WAGES',
        'ACTUAL OT HRS',
        'ACTUAL OT AMOUNT',
        'GROSS EARN WAGES',
        'BASIC WAGES/DAY',
        'MONTHLY WORKING DAYS',
        'OT. HRS',
        'ATTENDANCE',
        'PH',
        'WAGES/MONTH',
        'EARN WAGES',
        'PH AMOUNT',
        'TOTAL EARN WAGES',
        'OT HRS PAYMENT',
        'TOTAL NETT PAYBLE',
        'EPF',
        'ESIC',
        'PT',
        'TOTAL DEDUCTION',
        'NETT PAYBLE',
        'EMPLOYEE SIGNATURE/THUMB IMPRESSION',
        '',           // col 42 empty
        '',           // col 43 empty
        'TOTAL NON COMPLIANCE AMOUNT',
        'ADVANCE',
        'ARREARS',
        'NETT PAYBLE NON COMPLIANCE',
        'GRAND TOTAL NETT PAYBLE SALARY',
        '',           // col 49 empty
        'LEAVE',
        'BONUS',
        '',           // col 52 empty
        '',           // col 53 empty
        '',           // col 54 empty
        'MONTHLY BASIC SALARY',
        'PH AMOUNT',
        'OT AMOUNT',
        'EARN SALARY',
        'MONTHLY House Rent Allow.',
        'Monthly Site Allow.',
        'Monthly Leave Travel Allow.',
        'Monthly Special Allow.',
        'MonthlyAttendence Allow.',
        'TOTAL SALARY',
        'EPF',
        'ESIC',
        'TDS',
        'ADVANCE',
      ];

      const instructionsData = [
        ['Non-Compliance Salary Sheet — Import Template'],
        [''],
        ['COLUMN 1 — SL NO.'],
        ['  Auto-generated row number. Leave blank or fill sequentially.'],
        [''],
        ['COLUMN 2 — EMPLOYEE ID'],
        ['  Enter the unique employee code (e.g. EMP001). Used for direct lookup.'],
        ['  If blank, TOKEN NO. (col 4) will be used as fallback.'],
        [''],
        ['KEY COLUMNS FOR IMPORT'],
        ['  Col 1:  SL NO. — row number (auto-generated)'],
        ['  Col 2:  EMPLOYEE ID — unique employee code'],
        ['  Col 4:  TOKEN NO. — employee code (fallback if col 2 is blank)'],
        ['  Col 5:  NAME OF EMPLOYEE'],
        ['  Col 18: MONTHLY GROSS SALARY'],
        ['  Col 19: ACTUAL ATTENDANCE (days present)'],
        ['  Col 23: ACTUAL OT HRS'],
        ['  Col 24: ACTUAL OT AMOUNT'],
        ['  Col 37: EPF deduction'],
        ['  Col 38: ESIC deduction'],
        ['  Col 39: PT deduction'],
        ['  Col 40: TOTAL DEDUCTION'],
        ['  Col 41: NETT PAYBLE'],
        ['  Col 56: MONTHLY BASIC SALARY'],
        ['  Col 60: MONTHLY House Rent Allow.'],
        ['  Col 68: TDS'],
        [''],
        ['NOTES'],
        ['  - Do NOT modify the header row'],
        ['  - All numeric fields: numbers only, no currency symbols'],
        ['  - Sheet name should be "NON-COMPLIANCE SALARY SHEET" or will auto-detect'],
      ];

      const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
      instructionsSheet['!cols'] = [{ wch: 80 }];

      const ws = XLSX.utils.aoa_to_sheet([headers]);
      ws['!cols'] = headers.map((_: string, i: number) => ({
        wch: i === 0 ? 14 : i === 4 ? 25 : i === 5 ? 20 : 13,
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, instructionsSheet, 'Instructions');
      XLSX.utils.book_append_sheet(wb, ws, 'NON-COMPLIANCE SALARY SHEET');
      XLSX.writeFile(wb, 'Non_Compliance_Salary_Template.xlsx');
      toast.success('Template downloaded');
    } catch (e) {
      toast.error('Failed to generate template');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setValidation(null);
    setResult(null);
    setShowMappingUI(false);
    setManualMappings(new Map());
    setShowSheetSelector(false);
    setSelectedSheet(null);

    // Read file to detect sheets
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      const sheets: SheetInfo[] = workbook.SheetNames.map(name => {
        const worksheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        return {
          name,
          rowCount: data.length,
        };
      });

      setAvailableSheets(sheets);

      // If only one sheet, auto-select and validate
      if (sheets.length === 1) {
        setSelectedSheet(sheets[0].name);
        await validateFile(file, sheets[0].name);
      } else {
        // Multiple sheets - show selector
        setShowSheetSelector(true);
      }
    } catch (error) {
      toast.error('Failed to read Excel file');
      console.error(error);
    }
  };

  const handleSheetSelect = async (sheetName: string) => {
    setSelectedSheet(sheetName);
    setShowSheetSelector(false);
    if (selectedFile) {
      await validateFile(selectedFile, sheetName);
    }
  };

  const loadAllEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const res = await fetch('/api/employees');
      const json = await res.json();
      if (json.success) {
        const employees = json.data.map((emp: any) => ({
          employeeCode: emp.employeeCode,
          name: `${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim(),
          department: emp.Department?.name || 'N/A',
        }));
        setAllEmployees(employees);
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const validateFile = async (file: File, sheetName: string) => {
    setValidating(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sheetName', sheetName);
      formData.append('formatType', 'non-compliance'); // Specify non-compliance format

      const res = await fetch('/api/payroll/validate-employees', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (json.success) {
        setValidation(json.data);
        
        if (json.data.summary.canProceed) {
          toast.success(
            <div>
              <div className="font-semibold">Validation Successful!</div>
              <div className="text-xs mt-1">
                {json.data.matched} employees matched ({json.data.summary.matchRate}%)
              </div>
            </div>
          );
        } else {
          toast.warning(
            <div>
              <div className="font-semibold">Validation Issues Found</div>
              <div className="text-xs mt-1">
                {json.data.unmatched} employees not found in system
              </div>
            </div>
          );
        }
      } else {
        toast.error(json.error || 'Validation failed');
      }
    } catch (error) {
      toast.error('Failed to validate file');
      console.error(error);
    } finally {
      setValidating(false);
    }
  };

  const handleProceedToMapping = async () => {
    if (!validation || validation.unmatchedEmployees.length === 0) return;
    
    // Load all employees for manual mapping
    await loadAllEmployees();
    
    // Initialize mappings with suggestions
    const initialMappings = new Map<number, ManualMapping>();
    validation.unmatchedEmployees.forEach(emp => {
      initialMappings.set(emp.row, {
        row: emp.row,
        tokenNo: emp.tokenNo,
        mappedEmployeeCode: null,
        action: 'skip',
      });
    });
    setManualMappings(initialMappings);
    setShowMappingUI(true);
  };

  const handleMapEmployee = (row: number, employeeCode: string) => {
    const newMappings = new Map(manualMappings);
    const existing = newMappings.get(row);
    if (existing) {
      newMappings.set(row, {
        ...existing,
        mappedEmployeeCode: employeeCode,
        action: 'map',
      });
      setManualMappings(newMappings);
    }
  };

  const handleSkipEmployee = (row: number) => {
    const newMappings = new Map(manualMappings);
    const existing = newMappings.get(row);
    if (existing) {
      newMappings.set(row, {
        ...existing,
        mappedEmployeeCode: null,
        action: 'skip',
      });
      setManualMappings(newMappings);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !selectedSheet) return;

    // First, check for duplicates
    setCheckingDuplicates(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('sheetName', selectedSheet);
      formData.append('month', String(importMonth));
      formData.append('year', String(importYear));

      const res = await fetch('/api/payroll/check-duplicates', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (json.success && json.data.hasDuplicates) {
        // Store duplicate data and show dialog
        setDuplicates(json.data.duplicates);
        setSessionData(json.data.sessionData);
        setDuplicateMonth(json.data.month);
        setDuplicateYear(json.data.year);
        setShowDuplicateDialog(true);
        setCheckingDuplicates(false);
        
        toast.info(
          <div>
            <div className="font-semibold">Duplicate Records Found</div>
            <div className="text-xs mt-1">
              {json.data.duplicateCount} employees already have salary data for this period
            </div>
          </div>
        );
        return;
      }

      // No duplicates, proceed with normal import
      setCheckingDuplicates(false);
      await proceedWithImport();
    } catch (error) {
      setCheckingDuplicates(false);
      toast.error('Failed to check for duplicates');
      console.error(error);
    }
  };

  const proceedWithImport = async () => {
    if (!selectedFile || !selectedSheet) return;

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('sheetName', selectedSheet);
      formData.append('month', String(importMonth));
      formData.append('year', String(importYear));

      // Add manual mappings if any
      if (manualMappings.size > 0) {
        const mappingsArray = Array.from(manualMappings.values());
        formData.append('manualMappings', JSON.stringify(mappingsArray));
      }

      const res = await fetch('/api/payroll/salary-non-compliance-import', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (json.success) {
        setResult({
          success: true,
          imported: json.data.imported,
          failed: json.data.failed,
          skipped: json.data.skipped || 0,
          errors: json.data.errors || [],
        });

        if (json.data.failed === 0) {
          toast.success(
            <div>
              <div className="font-semibold">Import Successful!</div>
              <div className="text-xs mt-1">
                {json.data.imported} imported, {json.data.skipped || 0} skipped
              </div>
            </div>
          );
          setTimeout(() => {
            setOpen(false);
            onImportComplete();
          }, 2000);
        } else {
          toast.warning(
            <div>
              <div className="font-semibold">Partial Import</div>
              <div className="text-xs mt-1">
                {json.data.imported} imported, {json.data.failed} failed, {json.data.skipped || 0} skipped
              </div>
            </div>
          );
        }
      } else {
        toast.error(json.error || 'Import failed');
        setResult({
          success: false,
          imported: 0,
          failed: 0,
          skipped: 0,
          errors: [{ row: 0, error: json.error || 'Unknown error' }],
        });
      }
    } catch (error) {
      toast.error('Failed to upload file');
      console.error(error);
      setResult({
        success: false,
        imported: 0,
        failed: 0,
        skipped: 0,
        errors: [{ row: 0, error: 'Network error' }],
      });
    } finally {
      setUploading(false);
      setShowMappingUI(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDuplicateAction = (employeeId: number, action: 'update' | 'keep') => {
    const newActions = new Map(duplicateActions);
    newActions.set(employeeId, action);
    setDuplicateActions(newActions);
  };

  const handleUpdateAll = () => {
    const newActions = new Map<number, 'update' | 'keep'>();
    duplicates.forEach(dup => newActions.set(dup.employeeId, 'update'));
    setDuplicateActions(newActions);
  };

  const handleKeepAll = () => {
    const newActions = new Map<number, 'update' | 'keep'>();
    duplicates.forEach(dup => newActions.set(dup.employeeId, 'keep'));
    setDuplicateActions(newActions);
  };

  const handleProceedWithDuplicates = async () => {
    if (!sessionData) return;

    setUploading(true);
    setShowDuplicateDialog(false);

    try {
      const duplicateActionsObj: Record<number, 'update' | 'keep'> = {};
      duplicateActions.forEach((action, employeeId) => {
        duplicateActionsObj[employeeId] = action;
      });

      const res = await fetch('/api/payroll/import-with-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionData,
          duplicateActions: duplicateActionsObj,
          month: duplicateMonth,
          year: duplicateYear,
        }),
      });

      const json = await res.json();

      if (json.success) {
        setResult({
          success: true,
          imported: json.data.imported,
          updated: json.data.updated,
          failed: json.data.failed,
          skipped: json.data.skipped,
          errors: json.data.errors || [],
        });

        toast.success(
          <div>
            <div className="font-semibold">Import Complete!</div>
            <div className="text-xs mt-1">
              {json.data.imported} new, {json.data.updated} updated, {json.data.skipped} skipped
            </div>
          </div>
        );

        setTimeout(() => {
          setOpen(false);
          onImportComplete();
        }, 2000);
      } else {
        toast.error(json.error || 'Import failed');
        setResult({
          success: false,
          imported: 0,
          failed: 0,
          skipped: 0,
          errors: [{ row: 0, error: json.error || 'Unknown error' }],
        });
      }
    } catch (error) {
      toast.error('Failed to import with duplicates');
      console.error(error);
      setResult({
        success: false,
        imported: 0,
        failed: 0,
        skipped: 0,
        errors: [{ row: 0, error: 'Network error' }],
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getMappedCount = () => {
    return Array.from(manualMappings.values()).filter(m => m.action === 'map').length;
  };

  const getSkippedCount = () => {
    return Array.from(manualMappings.values()).filter(m => m.action === 'skip').length;
  };

  return (
    <>
      <button
        className="vc-btn-secondary flex items-center gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Upload size={13} />
        Bulk Import
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0] text-base">
              Salary Non-Compliance Bulk Import
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-[#141920] border border-[#2e3a48] rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-[#00d4ff] shrink-0 mt-0.5" />
                <div className="text-[11px] text-[#8899aa] space-y-2">
                  <p className="font-semibold text-[#e2e8f0]">Import Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Download the template file below (68-column detailed format)</li>
                    <li>Fill in the salary data (TOKEN NO. must match employee codes)</li>
                    <li>Save the file and upload it here</li>
                    <li>System will validate employee codes before import</li>
                    <li>Review validation results and proceed with import</li>
                  </ol>
                  <p className="text-[10px] text-[#5a6878] mt-2">
                    Note: TOKEN NO. column must contain valid employee codes from your system.
                  </p>
                </div>
              </div>
            </div>

            {/* Download Template */}
            <div className="flex items-center justify-center">
              <button
                className="vc-btn-primary flex items-center gap-2"
                onClick={downloadTemplate}
              >
                <Download size={14} />
                Download Template
              </button>
            </div>

            {/* Upload Section */}
            <div className="border-2 border-dashed border-[#2e3a48] rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="salary-file-upload"
              />
              <label
                htmlFor="salary-file-upload"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <div className="w-16 h-16 rounded-full bg-[#f5a623]/10 flex items-center justify-center">
                  <FileSpreadsheet size={32} className="text-[#f5a623]" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[#e2e8f0] mb-1">
                    {selectedFile ? selectedFile.name : 'Click to upload Excel file'}
                  </div>
                  <div className="text-[10px] text-[#5a6878]">
                    Supports .xlsx and .xls files
                  </div>
                  {selectedSheet && (
                    <div className="text-[10px] text-[#00d4ff] mt-1">
                      Selected Sheet: {selectedSheet}
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Period selector — which month/year this sheet is for */}
            <div className="border border-[#2e3a48] rounded-lg p-4 bg-[#141920]">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-[12px] font-semibold text-[#e2e8f0]">Salary Period</div>
              </div>
              <div className="text-[10px] text-[#5a6878] mb-3">
                Select the month this sheet belongs to. Importing an older month? Change it here — the data is filed under this period, not today's month.
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={importMonth}
                  onChange={e => setImportMonth(parseInt(e.target.value))}
                  className="flex-1 bg-[#0d1117] border border-[#2e3a48] rounded px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{getMonthName(m)}</option>
                  ))}
                </select>
                <select
                  value={importYear}
                  onChange={e => setImportYear(parseInt(e.target.value))}
                  className="w-28 bg-[#0d1117] border border-[#2e3a48] rounded px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]"
                >
                  {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sheet Selector */}
            {showSheetSelector && availableSheets.length > 0 && (
              <div className="border border-[#2e3a48] rounded-lg p-4 bg-[#141920]">
                <div className="flex items-center gap-2 mb-3">
                  <FileSpreadsheet size={16} className="text-[#00d4ff]" />
                  <div className="text-[12px] font-semibold text-[#e2e8f0]">
                    Select Sheet to Import
                  </div>
                </div>
                <div className="text-[10px] text-[#5a6878] mb-3">
                  This Excel file contains {availableSheets.length} sheets. Please select which sheet contains the salary data.
                </div>
                <div className="space-y-2">
                  {availableSheets.map((sheet, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSheetSelect(sheet.name)}
                      className="w-full text-left px-3 py-2 bg-[#0d1117] border border-[#2e3a48] rounded hover:border-[#00d4ff] transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-semibold text-[#e2e8f0] group-hover:text-[#00d4ff]">
                          {sheet.name}
                        </div>
                        <div className="text-[10px] text-[#5a6878]">
                          {sheet.rowCount} rows
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Validation Progress */}
            {validating && (
              <div className="bg-[#141920] border border-[#2e3a48] rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#00d4ff] border-t-transparent" />
                  <span className="text-[12px] text-[#e2e8f0]">Validating employee codes...</span>
                </div>
              </div>
            )}

            {/* Validation Result */}
            {validation && !showMappingUI && (
              <div
                className={`border rounded-lg p-4 ${
                  validation.summary.canProceed
                    ? 'bg-[#00e676]/10 border-[#00e676]/30'
                    : 'bg-[#ffab40]/10 border-[#ffab40]/30'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  {validation.summary.canProceed ? (
                    <CheckCircle2 size={20} className="text-[#00e676] shrink-0" />
                  ) : (
                    <AlertTriangle size={20} className="text-[#ffab40] shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="text-[12px] font-semibold text-[#e2e8f0] mb-2">
                      Validation Results
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] mb-3">
                      <div>
                        <span className="text-[#5a6878]">Total:</span>{' '}
                        <span className="text-[#e2e8f0] font-semibold">{validation.totalRows}</span>
                      </div>
                      <div>
                        <span className="text-[#5a6878]">Matched:</span>{' '}
                        <span className="text-[#00e676] font-semibold">{validation.matched}</span>
                      </div>
                      <div>
                        <span className="text-[#5a6878]">Not Found:</span>{' '}
                        <span className="text-[#ff3d3d] font-semibold">{validation.unmatched}</span>
                      </div>
                    </div>
                    <div className="text-[11px] text-[#e2e8f0]">
                      Match Rate: <span className="font-semibold">{validation.summary.matchRate}%</span>
                    </div>

                    {validation.unmatchedEmployees.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[10px] font-semibold text-[#e2e8f0] mb-2">
                          Unmatched Employees (showing first 10):
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-2">
                          {validation.unmatchedEmployees.slice(0, 10).map((emp, idx) => (
                            <div
                              key={idx}
                              className="text-[10px] bg-[#141920] rounded px-2 py-2"
                            >
                              <div className="text-[#ff3d3d] font-semibold">
                                Row {emp.row}: {emp.tokenNo} - {emp.name}
                              </div>
                              {emp.suggestions.length > 0 && (
                                <div className="text-[#5a6878] mt-1">
                                  Suggestions: {emp.suggestions.map(s => `${s.employeeCode} (${s.similarity}%)`).join(', ')}
                                </div>
                              )}
                            </div>
                          ))}
                          {validation.unmatchedEmployees.length > 10 && (
                            <div className="text-[10px] text-[#5a6878] text-center">
                              ... and {validation.unmatchedEmployees.length - 10} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Manual Mapping UI */}
            {showMappingUI && validation && (
              <div className="border border-[#2e3a48] rounded-lg p-4 bg-[#141920]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[13px] font-semibold text-[#e2e8f0]">
                      Manual Employee Mapping
                    </div>
                    <div className="text-[10px] text-[#5a6878] mt-1">
                      Map or skip {validation.unmatchedEmployees.length} unmatched employees
                    </div>
                  </div>
                  <div className="flex gap-3 text-[10px]">
                    <div className="flex items-center gap-1">
                      <UserCheck size={12} className="text-[#00e676]" />
                      <span className="text-[#5a6878]">Mapped:</span>
                      <span className="text-[#00e676] font-semibold">{getMappedCount()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <UserX size={12} className="text-[#ff3d3d]" />
                      <span className="text-[#5a6878]">Skipped:</span>
                      <span className="text-[#ff3d3d] font-semibold">{getSkippedCount()}</span>
                    </div>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-3">
                  {validation.unmatchedEmployees.map((emp) => {
                    const mapping = manualMappings.get(emp.row);
                    const isMapped = mapping?.action === 'map';
                    const isSkipped = mapping?.action === 'skip';

                    return (
                      <div
                        key={emp.row}
                        className={`border rounded-lg p-3 ${
                          isMapped
                            ? 'border-[#00e676]/30 bg-[#00e676]/5'
                            : isSkipped
                            ? 'border-[#ff3d3d]/30 bg-[#ff3d3d]/5'
                            : 'border-[#2e3a48] bg-[#0d1117]'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="text-[11px] font-semibold text-[#e2e8f0]">
                              Row {emp.row}: {emp.name}
                            </div>
                            <div className="text-[10px] text-[#5a6878] mt-0.5">
                              TOKEN NO: {emp.tokenNo}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {isMapped && (
                              <div className="px-2 py-0.5 rounded bg-[#00e676]/20 text-[#00e676] text-[9px] font-semibold">
                                MAPPED
                              </div>
                            )}
                            {isSkipped && (
                              <div className="px-2 py-0.5 rounded bg-[#ff3d3d]/20 text-[#ff3d3d] text-[9px] font-semibold">
                                SKIPPED
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Suggestions */}
                        {emp.suggestions.length > 0 && (
                          <div className="mb-2">
                            <div className="text-[9px] text-[#5a6878] mb-1">Suggested Matches:</div>
                            <div className="flex flex-wrap gap-1">
                              {emp.suggestions.map((sug, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleMapEmployee(emp.row, sug.employeeCode)}
                                  className={`text-[9px] px-2 py-1 rounded border transition-colors ${
                                    mapping?.mappedEmployeeCode === sug.employeeCode
                                      ? 'bg-[#00d4ff]/20 border-[#00d4ff] text-[#00d4ff]'
                                      : 'bg-[#141920] border-[#2e3a48] text-[#8899aa] hover:border-[#00d4ff]/50'
                                  }`}
                                >
                                  {sug.employeeCode} - {sug.name} ({sug.similarity}%)
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Search and Actions */}
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#5a6878]" />
                            <input
                              type="text"
                              placeholder="Search employee code or name..."
                              className="w-full pl-7 pr-2 py-1.5 text-[10px] bg-[#0d1117] border border-[#2e3a48] rounded text-[#e2e8f0] placeholder:text-[#5a6878] focus:outline-none focus:border-[#00d4ff]"
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0d1117] border border-[#2e3a48] rounded max-h-32 overflow-y-auto z-10">
                                {allEmployees
                                  .filter(
                                    (e) =>
                                      e.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                      e.name.toLowerCase().includes(searchTerm.toLowerCase())
                                  )
                                  .slice(0, 10)
                                  .map((e, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => {
                                        handleMapEmployee(emp.row, e.employeeCode);
                                        setSearchTerm('');
                                      }}
                                      className="w-full text-left px-2 py-1.5 text-[9px] text-[#e2e8f0] hover:bg-[#141920] border-b border-[#2e3a48] last:border-0"
                                    >
                                      <div className="font-semibold">{e.employeeCode}</div>
                                      <div className="text-[#5a6878]">
                                        {e.name} - {e.department}
                                      </div>
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleSkipEmployee(emp.row)}
                            className="px-3 py-1.5 text-[10px] bg-[#ff3d3d]/10 text-[#ff3d3d] border border-[#ff3d3d]/30 rounded hover:bg-[#ff3d3d]/20 transition-colors"
                          >
                            Skip
                          </button>
                        </div>

                        {/* Current Mapping Display */}
                        {isMapped && mapping?.mappedEmployeeCode && (
                          <div className="mt-2 pt-2 border-t border-[#2e3a48]">
                            <div className="text-[9px] text-[#5a6878]">Mapped to:</div>
                            <div className="text-[10px] text-[#00e676] font-semibold mt-0.5">
                              {mapping.mappedEmployeeCode}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {(uploading || checkingDuplicates) && (
              <div className="bg-[#141920] border border-[#2e3a48] rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#f5a623] border-t-transparent" />
                  <span className="text-[12px] text-[#e2e8f0]">
                    {checkingDuplicates ? 'Checking for duplicates...' : 'Importing salary data...'}
                  </span>
                </div>
              </div>
            )}

            {/* Import Result */}
            {result && (
              <div
                className={`border rounded-lg p-4 ${
                  result.success && result.failed === 0
                    ? 'bg-[#00e676]/10 border-[#00e676]/30'
                    : result.failed > 0
                    ? 'bg-[#ffab40]/10 border-[#ffab40]/30'
                    : 'bg-[#ff3d3d]/10 border-[#ff3d3d]/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.success && result.failed === 0 ? (
                    <CheckCircle2 size={20} className="text-[#00e676] shrink-0" />
                  ) : (
                    <AlertCircle size={20} className="text-[#ffab40] shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="text-[12px] font-semibold text-[#e2e8f0] mb-2">
                      Import Results
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                      <div>
                        <span className="text-[#5a6878]">Imported:</span>{' '}
                        <span className="text-[#00e676] font-semibold">{result.imported}</span>
                      </div>
                      {result.updated !== undefined && (
                        <div>
                          <span className="text-[#5a6878]">Updated:</span>{' '}
                          <span className="text-[#00d4ff] font-semibold">{result.updated}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-[#5a6878]">Failed:</span>{' '}
                        <span className="text-[#ff3d3d] font-semibold">{result.failed}</span>
                      </div>
                      <div>
                        <span className="text-[#5a6878]">Skipped:</span>{' '}
                        <span className="text-[#ffab40] font-semibold">{result.skipped}</span>
                      </div>
                    </div>

                    {result.errors.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[10px] font-semibold text-[#e2e8f0] mb-2">
                          Errors:
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {result.errors.map((err, idx) => (
                            <div
                              key={idx}
                              className="text-[10px] text-[#ff3d3d] bg-[#141920] rounded px-2 py-1"
                            >
                              Row {err.row}: {err.error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48]"
              onClick={() => {
                setOpen(false);
                setShowMappingUI(false);
              }}
            >
              Close
            </Button>
            
            {/* Show "Proceed to Mapping" when validation has unmatched employees */}
            {validation && !validation.summary.canProceed && !showMappingUI && !result && (
              <Button
                className="bg-[#00d4ff] text-black hover:bg-[#00b8e6] font-semibold"
                onClick={handleProceedToMapping}
                disabled={loadingEmployees}
              >
                {loadingEmployees ? 'Loading...' : 'Proceed to Manual Mapping'}
              </Button>
            )}

            {/* Show "Import" when all matched or in mapping UI */}
            {validation && (validation.summary.canProceed || showMappingUI) && !result && (
              <Button
                className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold"
                disabled={uploading}
                onClick={handleImport}
              >
                {uploading
                  ? 'Importing...'
                  : showMappingUI
                  ? `Import ${validation.matched + getMappedCount()} Records (Skip ${getSkippedCount()})`
                  : `Import ${validation.matched} Records`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Handling Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0] text-base">
              Duplicate Records Found
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-[#ffab40]/10 border border-[#ffab40]/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-[#ffab40] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-[12px] font-semibold text-[#e2e8f0] mb-2">
                    {duplicates.length} employees already have salary data for {getMonthName(duplicateMonth)} {duplicateYear}
                  </div>
                  <div className="text-[10px] text-[#8899aa]">
                    Choose whether to update existing records with new data or keep the existing data.
                  </div>
                </div>
              </div>
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#2e3a48]">
              <div className="text-[11px] text-[#8899aa]">
                Apply action to all {duplicates.length} records:
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateAll}
                  className="px-3 py-1.5 text-[10px] font-semibold bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/30 rounded hover:bg-[#00d4ff]/20 transition-colors"
                >
                  Update All
                </button>
                <button
                  onClick={handleKeepAll}
                  className="px-3 py-1.5 text-[10px] font-semibold bg-[#ff3d3d]/10 text-[#ff3d3d] border border-[#ff3d3d]/30 rounded hover:bg-[#ff3d3d]/20 transition-colors"
                >
                  Keep All
                </button>
              </div>
            </div>

            {/* Duplicate Records List */}
            <div className="max-h-96 overflow-y-auto space-y-3">
              {duplicates.map((dup) => {
                const action = duplicateActions.get(dup.employeeId);
                const isUpdate = action === 'update';
                const isKeep = action === 'keep';

                return (
                  <div
                    key={dup.employeeId}
                    className={`border rounded-lg p-3 transition-colors ${
                      isUpdate
                        ? 'border-[#00d4ff]/30 bg-[#00d4ff]/5'
                        : isKeep
                        ? 'border-[#ff3d3d]/30 bg-[#ff3d3d]/5'
                        : 'border-[#2e3a48] bg-[#0d1117]'
                    }`}
                  >
                    {/* Employee Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="text-[12px] font-semibold text-[#e2e8f0]">
                          {dup.employeeCode} - {dup.employeeName}
                        </div>
                        <div className="text-[10px] text-[#5a6878] mt-0.5">
                          Row {dup.row}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {isUpdate && (
                          <div className="px-2 py-0.5 rounded bg-[#00d4ff]/20 text-[#00d4ff] text-[9px] font-semibold">
                            WILL UPDATE
                          </div>
                        )}
                        {isKeep && (
                          <div className="px-2 py-0.5 rounded bg-[#ff3d3d]/20 text-[#ff3d3d] text-[9px] font-semibold">
                            WILL KEEP
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Data Comparison */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {/* Existing Data */}
                      <div className="bg-[#141920] border border-[#2e3a48] rounded p-2">
                        <div className="text-[9px] text-[#5a6878] uppercase font-semibold mb-2">
                          Existing Data
                        </div>
                        <div className="space-y-1 text-[10px]">
                          <div className="flex justify-between">
                            <span className="text-[#8899aa]">Net Pay:</span>
                            <span className="text-[#e2e8f0] font-mono">
                              ₹{dup.existingData.netPay.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#8899aa]">Gross:</span>
                            <span className="text-[#e2e8f0] font-mono">
                              ₹{dup.existingData.grossEarning.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#8899aa]">Advance:</span>
                            <span className="text-[#e2e8f0] font-mono">
                              ₹{dup.existingData.advance.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="text-[9px] text-[#5a6878] mt-2">
                            Updated: {new Date(dup.existingData.updatedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* New Data */}
                      <div className="bg-[#141920] border border-[#00d4ff]/30 rounded p-2">
                        <div className="text-[9px] text-[#00d4ff] uppercase font-semibold mb-2">
                          New Data
                        </div>
                        <div className="space-y-1 text-[10px]">
                          <div className="flex justify-between">
                            <span className="text-[#8899aa]">Net Pay:</span>
                            <span className="text-[#e2e8f0] font-mono">
                              ₹{dup.newData.netPay.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#8899aa]">Gross:</span>
                            <span className="text-[#e2e8f0] font-mono">
                              ₹{dup.newData.grossEarning.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#8899aa]">Advance:</span>
                            <span className="text-[#e2e8f0] font-mono">
                              ₹{dup.newData.advance.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="text-[9px] text-[#5a6878] mt-2">
                            From uploaded file
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDuplicateAction(dup.employeeId, 'update')}
                        className={`flex-1 px-3 py-2 text-[11px] font-semibold rounded border transition-colors ${
                          isUpdate
                            ? 'bg-[#00d4ff]/20 text-[#00d4ff] border-[#00d4ff]'
                            : 'bg-[#0d1117] text-[#8899aa] border-[#2e3a48] hover:border-[#00d4ff]/50'
                        }`}
                      >
                        Update with New Data
                      </button>
                      <button
                        onClick={() => handleDuplicateAction(dup.employeeId, 'keep')}
                        className={`flex-1 px-3 py-2 text-[11px] font-semibold rounded border transition-colors ${
                          isKeep
                            ? 'bg-[#ff3d3d]/20 text-[#ff3d3d] border-[#ff3d3d]'
                            : 'bg-[#0d1117] text-[#8899aa] border-[#2e3a48] hover:border-[#ff3d3d]/50'
                        }`}
                      >
                        Keep Existing Data
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Summary */}
            <div className="bg-[#141920] border border-[#2e3a48] rounded-lg p-3">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex gap-4">
                  <div>
                    <span className="text-[#5a6878]">Will Update:</span>{' '}
                    <span className="text-[#00d4ff] font-semibold">
                      {Array.from(duplicateActions.values()).filter(a => a === 'update').length}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5a6878]">Will Keep:</span>{' '}
                    <span className="text-[#ff3d3d] font-semibold">
                      {Array.from(duplicateActions.values()).filter(a => a === 'keep').length}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5a6878]">Not Selected:</span>{' '}
                    <span className="text-[#ffab40] font-semibold">
                      {duplicates.length - duplicateActions.size}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48]"
              onClick={() => {
                setShowDuplicateDialog(false);
                setDuplicateActions(new Map());
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold"
              disabled={uploading || duplicateActions.size === 0}
              onClick={handleProceedWithDuplicates}
            >
              {uploading ? 'Processing...' : `Proceed with ${duplicateActions.size} Actions`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
}
