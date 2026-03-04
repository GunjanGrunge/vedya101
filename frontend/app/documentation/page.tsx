'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import 'bootstrap-icons/font/bootstrap-icons.css'

const SECTIONS = [
  { id: 'getting-started', title: 'Getting started', icon: 'bi-rocket-takeoff', description: 'Set up your account, integrate with VEDYA, and run your first learning flow.' },
  { id: 'concepts', title: 'Core concepts', icon: 'bi-lightbulb', description: 'Learning paths, agents, assessments, and how they work together.' },
  { id: 'guides', title: 'Guides', icon: 'bi-book', description: 'Step-by-step guides for common use cases and integrations.' },
]

export default function DocumentationPage() {
  const [mounted, setMounted] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const [heroVisible, setHeroVisible] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!mounted) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) setHeroVisible(true) },
      { threshold: 0.1 }
    )
    if (heroRef.current) observer.observe(heroRef.current)
    return () => observer.disconnect()
  }, [mounted])

  return (
    <div className="min-h-screen">
      <Navbar showBackButton />

      <section ref={heroRef} data-section="hero" className="relative overflow-hidden pt-28 pb-12 md:pb-16">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-vedya-purple/15 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-vedya-pink/15 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(255,255,255,0.7)_100%)]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className={`text-sm font-medium text-vedya-purple mb-3 uppercase tracking-widest transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>Resources</p>
          <h1 className={`text-4xl md:text-6xl font-bold mb-4 transition-all duration-700 delay-75 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="gradient-text">Documentation</span>
          </h1>
          <p className={`text-lg text-gray-600 max-w-2xl mx-auto transition-all duration-700 delay-150 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Learn how to use VEDYA—from getting started to advanced integrations.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SECTIONS.map((sec, i) => (
              <Link
                key={sec.id}
                href={`#${sec.id}`}
                className="group block rounded-2xl bg-white border border-gray-200 p-6 shadow-lg hover:shadow-xl hover:border-vedya-purple/30 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-vedya-purple to-vedya-pink flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                  <i className={`bi ${sec.icon} text-xl`} />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-vedya-purple transition-colors">{sec.title}</h2>
                <p className="text-gray-600 text-sm">{sec.description}</p>
              </Link>
            ))}
          </div>

          <div className="mt-16 space-y-16">
            <div id="getting-started" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Getting started</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Create an account, connect your environment, and run your first learning session. We support web sign-in and API access for integrations.
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Sign up or sign in at the app</li>
                <li>Complete your learner or educator profile</li>
                <li>Create or join a learning path</li>
                <li>Use the chat and dashboard to track progress</li>
              </ul>
            </div>
            <div id="concepts">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Core concepts</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                VEDYA uses AI agents for planning, content, and assessment. Learning paths are built from objectives and adapt to each learner.
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Learning paths and objectives</li>
                <li>Multi-agent system (planner, curator, assessor)</li>
                <li>Adaptive assessments and feedback</li>
                <li>Progress tracking and analytics</li>
              </ul>
            </div>
            <div id="guides">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Guides</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Practical guides for common scenarios: integrating with your LMS, using the API, or customizing learning paths.
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>API integration guide</li>
                <li>Embedding VEDYA in your platform</li>
                <li>Building custom learning paths</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 mb-4">Need more detail? Check the API reference or contact support.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/api-reference" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-vedya-purple to-vedya-pink hover:shadow-lg transition-all">API Reference</Link>
            <Link href="/help-center" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-vedya-purple border-2 border-vedya-purple hover:bg-vedya-purple hover:text-white transition-all">Help Center</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
