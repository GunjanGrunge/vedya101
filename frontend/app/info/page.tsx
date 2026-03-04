'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import 'bootstrap-icons/font/bootstrap-icons.css'

function AnimatedSection({
  children,
  visible,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  visible: boolean
  delay?: number
  className?: string
}) {
  return (
    <section
      className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </section>
  )
}

export default function InfoPage() {
  const [heroVisible, setHeroVisible] = useState(false)
  const [flowVisible, setFlowVisible] = useState(false)
  const [colorsVisible, setColorsVisible] = useState(false)
  const [fontsVisible, setFontsVisible] = useState(false)
  const [buttonsVisible, setButtonsVisible] = useState(false)
  const [cardsVisible, setCardsVisible] = useState(false)
  const [typoVisible, setTypoVisible] = useState(false)
  const [animVisible, setAnimVisible] = useState(false)
  const [techVisible, setTechVisible] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const flowRef = useRef<HTMLElement>(null)
  const colorsRef = useRef<HTMLElement>(null)
  const fontsRef = useRef<HTMLElement>(null)
  const buttonsRef = useRef<HTMLElement>(null)
  const cardsRef = useRef<HTMLElement>(null)
  const typoRef = useRef<HTMLElement>(null)
  const animRef = useRef<HTMLElement>(null)
  const techRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setHeroVisible(true)
  }, [])

  useEffect(() => {
    const map: Record<string, () => void> = {
      flow: () => setFlowVisible(true),
      colors: () => setColorsVisible(true),
      fonts: () => setFontsVisible(true),
      buttons: () => setButtonsVisible(true),
      cards: () => setCardsVisible(true),
      typo: () => setTypoVisible(true),
      anim: () => setAnimVisible(true),
      tech: () => setTechVisible(true),
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const id = entry.target.getAttribute('data-section')
          if (id && map[id]) map[id]()
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
    const refs = [flowRef, colorsRef, fontsRef, buttonsRef, cardsRef, typoRef, animRef, techRef]
    refs.forEach((ref) => { if (ref.current) io.observe(ref.current) })
    return () => io.disconnect()
  }, [])

  const flowSteps = [
    { icon: 'bi-box-arrow-in-right', title: 'You open VEDYA', desc: 'Land on the home page (Hero, Features, FAQ, etc.)', tech: 'app/page.tsx' },
    { icon: 'bi-person-check', title: 'Are you signed in?', desc: 'The app checks your login state.', tech: 'Clerk useUser()' },
    { icon: 'bi-key', title: 'Not signed in?', desc: 'You see a welcome card and “Sign in to start learning”.', tech: 'SignInButton, public routes' },
    { icon: 'bi-house-heart', title: 'Signed in?', desc: 'Full landing with Navbar, Hero, Integrations, Insights, Pricing, FAQ, Testimonials, Features, Footer.', tech: 'Conditional render in page.tsx' },
    { icon: 'bi-chat-dots', title: 'Start learning', desc: 'Click “Start Your Learning Journey” or the chat bubble to open the AI chat.', tech: 'ChatInterface, API' },
    { icon: 'bi-grid-3x3', title: 'Other pages', desc: 'Dashboard, Teaching, Blog, About, Press, product pages—all linked from Navbar and Footer.', tech: 'App Router: /dashboard, /teaching, /blog, etc.' },
  ]

  const routeTree = [
    { path: '/', label: 'Home (landing + auth check)' },
    { path: '/dashboard', label: 'Learner dashboard' },
    { path: '/teaching', label: 'Teaching mode' },
    { path: '/about-us', label: 'About Us' },
    { path: '/blog', label: 'Blog list & posts' },
    { path: '/press', label: 'Press & media' },
    { path: '/features', label: 'Product: Features' },
    { path: '/ai-agents', label: 'Product: AI Agents' },
    { path: '/learning-paths', label: 'Product: Learning Paths' },
    { path: '/assessments', label: 'Product: Assessments' },
    { path: '/progress-tracking', label: 'Product: Progress Tracking' },
    { path: '/info', label: 'Info (this page)' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar showBackButton />

      <main className="flex-1 bg-gradient-to-br from-vedya-purple/5 via-white to-vedya-pink/5">
        {/* Hero */}
        <section
          ref={heroRef}
          className={`relative pt-24 pb-12 md:pb-16 transition-all duration-700 ease-out ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <div className="absolute inset-0 w-full h-full bg-dot-pattern opacity-50 pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm font-medium text-vedya-purple uppercase tracking-widest mb-3">
              Design system
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              <span className="gradient-text">VEDYA</span> info
            </h1>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Colors, components, and how the app works—for learners and developers.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl text-sm font-medium text-vedya-purple hover:bg-vedya-purple/10 transition-all duration-300 group"
            >
              <i className="bi bi-arrow-left group-hover:-translate-x-1 transition-transform" /> Back to home
            </Link>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-16">
          {/* VEDYA colors */}
          <AnimatedSection visible={colorsVisible} delay={80}>
            <section ref={colorsRef} data-section="colors">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <i className="bi bi-palette text-vedya-purple" />
                VEDYA colors
              </h2>
              <div className="rounded-2xl bg-white/80 backdrop-blur-sm ring-1 ring-black/5 shadow-[0_14px_30px_rgba(0,0,0,0.08)] p-6 md:p-8 hover:shadow-lg transition-shadow duration-300">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                  {[
                    { name: 'Purple', bg: 'bg-vedya-purple', text: 'text-vedya-purple' },
                    { name: 'Pink', bg: 'bg-vedya-pink', text: 'text-vedya-pink' },
                    { name: 'Orange', bg: 'bg-vedya-orange', text: 'text-vedya-orange' },
                    { name: 'Yellow', bg: 'bg-vedya-yellow', text: 'text-vedya-yellow' },
                    { name: 'Dark purple', bg: 'bg-vedya-darkPurple', text: 'text-vedya-darkPurple' },
                  ].map((c) => (
                    <div key={c.name} className="text-center group">
                      <div className={`${c.bg} h-20 rounded-xl mb-2 shadow-inner group-hover:scale-105 transition-transform duration-300`} />
                      <p className={`text-sm font-medium ${c.text}`}>{c.name}</p>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border border-gray-200 rounded-xl overflow-hidden">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200">
                        <th className="px-4 py-3 font-semibold text-slate-900">Name</th>
                        <th className="px-4 py-3 font-semibold text-slate-900">Hex</th>
                        <th className="px-4 py-3 font-semibold text-slate-900">RGB</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        { name: 'VEDYA Pink', hex: '#F27ECA', rgb: 'rgb(242, 126, 202)' },
                        { name: 'VEDYA Purple', hex: '#8857F2', rgb: 'rgb(136, 87, 242)' },
                        { name: 'VEDYA Dark Purple', hex: '#6C45BF', rgb: 'rgb(108, 69, 191)' },
                        { name: 'VEDYA Yellow', hex: '#F2E30F', rgb: 'rgb(242, 227, 15)' },
                        { name: 'VEDYA Orange', hex: '#F2B90F', rgb: 'rgb(242, 185, 15)' },
                      ].map((row) => (
                        <tr key={row.name} className="hover:bg-vedya-purple/5 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                          <td className="px-4 py-3 font-mono text-vedya-purple">{row.hex}</td>
                          <td className="px-4 py-3 font-mono text-slate-600">{row.rgb}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </AnimatedSection>

          {/* Fonts */}
          <AnimatedSection visible={fontsVisible} delay={80}>
            <section ref={fontsRef} data-section="fonts">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <i className="bi bi-fonts text-vedya-purple" />
                Fonts
              </h2>
              <div className="rounded-2xl bg-white/80 backdrop-blur-sm ring-1 ring-black/5 shadow-[0_14px_30px_rgba(0,0,0,0.08)] p-6 md:p-8 hover:shadow-lg transition-shadow duration-300">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border border-gray-200 rounded-xl overflow-hidden">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200">
                        <th className="px-4 py-3 font-semibold text-slate-900">Font name</th>
                        <th className="px-4 py-3 font-semibold text-slate-900">Source</th>
                        <th className="px-4 py-3 font-semibold text-slate-900">Usage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        { name: 'Inter', source: 'Google Fonts (next/font)', usage: 'Body text, UI' },
                        { name: 'Poppins', source: 'Google Fonts, weights 600–900', usage: 'Headings (--font-poppins)' },
                        { name: 'Airwave', source: 'Custom (woff2, woff, ttf)', usage: 'VEDYA brand / logo' },
                      ].map((row) => (
                        <tr key={row.name} className="hover:bg-vedya-purple/5 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                          <td className="px-4 py-3 text-slate-600">{row.source}</td>
                          <td className="px-4 py-3 text-slate-600">{row.usage}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </AnimatedSection>

          {/* Buttons */}
          <AnimatedSection visible={buttonsVisible} delay={80}>
            <section ref={buttonsRef} data-section="buttons">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <i className="bi bi-cursor text-vedya-purple" />
                Buttons
              </h2>
              <div className="rounded-2xl bg-white/80 backdrop-blur-sm ring-1 ring-black/5 shadow-[0_14px_30px_rgba(0,0,0,0.08)] p-6 md:p-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex flex-wrap gap-4 items-center">
                  <button
                    type="button"
                    className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-vedya-purple to-vedya-pink hover:shadow-lg hover:scale-105 active:scale-100 transition-all duration-300"
                  >
                    Primary CTA
                  </button>
                  <button
                    type="button"
                    className="px-6 py-3 rounded-xl font-medium text-slate-800 bg-slate-200 hover:bg-slate-300 hover:scale-105 transition-all duration-300"
                  >
                    Secondary
                  </button>
                  <button
                    type="button"
                    className="px-6 py-3 rounded-xl font-medium border-2 border-vedya-purple text-vedya-purple hover:bg-vedya-purple/10 hover:scale-105 transition-all duration-300"
                  >
                    Outline
                  </button>
                </div>
              </div>
            </section>
          </AnimatedSection>

          {/* Cards */}
          <AnimatedSection visible={cardsVisible} delay={0}>
            <section ref={cardsRef} data-section="cards">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <i className="bi bi-grid-3x3-gap text-vedya-purple" />
                Cards
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { icon: 'bi-lightning-charge-fill', iconBg: 'bg-gradient-to-br from-vedya-purple to-vedya-pink', title: 'Card with gradient text', desc: 'Feature cards across the app.', titleClass: 'gradient-text' },
                  { icon: 'bi-bookmark-star', iconBg: 'bg-vedya-orange', title: 'Glass-style card', desc: 'Insights and Integrations.', titleClass: '' },
                  { icon: 'bi-heart', iconBg: 'bg-vedya-pink', title: 'Product card style', desc: 'Lift on hover, blog/product.', titleClass: '' },
                ].map((card, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-white ring-1 ring-black/5 shadow-[0_14px_30px_rgba(0,0,0,0.10)] p-6 hover:shadow-xl hover:border-vedya-purple/30 hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                      <i className={`bi ${card.icon} text-xl`} />
                    </div>
                    <h3 className={`text-lg font-semibold text-slate-900 ${card.titleClass}`}>{card.title}</h3>
                    <p className="text-slate-600 text-sm mt-2">{card.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </AnimatedSection>

          {/* Typography */}
          <AnimatedSection visible={typoVisible} delay={80}>
            <section ref={typoRef} data-section="typo">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <i className="bi bi-type text-vedya-purple" />
                Typography
              </h2>
              <div className="rounded-2xl bg-white/80 backdrop-blur-sm ring-1 ring-black/5 shadow-[0_14px_30px_rgba(0,0,0,0.08)] p-6 md:p-8 space-y-4 hover:shadow-lg transition-shadow duration-300">
                <p className="text-3xl font-bold">
                  <span className="gradient-text">Gradient text (VEDYA)</span>
                </p>
                <p className="text-slate-700">Body: default body copy.</p>
                <p className="text-sm text-slate-500">Small: captions.</p>
                <p className="text-xs uppercase tracking-widest text-vedya-purple font-medium">Uppercase label</p>
              </div>
            </section>
          </AnimatedSection>

          {/* Animations */}
          <AnimatedSection visible={animVisible} delay={80}>
            <section ref={animRef} data-section="anim">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <i className="bi bi-stars text-vedya-purple" />
                Animations
              </h2>
              <div className="rounded-2xl bg-white/80 backdrop-blur-sm ring-1 ring-black/5 shadow-[0_14px_30px_rgba(0,0,0,0.08)] p-6 md:p-8 hover:shadow-lg transition-shadow duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="animate-fade-in bg-vedya-purple/90 text-white p-4 rounded-xl text-center font-medium hover:scale-105 transition-transform">
                    Fade in
                  </div>
                  <div className="animate-pulse-slow bg-vedya-pink/90 text-white p-4 rounded-xl text-center font-medium hover:scale-105 transition-transform">
                    Pulse slow
                  </div>
                  <div className="animate-float bg-vedya-orange/90 text-white p-4 rounded-xl text-center font-medium">
                    Float
                  </div>
                </div>
              </div>
            </section>
          </AnimatedSection>

          {/* Technologies */}
          <AnimatedSection visible={techVisible} delay={80}>
            <section ref={techRef} data-section="tech">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <i className="bi bi-code-slash text-vedya-purple" />
                Technologies used
              </h2>
              <div className="rounded-2xl bg-white/80 backdrop-blur-sm ring-1 ring-black/5 shadow-[0_14px_30px_rgba(0,0,0,0.08)] p-6 md:p-8 hover:shadow-lg transition-shadow duration-300">
                <p className="text-slate-600 mb-4">This application is built with:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                  {[
                    'Next.js 15 (App Router)',
                    'React 19',
                    'TypeScript',
                    'Tailwind CSS',
                    'Clerk (auth)',
                    'Lenis (smooth scroll)',
                    'Bootstrap Icons',
                    'react-loader-spinner',
                    'react-typed',
                    'Next/Image',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 hover:text-vedya-purple transition-colors">
                      <i className="bi bi-check2-circle text-vedya-purple" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </AnimatedSection>

          {/* How the application works — just above footer */}
          <AnimatedSection visible={flowVisible} delay={0}>
            <section ref={flowRef} data-section="flow">
              <h2 className="text-2xl font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <i className="bi bi-diagram-3 text-vedya-purple" />
                How the application works
              </h2>
              <p className="text-slate-600 mb-6 max-w-2xl">
                Simple flow for everyone, with technical detail for developers.
              </p>
              <div className="rounded-2xl bg-white/80 backdrop-blur-sm ring-1 ring-black/5 shadow-[0_14px_30px_rgba(0,0,0,0.08)] p-6 md:p-8">
                <div className="relative">
                  {flowSteps.map((step, i) => (
                    <div key={i} className="relative flex gap-4 group">
                      {i > 0 && (
                        <div className="absolute left-5 top-0 w-0.5 h-6 bg-gradient-to-b from-vedya-purple/40 to-transparent -translate-y-full" />
                      )}
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-vedya-purple to-vedya-pink flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                        <i className={`bi ${step.icon}`} />
                      </div>
                      <div className="flex-1 pb-8 md:pb-10">
                        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-vedya-purple/30 transition-all duration-300">
                          <h3 className="font-semibold text-slate-900">{step.title}</h3>
                          <p className="text-sm text-slate-600 mt-1">{step.desc}</p>
                          <p className="text-xs font-mono text-vedya-purple mt-2 opacity-90">{step.tech}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <i className="bi bi-folder2-open text-vedya-purple" />
                    Routes (for developers)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {routeTree.map((r) => (
                      <span
                        key={r.path}
                        className="inline-block px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono hover:bg-vedya-purple/10 hover:text-vedya-purple transition-colors"
                      >
                        {r.path}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </AnimatedSection>
        </div>
      </main>

      <Footer />
    </div>
  )
}
