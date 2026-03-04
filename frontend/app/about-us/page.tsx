'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import 'bootstrap-icons/font/bootstrap-icons.css'

const taglines = [
  'AI-powered education for everyone.',
  'Personalized learning at scale.',
  'Your goals. Our technology.',
  'Learn smarter, not harder.',
]

export default function AboutUsPage() {
  const [mounted, setMounted] = useState(false)
  const [taglineIndex, setTaglineIndex] = useState(0)
  const heroRef = useRef<HTMLElement>(null)
  const missionRef = useRef<HTMLElement>(null)
  const valuesRef = useRef<HTMLElement>(null)
  const vayuRef = useRef<HTMLElement>(null)
  const ctaRef = useRef<HTMLElement>(null)
  const [heroVisible, setHeroVisible] = useState(false)
  const [missionVisible, setMissionVisible] = useState(false)
  const [valuesVisible, setValuesVisible] = useState(false)
  const [vayuVisible, setVayuVisible] = useState(false)
  const [ctaVisible, setCtaVisible] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setTaglineIndex((i) => (i + 1) % taglines.length), 3000)
    return () => clearInterval(t)
  }, [mounted])

  useEffect(() => {
    if (!mounted) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const id = entry.target.getAttribute('data-section')
          if (id === 'hero') setHeroVisible(true)
          if (id === 'mission') setMissionVisible(true)
          if (id === 'values') setValuesVisible(true)
          if (id === 'vayu') setVayuVisible(true)
          if (id === 'cta') setCtaVisible(true)
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    ;[heroRef, missionRef, valuesRef, vayuRef, ctaRef].forEach((ref) => {
      if (ref.current) observer.observe(ref.current)
    })
    return () => observer.disconnect()
  }, [mounted])

  return (
    <div className="min-h-screen">
      <Navbar showBackButton />

      <section ref={heroRef} data-section="hero" className="relative flex items-center justify-center overflow-hidden pt-24 pb-12 md:pb-16">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-[28rem] h-[28rem] bg-vedya-pink/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-vedya-purple/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-vedya-yellow/10 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(255,255,255,0.6)_100%)]" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className={`text-sm md:text-base font-medium text-vedya-purple mb-4 uppercase tracking-widest transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>Who we are</p>
          <h1 className={`text-4xl md:text-6xl lg:text-7xl font-bold mb-6 transition-all duration-700 delay-100 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="gradient-text">About Us</span>
          </h1>
          <p className={`text-lg md:text-xl text-gray-600 max-w-2xl mx-auto min-h-[2.5rem] transition-all duration-500 delay-300 ${heroVisible ? 'opacity-100' : 'opacity-0'}`}>
            <span key={taglineIndex} className="inline-block animate-fade-in">{taglines[taglineIndex]}</span>
          </p>
          <div className={`mt-10 flex flex-wrap justify-center gap-6 transition-all duration-700 delay-300 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {['AI-Powered', 'Personalized', 'Always Learning'].map((label) => (
              <span key={label} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200/80 shadow-sm text-gray-700 text-sm font-medium hover:border-vedya-purple/30 hover:shadow-md hover:scale-105 transition-all duration-300">
                <i className="bi bi-check2-circle text-vedya-purple" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section ref={missionRef} data-section="mission" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <AnimateCard visible={missionVisible} delay={0} className="group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm border border-gray-200/80 shadow-xl p-8 md:p-10 hover:shadow-2xl hover:border-vedya-purple/30 hover:-translate-y-1 transition-all duration-500">
              <div className="absolute top-0 right-0 w-40 h-40 bg-vedya-purple/5 rounded-full blur-2xl group-hover:bg-vedya-purple/10 transition-colors duration-500" />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-vedya-purple to-vedya-pink flex items-center justify-center mb-6 text-white shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <i className="bi bi-bullseye text-2xl" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
                <p className="text-gray-600 leading-relaxed text-lg">
                  To empower learners of all ages with personalized, AI-driven education that adapts to their pace, style, and goals. We believe learning should be engaging, measurable, and aligned with real-world outcomes.
                </p>
              </div>
            </AnimateCard>
            <AnimateCard visible={missionVisible} delay={150} className="group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm border border-gray-200/80 shadow-xl p-8 md:p-10 hover:shadow-2xl hover:border-vedya-pink/30 hover:-translate-y-1 transition-all duration-500">
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-vedya-pink/5 rounded-full blur-2xl group-hover:bg-vedya-pink/10 transition-colors duration-500" />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-vedya-pink to-vedya-orange flex items-center justify-center mb-6 text-white shadow-lg group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                  <i className="bi bi-eye text-2xl" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Our Vision</h2>
                <p className="text-gray-600 leading-relaxed text-lg">
                  A future where every person has access to intelligent learning tools that understand their needs, nurture curiosity, and unlock potential—anytime, anywhere.
                </p>
              </div>
            </AnimateCard>
          </div>
        </div>
      </section>

      <section ref={valuesRef} data-section="values" className="py-20 md:py-28 bg-gradient-to-b from-gray-50/90 to-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-0 w-96 h-96 bg-vedya-yellow/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-vedya-purple/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-4 transition-all duration-700 ${valuesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="gradient-text">Why VEDYA</span>
          </h2>
          <p className={`text-gray-600 text-center max-w-2xl mx-auto mb-16 text-lg transition-all duration-700 delay-100 ${valuesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            We combine cutting-edge AI with pedagogy that puts the learner first.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: 'bi-cpu-fill', title: 'AI-Powered', description: 'Adaptive algorithms and agentic workflows personalize content, assessments, and pace for every learner.', iconBgClass: 'bg-vedya-purple' as const },
              { icon: 'bi-graph-up-arrow', title: 'Progress That Matters', description: 'Real-time analytics, clear milestones, and actionable insights so you always know where you stand.', iconBgClass: 'bg-vedya-pink' as const },
              { icon: 'bi-people-fill', title: 'Built for Humans', description: 'Designed with educators and learners in mind—simple to use, powerful under the hood.', iconBgClass: 'bg-vedya-orange' as const },
            ].map((item, i) => (
              <AnimateCard key={item.title} visible={valuesVisible} delay={200 + i * 100}>
                <ValueCard {...item} />
              </AnimateCard>
            ))}
          </div>
        </div>
      </section>

      <section ref={vayuRef} data-section="vayu" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`relative rounded-3xl bg-gray-900 text-white p-10 md:p-14 lg:p-16 overflow-hidden transition-all duration-1000 ${vayuVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-96 h-96 bg-vedya-purple/25 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-vedya-pink/25 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-10">
              <div className="flex-1">
                <h2 className="text-2xl md:text-4xl font-bold mb-3">
                  <span className="text-vedya-yellow">Powered by </span>
                  <span className="text-white">VAYU Innovations</span>
                </h2>
                <p className="text-gray-300 leading-relaxed max-w-xl text-lg">
                  VEDYA is designed and built by VAYU Innovations—a team focused on applying AI to education and impact. We combine research-backed learning science with modern technology to create products that scale learning without sacrificing quality.
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-24 h-24 rounded-2xl bg-white/10 backdrop-blur border border-white/20 shadow-xl hover:scale-110 hover:bg-white/15 transition-all duration-300">
                  <i className="bi bi-lightning-charge-fill text-5xl text-vedya-yellow animate-pulse" style={{ animationDuration: '2s' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={ctaRef} data-section="cta" className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className={`transition-all duration-700 ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">Ready to start your learning journey?</h2>
            <p className="text-gray-600 mb-10 text-lg">Join thousands of learners who use VEDYA to achieve their goals with AI-powered, personalized education.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/" className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-vedya-purple to-vedya-pink shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                <span>Go to Home</span>
                <i className="bi bi-arrow-right group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              <Link href="/#features" className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-vedya-purple border-2 border-vedya-purple hover:bg-vedya-purple hover:text-white transition-all duration-300">
                <span>Explore Features</span>
                <i className="bi bi-grid-3x3-gap group-hover:rotate-12 transition-transform duration-300" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function AnimateCard({ children, visible, delay = 0, className = '' }: { children: React.ReactNode; visible: boolean; delay?: number; className?: string }) {
  return (
    <div className={`transition-all duration-700 ease-out ${className}`} style={{ transitionDelay: `${delay}ms`, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)' }}>
      {children}
    </div>
  )
}

function ValueCard({ icon, title, description, iconBgClass }: { icon: string; title: string; description: string; iconBgClass: 'bg-vedya-purple' | 'bg-vedya-pink' | 'bg-vedya-orange' }) {
  return (
    <div className="group h-full bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100 hover:shadow-2xl hover:border-vedya-purple/20 hover:-translate-y-2 transition-all duration-300">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 text-white ${iconBgClass} group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shadow-md`}>
        <i className={`bi ${icon} text-xl`} />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-vedya-purple transition-colors duration-300">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}
