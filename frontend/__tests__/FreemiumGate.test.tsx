/**
 * Tests for components/FreemiumGate.tsx
 * Mocks @clerk/nextjs and the useFreemiumStatus hook.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import FreemiumGate from '../components/FreemiumGate'
import type { FreemiumStatus } from '../lib/useFreemiumStatus'

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(),
}))

// Mock useFreemiumStatus
jest.mock('../lib/useFreemiumStatus', () => ({
  useFreemiumStatus: jest.fn(),
}))

import { useUser } from '@clerk/nextjs'
import { useFreemiumStatus } from '../lib/useFreemiumStatus'

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>
const mockUseFreemiumStatus = useFreemiumStatus as jest.MockedFunction<typeof useFreemiumStatus>

const freemiumUnderLimit: FreemiumStatus = {
  tier: 'freemium',
  session_hours_used: 1.0,
  session_hours_limit: 5,
  subjects_accessed: ['Math'],
  subject_limit: 3,
  can_start_session: true,
  can_access_subject: true,
}

const freemiumSessionBlocked: FreemiumStatus = {
  ...freemiumUnderLimit,
  session_hours_used: 5.0,
  can_start_session: false,
}

const freemiumSubjectBlocked: FreemiumStatus = {
  ...freemiumUnderLimit,
  subjects_accessed: ['Math', 'Science', 'English'],
  can_access_subject: false,
}

function makeClerkUser(id = 'user_1') {
  return {
    isLoaded: true,
    isSignedIn: true,
    user: { id },
  } as ReturnType<typeof useUser>
}

describe('FreemiumGate', () => {
  afterEach(() => jest.clearAllMocks())

  it('renders nothing while clerk is not loaded', () => {
    mockUseUser.mockReturnValue({ isLoaded: false, isSignedIn: false, user: null } as ReturnType<typeof useUser>)
    mockUseFreemiumStatus.mockReturnValue({ status: null, loading: false })
    const { container } = render(<FreemiumGate><p>content</p></FreemiumGate>)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing while loading freemium status', () => {
    mockUseUser.mockReturnValue(makeClerkUser())
    mockUseFreemiumStatus.mockReturnValue({ status: null, loading: true })
    const { container } = render(<FreemiumGate><p>content</p></FreemiumGate>)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders children when user is not signed in', () => {
    mockUseUser.mockReturnValue({ isLoaded: true, isSignedIn: false, user: null } as ReturnType<typeof useUser>)
    mockUseFreemiumStatus.mockReturnValue({ status: null, loading: false })
    render(<FreemiumGate><p>protected content</p></FreemiumGate>)
    expect(screen.getByText('protected content')).toBeInTheDocument()
  })

  it('renders children when status is null (fetch failed)', () => {
    mockUseUser.mockReturnValue(makeClerkUser())
    mockUseFreemiumStatus.mockReturnValue({ status: null, loading: false })
    render(<FreemiumGate><p>protected content</p></FreemiumGate>)
    expect(screen.getByText('protected content')).toBeInTheDocument()
  })

  it('renders children when freemium user is within limits', () => {
    mockUseUser.mockReturnValue(makeClerkUser())
    mockUseFreemiumStatus.mockReturnValue({ status: freemiumUnderLimit, loading: false })
    render(<FreemiumGate><p>lesson content</p></FreemiumGate>)
    expect(screen.getByText('lesson content')).toBeInTheDocument()
    expect(screen.queryByText('Freemium Limit Reached')).not.toBeInTheDocument()
  })

  it('shows upgrade prompt when session hours are exhausted', () => {
    mockUseUser.mockReturnValue(makeClerkUser())
    mockUseFreemiumStatus.mockReturnValue({ status: freemiumSessionBlocked, loading: false })
    render(<FreemiumGate><p>lesson content</p></FreemiumGate>)
    expect(screen.getByText('Freemium Limit Reached')).toBeInTheDocument()
    // children still rendered underneath overlay
    expect(screen.getByText('lesson content')).toBeInTheDocument()
  })

  it('shows upgrade prompt when subject limit is reached (subject prop provided)', () => {
    mockUseUser.mockReturnValue(makeClerkUser())
    mockUseFreemiumStatus.mockReturnValue({ status: freemiumSubjectBlocked, loading: false })
    render(<FreemiumGate subject="Physics"><p>physics content</p></FreemiumGate>)
    expect(screen.getByText('Freemium Limit Reached')).toBeInTheDocument()
  })

  it('does not show upgrade prompt for subject block when no subject prop', () => {
    mockUseUser.mockReturnValue(makeClerkUser())
    // can_access_subject is false but no subject prop passed — gate should pass through
    mockUseFreemiumStatus.mockReturnValue({ status: freemiumSubjectBlocked, loading: false })
    render(<FreemiumGate><p>general content</p></FreemiumGate>)
    expect(screen.queryByText('Freemium Limit Reached')).not.toBeInTheDocument()
    expect(screen.getByText('general content')).toBeInTheDocument()
  })

  it('renders children when tier is paid regardless of usage', () => {
    const paidStatus: FreemiumStatus = {
      ...freemiumSessionBlocked,
      tier: 'paid',
      can_start_session: false, // hypothetical edge case — paid should bypass
    }
    mockUseUser.mockReturnValue(makeClerkUser())
    mockUseFreemiumStatus.mockReturnValue({ status: paidStatus, loading: false })
    render(<FreemiumGate><p>premium content</p></FreemiumGate>)
    expect(screen.queryByText('Freemium Limit Reached')).not.toBeInTheDocument()
    expect(screen.getByText('premium content')).toBeInTheDocument()
  })
})
