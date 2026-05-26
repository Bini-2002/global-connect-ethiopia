'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FileText, Target, Users, Building, Rocket, BookOpen, Calendar, Store, MapPin, ArrowRight } from 'lucide-react';
import AIAssistantIcon from '@/components/AIAssistantIcon';

const upcomingEventsData = [
  {
    id: 'evt-001',
    title: 'Tech Summit Ethiopia',
    date: 'Mar 25, 2026',
    location: 'Addis Convention Center',
    image: '/event-tech.jpg',
    gradient: 'from-blue-600 to-purple-700',
  },
  {
    id: 'evt-002',
    title: 'Cultural Heritage Festival',
    date: 'Apr 10, 2026',
    location: 'Ethio-Russian Friendship Hall',
    image: '/event-culture.jpg',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 'evt-003',
    title: 'Business Forum 2026',
    date: 'Apr 22, 2026',
    location: 'Hyatt Regency',
    image: '/event-business.jpg',
    gradient: 'from-emerald-600 to-teal-700',
  },
];

const vendorsData = [
  {
    id: 'vnd-001',
    name: 'Ethio Catering Services',
    category: 'Catering & Hospitality',
    rating: 4.8,
    image: '/vendor-catering.jpg',
    gradient: 'from-rose-500 to-pink-600',
  },
  {
    id: 'vnd-002',
    name: 'Addis Sound & Lights',
    category: 'Audio/Visual Equipment',
    rating: 4.6,
    image: '/vendor-av.jpg',
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'vnd-003',
    name: 'Bole Security Co.',
    category: 'Security Services',
    rating: 4.5,
    image: '/vendor-security.jpg',
    gradient: 'from-slate-600 to-gray-700',
  },
];

