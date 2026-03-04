'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import 'bootstrap-icons/font/bootstrap-icons.css'

const PRESS_RELEASES = [
  { id: '1', title: 'VEDYA Launches AI-Powered Learning Platform to Personalize Education', date: 'Jan 24, 2025', excerpt: 'VEDYA, built by VAYU Innovations, announces the launch of its adaptive learning platform designed to deliver personalized education at scale using multi-agent AI.', link: '#', featured: true },
  { id: '2', title: 'VEDYA Partners with Leading Schools to Pilot Adaptive Learning', date: 'Jan 10, 2025', excerpt: 'VEDYA is partnering with K–12 and higher education institutions to pilot its AI-driven curricula and assessments, with early results showing stronger engagement and progress.', link: '#' },
  { id: '3', title: 'VAYU Innovations Unveils LangGraph-Based Educational Agents', date: 'Dec 15, 2024', excerpt: 'VAYU Innovations details its use of LangGraph to orchestrate tutoring, assessment, and content agents in VEDYA, enabling more coherent and personalized learning experiences.', link: '#' },
]

const MEDIA_ASSETS = [
  { name: 'Logo', description: 'VEDYA logo for light and dark backgrounds', icon: 'bi-image', action: 'Download', image: '/assets/images/Logo.png', type: 'local' as const },
  { name: 'Brand guidelines', description: 'Colors, typography, and usage', icon: 'bi-palette', action: 'View PDF', image: 'https://picsum.photos/seed/vedyabrand/600/320', type: 'remote' as const },
  { name: 'Screenshots', description: 'Product screenshots and key visuals', icon: 'bi-window', action: 'Download ZIP', image: 'https://picsum.photos/seed/vedyaui/600/320', type: 'remote' as const },
  { name: 'Boilerplate', description: 'Company description and key facts', icon: 'bi-file-text', action: 'Copy', image: 'https://picsum.photos/seed/vedyadoc/600/320', type: 'remote' as const },
]

const STATS = [
  { value: '10+', label: 'Press mentions' },
  { value: '50K+', label: 'Learners reached' },
  { value: '24h', label: 'Response time' },
]

