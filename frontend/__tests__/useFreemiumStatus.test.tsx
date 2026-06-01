/**
 * Tests for lib/useFreemiumStatus hook.
 * Mocks global fetch so no real network calls are made.
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFreemiumStatus, FreemiumStatus } from '../lib/useFreemiumStatus'

const mockFreemiumStatus: FreemiumStatus = {
  tier: 'freemium',
  session_hours_used: 1.0,
  session_hours_limit: 5,
  subjects_accessed: ['Math'],
  subject_limit: 3,
  can_start_session: true,
  can_access_subject: true,
}

const mockPaidStatus: FreemiumStatus = {
  tier: 'paid',
  session_hours_used: 100,
  session_hours_limit: null,
  subjects_accessed: [],
  subject_limit: null,
  can_start_session: true,
  can_access_subject: true,
}

function mockFetch(data: unknown, ok = true) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    json: jest.fn().mockResolvedValue(data),
  } as unknown as Response)
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('useFreemiumStatus', () => {
  it('returns null status and false loading when clerkId is undefined', () => {
    const { result } = renderHook(() => useFreemiumStatus(undefined))
    expect(result.current.status).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('fetches status when clerkId is provided', async () => {
    mockFetch(mockFreemiumStatus)
    const { result } = renderHook(() => useFreemiumStatus('user_abc'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.status).toEqual(mockFreemiumStatus)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('clerk_user_id=user_abc')
    )
  })

  it('sets loading=true during fetch then false after', async () => {
    let resolvePromise: (v: unknown) => void
    const pendingFetch = new Promise((res) => { resolvePromise = res })
    global.fetch = jest.fn().mockReturnValue(
      pendingFetch.then(() => ({ json: jest.fn().mockResolvedValue(mockFreemiumStatus) }))
    )

    const { result } = renderHook(() => useFreemiumStatus('user_abc'))
    expect(result.current.loading).toBe(true)

    act(() => resolvePromise!(undefined))
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('returns null on fetch error and sets loading=false', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useFreemiumStatus('user_err'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.status).toBeNull()
  })

  it('handles paid tier status', async () => {
    mockFetch(mockPaidStatus)
    const { result } = renderHook(() => useFreemiumStatus('user_paid'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.status?.tier).toBe('paid')
    expect(result.current.status?.session_hours_limit).toBeNull()
  })

  it('does not fetch when clerkId is empty string', () => {
    global.fetch = jest.fn()
    renderHook(() => useFreemiumStatus(''))
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
