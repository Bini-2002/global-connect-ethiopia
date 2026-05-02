'use client';

import React, { useState, useEffect, useRef } from 'react';
import aiService from '@/app/services/aiService';
import { ChatbotResponse, ChatMessage, AiFaqItem } from '@/app/types/ai';

export default function FaqPage() {
  const [faqs, setFaqs] = useState<AiFaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const data = await aiService.getFaq();
        setFaqs(data);
      } catch (error) {
        console.error('Failed to fetch FAQs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-6">Frequently Asked Questions</h1>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : faqs.length === 0 ? (
          <p className="text-slate-600">No FAQs available at the moment.</p>
        ) : (
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{faq.question}</h3>
                <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-8 bg-indigo-50 p-6 rounded-lg border border-indigo-100">
          <h3 className="text-lg font-semibold text-indigo-900 mb-2">Still need help?</h3>
          <p className="text-indigo-700 mb-4">If you cannot find the answer to your question, please reach out to our ministry officials.</p>
          <a 
            href="mailto:ministry-support@example.com" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Contact Ministry Official
          </a>
        </div>
      </div>
    </div>
  );
}
