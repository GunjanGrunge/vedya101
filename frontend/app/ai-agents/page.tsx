'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { PRODUCT_IMAGES } from '../../lib/product-images'
import 'bootstrap-icons/font/bootstrap-icons.css'

const AGENTS: { name: string; desc: string; icon: string; iconBg: 'bg-vedya-purple' | 'bg-vedya-pink' | 'bg-vedya-orange' }[] = [
  { name: 'Planner', desc: 'Designs learning paths from your goals and constraints.', icon: 'bi-signpost-split-fill', iconBg: 'bg-vedya-purple' },
  { name: 'Curator', desc: 'Selects and sequences the right content for each step.', icon: 'bi-collection-fill', iconBg: 'bg-vedya-pink' },
  { name: 'Assessor', desc: 'Evaluates understanding and gives feedback that teaches.', icon: 'bi-clipboard-check-fill', iconBg: 'bg-vedya-orange' },
]

export default function AiAgentsPage() {
  const [mounted, setMounted] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const agentsRef = useRef<HTMLElement>(null)
  const [heroVisible, setHeroVisible] = useState(false)
  const [agentsVisible, setAgentsVisible] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!mounted) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          if (entry.target.getAttribute('data-section') === 'hero') setHeroVisible(true)
          if (entry.target.getAttribute('data-section') === 'agents') setAgentsVisible(true)
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
    if (heroRef.current) observer.observe(heroRef.current)
    if (agentsRef.current) observer.observe(agentsRef.current)
    return () => observer.disconnect()
  }, [mounted])

  return (
    <div className="min-h-screen">
      <Navbar showBackButton />

      <section ref={heroRef} data-section="hero" className="relative min-h-[60vh] flex items-center overflow-hidden pt-24 pb-16">
        <div className="absolute inset-0">
          <Image src={PRODUCT_IMAGES.techAbstract} alt="" fill className="object-cover" sizes="100vw" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/95 via-gray-900/85 to-gray-900/70" />
          <div className="absolute top-1/4 right-0 w-96 h-96 bg-vedya-purple/30 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-vedya-pink/20 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className={`text-sm font-medium text-vedya-yellow mb-3 uppercase tracking-widest transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>Platform</p>
          <h1 className={`text-4xl md:text-6xl font-bold mb-4 text-white transition-all duration-700 delay-75 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            AI Agents
          </h1>
          <p className={`text-lg text-gray-300 max-w-2xl transition-all duration-700 delay-150 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Coordinated AI agents power planning, content curation, and assessment—so every learner gets a tailored, coherent experience.
          </p>
        </div>
      </section>

      <section ref={agentsRef} data-section="agents" className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className={`text-2xl md:text-3xl font-bold text-gray-900 mb-2 text-center transition-all duration-700 ${agentsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <span className="gradient-text">How it works</span>
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-xl mx-auto">Three specialized agents work together in a single workflow.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {AGENTS.map((a, i) => (
              <div
                key={a.name}
                className={`group rounded-2xl border-2 border-gray-200 p-6 text-center hover:border-vedya-purple/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${agentsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: agentsVisible ? `${150 + i * 100}ms` : '0ms' }}
              >
                <div className={`w-16 h-16 rounded-2xl ${a.iconBg} mx-auto mb-4 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}>
                  <i className={`bi ${a.icon} text-2xl`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-vedya-purple transition-colors duration-200">{a.name}</h3>
                <p className="text-gray-600 text-sm">{a.desc}</p>
              </div>
            ))}
          </div>

          <div className={`group/card rounded-2xl overflow-hidden shadow-xl border border-gray-200 transition-all duration-700 hover:shadow-2xl hover:border-vedya-purple/20 ${agentsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="relative h-64 lg:h-80 overflow-hidden">
                <Image src={PRODUCT_IMAGES.laptopCode} alt="" fill className="object-cover group-hover/card:scale-105 transition-transform duration-500" sizes="(max-width: 1024px) 100vw, 50vw" />
              </div>
              <div className="p-8 lg:p-10 flex flex-col justify-center bg-gray-50">
                <h3 className="text-xl font-bold text-gray-900 mb-3">LangGraph-powered</h3>
                <p className="text-gray-600 mb-4">Our agents run on LangGraph for reliable orchestration, state, and branching—so tutoring stays consistent and pedagogically sound.</p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center gap-2"><i className="bi bi-check2 text-vedya-purple" /> Goal-driven path generation</li>
                  <li className="flex items-center gap-2"><i className="bi bi-check2 text-vedya-purple" /> Semantic content retrieval</li>
                  <li className="flex items-center gap-2"><i className="bi bi-check2 text-vedya-purple" /> Adaptive assessment and feedback</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Experience AI-powered learning</h2>
          <p className="text-gray-600 mb-6">Start a conversation and see how our agents adapt to your goals.</p>
          <Link href="/" className="btn-cta-product group inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-vedya-purple to-vedya-pink hover:shadow-lg">Get started <i className="bi bi-arrow-right group-hover:translate-x-1 transition-transform duration-200" /></Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
