import { api } from '../lib/api';
import { ProposalRecord } from '../types/proposal';
import {
  ApprovedProposal,
  AnnouncementCreatePayload,
  AnnouncementDeliveryRecord,
  AnnouncementRecord,
  BadgeGeneratePayload,
  BadgeRecord,
  BookingSettingsUpdatePayload,
  CheckInScanPayload,
  EventBookingCreatePayload,
  EventBookingRecord,
  EventBudgetUpdatePayload,
  TicketCheckoutRequest,
  TicketPaymentConfirmRequest,
  EventCreateFromProposalResponse,
  EventListItem,
  EventRecord,
  EventScheduleAiDraftPayload,
  EventScheduleCreatePayload,
  EventScheduleItemRecord,
  EventScheduleUpdatePayload,
  EventStats,
  EventTaskCreatePayload,
  EventTaskRecord,
  EventTaskUpdatePayload,
  EventTeamInvitationCreatePayload,
  EventTeamInvitationRecord,
  EventTeamMemberRecord,
  EventUiStatus,
  EventUpdatePayload,
  EVENT_STATUS_CONFIG,
  FeedbackSendPayload,
  FeedbackSummaryRecord,
  FinalReportCreatePayload,
  FinalReportRecord,
  FinalReportUpdatePayload,
  IncidentCreatePayload,
  IncidentRecord,
  IncidentUpdatePayload,
  ManualAnnouncementRunResponse,
  PastEvent,
  VenueListingSearchResponse,
  VenueReservationCancelPayload,
  VenueReservationCreatePayload,
  VenueReservationDepositUpdatePayload,
  VenueReservationOrganizerConfirmPayload,
  VenueReservationRecord,
  VenueSearchResult,
  AiScheduleDraftResponse,
  AiScheduleDraftItem,
  VipReservationCreatePayload,
  VipReservationRecord,
} from '../types/event';

