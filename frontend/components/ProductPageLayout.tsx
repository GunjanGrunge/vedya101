'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from './Navbar'
import Footer from './Footer'
import 'bootstrap-icons/font/bootstrap-icons.css'

interface ProductPageLayoutProps {
  badge: string
  title: string
  subtitle: string
  heroImage?: string
  sections: {
    id: string
    title: string
    description: string
    image?: string
    imageRight?: boolean
    bullets?: string[]
    gradient?: string
  }[]
  ctaTitle?: string
  ctaSubtitle?: string
}

export default function ProductPageLayout({
  badge,
  title,
  subtitle,
  heroImage,
  sections,
  ctaTitle = 'Ready to get started?',
  ctaSubtitle = 'Join VEDYA and experience personalized learning powered by AI.',
}: ProductPageLayoutProps) {
  const [mounted, setMounted] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const [heroVisible, setHeroVisible] = useState(false)
  const [visibleSections, setVisibleSections] = useState<Record<number, boolean>>({})

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const i = entry.target.getAttribute('data-section-index')
          if (i !== null) setVisibleSections((v) => ({ ...v, [Number(i)]: true }))
          if (entry.target.getAttribute('data-section') === 'hero') setHeroVisible(true)
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
    if (heroRef.current) observer.observe(heroRef.current)
    sectionRefs.current.forEach((el, i) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [mounted, sections.length])

  return (
    <div className="min-h-screen">
      <Navbar showBackButton />

      <section ref={heroRef} data-section="hero" className="relative overflow-hidden pt-28 pb-16 md:pb-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-1/4 w-[32rem] h-[32rem] bg-vedya-purple/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-vedya-pink/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,transparent_40%,rgba(255,255,255,0.8)_100%)]" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <p className={`text-sm font-medium text-vedya-purple mb-3 uppercase tracking-widest transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>{badge}</p>
              <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-4 transition-all duration-700 delay-75 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                <span className="gradient-text">{title}</span>
              </h1>
              <p className={`text-lg text-gray-600 max-w-xl mx-auto lg:mx-0 transition-all duration-700 delay-150 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {subtitle}
              </p>
            </div>
            {heroImage && (
              <div className={`relative h-64 md:h-80 lg:h-96 rounded-2xl overflow-hidden shadow-2xl transition-all duration-700 delay-200 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                <Image src={heroImage} alt="" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            )}
          </div>
        </div>
      </section>

      {sections.map((sec, i) => (
        <section
          key={sec.id}
          ref={(el) => { sectionRefs.current[i] = el }}
          data-section="content"
          data-section-index={i}
          className={`py-16 md:py-24 ${i % 2 === 1 ? 'bg-gray-50/80' : ''}`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              {sec.image && (
                <div className={`relative h-72 md:h-80 rounded-2xl overflow-hidden shadow-xl transition-all duration-700 hover:shadow-2xl group ${visibleSections[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${sec.imageRight ? 'lg:order-2' : 'lg:order-1'}`}>
                  <Image src={sec.image} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 1024px) 100vw, 50vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                </div>
              )}
              <div className={sec.imageRight ? 'lg:order-1' : 'lg:order-2'}>
                <h2 className={`text-2xl md:text-3xl font-bold text-gray-900 mb-4 transition-all duration-700 ${visibleSections[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  {sec.gradient ? <span className="gradient-text">{sec.title}</span> : sec.title}
                </h2>
                <p className={`text-gray-600 leading-relaxed mb-6 transition-all duration-700 delay-75 ${visibleSections[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  {sec.description}
                </p>
                {sec.bullets && (
                  <ul className={`space-y-2 transition-all duration-700 delay-100 ${visibleSections[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    {sec.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-gray-700">
                        <i className="bi bi-check2-circle text-vedya-purple shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="py-20 md:py-28 border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{ctaTitle}</h2>
          <p className="text-gray-600 mb-8">{ctaSubtitle}</p>
          <Link href="/" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-vedya-purple to-vedya-pink shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
            Get started
            <i className="bi bi-arrow-right" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
