'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Hotel, Plus, Loader2, CheckCircle2, AlertCircle, Trash2, CalendarRange, Download, X } from 'lucide-react';
import { useEventWorkspace } from '@/app/hooks/useEventWorkspace';
import { EventWorkspaceShell } from '@/components/organizer/events';
import { api } from '@/app/lib/api';

interface HotelVendor {
  vendor_id: string; business_name: string; business_address: string; website_url?: string;
  service_name?: string; cover_image?: string;
  service_details?: Record<string, any>;
}

interface RoomForm {
  vip_name: string; vip_email: string; room_type: 'single' | 'double' | 'luxury';
  bed_preference: string; floor_preference: string; smoking_preference: string;
  meal_plan: string; special_requests: string[]; notes: string;
}

interface HotelReservation {
  id: string; hotel_name: string; hotel_address?: string;
  check_in_date: string; check_out_date: string; number_of_nights: number;
  total_amount: number; status: string; payment_status: string;
  receipt_available: boolean; hotel_response_note?: string;
  rooms: Array<{ room_index: number; vip_name: string; vip_email: string; room_type: string;
    bed_preference: string; floor_preference: string; smoking_preference: string;
    meal_plan: string; special_requests: string[]; notes?: string; assigned_room_number?: string }>;
  created_at: string; confirmed_at?: string;
}

const SPECIAL_REQUEST_OPTIONS = ['Late Checkout', 'Airport Transfer', 'Crib', 'Extra Bed', 'High Floor', 'Quiet Room'];

const emptyRoom = (): RoomForm => ({
  vip_name: '', vip_email: '', room_type: 'single',
  bed_preference: 'no_preference', floor_preference: 'no_preference',
  smoking_preference: 'non_smoking', meal_plan: 'room_only',
  special_requests: [], notes: '',
});

