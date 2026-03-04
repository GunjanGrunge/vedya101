import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import 'bootstrap-icons/font/bootstrap-icons.css'

type IntegrationTileProps = {
  icon: React.ReactNode
  ariaLabel: string
}

function IntegrationTile({ icon, ariaLabel }: IntegrationTileProps) {
  return (
    <div
      className="h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/10 flex items-center justify-center backdrop-blur-sm"
      aria-label={ariaLabel}
    >
      <div className="text-slate-900 text-3xl md:text-4xl">{icon}</div>
    </div>
  )
}

function TypingText({ text, isVisible }: { text: string; isVisible: boolean }) {
  const [display, setDisplay] = useState('')

  useEffect(() => {
    if (!isVisible) {
      setDisplay('')
    }
  }, [isVisible])

  useEffect(() => {
    if (!isVisible) return
    if (display.length >= text.length) return

    const timeout = setTimeout(() => {
      setDisplay(text.slice(0, display.length + 1))
    }, 45)

    return () => clearTimeout(timeout)
  }, [display, isVisible, text])

  return <span>{display}</span>
}

export default function IntegrationsSection() {
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
    <section ref={sectionRef} className="relative py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={`text-center transition-all duration-1000 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-sm ring-1 ring-black/10 shadow-sm">
            <i className="bi bi-layers text-sm text-slate-700" />
            <span className="text-sm font-medium text-slate-700">Integrations</span>
          </div>

          <h2 className="mt-6 text-5xl md:text-6xl font-semibold tracking-tight text-slate-900">
            Integrates with
          </h2>
          <p className="mt-4 text-base md:text-lg text-slate-700">
            Seamlessly integrate with your favorite tools
          </p>
        </div>

        {/* Diagram */}
        <div
          className={`
            relative mt-14 mx-auto max-w-6xl
            transition-all duration-1000 ease-out
            ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
          `}
        >
          <div className="relative h-[420px] md:h-[460px]">
            {/* Connector lines */}
            <svg
              className="absolute inset-0 w-full h-full hidden md:block"
              viewBox="0 0 1200 460"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* dashed style similar to screenshot */}
              <defs>
                <style>{`
                  .dash { stroke: rgba(30, 64, 175, 0.45); stroke-width: 2; stroke-dasharray: 6 8; stroke-linecap: round; }
                  .solid { stroke: rgba(30, 41, 59, 0.35); stroke-width: 2; }
                `}</style>
              </defs>

              {/* left top */}
              <path className="dash" d="M220 125 H410 C455 125 480 150 480 190 V205" />
              {/* left middle (solid to center) */}
              <path className="solid" d="M220 230 H520" />
              {/* left bottom */}
              <path className="dash" d="M220 335 H410 C455 335 480 310 480 270 V255" />

              {/* right top */}
              <path className="dash" d="M980 125 H790 C745 125 720 150 720 190 V205" />
              {/* right middle */}
              <path className="solid" d="M680 230 H980" />
              {/* right bottom */}
              <path className="dash" d="M980 335 H790 C745 335 720 310 720 270 V255" />

              {/* center junction (small vertical stem) */}
              <path className="solid" d="M600 200 V260" />
            </svg>

            {/* Center tile */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block">
              <div className="h-24 w-24 md:h-28 md:w-28 rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-black/5 shadow-[0_18px_40px_rgba(0,0,0,0.18)] flex items-center justify-center">
                <div className="relative h-20 w-20 md:h-24 md:w-24">
                  <Image
                    src="/assets/images/Logo.png"
                    alt="VEDYA"
                    fill
                    sizes="96px"
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
            </div>
            {/* Left column - coding languages */}
            <div
              className={`
                absolute left-[120px] top-[72px] md:top-[62px]
                transition-all duration-700 ease-out
                ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}
              `}
            >
              <IntegrationTile
                ariaLabel="JavaScript"
                icon={<i className="bi bi-filetype-js" />}
              />
            </div>
            <div
              className={`
                absolute left-[120px] top-1/2 -translate-y-1/2
                transition-all duration-700 ease-out
                ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}
              `}
            >
              <IntegrationTile
                ariaLabel="Node.js"
                icon={<i className="bi bi-terminal" />}
              />
            </div>
            <div
              className={`
                absolute left-[120px] bottom-[58px] md:bottom-[48px]
                transition-all duration-700 ease-out
                ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}
              `}
            >
              <IntegrationTile
                ariaLabel="Python"
                icon={<i className="bi bi-filetype-py" />}
              />
            </div>

            {/* Right column - coding tools/platforms */}
            <div
              className={`
                absolute right-[120px] top-[72px] md:top-[62px]
                transition-all duration-700 ease-out
                ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'}
              `}
            >
              <IntegrationTile
                ariaLabel="React"
                icon={<i className="bi bi-filetype-jsx" />}
              />
            </div>
            <div
              className={`
                absolute right-[120px] top-1/2 -translate-y-1/2
                transition-all duration-700 ease-out
                ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'}
              `}
            >
              <IntegrationTile
                ariaLabel="Git / DevOps"
                icon={<i className="bi bi-git" />}
              />
            </div>
            <div
              className={`
                absolute right-[120px] bottom-[58px] md:bottom-[48px]
                transition-all duration-700 ease-out
                ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'}
              `}
            >
              <IntegrationTile
                ariaLabel="TypeScript"
                icon={<i className="bi bi-filetype-tsx" />}
              />
            </div>
          </div>

          {/* Bottom feature bullets */}
          <div className="mt-10 flex flex-col md:flex-row items-center justify-center gap-6 text-slate-700">
            <div className="flex items-center gap-3">
              <i className="bi bi-arrow-repeat text-lg" />
              <span className="text-sm md:text-base">
                <TypingText text="Seamless Automation" isVisible={isVisible} />
              </span>
            </div>
            <div className="hidden md:block h-5 w-px bg-slate-300/70" />
            <div className="flex items-center gap-3">
              <i className="bi bi-clock text-lg" />
              <span className="text-sm md:text-base">
                <TypingText text="Real-Time Data Sync" isVisible={isVisible} />
              </span>
            </div>
            <div className="hidden md:block h-5 w-px bg-slate-300/70" />
            <div className="flex items-center gap-3">
              <i className="bi bi-sliders text-lg" />
              <span className="text-sm md:text-base">
                <TypingText text="Customizable Solutions" isVisible={isVisible} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


