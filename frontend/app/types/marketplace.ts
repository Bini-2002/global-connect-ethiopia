export type RequestStatus = 'REQUESTED' | 'QUOTED' | 'NEGOTIATING' | 'ACCEPTED';
export type NegotiationMessageType = 'QUOTE' | 'COUNTER';
export type ContractStatus = 'AGREED' | 'FUNDED' | 'COMPLETED' | 'PAID';
export type EscrowStatus = 'NONE' | 'LOCKED' | 'RELEASED';
export type PaymentStatus = 'PENDING' | 'PAID';
export type TransactionType = 'DEPOSIT' | 'ESCROW_LOCK' | 'RELEASE' | 'REFUND' | 'COMMISSION';
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
  availability?: string;
}

export interface MarketplaceVendorRecord {
  id: string;
  user_id: string;
  business_name: string;
  services: string[];
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

export interface MarketplaceContractRecord {
  id: string;
  request_id: string;
  organizer_id: string;
  vendor_id: string;
  price: number;
  status: ContractStatus;
  escrow_status: EscrowStatus;
  payment_status: PaymentStatus;
  organizer_name?: string | null;
  vendor_business_name?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  funded_at?: string | null;
  paid_at?: string | null;
}

export interface WalletRecord {
  id: string;
  user_id: string;
  balance: number;
  locked_balance: number;
  created_at: string;
  updated_at: string;
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
  event_id?: string | null;
  description: string;
}

export interface NegotiationActionPayload {
  amount: number;
  message?: string;
}

export interface WalletDepositPayload {
  amount: number;
}