const STATUS_COLORS: Record<string, string> = {
  pending_hotel_review: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  payment_released: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function VipHotelReservationsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { event, loading, error, setError } = useEventWorkspace(eventId);

  const [vendors, setVendors] = useState<HotelVendor[]>([]);
  const [reservations, setReservations] = useState<HotelReservation[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form state
  const [selectedVendor, setSelectedVendor] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [nights, setNights] = useState(1);
  const [totalAmount, setTotalAmount] = useState('');
  const [rooms, setRooms] = useState<RoomForm[]>([emptyRoom()]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedVendorInfo, setExpandedVendorInfo] = useState<string | null>(null);

  // Release payment state
  const [releasing, setReleasing] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadingData(true);
      const [v, r] = await Promise.all([
        api.get<HotelVendor[]>(`/events/${eventId}/vip-hotel-reservations/hotel-vendors`),
        api.get<HotelReservation[]>(`/events/${eventId}/vip-hotel-reservations`),
      ]);
      setVendors(v);
      setReservations(r);
    } catch { /* silent */ } finally { setLoadingData(false); }
  }, [eventId]);

  useEffect(() => { void load(); }, [load]);

  // Auto-calc nights
  useEffect(() => {
    if (checkIn && checkOut) {
      const diff = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
      setNights(diff);
    }
  }, [checkIn, checkOut]);

  const updateRoom = (idx: number, field: keyof RoomForm, value: string | string[]) => {
    setRooms(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const toggleSR = (roomIdx: number, val: string) => {
    setRooms(prev => prev.map((r, i) => {
      if (i !== roomIdx) return r;
      const has = r.special_requests.includes(val);
      return { ...r, special_requests: has ? r.special_requests.filter(x => x !== val) : [...r.special_requests, val] };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(''); setSuccess('');
    if (!selectedVendor) { setFormError('Please select a hotel.'); return; }
    if (!checkIn || !checkOut) { setFormError('Please set check-in and check-out dates.'); return; }
    if (!totalAmount || parseFloat(totalAmount) <= 0) { setFormError('Enter the total payment amount.'); return; }
    setSubmitting(true);
    try {
      await api.post(`/events/${eventId}/vip-hotel-reservations`, {
        vendor_id: selectedVendor, check_in_date: checkIn, check_out_date: checkOut,
        number_of_nights: nights, total_amount: parseFloat(totalAmount),
        rooms: rooms.map(r => ({ ...r, notes: r.notes || undefined })),
      });
      setSuccess('Reservation submitted! Payment locked in escrow. The hotel will assign room numbers shortly.');
      setSelectedVendor(''); setCheckIn(''); setCheckOut(''); setTotalAmount('');
      setRooms([emptyRoom()]);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create reservation');
    } finally { setSubmitting(false); }
  };

  const handleRelease = async (id: string) => {
    if (!confirm('Release payment to the hotel? This cannot be undone.')) return;
    setReleasing(id);
    try {
      await api.post(`/events/${eventId}/vip-hotel-reservations/${id}/release-payment`, {});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to release payment');
    } finally { setReleasing(null); }
  };

  const handleDownloadReceipt = async (id: string) => {
    setDownloading(id);
    try {
      const blob = await api.getBlob(`/events/${eventId}/vip-hotel-reservations/${id}/receipt`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `vip-hotel-receipt-${id.slice(0, 8)}.html`;
      a.click(); URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download receipt');
    } finally { setDownloading(null); }
  };

  const select = (label: string, val: string, opts: string[][], onChange: (v: string) => void) => (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <select value={val} onChange={e => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20">
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );

  return (
    <EventWorkspaceShell event={event} loading={loading} error={error} activeTab="vip"
      aside={
        <div className="space-y-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-[#062E22] text-sm uppercase tracking-wide mb-4">Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#062E22] text-white p-4">
                <p className="text-[11px] uppercase text-white/60">Total Reservations</p>
                <p className="mt-1 text-2xl font-bold">{reservations.length}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-[11px] uppercase text-slate-400">Confirmed</p>
                <p className="mt-1 text-2xl font-bold text-[#062E22]">
                  {reservations.filter(r => r.status === 'confirmed' || r.status === 'payment_released').length}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 col-span-2">
                <p className="text-[11px] uppercase text-amber-600 font-semibold">Escrowed</p>
                <p className="mt-1 text-lg font-bold text-amber-700">
                  ETB {reservations.filter(r => r.payment_status === 'escrowed')
                    .reduce((s, r) => s + r.total_amount, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">How payment works</p>
            <p className="text-xs text-blue-700">Payment is locked from your wallet when you submit. It is only released to the hotel after you confirm their room assignment.</p>
          </div>
        </div>
      }
    >
      {/* Reservation Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center">
            <Hotel className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#062E22]">New VIP Hotel Reservation</h2>
            <p className="text-sm text-slate-500">Select a registered hotel vendor and add rooms for your VIP guests.</p>
          </div>
        </div>

        {formError && (
          <div className="mb-4 flex gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{formError}
          </div>
        )}
        {success && (
          <div className="mb-4 flex gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 font-semibold">
            <CheckCircle2 className="w-4 h-4" />{success}
          </div>
        )}

        {loadingData ? (
          <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-[#062E22]" /></div>
        ) : (
          <form onSubmit={e => void handleSubmit(e)} className="space-y-6">
            {/* Hotel Selector */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Select Hotel Vendor</label>
              {vendors.length === 0 ? (
                <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  No approved hotel vendors yet. Hotel vendors must register with category "Hotel Accommodation".
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {vendors.map(v => (
                    <div key={v.vendor_id} className={`rounded-2xl border transition overflow-hidden bg-white ${selectedVendor === v.vendor_id ? 'border-[#062E22] ring-2 ring-[#062E22]/20' : 'border-slate-200 hover:shadow-md'}`}>
                      <div 
                        className="cursor-pointer"
                        onClick={() => setSelectedVendor(v.vendor_id)}
                      >
                        {v.cover_image ? (
                          <div className="h-32 w-full overflow-hidden relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={v.cover_image} alt={v.business_name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-3 left-3 right-3 text-white">
                              <p className="font-bold text-lg leading-tight">{v.business_name}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="h-16 w-full bg-gradient-to-r from-[#062E22] via-[#0a4a37] to-[#EC5B13] p-3 flex items-end">
                            <p className="font-bold text-white text-lg leading-tight">{v.business_name}</p>
                          </div>
                        )}
                        <div className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm text-[#062E22]">{v.service_name || 'Hotel Service'}</p>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              {v.business_address}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedVendorInfo(expandedVendorInfo === v.vendor_id ? null : v.vendor_id);
                            }}
                            className="text-xs font-semibold text-[#062E22] hover:bg-[#062E22]/5 px-2 py-1 rounded-md transition"
                          >
                            {expandedVendorInfo === v.vendor_id ? 'Less Info' : 'More Info'}
                          </button>
                        </div>
                      </div>
                      
                      {expandedVendorInfo === v.vendor_id && (
                        <div className="px-4 pb-4 border-t border-slate-100 pt-3 bg-slate-50 text-xs text-slate-600 space-y-3">
                          <div>
                            <p className="mb-1"><span className="font-semibold text-slate-700">Full Address:</span> {v.business_address}</p>
                            {v.website_url && (
                              <p className="mb-1">
                                <span className="font-semibold text-slate-700">Website:</span>{' '}
                                <a href={v.website_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{v.website_url}</a>
                              </p>
                            )}
                            <p><span className="font-semibold text-slate-700">Hotel Profile:</span> Verified Global Connect Partner</p>
                          </div>
                          {v.service_details && Object.keys(v.service_details).length > 0 && (
                            <div className="border-t border-slate-200 pt-3">
                              <p className="font-bold text-[#062E22] uppercase tracking-wider text-[10px] mb-2">Room Pricing Rates</p>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(v.service_details).map(([key, value]) => {
                                  if (key.toLowerCase().includes('price') || key.toLowerCase().includes('rate')) {
                                    const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, str => str.toUpperCase());
                                    return (
                                      <div key={key} className="bg-white rounded-xl p-2 border border-slate-200 flex justify-between items-center shadow-sm">
                                        <span className="font-medium text-slate-500">{formattedKey}</span>
                                        <span className="font-bold text-[#062E22]">{String(value)} ETB</span>
                                      </div>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dates & Amount */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><CalendarRange className="w-3.5 h-3.5" />Check-in</label>
                <input required type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><CalendarRange className="w-3.5 h-3.5" />Check-out</label>
                <input required type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Nights</label>
                <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-slate-50 text-[#062E22] font-semibold">{nights} night{nights !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Total Payment Amount (ETB)</label>
              <input required type="number" min={1} value={totalAmount} onChange={e => setTotalAmount(e.target.value)}
                placeholder="e.g. 25000"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
              <p className="text-xs text-slate-400 mt-1">This amount will be locked from your wallet immediately upon submission.</p>
            </div>

            {/* Rooms */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#062E22]">Rooms ({rooms.length})</h3>
                <button type="button" onClick={() => setRooms(r => [...r, emptyRoom()])}
                  className="flex items-center gap-1.5 text-sm font-semibold text-[#062E22] hover:underline">
                  <Plus className="w-4 h-4" />Add Room
                </button>
              </div>
              <div className="space-y-4">
                {rooms.map((room, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-semibold text-[#062E22] text-sm">Room {idx + 1}</p>
                      {rooms.length > 1 && (
                        <button type="button" onClick={() => setRooms(r => r.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-600 transition"><X className="w-4 h-4" /></button>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700">VIP Full Name</label>
                        <input required value={room.vip_name} onChange={e => updateRoom(idx, 'vip_name', e.target.value)}
                          placeholder="Dr. Lemma Megersa"
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">VIP Email</label>
                        <input required type="email" value={room.vip_email} onChange={e => updateRoom(idx, 'vip_email', e.target.value)}
                          placeholder="vip@example.com"
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
                      </div>
                      {select('Room Type', room.room_type, [['single', 'Single'], ['double', 'Double'], ['luxury', 'Luxury Suite']], v => updateRoom(idx, 'room_type', v))}
                      {select('Meal Plan', room.meal_plan, [['room_only','Room Only'],['bed_breakfast','Bed & Breakfast'],['half_board','Half Board'],['full_board','Full Board']], v => updateRoom(idx, 'meal_plan', v))}
                      {select('Bed Preference', room.bed_preference, [['no_preference','No Preference'],['king','King'],['twin','Twin'],['queen','Queen']], v => updateRoom(idx, 'bed_preference', v))}
                      {select('Floor Preference', room.floor_preference, [['no_preference','No Preference'],['low','Low Floor'],['high','High Floor']], v => updateRoom(idx, 'floor_preference', v))}
                      {select('Smoking', room.smoking_preference, [['non_smoking','Non-Smoking'],['smoking','Smoking']], v => updateRoom(idx, 'smoking_preference', v))}
                      <div>
                        <label className="text-sm font-medium text-slate-700">Notes (optional)</label>
                        <input value={room.notes} onChange={e => updateRoom(idx, 'notes', e.target.value)}
                          placeholder="e.g. Allergic to feather pillows"
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Special Requests</label>
                      <div className="flex flex-wrap gap-2">
                        {SPECIAL_REQUEST_OPTIONS.map(opt => {
                          const key = opt.toLowerCase().replace(/ /g, '_');
                          const active = room.special_requests.includes(key);
                          return (
                            <button key={key} type="button" onClick={() => toggleSR(idx, key)}
                              className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${active ? 'bg-[#062E22] text-white border-[#062E22]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#062E22] text-white rounded-xl text-sm font-bold hover:bg-[#0a4a37] transition disabled:opacity-60">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hotel className="w-4 h-4" />}
                {submitting ? 'Submitting & Locking Payment…' : `Submit ${rooms.length} Room${rooms.length > 1 ? 's' : ''} & Lock Payment`}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Reservations List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#062E22] mb-5">Active Reservations</h2>
        {reservations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
            No VIP hotel reservations yet.
          </div>
        ) : (
          <div className="space-y-4">
            {reservations.map(r => (
              <div key={r.id} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-[#062E22]">{r.hotel_name}</p>
                      <span className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600'}`}>
                        {r.status.replace(/_/g, ' ')}
                      </span>
                      <span className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full ${r.payment_status === 'released' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.payment_status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {r.check_in_date} → {r.check_out_date} · {r.number_of_nights} night(s) · {r.rooms.length} room(s)
                    </p>
                    <p className="text-sm font-semibold text-[#062E22] mt-1">ETB {r.total_amount.toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {r.status === 'confirmed' && r.payment_status === 'escrowed' && (
                      <button onClick={() => void handleRelease(r.id)} disabled={releasing === r.id}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-60 flex items-center gap-2">
                        {releasing === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Release Payment
                      </button>
                    )}
                    {r.receipt_available && (
                      <button onClick={() => void handleDownloadReceipt(r.id)} disabled={downloading === r.id}
                        className="px-4 py-2 border border-[#062E22] text-[#062E22] rounded-xl text-sm font-semibold hover:bg-[#062E22]/5 transition disabled:opacity-60 flex items-center gap-2">
                        {downloading === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Receipt
                      </button>
                    )}
                  </div>
                </div>

                {/* Rooms Detail */}
                <div className="mt-4 space-y-2">
                  {r.rooms.map((rm, i) => (
                    <div key={i} className={`rounded-xl p-3 text-sm flex items-center justify-between gap-4 ${rm.assigned_room_number ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'}`}>
                      <div>
                        <span className="font-semibold text-[#062E22]">{rm.vip_name}</span>
                        <span className="text-slate-400 ml-2">{rm.vip_email}</span>
                        <span className="ml-2 text-slate-500">{rm.room_type}</span>
                      </div>
                      <div className="shrink-0">
                        {rm.assigned_room_number ? (
                          <span className="font-bold text-emerald-700">Room {rm.assigned_room_number}</span>
                        ) : (
                          <span className="text-amber-500 text-xs font-semibold">Awaiting assignment</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {r.hotel_response_note && (
                  <p className="mt-3 text-xs text-slate-500 italic">Hotel note: {r.hotel_response_note}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </EventWorkspaceShell>
  );
}
