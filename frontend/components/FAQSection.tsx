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

interface FAQItemProps {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
  delay: number
}

function FAQItem({ question, answer, isOpen, onToggle, delay }: FAQItemProps) {
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
        rounded-xl bg-white/75 backdrop-blur-sm ring-1 transition-all duration-500
        shadow-[0_14px_30px_rgba(0,0,0,0.10)]
        ${isOpen ? 'ring-vedya-purple/50 ring-2' : 'ring-black/5'}
        ${isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-6'
        }
        hover:shadow-[0_18px_40px_rgba(0,0,0,0.15)]
      `}
    >
      <button
        onClick={onToggle}
        className="w-full px-6 py-5 flex items-center justify-between text-left group"
      >
        <span className="text-base font-semibold text-slate-900 pr-4">{question}</span>
        <i
          className={`
            bi text-slate-600 text-xl transition-transform duration-300 flex-shrink-0
            ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'}
            group-hover:text-vedya-purple
          `}
        ></i>
      </button>

      <div
        className={`
          overflow-hidden transition-all duration-500 ease-in-out
          ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="px-6 pb-5 pt-0">
          <p className="text-sm text-slate-700 leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  )
}

export default function FAQSection() {
  const [headerVisible, setHeaderVisible] = useState(false)
  const [openIndex, setOpenIndex] = useState<number | null>(0) // First item open by default
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

  const faqs = [
    {
      question: 'What is VEDYA?',
      answer: 'VEDYA is an AI-powered education platform designed to help you build personalized learning experiences quickly and efficiently. Get personalized learning plans, interactive content, and real-time progress tracking tailored to your unique learning style and goals.',
    },
    {
      question: 'Is VEDYA optimized for learning outcomes?',
      answer: 'Yes, VEDYA is built with learning science principles in mind. Our AI algorithms analyze your progress, adapt content delivery, and optimize learning paths to maximize retention and comprehension.',
    },
    {
      question: 'Do I need coding skills to use VEDYA?',
      answer: 'No coding skills required! VEDYA is designed to be user-friendly and intuitive. Our platform guides you through the learning process with an easy-to-use interface that anyone can navigate.',
    },
    {
      question: 'Can I customize VEDYA to fit my learning goals?',
      answer: 'Absolutely! VEDYA offers extensive customization options. You can set your learning objectives, choose your preferred learning style, and the AI will adapt the content and pace to match your needs.',
    },
    {
      question: 'Does VEDYA include mobile responsiveness?',
      answer: 'Yes, VEDYA is fully responsive and works seamlessly across all devices - desktop, tablet, and mobile. Learn anywhere, anytime with our mobile-optimized interface.',
    },
  ]

  return (
    <section id="faq" className="relative py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
          <Badge icon={<i className="bi bi-question-circle" />} label="Your Queries, Simplified" />

          <h2 className="mt-6 text-5xl md:text-6xl font-semibold tracking-tight text-slate-900">
            Questions? Answers!
          </h2>
          <p className="mt-4 text-base md:text-lg text-slate-700">
            Find quick answers to the most common questions about our platform
          </p>
        </div>

        {/* FAQ Items */}
        <div className="mt-12 space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
              delay={300 + index * 100}
            />
          ))}
        </div>

        {/* Contact Info */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 text-slate-700">
            <i className="bi bi-envelope text-lg"></i>
            <span className="text-sm">
              Feel free to mail us for any enquiries :{' '}
              <a
                href="mailto:support@vedya.com"
                className="text-vedya-purple hover:text-vedya-dark-purple underline transition-colors"
              >
                support@vedya.com
              </a>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

