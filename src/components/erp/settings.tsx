'use client'

import { useState, useEffect, useCallback } from 'react'
import { Settings as SettingsIcon, Building2, Save, Clock, CalendarDays, Shield, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SettingsData {
  [key: string]: string
}

/* ------------------------------------------------------------------ */
/*  Default settings for display when API returns empty                */
/* ------------------------------------------------------------------ */

const DEFAULT_COMPANY: Record<string, string> = {
  company_name: 'VoltCore Engineering Pvt. Ltd.',
  pan: 'AAECV1234K',
  gst: '09AAECV1234K1Z5',
  pf_reg: 'PFBNG0012345000',
  esi_reg: '31000123456789',
  address: 'Plot No. 42, Sector 15, Electronic City,\nBengaluru, Karnataka 560100',
}

const LEAVE_POLICY = [
  { type: 'Earned Leave (EL)', key: 'leave_el', days: 18, color: 'text-[#00e676]' },
  { type: 'Sick Leave (SL)', key: 'leave_sl', days: 7, color: 'text-[#00d4ff]' },
  { type: 'Casual Leave (CL)', key: 'leave_cl', days: 5, color: 'text-[#f5a623]' },
  { type: 'Maternity Leave (ML)', key: 'leave_ml', days: 182, color: 'text-[#a78bfa]' },
]

const SHIFT_CONFIG = [
  { label: 'Day Shift A', key: 'shift_day_a', timing: '06:00 – 18:00', color: 'bg-[#00e676]' },
  { label: 'Day Shift B', key: 'shift_day_b', timing: '07:00 – 19:00', color: 'bg-[#00d4ff]' },
  { label: 'Night Shift B', key: 'shift_night_b', timing: '18:00 – 06:00', color: 'bg-[#ffab40]' },
  { label: 'General Shift', key: 'shift_general', timing: '09:00 – 18:00', color: 'bg-[#a78bfa]' },
  { label: 'OT Multiplier', key: 'shift_ot', timing: '2x on Sundays', color: 'bg-[#f5a623]' },
]

/* ------------------------------------------------------------------ */
/*  Skeleton                                                          */
/* ------------------------------------------------------------------ */

function SkeletonPanel() {
  return (
    <div className="vc-panel animate-pulse">
      <div className="vc-panel-header">
        <div className="h-4 bg-[#252e3a] rounded w-32" />
      </div>
      <div className="vc-panel-body space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-10 bg-[#252e3a] rounded w-full" />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  /* Fetch settings on mount */
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      const json = await res.json()
      if (json.success) {
        setSettings(json.data.settings || {})
      }
    } catch {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  /* Get a setting value with fallback */
  const get = (key: string, fallback: string = ''): string => {
    return settings[key] || fallback
  }

  /* Handle save */
  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Settings saved successfully')
        // Re-fetch to get latest values
        const getRes = await fetch('/api/settings')
        const getJson = await getRes.json()
        if (getJson.success) {
          setSettings(getJson.data.settings || {})
        }
      } else {
        toast.error(json.error || 'Failed to save settings')
      }
    } catch {
      toast.error('Network error saving settings')
    } finally {
      setSaving(false)
    }
  }

  /* Update a single setting */
  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonPanel />
        <div className="space-y-4">
          <SkeletonPanel />
          <SkeletonPanel />
        </div>
      </div>
    )
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
                value={get('company_name', DEFAULT_COMPANY.company_name)}
                onChange={(e) => updateSetting('company_name', e.target.value)}
                className="vc-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">PAN</label>
                <input
                  type="text"
                  value={get('pan', DEFAULT_COMPANY.pan)}
                  onChange={(e) => updateSetting('pan', e.target.value)}
                  className="vc-input"
                  style={{ fontFamily: "'Share Tech Mono', monospace", textTransform: 'uppercase' }}
                />
              </div>
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">GST Number</label>
                <input
                  type="text"
                  value={get('gst', DEFAULT_COMPANY.gst)}
                  onChange={(e) => updateSetting('gst', e.target.value)}
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
                  value={get('pf_reg', DEFAULT_COMPANY.pf_reg)}
                  onChange={(e) => updateSetting('pf_reg', e.target.value)}
                  className="vc-input"
                  style={{ fontFamily: "'Share Tech Mono', monospace" }}
                />
              </div>
              <div>
                <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">ESI Registration</label>
                <input
                  type="text"
                  value={get('esi_reg', DEFAULT_COMPANY.esi_reg)}
                  onChange={(e) => updateSetting('esi_reg', e.target.value)}
                  className="vc-input"
                  style={{ fontFamily: "'Share Tech Mono', monospace" }}
                />
              </div>
            </div>
            <div>
              <label className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold mb-1 block">Registered Office Address</label>
              <textarea
                value={get('address', DEFAULT_COMPANY.address)}
                onChange={(e) => updateSetting('address', e.target.value)}
                className="vc-input min-h-[72px] resize-none"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="vc-btn-primary flex items-center gap-1.5 py-2 px-5 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Saving...</span>
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
                {LEAVE_POLICY.map((leave) => {
                  const daysStr = get(leave.key, String(leave.days))
                  const days = parseInt(daysStr) || leave.days
                  return (
                    <div key={leave.type} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#141920] border border-[#252e3a]/50">
                      <div className="flex items-center gap-2">
                        <Shield size={12} className="text-[#5a6878]" />
                        <span className="text-[11px] text-[#e2e8f0] font-medium">{leave.type}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-[16px] font-bold ${leave.color}`}
                          style={{ fontFamily: "'Share Tech Mono', monospace" }}
                        >
                          {days}
                        </span>
                        <span className="text-[9px] text-[#5a6878]">days/yr</span>
                      </div>
                    </div>
                  )
                })}
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
                {SHIFT_CONFIG.map((shift) => {
                  const timing = get(shift.key, shift.timing)
                  return (
                    <div key={shift.label} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#141920] border border-[#252e3a]/50">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${shift.color}`} />
                        <span className="text-[11px] text-[#e2e8f0] font-medium">{shift.label}</span>
                      </div>
                      <span
                        className="text-[11px] text-[#8899aa]"
                        style={{ fontFamily: "'Share Tech Mono', monospace" }}
                      >
                        {timing}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
