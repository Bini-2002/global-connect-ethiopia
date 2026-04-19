'use client';

import {
  formatCurrency,
  formatDateTime,
  humanizeNegotiationType,
} from '@/app/lib/marketplace';
import { NegotiationMessageRecord } from '@/app/types/marketplace';

interface NegotiationTimelineProps {
  messages: NegotiationMessageRecord[];
}

export default function NegotiationTimeline({ messages }: NegotiationTimelineProps) {
  if (messages.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
        No quote or counteroffer has been posted yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <div key={`${message.timestamp}-${index}`} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#062E22] text-xs font-bold uppercase tracking-[0.14em] text-white">
              {message.type === 'QUOTE' ? 'Q' : 'C'}
            </div>
            {index < messages.length - 1 ? <div className="mt-2 h-full min-h-10 w-px bg-slate-200" /> : null}
          </div>

          <div className="flex-1 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {humanizeNegotiationType(message.type)}
                </p>
                <p className="mt-2 text-xl font-bold text-[#062E22]">{formatCurrency(message.amount)}</p>
              </div>
              <p className="text-sm text-slate-400">{formatDateTime(message.timestamp)}</p>
            </div>

            {message.message ? (
              <p className="mt-4 text-sm leading-relaxed text-slate-600">{message.message}</p>
            ) : (
              <p className="mt-4 text-sm italic text-slate-400">No message was included with this update.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
