"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import { api } from "@/app/lib/api";
import { getOrganizerPortalRoute, getToken, waitForToken } from "@/app/lib/auth";
import { PastEvent, EventStats } from "@/app/types/event";
import { ProposalRecord } from "@/app/types/proposal";
import { 
  Plus, 
  Sparkles, 
  Copy, 
  LayoutTemplate, 
  ArrowRight, 
  FileText, 
  HelpCircle, 
  BookOpen, 
  Scale, 
  Building2, 
  Megaphone, 
  Phone,
  Users,
  Calendar,
  Loader2
} from "lucide-react";
import Image from "next/image";

function formatProposalDate(startDate?: string | null, endDate?: string | null): string {
  if (!startDate) return "Date pending";

  const start = new Date(startDate);
  if (!endDate) {
    return start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const end = new Date(endDate);
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startLabel} - ${endLabel}`;
}

function buildPastEventsFromProposals(proposals: ProposalRecord[]): PastEvent[] {
  return proposals
    .filter((proposal) => Boolean(proposal.event_id))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .map((proposal) => ({
      id: proposal.event_id ?? proposal.id,
      title: proposal.title,
      date: formatProposalDate(proposal.start_date, proposal.end_date),
      event_type: proposal.event_type ?? undefined,
    }));
}

function buildStatsFromProposals(proposals: ProposalRecord[]): EventStats {
  const eventWorkspaces = proposals.filter((proposal) => Boolean(proposal.event_id));
  const now = new Date();

  return {
    totalEvents: eventWorkspaces.length,
    thisMonth: eventWorkspaces.filter((proposal) => {
      const createdAt = new Date(proposal.created_at);
      return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
    }).length,
    drafts: proposals.filter((proposal) => proposal.status === "draft").length,
  };
}

export default function CreateEventPage() {
  const router = useRouter();
  const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
  const [stats, setStats] = useState<EventStats>({ totalEvents: 0, thisMonth: 0, drafts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const fetchData = async () => {
      try {
        const organizerRoute = await getOrganizerPortalRoute();
        if (!isActive) {
          return;
        }

        if (organizerRoute !== "/organizer/dashboard") {
          router.replace(organizerRoute);
          return;
        }

        const authToken = (await waitForToken(1500, 50)) ?? getToken();
        const proposals = await api.get<ProposalRecord[]>(
          "/proposals/",
          authToken ? { authToken } : undefined,
        );

        if (!isActive) {
          return;
        }

        setPastEvents(buildPastEventsFromProposals(proposals));
        setStats(buildStatsFromProposals(proposals));
      } catch (err) {
        if (!isActive) {
          return;
        }

        if (err instanceof Error && err.message === "Not authenticated") {
          router.replace("/login");
          return;
        }

        console.error("Error preparing create event page:", err);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      isActive = false;
    };
  }, [router]);

  return (
      <div className="min-h-screen ">
      <Sidebar role="organizer" />
      <DashboardHeader searchPlaceholder="Search events..." />
            <div className="fixed top-6 md:left-60 left-0 -z-10 pointer-events-none">
              <Image
                src="/Ellipse2.png"
                alt=""
                width={200}
                height={400}
                className="opacity-80"
              />
            </div>
            <div className="fixed bottom-6  right-0 -z-10 pointer-events-none">
              <Image
                src="/Ellipse3.png"
                alt=""
                width={200}
                height={400}
                className="opacity-80"
              />
            </div>
      <main className="md:ml-60 pt-3 md:pt-16">
        <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#062E22] mb-2">Create a New Event</h1>
            <p className="text-gray-500 text-base">Choose how you want to start your event creation journey</p>
          </div>

          {/* Quick Start Options */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-[#062E22] mb-6">Let&apos;s Get Started</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickStartCard 
                  icon={<Plus className="w-6 h-6" />}
                  iconBg="bg-emerald-100 text-emerald-600"
                  title="Start from Scratch"
                  description="Full control over your event"
                  href="/organizer/proposals/create"
                />
                <QuickStartCard 
                  icon={<Sparkles className="w-6 h-6" />}
                  iconBg="bg-orange-100 text-orange-600"
                  title="Use AI Assistant"
                  description="Generate event details with AI"
                  href="/organizer/ai-assistant"
                />
                <QuickStartCard 
                  icon={<Copy className="w-6 h-6" />}
                  iconBg="bg-blue-100 text-blue-600"
                  title="Clone from Existing"
                  description="Use previous event details"
                  href="#"
                />
                <QuickStartCard 
                  icon={<LayoutTemplate className="w-6 h-6" />}
                  iconBg="bg-purple-100 text-purple-600"
                  title="Use Template Gallery"
                  description="Choose from predefined templates"
                  href="#"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3  gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Steps Card */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-200">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-[#062E22] flex items-center gap-3">
                    <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-emerald-600" />
                    </span>
                    Start from Scratch
                  </h3>
                </div>
                <div className="p-4">
                  <div className="space-y-2">
                    <StepItem 
                      number={1} 
                      title="Submit Proposal" 
                      description="Provide event name, location, and basic details"
                    />
                    <StepItem 
                      number={2} 
                      title="Receive Approvals" 
                      description="Get necessary permissions from authorities"
                    />
                    <StepItem 
                      number={3} 
                      title="Complete Details" 
                      description="Add agenda, speakers, vendors, and logistics"
                    />
                    <StepItem 
                      number={4} 
                      title="Publish Event" 
                      description="Launch your event page and start promoting"
                    />
                  </div>
                </div>
              </div>

{/* AI Assistant with Image */}
              <div className="bg-[#0F47AF]/5 rounded-2xl shadow-md border-2 border-dashed border-blue-300 overflow-hidden relative">
                <div className="absolute top-4 right-4">
                  <Image 
                    src="/ai.png" 
                    alt="AI Assistant" 
                    width={60}
                    height={60}
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-[#062E22] flex items-center gap-3 mb-2">
                    <span className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-orange-600" />
                    </span>
                    AI Assistant Feature
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">Your Vision</p>
                  <input
                    type="text"
                    placeholder="Describe your event vision..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] bg-white mb-4"
                  />
                  <button className="w-full px-6 py-4 bg-[#062E22] text-white rounded-xl font-semibold hover:bg-[#0a4a37] transition-colors flex items-center justify-center gap-2 shadow-md">
                    <Sparkles className="w-5 h-5" />
                    Generate AI Draft
                  </button>
                </div>
              </div>

              {/* Clone from Existing */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-200">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-xl font-bold text-[#062E22] flex items-center gap-3">
                    <span className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Copy className="w-5 h-5 text-blue-600" />
                    </span>
                    Clone from Existing Event
                  </h3>
                  <p className="text-gray-500 text-sm mt-2">Start quickly with a proven event structure</p>
                </div>
                <div className="p-4">
                  {loading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-[#062E22]" />
                    </div>
                  ) : pastEvents.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No past events available</p>
                  ) : (
                    <div className="space-y-2">
                      {pastEvents.map(event => (
                        <CloneItem 
                          key={event.id}
                          title={event.title}
                          date={event.date}
                        />
                      ))}
                    </div>
                  )}
                </div>
</div>
</div>
            {/* Sidebar */}
            <div className="space-y-6">
              {/* Help & Resources */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-200">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-[#062E22] flex items-center gap-3">
                    <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <HelpCircle className="w-4 h-4 text-gray-600" />
                    </span>
                    Help & Resources
                  </h3>
                </div>
                <div className="p-3">
                  <ul className="space-y-1">
                    <ResourceLink icon={<BookOpen className="w-4 h-4" />} title="Hosting Guide" href="#" />
                    <ResourceLink icon={<Scale className="w-4 h-4" />} title="Legal FAQs" href="#" />
                    <ResourceLink icon={<Building2 className="w-4 h-4" />} title="Venue Partner List" href="#" />
                    <ResourceLink icon={<Megaphone className="w-4 h-4" />} title="Marketing Kits" href="#" />
                    <ResourceLink icon={<Phone className="w-4 h-4" />} title="Contact Support" href="#" />
                  </ul>
                </div>
              </div>

              {/* Tips & Best Practices */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-200">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-[#062E22] flex items-center gap-3">
                    <span className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-orange-600" />
                    </span>
                    Tips & Best Practices
                  </h3>
                </div>
                <div className="p-3">
                  <ul className="space-y-2">
                    <TipItem text="Submit your proposal at least 21 business days before" />
                    <TipItem text="Prepare all required documents in advance" />
                    <TipItem text="Include detailed security plans for large events" />
                    <TipItem text="Budget for at least 10% contingency" />
                  </ul>
                </div>
              </div>

              {/* Quick stats */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
                <h3 className="font-bold text-[#062E22] mb-3">Your Event Stats</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-500 text-sm">Total Events</span>
                    <span className="font-bold text-[#062E22]">{loading ? '-' : stats.totalEvents}</span>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-500 text-sm">This Month</span>
                    <span className="font-bold text-[#062E22]">{loading ? '-' : stats.thisMonth}</span>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-500 text-sm">Drafts</span>
                    <span className="font-bold text-[#062E22]">{loading ? '-' : stats.drafts}</span>
                  </div>
                </div>
              </div>
            </div>
         
          </div>

          {/* Template Gallery - Full Width */}
          <div className="mt-6">
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
              <h3 className="text-lg font-bold text-[#062E22] mb-3">Template Gallery</h3>
              <div className="grid grid-cols-3 md:grid-cols-3 gap-3">
                <TemplateCard icon={<Users />} title="Conference" color="bg-[#F1F3F5] text-blue-600" />
                <TemplateCard icon={<Calendar />} title="Concert" color="bg-[#F1F3F5]  text-purple-600" />
                <TemplateCard icon={<FileText />} title="Workshop" color="bg-[#F1F3F5]  text-emerald-600" />
                <TemplateCard icon={<Building2 />} title="Trade Fair" color="bg-[#F1F3F5]  text-orange-600" />
                <TemplateCard icon={<Sparkles />} title="Festival" color="bg-[#F1F3F5] ext-red-600" />
                <TemplateCard icon={<Calendar />} title="Gala" color="bg-[#F1F3F5] text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Components
interface QuickStartCardProps {
  icon: ReactNode;
  iconBg: string;
  title: string;
  description: string;
  href: string;
}

function QuickStartCard({ icon, iconBg, title, description, href }: QuickStartCardProps) {
  return (
    <Link href={href}>
      <div className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-[#062E22] hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer group h-full">
        <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center mb-4 transition-colors`}>
          {icon}
        </div>
        <h3 className="font-bold text-lg text-[#062E22] mb-2">{title}</h3>
        <p className="text-gray-500 text-sm">{description}</p>
      </div>
    </Link>
  );
}

