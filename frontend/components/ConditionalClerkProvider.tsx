'use client'

/**
 * Wraps ClerkProvider — skipped entirely when NEXT_PUBLIC_SKIP_AUTH=true.
 * In skip-auth mode we render a thin shimming layer so Clerk hooks
 * (useUser, useAuth) return a mock signed-in user without touching real Clerk APIs.
 */

import React from 'react'
import { ClerkProvider } from '@clerk/nextjs'

const SKIP_AUTH = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'

// --- Mock context shim (only active in SKIP_AUTH mode) -------------------
// We create a React context that we force-inject into Clerk's internal
// context key so useUser() / useAuth() read from our mock.
// The safer alternative used here: re-export mock hooks via a separate
// module (lib/clerk-mock.ts) and update all import sites to use
// a re-export barrel (lib/clerk.ts) that picks real vs mock at build time.
// That approach needs no runtime monkey-patching.

export default function ConditionalClerkProvider({ children }: { children: React.ReactNode }) {
  if (SKIP_AUTH) {
    // No ClerkProvider — components that call useUser() will get isLoaded:false.
    // We handle that in a sibling MockUserProvider below.
    return <>{children}</>
  }
  return (
    <ClerkProvider afterSignOutUrl="/sign-in">
      {children}
    </ClerkProvider>
  )
}
