'use client';

import { useState } from 'react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import ContractCard from '@/components/marketplace/ContractCard';
import { useMarketplaceContracts } from '@/app/hooks/useMarketplace';

export default function VendorContractsPage() {
  const { data: contracts, error, loading } = useMarketplaceContracts();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContracts = contracts.filter((contract) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return [contract.vendor_business_name, contract.status, contract.request_id]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="vendor" />
      <DashboardHeader
        searchPlaceholder="Search contracts..."
        onSearch={setSearchQuery}
        actionHref="/vendor/wallet"
        actionLabel="Open Wallet"
      />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">Vendor contracts</p>
            <h1 className="mt-2 text-3xl font-bold text-[#062E22]">Track when work is signed, funded, completed, and paid.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500">
              Once an organizer accepts the negotiation, the contract appears here. Mark the contract completed after delivery so the organizer can release escrow.
            </p>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : null}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-bold text-[#062E22]">No contracts yet</h2>
              <p className="mt-2 text-sm text-slate-500">Accepted requests will appear here once the organizer creates the contract.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredContracts.map((contract) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  href={`/vendor/contracts/${contract.id}`}
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
