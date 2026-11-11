'use client';

/**
 * Contractor Wizard — the single entry point for creating and editing a
 * contractor record.
 *
 * Contractors Management (Purchase Management → Master Setup → Contractors
 * Management) owns the contractor master: every module that needs a
 * contractor reads it from here through the dropdowns, and none of them
 * creates or edits one. This wizard therefore captures *all* contractor
 * details in one guided flow, and the API re-validates every field on save.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, CreditCard, FileText,
  Loader2, MapPin, Plus, Shield, Star, Trash2, User, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { FormField, FormSection, SearchableSelect } from '@/components/erp/_form-controls';

export const CONTRACTOR_TYPES = ['Contractor', 'Supplier', 'Service Provider', 'Consultant', 'Material Supplier'];
export const CONTRACTOR_CATEGORIES = ['Electrical', 'Mechanical', 'Civil', 'Labour', 'Services', 'Material Supply', 'EPC', 'Logistics'];
export const CONTRACTOR_STATUSES = [
  { value: 'standard', label: 'Standard' },
  { value: 'preferred', label: 'Preferred' },
  { value: 'blacklisted', label: 'Blacklisted' },
];
export const CERTIFICATE_NAMES = [
  'BBBEE Certificate', 'ISO 9001', 'ISO 14001', 'OHSAS 18001', 'ISO 45001',
  'Tax Clearance', 'GST Registration', 'MSME Registration', 'Work Registration', 'PF Registration', 'ESI Registration',
];

export interface ContractorCertificate {
  name: string;
  certNo: string;
  issueDate: string;
  expiryDate: string;
}

export interface ContractorMetrics {
  onTimeDelivery: number;
  qualityRating: number;
  priceCompetitiveness: number;
}

export interface ContractorRecord {
  id: number;
  name: string;
  categories: string[];
  region: string;
  status: string;
  rating: number;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  certificates: ContractorCertificate[];
  metrics: Partial<ContractorMetrics>;
  blacklistLog: Array<{ date: string; reason: string; setBy: string }>;
  legalName?: string | null;
  tradeName?: string | null;
  vendorCode?: string | null;
  vendorType?: string;
  registeredOn?: string | null;
  gstin?: string | null;
  pan?: string | null;
  tan?: string | null;
  msmeRegistered?: boolean;
  taxDeduction?: string | null;
  contactDesignation?: string | null;
  alternatePhone?: string | null;
  website?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  paymentTerms?: string | null;
  creditDays?: number | null;
}

export interface ContractorForm {
  name: string;
  legalName: string;
  tradeName: string;
  vendorCode: string;
  vendorType: string;
  categories: string[];
  region: string;
  status: string;
  registeredOn: string;
  contactPerson: string;
  contactDesignation: string;
  phone: string;
  alternatePhone: string;
  email: string;
  website: string;
  address: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  gstin: string;
  pan: string;
  tan: string;
  msmeRegistered: boolean;
  taxDeduction: string;
  certificates: ContractorCertificate[];
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  paymentTerms: string;
  creditDays: string;
  rating: string;
  onTimeDelivery: string;
  qualityRating: string;
  priceCompetitiveness: string;
  notes: string;
}

type StepKey = 'identity' | 'contact' | 'compliance' | 'banking' | 'review';

const STEPS: { key: StepKey; label: string; icon: typeof Building2 }[] = [
  { key: 'identity', label: 'Contractor', icon: Building2 },
  { key: 'contact', label: 'Contact', icon: User },
  { key: 'compliance', label: 'Compliance', icon: Shield },
  { key: 'banking', label: 'Banking & Terms', icon: CreditCard },
  { key: 'review', label: 'Review', icon: CheckCircle2 },
];

const EMPTY_FORM: ContractorForm = {
  name: '', legalName: '', tradeName: '', vendorCode: '', vendorType: 'Contractor',
  categories: [], region: '', status: 'standard', registeredOn: '',
  contactPerson: '', contactDesignation: '', phone: '', alternatePhone: '', email: '',
  website: '', address: '', country: 'India', state: '', city: '', pincode: '',
  gstin: '', pan: '', tan: '', msmeRegistered: false, taxDeduction: '', certificates: [],
  bankName: '', bankAccountName: '', bankAccountNumber: '', bankIfsc: '',
  paymentTerms: '', creditDays: '',
  rating: '3', onTimeDelivery: '', qualityRating: '', priceCompetitiveness: '', notes: '',
};

function toForm(v: ContractorRecord): ContractorForm {
  return {
    name: v.name ?? '', legalName: v.legalName ?? '', tradeName: v.tradeName ?? '',
    vendorCode: v.vendorCode ?? '', vendorType: v.vendorType ?? 'Contractor',
    categories: Array.isArray(v.categories) ? v.categories : [], region: v.region ?? '',
    status: v.status ?? 'standard',
    registeredOn: v.registeredOn ? String(v.registeredOn).slice(0, 10) : '',
    contactPerson: v.contactPerson ?? '', contactDesignation: v.contactDesignation ?? '',
    phone: v.phone ?? '', alternatePhone: v.alternatePhone ?? '', email: v.email ?? '',
    website: v.website ?? '', address: v.address ?? '', country: v.country ?? 'India',
    state: v.state ?? '', city: v.city ?? '', pincode: v.pincode ?? '',
    gstin: v.gstin ?? '', pan: v.pan ?? '', tan: v.tan ?? '',
    msmeRegistered: Boolean(v.msmeRegistered), taxDeduction: v.taxDeduction ?? '',
    certificates: Array.isArray(v.certificates) ? v.certificates : [],
    bankName: v.bankName ?? '', bankAccountName: v.bankAccountName ?? '',
    bankAccountNumber: v.bankAccountNumber ?? '', bankIfsc: v.bankIfsc ?? '',
    paymentTerms: v.paymentTerms ?? '', creditDays: v.creditDays != null ? String(v.creditDays) : '',
    rating: String(v.rating ?? 3),
    onTimeDelivery: v.metrics?.onTimeDelivery != null ? String(v.metrics.onTimeDelivery) : '',
    qualityRating: v.metrics?.qualityRating != null ? String(v.metrics.qualityRating) : '',
    priceCompetitiveness: v.metrics?.priceCompetitiveness != null ? String(v.metrics.priceCompetitiveness) : '',
    notes: v.notes ?? '',
  };
}

function isoToday() { return new Date().toISOString().split('T')[0]; }

function daysUntil(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

/* ── Client-side rules — the API re-checks every one of these on save ──── */

