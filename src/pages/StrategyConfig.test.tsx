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
  await user.selectOptions(screen.getByLabelText('Chọn cặp'), 'watch-1')
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

    expect(await screen.findByText('Chọn một cặp trong danh sách theo dõi để cấu hình chiến lược.')).toBeInTheDocument()
    expect(screen.getByLabelText('Chọn cặp')).toHaveTextContent('BTCUSDT')
  })

  it('loads strategy cards after selecting a watchlist pair', async () => {
    const user = userEvent.setup()
    mockedGetWatchlist.mockResolvedValue([
      { id: 'watch-1', symbol: 'BTCUSDT', timeframe: '1h' },
    ])
    mockedGetStrategyConfigs.mockResolvedValue([
      {
        strategyKey: 'SMC',
        enabled: true,
        paramsJson: {
          swingLookback: 7,
          liquidityLookback: 25,
          minDisplacementPercent: 0.4,
          requireFairValueGap: false,
          usePremiumDiscount: true,
          minRiskReward: 2,
        },
      },
    ])

    render(<StrategyConfig />)

    await chooseBtcPair(user)

    expect(await screen.findByRole('heading', { name: 'SMC' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'ICT' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'EMA Cross' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('SMC Số nến swing')).toHaveValue(7)
    expect(screen.getByLabelText('SMC Risk/Reward tối thiểu')).toHaveValue(2)
    expect(screen.getByLabelText('SMC Yêu cầu FVG')).not.toBeChecked()
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
    await user.clear(await screen.findByLabelText('SMC Displacement tối thiểu (%)'))
    await user.type(screen.getByLabelText('SMC Displacement tối thiểu (%)'), '0.45')
    await user.click(await screen.findByRole('button', { name: 'Lưu SMC' }))

    await waitFor(() => {
      expect(mockedUpdateStrategyConfig).toHaveBeenCalledWith('watch-1', 'SMC', {
        enabled: false,
        paramsJson: {
          swingLookback: 5,
          liquidityLookback: 20,
          minDisplacementPercent: 0.45,
          requireFairValueGap: true,
          usePremiumDiscount: true,
          minRiskReward: 2,
        },
      })
    })
    expect(await screen.findByText('Đã lưu SMC.')).toBeInTheDocument()
  })

  it('validates params are numbers before saving', async () => {
    const user = userEvent.setup()
    mockedGetWatchlist.mockResolvedValue([
      { id: 'watch-1', symbol: 'BTCUSDT', timeframe: '1h' },
    ])
    mockedGetStrategyConfigs.mockResolvedValue([])

    render(<StrategyConfig />)

    await chooseBtcPair(user)
    await user.clear(await screen.findByLabelText('SMC Số nến swing'))
    await user.type(screen.getByLabelText('SMC Số nến swing'), 'abc')
    await user.click(await screen.findByRole('button', { name: 'Lưu SMC' }))

    expect(mockedUpdateStrategyConfig).not.toHaveBeenCalled()
    expect(await screen.findByText('Số nến swing phải là số.')).toBeInTheDocument()
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
    await user.click(await screen.findByRole('button', { name: 'Lưu ICT' }))

    expect(await screen.findByText('Save failed')).toBeInTheDocument()
  })
})
