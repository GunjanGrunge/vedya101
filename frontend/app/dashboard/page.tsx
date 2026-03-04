'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useDashboardProfile } from './DashboardProfileContext'
import ChatInterface from '../../components/ChatInterface'
import type { ChatMessageFromApi } from '../../components/ChatInterface'
import { API_ENDPOINTS } from '../../lib/api-config'
import 'bootstrap-icons/font/bootstrap-icons.css'

type ChatSessionItem = { id: string; created_at: string | null; updated_at: string | null; topic?: string | null }

type PlanSummary = {
  id: string
  title: string
  subject: string
  totalDuration: string
  overallProgress: number
  timeSpentMinutes?: number
  modules?: { id: string; title: string; duration: string }[]
}

export default function DashboardPage() {
  const { user } = useUser()
  const { displayName: cachedName, isLoading } = useDashboardProfile() ?? {}
  const [showChat, setShowChat] = useState(false)
  const [showPreviousChats, setShowPreviousChats] = useState(false)
  const [previousSessions, setPreviousSessions] = useState<ChatSessionItem[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [continueSessionId, setContinueSessionId] = useState<string | null>(null)
  const [initialMessages, setInitialMessages] = useState<ChatMessageFromApi[] | null>(null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [plans, setPlans] = useState<PlanSummary[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    setLoadingPlans(true)
    fetch(API_ENDPOINTS.learningPlansForUser(user.id))
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { success?: boolean; plans?: PlanSummary[] } | null) => {
        if (data?.success && Array.isArray(data.plans)) setPlans(data.plans)
        else setPlans([])
      })
      .catch(() => setPlans([]))
      .finally(() => setLoadingPlans(false))
  }, [user?.id])

  useEffect(() => {
    if (showPreviousChats && user?.id) {
      setLoadingSessions(true)
      fetch(API_ENDPOINTS.chatSessionsList(user.id))
        .then((r) => r.ok ? r.json() : null)
        .then((data: { sessions?: ChatSessionItem[] } | null) => {
          if (data?.sessions) setPreviousSessions(data.sessions)
          else setPreviousSessions([])
        })
        .catch(() => setPreviousSessions([]))
        .finally(() => setLoadingSessions(false))
    }
  }, [showPreviousChats, user?.id])

  const openNewChat = () => {
    setContinueSessionId(null)
    setInitialMessages(null)
    setShowPreviousChats(false)
    setShowChat(true)
  }

  const openPreviousChat = async (sessionId: string) => {
    setLoadingMessages(true)
    setShowPreviousChats(false)
    try {
      const res = await fetch(API_ENDPOINTS.chatMessagesList(sessionId))
      const data = res.ok ? (await res.json()) as { messages?: ChatMessageFromApi[] } : null
      const list = data?.messages ?? []
      setContinueSessionId(sessionId)
      setInitialMessages(list)
      setShowChat(true)
    } catch {
      setInitialMessages([])
      setContinueSessionId(sessionId)
      setShowChat(true)
    } finally {
      setLoadingMessages(false)
    }
  }

  const deleteChat = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    if (!user?.id || deletingId) return
    setDeletingId(sessionId)
    try {
      const res = await fetch(API_ENDPOINTS.chatSessionDelete(sessionId, user.id), { method: 'DELETE' })
      if (res.ok) {
        setPreviousSessions((prev) => prev.filter((s) => s.id !== sessionId))
        setSelectedIds((prev) => { const n = new Set(prev); n.delete(sessionId); return n })
      }
    } finally {
      setDeletingId(null)
    }
  }

  const toggleSelect = (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(sessionId)) next.delete(sessionId)
      else next.add(sessionId)
      return next
    })
  }

  const selectAll = () => {
    if (previousSessions.length === 0) return
    const allSelected = previousSessions.every((s) => selectedIds.has(s.id))
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(previousSessions.map((s) => s.id)))
  }

  const deleteSelected = async () => {
    if (!user?.id || selectedIds.size === 0 || deletingId) return
    const ids = Array.from(selectedIds)
    setDeletingId('_batch')
    try {
      for (const sessionId of ids) {
        const res = await fetch(API_ENDPOINTS.chatSessionDelete(sessionId, user.id), { method: 'DELETE' })
        if (res.ok) {
          setPreviousSessions((prev) => prev.filter((s) => s.id !== sessionId))
          setSelectedIds((prev) => { const n = new Set(prev); n.delete(sessionId); return n })
        }
      }
    } finally {
      setDeletingId(null)
    }
  }

  const formatSessionDate = (iso: string | null) => {
    if (!iso) return '—'
    const d = new Date(iso)
    const now = new Date()
    const sameDay = d.toDateString() === now.toDateString()
    return sameDay ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString()
  }

  const estimatedHoursFromPlans = (): number => {
    const hrsPerWeek = 2
    return plans.reduce((acc, p) => {
      const match = (p.totalDuration || '').match(/(\d+)\s*weeks?/i)
      return acc + (match ? parseInt(match[1], 10) * hrsPerWeek : 0)
    }, 0)
  }

  const coursesInProgress = plans.length
  const estimatedHours = estimatedHoursFromPlans()

  const displayName =
    (cachedName && cachedName.length > 0)
      ? cachedName
      : (user?.firstName || 'Learner')

  return (
    <div className="bg-gradient-to-br from-vedya-purple/5 via-white to-vedya-pink/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          {/* Welcome */}
          <section className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Welcome back, <span className="gradient-text">{displayName}</span>
            </h1>
            <p className="text-slate-600">
              Your learning hub. More features will appear here as we build them.
            </p>
          </section>

          {/* Stat cards: courses, hours, streak — with loading skeletons */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            {/* Courses in progress */}
            <Link
              href="/dashboard/learning"
              className="rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-black/5 shadow-[0_14px_30px_rgba(0,0,0,0.08)] p-6 hover:shadow-lg hover:ring-vedya-purple/20 transition-all duration-300 block text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-vedya-purple to-vedya-pink flex items-center justify-center text-white mb-4">
                <i className="bi bi-book text-xl" />
              </div>
              {loadingPlans ? (
                <>
                  <div className="h-8 w-12 bg-slate-200 rounded animate-pulse mb-2" />
                  <div className="h-4 w-32 bg-slate-100 rounded animate-pulse mb-2" />
                  <div className="h-3 w-24 bg-slate-100 rounded animate-pulse mt-3" />
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-slate-900">{coursesInProgress}</p>
                  <p className="text-sm text-slate-600 mb-2">Courses in progress</p>
                  {plans.length > 0 ? (
                    <div className="text-xs text-slate-500 space-y-0.5 mt-2 pt-2 border-t border-slate-100">
                      {plans.slice(0, 3).map((p) => (
                        <p key={p.id} className="truncate" title={p.title}>
                          {p.title}
                        </p>
                      ))}
                      {plans.length > 3 && (
                        <p className="text-vedya-purple font-medium">+{plans.length - 3} more →</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">Start a plan in chat to see it here</p>
                  )}
                </>
              )}
            </Link>

            {/* Est. hours */}
            <div className="rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-black/5 shadow-[0_14px_30px_rgba(0,0,0,0.08)] p-6 hover:shadow-lg hover:ring-vedya-purple/20 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-vedya-pink to-vedya-orange flex items-center justify-center text-white mb-4">
                <i className="bi bi-clock text-xl" />
              </div>
              {loadingPlans ? (
                <>
                  <div className="h-8 w-16 bg-slate-200 rounded animate-pulse mb-2" />
                  <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-slate-900">{estimatedHours} hrs</p>
                  <p className="text-sm text-slate-600">Est. hours (from your courses)</p>
                </>
              )}
            </div>

            {/* Streak (no loading — placeholder until backend) */}
            <div className="rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-black/5 shadow-[0_14px_30px_rgba(0,0,0,0.08)] p-6 hover:shadow-lg hover:ring-vedya-purple/20 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-vedya-orange to-vedya-yellow flex items-center justify-center text-white mb-4">
                <i className="bi bi-fire text-xl" />
              </div>
              <p className="text-2xl font-bold text-slate-900">—</p>
              <p className="text-sm text-slate-600">Current streak</p>
            </div>
          </section>

          {/* Quick actions */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Quick actions</h2>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={openNewChat}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-vedya-purple to-vedya-pink hover:shadow-lg hover:scale-105 transition-all duration-300"
              >
                <i className="bi bi-chat-dots-fill" /> Start learning (chat)
              </button>
              <button
                type="button"
                onClick={() => setShowPreviousChats(true)}
                disabled={loadingMessages}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-slate-700 bg-white border-2 border-gray-200 hover:border-vedya-purple/50 hover:shadow-md transition-all duration-300 disabled:opacity-60"
              >
                <i className="bi bi-chat-left-text" /> Previous chats
              </button>
            </div>
          </section>

          {/* Previous chats modal */}
          {showPreviousChats && (
            <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => { setShowPreviousChats(false); setSelectedIds(new Set()) }}>
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-lg font-semibold text-slate-900">Previous chats</h3>
                  <div className="flex items-center gap-2">
                    {previousSessions.length > 0 && (
                      <>
                        <button type="button" onClick={selectAll} className="text-sm text-slate-600 hover:text-vedya-purple">
                          {previousSessions.every((s) => selectedIds.has(s.id)) ? 'Clear' : 'Select all'}
                        </button>
                        {selectedIds.size > 0 && (
                          <button
                            type="button"
                            onClick={deleteSelected}
                            disabled={!!deletingId}
                            className="text-sm px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                          >
                            Delete selected ({selectedIds.size})
                          </button>
                        )}
                      </>
                    )}
                    <button type="button" onClick={() => { setShowPreviousChats(false); setSelectedIds(new Set()) }} className="p-2 rounded-lg hover:bg-gray-100 text-slate-600">
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
                  {loadingSessions ? (
                    <p className="text-slate-500 text-sm">Loading...</p>
                  ) : previousSessions.length === 0 ? (
                    <p className="text-slate-500 text-sm">No previous chats yet. Start a new one above.</p>
                  ) : (
                    previousSessions.map((s) => (
                      <div
                        key={s.id}
                        className="group flex items-center gap-2 rounded-xl border border-gray-200 hover:border-vedya-purple/40 hover:bg-vedya-purple/5 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={(e) => toggleSelect(s.id, e)}
                          className="shrink-0 p-2 rounded-lg text-slate-500 hover:text-vedya-purple hover:bg-vedya-purple/10"
                          title={selectedIds.has(s.id) ? 'Deselect' : 'Select'}
                          aria-label={selectedIds.has(s.id) ? 'Deselect' : 'Select'}
                        >
                          <i className={`bi ${selectedIds.has(s.id) ? 'bi-check-square-fill text-vedya-purple' : 'bi-square'}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openPreviousChat(s.id)}
                          className="flex-1 min-w-0 text-left px-2 py-3"
                        >
                          <span className="text-slate-800 font-medium block truncate pr-2" title={s.topic ?? undefined}>
                            {(s.topic && s.topic.length > 0) ? s.topic : 'Chat'}
                          </span>
                          <span className="text-slate-500 text-sm">{formatSessionDate(s.updated_at ?? s.created_at)}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => deleteChat(e, s.id)}
                          disabled={!!deletingId}
                          className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Delete chat"
                        >
                          <i className={deletingId === s.id || deletingId === '_batch' ? 'bi bi-hourglass-split' : 'bi bi-trash'} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <ChatInterface
            isOpen={showChat}
            onClose={() => { setShowChat(false); setContinueSessionId(null); setInitialMessages(null) }}
            initialGreeting="Lets start Learning Python Today."
            continueSessionId={continueSessionId}
            initialMessages={initialMessages}
          />

          {/* Progress section */}
          <section className="rounded-2xl bg-white/80 backdrop-blur-sm ring-1 ring-black/5 shadow-[0_14px_30px_rgba(0,0,0,0.08)] p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-vedya-purple/10 flex items-center justify-center text-vedya-purple">
                <i className="bi bi-speedometer2 text-2xl" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Your progress</h3>
                <p className="text-sm text-slate-600">Track completion across your courses</p>
              </div>
            </div>

            {loadingPlans ? (
              <div className="py-8 text-center text-slate-500">
                <i className="bi bi-arrow-repeat animate-spin text-2xl" />
                <p className="mt-2 text-sm">Loading progress...</p>
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-slate-600 mb-4">No courses yet. Create a learning plan in chat and it will show here.</p>
                <Link
                  href="/dashboard"
                  onClick={(e) => { e.preventDefault(); openNewChat(); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-vedya-purple to-vedya-pink hover:shadow-lg transition-all"
                >
                  <i className="bi bi-chat-dots-fill" /> Start chat to create a plan
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Overall progress</span>
                    <span className="text-sm font-bold text-vedya-purple">
                      {plans.length === 0 ? 0 : Math.round(plans.reduce((a, p) => a + (p.overallProgress ?? 0), 0) / plans.length)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-vedya-purple to-vedya-pink transition-all duration-500"
                      style={{ width: `${plans.length === 0 ? 0 : Math.min(100, plans.reduce((a, p) => a + (p.overallProgress ?? 0), 0) / plans.length)}%` }}
                    />
                  </div>
                </div>
                <ul className="space-y-3">
                  {plans.map((plan) => (
                    <li key={plan.id}>
                      <Link
                        href={`/dashboard/learning/${plan.id}`}
                        className="block rounded-xl border border-slate-200 hover:border-vedya-purple/40 hover:bg-vedya-purple/5 p-4 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-medium text-slate-900 truncate flex-1">{plan.title}</span>
                          <span className="text-sm font-semibold text-vedya-purple shrink-0">{plan.overallProgress ?? 0}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-vedya-purple to-vedya-pink transition-all"
                            style={{ width: `${Math.min(100, plan.overallProgress ?? 0)}%` }}
                          />
                        </div>
                        {(plan.modules?.length != null || plan.timeSpentMinutes != null) && (
                          <p className="text-xs text-slate-500 mt-1.5">
                            {plan.modules?.length ?? 0} modules · {plan.totalDuration}
                            {plan.timeSpentMinutes != null && plan.timeSpentMinutes > 0 && (
                              <> · {(plan.timeSpentMinutes / 60).toFixed(1)} hrs spent</>
                            )}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 text-center">
                  <Link
                    href="/dashboard/learning"
                    className="text-sm font-medium text-vedya-purple hover:underline"
                  >
                    View all courses →
                  </Link>
                </div>
              </>
            )}
          </section>
      </div>
    </div>
  )
}
