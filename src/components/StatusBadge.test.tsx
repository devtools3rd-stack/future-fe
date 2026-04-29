import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders distinct badge styles for supported watch statuses', () => {
    const statuses = [
      ['WATCHING', 'status-watching'],
      ['NO_SIGNAL', 'status-no-signal'],
      ['SIGNAL_SENT', 'status-signal-sent'],
      ['FETCH_ERROR', 'status-fetch-error'],
      ['TELEGRAM_ERROR', 'status-telegram-error'],
    ] as const

    render(
      <>
        {statuses.map(([status]) => (
          <StatusBadge key={status} status={status} />
        ))}
      </>,
    )

    statuses.forEach(([status, className]) => {
      expect(screen.getByText(status)).toHaveClass('status', className)
    })
  })
})
