# Shift-Driven Attendance & Overtime

The **Shift** (managed in Shift Roster, assigned via Shift Assignment) is now the
**primary** source of truth for working hours, overtime, and late status.
**Attendance Rules** remain as **edge-case overrides** and are the **only** place
that calculates **late fines**.

## What the Shift now controls

| Setting (on the Shift) | Drives |
|---|---|
| `startTime` / `endTime` | Scheduled in/out; shift gross duration |
| `breakMinutes` | Subtracted from gross → **net working hours** |
| `crossesMidnight` | Correct duration for night shifts |
| `otThresholdMin` | Minutes of extra time before OT starts counting |
| `graceMinutes` | Grace window before a punch is marked **Late** |

### Overtime (OT)
- **Regular day:** `OT = hoursWorked − shiftNetHours`, where
  `shiftNetHours = (end − start, midnight-aware) − break`.
  OT only counts once the overage reaches `otThresholdMin` (e.g. threshold 30 →
  you must work 30+ min past the shift before any OT accrues). `0` = count all extra time.
- **Holiday:** all hours worked count as OT (unchanged).
- **Fallback:** if a record has no shift, OT defaults to "hours beyond 8".

Implemented in `src/lib/services/overtime-calculator.ts` (`getShiftNetHours`,
`calculateOvertimeHours`, `calculateTotalOvertimeHours`). Payroll generation
(`src/app/api/payroll/generate/route.ts`) passes the employee's active shift.
The Timesheet UI mirrors the same math client-side using shift fields now
returned by `/api/attendance`.

### Late status
- `classifyAttendance` uses the shift's `startTime` as the scheduled time and the
  shift's `graceMinutes` as the default grace window.
- A punch within `start + grace` → **Present**; beyond it → **Late**.

## What Attendance Rules still control (edge cases)

Attendance Rules are matched by specificity (shift > department > branch > generic).
**When a rule matches**, it **overrides** the shift defaults for that employee:
- `gracePeriodMinutes`, `lateMarkAfterMinutes`, `halfDayAfterMinutes`, `absentAfterMinutes`
- **Fines** (`fineType`, `fineAmount`, `finePerMinute`, `maxFinePerDay`)

**When no rule matches**, the shift drives late status and **the fine is always 0**
(the shift itself never fines). This keeps day-to-day setup simple: configure the
shift, and only add an Attendance Rule when a specific shift/department/branch needs
fines or different thresholds.

## No database migration required
All fields used here already exist on the `Shift` model
(`startTime`, `endTime`, `breakMinutes`, `crossesMidnight`, `otThresholdMin`,
`graceMinutes`). This change only wires up fields that were previously unused.
