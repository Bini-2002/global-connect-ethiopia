'use client';

import { useEffect, useState } from 'react';

import opportunityService from '@/app/services/opportunityService';
import { OpportunityRecord, OpportunityProposalRecord } from '@/app/types/opportunity';

interface ResourceState<T> {
  data: T;
  error: string | null;
  loading: boolean;
  refresh: () => void;
}

function createErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useOpportunities(): ResourceState<OpportunityRecord[]> {
  const [data, setData] = useState<OpportunityRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        // Fallback mock logic could be added here if needed, but we rely on the service
        const response = await opportunityService.listOpportunities();
        if (active) {
          setData(response);
        }
      } catch (nextError) {
        if (active) {
          setError(createErrorMessage(nextError, 'Unable to load opportunities.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return { data, error, loading, refresh: () => setReloadKey((value) => value + 1) };
}

export function useOpportunity(opportunityId: string | null): ResourceState<OpportunityRecord | null> {
  const [data, setData] = useState<OpportunityRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!opportunityId) {
      setData(null);
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await opportunityService.getOpportunityById(opportunityId);
        if (active) {
          setData(response);
        }
      } catch (nextError) {
        if (active) {
          setError(createErrorMessage(nextError, 'Unable to load opportunity details.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [opportunityId, reloadKey]);

  return { data, error, loading, refresh: () => setReloadKey((value) => value + 1) };
}

export function useVendorProposals(): ResourceState<OpportunityProposalRecord[]> {
  const [data, setData] = useState<OpportunityProposalRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await opportunityService.listVendorProposals();
        if (active) {
          setData(response);
        }
      } catch (nextError) {
        if (active) {
          setError(createErrorMessage(nextError, 'Unable to load proposals.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return { data, error, loading, refresh: () => setReloadKey((value) => value + 1) };
}

export function useProposal(proposalId: string | null): ResourceState<OpportunityProposalRecord | null> {
  const [data, setData] = useState<OpportunityProposalRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!proposalId) {
      setData(null);
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await opportunityService.getProposalById(proposalId);
        if (active) {
          setData(response);
        }
      } catch (nextError) {
        if (active) {
          setError(createErrorMessage(nextError, 'Unable to load proposal details.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [proposalId, reloadKey]);

  return { data, error, loading, refresh: () => setReloadKey((value) => value + 1) };
}
