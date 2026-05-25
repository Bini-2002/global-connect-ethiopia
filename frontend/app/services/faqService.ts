import { api } from '../lib/api';
import { AiFaqItem, FaqQuestion } from '../types/ai';

export const faqService = {
  getFaqs: async (): Promise<AiFaqItem[]> => {
    return api.get<AiFaqItem[]>('/faq');
  },

  askFaq: async (question: string): Promise<{ message: string }> => {
    return api.post<{ message: string }>('/faq/ask', { question });
  },

  getFaqQuestions: async (): Promise<FaqQuestion[]> => {
    return api.get<FaqQuestion[]>('/faq/questions');
  },

  answerFaqQuestion: async (questionId: string, answer: string): Promise<AiFaqItem> => {
    return api.post<AiFaqItem>(`/faq/questions/${questionId}/answer`, { answer });
  },
};

export default faqService;
