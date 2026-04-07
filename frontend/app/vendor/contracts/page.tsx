'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import vendorPortalService from '@/app/services/vendorPortalService';
import { VendorContractRecord } from '@/app/types/marketplace';

function formatCurrency(value?: number | null, currency = 'ETB') {
  if (value === undefined || value === null) return 'Amount pending';
  return `${currency} ${new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(value)}`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Recently';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function VendorContractsPage() {
  const [contracts, setContracts] = useState<VendorContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;

    const loadContracts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await vendorPortalService.getContracts();
        if (!active) return;
        setContracts(response);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load contracts.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadContracts();

    return () => {
      active = false;
    };
  }, []);

  const filteredContracts = useMemo(() => {
    if (!searchQuery.trim()) return contracts;
    const query = searchQuery.toLowerCase();
    return contracts.filter((contract) =>
      [contract.title, contract.scope, contract.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [contracts, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="vendor" />
      <DashboardHeader
        searchPlaceholder="Search contracts..."
        onSearch={setSearchQuery}
        actionHref="/vendor/requests"
        actionLabel="Open Requests"
      />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">Contracts</p>
              <h1 className="mt-1 text-3xl font-bold text-[#062E22]">Track signatures and activate agreements.</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
                This screen shows the contract stage after request negotiation. Open any contract to review the service scope, see signature progress, and add the vendor signature.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">Contracts loaded</p>
              <p className="mt-1 text-3xl font-extrabold text-[#062E22]">{contracts.length}</p>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-bold text-[#062E22]">No contracts available yet</h2>
              <p className="mt-2 text-sm text-slate-500">
                Contracts appear after an accepted request is converted into an agreement by the organizer.
              </p>
              <Link href="/vendor/requests" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#062E22] hover:underline">
                Review requests instead
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredContracts.map((contract) => (
                <Link
                  key={contract.id}
                  href={`/vendor/contracts/${contract.id}`}
                  className="block rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold text-[#062E22]">{contract.title}</h2>
                        <span className="rounded-full bg-[#F5FBF8] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#062E22]">
                          {contract.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-slate-500">
                        {contract.scope || contract.terms || 'Service agreement ready for signature.'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <p className="text-slate-400">Amount</p>
                      <p className="mt-1 font-semibold text-[#062E22]">{formatCurrency(contract.amount, contract.currency)}</p>
                      <p className="mt-3 text-slate-400">Organizer signature</p>
                      <p className="mt-1 font-medium text-slate-700">{contract.organizer_signature.signed ? 'Signed' : 'Pending'}</p>
                      <p className="mt-3 text-slate-400">Vendor signature</p>
                      <p className="mt-1 font-medium text-slate-700">{contract.vendor_signature.signed ? 'Signed' : 'Pending'}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between text-sm">
                    <p className="text-slate-400">Created {formatDate(contract.created_at)}</p>
                    <span className="font-semibold text-[#062E22]">Open contract</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
