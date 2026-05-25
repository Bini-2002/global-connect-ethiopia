'use client';

import { useEffect, useState } from 'react';
import { eventsService } from '@/app/services/eventsService';
import { EventListItem, ApprovedProposal } from '@/app/types/event';

interface UseEventsResult {
  events: EventListItem[];
  approvedProposals: ApprovedProposal[];
  error: string | null;
  loading: boolean;
  refresh: () => void;
}

let eventsCache: EventListItem[] | null = null;
let proposalsCache: ApprovedProposal[] | null = null;

export function useEvents(): UseEventsResult {
  const [events, setEvents] = useState<EventListItem[]>(eventsCache ?? []);
  const [approvedProposals, setApprovedProposals] = useState<ApprovedProposal[]>(proposalsCache ?? []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!eventsCache || !proposalsCache);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (eventsCache && proposalsCache && reloadKey === 0) {
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        if (!eventsCache || !proposalsCache) setLoading(true);
        setError(null);
        const [eventsData, proposalsData] = await Promise.all([
          eventsService.getEvents(),
          eventsService.getApprovedProposals(),
        ]);
        if (active) {
          eventsCache = eventsData;
          proposalsCache = proposalsData;
          setEvents(eventsData);
          setApprovedProposals(proposalsData);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load events');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return {
    events,
    approvedProposals,
    error,
    loading,
    refresh: () => {
      eventsCache = null;
      proposalsCache = null;
      setReloadKey((v) => v + 1);
    },
  };
}
