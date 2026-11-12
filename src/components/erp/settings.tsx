'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Building2, Save, Loader2, RefreshCw, FileText, IndianRupee, Users, Settings as SettingsIcon, Image as ImageIcon, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { notifyCompanyProfileChanged } from '@/hooks/use-company-profile'

// ── Field groups ─────────────────────────────────────────────────

const GROUPS: { id: string; label: string; icon: any; color: string; fields: { key: string; label: string; type?: string; mono?: boolean; placeholder?: string; span?: boolean; hint?: string }[] }[] = [
  {
    id: 'branding',
    label: 'Logo & Branding',
    icon: ImageIcon,
    color: '#f5a623',
    fields: [
      { key: 'logo_url', label: 'Company Logo', type: 'logo', span: true },
    ],
  },
  {
    id: 'documents',
    label: 'Document Header & Footer',
    icon: FileText,
    color: '#7c5cff',
    fields: [
      { key: 'doc_tagline', label: 'Header Tagline', placeholder: 'e.g. Heavy Fabrication & Engineering', span: true, hint: 'Shown under the company name on Purchase Orders and other documents.' },
      { key: 'doc_signatory_label', label: 'Signatory Label', placeholder: 'Authorized Signatory' },
      { key: 'doc_footer_note', label: 'Footer Note', placeholder: 'e.g. This is a computer-generated document. E. & O.E.', span: true },
      { key: 'doc_declaration', label: 'Tax Invoice Declaration', type: 'textarea', span: true, hint: 'The legal declaration paragraph printed at the bottom of every GST Tax Invoice.' },
      { key: 'doc_terms', label: 'Terms & Conditions', type: 'textarea', span: true, hint: 'One condition per line — printed on Purchase Orders.' },
    ],
  },
  {
    id: 'company',
    label: 'Company Identity',
    icon: Building2,
    color: '#f5a623',
    fields: [
      { key: 'company_name',    label: 'Company Name',              placeholder: 'e.g. VoltCore Engineering Pvt. Ltd.', span: true },
      { key: 'company_type',    label: 'Company Type',              placeholder: 'e.g. Private Limited' },
      { key: 'industry',        label: 'Industry / Sector',         placeholder: 'e.g. Power Plant Contractor' },
      { key: 'incorporation_date', label: 'Incorporation Date',     type: 'date' },
      { key: 'cin',             label: 'CIN',                       mono: true, placeholder: 'U12345MH2020PTC123456' },
      { key: 'website',         label: 'Website',                   placeholder: 'https://company.com' },
    ],
  },
  {
    id: 'address',
    label: 'Registered Address',
    icon: Building2,
    color: '#00d4ff',
    fields: [
      { key: 'address_line1',   label: 'Address Line 1',            placeholder: 'Plot No., Street', span: true },
      { key: 'address_line2',   label: 'Address Line 2',            placeholder: 'Area, Locality', span: true },
      { key: 'city',            label: 'City',                      placeholder: 'e.g. Mumbai' },
      { key: 'state',           label: 'State',                     placeholder: 'e.g. Maharashtra' },
      { key: 'pincode',         label: 'Pincode',                   mono: true, placeholder: '400001' },
      { key: 'country',         label: 'Country',                   placeholder: 'India' },
    ],
  },
  {
    id: 'statutory',
    label: 'Statutory & Compliance',
    icon: FileText,
    color: '#00e676',
    fields: [
      { key: 'pan',             label: 'PAN',                       mono: true, placeholder: 'AAECV1234K' },
      { key: 'tan',             label: 'TAN',                       mono: true, placeholder: 'MUMV12345A' },
      { key: 'gst',             label: 'GST Number',                mono: true, placeholder: '27AAECV1234K1Z5' },
      { key: 'pf_reg',          label: 'PF Registration No.',       mono: true, placeholder: 'PFBNG0012345000' },
      { key: 'esi_reg',         label: 'ESI Registration No.',      mono: true, placeholder: '31000123456789' },
      { key: 'esi_state_code',  label: 'ESI State Code',            mono: true, placeholder: 'e.g. 31' },
      { key: 'pt_reg',          label: 'PT Registration No.',       mono: true, placeholder: 'Professional Tax Reg.' },
      { key: 'lwf_reg',         label: 'LWF Registration No.',      mono: true, placeholder: 'Labour Welfare Fund Reg.' },
      { key: 'labour_licence',  label: 'Labour Licence No.',        mono: true, placeholder: 'Contract Labour Licence' },
    ],
  },
  {
    id: 'payroll',
    label: 'Payroll Configuration',
    icon: IndianRupee,
    color: '#a78bfa',
    fields: [
      { key: 'payroll_cycle',       label: 'Payroll Cycle',             placeholder: 'e.g. Monthly' },
      { key: 'financial_year_start',label: 'Financial Year Start Month', placeholder: 'e.g. April' },
      { key: 'working_days_week',   label: 'Working Days per Week',     placeholder: 'e.g. 6', mono: true },
      { key: 'working_days_month',  label: 'Working Days per Month',    placeholder: 'e.g. 26', mono: true },
      { key: 'ot_rate_multiplier',  label: 'OT Rate Multiplier',        placeholder: 'e.g. 2 (for 2x)', mono: true },
      { key: 'pf_employer_rate',    label: 'PF Employer Rate (%)',      placeholder: 'e.g. 12', mono: true },
      { key: 'pf_employee_rate',    label: 'PF Employee Rate (%)',      placeholder: 'e.g. 12', mono: true },
      { key: 'esi_employer_rate',   label: 'ESI Employer Rate (%)',     placeholder: 'e.g. 3.25', mono: true },
      { key: 'esi_employee_rate',   label: 'ESI Employee Rate (%)',     placeholder: 'e.g. 0.75', mono: true },
      { key: 'pt_monthly',          label: 'Professional Tax (monthly)',placeholder: 'e.g. 200', mono: true },
    ],
  },
  {
    id: 'bank',
    label: 'Company Bank Details',
    icon: IndianRupee,
    color: '#ffab40',
    fields: [
      { key: 'bank_name',       label: 'Bank Name',                 placeholder: 'e.g. State Bank of India' },
      { key: 'bank_branch',     label: 'Branch Name',               placeholder: 'e.g. Andheri West' },
      { key: 'bank_account',    label: 'Account Number',            mono: true, placeholder: 'Salary disbursement account' },
      { key: 'bank_ifsc',       label: 'IFSC Code',                 mono: true, placeholder: 'e.g. SBIN0001234' },
      { key: 'bank_account_type', label: 'Account Type',            placeholder: 'e.g. Current' },
    ],
  },
  {
    id: 'contact',
    label: 'HR & Admin Contact',
    icon: Users,
    color: '#00d4ff',
    fields: [
      { key: 'hr_name',         label: 'HR Manager Name',           placeholder: 'Full name' },
      { key: 'hr_email',        label: 'HR Email',                  type: 'email', placeholder: 'hr@company.com' },
      { key: 'hr_phone',        label: 'HR Phone',                  mono: true, placeholder: '9876543210' },
      { key: 'admin_email',     label: 'Admin Email',               type: 'email', placeholder: 'admin@company.com' },
      { key: 'payroll_email',   label: 'Payroll Email',             type: 'email', placeholder: 'payroll@company.com' },
      { key: 'support_phone',   label: 'Support / Helpdesk Phone',  mono: true, placeholder: '1800-xxx-xxxx' },
    ],
  },
]

