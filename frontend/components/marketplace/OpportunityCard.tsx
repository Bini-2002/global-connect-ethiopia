'use client';

import Link from 'next/link';

import { OpportunityRecord } from '@/app/types/opportunity';
import OpportunityStatusBadge from '@/components/marketplace/OpportunityStatusBadge';

function getLocationLabel(location: OpportunityRecord['location']): string {
  if (!location) return 'Addis Ababa';
  if (typeof location === 'string') return location;
  if ('city' in location && typeof location.city === 'string' && location.city.trim()) {
    return location.city;
  }
  return 'Addis Ababa';
}

interface OpportunityCardProps {
  href: string;
  opportunity: OpportunityRecord;
}

export default function OpportunityCard({ href, opportunity }: OpportunityCardProps) {
  const isInvited = opportunity.is_invited || opportunity.sourcing_mode === 'invite_only';

  return (
    <Link
      href={href}
      className="group block rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <OpportunityStatusBadge status={opportunity.status} />
            
            {isInvited ? (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
                Direct Invite
              </span>
            ) : (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                Open Bid
              </span>
            )}
            
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              {opportunity.category}
            </span>
          </div>

          <h2 className="mt-4 text-2xl font-bold text-[#062E22]">{opportunity.title}</h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            {opportunity.client_name || 'Client'} • {getLocationLabel(opportunity.location)}
          </p>
          <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-600">
            {opportunity.description}
          </p>
        </div>

        <div className="min-w-[220px] rounded-[24px] bg-slate-50 px-4 py-4 text-sm text-slate-600 lg:ml-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Budget Range</p>
          <p className="mt-1 text-lg font-bold text-[#062E22]">
            {opportunity.budget_min ? `${opportunity.budget_min.toLocaleString()} ${opportunity.currency}` : 'Negotiable'} 
            {opportunity.budget_max ? ` - ${opportunity.budget_max.toLocaleString()} ${opportunity.currency}` : ''}
          </p>
          
          <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Deadline
          </p>
          <p className="mt-1 font-semibold text-[#062E22]">
            {opportunity.submission_deadline ? new Date(opportunity.submission_deadline).toLocaleDateString() : 'Rolling'}
          </p>
          
          <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-slate-400">Proposals</p>
          <p className="mt-1 font-medium text-slate-700">{opportunity.proposal_count || 0} submitted</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-sm border-t border-slate-100 pt-5">
        <p className="text-slate-400">
          Posted {new Date(opportunity.created_at || Date.now()).toLocaleDateString()}
        </p>
        <span className="font-semibold text-[#062E22] transition group-hover:text-[#EC5B13]">
          View details &rarr;
        </span>
      </div>
    </Link>
  );
}
