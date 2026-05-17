'use client';

import Link from 'next/link';

import { formatDate } from '@/app/lib/marketplace';
import { MarketplaceVendorRecord } from '@/app/types/marketplace';

interface VendorCardProps {
  vendor: MarketplaceVendorRecord;
  href: string;
}

export default function VendorCard({ vendor, href }: VendorCardProps) {
  const primaryService = vendor.service_records?.[0];
  const coverImage = primaryService?.images?.[0]?.url;
  const serviceName = primaryService?.title || vendor.services?.[0] || 'Service Offering';
  const location = primaryService?.location || 'Addis Ababa';

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      {coverImage ? (
        <div className="relative h-48 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={coverImage} 
            alt={vendor.business_name} 
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80 mb-1">Verified Vendor</p>
            <h2 className="text-2xl font-bold text-white">{vendor.business_name}</h2>
          </div>
        </div>
      ) : (
        <>
          <div className="h-2 bg-gradient-to-r from-[#062E22] via-[#0a4a37] to-[#EC5B13]" />
          <div className="px-6 pt-6 pb-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Verified Vendor</p>
            <h2 className="mt-2 text-2xl font-bold text-[#062E22]">{vendor.business_name}</h2>
          </div>
        </>
      )}

      <div className="space-y-4 p-6 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">{serviceName}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {location}
            </p>
          </div>
          <div className="rounded-2xl bg-[#F5FBF8] px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-[0.1em] text-slate-400">Rating</p>
            <p className="mt-0.5 text-base font-bold text-[#062E22]">{vendor.rating.toFixed(1)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100">
          <span className="font-semibold text-[#062E22] transition group-hover:text-[#EC5B13]">
            View more details →
          </span>
        </div>
      </div>
    </Link>
  );
}
