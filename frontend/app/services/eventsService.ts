import { api } from '../lib/api';
import { ProposalRecord } from '../types/proposal';
import {
  ApprovedProposal,
  EventBookingCreatePayload,
  EventBookingRecord,
  EventCreateFromProposalResponse,
  EventListItem,
  EventRecord,
  EventScheduleItemRecord,
  EventStats,
  EventUiStatus,
  EVENT_STATUS_CONFIG,
  PastEvent,
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
    vendors: 15,
    booking: event.booking_required ? (event.capacity ? Math.min(Math.round((event.booked_count / event.capacity) * 100), 100) : 0) : 0,
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
  getEvents: async (): Promise<EventListItem[]> => {
    const events = await api.get<EventRecord[]>('/events/');
    return events.map(mapEventToListItem);
  },

  getEventById: async (eventId: string): Promise<EventRecord> => {
    return api.get<EventRecord>(`/events/${eventId}`);
  },

  getDiscoverableEvents: async (): Promise<EventRecord[]> => {
    return api.get<EventRecord[]>('/events/');
  },

  createEventFromProposal: async (proposalId: string): Promise<EventCreateFromProposalResponse> => {
    return api.post<EventCreateFromProposalResponse>(`/events/from-proposal/${proposalId}`);
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

  getApprovedProposals: async (): Promise<ApprovedProposal[]> => {
    const proposals = await api.get<ProposalRecord[]>('/proposals/');
    return proposals
      .filter((proposal) => proposal.status === 'approved')
      .map(mapProposalToApprovedProposal);
  },

  getPastEvents: async (): Promise<PastEvent[]> => {
    const events = await eventsService.getEvents();
    return events
      .filter((event) => event.status === 'COMPLETED' || event.status === 'ARCHIVED')
      .map((event) => ({
        id: event.id,
        title: event.title,
        date: event.date,
        event_type: event.event_type,
      }));
  },

  getEventStats: async (): Promise<EventStats> => {
    const [events, proposals] = await Promise.all([
      api.get<EventRecord[]>('/events/'),
      api.get<ProposalRecord[]>('/proposals/'),
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

  getEventSchedule: async (eventId: string): Promise<EventScheduleItemRecord[]> => {
    return api.get<EventScheduleItemRecord[]>(`/events/${eventId}/schedule`);
  },

  getBookingSettings: async (eventId: string): Promise<EventRecord> => {
    return api.get<EventRecord>(`/events/${eventId}/booking`);
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
};

export { EVENT_STATUS_CONFIG };
export default eventsService;
