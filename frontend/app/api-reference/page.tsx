'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import 'bootstrap-icons/font/bootstrap-icons.css'

const BASE_URL = 'http://localhost:8000'

const ENDPOINTS = [
  { method: 'GET', path: '/', description: 'Health check' },
  { method: 'POST', path: '/chat', description: 'Send a message and get streaming AI response' },
  { method: 'POST', path: '/chat/stream', description: 'Streaming chat endpoint' },
  { method: 'GET', path: '/learning-plans', description: 'List learning plans for the user' },
  { method: 'POST', path: '/learning-plans', description: 'Create a new learning plan' },
  { method: 'POST', path: '/users/register', description: 'Register user with clerk_user_id, email, name' },
  { method: 'GET', path: '/teaching/recommendations', description: 'Get teaching recommendations' },
]

export default function ApiReferencePage() {
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
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-vedya-purple/15 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-vedya-pink/15 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(255,255,255,0.7)_100%)]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className={`text-sm font-medium text-vedya-purple mb-3 uppercase tracking-widest transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>Developers</p>
          <h1 className={`text-4xl md:text-6xl font-bold mb-4 transition-all duration-700 delay-75 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="gradient-text">API Reference</span>
          </h1>
          <p className={`text-lg text-gray-600 max-w-2xl mx-auto transition-all duration-700 delay-150 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            REST API for integrating VEDYA into your applications. Base URL: <code className="px-2 py-0.5 bg-gray-100 rounded text-sm">{BASE_URL}</code>
          </p>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Endpoints</h2>
          <div className="space-y-4">
            {ENDPOINTS.map((ep) => (
              <div
                key={ep.path + ep.method}
                className="rounded-xl bg-white border border-gray-200 p-4 md:p-5 shadow-sm hover:shadow-md hover:border-vedya-purple/20 transition-all"
              >
                <div className="flex flex-wrap items-center gap-2 md:gap-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${ep.method === 'GET' ? 'bg-emerald-100 text-emerald-800' : 'bg-vedya-purple/10 text-vedya-purple'}`}>
                    {ep.method}
                  </span>
                  <code className="text-sm md:text-base text-gray-800 font-mono break-all">{ep.path}</code>
                </div>
                <p className="text-gray-600 text-sm mt-2">{ep.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 p-5 rounded-xl bg-gray-50 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-2">Authentication</h3>
            <p className="text-gray-600 text-sm">
              Endpoints that require a user context expect the client to send the authenticated user identifier (e.g. from Clerk). See the backend docs or <Link href="/documentation" className="text-vedya-purple hover:underline">Documentation</Link> for details.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 mb-4">More details in the docs or help center.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/documentation" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-vedya-purple to-vedya-pink hover:shadow-lg transition-all">Documentation</Link>
            <Link href="/help-center" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-vedya-purple border-2 border-vedya-purple hover:bg-vedya-purple hover:text-white transition-all">Help Center</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
