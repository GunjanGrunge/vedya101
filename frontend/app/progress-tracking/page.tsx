'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { PRODUCT_IMAGES } from '../../lib/product-images'
import 'bootstrap-icons/font/bootstrap-icons.css'

const TRACKING_CARDS = [
  { title: 'Learner dashboard', desc: 'Current path, next steps, completion and streaks.', icon: 'bi-speedometer2', stat: 'Real-time' },
  { title: 'Skill & mastery', desc: 'See which topics you’ve mastered and where to focus.', icon: 'bi-bullseye', stat: 'Per skill' },
  { title: 'Reports & export', desc: 'Aggregated views and exportable reports for educators.', icon: 'bi-file-earmark-bar-graph', stat: 'Export' },
]

export default function ProgressTrackingPage() {
  const [mounted, setMounted] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const cardsRef = useRef<HTMLElement>(null)
  const [heroVisible, setHeroVisible] = useState(false)
  const [cardsVisible, setCardsVisible] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!mounted) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          if (entry.target.getAttribute('data-section') === 'hero') setHeroVisible(true)
          if (entry.target.getAttribute('data-section') === 'cards') setCardsVisible(true)
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
    if (heroRef.current) observer.observe(heroRef.current)
    if (cardsRef.current) observer.observe(cardsRef.current)
    return () => observer.disconnect()
  }, [mounted])

  return (
    <div className="min-h-screen">
      <Navbar showBackButton />

      <section ref={heroRef} data-section="hero" className="relative overflow-hidden pt-28 pb-16">
        <div className="absolute inset-0">
          <Image src={PRODUCT_IMAGES.dashboard} alt="" fill className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-white" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center min-h-[320px]">
            <div>
              <p className={`text-sm font-medium text-vedya-yellow mb-3 uppercase tracking-widest transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>Product</p>
              <h1 className={`text-4xl md:text-5xl font-bold mb-4 text-white transition-all duration-700 delay-75 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                Progress Tracking
              </h1>
              <p className={`text-lg text-gray-200 transition-all duration-700 delay-150 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                See where you stand at a glance. Dashboards, skill estimates, and trends so learners and educators stay informed.
              </p>
            </div>
            <div className={`hidden lg:block relative h-64 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl transition-all duration-700 delay-200 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <Image src={PRODUCT_IMAGES.analytics} alt="" fill className="object-cover" sizes="50vw" />
            </div>
          </div>
        </div>
      </section>

      <section ref={cardsRef} data-section="cards" className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className={`text-2xl md:text-3xl font-bold text-gray-900 mb-10 text-center transition-all duration-700 ${cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            What you get
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TRACKING_CARDS.map((c, i) => (
              <div
                key={c.title}
                className={`group rounded-2xl bg-gray-50 border border-gray-200 p-6 hover:bg-white hover:shadow-xl hover:border-vedya-purple/30 hover:-translate-y-1 transition-all duration-300 ${cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: cardsVisible ? `${100 + i * 80}ms` : '0ms', transitionDuration: '400ms' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-vedya-purple to-vedya-pink flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                    <i className={`bi ${c.icon} text-xl`} />
                  </div>
                  <span className="text-xs font-semibold text-vedya-purple uppercase tracking-wide">{c.stat}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-vedya-purple transition-colors duration-200">{c.title}</h3>
                <p className="text-gray-600 text-sm">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-gray-200 bg-gray-50/50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">View your progress</h2>
          <p className="text-gray-600 mb-6">Sign in and open your dashboard to see learning analytics.</p>
          <Link href="/" className="btn-cta-product group inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-vedya-purple to-vedya-pink hover:shadow-lg">Get started <i className="bi bi-arrow-right group-hover:translate-x-1 transition-transform duration-200" /></Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
