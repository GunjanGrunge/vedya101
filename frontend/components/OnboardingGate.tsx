'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import OnboardingWizard from './OnboardingWizard'
import { API_ENDPOINTS } from '../lib/api-config'

/**
 * When the user is signed in, checks if they have completed onboarding.
 * If not, shows a chat widget on the left; clicking it opens the onboarding wizard.
 * Does not auto-open the wizard or redirect—user stays on home until they complete onboarding.
 */
export default function OnboardingGate() {
  const { isSignedIn, isLoaded, user } = useUser()
  const [showWizard, setShowWizard] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return

    const clerkId = user.id
    const email = user.primaryEmailAddress?.emailAddress ?? ''
    const name = user.firstName ?? undefined
    let cancelled = false

    async function check() {
      try {
        await fetch(API_ENDPOINTS.userRegister, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clerk_user_id: clerkId,
            email,
            name
          })
        })
        if (cancelled) return

        const res = await fetch(API_ENDPOINTS.onboardingStatus(clerkId))
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && !data.completed) setNeedsOnboarding(true)
      } catch {
        // If API is down or errors, don't block
      }
    }

    check()
    return () => { cancelled = true }
  }, [isLoaded, isSignedIn, user?.id, user?.primaryEmailAddress?.emailAddress, user?.firstName])

  const handleComplete = () => {
    setShowWizard(false)
    setNeedsOnboarding(false)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('onboarding-completed'))
    }
  }

  return (
    <>
      {/* Complete setup: bottom-right (same spot as Start chat), round icon; on hover expands to show "Complete setup" */}
      {needsOnboarding && !showWizard && (
        <button
          type="button"
          onClick={() => setShowWizard(true)}
          className="fixed bottom-20 right-4 z-30 flex items-center justify-center gap-2 overflow-hidden w-14 h-14 rounded-full bg-gradient-to-r from-vedya-purple to-vedya-pink text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:w-auto hover:px-4 hover:pr-5 group animate-setup-pulse hover:animate-none"
          aria-label="Complete setup"
        >
          <svg className="w-6 h-6 shrink-0 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5A2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0-2.5-2.5Z" />
          </svg>
          <span className="whitespace-nowrap text-sm font-medium opacity-0 max-w-0 overflow-hidden group-hover:opacity-100 group-hover:max-w-[200px] transition-all duration-300">
            Complete setup
          </span>
        </button>
      )}

      {showWizard && (
        <OnboardingWizard
          isOpen={true}
          onComplete={handleComplete}
          onClose={() => setShowWizard(false)}
          initialName={user?.firstName ?? ''}
        />
      )}
    </>
  )
}
