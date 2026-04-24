'use client';

import { useState, useEffect } from 'react';
import opportunityService from '@/app/services/opportunityService';
import opportunitiesService from '@/app/services/opportunitiesService';
import { OpportunityRecord, OpportunityProposalRecord } from '@/app/types/opportunity';

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

// Ensure default data falls back to empty array for list hooks
export function useOpportunities(status?: string) {
  const state = useResource<OpportunityRecord[]>(
    () => {
      const query = status ? \?status=\\ : '';
      return opportunitiesService.listOpportunities().then((list) => {
        if (status) {
          return list.filter((o) => o.status === status);
        }
        return list;
      });
    },
    [status]
  );
  return { ...state, data: state.data || [] };
}

export function useOpportunity(
  opportunityId: string | null
): ResourceState<OpportunityRecord | null> {
  return useResource<OpportunityRecord | null>(
    async () => {
      if (!opportunityId) return null;
      // Using opportunitiesService as per origin version
      return opportunitiesService.getOpportunity(opportunityId);
    },
    [opportunityId]
  );
}

export function useVendorProposals() {
  const state = useResource<OpportunityProposalRecord[]>(
    async () => {
      // Using opportunityService as per HEAD version
      return opportunityService.listVendorProposals();
    },
    []
  );
  return { ...state, data: state.data || [] };
}

export function useProposal(proposalId: string | null): ResourceState<OpportunityProposalRecord | null> {
  return useResource<OpportunityProposalRecord | null>(
    async () => {
      if (!proposalId) return null;
      // Using opportunityService as per HEAD version
      return opportunityService.getProposalById(proposalId);
    },
    [proposalId]
  );
}
