import { api } from '../lib/api';
import {
  VendorPortalSummary,
  VendorServiceCreatePayload,
  VendorServiceRecord,
} from '../types/marketplace';

let servicesCache: VendorServiceRecord[] | null = null;

interface CreateServiceInput {
  payload: VendorServiceCreatePayload;
  files?: File[];
}

interface UpdateServicePayload {
  title?: string;
  description?: string;
  category?: string;
  price_min?: number;
  price_max?: number;
  pricing_type?: 'fixed' | 'negotiable';
  location?: string;
  tags?: string[];
  images?: string[];
  availability?: string;
  files?: File[];
}

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

function buildUpdateFormData(payload: UpdateServicePayload): FormData {
  const formData = new FormData();

  if (payload.title !== undefined) formData.append('title', payload.title);
  if (payload.description !== undefined) formData.append('description', payload.description);
  if (payload.category !== undefined) formData.append('category', payload.category);
  if (payload.location !== undefined) formData.append('location', payload.location);
  if (payload.pricing_type !== undefined) formData.append('pricing_type', payload.pricing_type);
  if (payload.price_min !== undefined) formData.append('price_min', String(payload.price_min));
  if (payload.price_max !== undefined) formData.append('price_max', String(payload.price_max));
  if (payload.tags !== undefined) formData.append('tags', payload.tags.join(','));
  if (payload.images !== undefined && payload.images.length > 0) formData.append('images', payload.images.join(','));
  if (payload.availability !== undefined) formData.append('availability', payload.availability);

  return formData;
}

export const updateService = async (id: string, payload: UpdateServicePayload): Promise<VendorServiceRecord> => {
  const formData = buildUpdateFormData(payload);

  if (payload.files && payload.files.length > 0) {
    payload.files.forEach((file) => {
      formData.append('image_files', file);
    });
  }

  const result = await api.put<VendorServiceRecord>(`/api/v1/vendors/services/${id}`, formData);
  if (servicesCache) {
    servicesCache = servicesCache.map(s => s.id === result.id ? result : s);
  }
  return result;
};

export const deleteService = async (id: string): Promise<{ message: string }> => {
  const result = await api.delete<{ message: string }>(`/api/v1/vendors/services/${id}`);
  if (servicesCache) {
    servicesCache = servicesCache.filter(s => s.id !== id);
  }
  return result;
};

export const vendorPortalService = {
  getPortalSummary: async (): Promise<VendorPortalSummary> => {
    return api.get<VendorPortalSummary>('/api/v1/vendors/portal/summary', { timeoutMs: 0 });
  },

  getMyServices: async (): Promise<VendorServiceRecord[]> => {
    if (servicesCache) {
      return servicesCache;
    }
    const data = await api.get<VendorServiceRecord[]>('/api/v1/vendors/services/me', { timeoutMs: 0 });
    servicesCache = data;
    return data;
  },

  createService: async ({ payload, files = [] }: CreateServiceInput): Promise<VendorServiceRecord> => {
    const formData = buildServiceFormData(payload);

    files.forEach((file) => {
      formData.append('image_files', file);
    });

    const result = await api.post<VendorServiceRecord>('/api/v1/vendors/services', formData);
    if (servicesCache) {
      servicesCache = [result, ...servicesCache];
    }
    return result;
  },
};

export default vendorPortalService;
