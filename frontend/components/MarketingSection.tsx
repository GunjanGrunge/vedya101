'use client'

import { useEffect, useRef, useState } from 'react'
import 'bootstrap-icons/font/bootstrap-icons.css'

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-sm ring-1 ring-black/10 shadow-sm">
      <span className="text-slate-700">{icon}</span>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </div>
  )
}

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  delay: number
}

function FeatureCard({ icon, title, description, delay }: FeatureCardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [delay])

  return (
    <div
      ref={ref}
      className={`
        rounded-2xl bg-white/75 backdrop-blur-sm ring-1 ring-black/5 
        shadow-[0_14px_30px_rgba(0,0,0,0.10)] p-8
        transition-all duration-700 ease-out
        ${isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-8'
        }
        hover:shadow-[0_18px_40px_rgba(0,0,0,0.15)] hover:scale-[1.02]
      `}
    >
      <div className="text-vedya-purple text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-700 leading-relaxed">{description}</p>
    </div>
  )
}

export default function MarketingSection() {
  const [headerVisible, setHeaderVisible] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setHeaderVisible(true), 100)
        }
      },
      { threshold: 0.1 }
    )

    if (headerRef.current) {
      observer.observe(headerRef.current)
    }

    return () => {
      if (headerRef.current) {
        observer.unobserve(headerRef.current)
      }
    }
  }, [])

  const features = [
    {
      icon: <i className="bi bi-robot" />,
      title: 'Campaign Automation',
      description: 'Create and execute campaigns with ease using AI-driven automation for maximum efficiency',
    },
    {
      icon: <i className="bi bi-rocket-takeoff" />,
      title: 'Personalized Outreach',
      description: 'Deliver tailored messages to each customer for more impactful and engaging communication',
    },
    {
      icon: <i className="bi bi-gear-fill" />,
      title: 'Data Optimization',
      description: 'Analyze performance with detailed analytics to fine-tune campaigns and boost results',
    },
    {
      icon: <i className="bi bi-clock-history" />,
      title: 'Seamless Collaboration',
      description: 'Seamlessly integrate with existing tools to enhance team productivity and coordination',
    },
    {
      icon: <i className="bi bi-diagram-3-fill" />,
      title: 'Real-Time Insights',
      description: 'Monitor customer interactions and adapt strategies in real time for optimal engagement',
    },
    {
      icon: <i className="bi bi-shield-check" />,
      title: 'Future-Proof Solutions',
      description: 'Stay ahead with continuous updates, and built-in adaptability for evolving needs.',
    },
  ]

  return (
    <section id="marketing" className="relative py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          ref={headerRef}
          className={`
            text-center
            transition-all duration-700 ease-out
            ${headerVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
            }
          `}
        >
          <Badge icon={<i className="bi bi-cloud" />} label="Effortless Deployment" />
          <h2 className="mt-6 text-5xl md:text-6xl font-semibold tracking-tight text-slate-900">
            AI-Powered Marketing
          </h2>
          <p className="mt-4 text-base md:text-lg text-slate-700">
            Simplify deployment for unmatched scalability and impact
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={200 + index * 100}
            />
          ))}
        </div>

      </div>
    </section>
  )
}

