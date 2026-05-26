'use client';

import { useState, useEffect } from 'react';
import { Send, X, Circle } from 'lucide-react';
import AIAssistantIcon from '@/components/AIAssistantIcon';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AI_RESPONSES: Record<string, string> = {
  'tech conference': `Great choice! 🎉 Here's how to plan an amazing tech conference:

**📋 Key Steps:**

1. **Define Your Theme** - What's the focus? (AI, Web3, General Tech?)
2. **Set Date & Duration** - Best time: Weekdays, 1-3 days
3. **Choose Venue** - Recommended: Addis Convention Center (capacity: 2000+)
4. **Create Proposal** - I'll help you draft one

**💰 Budget Estimate:**
• Small (500 people): 500K - 1M ETB
• Medium (1000 people): 1M - 3M ETB
• Large (5000+ people): 5M+ ETB

Would you like me to help you start creating your proposal?`,

  'permit': `Good question! 📋 Here are the permits you'll need:

**✅ Required Permits:**

1. **Event Permit** (Municipality)
   • Submit 60 days before event
   • Cost: ~5,000 ETB

2. **Police Clearance**
   • Security assessment
   • Traffic management plan

3. **Ministry Approval** (for 500+ attendees)
   • Ministry of Tourism/Culture

4. **Noise Permit** (if outdoor)
   • Environmental protection

5. **Fire Safety Certificate**
   • Venue compliance check

**📝 Timeline:**
• Start applications: 60-90 days before
• Processing: 14-30 days
• Follow up: 7 days before event

Need help with the application process?`,

  'venue': `Here are some popular venues in Addis Ababa 🏛️:

**🏆 Large Venues:**
• Millennium Hall - Capacity: 15,000 (ideal for concerts, festivals)
• Addis Convention Center - Capacity: 3,000 (perfect for conferences)
• African Union Conference Center - Capacity: 2,500 (prestigious events)

**🏠 Medium Venues:**
• Ethio-Russian Friendship Hall - Capacity: 1,500 (cultural events)
• Hyatt Regency Ballroom - Capacity: 800 (business events)
• Bole Community Center - Capacity: 500 (workshops, seminars)

**💡 Tips:**
• Book 3-6 months in advance
• Negotiate package deals (catering + AV)
• Check parking availability

Which venue type interests you?`,

  'budget': `Let me help you plan your budget 💰:

**📊 Typical Budget Breakdown:**

1. **Venue (30-40%)**
   • Large: 500K - 2M ETB
   • Medium: 100K - 500K ETB

2. **Catering (25-30%)**
   • Per person: 500 - 2000 ETB
   • Includes: Meals, drinks, snacks

3. **Marketing (15-20%)**
   • Social media ads
   • Printed materials
   • Influencer partnerships

4. **Equipment (10-15%)**
   • Sound system
   • Projector
   • Lighting

5. **Contingency (10%)**
   • Emergency fund

**💡 Money-Saving Tips:**
• Partner with sponsors
• Use local vendors
• Leverage social media

What type of event are you planning?`,

  'default': `I'm here to help! 👋 Here are some things I can assist you with:

**🎯 Popular Topics:**

• **Plan an Event** - From tech conferences to cultural festivals
• **Permits & Licenses** - Navigate the approval process
• **Budget Planning** - Optimize your spending
• **Venue Selection** - Find the perfect location
• **Timeline & Schedule** - Plan your milestones

**💡 Getting Started:**
Type your question or choose a topic above, and I'll provide detailed guidance!

Examples:
• "Help me plan a tech conference"
• "What permits do I need?"
• "Suggest venues for 500 people"`
};

interface AIModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIModal({ isOpen, onClose }: AIModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

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

    setTimeout(() => {
      setIsTyping(false);
      let response = AI_RESPONSES['default'];
      const lowerInput = input.toLowerCase();

      if (lowerInput.includes('tech') || lowerInput.includes('conference')) {
        response = AI_RESPONSES['tech conference'];
      } else if (lowerInput.includes('permit') || lowerInput.includes('license') || lowerInput.includes('approval')) {
        response = AI_RESPONSES['permit'];
      } else if (lowerInput.includes('venue') || lowerInput.includes('location') || lowerInput.includes('place')) {
        response = AI_RESPONSES['venue'];
      } else if (lowerInput.includes('budget') || lowerInput.includes('cost') || lowerInput.includes('price')) {
        response = AI_RESPONSES['budget'];
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    }, 1500);
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
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
