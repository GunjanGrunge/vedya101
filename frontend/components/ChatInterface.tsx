'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { API_ENDPOINTS } from '../lib/api-config'

interface Message {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  type?: 'text' | 'loading'
  metadata?: {
    show_action_button?: boolean
    action_button_text?: string
    action_type?: string
    plan_id?: string
  }
}

const DEFAULT_GREETING = "Lets start Learning Python Today."

export type ChatMessageFromApi = { role: string; content: string; created_at?: string | null }

interface ChatInterfaceProps {
  isOpen: boolean
  onClose: () => void
  /** When set, used as the first AI message and a DB session is created with this greeting saved. */
  initialGreeting?: string
  /** When set with initialMessages, open this session and show those messages (continue conversation). */
  continueSessionId?: string | null
  /** Messages to show when continuing a session (from GET /chat/messages). */
  initialMessages?: ChatMessageFromApi[] | null
}

function mapApiMessagesToMessages(api: ChatMessageFromApi[], baseId: number): Message[] {
  return api.map((m, i) => ({
    id: String(baseId + i),
    content: m.content ?? '',
    sender: (m.role === 'user' ? 'user' : 'ai') as 'user' | 'ai',
    timestamp: m.created_at ? new Date(m.created_at) : new Date(),
    type: 'text' as const,
  }))
}

