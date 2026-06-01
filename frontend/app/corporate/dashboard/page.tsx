'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { API_ENDPOINTS } from '../../../lib/api-config'

type OrgRecord = {
  id: string
  name: string
  seat_count: number
  product_type: string
}

type MemberRecord = {
  id: string
  invited_email: string
  status: string
}

export default function CorporateDashboardPage() {
  const { user } = useUser()
  const clerkId = user?.id ?? ''
  const [org, setOrg] = useState<OrgRecord | null>(null)
  const [members, setMembers] = useState<MemberRecord[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadOrg = useCallback(async () => {
    if (!clerkId) return
    setLoading(true)
    try {
      const resp = await fetch(API_ENDPOINTS.orgMe(clerkId))
      const data = await resp.json()
      setOrg(data.org ?? null)
    } finally {
      setLoading(false)
    }
  }, [clerkId])

  useEffect(() => {
    loadOrg()
  }, [loadOrg])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!org) return
    setInviteError(null)
    setInviteSuccess(null)
    setInviteLoading(true)
    try {
      const resp = await fetch(API_ENDPOINTS.orgInvite, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: org.id, invited_email: inviteEmail }),
      })
      if (!resp.ok) {
        const data = await resp.json()
        throw new Error(data.detail ?? 'Invitation failed')
      }
      const data = await resp.json()
      setMembers((prev) => [...prev, data.member])
      setInviteSuccess(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setInviteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    )
  }

  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No organisation found.</p>
          <a href="/corporate/register" className="text-purple-600 underline">
            Register your organisation
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-vedya-purple to-vedya-pink p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{org.name}</h1>
          <p className="text-gray-500 text-sm">Seats: {org.seat_count} · Type: {org.product_type}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Invite Employee</h2>
          <form onSubmit={handleInvite} className="flex gap-3 mb-4">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="employee@company.com"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <button
              type="submit"
              disabled={inviteLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              {inviteLoading ? 'Sending…' : 'Invite'}
            </button>
          </form>
          {inviteSuccess && <p className="text-green-600 text-sm mb-2">{inviteSuccess}</p>}
          {inviteError && <p className="text-red-500 text-sm mb-2">{inviteError}</p>}

          {members.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Pending Invitations</h3>
              <ul className="space-y-1">
                {members.map((m) => (
                  <li key={m.id} className="text-sm text-gray-700 flex justify-between">
                    <span>{m.invited_email}</span>
                    <span className="text-gray-400">{m.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
