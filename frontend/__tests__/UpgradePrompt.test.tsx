/**
 * Tests for components/UpgradePrompt.tsx
 * Mocks window.location to prevent jsdom navigation errors.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import UpgradePrompt from '../components/UpgradePrompt'
import type { FreemiumStatus } from '../lib/useFreemiumStatus'

const baseUsage: FreemiumStatus = {
  tier: 'freemium',
  session_hours_used: 4.5,
  session_hours_limit: 5,
  subjects_accessed: ['Math', 'Science', 'English'],
  subject_limit: 3,
  can_start_session: false,
  can_access_subject: false,
}

describe('UpgradePrompt', () => {
  it('renders the dialog with correct title', () => {
    render(<UpgradePrompt usage={baseUsage} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Freemium Limit Reached')).toBeInTheDocument()
  })

  it('displays session hours usage correctly', () => {
    render(<UpgradePrompt usage={baseUsage} />)
    expect(screen.getByText('Session hours')).toBeInTheDocument()
    expect(screen.getByText('4.5 / 5h')).toBeInTheDocument()
  })

  it('displays subjects accessed usage correctly', () => {
    render(<UpgradePrompt usage={baseUsage} />)
    expect(screen.getByText('Subjects accessed')).toBeInTheDocument()
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
  })

  it('shows Upgrade to Pro button', () => {
    render(<UpgradePrompt usage={baseUsage} />)
    expect(screen.getByRole('button', { name: /upgrade to pro/i })).toBeInTheDocument()
  })

  it('calls onDismiss when close button clicked', () => {
    const onDismiss = jest.fn()
    render(<UpgradePrompt usage={baseUsage} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('does not show close button when onDismiss is not provided', () => {
    render(<UpgradePrompt usage={baseUsage} />)
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
  })

  it('hides session bar when session_hours_limit is null (paid tier edge case)', () => {
    const paidUsage: FreemiumStatus = { ...baseUsage, session_hours_limit: null }
    render(<UpgradePrompt usage={paidUsage} />)
    expect(screen.queryByText('Session hours')).not.toBeInTheDocument()
  })

  it('hides subject bar when subject_limit is null', () => {
    const noSubjectLimit: FreemiumStatus = { ...baseUsage, subject_limit: null }
    render(<UpgradePrompt usage={noSubjectLimit} />)
    expect(screen.queryByText('Subjects accessed')).not.toBeInTheDocument()
  })

  it('shows upgrade description text', () => {
    render(<UpgradePrompt usage={baseUsage} />)
    expect(screen.getByText(/upgrade to access unlimited sessions/i)).toBeInTheDocument()
  })

  it('renders with zero session hours used', () => {
    const zeroUsage: FreemiumStatus = { ...baseUsage, session_hours_used: 0 }
    render(<UpgradePrompt usage={zeroUsage} />)
    expect(screen.getByText('0.0 / 5h')).toBeInTheDocument()
  })
})
