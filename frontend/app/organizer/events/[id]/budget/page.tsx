'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useEventWorkspace } from '@/app/hooks/useEventWorkspace';
import { eventsService } from '@/app/services/eventsService';
import { EventBudgetItem } from '@/app/types/event';
import { EventWorkspaceShell, formatCurrency } from '@/components/organizer/events';

function createEmptyItem(): EventBudgetItem {
  return { name: '', estimated_cost: 0, actual_cost: null, notes: '' };
}

export default function EventBudgetPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { event, loading, error, setEvent, setError } = useEventWorkspace(eventId);
  const [items, setItems] = useState<EventBudgetItem[]>([]);
  const [currency, setCurrency] = useState('ETB');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!event) return;
    setItems(event.budget_items?.length ? event.budget_items : [createEmptyItem()]);
    setCurrency(event.budget_currency || 'ETB');
  }, [event]);

  const estimatedTotal = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.estimated_cost) || 0), 0),
    [items]
  );
  const actualTotal = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.actual_cost) || 0), 0),
    [items]
  );

  const updateItem = (index: number, patch: Partial<EventBudgetItem>) => {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    );
  };

  const addItem = () => {
    setItems((current) => [...current, createEmptyItem()]);
  };

  const removeItem = (index: number) => {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSave = async () => {
    if (!event) return;
    try {
      setSaving(true);
      setError(null);
      const payloadItems = items.filter((item) => item.name.trim());
      const updated = await eventsService.updateEventBudget(event.id, {
        currency: currency.trim() || 'ETB',
        items: payloadItems,
      });
      setEvent(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  return (
    <EventWorkspaceShell
      event={event}
      loading={loading}
      error={error}
      activeTab="budget"
      actions={
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Budget'}
        </button>
      }
      aside={
        event ? (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-[#062E22]">Budget Summary</h2>
              <div className="space-y-4 mt-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Estimated Total</p>
                  <p className="text-xl font-bold text-[#062E22] mt-2">{formatCurrency(estimatedTotal, currency)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Actual Total</p>
                  <p className="text-xl font-bold text-[#062E22] mt-2">{formatCurrency(actualTotal, currency)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Budget Lines</p>
                  <p className="text-xl font-bold text-[#062E22] mt-2">{items.filter((item) => item.name.trim()).length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-[#062E22]">Demo Tip</h2>
              <p className="text-sm text-slate-600 mt-4">
                Add catering, venue, branding, and staffing lines here to show the event workspace is ready for real planning work, not just approvals.
              </p>
            </div>
          </div>
        ) : undefined
      }
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#062E22]">Budget Planner</h2>
            <p className="text-sm text-slate-500 mt-1">Set estimated and actual costs for every budget line item.</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-600">Currency</label>
            <input
              value={currency}
              onChange={(eventValue) => setCurrency(eventValue.target.value.toUpperCase())}
              className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-4 mt-6">
          {items.map((item, index) => (
            <div key={item.id || `budget-${index}`} className="rounded-2xl border border-slate-200 p-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Budget Line</label>
                  <input
                    value={item.name}
                    onChange={(eventValue) => updateItem(index, { name: eventValue.target.value })}
                    placeholder="Catering, venue, branding..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Notes</label>
                  <input
                    value={item.notes || ''}
                    onChange={(eventValue) => updateItem(index, { notes: eventValue.target.value })}
                    placeholder="Optional context"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Estimated Cost</label>
                  <input
                    type="number"
                    min="0"
                    value={item.estimated_cost}
                    onChange={(eventValue) => updateItem(index, { estimated_cost: Number(eventValue.target.value) || 0 })}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Actual Cost</label>
                  <input
                    type="number"
                    min="0"
                    value={item.actual_cost ?? ''}
                    onChange={(eventValue) =>
                      updateItem(index, {
                        actual_cost: eventValue.target.value ? Number(eventValue.target.value) : null,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                  className="inline-flex items-center gap-2 text-sm font-medium text-red-600 disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove line
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <button
            onClick={addItem}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <Plus className="w-4 h-4" />
            Add Budget Line
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Budget'}
          </button>
        </div>
      </div>
    </EventWorkspaceShell>
  );
}
