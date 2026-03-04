'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { PRODUCT_IMAGES } from '../../lib/product-images'
import 'bootstrap-icons/font/bootstrap-icons.css'

const STEPS = [
  { step: 1, title: 'Set your goals', desc: 'Define what you want to learn and by when. Our planner turns objectives into a structured path.', image: PRODUCT_IMAGES.booksStack },
  { step: 2, title: 'Follow your path', desc: 'Work through steps in order or jump with guidance. Content and difficulty adapt to your pace.', image: PRODUCT_IMAGES.studyDesk },
  { step: 3, title: 'Get assessed', desc: 'Quizzes and feedback show what you’ve mastered and what to review next.', image: PRODUCT_IMAGES.writing },
  { step: 4, title: 'Track progress', desc: 'See skills and completion in your dashboard. Export or share for credentials.', image: PRODUCT_IMAGES.dashboard },
]

export default function LearningPathsPage() {
  const [mounted, setMounted] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const timelineRef = useRef<HTMLElement>(null)
  const [heroVisible, setHeroVisible] = useState(false)
  const [timelineVisible, setTimelineVisible] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!mounted) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          if (entry.target.getAttribute('data-section') === 'hero') setHeroVisible(true)
          if (entry.target.getAttribute('data-section') === 'timeline') setTimelineVisible(true)
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
    if (heroRef.current) observer.observe(heroRef.current)
    if (timelineRef.current) observer.observe(timelineRef.current)
    return () => observer.disconnect()
  }, [mounted])

  return (
    <div className="min-h-screen">
      <Navbar showBackButton />

      <section ref={heroRef} data-section="hero" className="relative overflow-hidden pt-28 pb-16">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0">
            <Image src={PRODUCT_IMAGES.booksLibrary} alt="" fill className="object-cover" sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-white" />
          </div>
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8">
          <p className={`text-sm font-medium text-vedya-yellow mb-3 uppercase tracking-widest transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>Product</p>
          <h1 className={`text-4xl md:text-6xl font-bold mb-4 text-white transition-all duration-700 delay-75 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            Learning Paths
          </h1>
          <p className={`text-lg text-gray-200 max-w-2xl mx-auto transition-all duration-700 delay-150 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Structured, goal-oriented journeys that adapt to your pace and progress.
          </p>
        </div>
      </section>

      <section ref={timelineRef} data-section="timeline" className="py-16 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className={`text-2xl md:text-3xl font-bold text-gray-900 mb-12 text-center transition-all duration-700 ${timelineVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <span className="gradient-text">Your journey in four steps</span>
          </h2>

          <div className="space-y-0">
            {STEPS.map((s, i) => (
              <div
                key={s.step}
                className={`group relative flex flex-col md:flex-row gap-6 md:gap-10 items-center py-8 md:py-12 border-b border-gray-200 last:border-0 transition-all duration-700 hover:bg-gray-50/50 md:rounded-xl md:px-4 ${timelineVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                style={{ transitionDelay: timelineVisible ? `${100 + i * 120}ms` : '0ms' }}
              >
                <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center w-12">
                  <span className="w-10 h-10 rounded-full bg-gradient-to-br from-vedya-purple to-vedya-pink flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-transform duration-300">{s.step}</span>
                  {i < STEPS.length - 1 && <div className="w-0.5 flex-1 min-h-[60px] bg-gradient-to-b from-vedya-purple/50 to-transparent mt-2" />}
                </div>
                <div className="md:pl-16 flex-1">
                  <span className="md:hidden inline-flex w-8 h-8 rounded-full bg-vedya-purple text-white items-center justify-center text-sm font-bold mr-3">{s.step}</span>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 inline group-hover:text-vedya-purple transition-colors duration-200">{s.title}</h3>
                  <p className="text-gray-600">{s.desc}</p>
                </div>
                <div className="relative w-full md:w-72 h-48 md:h-40 rounded-xl overflow-hidden shadow-lg shrink-0">
                  <Image src={s.image} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 100vw, 288px" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Start your path</h2>
          <p className="text-gray-600 mb-6">Set your goals and let VEDYA build a path that fits you.</p>
          <Link href="/" className="btn-cta-product group inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-vedya-purple to-vedya-pink hover:shadow-lg">Get started <i className="bi bi-arrow-right group-hover:translate-x-1 transition-transform duration-200" /></Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
