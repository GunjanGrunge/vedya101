'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import 'bootstrap-icons/font/bootstrap-icons.css'

const CATEGORIES = [
  { id: 'getting-started', title: 'Getting started', icon: 'bi-rocket-takeoff' },
  { id: 'account', title: 'Account & profile', icon: 'bi-person' },
  { id: 'technical', title: 'Technical support', icon: 'bi-tools' },
]

const FAQ = [
  { q: 'How do I create a learning path?', a: 'From the dashboard, click “Create learning plan” and follow the prompts. You can set goals and the AI will suggest a path.', cat: 'getting-started' },
  { q: 'How do I reset my password?', a: 'Use the “Forgot password” link on the sign-in page. You’ll receive an email to reset your password.', cat: 'account' },
  { q: 'What browsers are supported?', a: 'VEDYA works best in the latest Chrome, Firefox, Safari, and Edge. We recommend keeping your browser updated.', cat: 'technical' },
  { q: 'How can I get help with the API?', a: 'See our API Reference and Documentation for endpoints and integration guides. For specific issues, contact support.', cat: 'technical' },
  { q: 'Is my data secure?', a: 'Yes. We use encryption and follow best practices for storing and handling your data. See our Privacy Policy for details.', cat: 'account' },
]

export default function HelpCenterPage() {
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState('')
  const heroRef = useRef<HTMLElement>(null)
  const [heroVisible, setHeroVisible] = useState(false)

  const filteredFAQ = search.trim()
    ? FAQ.filter((f) => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()))
    : FAQ

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
          <div className="absolute top-20 left-1/3 w-96 h-96 bg-vedya-purple/15 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/3 w-80 h-80 bg-vedya-pink/15 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(255,255,255,0.7)_100%)]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className={`text-sm font-medium text-vedya-purple mb-3 uppercase tracking-widest transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>Support</p>
          <h1 className={`text-4xl md:text-6xl font-bold mb-4 transition-all duration-700 delay-75 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="gradient-text">Help Center</span>
          </h1>
          <p className={`text-lg text-gray-600 max-w-2xl mx-auto mb-8 transition-all duration-700 delay-150 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Find answers, guides, and contact support.
          </p>
          <div className={`max-w-xl mx-auto transition-all duration-700 delay-200 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="relative">
              <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search for help..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-vedya-purple focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Categories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`#${cat.id}`}
                className="flex items-center gap-4 rounded-xl bg-white border border-gray-200 p-4 shadow-sm hover:shadow-md hover:border-vedya-purple/30 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-vedya-purple to-vedya-pink flex items-center justify-center text-white">
                  <i className={`bi ${cat.icon}`} />
                </div>
                <span className="font-semibold text-gray-900">{cat.title}</span>
              </Link>
            ))}
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {filteredFAQ.length ? filteredFAQ.map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm hover:border-vedya-purple/20 transition-colors"
              >
                <h3 className="font-bold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
              </div>
            )) : (
              <p className="text-gray-500 py-8 text-center">No results for “{search}”. Try different keywords.</p>
            )}
          </div>
        </div>
      </section>

      <section className="py-12 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 mb-4">Still need help? Check documentation or contact support.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/documentation" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-vedya-purple to-vedya-pink hover:shadow-lg transition-all">Documentation</Link>
            <Link href="/api-reference" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-vedya-purple border-2 border-vedya-purple hover:bg-vedya-purple hover:text-white transition-all">API Reference</Link>
            <a href="mailto:support@vedya.com" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-gray-700 border-2 border-gray-300 hover:border-vedya-purple hover:text-vedya-purple transition-all">
              <i className="bi bi-envelope" />
              support@vedya.com
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
