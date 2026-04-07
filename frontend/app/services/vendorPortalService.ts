import { api } from '../lib/api';
import {
  RequestDecisionPayload,
  VendorContractRecord,
  VendorPortalSummary,
  VendorRequestRecord,
  VendorServiceCreatePayload,
  VendorServiceRecord,
} from '../types/marketplace';

function buildServiceFormData(payload: VendorServiceCreatePayload): FormData {
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('description', payload.description);
  formData.append('category', payload.category);
  formData.append('price_min', String(payload.price_min));
  formData.append('price_max', String(payload.price_max));
  formData.append('pricing_type', payload.pricing_type);
  formData.append('location', payload.location);

  if (payload.tags?.length) {
    formData.append('tags', payload.tags.join(','));
  }

  if (payload.image_urls?.length) {
    formData.append('images', payload.image_urls.join(','));
  }

  if (payload.availability?.trim()) {
    formData.append('availability', payload.availability.trim());
  }

  return formData;
}

export const vendorPortalService = {
  getPortalSummary: async (): Promise<VendorPortalSummary> => {
    return api.get<VendorPortalSummary>('/vendors/portal/summary');
  },

  getMyServices: async (): Promise<VendorServiceRecord[]> => {
    return api.get<VendorServiceRecord[]>('/vendors/services/me');
  },

  createService: async (payload: VendorServiceCreatePayload): Promise<VendorServiceRecord> => {
    return api.post<VendorServiceRecord>('/vendors/services', buildServiceFormData(payload));
  },

  getRequests: async (): Promise<VendorRequestRecord[]> => {
    return api.get<VendorRequestRecord[]>('/requests/vendor');
  },

  getRequestById: async (requestId: string): Promise<VendorRequestRecord> => {
    return api.get<VendorRequestRecord>(`/requests/${requestId}`);
  },

  counterOfferRequest: async (
    requestId: string,
    payload: RequestDecisionPayload
  ): Promise<VendorRequestRecord> => {
    return api.post<VendorRequestRecord>(`/requests/${requestId}/counter-offer`, payload);
  },

  acceptRequest: async (
    requestId: string,
    payload?: RequestDecisionPayload
  ): Promise<VendorRequestRecord> => {
    return api.post<VendorRequestRecord>(`/requests/${requestId}/accept`, payload);
  },

  rejectRequest: async (requestId: string): Promise<VendorRequestRecord> => {
    return api.post<VendorRequestRecord>(`/requests/${requestId}/reject`);
  },

  getContracts: async (): Promise<VendorContractRecord[]> => {
    return api.get<VendorContractRecord[]>('/contracts/vendor');
  },

  getContractById: async (contractId: string): Promise<VendorContractRecord> => {
    return api.get<VendorContractRecord>(`/contracts/${contractId}`);
  },

  signContract: async (
    contractId: string,
    signatureName?: string
  ): Promise<VendorContractRecord> => {
    return api.post<VendorContractRecord>(`/contracts/${contractId}/sign`, {
      signature_name: signatureName || undefined,
    });
  },
};

export default vendorPortalService;