// ── Component ────────────────────────────────────────────────────

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeGroup, setActiveGroup] = useState('branding')
  const logoInputRef = useRef<HTMLInputElement>(null)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings')
      const json = await res.json()
      if (json.success) setSettings(json.data.settings || {})
      else toast.error('Failed to load settings')
    } catch { toast.error('Failed to load settings') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const get = (key: string) => settings[key] || ''
  const set = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      // Build groups map for the API
      const groups: Record<string, string> = {}
      GROUPS.forEach(g => g.fields.forEach(f => { groups[f.key] = g.id }))

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, groups }),
      })
      const json = await res.json()
      if (json.success) { toast.success('Settings saved'); notifyCompanyProfileChanged() }
      else toast.error(json.error || 'Failed to save')
    } catch { toast.error('Network error') }
    finally { setSaving(false) }
  }

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) { toast.error('Logo must be under 500 KB'); return }
    const reader = new FileReader()
    reader.onload = () => set('logo_url', reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const currentGroup = GROUPS.find(g => g.id === activeGroup)!

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f5a623]/10 rounded-xl flex items-center justify-center">
            <SettingsIcon size={18} className="text-[#f5a623]" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Company Settings</h2>
            <p className="text-[11px] text-[#5a6878]">Stored in database — persists across sessions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchSettings} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
          <button onClick={handleSave} disabled={saving}
            className="vc-btn-primary flex items-center gap-1.5">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Sidebar nav */}
        <div className="w-[180px] shrink-0 space-y-1">
          {GROUPS.map(g => {
            const Icon = g.icon
            const isActive = activeGroup === g.id
            return (
              <button key={g.id} onClick={() => setActiveGroup(g.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[11px] font-semibold transition-all ${isActive ? 'text-[#e2e8f0] border-l-[3px]' : 'text-[#5a6878] hover:text-[#8899aa] hover:bg-[#141920]'}`}
                style={isActive ? { background: `${g.color}10`, borderLeftColor: g.color } : {}}>
                <Icon size={13} style={{ color: isActive ? g.color : undefined }} />
                {g.label}
              </button>
            )
          })}
        </div>

        {/* Fields panel */}
        <div className="flex-1 bg-[#161c24] border border-[#252e3a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#252e3a]">
            <currentGroup.icon size={15} style={{ color: currentGroup.color }} />
            <span className="text-[13px] font-bold text-[#e2e8f0]">{currentGroup.label}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {currentGroup.fields.map(f => f.type === 'logo' ? (
              <div key={f.key} className={f.span ? 'col-span-2' : ''}>
                <label className="block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5">{f.label}</label>
                <p className="text-[10px] text-[#5a6878] mb-2">Used on Site Invoices, Payment Advices, Credit Notes and Sales invoices. PNG/JPG, under 500 KB.</p>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-lg border border-[#252e3a] bg-[#0a0d12] flex items-center justify-center overflow-hidden shrink-0">
                    {get(f.key) ? <img src={get(f.key)} alt="Company logo" className="max-w-full max-h-full object-contain" /> : <ImageIcon size={20} className="text-[#5a6878]" />}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input ref={logoInputRef} type="file" accept="image/png,image/jpeg" onChange={handleLogoFile} className="hidden" />
                    <button type="button" onClick={() => logoInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161c24] border border-[#252e3a] text-[#e2e8f0] text-[11px] font-semibold rounded-lg hover:border-[#f5a623]/50">
                      <Upload size={12} /> {get(f.key) ? 'Replace' : 'Upload'} Logo
                    </button>
                    {get(f.key) && (
                      <button type="button" onClick={() => set(f.key, '')} className="flex items-center gap-1.5 px-3 py-1.5 text-[#ff3d3d] text-[11px] font-semibold hover:underline w-fit">
                        <X size={12} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : f.type === 'textarea' ? (
              <div key={f.key} className={f.span ? 'col-span-2' : ''}>
                <label className="block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5">{f.label}</label>
                {f.hint && <p className="text-[10px] text-[#5a6878] mb-1.5">{f.hint}</p>}
                <textarea
                  value={get(f.key)}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.placeholder || ''}
                  rows={4}
                  className="vc-input resize-y"
                />
              </div>
            ) : (
              <div key={f.key} className={f.span ? 'col-span-2' : ''}>
                <label className="block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5">{f.label}</label>
                {f.hint && <p className="text-[10px] text-[#5a6878] mb-1.5">{f.hint}</p>}
                <input
                  type={f.type || 'text'}
                  value={get(f.key)}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.placeholder || ''}
                  className="vc-input"
                  style={f.mono ? { fontFamily: "'Share Tech Mono', monospace" } : {}}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
