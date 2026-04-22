import { useState, useEffect } from 'react';
import { OpportunityRecord } from '@/app/types/opportunity';
import opportunitiesService from '@/app/services/opportunitiesService';

export interface ResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

function useResource<T>(
  fetchFn: () => Promise<T>,
  deps: unknown[] = []
): ResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchFn();
        if (!cancelled) {
          setData(result);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, ...deps]);

  return { data, loading, error, refresh };
}

export function useOpportunities(status?: string): ResourceState<OpportunityRecord[]> {
  return useResource<OpportunityRecord[]>(
    () => {
      const query = status ? `?status=${status}` : '';
      return opportunitiesService.listOpportunities().then((list) => {
        if (status) {
          return list.filter((o) => o.status === status);
        }
        return list;
      });
    },
    [status]
  );
}

export function useOpportunity(
  opportunityId: string | null
): ResourceState<OpportunityRecord | null> {
  return useResource<OpportunityRecord | null>(
    async () => {
      if (!opportunityId) return null;
      return opportunitiesService.getOpportunity(opportunityId);
    },
    [opportunityId]
  );
}