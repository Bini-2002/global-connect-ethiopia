import { api } from '../lib/api';
import {
  VendorPortalSummary,
  VendorServiceCreatePayload,
  VendorServiceRecord,
} from '../types/marketplace';

function buildServiceFormData(payload: VendorServiceCreatePayload): FormData {
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('description', payload.description);
  formData.append('category', payload.category);
  formData.append('pricing_type', payload.pricing_type);
  formData.append('location', payload.location);

  if (payload.tags?.length) {
    formData.append('tags', payload.tags.join(','));
  }

  if (payload.image_urls?.length) {
    formData.append('images', payload.image_urls.join(','));
  }

  if (payload.image_files?.length) {
    payload.image_files.forEach((file) => {
      formData.append('image_files', file);
    });
  }

  if (payload.availability?.trim()) {
    formData.append('availability', payload.availability.trim());
  }

  if (payload.service_details?.trim()) {
    formData.append('service_details', payload.service_details.trim());
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

  updateService: async (serviceId: string, payload: VendorServiceCreatePayload): Promise<VendorServiceRecord> => {
    return api.put<VendorServiceRecord>(`/vendors/services/${serviceId}`, buildServiceFormData(payload));
  },
};

export default vendorPortalService;
