import { api } from '@/app/lib/api';
import {
  CreateOpportunityPayload,
  OpportunityRecord,
  OpportunityProposalRecord,
  CounterProposalPayload,
  AcceptProposalPayload,
  RejectProposalPayload,
} from '@/app/types/opportunity';

export const opportunitiesService = {
  createOpportunity: async (payload: CreateOpportunityPayload): Promise<OpportunityRecord> => {
    return api.post<OpportunityRecord>('/opportunities', payload);
  },

  listOpportunities: async (): Promise<OpportunityRecord[]> => {
    return api.get<OpportunityRecord[]>('/opportunities');
  },

  getOpportunity: async (opportunityId: string): Promise<OpportunityRecord> => {
    return api.get<OpportunityRecord>(`/opportunities/${opportunityId}`);
  },

  updateOpportunity: async (
    opportunityId: string,
    payload: Partial<CreateOpportunityPayload>
  ): Promise<OpportunityRecord> => {
    return api.patch<OpportunityRecord>(`/opportunities/${opportunityId}`, payload);
  },

  publishOpportunity: async (opportunityId: string): Promise<OpportunityRecord> => {
    return api.post<OpportunityRecord>(`/opportunities/${opportunityId}/publish`);
  },

  closeOpportunity: async (opportunityId: string): Promise<OpportunityRecord> => {
    return api.post<OpportunityRecord>(`/opportunities/${opportunityId}/close`);
  },

  listProposals: async (opportunityId: string): Promise<OpportunityProposalRecord[]> => {
    return api.get<OpportunityProposalRecord[]>(`/opportunities/${opportunityId}/proposals`);
  },

  counterProposal: async (
    opportunityId: string,
    proposalId: string,
    payload: CounterProposalPayload
  ): Promise<OpportunityProposalRecord> => {
    return api.patch<OpportunityProposalRecord>(
      `/opportunities/${opportunityId}/proposals/${proposalId}`,
      payload
    );
  },

  acceptProposal: async (
    opportunityId: string,
    proposalId: string,
    payload?: AcceptProposalPayload
  ): Promise<OpportunityProposalRecord> => {
    return api.post<OpportunityProposalRecord>(
      `/opportunities/${opportunityId}/proposals/${proposalId}/accept`,
      payload || {}
    );
  },

  rejectProposal: async (
    opportunityId: string,
    proposalId: string,
    payload: RejectProposalPayload
  ): Promise<OpportunityProposalRecord> => {
    return api.post<OpportunityProposalRecord>(
      `/opportunities/${opportunityId}/proposals/${proposalId}/reject`,
      payload
    );
  },
};

export default opportunitiesService;