export default function ChatInterface({ isOpen, onClose, initialGreeting, continueSessionId, initialMessages }: ChatInterfaceProps) {
  const { user } = useUser()
  const router = useRouter()
  const greeting = initialGreeting ?? DEFAULT_GREETING
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', content: greeting, sender: 'ai', timestamp: new Date(), type: 'text' }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const sessionCreatedRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesScrollRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // When opening with a previous session, set session and messages
  useEffect(() => {
    if (!isOpen) {
      sessionCreatedRef.current = false
      return
    }
    if (continueSessionId && initialMessages) {
      setSessionId(continueSessionId)
      sessionCreatedRef.current = true
      setMessages(mapApiMessagesToMessages(initialMessages, Date.now()))
      return
    }
    // New chat: clear any previous session and create DB session + save greeting
    setSessionId(null)
    if (!initialGreeting || !user?.id || sessionCreatedRef.current) return
    const createSessionAndSaveGreeting = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.chatSessions, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clerk_user_id: user.id }),
        })
        if (!res.ok) return
        const data = (await res.json()) as { session_id?: string }
        const sid = data.session_id
        if (!sid) return
        setSessionId(sid)
        sessionCreatedRef.current = true
        await fetch(API_ENDPOINTS.chatMessages, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sid, role: 'assistant', content: initialGreeting }),
        })
      } catch {
        // Non-blocking
      }
    }
    createSessionAndSaveGreeting()
  }, [isOpen, initialGreeting, user?.id, continueSessionId, initialMessages])

  // When opening a new chat (no continue), show the current greeting (never stale/old text)
  const wasOpenRef = useRef(false)
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false
      return
    }
    if (continueSessionId && initialMessages) return
    if (!wasOpenRef.current) {
      setMessages([{ id: '1', content: greeting, sender: 'ai', timestamp: new Date(), type: 'text' }])
    }
    wasOpenRef.current = true
  }, [isOpen, greeting, continueSessionId, initialMessages])

  // Lock body scroll when chat modal is open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [isOpen])

  // Capture wheel so the messages area scrolls and Lenis/background do not (passive: false for preventDefault)
  useEffect(() => {
    if (!isOpen || !panelRef.current) return
    const panel = panelRef.current
    const handleWheel = (e: WheelEvent) => {
      if (!panel.contains(e.target as Node)) return
      const messagesEl = messagesScrollRef.current
      if (messagesEl && messagesEl.contains(e.target as Node)) {
        e.preventDefault()
        e.stopPropagation()
        const next = messagesEl.scrollTop + e.deltaY
        messagesEl.scrollTop = Math.max(0, Math.min(next, messagesEl.scrollHeight - messagesEl.clientHeight))
      } else {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    panel.addEventListener('wheel', handleWheel, { passive: false })
    return () => panel.removeEventListener('wheel', handleWheel)
  }, [isOpen])

  const sessionReady = !initialGreeting || !!sessionId
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return
    if (initialGreeting && !sessionId) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = inputValue.trim()
    setInputValue('')
    setIsLoading(true)

    // Add a loading message that will be replaced with streaming content
    const loadingMessageId = (Date.now() + 1).toString()
    const loadingMessage: Message = {
      id: loadingMessageId,
      content: '',
      sender: 'ai',
      timestamp: new Date(),
      type: 'loading'
    }
    setMessages(prev => [...prev, loadingMessage])

    const sid = sessionId
    if (sid) {
      try {
        await fetch(API_ENDPOINTS.chatMessages, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sid, role: 'user', content: currentInput }),
        })
      } catch { /* non-blocking */ }
    }

    try {
      console.log('🚀 Making streaming API request to:', API_ENDPOINTS.chatStream)
      console.log('📤 Sending message:', currentInput)

      const response = await fetch(API_ENDPOINTS.chatStream, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          session_id: sessionId,
          clerk_user_id: user?.id ?? undefined,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body reader available')
      }

      let accumulatedContent = ''
      let newSessionId = sessionId
      let finalMetadata = {}

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'metadata') {
                newSessionId = data.session_id
                if (!sessionId) {
                  setSessionId(newSessionId)
                }
              } else if (data.type === 'content') {
                // For character-by-character streaming, use the accumulated content if provided
                if (data.accumulated) {
                  accumulatedContent = data.accumulated;
                } else {
                  // Otherwise add the new content to our accumulated content
                  accumulatedContent += data.content;
                }

                // Update the loading message with accumulated content
                setMessages(prev => prev.map(msg =>
                  msg.id === loadingMessageId
                    ? { ...msg, content: accumulatedContent, type: 'text' }
                    : msg
                ))
              } else if (data.type === 'final_metadata') {
                finalMetadata = data.metadata
              } else if (data.type === 'complete') {
                // Streaming complete - add final metadata to the message
                setMessages(prev => prev.map(msg =>
                  msg.id === loadingMessageId
                    ? { ...msg, content: accumulatedContent, type: 'text', metadata: finalMetadata }
                    : msg
                ))
                if (sid && accumulatedContent) {
                  fetch(API_ENDPOINTS.chatMessages, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: sid, role: 'assistant', content: accumulatedContent }),
                  }).catch(() => {})
                }
                console.log('✅ Streaming completed')
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', line)
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ Error with streaming:', error)

      // Fallback to regular API if streaming fails
      try {
        const response = await fetch(API_ENDPOINTS.chat, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: currentInput,
            session_id: sessionId,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setMessages(prev => prev.map(msg =>
            msg.id === loadingMessageId
              ? { ...msg, content: data.response, type: 'text' }
              : msg
          ))
          if (sid && data.response) {
            fetch(API_ENDPOINTS.chatMessages, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ session_id: sid, role: 'assistant', content: data.response }),
            }).catch(() => {})
          }
          if (data.session_id && !sessionId) {
            setSessionId(data.session_id)
          }
        } else {
          throw new Error('Both streaming and regular API failed')
        }
      } catch (fallbackError) {
        console.error('❌ Fallback API also failed:', fallbackError)

        // Final fallback to mock response
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: "I'm having trouble connecting right now, but I'm here to help you learn! What subject interests you?",
          sender: 'ai',
          timestamp: new Date(),
          type: 'text'
        }
        setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId).concat([aiResponse]))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const generateAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase()

    if (input.includes('learn') || input.includes('study')) {
      return "That's fantastic! I can help you create a personalized learning plan. What subject or topic interests you most? Whether it's programming, mathematics, science, languages, or something else entirely, I'll design a curriculum that matches your learning style and goals."
    }

    if (input.includes('ai') || input.includes('artificial intelligence')) {
      return "Artificial Intelligence is an exciting field! 🤖 I can guide you through:\n\n• Machine Learning fundamentals\n• Neural Networks and Deep Learning\n• Natural Language Processing\n• Computer Vision\n• AI Ethics and Applications\n\nWhat aspect of AI would you like to explore first?"
    }

    if (input.includes('programming') || input.includes('coding')) {
      return "Great choice! 💻 Programming opens up endless possibilities. I can help you with:\n\n• Python (beginner-friendly)\n• JavaScript (web development)\n• Java (enterprise applications)\n• C++ (systems programming)\n• And many more!\n\nWhat's your experience level, and what type of projects interest you?"
    }

    if (input.includes('math') || input.includes('mathematics')) {
      return "Mathematics is the foundation of logical thinking! 📐 I can assist with:\n\n• Algebra and Calculus\n• Statistics and Probability\n• Linear Algebra\n• Discrete Mathematics\n• Applied Mathematics\n\nWhat specific area would you like to focus on?"
    }

    return "I understand you're interested in learning! 🌟 To provide you with the best personalized experience, could you tell me more about:\n\n• Your current knowledge level\n• Specific topics you're curious about\n• Your preferred learning style (visual, hands-on, reading, etc.)\n• Your learning goals and timeline\n\nThis will help me create the perfect learning path for you!"
  }

  const [savingPlan, setSavingPlan] = useState(false)
  const handleActionButton = async (actionType: string, planId?: string) => {
    if (actionType === 'view_plan') {
      // Ensure the AI-generated course is saved to Learnings, then open the Learning tab
      setSavingPlan(true)
      try {
        if (sessionId && user?.id) {
          await fetch(API_ENDPOINTS.learningPlanSaveFromSession, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, clerk_user_id: user.id }),
          })
          // Navigate even if save returned an error (plan may already be saved from stream)
        }
        onClose()
        router.push('/dashboard/learning')
      } finally {
        setSavingPlan(false)
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const initialSuggestions = [
    "Start Python basics",
    "Explain variables and data types in Python",
    "Help me write my first Python program",
    "What can I build with Python?"
  ]

  const courseCreationSuggestions = [
    "Complete beginner",
    "Some experience",
    "Advanced",
    "I know another language",
    "Yes",
    "No",
    "A few weeks",
    "A few months",
    "Hands-on projects",
    "Videos and reading"
  ]

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null
  const lastIsAi = lastMessage?.sender === 'ai' && lastMessage?.type !== 'loading'
  const showInitialSuggestions = messages.length <= 1
  const showCourseSuggestions = messages.length > 1 && lastIsAi && !isLoading

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div ref={panelRef} className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-vedya-purple to-vedya-pink p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">AI Learning Assistant</h2>
              <p className="text-white/90">Let's start your personalized learning journey</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages - min-h-0 lets flex shrink so this area scrolls; overscroll-contain stops scroll leaking to background */}
        <div ref={messagesScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-6 space-y-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              userImageUrl={user?.imageUrl}
              onActionClick={handleActionButton}
              actionLoading={savingPlan}
            />
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl p-4 max-w-xs">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-vedya-purple rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-vedya-pink rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-vedya-orange rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestions: initial (first message) and for every AI question during course creation */}
        {(showInitialSuggestions || showCourseSuggestions) && (
          <div className="px-6 pb-4">
            <p className="text-sm text-gray-600 mb-3">
              {showInitialSuggestions ? 'Quick suggestions:' : 'Suggestions for your answer:'}
            </p>
            <div className="flex flex-wrap gap-2">
              {(showInitialSuggestions ? initialSuggestions : courseCreationSuggestions).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="bg-gray-100 hover:bg-vedya-purple/10 text-gray-700 text-sm px-3 py-2 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-6 border-t border-gray-200">
          {initialGreeting && !sessionId && (
            <p className="text-sm text-slate-500 mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-vedya-purple animate-pulse" />
              Preparing your chat...
            </p>
          )}
          <div className="flex space-x-4">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={sessionReady ? "Type your message here..." : "Please wait a moment..."}
              className="flex-1 border border-gray-300 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-vedya-purple focus:border-transparent"
              disabled={isLoading || !sessionReady}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || !sessionReady}
              className="btn-primary px-6 py-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MessageBubbleProps {
  message: Message
  userImageUrl?: string
  onActionClick?: (actionType: string, planId?: string) => void
  actionLoading?: boolean
}

function MessageBubble({ message, userImageUrl, onActionClick, actionLoading }: MessageBubbleProps) {
  const isUser = message.sender === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm overflow-hidden ${isUser
          ? 'bg-vedya-purple text-white'
          : 'bg-gradient-to-br from-vedya-pink to-vedya-orange text-white'
          }`}>
          {isUser ? (
            userImageUrl ? (
              <img
                src={userImageUrl}
                alt="User"
                className="w-full h-full object-cover"
              />
            ) : (
              '👤'
            )
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-vedya-pink to-vedya-orange rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z" />
              </svg>
            </div>
          )}
        </div>

        {/* Message */}
        <div className={`rounded-2xl p-4 ${isUser
          ? 'bg-vedya-purple text-white ml-2'
          : 'bg-gray-100 text-gray-900 mr-2'
          }`}>
          <div className="text-sm leading-relaxed whitespace-pre-line">
            {message.type === 'loading' && message.content === '' ? (
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-vedya-purple rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-vedya-pink rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-vedya-orange rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            ) : (
              message.content
            )}
          </div>

          {/* Action Button */}
          {message.metadata?.show_action_button && !isUser && onActionClick && message.metadata.action_type && (
            <div className="mt-3">
              <button
                onClick={() => onActionClick(message.metadata!.action_type!, message.metadata!.plan_id)}
                disabled={actionLoading}
                className="bg-vedya-purple text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-vedya-purple/90 transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Saving...' : (message.metadata.action_button_text || 'Take Action')}
              </button>
            </div>
          )}

          {message.type !== 'loading' && (
            <div className={`text-xs mt-2 opacity-70 ${isUser ? 'text-white/70' : 'text-gray-500'
              }`}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
