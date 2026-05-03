'use client';

import { useEffect, useState } from 'react';
import { Building2, Plus, PenLine, ToggleLeft, ToggleRight } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import { VenueListingRecord, VenueListingCreatePayload } from '@/app/types/marketplace';
import marketplaceService from '@/app/services/marketplaceService';

function emptyForm(): VenueListingCreatePayload {
  return {
    venue_name: '',
    city: '',
    location: '',
    capacity: 0,
    pricing_type: 'negotiable',
    base_price: undefined,
    deposit_amount: undefined,
    currency: 'ETB',
    is_reservable: true,
    description: '',
    notes: '',
  };
}

export default function VendorVenueListingsPage() {
  const [listings, setListings] = useState<VenueListingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VenueListingCreatePayload>(emptyForm());
  const [saving, setSaving] = useState(false);

  const loadListings = async () => {
    try {
      setLoading(true);
      const data = await marketplaceService.listMyVenueListings();
      setListings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load venue listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadListings(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (listing: VenueListingRecord) => {
    setEditingId(listing.id);
    setForm({
      venue_name: listing.venue_name,
      city: listing.city,
      location: listing.location ?? '',
      capacity: listing.capacity,
      pricing_type: listing.pricing_type,
      base_price: listing.base_price ?? undefined,
      deposit_amount: listing.deposit_amount ?? undefined,
      currency: listing.currency,
      is_reservable: listing.is_reservable,
      description: listing.description ?? '',
      notes: listing.notes ?? '',
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      if (editingId) {
        await marketplaceService.updateVenueListing(editingId, form);
      } else {
        await marketplaceService.createVenueListing(form);
      }
      setShowForm(false);
      setEditingId(null);
      await loadListings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save venue listing');
    } finally {
      setSaving(false);
    }
  };

  const toggleReservable = async (listing: VenueListingRecord) => {
    try {
      await marketplaceService.updateVenueListing(listing.id, {
        is_reservable: !listing.is_reservable,
      });
      await loadListings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update listing');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="vendor" />
      <DashboardHeader
        searchPlaceholder="My venue listings"
        actionHref="/vendor/venue-listings/reservations"
        actionLabel="Reservation Inbox"
      />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#062E22]">My Venue Listings</h1>
              <p className="text-slate-500 mt-1 text-sm">Manage the venues your business offers for event organizers.</p>
            </div>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition"
            >
              <Plus className="w-4 h-4" />
              Add Venue Listing
            </button>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          {/* Form */}
          {showForm && (
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#062E22] mb-5">
                {editingId ? 'Edit Venue Listing' : 'New Venue Listing'}
              </h2>
              <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Venue Name *</label>
<<<<<<< HEAD
                    <input required title="Venue name" placeholder="e.g. Skylight Hall" value={form.venue_name} onChange={(e) => setForm((f) => ({ ...f, venue_name: e.target.value }))}
=======
                    <input required value={form.venue_name} onChange={(e) => setForm((f) => ({ ...f, venue_name: e.target.value }))}
>>>>>>> origin/venue-listing-backend
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">City *</label>
<<<<<<< HEAD
                    <input required title="City" placeholder="e.g. Addis Ababa" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
=======
                    <input required value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
>>>>>>> origin/venue-listing-backend
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Location / Street</label>
<<<<<<< HEAD
                    <input title="Location" placeholder="Street address or landmark" value={form.location ?? ''} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
=======
                    <input value={form.location ?? ''} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
>>>>>>> origin/venue-listing-backend
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Capacity *</label>
<<<<<<< HEAD
                    <input required title="Capacity" placeholder="500" type="number" min={1} value={form.capacity || ''} onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
=======
                    <input required type="number" min={1} value={form.capacity || ''} onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
>>>>>>> origin/venue-listing-backend
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Pricing Type</label>
<<<<<<< HEAD
                    <select title="Pricing type" value={form.pricing_type} onChange={(e) => setForm((f) => ({ ...f, pricing_type: e.target.value }))}
=======
                    <select value={form.pricing_type} onChange={(e) => setForm((f) => ({ ...f, pricing_type: e.target.value }))}
>>>>>>> origin/venue-listing-backend
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20">
                      <option value="negotiable">Negotiable</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Base Price (ETB)</label>
<<<<<<< HEAD
                    <input type="number" title="Base price" placeholder="25000" min={0} value={form.base_price ?? ''} onChange={(e) => setForm((f) => ({ ...f, base_price: e.target.value ? Number(e.target.value) : undefined }))}
=======
                    <input type="number" min={0} value={form.base_price ?? ''} onChange={(e) => setForm((f) => ({ ...f, base_price: e.target.value ? Number(e.target.value) : undefined }))}
>>>>>>> origin/venue-listing-backend
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Deposit Amount (ETB)</label>
<<<<<<< HEAD
                    <input type="number" title="Deposit amount" placeholder="5000" min={0} value={form.deposit_amount ?? ''} onChange={(e) => setForm((f) => ({ ...f, deposit_amount: e.target.value ? Number(e.target.value) : undefined }))}
=======
                    <input type="number" min={0} value={form.deposit_amount ?? ''} onChange={(e) => setForm((f) => ({ ...f, deposit_amount: e.target.value ? Number(e.target.value) : undefined }))}
>>>>>>> origin/venue-listing-backend
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
                  </div>
                  <div className="flex items-center gap-3 pt-4">
                    <label className="text-sm font-medium text-slate-700">Accept Reservations</label>
                    <button type="button" onClick={() => setForm((f) => ({ ...f, is_reservable: !f.is_reservable }))}>
                      {form.is_reservable
                        ? <ToggleRight className="w-8 h-8 text-emerald-600" />
                        : <ToggleLeft className="w-8 h-8 text-slate-400" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Description</label>
<<<<<<< HEAD
                  <textarea rows={3} title="Description" placeholder="Describe the venue and amenities" value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
=======
                  <textarea rows={3} value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
>>>>>>> origin/venue-listing-backend
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Internal Notes</label>
<<<<<<< HEAD
                  <textarea rows={2} title="Internal notes" placeholder="Private notes for your team" value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
=======
                  <textarea rows={2} value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
>>>>>>> origin/venue-listing-backend
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving}
                    className="px-6 py-2.5 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50">
                    {saving ? 'Saving…' : editingId ? 'Update Listing' : 'Create Listing'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Listings */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
            </div>
          ) : listings.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-[#062E22]">No venue listings yet</h2>
              <p className="mt-2 text-sm text-slate-500">Create your first listing to make your venue available for organizers to book.</p>
              <button onClick={openCreate}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition">
                <Plus className="w-4 h-4" />Add Listing
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {listings.map((listing) => (
                <div key={listing.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-[#062E22] truncate">{listing.venue_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{listing.city}{listing.location ? `, ${listing.location}` : ''}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${listing.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {listing.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <span>Capacity: {listing.capacity.toLocaleString()}</span>
                    <span>Type: {listing.pricing_type}</span>
                    {listing.base_price ? <span>Price: ETB {listing.base_price.toLocaleString()}</span> : null}
                    {listing.deposit_amount ? <span>Deposit: ETB {listing.deposit_amount.toLocaleString()}</span> : null}
                  </div>
                  {listing.description ? (
                    <p className="mt-3 text-xs text-slate-400 line-clamp-2">{listing.description}</p>
                  ) : null}
                  <div className="mt-4 flex items-center gap-3">
                    <button onClick={() => openEdit(listing)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition">
                      <PenLine className="w-3.5 h-3.5" />Edit
                    </button>
                    <button onClick={() => void toggleReservable(listing)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${listing.is_reservable ? 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      {listing.is_reservable ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      {listing.is_reservable ? 'Reservable' : 'Not Reservable'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
