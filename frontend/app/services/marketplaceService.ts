import { api } from '@/app/lib/api';
import {
  CreateMarketplaceRequestPayload,
  MarketplaceContractRecord,
  MarketplaceRequestRecord,
  MarketplaceVendorRecord,
  NegotiationActionPayload,
  WalletDepositPayload,
  WalletRecord,
  WalletTransactionRecord,
} from '@/app/types/marketplace';

export const marketplaceService = {
  listVendors: async (): Promise<MarketplaceVendorRecord[]> => {
    return api.get<MarketplaceVendorRecord[]>('/vendors');
  },

  getVendorById: async (vendorId: string): Promise<MarketplaceVendorRecord> => {
    return api.get<MarketplaceVendorRecord>(`/vendors/${vendorId}`);
  },

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

  listContracts: async (): Promise<MarketplaceContractRecord[]> => {
    return api.get<MarketplaceContractRecord[]>('/contracts');
  },

  getContractById: async (contractId: string): Promise<MarketplaceContractRecord> => {
    return api.get<MarketplaceContractRecord>(`/contracts/${contractId}`);
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

  getWallet: async (): Promise<WalletRecord> => {
    return api.get<WalletRecord>('/wallet/me');
  },

  depositWallet: async (payload: WalletDepositPayload): Promise<WalletRecord> => {
    return api.post<WalletRecord>('/wallet/deposit', payload);
  },

  listWalletTransactions: async (): Promise<WalletTransactionRecord[]> => {
    return api.get<WalletTransactionRecord[]>('/wallet/transactions');
  },
};

export default marketplaceService;
