'use client';

import Link from 'next/link';

import { formatCurrency, formatDateTime, getRequestSubheadline } from '@/app/lib/marketplace';
import { MarketplaceRequestRecord } from '@/app/types/marketplace';
import StatusBadge from '@/components/marketplace/StatusBadge';

interface RequestCardProps {
  href: string;
  request: MarketplaceRequestRecord;
  role: 'organizer' | 'vendor';
}

export default function RequestCard({ href, request, role }: RequestCardProps) {
  const headline = role === 'organizer'
    ? request.vendor_business_name || 'Selected vendor'
    : request.organizer_name || 'Organizer';

  return (
    <Link
      href={href}
      className="group block rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={request.status} />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              {role === 'organizer' ? 'Organizer View' : 'Vendor View'}
            </span>
          </div>

          <h2 className="mt-4 text-2xl font-bold text-[#062E22]">{headline}</h2>
          <p className="mt-2 text-sm font-medium text-slate-500">{getRequestSubheadline(request)}</p>
          <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-600">{request.description}</p>
        </div>

        <div className="min-w-[220px] rounded-[24px] bg-slate-50 px-4 py-4 text-sm text-slate-600">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Current amount</p>
          <p className="mt-1 text-lg font-bold text-[#062E22]">{formatCurrency(request.current_amount)}</p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-slate-400">
            {role === 'organizer' ? 'Vendor' : 'Organizer'}
          </p>
          <p className="mt-1 font-semibold text-[#062E22]">
            {role === 'organizer'
              ? request.vendor_business_name || 'Selected vendor'
              : request.organizer_name || 'Organizer'}
          </p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-slate-400">Updated</p>
          <p className="mt-1 font-medium text-slate-700">{formatDateTime(request.updated_at)}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-sm">
        <p className="text-slate-400">
          {request.messages.length} timeline item{request.messages.length === 1 ? '' : 's'}
        </p>
        <span className="font-semibold text-[#062E22] transition group-hover:text-[#EC5B13]">
          Open negotiation
        </span>
      </div>
    </Link>
  );
}
