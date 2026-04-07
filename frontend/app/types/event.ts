export type EventUiStatus = 'LIVE' | 'PENDING' | 'COMPLETED' | 'UPCOMING' | 'CANCELLED' | 'ARCHIVED';

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

export interface EventProgress {
  proposal: number;
  approval: number;
  vendors: number;
  booking: number;
}

export interface EventListItem {
  id: string;
  proposal_id: string;
  title: string;
  event_type?: string;
  location: string;
  date: string;
  start_date?: string;
  end_date?: string;
  status: EventUiStatus;
  backend_status: string;
  image?: string;
  progress?: EventProgress;
  permit_number?: string | null;
  booking_required?: boolean;
  booking_status?: string;
  booked_count?: number;
  remaining_slots?: number;
}

export interface ApprovedProposal {
  id: string;
  event_id?: string | null;
  title: string;
  location?: string;
  status: string;
  approved_date: string;
  created_at: string;
  event_type?: string;
}

export interface EventRecord {
  id: string;
  organizer_id: string;
  proposal_id: string;
  permit_id?: string | null;
  permit_number?: string | null;
  title: string;
  description?: string | null;
  category?: string | null;
  location?: string | null;
  capacity?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  visibility: string;
  booking_required: boolean;
  vip_list: string[];
  program_schedule_summary?: string | null;
  requires_permit: boolean;
  status: string;
  venue_status: string;
  booking_status: string;
  booking_opens_at?: string | null;
  booking_closes_at?: string | null;
  allow_waitlist: boolean;
  booked_count: number;
  remaining_slots: number;
  survey_status: string;
  final_report_status: string;
  budget_currency: string;
  budget_total_estimated: number;
  published_at?: string | null;
  live_started_at?: string | null;
  completed_at?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventCreateFromProposalResponse {
  event_id: string;
  proposal_id: string;
  status: string;
  message: string;
}

export interface EventScheduleItemRecord {
  id: string;
  event_id: string;
  session_title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  speaker_id?: string | null;
  room_location?: string | null;
  is_ai_suggestion: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventBookingCreatePayload {
  slots_requested: number;
  attendee_name?: string;
  attendee_email?: string;
  notes?: string;
}

export interface EventBookingRecord {
  id: string;
  event_id: string;
  booking_reference: string;
  event_title?: string | null;
  event_location?: string | null;
  event_start_date?: string | null;
  event_end_date?: string | null;
  attendee_id: string;
  attendee_name?: string | null;
  attendee_email?: string | null;
  slots_requested: number;
  notes?: string | null;
  qr_code?: string | null;
  qr_code_image_url?: string | null;
  check_in_pass_image_url?: string | null;
  booking_status: string;
  check_in_status: string;
  checked_in_at?: string | null;
  created_at: string;
  updated_at: string;
}

export const EVENT_STATUS_CONFIG: Record<EventUiStatus, { label: string; bgClass: string }> = {
  LIVE: { label: 'LIVE', bgClass: 'bg-green-500 text-white' },
  PENDING: { label: 'PENDING', bgClass: 'bg-amber-500 text-white' },
  COMPLETED: { label: 'COMPLETED', bgClass: 'bg-slate-500 text-white' },
  UPCOMING: { label: 'UPCOMING', bgClass: 'bg-blue-500 text-white' },
  CANCELLED: { label: 'CANCELLED', bgClass: 'bg-red-500 text-white' },
  ARCHIVED: { label: 'ARCHIVED', bgClass: 'bg-zinc-700 text-white' },
};
