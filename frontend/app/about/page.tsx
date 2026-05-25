'use client';

import Link from 'next/link';
import { useState } from 'react';
import { getRole, isLoggedIn, logout } from '../lib/auth';
import SiteHeader from '../../components/SiteHeader';
import {
  LayoutDashboard,
  Store,
  Calendar,
  FileText,
  Ticket,
  Sparkles,
  Palette,
  Users,
  Globe,
  Shield,
  UserCheck,
  Target,
  XCircle,
  Check,
} from 'lucide-react';

const FEATURES = [
  {
    icon: <LayoutDashboard className="w-7 h-7" />,
    title: 'Organizer Dashboard',
    desc: 'Plan and manage events independently with a complete digital workspace.',
  },
  {
    icon: <Store className="w-7 h-7" />,
    title: 'Vendor Marketplace',
    desc: 'Discover and book trusted service providers including catering, photography, AV, and logistics.',
  },
  {
    icon: <Calendar className="w-7 h-7" />,
    title: 'Centralized Event Calendar',
    desc: 'Prevent scheduling conflicts and venue congestion across major events.',
  },
  {
    icon: <FileText className="w-7 h-7" />,
    title: 'Digital Licensing System',
    desc: 'Submit and approve event permits digitally through integrated government workflows.',
  },
  {
    icon: <Ticket className="w-7 h-7" />,
    title: 'QR Ticketing System',
    desc: 'Secure ticket sales with QR codes and real-time validation for attendees.',
  },
  {
    icon: <Sparkles className="w-7 h-7" />,
    title: 'AI-Powered Assistance',
    desc: 'Smart scheduling, budgeting, and event planning powered by artificial intelligence.',
  },
  {
    icon: <Palette className="w-7 h-7" />,
    title: 'Design Tool',
    desc: 'Create event flyers and promotional materials with an integrated design workspace.',
  },
];

const AUDIENCES = [
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Event Organizers',
    desc: 'Individuals, companies, institutions, and youth groups planning professional events.',
  },
  {
    icon: <Store className="w-6 h-6" />,
    title: 'Vendors',
    desc: 'Catering, photography, AV, logistics, and other service providers.',
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: 'International Hosts',
    desc: 'NGOs, embassies, and corporate organizations hosting events in Ethiopia.',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Government Bodies',
    desc: 'Institutions responsible for licensing and event regulation.',
  },
  {
    icon: <UserCheck className="w-6 h-6" />,
    title: 'Attendees',
    desc: 'Users who want to discover and attend secure, well-organized events.',
  },
];

const PROBLEMS = [
  'High costs from traditional event agencies that exclude small organizers',
  'Fragmented communication relying on emails, calls, and spreadsheets',
  'Frequent event overlaps due to lack of centralized scheduling',
  'Unregulated ticket sales leading to overcrowding and security risks',
  'Slow and manual government licensing processes',
];

const TEAM = [
  { name: 'Biniyam Getachew', role: 'Developer' },
  { name: 'Mikiyas Assefa', role: 'Developer' },
  { name: 'Samrawit Alemu', role: 'Developer' },
  { name: 'Meron Gedamu', role: 'Developer' },
  { name: 'Miraf Tsegaye', role: 'Developer' },
];

const IMPACTS = [
  { title: 'Digitize the Industry', desc: 'Replace manual workflows with a unified digital platform for event management.' },
  { title: 'Support Local SMEs', desc: 'Give small businesses visibility and fair market access through our vendor marketplace.' },
  { title: 'Improve Safety & Trust', desc: 'Ensure transparency and security in event management and ticketing.' },
  { title: 'Modern Infrastructure', desc: 'Build secure, scalable digital infrastructure for Ethiopia\'s event ecosystem.' },
];