function validateStep(step: StepKey, f: ContractorForm): Record<string, string> {
  const e: Record<string, string> = {};
  const digits = (v: string) => v.replace(/\D/g, '');

  if (step === 'identity') {
    if (!f.name.trim()) e.name = 'Contractor name is required';
    else if (f.name.trim().length < 2) e.name = 'Contractor name is too short';
    if (!f.region.trim()) e.region = 'Region is required';
    if (f.categories.length === 0) e.categories = 'Pick at least one category';
    if (f.vendorCode && !/^[A-Za-z0-9._/-]{2,20}$/.test(f.vendorCode.trim())) e.vendorCode = 'Code may use letters, numbers, . _ - / only';
  }

  if (step === 'contact') {
    if (!f.contactPerson.trim()) e.contactPerson = 'Contact person is required';
    if (!f.phone.trim()) e.phone = 'Phone is required';
    else if (digits(f.phone).length < 7 || digits(f.phone).length > 15) e.phone = 'Phone must have 7–15 digits';
    if (f.alternatePhone && (digits(f.alternatePhone).length < 7 || digits(f.alternatePhone).length > 15)) e.alternatePhone = 'Phone must have 7–15 digits';
    if (!f.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email address';
    if (f.pincode && !/^[0-9]{6}$/.test(f.pincode.trim())) e.pincode = 'PIN code must be 6 digits';
    if (f.website && !/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(f.website.trim())) e.website = 'Enter a valid website';
  }

  if (step === 'compliance') {
    if (f.gstin && !/^[0-9A-Z]{15}$/i.test(f.gstin.trim())) e.gstin = 'GSTIN must be 15 characters';
    if (f.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(f.pan.trim())) e.pan = 'PAN must be 10 characters (e.g. ABCDE1234F)';
    if (f.tan && !/^[0-9A-Z]{10}$/i.test(f.tan.trim())) e.tan = 'TAN must be 10 characters';
    f.certificates.forEach((c, i) => {
      if (!c.name.trim()) e[`cert.${i}.name`] = 'Certificate name is required';
      if (c.issueDate && c.expiryDate && new Date(c.expiryDate) < new Date(c.issueDate))
        e[`cert.${i}.expiryDate`] = 'Expiry is before the issue date';
    });
  }

  if (step === 'banking') {
    if (f.bankAccountNumber && !/^[0-9]{6,20}$/.test(f.bankAccountNumber.replace(/\s/g, ''))) e.bankAccountNumber = 'Account number must be 6–20 digits';
    if (f.bankIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(f.bankIfsc.trim())) e.bankIfsc = 'Enter a valid IFSC code';
    if (f.bankAccountNumber && !f.bankAccountName) e.bankAccountName = 'Account holder name is required';
    if (f.creditDays) {
      const d = Number(f.creditDays);
      if (!Number.isInteger(d) || d < 0 || d > 365) e.creditDays = 'Credit days must be 0–365';
    }
  }

  if (step === 'review') {
    const r = Number(f.rating);
    if (Number.isNaN(r) || r < 0 || r > 5) e.rating = 'Rating must be between 0 and 5';
    for (const k of ['onTimeDelivery', 'qualityRating', 'priceCompetitiveness'] as const) {
      if (!f[k]) continue;
      const v = Number(f[k]);
      if (Number.isNaN(v) || v < 0 || v > 100) e[k] = 'Value must be between 0 and 100';
    }
  }

  return e;
}

function payloadOf(f: ContractorForm, id?: number) {
  const num = (v: string) => (v === '' ? undefined : Number(v));
  return {
    ...(id ? { id } : {}),
    name: f.name.trim(),
    legalName: f.legalName.trim() || null,
    tradeName: f.tradeName.trim() || null,
    vendorCode: f.vendorCode.trim() || null,
    vendorType: f.vendorType,
    categories: f.categories,
    region: f.region.trim(),
    status: f.status,
    registeredOn: f.registeredOn || null,
    contactPerson: f.contactPerson.trim() || null,
    contactDesignation: f.contactDesignation.trim() || null,
    phone: f.phone.trim() || null,
    alternatePhone: f.alternatePhone.trim() || null,
    email: f.email.trim() || null,
    website: f.website.trim() || null,
    address: f.address.trim() || null,
    country: f.country.trim() || 'India',
    state: f.state.trim() || null,
    city: f.city.trim() || null,
    pincode: f.pincode.trim() || null,
    gstin: f.gstin.trim() ? f.gstin.trim().toUpperCase() : null,
    pan: f.pan.trim() ? f.pan.trim().toUpperCase() : null,
    tan: f.tan.trim() ? f.tan.trim().toUpperCase() : null,
    msmeRegistered: f.msmeRegistered,
    taxDeduction: f.taxDeduction.trim() || null,
    certificates: f.certificates.filter((c) => c.name.trim() || c.certNo.trim()),
    bankName: f.bankName.trim() || null,
    bankAccountName: f.bankAccountName.trim() || null,
    bankAccountNumber: f.bankAccountNumber.trim() || null,
    bankIfsc: f.bankIfsc.trim() ? f.bankIfsc.trim().toUpperCase() : null,
    paymentTerms: f.paymentTerms.trim() || null,
    creditDays: num(f.creditDays) ?? null,
    rating: num(f.rating) ?? 3,
    metrics: {
      ...(f.onTimeDelivery ? { onTimeDelivery: Number(f.onTimeDelivery) } : {}),
      ...(f.qualityRating ? { qualityRating: Number(f.qualityRating) } : {}),
      ...(f.priceCompetitiveness ? { priceCompetitiveness: Number(f.priceCompetitiveness) } : {}),
    },
    notes: f.notes.trim() || null,
  };
}

export default function ContractorWizard({
  open, existing, onClose, onSaved,
}: {
  open: boolean;
  existing?: ContractorRecord | null;
  onClose: () => void;
  onSaved: (record: ContractorRecord) => void;
}) {
  const [step, setStep] = useState<StepKey>('identity');
  const [maxStep, setMaxStep] = useState(0);
  const [form, setForm] = useState<ContractorForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const editing = Boolean(existing?.id);

  useEffect(() => {
    if (!open) return;
    setForm(existing?.id ? toForm(existing) : EMPTY_FORM);
    setStep('identity');
    setMaxStep(0);
    setErrors({});
  }, [open, existing]);

  const set = <K extends keyof ContractorForm>(key: K, value: ContractorForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!(key in e)) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  };

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const goNext = () => {
    const e = validateStep(step, form);
    if (Object.keys(e).length) {
      setErrors(e);
      toast.error('Please fix the highlighted fields');
      return;
    }
    const next = STEPS[Math.min(stepIndex + 1, STEPS.length - 1)].key;
    setStep(next);
    setMaxStep((m) => Math.max(m, STEPS.findIndex((s) => s.key === next)));
  };

  const goBack = () => {
    const prev = STEPS[Math.max(stepIndex - 1, 0)].key;
    setStep(prev);
    setErrors({});
  };

  const goToStep = (key: StepKey) => {
    if (STEPS.findIndex((s) => s.key === key) <= maxStep) {
      setStep(key);
      setErrors({});
    }
  };

  const toggleCategory = (cat: string) => {
    set('categories', form.categories.includes(cat) ? form.categories.filter((c) => c !== cat) : [...form.categories, cat]);
  };

  const addCertificate = () =>
    set('certificates', [...form.certificates, { name: '', certNo: '', issueDate: isoToday(), expiryDate: '' }]);

  const updateCertificate = (i: number, patch: Partial<ContractorCertificate>) =>
    set('certificates', form.certificates.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const removeCertificate = (i: number) =>
    set('certificates', form.certificates.filter((_, idx) => idx !== i));

  const save = useCallback(async () => {
    // Validate every step, not just the visible one, so a field the user
    // skipped earlier cannot fail on save.
    const all: Record<string, string> = {};
    for (const s of STEPS) Object.assign(all, validateStep(s.key, form));
    if (Object.keys(all).length) {
      setErrors(all);
      const firstBad = STEPS.find((s) => Object.keys(validateStep(s.key, form)).length);
      if (firstBad) setStep(firstBad.key);
      toast.error('Please fix the highlighted fields');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/fin/vendors', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadOf(form, existing?.id)),
      });
      const j = await res.json();
      if (!res.ok || !j.success) {
        if (j?.errors) setErrors(j.errors as Record<string, string>);
        toast.error(j?.error || 'Could not save the contractor');
        return;
      }
      toast.success(editing ? 'Contractor updated' : 'Contractor created');
      onSaved(j.data as ContractorRecord);
    } catch {
      toast.error('Network error — the contractor was not saved');
    } finally {
      setSaving(false);
    }
  }, [editing, existing?.id, form, onSaved]);

  const countryOptions = useMemo(
    () => ['India', 'Nepal', 'Bangladesh', 'United Arab Emirates', 'Singapore'].map((c) => ({ value: c, label: c })),
    [],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0d12]/95 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="flex items-center gap-1.5 text-[12px] font-semibold text-[#8899aa] hover:text-[#e2e8f0] transition-colors">
            <ArrowLeft size={15} /> Contractors Management
          </button>
          <div className="text-center">
            <div className="text-[15px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {editing ? `Edit ${existing?.name}` : 'New Contractor'}
            </div>
            <div className="text-[10px] text-[#5a6878]">
              Step {stepIndex + 1} of {STEPS.length} · {STEPS[stepIndex].label}
            </div>
          </div>
          <div className="w-[120px] flex justify-end">
            <button onClick={onClose} className="p-1.5 rounded text-[#5a6878] hover:text-[#e2e8f0] hover:bg-[#252e3a]"><X size={15} /></button>
          </div>
        </div>

        {/* Stepper */}
        <div className="vc-panel p-1.5 flex items-center gap-1">
          {STEPS.map((s, i) => {
            const active = s.key === step;
            const reached = i <= maxStep;
            const Icon = s.icon;
            const done = i < stepIndex;
            return (
              <button
                key={s.key}
                onClick={() => goToStep(s.key)}
                disabled={!reached}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-semibold transition-colors ${
                  active ? 'bg-[#f5a623]/15 text-[#f5a623]' : reached ? 'text-[#8899aa] hover:text-[#e2e8f0]' : 'text-[#3a4452] cursor-not-allowed'
                }`}
              >
                {done ? <Check size={13} className="text-[#00e676]" /> : <Icon size={13} />}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Step body */}
        <div className="vc-panel p-4 space-y-4">
          {step === 'identity' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Contractor Name" required error={errors.name} className="md:col-span-2">
                  <input value={form.name} onChange={(e) => set('name', e.target.value)} className="vc-input" placeholder="e.g. Singh Civil Contractors Pvt Ltd" />
                </FormField>
                <FormField label="Contractor Code" hint="Internal code, optional" error={errors.vendorCode}>
                  <input value={form.vendorCode} onChange={(e) => set('vendorCode', e.target.value.toUpperCase())} className="vc-input" placeholder="e.g. CTR-014" />
                </FormField>
                <FormField label="Legal / Registered Name" error={errors.legalName}>
                  <input value={form.legalName} onChange={(e) => set('legalName', e.target.value)} className="vc-input" placeholder="As per registration" />
                </FormField>
                <FormField label="Trade Name" error={errors.tradeName}>
                  <input value={form.tradeName} onChange={(e) => set('tradeName', e.target.value)} className="vc-input" />
                </FormField>
                <FormField label="Contractor Type" error={errors.vendorType}>
                  <select value={form.vendorType} onChange={(e) => set('vendorType', e.target.value)} className="vc-input">
                    {CONTRACTOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </FormField>
                <FormField label="Region" required error={errors.region}>
                  <input value={form.region} onChange={(e) => set('region', e.target.value)} className="vc-input" placeholder="e.g. Mumbai HQ / Eastern" />
                </FormField>
                <FormField label="Status" error={errors.status}>
                  <select value={form.status} onChange={(e) => set('status', e.target.value)} className="vc-input">
                    {CONTRACTOR_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </FormField>
                <FormField label="Registered On" error={errors.registeredOn}>
                  <input type="date" value={form.registeredOn} onChange={(e) => set('registeredOn', e.target.value)} className="vc-input" />
                </FormField>
              </div>

              <div>
                <div className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1">
                  Trade Categories <span className="text-[#ff3d3d]">*</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CONTRACTOR_CATEGORIES.map((c) => {
                    const on = form.categories.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCategory(c)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                          on ? 'bg-[#f5a623]/15 text-[#f5a623] border border-[#f5a623]/30' : 'bg-[#0f1318] text-[#5a6878] border border-[#252e3a] hover:border-[#3a4450]'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                {errors.categories && <div className="text-[10px] text-[#ff3d3d] mt-1">{errors.categories}</div>}
              </div>
            </>
          )}

          {step === 'contact' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Contact Person" required error={errors.contactPerson}>
                  <input value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} className="vc-input" />
                </FormField>
                <FormField label="Designation" error={errors.contactDesignation}>
                  <input value={form.contactDesignation} onChange={(e) => set('contactDesignation', e.target.value)} className="vc-input" placeholder="e.g. Project Manager" />
                </FormField>
                <FormField label="Phone" required error={errors.phone}>
                  <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="vc-input" placeholder="+91 ..." />
                </FormField>
                <FormField label="Alternate Phone" error={errors.alternatePhone}>
                  <input value={form.alternatePhone} onChange={(e) => set('alternatePhone', e.target.value)} className="vc-input" />
                </FormField>
                <FormField label="Email" required error={errors.email}>
                  <input value={form.email} onChange={(e) => set('email', e.target.value)} className="vc-input" placeholder="name@company.com" />
                </FormField>
                <FormField label="Website" error={errors.website}>
                  <input value={form.website} onChange={(e) => set('website', e.target.value)} className="vc-input" placeholder="www.company.com" />
                </FormField>
              </div>

              <FormSection title="Registered Address" icon={MapPin}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField label="Address" className="md:col-span-3" error={errors.address}>
                    <textarea value={form.address} onChange={(e) => set('address', e.target.value)} className="vc-input" rows={2} />
                  </FormField>
                  <FormField label="Country" error={errors.country}>
                    <SearchableSelect value={form.country} onChange={(v) => set('country', v)} options={countryOptions} />
                  </FormField>
                  <FormField label="State" error={errors.state}>
                    <input value={form.state} onChange={(e) => set('state', e.target.value)} className="vc-input" />
                  </FormField>
                  <FormField label="City" error={errors.city}>
                    <input value={form.city} onChange={(e) => set('city', e.target.value)} className="vc-input" />
                  </FormField>
                  <FormField label="PIN Code" error={errors.pincode}>
                    <input value={form.pincode} onChange={(e) => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} className="vc-input" />
                  </FormField>
                </div>
              </FormSection>
            </>
          )}

          {step === 'compliance' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="GSTIN" error={errors.gstin}>
                  <input value={form.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase().slice(0, 15))} className="vc-input" placeholder="15 characters" />
                </FormField>
                <FormField label="PAN" error={errors.pan}>
                  <input value={form.pan} onChange={(e) => set('pan', e.target.value.toUpperCase().slice(0, 10))} className="vc-input" placeholder="ABCDE1234F" />
                </FormField>
                <FormField label="TAN" error={errors.tan}>
                  <input value={form.tan} onChange={(e) => set('tan', e.target.value.toUpperCase().slice(0, 10))} className="vc-input" />
                </FormField>
                <FormField label="MSME Registered" error={errors.msmeRegistered}>
                  <label className="flex items-center gap-2 text-[11px] text-[#e2e8f0] h-[34px]">
                    <input type="checkbox" checked={form.msmeRegistered} onChange={(e) => set('msmeRegistered', e.target.checked)} className="accent-[#f5a623]" />
                    Yes, registered under MSMED
                  </label>
                </FormField>
                <FormField label="TDS Section" hint="e.g. 194C" error={errors.taxDeduction}>
                  <input value={form.taxDeduction} onChange={(e) => set('taxDeduction', e.target.value)} className="vc-input" />
                </FormField>
              </div>

              <div className="border border-[#252e3a] rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[#0f1318]">
                  <Shield size={13} className="text-[#f5a623] shrink-0" />
                  <span className="text-[10px] uppercase tracking-[1.5px] text-[#8899aa] font-bold flex-1">Certificates &amp; Compliance Documents</span>
                  <button type="button" onClick={addCertificate} className="vc-btn-ghost flex items-center gap-1 text-[10px]"><Plus size={12} /> Add Certificate</button>
                </div>
                <div className="p-3 space-y-2">
                  {form.certificates.length === 0 && (
                    <div className="text-[11px] text-[#5a6878] py-2 text-center">No certificates added yet.</div>
                  )}
                  {form.certificates.map((c, i) => {
                    const days = c.expiryDate ? daysUntil(c.expiryDate) : null;
                    const expired = days !== null && days < 0;
                    const expiring = days !== null && days >= 0 && days <= 30;
                    return (
                      <div key={i} className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-2 items-start">
                        <div>
                          <select value={c.name} onChange={(e) => updateCertificate(i, { name: e.target.value })} className="vc-input">
                            <option value="">Select certificate…</option>
                            {CERTIFICATE_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                          {errors[`cert.${i}.name`] && <div className="text-[10px] text-[#ff3d3d] mt-1">{errors[`cert.${i}.name`]}</div>}
                        </div>
                        <input value={c.certNo} onChange={(e) => updateCertificate(i, { certNo: e.target.value })} className="vc-input" placeholder="Certificate No" />
                        <div>
                          <input type="date" value={c.issueDate} onChange={(e) => updateCertificate(i, { issueDate: e.target.value })} className="vc-input" />
                          <div className="text-[9px] text-[#5a6878] mt-0.5">Issued</div>
                        </div>
                        <div>
                          <input type="date" value={c.expiryDate} onChange={(e) => updateCertificate(i, { expiryDate: e.target.value })} className="vc-input" />
                          <div className={`text-[9px] mt-0.5 ${expired ? 'text-[#ff3d3d]' : expiring ? 'text-[#f5a623]' : 'text-[#5a6878]'}`}>
                            {c.expiryDate ? (expired ? `Expired ${Math.abs(days!)}d ago` : expiring ? `Expires in ${days}d` : 'Valid') : 'Expiry'}
                          </div>
                          {errors[`cert.${i}.expiryDate`] && <div className="text-[10px] text-[#ff3d3d] mt-1">{errors[`cert.${i}.expiryDate`]}</div>}
                        </div>
                        <button type="button" onClick={() => removeCertificate(i)} className="p-2 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {step === 'banking' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Bank Name" error={errors.bankName}>
                  <input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} className="vc-input" />
                </FormField>
                <FormField label="Account Holder Name" error={errors.bankAccountName}>
                  <input value={form.bankAccountName} onChange={(e) => set('bankAccountName', e.target.value)} className="vc-input" />
                </FormField>
                <FormField label="Account Number" error={errors.bankAccountNumber}>
                  <input value={form.bankAccountNumber} onChange={(e) => set('bankAccountNumber', e.target.value.replace(/\s/g, ''))} className="vc-input" />
                </FormField>
                <FormField label="IFSC Code" error={errors.bankIfsc}>
                  <input value={form.bankIfsc} onChange={(e) => set('bankIfsc', e.target.value.toUpperCase().slice(0, 11))} className="vc-input" placeholder="HDFC0001234" />
                </FormField>
                <FormField label="Payment Terms" error={errors.paymentTerms}>
                  <input value={form.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)} className="vc-input" placeholder="e.g. 30 days from invoice" />
                </FormField>
                <FormField label="Credit Days" error={errors.creditDays}>
                  <input value={form.creditDays} onChange={(e) => set('creditDays', e.target.value.replace(/\D/g, ''))} className="vc-input" placeholder="e.g. 30" />
                </FormField>
              </div>
              <div className="text-[10px] text-[#5a6878]">
                Banking details are used for payment advices and vendor settlements. They are visible to the finance team only.
              </div>
            </>
          )}

          {step === 'review' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField label="Overall Rating" error={errors.rating} hint="0 – 5">
                  <input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => set('rating', e.target.value)} className="vc-input" />
                </FormField>
                <FormField label="On-Time Delivery %" error={errors.onTimeDelivery}>
                  <input type="number" min="0" max="100" value={form.onTimeDelivery} onChange={(e) => set('onTimeDelivery', e.target.value)} className="vc-input" />
                </FormField>
                <FormField label="Quality Rating" error={errors.qualityRating} hint="0 – 5">
                  <input type="number" step="0.1" min="0" max="5" value={form.qualityRating} onChange={(e) => set('qualityRating', e.target.value)} className="vc-input" />
                </FormField>
                <FormField label="Price Competitiveness" error={errors.priceCompetitiveness} hint="0 – 5">
                  <input type="number" step="0.1" min="0" max="5" value={form.priceCompetitiveness} onChange={(e) => set('priceCompetitiveness', e.target.value)} className="vc-input" />
                </FormField>
              </div>

              <FormField label="Internal Notes" error={errors.notes}>
                <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} className="vc-input" rows={3} placeholder="Anything the purchase team should know about this contractor" />
              </FormField>

              <div className="border border-[#252e3a] rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[#0f1318]">
                  <FileText size={13} className="text-[#f5a623] shrink-0" />
                  <span className="text-[10px] uppercase tracking-[1.5px] text-[#8899aa] font-bold flex-1">Review</span>
                </div>
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
                  {([
                    ['Contractor', form.name],
                    ['Legal name', form.legalName],
                    ['Trade name', form.tradeName],
                    ['Code', form.vendorCode],
                    ['Type', form.vendorType],
                    ['Categories', form.categories.join(', ')],
                    ['Region', form.region],
                    ['Status', form.status],
                    ['Contact person', form.contactPerson],
                    ['Designation', form.contactDesignation],
                    ['Phone', form.phone],
                    ['Email', form.email],
                    ['Address', form.address],
                    ['City / State / PIN', [form.city, form.state, form.pincode].filter(Boolean).join(', ')],
                    ['GSTIN', form.gstin],
                    ['PAN', form.pan],
                    ['TAN', form.tan],
                    ['MSME', form.msmeRegistered ? 'Yes' : 'No'],
                    ['Bank', form.bankName],
                    ['A/c holder', form.bankAccountName],
                    ['A/c number', form.bankAccountNumber],
                    ['IFSC', form.bankIfsc],
                    ['Payment terms', form.paymentTerms],
                    ['Credit days', form.creditDays],
                    ['Certificates', form.certificates.map((c) => c.name).filter(Boolean).join(', ') || '—'],
                    ['Rating', form.rating],
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label} className="flex gap-2 border-b border-[#1a2028] pb-1">
                      <span className="text-[#5a6878] w-32 shrink-0">{label}</span>
                      <span className="text-[#e2e8f0] flex-1 break-words">{value || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="vc-panel px-4 py-3 flex items-center justify-between">
          <button onClick={goBack} disabled={stepIndex === 0} className="vc-btn-ghost flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
            <ArrowLeft size={13} /> Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#5a6878] hidden sm:inline">
              {editing ? 'Editing an existing contractor record' : 'This is the master record used by every module'}
            </span>
            {stepIndex < STEPS.length - 1 ? (
              <button onClick={goNext} className="vc-btn-primary flex items-center gap-1.5">Next <ArrowRight size={13} /></button>
            ) : (
              <button onClick={save} disabled={saving} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                {editing ? 'Save Changes' : 'Create Contractor'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
