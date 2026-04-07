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

export interface RequestMessageSummary {
  sender_id: string;
  sender_role: string;
  sender_name?: string | null;
  body: string;
  message_type: string;
  created_at: string;
}

export interface VendorRequestRecord {
  id: string;
  proposal_id?: string | null;
  event_id?: string | null;
  event_title?: string | null;
  service_id: string;
  organizer_id: string;
  vendor_id: string;
  vendor_user_id: string;
  proposal_title?: string | null;
  service_title?: string | null;
  organizer_name?: string | null;
  vendor_name?: string | null;
  status: string;
  message: string;
  proposed_amount?: number | null;
  agreed_amount?: number | null;
  currency: string;
  event_date?: string | null;
  requirements?: string | null;
  decision_message?: string | null;
  messages: RequestMessageSummary[];
  created_at: string;
  updated_at: string;
}

export interface ContractPartySignature {
  signed: boolean;
  user_id?: string | null;
  name?: string | null;
  signed_at?: string | null;
}

export interface VendorContractRecord {
  id: string;
  request_id: string;
  proposal_id?: string | null;
  event_id?: string | null;
  service_id: string;
  organizer_id: string;
  vendor_id: string;
  vendor_user_id: string;
  title: string;
  scope: string;
  amount: number;
  currency: string;
  terms?: string | null;
  status: string;
  payment_status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  organizer_signature: ContractPartySignature;
  vendor_signature: ContractPartySignature;
  created_at: string;
  updated_at: string;
  signed_at?: string | null;
  completed_at?: string | null;
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

export interface RequestDecisionPayload {
  message?: string;
  final_amount?: number;
}
