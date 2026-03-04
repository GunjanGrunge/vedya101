'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { API_ENDPOINTS } from './api-config'

/**
 * Returns whether the current signed-in user is the admin (by API check and/or email).
 * Admin gets a different dashboard and can control all user data.
 */
export function useIsAdmin(): { isAdmin: boolean; isLoading: boolean } {
  const { isLoaded, isSignedIn, user } = useUser()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) {
      setChecked(true)
      setIsAdmin(false)
      return
    }
    let cancelled = false
    fetch(API_ENDPOINTS.adminCheck(user.id))
      .then((r) => r.json())
      .then((data: { isAdmin?: boolean }) => {
        if (!cancelled) {
          setChecked(true)
          setIsAdmin(data.isAdmin === true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setChecked(true)
          setIsAdmin(false)
        }
      })
    return () => { cancelled = true }
  }, [isLoaded, isSignedIn, user?.id])

  return { isAdmin, isLoading: isLoaded && isSignedIn && !checked }
}
