'use client';

import { useState, useEffect } from 'react';
import { Send, X, Circle } from 'lucide-react';
import AIAssistantIcon from '@/components/AIAssistantIcon';
import aiService from '@/app/services/aiService';
import { ChatbotCitation } from '@/app/types/ai';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations?: ChatbotCitation[];
  form_link?: string | null;
}

interface AIModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIModal({ isOpen, onClose }: AIModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: '1',
        role: 'assistant',
        content: `Hello! 👋 I'm your AI event planning assistant. How can I help you today?

**💡 Suggested Topics:**

• Help me plan a tech conference
• What permits do I need?
• Budget planning tips
• Recommended venues in Addis Ababa`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    void (async () => {
      try {
        const response = await aiService.chatWithLicensingAssistant(userMessage.content, sessionId);
        setSessionId(response.session_id);

        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.answer,
          timestamp: new Date(response.created_at),
          citations: response.citations,
          form_link: response.form_link,
        };

        setMessages(prev => [...prev, aiMessage]);
      } catch (error) {
        const fallbackMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: error instanceof Error
            ? error.message
            : 'I am currently unavailable. Please check our FAQ page.',
          timestamp: new Date(),
          form_link: '/faq',
        };

        setMessages(prev => [...prev, fallbackMessage]);
      } finally {
        setIsTyping(false);
      }
    })();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose}></div>
      
      <div className="relative bg-white w-full max-w-lg h-[500px] max-h-[70vh] flex flex-col overflow-hidden animate-slide-in-right shadow-2xl rounded-l-2xl">
        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-[#062E22] to-[#0B3A2E] text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <AIAssistantIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">AI Assistant</h2>
              <p className="text-xs text-green-200 flex items-center gap-1">
                <Circle className="w-1.5 h-1.5 fill-green-400 text-green-400" />
                Online
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition" aria-label="Close AI assistant" title="Close AI assistant">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-[#F8FAFC] space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-[#062E22] text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                    <p className="font-semibold mb-1">Citations:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {msg.citations.map((citation, cidx) => (
                        <li key={`${msg.id}-citation-${cidx}`}>
                          {citation.title} ({citation.source_reference})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {msg.form_link && (
                  <div className="mt-3">
                    <a
                      href={msg.form_link}
                      className="inline-block text-xs font-medium text-[#062E22] bg-green-50 px-3 py-1.5 rounded hover:bg-green-100 transition-colors"
                    >
                      {msg.form_link.startsWith('mailto') ? 'Contact Ministry' : msg.form_link.startsWith('/faq') ? 'View FAQ' : 'Open Form'}
                    </a>
                  </div>
                )}
                <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-green-200' : 'text-gray-400'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-xl rounded-bl-sm px-3 py-2 shadow-sm">
                <div className="flex gap-1">
                  <div className="typing-dot typing-dot-1 w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="typing-dot typing-dot-2 w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="typing-dot typing-dot-3 w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 bg-white border-t border-gray-200 flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2.5 bg-[#F1F5F9] rounded-full border-2 border-transparent focus:border-[#062E22] focus:outline-none transition text-sm"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-10 h-10 bg-[#062E22] text-white rounded-full flex items-center justify-center hover:bg-[#0B3A2E] transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              aria-label="Send message"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .typing-dot-2 {
          animation-delay: 0.1s;
        }
        .typing-dot-3 {
          animation-delay: 0.2s;
        }
      `}</style>
    </div>
  );
}

export function AIFloatingButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="fixed bottom-8 right-8 z-40">
      <button
        onClick={onClick}
        className="relative group flex h-14 w-14 items-center justify-center rounded-full bg-[#062E22] text-white shadow-xl transition hover:scale-105 hover:bg-[#0a4533]"
      >
        <AIAssistantIcon className="h-6 w-6" />
        <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-[#062E22] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
          Chat with AI
        </div>
      </button>
    </div>
  );
}
