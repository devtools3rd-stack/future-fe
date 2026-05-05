import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSignals } from '../api/client'
import { SignalNotifier } from './SignalNotifier'

vi.mock('../api/client', () => ({
  getSignals: vi.fn(),
}))

const mockedGetSignals = vi.mocked(getSignals)

describe('SignalNotifier', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  it('shows a toast and dispatches an event when a new signal appears after initial load', async () => {
    const newSignal = {
      id: 'signal-2',
      symbol: 'BTCUSDT',
      timeframe: '1h',
      strategyKey: 'SMC',
      direction: 'LONG',
      price: '98420',
      stopLoss: '97200',
      takeProfit: '100860',
      createdAt: '2026-05-05T04:00:00.000Z',
    }
    const signalListener = vi.fn()
    window.addEventListener('signalpro:new-signal', signalListener)
    mockedGetSignals
      .mockResolvedValueOnce([
        {
          id: 'signal-1',
          symbol: 'ETHUSDT',
          timeframe: '15m',
          strategyKey: 'ICT',
          direction: 'SHORT',
          price: '3200',
        },
      ])
      .mockResolvedValueOnce([newSignal])

    render(<SignalNotifier />)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(mockedGetSignals).toHaveBeenCalledWith({ limit: 1 })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(10_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByRole('status')).toHaveTextContent(
      'Tín hiệu mới: LONG BTCUSDT 1h SMC @ 98,420 | SL 97,200 | TP 100,860',
    )
    expect(signalListener).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ id: 'signal-2' }),
      }),
    )

    window.removeEventListener('signalpro:new-signal', signalListener)
  })
})
