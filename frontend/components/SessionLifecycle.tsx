'use client'

import { useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { API_ENDPOINTS } from '../lib/api-config'

/**
 * Fires POST /users/session-end on page unload to record session duration
 * and allow the backend to clear ephemeral state for freemium users.
 * Uses sendBeacon for reliability on page close.
 */
export default function SessionLifecycle() {
  const { isSignedIn, user } = useUser()
  const sessionStartRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isSignedIn || !user?.id) return
    sessionStartRef.current = Date.now()

    const handleUnload = () => {
      const clerkId = user.id
      const startedAt = sessionStartRef.current
      if (!startedAt) return
      const durationHours = (Date.now() - startedAt) / 3_600_000
      const payload = JSON.stringify({ clerk_user_id: clerkId, duration_hours: durationHours })
      // sendBeacon is fire-and-forget and works on page unload
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon(API_ENDPOINTS.sessionEnd, blob)
      }
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [isSignedIn, user?.id])

  return null
}
