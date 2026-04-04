'use client'

import { useState } from 'react'
import { RotateCcw, Sun, Moon, Coffee, Calendar } from 'lucide-react'
import { ChevronDown } from 'lucide-react'

interface RosterEntry {
  id: string
  name: string
  avatar: string
  shifts: (string | null)[]
}

const MOCK_ROSTER: RosterEntry[] = [
  { id: '1', name: 'Rajesh Kumar', avatar: 'RK', shifts: ['A', 'A', 'A', 'OFF', 'OFF', 'A', 'A'] },
  { id: '2', name: 'Amit Singh', avatar: 'AS', shifts: ['B', 'B', 'OFF', 'OFF', 'B', 'B', 'B'] },
  { id: '3', name: 'Priya Sharma', avatar: 'PS', shifts: ['A', 'A', 'OFF', 'OFF', 'A', 'A', 'A'] },
  { id: '4', name: 'Vikram Yadav', avatar: 'VY', shifts: ['GEN', 'GEN', 'GEN', 'OFF', 'OFF', 'GEN', 'GEN'] },
  { id: '5', name: 'Suresh Patel', avatar: 'SP', shifts: ['B', 'B', 'B', 'B', 'OFF', 'OFF', 'B'] },
  { id: '6', name: 'Deepak Tiwari', avatar: 'DT', shifts: ['A', 'A', 'A', 'A', 'OFF', 'OFF', 'A'] },
  { id: '7', name: 'Manoj Gupta', avatar: 'MG', shifts: ['GEN', 'GEN', 'OFF', 'OFF', 'GEN', 'GEN', 'GEN'] },
  { id: '8', name: 'Ravi Mishra', avatar: 'RM', shifts: ['B', 'B', 'B', 'OFF', 'OFF', 'B', 'B'] },
  { id: '9', name: 'Anil Verma', avatar: 'AV', shifts: ['A', 'OFF', 'OFF', 'A', 'A', 'A', 'A'] },
  { id: '10', name: 'Sunil Dubey', avatar: 'SD', shifts: ['GEN', 'GEN', 'GEN', 'GEN', 'OFF', 'OFF', 'GEN'] },
  { id: '11', name: 'Ashok Pandey', avatar: 'AP', shifts: ['B', 'OFF', 'OFF', 'B', 'B', 'B', 'B'] },
  { id: '12', name: 'Ramesh Joshi', avatar: 'RJ', shifts: ['A', 'A', 'OFF', 'OFF', 'A', 'A', 'A'] },
]