export default function EmptyDashboard({ onOpenAI }: { onOpenAI: () => void }) {
  return (
    <>
      <div id='start' className='flex flex-col lg:flex-row gap-6 lg:gap-20 justify-between mb-8'> 
        <div className="bg-white shadow w-full lg:w-[700px] xl:w-[800px] rounded-2xl p-4 md:p-6">
          <div className='flex flex-col md:flex-row justify-center items-center'>
            <Image width={200} height={200} src='/dashback.png' alt='' className="md:w-[240px] md:h-[240px]" />
            <div className='ml-0 md:ml-5 space-y-2 mt-4 md:mt-0'>
              <h1 className="font-bold text-base md:text-lg mt-2 flex items-center gap-2">
                <AIAssistantIcon className="w-5 h-5 text-[#EC5B13]" />
                You haven't created any events yet.
              </h1>
              <p className='text-gray-600 text-sm md:text-base'>
                Start your journey by setting up your first event. Reach
                thousands of attendees in Ethiopia and beyond with our
                seamless platform.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link href="/organizer/create-event" className="px-3 md:px-4 py-2 bg-[#062E22] text-white rounded-xl font-bold hover:bg-green-800 text-sm md:text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Create Your First Event
            </Link>
            <button className="px-3 md:px-4 py-2 border rounded-xl font-bold hover:bg-gray-100 text-sm md:text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              View Guidelines
            </button>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-[#062E22]/95 via-[#0B3A2E]/90 to-[#1E6F5C]/80 text-white rounded-2xl shadow p-6 flex flex-col justify-between w-full lg:w-80">
          <div>
            <h2 className="text-xl font-bold mt-5 mb-10 lg:mb-15 flex items-center gap-2">
              <AIAssistantIcon className="w-6 h-6" />
              AI Assistant
            </h2>
            <p className="text-sm">
              Need help planning your Event? Ask me anything.
            </p>
          </div>
          <div className="mt-6">
            <button onClick={onOpenAI} className="w-full px-4 py-2 bg-white text-[#062E22] rounded-lg font-semibold hover:bg-gray-100 flex items-center justify-center gap-2">
              <AIAssistantIcon className="w-4 h-4" />
              Ask AI Assistant
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-4 md:p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-base md:text-lg font-bold text-[#062E22] flex items-center gap-2">
            <Target className="w-5 h-5 text-[#EC5B13]" />
            Strategic Roadmap
          </h2>
          <span className="text-xs md:text-sm font-semibold text-[#062E22]">0% COMPLETE</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 md:h-3 mb-6">
          <div className="bg-[#062E22] h-2 md:h-3 rounded-full w-0"></div>
        </div>
        <div className="space-y-4 md:space-y-6">
          <div className="flex items-start gap-3 opacity-50">
            <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-gray-400 text-gray-400 font-bold text-sm md:text-base">01</div>
            <div>
              <h3 className="font-semibold text-gray-500 text-sm md:text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Create Event
              </h3>
              <p className="text-xs md:text-sm text-gray-400">Basic info, dates, and event branding.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 opacity-50">
            <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-gray-400 text-gray-400 font-bold text-sm md:text-base">02</div>
            <div>
              <h3 className="font-semibold text-gray-500 text-sm md:text-base flex items-center gap-2">
                <Target className="w-4 h-4" />
                Strategic Planning
              </h3>
              <p className="text-xs md:text-sm text-gray-400">Defining event KPIs and core objectives.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 opacity-50">
            <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-gray-400 text-gray-400 font-bold text-sm md:text-base">03</div>
            <div>
              <h3 className="font-semibold text-gray-500 text-sm md:text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Partner Onboarding
              </h3>
              <p className="text-xs md:text-sm text-gray-400">Connecting with regional vendor networks.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 opacity-50">
            <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-gray-400 text-gray-400 font-bold text-sm md:text-base">04</div>
            <div>
              <h3 className="font-semibold text-gray-500 text-sm md:text-base flex items-center gap-2">
                <Rocket className="w-4 h-4" />
                Launch Sequence
              </h3>
              <p className="text-xs md:text-sm text-gray-400">Go-live and ticketing system activation.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-4 md:p-6 mb-8">
        <div className='flex justify-between items-center mb-6'>
          <h2 className="text-xl font-bold text-[#062E22] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#EC5B13]" />
            Upcoming Events
          </h2>
          <Link href="/organizer/events" className="text-sm text-[#EC5B13] hover:underline font-medium flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {upcomingEventsData.map((event) => (
            <div key={event.id} className="relative group overflow-hidden rounded-xl h-64 cursor-pointer">
              <div className={`absolute inset-0 bg-gradient-to-br ${event.gradient}`} />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition" />
              <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {event.date}
                </div>
                <h3 className="text-xl font-bold mb-2">{event.title}</h3>
                <div className="flex items-center gap-2 text-sm text-white/90">
                  <MapPin className="w-4 h-4" />
                  <span>{event.location}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="px-4 py-2 bg-white text-gray-900 rounded-lg font-semibold text-sm hover:bg-gray-100 transition flex items-center gap-2">
                    View Details
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-4 md:p-6 mb-8">
        <div className='flex justify-between items-center mb-6'>
          <h2 className="text-xl font-bold text-[#062E22] flex items-center gap-2">
            <Store className="w-5 h-5 text-[#EC5B13]" />
            Featured Vendors
          </h2>
          <Link href="/organizer/vendors" className="text-sm text-[#EC5B13] hover:underline font-medium flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {vendorsData.map((vendor) => (
            <div key={vendor.id} className="relative group overflow-hidden rounded-xl h-64 cursor-pointer">
              <div className={`absolute inset-0 bg-gradient-to-br ${vendor.gradient}`} />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition" />
              <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium">
                  ★ {vendor.rating}
                </div>
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-3">
                  <Store className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-1">{vendor.name}</h3>
                <p className="text-sm text-white/90">{vendor.category}</p>
                <div className="mt-4">
                  <button className="px-4 py-2 bg-white text-gray-900 rounded-lg font-semibold text-sm hover:bg-gray-100 transition flex items-center gap-2">
                    Contact Vendor
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
