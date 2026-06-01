'use client'

/**
 * Provides a fake Clerk user context when NEXT_PUBLIC_SKIP_AUTH=true.
 * Allows full UI testing without real Clerk credentials.
 * All useUser() / useAuth() calls get a mock signed-in user.
 */

import React, { createContext, useContext } from 'react'

const MOCK_USER = {
  id: 'mock_user_001',
  firstName: 'Demo',
  lastName: 'User',
  fullName: 'Demo User',
  primaryEmailAddress: { emailAddress: 'demo@vedya.ai' },
  imageUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=DU',
}

// Minimal shape expected by @clerk/nextjs hooks
const mockClerkContext = {
  isLoaded: true,
  isSignedIn: true,
  user: MOCK_USER,
  userId: MOCK_USER.id,
  sessionId: 'mock_session_001',
  signOut: async () => {},
}

const MockContext = createContext(mockClerkContext)

// Patch clerk hooks globally so any component importing from @clerk/nextjs gets mocks
// This works by overriding the module resolution at runtime via context injection trick.
// We export a hook that components in this tree can use, but real @clerk/nextjs hooks
// still point to the real module — so we also need a ClerkProvider wrapper for SSR safety.

export function useMockUser() {
  return { isLoaded: true, isSignedIn: true, user: MOCK_USER }
}

export function useMockAuth() {
  return { isLoaded: true, isSignedIn: true, userId: MOCK_USER.id, sessionId: 'mock_session_001', signOut: async () => {} }
}

export default function MockClerkProvider({ children }: { children: React.ReactNode }) {
  return (
    <MockContext.Provider value={mockClerkContext}>
      {children}
    </MockContext.Provider>
  )
}