const WEEKS = [
  'Week 25: 17–23 Jun',
  'Week 24: 10–16 Jun',
  'Week 23: 3–9 Jun',
  'Week 22: 27 May–2 Jun',
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getShiftBadge(shift: string | null) {
  if (!shift) return null
  switch (shift) {
    case 'A':
      return <span className="inline-flex items-center justify-center w-7 h-5 rounded text-[9px] font-bold bg-[#00d4ff]/15 text-[#00d4ff]">A</span>
    case 'B':
      return <span className="inline-flex items-center justify-center w-7 h-5 rounded text-[9px] font-bold bg-[#ffab40]/15 text-[#ffab40]">B</span>
    case 'GEN':
      return <span className="inline-flex items-center justify-center w-9 h-5 rounded text-[9px] font-bold bg-[#00e676]/15 text-[#00e676]">GEN</span>
    case 'OFF':
      return <span className="inline-flex items-center justify-center w-7 h-5 rounded text-[9px] font-bold bg-[#a78bfa]/15 text-[#a78bfa]">OFF</span>
    default:
      return <span className="inline-flex items-center justify-center w-7 h-5 rounded text-[9px] font-bold bg-[#5a6878]/15 text-[#5a6878]">{shift}</span>
  }
}

export default function Shift() {
  const [selectedWeek, setSelectedWeek] = useState(WEEKS[0])
  const [weekOpen, setWeekOpen] = useState(false)

  const shiftA = MOCK_ROSTER.filter(r => r.shifts.includes('A')).length
  const shiftB = MOCK_ROSTER.filter(r => r.shifts.includes('B')).length
  const genShift = MOCK_ROSTER.filter(r => r.shifts.includes('GEN')).length
  const restDay = MOCK_ROSTER.filter(r => r.shifts.includes('OFF')).length

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(1)::before{background:#f5a623}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <Sun size={14} className="text-[#f5a623]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Day Shift A</span>
          </div>
          <div className="text-2xl font-bold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {shiftA}
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(2)::before{background:#00d4ff}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <Moon size={14} className="text-[#00d4ff]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Night Shift B</span>
          </div>
          <div className="text-2xl font-bold text-[#00d4ff]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {shiftB}
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(3)::before{background:#00e676}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <Coffee size={14} className="text-[#00e676]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">General Shift</span>
          </div>
          <div className="text-2xl font-bold text-[#00e676]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {genShift}
          </div>
        </div>
        <div className="vc-stat-card">
          <style>{`.vc-stat-card:nth-child(4)::before{background:#a78bfa}`}</style>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={14} className="text-[#a78bfa]" />
            <span className="text-[10px] text-[#8899aa] uppercase tracking-wider">Rest Day</span>
          </div>
          <div className="text-2xl font-bold text-[#a78bfa]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {restDay}
          </div>
        </div>
      </div>

      {/* Weekly Roster */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <RotateCcw size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Weekly Roster</span>
          <span className="text-[10px] text-[#5a6878] ml-1">Singrauli Unit 5</span>

          {/* Week Selector */}
          <div className="relative ml-auto">
            <button
              onClick={() => setWeekOpen(!weekOpen)}
              className="vc-btn-ghost flex items-center gap-1.5 text-[10px] py-1.5 px-2.5"
            >
              <Calendar size={12} />
              <span style={{ fontFamily: "'Share Tech Mono', monospace" }}>{selectedWeek}</span>
              <ChevronDown size={12} className={`transition-transform ${weekOpen ? 'rotate-180' : ''}`} />
            </button>
            {weekOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#161c24] border border-[#2e3a48] rounded-lg shadow-xl z-20 py-1">
                {WEEKS.map((week) => (
                  <button
                    key={week}
                    onClick={() => { setSelectedWeek(week); setWeekOpen(false) }}
                    className={`w-full text-left px-3 py-2 text-[10px] transition-colors ${
                      selectedWeek === week
                        ? 'bg-[#f5a623]/10 text-[#f5a623]'
                        : 'text-[#8899aa] hover:bg-[#141920] hover:text-[#e2e8f0]'
                    }`}
                    style={{ fontFamily: "'Share Tech Mono', monospace" }}
                  >
                    {week}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-[#161c24] z-10">
              <tr className="border-b border-[#252e3a]">
                <th className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] min-w-[160px]">Employee</th>
                {DAYS.map((day) => (
                  <th key={day} className="text-center py-2.5 px-1 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] min-w-[42px]">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_ROSTER.map((entry) => (
                <tr key={entry.id} className="border-b border-[#252e3a]/50 hover:bg-[#141920] transition-colors">
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#f5a623] to-[#e8891a] flex items-center justify-center text-[9px] font-bold text-black shrink-0">
                        {entry.avatar}
                      </div>
                      <span className="text-[#e2e8f0] font-medium text-[11px]">{entry.name}</span>
                    </div>
                  </td>
                  {entry.shifts.map((shift, idx) => (
                    <td key={idx} className="py-2 px-1 text-center">
                      {getShiftBadge(shift)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-3 py-2.5 border-t border-[#252e3a] flex items-center gap-4 flex-wrap">
          <span className="text-[9px] text-[#5a6878] uppercase tracking-wider font-semibold">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-4 rounded text-[8px] font-bold bg-[#00d4ff]/15 text-[#00d4ff]">A</span>
            <span className="text-[9px] text-[#5a6878]">Day Shift</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-4 rounded text-[8px] font-bold bg-[#ffab40]/15 text-[#ffab40]">B</span>
            <span className="text-[9px] text-[#5a6878]">Night Shift</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-7 h-4 rounded text-[8px] font-bold bg-[#00e676]/15 text-[#00e676]">GEN</span>
            <span className="text-[9px] text-[#5a6878]">General</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-4 rounded text-[8px] font-bold bg-[#a78bfa]/15 text-[#a78bfa]">OFF</span>
            <span className="text-[9px] text-[#5a6878]">Rest Day</span>
          </div>
        </div>
      </div>
    </div>
  )
}
