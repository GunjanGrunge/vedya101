'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { API_ENDPOINTS } from '../lib/api-config'

type Status = 'idle' | 'listening' | 'thinking' | 'speaking'

interface VoiceTeacherPanelProps {
  onClose: () => void
  planId: string
  moduleId?: string
  currentConcept: string
  setCurrentConcept: (c: string) => void
  /** Called after each voice exchange so chat history + visuals stay in sync */
  onVoiceExchange?: (payload: {
    userText: string
    teacherText: string
    nextConcept?: string
    blackboardImage?: string | null
    shouldGenerateVisual?: boolean
    visualConcept?: string
    visualType?: string
  }) => void
  /** Optional greeting to speak when panel opens */
  initialGreeting?: string
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

interface SpeechRecognitionResultListLike {
  length: number
  [i: number]: { [j: number]: { transcript: string } }
}

interface SpeechRecognitionInstance {
  start: () => void
  stop: () => void
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: (e: { results: SpeechRecognitionResultListLike }) => void
  onend: () => void
  onerror: (e: { error: string }) => void
}

export default function VoiceTeacherPanel({
  onClose,
  planId,
  moduleId,
  currentConcept,
  setCurrentConcept,
  onVoiceExchange,
  initialGreeting,
}: VoiceTeacherPanelProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const greetingPlayedRef = useRef(false)

  const playTts = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return
    setError(null)
    try {
      const res = await fetch(API_ENDPOINTS.teachingTts, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 4096) }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || err.error || `TTS failed (${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(url)
          audioRef.current = null
          resolve()
        }
        audio.onerror = () => {
          URL.revokeObjectURL(url)
          reject(new Error('Audio playback failed'))
        }
        audio.play().catch(reject)
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not play voice')
      throw e
    }
  }, [])

  const sendAndSpeak = useCallback(
    async (userText: string): Promise<string> => {
      setStatus('thinking')
      setError(null)
      try {
        const body: Record<string, unknown> = {
          message: userText,
          plan_id: planId,
          module_id: moduleId,
          current_concept: currentConcept,
          stream: false,
        }
        const res = await fetch(API_ENDPOINTS.teachingChat, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || data.error || `Request failed (${res.status})`)
        if (!data.success) throw new Error(data.error || data.detail || 'No response')
        const teacherText = (data.response || '').trim()
        if (data.current_concept) setCurrentConcept(data.current_concept)
        // Let the parent update visuals (blackboard, notebook background, etc.) immediately.
        onVoiceExchange?.({
          userText,
          teacherText,
          nextConcept: data.current_concept,
          blackboardImage: data.blackboard_image ?? null,
          shouldGenerateVisual: Boolean(data.should_generate_visual),
          visualConcept: data.visual_concept || data.current_concept,
          visualType: data.visual_type || 'concept_illustration',
        })
        setStatus('speaking')
        await playTts(teacherText)
        return teacherText
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Something went wrong'
        setError(msg)
        throw e
      } finally {
        setStatus('idle')
      }
    },
    [planId, moduleId, currentConcept, setCurrentConcept, playTts, onVoiceExchange]
  )

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SR) {
      setError('Speech recognition not supported in this browser')
      return
    }
    setError(null)
    setStatus('listening')
    const rec = new SR()
    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (e: { results: SpeechRecognitionResultListLike }) => {
      const last = e.results[e.results.length - 1]
      const transcript = last?.[0]?.transcript?.trim()
      if (transcript) {
        sendAndSpeak(transcript).catch(() => {})
      } else {
        setStatus('idle')
      }
    }
    rec.onend = () => {
      setStatus((s) => (s === 'listening' ? 'idle' : s))
    }
    rec.onerror = (e: { error: string }) => {
      if (e.error !== 'aborted') setError('Listening failed')
      setStatus('idle')
    }
    recognitionRef.current = rec
    rec.start()
  }, [sendAndSpeak])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setStatus('idle')
  }, [])

  const isListening = status === 'listening'
  const isBusy = status === 'thinking' || status === 'speaking'

  useEffect(() => {
    if (!greetingPlayedRef.current && initialGreeting?.trim()) {
      greetingPlayedRef.current = true
      setStatus('speaking')
      playTts(initialGreeting)
        .then(() => setStatus('idle'))
        .catch(() => setStatus('idle'))
    }
  }, [initialGreeting, playTts])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      audioRef.current?.pause()
    }
  }, [])

  const statusLabel =
    status === 'listening'
      ? 'Listening...'
      : status === 'thinking'
        ? 'Thinking...'
        : status === 'speaking'
          ? 'Speaking...'
          : 'Tap mic to speak'

  return (
    <div className="flex flex-col h-full min-h-0 bg-gradient-to-br from-indigo-950 via-indigo-900 to-blue-900">
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6">
        {/* Central orb */}
        <div
          className={`rounded-full bg-gradient-to-br from-white/90 via-indigo-200/80 to-blue-300/90 shadow-2xl transition-all duration-300 ${
            isListening
              ? 'w-44 h-44 animate-pulse ring-4 ring-indigo-400/60'
              : isBusy
                ? 'w-40 h-40 ring-2 ring-indigo-300/50'
                : 'w-36 h-36'
          }`}
          style={{
            boxShadow: isListening
              ? '0 0 60px rgba(129, 140, 248, 0.5), 0 0 120px rgba(99, 102, 241, 0.3)'
              : undefined,
          }}
        />
        <p className="mt-6 text-sm font-medium text-indigo-200/90">{statusLabel}</p>
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between p-4 pb-6">
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          disabled={isBusy}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-indigo-900 shadow-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          title={isListening ? 'Stop' : 'Speak'}
          aria-label={isListening ? 'Stop listening' : 'Start speaking'}
        >
          {isListening ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v0m7 7a7 7 0 000-14z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19v-4m0 0v-4m0 4h4m-4 0H8" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-indigo-900 shadow-lg hover:bg-white transition-all"
          title="Exit voice teacher"
          aria-label="Close voice teacher"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
