export function isDateInPast(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    // Invalid date -> treat as not in past here (other validation should catch malformed values)
    if (Number.isNaN(d.getTime())) return false;
    return d.getTime() < Date.now();
  } catch {
    return false;
  }
}

export function isEndBeforeStart(start?: string | null, end?: string | null): boolean {
  if (!start || !end) return false;
  try {
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return false;
    return e.getTime() <= s.getTime();
  } catch {
    return false;
  }
}

export function isDateOnlyInPast(dateOnly?: string | null): boolean {
  if (!dateOnly) return false;
  try {
    const d = new Date(dateOnly);
    if (Number.isNaN(d.getTime())) return false;
    d.setHours(0,0,0,0);
    const now = new Date(); now.setHours(0,0,0,0);
    return d.getTime() < now.getTime();
  } catch {
    return false;
  }
}
