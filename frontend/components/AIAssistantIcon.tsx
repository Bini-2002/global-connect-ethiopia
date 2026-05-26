'use client';

import { Bot } from 'lucide-react';

interface AIAssistantIconProps {
  className?: string;
}

export default function AIAssistantIcon({ className = 'w-5 h-5' }: AIAssistantIconProps) {
  return <Bot className={className} aria-hidden="true" />;
}