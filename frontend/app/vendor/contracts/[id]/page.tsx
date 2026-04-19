'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/marketplace/StatusBadge';
import {
  canMarkContractCompleted,
  formatCurrency,
  formatDateTime,
} from '@/app/lib/marketplace';
import { useMarketplaceContract } from '@/app/hooks/useMarketplace';
import marketplaceService from '@/app/services/marketplaceService';

const lifecycleSteps = ['AGREED', 'FUNDED', 'COMPLETED', 'PAID'] as const;

export default function VendorContractDetailPage() {
  const params = useParams();
  const contractId = params.id as string;
  const { data: contract, error, loading, refresh } = useMarketplaceContract(contractId);

  const [actionError, setActionError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const handleComplete = async () => {
    try {
      setCompleting(true);
      setActionError(null);
      await marketplaceService.completeContract(contractId);
      refresh();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Unable to mark the contract completed.');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="vendor" />
      <DashboardHeader
        searchPlaceholder="Contract details"
        actionHref="/vendor/wallet"
        actionLabel="Vendor Wallet"
      />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Link href="/vendor/contracts" className="inline-flex items-center gap-2 text-sm font-semibold text-[#062E22] hover:underline">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to contracts
            </Link>
            <Link href="/vendor/wallet" className="text-sm font-semibold text-[#062E22] hover:underline">
              Open wallet
            </Link>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : null}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
            </div>
          ) : !contract ? (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <h1 className="text-2xl font-bold text-[#062E22]">Contract not found</h1>
              <p className="mt-2 text-sm text-slate-500">This vendor contract could not be loaded.</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <section className="space-y-6">
                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={contract.status} />
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                      {contract.escrow_status}
                    </span>
                  </div>

                  <h1 className="mt-4 text-3xl font-bold text-[#062E22]">{contract.organizer_name || 'Contract delivery'}</h1>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    Watch the funding status here and mark the contract completed once your work has been delivered.
                  </p>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-[24px] bg-[#F5FBF8] p-5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Contract price</p>
                      <p className="mt-2 text-2xl font-bold text-[#062E22]">{formatCurrency(contract.price)}</p>
                    </div>
                    <div className="rounded-[24px] bg-slate-100 p-5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Payment status</p>
                      <p className="mt-2 text-2xl font-bold text-[#062E22]">{contract.payment_status}</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Funded at</p>
                      <p className="mt-2 text-sm font-medium text-slate-700">{formatDateTime(contract.funded_at)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Paid at</p>
                      <p className="mt-2 text-sm font-medium text-slate-700">{formatDateTime(contract.paid_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">Lifecycle</p>
                  <h2 className="mt-2 text-2xl font-bold text-[#062E22]">State progression</h2>

                  <div className="mt-6 grid gap-3 md:grid-cols-4">
                    {lifecycleSteps.map((step) => {
                      const isActive = lifecycleSteps.indexOf(step) <= lifecycleSteps.indexOf(contract.status);
                      return (
                        <div
                          key={step}
                          className={`rounded-[24px] px-4 py-5 text-center ${
                            isActive ? 'bg-[#062E22] text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">{step}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">Vendor action</p>
                  <h2 className="mt-2 text-2xl font-bold text-[#062E22]">Completion handoff</h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    Mark the contract completed after delivery so the organizer can review and release payment from escrow.
                  </p>

                  {actionError ? (
                    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{actionError}</div>
                  ) : null}

                  {canMarkContractCompleted(contract) ? (
                    <button
                      type="button"
                      onClick={() => void handleComplete()}
                      disabled={completing}
                      className="mt-6 w-full rounded-xl bg-[#062E22] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a37] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {completing ? 'Marking completed...' : 'Mark As Completed'}
                    </button>
                  ) : (
                    <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      {contract.status === 'AGREED'
                        ? 'This contract has not been funded yet. Wait for the organizer to lock escrow first.'
                        : contract.status === 'COMPLETED'
                          ? 'Completion has been recorded. The organizer can now release payment.'
                          : contract.status === 'PAID'
                            ? 'This contract has already been paid out.'
                            : 'No vendor action is required at this stage.'}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
