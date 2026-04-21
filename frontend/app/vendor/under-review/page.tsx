import React from 'react';
import Link from 'next/link';

export default function VendorUnderReviewPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200 text-center">
        <h1 className="text-3xl font-bold text-[#0F172A] mb-4">Application Under Review</h1>
        
        <div className="bg-amber-50 rounded-xl p-6 border border-amber-200 mb-6">
          <div className="flex items-center justify-center w-12 h-12 bg-amber-100 text-amber-600 rounded-full mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-amber-800 mb-2">Hang tight!</h2>
          <p className="text-amber-700 text-sm">
            Your verification form and documents have been submitted and are currently being reviewed by our administrative team.
          </p>
        </div>
        
        <p className="text-slate-500 mb-8">
          We will notify you once your application has been processed. Thank you for your patience!
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
