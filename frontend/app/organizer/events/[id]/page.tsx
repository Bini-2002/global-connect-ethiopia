"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  FileBarChart2,
  Landmark,
  ShieldAlert,
  Tickets,
  Users,
  Wallet,
} from "lucide-react";
import { eventsService } from "@/app/services/eventsService";
import { useEventWorkspace } from "@/app/hooks/useEventWorkspace";
import {
  EventWorkspaceShell,
  formatCurrency,
  formatDateRange,
  formatDateTime,
  sentenceCase,
} from "@/components/organizer/events";

const workspaceCards = [
  {
    title: "Budget Planning",
    description: "Track estimated and actual costs before you go live.",
    href: (eventId: string) => `/organizer/events/${eventId}/budget`,
    icon: Wallet,
  },
  {
    title: "Schedule Builder",
    description: "Create manual sessions or let the AI draft an agenda.",
    href: (eventId: string) => `/organizer/events/${eventId}/schedule`,
    icon: CalendarDays,
  },
  {
    title: "Venue Reservation",
    description: "Search venues, reserve one, and confirm the booking.",
    href: (eventId: string) => `/organizer/events/${eventId}/venue`,
    icon: Landmark,
  },
  {
    title: "Team Setup",
    description: "Invite collaborators and track active members.",
    href: (eventId: string) => `/organizer/events/${eventId}/team`,
    icon: Users,
  },
  {
    title: "Task Tracker",
    description: "Assign work, update statuses, and keep delivery visible.",
    href: (eventId: string) => `/organizer/events/${eventId}/tasks`,
    icon: CheckSquare,
  },
  {
    title: "Booking & QR",
    description: "Open reservations, create test bookings, and show QR passes.",
    href: (eventId: string) => `/organizer/events/${eventId}/booking`,
    icon: Tickets,
  },
  {
    title: "Announcements",
    description:
      "Send immediate notices, store scheduled records, and run them manually.",
    href: (eventId: string) => `/organizer/events/${eventId}/announcements`,
    icon: ClipboardCheck,
  },
  {
    title: "Operations Center",
    description:
      "Handle badges, check-in, and incidents during live execution.",
    href: (eventId: string) => `/organizer/events/${eventId}/operations`,
    icon: ShieldAlert,
  },
  {
    title: "Wrap-Up & Reporting",
    description: "Send surveys and publish the final report after the event.",
    href: (eventId: string) => `/organizer/events/${eventId}/wrap-up`,
    icon: FileBarChart2,
  },
];

