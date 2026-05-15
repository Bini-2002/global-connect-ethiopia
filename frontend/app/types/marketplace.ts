export type RequestStatus = 'REQUESTED' | 'QUOTED' | 'NEGOTIATING' | 'ACCEPTED';
export type NegotiationMessageType = 'QUOTE' | 'COUNTER';
export type ContractStatus = 'draft' | 'AGREED' | 'FUNDED' | 'COMPLETED' | 'PAID' | 'CANCELLED';
export type EscrowStatus = 'NONE' | 'LOCKED' | 'RELEASED';
export type PaymentStatus = 'PENDING' | 'PAID';
export type TransactionType = 'DEPOSIT' | 'ESCROW_LOCK' | 'RELEASE' | 'REFUND' | 'COMMISSION' | 'TASK_PAYOUT';
export type TransactionStatus = 'SUCCESS';

export interface ServiceImageAsset {
  url: string;
  storage_key?: string | null;
  storage_provider?: string | null;
  content_type?: string | null;
  size_bytes?: number | null;
  uploaded_at?: string | null;
}

export interface ServiceVendorSummary {
  vendor_id: string;
  vendor_user_id: string;
  business_name?: string | null;
  vendor_name?: string | null;
  business_category?: string | null;
  location?: string | null;
}

export interface VendorServiceRecord {
  id: string;
  vendor_id: string;
  vendor_user_id: string;
  title: string;
  description: string;
  category: string;
  price_min: number;
  price_max: number;
  pricing_type: 'fixed' | 'negotiable';
  location?: string | null;
  images: ServiceImageAsset[];
  availability?: unknown;
  service_details?: unknown;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  vendor?: ServiceVendorSummary | null;
}

export interface VendorPortalSummary {
  vendor_id: string;
  vendor_user_id: string;
  business_name?: string | null;
  business_category?: string | null;
  verification_status: string;
  services_count: number;
  pending_requests_count: number;
  accepted_requests_count: number;
  active_contracts_count: number;
  recent_services: Array<{
    id: string;
    title?: string | null;
    category?: string | null;
    is_active: boolean;
    created_at?: string | null;
  }>;
  recent_requests: Array<{
    id: string;
    event_id?: string | null;
    service_title?: string | null;
    status?: string | null;
    proposed_amount?: number | null;
    created_at?: string | null;
  }>;
  recent_contracts: Array<{
    id: string;
    event_id?: string | null;
    title?: string | null;
    status?: string | null;
    amount?: number | null;
    created_at?: string | null;
  }>;
}

export interface VendorServiceCreatePayload {
  title: string;
  description: string;
  category: string;
  price_min: number;
  price_max: number;
  pricing_type: 'fixed' | 'negotiable';
  location: string;
  tags?: string[];
  image_urls?: string[];
  image_files?: File[];
  availability?: string;
  service_details?: string;
}

export interface MarketplaceVendorRecord {
  id: string;
  user_id: string;
  business_name: string;
  services: string[];
  service_records?: VendorServiceRecord[];
  is_verified: boolean;
  rating: number;
  created_at: string;
}

export interface NegotiationMessageRecord {
  sender_id: string;
  type: NegotiationMessageType;
  amount: number;
  message?: string | null;
  timestamp: string;
}

export interface MarketplaceRequestRecord {
  id: string;
  organizer_id: string;
  vendor_id: string;
  event_id?: string | null;
  description: string;
  status: RequestStatus;
  messages: NegotiationMessageRecord[];
  current_amount?: number | null;
  organizer_name?: string | null;
  vendor_business_name?: string | null;
  created_at: string;
  updated_at: string;
}

/** Phase 2 contract record — uses simplified signing model */
export interface MarketplaceContractRecord {
  id: string;
  request_id: string | null;
  opportunity_id: string | null;
  proposal_id: string | null;
  event_id: string | null;
  organizer_id: string;
  vendor_id: string;
  vendor_user_id: string;
  title: string;
  scope: string;
  /** amount replaces the old `price` field */
  amount: number;
  currency: string;
  terms: string | null;
  selection_note: string | null;
  status: ContractStatus;
  escrow_status: EscrowStatus;
  payment_status: PaymentStatus;
  /** Phase 2 signature flags */
  signed_by_organizer: boolean;
  signed_by_vendor: boolean;
  signed_by_organizer_at: string | null;
  signed_by_vendor_at: string | null;
  organizer_name: string | null;
  vendor_business_name: string | null;
  start_date: string | null;
  end_date: string | null;
  funded_at: string | null;
  completed_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WalletRecord {
  id: string;
  user_id: string;
  balance: number;
  locked_balance: number;
  pending_withdrawal_balance?: number;
  total_withdrawn?: number;
  currency?: string;
  created_at: string;
  updated_at: string;
}

export interface WithdrawalRecord {
  id: string;
  wallet_id: string;
  user_id: string;
  amount: number;
  status: string;
  payout_method: string | null;
  payout_reference: string | null;
  provider_reference: string | null;
  notes: string | null;
  currency: string;
  requested_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface WalletTransactionRecord {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  reference_id?: string | null;
  status: TransactionStatus;
  created_at: string;
}

export interface CreateMarketplaceRequestPayload {
  vendor_id: string;
  event_id: string;
  services?: string[];
  description: string;
}

export interface NegotiationActionPayload {
  amount: number;
  message?: string;
}

export interface WalletDepositPayload {
  amount: number;
}

// ─── Phase 2: Venue Listing Types ────────────────────────────────────────────

export interface VenueListingVendorSummary {
  vendor_id: string;
  vendor_user_id: string;
  business_name: string | null;
  vendor_name?: string | null;
  business_category?: string | null;
  location?: string | null;
}

export interface VenueListingRecord {
  id: string;
  vendor_id: string;
  vendor_user_id: string;
  venue_name: string;
  city: string;
  location: string | null;
  capacity: number;
  pricing_type: string;
  base_price: number | null;
  deposit_amount: number | null;
  currency: string;
  is_reservable: boolean;
  description: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  vendor?: VenueListingVendorSummary | null;
}

export interface VenueListingSearchResult {
  id: string;
  venue_name: string;
  city: string;
  location: string | null;
  capacity: number;
  estimated_cost: number | null;
  deposit_amount: number | null;
  currency: string;
  available: boolean;
  is_reservable: boolean;
  description: string | null;
  notes: string | null;
  vendor: VenueListingVendorSummary | null;
}

export interface VenueListingCreatePayload {
  venue_name: string;
  city: string;
  location?: string;
  capacity: number;
  pricing_type?: string;
  base_price?: number;
  deposit_amount?: number;
  currency?: string;
  is_reservable?: boolean;
  description?: string;
  notes?: string;
}

export interface VenueReservationProviderResponsePayload {
  action: 'accept' | 'decline' | 'offer_alternative';
  response_notes?: string;
  proposed_start?: string;
  proposed_end?: string;
  proposed_cost?: number;
  proposed_deposit_amount?: number;
}
