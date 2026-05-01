'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { FileDown, PenLine } from 'lucide-react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/marketplace/StatusBadge';
import {
  canFundContract,
  canRefundContract,
  canReleaseContract,
  formatCurrency,
  formatDateTime,
  humanizeContractStatus,
  isContractFullySigned,
} from '@/app/lib/marketplace';
import { useMarketplaceContract, useWallet } from '@/app/hooks/useMarketplace';
import marketplaceService from '@/app/services/marketplaceService';

const lifecycleSteps = ['draft', 'pending_signatures', 'active', 'completed'] as const;

function SignaturePanel({
  label,
  signed,
  signedAt,
  onSign,
  canSign,
  loading,
}: {
  label: string;
  signed: boolean;
  signedAt: string | null;
  onSign?: () => void;
  canSign: boolean;
  loading: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${signed ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
          {signed ? (
            <>
              <p className="mt-1 text-sm font-semibold text-emerald-700">✓ Signed</p>
              {signedAt ? <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(signedAt)}</p> : null}
            </>
          ) : (
            <p className="mt-1 text-sm font-semibold text-slate-500">Not yet signed</p>
          )}
        </div>
        {!signed && canSign && onSign ? (
          <button
            onClick={onSign}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
          >
            <PenLine className="w-4 h-4" />
            {loading ? 'Signing…' : 'Sign'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function OrganizerContractDetailPage() {
  const params = useParams();
  const contractId = params.id as string;
  const { data: contract, error, loading, refresh } = useMarketplaceContract(contractId);
  const { data: wallet, refresh: refreshWallet } = useWallet();

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<'fund' | 'release' | 'refund' | 'sign' | null>(null);

  const runAction = async (action: 'fund' | 'release' | 'refund') => {
    try {
      setActionState(action);
      setActionError(null);
      if (action === 'fund') await marketplaceService.fundContract(contractId);
      if (action === 'release') await marketplaceService.releaseContract(contractId);
      if (action === 'refund') await marketplaceService.refundContract(contractId);
      refresh();
      refreshWallet();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Unable to update the contract.');
    } finally {
      setActionState(null);
    }
  };

  const handleSignAsOrganizer = async () => {
    try {
      setActionState('sign');
      setActionError(null);
      await marketplaceService.signContractAsOrganizer(contractId);
      refresh();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Unable to sign the contract.');
    } finally {
      setActionState(null);
    }
  };

  const pdfUrl = marketplaceService.getContractPdfUrl(contractId);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="organizer" />
      <DashboardHeader
        searchPlaceholder="Contract details"
        actionHref="/organizer/wallet"
        actionLabel="Organizer Wallet"
      />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Link href="/organizer/contracts" className="inline-flex items-center gap-2 text-sm font-semibold text-[#062E22] hover:underline">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to contracts
            </Link>
            {contract && contract.status !== 'draft' ? (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 border border-amber-300 bg-amber-50 text-amber-800 rounded-xl text-sm font-semibold hover:bg-amber-100 transition"
              >
                <FileDown className="w-4 h-4" />
                Download PDF
              </a>
            ) : null}
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
              <p className="mt-2 text-sm text-slate-500">This contract record could not be loaded.</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <section className="space-y-6">
                {/* Contract Overview */}
                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={contract.status} />
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                      {contract.escrow_status}
                    </span>
                    {isContractFullySigned(contract) ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                        ✓ Fully Signed
                      </span>
                    ) : null}
                  </div>

                  <h1 className="mt-4 text-3xl font-bold text-[#062E22]">{contract.title || contract.vendor_business_name || 'Vendor contract'}</h1>
                  {contract.scope ? (
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">{contract.scope}</p>
                  ) : null}

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-[24px] bg-[#F5FBF8] p-5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Contract amount</p>
                      <p className="mt-2 text-2xl font-bold text-[#062E22]">{formatCurrency(contract.amount, contract.currency)}</p>
                    </div>
                    <div className="rounded-[24px] bg-slate-100 p-5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Wallet balance</p>
                      <p className="mt-2 text-2xl font-bold text-[#062E22]">{formatCurrency(wallet?.balance)}</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Funded at</p>
                      <p className="mt-2 text-sm font-medium text-slate-700">{formatDateTime(contract.funded_at)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Completed at</p>
                      <p className="mt-2 text-sm font-medium text-slate-700">{formatDateTime(contract.completed_at)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4 md:col-span-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Paid at</p>
                      <p className="mt-2 text-sm font-medium text-slate-700">{formatDateTime(contract.paid_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Lifecycle */}
                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">Lifecycle</p>
                  <h2 className="mt-2 text-2xl font-bold text-[#062E22]">Contract state progression</h2>
                  <div className="mt-6 grid gap-3 md:grid-cols-4">
                    {lifecycleSteps.map((step) => {
                      const stepIdx = lifecycleSteps.indexOf(step);
                      const curIdx = lifecycleSteps.indexOf(contract.status as typeof lifecycleSteps[number]);
                      const isActive = stepIdx <= curIdx;
                      return (
                        <div
                          key={step}
                          className={`rounded-[24px] px-4 py-5 text-center ${isActive ? 'bg-[#062E22] text-white' : 'bg-slate-100 text-slate-500'}`}
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                            {humanizeContractStatus(step)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Phase 2: Signature Panel */}
                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">Signatures</p>
                  <h2 className="mt-2 text-2xl font-bold text-[#062E22]">Contract signing status</h2>
                  <p className="mt-2 text-sm text-slate-500">Contract becomes active only after both parties sign.</p>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <SignaturePanel
                      label="Organizer Signature"
                      signed={contract.signed_by_organizer}
                      signedAt={contract.signed_by_organizer_at}
                      canSign={!contract.signed_by_organizer && (contract.status === 'draft' || contract.status === 'pending_signatures')}
                      onSign={() => void handleSignAsOrganizer()}
                      loading={actionState === 'sign'}
                    />
                    <SignaturePanel
                      label="Vendor Signature"
                      signed={contract.signed_by_vendor}
                      signedAt={contract.signed_by_vendor_at}
                      canSign={false}
                      loading={false}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                {/* Escrow Actions */}
                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">Actions</p>
                  <h2 className="mt-2 text-2xl font-bold text-[#062E22]">Manage escrow</h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    Fund escrow after the contract is active. Release payment once the vendor marks work completed.
                  </p>

                  {actionError ? (
                    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{actionError}</div>
                  ) : null}

                  <div className="mt-6 space-y-3">
                    {canFundContract(contract) ? (
                      <button
                        type="button"
                        onClick={() => void runAction('fund')}
                        disabled={actionState !== null}
                        className="w-full rounded-xl bg-[#062E22] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a37] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionState === 'fund' ? 'Funding contract...' : 'Fund Contract'}
                      </button>
                    ) : null}

                    {canReleaseContract(contract) ? (
                      <button
                        type="button"
                        onClick={() => void runAction('release')}
                        disabled={actionState !== null}
                        className="w-full rounded-xl bg-[#EC5B13] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d54f10] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionState === 'release' ? 'Releasing payment...' : 'Release Payment'}
                      </button>
                    ) : null}

                    {canRefundContract(contract) ? (
                      <button
                        type="button"
                        onClick={() => void runAction('refund')}
                        disabled={actionState !== null}
                        className="w-full rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionState === 'refund' ? 'Refunding escrow...' : 'Refund Escrow'}
                      </button>
                    ) : null}

                    {!canFundContract(contract) && !canReleaseContract(contract) && !canRefundContract(contract) ? (
                      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        {contract.status === 'draft'
                          ? 'Both parties must sign before the contract can be funded.'
                          : contract.status === 'pending_signatures'
                            ? 'Waiting for both signatures before this contract becomes active.'
                            : contract.status === 'completed'
                              ? 'This contract is fully settled.'
                              : contract.status === 'cancelled'
                                ? 'This contract has been cancelled.'
                                : 'No organizer action is available right now.'}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Contract Terms */}
                {contract.terms ? (
                  <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">Terms</p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{contract.terms}</p>
                  </div>
                ) : null}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
