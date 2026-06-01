'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter, usePathname } from 'next/navigation'
import {
  SUPPORTED_LOCALES,
  LOCALE_DISPLAY_NAMES,
  DEFAULT_LOCALE,
  mapBrowserLocale,
  type SupportedLocale,
} from '../lib/locales'
import { API_ENDPOINTS } from '../lib/api-config'

const STORAGE_KEY = 'vedya_lang'

function getInitialLocale(): SupportedLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
    return stored as SupportedLocale
  }
  return mapBrowserLocale(navigator.language || 'en')
}

interface LanguageSelectorProps {
  /** If provided, indicates user is in an active lesson session. */
  sessionId?: string | null
  clerkUserId?: string | null
  /** Called after a successful mid-session language switch so the chat component can send the continuation message. */
  onSessionLanguageSwitch?: (newLang: SupportedLocale) => void
}

export default function LanguageSelector({
  sessionId,
  clerkUserId,
  onSessionLanguageSwitch,
}: LanguageSelectorProps) {
  const [currentLocale, setCurrentLocale] = useState<SupportedLocale>(DEFAULT_LOCALE)
  const [isSwitching, setIsSwitching] = useState(false)
  const { user } = useUser()
  const router = useRouter()
  const pathname = usePathname()

  // Detect if we are on a teaching/lesson page
  const isInLesson =
    !!sessionId || (pathname ? pathname.startsWith('/teaching') || pathname.startsWith('/learn') : false)

  useEffect(() => {
    setCurrentLocale(getInitialLocale())
  }, [])

  const handleChange = useCallback(
    async (newLocale: SupportedLocale) => {
      if (newLocale === currentLocale) return
      setIsSwitching(true)

      try {
        if (isInLesson && sessionId && clerkUserId) {
          // Mid-session switch — call backend without page reload
          const res = await fetch(API_ENDPOINTS.switchLanguage, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: sessionId,
              clerk_user_id: clerkUserId,
              new_language_code: newLocale,
            }),
          })
          if (!res.ok) {
            console.error('Language switch endpoint returned error', res.status)
            // Proceed with client-side change even if backend fails
          }
          // Update localStorage without page reload
          localStorage.setItem(STORAGE_KEY, newLocale)
          setCurrentLocale(newLocale)
          // Notify parent so it can send continuation message to AI
          onSessionLanguageSwitch?.(newLocale)
        } else {
          // Not in a lesson — standard navigation path
          localStorage.setItem(STORAGE_KEY, newLocale)
          setCurrentLocale(newLocale)

          // Sync preferred language to Clerk user metadata (best-effort)
          if (user) {
            user
              .update({ unsafeMetadata: { ...user.unsafeMetadata, preferredLanguage: newLocale } })
              .catch(() => {
                // Non-critical — ignore Clerk sync failures
              })
          }

          // Reload the current page so next-intl picks up the new locale from localStorage
          // (since we use a flat routing strategy without locale prefixes)
          router.refresh()
        }
      } finally {
        setIsSwitching(false)
      }
    },
    [currentLocale, isInLesson, sessionId, clerkUserId, onSessionLanguageSwitch, user, router]
  )

  return (
    <div className="relative flex items-center">
      <select
        value={currentLocale}
        onChange={(e) => handleChange(e.target.value as SupportedLocale)}
        disabled={isSwitching}
        aria-label="Select language"
        className="
          appearance-none
          bg-white/80
          border border-gray-200
          rounded-lg
          px-3 py-1.5
          pr-7
          text-sm
          font-medium
          text-gray-700
          hover:border-vedya-purple
          focus:outline-none
          focus:ring-2
          focus:ring-vedya-purple/30
          cursor-pointer
          transition-all duration-200
          disabled:opacity-50
          disabled:cursor-not-allowed
        "
        style={{ backgroundImage: 'none' }}
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {LOCALE_DISPLAY_NAMES[locale]}
          </option>
        ))}
      </select>
      {/* Chevron icon */}
      <span className="pointer-events-none absolute right-2 text-gray-500">
        <i className="bi bi-chevron-down text-xs"></i>
      </span>
    </div>
  )
}
