import { api } from '@/app/lib/api';
import {
  CreateMarketplaceRequestPayload,
  MarketplaceContractRecord,
  MarketplaceRequestRecord,
  MarketplaceVendorRecord,
  NegotiationActionPayload,
  VenueListingCreatePayload,
  VenueListingRecord,
  VenueListingSearchResult,
  VenueReservationProviderResponsePayload,
  WalletDepositPayload,
  WalletRecord,
  WalletTransactionRecord,
} from '@/app/types/marketplace';
import { VenueReservationRecord } from '@/app/types/event';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export const marketplaceService = {
  // ─── Vendors ────────────────────────────────────────────────────────────────
  listVendors: async (): Promise<MarketplaceVendorRecord[]> => {
    return api.get<MarketplaceVendorRecord[]>('/vendors');
  },

  getVendorById: async (vendorId: string): Promise<MarketplaceVendorRecord> => {
    return api.get<MarketplaceVendorRecord>(`/vendors/${vendorId}`);
  },

  // ─── Requests ───────────────────────────────────────────────────────────────
  createRequest: async (payload: CreateMarketplaceRequestPayload): Promise<MarketplaceRequestRecord> => {
    return api.post<MarketplaceRequestRecord>('/requests', payload);
  },

  listRequests: async (): Promise<MarketplaceRequestRecord[]> => {
    return api.get<MarketplaceRequestRecord[]>('/requests');
  },

  getRequestById: async (requestId: string): Promise<MarketplaceRequestRecord> => {
    return api.get<MarketplaceRequestRecord>(`/requests/${requestId}`);
  },

  sendQuote: async (
    requestId: string,
    payload: NegotiationActionPayload,
  ): Promise<MarketplaceRequestRecord> => {
    return api.post<MarketplaceRequestRecord>(`/requests/${requestId}/quote`, payload);
  },

  sendCounter: async (
    requestId: string,
    payload: NegotiationActionPayload,
  ): Promise<MarketplaceRequestRecord> => {
    return api.post<MarketplaceRequestRecord>(`/requests/${requestId}/counter`, payload);
  },

  acceptRequest: async (requestId: string): Promise<MarketplaceContractRecord> => {
    return api.post<MarketplaceContractRecord>(`/contracts/${requestId}/accept`);
  },

  // ─── Contracts ──────────────────────────────────────────────────────────────
  listContracts: async (): Promise<MarketplaceContractRecord[]> => {
    return api.get<MarketplaceContractRecord[]>('/contracts');
  },

  getContractById: async (contractId: string): Promise<MarketplaceContractRecord> => {
    return api.get<MarketplaceContractRecord>(`/contracts/${contractId}`);
  },

  /** Phase 2: organizer signs the contract */
  signContractAsOrganizer: async (contractId: string): Promise<MarketplaceContractRecord> => {
    return api.post<MarketplaceContractRecord>(`/contracts/${contractId}/sign/organizer`);
  },

  /** Phase 2: vendor signs the contract */
  signContractAsVendor: async (contractId: string): Promise<MarketplaceContractRecord> => {
    return api.post<MarketplaceContractRecord>(`/contracts/${contractId}/sign/vendor`);
  },

  /** Phase 2: returns the full URL for downloading contract PDF (use as href) */
  getContractPdfUrl: (contractId: string): string => {
    return `${API_BASE}/api/v1/contracts/${contractId}/pdf`;
  },

  fundContract: async (contractId: string): Promise<MarketplaceContractRecord> => {
    return api.post<MarketplaceContractRecord>(`/contracts/${contractId}/fund`);
  },

  completeContract: async (contractId: string): Promise<MarketplaceContractRecord> => {
    return api.post<MarketplaceContractRecord>(`/contracts/${contractId}/complete`);
  },

  releaseContract: async (contractId: string): Promise<MarketplaceContractRecord> => {
    return api.post<MarketplaceContractRecord>(`/contracts/${contractId}/release`);
  },

  refundContract: async (contractId: string): Promise<MarketplaceContractRecord> => {
    return api.post<MarketplaceContractRecord>(`/contracts/${contractId}/refund`);
  },

  cancelContract: async (contractId: string): Promise<MarketplaceContractRecord> => {
    return api.post<MarketplaceContractRecord>(`/contracts/${contractId}/cancel`);
  },

  // ─── Wallet ─────────────────────────────────────────────────────────────────
  getWallet: async (): Promise<WalletRecord> => {
    return api.get<WalletRecord>('/wallet/me');
  },

  depositWallet: async (payload: WalletDepositPayload): Promise<WalletRecord> => {
    return api.post<WalletRecord>('/wallet/deposit', payload);
  },

  listWalletTransactions: async (): Promise<WalletTransactionRecord[]> => {
    return api.get<WalletTransactionRecord[]>('/wallet/transactions');
  },

  // ─── Phase 2: Venue Listings ─────────────────────────────────────────────────
  /** Public search — no auth required for listings */
  searchVenueListings: async (params?: {
    city?: string;
    min_capacity?: number;
    max_base_price?: number;
    q?: string;
    limit?: number;
  }): Promise<VenueListingSearchResult[]> => {
    const query = new URLSearchParams();
    if (params?.city) query.set('city', params.city);
    if (params?.min_capacity) query.set('min_capacity', String(params.min_capacity));
    if (params?.max_base_price) query.set('max_base_price', String(params.max_base_price));
    if (params?.q) query.set('q', params.q);
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return api.get<VenueListingSearchResult[]>(`/venue-listings/search${qs ? '?' + qs : ''}`);
  },

  /** Vendor: list their own venue listings */
  listMyVenueListings: async (): Promise<VenueListingRecord[]> => {
    return api.get<VenueListingRecord[]>('/venue-listings/me');
  },

  /** Vendor: create a new venue listing */
  createVenueListing: async (payload: VenueListingCreatePayload): Promise<VenueListingRecord> => {
    return api.post<VenueListingRecord>('/venue-listings', payload);
  },

  /** Vendor: update a venue listing */
  updateVenueListing: async (
    id: string,
    payload: Partial<VenueListingCreatePayload>
  ): Promise<VenueListingRecord> => {
    return api.put<VenueListingRecord>(`/venue-listings/${id}`, payload);
  },

  /** Vendor: view incoming reservation requests against their listings */
  listProviderReservations: async (): Promise<VenueReservationRecord[]> => {
    return api.get<VenueReservationRecord[]>('/venue-listings/reservations/me');
  },

  /** Vendor: respond to a reservation (accept / decline / offer_alternative) */
  respondToReservation: async (
    reservationId: string,
    payload: VenueReservationProviderResponsePayload
  ): Promise<VenueReservationRecord> => {
    return api.post<VenueReservationRecord>(
      `/venue-listings/reservations/${reservationId}/respond`,
      payload
    );
  },
};

export default marketplaceService;
export default marketplaceService;
