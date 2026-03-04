'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { API_ENDPOINTS } from '../lib/api-config'

const EDUCATIONAL_STATUSES = [
  'High School',
  'Some College',
  "Bachelor's Degree",
  "Master's Degree",
  'PhD',
  'Other'
]

interface StepConfig {
  key: keyof OnboardingData
  botMessage: string
  type: 'text' | 'choice' | 'multi' | 'number'
  placeholder?: string
  options?: { value: string; label: string }[] | string[]
  multiOptions?: string[]
}

interface OnboardingData {
  desired_topic: string
  confirm_python: string
  full_name: string
  address: string
  country: string
  educational_status: string
}

interface ChatMessage {
  id: string
  sender: 'bot' | 'user'
  content: string
  stepKey?: string
  visible: boolean
}

interface OnboardingWizardProps {
  isOpen: boolean
  onComplete: () => void
  onClose?: () => void
  initialName?: string
}

const steps: StepConfig[] = [
  {
    key: 'desired_topic',
    botMessage: "Hi! I’m Vedya AI — your personal learning assistant.\n\nWelcome to the VEDYA learning app. What would you like to learn today?",
    type: 'text',
    placeholder: 'e.g. Python'
  },
  {
    key: 'confirm_python',
    botMessage: 'Currently we only support Python. Would you like to learn Python?',
    type: 'choice',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' }
    ]
  },
  {
    key: 'full_name',
    botMessage: "Great. To personalize your experience, what should we call you?",
    type: 'text',
    placeholder: 'Your name'
  },
  {
    key: 'educational_status',
    botMessage: "What's your current educational status?",
    type: 'choice',
    options: EDUCATIONAL_STATUSES.map(s => ({ value: s, label: s }))
  }
]

