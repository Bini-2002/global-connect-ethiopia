'use client';

import { FormEvent, useState } from 'react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import WalletCard from '@/components/marketplace/WalletCard';
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
  const [depositing, setDepositing] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  const handleDeposit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setDepositing(true);
      setDepositError(null);
      await marketplaceService.depositWallet({ amount: Number(amount) });
      refresh();
      refreshTransactions();
    } catch (nextError) {
      setDepositError(nextError instanceof Error ? nextError.message : 'Unable to deposit wallet funds.');
    } finally {
      setDepositing(false);
    }
  };

  const action = (
    <form onSubmit={handleDeposit} className="rounded-[24px] bg-slate-50 p-4">
      <label htmlFor="deposit" className="mb-1 block text-sm font-medium text-slate-700">Mock deposit amount</label>
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
        className="mt-3 w-full rounded-xl bg-[#062E22] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a37] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {depositing ? 'Depositing...' : 'Deposit Funds'}
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
              subtitle="Use mock deposits to fund escrow, then monitor funds as contracts move from agreed to paid."
            />
          )}
        </div>
      </main>
    </div>
  );
}
