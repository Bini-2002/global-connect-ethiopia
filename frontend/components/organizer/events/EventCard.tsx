'use client';

import Image from 'next/image';
import { MapPin, Calendar, MoreHorizontal } from 'lucide-react';
import { EventListItem } from '@/app/types/event';

interface EventCardProps {
  event: EventListItem;
  index: number;
  statusConfig: Record<string, { label: string; bgClass: string }>;
}

export default function EventCard({ event, index, statusConfig }: EventCardProps) {
  const status = statusConfig[event.status] || statusConfig.PENDING;
  const progress = event.progress || { proposal: 0, approval: 0, vendors: 0, tickets: 0 };

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden hover:shadow-lg transition cursor-pointer">
      <div className="h-40 relative">
        <Image
          src={event.image || '/event-placeholder.png'}
          alt={event.title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
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
        <p className="text-sm text-gray-500 mb-4">By {event.org || event.organization}</p>

        <div className="space-y-2">
          {Object.entries(progress).map(([key, value]) => (
            <div key={key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="capitalize text-gray-600">{key}</span>
                <span className="font-medium">{value}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <button className="flex-1 bg-[#062E22] text-white py-2 rounded-xl text-sm font-medium hover:bg-[#0a4a37] transition">
            Manage
          </button>
          <button className="flex-1 bg-gray-100 py-2 rounded-xl text-sm font-medium hover:bg-gray-200 transition">
            View
          </button>
          <button className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
