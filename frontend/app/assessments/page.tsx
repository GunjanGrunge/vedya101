'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { PRODUCT_IMAGES } from '../../lib/product-images'
import 'bootstrap-icons/font/bootstrap-icons.css'

const BENEFITS = [
  { title: 'Adaptive difficulty', icon: 'bi-sliders' },
  { title: 'Feedback that teaches', icon: 'bi-chat-left-text-fill' },
  { title: 'Multiple question types', icon: 'bi-ui-checks' },
]

export default function AssessmentsPage() {
  const [mounted, setMounted] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const cardsRef = useRef<HTMLElement>(null)
  const [heroVisible, setHeroVisible] = useState(false)
  const [mainVisible, setMainVisible] = useState(false)
  const [cardsVisible, setCardsVisible] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!mounted) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const id = entry.target.getAttribute('data-section')
          if (id === 'hero') setHeroVisible(true)
          if (id === 'main') setMainVisible(true)
          if (id === 'cards') setCardsVisible(true)
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
    if (heroRef.current) observer.observe(heroRef.current)
    if (mainRef.current) observer.observe(mainRef.current)
    if (cardsRef.current) observer.observe(cardsRef.current)
    return () => observer.disconnect()
  }, [mounted])

  return (
    <div className="min-h-screen">
      <Navbar showBackButton />

      <section ref={heroRef} data-section="hero" className="relative overflow-hidden pt-28 pb-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-0 w-[28rem] h-[28rem] bg-vedya-orange/15 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-0 w-96 h-96 bg-vedya-purple/15 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,transparent_30%,rgba(255,255,255,0.9)_70%)]" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className={`text-sm font-medium text-vedya-purple mb-3 uppercase tracking-widest transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>Product</p>
          <h1 className={`text-4xl md:text-6xl font-bold mb-4 transition-all duration-700 delay-75 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="gradient-text">Assessments</span>
          </h1>
          <p className={`text-lg text-gray-600 transition-all duration-700 delay-150 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Smart assessments that adapt to your level and give feedback that teaches—not just scores.
          </p>
        </div>
      </section>

      <section ref={mainRef} data-section="main" className="py-16 md:py-24 bg-gray-50/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="group/card rounded-3xl overflow-hidden shadow-2xl bg-white border border-gray-200 hover:shadow-xl hover:border-vedya-purple/20 transition-all duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className={`relative h-72 lg:h-96 order-2 lg:order-1 overflow-hidden transition-all duration-700 ${mainVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                <Image src={PRODUCT_IMAGES.writing} alt="" fill className="object-cover group-hover/card:scale-105 transition-transform duration-500" sizes="(max-width: 1024px) 100vw, 50vw" />
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
              </div>
              <div className={`p-8 md:p-12 flex flex-col justify-center order-1 lg:order-2 transition-all duration-700 delay-150 ${mainVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Built for learning</h2>
                <p className="text-gray-600 mb-6">Questions adjust to your responses so you’re always at the right difficulty. After each answer you get explanations and links back to content—so assessments reinforce learning instead of only measuring it.</p>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-center gap-3"><i className="bi bi-check-circle-fill text-vedya-purple text-xl" /> Difficulty scales with performance</li>
                  <li className="flex items-center gap-3"><i className="bi bi-check-circle-fill text-vedya-purple text-xl" /> Instant explanations and hints</li>
                  <li className="flex items-center gap-3"><i className="bi bi-check-circle-fill text-vedya-purple text-xl" /> MCQ, short answer, and more</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={cardsRef} data-section="cards" className="py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${cardsVisible ? 'opacity-100' : 'opacity-0'}`}>
            {BENEFITS.map((b, i) => (
              <div
                key={b.title}
                className={`group rounded-2xl border-2 border-gray-200 p-6 text-center hover:border-vedya-purple/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${cardsVisible ? 'translate-y-0' : 'translate-y-4'}`}
                style={{ transitionDelay: cardsVisible ? `${80 + i * 100}ms` : '0ms', transitionDuration: '400ms' }}
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-vedya-purple to-vedya-pink flex items-center justify-center text-white mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <i className={`bi ${b.icon} text-2xl`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-vedya-purple transition-colors duration-200">{b.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Try an assessment</h2>
          <p className="text-gray-600 mb-6">See how adaptive quizzes work inside your learning path.</p>
          <Link href="/" className="btn-cta-product group inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-vedya-purple to-vedya-pink hover:shadow-lg">Get started <i className="bi bi-arrow-right group-hover:translate-x-1 transition-transform duration-200" /></Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
