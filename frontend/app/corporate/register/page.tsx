'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { API_ENDPOINTS } from '../../../lib/api-config'

export default function CorporateRegisterPage() {
  const { user } = useUser()
  const router = useRouter()
  const [orgName, setOrgName] = useState('')
  const [seatCount, setSeatCount] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const adminEmail = user?.primaryEmailAddress?.emailAddress ?? ''
  const adminClerkId = user?.id ?? ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const resp = await fetch(API_ENDPOINTS.orgRegister, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_clerk_user_id: adminClerkId,
          org_name: orgName,
          seat_count: seatCount,
          product_type: 'corporate',
        }),
      })
      if (!resp.ok) {
        const data = await resp.json()
        throw new Error(data.detail ?? 'Registration failed')
      }
      router.push('/corporate/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-vedya-purple to-vedya-pink flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Register Your Organisation</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organisation Name</label>
            <input
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="Acme Corporation"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
            <input
              type="email"
              readOnly
              value={adminEmail}
              className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seat Count</label>
            <input
              type="number"
              required
              min={1}
              value={seatCount}
              onChange={(e) => setSeatCount(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Registering…' : 'Register Organisation'}
          </button>
        </form>
      </div>
    </div>
  )
}
