'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'
import { useRouter, usePathname } from 'next/navigation'
import { API_ENDPOINTS } from '../lib/api-config'
import 'bootstrap-icons/font/bootstrap-icons.css'

interface NavbarProps {
  onStartLearning?: () => void
  onBackToHome?: () => void
  showBackButton?: boolean
}

export default function Navbar({ onStartLearning, onBackToHome, showBackButton }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [hasLearningPlans, setHasLearningPlans] = useState(false)
  const [onboardingCompleted, setOnboardingCompleted] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { isSignedIn, user } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const isHome = pathname === '/'

  useEffect(() => {
    if (isSignedIn) {
      checkLearningPlans()
    }
  }, [isSignedIn])

  useEffect(() => {
    if (!isSignedIn || !user?.id) {
      setOnboardingCompleted(true)
      return
    }
    let cancelled = false
    fetch(API_ENDPOINTS.onboardingStatus(user.id))
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { completed?: boolean } | null) => {
        if (!cancelled) setOnboardingCompleted(data?.completed === true)
      })
      .catch(() => { if (!cancelled) setOnboardingCompleted(true) })
    return () => { cancelled = true }
  }, [isSignedIn, user?.id])

  useEffect(() => {
    const onComplete = () => setOnboardingCompleted(true)
    window.addEventListener('onboarding-completed', onComplete)
    return () => window.removeEventListener('onboarding-completed', onComplete)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setIsCollapsed(window.scrollY > 24)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const checkLearningPlans = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.learningPlansCheck, {
        headers: {
          'Authorization': `Bearer ${user?.id}`
        }
      })
      const data = await response.json()
      setHasLearningPlans(data.hasPlans)
    } catch (error) {
      console.error('Error checking learning plans:', error)
    }
  }

  const navigateToDashboard = () => {
    router.push('/dashboard')
    setIsMenuOpen(false)
  }

  const navigateToHome = () => {
    router.push('/')
    setIsMenuOpen(false)
  }

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleBackToHome = () => {
    if (onBackToHome) {
      onBackToHome()
    } else {
      navigateToHome()
    }
  }

  return (
    <nav className="sticky top-0 z-40 bg-transparent pt-4 md:pt-6">
      <div
        className={[
          'mx-auto max-w-7xl px-8 sm:px-12 lg:px-14 transition-all duration-300 ease-out',
          isCollapsed
            ? 'mt-3 rounded-2xl bg-white/75 backdrop-blur-md shadow-[0_18px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/10'
            : 'mt-0 bg-transparent rounded-none shadow-none ring-0',
        ].join(' ')}
      >
        <div
          className={[
            'relative flex justify-between items-center h-24',
          ].join(' ')}
        >
          {/* Logo and Brand - Left */}
          <div className="flex items-center space-x-5 flex-shrink-0">
            {showBackButton && (
              <button
                onClick={handleBackToHome}
                className="p-2 rounded-lg text-gray-600 hover:text-vedya-purple hover:bg-gray-100 transition-all duration-300 hover:scale-110"
                aria-label="Back to home"
              >
                <i className="bi bi-arrow-left text-xl"></i>
              </button>
            )}

            <button
              onClick={navigateToHome}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-transparent">
                <Image
                  src="/assets/images/Logo.png"
                  alt="VEDYA logo"
                  fill
                  sizes="56px"
                  className="object-contain"
                  priority
                />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">VEDYA</h1>
            </button>
          </div>

          {/* Center Navigation */}
          <div className="hidden md:flex items-center space-x-8 absolute left-1/2 -translate-x-1/2">
            {pathname === '/' ? (
              isSignedIn && onboardingCompleted && (
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:text-vedya-purple font-medium transition-colors duration-200 text-base"
                >
                  Dashboard
                </Link>
              )
            ) : pathname.startsWith('/dashboard') ? (
              <Link
                href="/"
                className="text-gray-700 hover:text-vedya-purple font-medium transition-colors duration-200 text-base"
              >
                Home
              </Link>
            ) : isSignedIn && onboardingCompleted ? (
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-vedya-purple font-medium transition-colors duration-200 text-base"
              >
                Dashboard
              </Link>
            ) : null}
            {isHome ? (
              <button onClick={() => scrollToSection('pricing')} className="text-gray-700 hover:text-vedya-purple font-medium transition-colors duration-200 text-base">Pricing</button>
            ) : (
              <Link href="/#pricing" className="text-gray-700 hover:text-vedya-purple font-medium transition-colors duration-200 text-base">Pricing</Link>
            )}
            {isHome ? (
              <button onClick={() => scrollToSection('faq')} className="text-gray-700 hover:text-vedya-purple font-medium transition-colors duration-200 text-base">FAQ</button>
            ) : (
              <Link href="/#faq" className="text-gray-700 hover:text-vedya-purple font-medium transition-colors duration-200 text-base">FAQ</Link>
            )}
            {isHome ? (
              <button onClick={() => scrollToSection('contact')} className="text-gray-700 hover:text-vedya-purple font-medium transition-colors duration-200 text-base">Contact</button>
            ) : (
              <Link href="/#contact" className="text-gray-700 hover:text-vedya-purple font-medium transition-colors duration-200 text-base">Contact</Link>
            )}
          </div>

          {/* Right Side - User Info */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            {isSignedIn ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700 font-medium hidden sm:block">
                  Welcome, {user?.firstName || 'User'}!
                </span>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-10 h-10"
                    }
                  }}
                />
              </div>
            ) : (
              !showBackButton && onStartLearning && (
                <button
                  onClick={onStartLearning}
                  className="btn-primary text-sm px-4 py-2"
                >
                  Start Learning
                </button>
              )
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:text-vedya-purple hover:bg-gray-100 transition-all duration-300 hover:scale-110"
              aria-label="Toggle menu"
            >
              <i className={`bi ${isMenuOpen ? 'bi-x-lg' : 'bi-list'} text-2xl transition-transform duration-300`}></i>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-3">
              {pathname === '/' ? (
                isSignedIn && onboardingCompleted && (
                  <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-gray-700 hover:text-vedya-purple hover:bg-gray-50 rounded-lg font-medium transition-colors duration-200 text-left text-base">
                    Dashboard
                  </Link>
                )
              ) : pathname.startsWith('/dashboard') ? (
                <Link href="/" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-gray-700 hover:text-vedya-purple hover:bg-gray-50 rounded-lg font-medium transition-colors duration-200 text-left text-base">
                  Home
                </Link>
              ) : isSignedIn && onboardingCompleted ? (
                <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-gray-700 hover:text-vedya-purple hover:bg-gray-50 rounded-lg font-medium transition-colors duration-200 text-left text-base">
                  Dashboard
                </Link>
              ) : null}
              {isHome ? (
                <button onClick={() => { scrollToSection('pricing'); setIsMenuOpen(false) }} className="block px-3 py-2 text-gray-700 hover:text-vedya-purple hover:bg-gray-50 rounded-lg font-medium text-left text-base">Pricing</button>
              ) : (
                <Link href="/#pricing" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-gray-700 hover:text-vedya-purple hover:bg-gray-50 rounded-lg font-medium text-left text-base">Pricing</Link>
              )}
              {isHome ? (
                <button onClick={() => { scrollToSection('faq'); setIsMenuOpen(false) }} className="block px-3 py-2 text-gray-700 hover:text-vedya-purple hover:bg-gray-50 rounded-lg font-medium text-left text-base">FAQ</button>
              ) : (
                <Link href="/#faq" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-gray-700 hover:text-vedya-purple hover:bg-gray-50 rounded-lg font-medium text-left text-base">FAQ</Link>
              )}
              {isHome ? (
                <button onClick={() => { scrollToSection('contact'); setIsMenuOpen(false) }} className="block px-3 py-2 text-gray-700 hover:text-vedya-purple hover:bg-gray-50 rounded-lg font-medium text-left text-base">Contact</button>
              ) : (
                <Link href="/#contact" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-gray-700 hover:text-vedya-purple hover:bg-gray-50 rounded-lg font-medium text-left text-base">Contact</Link>
              )}

              {isSignedIn ? (
                <div className="px-3 py-2 border-t border-gray-200 pt-4 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Welcome, {user?.firstName || 'User'}!
                    </span>
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox: "w-8 h-8"
                        }
                      }}
                    />
                  </div>
                </div>
              ) : (
                !showBackButton && onStartLearning && (
                  <button
                    onClick={() => {
                      onStartLearning()
                      setIsMenuOpen(false)
                    }}
                    className="btn-primary w-full mt-4"
                  >
                    Start Learning
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="text-gray-700 hover:text-vedya-purple font-medium transition-colors duration-200"
    >
      {children}
    </a>
  )
}

function MobileNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="block px-3 py-2 text-gray-700 hover:text-vedya-purple hover:bg-gray-50 rounded-lg font-medium transition-colors duration-200"
    >
      {children}
    </a>
  )
}
