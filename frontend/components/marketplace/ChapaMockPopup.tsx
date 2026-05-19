'use client';

import React, { useState } from 'react';
import { CreditCard, CheckCircle2, X } from 'lucide-react';

interface ChapaMockPopupProps {
  type: 'deposit' | 'withdraw';
  amount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ChapaMockPopup({ type, amount, onConfirm, onCancel }: ChapaMockPopupProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAction = () => {
    setLoading(true);
    // Simulate network delay
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        onConfirm();
      }, 1000);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-all">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        
        {/* Header */}
        <div className="bg-[#0f172a] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-emerald-500 font-bold text-white">
              C
            </div>
            <div>
              <p className="text-sm font-semibold text-white tracking-wide">Chapa Test Environment</p>
              <p className="text-xs text-slate-400">Secure Mock Gateway</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="py-8 flex flex-col items-center text-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4 animate-bounce" />
              <h3 className="text-xl font-bold text-slate-800">Transaction Successful</h3>
              <p className="text-sm text-slate-500 mt-2">Redirecting back to wallet...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm font-medium uppercase tracking-widest text-slate-400">
                  {type === 'deposit' ? 'You are paying' : 'You are withdrawing'}
                </p>
                <p className="mt-1 text-4xl font-bold text-slate-800">
                  ETB {amount.toLocaleString('en-ET', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {type === 'deposit' && (
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                  <div className="flex items-center gap-3 mb-3">
                    <CreditCard className="h-5 w-5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">Test Card Details</span>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex justify-between"><span>Card Number</span> <span className="font-mono">4111 1111 1111 1111</span></div>
                    <div className="flex justify-between"><span>Expiry</span> <span>12/30</span></div>
                    <div className="flex justify-between"><span>CVC</span> <span>123</span></div>
                  </div>
                </div>
              )}

              {type === 'withdraw' && (
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
                    </div>
                    <span className="text-sm font-medium text-slate-700">Test Bank Account</span>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex justify-between"><span>Bank</span> <span>Commercial Bank of Ethiopia</span></div>
                    <div className="flex justify-between"><span>Account No</span> <span className="font-mono">1000123456789</span></div>
                    <div className="flex justify-between"><span>Name</span> <span>Test User</span></div>
                  </div>
                </div>
              )}

              <button
                onClick={handleAction}
                disabled={loading}
                className="w-full rounded-xl bg-[#062E22] py-4 text-sm font-semibold text-white transition hover:bg-[#0a4a37] disabled:opacity-70 flex justify-center items-center"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : type === 'deposit' ? (
                  'Pay ETB ' + amount.toLocaleString('en-ET')
                ) : (
                  'Confirm Withdrawal'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
