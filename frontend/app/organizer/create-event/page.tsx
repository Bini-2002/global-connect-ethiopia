"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import { isLoggedIn } from "@/app/lib/auth";
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
  Calendar
} from "lucide-react";

export default function CreateEventPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="organizer" />
      <DashboardHeader searchPlaceholder="Search events..." />
      <main className="md:ml-60 pt-3 md:pt-16">
        <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#062E22] mb-2">Create a New Event</h1>
            <p className="text-gray-500">Choose how you want to start your event creation journey</p>
          </div>

          {/* Quick Start Options */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Choose Your Starting Point</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <QuickStartCard 
                icon={<Plus className="w-5 h-5" />}
                title="Start from Scratch"
                description="Full control over your event"
                href="/organizer/proposals/create"
              />
              <QuickStartCard 
                icon={<Sparkles className="w-5 h-5" />}
                title="Use AI Assistant"
                description="Generate event details with AI"
                href="/organizer/ai-assistant"
              />
              <QuickStartCard 
                icon={<Copy className="w-5 h-5" />}
                title="Clone from Existing"
                description="Use previous event details"
                href="#"
              />
              <QuickStartCard 
                icon={<LayoutTemplate className="w-5 h-5" />}
                title="Use Template Gallery"
                description="Choose from predefined templates"
                href="#"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Steps Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-[#062E22] flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#EC5B13]" />
                    Event Creation Steps
                  </h3>
                </div>
                <div className="p-5">
                  <div className="space-y-4">
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-[#062E22] flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#EC5B13]" />
                    AI Event Assistant
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">Let AI help you create the perfect event</p>
                </div>
                <div className="p-5">
                  <div className="flex gap-6 items-start">
                    <div className="flex-shrink-0">
                      <Image 
                        src="/ai.png" 
                        alt="AI Assistant" 
                        width={120}
                        height={120}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-600 mb-4">
                        Our AI assistant can help you plan your event by suggesting event types, 
                        budget allocations, security requirements, and more. Get personalized 
                        recommendations based on your needs.
                      </p>
                      <div className="flex gap-3">
                        <input
                          type="number"
                          placeholder="Enter budget (ETB)"
                          className="flex-1 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] bg-gray-50"
                        />
                        <button className="px-5 py-3 bg-[#062E22] text-white rounded-lg font-medium hover:bg-[#0a4a37] transition-colors flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Generate
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clone from Existing */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-[#062E22] flex items-center gap-2">
                    <Copy className="w-5 h-5 text-[#EC5B13]" />
                    Clone from Existing Event
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">Start quickly with a proven event structure</p>
                </div>
                <div className="p-4">
                  <div className="space-y-2">
                    <CloneItem 
                      title="National Innovation Summit 2024"
                      date="March 15, 2024"
                    />
                    <CloneItem 
                      title="Regional Farmers Workshop"
                      date="February 20, 2024"
                    />
                    <CloneItem 
                      title="Digital Health Expo"
                      date="January 10, 2024"
                    />
                  </div>
                </div>
              </div>

              {/* Template Gallery */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-[#062E22] flex items-center gap-2">
                    <LayoutTemplate className="w-5 h-5 text-[#EC5B13]" />
                    Template Gallery
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">Quick start with professionally designed templates</p>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    <TemplateCard icon={<Users />} title="Conference" color="bg-blue-100 text-blue-600" />
                    <TemplateCard icon={<Calendar />} title="Concert" color="bg-purple-100 text-purple-600" />
                    <TemplateCard icon={<FileText />} title="Workshop" color="bg-green-100 text-green-600" />
                    <TemplateCard icon={<Building2 />} title="Trade Fair" color="bg-orange-100 text-orange-600" />
                    <TemplateCard icon={<Sparkles />} title="Festival" color="bg-red-100 text-red-600" />
                    <TemplateCard icon={<Calendar />} title="Gala" color="bg-yellow-100 text-yellow-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Help & Resources */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-[#062E22] flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-[#EC5B13]" />
                    Help & Resources
                  </h3>
                </div>
                <div className="p-4">
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-[#062E22] flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#EC5B13]" />
                    Tips & Best Practices
                  </h3>
                </div>
                <div className="p-4">
                  <ul className="space-y-3">
                    <TipItem 
                      text="Submit your proposal at least 21 business days before the event"
                    />
                    <TipItem 
                      text="Prepare all required documents in advance"
                    />
                    <TipItem 
                      text="Include detailed security plans for large events"
                    />
                    <TipItem 
                      text="Budget for at least 10% contingency"
                    />
                  </ul>
                </div>
              </div>

              {/* Quick stats */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="font-semibold text-[#062E22] mb-4">Your Event Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Total Events</span>
                    <span className="font-semibold text-[#062E22]">12</span>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">This Month</span>
                    <span className="font-semibold text-[#062E22]">3</span>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Drafts</span>
                    <span className="font-semibold text-[#062E22]">2</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Components
function QuickStartCard({ icon, title, description, href }: any) {
  return (
    <Link href={href}>
      <div className="bg-white rounded-xl p-5 border border-gray-200 hover:border-[#062E22] hover:shadow-md transition-all cursor-pointer group">
        <div className="w-10 h-10 bg-[#062E22]/10 rounded-lg flex items-center justify-center mb-3 text-[#062E22] group-hover:bg-[#062E22] group-hover:text-white transition-colors">
          {icon}
        </div>
        <h3 className="font-semibold text-[#062E22] mb-1">{title}</h3>
        <p className="text-gray-500 text-sm">{description}</p>
        <div className="mt-3 flex items-center gap-1 text-sm font-medium text-[#EC5B13]">
          Get Started <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}

function StepItem({ number, title, description }: any) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex-shrink-0 w-8 h-8 bg-[#062E22] text-white rounded-full flex items-center justify-center font-semibold text-sm">
        {number}
      </div>
      <div className="flex-1 pt-1">
        <h4 className="font-medium text-[#062E22]">{title}</h4>
        <p className="text-gray-500 text-sm">{description}</p>
      </div>
    </div>
  );
}

function CloneItem({ title, date }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-[#062E22]/30 hover:bg-green-50/50 transition-colors cursor-pointer group">
      <div>
        <h4 className="font-medium text-gray-800 group-hover:text-[#062E22] transition-colors">{title}</h4>
        <p className="text-sm text-gray-400">{date}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#EC5B13] transition-colors" />
    </div>
  );
}

function TemplateCard({ icon, title, color }: any) {
  return (
    <div className={`flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer hover:shadow-sm transition-all ${color}`}>
      <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center">
        {icon}
      </div>
      <span className="text-xs font-medium text-gray-700">{title}</span>
    </div>
  );
}

function ResourceLink({ icon, title, href }: any) {
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

function TipItem({ text }: any) {
  return (
    <li className="flex items-start gap-2 text-sm text-gray-600">
      <span className="text-[#EC5B13] mt-0.5">•</span>
      {text}
    </li>
  );
}
