'use client';

import Link from 'next/link';

import { formatDate } from '@/app/lib/marketplace';
import { MarketplaceVendorRecord } from '@/app/types/marketplace';

interface VendorCardProps {
  vendor: MarketplaceVendorRecord;
  href: string;
}

export default function VendorCard({ vendor, href }: VendorCardProps) {
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="h-2 bg-gradient-to-r from-[#062E22] via-[#0a4a37] to-[#EC5B13]" />
      <div className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Verified Vendor</p>
            <h2 className="mt-2 text-2xl font-bold text-[#062E22]">{vendor.business_name}</h2>
          </div>
          <div className="rounded-2xl bg-[#F5FBF8] px-4 py-3 text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Rating</p>
            <p className="mt-1 text-lg font-bold text-[#062E22]">{vendor.rating.toFixed(1)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {vendor.services.length ? (
            vendor.services.map((service) => (
              <span
                key={`${vendor.id}-${service}`}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
              >
                {service}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              Services coming soon
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-400">Joined {formatDate(vendor.created_at)}</p>
          <span className="font-semibold text-[#062E22] transition group-hover:text-[#EC5B13]">
            View vendor
          </span>
        </div>
      </div>
    </Link>
  );
}
