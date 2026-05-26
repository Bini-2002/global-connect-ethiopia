'use client';

import AIAssistantIcon from '@/components/AIAssistantIcon';

interface AIFloatingButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function AIFloatingButton({ isOpen, onToggle }: AIFloatingButtonProps) {
  return (
    <div className="fixed bottom-8 right-8 z-40">
      <button
        onClick={onToggle}
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
