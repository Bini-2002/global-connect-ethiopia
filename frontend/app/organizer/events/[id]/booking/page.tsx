/* frontend/app/organizer/events/[id]/booking/page.tsx */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QrCode } from "lucide-react";
import { api } from "@/app/lib/api";
import { useEventWorkspace } from "@/app/hooks/useEventWorkspace";
import { eventsService } from "@/app/services/eventsService";
import { EventBookingRecord } from "@/app/types/event";
import {
  EventWorkspaceShell,
  formatDateTime,
  sentenceCase,
  startOfInputDateTime,
} from "@/components/organizer/events";

export default function EventBookingPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { event, loading, error, refresh, setError } =
    useEventWorkspace(eventId);
  const [bookings, setBookings] = useState<EventBookingRecord[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [bookingSettings, setBookingSettings] = useState({
    booking_required: false,
    booking_opens_at: "",
    booking_closes_at: "",
    required_attendee_fields: "",
  });

  const loadBookings = async () => {
    try {
      setLoadingBookings(true);
      setError(null);
      const response = await eventsService.getMyBookings(eventId);
      setBookings(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    void loadBookings();
  }, [eventId]);

  useEffect(() => {
    if (!event) return;
    setBookingSettings({
      booking_required: event.booking_required,
      booking_opens_at: startOfInputDateTime(
        event.booking_opens_at || event.start_date,
      ),
      booking_closes_at: startOfInputDateTime(
        event.booking_closes_at || event.end_date,
      ),
      required_attendee_fields: (event.required_attendee_fields || []).join(
        ", ",
      ),
    });
  }, [event]);

  const confirmedBookings = useMemo(
    () =>
      bookings.filter((booking) => booking.booking_status === "confirmed")
        .length,
    [bookings],
  );

  const handleSaveSettings = async () => {
    if (!event) return;
    try {
      setSavingSettings(true);
      setError(null);
      await eventsService.updateBookingSettings(event.id, {
        booking_required: bookingSettings.booking_required,
        booking_opens_at: bookingSettings.booking_opens_at
          ? new Date(bookingSettings.booking_opens_at).toISOString()
          : null,
        booking_closes_at: bookingSettings.booking_closes_at
          ? new Date(bookingSettings.booking_closes_at).toISOString()
          : null,
        allow_waitlist: false,
        required_attendee_fields: bookingSettings.required_attendee_fields
          .split(",")
          .map((field) => field.trim())
          .filter(Boolean),
      });
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save booking settings",
      );
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <EventWorkspaceShell
      event={event}
      loading={loading}
      error={error}
      activeTab="booking"
      aside={
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#062E22]">
              Booking Snapshot
            </h2>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Status
                </p>
                <p className="text-lg font-bold text-[#062E22] mt-2">
                  {sentenceCase(event?.booking_status)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Confirmed
                </p>
                <p className="text-lg font-bold text-[#062E22] mt-2">
                  {confirmedBookings}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Booked Count
                </p>
                <p className="text-lg font-bold text-[#062E22] mt-2">
                  {event?.booked_count ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Remaining
                </p>
                <p className="text-lg font-bold text-[#062E22] mt-2">
                  {event?.remaining_slots ?? 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#062E22]">Presenter Tip</h2>
            <p className="text-sm text-slate-600 mt-4">
              Publish the event first, enable booking, then open the public
              attendee event page to create one real attendee reservation for
              the demo.
            </p>
          </div>
        </div>
      }
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#062E22]">Booking Settings</h2>
        <div className="grid md:grid-cols-2 gap-4 mt-5">
          <label className="rounded-xl border border-slate-200 p-4 flex items-start gap-3">
            <input
              type="checkbox"
              checked={bookingSettings.booking_required}
              onChange={(eventValue) =>
                setBookingSettings((current) => ({
                  ...current,
                  booking_required: eventValue.target.checked,
                }))
              }
              className="mt-1"
            />
            <div>
              <p className="font-semibold text-[#062E22]">
                Require advance booking
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Needed for attendee reservation and QR generation.
              </p>
            </div>
          </label>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-800">
              Waitlist disabled in Phase 1
            </p>
            <p className="text-sm text-amber-700 mt-1">
              When capacity is full, new bookings are rejected immediately.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">
              Booking Opens
            </label>
            <input
              type="datetime-local"
              aria-label="Booking opens date and time"
              placeholder="Select booking open date and time"
              value={bookingSettings.booking_opens_at}
              onChange={(eventValue) =>
                setBookingSettings((current) => ({
                  ...current,
                  booking_opens_at: eventValue.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">
              Booking Closes
            </label>
            <input
              type="datetime-local"
              aria-label="Booking closes date and time"
              placeholder="Select booking close date and time"
              value={bookingSettings.booking_closes_at}
              onChange={(eventValue) =>
                setBookingSettings((current) => ({
                  ...current,
                  booking_closes_at: eventValue.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">
              Required Attendee Fields
            </label>
            <input
              value={bookingSettings.required_attendee_fields}
              onChange={(eventValue) =>
                setBookingSettings((current) => ({
                  ...current,
                  required_attendee_fields: eventValue.target.value,
                }))
              }
              placeholder="company, job_title, phone"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <p className="text-xs text-slate-500 mt-2">
              These fields will be required from attendees on the public booking
              form.
            </p>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={() => void handleSaveSettings()}
            disabled={savingSettings}
            className="px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
          >
            {savingSettings ? "Saving..." : "Save Booking Settings"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#062E22]">
          Attendee Booking Flow
        </h2>
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-[#062E22]">
              Public event rules
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Only public published or live events can accept bookings.</li>
              <li>Only attendee accounts can create a booking.</li>
              <li>Each attendee can hold one booking per event.</li>
              <li>
                Confirmed bookings immediately generate QR and check-in pass
                assets.
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-[#062E22]">Demo route</p>
            <p className="text-sm text-slate-600 mt-3">
              Open the attendee-facing page for this event and reserve a seat
              there to demonstrate the stricter Phase 1 flow.
            </p>
            <Link
              href={`/events/${eventId}`}
              target="_blank"
              className="inline-flex mt-4 px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition"
            >
              Open Attendee Booking Page
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#062E22]">Booking List</h2>
        {loadingBookings ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 mt-4">
            No bookings yet.
          </div>
        ) : (
          <div className="space-y-4 mt-5">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-base font-semibold text-[#062E22]">
                        {booking.attendee_name ||
                          booking.attendee_email ||
                          booking.booking_reference}
                      </h3>
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${booking.booking_status === "confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {sentenceCase(booking.booking_status)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                      Reference: {booking.booking_reference}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      Created {formatDateTime(booking.created_at)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      Check-in: {sentenceCase(booking.check_in_status)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {booking.qr_code_image_url ? (
                      <Link
                        href={api.resolveUrl(booking.qr_code_image_url)}
                        target="_blank"
                        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                      >
                        <QrCode className="w-4 h-4" />
                        QR Image
                      </Link>
                    ) : null}
                    {booking.check_in_pass_image_url ? (
                      <Link
                        href={api.resolveUrl(booking.check_in_pass_image_url)}
                        target="_blank"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition"
                      >
                        Pass
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </EventWorkspaceShell>
  );
}
