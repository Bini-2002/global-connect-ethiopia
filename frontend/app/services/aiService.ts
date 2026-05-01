import { api } from '../lib/api';
import { ChatbotResponse, AiFaqItem } from '../types/ai';

export const aiService = {
  chatWithLicensingAssistant: async (
    query: string,
    sessionId?: string | null
  ): Promise<ChatbotResponse> => {
    return api.post<ChatbotResponse>('/ai/chatbot/licensing', {
      query,
      session_id: sessionId || null,
    });
  },

  getChatHistory: async (): Promise<any[]> => {
    return api.get<any[]>('/ai/chatbot/history');
  },

  getFaq: async (): Promise<AiFaqItem[]> => {
    return api.get<AiFaqItem[]>('/ai/faq');
  },
  
  getProviderStatus: async (): Promise<any> => {
    return api.get<any>('/ai/providers/status');
  },
  
  enableMockMode: async (): Promise<any> => {
    return api.post<any>('/ai/mock-mode/enable', {});
  },

  disableMockMode: async (): Promise<any> => {
    return api.post<any>('/ai/mock-mode/disable', {});
  }
};

export default aiService;
