'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  FileText, User, MapPin, Building2, CreditCard, Heart,
  Shield, CheckCircle2, Clock, LogOut, ChevronRight, ChevronLeft, Upload
} from 'lucide-react';

interface OnboardingFormProps {
  status: string; // 'pending' | 'submitted'
  onSubmit: () => void;
  onLogout: () => void;
}

const inp = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]/60 transition-colors placeholder:text-[#5a6878]';
const lbl = 'block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5';

const STEPS = [
  { id: 'personal', label: 'Personal Details', icon: User },
  { id: 'address', label: 'Address', icon: MapPin },
  { id: 'family', label: 'Family Details', icon: Heart },
  { id: 'employment', label: 'Previous Employment', icon: Building2 },
  { id: 'bank', label: 'Bank & Statutory', icon: CreditCard },
  { id: 'documents', label: 'Document Checklist', icon: FileText },
  { id: 'declaration', label: 'Declaration', icon: Shield },
];

export default function OnboardingForm({ status, onSubmit, onLogout }: OnboardingFormProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    // Personal
    firstName: '', middleName: '', lastName: '',
    dateOfBirth: '', gender: '', placeOfBirth: '',
    religion: '', nationality: 'Indian', bloodGroup: '',
    maritalStatus: '', dateOfWedding: '',
    // Address
    presentDoorNo: '', presentBuilding: '', presentStreet: '',
    presentLocation: '', presentCity: '', presentDistrict: '',
    presentPincode: '', presentState: '',
    permanentDoorNo: '', permanentBuilding: '', permanentStreet: '',
    permanentLocation: '', permanentCity: '', permanentDistrict: '',
    permanentPincode: '', permanentState: '',
    sameAsPresent: false,
    // Family
    fatherName: '', fatherDob: '', fatherAadhar: '',
    motherName: '', motherDob: '', motherAadhar: '',
    spouseName: '', spouseDob: '', spouseGender: '', spouseAadhar: '',
    child1Name: '', child1Dob: '', child1Gender: '',
    child2Name: '', child2Dob: '', child2Gender: '',
    // Employment
    prevEmployer1: '', prevDesignation1: '', prevFrom1: '', prevTo1: '', prevReason1: '',
    prevEmployer2: '', prevDesignation2: '', prevFrom2: '', prevTo2: '', prevReason2: '',
    // Bank & Statutory
    bankName: '', bankAccount: '', bankIfsc: '', bankBranch: '',
    panNumber: '', aadharNumber: '',
    uanNumber: '', pfNumber: '', existingPfMember: '',
    esicNumber: '', existingEsicMember: '',
    // Documents checklist
    hasResume: false, hasEducationCert: false, educationLevel: '',
    hasPrevEmploymentProof: false, prevEmploymentProofType: '',
    hasPanCard: false, hasAadhar: false, hasPassport: false,
    hasVoterId: false, hasVaccineCert: false,
    hasBankProof: false, hasPhotographs: false, hasFamilyPhoto: false,
    // Nomination
    nomineeName: '', nomineeRelation: '', nomineeAddress: '',
    // Declaration
    declarationAgreed: false,
  });

  const updateForm = (field: string, value: any) => {
    setForm(f => {
      const updated = { ...f, [field]: value };
      // Auto-copy present to permanent if checkbox is checked
      if (field === 'sameAsPresent' && value) {
        updated.permanentDoorNo = f.presentDoorNo;
        updated.permanentBuilding = f.presentBuilding;
        updated.permanentStreet = f.presentStreet;
        updated.permanentLocation = f.presentLocation;
        updated.permanentCity = f.presentCity;
        updated.permanentDistrict = f.presentDistrict;
        updated.permanentPincode = f.presentPincode;
        updated.permanentState = f.presentState;
      }
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!form.declarationAgreed) {
      toast.error('Please agree to the declaration before submitting');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/onboarding-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData: form }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Onboarding form submitted successfully! Awaiting admin approval.');
        onSubmit();
      } else {
        toast.error(data.error || 'Failed to submit form');
      }
    } catch {
      toast.error('Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  // If already submitted, show waiting screen
  if (status === 'submitted') {
    return (
      <div className="min-h-screen bg-[#0a0d12] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#161c24] border border-[#252e3a] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-[#f5a623]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-[#f5a623]" />
          </div>
          <h2 className="text-[18px] font-bold text-[#e2e8f0] mb-2">Onboarding Form Submitted</h2>
          <p className="text-[13px] text-[#5a6878] mb-6">
            Your joining form has been submitted and is awaiting admin approval. You will get access to the system once approved.
          </p>
          <div className="bg-[#f5a623]/5 border border-[#f5a623]/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle2 size={14} className="text-[#f5a623]" />
              <span className="text-[12px] text-[#f5a623] font-semibold">Form submitted — pending review</span>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 mx-auto text-[12px] text-[#5a6878] hover:text-[#e2e8f0] transition-colors">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>
    );
  }

  const CurrentStep = STEPS[step];

  return (
    <div className="min-h-screen bg-[#0a0d12] flex flex-col">
      {/* Header */}
      <div className="bg-[#161c24] border-b border-[#252e3a] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-[#f5a623] to-[#e8891a] rounded-lg flex items-center justify-center text-sm font-extrabold text-black">VC</div>
          <div>
            <h1 className="text-[14px] font-bold text-[#e2e8f0]">Employee Joining Form</h1>
            <p className="text-[11px] text-[#5a6878]">Complete all sections to get access to the system</p>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-[11px] text-[#5a6878] hover:text-[#e2e8f0] transition-colors">
          <LogOut size={13} /> Sign out
        </button>
      </div>

      {/* Step indicator */}
      <div className="bg-[#161c24] border-b border-[#252e3a] px-6 py-3 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <button key={s.id} onClick={() => setStep(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                  isActive ? 'bg-[#f5a623] text-black' :
                  isDone ? 'bg-[#00e676]/10 text-[#00e676]' :
                  'text-[#5a6878] hover:text-[#e2e8f0]'
                }`}>
                {isDone ? <CheckCircle2 size={12} /> : <Icon size={12} />}
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <CurrentStep.icon size={16} className="text-[#f5a623]" />
              <h2 className="text-[15px] font-bold text-[#e2e8f0]">{CurrentStep.label}</h2>
              <span className="text-[10px] text-[#5a6878] ml-auto">Step {step + 1} of {STEPS.length}</span>
            </div>

            {step === 0 && <PersonalStep form={form} update={updateForm} />}
            {step === 1 && <AddressStep form={form} update={updateForm} />}
            {step === 2 && <FamilyStep form={form} update={updateForm} />}
            {step === 3 && <EmploymentStep form={form} update={updateForm} />}
            {step === 4 && <BankStep form={form} update={updateForm} />}
            {step === 5 && <DocumentsStep form={form} update={updateForm} />}
            {step === 6 && <DeclarationStep form={form} update={updateForm} />}
          </div>
        </div>
      </div>

      {/* Footer navigation */}
      <div className="bg-[#161c24] border-t border-[#252e3a] px-6 py-4 flex items-center justify-between">
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-[12px] text-[#8899aa] border border-[#252e3a] rounded-lg hover:border-[#f5a623] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={14} /> Previous
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#f5a623] text-black text-[12px] font-bold rounded-lg hover:bg-[#e8891a] transition-colors">
            Next <ChevronRight size={14} />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting || !form.declarationAgreed}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#00e676] text-black text-[12px] font-bold rounded-lg hover:bg-[#00c853] disabled:opacity-50 transition-colors">
            {submitting ? 'Submitting...' : 'Submit Form'}
          </button>
        )}
      </div>
    </div>
  );
}


/* ── Step Components ─────────────────────────────────────────────── */

function Field({ label, children, required, span2 }: { label: string; children: React.ReactNode; required?: boolean; span2?: boolean }) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <label className={lbl}>{label}{required && <span className="text-[#ff3d3d] ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

function PersonalStep({ form, update }: { form: any; update: (f: string, v: any) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="First Name" required>
        <input className={inp} value={form.firstName} onChange={e => update('firstName', e.target.value)} placeholder="First name" />
      </Field>
      <Field label="Middle Name">
        <input className={inp} value={form.middleName} onChange={e => update('middleName', e.target.value)} placeholder="Middle name (optional)" />
      </Field>
      <Field label="Last Name" required>
        <input className={inp} value={form.lastName} onChange={e => update('lastName', e.target.value)} placeholder="Last name" />
      </Field>
      <Field label="Date of Birth" required>
        <input className={inp} type="date" value={form.dateOfBirth} onChange={e => update('dateOfBirth', e.target.value)} />
      </Field>
      <Field label="Gender" required>
        <select className={inp} value={form.gender} onChange={e => update('gender', e.target.value)}>
          <option value="">Select</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Others">Others</option>
        </select>
      </Field>
      <Field label="Place of Birth">
        <input className={inp} value={form.placeOfBirth} onChange={e => update('placeOfBirth', e.target.value)} placeholder="City/Town" />
      </Field>
      <Field label="Religion">
        <input className={inp} value={form.religion} onChange={e => update('religion', e.target.value)} placeholder="Religion" />
      </Field>
      <Field label="Nationality">
        <input className={inp} value={form.nationality} onChange={e => update('nationality', e.target.value)} placeholder="Nationality" />
      </Field>
      <Field label="Blood Group">
        <select className={inp} value={form.bloodGroup} onChange={e => update('bloodGroup', e.target.value)}>
          <option value="">Select</option>
          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
            <option key={bg} value={bg}>{bg}</option>
          ))}
        </select>
      </Field>
      <Field label="Marital Status" required>
        <select className={inp} value={form.maritalStatus} onChange={e => update('maritalStatus', e.target.value)}>
          <option value="">Select</option>
          <option value="Single">Single</option>
          <option value="Married">Married</option>
          <option value="Widow">Widow</option>
          <option value="Separated">Separated</option>
        </select>
      </Field>
      {form.maritalStatus === 'Married' && (
        <Field label="Date of Wedding">
          <input className={inp} type="date" value={form.dateOfWedding} onChange={e => update('dateOfWedding', e.target.value)} />
        </Field>
      )}
    </div>
  );
}

function AddressStep({ form, update }: { form: any; update: (f: string, v: any) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[12px] font-semibold text-[#e2e8f0] mb-3 flex items-center gap-2">
          <MapPin size={13} className="text-[#f5a623]" /> Present Address
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Door No / House No"><input className={inp} value={form.presentDoorNo} onChange={e => update('presentDoorNo', e.target.value)} /></Field>
          <Field label="Building Name"><input className={inp} value={form.presentBuilding} onChange={e => update('presentBuilding', e.target.value)} /></Field>
          <Field label="Street Name"><input className={inp} value={form.presentStreet} onChange={e => update('presentStreet', e.target.value)} /></Field>
          <Field label="Location / Area"><input className={inp} value={form.presentLocation} onChange={e => update('presentLocation', e.target.value)} /></Field>
          <Field label="City" required><input className={inp} value={form.presentCity} onChange={e => update('presentCity', e.target.value)} /></Field>
          <Field label="District / Taluk"><input className={inp} value={form.presentDistrict} onChange={e => update('presentDistrict', e.target.value)} /></Field>
          <Field label="Pin Code" required><input className={inp} value={form.presentPincode} onChange={e => update('presentPincode', e.target.value)} /></Field>
          <Field label="State" required><input className={inp} value={form.presentState} onChange={e => update('presentState', e.target.value)} /></Field>
        </div>
      </div>

      <div className="border-t border-[#252e3a] pt-4">
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-[12px] font-semibold text-[#e2e8f0] flex items-center gap-2">
            <MapPin size={13} className="text-[#00d4ff]" /> Permanent Address
          </h3>
          <label className="flex items-center gap-1.5 text-[10px] text-[#5a6878] cursor-pointer">
            <input type="checkbox" checked={form.sameAsPresent} onChange={e => update('sameAsPresent', e.target.checked)}
              className="w-3.5 h-3.5 rounded border-[#2e3a48] bg-[#0d1117] text-[#f5a623] focus:ring-[#f5a623]" />
            Same as present address
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Door No / House No"><input className={inp} value={form.permanentDoorNo} onChange={e => update('permanentDoorNo', e.target.value)} disabled={form.sameAsPresent} /></Field>
          <Field label="Building Name"><input className={inp} value={form.permanentBuilding} onChange={e => update('permanentBuilding', e.target.value)} disabled={form.sameAsPresent} /></Field>
          <Field label="Street Name"><input className={inp} value={form.permanentStreet} onChange={e => update('permanentStreet', e.target.value)} disabled={form.sameAsPresent} /></Field>
          <Field label="Location / Area"><input className={inp} value={form.permanentLocation} onChange={e => update('permanentLocation', e.target.value)} disabled={form.sameAsPresent} /></Field>
          <Field label="City"><input className={inp} value={form.permanentCity} onChange={e => update('permanentCity', e.target.value)} disabled={form.sameAsPresent} /></Field>
          <Field label="District / Taluk"><input className={inp} value={form.permanentDistrict} onChange={e => update('permanentDistrict', e.target.value)} disabled={form.sameAsPresent} /></Field>
          <Field label="Pin Code"><input className={inp} value={form.permanentPincode} onChange={e => update('permanentPincode', e.target.value)} disabled={form.sameAsPresent} /></Field>
          <Field label="State"><input className={inp} value={form.permanentState} onChange={e => update('permanentState', e.target.value)} disabled={form.sameAsPresent} /></Field>
        </div>
      </div>
    </div>
  );
}

function FamilyStep({ form, update }: { form: any; update: (f: string, v: any) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[12px] font-semibold text-[#e2e8f0] mb-3">Father&apos;s Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Father's Name" required><input className={inp} value={form.fatherName} onChange={e => update('fatherName', e.target.value)} /></Field>
          <Field label="Date of Birth"><input className={inp} type="date" value={form.fatherDob} onChange={e => update('fatherDob', e.target.value)} /></Field>
          <Field label="Aadhar Number"><input className={inp} value={form.fatherAadhar} onChange={e => update('fatherAadhar', e.target.value)} placeholder="12-digit Aadhar" /></Field>
        </div>
      </div>
      <div>
        <h3 className="text-[12px] font-semibold text-[#e2e8f0] mb-3">Mother&apos;s Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Mother's Name"><input className={inp} value={form.motherName} onChange={e => update('motherName', e.target.value)} /></Field>
          <Field label="Date of Birth"><input className={inp} type="date" value={form.motherDob} onChange={e => update('motherDob', e.target.value)} /></Field>
          <Field label="Aadhar Number"><input className={inp} value={form.motherAadhar} onChange={e => update('motherAadhar', e.target.value)} placeholder="12-digit Aadhar" /></Field>
        </div>
      </div>
      {form.maritalStatus === 'Married' && (
        <div>
          <h3 className="text-[12px] font-semibold text-[#e2e8f0] mb-3">Spouse Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Spouse Name"><input className={inp} value={form.spouseName} onChange={e => update('spouseName', e.target.value)} /></Field>
            <Field label="Date of Birth"><input className={inp} type="date" value={form.spouseDob} onChange={e => update('spouseDob', e.target.value)} /></Field>
            <Field label="Gender">
              <select className={inp} value={form.spouseGender} onChange={e => update('spouseGender', e.target.value)}>
                <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option>
              </select>
            </Field>
            <Field label="Aadhar Number"><input className={inp} value={form.spouseAadhar} onChange={e => update('spouseAadhar', e.target.value)} placeholder="12-digit Aadhar" /></Field>
          </div>
        </div>
      )}
      <div>
        <h3 className="text-[12px] font-semibold text-[#e2e8f0] mb-3">Children (if any)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <Field label="Child 1 Name"><input className={inp} value={form.child1Name} onChange={e => update('child1Name', e.target.value)} /></Field>
          <Field label="Date of Birth"><input className={inp} type="date" value={form.child1Dob} onChange={e => update('child1Dob', e.target.value)} /></Field>
          <Field label="Gender">
            <select className={inp} value={form.child1Gender} onChange={e => update('child1Gender', e.target.value)}>
              <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Child 2 Name"><input className={inp} value={form.child2Name} onChange={e => update('child2Name', e.target.value)} /></Field>
          <Field label="Date of Birth"><input className={inp} type="date" value={form.child2Dob} onChange={e => update('child2Dob', e.target.value)} /></Field>
          <Field label="Gender">
            <select className={inp} value={form.child2Gender} onChange={e => update('child2Gender', e.target.value)}>
              <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option>
            </select>
          </Field>
        </div>
      </div>
      <div className="border-t border-[#252e3a] pt-4">
        <h3 className="text-[12px] font-semibold text-[#e2e8f0] mb-3">Nomination (Form No. 25)</h3>
        <p className="text-[10px] text-[#5a6878] mb-3">In the event of death, the balance of pay shall be paid to:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nominee Name" required><input className={inp} value={form.nomineeName} onChange={e => update('nomineeName', e.target.value)} /></Field>
          <Field label="Relationship" required>
            <select className={inp} value={form.nomineeRelation} onChange={e => update('nomineeRelation', e.target.value)}>
              <option value="">Select</option>
              <option value="Father">Father</option><option value="Mother">Mother</option>
              <option value="Husband">Husband</option><option value="Wife">Wife</option>
              <option value="Son">Son</option><option value="Daughter">Daughter</option>
            </select>
          </Field>
          <Field label="Nominee Address" span2><input className={inp} value={form.nomineeAddress} onChange={e => update('nomineeAddress', e.target.value)} placeholder="Full address of nominee" /></Field>
        </div>
      </div>
    </div>
  );
}

function EmploymentStep({ form, update }: { form: any; update: (f: string, v: any) => void }) {
  return (
    <div className="space-y-5">
      <p className="text-[11px] text-[#5a6878]">Provide details of your previous employment (if any). Leave blank if this is your first job.</p>
      <div>
        <h3 className="text-[12px] font-semibold text-[#e2e8f0] mb-3">Previous Employer 1</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Company Name"><input className={inp} value={form.prevEmployer1} onChange={e => update('prevEmployer1', e.target.value)} /></Field>
          <Field label="Designation"><input className={inp} value={form.prevDesignation1} onChange={e => update('prevDesignation1', e.target.value)} /></Field>
          <Field label="From"><input className={inp} type="date" value={form.prevFrom1} onChange={e => update('prevFrom1', e.target.value)} /></Field>
          <Field label="To"><input className={inp} type="date" value={form.prevTo1} onChange={e => update('prevTo1', e.target.value)} /></Field>
          <Field label="Reason for Leaving" span2><input className={inp} value={form.prevReason1} onChange={e => update('prevReason1', e.target.value)} /></Field>
        </div>
      </div>
      <div className="border-t border-[#252e3a] pt-4">
        <h3 className="text-[12px] font-semibold text-[#e2e8f0] mb-3">Previous Employer 2</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Company Name"><input className={inp} value={form.prevEmployer2} onChange={e => update('prevEmployer2', e.target.value)} /></Field>
          <Field label="Designation"><input className={inp} value={form.prevDesignation2} onChange={e => update('prevDesignation2', e.target.value)} /></Field>
          <Field label="From"><input className={inp} type="date" value={form.prevFrom2} onChange={e => update('prevFrom2', e.target.value)} /></Field>
          <Field label="To"><input className={inp} type="date" value={form.prevTo2} onChange={e => update('prevTo2', e.target.value)} /></Field>
          <Field label="Reason for Leaving" span2><input className={inp} value={form.prevReason2} onChange={e => update('prevReason2', e.target.value)} /></Field>
        </div>
      </div>
    </div>
  );
}

function BankStep({ form, update }: { form: any; update: (f: string, v: any) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[12px] font-semibold text-[#e2e8f0] mb-3">Bank Account Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Bank Name" required><input className={inp} value={form.bankName} onChange={e => update('bankName', e.target.value)} /></Field>
          <Field label="Branch"><input className={inp} value={form.bankBranch} onChange={e => update('bankBranch', e.target.value)} /></Field>
          <Field label="Account Number" required><input className={inp} value={form.bankAccount} onChange={e => update('bankAccount', e.target.value)} /></Field>
          <Field label="IFSC Code" required><input className={inp} value={form.bankIfsc} onChange={e => update('bankIfsc', e.target.value)} placeholder="e.g. SBIN0001234" /></Field>
        </div>
      </div>
      <div className="border-t border-[#252e3a] pt-4">
        <h3 className="text-[12px] font-semibold text-[#e2e8f0] mb-3">Identity & Statutory</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="PAN Number" required><input className={inp} value={form.panNumber} onChange={e => update('panNumber', e.target.value)} placeholder="ABCDE1234F" /></Field>
          <Field label="Aadhar Number" required><input className={inp} value={form.aadharNumber} onChange={e => update('aadharNumber', e.target.value)} placeholder="12-digit number" /></Field>
        </div>
      </div>
      <div className="border-t border-[#252e3a] pt-4">
        <h3 className="text-[12px] font-semibold text-[#e2e8f0] mb-3">EPF Details (Form No. 11)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Earlier member of EPF?">
            <select className={inp} value={form.existingPfMember} onChange={e => update('existingPfMember', e.target.value)}>
              <option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option>
            </select>
          </Field>
          <Field label="UAN Number"><input className={inp} value={form.uanNumber} onChange={e => update('uanNumber', e.target.value)} placeholder="Universal Account Number" /></Field>
          <Field label="Previous PF Account No"><input className={inp} value={form.pfNumber} onChange={e => update('pfNumber', e.target.value)} placeholder="If applicable" /></Field>
        </div>
      </div>
      <div className="border-t border-[#252e3a] pt-4">
        <h3 className="text-[12px] font-semibold text-[#e2e8f0] mb-3">ESIC Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Earlier member of ESIC?">
            <select className={inp} value={form.existingEsicMember} onChange={e => update('existingEsicMember', e.target.value)}>
              <option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option>
            </select>
          </Field>
          <Field label="Existing ESIC Number"><input className={inp} value={form.esicNumber} onChange={e => update('esicNumber', e.target.value)} placeholder="If applicable" /></Field>
        </div>
      </div>
    </div>
  );
}

function DocumentsStep({ form, update }: { form: any; update: (f: string, v: any) => void }) {
  const CheckItem = ({ field, label, mandatory }: { field: string; label: string; mandatory?: boolean }) => (
    <label className="flex items-center gap-3 p-3 bg-[#0d1117] border border-[#2e3a48] rounded-lg cursor-pointer hover:border-[#f5a623]/40 transition-colors">
      <input type="checkbox" checked={form[field]} onChange={e => update(field, e.target.checked)}
        className="w-4 h-4 rounded border-[#2e3a48] bg-[#0d1117] text-[#f5a623] focus:ring-[#f5a623]" />
      <span className="text-[12px] text-[#e2e8f0] flex-1">{label}</span>
      {mandatory && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#ff3d3d]/10 text-[#ff3d3d]">MANDATORY</span>}
    </label>
  );

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-[#5a6878]">Check the documents you are submitting along with this form. Mandatory documents must be provided.</p>

      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold text-[#8899aa] uppercase tracking-wider">Identity & Address Proof</h3>
        <CheckItem field="hasPanCard" label="Copy of PAN Card" mandatory />
        <CheckItem field="hasAadhar" label="Copy of Aadhar Card" mandatory />
        <CheckItem field="hasPassport" label="Copy of Passport" />
        <CheckItem field="hasVoterId" label="Voter ID / Driving License" />
        <CheckItem field="hasVaccineCert" label="Vaccine Certificate" />
      </div>

      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold text-[#8899aa] uppercase tracking-wider">Education</h3>
        <CheckItem field="hasEducationCert" label="Education Certificate (any one applicable)" />
        {form.hasEducationCert && (
          <div className="ml-7">
            <select className={inp} value={form.educationLevel} onChange={e => update('educationLevel', e.target.value)}>
              <option value="">Select level</option>
              <option value="X Standard">X Standard</option>
              <option value="XII Standard">XII Standard</option>
              <option value="Graduation">Graduation</option>
              <option value="Post-Graduation">Post-Graduation</option>
              <option value="Other">Other</option>
            </select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold text-[#8899aa] uppercase tracking-wider">Previous Employment</h3>
        <CheckItem field="hasPrevEmploymentProof" label="Previous Employment Proof (any two applicable)" />
        {form.hasPrevEmploymentProof && (
          <div className="ml-7">
            <select className={inp} value={form.prevEmploymentProofType} onChange={e => update('prevEmploymentProofType', e.target.value)}>
              <option value="">Select type</option>
              <option value="Service Certificate">Service Certificate</option>
              <option value="Relieving Letter">Relieving Letter</option>
              <option value="Appointment Letter">Appointment Letter</option>
              <option value="Last Drawn Payslip">Last Drawn Payslip</option>
            </select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold text-[#8899aa] uppercase tracking-wider">Other Documents</h3>
        <CheckItem field="hasResume" label="Resume / CV" />
        <CheckItem field="hasBankProof" label="Bank Account Proof (Cancelled Cheque / Passbook Copy)" mandatory />
        <CheckItem field="hasPhotographs" label="Photographs (2 nos.)" mandatory />
        <CheckItem field="hasFamilyPhoto" label="Visiting Card Size Family Photo (for ESI)" />
      </div>
    </div>
  );
}

function DeclarationStep({ form, update }: { form: any; update: (f: string, v: any) => void }) {
  return (
    <div className="space-y-5">
      <div className="bg-[#0d1117] border border-[#2e3a48] rounded-xl p-5">
        <h3 className="text-[13px] font-semibold text-[#e2e8f0] mb-3">Declaration by Employee</h3>
        <div className="text-[11px] text-[#8899aa] space-y-3 leading-relaxed">
          <p>I hereby attest that all statements made in this application are true and correct to the best of my knowledge. I understand and agree that any deception, fraud or providing false or misleading statements of material facts in this application may cause the forfeiture of all rights to employment or immediate termination if discovered after employment.</p>
          <p>I hereby authorize the Company or any third party retained by them to make inquiries, either by written communication, by telephone, online, or in person to any former employer, Government agency, Educational Institution, State Police, Military Establishment or any other persons or institutions knowledgeable of my background as to my prior history, work experience, nature of duties, CTC, performance levels, reliability, responsibility, honesty and any other measures of my character or personality.</p>
          <p>I certify that the particulars given in the EPF Form No. 11 are true to the best of my knowledge. I authorize EPFO to use my Aadhar for verification/eKYC purposes for service delivery.</p>
        </div>
      </div>

      <label className="flex items-start gap-3 p-4 bg-[#f5a623]/5 border border-[#f5a623]/20 rounded-xl cursor-pointer hover:bg-[#f5a623]/10 transition-colors">
        <input type="checkbox" checked={form.declarationAgreed} onChange={e => update('declarationAgreed', e.target.checked)}
          className="w-5 h-5 mt-0.5 rounded border-[#f5a623]/40 bg-[#0d1117] text-[#f5a623] focus:ring-[#f5a623]" />
        <div>
          <span className="text-[12px] font-semibold text-[#f5a623]">I agree to the above declaration</span>
          <p className="text-[10px] text-[#5a6878] mt-1">By checking this box, I confirm that all information provided is accurate and I authorize background verification.</p>
        </div>
      </label>

      {!form.declarationAgreed && (
        <p className="text-[10px] text-[#ff3d3d] flex items-center gap-1.5">
          <Shield size={11} /> You must agree to the declaration before submitting the form.
        </p>
      )}
    </div>
  );
}
