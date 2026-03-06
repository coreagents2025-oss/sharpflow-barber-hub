
## Analysis

### Current State
- `operating_hours` exists in `barbershops` table as JSONB (e.g. `{ monday: {open, close}, tuesday: ... }`)
- It's already used as fallback in `BookingModal` and `useBooking`, but **there's no UI to edit it** — Settings doesn't have an operating hours tab
- `ScheduleManagement` (`/schedule-management`) lets admins configure **specific dates** (override), but has no weekly template
- The flow the user wants:
  1. **Weekly schedule** (canonical) → define open/close hours per day of week + which days are closed
  2. **Daily override** (`/schedule-management`) → for specific dates: change hours, block slots, activate/deactivate barbers

### What to Build

**Part 1 — Weekly Hours Editor in Settings**
Add a new tab "Horários" in Settings (`src/pages/Settings.tsx`) where the admin configures `operating_hours` per day of week. Each day shows:
- Toggle (open/closed)
- Open time selector
- Close time selector

Saves directly to `barbershops.operating_hours` JSONB.

**Part 2 — Redesign ScheduleManagement page**
The current page already handles specific-date overrides well. The UX problem is that it's not clear it's an "override" layer on top of the weekly base. Improve it:
- Add a **banner/info section** at the top showing the weekly hours for the selected day (pulled from `operating_hours`), so the admin can see the base configuration they're overriding
- Clarify the UI labels: "Configuração do Dia X (substituirá o horário padrão para esta data)"
- When no override exists, show the weekly hours as the active config (don't show empty/reset state)
- Pre-fill working hours from the day's `operating_hours` when no `daily_schedule` exists yet

### Files to Modify

1. **`src/pages/Settings.tsx`** — Add new tab "Horários" (Clock icon) with weekly hours editor
2. **`src/pages/ScheduleManagement.tsx`** — Add weekly base hours display + improve UX clarity

### Technical Detail

**Settings tab structure (new "Horários" tab):**
```
const DAYS = [
  { key: 'monday',    label: 'Segunda-feira' },
  { key: 'tuesday',   label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday',  label: 'Quinta-feira' },
  { key: 'friday',    label: 'Sexta-feira' },
  { key: 'saturday',  label: 'Sábado' },
  { key: 'sunday',    label: 'Domingo' },
]
```
State: `operatingHours: Record<string, { open: string, close: string } | null>`  
`null` = closed day.

Saves to `barbershops` table: `UPDATE barbershops SET operating_hours = $1 WHERE id = $2`

**ScheduleManagement improvements:**
- On date selection, fetch `operating_hours` from barbershop and show the base weekly config for that weekday
- Pre-fill `workingHours.start/end` from the weekly config when no `daily_schedule` exists (instead of resetting to 09:00/20:00)
- Add an info card: "Horário padrão para [weekday]: 09:00–18:00 — Esta configuração será substituída para [date]"

### Summary
- **1 major change**: New "Horários" tab in Settings — the canonical weekly schedule editor
- **1 minor improvement**: ScheduleManagement shows the weekly base and pre-fills from it
- No database schema changes needed — `operating_hours` JSONB column already exists
- The booking system already reads `operating_hours` as fallback, so after this change bookings will be correctly restricted to the configured weekly hours
