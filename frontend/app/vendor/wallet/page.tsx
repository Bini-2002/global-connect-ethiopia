'use client';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import WalletCard from '@/components/marketplace/WalletCard';
import { useWallet, useWalletTransactions } from '@/app/hooks/useMarketplace';

export default function VendorWalletPage() {
  const { data: wallet, error, loading } = useWallet();
  const {
    data: transactions,
    error: transactionsError,
    loading: transactionsLoading,
  } = useWalletTransactions();

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
              title="Vendor wallet"
              subtitle="Released escrow moves into your available balance here. Locked balance remains visible while organizer funds are still in escrow."
            />
          )}
        </div>
      </main>
    </div>
  );
}
