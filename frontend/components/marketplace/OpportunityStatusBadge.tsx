'use client';

import { OpportunityStatus, OpportunityProposalStatus } from '@/app/types/opportunity';

interface OpportunityStatusBadgeProps {
  status: OpportunityStatus | OpportunityProposalStatus | string;
}

const badgeStyles: Record<string, string> = {
  draft: 'bg-slate-50 text-slate-700 ring-1 ring-slate-200',
  published: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  closed: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300',
  awarded: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  contracted: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300',
  cancelled: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  expired: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',

  submitted: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  client_countered: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  vendor_countered: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  selected: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  rejected: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  withdrawn: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300',
  converted: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300',
};

export default function OpportunityStatusBadge({ status }: OpportunityStatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  const style = badgeStyles[normalizedStatus] || 'bg-slate-50 text-slate-700 ring-1 ring-slate-200';
  
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${style}`}
    >
      {normalizedStatus.replace('_', ' ')}
    </span>
  );
}
