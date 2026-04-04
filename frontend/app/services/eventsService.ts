import { api } from '../lib/api';
import { ProposalRecord } from '../types/proposal';
import { EventListItem, ApprovedProposal, PastEvent, EventStats } from '../types/event';

const EVENT_STATUS_CONFIG: Record<string, { label: string; bgClass: string }> = {
  LIVE: { label: 'LIVE', bgClass: 'bg-green-500' },
  PENDING: { label: 'PENDING', bgClass: 'bg-amber-500' },
  COMPLETED: { label: 'COMPLETED', bgClass: 'bg-slate-500' },
  UPCOMING: { label: 'UPCOMING', bgClass: 'bg-blue-500' },
  CANCELLED: { label: 'CANCELLED', bgClass: 'bg-red-500' },
};

function deriveEventStatus(proposal: ProposalRecord): EventListItem['status'] {
  const now = new Date();
  const start = proposal.start_date ? new Date(proposal.start_date) : null;
  const end = proposal.end_date ? new Date(proposal.end_date) : null;

  if (proposal.status !== 'approved') return 'PENDING';
  if (start && end && start <= now && end >= now) return 'LIVE';
  if (end && end < now) return 'COMPLETED';
  return 'UPCOMING';
}

function mapProposalToEvent(proposal: ProposalRecord): EventListItem {
  return {
    id: proposal.id,
    title: proposal.title,
    location: proposal.location || 'Location pending',
    date: proposal.start_date
      ? new Date(proposal.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Date pending',
    start_date: proposal.start_date || undefined,
    end_date: proposal.end_date || undefined,
    status: deriveEventStatus(proposal),
    progress: {
      proposal: 100,
      approval: proposal.status === 'approved' ? 100 : 75,
      vendors: 0,
      tickets: 0,
    },
  };
}

function mapProposalToApprovedProposal(proposal: ProposalRecord): ApprovedProposal {
  return {
    id: proposal.id,
    event_id: proposal.id,
    title: proposal.title,
    location: proposal.location || undefined,
    status: proposal.status,
    approved_date: proposal.updated_at,
    created_at: proposal.created_at,
    event_type: proposal.event_type || undefined,
  };
}

/* ================= API SERVICE ================= */

export const eventsService = {
  // ─────────────────────────────────────────────
  // GET ALL EVENTS (for main events list)
  // ─────────────────────────────────────────────
  getEvents: async (): Promise<EventListItem[]> => {
    const proposals = await api.get<ProposalRecord[]>('/proposals/');
    return proposals
      .filter((proposal) => proposal.status === 'approved')
      .map(mapProposalToEvent);
  },

  // ─────────────────────────────────────────────
  // GET APPROVED PROPOSALS (for sidebar)
  // ─────────────────────────────────────────────
  getApprovedProposals: async (): Promise<ApprovedProposal[]> => {
    const proposals = await api.get<ProposalRecord[]>('/proposals/');
    return proposals
      .filter((proposal) => proposal.status === 'approved')
      .map(mapProposalToApprovedProposal);
  },

  // ─────────────────────────────────────────────
  // GET PAST EVENTS (for "Clone from Existing")
  // ─────────────────────────────────────────────
  getPastEvents: async (): Promise<PastEvent[]> => {
    const events = await eventsService.getEvents();
    return events
      .filter((event) => event.status === 'COMPLETED')
      .map((event) => ({
        id: event.id,
        title: event.title,
        date: event.date,
      }));
  },

  // ─────────────────────────────────────────────
  // GET EVENT STATS (for sidebar)
  // ─────────────────────────────────────────────
  getEventStats: async (): Promise<EventStats> => {
    const proposals = await api.get<ProposalRecord[]>('/proposals/');
    const now = new Date();

    return {
      totalEvents: proposals.filter((proposal) => proposal.status === 'approved').length,
      thisMonth: proposals.filter((proposal) => {
        const createdAt = new Date(proposal.created_at);
        return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
      }).length,
      drafts: proposals.filter((proposal) => proposal.status === 'draft').length,
    };
  },
};

export { EVENT_STATUS_CONFIG };
export default eventsService;
