'use client';

import { useState } from 'react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import OpportunityCard from '@/components/marketplace/OpportunityCard';
import { useOpportunities } from '@/app/hooks/useOpportunities';

export default function VendorOpportunitiesPage() {
  const { data: opportunities, error, loading } = useOpportunities();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'open_bid' | 'invite_only'>('all');

  const filteredOpportunities = opportunities.filter((opportunity) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query
      || [opportunity.title, opportunity.client_name, opportunity.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
        
    const matchesType = typeFilter === 'all' 
      || (typeFilter === 'invite_only' && (opportunity.is_invited || opportunity.sourcing_mode === 'invite_only'))
      || (typeFilter === 'open_bid' && opportunity.sourcing_mode === 'open_bid');

    // Default to only showing open or published opportunities
    const isVisible = opportunity.status === 'published';

    return matchesSearch && matchesType && isVisible;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="vendor" />
      <DashboardHeader
        searchPlaceholder="Search opportunities..."
        onSearch={setSearchQuery}
        actionHref="/vendor/contracts"
        actionLabel="Open Contracts"
      />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">Vendor Opportunities</p>
            <h1 className="mt-2 text-3xl font-bold text-[#062E22]">Discover and respond to open bids.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500">
              Browse public opportunities or view direct invitations from organizers. Submit your proposals and negotiate terms to win new business.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All Opportunities' },
              { id: 'open_bid', label: 'Open Bids' },
              { id: 'invite_only', label: 'Direct Invites' }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setTypeFilter(filter.id as any)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  typeFilter === filter.id
                    ? 'bg-[#062E22] text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : null}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-bold text-[#062E22]">No opportunities found</h2>
              <p className="mt-2 text-sm text-slate-500">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOpportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  href={`/vendor/opportunities/${opportunity.id}`}
                  opportunity={opportunity}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
