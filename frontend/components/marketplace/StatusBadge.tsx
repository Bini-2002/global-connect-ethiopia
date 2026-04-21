'use client';

import { ContractStatus, RequestStatus } from '@/app/types/marketplace';

interface StatusBadgeProps {
  status: ContractStatus | RequestStatus;
}

const badgeStyles: Record<ContractStatus | RequestStatus, string> = {
  REQUESTED: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  QUOTED: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  NEGOTIATING: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  AGREED: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  FUNDED: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  COMPLETED: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  PAID: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${badgeStyles[status]}`}
    >
      {status}
    </span>
  );
}
