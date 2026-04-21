'use client';

import Link from 'next/link';
import { FileText, Sparkles } from 'lucide-react';
import Image from 'next/image';
interface ProposalSidebarProps {
  isAIModalOpen: boolean;
  onOpenAIModal: () => void;
}

export default function ProposalSidebar({ isAIModalOpen, onOpenAIModal }: ProposalSidebarProps) {
  return (
    <div className="hidden lg:block lg:w-80 xl:w-96 space-y-6">
      {/* Licensing Regulations */}
      <div 
        className="p-8 flex-col flex gap-4 rounded-xl shadow-lg" 
        style={{ background: "linear-gradient(135deg, #35554C 0%, #010C27 70%, #EC5B13 100%)" }}
      >
        <h2 className="text-xl font-bold text-white flex gap-3 items-center">
          <Image src="/lic.png" height={28} width={28} alt="" /> 
          Licensing Regulations
        </h2>
        <ul className="mt-4 space-y-3 font-light text-white/90 text-sm leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="text-[#EC5B13]">•</span>
            All events must be submitted at least 21 business days before the event date.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#EC5B13]">•</span>
            Noise permits must be obtained separately from the Addis Ababa Environmental Bureau.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#EC5B13]">•</span>
            Foreign performers require additional visa clearances from Immigration.
          </li>
        </ul>
        <Link href='/read' className="text-[#EC5B13] font-semibold hover:underline mt-2 inline-block">
          Read Proclamation No. 1234/2021 →
        </Link>
      </div>

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
          className="w-full px-4 py-3 bg-white text-[#062E22] rounded-lg hover:bg-gray-100 font-semibold transition-colors"
          onClick={onOpenAIModal}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

interface MobileLicensingCardProps {
  onOpenAIModal: () => void;
}

export function MobileLicensingCard({ onOpenAIModal }: MobileLicensingCardProps) {
  return (
    <div className="block lg:hidden space-y-4 mb-6">
      <div className="p-6 rounded-xl shadow-lg" style={{ background: "linear-gradient(135deg, #35554C 0%, #010C27 70%, #EC5B13 100%)" }}>
        <h2 className="text-lg font-bold text-white flex gap-2 mb-3">
          <Image src='/lic.png' height={25} width={25} alt="" /> 
          Licensing Regulations
        </h2>
        <ul className="mt-3 space-y-2 text-white/90 text-sm font-light">
          <li>• Submit 21 business days before event</li>
          <li>• Noise permits from Environmental Bureau</li>
        </ul>
        <Link href='/read' className="text-[#EC5B13] text-sm block mt-3 font-semibold">
          Read Proclamation No. 1234/2021 →
        </Link>
      </div>
    </div>
  );
}

interface FloatingAIButtonProps {
  onOpenAIModal: () => void;
}

export function FloatingAIButton({ onOpenAIModal }: FloatingAIButtonProps) {
  return (
    <div className="fixed bottom-6 md:bottom-40 right-6 z-50">
      <div className="relative group">
        <Image 
          width={60} 
          height={60} 
          alt='AI Assistant' 
          src='/ai.png' 
          className="cursor-pointer hover:opacity-90 transition" 
          onClick={onOpenAIModal}
        />
        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-[#062E22] text-white text-sm rounded-lg p-2 whitespace-nowrap">
          Ask AI Assistant
        </div>
      </div>
    </div>
  );
}
