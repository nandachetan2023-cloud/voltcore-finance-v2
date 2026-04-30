'use client';
import { useState, useEffect } from 'react';
import { User, Phone, MapPin, CreditCard, AlertTriangle, RefreshCw, FileText, Award, Shield } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  active: '#00e676', inactive: '#ff3d3d', notice_period: '#ffab40', on_leave: '#00d4ff', separated: '#5a6878',
};

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold mb-0.5">{label}</div>
      <div className="text-[13px] text-[#e2e8f0]">{value || <span className="text-[#5a6878] italic text-[11px]">Not provided</span>}</div>
    </div>
  );
}

function Section({ title, icon: Icon, color, children }: { title: string; icon: any; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-[#252e3a]">
        <Icon size={14} style={{ color }} />
        <span className="text-[11px] font-bold text-[#8899aa] uppercase tracking-wider">{title}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>
    </div>
  );
}

export default function MyProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasEmployee, setHasEmployee] = useState(true);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employee-self/profile').then(r => r.json());
      if (res.success) setProfile(res.data);
      else if (res.error?.includes('Not linked')) setHasEmployee(false);
      else toast.error(res.error);
    } catch { toast.error('Failed to load profile'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, []);

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
  const mask = (s: string | null) => s ? s.slice(0, 4) + '••••' + s.slice(-4) : null;

  if (!hasEmployee) return (
    <div className="p-6 text-center">
      <AlertTriangle size={32} className="mx-auto text-[#f5a623] mb-3" />
      <p className="text-[13px] font-semibold text-[#e2e8f0] mb-1">Employee profile not linked</p>
      <p className="text-[11px] text-[#5a6878]">Contact your administrator to link your account.</p>
    </div>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-7 h-7 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" /></div>;
  if (!profile) return null;

  const statusColor = STATUS_COLORS[profile.employmentStatus] || '#5a6878';

  return (
    <div className="p-4 max-w-3xl space-y-4">
      {/* Header card */}
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#f5a623]/10 flex items-center justify-center text-[22px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {profile.firstName?.[0]}{profile.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[18px] font-bold text-[#e2e8f0]">{profile.firstName} {profile.middleName || ''} {profile.lastName}</h2>
              <span className="text-[9px] font-bold px-2 py-[2px] rounded-full" style={{ background: `${statusColor}15`, color: statusColor }}>
                {profile.employmentStatus?.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <div className="text-[12px] text-[#8899aa] mt-0.5">{profile.Designation?.name || '—'} · {profile.Department?.name || '—'}</div>
            <div className="text-[11px] text-[#5a6878] font-mono mt-0.5">{profile.employeeCode}</div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-[10px] text-[#5a6878]">
              <FileText size={11} className="text-[#00e676]" /><span>{profile.docCount || 0} docs</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#5a6878]">
              <Award size={11} className="text-[#f5a623]" /><span>{profile.certCount || 0} certs</span>
            </div>
            <button onClick={fetchProfile} className="p-1 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={12} /></button>
          </div>
        </div>
      </div>

      <Section title="Personal Information" icon={User} color="#f5a623">
        <Field label="Date of Birth" value={fmt(profile.dateOfBirth)} />
        <Field label="Gender" value={profile.gender} />
        <Field label="Blood Group" value={profile.bloodGroup} />
        <Field label="Marital Status" value={profile.maritalStatus} />
        <Field label="Father's Name" value={profile.fatherName} />
        <Field label="Date of Joining" value={fmt(profile.dateOfJoining)} />
      </Section>

      <Section title="Contact Details" icon={Phone} color="#00d4ff">
        <Field label="Work Email" value={profile.email} />
        <Field label="Personal Email" value={profile.personalEmail} />
        <Field label="Phone" value={profile.phone} />
        <Field label="Alternate Phone" value={profile.alternatePhone} />
      </Section>

      <Section title="Address" icon={MapPin} color="#a78bfa">
        <div className="col-span-2">
          <Field label="Current Address" value={[profile.currentAddress, profile.currentCity, profile.currentState, profile.currentPincode].filter(Boolean).join(', ')} />
        </div>
        {profile.permanentAddress && (
          <div className="col-span-2">
            <Field label="Permanent Address" value={[profile.permanentAddress, profile.permanentCity, profile.permanentState, profile.permanentPincode].filter(Boolean).join(', ')} />
          </div>
        )}
      </Section>

      <Section title="Bank Details" icon={CreditCard} color="#00e676">
        <Field label="Bank Name" value={profile.bankName} />
        <Field label="IFSC Code" value={profile.bankIfsc} />
        <div className="col-span-2"><Field label="Account Number" value={mask(profile.bankAccount)} /></div>
      </Section>

      <Section title="Statutory IDs" icon={Shield} color="#ffab40">
        <Field label="PAN" value={profile.panNumber} />
        <Field label="Aadhar" value={mask(profile.aadharNumber)} />
        <Field label="UAN" value={profile.uanNumber} />
        <Field label="ESIC" value={profile.esicNumber} />
      </Section>

      {(profile.emergencyContactName || profile.emergencyContactPhone) && (
        <Section title="Emergency Contact" icon={Phone} color="#ff3d3d">
          <Field label="Name" value={profile.emergencyContactName} />
          <Field label="Relation" value={profile.emergencyContactRelation} />
          <Field label="Phone" value={profile.emergencyContactPhone} />
        </Section>
      )}
    </div>
  );
}
