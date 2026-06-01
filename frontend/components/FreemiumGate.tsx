'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useFreemiumStatus } from '../lib/useFreemiumStatus'
import UpgradePrompt from './UpgradePrompt'

interface FreemiumGateProps {
  children: React.ReactNode
  /** Optional subject name — if provided, also checks subject-access limit */
  subject?: string
}

/**
 * Wraps lesson/content areas that are gated behind the freemium limit.
 * Shows an UpgradePrompt overlay when the user has exhausted their freemium allowance.
 * Falls through (renders children) when the user is paid or limits are not exceeded.
 */
export default function FreemiumGate({ children, subject }: FreemiumGateProps) {
  const { isLoaded, isSignedIn, user } = useUser()
  const { status, loading } = useFreemiumStatus(user?.id)
  const [dismissed, setDismissed] = useState(false)

  // Not yet determined — render nothing to avoid flash
  if (!isLoaded || loading) return null

  // Unauthenticated — Clerk middleware handles redirect; pass through here
  if (!isSignedIn || !user) return <>{children}</>

  // Paid tier or status fetch failed — pass through
  if (!status || status.tier === 'paid') return <>{children}</>

  const sessionBlocked = !status.can_start_session
  const subjectBlocked = !!subject && !status.can_access_subject

  if ((sessionBlocked || subjectBlocked) && !dismissed) {
    return (
      <>
        {children}
        <UpgradePrompt usage={status} onDismiss={() => setDismissed(true)} />
      </>
    )
  }

  return <>{children}</>
}
