import React from 'react';
import Link from 'next/link';

export default function VendorDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200 text-center">
        <h1 className="text-3xl font-bold text-[#0F172A] mb-4">Vendor Dashboard</h1>
        
        <div className="bg-green-50 rounded-xl p-6 border border-green-200 mb-6">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 text-green-600 rounded-full mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-green-800 mb-2">Welcome Back!</h2>
          <p className="text-green-700 text-sm">
            Your vendor account is approved. You can now access all vendor features.
          </p>
        </div>
        
        <p className="text-slate-500 mb-8 border-b pb-8">
          This dashboard is a work in progress. Further features like tracking your sales, managing your profile, and responding to proposals will be added here soon.
        </p>

        <Link
          href="/"
          className="inline-block px-6 py-3 bg-[#062E22] hover:bg-[#045c33] text-white font-medium rounded-lg transition-colors"
        >
          Return to Home
        </Link>
      </div>
    </main>
  );
}
