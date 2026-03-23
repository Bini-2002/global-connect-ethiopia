'use client';

import Link from 'next/link';
import { 
  Plus,
  UtensilsCrossed,
  Volume2,
  Shield,
} from 'lucide-react';
import { EventListItem, ApprovedProposal } from '@/app/types/event';

interface EventsSidebarProps {
  events: EventListItem[];
  approvedProposals: ApprovedProposal[];
}

const getVendorIcon = (category: string) => {
  switch (category) {
    case 'Catering':
      return <UtensilsCrossed className="w-5 h-5 text-[#062E22]" />;
    case 'Audio/Visual':
      return <Volume2 className="w-5 h-5 text-[#062E22]" />;
    case 'Security':
      return <Shield className="w-5 h-5 text-[#062E22]" />;
    default:
      return <Shield className="w-5 h-5 text-[#062E22]" />;
  }
};

export default function EventsSidebar({ events, approvedProposals }: EventsSidebarProps) {
  return (
    <div className="w-full lg:w-70 xl:w-75 space-y-10 bg-[#F6F7F8] md:pr-2 md:pt-18  ">
      <div className="flex items-center gap-3">
        <Link
          href="/organizer/create-event"
          className="flex w-full md:mx-5  items-center justify-center gap-2 px-4 py-2.5 bg-[#062E22] text-white  font-bold text-lg rounded-xl hover:bg-[#0a4a37] transition shadow-2xl"
        >
          <Plus className="w-4 h-4" />
          Create New Event
        </Link>
      </div>

      {/* Approved Proposals Card */}
      <div className=" md:pl-1 md:pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-regular text-[#475569]">APPROVED PROPOSALS ({approvedProposals.length})</h2>
        </div>
        <div className="space-y-3">
          {approvedProposals
            .sort((a, b) => new Date(b.approved_date).getTime() - new Date(a.approved_date).getTime())
            .map(proposal => (
              <Link
                key={proposal.id}
                href={`/organizer/create-event/${proposal.event_id}`}
                className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#062E22] truncate">{proposal.title}</p>
                  <p className="text-xs text-gray-500">
                    Approved: {new Date(proposal.approved_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <span className="text-[#EC5B13] flex-shrink-0 ml-2">→</span>
              </Link>
            ))}
        </div>
      </div>

      {/* Upcoming Deadlines Card */}
      <div className="pl-1">
        <div className="flex items-center  mb-4 justify-between">
          <h2 className="text-lg font-regular text-[#475569]">UPCOMING DEADLINES</h2>
          <Link href="/organizer/proposals?status=approved" className="text-sm text-[#EC5B13]  ">
            View All →
          </Link>
        </div>
        <div className="space-y-4">
          {events.filter(e => e.status === 'LIVE' || e.status === 'UPCOMING').slice(0, 3).map(event => (
            <div key={event.id} className={event.status ==='LIVE' ?"flex items-center justify-between p-3 bg-white border-l-2  border-red-500 rounded-lg" : 'flex items-center justify-between p-3 bg-white border-l-2 rounded-lg border-amber-300'}>
              <div>
                <p className="font-semibold text-sm text-[#062E22]">{event.title}</p>
                <p className="text-xs text-gray-500">{event.date}</p>
              </div>
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium">
                {event.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Vendors */}
      <div className=" pl-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-regular text-[#475569]">FEATURED VENDORS</h2>
          <Link href="/organizer/vendors" className="text-sm text-[#EC5B13] ">
            View All →
          </Link>
        </div>
        <div className="space-y-3">
          {[
            { name: 'Ethio Catering', category: 'Catering' },
            { name: 'Addis Sound & Lights', category: 'Audio/Visual' },
            { name: 'Bole Security', category: 'Security' },
          ].map((vendor, i) => (
            <div key={i} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition">
              <div>
                {getVendorIcon(vendor.category)}
              </div>
              <div>
                <h3 className="font-bold text-[#062E22]">{vendor.name}</h3>
                <p className="text-sm text-gray-500">{vendor.category}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
