
## Root cause analysis

After querying the actual production data from Anjus Barber and auditing the code, I identified **3 distinct bugs** causing the reported problems:

---

### Bug 1 — Timezone mismatch in `fetchOccupiedTimes` (the main double-booking UI issue)

**Files:** `src/components/BookingModal.tsx` (line 214-228) and `src/components/crm/CreateAppointmentDialog.tsx` (line 193-209)

Both components query occupied times using:
```typescript
const dateStr = selectedDate.toISOString().split('T')[0] // UTC date!
.gte('scheduled_at', `${dateStr}T00:00:00`)  // no 'Z' suffix = Postgres reads as UTC
.lt('scheduled_at', `${dateStr}T23:59:59`)
```

**The problem:** `toISOString()` always returns the UTC date. For a Brazilian user (UTC-3) selecting "March 12", the Date object is `2026-03-12T03:00:00Z` — so `split('T')[0]` = `"2026-03-12"` → OK so far.

But appointments stored by an admin at **22:00 local** are saved as `2026-03-13T01:00:00Z` (UTC). The occupied-slots query for "March 12" filters `< 2026-03-12T23:59:59 UTC` — so that 22:00 appointment maps to 2026-03-13 UTC and is **completely invisible** to the public user's slot check.

**Same issue for times after 21:00 local** (= 00:00 UTC next day): appointments booked by admin for the last 3 hours of the day are never shown as occupied in the public catalog.

**Fix:** Use explicit UTC-aware boundaries for the query:
```typescript
const start = new Date(selectedDate);
start.setHours(0, 0, 0, 0);
const end = new Date(selectedDate);
end.setHours(23, 59, 59, 999);
// then use: .gte('scheduled_at', start.toISOString()).lt('scheduled_at', end.toISOString())
```
This creates proper local-time boundaries and converts them to UTC via `.toISOString()`.

---

### Bug 2 — `fetchOccupiedTimes` not re-run when barber changes **after** time was already selected

**File:** `src/components/BookingModal.tsx` (line 88-91)

```typescript
useEffect(() => {
  if (selectedDate && selectedBarber) {
    fetchOccupiedTimes();
  }
}, [selectedDate, selectedBarber, totalDuration]);
```

If the user: 1) picks a date, 2) picks a time (before selecting barber), 3) then picks a barber — the occupied times are loaded only **after** barber selection. But the time button wasn't disabled because `occupiedTimes` was empty at click time.

**Fix:** Reset `selectedTime` whenever `selectedBarber` or `selectedDate` changes so the user must re-pick time after seeing which slots are occupied.

---

### Bug 3 — `fetchOccupiedTimes` only filters by `barber_id` but CRM's `CreateAppointmentDialog` has **no barber pre-selected** guard on the time buttons

**File:** `src/components/crm/CreateAppointmentDialog.tsx` (line 381-403)

The time slot buttons show as disabled only when `selectedBarber && occupiedTimes.includes(time)`. If `selectedBarber` is empty, ALL times appear available regardless of other barbers' bookings. This is correct behavior but combined with Bug 1 means even with a barber selected, late-day admin slots are invisible.

---

### Bug 4 — `loadAvailableSlotsForBarber` (reschedule in PDV) uses hardcoded `8–19h` range, ignoring barbershop operating hours and `daily_schedules`

**File:** `src/pages/PDV.tsx` (line 578)

```typescript
for (let h = 8; h < 19; h++) {  // ← ignores actual operating hours
```

This means reschedule dialog can show slots outside the real working hours.

---

## What will be fixed

| File | Fix |
|---|---|
| `src/components/BookingModal.tsx` | Fix date boundary using `setHours(0/23)` + `.toISOString()` instead of raw string |
| `src/components/crm/CreateAppointmentDialog.tsx` | Same timezone fix for occupied times query |
| `src/components/BookingModal.tsx` | Reset `selectedTime` when barber or date changes |
| `src/pages/PDV.tsx` | Fix reschedule slot generator to respect barbershop operating hours via `public_barbershops.operating_hours` |

No database changes required. The DB trigger `prevent_appointment_conflict` is working correctly — these are all frontend/UI bugs that make occupied slots appear available, causing user confusion and failed booking attempts.

---

## Layout impact

None — all fixes are in the data-fetching layer. The UI appearance remains identical, but slots that are already taken will correctly appear greyed-out with strikethrough.
