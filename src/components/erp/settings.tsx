'use client'

import { useState } from 'react'
import { Settings as SettingsIcon, Building2, Save, Clock, CalendarDays, Shield } from 'lucide-react'

interface CompanySettings {
  companyName: string
  pan: string
  gst: string
  pfRegistration: string
  esiRegistration: string
  registeredOffice: string
}

const LEAVE_POLICY = [
  { type: 'Earned Leave (EL)', days: 18, color: 'text-[#00e676]' },
  { type: 'Sick Leave (SL)', days: 7, color: 'text-[#00d4ff]' },
  { type: 'Casual Leave (CL)', days: 5, color: 'text-[#f5a623]' },
  { type: 'Maternity Leave (ML)', days: 182, color: 'text-[#a78bfa]' },
]

const SHIFT_CONFIG = [
  { label: 'Day Shift A', timing: '06:00 – 18:00', color: 'bg-[#00d4ff]' },
  { label: 'Night Shift B', timing: '18:00 – 06:00', color: 'bg-[#ffab40]' },
  { label: 'General Shift', timing: '09:00 – 18:00', color: 'bg-[#00e676]' },
  { label: 'OT Multiplier', timing: '2x on Sundays', color: 'bg-[#a78bfa]' },
]

export default function SettingsPage() {
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    companyName: 'VoltCore Engineering Pvt. Ltd.',
    pan: 'AAECV1234K',
    gst: '09AAECV1234K1Z5',
    pfRegistration: 'PFBNG0012345000',
    esiRegistration: '31000123456789',
    registeredOffice: 'Plot No. 42, Sector 15, Electronic City,\nBengaluru, Karnataka 560100',
  })

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleChange = (field: keyof CompanySettings, value: string) => {
    setCompanySettings(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Company Settings */}
        <div className="vc-panel">
          <div className="vc-panel-header">
            <Building2 size={15} className="text-[#f5a623]" />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">Company Settings</span>
          </div>
          <div className="vc-panel-body space-y-3">
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Company Name</label>
              <input
                type="text"
                value={companySettings.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className="vc-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">PAN</label>
                <input
                  type="text"
                  value={companySettings.pan}
                  onChange={(e) => handleChange('pan', e.target.value)}
                  className="vc-input"
                  style={{ fontFamily: "'Share Tech Mono', monospace", textTransform: 'uppercase' }}
                />
              </div>
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">GST Number</label>
                <input
                  type="text"
                  value={companySettings.gst}
                  onChange={(e) => handleChange('gst', e.target.value)}
                  className="vc-input"
                  style={{ fontFamily: "'Share Tech Mono', monospace", textTransform: 'uppercase' }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">PF Registration</label>
                <input
                  type="text"
                  value={companySettings.pfRegistration}
                  onChange={(e) => handleChange('pfRegistration', e.target.value)}
                  className="vc-input"
                  style={{ fontFamily: "'Share Tech Mono', monospace" }}
                />
              </div>
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">ESI Registration</label>
                <input
                  type="text"
                  value={companySettings.esiRegistration}
                  onChange={(e) => handleChange('esiRegistration', e.target.value)}
                  className="vc-input"
                  style={{ fontFamily: "'Share Tech Mono', monospace" }}
                />
              </div>
            </div>
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Registered Office Address</label>
              <textarea
                value={companySettings.registeredOffice}
                onChange={(e) => handleChange('registeredOffice', e.target.value)}
                className="vc-input min-h-[72px] resize-none"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSave}
                className="vc-btn-primary flex items-center gap-1.5 py-2 px-5"
              >
                {saved ? (
                  <>
                    <span className="text-[10px]">✓ Saved</span>
                  </>
                ) : (
                  <>
                    <Save size={13} />
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Policy Panels */}
        <div className="space-y-4">
          {/* Leave Policy */}
          <div className="vc-panel">
            <div className="vc-panel-header">
              <CalendarDays size={15} className="text-[#00d4ff]" />
              <span className="text-[12px] font-semibold text-[#e2e8f0]">Leave Policy</span>
            </div>
            <div className="vc-panel-body">
              <div className="space-y-2">
                {LEAVE_POLICY.map((leave) => (
                  <div key={leave.type} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#141920] border border-[#252e3a]/50">
                    <div className="flex items-center gap-2">
                      <Shield size={12} className="text-[#5a6878]" />
                      <span className="text-[11px] text-[#e2e8f0] font-medium">{leave.type}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-[16px] font-bold ${leave.color}`} style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        {leave.days}
                      </span>
                      <span className="text-[9px] text-[#5a6878]">days</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Shift Configuration */}
          <div className="vc-panel">
            <div className="vc-panel-header">
              <Clock size={15} className="text-[#f5a623]" />
              <span className="text-[12px] font-semibold text-[#e2e8f0]">Shift Configuration</span>
            </div>
            <div className="vc-panel-body">
              <div className="space-y-2">
                {SHIFT_CONFIG.map((shift) => (
                  <div key={shift.label} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#141920] border border-[#252e3a]/50">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${shift.color}`} />
                      <span className="text-[11px] text-[#e2e8f0] font-medium">{shift.label}</span>
                    </div>
                    <span className="text-[11px] text-[#8899aa]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {shift.timing}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
