export interface OpportunityLocation {
  country?: string;
  city?: string;
  address_line?: string;
  latitude?: number;
  longitude?: number;
}

export interface OpportunityRecord {
  id: string;
  client_user_id: string;
  client_profile_id?: string;
  event_id?: string;
  legacy_organizer_proposal_id?: string;
  title: string;
  description: string;
  category: string;
  requirements?: string;
  location?: OpportunityLocation | string | null;
  budget_min?: number;
  budget_max?: number;
  currency: string;
  submission_deadline?: string;
  event_date?: string;
  sourcing_mode: OpportunitySourcingMode;
  status: OpportunityStatus;
  invited_vendor_ids: string[];
  invited_vendor_user_ids: string[];
  selected_proposal_id?: string;
  winning_vendor_id?: string;
  winning_vendor_user_id?: string;
  compatibility_request_id?: string;
  contract_id?: string;
  proposal_count: number;
  active_proposal_count: number;
  published_at?: string;
  closed_at?: string;
  awarded_at?: string;
  cancelled_at?: string;
  expired_at?: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface OpportunityProposalRecord {
  id: string;
  opportunity_id: string;
  client_user_id: string;
  vendor_id: string;
  vendor_user_id: string;
  vendor_service_id?: string;
  vendor_name?: string;
  submission_mode?: ProposalSubmissionMode;
  status: OpportunityProposalStatus;
  awaiting_action_by: MarketplaceActor;
  proposal_amount?: number;
  currency: string;
  scope_summary?: string;
  cover_letter?: string;
  delivery_timeline_days?: number;
  terms?: string;
  counter_round: number;
  last_countered_by?: MarketplaceActor;
  final_agreed_amount?: number;
  rejection_reason?: string;
  withdrawal_reason?: string;
  selection_note?: string;
  compatibility_request_id?: string;
  contract_id?: string;
  submitted_at?: string;
  selected_at?: string;
  converted_at?: string;
  withdrawn_at?: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export type OpportunitySourcingMode = 'invite_only' | 'open_bid' | 'hybrid';
export type ProposalSubmissionMode = 'invited' | 'open_bid';
export type OpportunityStatus = 'draft' | 'published' | 'closed' | 'awarded' | 'contracted' | 'cancelled' | 'expired';
export type OpportunityProposalStatus = 'draft' | 'submitted' | 'client_countered' | 'vendor_countered' | 'selected' | 'rejected' | 'withdrawn' | 'expired' | 'converted';
export type MarketplaceActor = 'client' | 'vendor' | 'admin' | 'none';

export interface CreateOpportunityPayload {
  event_id?: string;
  title: string;
  description: string;
  category?: string;
  requirements?: string;
  location?: OpportunityLocation | string;
  budget_min?: number;
  budget_max?: number;
  submission_deadline?: string;
  event_date?: string;
  sourcing_mode: OpportunitySourcingMode;
  invited_vendor_ids?: string[];
  invited_vendor_user_ids?: string[];
}

export interface CounterProposalPayload {
  amount: number;
  message?: string;
}

export interface AcceptProposalPayload {
  final_amount?: number;
  note?: string;
}

export interface RejectProposalPayload {
  reason: string;
}