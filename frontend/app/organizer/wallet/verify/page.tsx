'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import { CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/app/lib/api';

export default function WalletVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tx_ref = searchParams.get('tx_ref');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!tx_ref) {
      setStatus('error');
      setErrorMessage('No transaction reference provided.');
      return;
    }

    const verifyPayment = async () => {
      try {
        await api.get(`/api/v1/wallet/top-up/verify/${tx_ref}`);
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'An unknown error occurred');
      }
    };

    void verifyPayment();
  }, [tx_ref]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="organizer" />
      <DashboardHeader searchPlaceholder="Search..." actionHref="/organizer/opportunities/create" actionLabel="New Opportunity" />
      
      <main className="pt-16 md:ml-60 p-6 flex items-center justify-center min-h-[80vh]">
        <div className="bg-white p-8 rounded-3xl border shadow-sm max-w-md w-full text-center">
          {status === 'loading' && (
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
              <h2 className="mt-6 text-xl font-bold text-[#062E22]">Verifying Payment</h2>
              <p className="mt-2 text-sm text-slate-500">Please wait while we confirm your top-up with Chapa...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <CheckCircle2 className="h-20 w-20 text-emerald-500" />
              <h2 className="mt-6 text-2xl font-bold text-[#062E22]">Payment Successful!</h2>
              <p className="mt-2 text-sm text-slate-500">Your wallet balance has been updated securely.</p>
              <button
                onClick={() => router.push('/organizer/wallet')}
                className="mt-8 w-full rounded-xl bg-[#062E22] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a37]"
              >
                Return to Wallet
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center">
              <XCircle className="h-20 w-20 text-red-500" />
              <h2 className="mt-6 text-2xl font-bold text-[#062E22]">Verification Failed</h2>
              <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
              <button
                onClick={() => router.push('/organizer/wallet')}
                className="mt-8 w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Go Back
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
