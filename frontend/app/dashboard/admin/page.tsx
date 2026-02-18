'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useIsAdmin } from '../../../lib/useIsAdmin'
import { API_ENDPOINTS } from '../../../lib/api-config'
import 'bootstrap-icons/font/bootstrap-icons.css'

type UserRow = { id: string; clerk_user_id: string | null; email: string; name: string; created_at: string | null }
type PlanRow = { id: string; user_id: string; user_email: string; user_name: string; title: string; summary: string; status: string; created_at: string | null; time_spent_minutes: number; overall_progress: number }
type SessionRow = { id: string; user_id: string; user_email: string; user_name: string; topic: string; created_at: string | null; updated_at: string | null }

type Tab = 'users' | 'plans' | 'sessions'

export default function AdminDashboardPage() {
  const { user } = useUser()
  const { isAdmin, isLoading: adminLoading } = useIsAdmin()
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<UserRow[]>([])
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clerkId = user?.id ?? ''

  const loadUsers = () => {
    if (!clerkId) return
    setLoading(true)
    setError(null)
    fetch(API_ENDPOINTS.adminUsers(clerkId))
      .then((r) => r.json())
      .then((data: { success?: boolean; users?: UserRow[] }) => {
        if (data.success && Array.isArray(data.users)) setUsers(data.users)
        else setUsers([])
      })
      .catch((e) => { setError(e.message); setUsers([]) })
      .finally(() => setLoading(false))
  }

  const loadPlans = () => {
    if (!clerkId) return
    setLoading(true)
    setError(null)
    fetch(API_ENDPOINTS.adminLearningPlans(clerkId))
      .then((r) => r.json())
      .then((data: { success?: boolean; plans?: PlanRow[] }) => {
        if (data.success && Array.isArray(data.plans)) setPlans(data.plans)
        else setPlans([])
      })
      .catch((e) => { setError(e.message); setPlans([]) })
      .finally(() => setLoading(false))
  }

  const loadSessions = () => {
    if (!clerkId) return
    setLoading(true)
    setError(null)
    fetch(API_ENDPOINTS.adminChatSessions(clerkId))
      .then((r) => r.json())
      .then((data: { success?: boolean; sessions?: SessionRow[] }) => {
        if (data.success && Array.isArray(data.sessions)) setSessions(data.sessions)
        else setSessions([])
      })
      .catch((e) => { setError(e.message); setSessions([]) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!clerkId || !isAdmin) return
    if (tab === 'users') loadUsers()
    else if (tab === 'plans') loadPlans()
    else if (tab === 'sessions') loadSessions()
  }, [clerkId, isAdmin, tab])

  const deleteUser = async (userId: string) => {
    if (!clerkId || deletingId) return
    setDeletingId(userId)
    try {
      const res = await fetch(API_ENDPOINTS.adminDeleteUser(userId, clerkId), { method: 'DELETE' })
      if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== userId))
      else setError('Failed to delete user')
    } finally {
      setDeletingId(null)
    }
  }

  const deletePlan = async (planId: string) => {
    if (!clerkId || deletingId) return
    setDeletingId(planId)
    try {
      const res = await fetch(API_ENDPOINTS.adminDeleteLearningPlan(planId, clerkId), { method: 'DELETE' })
      if (res.ok) setPlans((prev) => prev.filter((p) => p.id !== planId))
      else setError('Failed to delete plan')
    } finally {
      setDeletingId(null)
    }
  }

  const deleteSession = async (sessionId: string) => {
    if (!clerkId || deletingId) return
    setDeletingId(sessionId)
    try {
      const res = await fetch(API_ENDPOINTS.adminDeleteChatSession(sessionId, clerkId), { method: 'DELETE' })
      if (res.ok) setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      else setError('Failed to delete session')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')

  if (adminLoading || (!isAdmin && user)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-vedya-purple border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <p className="text-slate-600">You do not have access to the admin dashboard.</p>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'users', label: 'Users', icon: 'bi-people' },
    { id: 'plans', label: 'Learning Plans', icon: 'bi-journal-bookmark' },
    { id: 'sessions', label: 'Chat Sessions', icon: 'bi-chat-dots' },
  ]

  return (
    <div className="bg-gradient-to-br from-slate-900/5 via-white to-indigo-900/5 min-h-[60vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <section className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-1 flex items-center gap-2">
            <i className="bi bi-shield-lock text-indigo-600" />
            Admin Dashboard
          </h1>
          <p className="text-slate-600">Manage all users, learning plans, and chat sessions.</p>
        </section>

        <div className="flex gap-2 mb-6 border-b border-slate-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className={`bi ${t.icon}`} />
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {tab === 'users' && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left p-3 font-medium text-slate-700">Email</th>
                        <th className="text-left p-3 font-medium text-slate-700">Name</th>
                        <th className="text-left p-3 font-medium text-slate-700">Created</th>
                        <th className="p-3 w-24" />
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-3 text-slate-900">{u.email}</td>
                          <td className="p-3 text-slate-600">{u.name || '—'}</td>
                          <td className="p-3 text-slate-500">{formatDate(u.created_at)}</td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => deleteUser(u.id)}
                              disabled={!!deletingId}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded disabled:opacity-50"
                              title="Delete user and all their data"
                            >
                              {deletingId === u.id ? <i className="bi bi-hourglass-split" /> : <i className="bi bi-trash" />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {users.length === 0 && <p className="p-6 text-slate-500 text-center">No users found.</p>}
              </div>
            )}

            {tab === 'plans' && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left p-3 font-medium text-slate-700">Title</th>
                        <th className="text-left p-3 font-medium text-slate-700">Owner</th>
                        <th className="text-left p-3 font-medium text-slate-700">Progress</th>
                        <th className="text-left p-3 font-medium text-slate-700">Created</th>
                        <th className="p-3 w-24" />
                      </tr>
                    </thead>
                    <tbody>
                      {plans.map((p) => (
                        <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-3 text-slate-900 font-medium">{p.title}</td>
                          <td className="p-3 text-slate-600">{p.user_email}</td>
                          <td className="p-3 text-slate-600">{p.overall_progress}%</td>
                          <td className="p-3 text-slate-500">{formatDate(p.created_at)}</td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => deletePlan(p.id)}
                              disabled={!!deletingId}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded disabled:opacity-50"
                              title="Delete plan"
                            >
                              {deletingId === p.id ? <i className="bi bi-hourglass-split" /> : <i className="bi bi-trash" />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {plans.length === 0 && <p className="p-6 text-slate-500 text-center">No learning plans found.</p>}
              </div>
            )}

            {tab === 'sessions' && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left p-3 font-medium text-slate-700">Topic</th>
                        <th className="text-left p-3 font-medium text-slate-700">Owner</th>
                        <th className="text-left p-3 font-medium text-slate-700">Updated</th>
                        <th className="p-3 w-24" />
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => (
                        <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-3 text-slate-900 max-w-xs truncate" title={s.topic}>{s.topic}</td>
                          <td className="p-3 text-slate-600">{s.user_email}</td>
                          <td className="p-3 text-slate-500">{formatDate(s.updated_at)}</td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => deleteSession(s.id)}
                              disabled={!!deletingId}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded disabled:opacity-50"
                              title="Delete session"
                            >
                              {deletingId === s.id ? <i className="bi bi-hourglass-split" /> : <i className="bi bi-trash" />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {sessions.length === 0 && <p className="p-6 text-slate-500 text-center">No chat sessions found.</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
