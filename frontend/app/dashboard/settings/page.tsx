'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { API_ENDPOINTS } from '../../../lib/api-config'
import AILoader from '../../../components/AILoader'
import { useDashboardProfile } from '../DashboardProfileContext'
import 'bootstrap-icons/font/bootstrap-icons.css'

const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France',
  'Spain', 'Japan', 'Brazil', 'Mexico', 'Italy', 'Netherlands', 'South Korea', 'Singapore',
  'Other'
]

const PROGRAMMING_LANGUAGES = [
  'Python', 'JavaScript', 'TypeScript', 'Java', 'C', 'C++', 'C#', 'Go', 'Rust',
  'Ruby', 'PHP', 'Swift', 'Kotlin', 'R', 'SQL', 'Other'
]

const EDUCATIONAL_STATUSES = [
  'High School',
  'Some College',
  "Bachelor's Degree",
  "Master's Degree",
  'PhD',
  'Other'
]

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
]

interface OnboardingFormData {
  full_name: string
  address: string
  gender: string
  country: string
  age: string
  languages_to_learn: string[]
  educational_status: string
}

const emptyForm: OnboardingFormData = {
  full_name: '',
  address: '',
  gender: '',
  country: '',
  age: '',
  languages_to_learn: [],
  educational_status: ''
}

export default function DashboardSettingsPage() {
  const { user } = useUser()
  const { refreshDisplayName } = useDashboardProfile() ?? {}
  const submitIdRef = useRef(0)
  const [form, setForm] = useState<OnboardingFormData>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    setLoading(true)
    fetch(API_ENDPOINTS.onboardingData(user.id))
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (cancelled || !data?.data) return
        const d = data.data as Record<string, unknown>
        setForm({
          full_name: (d.full_name as string) ?? '',
          address: (d.address as string) ?? '',
          gender: (d.gender as string) ?? '',
          country: (d.country as string) ?? '',
          age: d.age != null ? String(d.age) : '',
          languages_to_learn: Array.isArray(d.languages_to_learn) ? (d.languages_to_learn as string[]) : [],
          educational_status: (d.educational_status as string) ?? ''
        })
      })
      .catch(() => setForm(emptyForm))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user?.id])

  const update = (key: keyof OnboardingFormData, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setMessage(null)
  }

  const toggleLanguage = (lang: string) => {
    setForm((prev) => ({
      ...prev,
      languages_to_learn: prev.languages_to_learn.includes(lang)
        ? prev.languages_to_learn.filter((l) => l !== lang)
        : [...prev.languages_to_learn, lang]
    }))
    setMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    const thisId = ++submitIdRef.current
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(API_ENDPOINTS.onboardingSave, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerk_user_id: user.id,
          full_name: form.full_name.trim() || undefined,
          address: form.address.trim() || undefined,
          gender: form.gender || undefined,
          country: form.country || undefined,
          age: form.age.trim() ? parseInt(form.age, 10) : undefined,
          languages_to_learn: form.languages_to_learn,
          educational_status: form.educational_status || undefined
        })
      })

      const status = res.status
      const isSuccess = (status >= 200 && status < 300) || status === 0

      const applySuccess = () => {
        if (thisId !== submitIdRef.current) return
        setMessage({ type: 'success', text: 'Settings saved successfully.' })
        setSaving(false)
      }

      const applyError = (text: string) => {
        if (thisId !== submitIdRef.current) return
        setMessage({ type: 'error', text })
        setSaving(false)
      }

      if (isSuccess) {
        applySuccess()
        res.text().catch(() => '')
        setTimeout(() => { try { refreshDisplayName?.() } catch { /* ignore */ } }, 0)
        return
      }

      let errorDetail: string | null = null
      try {
        const data = (await res.json().catch(() => ({}))) as { error?: string; detail?: string }
        errorDetail = data.error ?? data.detail ?? null
      } catch {
        errorDetail = null
      }
      applyError(errorDetail ?? 'Failed to save. Please try again.')
    } catch {
      if (thisId === submitIdRef.current) {
        setMessage({ type: 'error', text: 'Failed to save. Please try again.' })
        setSaving(false)
      }
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-vedya-purple/5 via-white to-vedya-pink/5 min-h-[60vh] flex items-center justify-center">
        <AILoader message="Loading your profile..." subMessage="Syncing your data..." />
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-vedya-purple/5 via-white to-vedya-pink/5">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">
          Settings
        </h1>
        <p className="text-slate-600 mb-8">
          View and edit the information you provided during onboarding.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {message && (
            <div
              className={`rounded-xl px-4 py-3 ${
                message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-black/5 shadow-sm p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => update('full_name', e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-vedya-purple focus:ring-2 focus:ring-vedya-purple/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="City and country"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-vedya-purple focus:ring-2 focus:ring-vedya-purple/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => update('gender', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-vedya-purple focus:ring-2 focus:ring-vedya-purple/20 outline-none"
              >
                <option value="">Select...</option>
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
              <select
                value={form.country}
                onChange={(e) => update('country', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-vedya-purple focus:ring-2 focus:ring-vedya-purple/20 outline-none"
              >
                <option value="">Select...</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
              <input
                type="number"
                min={1}
                max={120}
                value={form.age}
                onChange={(e) => update('age', e.target.value)}
                placeholder="Age"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-vedya-purple focus:ring-2 focus:ring-vedya-purple/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Programming languages you want to learn</label>
              <div className="flex flex-wrap gap-2">
                {PROGRAMMING_LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      form.languages_to_learn.includes(lang)
                        ? 'bg-vedya-purple text-white'
                        : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Educational status</label>
              <select
                value={form.educational_status}
                onChange={(e) => update('educational_status', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-vedya-purple focus:ring-2 focus:ring-vedya-purple/20 outline-none"
              >
                <option value="">Select...</option>
                {EDUCATIONAL_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-vedya-purple to-vedya-pink hover:shadow-lg disabled:opacity-60 transition-all"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
