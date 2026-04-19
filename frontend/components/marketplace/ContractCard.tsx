'use client';

import Link from 'next/link';

import { formatCurrency, formatDateTime } from '@/app/lib/marketplace';
import { MarketplaceContractRecord } from '@/app/types/marketplace';
import StatusBadge from '@/components/marketplace/StatusBadge';

interface ContractCardProps {
  contract: MarketplaceContractRecord;
  href: string;
  role: 'organizer' | 'vendor';
}

export default function ContractCard({ contract, href, role }: ContractCardProps) {
  const headline = role === 'organizer'
    ? contract.vendor_business_name || 'Vendor contract'
    : contract.organizer_name || 'Organizer contract';

  return (
    <Link
      href={href}
      className="group block rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={contract.status} />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              {contract.escrow_status}
            </span>
          </div>

          <h2 className="mt-4 text-2xl font-bold text-[#062E22]">{headline}</h2>
          <p className="mt-2 text-sm text-slate-500">Request #{contract.request_id.slice(-6)}</p>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Price</p>
              <p className="mt-1 font-bold text-[#062E22]">{formatCurrency(contract.price)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Payment</p>
              <p className="mt-1 font-bold text-[#062E22]">{contract.payment_status}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Updated</p>
              <p className="mt-1 font-medium text-slate-700">{formatDateTime(contract.updated_at)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] bg-[#F5FBF8] px-4 py-4 text-sm text-slate-600">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Escrow</p>
          <p className="mt-1 text-lg font-bold text-[#062E22]">{contract.escrow_status}</p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-slate-400">Paid at</p>
          <p className="mt-1 font-medium text-slate-700">{formatDateTime(contract.paid_at)}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-sm">
        <p className="text-slate-400">
          Created {formatDateTime(contract.created_at)}
        </p>
        <span className="font-semibold text-[#062E22] transition group-hover:text-[#EC5B13]">
          Open contract
        </span>
      </div>
    </Link>
  );
}
