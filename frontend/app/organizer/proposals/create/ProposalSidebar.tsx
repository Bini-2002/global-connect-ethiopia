'use client';

import { FileText } from 'lucide-react';

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

export function FloatingAIButton({ onOpenAIModal: _onOpenAIModal }: FloatingAIButtonProps) {
  return null;
}
