'use client';

import Image from 'next/image';

interface AIFloatingButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function AIFloatingButton({ isOpen, onToggle }: AIFloatingButtonProps) {
  return (
    <div className="fixed bottom-8 right-8 z-40">
      <button
        onClick={onToggle}
        className="relative group"
      >
        <Image
          src="/ai.png"
          alt="AI Assistant"
          width={100}
          height={40}
          className="cursor-pointer hover:scale-110 transition-transform drop-shadow-lg"
        />
        <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-[#062E22] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
          Chat with AI
        </div>
      </button>
    </div>
  );
}
