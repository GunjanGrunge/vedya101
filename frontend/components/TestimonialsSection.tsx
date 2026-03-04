'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import 'bootstrap-icons/font/bootstrap-icons.css'

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-sm ring-1 ring-black/10 shadow-sm">
            <span className="text-slate-700">{icon}</span>
            <span className="text-sm font-medium text-slate-700">{label}</span>
        </div>
    )
}

interface TestimonialCardProps {
    quote: string
    name: string
    avatar: string
    delay: number
}

function TestimonialCard({ quote, name, avatar, delay }: TestimonialCardProps) {
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
        rounded-xl bg-white/75 backdrop-blur-sm ring-1 ring-black/5 
        shadow-[0_14px_30px_rgba(0,0,0,0.10)] p-6
        transition-all duration-700 ease-out
        ${isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                }
        hover:shadow-[0_18px_40px_rgba(0,0,0,0.15)] hover:scale-[1.02]
      `}
        >
            <p className="text-sm text-slate-700 leading-relaxed mb-4">{quote}</p>

            <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-slate-200">
                    <Image
                        src={avatar}
                        alt={name}
                        fill
                        sizes="48px"
                        className="object-cover"
                    />
                </div>
                <div>
                    <div className="text-sm font-semibold text-slate-900">{name}</div>
                </div>
            </div>
        </div>
    )
}

export default function TestimonialsSection() {
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

    const testimonials = [
        {
            quote: "VEDYA transformed my learning journey! The personalized AI recommendations helped me master complex concepts at my own pace. The interactive content makes studying engaging and effective.",
            name: "Arjun Sharma",
            avatar: "/assets/images/person images/1.png",
        },
        {
            quote: "As a teacher, I'm amazed by how VEDYA adapts to each student's learning style. The real-time progress tracking helps me identify where students need extra support. It's a game-changer!",
            name: "Nilabh Kumar",
            avatar: "/assets/images/person images/2.png",
        },
        {
            quote: "The AI-powered learning paths on VEDYA are incredible! I've improved my grades significantly by following the customized study plans. The platform understands my strengths and weaknesses perfectly.",
            name: "Ananya Reddy",
            avatar: "/assets/images/person images/3.png",
        },
        {
            quote: "VEDYA's interactive content and AI tutor have made learning so much more enjoyable. I can track my progress in real-time and see exactly where I'm improving. Highly recommend!",
            name: "Vikram Singh",
            avatar: "/assets/images/person images/4.png",
        },
        {
            quote: "The personalized learning experience on VEDYA is outstanding! The AI creates study plans that match my learning goals perfectly. I've never learned this efficiently before.",
            name: "Rahul Kumar",
            avatar: "/assets/images/person images/5.png",
        },
        {
            quote: "VEDYA has revolutionized how I approach education. The AI-powered platform provides exactly what I need to learn, when I need it. The progress analytics are incredibly insightful!",
            name: "Divyansh Verma",
            avatar: "/assets/images/person images/6.png",
        },
    ]

    return (
        <section className="relative py-24">
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
                    <Badge icon={<i className="bi bi-people" />} label="Trusted by Innovators Worldwide" />

                    <h2 className="mt-6 text-5xl md:text-6xl font-semibold tracking-tight text-slate-900">
                        What Our Users Say
                    </h2>
                    <p className="mt-4 text-base md:text-lg text-slate-700">
                        Hear from businesses who've transformed their workflows with our solutions
                    </p>
                </div>

                {/* Testimonial Grid */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {testimonials.map((testimonial, index) => (
                        <TestimonialCard
                            key={index}
                            quote={testimonial.quote}
                            name={testimonial.name}
                            avatar={testimonial.avatar}
                            delay={300 + index * 100}
                        />
                    ))}
                </div>

                {/* Bottom Section - Trusted by */}
                <div className="mt-16 flex flex-col items-center gap-4">
                    <div className="flex items-center -space-x-3">
                        {[1, 2, 3, 4].map((num) => (
                            <div
                                key={num}
                                className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-white flex-shrink-0"
                            >
                                <Image
                                    src={`/assets/images/person images/${num}.png`}
                                    alt={`User ${num}`}
                                    fill
                                    sizes="48px"
                                    className="object-cover"
                                />
                            </div>
                        ))}
                    </div>
                    <p className="text-sm text-slate-700">
                        Trusted by <span className="font-semibold">1,000+</span> innovators worldwide
                    </p>
                </div>
            </div>
        </section>
    )
}

