'use client';

import { use, useState } from 'react';
import TeachingInterface from '@/components/TeachingInterface';
import Navbar from '@/components/Navbar';

type SearchParamsPromise = Promise<{ [key: string]: string | string[] | undefined }>;

function getPlanId(resolved: { [key: string]: string | string[] | undefined } | null): string {
  if (!resolved?.plan) return 'plan_1';
  const p = resolved.plan;
  return Array.isArray(p) ? (p[0] ?? 'plan_1') : p;
}

export default function TeachingPage({
  searchParams,
}: {
  searchParams: SearchParamsPromise;
}) {
  const resolved = use(searchParams);
  const planId = getPlanId(resolved);
  const [headerOpen, setHeaderOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden">
      {/* Hamburger: 3 lines — toggles header overlay (open/close) */}
      <button
        type="button"
        onClick={() => setHeaderOpen((prev) => !prev)}
        className="fixed top-4 left-4 z-[60] p-2.5 rounded-xl bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm text-gray-600 hover:text-indigo-600 hover:bg-white hover:shadow transition-all"
        aria-label={headerOpen ? 'Close menu' : 'Open menu'}
      >
        {headerOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Collapsible header overlay — close via X or hamburger; no scrollbar, whole screen */}
      {headerOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-white/98 backdrop-blur-sm overflow-auto"
          role="dialog"
          aria-label="Navigation menu"
        >
          <div className="relative">
            <Navbar showBackButton={true} />
            <button
              type="button"
              onClick={() => setHeaderOpen(false)}
              className="absolute top-4 right-4 md:right-8 z-[60] p-2.5 rounded-xl bg-white border border-gray-200 shadow-md text-gray-600 hover:bg-gray-100 hover:text-indigo-600 transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main content: full screen, no scrollbar */}
      <main className="flex-1 min-h-0 pt-2 pb-2 px-2 sm:px-4">
        <TeachingInterface planId={planId} />
      </main>
    </div>
  );
}
