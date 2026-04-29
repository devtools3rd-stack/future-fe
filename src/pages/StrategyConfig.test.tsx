import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getStrategyConfigs,
  getWatchlist,
  updateStrategyConfig,
} from '../api/client'
import { StrategyConfig } from './StrategyConfig'

vi.mock('../api/client', () => ({
  getStrategyConfigs: vi.fn(),
  getWatchlist: vi.fn(),
  updateStrategyConfig: vi.fn(),
}))

const mockedGetWatchlist = vi.mocked(getWatchlist)
const mockedGetStrategyConfigs = vi.mocked(getStrategyConfigs)
const mockedUpdateStrategyConfig = vi.mocked(updateStrategyConfig)

async function chooseBtcPair(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText('BTCUSDT')
  await user.selectOptions(screen.getByLabelText('Choose pair'), 'watch-1')
}

describe('StrategyConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads watchlist pairs and waits for pair selection', async () => {
    mockedGetWatchlist.mockResolvedValue([
      { id: 'watch-1', symbol: 'BTCUSDT', timeframe: '1h' },
    ])

    render(<StrategyConfig />)

    expect(await screen.findByText('Select a watchlist pair to configure strategies.')).toBeInTheDocument()
    expect(screen.getByLabelText('Choose pair')).toHaveTextContent('BTCUSDT')
  })

  it('loads strategy cards after selecting a watchlist pair', async () => {
    const user = userEvent.setup()
    mockedGetWatchlist.mockResolvedValue([
      { id: 'watch-1', symbol: 'BTCUSDT', timeframe: '1h' },
    ])
    mockedGetStrategyConfigs.mockResolvedValue([
      {
        strategyKey: 'EMA_CROSS',
        enabled: true,
        params: { fastPeriod: 9, slowPeriod: 21 },
      },
    ])

    render(<StrategyConfig />)

    await chooseBtcPair(user)

    expect(await screen.findByRole('heading', { name: 'EMA Cross' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'RSI Extreme' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'MACD Cross' })).toBeInTheDocument()
    expect(screen.getByLabelText('EMA Cross fastPeriod')).toHaveValue('9')
  })

  it('saves numeric params and shows success toast', async () => {
    const user = userEvent.setup()
    mockedGetWatchlist.mockResolvedValue([
      { id: 'watch-1', symbol: 'BTCUSDT', timeframe: '1h' },
    ])
    mockedGetStrategyConfigs.mockResolvedValue([])
    mockedUpdateStrategyConfig.mockResolvedValue({ ok: true })

    render(<StrategyConfig />)

    await chooseBtcPair(user)
    await user.clear(await screen.findByLabelText('EMA Cross fastPeriod'))
    await user.type(screen.getByLabelText('EMA Cross fastPeriod'), '12')
    await user.click(await screen.findByRole('button', { name: 'Save EMA Cross' }))

    await waitFor(() => {
      expect(mockedUpdateStrategyConfig).toHaveBeenCalledWith('watch-1', 'EMA_CROSS', {
        enabled: false,
        params: { fastPeriod: 12, slowPeriod: 21 },
      })
    })
    expect(await screen.findByText('EMA Cross saved.')).toBeInTheDocument()
  })

  it('validates params are numbers before saving', async () => {
    const user = userEvent.setup()
    mockedGetWatchlist.mockResolvedValue([
      { id: 'watch-1', symbol: 'BTCUSDT', timeframe: '1h' },
    ])
    mockedGetStrategyConfigs.mockResolvedValue([])

    render(<StrategyConfig />)

    await chooseBtcPair(user)
    await user.clear(await screen.findByLabelText('RSI Extreme period'))
    await user.type(screen.getByLabelText('RSI Extreme period'), 'abc')
    await user.click(await screen.findByRole('button', { name: 'Save RSI Extreme' }))

    expect(mockedUpdateStrategyConfig).not.toHaveBeenCalled()
    expect(await screen.findByText('period must be a number.')).toBeInTheDocument()
  })

  it('shows error toast when save fails', async () => {
    const user = userEvent.setup()
    mockedGetWatchlist.mockResolvedValue([
      { id: 'watch-1', symbol: 'BTCUSDT', timeframe: '1h' },
    ])
    mockedGetStrategyConfigs.mockResolvedValue([])
    mockedUpdateStrategyConfig.mockRejectedValue(new Error('Save failed'))

    render(<StrategyConfig />)

    await chooseBtcPair(user)
    await user.click(await screen.findByRole('button', { name: 'Save MACD Cross' }))

    expect(await screen.findByText('Save failed')).toBeInTheDocument()
  })
})
