export type MarketplaceActor = 'client' | 'vendor' | 'admin' | 'none';
export type OpportunitySourcingMode = 'invite_only' | 'open_bid' | 'hybrid';
export type ProposalSubmissionMode = 'invited' | 'open_bid';
export type OpportunityStatus = 'draft' | 'published' | 'closed' | 'awarded' | 'contracted' | 'cancelled' | 'expired';
export type OpportunityProposalStatus = 'draft' | 'submitted' | 'client_countered' | 'vendor_countered' | 'selected' | 'rejected' | 'withdrawn' | 'expired' | 'converted';

export interface OpportunityLocation {
  country?: string | null;
  city?: string | null;
  address_line?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface OpportunityRecord {
  id: string; // The backend uses the document ID, usually mapped to 'id' in frontend responses
  client_user_id: string;
  client_profile_id?: string | null;
  event_id?: string | null;
  legacy_organizer_proposal_id?: string;
  title: string;
  description: string;
  category: string;
  requirements?: string | null;
  location?: OpportunityLocation | Record<string, any> | string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  currency: string;
  expected_attendees?: number | null;
  submission_deadline?: string | null;
  event_date?: string | null;
  sourcing_mode: OpportunitySourcingMode;
  status: OpportunityStatus;
  invited_vendor_ids: string[];
  invited_vendor_user_ids: string[];
  selected_proposal_id?: string | null;
  winning_vendor_id?: string | null;
  winning_vendor_user_id?: string | null;
  compatibility_request_id?: string;
  contract_id?: string | null;
  proposal_count: number;
  active_proposal_count: number;
  published_at?: string | null;
  closed_at?: string | null;
  awarded_at?: string | null;
  cancelled_at?: string | null;
  expired_at?: string | null;
  created_at: string;
  updated_at: string;
  version?: number;
  
  // Custom fields we might populate from the backend response
  client_name?: string | null;
  is_invited?: boolean; // Helpful flag for the UI
}

export interface OpportunityProposalRecord {
  id: string;
  opportunity_id: string;
  client_user_id: string;
  vendor_id: string;
  vendor_user_id: string;
  vendor_service_id?: string | null;
  vendor_name?: string;
  submission_mode?: ProposalSubmissionMode | null;
  status: OpportunityProposalStatus;
  awaiting_action_by: MarketplaceActor;
  proposal_amount?: number | null;
  currency: string;
  scope_summary?: string | null;
  cover_letter?: string | null;
  delivery_timeline_days?: number | null;
  terms?: string | null;
  counter_round: number;
  last_countered_by?: MarketplaceActor | null;
  final_agreed_amount?: number | null;
  rejection_reason?: string | null;
  withdrawal_reason?: string | null;
  selection_note?: string | null;
  compatibility_request_id?: string;
  contract_id?: string | null;
  submitted_at?: string | null;
  selected_at?: string | null;
  converted_at?: string | null;
  withdrawn_at?: string | null;
  created_at: string;
  updated_at: string;
  version?: number;

  // Populated fields
  opportunity?: OpportunityRecord | null;
  vendor_business_name?: string | null;
}

export interface CreateOpportunityPayload {
  event_id?: string;
  title: string;
  description: string;
  category?: string;
  requirements?: string;
  location?: OpportunityLocation | string;
  budget_min?: number;
  budget_max?: number;
  expected_attendees?: number;
  submission_deadline?: string;
  event_date?: string;
  sourcing_mode: OpportunitySourcingMode;
  invited_vendor_ids?: string[];
  invited_vendor_user_ids?: string[];
}

export interface SubmitProposalPayload {
  submission_mode: ProposalSubmissionMode;
  proposal_amount: number;
  scope_summary: string;
  cover_letter?: string;
  delivery_timeline_days?: number;
}

export interface NegotiateProposalPayload {
  amount: number;
  message?: string;
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
