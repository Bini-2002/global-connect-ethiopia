'use client';

import React, { useState, useRef, useEffect } from 'react';
import aiService from '@/app/services/aiService';
import { ChatMessage } from '@/app/types/ai';
import AIAssistantIcon from '@/components/AIAssistantIcon';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { direction: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await aiService.chatWithLicensingAssistant(userMessage, sessionId);
      
      if (!sessionId) {
        setSessionId(response.session_id);
      }

      setMessages(prev => [
        ...prev,
        {
          direction: 'assistant',
          text: response.answer,
          citations: response.citations,
          form_link: response.form_link,
        }
      ]);
      
      if (response.fallback_action === 'mailto_contact') {
        setMessages(prev => [
          ...prev,
          {
            direction: 'assistant',
            text: 'It seems I cannot answer this. Would you like to contact a ministry official?',
            form_link: 'mailto:ministry-support@example.com' // Using form_link to pass mailto for simplicity
          }
        ]);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          direction: 'assistant',
          text: 'I am currently unavailable. Please check our FAQ page.',
          form_link: '/faq'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[500px] transition-all duration-300">
          {/* Header */}
          <div className="bg-[#062E22] text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <AIAssistantIcon className="w-5 h-5" />
              </div>
              <div>
              <h3 className="font-semibold text-sm">Help & Regulations</h3>
              <p className="text-xs text-green-200 opacity-80">AI Licensing Assistant</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-red-200 transition-colors"
              aria-label="Close chatbot"
              title="Close chatbot"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.length === 0 && (
              <div className="text-center text-sm text-slate-500 mt-4">
                <p>Hello! I can help you with Ethiopian licensing and event-approval guidance. Ask me anything!</p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.direction === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                  msg.direction === 'user' 
                    ? 'bg-[#062E22] text-white rounded-br-none' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  
                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                      <p className="font-semibold mb-1">Citations:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        {msg.citations.map((cit, cidx) => (
                          <li key={cidx}>
                            {cit.title} ({cit.source_reference})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Form / Mailto Link */}
                  {msg.form_link && (
                    <div className="mt-3">
                      <a 
                        href={msg.form_link}
                        className="inline-block text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded hover:bg-indigo-100 transition-colors"
                      >
                        {msg.form_link.startsWith('mailto') ? 'Contact Ministry' : (msg.form_link.startsWith('/faq') ? 'View FAQ' : 'Open Form')}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-lg rounded-bl-none p-3 shadow-sm">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Disclaimer */}
          <div className="px-4 py-2 bg-slate-100 border-t border-slate-200">
             <p className="text-[10px] text-slate-500 text-center">
               This is AI-generated advisory guidance. Please consult official ministry channels for formal legal certainty.
             </p>
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-slate-200 flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a licensing question..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22] focus:border-transparent text-slate-900"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="bg-[#062E22] text-white p-2 rounded-lg hover:bg-[#0a4533] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="Send message"
              title="Send message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#062E22] text-white rounded-full flex items-center justify-center shadow-xl hover:bg-[#0a4533] transition-transform hover:scale-105"
        aria-label={isOpen ? 'Close chatbot' : 'Open chatbot'}
        title={isOpen ? 'Close chatbot' : 'Open chatbot'}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <AIAssistantIcon className="w-6 h-6" />
        )}
      </button>
    </div>
  );
}
