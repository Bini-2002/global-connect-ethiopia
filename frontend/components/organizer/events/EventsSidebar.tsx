'use client';

import { EventListItem, ApprovedProposal } from '@/app/types/event';

interface EventsSidebarProps {
  events: EventListItem[];
  approvedProposals: ApprovedProposal[];
}

export default function EventsSidebar({ events, approvedProposals }: EventsSidebarProps) {
  return null;
}
