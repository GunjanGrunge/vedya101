'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { toastr } from 'react-redux-toastr'
import { API_ENDPOINTS } from '../../../lib/api-config'
import AILoader from '../../../components/AILoader'
import 'bootstrap-icons/font/bootstrap-icons.css'

interface Plan {
  id: string
  title: string
  subject: string
  description: string
  totalDuration: string
  difficulty: string
  learningStyle: string
  overallProgress: number
  createdAt: string
  modules?: { id: string; title: string; duration: string }[]
}

export default function DashboardLearningPage() {
  const { user } = useUser()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    setFetchError(null)
    const url = API_ENDPOINTS.learningPlansForUser(user.id)
    fetch(url)
      .then((r) => {
        if (!r.ok) {
          setFetchError(r.status === 400 ? 'Missing user. Try signing out and back in.' : `Could not load plans (${r.status}).`)
          return null
        }
        return r.json()
      })
      .then((data: { success?: boolean; plans?: Plan[] } | null) => {
        if (data?.success && Array.isArray(data.plans)) setPlans(data.plans)
        else setPlans([])
      })
      .catch((e) => {
        setPlans([])
        setFetchError('Network error. Is the API running?')
      })
      .finally(() => setLoading(false))
  }, [user?.id])

  const formatDate = (iso: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const handleDeleteClick = (e: React.MouseEvent, plan: Plan) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user?.id || deletingId) return
    toastr.confirm(
      'Are you sure you want to delete this course? You won\'t get the certificate. You need to start from 0 again if you delete this.',
      {
        okText: 'Yes',
        cancelText: 'No',
        onOk: () => deletePlan(plan.id),
      }
    )
  }

  const deletePlan = async (planId: string) => {
    if (!user?.id) return
    setDeletingId(planId)
    try {
      const res = await fetch(API_ENDPOINTS.learningPlanDelete(planId, user.id), { method: 'DELETE' })
      if (res.ok) {
        setPlans((prev) => prev.filter((p) => p.id !== planId))
        toastr.success('Course deleted', 'The course has been removed.')
      } else {
        const data = await res.json().catch(() => ({}))
        toastr.error('Delete failed', data.detail || 'Could not delete the course.')
      }
    } catch (e) {
      toastr.error('Delete failed', 'Network error. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-vedya-purple/5 via-white to-vedya-pink/5 min-h-[60vh] flex items-center justify-center">
        <AILoader message="Loading your courses..." subMessage="Fetching learning plans..." />
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-vedya-purple/5 via-white to-vedya-pink/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            My Learning
          </h1>
          <p className="text-slate-600">
            Your saved courses. Start learning, track progress, and grow.
          </p>
        </div>

        {fetchError && (
          <div className="rounded-xl bg-amber-50 text-amber-800 px-4 py-3 mb-6 flex items-center gap-2">
            <i className="bi bi-exclamation-triangle" />
            <span>{fetchError}</span>
          </div>
        )}
        {plans.length === 0 ? (
          <div className="rounded-3xl bg-white/90 backdrop-blur-sm ring-1 ring-black/5 shadow-xl p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-vedya-purple/20 to-vedya-pink/20 flex items-center justify-center mx-auto mb-6">
              <i className="bi bi-journal-bookmark-fill text-4xl text-vedya-purple" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No courses yet</h2>
            <p className="text-slate-600 max-w-md mx-auto mb-8">
              Create a learning plan in the chat. Tell the AI what you want to learn and it will build a personalized course—then it will appear here.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-vedya-purple to-vedya-pink hover:shadow-lg hover:scale-105 transition-all"
            >
              <i className="bi bi-chat-dots-fill" /> Start chat to create a plan
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="group relative rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-black/5 shadow-sm hover:shadow-xl hover:ring-vedya-purple/20 transition-all duration-300 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={(e) => handleDeleteClick(e, plan)}
                  disabled={!!deletingId}
                  className="absolute top-3 right-3 z-10 p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  title="Delete course"
                  aria-label="Delete course"
                >
                  <i className={deletingId === plan.id ? 'bi bi-hourglass-split' : 'bi bi-trash'} />
                </button>
                <Link
                  href={`/dashboard/learning/${plan.id}`}
                  className="block"
                >
                  <div className="h-2 bg-gradient-to-r from-vedya-purple to-vedya-pink" />
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-2 mb-3 pr-8">
                      <span className="text-xs font-semibold uppercase tracking-wide text-vedya-purple">
                        {plan.subject}
                      </span>
                      <span className="text-xs text-slate-500">{plan.totalDuration}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-vedya-purple transition-colors line-clamp-2">
                      {plan.title}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                      {plan.description || 'Personalized learning plan'}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
                        {plan.difficulty}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-vedya-purple/10 text-vedya-purple text-xs font-medium">
                        {plan.learningStyle}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <i className="bi bi-collection" />
                        <span>{plan.modules?.length ?? 0} modules</span>
                      </div>
                      <span className="text-vedya-purple font-medium text-sm group-hover:underline">
                        View plan →
                      </span>
                    </div>
                    {plan.createdAt && (
                      <p className="text-xs text-slate-400 mt-3">
                        Created {formatDate(plan.createdAt)}
                      </p>
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
