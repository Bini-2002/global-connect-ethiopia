import { api } from '@/app/lib/api';
import {
  OpportunityRecord,
  OpportunityProposalRecord,
  SubmitProposalPayload,
  NegotiateProposalPayload,
} from '@/app/types/opportunity';

export const opportunityService = {
  // Vendor: List all available opportunities (open + invited)
  listOpportunities: async (): Promise<OpportunityRecord[]> => {
    return api.get<OpportunityRecord[]>('/opportunities/vendor');
  },

  getOpportunityById: async (opportunityId: string): Promise<OpportunityRecord> => {
    return api.get<OpportunityRecord>(`/opportunities/${opportunityId}`);
  },

  // Vendor: Submit a new bid/proposal
  submitProposal: async (
    opportunityId: string,
    payload: SubmitProposalPayload,
  ): Promise<OpportunityProposalRecord> => {
    return api.post<OpportunityProposalRecord>(`/opportunities/${opportunityId}/proposals`, payload);
  },

  // Vendor: List their own proposals
  listVendorProposals: async (): Promise<OpportunityProposalRecord[]> => {
    return api.get<OpportunityProposalRecord[]>('/proposals/vendor');
  },

  getProposalById: async (proposalId: string): Promise<OpportunityProposalRecord> => {
    return api.get<OpportunityProposalRecord>(`/proposals/${proposalId}`);
  },

  // Vendor: Counter an offer from the client
  counterProposal: async (
    proposalId: string,
    payload: NegotiateProposalPayload,
  ): Promise<OpportunityProposalRecord> => {
    return api.post<OpportunityProposalRecord>(`/proposals/${proposalId}/counter`, payload);
  },
  
  // Vendor: Accept a client's counter offer
  acceptCounter: async (
    proposalId: string,
  ): Promise<OpportunityProposalRecord> => {
    return api.post<OpportunityProposalRecord>(`/proposals/${proposalId}/accept`);
  },
};

export default opportunityService;
