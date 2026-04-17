'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet, Download, Filter, Calendar, Users, Building2,
  Briefcase, Loader2, CheckCircle2, AlertTriangle
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
                  Generate comprehensive payroll Excel sheets in compliance or non-compliance format. 
                  Apply filters to generate reports for specific departments, designations, branches, or individual employees.
                  The system will fetch all existing payroll data for the selected period and filters.
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
                onClick={() => setFilters(f => ({ ...f, format: 'non-compliance' }))}
                className={`p-4 rounded-lg border-2 transition-all ${
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
                    <div className="text-[10px] text-[#5a6878] mt-0.5">Standard format with 68 columns</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setFilters(f => ({ ...f, format: 'compliance' }))}
                className={`p-4 rounded-lg border-2 transition-all ${
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
                    <div className="text-[10px] text-[#5a6878] mt-0.5">Statutory compliant format</div>
                  </div>
                </div>
              </button>
            </div>
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
              className="w-4 h-4 rounded border-[#2e3a48] bg-[#1a2332] text-[#f5a623] focus:ring-[#f5a623] focus:ring-offset-0"
            />
            <label htmlFor="includeInactive" className="text-[12px] text-[#e2e8f0] cursor-pointer">
              Include inactive employees
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-[#2e3a48]">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex-1 vc-btn-primary flex items-center justify-center gap-2 py-3"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Generate Excel
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              disabled={generating}
              className="px-6 py-3 rounded-lg bg-[#1a2332] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#3a4858] transition-colors text-[13px] font-semibold"
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
    </div>
  );
}
