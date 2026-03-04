'use client'

import { useState, useEffect, useRef } from 'react'
import 'bootstrap-icons/font/bootstrap-icons.css'

interface HeroProps {
  onStartLearning: () => void
}

export default function Hero({ onStartLearning }: HeroProps) {
  const [isVisible, setIsVisible] = useState(false)
  const heroRef = useRef<HTMLElement>(null)

  const heroTexts = [
    'Personalized AI Education',
    'Smart Learning Paths',
    'Interactive Experiences',
    'Your Learning Journey',
  ]

  const [typedText, setTypedText] = useState('')
  const [textIndex, setTextIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  // Scroll visibility observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px',
      }
    )

    if (heroRef.current) {
      observer.observe(heroRef.current)
    }

    return () => {
      if (heroRef.current) {
        observer.unobserve(heroRef.current)
      }
    }
  }, [])

  // Custom typing / deleting effect
  useEffect(() => {
    if (!isVisible) return

    const currentText = heroTexts[textIndex % heroTexts.length]
    const typingSpeed = isDeleting ? 40 : 90
    const pauseTime = 1600

    let timeout: NodeJS.Timeout

    if (!isDeleting && typedText === currentText) {
      timeout = setTimeout(() => setIsDeleting(true), pauseTime)
    } else if (isDeleting && typedText === '') {
      setIsDeleting(false)
      setTextIndex((prev) => (prev + 1) % heroTexts.length)
    } else {
      timeout = setTimeout(() => {
        const nextLength = typedText.length + (isDeleting ? -1 : 1)
        setTypedText(currentText.slice(0, nextLength))
      }, typingSpeed)
    }

    return () => clearTimeout(timeout)
  }, [heroTexts, isDeleting, textIndex, typedText, isVisible])

  return (
    <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Global background is applied on <body>; keep only subtle accents here */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-16 left-10 w-96 h-96 bg-vedya-pink/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-16 right-10 w-96 h-96 bg-vedya-yellow/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div>
          {/* Main Heading */}
          <h1
            className={`
              text-5xl md:text-7xl font-bold mb-4
              transition-all duration-1000 ease-out
              ${isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
              }
            `}
            style={{ transitionDelay: '100ms' }}
          >
            <span
              className="block text-gray-900 mb-2"
              style={{ transitionDelay: '100ms' }}
            >
              Welcome to
            </span>
            <div
              className="block vedya-svg-wrapper"
              style={{ transitionDelay: '200ms' }}
            >
              <svg
                viewBox="0 0 4000 800"
                className="w-full h-auto mx-auto vedya-svg-logo"
                style={{ height: 'clamp(4rem, 12vw, 9rem)' }}
                xmlns="http://www.w3.org/2000/svg"
                aria-label="VEDYA"
              >
                <g>
                {/* V - single purple #8857F2 (vedya-purple), no shadow */}
                <g transform="translate(0, 700) scale(1, -1)">
                  <path
                    d="M120 700 Q200 700 240 620 L420 200 L600 620 Q640 700 720 700 Q780 700 750 620 L500 80 Q460 0 420 0 Q380 0 340 80 L90 620 Q60 700 120 700 Z"
                    fill="#8857F2"
                  />
                </g>
                <g transform="translate(760, 0)">
                  <path
                    d="M200 0 Q120 0 120 80 L120 620 Q120 700 200 700 L620 700 Q700 700 700 620 Q700 560 620 560 L300 560 L300 420 L560 420 Q640 420 640 350 Q640 280 560 280 L300 280 L300 140 L620 140 Q700 140 700 80 Q700 0 620 0 Z"
                    fill="#8857F2"
                  />
                </g>
                <g transform="translate(1480, 0)">
                  <path
                    d="M200 0 Q120 0 120 80 L120 620 Q120 700 200 700 L450 700 Q700 700 700 350 Q700 0 450 0 Z M300 140 L430 140 Q540 140 540 350 Q540 560 430 560 L300 560 Z"
                    fill="#8857F2"
                  />
                </g>
                <g transform="translate(2220, 700) scale(1, -1)">
                  <path
                    d="M120 700 Q200 700 240 620 L410 360 L580 620 Q620 700 700 700 Q760 700 730 620 L500 300 L500 80 Q500 0 410 0 Q320 0 320 80 L320 300 L90 620 Q60 700 120 700 Z"
                    fill="#8857F2"
                  />
                </g>
                <g transform="translate(2940, 700) scale(1, -1)">
                  <path
                    d="M420 700 Q460 700 500 620 L740 80 Q780 0 700 0 Q620 0 590 80 L540 200 L300 200 L250 80 Q220 0 140 0 Q60 0 100 80 L340 620 Q380 700 420 700 Z M340 340 L500 340 L420 520 Z"
                    fill="#8857F2"
                  />
                </g>
                </g>
              </svg>
            </div>
          </h1>

          {/* Dynamic Subheading with custom typing effect */}
          <div className="h-16 flex items-center justify-center mb-6">
            <h2
              className={`
                text-2xl md:text-3xl text-gray-800 font-medium min-h-[2.5rem] flex items-center justify-center
                transition-all duration-1000 ease-out
                ${isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-6'
                }
              `}
              style={{ transitionDelay: '400ms' }}
            >
              <span className="relative inline-flex items-center">
                <span>{typedText}</span>
                <span className="ml-1 w-px h-6 bg-vedya-purple animate-pulse" />
              </span>
            </h2>
          </div>

          {/* Description */}
          <p
            className={`
              text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed
              transition-all duration-1000 ease-out
              ${isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-6'
              }
            `}
            style={{ transitionDelay: '600ms' }}
          >
            Experience the future of education with our AI-powered platform.
            Get personalized learning plans, interactive content, and real-time progress tracking
            tailored to your unique learning style and goals.
          </p>

          {/* CTA Buttons - Modern Slick Design */}
          <div
            className={`
              flex flex-col sm:flex-row gap-4 justify-center items-center mb-16
              transition-all duration-1000 ease-out
              ${isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-6'
              }
            `}
            style={{ transitionDelay: '800ms' }}
          >
            <button
              onClick={onStartLearning}
              className="group relative bg-gradient-to-r from-vedya-purple to-vedya-pink text-white text-base px-8 py-4 rounded-2xl font-semibold w-full sm:w-auto transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2 shadow-[0_14px_30px_rgba(88,28,135,0.65)]"
              style={{
                transform: 'translateY(0)',
              }}
            >
              <span className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <span>Start Your Learning Journey</span>
              <i className="bi bi-arrow-right text-lg transition-transform duration-300 group-hover:translate-x-1"></i>
            </button>

            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="group relative bg-slate-900 text-white text-base px-8 py-4 rounded-2xl font-semibold w-full sm:w-auto transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2 shadow-[0_14px_30px_rgba(15,23,42,0.65)]"
              style={{
                transform: 'translateY(0)',
              }}
            >
              <span className="absolute inset-0 rounded-2xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <i className="bi bi-question-circle text-lg"></i>
              <span>Explore Features</span>
            </button>
          </div>

          {/* Feature Cards - Dashboard Style */}
          <div
            className={`
              grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto
              transition-all duration-1000 ease-out
              ${isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
              }
            `}
            style={{ transitionDelay: '1000ms' }}
          >
            <StatCard
              title="AI-Powered"
              value="Advanced algorithms personalize your learning experience"
              trend={{ percentage: 8.5, direction: 'up', text: 'Up from last month' }}
              icon={<i className="bi bi-cpu text-3xl"></i>}
            />
            <StatCard
              title="Goal-Oriented"
              value="Set and achieve your learning objectives efficiently"
              trend={{ percentage: 12.3, direction: 'up', text: 'Up from last week' }}
              icon={<i className="bi bi-bullseye text-3xl"></i>}
            />
            <StatCard
              title="Progress Tracking"
              value="Monitor your growth with detailed analytics"
              trend={{ percentage: 4.2, direction: 'down', text: 'Down from yesterday' }}
              icon={<i className="bi bi-graph-up-arrow text-3xl"></i>}
            />
            <StatCard
              title="Interactive Learning"
              value="Engage with dynamic content and real-time feedback"
              trend={{ percentage: 6.8, direction: 'up', text: 'Up from yesterday' }}
              icon={<i className="bi bi-play-circle text-3xl"></i>}
            />
          </div>

          {/* Trusted by strip (matches screenshot style) */}
          {/* <div className="mt-14 max-w-6xl mx-auto">
            <div className="flex items-center justify-center gap-6 text-gray-700">
              <div className="hidden sm:block h-px flex-1 border-t border-dashed border-gray-300/70" />
              <p className="text-sm md:text-base font-medium tracking-wide text-gray-700 whitespace-nowrap">
                Adopted by renowned, trusted, and leading enterprises
              </p>
              <div className="hidden sm:block h-px flex-1 border-t border-dashed border-gray-300/70" />
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-5 text-gray-500/90">
              <div className="flex items-center gap-2">
                <span className="text-2xl leading-none font-medium">*</span>
                <span className="text-2xl font-semibold tracking-tight">Asterisk</span>
              </div>
              <span className="text-2xl font-semibold tracking-tight">Oasis</span>
              <span className="text-2xl font-semibold tracking-tight underline underline-offset-4 decoration-gray-400/70">Eooks</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl leading-none">◌</span>
                <span className="text-2xl font-semibold tracking-tight">Opal</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl leading-none">◜</span>
                <span className="text-2xl font-semibold tracking-tight">Dune</span>
              </div>
            </div>
          </div> */}
        </div>
      </div>

      {/* Scroll Indicator removed */}
    </section>
  )
}

interface StatCardProps {
  title: string
  value: string
  trend: {
    percentage: number
    direction: 'up' | 'down'
    text: string
  }
  icon: React.ReactNode
}

function StatCard({ title, value, trend, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 text-center">
      {/* Icon centered */}
      <div className="flex justify-center mb-4 text-vedya-purple">
        {icon}
      </div>

      {/* Description text centered */}
      <div className="text-base font-semibold text-gray-900 leading-snug">{value}</div>
    </div>
  )
}
