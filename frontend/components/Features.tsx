import { useState, useEffect, useRef } from 'react'
import 'bootstrap-icons/font/bootstrap-icons.css'

const features = [
  {
    id: 'ai-personalization',
    icon: <i className="bi bi-cpu-fill text-3xl"></i>,
    title: 'AI-Powered Personalization',
    description: 'Our advanced AI algorithms analyze your learning patterns and preferences to create a completely personalized educational experience.',
    details: [
      'Adaptive learning paths based on your progress',
      'Smart content recommendations',
      'Personalized difficulty adjustments',
      'Learning style recognition and adaptation'
    ]
  },
  {
    id: 'interactive-content',
    icon: <i className="bi bi-play-circle-fill text-3xl"></i>,
    title: 'Interactive Learning Content',
    description: 'Engage with dynamic, multimedia content that makes learning enjoyable and effective.',
    details: [
      'Interactive simulations and demos',
      'Gamified learning experiences',
      'Real-time coding environments',
      'Virtual labs and experiments'
    ]
  },
  {
    id: 'progress-tracking',
    icon: <i className="bi bi-bar-chart-fill text-3xl"></i>,
    title: 'Advanced Progress Tracking',
    description: 'Monitor your learning journey with comprehensive analytics and insights.',
    details: [
      'Real-time progress visualization',
      'Detailed performance analytics',
      'Achievement badges and milestones',
      'Learning streak tracking'
    ]
  },
  {
    id: 'multi-agent-system',
    icon: <i className="bi bi-diagram-3-fill text-3xl"></i>,
    title: 'Multi-Agent Learning System',
    description: 'Experience coordinated AI agents working together to optimize your learning experience.',
    details: [
      'Specialized agents for different subjects',
      'Coordinated learning plan creation',
      'Real-time assistance and guidance',
      'Continuous curriculum optimization'
    ]
  },
  {
    id: 'assessments',
    icon: <i className="bi bi-clipboard-check-fill text-3xl"></i>,
    title: 'Smart Assessments',
    description: 'Take adaptive quizzes and assessments that adjust to your knowledge level.',
    details: [
      'AI-generated quiz questions',
      'Adaptive difficulty scaling',
      'Instant feedback and explanations',
      'Comprehensive performance reports'
    ]
  },
  {
    id: 'collaboration',
    icon: <i className="bi bi-people-fill text-3xl"></i>,
    title: 'Collaborative Learning',
    description: 'Connect with peers and learn together in our interactive community environment.',
    details: [
      'Study groups and discussions',
      'Peer-to-peer learning',
      'Expert mentorship programs',
      'Community challenges and competitions'
    ]
  }
]