export default function OnboardingWizard({ isOpen, onComplete, onClose, initialName = '' }: OnboardingWizardProps) {
  const { user } = useUser()
  const [stepIndex, setStepIndex] = useState(0)
  const [data, setData] = useState<OnboardingData>({
    desired_topic: '',
    confirm_python: '',
    full_name: initialName,
    address: '',
    country: '',
    educational_status: ''
  })
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const messagesScrollRef = useRef<HTMLDivElement>(null)
  const footerScrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (initialName) {
      setData(d => ({ ...d, full_name: initialName }))
      if (steps[stepIndex]?.key === 'full_name') setInputValue(initialName)
    }
  }, [initialName])

  // Auto-detect location (address + country) via ipapi.co/json (best effort)
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    fetch('https://ipapi.co/json/')
      .then((r) => (r.ok ? r.json() : null))
      .then((geo: any) => {
        if (cancelled || !geo) return
        const city = typeof geo.city === 'string' ? geo.city : ''
        const region = typeof geo.region === 'string' ? geo.region : ''
        const countryName = typeof geo.country_name === 'string' ? geo.country_name : ''
        const addressParts = [city, region, countryName].filter(Boolean)
        setData((d) => ({
          ...d,
          country: countryName || d.country,
          address: addressParts.length ? addressParts.join(', ') : d.address,
        }))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isOpen])

  // Initial bot message and typing effect
  useEffect(() => {
    if (!isOpen || messages.length > 0) return
    const first = steps[0]
    setMessages([{
      id: '0',
      sender: 'bot',
      content: first.botMessage,
      stepKey: first.key,
      visible: true
    }])
  }, [isOpen])

  useEffect(() => {
    scrollToBottom()
  }, [messages, stepIndex])

  const currentStep = steps[stepIndex]
  const valueForStep = currentStep?.key ? data[currentStep.key] : ''

  // Sync input when switching to a text/number step
  useEffect(() => {
    if (!currentStep) return
    if (currentStep.type === 'text') setInputValue(String(data[currentStep.key as keyof OnboardingData] || ''))
    else setInputValue('')
  }, [stepIndex, currentStep?.key])

  const addUserMessage = (content: string) => {
    const id = `u-${Date.now()}`
    setMessages(m => [...m, { id, sender: 'user', content, visible: true }])
    return id
  }

  const addBotMessage = (content: string, stepKey?: string) => {
    const id = `b-${Date.now()}`
    setMessages(m => [...m, { id, sender: 'bot', content, stepKey, visible: true }])
    return id
  }

  const advanceStep = (userContent: string) => {
    addUserMessage(userContent)
    const nextIndex = stepIndex + 1
    if (nextIndex >= steps.length) {
      submitOnboarding()
      return
    }
    setStepIndex(nextIndex)
    const next = steps[nextIndex]
    addBotMessage(next.botMessage, next.key)
    setInputValue('')
    setError('')
  }

  const submitOnboarding = async () => {
    if (!user?.id) {
      setError('Session expired. Please sign in again.')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      // Ensure user exists in backend (register if needed)
      const registerRes = await fetch(API_ENDPOINTS.userRegister, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerk_user_id: user.id,
          email: user.primaryEmailAddress?.emailAddress || '',
          name: data.full_name || user.firstName
        })
      })
      if (!registerRes.ok && registerRes.status !== 400) {
        const err = await registerRes.json().catch(() => ({}))
        throw new Error(err.detail || 'Failed to register user')
      }

      const res = await fetch(API_ENDPOINTS.onboardingSave, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerk_user_id: user.id,
          full_name: data.full_name,
          // Filled automatically via ipapi.co/json (best effort)
          address: data.address || null,
          country: data.country || null,
          // Removed from UI for now
          gender: null,
          age: null,
          // Only Python is available for now
          languages_to_learn: ['Python'],
          educational_status: data.educational_status
        })
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error || 'Failed to save')
      addBotMessage("You're all set! 🎉 Welcome to VEDYA. Let's start your learning journey.")
      setTimeout(() => onComplete(), 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = () => {
    if (isSubmitting) return
    if (currentStep.type === 'text' || currentStep.type === 'number') {
      const val = String(inputValue).trim()
      if (!val) {
        setError('Please enter a value.')
        return
      }
      // Step 1: desired topic (Python-only for now)
      if (currentStep.key === 'desired_topic') {
        const normalized = val.toLowerCase()
        setData(d => ({ ...d, desired_topic: val }))
        addUserMessage(val)
        if (normalized === 'python') {
          // Auto-confirm yes and proceed
          setData(d => ({ ...d, confirm_python: 'yes' }))
          const nextIndex = stepIndex + 2 // skip confirm step
          setStepIndex(nextIndex)
          const next = steps[nextIndex]
          addBotMessage(next.botMessage, next.key)
          setInputValue(initialName || '')
          setError('')
          return
        }

        addBotMessage("That isn’t available right now—we’re working on it and it’ll be here within a few days.")
        // Move to confirm step
        const confirmIndex = stepIndex + 1
        setStepIndex(confirmIndex)
        const confirmStep = steps[confirmIndex]
        addBotMessage(confirmStep.botMessage, confirmStep.key)
        setInputValue('')
        setError('')
        return
      }

      // Name step (and any future text steps)
      setData(d => ({ ...d, [currentStep.key]: val }))
      advanceStep(val)
      return
    }
    if (currentStep.type === 'choice') {
      const val = valueForStep as string
      if (!val) {
        setError('Please select an option.')
        return
      }
      // Confirm Python step: only proceed if "yes"
      if (currentStep.key === 'confirm_python') {
        addUserMessage(val === 'yes' ? 'Yes' : 'No')
        if (val !== 'yes') {
          setError('')
          addBotMessage("No problem. When you're ready, click Yes and we'll set you up with Python.")
          return
        }
        setData(d => ({ ...d, confirm_python: 'yes' }))
        // Proceed to name step
        const nextIndex = stepIndex + 1
        setStepIndex(nextIndex)
        const next = steps[nextIndex]
        addBotMessage(next.botMessage, next.key)
        setInputValue(initialName || '')
        setError('')
        return
      }

      advanceStep(val)
      return
    }
  }

  const handleChoiceSelect = (value: string) => {
    setData(d => ({ ...d, [currentStep.key]: value }))
    setError('')
  }

  // Lock background scroll when modal is open so only the chat/options scroll
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  // Capture wheel so the modal's scroll areas receive it and the background never scrolls (passive: false required for preventDefault)
  useEffect(() => {
    if (!isOpen || !panelRef.current) return
    const panel = panelRef.current
    const handleWheel = (e: WheelEvent) => {
      if (!panel.contains(e.target as Node)) return
      const messagesEl = messagesScrollRef.current
      const footerEl = footerScrollRef.current
      let scrollEl: HTMLDivElement | null = null
      if (messagesEl && messagesEl.contains(e.target as Node)) scrollEl = messagesEl
      else if (footerEl && footerEl.contains(e.target as Node)) scrollEl = footerEl
      if (scrollEl) {
        e.preventDefault()
        e.stopPropagation()
        const next = scrollEl.scrollTop + e.deltaY
        scrollEl.scrollTop = Math.max(0, Math.min(next, scrollEl.scrollHeight - scrollEl.clientHeight))
      } else {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    panel.addEventListener('wheel', handleWheel, { passive: false })
    return () => panel.removeEventListener('wheel', handleWheel)
  }, [isOpen])

  if (!isOpen) return null

  const options = currentStep?.options as { value: string; label: string }[] | string[] | undefined
  const isOptionValueLabel = options?.length && typeof options[0] === 'object' && options[0] !== null && 'value' in (options[0] as object)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(136,87,242,0.15), transparent 50%), radial-gradient(ellipse 60% 80% at 80% 80%, rgba(242,126,202,0.12), transparent 50%), rgba(0,0,0,0.5)',
        backdropFilter: 'blur(12px)'
      }}
    >
      {/* Subtle 3D grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          perspective: '1000px'
        }}
      />

      <div
        ref={panelRef}
        className="relative w-full max-w-xl h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl animate-fade-in"
        style={{
          background: 'linear-gradient(165deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.98) 100%)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.5), 0 20px 50px -15px rgba(136,87,242,0.25)',
          transform: 'perspective(1200px) rotateX(0deg)',
          transition: 'transform 0.4s ease, box-shadow 0.4s ease'
        }}
        onMouseMove={(e) => {
          if (!panelRef.current) return
          const rect = panelRef.current.getBoundingClientRect()
          const x = (e.clientX - rect.left) / rect.width - 0.5
          const y = (e.clientY - rect.top) / rect.height - 0.5
          panelRef.current.style.transform = `perspective(1200px) rotateX(${y * -4}deg) rotateY(${x * 4}deg)`
          panelRef.current.style.boxShadow = `0 32px 64px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.5), ${x * 20}px ${y * 20}px 50px -15px rgba(136,87,242,0.2)`
        }}
        onMouseLeave={() => {
          if (panelRef.current) {
            panelRef.current.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)'
            panelRef.current.style.boxShadow = '0 32px 64px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.5), 0 20px 50px -15px rgba(136,87,242,0.25)'
          }
        }}
      >
        {/* Header with gradient and glass */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{
            background: 'linear-gradient(135deg, #8857F2 0%, #F27ECA 100%)',
            boxShadow: '0 4px 24px rgba(136,87,242,0.35)'
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
              style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5A2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">VEDYA Onboarding</h2>
              <p className="text-white/90 text-sm">Just a few quick questions</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/80 text-xs font-medium">
              Step {stepIndex + 1} of {steps.length}
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/20 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable messages only (chat thread) - takes remaining space */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div
            ref={messagesScrollRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-4"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {messages.map((msg, i) => (
              <div
                key={msg.id}
                className={`flex onboarding-msg-in ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-br from-vedya-purple to-vedya-darkPurple text-white shadow-lg'
                      : 'bg-white/90 text-gray-800 shadow-md border border-gray-100'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                </div>
              </div>
            ))}
            {isSubmitting && (
              <div className="flex justify-start onboarding-msg-in">
                <div className="rounded-2xl px-4 py-3 bg-white/90 shadow-md border border-gray-100 flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-vedya-purple animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-vedya-pink animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-vedya-orange animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

        {/* Fixed input area at bottom (chat widget style). Max height so it doesn't steal space from messages; scroll when many options. */}
        <div className="shrink-0 min-h-0 max-h-[45vh] flex flex-col border-t border-gray-200/80 bg-gray-50/50">
          <div ref={footerScrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4">
          {error && (
            <p className="text-red-500 text-sm mb-3 font-medium">{error}</p>
          )}

          {currentStep?.type === 'text' && (
            <div className="flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => { setInputValue(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder={currentStep.placeholder}
                className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:border-vedya-purple focus:ring-2 focus:ring-vedya-purple/20 outline-none transition-all"
                autoFocus
              />
              <button
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-vedya-purple to-vedya-pink text-white font-medium shadow-lg hover:shadow-xl hover:scale-105 active:scale-100 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                Send
              </button>
            </div>
          )}

          {currentStep?.type === 'number' && (
            <div className="flex gap-3">
              <input
                type="number"
                min={1}
                max={120}
                value={inputValue}
                onChange={(e) => { setInputValue(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder={currentStep.placeholder}
                className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:border-vedya-purple focus:ring-2 focus:ring-vedya-purple/20 outline-none transition-all"
                autoFocus
              />
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-vedya-purple to-vedya-pink text-white font-medium shadow-lg hover:shadow-xl hover:scale-105 active:scale-100 transition-all disabled:opacity-50"
              >
                Send
              </button>
            </div>
          )}

          {currentStep?.type === 'choice' && options && (
            <div className="grid gap-2">
              {(isOptionValueLabel ? (options as { value: string; label: string }[]) : (options as string[]).map(v => ({ value: v, label: v }))).map((opt: { value: string; label: string }) => (
                <button
                  key={opt.value}
                  onClick={() => handleChoiceSelect(opt.value)}
                  className={`text-left rounded-xl border-2 px-4 py-3 font-medium transition-all ${
                    valueForStep === opt.value
                      ? 'border-vedya-purple bg-vedya-purple/10 text-vedya-purple shadow-md'
                      : 'border-gray-200 bg-white hover:border-vedya-purple/50 hover:bg-vedya-purple/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={handleSubmit}
                disabled={!valueForStep}
                className="mt-2 px-5 py-3 rounded-xl bg-gradient-to-r from-vedya-purple to-vedya-pink text-white font-medium shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          )}
          </div>
        </div>
        </div>
      </div>

    </div>
  )
}
