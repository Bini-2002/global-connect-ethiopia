'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import vendorPortalService from '@/app/services/vendorPortalService';
import { VendorContractRecord } from '@/app/types/marketplace';

function formatCurrency(value?: number | null, currency = 'ETB') {
  if (value === undefined || value === null) return 'Amount pending';
  return `${currency} ${new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(value)}`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Not recorded yet';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function VendorContractDetailPage() {
  const params = useParams();
  const contractId = params.id as string;

  const [contract, setContract] = useState<VendorContractRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState('');

  const loadContract = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await vendorPortalService.getContractById(contractId);
      setContract(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load the contract.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadContract();
  }, [contractId]);

  const handleSign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSigning(true);
      setError(null);
      const updated = await vendorPortalService.signContract(contractId, signatureName || undefined);
      setContract(updated);
      setSignatureName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign the contract.');
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="vendor" />
      <DashboardHeader
        searchPlaceholder="Contract detail"
        actionHref="/vendor/requests"
        actionLabel="Open Requests"
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
            <Link href="/vendor/requests" className="text-sm font-semibold text-[#062E22] hover:underline">
              Open requests
            </Link>
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
          ) : !contract ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
              <h1 className="text-2xl font-bold text-[#062E22]">Contract not found</h1>
              <p className="mt-2 text-sm text-slate-500">This contract could not be loaded.</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
              <div className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-[#F5FBF8] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#062E22]">
                      {contract.status}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      {contract.payment_status || 'not_required'}
                    </span>
                  </div>
                  <h1 className="mt-4 text-3xl font-bold text-[#062E22]">{contract.title}</h1>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    {contract.scope || 'Service scope will be delivered according to the negotiated agreement.'}
                  </p>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Amount</p>
                      <p className="mt-1 text-lg font-semibold text-[#062E22]">{formatCurrency(contract.amount, contract.currency)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Request reference</p>
                      <p className="mt-1 text-sm font-semibold text-[#062E22]">{contract.request_id}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Start date</p>
                      <p className="mt-1 text-sm font-semibold text-[#062E22]">{formatDate(contract.start_date)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">End date</p>
                      <p className="mt-1 text-sm font-semibold text-[#062E22]">{formatDate(contract.end_date)}</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-200 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Terms</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {contract.terms || 'No extended terms were attached to this agreement.'}
                    </p>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">Signature progress</p>
                  <h2 className="mt-1 text-2xl font-bold text-[#062E22]">Party confirmation</h2>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Organizer signature</p>
                      <p className="mt-1 text-lg font-semibold text-[#062E22]">
                        {contract.organizer_signature.signed ? 'Signed' : 'Pending'}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {contract.organizer_signature.name || 'Organizer signature name not recorded yet.'}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">{formatDate(contract.organizer_signature.signed_at)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Vendor signature</p>
                      <p className="mt-1 text-lg font-semibold text-[#062E22]">
                        {contract.vendor_signature.signed ? 'Signed' : 'Pending'}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {contract.vendor_signature.name || 'Vendor signature name not recorded yet.'}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">{formatDate(contract.vendor_signature.signed_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">Vendor action</p>
                  <h2 className="mt-1 text-2xl font-bold text-[#062E22]">Sign the contract</h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    Add the vendor signature here. The contract becomes active automatically when both parties have signed.
                  </p>

                  {contract.vendor_signature.signed ? (
                    <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                      The vendor signature has already been recorded for this contract.
                    </div>
                  ) : (
                    <form onSubmit={handleSign} className="mt-6 space-y-4">
                      <div>
                        <label htmlFor="signatureName" className="mb-1 block text-sm font-medium text-slate-700">Signature name</label>
                        <input
                          id="signatureName"
                          value={signatureName}
                          onChange={(event) => setSignatureName(event.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                          placeholder="Enter the name to store with the signature"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={signing}
                        className="w-full rounded-xl bg-[#062E22] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a37] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {signing ? 'Signing contract...' : 'Sign Contract'}
                      </button>
                    </form>
                  )}
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">Current state</p>
                  <h2 className="mt-1 text-xl font-bold text-[#062E22]">Activation summary</h2>
                  <div className="mt-5 space-y-3 text-sm text-slate-600">
                    <p>Contract status: <span className="font-semibold text-[#062E22]">{contract.status}</span></p>
                    <p>Signed at: <span className="font-semibold text-[#062E22]">{formatDate(contract.signed_at)}</span></p>
                    <p>
                      If the organizer signature is still pending, the agreement remains in draft until both signatures are present.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
