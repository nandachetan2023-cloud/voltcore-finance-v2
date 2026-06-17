'use client';
import { useState, useEffect, useCallback } from 'react';
import { Upload, Search, Trash2, FileText, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';

const DOC_TYPES = [
  'PAN Card', 'Aadhar Card', 'Passport', 'Voter ID / Driving License',
  'Vaccine Certificate', 'Education Certificate', 'Previous Employment Proof',
  'Resume / CV', 'Bank Account Proof', 'Passport Size Photograph', 'Family Photo (ESI)',
];

interface Employee {
  id: number; employeeCode: string; firstName: string; lastName: string;
  Department?: { name: string }; Designation?: { name: string };
}

interface DocEntry {
  id: number; type: string; title: string; fileName: string | null; downloadUrl: string | null;
  employeeVerifiedAt?: string | null; employeeRemark?: string | null;
}

const inpCls = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]/60 transition-colors placeholder:text-[#5a6878]';
const lblCls = 'block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5';

export default function EmployeeDocumentUpload() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [empSearch, setEmpSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [selectedEmpLabel, setSelectedEmpLabel] = useState('');
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [existingDocs, setExistingDocs] = useState<DocEntry[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  useEffect(() => {
    fetch('/api/employees').then(r => r.json()).then(res => {
      if (res.success) setEmployees(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const fetchDocs = useCallback(async (empId: string) => {
    if (!empId) { setExistingDocs([]); return; }
    setDocsLoading(true);
    try {
      const res = await fetch(`/api/employee-documents?employeeId=${empId}`).then(r => r.json());
      if (res.success) setExistingDocs(res.data?.[0]?.documents?.filter((d: DocEntry) => d.type !== 'certificate') || []);
      else setExistingDocs([]);
    } catch { setExistingDocs([]); }
    finally { setDocsLoading(false); }
  }, []);

  useEffect(() => { fetchDocs(selectedEmpId); }, [selectedEmpId, fetchDocs]);

  const clearSelection = () => {
    setSelectedEmpId('');
    setSelectedEmpLabel('');
    setEmpSearch('');
    setShowDropdown(false);
  };

  const selectEmployee = (emp: Employee) => {
    setSelectedEmpId(String(emp.id));
    setSelectedEmpLabel(`${emp.employeeCode} — ${emp.firstName} ${emp.lastName}${emp.Department ? ` (${emp.Department.name})` : ''}`);
    setEmpSearch('');
    setShowDropdown(false);
  };

  const filtered = employees.filter(e => {
    const q = empSearch.toLowerCase();
    return !q ||
      e.firstName.toLowerCase().includes(q) ||
      e.lastName.toLowerCase().includes(q) ||
      e.employeeCode.toLowerCase().includes(q) ||
      (e.Department?.name || '').toLowerCase().includes(q);
  });

  const selectedEmployee = selectedEmpId ? employees.find(e => String(e.id) === selectedEmpId) : null;

  const handleUpload = async () => {
    if (!selectedEmpId || !file) { toast.error('Select an employee and a file'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('employeeId', selectedEmpId);
      fd.append('docType', docType);
      fd.append('file', file);
      const res = await fetch('/api/employee-documents/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        toast.success(`${docType} uploaded successfully`);
        setFile(null);
        fetchDocs(selectedEmpId);
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    }
    finally { setUploading(false); }
  };

  const handleDelete = async (taskId: number, docTitle: string) => {
    try {
      const res = await fetch('/api/employee-documents/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${docTitle} removed`);
        fetchDocs(selectedEmpId);
      } else {
        toast.error(data.error || 'Delete failed');
      }
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="vc-panel" style={{ overflow: 'visible' }}>
        <div className="vc-panel-header">
          <Upload size={14} className="text-[#f5a623]" />
          <span className="text-[13px] font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>UPLOAD EMPLOYEE DOCUMENT</span>
        </div>
        <div className="vc-panel-body">
          {loading ? (
            <div className="text-center py-8 text-[#5a6878] text-xs">Loading employees...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className={lblCls}>Search & Select Employee *</label>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5a6878] pointer-events-none" />
                  <input
                    className={inpCls + ' pl-7' + (selectedEmployee ? ' pr-8' : '')}
                    value={selectedEmployee ? selectedEmpLabel : empSearch}
                    onChange={e => {
                      if (selectedEmployee) clearSelection();
                      setEmpSearch(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => { if (!selectedEmployee) setShowDropdown(true); }}
                    placeholder="Search by name, code or department..."
                  />
                  {selectedEmployee && (
                    <button type="button" onClick={clearSelection}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5a6878] hover:text-[#ff3d3d] transition-colors">
                      <X size={13} />
                    </button>
                  )}
                  {showDropdown && !selectedEmployee && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0d1117] border border-[#2e3a48] rounded-lg shadow-2xl max-h-[360px] overflow-y-auto">
                      {filtered.length === 0 ? (
                        <div className="px-3 py-4 text-[11px] text-[#5a6878] text-center">No employees found</div>
                      ) : (
                        filtered.map(emp => (
                          <button key={emp.id} type="button" onClick={() => selectEmployee(emp)}
                            className="w-full text-left px-3 py-2.5 hover:bg-[#161c24] transition-colors border-b border-[#1e252e] last:border-0">
                            <div className="text-[11px] font-semibold text-[#e2e8f0]">{emp.firstName} {emp.lastName}</div>
                            <div className="text-[10px] text-[#5a6878] flex items-center gap-2 mt-0.5">
                              <span>{emp.employeeCode}</span>
                              {emp.Department?.name && <><span>·</span><span>{emp.Department.name}</span></>}
                              {emp.Designation?.name && <><span>·</span><span>{emp.Designation.name}</span></>}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className={lblCls}>Document Type *</label>
                <select className={inpCls + ' appearance-none cursor-pointer'} value={docType} onChange={e => setDocType(e.target.value)}>
                  {DOC_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className={lblCls}>File *</label>
                <input className={inpCls + ' file:border-0 file:bg-[#1e2630] file:text-[#e2e8f0] file:rounded file:px-2 file:py-0.5 file:mr-2 file:text-[11px]'} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  onChange={e => setFile(e.target.files?.[0] || null)} />
              </div>
              <div className="flex items-end">
                <button onClick={handleUpload} disabled={uploading || !selectedEmpId || !file}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] disabled:opacity-50 transition-colors">
                  <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedEmpId && (
        <div className="vc-panel">
          <div className="vc-panel-header">
            <FileText size={14} className="text-[#f5a623]" />
            <span className="text-[13px] font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              UPLOADED DOCUMENTS
            </span>
            {docsLoading && <span className="ml-2 text-[10px] text-[#5a6878]">Loading...</span>}
          </div>
          <div className="vc-panel-body">
            {existingDocs.length === 0 ? (
              <div className="text-center py-8 text-[#5a6878] text-xs">No documents uploaded for this employee yet.</div>
            ) : (
              <div className="space-y-2">
                {existingDocs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between bg-[#0d1117] border border-[#2e3a48] rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${doc.employeeVerifiedAt ? 'bg-[#00e676]/15' : doc.employeeRemark ? 'bg-[#ff3d3d]/15' : 'bg-[#f5a623]/10'}`}>
                        <CheckCircle2 size={16} className={doc.employeeVerifiedAt ? 'text-[#00e676]' : doc.employeeRemark ? 'text-[#ff3d3d]' : 'text-[#5a6878]'} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[12px] font-semibold text-[#e2e8f0]">{doc.title}</p>
                          <span className={`text-[8px] px-1.5 py-[1px] rounded font-semibold ${doc.employeeVerifiedAt ? 'bg-[#00e676]/15 text-[#00e676]' : doc.employeeRemark ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' : 'bg-[#5a6878]/15 text-[#5a6878]'}`}>
                            {doc.employeeVerifiedAt ? 'Verified' : doc.employeeRemark ? 'Issue' : 'Pending'}
                          </span>
                        </div>
                        {doc.fileName && <p className="text-[10px] text-[#5a6878] truncate">{doc.fileName}</p>}
                        {doc.employeeRemark && <p className="text-[9px] text-[#ff3d3d] mt-0.5">Remark: {doc.employeeRemark}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.downloadUrl && (
                        <a href={doc.downloadUrl} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-[#00d4ff] hover:underline">Download</a>
                      )}
                      <button onClick={() => handleDelete(doc.id, doc.title)}
                        className="w-7 h-7 rounded flex items-center justify-center text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
