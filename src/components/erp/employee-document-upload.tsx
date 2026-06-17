'use client';
import { useState, useEffect, useCallback } from 'react';
import { Upload, Search, Trash2, FileText, CheckCircle2, AlertTriangle, HardHat } from 'lucide-react';
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
}

const inpCls = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]/60 transition-colors placeholder:text-[#5a6878]';
const selCls = inpCls + ' appearance-none cursor-pointer';
const lblCls = 'block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5';

export default function EmployeeDocumentUpload() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
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

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    return !q || `${e.firstName} ${e.lastName} ${e.employeeCode}`.toLowerCase().includes(q);
  });

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
      <div className="vc-panel">
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
                <label className={lblCls}>Search Employee</label>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5a6878]" />
                  <input className={inpCls + ' pl-7'} value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or code..." />
                </div>
              </div>
              <div>
                <label className={lblCls}>Employee *</label>
                <select className={selCls} value={selectedEmpId} onChange={e => setSelectedEmpId(e.target.value)}>
                  <option value="">Select employee...</option>
                  {filtered.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.employeeCode} — {e.firstName} {e.lastName} {e.Department ? `(${e.Department.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lblCls}>Document Type *</label>
                <select className={selCls} value={docType} onChange={e => setDocType(e.target.value)}>
                  {DOC_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className={lblCls}>File *</label>
                <input className={inpCls + ' file:border-0 file:bg-[#1e2630] file:text-[#e2e8f0] file:rounded file:px-2 file:py-0.5 file:mr-2 file:text-[11px]'} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  onChange={e => setFile(e.target.files?.[0] || null)} />
              </div>
            </div>
          )}
          <div className="flex justify-end mt-4">
            <button onClick={handleUpload} disabled={uploading || !selectedEmpId || !file}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] disabled:opacity-50 transition-colors">
              <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
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
                      <div className="w-8 h-8 rounded-lg bg-[#f5a623]/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={16} className="text-[#00e676]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-[#e2e8f0]">{doc.title}</p>
                        {doc.fileName && <p className="text-[10px] text-[#5a6878] truncate">{doc.fileName}</p>}
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
