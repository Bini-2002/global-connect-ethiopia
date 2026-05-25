'use client';

import Link from 'next/link';
import {
  Building2, UtensilsCrossed, Sparkles, ShieldCheck, Radio,
  Camera, Truck, Monitor, Music, Users, PenTool, Megaphone,
  BarChart3, HeartHandshake, Store,
} from 'lucide-react';

import { MarketplaceVendorRecord } from '@/app/types/marketplace';

function getCategoryIcon(category: string | null) {
  if (!category) return Store;
  const cat = category.toLowerCase();
  if (cat.includes('hotel') || cat.includes('venue')) return Building2;
  if (cat.includes('cater') || cat.includes('food')) return UtensilsCrossed;
  if (cat.includes('decor')) return Sparkles;
  if (cat.includes('security')) return ShieldCheck;
  if (cat.includes('audio') || cat.includes('visual') || cat.includes('sound')) return Radio;
  if (cat.includes('photo') || cat.includes('video') || cat.includes('camera')) return Camera;
  if (cat.includes('transport') || cat.includes('logistic') || cat.includes('truck')) return Truck;
  if (cat.includes('software') || cat.includes('it ') || cat.includes('computer')) return Monitor;
  if (cat.includes('entertain') || cat.includes('performer') || cat.includes('music')) return Music;
  if (cat.includes('model') || cat.includes('host')) return Users;
  if (cat.includes('graphics') || cat.includes('graphic') || cat.includes('design')) return PenTool;
  if (cat.includes('social') || cat.includes('media') || cat.includes('promot')) return Megaphone;
  if (cat.includes('market') || cat.includes('advert')) return BarChart3;
  if (cat.includes('volunteer') || cat.includes('facilit')) return HeartHandshake;
  return Store;
}

interface VendorCardProps {
  vendor: MarketplaceVendorRecord;
  href: string;
}

export default function VendorCard({ vendor, href }: VendorCardProps) {
  const primaryService = vendor.service_records?.[0];
  const coverImage = primaryService?.images?.[0]?.url;
  const serviceName = primaryService?.title || vendor.services?.[0] || 'Service Offering';
  const location = primaryService?.location || 'Addis Ababa';
  const description = primaryService?.description || '';
  const category = primaryService?.category || '';
  const pricingType = primaryService?.pricing_type || '';
  const tags = primaryService?.tags || [];
  const descriptionExcerpt = description.length > 80 ? description.slice(0, 80) + '...' : description;
  const memberSince = vendor.created_at
    ? new Date(vendor.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    : '';

  return (
    <Link
      href={href}
      className="vendor-card group h-full flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md"
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
            {vendor.is_verified ? (
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300 flex items-center gap-1 mb-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            ) : (
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60 mb-1 block">Pending Verification</span>
            )}
            <h2 className="text-2xl font-bold text-white">{vendor.business_name}</h2>
          </div>
        </div>
      ) : (
        <div className="relative h-48 w-full bg-gradient-to-br from-[#062E22]/5 to-[#062E22]/10 flex items-center justify-center">
            {(() => {
              const Icon = getCategoryIcon(vendor.business_category ?? category);
              return <Icon className="w-12 h-12 text-[#062E22]/30" />;
            })()}
          </div>
      )}

      <div className="flex flex-1 flex-col p-6 pt-4">
        <div className="flex-1 space-y-3">
          {/* Category & Pricing badges */}
          {(category || pricingType) && (
            <div className="flex items-center gap-2 flex-wrap">
              {category && (
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                  {category}
                </span>
              )}
              {pricingType && (
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${
                  pricingType === 'fixed'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {pricingType === 'fixed' ? 'Fixed Price' : 'Negotiable'}
                </span>
              )}
            </div>
          )}

          {/* Service name + rating */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate">{serviceName}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{location}</span>
              </p>
            </div>
            <div className="rounded-2xl bg-[#F5FBF8] px-3 py-2 text-right flex-shrink-0">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-400">Rating</p>
              <p className="mt-0.5 text-base font-bold text-[#062E22]">{vendor.rating.toFixed(1)}</p>
            </div>
          </div>

          {/* Description excerpt */}
          {descriptionExcerpt && (
            <p className="text-xs text-slate-500 leading-relaxed">{descriptionExcerpt}</p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[#062E22]/5 text-[#062E22]/70">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm pt-3 border-t border-slate-100 mt-auto">
          {memberSince && (
            <span className="text-xs text-slate-400">Member since {memberSince}</span>
          )}
          <span className="font-semibold text-[#062E22] transition group-hover:text-[#EC5B13] ml-auto">
            View more details →
          </span>
        </div>
      </div>
    </Link>
  );
}
