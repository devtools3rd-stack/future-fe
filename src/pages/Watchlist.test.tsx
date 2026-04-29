import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createWatchItem,
  deleteWatchItem,
  getWatchlist,
  searchSymbols,
  updateWatchItem,
} from '../api/client'
import { Watchlist } from './Watchlist'

vi.mock('../api/client', () => ({
  createWatchItem: vi.fn(),
  deleteWatchItem: vi.fn(),
  getWatchlist: vi.fn(),
  searchSymbols: vi.fn(),
  updateWatchItem: vi.fn(),
}))

const mockedGetWatchlist = vi.mocked(getWatchlist)
const mockedSearchSymbols = vi.mocked(searchSymbols)
const mockedCreateWatchItem = vi.mocked(createWatchItem)
const mockedUpdateWatchItem = vi.mocked(updateWatchItem)
const mockedDeleteWatchItem = vi.mocked(deleteWatchItem)

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

describe('Watchlist', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('shows loading while fetching watchlist', () => {
    mockedGetWatchlist.mockReturnValue(new Promise(() => undefined))

    render(<Watchlist />)

    expect(screen.getByText('Loading watchlist...')).toBeInTheDocument()
  })

  it('shows empty state when watchlist has no rows', async () => {
    mockedGetWatchlist.mockResolvedValue([])

    render(<Watchlist />)

    expect(await screen.findByText('No futures pairs watched yet.')).toBeInTheDocument()
  })

  it('shows error state when watchlist fetch fails', async () => {
    mockedGetWatchlist.mockRejectedValue(new Error('Backend unavailable'))

    render(<Watchlist />)

    expect(await screen.findByText('Backend unavailable')).toBeInTheDocument()
  })

  it('shows distinct status badges for all watch states', async () => {
    mockedGetWatchlist.mockResolvedValue([
      { id: 'watch-1', symbol: 'BTCUSDT', timeframe: '1h', status: 'WATCHING' },
      { id: 'watch-2', symbol: 'ETHUSDT', timeframe: '1h', status: 'NO_SIGNAL' },
      { id: 'watch-3', symbol: 'SOLUSDT', timeframe: '1h', status: 'SIGNAL_SENT' },
      { id: 'watch-4', symbol: 'BNBUSDT', timeframe: '1h', status: 'FETCH_ERROR' },
      {
        id: 'watch-5',
        symbol: 'XRPUSDT',
        timeframe: '1h',
        status: 'TELEGRAM_ERROR',
      },
    ])

    render(<Watchlist />)

    expect(await screen.findByText('WATCHING')).toHaveClass('status-watching')
    expect(screen.getByText('NO_SIGNAL')).toHaveClass('status-no-signal')
    expect(screen.getByText('SIGNAL_SENT')).toHaveClass('status-signal-sent')
    expect(screen.getByText('FETCH_ERROR')).toHaveClass('status-fetch-error')
    expect(screen.getByText('TELEGRAM_ERROR')).toHaveClass(
      'status-telegram-error',
    )
  })

  it('debounces symbol search by 300ms and renders suggestions', async () => {
    vi.useFakeTimers()
    mockedGetWatchlist.mockResolvedValue([])
    mockedSearchSymbols.mockResolvedValue([{ symbol: 'BTCUSDT' }])

    render(<Watchlist />)

    fireEvent.change(screen.getByLabelText('Search futures pair'), {
      target: { value: 'BTC' },
    })

    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(mockedSearchSymbols).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })

    expect(mockedSearchSymbols).toHaveBeenCalledWith('BTC')
    expect(screen.getByRole('button', { name: 'BTCUSDT' })).toBeInTheDocument()
  })

  it('adds selected pair with default 1h timeframe and refreshes watchlist', async () => {
    const user = userEvent.setup()
    mockedGetWatchlist
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'watch-1',
          symbol: 'BTCUSDT',
          timeframe: '1h',
          strategies: ['EMA CROSS'],
          status: 'Watching',
        },
      ])
    mockedSearchSymbols.mockResolvedValue([{ symbol: 'BTCUSDT' }])
    mockedCreateWatchItem.mockResolvedValue({ id: 'watch-1' })

    render(<Watchlist />)

    await user.type(screen.getByLabelText('Search futures pair'), 'BTC')
    await act(async () => {
      await delay(320)
    })
    await user.click(await screen.findByRole('button', { name: 'BTCUSDT' }))
    await user.click(screen.getByRole('button', { name: '+ Watch' }))

    await waitFor(() => {
      expect(mockedCreateWatchItem).toHaveBeenCalledWith('BTCUSDT', '1h')
      expect(mockedGetWatchlist).toHaveBeenCalledTimes(2)
    })
    expect(await screen.findByText('EMA CROSS')).toBeInTheDocument()
  })

  it('patches timeframe changes and deletes rows', async () => {
    const user = userEvent.setup()
    mockedGetWatchlist
      .mockResolvedValueOnce([
        {
          id: 'watch-1',
          symbol: 'BTCUSDT',
          timeframe: '1h',
          strategies: ['EMA CROSS'],
          status: 'Watching',
        },
      ])
      .mockResolvedValueOnce([])
    mockedUpdateWatchItem.mockResolvedValue({ id: 'watch-1' })
    mockedDeleteWatchItem.mockResolvedValue({})

    render(<Watchlist />)

    await user.selectOptions(
      await screen.findByLabelText('Timeframe for BTCUSDT'),
      '4h',
    )

    expect(mockedUpdateWatchItem).toHaveBeenCalledWith('watch-1', {
      timeframe: '4h',
    })

    const deleteButton = screen.getByRole('button', { name: 'Delete BTCUSDT' })
    await waitFor(() => {
      expect(deleteButton).not.toBeDisabled()
    })
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockedDeleteWatchItem).toHaveBeenCalledWith('watch-1')
      expect(mockedGetWatchlist).toHaveBeenCalledTimes(2)
    })
    expect(await screen.findByText('No futures pairs watched yet.')).toBeInTheDocument()
  })
})
