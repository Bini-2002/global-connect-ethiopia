/* ================= TYPES ================= */

export interface PastEvent {
  id: string;
  title: string;
  date: string;
  event_type?: string;
}

export interface EventStats {
  totalEvents: number;
  thisMonth: number;
  drafts: number;
}

export interface Proposal {
  id: string;
  title: string;
  event_type?: string;
  location?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EventListItem {
  id: string;
  title: string;
  org?: string;
  organization?: string;
  location: string;
  date: string;
  start_date?: string;
  end_date?: string;
  status: 'LIVE' | 'PENDING' | 'COMPLETED' | 'UPCOMING' | 'CANCELLED';
  image?: string;
  progress?: {
    proposal: number;
    approval: number;
    vendors: number;
    tickets: number;
  };
}

export interface ApprovedProposal {
  id: string;
  event_id: string;
  title: string;
  location?: string;
  status: string;
  approved_date: string;
  created_at: string;
  event_type?: string;
}

// Alias for backward compatibility
export type MockEvent = EventListItem;

export const EVENT_STATUS_CONFIG: Record<string, { label: string; bgClass: string }> = {
  LIVE: { label: 'LIVE', bgClass: 'bg-green-500' },
  PENDING: { label: 'PENDING', bgClass: 'bg-amber-500' },
  COMPLETED: { label: 'COMPLETED', bgClass: 'bg-slate-500' },
  UPCOMING: { label: 'UPCOMING', bgClass: 'bg-blue-500' },
  CANCELLED: { label: 'CANCELLED', bgClass: 'bg-red-500' },
};
