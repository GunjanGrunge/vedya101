'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { PRODUCT_IMAGES } from '../../lib/product-images'
import 'bootstrap-icons/font/bootstrap-icons.css'

const FEATURES = [
  { id: '1', title: 'Adaptive learning', desc: 'Content and difficulty adapt in real time to each learner.', icon: 'bi-cpu-fill', image: PRODUCT_IMAGES.studyNotebook, gradient: 'from-vedya-purple to-vedya-pink' },
  { id: '2', title: 'Multi-agent AI', desc: 'Planners, curators, and assessors work together for a coherent experience.', icon: 'bi-diagram-3-fill', image: PRODUCT_IMAGES.techAbstract, gradient: 'from-vedya-pink to-vedya-orange' },
  { id: '3', title: 'Real-time analytics', desc: 'Dashboards and reports so you see progress and gaps at a glance.', icon: 'bi-graph-up-arrow', image: PRODUCT_IMAGES.dashboard, gradient: 'from-vedya-purple to-vedya-dark-purple' },
  { id: '4', title: 'Smart assessments', desc: 'Adaptive quizzes and feedback that teach, not just score.', icon: 'bi-clipboard-check-fill', image: PRODUCT_IMAGES.writing, gradient: 'from-vedya-orange to-vedya-yellow' },
  { id: '5', title: 'Learning paths', desc: 'Structured, goal-oriented journeys that adapt to your pace.', icon: 'bi-signpost-2-fill', image: PRODUCT_IMAGES.booksStack, gradient: 'from-vedya-pink to-vedya-purple' },
  { id: '6', title: 'Collaboration', desc: 'Tools for educators and learners to connect and grow together.', icon: 'bi-people-fill', image: PRODUCT_IMAGES.collaboration, gradient: 'from-vedya-purple to-vedya-pink' },
]

export default function FeaturesPage() {
  const [mounted, setMounted] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const gridRef = useRef<HTMLElement>(null)
  const [heroVisible, setHeroVisible] = useState(false)
  const [gridVisible, setGridVisible] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!mounted) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          if (entry.target.getAttribute('data-section') === 'hero') setHeroVisible(true)
          if (entry.target.getAttribute('data-section') === 'grid') setGridVisible(true)
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
    if (heroRef.current) observer.observe(heroRef.current)
    if (gridRef.current) observer.observe(gridRef.current)
    return () => observer.disconnect()
  }, [mounted])

  return (
    <div className="min-h-screen">
      <Navbar showBackButton />

      <section ref={heroRef} data-section="hero" className="relative overflow-hidden pt-28 pb-16 md:pb-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-vedya-purple/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-vedya-pink/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,transparent_40%,rgba(255,255,255,0.85)_100%)]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className={`text-sm font-medium text-vedya-purple mb-3 uppercase tracking-widest transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>Product</p>
          <h1 className={`text-4xl md:text-6xl font-bold mb-4 transition-all duration-700 delay-75 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="gradient-text">Features</span>
          </h1>
          <p className={`text-lg text-gray-600 max-w-2xl mx-auto mb-8 transition-all duration-700 delay-150 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Everything you need for personalized, AI-driven learning—from adaptive content to analytics.
          </p>
          <div className={`flex flex-wrap justify-center gap-3 transition-all duration-700 delay-200 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {['Adaptive', 'AI-powered', 'Real-time'].map((label) => (
              <span key={label} className="px-4 py-2 rounded-full bg-white/90 border border-gray-200 shadow-sm text-gray-700 text-sm font-medium hover:border-vedya-purple/50 hover:shadow-md transition-all duration-300 cursor-default">
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section ref={gridRef} data-section="grid" className="py-12 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={f.id}
                className={`group rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-lg hover:shadow-2xl hover:border-vedya-purple/30 hover:-translate-y-2 transition-all duration-300 hover-lift ${gridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                style={{ transitionDelay: gridVisible ? `${i * 80}ms` : '0ms', transitionDuration: '400ms' }}
              >
                <div className="relative h-40 overflow-hidden">
                  <Image src={f.image} alt="" fill className="object-cover group-hover:scale-110 transition-transform duration-500" sizes="(max-width: 1024px) 50vw, 33vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute top-3 left-3 w-10 h-10 rounded-xl bg-white/90 flex items-center justify-center text-vedya-purple group-hover:scale-110 transition-transform duration-300">
                    <i className={`bi ${f.icon} text-lg`} />
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-vedya-purple transition-colors duration-200">{f.title}</h3>
                  <p className="text-gray-600 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Explore the platform</h2>
          <p className="text-gray-600 mb-6">See features in action on the home page or start learning.</p>
          <Link href="/" className="btn-cta-product group inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-vedya-purple to-vedya-pink hover:shadow-lg">Get started <i className="bi bi-arrow-right transition-transform duration-200 group-hover:translate-x-1" /></Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
