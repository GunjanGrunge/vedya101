'use client'

import { useState, useEffect } from 'react'
import { API_ENDPOINTS } from './api-config'

export interface FreemiumStatus {
  tier: 'freemium' | 'paid'
  session_hours_used: number
  session_hours_limit: number | null
  subjects_accessed: string[]
  subject_limit: number | null
  can_start_session: boolean
  can_access_subject: boolean
}

export function useFreemiumStatus(clerkId: string | undefined): {
  status: FreemiumStatus | null
  loading: boolean
} {
  const [status, setStatus] = useState<FreemiumStatus | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clerkId) return
    let cancelled = false
    setLoading(true)
    fetch(API_ENDPOINTS.freemiumStatus(clerkId))
      .then((r) => r.json())
      .then((data: FreemiumStatus) => {
        if (!cancelled) {
          setStatus(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [clerkId])

  return { status, loading }
}
