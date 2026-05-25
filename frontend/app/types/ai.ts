export interface ChatbotCitation {
  title: string;
  source_reference: string;
}

export interface ChatbotResponse {
  session_id: string;
  answer: string;
  citations: ChatbotCitation[];
  form_link?: string | null;
  disclaimer: string;
  fallback_action?: string | null;
  provider: string;
  created_at: string;
}

export interface ChatMessage {
  direction: 'user' | 'assistant';
  text: string;
  citations?: ChatbotCitation[];
  form_link?: string | null;
}

export interface AiFaqItem {
  question: string;
  answer: string;
}

export interface FaqQuestion {
  id: string;
  question: string;
  status: string;
  answer?: string;
  created_at: string;
}
