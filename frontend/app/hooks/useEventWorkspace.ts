'use client';

import { useEffect, useState } from 'react';
import { eventsService } from '@/app/services/eventsService';
import { EventRecord } from '@/app/types/event';

interface UseEventWorkspaceResult {
  event: EventRecord | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<EventRecord | null>;
  setEvent: React.Dispatch<React.SetStateAction<EventRecord | null>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useEventWorkspace(eventId: string): UseEventWorkspaceResult {
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async (): Promise<EventRecord | null> => {
    try {
      setError(null);
      const response = await eventsService.getEventById(eventId);
      setEvent(response);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event workspace');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [eventId]);

  return { event, loading, error, refresh, setEvent, setError };
}

export default useEventWorkspace;