export default function PressPage() {
  const [mounted, setMounted] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const statsRef = useRef<HTMLElement>(null)
  const releasesRef = useRef<HTMLElement>(null)
  const mediaRef = useRef<HTMLElement>(null)
  const quoteRef = useRef<HTMLElement>(null)
  const contactRef = useRef<HTMLElement>(null)
  const ctaRef = useRef<HTMLElement>(null)
  const [heroVisible, setHeroVisible] = useState(false)
  const [statsVisible, setStatsVisible] = useState(false)
  const [releasesVisible, setReleasesVisible] = useState(false)
  const [mediaVisible, setMediaVisible] = useState(false)
  const [quoteVisible, setQuoteVisible] = useState(false)
  const [contactVisible, setContactVisible] = useState(false)
  const [ctaVisible, setCtaVisible] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const id = entry.target.getAttribute('data-section')
          if (id === 'hero') setHeroVisible(true)
          if (id === 'stats') setStatsVisible(true)
          if (id === 'releases') setReleasesVisible(true)
          if (id === 'media') setMediaVisible(true)
          if (id === 'quote') setQuoteVisible(true)
          if (id === 'contact') setContactVisible(true)
          if (id === 'cta') setCtaVisible(true)
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    )
    ;[heroRef, statsRef, releasesRef, mediaRef, quoteRef, contactRef, ctaRef].forEach((ref) => {
      if (ref.current) observer.observe(ref.current)
    })
    return () => observer.disconnect()
  }, [mounted])

  return (
    <div className="min-h-screen">
      <Navbar showBackButton />

      {/* Hero */}
      <section ref={heroRef} data-section="hero" className="relative min-h-[65vh] flex flex-col items-center justify-center overflow-hidden pt-24 pb-16 md:pb-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-1/4 w-[32rem] h-[32rem] bg-vedya-purple/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-vedya-pink/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] bg-vedya-yellow/10 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,transparent_40%,rgba(255,255,255,0.7)_100%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className={`text-sm md:text-base font-medium text-vedya-purple mb-3 uppercase tracking-[0.25em] transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            News & Media
          </p>
          <h1 className={`text-4xl md:text-6xl lg:text-7xl font-bold mb-5 transition-all duration-700 delay-75 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="gradient-text">Press</span>
          </h1>
          <p className={`text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 transition-all duration-700 delay-150 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Press releases, media assets, and contact for journalists and partners.
          </p>
          <div className={`flex flex-wrap justify-center gap-3 transition-all duration-700 delay-200 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <a href="#releases" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow-sm text-gray-700 text-sm font-medium hover:border-vedya-purple/40 hover:shadow-md hover:scale-105 transition-all duration-300">
              <i className="bi bi-newspaper text-vedya-purple" />
              Press releases
            </a>
            <a href="#media-kit" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow-sm text-gray-700 text-sm font-medium hover:border-vedya-purple/40 hover:shadow-md hover:scale-105 transition-all duration-300">
              <i className="bi bi-download text-vedya-purple" />
              Media kit
            </a>
            <a href="#contact" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow-sm text-gray-700 text-sm font-medium hover:border-vedya-purple/40 hover:shadow-md hover:scale-105 transition-all duration-300">
              <i className="bi bi-envelope text-vedya-purple" />
              Contact
            </a>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section ref={statsRef} data-section="stats" className="relative py-8 md:py-10 -mt-4 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-gray-200/80 shadow-xl shadow-gray-200/50 p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {STATS.map((stat, i) => (
                <div
                  key={stat.label}
                  className={`text-center transition-all duration-700 ${statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  style={{ transitionDelay: `${80 + i * 100}ms` }}
                >
                  <p className="text-2xl md:text-3xl font-bold gradient-text">{stat.value}</p>
                  <p className="text-gray-600 text-sm font-medium mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Press releases */}
      <section id="releases" ref={releasesRef} data-section="releases" className="py-16 md:py-24 scroll-mt-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className={`text-2xl md:text-4xl font-bold text-gray-900 mb-3 transition-all duration-700 ${releasesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Press releases
          </h2>
          <p className={`text-gray-600 mb-12 transition-all duration-700 delay-75 ${releasesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Latest news and announcements from VEDYA and VAYU Innovations.
          </p>

          {/* Featured release */}
          {PRESS_RELEASES.filter((r) => r.featured).map((release) => (
            <div key={release.id} className={`mb-10 transition-all duration-700 ${releasesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <a href={release.link} className="group block">
                <article className="relative overflow-hidden rounded-3xl bg-gray-900 text-white shadow-2xl hover:shadow-vedya-purple/20 transition-all duration-500 hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-vedya-purple via-vedya-dark-purple to-vedya-pink opacity-95" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  <div className="relative p-8 md:p-10 lg:p-12">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-medium mb-4">
                      <i className="bi bi-star-fill text-vedya-yellow" />
                      Latest
                    </span>
                    <p className="text-vedya-yellow/90 text-sm font-medium mb-2">{release.date}</p>
                    <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 group-hover:text-vedya-yellow transition-colors duration-300">
                      {release.title}
                    </h3>
                    <p className="text-gray-200 text-lg max-w-2xl mb-6 line-clamp-2">{release.excerpt}</p>
                    <span className="inline-flex items-center gap-2 text-vedya-yellow font-semibold group-hover:gap-3 transition-all duration-300">
                      Read full release
                      <i className="bi bi-arrow-right" />
                    </span>
                  </div>
                </article>
              </a>
            </div>
          ))}

          <div className="space-y-5">
            {PRESS_RELEASES.filter((r) => !r.featured).map((release, i) => (
              <div
                key={release.id}
                className={`transition-all duration-700 ease-out ${releasesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: `${200 + i * 100}ms` }}
              >
                <a href={release.link} className="group block">
                  <article className="relative overflow-hidden rounded-2xl bg-white border border-gray-200/80 p-6 md:p-8 shadow-lg hover:shadow-2xl hover:border-vedya-purple/30 hover:-translate-y-1 transition-all duration-300 border-l-4 border-l-vedya-purple">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-vedya-purple/5 rounded-full blur-2xl group-hover:bg-vedya-purple/10 transition-colors duration-300" />
                    <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-vedya-purple font-semibold mb-2">{release.date}</p>
                        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 group-hover:text-vedya-purple transition-colors">
                          {release.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed">{release.excerpt}</p>
                      </div>
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 group-hover:bg-vedya-purple group-hover:text-white text-gray-600 shrink-0 transition-all duration-300">
                        <i className="bi bi-arrow-up-right text-lg" />
                      </span>
                    </div>
                  </article>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote strip */}
      <section ref={quoteRef} data-section="quote" className="py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`relative rounded-3xl bg-gradient-to-br from-vedya-purple/10 via-vedya-pink/5 to-vedya-yellow/10 border border-vedya-purple/20 p-8 md:p-12 transition-all duration-700 ${quoteVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="absolute top-6 left-8 text-6xl text-vedya-purple/20 font-serif leading-none">"</div>
            <blockquote className="relative text-xl md:text-2xl font-medium text-gray-800 leading-relaxed text-center md:px-12">
              VEDYA represents a significant step toward making personalized, AI-driven education accessible at scale. Their approach to adaptive learning is both rigorous and practical.
            </blockquote>
            <p className="text-center text-gray-500 mt-6 font-medium">— Education technology review, 2025</p>
          </div>
        </div>
      </section>

      {/* Media kit */}
      <section id="media-kit" ref={mediaRef} data-section="media" className="py-16 md:py-24 bg-gradient-to-b from-gray-50 to-white scroll-mt-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className={`text-2xl md:text-4xl font-bold mb-2 transition-all duration-700 ${mediaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <span className="gradient-text">Media kit</span>
          </h2>
          <p className={`text-gray-600 mb-12 transition-all duration-700 delay-75 ${mediaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Logos, guidelines, and assets for press and partners. Click to download or view.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {MEDIA_ASSETS.map((asset, i) => (
              <div
                key={asset.name}
                className={`group relative rounded-2xl bg-white border border-gray-200/80 overflow-hidden shadow-lg hover:shadow-2xl hover:border-vedya-purple/30 hover:-translate-y-2 transition-all duration-300 ${mediaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: `${120 + i * 80}ms` }}
              >
                <div className="relative h-36 w-full bg-gray-50 overflow-hidden">
                  {asset.type === 'local' && asset.image ? (
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <Image
                        src={asset.image}
                        alt={asset.name}
                        width={120}
                        height={120}
                        className="object-contain group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  ) : asset.type === 'remote' && asset.image ? (
                    <Image
                      src={asset.image}
                      alt={asset.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : null}
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-vedya-purple transition-colors">{asset.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{asset.description}</p>
                  <button className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold group-hover:bg-vedya-purple group-hover:text-white transition-all duration-300 flex items-center justify-center gap-2">
                    {asset.action}
                    <i className="bi bi-download text-xs opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Press contact */}
      <section id="contact" ref={contactRef} data-section="contact" className="py-16 md:py-24 scroll-mt-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`relative rounded-3xl bg-gray-900 text-white p-8 md:p-14 overflow-hidden transition-all duration-700 ${contactVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)' }}>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-80 h-80 bg-vedya-purple/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-vedya-pink/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            </div>
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">Press contact</h2>
                <p className="text-gray-300 text-lg max-w-lg">
                  For media inquiries, interview requests, or partnership discussions. We typically respond within 24 hours.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                <a
                  href="mailto:press@vedya.com"
                  className="group inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white text-gray-900 font-semibold hover:bg-vedya-yellow hover:text-gray-900 transition-all duration-300 hover:scale-105"
                >
                  <i className="bi bi-envelope-fill" />
                  press@vedya.com
                </a>
                <a
                  href="#"
                  className="group inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl border-2 border-white/40 text-white font-semibold hover:bg-white/10 hover:border-white/60 transition-all duration-300"
                >
                  <i className="bi bi-calendar3" />
                  Request interview
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef} data-section="cta" className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className={`transition-all duration-700 ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Learn more about VEDYA</h2>
            <p className="text-gray-600 mb-10">Explore our product, read the blog, or meet the team.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/" className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-vedya-purple to-vedya-pink shadow-lg hover:shadow-xl hover:shadow-vedya-purple/25 hover:scale-105 transition-all duration-300">
                Home
                <i className="bi bi-arrow-right group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/about-us" className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-vedya-purple border-2 border-vedya-purple hover:bg-vedya-purple hover:text-white transition-all duration-300">
                About Us
              </Link>
              <Link href="/blog" className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-gray-700 border-2 border-gray-300 hover:border-vedya-purple hover:text-vedya-purple transition-all duration-300">
                Blog
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
