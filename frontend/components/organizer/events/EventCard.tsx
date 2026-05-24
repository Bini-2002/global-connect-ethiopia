'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Calendar } from 'lucide-react';
import { EventListItem } from '@/app/types/event';

interface EventCardProps {
  event: EventListItem;
  index: number;
  statusConfig: Record<string, { label: string; bgClass: string }>;
}

export default function EventCard({ event, index, statusConfig }: EventCardProps) {
  const status = statusConfig[event.status] || statusConfig.PENDING;
  const progress = event.progress || { proposal: 0, approval: 0, vendors: 0, booking: 0 };

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden hover:shadow-lg transition">
      <div className="h-40 relative">
        {event.image ? (
          <>
            <Image
              src={event.image}
              alt={event.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#062E22]/5 to-[#062E22]/10 flex items-center justify-center">
            <svg className="w-12 h-12 text-[#062E22]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
        )}
        <span className={`absolute top-4 left-4 z-10 text-xs px-2 py-1 rounded ${status.bgClass}`}>
          {status.label}
        </span>
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-xs flex items-center gap-1 mb-1 text-white">
            <MapPin size={12} /> {event.location}
          </p>
          <p className="text-xs flex items-center gap-1 text-white">
            <Calendar size={12} /> {event.date}
          </p>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-[#062E22]">{event.title}</h3>
        <p className="text-sm text-gray-500 mb-4">
          {event.event_type || 'Professional event'}
          {event.booking_required ? ` • ${event.remaining_slots ?? 0} slots left` : ''}
        </p>

        <div className="grid grid-cols-2 gap-3">
          {['proposal', 'approval', 'vendors', 'booking'].map((key) => {
            const value = progress[key as keyof typeof progress] || 0;
            const barColor = value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-400';
            const pillColor = value >= 80 ? 'text-emerald-700 bg-emerald-50' : value >= 50 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';
            return (
              <div key={key}>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="capitalize font-medium text-gray-600">{key}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${pillColor}`}>{value}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 mt-4">
          <Link
            href={`/organizer/events/${event.id}`}
            className="flex-1 text-center bg-[#062E22]/80 text-white py-2 rounded-xl text-sm font-medium hover:bg-[#062E22] transition"
          >
            Manage
          </Link>
          <Link
            href={`/organizer/proposals/${event.proposal_id}`}
            className="flex-1 text-center bg-gray-100 py-2 rounded-xl text-sm font-medium hover:bg-gray-200 transition"
          >
            View
          </Link>

        </div>
      </div>
    </div>
  );
}
