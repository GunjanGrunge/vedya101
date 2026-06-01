'use client'

import type { FreemiumStatus } from '../lib/useFreemiumStatus'

interface UpgradePromptProps {
  usage: FreemiumStatus
  onDismiss?: () => void
}

export default function UpgradePrompt({ usage, onDismiss }: UpgradePromptProps) {
  const sessionPct =
    usage.session_hours_limit && usage.session_hours_limit > 0
      ? Math.min(100, Math.round((usage.session_hours_used / usage.session_hours_limit) * 100))
      : 100

  const subjectPct =
    usage.subject_limit && usage.subject_limit > 0
      ? Math.min(100, Math.round(((usage.subjects_accessed?.length ?? 0) / usage.subject_limit) * 100))
      : 100

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
    >
      <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-vedya-purple to-vedya-pink">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
            </svg>
          </div>
          <div>
            <h2 id="upgrade-title" className="text-xl font-bold text-gray-900">
              Freemium Limit Reached
            </h2>
            <p className="text-sm text-gray-500">Upgrade to continue learning</p>
          </div>
        </div>

        <div className="mb-6 space-y-4">
          {/* Session hours usage */}
          {usage.session_hours_limit !== null && (
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-600">Session hours</span>
                <span className="font-medium text-gray-900">
                  {usage.session_hours_used.toFixed(1)} / {usage.session_hours_limit}h
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-vedya-purple to-vedya-pink transition-all"
                  style={{ width: `${sessionPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Subject access usage */}
          {usage.subject_limit !== null && (
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-600">Subjects accessed</span>
                <span className="font-medium text-gray-900">
                  {usage.subjects_accessed?.length ?? 0} / {usage.subject_limit}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-vedya-purple to-vedya-pink transition-all"
                  style={{ width: `${subjectPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <p className="mb-6 text-sm text-gray-600">
          You&apos;ve reached your freemium limit. Upgrade to access unlimited sessions, all subjects,
          and the full VEDYA learning experience.
        </p>

        <button
          className="w-full rounded-xl bg-gradient-to-r from-vedya-purple to-vedya-pink py-3 text-base font-semibold text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
          onClick={() => {
            // Placeholder — pricing page navigation handled by parent/router
            window.location.href = '/pricing'
          }}
        >
          Upgrade to Pro
        </button>
      </div>
    </div>
  )
}
