'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <main className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-amber-600">
              Something went wrong
            </p>
            <h1 className="mb-3 text-2xl font-bold text-[#062E22]">
              The page couldn&apos;t load
            </h1>
            <p className="mb-6 text-sm text-slate-600">
              {error.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={reset}
              className="w-full rounded-lg bg-[#062E22] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a37]"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