export default function OrganizerEventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { event, loading, error, setEvent, setError } =
    useEventWorkspace(eventId);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (
    action: "publish" | "start" | "complete" | "archive",
  ) => {
    if (!event) return;
    try {
      setActionLoading(action);
      setError(null);
      const updated =
        action === "publish"
          ? await eventsService.publishEvent(event.id)
          : action === "start"
            ? await eventsService.startLiveEvent(event.id)
            : action === "complete"
              ? await eventsService.completeEvent(event.id)
              : await eventsService.archiveEvent(event.id);
      setEvent(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const actions = event ? (
    <>
      <Link
        href={`/organizer/proposals/${event.proposal_id}`}
        className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
      >
        Open Proposal
      </Link>
      {event.status === "draft" ? (
        <button
          onClick={() => void handleAction("publish")}
          disabled={!!actionLoading}
          className="px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
        >
          {actionLoading === "publish" ? "Publishing..." : "Publish Event"}
        </button>
      ) : null}
      {event.status === "published" || event.status === "private_published" ? (
        <button
          onClick={() => void handleAction("start")}
          disabled={!!actionLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {actionLoading === "start" ? "Starting..." : "Start Live"}
        </button>
      ) : null}
      {event.status === "live" ||
      event.status === "published" ||
      event.status === "private_published" ? (
        <button
          onClick={() => void handleAction("complete")}
          disabled={!!actionLoading}
          className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
        >
          {actionLoading === "complete" ? "Completing..." : "Mark Complete"}
        </button>
      ) : null}
      {event.status === "completed" ? (
        <button
          onClick={() => void handleAction("archive")}
          disabled={!!actionLoading}
          className="px-4 py-2 bg-slate-700 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-50"
        >
          {actionLoading === "archive" ? "Archiving..." : "Archive"}
        </button>
      ) : null}
    </>
  ) : null;

  const aside = event ? (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#062E22]">Permit & Routing</h2>
        <div className="space-y-4 mt-4 text-sm text-slate-600">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Permit Number
            </p>
            <p className="font-semibold text-[#062E22] mt-1">
              {event.permit_number || "Pending permit link"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Ministry Office
            </p>
            <p className="font-semibold text-[#062E22] mt-1">
              {event.office_assignments?.ministry?.office_name ||
                "Not assigned"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Municipal Office
            </p>
            <p className="font-semibold text-[#062E22] mt-1">
              {event.office_assignments?.municipal?.office_name ||
                "Not assigned"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Police Notification
            </p>
            <p className="font-semibold text-[#062E22] mt-1">
              {event.office_assignments?.police?.office_name || "Not assigned"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#062E22]">Presentation Notes</h2>
        <div className="space-y-3 mt-4 text-sm text-slate-600">
          <p>
            Show how one approved proposal becomes a complete event operations
            workspace.
          </p>
          <p>
            Use the booking tab to demo attendee reservations and QR generation
            after you publish the event.
          </p>
          <p>
            Use the operations tab to show that announcements, incident
            handling, badges, and check-in are already wired.
          </p>
        </div>
      </div>
    </div>
  ) : undefined;

  return (
    <EventWorkspaceShell
      event={event}
      loading={loading}
      error={error}
      activeTab="overview"
      actions={actions}
      aside={aside}
    >
      {event ? (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#062E22]">Event Overview</h2>
            <div className="grid md:grid-cols-2 gap-4 mt-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Location
                </p>
                <p className="text-sm font-medium text-slate-700 mt-1">
                  {event.location || "Not set"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Capacity
                </p>
                <p className="text-sm font-medium text-slate-700 mt-1">
                  {event.capacity || 0}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Visibility
                </p>
                <p className="text-sm font-medium text-slate-700 mt-1">
                  {sentenceCase(event.visibility)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Event Dates
                </p>
                <p className="text-sm font-medium text-slate-700 mt-1">
                  {formatDateRange(event.start_date, event.end_date)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Published At
                </p>
                <p className="text-sm font-medium text-slate-700 mt-1">
                  {formatDateTime(event.published_at)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Estimated Budget
                </p>
                <p className="text-sm font-medium text-slate-700 mt-1">
                  {formatCurrency(
                    event.budget_total_estimated,
                    event.budget_currency,
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Program Summary
              </p>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                {event.program_schedule_summary ||
                  "No program summary has been added yet."}
              </p>
            </div>

            {event.description ? (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Description
                </p>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  {event.description}
                </p>
              </div>
            ) : null}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#062E22]">
              Execution Readiness
            </h2>
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Venue Status
                </p>
                <p className="text-sm font-semibold text-[#062E22] mt-2">
                  {sentenceCase(event.venue_status)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Booking Status
                </p>
                <p className="text-sm font-semibold text-[#062E22] mt-2">
                  {sentenceCase(event.booking_status)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Booked Slots
                </p>
                <p className="text-sm font-semibold text-[#062E22] mt-2">
                  {event.booked_count}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Remaining Slots
                </p>
                <p className="text-sm font-semibold text-[#062E22] mt-2">
                  {event.remaining_slots}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#062E22]">
                  Workspace Shortcuts
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  These pages are now built on top of the backend event APIs.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-5">
              {workspaceCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.title}
                    href={card.href(event.id)}
                    className="group rounded-2xl border border-slate-200 p-5 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="w-11 h-11 rounded-2xl bg-[#062E22]/10 text-[#062E22] flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-semibold text-[#062E22] mt-4">
                          {card.title}
                        </h3>
                        <p className="text-sm text-slate-500 mt-2">
                          {card.description}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#062E22]" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#062E22]">
              Suggested Demo Flow
            </h2>
            <div className="grid md:grid-cols-4 gap-4 mt-5">
              {[
                "Open the event overview and show the approval-linked workspace.",
                "Move to schedule and venue to show planning and approvals turned into execution.",
                "Open booking to reserve a seat and show QR-based attendee handling.",
                "Finish on operations and wrap-up to prove the project covers the full lifecycle.",
              ].map((step, index) => (
                <div
                  key={step}
                  className="rounded-xl bg-slate-50 border border-slate-200 p-4"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Step {index + 1}
                  </p>
                  <p className="text-sm font-semibold text-[#062E22] mt-2">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </EventWorkspaceShell>
  );
}
