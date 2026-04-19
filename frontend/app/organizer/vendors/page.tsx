'use client';

import { useState } from 'react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import VendorCard from '@/components/marketplace/VendorCard';
import { useMarketplaceVendors } from '@/app/hooks/useMarketplace';

export default function OrganizerVendorsPage() {
  const { data: vendors, error, loading } = useMarketplaceVendors();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVendors = vendors.filter((vendor) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return [vendor.business_name, vendor.services.join(' ')]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="organizer" />
      <DashboardHeader
        searchPlaceholder="Search vendors..."
        onSearch={setSearchQuery}
        actionHref="/organizer/requests"
        actionLabel="Open Requests"
      />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">Vendor marketplace</p>
            <h1 className="mt-2 text-3xl font-bold text-[#062E22]">Explore verified vendors for your event operations.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500">
              Browse verified providers, compare service categories at a glance, and open a vendor profile to start the request and negotiation flow.
            </p>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : null}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-bold text-[#062E22]">No vendors match this search</h2>
              <p className="mt-2 text-sm text-slate-500">Try a broader search term or clear the current filter.</p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {filteredVendors.map((vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} href={`/organizer/vendors/${vendor.id}`} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
