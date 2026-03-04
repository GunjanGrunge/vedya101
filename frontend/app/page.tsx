'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useUser, SignInButton } from '@clerk/nextjs'
import { DNA } from 'react-loader-spinner'
import ChatInterface from '../components/ChatInterface'
import { API_ENDPOINTS } from '../lib/api-config'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import IntegrationsSection from '../components/IntegrationsSection'
import InsightsSection from '../components/InsightsSection'
import MarketingSection from '../components/MarketingSection'
import PricingSection from '../components/PricingSection'
import FAQSection from '../components/FAQSection'
import TestimonialsSection from '../components/TestimonialsSection'
import Features from '../components/Features'
import Footer from '../components/Footer'
import 'bootstrap-icons/font/bootstrap-icons.css'

export default function HomePage() {
  const [showChat, setShowChat] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const { isSignedIn, isLoaded: userLoaded, user } = useUser()
  const [onboardingCompleted, setOnboardingCompleted] = useState(true)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

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

  const handleStartLearning = () => {
    setShowChat(true)
  }

  if (!isLoaded || !userLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <DNA
              visible
              height={80}
              width={80}
              ariaLabel="dna-loading"
              wrapperClass="dna-wrapper"
            />
          </div>
          <p className="text-vedya-purple font-medium">Loading VEDYA...</p>
        </div>
      </div>
    )
  }

  // Show sign-in screen if user is not authenticated
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-vedya-purple/10 via-white to-vedya-pink/10">
        <div className="container mx-auto px-4 h-screen flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="relative w-24 h-24 mx-auto mb-6 rounded-2xl overflow-hidden bg-transparent">
              <Image
                src="/assets/images/Logo.png"
                alt="VEDYA logo"
                fill
                sizes="96px"
                className="object-contain"
                priority
              />
            </div>

            <h1 className="text-3xl font-bold gradient-text mb-2">Welcome to VEDYA</h1>
            <p className="text-gray-600 mb-6">
              AI-Powered Education Platform
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Sign in to access your personalized learning experience powered by advanced AI technology.
            </p>

            <SignInButton mode="modal" forceRedirectUrl="/dashboard">
              <button className="btn-primary w-full mb-4">
                Sign In to Start Learning
              </button>
            </SignInButton>

            <p className="text-xs text-gray-400">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show main app for authenticated users
  return (
    <div className="min-h-screen">
      <Navbar onStartLearning={handleStartLearning} />
      <Hero onStartLearning={handleStartLearning} />
      <IntegrationsSection />
      <InsightsSection />
      <MarketingSection />
      <PricingSection />
      <FAQSection />
      <TestimonialsSection />
      <Features />
      <Footer />

      <ChatInterface
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        initialGreeting="Lets start Learning Python Today."
      />

      {/* Floating Chat Button - show only after onboarding completes */}
      {onboardingCompleted && !showChat && (
        <button
          onClick={handleStartLearning}
          className="fixed bottom-20 right-4 z-30 bg-gradient-to-r from-vedya-purple to-vedya-pink text-white p-4 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 hover:rotate-6 group"
          aria-label="Start chat"
        >
          <i className="bi bi-chat-dots-fill text-2xl transition-transform duration-300 group-hover:scale-110"></i>
        </button>
      )}
    </div>
  )
}
