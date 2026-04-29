import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSignals } from '../api/client'
import { SignalHistory } from './SignalHistory'

vi.mock('../api/client', () => ({
  getSignals: vi.fn(),
}))

const mockedGetSignals = vi.mocked(getSignals)

const signal = {
  id: 'signal-1',
  time: '14:32:05',
  symbol: 'BTCUSDT',
  timeframe: '1h',
  strategyKey: 'EMA_CROSS',
  direction: 'LONG',
  price: 64230.5,
  message:
    'Telegram signal: BTCUSDT LONG from EMA Cross after volume confirmation.',
}

describe('SignalHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads the 50 most recent signals into the history table', async () => {
    mockedGetSignals.mockResolvedValue([signal])

    render(<SignalHistory />)

    await waitFor(() => {
      expect(mockedGetSignals).toHaveBeenCalledWith({ limit: 50 })
    })
    const row = await screen.findByRole('button', {
      name: /Open BTCUSDT signal details/i,
    })

    expect(within(row).getByText('BTCUSDT')).toBeInTheDocument()
    expect(within(row).getByText('1h')).toBeInTheDocument()
    expect(within(row).getByText('EMA Cross')).toBeInTheDocument()
    expect(within(row).getByText('LONG')).toBeInTheDocument()
    expect(within(row).getByText('64,230.5')).toBeInTheDocument()
    expect(
      within(row).getByText(/Telegram signal: BTCUSDT LONG/),
    ).toBeInTheDocument()
  })

  it('reloads signals with simple filters', async () => {
    const user = userEvent.setup()
    mockedGetSignals.mockResolvedValue([])

    render(<SignalHistory />)

    await user.type(screen.getByLabelText('Symbol'), 'BTCUSDT')
    await user.selectOptions(screen.getByLabelText('Timeframe'), '1h')
    await user.selectOptions(screen.getByLabelText('Strategy'), 'EMA_CROSS')
    await user.selectOptions(screen.getByLabelText('Direction'), 'LONG')

    await waitFor(() => {
      expect(mockedGetSignals).toHaveBeenLastCalledWith({
        limit: 50,
        symbol: 'BTCUSDT',
        timeframe: '1h',
        strategyKey: 'EMA_CROSS',
        direction: 'LONG',
      })
    })
  })

  it('shows an empty state when no signals are returned', async () => {
    mockedGetSignals.mockResolvedValue([])

    render(<SignalHistory />)

    expect(await screen.findByText('No signals found.')).toBeInTheDocument()
  })

  it('shows an error state when signals fail to load', async () => {
    mockedGetSignals.mockRejectedValue(new Error('Signals unavailable'))

    render(<SignalHistory />)

    expect(await screen.findByText('Signals unavailable')).toBeInTheDocument()
  })

  it('opens a Telegram message modal from a table row', async () => {
    const user = userEvent.setup()
    mockedGetSignals.mockResolvedValue([signal])

    render(<SignalHistory />)

    await user.click(await screen.findByRole('button', { name: /Open BTCUSDT signal details/i }))

    const dialog = screen.getByRole('dialog', { name: 'Telegram Message' })

    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText(signal.message)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close message modal' }))

    expect(screen.queryByRole('dialog', { name: 'Telegram Message' })).not.toBeInTheDocument()
  })
})
