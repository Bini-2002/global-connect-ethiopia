import { api } from '@/app/lib/api';
import {
  CreateOpportunityPayload,
  OpportunityRecord,
  OpportunityProposalRecord,
  CounterProposalPayload,
  AcceptProposalPayload,
  RejectProposalPayload,
  SubmitProposalPayload,
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

  // Proposal endpoints
  submitProposal: async (
    opportunityId: string,
    payload: SubmitProposalPayload
  ): Promise<OpportunityProposalRecord> => {
    return api.post<OpportunityProposalRecord>(`/opportunities/${opportunityId}/proposals`, payload);
  },

  listProposals: async (opportunityId: string): Promise<OpportunityProposalRecord[]> => {
    return api.get<OpportunityProposalRecord[]>(`/opportunities/${opportunityId}/proposals`);
  },

  listVendorProposals: async (): Promise<OpportunityProposalRecord[]> => {
    return api.get<OpportunityProposalRecord[]>('/opportunities/proposals/mine');
  },

  listActionableProposals: async (): Promise<OpportunityProposalRecord[]> => {
    return api.get<OpportunityProposalRecord[]>('/opportunities/proposals/actionable');
  },

  getProposalDetail: async (
    opportunityId: string,
    proposalId: string
  ): Promise<OpportunityProposalRecord> => {
    return api.get<OpportunityProposalRecord>(`/opportunities/${opportunityId}/proposals/${proposalId}`);
  },

  counterProposal: async (
    opportunityId: string,
    proposalId: string,
    payload: CounterProposalPayload
  ): Promise<OpportunityProposalRecord> => {
    return api.post<OpportunityProposalRecord>(
      `/opportunities/${opportunityId}/proposals/${proposalId}/counter`,
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

  withdrawProposal: async (
    opportunityId: string,
    proposalId: string,
    payload: { reason?: string }
  ): Promise<OpportunityProposalRecord> => {
    return api.post<OpportunityProposalRecord>(
      `/opportunities/${opportunityId}/proposals/${proposalId}/withdraw`,
      payload
    );
  },
};

export default opportunitiesService;