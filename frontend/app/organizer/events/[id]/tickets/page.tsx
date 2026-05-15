'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Edit2, CheckCircle2, Ticket } from 'lucide-react';
import { EventWorkspaceShell, formatCurrency } from '@/components/organizer/events';
import { useEventWorkspace } from '@/app/hooks/useEventWorkspace';
import eventsService from '@/app/services/eventsService';
import { TicketTypeRecord, TicketTypeCreatePayload } from '@/app/types/event';

export default function OrganizerTicketsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { event, loading, error } = useEventWorkspace(eventId);

  const [ticketTypes, setTicketTypes] = useState<TicketTypeRecord[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<TicketTypeCreatePayload>({
    name: '',
    description: '',
    price: 0,
    quantity: 100,
    currency: 'ETB',
    seat_mode: 'general',
    visibility: 'public',
  });

  const loadTicketTypes = async () => {
    try {
      setFetching(true);
      setLoadError(null);
      const data = await eventsService.getTicketTypes(eventId);
      setTicketTypes(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load ticket types');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      void loadTicketTypes();
    }
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setFormError(null);
      await eventsService.createTicketType(eventId, formData);
      setShowForm(false);
      setFormData({
        name: '',
        description: '',
        price: 0,
        quantity: 100,
        currency: 'ETB',
        seat_mode: 'general',
        visibility: 'public',
      });
      await loadTicketTypes();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create ticket type');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (ticket: TicketTypeRecord) => {
    try {
      await eventsService.updateTicketType(eventId, ticket.id, { is_active: !ticket.is_active });
      await loadTicketTypes();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update ticket status');
    }
  };

  const aside = (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#062E22]">Ticket Management</h2>
        <div className="space-y-3 mt-4 text-sm text-slate-600">
          <p>Create multiple ticket types (e.g., VIP, General Admission).</p>
          <p>Set specific quantities and pricing. Paid tickets will use Chapa during public checkout.</p>
          <p>Toggle visibility to hide tickets that are sold out or not yet available.</p>
        </div>
      </div>
    </div>
  );

  return (
    <EventWorkspaceShell
      event={event}
      loading={loading}
      error={error}
      activeTab="tickets"
      aside={aside}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#062E22]">Ticket Types</h2>
            <p className="text-sm text-slate-500 mt-1">Configure the tickets available for this event.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Cancel' : 'New Ticket'}
          </button>
        </div>

        {loadError ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
            {loadError}
          </div>
        ) : null}

        {showForm ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-semibold text-[#062E22]">Create Ticket Type</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ticket Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., VIP Admission"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-[#062E22] focus:ring-1 focus:ring-[#062E22]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price (ETB)</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-[#062E22] focus:ring-1 focus:ring-[#062E22]"
                />
                <p className="text-xs text-slate-500 mt-1">Set to 0 for free tickets</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this ticket include?"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-[#062E22] focus:ring-1 focus:ring-[#062E22]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Total Quantity Available</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-[#062E22] focus:ring-1 focus:ring-[#062E22]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Visibility</label>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'public' | 'private' })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-[#062E22] focus:ring-1 focus:ring-[#062E22]"
                >
                  <option value="public">Public - Visible to everyone</option>
                  <option value="private">Private - Hidden from public page</option>
                </select>
              </div>
            </div>

            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Ticket Type'}
              </button>
            </div>
          </form>
        ) : null}

        {fetching ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : ticketTypes.length > 0 ? (
          <div className="grid gap-4">
            {ticketTypes.map((ticket) => (
              <div key={ticket.id} className={`bg-white rounded-2xl border ${ticket.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'} shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${ticket.price > 0 ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-500'}`}>
                    <Ticket className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-[#062E22]">{ticket.name}</h3>
                      {!ticket.is_active && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">Inactive</span>
                      )}
                      {ticket.visibility === 'private' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600">Private</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{ticket.description || 'No description provided'}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Price</p>
                        <p className="text-sm font-bold text-[#062E22]">{ticket.price === 0 ? 'Free' : formatCurrency(ticket.price, ticket.currency)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Remaining / Total</p>
                        <p className="text-sm font-bold text-[#062E22]">{ticket.remaining_quantity} / {ticket.quantity}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Sold</p>
                        <p className="text-sm font-bold text-[#062E22]">{ticket.sold_quantity}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 self-start md:self-center">
                  <button 
                    onClick={() => void toggleStatus(ticket)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${ticket.is_active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                  >
                    {ticket.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : !showForm ? (
          <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-slate-400">
              <Ticket className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#062E22]">No tickets configured</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">Create ticket types to enable public sales or registrations for this event.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-6 px-6 py-2 bg-white border border-slate-200 text-[#062E22] rounded-xl text-sm font-semibold hover:bg-slate-50 transition shadow-sm"
            >
              Add First Ticket
            </button>
          </div>
        ) : null}
      </div>
    </EventWorkspaceShell>
  );
}
