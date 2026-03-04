'use client'

import { use, useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { API_ENDPOINTS } from '../../../../lib/api-config'
import AILoader from '../../../../components/AILoader'
import 'bootstrap-icons/font/bootstrap-icons.css'

interface Module {
  id: string
  title: string
  description: string
  duration: string
  status: string
  progress: number
  tasks?: { id: string; title: string; description: string; status: string; estimatedTime: string }[]
}

interface Plan {
  id: string
  title: string
  subject: string
  description: string
  totalDuration: string
  difficulty: string
  learningStyle: string
  overallProgress: number
  timeSpentMinutes?: number
  progressData?: Record<string, unknown>
  modules: Module[]
  plan_data?: Record<string, unknown>
}

function parseEstimatedHours(estimatedTime: string): number {
  const match = (estimatedTime || '').match(/(\d+)\s*hrs?/i)
  return match ? parseInt(match[1], 10) : 0
}

type PageProps = { params: Promise<{ id: string }> }

export default function PlanDetailPage({ params }: PageProps) {
  const { id: planId } = use(params)
  const { user } = useUser()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedModule, setExpandedModule] = useState<string | null>(null)
  const [updatingProgress, setUpdatingProgress] = useState(false)

  useEffect(() => {
    if (!user?.id || !planId) return
    fetch(API_ENDPOINTS.learningPlanById(planId, user.id))
      .then((r) => {
        if (!r.ok) return null
        return r.json()
      })
      .then((data: { success?: boolean; plan?: Plan } | null) => {
        if (data?.success && data.plan) {
          setPlan(data.plan)
          if (data.plan.modules?.length) setExpandedModule(data.plan.modules[0].id)
        } else setPlan(null)
      })
      .catch(() => setPlan(null))
      .finally(() => setLoading(false))
  }, [user?.id, planId])

  const startLearning = () => {
    const firstMod = plan?.modules?.[0]
    if (firstMod) setExpandedModule(firstMod.id)
    window.open(`/teaching?plan=${planId}&module=${firstMod?.id ?? ''}`, '_blank', 'width=1200,height=800')
  }

  const estimatedTotalHours = plan?.modules?.reduce(
    (acc, mod) => acc + (mod.tasks?.reduce((a, t) => a + parseEstimatedHours(t.estimatedTime), 0) ?? 0),
    0
  ) ?? 0
  const timeSpentMinutes = plan?.timeSpentMinutes ?? 0
  const timeSpentHours = Math.round((timeSpentMinutes / 60) * 10) / 10
  const remainingHours = Math.max(0, estimatedTotalHours - timeSpentMinutes / 60)

  const markModuleComplete = async (mod: Module) => {
    if (!user?.id || !plan || updatingProgress) return
    const modulesProgress = (plan.progressData?.modules as Record<string, { status: string; progress: number }>) ?? {}
    const completedCount = Object.values(modulesProgress).filter((m) => m?.status === 'completed').length
    const totalModules = plan.modules?.length ?? 1
    const newCompletedCount = modulesProgress[mod.id]?.status === 'completed' ? completedCount : completedCount + 1
    const newOverallProgress = Math.min(100, Math.round((100 * newCompletedCount) / totalModules))
    const modEstimatedHrs = mod.tasks?.reduce((a, t) => a + parseEstimatedHours(t.estimatedTime), 0) ?? 0
    const addMinutes = modulesProgress[mod.id]?.status === 'completed' ? 0 : Math.round(modEstimatedHrs * 60)
    const newProgressData = {
      ...(plan.progressData ?? {}),
      modules: {
        ...modulesProgress,
        [mod.id]: { status: 'completed' as const, progress: 100 },
      },
    }
    setUpdatingProgress(true)
    try {
      const res = await fetch(API_ENDPOINTS.learningPlanProgress(planId, user.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          time_spent_minutes: timeSpentMinutes + addMinutes,
          overall_progress: newOverallProgress,
          progress_data: newProgressData,
        }),
      })
      if (res.ok) {
        setPlan((prev) =>
          prev
            ? {
                ...prev,
                timeSpentMinutes: (prev.timeSpentMinutes ?? 0) + addMinutes,
                overallProgress: newOverallProgress,
                progressData: newProgressData,
                modules: prev.modules.map((m) =>
                  m.id === mod.id ? { ...m, status: 'completed' as const, progress: 100 } : m
                ),
              }
            : null
        )
      }
    } finally {
      setUpdatingProgress(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-vedya-purple/5 via-white to-vedya-pink/5 min-h-[60vh] flex items-center justify-center">
        <AILoader message="Loading your course..." subMessage="Almost there..." />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="bg-gradient-to-br from-vedya-purple/5 via-white to-vedya-pink/5 min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Course not found</h2>
          <p className="text-slate-600 mb-4">This plan may have been removed or you don’t have access.</p>
          <Link href="/dashboard/learning" className="text-vedya-purple font-medium hover:underline">
            ← Back to My Learning
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-vedya-purple/5 via-white to-vedya-pink/5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <Link
          href="/dashboard/learning"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-vedya-purple text-sm font-medium mb-6"
        >
          <i className="bi bi-arrow-left" /> Back to My Learning
        </Link>

        <div className="rounded-3xl bg-white/90 backdrop-blur-sm ring-1 ring-black/5 shadow-xl overflow-hidden mb-10">
          <div className="h-2 bg-gradient-to-r from-vedya-purple to-vedya-pink" />
          <div className="p-8 md:p-10">
            <span className="text-xs font-semibold uppercase tracking-wide text-vedya-purple">
              {plan.subject}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-2 mb-4">
              {plan.title}
            </h1>
            <p className="text-slate-600 mb-6">
              {plan.description || 'Your personalized learning path.'}
            </p>
            <div className="flex flex-wrap gap-3 mb-6">
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium">
                <i className="bi bi-clock" /> {plan.totalDuration}
              </span>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-vedya-purple/10 text-vedya-purple text-sm font-medium">
                {plan.difficulty}
              </span>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-vedya-pink/10 text-vedya-pink text-sm font-medium">
                {plan.learningStyle}
              </span>
            </div>
            <button
              type="button"
              onClick={startLearning}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-vedya-purple to-vedya-pink hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              <i className="bi bi-play-fill" /> Start learning
            </button>
          </div>
        </div>

        <h2 className="text-lg font-bold text-slate-900 mb-4">Course content</h2>
        <div className="space-y-3">
          {plan.modules?.map((mod) => (
            <div
              key={mod.id}
              className="rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-black/5 shadow-sm overflow-hidden"
            >
              <div className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50/50 transition-colors gap-3">
                <button
                  type="button"
                  onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}
                  className="flex-1 flex items-center justify-between min-w-0"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-vedya-purple/20 to-vedya-pink/20 flex items-center justify-center text-vedya-purple font-bold shrink-0">
                      {plan.modules.indexOf(mod) + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900">{mod.title}</h3>
                      <p className="text-sm text-slate-500">{mod.duration}</p>
                    </div>
                  </div>
                  <i className={`bi text-xl text-slate-400 transition-transform shrink-0 ml-2 ${expandedModule === mod.id ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                </button>
                {mod.status === 'completed' ? (
                  <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vedya-purple/10 text-vedya-purple text-sm font-medium">
                    <i className="bi bi-check2-square-fill" /> Completed
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); markModuleComplete(mod) }}
                    disabled={updatingProgress}
                    className="shrink-0 text-sm font-medium px-3 py-1.5 rounded-lg bg-vedya-purple/10 text-vedya-purple hover:bg-vedya-purple/20 disabled:opacity-50"
                    title="Mark this module as completed"
                  >
                    {updatingProgress ? '…' : 'Mark complete'}
                  </button>
                )}
              </div>
              {expandedModule === mod.id && (
                <div className="px-5 pb-5 pt-0 border-t border-slate-100">
                  <p className="text-sm text-slate-600 mt-3 mb-4">{mod.description}</p>
                  {mod.tasks?.length ? (
                    <ul className="space-y-2">
                      {mod.tasks.map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center gap-3 py-2 px-3 rounded-xl bg-slate-50 text-sm"
                        >
                          <i className={mod.status === 'completed' ? 'bi bi-check2-square-fill text-vedya-purple' : 'bi bi-check2-square text-slate-400'} />
                          <span className="flex-1 text-slate-700">{t.title}</span>
                          <span className="text-slate-500 text-xs">{t.estimatedTime}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => window.open(`/teaching?plan=${planId}&module=${mod.id}`, '_blank', 'width=1200,height=800')}
                      className="text-sm font-medium text-vedya-purple hover:underline"
                    >
                      Start this module →
                    </button>
                    {mod.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => markModuleComplete(mod)}
                        disabled={updatingProgress}
                        className="text-sm font-medium px-3 py-1.5 rounded-lg bg-vedya-purple/10 text-vedya-purple hover:bg-vedya-purple/20 disabled:opacity-50"
                      >
                        {updatingProgress ? 'Updating…' : 'Mark complete'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