interface StepItemProps {
  number: number;
  title: string;
  description: string;
}

function StepItem({ number, title, description }: StepItemProps) {
  return (
    <div className="flex gap-3 items-start p-2 rounded-xl hover:bg-gray-50 transition-colors">
      <div className="flex-shrink-0 w-6 h-6 bg-[#062E22] text-white rounded-full flex items-center justify-center font-semibold text-xs">
        {number}
      </div>
      <div className="flex-1 pt-0.5">
        <h4 className="font-medium text-[#062E22] text-sm">{title}</h4>
        <p className="text-gray-500 text-xs mt-0.5">{description}</p>
      </div>
    </div>
  );
}

interface CloneItemProps {
  title: string;
  date: string;
}

function CloneItem({ title, date }: CloneItemProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-[#062E22]/30 hover:bg-green-50/50 transition-all cursor-pointer group">
      <div>
        <h4 className="font-semibold text-gray-800 group-hover:text-[#062E22] transition-colors">{title}</h4>
        <p className="text-sm text-gray-400 mt-1">{date}</p>
      </div>
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-orange-600 transition-colors" />
      </div>
    </div>
  );
}

interface TemplateCardProps {
  icon: ReactNode;
  title: string;
  color: string;
}

function TemplateCard({ icon, title, color }: TemplateCardProps) {
  return (
    <div className={`flex flex-col items-center gap-2 p-4 rounded-2xl cursor-pointer hover:shadow-lg hover:scale-105 transition-all ${color} border border-transparent hover:border-current/20`}>
      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
        {icon}
      </div>
      <span className="text-xs font-semibold text-gray-700">{title}</span>
    </div>
  );
}

interface ResourceLinkProps {
  icon: ReactNode;
  title: string;
  href: string;
}

function ResourceLink({ icon, title, href }: ResourceLinkProps) {
  return (
    <li>
      <a 
        href={href}
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-green-50 hover:text-[#062E22] transition-colors"
      >
        <span className="text-[#EC5B13]">{icon}</span>
        <span className="text-sm">{title}</span>
      </a>
    </li>
  );
}

interface TipItemProps {
  text: string;
}

function TipItem({ text }: TipItemProps) {
  return (
    <li className="flex items-start gap-2 text-sm text-gray-600">
      <span className="text-[#EC5B13] mt-0.5">•</span>
      {text}
    </li>
  );
}
