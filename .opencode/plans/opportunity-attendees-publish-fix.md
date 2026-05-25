# Plan: Add Attendees on Opportunity Preview & Fix Publish

## Task 1: Fix error display on opportunity detail page

**File**: `frontend/app/organizer/opportunities/[id]/page.tsx`

**Problem**: Publish/close/action failures are silently swallowed. The error banner at line 191 only shows when `error && !opportunity`. After initial load, opportunity IS set, so errors are hidden.

### Changes:

1. Add dismissible error state after `counterAmount` state (line 81):
```tsx
const [dismissedError, setDismissedError] = useState(false);
```

2. Add error banner at the top of the main content area (after line 254, inside the `<main>`):
```tsx
{error && !dismissedError && (
  <div className="mx-auto max-w-7xl mb-6">
    <div className="flex items-start justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <span>{error}</span>
      <button onClick={() => { setDismissedError(true); setError(null); }} className="ml-4 text-red-500 hover:text-red-700">
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  </div>
)}
```

3. Clear `dismissedError` whenever a new action starts (in `fetchData`, or when `error` changes).

## Task 2: Add attendees section on the opportunity preview page

**File**: `frontend/app/organizer/opportunities/[id]/page.tsx`

### Changes:

1. Add imports (at top):
```tsx
import eventsService from '@/app/services/eventsService';
import { EventBookingRecord } from '@/app/types/event';
import { Users, CheckCircle, XCircle, Clock } from 'lucide-react';
```

2. Add attendee state (after existing states):
```tsx
const [attendees, setAttendees] = useState<EventBookingRecord[]>([]);
const [attendeesLoading, setAttendeesLoading] = useState(false);
```

3. Add fetch effect (after the existing `useEffect` at line 100):
```tsx
useEffect(() => {
  if (opportunity?.event_id) {
    setAttendeesLoading(true);
    eventsService.getMyBookings(opportunity.event_id)
      .then(setAttendees)
      .catch(() => {}) // silently fail - attendees are supplementary
      .finally(() => setAttendeesLoading(false));
  } else {
    setAttendees([]);
  }
}, [opportunity?.event_id]);
```

4. Add attendees card in the sidebar (after the "Compare Selected" section, before closing `</aside>`):
```tsx
<div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
  <h3 className="font-bold text-[#062E22]">Attendees</h3>
  {opportunity.event_id ? (
    <>
      <p className="mt-1 text-sm text-slate-500">
        Expected: {opportunity.expected_attendees ?? 'N/A'}
      </p>
      <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
        {attendeesLoading ? (
          <div className="flex justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#062E22] border-t-transparent" />
          </div>
        ) : attendees.length === 0 ? (
          <p className="text-sm text-slate-400">No attendees registered yet.</p>
        ) : (
          attendees.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg bg-[#F5FBF8] p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#062E22] truncate">
                  {a.attendee_name || 'Unknown'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {a.attendee_email || ''}
                </p>
              </div>
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                a.check_in_status === 'checked_in'
                  ? 'bg-green-100 text-green-700'
                  : a.booking_status === 'confirmed'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {a.check_in_status === 'checked_in' ? 'Checked In' : a.booking_status}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  ) : (
    <p className="mt-2 text-sm text-slate-400">
      No event linked to this opportunity.
    </p>
  )}
</div>
```

## Task 3: Fix close endpoint request body

**File**: `frontend/app/services/opportunitiesService.ts`

**Problem**: `closeOpportunity` sends POST with no body, but the backend expects `OpportunityLifecycleRequest` (Pydantic model). This causes a 422 error.

**Fix**: Change line 37 from:
```tsx
closeOpportunity: async (opportunityId: string): Promise<OpportunityRecord> => {
    return api.post<OpportunityRecord>(`/opportunities/${opportunityId}/close`);
},
```
to:
```tsx
closeOpportunity: async (opportunityId: string): Promise<OpportunityRecord> => {
    return api.post<OpportunityRecord>(`/opportunities/${opportunityId}/close`, {});
},
```

This sends `{}` as the JSON body, which FastAPI can parse into `OpportunityLifecycleRequest(note=None)`.
