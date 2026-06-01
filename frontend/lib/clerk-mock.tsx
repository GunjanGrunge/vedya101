/**
 * Mock replacement for @clerk/nextjs when NEXT_PUBLIC_SKIP_AUTH=true.
 * Exports the same surface used by this app so all components work
 * with a pre-authenticated demo user — no real Clerk API calls.
 */
'use client'
import React from 'react'

const MOCK_USER = {
  id: 'mock_user_001',
  firstName: 'Demo',
  lastName: 'User',
  fullName: 'Demo User',
  username: 'demouser',
  primaryEmailAddress: { emailAddress: 'demo@vedya.ai' },
  emailAddresses: [{ emailAddress: 'demo@vedya.ai' }],
  imageUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=DemoUser',
  publicMetadata: {},
  unsafeMetadata: {},
  reload: async () => {},
  update: async () => {},
}

// ClerkProvider — just a passthrough wrapper
export function ClerkProvider({ children }: { children: React.ReactNode; [key: string]: unknown }) {
  return <>{children}</>
}

// useUser hook
export function useUser() {
  return { isLoaded: true, isSignedIn: true, user: MOCK_USER }
}

// useAuth hook
export function useAuth() {
  return {
    isLoaded: true,
    isSignedIn: true,
    userId: MOCK_USER.id,
    sessionId: 'mock_session_001',
    orgId: null,
    signOut: async () => {},
    getToken: async () => 'mock_token',
  }
}

// useClerk hook
export function useClerk() {
  return {
    user: MOCK_USER,
    signOut: async () => {},
    openSignIn: () => {},
    openSignUp: () => {},
  }
}

// clerkMiddleware — no-op for server middleware
export function clerkMiddleware(handler?: unknown) {
  return handler
}

// createRouteMatcher
export function createRouteMatcher(patterns: string[]) {
  return (_req: unknown) => false
}

// auth — server-side auth helper
export function auth() {
  return { userId: MOCK_USER.id, sessionId: 'mock_session_001', protect: async () => {} }
}

// SignedIn / SignedOut components
export function SignedIn({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function SignedOut({ children }: { children: React.ReactNode }) {
  return null
}

// UserButton — renders a simple placeholder
export function UserButton({ afterSignOutUrl }: { afterSignOutUrl?: string }) {
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 'bold', cursor: 'pointer' }}>
      D
    </div>
  )
}

// SignInButton / SignUpButton
export function SignInButton({ children }: { children?: React.ReactNode }) {
  return <>{children ?? <button>Sign in</button>}</>
}

export function SignUpButton({ children }: { children?: React.ReactNode }) {
  return <>{children ?? <button>Sign up</button>}</>
}

export default { ClerkProvider, useUser, useAuth, useClerk, auth, SignedIn, SignedOut, UserButton, SignInButton, SignUpButton }
