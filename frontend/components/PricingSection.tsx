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

interface PricingCardProps {
  title: string
  price: string
  features: string[]
  isPopular?: boolean
  delay: number
  buttonStyle?: 'default' | 'primary'
}

function PricingCard({ title, price, features, isPopular = false, delay, buttonStyle = 'default' }: PricingCardProps) {
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
        relative rounded-2xl bg-white/75 backdrop-blur-sm ring-1 ring-black/5 
        shadow-[0_14px_30px_rgba(0,0,0,0.10)] p-8
        transition-all duration-700 ease-out
        ${isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-8'
        }
        hover:shadow-[0_18px_40px_rgba(0,0,0,0.15)] hover:scale-[1.02]
        ${isPopular ? 'ring-2 ring-vedya-purple/30' : ''}
      `}
    >
      {isPopular && (
        <div className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-vedya-purple text-white text-xs font-semibold flex items-center gap-1.5">
          <i className="bi bi-fire text-sm"></i>
          <span>Popular</span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-2xl font-bold text-slate-900 mb-2">{title}</h3>
        <div className="text-3xl font-bold text-slate-900">{price}</div>
      </div>

      <button
        className={`
          w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300
          flex items-center justify-center gap-2 mb-6
          ${buttonStyle === 'primary'
            ? 'bg-vedya-purple text-white hover:bg-vedya-dark-purple hover:shadow-lg hover:scale-105'
            : 'bg-slate-100 text-slate-800 hover:bg-slate-200 hover:shadow-md hover:scale-105'
          }
        `}
      >
        <i className="bi bi-crown text-lg"></i>
        <span>Get Started</span>
      </button>

      <ul className="space-y-3">
        {features.map((feature, index) => (
          <li
            key={index}
            className="flex items-start gap-3 text-slate-700"
            style={{
              animationDelay: `${delay + (index + 1) * 50}ms`,
            }}
          >
            <i className="bi bi-check-circle-fill text-vedya-purple text-lg mt-0.5 flex-shrink-0"></i>
            <span className="text-sm leading-relaxed">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function PricingSection() {
  const [headerVisible, setHeaderVisible] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
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

  const plans = [
    {
      title: 'Starter',
      monthlyPrice: '$12',
      yearlyPrice: '$9',
      features: [
        'Everything in starter plan',
        'Unlimited AI usage here',
        'Premium support',
        'Customer care on point',
        'Collaboration tools',
      ],
      isPopular: false,
    },
    {
      title: 'Pro',
      monthlyPrice: '$17',
      yearlyPrice: '$12',
      features: [
        'Everything in Pro plan',
        'Integrations with 3rd-party',
        'Advanced analytics',
        'Team performance tracking',
        'Top grade security',
        'Customizable Solutions',
      ],
      isPopular: true,
    },
    {
      title: 'Enterprise',
      monthlyPrice: '$97',
      yearlyPrice: '$80',
      features: [
        'Dedicated account manager',
        'Custom reports & dashboards',
        'Most performance usage',
        'Enterprise-grade security',
        'Customizable Solutions',
        'Seamless Integration',
      ],
      isPopular: false,
    },
  ]

  return (
    <section id="pricing" className="relative py-24">
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
          <div className="flex justify-center mb-4">
            <Badge icon={<i className="bi bi-currency-dollar" />} label="Transparent Pricing, No Surprises" />
          </div>

          <h2 className="mt-6 text-5xl md:text-6xl font-semibold tracking-tight text-slate-900">
            Flexible Plans for All
          </h2>
          <p className="mt-4 text-base md:text-lg text-slate-700">
            Choose a plan that fits your goals and scale as you grow.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`
                px-6 py-2 rounded-lg font-medium transition-all duration-300
                ${billingPeriod === 'monthly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                }
              `}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`
                px-6 py-2 rounded-lg font-medium transition-all duration-300
                ${billingPeriod === 'yearly'
                  ? 'bg-vedya-purple text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                }
              `}
            >
              Yearly <span className="text-xs ml-1">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <PricingCard
              key={index}
              title={plan.title}
              price={`${billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice} user/month`}
              features={plan.features}
              isPopular={plan.isPopular}
              delay={300 + index * 150}
              buttonStyle={plan.isPopular ? 'primary' : 'default'}
            />
          ))}
        </div>

        {/* Bottom Message */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 text-slate-600">
            <i className="bi bi-gift text-lg"></i>
            <span className="text-sm">
              We donate 2% of your membership to pediatric wellbeing
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

