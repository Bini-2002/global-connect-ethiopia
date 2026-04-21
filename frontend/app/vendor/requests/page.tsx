'use client';

import { useState } from 'react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import RequestCard from '@/components/marketplace/RequestCard';
import { useMarketplaceRequests } from '@/app/hooks/useMarketplace';
import { RequestStatus } from '@/app/types/marketplace';

const requestFilters: Array<'all' | RequestStatus> = ['all', 'REQUESTED', 'QUOTED', 'NEGOTIATING', 'ACCEPTED'];

export default function VendorRequestsPage() {
  const { data: requests, error, loading } = useMarketplaceRequests();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RequestStatus>('all');

  const filteredRequests = requests.filter((request) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query
      || [request.organizer_name, request.vendor_business_name, request.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="vendor" />
      <DashboardHeader
        searchPlaceholder="Search incoming requests..."
        onSearch={setSearchQuery}
        actionHref="/vendor/contracts"
        actionLabel="Open Contracts"
      />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">Vendor requests</p>
            <h1 className="mt-2 text-3xl font-bold text-[#062E22]">Review organizer demand and respond with a clear number.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500">
              Send the first quote when a request arrives, then counter as needed until the organizer accepts and moves the deal into a contract.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {requestFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  statusFilter === filter
                    ? 'bg-[#062E22] text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {filter}
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
          ) : filteredRequests.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-bold text-[#062E22]">No requests in this view</h2>
              <p className="mt-2 text-sm text-slate-500">Incoming organizer requests will appear here as soon as they are sent.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  href={`/vendor/requests/${request.id}`}
                  request={request}
                  role="vendor"
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
