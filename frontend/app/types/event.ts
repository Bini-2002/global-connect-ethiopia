/* frontend/app/types/event.ts */

import { ProposalOfficeAssignments } from './proposal';

export type EventUiStatus = 'LIVE' | 'PENDING' | 'COMPLETED' | 'UPCOMING' | 'CANCELLED' | 'ARCHIVED';
export type EventTaskPriority = 'low' | 'medium' | 'high';
export type EventTaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled';
export type EventAnnouncementChannel = 'in_app';
export type EventIncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type EventIncidentStatus = 'open' | 'in_review' | 'resolved' | 'closed';
export type FinalReportVisibility = 'private' | 'sponsors' | 'government' | 'public';

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

export interface EventBudgetItem {
  id?: string | null;
  name: string;
  estimated_cost: number;
  actual_cost?: number | null;
  notes?: string | null;
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
  required_attendee_fields: string[];
  booked_count: number;
  remaining_slots: number;
  survey_status: string;
  final_report_status: string;
  budget_currency: string;
  budget_items: EventBudgetItem[];
  budget_total_estimated: number;
  office_assignments?: ProposalOfficeAssignments | null;
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

export interface EventBudgetUpdatePayload {
  items: EventBudgetItem[];
  currency: string;
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

export interface EventScheduleAiDraftPayload {
  event_type: string;
  duration_days: number;
  start_time: string;
}

export interface AiScheduleDraftItem {
  title: string;
  start_time: string;
  end_time: string;
  category?: string | null;
  description?: string | null;
  order_index: number;
  is_ai_suggestion: boolean;
  applied: boolean;
}

export interface AiScheduleDraftResponse {
  id: string;
  event_id: string;
  organizer_id: string;
  input_constraints: Record<string, any>;
  provider: string;
  status: string;
  generated_items: AiScheduleDraftItem[];
  created_at: string;
  expires_at: string;
  can_apply: boolean;
}

export interface EventScheduleCreatePayload {
  session_title: string;
  description?: string;
  start_time: string;
  end_time: string;
  speaker_id?: string;
  room_location?: string;
  is_ai_suggestion?: boolean;
}

export interface EventScheduleUpdatePayload {
  session_title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  speaker_id?: string;
  room_location?: string;
  is_ai_suggestion?: boolean;
}

export interface TicketTypeRecord {
  id: string;
  event_id: string;
  name: string;
  description?: string | null;
  price: number;
  quantity: number;
  sold_quantity: number;
  reserved_quantity: number;
  remaining_quantity: number;
  currency: string;
  sales_start?: string | null;
  sales_end?: string | null;
  seat_mode: 'general' | 'assigned';
  visibility: 'public' | 'private';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketTypeCreatePayload {
  name: string;
  description?: string;
  price: number;
  quantity: number;
  currency?: string;
  sales_start?: string;
  sales_end?: string;
  seat_mode?: 'general' | 'assigned';
  visibility?: 'public' | 'private';
  is_active?: boolean;
}

export interface TicketTypeUpdatePayload {
  name?: string;
  description?: string;
  price?: number;
  quantity?: number;
  currency?: string;
  sales_start?: string;
  sales_end?: string;
  seat_mode?: 'general' | 'assigned';
  visibility?: 'public' | 'private';
  is_active?: boolean;
}

export interface TicketCheckoutRequest {
  ticket_type_id: string;
  quantity: number;
  attendee_name?: string;
  attendee_email?: string;
  notes?: string;
  attendee_profile?: Record<string, string>;
}

export interface TicketPaymentConfirmRequest {
  payment_reference_id?: string;
  payment_method?: string;
}

// ─── Phase 2: Venue Search & Reservation ─────────────────────────────────────

export type VenueReservationStatus =
  | 'requested'
  | 'provider_accepted'
  | 'offered_alternative'
  | 'organizer_confirmed'
  | 'confirmed'
  | 'declined'
  | 'cancelled';

export type VenueReservationPaymentStatus =
  | 'not_required'
  | 'deposit_pending'
  | 'deposit_funded'
  | 'satisfied';

export interface VenueListingSearchResponse {
  id: string;
  venue_name: string;
  city: string;
  location: string | null;
  capacity: number;
  estimated_cost: number | null;
  deposit_amount: number | null;
  currency: string;
  available: boolean;
  is_reservable: boolean;
  description: string | null;
  notes: string | null;
  vendor: { vendor_id: string; business_name: string | null } | null;
}

export interface VenueSearchResult {
  event_id: string;
  date_from?: string | null;
  date_to?: string | null;
  city?: string | null;
  venues: VenueListingSearchResponse[];
}

/** Phase 2: creation now uses venue_listing_id instead of free-text */
export interface VenueReservationCreatePayload {
  vendor_id: string;
  requested_start: string;
  requested_end: string;
  estimated_cost?: number;
  notes?: string;
}

export interface VenueReservationOrganizerConfirmPayload {
  confirmation_notes?: string;
}

export interface VenueReservationCancelPayload {
  cancellation_notes?: string;
}

export interface VenueReservationDepositUpdatePayload {
  payment_milestone_status: VenueReservationPaymentStatus;
  payment_reference_id?: string;
  notes?: string;
}

/** Phase 2 full handshake reservation record */
export interface VenueReservationRecord {
  id: string;
  event_id: string;
  vendor_id: string;
  vendor_user_id: string;
  venue_name: string;
  city: string;
  location: string | null;
  requested_start: string;
  requested_end: string;
  requested_capacity: number | null;
  estimated_cost: number | null;
  deposit_amount: number | null;
  currency: string;
  notes: string | null;
  provider_action: string | null;
  provider_response_notes: string | null;
  failure_reason: string | null;
  organizer_confirmation_notes: string | null;
  cancellation_notes: string | null;
  proposed_start: string | null;
  proposed_end: string | null;
  proposed_cost: number | null;
  proposed_deposit_amount: number | null;
  agreed_start: string | null;
  agreed_end: string | null;
  agreed_cost: number | null;
  agreed_deposit_amount: number | null;
  status: VenueReservationStatus;
  payment_milestone_status: VenueReservationPaymentStatus;
  payment_reference_id: string | null;
  deposit_funded_at: string | null;
  deposit_satisfied_at: string | null;
  alternative_suggestions: VenueListingSearchResponse[];
  alternative_suggestions_generated_at: string | null;
  created_at: string;
  updated_at: string;
  failed_at: string | null;
  provider_responded_at: string | null;
  organizer_confirmed_at: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
}

export interface EventTeamInvitationCreatePayload {
  email: string;
  assigned_role: string;
  display_name?: string;
}

export interface EventTeamInvitationRecord {
  id: string;
  event_id: string;
  email: string;
  assigned_role: string;
  display_name?: string | null;
  invited_by_user_id: string;
  status: string;
  token: string;
  created_at: string;
  updated_at: string;
  accepted_at?: string | null;
}

export interface EventTeamMemberRecord {
  id: string;
  event_id: string;
  user_id?: string | null;
  email: string;
  full_name?: string | null;
  assigned_role: string;
  status: string;
  joined_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventTaskCreatePayload {
  title: string;
  description?: string;
  assignee_user_id?: string;
  assignee_email?: string;
  due_date?: string;
  priority?: EventTaskPriority;
}

export interface EventTaskUpdatePayload {
  title?: string;
  description?: string;
  assignee_user_id?: string;
  assignee_email?: string;
  due_date?: string;
  priority?: EventTaskPriority;
  status?: EventTaskStatus;
}

export interface EventTaskRecord {
  id: string;
  event_id: string;
  title: string;
  description?: string | null;
  assignee_user_id?: string | null;
  assignee_email?: string | null;
  due_date?: string | null;
  priority: EventTaskPriority;
  status: EventTaskStatus;
  created_at: string;
  updated_at: string;
}

export interface BookingSettingsUpdatePayload {
  booking_required: boolean;
  booking_opens_at?: string | null;
  booking_closes_at?: string | null;
  allow_waitlist: boolean;
  required_attendee_fields: string[];
}

export interface EventBookingCreatePayload {
  slots_requested: number;
  attendee_name?: string;
  attendee_email?: string;
  notes?: string;
  attendee_profile?: Record<string, string>;
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
  attendee_profile: Record<string, string>;
  qr_code?: string | null;
  qr_code_image_url?: string | null;
  check_in_pass_image_url?: string | null;
  booking_status: string;
  check_in_status: string;
  checked_in_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BadgeGeneratePayload {
  booking_ids?: string[] | null;
  include_unchecked_in?: boolean;
}

export interface BadgeRecord {
  id: string;
  event_id: string;
  booking_id: string;
  attendee_id: string;
  attendee_name?: string | null;
  attendee_email?: string | null;
  badge_code: string;
  role_label: string;
  generated_at: string;
}

export interface CheckInScanPayload {
  qr_code: string;
}

export interface AnnouncementCreatePayload {
  audience_segment: 'confirmed_bookings';
  subject: string;
  body: string;
  channel?: EventAnnouncementChannel;
  send_at?: string | null;
}

export interface AnnouncementRecord {
  id: string;
  event_id: string;
  audience_segment: string;
  subject: string;
  body: string;
  channel: EventAnnouncementChannel | string;
  send_at?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  sent_at?: string | null;
  recipient_count: number;
  delivered_count: number;
  delivery_warning?: string | null;
}

export interface AnnouncementDeliveryRecord {
  id: string;
  announcement_id: string;
  event_id: string;
  recipient_user_id: string;
  recipient_name?: string | null;
  recipient_email?: string | null;
  booking_id?: string | null;
  subject: string;
  body: string;
  status: string;
  delivered_at?: string | null;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManualAnnouncementRunResponse {
  announcement: AnnouncementRecord;
  deliveries: AnnouncementDeliveryRecord[];
}

export interface IncidentCreatePayload {
  type: string;
  severity?: EventIncidentSeverity;
  time?: string | null;
  description: string;
  photos?: string[];
}

export interface IncidentUpdatePayload {
  severity?: EventIncidentSeverity;
  description?: string;
  photos?: string[];
  escalation_status?: string;
  status?: EventIncidentStatus;
}

export interface IncidentRecord {
  id: string;
  event_id: string;
  type: string;
  severity: EventIncidentSeverity | string;
  time: string;
  description: string;
  photos: string[];
  created_by_user_id: string;
  escalation_status: string;
  status: EventIncidentStatus | string;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

export interface FeedbackSendPayload {
  audience_segment?: string;
  scheduled_for?: string | null;
  custom_questions?: string[];
}

export interface FeedbackSummaryRecord {
  event_id: string;
  survey_status: string;
  response_count: number;
  average_rating?: number | null;
  average_vendor_rating?: number | null;
  average_nps?: number | null;
}

export interface FinalReportCreatePayload {
  timeline_summary: string;
  total_costs?: number | null;
  vendors_used?: string[];
  lessons_learned: string;
  visibility?: FinalReportVisibility;
  benchmark_notes?: string;
}

export interface FinalReportUpdatePayload {
  timeline_summary?: string;
  total_costs?: number | null;
  vendors_used?: string[];
  lessons_learned?: string;
  visibility?: FinalReportVisibility;
  benchmark_notes?: string;
  status?: string;
}

export interface FinalReportRecord {
  id: string;
  event_id: string;
  timeline_summary: string;
  total_costs?: number | null;
  vendors_used: string[];
  lessons_learned: string;
  visibility: FinalReportVisibility | string;
  benchmark_notes?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
}

export interface EventUpdatePayload {
  description?: string;
  visibility?: 'public' | 'private';
  booking_required?: boolean;
  vip_list?: string[];
  program_schedule_summary?: string;
}

export const EVENT_STATUS_CONFIG: Record<EventUiStatus, { label: string; bgClass: string }> = {
  LIVE: { label: 'LIVE', bgClass: 'bg-green-500 text-white' },
  PENDING: { label: 'PENDING', bgClass: 'bg-amber-500 text-white' },
  COMPLETED: { label: 'COMPLETED', bgClass: 'bg-slate-500 text-white' },
  UPCOMING: { label: 'UPCOMING', bgClass: 'bg-blue-500 text-white' },
  CANCELLED: { label: 'CANCELLED', bgClass: 'bg-red-500 text-white' },
  ARCHIVED: { label: 'ARCHIVED', bgClass: 'bg-zinc-700 text-white' },
};
