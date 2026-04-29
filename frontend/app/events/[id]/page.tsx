/* frontend/app/events/[id]/page.tsx */

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { api } from "@/app/lib/api";
import { getRole, isLoggedIn } from "@/app/lib/auth";
import { eventsService } from "@/app/services/eventsService";
import {
  AnnouncementDeliveryRecord,
  EventBookingRecord,
  EventRecord,
  EventScheduleItemRecord,
} from "@/app/types/event";

function formatEventType(type?: string | null): string {
  if (!type) return "Professional Event";
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ");
}

function formatDateRange(
  startDate?: string | null,
  endDate?: string | null,
): string {
  if (!startDate) return "Schedule to be announced";

  const start = new Date(startDate);
  if (!endDate) {
    return start.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  const end = new Date(endDate);
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} - ${endLabel}`;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "TBA";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(value?: number | null): string {
  if (value === undefined || value === null) return "N/A";
  return new Intl.NumberFormat("en-ET", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(value);
}

function useProtectedImage(imagePath?: string | null) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!imagePath) {
      setObjectUrl(null);
      return;
    }

    let active = true;
    let localUrl: string | null = null;

    const loadImage = async () => {
      try {
        setLoading(true);
        const blob = await api.getBlob(imagePath);
        if (!active) return;
        localUrl = URL.createObjectURL(blob);
        setObjectUrl(localUrl);
      } catch {
        if (active) {
          setObjectUrl(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadImage();

    return () => {
      active = false;
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
    };
  }, [imagePath]);

  return { objectUrl, loading };
}

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [identityReady, setIdentityReady] = useState(false);
  const [loggedInState, setLoggedInState] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [schedule, setSchedule] = useState<EventScheduleItemRecord[]>([]);
  const [booking, setBooking] = useState<EventBookingRecord | null>(null);
  const [inboxAnnouncements, setInboxAnnouncements] = useState<
    AnnouncementDeliveryRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    attendee_name: "",
    attendee_email: "",
    slots_requested: 1,
    notes: "",
    attendee_profile: {} as Record<string, string>,
  });

  useEffect(() => {
    setLoggedInState(isLoggedIn());
    setRole(getRole());
    setIdentityReady(true);
  }, []);

  useEffect(() => {
    if (!identityReady || !loggedInState) {
      setLoading(false);
      return;
    }

    let active = true;

    const loadPage = async () => {
      try {
        setLoading(true);
        setError(null);

        const [eventResponse, scheduleResponse] = await Promise.all([
          eventsService.getEventById(eventId),
          eventsService.getEventSchedule(eventId).catch(() => []),
        ]);

        if (!active) return;

        setEvent(eventResponse);
        setSchedule(scheduleResponse);

        if (getRole() === "attendee") {
          const [myBookings, inbox] = await Promise.all([
            eventsService.getMyBookings(eventId).catch(() => []),
            api
              .get<
                AnnouncementDeliveryRecord[]
              >("/users/me/in-app-announcements")
              .catch(() => []),
          ]);
          if (!active) return;
          setBooking(myBookings[0] ?? null);
          setInboxAnnouncements(
            inbox.filter((item) => item.event_id === eventId),
          );
        }
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Unable to load this event.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadPage();

    return () => {
      active = false;
    };
  }, [eventId, identityReady, loggedInState]);

  const { objectUrl: qrImageUrl, loading: qrLoading } = useProtectedImage(
    booking?.qr_code_image_url,
  );
  const { objectUrl: passImageUrl, loading: passLoading } = useProtectedImage(
    booking?.check_in_pass_image_url,
  );

  const canReserve = useMemo(() => {
    if (!event || role !== "attendee") return false;
    if (!event.booking_required) return false;
    if (booking) return false;
    if (event.visibility !== "public") return false;
    return ["published", "live"].includes(event.status);
  }, [booking, event, role]);

  const bookingWindowLabel = useMemo(() => {
    if (!event?.booking_required)
      return "This event does not require advance booking.";

    if (event.booking_opens_at && event.booking_closes_at) {
      return `Booking window: ${formatDateTime(event.booking_opens_at)} to ${formatDateTime(event.booking_closes_at)}.`;
    }
    if (event.booking_opens_at) {
      return `Booking opens at ${formatDateTime(event.booking_opens_at)}.`;
    }
    if (event.booking_closes_at) {
      return `Booking closes at ${formatDateTime(event.booking_closes_at)}.`;
    }
    return "Booking is controlled directly from the event workspace.";
  }, [event]);

  const refreshEventAndBooking = async () => {
    const [eventResponse, bookingResponse] = await Promise.all([
      eventsService.getEventById(eventId),
      eventsService.getMyBookings(eventId),
    ]);
    setEvent(eventResponse);
    setBooking(bookingResponse[0] ?? null);
  };

  const handleBookingSubmit = async (
    eventForm: React.FormEvent<HTMLFormElement>,
  ) => {
    eventForm.preventDefault();
    setSubmitError(null);

    try {
      setSubmitting(true);
      const created = await eventsService.createBooking(eventId, {
        attendee_name: form.attendee_name || undefined,
        attendee_email: form.attendee_email || undefined,
        slots_requested: Number(form.slots_requested) || 1,
        notes: form.notes || undefined,
        attendee_profile: form.attendee_profile,
      });
      setBooking(created);
      await refreshEventAndBooking();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Unable to complete your booking.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const requiredFields = event?.required_attendee_fields || [];

  return (
    <main className="min-h-screen bg-[#F8FBF9] text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#062E22] hover:underline"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to homepage
            </Link>
            {!loggedInState && (
              <Link
                href="/login"
                className="rounded-lg bg-[#062E22] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a4a37]"
              >
                Sign in to reserve
              </Link>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">
              Attendee event detail
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#062E22] sm:text-4xl">
              Review the event, then reserve your place.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500">
              This page is connected to the current booking backend. Once your
              reservation is confirmed, your QR code and check-in pass appear
              here for testing and event-day use.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {!loggedInState && identityReady ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-[#062E22]">
              Sign in as an attendee to continue
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">
              The attendee booking flow starts after login. Once signed in, you
              can review the event details, reserve a seat, and receive your QR
              check-in pass.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-xl bg-[#062E22] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a37]"
            >
              Go to login
            </Link>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
          </div>
        ) : error || !event ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error || "Event not found."}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-6">
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="bg-gradient-to-br from-[#062E22] via-[#0d4f39] to-[#1A5C45] p-6 text-white">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold tracking-wide">
                      {formatEventType(event.category)}
                    </span>
                    <span className="rounded-full bg-[#8ECFC0]/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#CFF7EE]">
                      {event.status}
                    </span>
                  </div>
                  <h2 className="mt-5 text-3xl font-extrabold">
                    {event.title}
                  </h2>
                  <p className="mt-3 text-base text-white/80">
                    {formatDateRange(event.start_date, event.end_date)}
                  </p>
                  <p className="mt-2 text-sm text-white/70">
                    {event.location || "Venue to be announced"}
                  </p>
                </div>

                <div className="grid gap-4 p-6 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      Capacity
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[#062E22]">
                      {event.capacity || 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      Remaining Slots
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[#062E22]">
                      {event.remaining_slots}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      Booking Status
                    </p>
                    <p className="mt-2 text-lg font-bold text-[#062E22]">
                      {event.booking_status}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 p-6">
                  <h3 className="text-lg font-bold text-[#062E22]">
                    Important details
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {event.description ||
                      "The organizer has not added a longer event description yet."}
                  </p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        Permit number
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#062E22]">
                        {event.permit_number ||
                          "Available after authority linkage"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        Booking window
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {bookingWindowLabel}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4 md:col-span-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        Required attendee information
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {requiredFields.length ? (
                          requiredFields.map((field) => (
                            <span
                              key={field}
                              className="rounded-full bg-[#F5FBF8] px-3 py-1 text-xs font-semibold text-[#062E22]"
                            >
                              {field.replace(/_/g, " ")}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">
                            No extra attendee fields configured for this event.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">
                      Agenda preview
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-[#062E22]">
                      Event schedule
                    </h3>
                  </div>
                  <span className="rounded-full bg-[#F5FBF8] px-3 py-1 text-xs font-semibold text-[#062E22]">
                    {schedule.length} session{schedule.length === 1 ? "" : "s"}
                  </span>
                </div>

                {schedule.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                    The organizer has not published the session-level schedule
                    yet.
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {schedule.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h4 className="text-base font-semibold text-[#062E22]">
                              {item.session_title}
                            </h4>
                            <p className="mt-2 text-sm text-slate-500">
                              {item.description ||
                                "Session details will be refined closer to the event."}
                            </p>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            <p>{formatDateTime(item.start_time)}</p>
                            <p className="mt-1">
                              {formatDateTime(item.end_time)}
                            </p>
                            <p className="mt-2 font-medium text-[#062E22]">
                              {item.room_location || "Main event floor"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">
                  Reserve your seat
                </p>
                <h3 className="mt-2 text-2xl font-bold text-[#062E22]">
                  Booking panel
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  Confirm your details here. Confirmed reservations generate a
                  QR image and a branded check-in pass.
                </p>

                {role !== "attendee" ? (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    This reservation action is currently enabled for attendee
                    accounts. Your current role is {role || "unknown"}.
                  </div>
                ) : booking ? (
                  <div className="mt-5 space-y-5">
                    <div className="rounded-2xl bg-[#F5FBF8] p-4">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        Booking reference
                      </p>
                      <p className="mt-1 text-lg font-bold text-[#062E22]">
                        {booking.booking_reference}
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            Status
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#062E22]">
                            {booking.booking_status}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            Check-in
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#062E22]">
                            {booking.check_in_status}
                          </p>
                        </div>
                      </div>
                      <p className="mt-4 text-xs text-slate-500">
                        Reserved for {booking.slots_requested} seat
                        {booking.slots_requested === 1 ? "" : "s"}.
                      </p>
                    </div>

                    {booking.booking_status === "confirmed" ? (
                      <>
                        <div className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#062E22]">
                                QR code
                              </p>
                              <p className="text-xs text-slate-500">
                                Use this at check-in.
                              </p>
                            </div>
                            {booking.qr_code_image_url && qrImageUrl && (
                              <a
                                href={qrImageUrl}
                                download={`booking-${booking.booking_reference}-qr.png`}
                                className="text-sm font-semibold text-[#062E22] hover:underline"
                              >
                                Download
                              </a>
                            )}
                          </div>
                          <div className="mt-4 flex min-h-[220px] items-center justify-center rounded-2xl bg-slate-50 p-4">
                            {qrLoading ? (
                              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
                            ) : qrImageUrl ? (
                              <img
                                src={qrImageUrl}
                                alt="Booking QR code"
                                className="max-h-52 rounded-xl border border-slate-200 bg-white p-3"
                              />
                            ) : (
                              <p className="text-sm text-slate-500">
                                QR image could not be loaded.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#062E22]">
                                Check-in pass
                              </p>
                              <p className="text-xs text-slate-500">
                                Preview the attendee pass generated for this
                                event.
                              </p>
                            </div>
                            {booking.check_in_pass_image_url &&
                              passImageUrl && (
                                <a
                                  href={passImageUrl}
                                  download={`booking-${booking.booking_reference}-pass.png`}
                                  className="text-sm font-semibold text-[#062E22] hover:underline"
                                >
                                  Download
                                </a>
                              )}
                          </div>
                          <div className="mt-4 flex min-h-[220px] items-center justify-center rounded-2xl bg-slate-50 p-4">
                            {passLoading ? (
                              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
                            ) : passImageUrl ? (
                              <img
                                src={passImageUrl}
                                alt="Booking check-in pass"
                                className="max-h-60 rounded-xl border border-slate-200 bg-white shadow-sm"
                              />
                            ) : (
                              <p className="text-sm text-slate-500">
                                Check-in pass image could not be loaded.
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                        This reservation is not confirmed yet, so a QR code has
                        not been issued.
                      </div>
                    )}
                  </div>
                ) : canReserve ? (
                  <form
                    onSubmit={handleBookingSubmit}
                    className="mt-5 space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="attendee_name"
                        className="mb-1 block text-sm font-medium text-slate-700"
                      >
                        Full name
                      </label>
                      <input
                        id="attendee_name"
                        value={form.attendee_name}
                        onChange={(eventForm) =>
                          setForm((current) => ({
                            ...current,
                            attendee_name: eventForm.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                        placeholder="Enter the attendee name"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="attendee_email"
                        className="mb-1 block text-sm font-medium text-slate-700"
                      >
                        Email address
                      </label>
                      <input
                        id="attendee_email"
                        type="email"
                        value={form.attendee_email}
                        onChange={(eventForm) =>
                          setForm((current) => ({
                            ...current,
                            attendee_email: eventForm.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                        placeholder="Enter the attendee email"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="slots_requested"
                        className="mb-1 block text-sm font-medium text-slate-700"
                      >
                        Seats to reserve
                      </label>
                      <input
                        id="slots_requested"
                        type="number"
                        min={1}
                        max={20}
                        value={form.slots_requested}
                        onChange={(eventForm) =>
                          setForm((current) => ({
                            ...current,
                            slots_requested:
                              Number(eventForm.target.value) || 1,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Remaining slots: {formatCurrency(event.remaining_slots)}
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="notes"
                        className="mb-1 block text-sm font-medium text-slate-700"
                      >
                        Notes for the organizer
                      </label>
                      <textarea
                        id="notes"
                        value={form.notes}
                        onChange={(eventForm) =>
                          setForm((current) => ({
                            ...current,
                            notes: eventForm.target.value,
                          }))
                        }
                        rows={4}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                        placeholder="Optional seating or attendee notes"
                      />
                    </div>

                    {requiredFields.map((field) => (
                      <div key={field}>
                        <label
                          htmlFor={field}
                          className="mb-1 block text-sm font-medium text-slate-700"
                        >
                          {field.replace(/_/g, " ")}
                        </label>
                        <input
                          id={field}
                          value={form.attendee_profile[field] || ""}
                          onChange={(eventForm) =>
                            setForm((current) => ({
                              ...current,
                              attendee_profile: {
                                ...current.attendee_profile,
                                [field]: eventForm.target.value,
                              },
                            }))
                          }
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                          placeholder={`Enter ${field.replace(/_/g, " ")}`}
                        />
                      </div>
                    ))}

                    {submitError && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {submitError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-xl bg-[#062E22] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a37] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting
                        ? "Confirming reservation..."
                        : "Reserve Place"}
                    </button>
                  </form>
                ) : (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    {event.booking_required
                      ? "Booking is not currently available for this event."
                      : "This event is viewable here, but it does not currently use advance booking."}
                  </div>
                )}
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">
                  Event readiness
                </p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      Published at
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#062E22]">
                      {formatDateTime(event.published_at)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      Visibility
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#062E22]">
                      {event.visibility}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      Venue status
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#062E22]">
                      {event.venue_status}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">
                  In-app announcements
                </p>
                <div className="mt-4 space-y-3">
                  {inboxAnnouncements.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      No in-app announcements have been delivered to your
                      attendee inbox for this event yet.
                    </div>
                  ) : (
                    inboxAnnouncements.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <p className="text-sm font-semibold text-[#062E22]">
                          {item.subject}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDateTime(item.delivered_at || item.created_at)}
                        </p>
                        <p className="text-sm text-slate-600 mt-3">
                          {item.body}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
