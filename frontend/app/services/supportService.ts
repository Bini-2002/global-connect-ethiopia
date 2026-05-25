import { api } from '../lib/api';
import { SupportRequest } from '../types/support';

export const supportService = {
  submit: async (data: { name: string; email: string; subject: string; message: string }): Promise<SupportRequest> => {
    return api.post<SupportRequest>('/support', data);
  },

  getAll: async (): Promise<SupportRequest[]> => {
    return api.get<SupportRequest[]>('/support');
  },

  getById: async (id: string): Promise<SupportRequest> => {
    return api.get<SupportRequest>(`/support/${id}`);
  },

  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/support/${id}`);
  },
};

export default supportService;
