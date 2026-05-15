'use client';

import { ReactNode } from 'react';

import { formatCurrency, formatDateTime, humanizeTransactionType } from '@/app/lib/marketplace';
import { WalletRecord, WalletTransactionRecord } from '@/app/types/marketplace';

interface WalletCardProps {
  wallet: WalletRecord;
  transactions?: WalletTransactionRecord[];
  action?: ReactNode;
  title?: string;
  subtitle?: string;
}

export default function WalletCard({
  wallet,
  transactions = [],
  action,
  title = 'Wallet balance',
  subtitle = 'Track usable funds, locked escrow, and the latest transaction activity.',
}: WalletCardProps) {
  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">{title}</p>
          <h2 className="mt-2 text-3xl font-bold text-[#062E22]">{formatCurrency(wallet.balance)}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">{subtitle}</p>
        </div>
        {action ? <div className="lg:min-w-[240px]">{action}</div> : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[24px] bg-[#F5FBF8] p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Available balance</p>
          <p className="mt-2 text-2xl font-bold text-[#062E22]">{formatCurrency(wallet.balance)}</p>
        </div>
        <div className="rounded-[24px] bg-slate-100 p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Locked in escrow</p>
          <p className="mt-2 text-2xl font-bold text-[#062E22]">{formatCurrency(wallet.locked_balance)}</p>
        </div>
        {(wallet.pending_withdrawal_balance ?? 0) > 0 && (
          <div className="rounded-[24px] bg-amber-50 p-5 border border-amber-100">
            <p className="text-[11px] uppercase tracking-[0.18em] text-amber-600">Pending Withdrawal</p>
            <p className="mt-2 text-2xl font-bold text-amber-900">{formatCurrency(wallet.pending_withdrawal_balance || 0)}</p>
          </div>
        )}
        <div className="rounded-[24px] bg-indigo-50 p-5 border border-indigo-100">
          <p className="text-[11px] uppercase tracking-[0.18em] text-indigo-600">Budget Reserve</p>
          <p className="mt-2 text-2xl font-bold text-indigo-900">{formatCurrency(wallet.balance + wallet.locked_balance)}</p>
        </div>
      </div>

      <div className="mt-6 rounded-[24px] border border-slate-200">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Recent transactions</p>
        </div>

        <div className="divide-y divide-slate-200">
          {transactions.length ? (
            transactions.slice(0, 6).map((transaction) => (
              <div key={transaction.id} className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-[#062E22]">{humanizeTransactionType(transaction.type)}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {transaction.reference_id ? `Ref ${transaction.reference_id.slice(-6)}` : 'Wallet activity'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[#062E22]">{formatCurrency(transaction.amount)}</p>
                  <p className="mt-1 text-sm text-slate-400">{formatDateTime(transaction.created_at)}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-sm text-slate-500">No wallet transactions have been recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
