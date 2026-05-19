'use client';

import { FormEvent, useState } from 'react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import WalletCard from '@/components/marketplace/WalletCard';
import ChapaMockPopup from '@/components/marketplace/ChapaMockPopup';
import { useWallet, useWalletTransactions, useWalletWithdrawals } from '@/app/hooks/useMarketplace';
import marketplaceService from '@/app/services/marketplaceService';

export default function VendorWalletPage() {
  const { data: wallet, error, loading, refresh: refreshWallet } = useWallet();
  const {
    data: transactions,
    error: transactionsError,
    loading: transactionsLoading,
    refresh: refreshTransactions,
  } = useWalletTransactions();
  const {
    data: withdrawals,
    refresh: refreshWithdrawals,
  } = useWalletWithdrawals();

  const [amount, setAmount] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const handleWithdrawInitiate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWithdrawError(null);
    if (!wallet || Number(amount) > wallet.balance) {
      setWithdrawError('Insufficient balance');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setWithdrawError('Please enter a valid amount.');
      return;
    }
    setShowPopup(true);
  };

  const handleWithdrawConfirm = async () => {
    setShowPopup(false);
    try {
      setWithdrawing(true);
      setWithdrawError(null);
      
      await marketplaceService.requestWithdrawal({ amount: Number(amount), payout_method: 'chapa' });
      
      setAmount('');
      refreshWallet();
      refreshTransactions();
      refreshWithdrawals();
    } catch (nextError) {
      setWithdrawError(nextError instanceof Error ? nextError.message : 'Unable to request withdrawal.');
    } finally {
      setWithdrawing(false);
    }
  };

  const action = (
    <form onSubmit={handleWithdrawInitiate} className="rounded-[24px] bg-slate-50 p-4">
      <label htmlFor="withdraw" className="mb-1 block text-sm font-medium text-slate-700">Withdraw Amount</label>
      <input
        id="withdraw"
        type="number"
        min={1}
        max={wallet?.balance || 0}
        value={amount}
        onChange={(currentEvent) => setAmount(currentEvent.target.value)}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
      />
      <button
        type="submit"
        disabled={withdrawing || !amount || Number(amount) <= 0 || Number(amount) > (wallet?.balance || 0)}
        className="mt-3 w-full flex justify-center items-center gap-2 rounded-xl bg-[#0a4a37] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#062E22] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 8V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 12L12 16L16 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {withdrawing ? 'Requesting...' : 'Request Withdrawal'}
      </button>
      {withdrawError ? <p className="mt-3 text-sm text-red-600">{withdrawError}</p> : null}
    </form>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="vendor" />
      <DashboardHeader
        searchPlaceholder="Wallet"
        actionHref="/vendor/contracts"
        actionLabel="Open Contracts"
      />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {(error || transactionsError) ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error || transactionsError}
            </div>
          ) : null}

          {loading || transactionsLoading || !wallet ? (
            <div className="flex justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
            </div>
          ) : (
            <WalletCard
              wallet={wallet}
              transactions={transactions}
              action={action}
              title="Vendor wallet"
              subtitle="Released escrow moves into your available balance here. Locked balance remains visible while organizer funds are still in escrow."
            />
          )}

          {withdrawals && withdrawals.length > 0 && (
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37] mb-4">Withdrawal History</h3>
              <div className="divide-y divide-slate-200">
                {withdrawals.map(w => (
                  <div key={w.id} className="py-3 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm">{w.status}</p>
                      <p className="text-xs text-slate-500">{new Date(w.requested_at).toLocaleDateString()}</p>
                    </div>
                    <p className="font-bold">{w.amount} {w.currency}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {showPopup && (
        <ChapaMockPopup
          type="withdraw"
          amount={Number(amount)}
          onConfirm={handleWithdrawConfirm}
          onCancel={() => setShowPopup(false)}
        />
      )}
    </div>
  );
}
