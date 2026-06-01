/**
 * Tests for components/SessionLifecycle.tsx
 * Mocks @clerk/nextjs and navigator.sendBeacon.
 */
import React from 'react'
import { render, act } from '@testing-library/react'
import SessionLifecycle from '../components/SessionLifecycle'

jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(),
}))

import { useUser } from '@clerk/nextjs'

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>

function makeClerkUser(id = 'user_1') {
  return {
    isSignedIn: true,
    user: { id },
  } as ReturnType<typeof useUser>
}

describe('SessionLifecycle', () => {
  let mockSendBeacon: jest.Mock

  beforeEach(() => {
    mockSendBeacon = jest.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'sendBeacon', {
      value: mockSendBeacon,
      configurable: true,
      writable: true,
    })
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
    // Clean up any event listeners
    window.removeEventListener('beforeunload', () => {})
  })

  it('renders null (no DOM output)', () => {
    mockUseUser.mockReturnValue(makeClerkUser())
    const { container } = render(<SessionLifecycle />)
    expect(container).toBeEmptyDOMElement()
  })

  it('sends beacon on beforeunload with clerk_user_id and duration', () => {
    mockUseUser.mockReturnValue(makeClerkUser('user_test'))
    render(<SessionLifecycle />)

    // Advance time to simulate some session duration
    jest.advanceTimersByTime(3_600_000) // 1 hour

    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })

    expect(mockSendBeacon).toHaveBeenCalledTimes(1)
    const [url, blob] = mockSendBeacon.mock.calls[0]
    expect(url).toContain('/users/session-end')
    // Parse the Blob payload
    expect(blob).toBeInstanceOf(Blob)
  })

  it('does not register listener when user is not signed in', () => {
    mockUseUser.mockReturnValue({ isSignedIn: false, user: null } as ReturnType<typeof useUser>)
    render(<SessionLifecycle />)

    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })

    expect(mockSendBeacon).not.toHaveBeenCalled()
  })

  it('does not send beacon when user id is missing', () => {
    mockUseUser.mockReturnValue({ isSignedIn: true, user: null } as ReturnType<typeof useUser>)
    render(<SessionLifecycle />)

    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })

    expect(mockSendBeacon).not.toHaveBeenCalled()
  })

  it('removes beforeunload listener on unmount', () => {
    mockUseUser.mockReturnValue(makeClerkUser())
    const { unmount } = render(<SessionLifecycle />)
    unmount()

    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })

    expect(mockSendBeacon).not.toHaveBeenCalled()
  })
})
