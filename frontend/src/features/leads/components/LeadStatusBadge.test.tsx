import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LeadStatusBadge } from './LeadStatusBadge'
import { LEAD_STATUS_META } from '../lib/leadStatuses'

describe('LeadStatusBadge', () => {
  it.each(Object.entries(LEAD_STATUS_META))(
    'renders Russian label for status "%s"',
    (status, { label }) => {
      render(<LeadStatusBadge status={status} />)
      expect(screen.getByText(label)).toBeTruthy()
    },
  )

  it('renders raw status string for unknown status', () => {
    render(<LeadStatusBadge status="UnknownStatus" />)
    expect(screen.getByText('UnknownStatus')).toBeTruthy()
  })
})
