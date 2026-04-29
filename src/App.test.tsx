import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App routing', () => {
  it('renders SignalPro sidebar navigation and switches to settings', async () => {
    render(
      <MemoryRouter initialEntries={['/watchlist']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getAllByText('SignalPro')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Watchlist' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: 'Settings' }))

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByText('Telegram Configuration')).toBeInTheDocument()
  })
})
