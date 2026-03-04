'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useUser } from '@clerk/nextjs'
import { API_ENDPOINTS } from '../../lib/api-config'

type DashboardProfileContextValue = {
  /** Cached display name from DB (or null if not yet loaded / not set). */
  displayName: string | null
  /** True while the first fetch is in progress. */
  isLoading: boolean
  /** Call after saving profile/settings to refresh the cached name. */
  refreshDisplayName: () => void
}

const DashboardProfileContext = createContext<DashboardProfileContextValue | null>(null)

export function DashboardProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useUser()
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  const fetchName = useCallback(() => {
    if (!user?.id) return
    setIsLoading(true)
    fetch(API_ENDPOINTS.userByClerk(user.id))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.user) return
        const name = data.user.name
        if (name && typeof name === 'string') setDisplayName(name.trim())
        else setDisplayName(null)
      })
      .catch(() => setDisplayName(null))
      .finally(() => {
        setIsLoading(false)
        setHasFetched(true)
      })
  }, [user?.id])

  useEffect(() => {
    if (!user?.id || hasFetched) return
    fetchName()
  }, [user?.id, hasFetched, fetchName])

  const refreshDisplayName = useCallback(() => {
    fetchName()
  }, [fetchName])

  const value: DashboardProfileContextValue = {
    displayName,
    isLoading,
    refreshDisplayName,
  }

  return (
    <DashboardProfileContext.Provider value={value}>
      {children}
    </DashboardProfileContext.Provider>
  )
}

export function useDashboardProfile() {
  const ctx = useContext(DashboardProfileContext)
  return ctx
}
