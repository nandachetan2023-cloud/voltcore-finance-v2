'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileSpreadsheet, Download, Filter, Calendar, Users, Building2,
  Briefcase, Loader2, CheckCircle2, AlertTriangle, Upload
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const YEARS = [2024, 2025, 2026, 2027];

const inputCls = "w-full bg-[#1a2332] border-[1.5px] border-[#2e3a48] rounded-lg px-3.5 py-2.5 text-[13px] text-[#e2e8f0] outline-none transition-all duration-200 placeholder:text-[#5a6878] hover:border-[#3a4858] hover:bg-[#1e2838] focus:border-[#f5a623] focus:bg-[#1e2838] focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)]";
const selectCls = "w-full bg-[#1a2332] border-[1.5px] border-[#2e3a48] rounded-lg px-3.5 py-2.5 text-[13px] text-[#e2e8f0] outline-none transition-all duration-200 hover:border-[#3a4858] hover:bg-[#1e2838] focus:border-[#f5a623] focus:bg-[#1e2838] focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)] appearance-none cursor-pointer";

interface Department {
  id: number;
  name: string;
}

interface Designation {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
}

export default function PayrollGenerateModule() {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // 2-step process states — Non-Compliance
  const [uploadCalculateOpen, setUploadCalculateOpen] = useState(false);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [calculating, setCalculating] = useState(false);
  const templateFileInputRef = React.useRef<HTMLInputElement>(null);
  const [filtersLocked, setFiltersLocked] = useState(false);

  // 2-step process states — Compliance
  const [complianceUploadOpen, setComplianceUploadOpen] = useState(false);
  const [complianceTemplateFile, setComplianceTemplateFile] = useState<File | null>(null);
  const [complianceCalculating, setComplianceCalculating] = useState(false);
  const complianceFileInputRef = React.useRef<HTMLInputElement>(null);
  const [complianceFiltersLocked, setComplianceFiltersLocked] = useState(false);

  // Restore previously uploaded template files after page refresh
  useEffect(() => {
    for (const [key, setter] of [
      ['payroll_gen_nc_template', setTemplateFile],
      ['payroll_gen_c_template', setComplianceTemplateFile],
    ] as const) {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const { name, type, data } = JSON.parse(saved);
          const byteString = atob(data.split(',')[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
          setter(new File([new Blob([ab], { type })], name, { type }));
        } catch {
          localStorage.removeItem(key);
        }
      }
    }
  }, []);

  const [filters, setFilters] = useState({
    format: 'non-compliance' as 'compliance' | 'non-compliance',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    departmentId: '',
    designationId: '',
    branchId: '',
    employeeId: '',
    includeInactive: false,
  });

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = useCallback(async () => {
    try {
      setLoading(true);
      const [deptsRes, desigsRes, branchesRes, empsRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/designations'),
        fetch('/api/branches'),
        fetch('/api/employees'),
      ]);

      const [deptsData, desigsData, branchesData, empsData] = await Promise.all([
        deptsRes.json(),
        desigsRes.json(),
        branchesRes.json(),
        empsRes.json(),
      ]);

      if (deptsData.success) setDepartments(deptsData.data);
      if (desigsData.success) setDesignations(desigsData.data);
      if (branchesData.success) setBranches(branchesData.data);
      if (empsData.success) setEmployees(empsData.data);
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
      toast.error('Failed to load filter options');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const queryParams = new URLSearchParams({
        format: filters.format,
        month: filters.month.toString(),
        year: filters.year.toString(),
        ...(filters.departmentId && { departmentId: filters.departmentId }),
        ...(filters.designationId && { designationId: filters.designationId }),
        ...(filters.branchId && { branchId: filters.branchId }),
        ...(filters.employeeId && { employeeId: filters.employeeId }),
        ...(filters.includeInactive && { includeInactive: 'true' }),
      });

      toast.info('Generating payroll Excel...');

      const res = await fetch(`/api/payroll/generate-excel?${queryParams}`, {
        method: 'GET',
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const monthName = MONTHS[filters.month - 1].label;
        const formatType = filters.format === 'compliance' ? 'Compliance' : 'NonCompliance';
        const timestamp = Date.now();
        a.download = `Payroll_${formatType}_${monthName}_${filters.year}_${timestamp}.xlsx`;
        
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('Payroll Excel generated successfully');
      } else {
        const json = await res.json();
        toast.error(json.error || 'Failed to generate payroll Excel');
      }
    } catch (error) {
      console.error('Error generating payroll:', error);
      toast.error('Failed to generate payroll Excel');
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setFilters({
      format: 'non-compliance',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      departmentId: '',
      designationId: '',
      branchId: '',
      employeeId: '',
      includeInactive: false,
    });
    setFiltersLocked(false);
    setComplianceFiltersLocked(false);
    setTemplateFile(null);
    setComplianceTemplateFile(null);
    localStorage.removeItem('payroll_gen_nc_template');
    localStorage.removeItem('payroll_gen_c_template');
    if (templateFileInputRef.current) templateFileInputRef.current.value = '';
    if (complianceFileInputRef.current) complianceFileInputRef.current.value = '';
  };

  // 2-Step Process Handlers
  const handleDownloadTemplate = async () => {
    setGenerating(true);
    try {
      toast.info('Generating payroll template...');
      
      const params = new URLSearchParams({
        month: filters.month.toString(),
        year: filters.year.toString(),
      });

      if (filters.employeeId) {
        params.append('employeeId', filters.employeeId);
      }
      if (filters.departmentId) {
        params.append('departmentId', filters.departmentId);
      }
      if (filters.branchId) {
        params.append('branchId', filters.branchId);
      }
      if (filters.designationId) {
        params.append('designationId', filters.designationId);
      }
      if (filters.includeInactive) {
        params.append('includeInactive', 'true');
      }

      const res = await fetch(`/api/payroll/generate-template?${params.toString()}`);

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Payroll_Template_${MONTHS[filters.month - 1].label}_${filters.year}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Lock filters after successful download
        setFiltersLocked(true);
        
        toast.success('Template downloaded successfully! Fill in the highlighted columns and upload for calculation.');
        // Open upload dialog after download
        setTimeout(() => setUploadCalculateOpen(true), 500);
      } else {
        const json = await res.json();
        toast.error(json.error || 'Failed to generate template');
      }
    } catch (error) {
      toast.error('Failed to download template');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleTemplateFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTemplateFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        try {
          localStorage.setItem('payroll_gen_nc_template', JSON.stringify({ name: file.name, type: file.type, data: reader.result }));
        } catch { /* storage full — ignore */ }
      };
      reader.readAsDataURL(file);
    }
  };

  // Compliance 2-Step Handlers
  const handleDownloadComplianceTemplate = async () => {
    setGenerating(true);
    try {
      toast.info('Generating compliance template...');

      const params = new URLSearchParams({
        month: filters.month.toString(),
        year: filters.year.toString(),
      });
      if (filters.employeeId)   params.append('employeeId',   filters.employeeId);
      if (filters.departmentId) params.append('departmentId', filters.departmentId);
      if (filters.designationId) params.append('designationId', filters.designationId);
      if (filters.branchId)     params.append('branchId',     filters.branchId);
      if (filters.includeInactive) params.append('includeInactive', 'true');

      const res = await fetch(`/api/payroll/generate-compliance-template?${params.toString()}`);

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Compliance_Template_${MONTHS[filters.month - 1].label}_${filters.year}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setComplianceFiltersLocked(true);
        toast.success('Compliance template downloaded! Fill in the yellow columns and upload for calculation.');
        setTimeout(() => setComplianceUploadOpen(true), 500);
      } else {
        const json = await res.json();
        toast.error(json.error || 'Failed to generate compliance template');
      }
    } catch (error) {
      toast.error('Failed to download compliance template');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleComplianceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setComplianceTemplateFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        try {
          localStorage.setItem('payroll_gen_c_template', JSON.stringify({ name: file.name, type: file.type, data: reader.result }));
        } catch { /* storage full — ignore */ }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleComplianceUploadAndCalculate = async () => {
    if (!complianceTemplateFile) {
      toast.error('Please select a file to upload');
      return;
    }
    setComplianceCalculating(true);
    try {
      toast.info('Calculating compliance payroll...');

      const formData = new FormData();
      formData.append('file', complianceTemplateFile);

      const res = await fetch('/api/payroll/calculate-from-compliance-template', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Compliance_Calculated_${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        const rows = res.headers.get('X-Calculated-Rows') || '0';
        const errCount = res.headers.get('X-Calculation-Errors');
        const errDetails: string[] = errCount
          ? JSON.parse(res.headers.get('X-Calculation-Error-Details') || '[]')
          : [];

        toast.success(
          <div>
            <div className="font-semibold">Calculation Complete!</div>
            <div className="text-xs mt-1">{rows} employees processed. Upload this file to "Compliance Bulk Import" to save to database.</div>
            {errCount && (
              <div className="text-xs mt-2 text-yellow-400">
                <div className="font-semibold">⚠ {errCount} row(s) skipped due to errors:</div>
                {errDetails.slice(0, 3).map((e, i) => <div key={i}>• {e}</div>)}
                {errDetails.length > 3 && <div>... and {errDetails.length - 3} more</div>}
              </div>
            )}
          </div>,
          { duration: errCount ? 10000 : 6000 }
        );

        setComplianceUploadOpen(false);
        setComplianceTemplateFile(null);
        localStorage.removeItem('payroll_gen_c_template');
        if (complianceFileInputRef.current) complianceFileInputRef.current.value = '';
        setComplianceFiltersLocked(false);
      } else {
        let errorMsg = 'Unknown error';
        let details: string[] = [];
        try {
          const json = await res.json();
          errorMsg = json.error || errorMsg;
          details = json.details || [];
        } catch {
          errorMsg = `Server error (HTTP ${res.status})`;
        }
        toast.error(
          <div>
            <div className="font-semibold">Calculation Failed</div>
            <div className="text-xs mt-1">{errorMsg}</div>
            {details.length > 0 && (
              <div className="text-xs mt-2 max-h-32 overflow-y-auto">
                {details.slice(0, 5).map((e: string, i: number) => <div key={i}>• {e}</div>)}
                {details.length > 5 && <div>... and {details.length - 5} more</div>}
              </div>
            )}
          </div>,
          { duration: 8000 }
        );
      }
    } catch (error) {
      toast.error(`Failed to calculate compliance payroll: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error(error);
    } finally {
      setComplianceCalculating(false);
    }
  };

  const handleUploadAndCalculate = async () => {
    if (!templateFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setCalculating(true);
    try {
      toast.info('Calculating payroll from template...');
      
      const formData = new FormData();
      formData.append('file', templateFile);

      const res = await fetch('/api/payroll/calculate-from-template', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = Date.now();
        a.download = `Payroll_Calculated_${timestamp}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        const calculatedRows = res.headers.get('X-Calculated-Rows') || '0';
        const errCount = res.headers.get('X-Calculation-Errors');
        const errDetails: string[] = errCount
          ? JSON.parse(res.headers.get('X-Calculation-Error-Details') || '[]')
          : [];

        toast.success(
          <div>
            <div className="font-semibold">Calculation Complete!</div>
            <div className="text-xs mt-1">{calculatedRows} employees processed. Upload this file to "Non-Compliance Bulk Import" to save to database.</div>
            {errCount && (
              <div className="text-xs mt-2 text-yellow-400">
                <div className="font-semibold">⚠ {errCount} row(s) skipped (missing required fields):</div>
                {errDetails.slice(0, 3).map((e, i) => <div key={i}>• {e}</div>)}
                {errDetails.length > 3 && <div>... and {errDetails.length - 3} more</div>}
              </div>
            )}
          </div>,
          { duration: errCount ? 10000 : 6000 }
        );

        setUploadCalculateOpen(false);
        setTemplateFile(null);
        localStorage.removeItem('payroll_gen_nc_template');
        if (templateFileInputRef.current) {
          templateFileInputRef.current.value = '';
        }

        // Unlock filters after successful calculation
        setFiltersLocked(false);
      } else {
        let errorMsg = 'Unknown error';
        let details: string[] = [];
        try {
          const json = await res.json();
          errorMsg = json.error || errorMsg;
          details = json.details || [];
        } catch {
          errorMsg = `Server error (HTTP ${res.status})`;
        }
        toast.error(
          <div>
            <div className="font-semibold">Calculation Failed</div>
            <div className="text-xs mt-1">{errorMsg}</div>
            {details.length > 0 && (
              <div className="text-xs mt-2 max-h-32 overflow-y-auto">
                {details.slice(0, 5).map((err: string, idx: number) => (
                  <div key={idx}>• {err}</div>
                ))}
                {details.length > 5 && <div>... and {details.length - 5} more errors</div>}
              </div>
            )}
          </div>,
          { duration: 8000 }
        );
      }
    } catch (error) {
      toast.error(`Failed to calculate payroll: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error(error);
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileSpreadsheet size={16} className="text-[#00e676]" />
          <span className="text-[14px] font-bold text-[#e2e8f0]">Generate Payroll Excel</span>
        </div>

        <div className="p-6 space-y-6">
          {/* Info Banner */}
          <div className="bg-[#00d4ff]/10 border border-[#00d4ff]/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="text-[#00d4ff] shrink-0 mt-0.5" />
              <div>
                <div className="text-[13px] font-semibold text-[#00d4ff] mb-1">
                  Generate Payroll Excel Sheets
                </div>
                <div className="text-[11px] text-[#8899aa] leading-relaxed">
                  {filters.format === 'non-compliance' ? (
                    <>
                      <strong>Step 1:</strong> Download template with auto-filled employee data and attendance. 
                      <strong> Step 2:</strong> Fill in highlighted user input columns offline. 
                      <strong> Step 3:</strong> Upload for automatic calculation. 
                      <strong> Step 4:</strong> Import final sheet to database via "Non-Compliance Bulk Import".
                    </>
                  ) : (
                    <>
                      <strong>Step 1:</strong> Download compliance template with auto-filled employee data and attendance.
                      <strong> Step 2:</strong> Fill in highlighted columns (Days Worked, OT Hours, etc.) offline.
                      <strong> Step 3:</strong> Upload for automatic calculation of wages, EPF, ESI, PT.
                      <strong> Step 4:</strong> Import final sheet to database via "Compliance Bulk Import".
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-3">
              Salary Sheet Format <span className="text-[#ff3d3d]">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => !filtersLocked && setFilters(f => ({ ...f, format: 'non-compliance' }))}
                disabled={filtersLocked || complianceFiltersLocked}
                className={`p-4 rounded-lg border-2 transition-all ${
                  (filtersLocked || complianceFiltersLocked) ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  filters.format === 'non-compliance'
                    ? 'border-[#f5a623] bg-[#f5a623]/10'
                    : 'border-[#2e3a48] bg-[#1a2332] hover:border-[#3a4858]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    filters.format === 'non-compliance' ? 'border-[#f5a623]' : 'border-[#5a6878]'
                  }`}>
                    {filters.format === 'non-compliance' && (
                      <div className="w-3 h-3 rounded-full bg-[#f5a623]" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-[13px] font-semibold text-[#e2e8f0]">Non-Compliance</div>
                    <div className="text-[10px] text-[#5a6878] mt-0.5">2-Step Template Process</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => !complianceFiltersLocked && setFilters(f => ({ ...f, format: 'compliance' }))}
                disabled={filtersLocked || complianceFiltersLocked}
                className={`p-4 rounded-lg border-2 transition-all ${
                  (filtersLocked || complianceFiltersLocked) ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  filters.format === 'compliance'
                    ? 'border-[#00e676] bg-[#00e676]/10'
                    : 'border-[#2e3a48] bg-[#1a2332] hover:border-[#3a4858]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    filters.format === 'compliance' ? 'border-[#00e676]' : 'border-[#5a6878]'
                  }`}>
                    {filters.format === 'compliance' && (
                      <div className="w-3 h-3 rounded-full bg-[#00e676]" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-[13px] font-semibold text-[#e2e8f0]">Compliance</div>
                    <div className="text-[10px] text-[#5a6878] mt-0.5">2-Step Template Process</div>
                  </div>
                </div>
              </button>
            </div>
            {(filtersLocked || complianceFiltersLocked) && (
              <div className="mt-2 text-[10px] text-[#ffab40] flex items-center gap-1">
                <AlertTriangle size={12} />
                Filters locked. Upload & calculate or reset to change settings.
              </div>
            )}
          </div>

          {/* Period Selection */}
          <div>
            <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-3">
              <Calendar size={12} className="inline mr-1" />
              Period <span className="text-[#ff3d3d]">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[#5a6878] mb-2">Month</label>
                <select
                  className={selectCls}
                  value={filters.month}
                  onChange={e => setFilters(f => ({ ...f, month: parseInt(e.target.value) }))}
                  disabled={filtersLocked || complianceFiltersLocked}
                >
                  {MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-[#5a6878] mb-2">Year</label>
                <select
                  className={selectCls}
                  value={filters.year}
                  onChange={e => setFilters(f => ({ ...f, year: parseInt(e.target.value) }))}
                  disabled={filtersLocked || complianceFiltersLocked}
                >
                  {YEARS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div>
            <label className="block text-[11px] text-[#8899aa] font-semibold uppercase tracking-wider mb-3">
              <Filter size={12} className="inline mr-1" />
              Filters (Optional)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[#5a6878] mb-2">
                  <Building2 size={10} className="inline mr-1" />
                  Department
                </label>
                <select
                  className={selectCls}
                  value={filters.departmentId}
                  onChange={e => setFilters(f => ({ ...f, departmentId: e.target.value }))}
                  disabled={filtersLocked || complianceFiltersLocked}
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[#5a6878] mb-2">
                  <Briefcase size={10} className="inline mr-1" />
                  Designation
                </label>
                <select
                  className={selectCls}
                  value={filters.designationId}
                  onChange={e => setFilters(f => ({ ...f, designationId: e.target.value }))}
                  disabled={filtersLocked || complianceFiltersLocked}
                >
                  <option value="">All Designations</option>
                  {designations.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[#5a6878] mb-2">
                  <Building2 size={10} className="inline mr-1" />
                  Branch
                </label>
                <select
                  className={selectCls}
                  value={filters.branchId}
                  onChange={e => setFilters(f => ({ ...f, branchId: e.target.value }))}
                  disabled={filtersLocked || complianceFiltersLocked}
                >
                  <option value="">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[#5a6878] mb-2">
                  <Users size={10} className="inline mr-1" />
                  Employee
                </label>
                <select
                  className={selectCls}
                  value={filters.employeeId}
                  onChange={e => setFilters(f => ({ ...f, employeeId: e.target.value }))}
                  disabled={filtersLocked || complianceFiltersLocked}
                >
                  <option value="">All Employees</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.employeeCode} - {e.firstName} {e.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Include Inactive */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeInactive"
              checked={filters.includeInactive}
              onChange={e => setFilters(f => ({ ...f, includeInactive: e.target.checked }))}
              disabled={filtersLocked || complianceFiltersLocked}
              className="w-4 h-4 rounded border-[#2e3a48] bg-[#1a2332] text-[#f5a623] focus:ring-[#f5a623] focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label htmlFor="includeInactive" className={`text-[12px] text-[#e2e8f0] cursor-pointer ${(filtersLocked || complianceFiltersLocked) ? 'opacity-50' : ''}`}>
              Include inactive employees
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-[#2e3a48]">
            {filters.format === 'non-compliance' ? (
              <>
                <button
                  onClick={handleDownloadTemplate}
                  disabled={generating || filtersLocked}
                  className="flex-1 bg-[#00d4ff] text-black hover:bg-[#00b8e6] font-semibold rounded-lg py-3 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? <><Loader2 size={16} className="animate-spin" />Generating...</> : <><Download size={16} />Download Template</>}
                </button>
                <button
                  onClick={() => setUploadCalculateOpen(true)}
                  disabled={!filtersLocked}
                  className="flex-1 bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold rounded-lg py-3 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload size={16} />Upload & Calculate
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleDownloadComplianceTemplate}
                  disabled={generating || complianceFiltersLocked}
                  className="flex-1 bg-[#00d4ff] text-black hover:bg-[#00b8e6] font-semibold rounded-lg py-3 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? <><Loader2 size={16} className="animate-spin" />Generating...</> : <><Download size={16} />Download Template</>}
                </button>
                <button
                  onClick={() => setComplianceUploadOpen(true)}
                  disabled={!complianceFiltersLocked}
                  className="flex-1 bg-[#00e676] text-black hover:bg-[#00c060] font-semibold rounded-lg py-3 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload size={16} />Upload & Calculate
                </button>
              </>
            )}
            <button
              onClick={handleReset}
              disabled={generating}
              className="px-6 py-3 rounded-lg bg-[#1a2332] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#3a4858] transition-colors text-[13px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Format Info Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0f1318] border border-[#1e2530] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#f5a623]/10 flex items-center justify-center">
              <FileSpreadsheet size={16} className="text-[#f5a623]" />
            </div>
            <div className="text-[13px] font-semibold text-[#e2e8f0]">Non-Compliance Format</div>
          </div>
          <div className="text-[11px] text-[#5a6878] leading-relaxed space-y-1">
            <div>• 68 columns with detailed breakdown</div>
            <div>• Includes actual attendance, OT hours, PH days</div>
            <div>• Separate compliance and non-compliance sections</div>
            <div>• Advance, arrears, and bonus columns</div>
            <div>• Suitable for internal payroll processing</div>
          </div>
        </div>

        <div className="bg-[#0f1318] border border-[#1e2530] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#00e676]/10 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-[#00e676]" />
            </div>
            <div className="text-[13px] font-semibold text-[#e2e8f0]">Compliance Format</div>
          </div>
          <div className="text-[11px] text-[#5a6878] leading-relaxed space-y-1">
            <div>• Statutory compliant structure</div>
            <div>• Simplified columns for labor compliance</div>
            <div>• EPF, ESIC, PT calculations</div>
            <div>• Suitable for government submissions</div>
            <div>• Meets labor law requirements</div>
          </div>
        </div>
      </div>

      {/* Non-Compliance Upload & Calculate Dialog */}
      <Dialog open={uploadCalculateOpen} onOpenChange={setUploadCalculateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0] text-base">Upload & Calculate - Step 2</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-[#141920] border border-[#2e3a48] rounded-lg p-3">
              <div className="text-[10px] text-[#8899aa] space-y-2">
                <p className="font-semibold text-[#e2e8f0]">Instructions:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Upload the template you filled offline</li>
                  <li>System will validate and calculate all formulas</li>
                  <li>Download the final calculated sheet</li>
                  <li>Upload final sheet to "Non-Compliance Bulk Import"</li>
                </ul>
              </div>
            </div>

            {/* Upload Section */}
            <div className="border-2 border-dashed border-[#2e3a48] rounded-lg p-6 text-center">
              <input
                ref={templateFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleTemplateFileSelect}
                className="hidden"
                id="template-file-upload"
              />
              <label
                htmlFor="template-file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-[#f5a623]/10 flex items-center justify-center">
                  <FileSpreadsheet size={24} className="text-[#f5a623]" />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-[#e2e8f0] mb-1">
                    {templateFile ? templateFile.name : 'Click to upload filled template'}
                  </div>
                  <div className="text-[10px] text-[#5a6878]">
                    Excel file (.xlsx, .xls)
                  </div>
                </div>
              </label>
            </div>

            {calculating && (
              <div className="bg-[#141920] border border-[#2e3a48] rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#f5a623] border-t-transparent" />
                  <span className="text-[11px] text-[#e2e8f0]">Calculating payroll...</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="ghost" 
              className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48]" 
              onClick={() => {
                setUploadCalculateOpen(false);
                setTemplateFile(null);
                localStorage.removeItem('payroll_gen_nc_template');
                if (templateFileInputRef.current) {
                  templateFileInputRef.current.value = '';
                }
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" 
              disabled={!templateFile || calculating}
              onClick={handleUploadAndCalculate}
            >
              {calculating ? 'Calculating...' : 'Upload & Calculate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compliance Upload & Calculate Dialog */}
      <Dialog open={complianceUploadOpen} onOpenChange={setComplianceUploadOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0] text-base">Compliance Upload & Calculate - Step 2</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-[#141920] border border-[#2e3a48] rounded-lg p-3">
              <div className="text-[10px] text-[#8899aa] space-y-2">
                <p className="font-semibold text-[#e2e8f0]">Instructions:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Upload the compliance template you filled offline</li>
                  <li>System calculates Daily Rate, Basic Wages, DA, OT, EPF, ESI, PT, Net Pay</li>
                  <li>Download the final calculated sheet</li>
                  <li>Upload final sheet to "Compliance Bulk Import" to save to database</li>
                </ul>
              </div>
            </div>

            <div className="border-2 border-dashed border-[#2e3a48] rounded-lg p-6 text-center">
              <input
                ref={complianceFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleComplianceFileSelect}
                className="hidden"
                id="compliance-file-upload"
              />
              <label
                htmlFor="compliance-file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-[#00e676]/10 flex items-center justify-center">
                  <FileSpreadsheet size={24} className="text-[#00e676]" />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-[#e2e8f0] mb-1">
                    {complianceTemplateFile ? complianceTemplateFile.name : 'Click to upload filled compliance template'}
                  </div>
                  <div className="text-[10px] text-[#5a6878]">Excel file (.xlsx, .xls)</div>
                </div>
              </label>
            </div>

            {complianceCalculating && (
              <div className="bg-[#141920] border border-[#2e3a48] rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#00e676] border-t-transparent" />
                  <span className="text-[11px] text-[#e2e8f0]">Calculating compliance payroll...</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48]"
              onClick={() => {
                setComplianceUploadOpen(false);
                setComplianceTemplateFile(null);
                localStorage.removeItem('payroll_gen_c_template');
                if (complianceFileInputRef.current) complianceFileInputRef.current.value = '';
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#00e676] text-black hover:bg-[#00c060] font-semibold"
              disabled={!complianceTemplateFile || complianceCalculating}
              onClick={handleComplianceUploadAndCalculate}
            >
              {complianceCalculating ? 'Calculating...' : 'Upload & Calculate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