export default function AboutPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const loggedIn = isLoggedIn();
  const role = getRole();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <SiteHeader
        solid
        loggedIn={loggedIn}
        role={role}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogout={handleLogout}
      />

      {/* About Us */}
      <section className="mx-auto max-w-3xl px-4 pt-24 pb-0 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-[#062E22]">About us</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          Global Connect Ethiopia is an intelligent, homegrown web-based event management platform
          designed to transform how professional events are planned, managed, and executed in Ethiopia.
          It acts as a unified digital ecosystem that connects organizers with trusted vendors,
          professionals, travel networks, and regulatory bodies. The platform makes event organization
          more transparent, accessible, and fully client-driven.
        </p>
      </section>

      {/* Mission & Vision */}
      <section className="mx-auto max-w-3xl px-4 pt-12 pb-20 sm:px-6 lg:px-8 space-y-12">
        <div>
          <h2 className="text-xl font-bold text-[#062E22]">Our Mission</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            The mission of Global Connect Ethiopia is to empower individuals, institutions, and
            international organizers to independently design and host high-quality events through a
            centralized and affordable digital system.
          </p>
          <ul className="mt-6 space-y-3">
            <li className="flex items-start gap-3 text-sm text-slate-600">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#062E22]/10 text-[#062E22]">
                <Check className="w-3 h-3" />
              </span>
              Reduce cost barriers by eliminating dependence on expensive external event agencies
            </li>
            <li className="flex items-start gap-3 text-sm text-slate-600">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#062E22]/10 text-[#062E22]">
                <Check className="w-3 h-3" />
              </span>
              Centralize all event operations including vendors, logistics, communication, and management
            </li>
            <li className="flex items-start gap-3 text-sm text-slate-600">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#062E22]/10 text-[#062E22]">
                <Check className="w-3 h-3" />
              </span>
              Improve coordination and eliminate scheduling conflicts across major events
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold text-[#062E22]">Our Vision</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            The vision is to build a localized and scalable digital ecosystem that modernizes
            Ethiopia&apos;s event industry and makes it globally competitive.
          </p>
          <ul className="mt-6 space-y-3">
            <li className="flex items-start gap-3 text-sm text-slate-600">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#062E22]/10 text-[#062E22]">
                <Check className="w-3 h-3" />
              </span>
              Replacing fragmented and manual systems with a unified national platform
            </li>
            <li className="flex items-start gap-3 text-sm text-slate-600">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#062E22]/10 text-[#062E22]">
                <Check className="w-3 h-3" />
              </span>
              Positioning Ethiopia as a regional hub for professional events (MICE industry)
            </li>
            <li className="flex items-start gap-3 text-sm text-slate-600">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#062E22]/10 text-[#062E22]">
                <Check className="w-3 h-3" />
              </span>
              Introducing AI-powered automation for smarter event planning and management
            </li>
          </ul>
        </div>
      </section>

      {/* Core Features */}
      <section className="bg-slate-900 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white">Core Features</h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-400 font-medium">
              Global Connect Ethiopia provides a complete digital solution for event management.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 hover:shadow-lg hover:shadow-black/10"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EC5B13]/20 text-[#EC5B13] group-hover:bg-[#EC5B13]/30 group-hover:scale-110 transition-all duration-300">
                  {feature.icon}
                </div>
                <h3 className="mt-5 text-lg font-bold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It Is For */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Our Audience</h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-500 font-medium">
            The platform serves a wide range of users across the event ecosystem.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {AUDIENCES.map((audience) => (
            <div
              key={audience.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#062E22]/10 text-[#062E22]">
                {audience.icon}
              </div>
              <h3 className="mt-4 text-sm font-bold text-[#062E22]">{audience.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{audience.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Built by ASTU Students</h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-500 font-medium">
            Developed by Computer Science and Engineering students from Adama Science and Technology
            University (ASTU), School of Electrical Engineering and Computing.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {TEAM.map((member) => (
            <div
              key={member.name}
              className="flex flex-col items-center rounded-2xl bg-white border border-slate-200 p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md w-44"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#062E22] to-[#0A4A37] text-white text-xl font-bold">
                {member.name.charAt(0)}
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-900 text-center">{member.name}</h3>
              <p className="mt-1 text-xs font-medium text-slate-400">{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Impact & Goals */}
      <section className="bg-[#062E22] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white">Our Commitment</h2>
            <p className="mx-auto max-w-2xl text-lg text-white/70 font-medium">
              Global Connect Ethiopia aims to transform the event landscape through these key objectives.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {IMPACTS.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-lg transition-all duration-300 hover:-translate-y-1 hover:bg-white/10"
              >
                <h3 className="text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-4">
          Ready to Transform Your Event Experience?
        </h2>
        <p className="mx-auto max-w-xl text-base font-medium text-slate-500 mb-8">
          Join thousands of organizers, vendors, and attendees building Ethiopia&apos;s event ecosystem.
        </p>
        <Link
          href="/register"
          className="inline-block rounded-xl bg-[#062E22] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#0A4A37] transition-all duration-300"
        >
          Start Organizing Your Event
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-[#02100C] px-4 pt-20 pb-10 text-white relative z-10 border-t border-white/5">
        <div className="mx-auto grid max-w-7xl gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-6">
            <div className="flex items-center gap-3 font-bold group">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#062E22] to-[#0A4A37]">
                <span className="text-lg font-black text-white">G</span>
              </div>
              <span className="text-xl tracking-tight font-extrabold text-white">Global Connect</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400 font-medium">
              The statutory digital coordination network simplifying regulatory permit workflows,
              vendor verification status, and attendee QR verification tags in Addis Ababa and beyond.
            </p>
          </div>

          <div className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#EC5B13]">Quick Navigation</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-400">
              <li><Link href="/about" className="hover:text-[#EC5B13] transition-colors">About Our Vision</Link></li>
              <li><Link href="/faqs" className="hover:text-[#EC5B13] transition-colors">Regulatory FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-[#EC5B13] transition-colors">Submit Inquiry Support</Link></li>
              <li><Link href="/terms" className="hover:text-[#EC5B13] transition-colors">Portal Terms & Disclaimer</Link></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#EC5B13]">Platform Portals</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-400">
              <li><Link href="/login" className="hover:text-[#EC5B13] transition-colors">Organizer Workspace</Link></li>
              <li><Link href="/login" className="hover:text-[#EC5B13] transition-colors">Vendor Service Desk</Link></li>
              <li><Link href="/login" className="hover:text-[#EC5B13] transition-colors">Municipal Approvals Portal</Link></li>
              <li><Link href="/login" className="hover:text-[#EC5B13] transition-colors">Attendee Registration</Link></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#EC5B13]">System Integrity</h4>
            <div className="space-y-3 text-xs font-medium text-slate-400">
              <p className="flex gap-2"><span className="text-[#EC5B13]">✓</span> Permitting workflow officially aligned with Ministry protocols.</p>
              <p className="flex gap-2"><span className="text-[#EC5B13]">✓</span> Automated QR codes securely verified against local registries.</p>
              <p className="flex gap-2"><span className="text-[#EC5B13]">✓</span> AI chatbot operates under licensing regulations advisory.</p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-20 max-w-7xl border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs font-medium text-slate-500">
            &copy; 2026 Global Connect Ethiopia. All statutory rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="#" className="text-slate-500 hover:text-[#EC5B13] transition-colors">Twitter</Link>
            <Link href="#" className="text-slate-500 hover:text-[#EC5B13] transition-colors">LinkedIn</Link>
            <Link href="#" className="text-slate-500 hover:text-[#EC5B13] transition-colors">Instagram</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
