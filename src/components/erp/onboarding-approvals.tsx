'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, X, RefreshCw, FileCheck, Clock, AlertCircle, ChevronDown, ChevronUp, User, MapPin, CreditCard, Heart, Building2, Eye, FileText, Shield, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  employeeId?: number;
  onboardingStatus: string;
  onboardingData?: any;
  onboardingSubmittedAt?: string;
  onboardingApprovedAt?: string;
  onboardingRejectionReason?: string;
  createdAt: string;
}

const inp = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]/60 transition-colors placeholder:text-[#5a6878]';

// ── Full Form Viewer ─────────────────────────────────────────────
function FormViewer({ user, onClose }: { user: OnboardingUser; onClose: () => void }) {
  const d = user.onboardingData || {};

  const Field = ({ label, value }: { label: string; value?: string | null | boolean }) => {
    if (value === undefined || value === null || value === '') return null;
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] font-semibold text-[#5a6878] uppercase tracking-wider">{label}</span>
        <span className="text-[12px] text-[#e2e8f0]">{String(value)}</span>
      </div>
    );
  };

  const Section = ({ icon: Icon, title, color = '#f5a623', children }: { icon: any; title: string; color?: string; children: React.ReactNode }) => (
    <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#252e3a]">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={14} style={{ color }} />
        </div>
        <h3 className="text-[13px] font-bold text-[#e2e8f0]">{title}</h3>
      </div>
      {children}
    </div>
  );

  const Grid = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">{children}</div>
  );

  const CheckItem = ({ checked, label }: { checked: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${checked ? 'bg-[#00e676]/20 border border-[#00e676]/40' : 'bg-[#252e3a] border border-[#2e3a48]'}`}>
        {checked && <Check size={10} className="text-[#00e676]" />}
      </div>
      <span className={`text-[11px] ${checked ? 'text-[#e2e8f0]' : 'text-[#5a6878] line-through'}`}>{label}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-y-auto p-4">
      <div className="w-full max-w-4xl my-4">
        {/* Header */}
        <div className="bg-[#161c24] border border-[#252e3a] rounded-t-xl px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-[15px] font-bold text-[#e2e8f0]">Joining Form — {user.name}</h2>
            <p className="text-[11px] text-[#5a6878]">
              {user.email} · Submitted {user.onboardingSubmittedAt ? new Date(user.onboardingSubmittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-[#5a6878] hover:text-[#e2e8f0] hover:bg-[#252e3a] rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 bg-[#0a0d12] border-x border-[#252e3a] p-4">

          {/* 1. Personal Details */}
          <Section icon={User} title="Personal Details">
            <Grid>
              <Field label="First Name" value={d.firstName} />
              <Field label="Middle Name" value={d.middleName} />
              <Field label="Last Name" value={d.lastName} />
              <Field label="Date of Birth" value={d.dateOfBirth} />
              <Field label="Gender" value={d.gender} />
              <Field label="Place of Birth" value={d.placeOfBirth} />
              <Field label="Religion" value={d.religion} />
              <Field label="Nationality" value={d.nationality} />
              <Field label="Blood Group" value={d.bloodGroup} />
              <Field label="Marital Status" value={d.maritalStatus} />
              <Field label="Date of Wedding" value={d.dateOfWedding} />
            </Grid>
          </Section>

          {/* 2. Address */}
          <Section icon={MapPin} title="Address" color="#00d4ff">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold text-[#00d4ff] uppercase tracking-wider mb-3">Present Address</p>
                <div className="space-y-2">
                  <Field label="Door No / House No" value={d.presentDoorNo} />
                  <Field label="Building" value={d.presentBuilding} />
                  <Field label="Street" value={d.presentStreet} />
                  <Field label="Location / Area" value={d.presentLocation} />
                  <Field label="City" value={d.presentCity} />
                  <Field label="District / Taluk" value={d.presentDistrict} />
                  <Field label="Pin Code" value={d.presentPincode} />
                  <Field label="State" value={d.presentState} />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#a78bfa] uppercase tracking-wider mb-3">
                  Permanent Address {d.sameAsPresent && <span className="text-[#5a6878] font-normal">(same as present)</span>}
                </p>
                <div className="space-y-2">
                  <Field label="Door No / House No" value={d.permanentDoorNo} />
                  <Field label="Building" value={d.permanentBuilding} />
                  <Field label="Street" value={d.permanentStreet} />
                  <Field label="Location / Area" value={d.permanentLocation} />
                  <Field label="City" value={d.permanentCity} />
                  <Field label="District / Taluk" value={d.permanentDistrict} />
                  <Field label="Pin Code" value={d.permanentPincode} />
                  <Field label="State" value={d.permanentState} />
                </div>
              </div>
            </div>
          </Section>

          {/* 3. Family Details */}
          <Section icon={Heart} title="Family Details" color="#f472b6">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-[#f472b6] uppercase tracking-wider mb-2">Father</p>
                <Grid>
                  <Field label="Name" value={d.fatherName} />
                  <Field label="Date of Birth" value={d.fatherDob} />
                  <Field label="Aadhar No." value={d.fatherAadhar} />
                </Grid>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#f472b6] uppercase tracking-wider mb-2">Mother</p>
                <Grid>
                  <Field label="Name" value={d.motherName} />
                  <Field label="Date of Birth" value={d.motherDob} />
                  <Field label="Aadhar No." value={d.motherAadhar} />
                </Grid>
              </div>
              {d.spouseName && (
                <div>
                  <p className="text-[10px] font-bold text-[#f472b6] uppercase tracking-wider mb-2">Spouse</p>
                  <Grid>
                    <Field label="Name" value={d.spouseName} />
                    <Field label="Date of Birth" value={d.spouseDob} />
                    <Field label="Gender" value={d.spouseGender} />
                    <Field label="Aadhar No." value={d.spouseAadhar} />
                  </Grid>
                </div>
              )}
              {(d.child1Name || d.child2Name) && (
                <div>
                  <p className="text-[10px] font-bold text-[#f472b6] uppercase tracking-wider mb-2">Children</p>
                  <Grid>
                    {d.child1Name && <><Field label="Child 1 Name" value={d.child1Name} /><Field label="DOB" value={d.child1Dob} /><Field label="Gender" value={d.child1Gender} /></>}
                    {d.child2Name && <><Field label="Child 2 Name" value={d.child2Name} /><Field label="DOB" value={d.child2Dob} /><Field label="Gender" value={d.child2Gender} /></>}
                  </Grid>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold text-[#f472b6] uppercase tracking-wider mb-2">Nomination (Form No. 25)</p>
                <Grid>
                  <Field label="Nominee Name" value={d.nomineeName} />
                  <Field label="Relationship" value={d.nomineeRelation} />
                  <div className="col-span-full"><Field label="Nominee Address" value={d.nomineeAddress} /></div>
                </Grid>
              </div>
            </div>
          </Section>

          {/* 4. Previous Employment */}
          <Section icon={Briefcase} title="Previous Employment" color="#ffab40">
            {!d.prevEmployer1 && !d.prevEmployer2 ? (
              <p className="text-[11px] text-[#5a6878] italic">No previous employment declared (first job)</p>
            ) : (
              <div className="space-y-4">
                {d.prevEmployer1 && (
                  <div>
                    <p className="text-[10px] font-bold text-[#ffab40] uppercase tracking-wider mb-2">Employer 1</p>
                    <Grid>
                      <Field label="Company" value={d.prevEmployer1} />
                      <Field label="Designation" value={d.prevDesignation1} />
                      <Field label="From" value={d.prevFrom1} />
                      <Field label="To" value={d.prevTo1} />
                      <div className="col-span-full"><Field label="Reason for Leaving" value={d.prevReason1} /></div>
                    </Grid>
                  </div>
                )}
                {d.prevEmployer2 && (
                  <div>
                    <p className="text-[10px] font-bold text-[#ffab40] uppercase tracking-wider mb-2">Employer 2</p>
                    <Grid>
                      <Field label="Company" value={d.prevEmployer2} />
                      <Field label="Designation" value={d.prevDesignation2} />
                      <Field label="From" value={d.prevFrom2} />
                      <Field label="To" value={d.prevTo2} />
                      <div className="col-span-full"><Field label="Reason for Leaving" value={d.prevReason2} /></div>
                    </Grid>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* 5. Bank & Statutory */}
          <Section icon={CreditCard} title="Bank & Statutory" color="#00e676">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-[#00e676] uppercase tracking-wider mb-2">Bank Account</p>
                <Grid>
                  <Field label="Bank Name" value={d.bankName} />
                  <Field label="Branch" value={d.bankBranch} />
                  <Field label="Account Number" value={d.bankAccount} />
                  <Field label="IFSC Code" value={d.bankIfsc} />
                </Grid>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#00e676] uppercase tracking-wider mb-2">Identity</p>
                <Grid>
                  <Field label="PAN Number" value={d.panNumber} />
                  <Field label="Aadhar Number" value={d.aadharNumber} />
                </Grid>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#00e676] uppercase tracking-wider mb-2">EPF (Form No. 11)</p>
                <Grid>
                  <Field label="Earlier EPF Member?" value={d.existingPfMember} />
                  <Field label="UAN Number" value={d.uanNumber} />
                  <Field label="Previous PF Account" value={d.pfNumber} />
                </Grid>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#00e676] uppercase tracking-wider mb-2">ESIC</p>
                <Grid>
                  <Field label="Earlier ESIC Member?" value={d.existingEsicMember} />
                  <Field label="ESIC Number" value={d.esicNumber} />
                </Grid>
              </div>
            </div>
          </Section>

          {/* 6. Documents Uploaded */}
          <Section icon={FileText} title="Documents Uploaded" color="#a78bfa">
            {(() => {
              const docFields: Record<string, string> = {
                docPanCard: 'PAN Card',
                docAadhar: 'Aadhar Card',
                docPassport: 'Passport',
                docVoterId: 'Voter ID / Driving License',
                docVaccineCert: 'Vaccine Certificate',
                docEducationCert: 'Education Certificate',
                docPrevEmployment: 'Previous Employment Proof',
                docResume: 'Resume / CV',
                docBankProof: 'Bank Account Proof',
                docPhotograph: 'Passport Size Photograph',
                docFamilyPhoto: 'Family Photo (ESI)',
              };
              const uploaded = Object.entries(docFields).filter(([field]) => d[field]);
              const missing = Object.entries(docFields).filter(([field]) => !d[field]);
              return (
                <div className="space-y-3">
                  {uploaded.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-[#00e676] uppercase tracking-wider mb-2">Uploaded ({uploaded.length})</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {uploaded.map(([field, label]) => {
                          const file = d[field];
                          const openFile = () => {
                            if (!file?.data) return;
                            const win = window.open();
                            if (!win) return;
                            if (file.type?.startsWith('image/')) {
                              win.document.write(`<html><body style="margin:0;background:#000"><img src="${file.data}" style="max-width:100%;height:auto" /></body></html>`);
                            } else {
                              win.document.write(`<html><body style="margin:0"><iframe src="${file.data}" style="width:100vw;height:100vh;border:none"></iframe></body></html>`);
                            }
                          };
                          return (
                            <div key={field} className="flex items-center gap-2 p-2 bg-[#00e676]/5 border border-[#00e676]/20 rounded-lg">
                              <Check size={11} className="text-[#00e676] shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold text-[#e2e8f0] truncate">{label}</p>
                                <p className="text-[10px] text-[#5a6878] truncate">{file?.name || 'File uploaded'}</p>
                              </div>
                              {file?.data && (
                                <button onClick={openFile}
                                  className="shrink-0 flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-[#00d4ff] border border-[#00d4ff]/30 rounded hover:bg-[#00d4ff]/10 transition-colors">
                                  <Eye size={10} /> View
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {missing.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-[#5a6878] uppercase tracking-wider mb-2">Not Uploaded ({missing.length})</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {missing.map(([field, label]) => (
                          <div key={field} className="flex items-center gap-1.5 text-[10px] text-[#5a6878]">
                            <X size={10} className="shrink-0" />{label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </Section>

          {/* 7. Declaration */}
          <Section icon={Shield} title="Declaration" color="#00d4ff">
            <div className="space-y-3">
              <div className="bg-[#0d1117] rounded-lg p-4 text-[11px] text-[#8899aa] leading-relaxed space-y-2">
                <p>I hereby attest that all statements made in this application are true and correct to the best of my knowledge. I understand and agree that any deception, fraud or providing false or misleading statements of material facts in this application may cause the forfeiture of all rights to employment or immediate termination if discovered after employment.</p>
                <p>I hereby authorize the Company or any third party retained by them to make inquiries to any former employer, Government agency, Educational Institution, State Police, Military Establishment or any other persons or institutions knowledgeable of my background.</p>
                <p>I certify that the particulars given in the EPF Form No. 11 are true to the best of my knowledge. I authorize EPFO to use my Aadhar for verification/eKYC purposes.</p>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${d.declarationAgreed ? 'bg-[#00e676]/8 border-[#00e676]/30' : 'bg-[#ff3d3d]/8 border-[#ff3d3d]/30'}`}>
                <div className={`w-5 h-5 rounded flex items-center justify-center ${d.declarationAgreed ? 'bg-[#00e676]/20' : 'bg-[#ff3d3d]/20'}`}>
                  {d.declarationAgreed ? <Check size={12} className="text-[#00e676]" /> : <X size={12} className="text-[#ff3d3d]" />}
                </div>
                <span className={`text-[12px] font-semibold ${d.declarationAgreed ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>
                  {d.declarationAgreed ? 'Employee agreed to the declaration' : 'Declaration NOT agreed'}
                </span>
              </div>
            </div>
          </Section>

        </div>

        {/* Footer */}
        <div className="bg-[#161c24] border border-[#252e3a] rounded-b-xl px-6 py-4 flex items-center justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-[12px] text-[#8899aa] border border-[#252e3a] rounded-lg hover:border-[#f5a623] transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingApprovals() {
  const [users, setUsers] = useState<OnboardingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'submitted' | 'pending' | 'rejected' | 'all'>('submitted');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [viewUser, setViewUser] = useState<OnboardingUser | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === 'all' ? '/api/onboarding-approvals' : `/api/onboarding-approvals?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setUsers(data.data || []);
      else toast.error(data.error);
    } catch { toast.error('Failed to load onboarding requests'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (userId: string, name: string) => {
    if (!confirm(`Approve onboarding for "${name}"? This will copy form data into the employee record.`)) return;
    setProcessing(userId);
    try {
      const res = await fetch('/api/onboarding-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'approve' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`✅ ${data.message}`);
        fetchData();
      } else toast.error(data.error);
    } finally { setProcessing(null); }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setProcessing(rejectId);
    try {
      const res = await fetch('/api/onboarding-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: rejectId, action: 'reject', rejectionReason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setRejectId(null);
        setRejectReason('');
        fetchData();
      } else toast.error(data.error);
    } finally { setProcessing(null); }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-[#ffab40]/10 text-[#ffab40]',
      submitted: 'bg-[#00d4ff]/10 text-[#00d4ff]',
      approved: 'bg-[#00e676]/10 text-[#00e676]',
      rejected: 'bg-[#ff3d3d]/10 text-[#ff3d3d]',
    };
    return (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${styles[status] || 'bg-[#252e3a] text-[#8899aa]'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-4 space-y-4">
      {/* Full form viewer modal */}
      {viewUser && <FormViewer user={viewUser} onClose={() => setViewUser(null)} />}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f5a623]/10 rounded-xl flex items-center justify-center">
            <FileCheck size={18} className="text-[#f5a623]" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Onboarding Approvals</h2>
            <p className="text-[11px] text-[#5a6878]">Review and approve joining form submissions from new employees</p>
          </div>
        </div>
        <button onClick={fetchData} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0] transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1">
        {(['submitted', 'pending', 'rejected', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg capitalize transition-colors ${
              filter === f ? 'bg-[#f5a623] text-black' : 'text-[#5a6878] hover:text-[#e2e8f0]'
            }`}>
            {f === 'submitted' ? 'Awaiting Approval' : f === 'pending' ? 'Form Not Submitted' : f}
          </button>
        ))}
      </div>

      {/* Reject modal */}
      {rejectId && (
        <div className="bg-[#161c24] border border-[#ff3d3d]/30 rounded-xl p-4">
          <h3 className="text-[12px] font-semibold text-[#e2e8f0] mb-2 flex items-center gap-2">
            <AlertCircle size={13} className="text-[#ff3d3d]" />
            Reject Onboarding Submission
          </h3>
          <p className="text-[10px] text-[#5a6878] mb-3">The employee will see this remark and be asked to refill the form.</p>
          <textarea className={inp + ' min-h-[80px] mb-3'} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            placeholder="Required: explain what needs to be corrected (e.g., 'Aadhaar number is incorrect, please re-verify and resubmit')" />
          <div className="flex gap-2">
            <button onClick={handleReject} disabled={!rejectReason.trim() || processing === rejectId}
              className="px-3 py-1.5 bg-[#ff3d3d] text-white text-[11px] font-bold rounded-lg disabled:opacity-50">
              {processing === rejectId ? 'Rejecting...' : 'Confirm Reject'}
            </button>
            <button onClick={() => { setRejectId(null); setRejectReason(''); }}
              className="px-3 py-1.5 text-[11px] text-[#8899aa] border border-[#252e3a] rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw size={20} className="animate-spin text-[#5a6878]" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 bg-[#161c24] border border-[#252e3a] rounded-xl">
          <FileCheck size={32} className="mx-auto text-[#5a6878] mb-3" />
          <p className="text-[13px] font-semibold text-[#e2e8f0] mb-1">No submissions to review</p>
          <p className="text-[11px] text-[#5a6878]">{filter === 'submitted' ? 'No employees are awaiting approval right now.' : `No ${filter} submissions.`}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(u => {
            const isExpanded = expanded === u.id;
            const data = u.onboardingData || {};
            return (
              <div key={u.id} className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[13px] font-semibold text-[#e2e8f0]">{u.name}</span>
                        <span className="text-[10px] text-[#5a6878]">{u.email}</span>
                        {statusBadge(u.onboardingStatus)}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-[#5a6878]">
                        {u.onboardingSubmittedAt && (
                          <span className="flex items-center gap-1"><Clock size={10} /> Submitted {new Date(u.onboardingSubmittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        )}
                        {u.employeeId && <span>Employee #{u.employeeId}</span>}
                      </div>
                      {u.onboardingRejectionReason && (
                        <p className="text-[10px] text-[#ff9999] mt-1">Last rejection: {u.onboardingRejectionReason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {u.onboardingData && (
                        <button onClick={() => setViewUser(u)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold text-[#00d4ff] border border-[#00d4ff]/30 rounded-lg hover:bg-[#00d4ff]/10 transition-colors">
                          <Eye size={11} /> View Full Form
                        </button>
                      )}
                      {u.onboardingStatus === 'submitted' && (
                        <>
                          <button onClick={() => handleApprove(u.id, u.name)} disabled={processing === u.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/30 rounded-lg hover:bg-[#00e676]/20 disabled:opacity-50 transition-colors">
                            <Check size={11} /> Approve
                          </button>
                          <button onClick={() => setRejectId(u.id)} disabled={processing === u.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold bg-[#ff3d3d]/10 text-[#ff3d3d] border border-[#ff3d3d]/30 rounded-lg hover:bg-[#ff3d3d]/20 disabled:opacity-50 transition-colors">
                            <X size={11} /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && u.onboardingData && (
                  <div className="border-t border-[#252e3a] bg-[#0d1117] p-4 space-y-4">
                    <Section icon={User} title="Personal Details">
                      <Row label="Full Name" value={`${data.firstName || ''} ${data.middleName || ''} ${data.lastName || ''}`.trim()} />
                      <Row label="Date of Birth" value={data.dateOfBirth} />
                      <Row label="Gender" value={data.gender} />
                      <Row label="Marital Status" value={data.maritalStatus} />
                      <Row label="Blood Group" value={data.bloodGroup} />
                      <Row label="Father's Name" value={data.fatherName} />
                      <Row label="Religion" value={data.religion} />
                      <Row label="Nationality" value={data.nationality} />
                    </Section>

                    <Section icon={MapPin} title="Address">
                      <Row label="Present" value={[data.presentDoorNo, data.presentBuilding, data.presentStreet, data.presentLocation, data.presentCity, data.presentState, data.presentPincode].filter(Boolean).join(', ')} />
                      <Row label="Permanent" value={[data.permanentDoorNo, data.permanentBuilding, data.permanentStreet, data.permanentLocation, data.permanentCity, data.permanentState, data.permanentPincode].filter(Boolean).join(', ')} />
                    </Section>

                    <Section icon={Heart} title="Family">
                      <Row label="Mother's Name" value={data.motherName} />
                      <Row label="Spouse" value={data.spouseName} />
                      <Row label="Nominee" value={data.nomineeName ? `${data.nomineeName} (${data.nomineeRelation})` : ''} />
                      <Row label="Nominee Address" value={data.nomineeAddress} />
                    </Section>

                    <Section icon={Building2} title="Previous Employment">
                      <Row label="Company 1" value={data.prevEmployer1 ? `${data.prevEmployer1} — ${data.prevDesignation1 || ''} (${data.prevFrom1 || ''} to ${data.prevTo1 || ''})` : ''} />
                      <Row label="Company 2" value={data.prevEmployer2 ? `${data.prevEmployer2} — ${data.prevDesignation2 || ''} (${data.prevFrom2 || ''} to ${data.prevTo2 || ''})` : ''} />
                    </Section>

                    <Section icon={CreditCard} title="Bank & Statutory">
                      <Row label="Bank" value={data.bankName ? `${data.bankName} ${data.bankBranch ? `— ${data.bankBranch}` : ''}` : ''} />
                      <Row label="Account No" value={data.bankAccount} />
                      <Row label="IFSC" value={data.bankIfsc} />
                      <Row label="PAN" value={data.panNumber} />
                      <Row label="Aadhar" value={data.aadharNumber} />
                      <Row label="UAN" value={data.uanNumber} />
                      <Row label="ESIC" value={data.esicNumber} />
                    </Section>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={12} className="text-[#f5a623]" />
        <span className="text-[11px] font-semibold text-[#e2e8f0] uppercase tracking-wider">{title}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pl-5">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-[11px]">
      <span className="text-[#5a6878] min-w-[110px]">{label}:</span>
      <span className="text-[#e2e8f0] flex-1">{value}</span>
    </div>
  );
}
