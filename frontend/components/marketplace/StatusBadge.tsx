'use client';

import { ContractStatus, RequestStatus } from '@/app/types/marketplace';

interface StatusBadgeProps {
  status: ContractStatus | RequestStatus | string;
}

const badgeStyles: Record<string, string> = {
  // Request statuses
  REQUESTED: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  QUOTED: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  NEGOTIATING: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  // Phase 2 contract statuses
  draft: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  pending_signatures: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  completed: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  cancelled: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending_signatures: 'Pending Signatures',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  REQUESTED: 'Requested',
  QUOTED: 'Quoted',
  NEGOTIATING: 'Negotiating',
  ACCEPTED: 'Accepted',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = badgeStyles[status] ?? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';
  const label = statusLabels[status] ?? status;
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${style}`}
    >
      {label}
    </span>
  );
}

