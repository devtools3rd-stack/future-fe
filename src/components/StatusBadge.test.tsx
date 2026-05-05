import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders distinct badge styles for supported watch statuses', () => {
    const statuses = [
      ['WATCHING', 'Chờ quét', 'status-watching'],
      ['NO_SIGNAL', 'Đang theo dõi - chưa có tín hiệu', 'status-no-signal'],
      ['SIGNAL_SENT', 'Có tín hiệu', 'status-signal-sent'],
      ['FETCH_ERROR', 'Lỗi lấy dữ liệu', 'status-fetch-error'],
      ['TELEGRAM_ERROR', 'Lỗi Telegram', 'status-telegram-error'],
    ] as const

    render(
      <>
        {statuses.map(([status]) => (
          <StatusBadge key={status} status={status} />
        ))}
      </>,
    )

    statuses.forEach(([, label, className]) => {
      expect(screen.getByText(label)).toHaveClass('status', className)
    })
  })
})
