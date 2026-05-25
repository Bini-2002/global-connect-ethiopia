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

const lifecycleSteps = ['draft', 'AGREED', 'FUNDED', 'COMPLETED', 'PAID'] as const;

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
  const availableBalance = wallet?.balance || 0;

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

  const handleDownloadReceipt = () => {
    if (!contract) return;
    const c = contract;
    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Contract Receipt - ${c.id}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #f1f5f9; padding: 40px 20px; color: #1e293b; }
  .receipt { max-width: 780px; margin: 0 auto; background: #fff; border-radius: 32px; box-shadow: 0 4px 24px rgba(0,0,0,.06); overflow: hidden; }
  .header { background: #062E22; padding: 32px 40px; }
  .header h1 { color: #fff; font-size: 22px; font-weight: 700; letter-spacing: .01em; }
  .header p { color: #94a3b8; font-size: 13px; margin-top: 4px; }
  .body { padding: 32px 40px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .field { }
  .field .label { font-size: 11px; text-transform: uppercase; letter-spacing: .16em; color: #94a3b8; font-weight: 600; }
  .field .value { font-size: 16px; font-weight: 600; color: #062E22; margin-top: 4px; }
  .amount-row { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-top: 1px solid #e2e8f0; margin-top: 24px; }
  .amount-row .label { font-size: 14px; color: #64748b; }
  .amount-row .value { font-size: 28px; font-weight: 800; color: #062E22; }
  .status-badge { display: inline-block; padding: 4px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
  .status-badge.active { background: #dcfce7; color: #166534; }
  .status-badge.pending { background: #fef9c3; color: #854d0e; }
  .status-badge.cancelled { background: #fee2e2; color: #991b1b; }
  .signatures { display: flex; gap: 16px; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
  .signature-box { flex: 1; padding: 16px; border-radius: 16px; background: #f8fafc; }
  .signature-box.signed { background: #f0fdf4; border: 1px solid #bbf7d0; }
  .signature-box .name { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .08em; }
  .signature-box .status { font-size: 14px; font-weight: 600; margin-top: 4px; }
  .signature-box .status.done { color: #16a34a; }
  .signature-box .status.pending { color: #d97706; }
  .footer { text-align: center; padding: 20px 40px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
  @media print { body { padding: 0; background: #fff; } .receipt { box-shadow: none; border-radius: 0; } .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head>
<body>
<div class="receipt">
  <div class="header">
    <h1>Contract Receipt</h1>
    <p>#${c.id.slice(0, 8).toUpperCase()} &middot; ${new Date(c.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>
  <div class="body">
    <div class="grid">
      <div class="field"><div class="label">Contract Title</div><div class="value">${c.title || 'Vendor Contract'}</div></div>
      <div class="field"><div class="label">Status</div><div class="value"><span class="status-badge ${c.status === 'CANCELLED' ? 'cancelled' : ['FUNDED','COMPLETED','PAID'].includes(c.status) ? 'active' : 'pending'}">${c.status}</span></div></div>
      <div class="field"><div class="label">Vendor</div><div class="value">${c.vendor_business_name || c.vendor_id || 'N/A'}</div></div>
      <div class="field"><div class="label">Organizer</div><div class="value">${c.organizer_name || c.organizer_id || 'N/A'}</div></div>
      <div class="field"><div class="label">Escrow</div><div class="value">${c.escrow_status}</div></div>
      <div class="field"><div class="label">Payment</div><div class="value">${c.payment_status}</div></div>
    </div>
    <div class="amount-row">
      <span class="label">Total Contract Amount</span>
      <span class="value">${c.currency || 'ETB'} ${(c.amount || 0).toLocaleString()}</span>
    </div>
    ${c.terms ? `<div style="margin-top:24px;padding-top:24px;border-top:1px solid #e2e8f0"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.16em;color:#94a3b8;font-weight:600">Terms &amp; Conditions</div><p style="margin-top:8px;font-size:14px;color:#475569;line-height:1.6">${c.terms}</p></div>` : ''}
    ${c.scope ? `<div style="margin-top:24px;padding-top:24px;border-top:1px solid #e2e8f0"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.16em;color:#94a3b8;font-weight:600">Scope of Work</div><p style="margin-top:8px;font-size:14px;color:#475569;line-height:1.6">${c.scope}</p></div>` : ''}
    <div class="signatures">
      <div class="signature-box ${c.signed_by_organizer ? 'signed' : ''}">
        <div class="name">Organizer</div>
        <div class="status ${c.signed_by_organizer ? 'done' : 'pending'}">${c.signed_by_organizer ? '✓ Signed' : 'Pending'}</div>
        ${c.signed_by_organizer_at ? `<div style="font-size:11px;color:#94a3b8;margin-top:4px">${new Date(c.signed_by_organizer_at).toLocaleDateString()}</div>` : ''}
      </div>
      <div class="signature-box ${c.signed_by_vendor ? 'signed' : ''}">
        <div class="name">Vendor</div>
        <div class="status ${c.signed_by_vendor ? 'done' : 'pending'}">${c.signed_by_vendor ? '✓ Signed' : 'Pending'}</div>
        ${c.signed_by_vendor_at ? `<div style="font-size:11px;color:#94a3b8;margin-top:4px">${new Date(c.signed_by_vendor_at).toLocaleDateString()}</div>` : ''}
      </div>
    </div>
    <div style="margin-top:24px;padding-top:24px;border-top:1px solid #e2e8f0">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
        <div class="field"><div class="label">Created</div><div class="value" style="font-size:14px">${c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</div></div>
        <div class="field"><div class="label">Funded</div><div class="value" style="font-size:14px">${c.funded_at ? new Date(c.funded_at).toLocaleDateString() : '—'}</div></div>
        <div class="field"><div class="label">Paid</div><div class="value" style="font-size:14px">${c.paid_at ? new Date(c.paid_at).toLocaleDateString() : '—'}</div></div>
      </div>
    </div>
  </div>
  <div class="footer">Generated by Global Connect Ethiopia &middot; Contract #${c.id.slice(0, 8).toUpperCase()}</div>
</div>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract-receipt-${contractId.slice(0, 8)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
              <button
                onClick={handleDownloadReceipt}
                className="inline-flex items-center gap-2 px-4 py-2 border border-amber-300 bg-amber-50 text-amber-800 rounded-xl text-sm font-semibold hover:bg-amber-100 transition"
              >
                <FileDown className="w-4 h-4" />
                Download Receipt
              </button>
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
                      <p className="mt-2 text-2xl font-bold text-[#062E22]">{formatCurrency(availableBalance)}</p>
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
                      canSign={!contract.signed_by_organizer}
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
                      <>
                        {availableBalance < contract.amount ? (
                          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            <p className="font-semibold">Insufficient funds</p>
                            <p className="mt-1">
                              Contract amount: {formatCurrency(contract.amount, contract.currency)}.<br/>
                              Available balance: {formatCurrency(availableBalance)}.
                            </p>
                            <Link href="/organizer/wallet" className="mt-3 inline-block font-semibold text-[#062E22] hover:underline">
                              Top up wallet →
                            </Link>
                          </div>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void runAction('fund')}
                          disabled={actionState !== null || availableBalance < contract.amount}
                          className="w-full rounded-xl bg-[#062E22] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a37] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionState === 'fund' ? 'Funding contract...' : 'Fund Contract'}
                        </button>
                      </>
                    ) : null}

                    {canReleaseContract(contract) ? (
                      <button
                        type="button"
                        onClick={() => void runAction('release')}
                        disabled={actionState !== null}
                        className="w-full rounded-xl bg-[#EC5B13] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d54f10] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionState === 'release' ? 'Releasing payment...' : 'Release Payment / Settle'}
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
                          : contract.status === 'AGREED'
                            ? 'Waiting for both signatures before this contract can be funded.'
                            : contract.status === 'FUNDED'
                              ? 'Contract is funded. Waiting for vendor to mark it completed.'
                              : contract.status === 'PAID'
                                ? 'This contract is fully settled and payment released.'
                                : contract.status === 'CANCELLED'
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
