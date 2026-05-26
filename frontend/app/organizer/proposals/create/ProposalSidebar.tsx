'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import Image from 'next/image';
import AIAssistantIcon from '@/components/AIAssistantIcon';
interface ProposalSidebarProps {
  isAIModalOpen: boolean;
  onOpenAIModal: () => void;
}

export default function ProposalSidebar({ 
  isAIModalOpen: _isAIModalOpen, 
  onOpenAIModal: _onOpenAIModal 
}: ProposalSidebarProps) {
  return (
    <div className="hidden lg:block lg:w-80 xl:w-96 space-y-6">
      {/* Help & Resources */}
      <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
        <h2 className="text-lg font-bold text-[#062E22] mb-4">Help & Resources</h2>
        <a
          href="/sample-proposal-template.pdf"
          download
          className="flex items-center gap-2 text-gray-600 text-sm hover:text-[#062E22] transition-colors"
        >
          <FileText className="w-4 h-4" />
          Sample Proposal Template (PDF, 1.3MB)
        </a>
      </div>

      {/* AI Assistant */}
      <div className="bg-[#062E22] text-white rounded-xl p-6 space-y-3 shadow-lg flex flex-col items-center text-center">
        <span className="font-bold text-lg">Ask AI Assistant</span>
        <p className="mb-2 text-white/80 text-sm">
          Need help creating your event proposal? I'm here to assist you.
        </p>
        <button 
          className="w-full px-4 py-3 bg-white text-[#062E22] rounded-lg hover:bg-gray-100 font-semibold transition-colors flex items-center justify-center gap-2"
          onClick={onOpenAIModal}
        >
          <AIAssistantIcon className="h-4 w-4" />
          Get Started
        </button>
      </div>
    </div>
  );
}

interface MobileLicensingCardProps {
  onOpenAIModal: () => void;
}

export function MobileLicensingCard({ onOpenAIModal: _onOpenAIModal }: MobileLicensingCardProps) {
  return null;
}

interface FloatingAIButtonProps {
  onOpenAIModal: () => void;
}

export function FloatingAIButton({ onOpenAIModal }: FloatingAIButtonProps) {
  return (
    <div className="fixed bottom-6 md:bottom-40 right-6 z-50">
      <div className="relative group">
        <button
          type="button"
          aria-label="Open AI assistant"
          onClick={onOpenAIModal}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#062E22] text-white shadow-xl transition hover:scale-105 hover:bg-[#0a4533]"
        >
          <AIAssistantIcon className="h-6 w-6" />
        </button>
        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-[#062E22] text-white text-sm rounded-lg p-2 whitespace-nowrap">
          Ask AI Assistant
        </div>
      </div>
    </div>
  );
}
