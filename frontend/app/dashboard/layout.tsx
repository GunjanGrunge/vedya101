'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { DashboardProfileProvider } from './DashboardProfileContext'
import { API_ENDPOINTS } from '../../lib/api-config'
import { useIsAdmin } from '../../lib/useIsAdmin'
import AILoader from '../../components/AILoader'
import 'bootstrap-icons/font/bootstrap-icons.css'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { isLoaded, isSignedIn, user } = useUser()
  const { isAdmin, isLoading: adminLoading } = useIsAdmin()
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [onboardingCompleted, setOnboardingCompleted] = useState(true)

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) {
      if (isLoaded && !isSignedIn) {
        setOnboardingChecked(true)
        setOnboardingCompleted(true)
      }
      return
    }
    let cancelled = false
    fetch(API_ENDPOINTS.onboardingStatus(user.id))
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { completed?: boolean } | null) => {
        if (!cancelled) {
          setOnboardingChecked(true)
          setOnboardingCompleted(data?.completed === true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOnboardingChecked(true)
          setOnboardingCompleted(true)
        }
      })
    return () => { cancelled = true }
  }, [isLoaded, isSignedIn, user?.id])

  useEffect(() => {
    if (onboardingChecked && isSignedIn && !onboardingCompleted) {
      router.replace('/')
    }
  }, [onboardingChecked, isSignedIn, onboardingCompleted, router])

  // Admin: redirect to admin dashboard when opening /dashboard; block non-admins from /dashboard/admin
  useEffect(() => {
    if (!isLoaded || !isSignedIn || adminLoading) return
    const inAdminArea = pathname.startsWith('/dashboard/admin')
    if (isAdmin && pathname === '/dashboard') {
      router.replace('/dashboard/admin')
      return
    }
    if (!isAdmin && inAdminArea) {
      router.replace('/dashboard')
    }
  }, [isLoaded, isSignedIn, adminLoading, isAdmin, pathname, router])

  if (!onboardingChecked || (isSignedIn && !onboardingCompleted)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-vedya-purple/5 via-white to-vedya-pink/5">
        <AILoader message="Loading..." subMessage={isSignedIn && !onboardingCompleted ? 'Redirecting to home...' : undefined} />
      </div>
    )
  }

  const navItems = (() => {
    if (isAdmin) {
      return [
        { href: '/dashboard/admin', label: 'Admin', icon: 'bi-shield-lock' },
        { href: '/dashboard/admin/live', label: 'Go Live', icon: 'bi-broadcast' },
      ]
    }
    const base = [
      { href: '/dashboard', label: 'Info', icon: 'bi-info-circle' },
      { href: '/dashboard/learning', label: 'Learning', icon: 'bi-journal-bookmark' },
      { href: '/dashboard/achievements', label: 'Achievements', icon: 'bi-award' },
      { href: '/dashboard/settings', label: 'Settings', icon: 'bi-gear' },
    ]
    // For normal users: only show Live in the sidebar while they are on /dashboard/live
    if (pathname.startsWith('/dashboard/live')) {
      base.splice(1, 0, { href: '/dashboard/live', label: 'Live', icon: 'bi-broadcast' })
    }
    return base
  })()

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-gray-200 bg-white/80 backdrop-blur-sm hidden sm:block">
          <nav className="sticky top-28 py-6 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gradient-to-r from-vedya-purple/15 to-vedya-pink/15 text-vedya-purple'
                      : 'text-slate-600 hover:bg-gray-100 hover:text-slate-900'
                  }`}
                >
                  <i className={`bi ${item.icon} text-lg`} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Mobile nav tabs */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-pb">
          <nav className="flex">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium ${
                    isActive ? 'text-vedya-purple' : 'text-slate-500'
                  }`}
                >
                  <i className={`bi ${item.icon} text-xl`} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 pb-20 sm:pb-0">
          <DashboardProfileProvider>
            {children}
          </DashboardProfileProvider>
        </main>
      </div>

      <Footer />
    </div>
  )
}
