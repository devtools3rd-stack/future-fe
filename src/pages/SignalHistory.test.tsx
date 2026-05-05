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
  strategyKey: 'SMC',
  direction: 'LONG',
  price: 64230.5,
  stopLoss: 63000,
  takeProfit: 67000,
  message:
    'Telegram signal: BTCUSDT LONG from SMC after liquidity sweep.',
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
      name: /Mở chi tiết tín hiệu BTCUSDT/i,
    })

    expect(within(row).getByText('BTCUSDT')).toBeInTheDocument()
    expect(within(row).getByText('1h')).toBeInTheDocument()
    expect(within(row).getByText('SMC')).toBeInTheDocument()
    expect(within(row).getByText('LONG')).toBeInTheDocument()
    expect(within(row).getByText('64,230.5')).toBeInTheDocument()
    expect(within(row).getByText('63,000')).toBeInTheDocument()
    expect(within(row).getByText('67,000')).toBeInTheDocument()
    expect(
      within(row).getByText(/Telegram signal: BTCUSDT LONG/),
    ).toBeInTheDocument()
  })

  it('reloads signals with simple filters', async () => {
    const user = userEvent.setup()
    mockedGetSignals.mockResolvedValue([])

    render(<SignalHistory />)

    await user.type(screen.getByLabelText('Mã giao dịch'), 'BTCUSDT')
    await user.selectOptions(screen.getByLabelText('Khung thời gian'), '1m')
    await user.selectOptions(screen.getByLabelText('Chiến lược'), 'SMC')
    await user.selectOptions(screen.getByLabelText('Hướng'), 'LONG')

    await waitFor(() => {
      expect(mockedGetSignals).toHaveBeenLastCalledWith({
        limit: 50,
        symbol: 'BTCUSDT',
        timeframe: '1m',
        strategyKey: 'SMC',
        direction: 'LONG',
      })
    })
  })

  it('shows an empty state when no signals are returned', async () => {
    mockedGetSignals.mockResolvedValue([])

    render(<SignalHistory />)

    expect(await screen.findByText('Không tìm thấy tín hiệu.')).toBeInTheDocument()
  })

  it('shows an error state when signals fail to load', async () => {
    mockedGetSignals.mockRejectedValue(new Error('Signals unavailable'))

    render(<SignalHistory />)

    expect(await screen.findByText('Signals unavailable')).toBeInTheDocument()
  })

  it('reloads the table when a new signal event is received', async () => {
    mockedGetSignals.mockResolvedValueOnce([]).mockResolvedValueOnce([signal])

    render(<SignalHistory />)

    expect(await screen.findByText('Không tìm thấy tín hiệu.')).toBeInTheDocument()

    window.dispatchEvent(new CustomEvent('signalpro:new-signal'))

    expect(
      await screen.findByRole('button', {
        name: /Mở chi tiết tín hiệu BTCUSDT/i,
      }),
    ).toBeInTheDocument()
    expect(mockedGetSignals).toHaveBeenCalledTimes(2)
  })

  it('opens a signal detail modal from a table row', async () => {
    const user = userEvent.setup()
    mockedGetSignals.mockResolvedValue([signal])

    render(<SignalHistory />)

    await user.click(await screen.findByRole('button', { name: /Mở chi tiết tín hiệu BTCUSDT/i }))

    const dialog = screen.getByRole('dialog', { name: 'Chi tiết tín hiệu' })

    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText(signal.message)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Đóng chi tiết tín hiệu' }))

    expect(screen.queryByRole('dialog', { name: 'Chi tiết tín hiệu' })).not.toBeInTheDocument()
  })
})
