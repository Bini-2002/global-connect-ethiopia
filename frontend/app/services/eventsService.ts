import axios from 'axios';
import { EventListItem, ApprovedProposal, PastEvent, EventStats } from '../types/event';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return (
    sessionStorage.getItem('gce_access_token') ||
    localStorage.getItem('gce_access_token')
  );
};

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

/* ================= MOCK DATA ================= */

const mockEvents: EventListItem[] = [
  {
    id: 'evt-001',
    title: 'Ethiopia Tech Summit 2026',
    org: 'Ethiopian Tech Alliance',
    location: 'Addis Ababa',
    date: 'Nov 12, 2026',
    status: 'LIVE',
    image: '/event1.png',
    progress: { proposal: 100, approval: 100, vendors: 80, tickets: 60 },
  },
  {
    id: 'evt-002',
    title: 'Cultural Heritage Festival',
    org: 'Heritage Foundation',
    location: 'Multi-City',
    date: 'Jan 18, 2027',
    status: 'UPCOMING',
    image: '/event2.png',
    progress: { proposal: 100, approval: 100, vendors: 40, tickets: 20 },
  },
  {
    id: 'evt-003',
    title: 'National Youth Workshop',
    org: 'Youth Initiative',
    location: 'Hawassa',
    date: 'Mar 5, 2026',
    status: 'COMPLETED',
    image: '/event2.png',
    progress: { proposal: 100, approval: 100, vendors: 100, tickets: 100 },
  },
  {
    id: 'evt-004',
    title: 'Arts & Music Expo',
    org: 'Ethio Arts Council',
    location: 'Addis Ababa',
    date: 'Dec 20, 2025',
    status: 'COMPLETED',
    image: '/event2.png',
    progress: { proposal: 100, approval: 100, vendors: 100, tickets: 100 },
  },
];

const mockApprovedProposals: ApprovedProposal[] = [
  {
    id: 'prop-001',
    event_id: 'evt-001',
    title: 'Ethiopia Tech Summit 2026',
    location: 'Addis Ababa',
    status: 'approved',
    approved_date: '2026-03-15',
    created_at: '2026-02-01',
    event_type: 'Conference',
  },
  {
    id: 'prop-002',
    event_id: 'evt-002',
    title: 'Cultural Heritage Festival',
    location: 'Addis Ababa',
    status: 'approved',
    approved_date: '2026-02-28',
    created_at: '2026-01-15',
    event_type: 'Festival',
  },
];

const EVENT_STATUS_CONFIG: Record<string, { label: string; bgClass: string }> = {
  LIVE: { label: 'LIVE', bgClass: 'bg-green-500' },
  PENDING: { label: 'PENDING', bgClass: 'bg-amber-500' },
  COMPLETED: { label: 'COMPLETED', bgClass: 'bg-slate-500' },
  UPCOMING: { label: 'UPCOMING', bgClass: 'bg-blue-500' },
  CANCELLED: { label: 'CANCELLED', bgClass: 'bg-red-500' },
};

const mockPastEvents: PastEvent[] = [
  { id: 'past-001', title: 'National Innovation Summit 2024', date: 'March 15, 2024' },
  { id: 'past-002', title: 'Regional Farmers Workshop', date: 'February 20, 2024' },
  { id: 'past-003', title: 'Digital Health Expo', date: 'January 10, 2024' },
];

const mockEventStats: EventStats = {
  totalEvents: 12,
  thisMonth: 3,
  drafts: 2,
};

/* ================= API SERVICE ================= */

export const eventsService = {
  // ─────────────────────────────────────────────
  // GET ALL EVENTS (for main events list)
  // ─────────────────────────────────────────────
  getEvents: async (): Promise<EventListItem[]> => {
    // TODO: Uncomment when backend is ready
    // const response = await axios.get<EventListItem[]>(
    //   `${API_BASE_URL}/events`,
    //   { headers: authHeaders() }
    // );
    // return response.data;

    // Mock fallback - remove/comment when backend is ready
    return mockEvents;
  },

  // ─────────────────────────────────────────────
  // GET APPROVED PROPOSALS (for sidebar)
  // ─────────────────────────────────────────────
  getApprovedProposals: async (): Promise<ApprovedProposal[]> => {
    // TODO: Uncomment when backend is ready
    // const response = await axios.get<ApprovedProposal[]>(
    //   `${API_BASE_URL}/proposals?status=approved`,
    //   { headers: authHeaders() }
    // );
    // return response.data;

    // Mock fallback - remove/comment when backend is ready
    return mockApprovedProposals;
  },

  // ─────────────────────────────────────────────
  // GET PAST EVENTS (for "Clone from Existing")
  // ─────────────────────────────────────────────
  getPastEvents: async (): Promise<PastEvent[]> => {
    // TODO: Uncomment when backend is ready
    // const response = await axios.get<PastEvent[]>(
    //   `${API_BASE_URL}/events?status=COMPLETED`,
    //   { headers: authHeaders() }
    // );
    // return response.data;

    // Mock fallback - remove/comment when backend is ready
    return mockPastEvents;
  },

  // ─────────────────────────────────────────────
  // GET EVENT STATS (for sidebar)
  // ─────────────────────────────────────────────
  getEventStats: async (): Promise<EventStats> => {
    // TODO: Uncomment when backend is ready
    // const response = await axios.get<EventStats>(
    //   `${API_BASE_URL}/users/me/stats`,
    //   { headers: authHeaders() }
    // );
    // return response.data;

    // Mock fallback - remove/comment when backend is ready
    return mockEventStats;
  },
};

export { EVENT_STATUS_CONFIG, mockEvents, mockApprovedProposals, mockPastEvents, mockEventStats };
export default eventsService;