function formatEventDate(startDate?: string | null, endDate?: string | null): string {
  if (!startDate) return 'Date pending';

  const start = new Date(startDate);
  if (!endDate) {
    return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const end = new Date(endDate);
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startLabel} - ${endLabel}`;
}

function mapBackendStatusToUi(status: string): EventUiStatus {
  switch (status) {
    case 'live':
      return 'LIVE';
    case 'completed':
      return 'COMPLETED';
    case 'archived':
      return 'ARCHIVED';
    case 'cancelled':
      return 'CANCELLED';
    case 'published':
    case 'private_published':
      return 'UPCOMING';
    default:
      return 'PENDING';
  }
}

function buildProgress(event: EventRecord): EventListItem['progress'] {
  return {
    proposal: 100,
    approval: event.permit_number ? 100 : 85,
    vendors: event.venue_status === 'confirmed' ? 55 : 20,
    booking: event.booking_required
      ? event.capacity
        ? Math.min(Math.round((event.booked_count / event.capacity) * 100), 100)
        : 0
      : 0,
  };
}

function mapEventToListItem(event: EventRecord): EventListItem {
  return {
    id: event.id,
    proposal_id: event.proposal_id,
    title: event.title,
    event_type: event.category || undefined,
    location: event.location || 'Location pending',
    date: formatEventDate(event.start_date, event.end_date),
    start_date: event.start_date || undefined,
    end_date: event.end_date || undefined,
    status: mapBackendStatusToUi(event.status),
    backend_status: event.status,
    progress: buildProgress(event),
    permit_number: event.permit_number,
    booking_required: event.booking_required,
    booking_status: event.booking_status,
    booked_count: event.booked_count,
    remaining_slots: event.remaining_slots,
  };
}

function mapProposalToApprovedProposal(proposal: ProposalRecord): ApprovedProposal {
  return {
    id: proposal.id,
    event_id: proposal.event_id,
    title: proposal.title,
    location: proposal.location || undefined,
    status: proposal.status,
    approved_date: proposal.updated_at,
    created_at: proposal.created_at,
    event_type: proposal.event_type || undefined,
  };
}

export const eventsService = {
  getEvents: async (authToken?: string | null): Promise<EventListItem[]> => {
    const events = await api.get<EventRecord[]>('/events/', { authToken });
    return events.map(mapEventToListItem);
  },

  getEventById: async (eventId: string): Promise<EventRecord> => {
    return api.get<EventRecord>(`/events/${eventId}`);
  },

  updateEvent: async (eventId: string, payload: EventUpdatePayload): Promise<EventRecord> => {
    return api.patch<EventRecord>(`/events/${eventId}`, payload);
  },

  cloneEvent: async (eventId: string): Promise<EventRecord> => {
    return api.post<EventRecord>(`/events/${eventId}/clone`, {});
  },

  getDiscoverableEvents: async (): Promise<EventRecord[]> => {
    return api.get<EventRecord[]>('/events/?discover=true');
  },

  createEventFromProposal: async (proposalId: string, visibility: 'public' | 'private' = 'public'): Promise<EventCreateFromProposalResponse> => {
    return api.post<EventCreateFromProposalResponse>(`/events/from-proposal/${proposalId}?visibility=${visibility}`);
  },

  publishEvent: async (eventId: string): Promise<EventRecord> => {
    return api.post<EventRecord>(`/events/${eventId}/publish`);
  },

  startLiveEvent: async (eventId: string): Promise<EventRecord> => {
    return api.post<EventRecord>(`/events/${eventId}/start-live`);
  },

  completeEvent: async (eventId: string): Promise<EventRecord> => {
    return api.post<EventRecord>(`/events/${eventId}/complete`);
  },

  archiveEvent: async (eventId: string): Promise<EventRecord> => {
    return api.post<EventRecord>(`/events/${eventId}/archive`);
  },

  getApprovedProposals: async (authToken?: string | null): Promise<ApprovedProposal[]> => {
    const proposals = await api.get<ProposalRecord[]>('/proposals/', { authToken });
    return proposals
      .filter((proposal) => proposal.status === 'approved')
      .map(mapProposalToApprovedProposal);
  },

  getPastEvents: async (authToken?: string | null): Promise<PastEvent[]> => {
    const events = await eventsService.getEvents(authToken);
    return events
      .filter((event) => event.status === 'COMPLETED' || event.status === 'ARCHIVED')
      .map((event) => ({
        id: event.id,
        title: event.title,
        date: event.date,
        event_type: event.event_type,
      }));
  },

  getEventStats: async (authToken?: string | null): Promise<EventStats> => {
    const [events, proposals] = await Promise.all([
      api.get<EventRecord[]>('/events/', { authToken }),
      api.get<ProposalRecord[]>('/proposals/', { authToken }),
    ]);
    const now = new Date();

    return {
      totalEvents: events.length,
      thisMonth: events.filter((event) => {
        const createdAt = new Date(event.created_at);
        return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
      }).length,
      drafts: proposals.filter((proposal) => proposal.status === 'draft').length,
    };
  },

  getEventBudget: async (eventId: string): Promise<EventRecord> => {
    return api.get<EventRecord>(`/events/${eventId}/budget`);
  },

  updateEventBudget: async (
    eventId: string,
    payload: EventBudgetUpdatePayload
  ): Promise<EventRecord> => {
    return api.put<EventRecord>(`/events/${eventId}/budget`, payload);
  },

  getScheduleAIDraft: async (eventId: string, draftId: string): Promise<AiScheduleDraftResponse> => {
    return api.get<AiScheduleDraftResponse>(`/events/${eventId}/schedule/ai-draft?draft_id=${draftId}`);
  },

  generateScheduleAIDraft: async (
    eventId: string,
    payload: EventScheduleAiDraftPayload
  ): Promise<AiScheduleDraftResponse> => {
    return api.post<AiScheduleDraftResponse>(`/events/${eventId}/schedule/ai-draft`, payload);
  },

  updateScheduleAIDraft: async (
    eventId: string,
    draftId: string,
    payload: AiScheduleDraftResponse
  ): Promise<AiScheduleDraftResponse> => {
    return api.put<AiScheduleDraftResponse>(`/events/${eventId}/schedule/ai-draft/${draftId}`, payload);
  },

  applyScheduleAIDraft: async (
    eventId: string,
    draftId: string,
    items: AiScheduleDraftItem[]
  ): Promise<{ status: string; message: string }> => {
    return api.post<{ status: string; message: string }>(`/events/${eventId}/schedule/apply-ai-draft`, {
      draft_id: draftId,
      items
    });
  },

  getEventSchedule: async (eventId: string): Promise<EventScheduleItemRecord[]> => {
    return api.get<EventScheduleItemRecord[]>(`/events/${eventId}/schedule`);
  },

  createEventScheduleItem: async (
    eventId: string,
    payload: EventScheduleCreatePayload
  ): Promise<EventScheduleItemRecord> => {
    return api.post<EventScheduleItemRecord>(`/events/${eventId}/schedule`, payload);
  },

  updateEventScheduleItem: async (
    eventId: string,
    scheduleItemId: string,
    payload: EventScheduleUpdatePayload
  ): Promise<EventScheduleItemRecord> => {
    return api.patch<EventScheduleItemRecord>(`/events/${eventId}/schedule/${scheduleItemId}`, payload);
  },

  getTicketTypes: async (eventId: string): Promise<TicketTypeRecord[]> => {
    return api.get<TicketTypeRecord[]>(`/events/${eventId}/ticket-types`);
  },

  createTicketType: async (
    eventId: string,
    payload: TicketTypeCreatePayload
  ): Promise<TicketTypeRecord> => {
    return api.post<TicketTypeRecord>(`/events/${eventId}/ticket-types`, payload);
  },

  updateTicketType: async (
    eventId: string,
    ticketTypeId: string,
    payload: TicketTypeUpdatePayload
  ): Promise<TicketTypeRecord> => {
    return api.patch<TicketTypeRecord>(`/events/${eventId}/ticket-types/${ticketTypeId}`, payload);
  },

  /** Phase 2: search returns real venue listing records with `id` field */
  searchEventVenues: async (eventId: string, city?: string, q?: string): Promise<VenueSearchResult> => {
    const params = new URLSearchParams();
    if (city?.trim()) params.set('city', city.trim());
    if (q?.trim()) params.set('q', q.trim());
    const query = params.toString();
    return api.get<VenueSearchResult>(`/events/${eventId}/venues/search${query ? '?' + query : ''}`);
  },

  getVenueReservations: async (eventId: string): Promise<VenueReservationRecord[]> => {
    return api.get<VenueReservationRecord[]>(`/events/${eventId}/venue-reservations`);
  },

  /** Phase 2: payload now requires venue_listing_id instead of free-text venue_name/city */
  createVenueReservation: async (
    eventId: string,
    payload: VenueReservationCreatePayload
  ): Promise<VenueReservationRecord> => {
    return api.post<VenueReservationRecord>(`/events/${eventId}/venue-reservations`, payload);
  },

  /** Phase 2: confirm after provider_accepted or offered_alternative */
  confirmVenueReservation: async (
    eventId: string,
    reservationId: string,
    payload: VenueReservationOrganizerConfirmPayload
  ): Promise<VenueReservationRecord> => {
    return api.post<VenueReservationRecord>(
      `/events/${eventId}/venue-reservations/${reservationId}/confirm`,
      payload
    );
  },

  /** Phase 2: cancel a reservation */
  cancelVenueReservation: async (
    eventId: string,
    reservationId: string,
    payload: VenueReservationCancelPayload
  ): Promise<VenueReservationRecord> => {
    return api.post<VenueReservationRecord>(
      `/events/${eventId}/venue-reservations/${reservationId}/cancel`,
      payload
    );
  },

  /** Phase 2: update deposit milestone status */
  updateVenueReservationDeposit: async (
    eventId: string,
    reservationId: string,
    payload: VenueReservationDepositUpdatePayload
  ): Promise<VenueReservationRecord> => {
    return api.post<VenueReservationRecord>(
      `/events/${eventId}/venue-reservations/${reservationId}/deposit`,
      payload
    );
  },

  getTeamInvitations: async (eventId: string): Promise<EventTeamInvitationRecord[]> => {
    return api.get<EventTeamInvitationRecord[]>(`/events/${eventId}/team/invitations`);
  },

  createTeamInvitation: async (
    eventId: string,
    payload: EventTeamInvitationCreatePayload
  ): Promise<EventTeamInvitationRecord> => {
    return api.post<EventTeamInvitationRecord>(`/events/${eventId}/team/invitations`, payload);
  },

  acceptTeamInvitation: async (
    eventId: string,
    invitationId: string
  ): Promise<EventTeamMemberRecord> => {
    return api.post<EventTeamMemberRecord>(`/events/${eventId}/team/invitations/${invitationId}/accept`);
  },

  getTeamMembers: async (eventId: string): Promise<EventTeamMemberRecord[]> => {
    return api.get<EventTeamMemberRecord[]>(`/events/${eventId}/team`);
  },

  getEventTasks: async (eventId: string): Promise<EventTaskRecord[]> => {
    return api.get<EventTaskRecord[]>(`/events/${eventId}/tasks`);
  },

  createEventTask: async (
    eventId: string,
    payload: EventTaskCreatePayload
  ): Promise<EventTaskRecord> => {
    return api.post<EventTaskRecord>(`/events/${eventId}/tasks`, payload);
  },

  updateEventTask: async (
    eventId: string,
    taskId: string,
    payload: EventTaskUpdatePayload
  ): Promise<EventTaskRecord> => {
    return api.patch<EventTaskRecord>(`/events/${eventId}/tasks/${taskId}`, payload);
  },

  getBookingSettings: async (eventId: string): Promise<EventRecord> => {
    return api.get<EventRecord>(`/events/${eventId}/booking`);
  },

  updateBookingSettings: async (
    eventId: string,
    payload: BookingSettingsUpdatePayload
  ): Promise<EventRecord> => {
    return api.put<EventRecord>(`/events/${eventId}/booking`, payload);
  },

  getMyBookings: async (eventId: string): Promise<EventBookingRecord[]> => {
    return api.get<EventBookingRecord[]>(`/events/${eventId}/bookings`);
  },

  getBookingById: async (eventId: string, bookingId: string): Promise<EventBookingRecord> => {
    return api.get<EventBookingRecord>(`/events/${eventId}/bookings/${bookingId}`);
  },

  createBooking: async (
    eventId: string,
    payload: EventBookingCreatePayload
  ): Promise<EventBookingRecord> => {
    return api.post<EventBookingRecord>(`/events/${eventId}/bookings`, payload);
  },

  checkoutTicket: async (
    eventId: string,
    payload: TicketCheckoutRequest
  ): Promise<EventBookingRecord> => {
    return api.post<EventBookingRecord>(`/events/${eventId}/tickets/checkout`, payload);
  },

  confirmTicketPayment: async (
    eventId: string,
    payload: TicketPaymentConfirmRequest
  ): Promise<EventBookingRecord> => {
    return api.post<EventBookingRecord>(`/events/${eventId}/tickets/confirm-payment`, payload);
  },

  getBadges: async (eventId: string): Promise<BadgeRecord[]> => {
    return api.get<BadgeRecord[]>(`/events/${eventId}/badges`);
  },

  generateBadges: async (
    eventId: string,
    payload: BadgeGeneratePayload
  ): Promise<BadgeRecord[]> => {
    return api.post<BadgeRecord[]>(`/events/${eventId}/badges/generate`, payload);
  },

  scanCheckIn: async (
    eventId: string,
    payload: CheckInScanPayload
  ): Promise<EventBookingRecord> => {
    return api.post<EventBookingRecord>(`/events/${eventId}/check-in/scan`, payload);
  },

  getAnnouncements: async (eventId: string): Promise<AnnouncementRecord[]> => {
    return api.get<AnnouncementRecord[]>(`/events/${eventId}/announcements`);
  },

  createAnnouncement: async (
    eventId: string,
    payload: AnnouncementCreatePayload
  ): Promise<AnnouncementRecord> => {
    return api.post<AnnouncementRecord>(`/events/${eventId}/announcements`, payload);
  },

  runScheduledAnnouncementNow: async (
    eventId: string,
    announcementId: string
  ): Promise<ManualAnnouncementRunResponse> => {
    return api.post<ManualAnnouncementRunResponse>(
      `/events/${eventId}/announcements/${announcementId}/run-now`
    );
  },

  getAnnouncementDeliveries: async (
    eventId: string,
    announcementId: string
  ): Promise<AnnouncementDeliveryRecord[]> => {
    return api.get<AnnouncementDeliveryRecord[]>(
      `/events/${eventId}/announcements/${announcementId}/deliveries`
    );
  },

  getIncidents: async (eventId: string): Promise<IncidentRecord[]> => {
    return api.get<IncidentRecord[]>(`/events/${eventId}/incidents`);
  },

  createIncident: async (
    eventId: string,
    payload: IncidentCreatePayload
  ): Promise<IncidentRecord> => {
    return api.post<IncidentRecord>(`/events/${eventId}/incidents`, payload);
  },

  updateIncident: async (
    eventId: string,
    incidentId: string,
    payload: IncidentUpdatePayload
  ): Promise<IncidentRecord> => {
    return api.patch<IncidentRecord>(`/events/${eventId}/incidents/${incidentId}`, payload);
  },

  sendFeedbackSurvey: async (
    eventId: string,
    payload: FeedbackSendPayload
  ): Promise<FeedbackSummaryRecord> => {
    return api.post<FeedbackSummaryRecord>(`/events/${eventId}/feedback/send`, payload);
  },

  getFeedbackSummary: async (eventId: string): Promise<FeedbackSummaryRecord> => {
    return api.get<FeedbackSummaryRecord>(`/events/${eventId}/feedback/summary`);
  },

  getFinalReport: async (eventId: string): Promise<FinalReportRecord> => {
    return api.get<FinalReportRecord>(`/events/${eventId}/final-report`);
  },

  createFinalReport: async (
    eventId: string,
    payload: FinalReportCreatePayload
  ): Promise<FinalReportRecord> => {
    return api.post<FinalReportRecord>(`/events/${eventId}/final-report`, payload);
  },

  updateFinalReport: async (
    eventId: string,
    payload: FinalReportUpdatePayload
  ): Promise<FinalReportRecord> => {
    return api.patch<FinalReportRecord>(`/events/${eventId}/final-report`, payload);
  },

  getMyTasks: async (): Promise<EventTaskRecord[]> => {
    return api.get<EventTaskRecord[]>('/events/tasks/my');
  },

  approveAndPayTask: async (eventId: string, taskId: string): Promise<EventTaskRecord> => {
    return api.post<EventTaskRecord>(`/events/${eventId}/tasks/${taskId}/approve-and-pay`, {});
  },

  listVipReservations: async (eventId: string): Promise<VipReservationRecord[]> => {
    return api.get<VipReservationRecord[]>(`/events/${eventId}/vip-reservations`);
  },

  createVipReservation: async (eventId: string, payload: VipReservationCreatePayload): Promise<VipReservationRecord> => {
    return api.post<VipReservationRecord>(`/events/${eventId}/vip-reservations`, payload);
  },

  deleteVipReservation: async (eventId: string, reservationId: string): Promise<void> => {
    return api.delete<void>(`/events/${eventId}/vip-reservations/${reservationId}`);
  },
};

export { EVENT_STATUS_CONFIG };
export default eventsService;
