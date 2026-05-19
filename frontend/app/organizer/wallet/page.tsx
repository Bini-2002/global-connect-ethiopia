'use client';

import { FormEvent, useState } from 'react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import WalletCard from '@/components/marketplace/WalletCard';
import ChapaMockPopup from '@/components/marketplace/ChapaMockPopup';
import { useWallet, useWalletTransactions } from '@/app/hooks/useMarketplace';
import marketplaceService from '@/app/services/marketplaceService';

export default function OrganizerWalletPage() {
  const { data: wallet, error, loading, refresh } = useWallet();
  const {
    data: transactions,
    error: transactionsError,
    loading: transactionsLoading,
    refresh: refreshTransactions,
  } = useWalletTransactions();

  const [amount, setAmount] = useState('10000');
  const [showPopup, setShowPopup] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  const handleDepositInitiate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDepositError(null);
    if (!amount || Number(amount) <= 0) {
      setDepositError('Please enter a valid amount.');
      return;
    }
    setShowPopup(true);
  };

  const handleDepositConfirm = async () => {
    setShowPopup(false);
    try {
      setDepositing(true);
      setDepositError(null);
      
      // Hit our mock deposit endpoint
      await marketplaceService.depositWallet({ deposit_amount: Number(amount) });
      
      refresh();
      refreshTransactions();
      setAmount('');
    } catch (nextError) {
      setDepositError(nextError instanceof Error ? nextError.message : 'Unable to complete deposit.');
    } finally {
      setDepositing(false);
    }
  };

  const action = (
    <form onSubmit={handleDepositInitiate} className="rounded-[24px] bg-slate-50 p-4">
      <label htmlFor="deposit" className="mb-1 block text-sm font-medium text-slate-700">Chapa test deposit amount</label>
      <input
        id="deposit"
        type="number"
        min={1}
        value={amount}
        onChange={(currentEvent) => setAmount(currentEvent.target.value)}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
      />
      <button
        type="submit"
        disabled={depositing || !amount}
        className="mt-3 w-full flex justify-center items-center gap-2 rounded-xl bg-[#062E22] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a37] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 16.0002L18.828 13.1722C19.578 12.4222 19.578 11.2052 18.828 10.4552C18.078 9.70523 16.861 9.70523 16.111 10.4552L13.889 12.6772" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 7.00024L4.172 9.82824C3.422 10.5782 3.422 11.7952 4.172 12.5452C4.922 13.2952 6.139 13.2952 6.889 12.5452L9.111 10.3232" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {depositing ? 'Processing...' : 'Top Up via Chapa'}
      </button>
      {depositError ? <p className="mt-3 text-sm text-red-600">{depositError}</p> : null}
    </form>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="organizer" />
      <DashboardHeader
        searchPlaceholder="Wallet"
        actionHref="/organizer/contracts"
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
              title="Organizer wallet"
              subtitle="Top up your wallet using Chapa's payment gateway, then use these funds to securely escrow marketplace contracts."
            />
          )}
        </div>
      </main>

      {showPopup && (
        <ChapaMockPopup
          type="deposit"
          amount={Number(amount)}
          onConfirm={handleDepositConfirm}
          onCancel={() => setShowPopup(false)}
        />
      )}
    </div>
  );
}
