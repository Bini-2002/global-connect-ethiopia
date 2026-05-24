import axios from 'axios';
import { Event } from '../data/types';
import { getApiBaseUrl } from '../lib/apiBase';

const API_BASE_URL = getApiBaseUrl();

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

/* ================= MOCK EVENT DATA ================= */

const mockEvent: Event = {
  id: 'evt-001',
  title: 'Ethiopia Tech Summit 2026',
  location: 'Addis Ababa',
  status: 'approved',
  event_type: 'Conference',
  start_date: '2026-11-12',
  end_date: '2026-11-14',
  expected_attendees: 500,
  about: '',
  featuredSpeakers: [],
  details: [],
  vendors: [
    { id: 'v1', name: 'Ethio Catering', category: 'Catering', status: 'Approved', rating: 4.8 },
    { id: 'v2', name: 'Addis Sound & Lights', category: 'Audio/Visual', status: 'Pending', rating: 4.5 },
    { id: 'v3', name: 'Bole Security', category: 'Security', status: 'Approved', rating: 4.9 },
    { id: 'v4', name: 'Addis Flowers', category: 'Decor', status: 'Review', rating: 4.7 },
  ],
  tasks: [
    { id: 't1', task: 'Finalize venue booking', assignee: 'John Doe', status: 'completed', due: 'Mar 20' },
    { id: 't2', task: 'Confirm catering menu', assignee: 'Jane Smith', status: 'in-progress', due: 'Mar 25' },
    { id: 't3', task: 'Arrange transportation', assignee: 'Bob Wilson', status: 'pending', due: 'Apr 1' },
    { id: 't4', task: 'Send invitations', assignee: 'Alice Brown', status: 'in-progress', due: 'Apr 5' },
    { id: 't5', task: 'Setup registration desk', assignee: 'Unassigned', status: 'pending', due: 'Apr 10' },
  ],
  budget: {
    total: 500000,
    spent: 250000,
    pending: 100000,
    remaining: 150000,
  },
  expenses: [
    { id: 'e1', item: 'Venue Rental', category: 'Venue', amount: 150000, status: 'paid' },
    { id: 'e2', item: 'Catering Services', category: 'Catering', amount: 80000, status: 'pending' },
    { id: 'e3', item: 'Audio/Visual Equipment', category: 'Equipment', amount: 50000, status: 'paid' },
    { id: 'e4', item: 'Marketing', category: 'Marketing', amount: 30000, status: 'paid' },
  ],
  schedule: [
    { id: 's1', day: 'Day 1 - Nov 12', time: '08:00', title: 'Registration & Welcome Coffee', description: 'Check-in and networking with refreshments', location: 'Main Lobby' },
    { id: 's2', day: 'Day 1 - Nov 12', time: '09:00', title: 'Opening Ceremony', description: 'Welcome remarks and keynote speeches', location: 'Grand Hall' },
    { id: 's3', day: 'Day 1 - Nov 12', time: '10:30', title: 'Panel Discussion: Tech Innovation', description: 'Industry leaders discuss future trends', location: 'Conference Room A' },
    { id: 's4', day: 'Day 1 - Nov 12', time: '12:00', title: 'Lunch Break', description: 'Networking lunch', location: 'Dining Hall' },
    { id: 's5', day: 'Day 2 - Nov 13', time: '09:00', title: 'Morning Session: AI in Ethiopia', description: 'Exploring AI applications', location: 'Grand Hall' },
    { id: 's6', day: 'Day 2 - Nov 13', time: '16:00', title: 'Closing Ceremony', description: 'Awards and closing remarks', location: 'Grand Hall' },
  ],
};

/* ================= API SERVICE ================= */

export const eventService = {
  // ─────────────────────────────────────────────
  // GET SINGLE EVENT (all data in one call)
  // ─────────────────────────────────────────────
  getEvent: async (eventId: string): Promise<Event> => {
    // TODO: Uncomment when backend is ready
    // const response = await axios.get<Event>(
    //   `${API_BASE_URL}/events/${eventId}`,
    //   { headers: authHeaders() }
    // );
    // return response.data;

    // Mock fallback - remove/comment when backend is ready
    return { ...mockEvent, id: eventId };
  },

  // ─────────────────────────────────────────────
  // UPDATE EVENT (partial update - any section)
  // Accepts: { about, vendors, tasks, budget, expenses, schedule, featuredSpeakers, details }
  // ─────────────────────────────────────────────
  updateEvent: async (eventId: string, updates: Partial<Event>): Promise<Event> => {
    // TODO: Uncomment when backend is ready
    // const response = await axios.patch<Event>(
    //   `${API_BASE_URL}/events/${eventId}`,
    //   updates,
    //   { headers: authHeaders() }
    // );
    // return response.data;

    // Mock fallback - remove/comment when backend is ready
    return { ...mockEvent, ...updates, id: eventId };
  },
};

export default eventService;