export default function Features() {
  const [activeFeature, setActiveFeature] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -80px 0px',
      }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current)
      }
    }
  }, [])

  return (
    <section
      id="features"
      ref={sectionRef}
      className="py-20 bg-transparent"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div
          className={`text-center mb-16 transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Powerful Features for
            <span className="gradient-text block mt-2">Modern Learning</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover how our cutting-edge technology transforms the way you learn,
            making education more personalized, engaging, and effective than ever before.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              isActive={activeFeature === feature.id}
              onClick={() => setActiveFeature(activeFeature === feature.id ? null : feature.id)}
              index={index}
              isSectionVisible={isVisible}
            />
          ))}
        </div>

        {/* Learning Impact Showcase - CTA + Analytics Card */}
        <div
          className={`
            mt-20 transition-all duration-1000 ease-out
            ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
          `}
          style={{ transitionDelay: '300ms' }}
        >
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Left side - CTA content */}
              <div
                className={`
                  p-8 lg:p-12 flex items-center
                  transition-all duration-1000 ease-out
                  ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
                `}
                style={{ transitionDelay: '350ms' }}
              >
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm shadow-sm">
                    <i className="bi bi-people text-slate-700"></i>
                    <span>Trusted by 10k+ learners</span>
                  </div>

                  <h3 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                    Experience the Future of Learning
                  </h3>
                  <p className="text-gray-600 text-base md:text-lg max-w-xl">
                    Join thousands of learners who have transformed their education with VEDYA&apos;s
                    AI-powered personalized learning paths and real-time progress insights.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <button
                      onClick={() =>
                        document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
                      }
                      className="group bg-vedya-purple text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <span>Get Started</span>
                      <i className="bi bi-arrow-right-short text-xl group-hover:translate-x-1 transition-transform"></i>
                    </button>
                    <button
                      onClick={() =>
                        document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
                      }
                      className="group bg-white text-slate-800 px-8 py-3 rounded-xl font-semibold border border-slate-200 shadow-sm hover:shadow-md hover:border-vedya-purple/60 hover:text-vedya-purple transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <i className="bi bi-play-circle text-lg group-hover:scale-110 transition-transform"></i>
                      <span>Learn More</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right side - Analytics style card */}
              <div
                className={`
                  bg-gradient-to-br from-vedya-purple/5 via-white to-vedya-pink/10 p-8 lg:p-12 flex items-center justify-center
                  transition-all duration-1000 ease-out
                  ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
                `}
                style={{ transitionDelay: '450ms' }}
              >
                <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_24px_60px_rgba(15,23,42,0.18)] p-6 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">
                        Learning Balance
                      </p>
                      <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        On track
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Active learners</p>
                      <p className="text-xl font-semibold text-slate-900">682.5k</p>
                    </div>
                  </div>

                  {/* Simple bar chart representation */}
                  <div className="mt-4 mb-6 h-32 flex items-end gap-2">
                    {['h-8', 'h-12', 'h-16', 'h-10', 'h-20', 'h-32', 'h-18', 'h-14', 'h-10', 'h-16', 'h-12', 'h-8'].map(
                      (height, idx) => (
                        <div
                          key={idx}
                          className={`flex-1 rounded-full bg-slate-100 overflow-hidden relative`}
                        >
                          <div
                            className={`absolute bottom-0 left-0 right-0 rounded-full ${idx === 5 ? 'bg-vedya-purple' : 'bg-vedya-purple/25'
                              } ${height}`}
                          ></div>
                        </div>
                      )
                    )}
                  </div>

                  {/* Learning impact stats */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-slate-500 mb-1">Learning Efficiency</p>
                      <p className="text-sm font-semibold text-emerald-600">+85%</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Engagement Rate</p>
                      <p className="text-sm font-semibold text-emerald-600">94%</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Retention</p>
                      <p className="text-sm font-semibold text-emerald-600">78%</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Course Completion</p>
                      <p className="text-sm font-semibold text-emerald-600">92%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

interface FeatureCardProps {
  feature: typeof features[0]
  isActive: boolean
  onClick: () => void
  index: number
  isSectionVisible: boolean
}

function FeatureCard({ feature, isActive, onClick, index, isSectionVisible }: FeatureCardProps) {
  return (
    <div
      className={`
        group bg-white rounded-2xl p-6 shadow-lg cursor-pointer
        transition-all duration-700 ease-out
        hover:shadow-2xl hover:transform hover:scale-105 hover:-translate-y-1
        ${isActive ? 'ring-2 ring-vedya-purple shadow-2xl scale-105 -translate-y-1' : ''}
        ${isSectionVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      onClick={onClick}
      style={{ transitionDelay: `${200 + index * 120}ms` }}
    >
      <div className="text-vedya-purple mb-4 flex justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">{feature.icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        {feature.title}
      </h3>
      <p className="text-gray-600 mb-4 leading-relaxed">
        {feature.description}
      </p>

      {/* Expandable details */}
      <div className={`overflow-hidden transition-all duration-300 ${isActive ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="border-t border-gray-200 pt-4 mt-4">
          <ul className="space-y-2">
            {feature.details.map((detail, index) => (
              <li key={index} className="flex items-start text-sm text-gray-600">
                <span className="text-vedya-purple mr-2">•</span>
                {detail}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 text-vedya-purple font-medium text-sm">
        {isActive ? 'Click to collapse' : 'Click to learn more'}
      </div>
    </div>
  )
}

interface StatItemProps {
  label: string
  value: string
  color: string
}

function StatItem({ label, value, color }: StatItemProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center">
        <div className="w-24 h-2 bg-gray-200 rounded-full mr-3">
          <div
            className={`h-full ${color.replace('text-', 'bg-')} rounded-full transition-all duration-1000`}
            style={{ width: value }}
          ></div>
        </div>
        <span className={`font-bold ${color}`}>{value}</span>
      </div>
    </div>
  )
}
