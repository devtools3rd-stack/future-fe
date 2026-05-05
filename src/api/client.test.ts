import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  createWatchItem,
  deleteWatchItem,
  getSettings,
  getSignals,
  getStrategyConfigs,
  getWatchlist,
  searchSymbols,
  testTelegram,
  updateSettings,
  updateStrategyConfig,
  updateWatchItem,
} from './client'

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')

function mockJsonResponse(data: unknown, init: Partial<Response> = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => data,
  }
}

describe('apiClient', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the configured backend base URL and parses JSON responses', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockJsonResponse({ data: [{ symbol: 'BTCUSDT' }] }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await getWatchlist()

    expect(fetchMock).toHaveBeenCalledWith(
      `${configuredApiBaseUrl}/api/watchlist`,
      expect.objectContaining({
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    expect(result).toEqual([{ symbol: 'BTCUSDT' }])
  })

  it('exports resource functions with REST endpoints', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await searchSymbols('BTC/USDT')
    await createWatchItem('ETHUSDT', '15m')
    await updateWatchItem('watch-1', { timeframe: '1h', enabled: true })
    await deleteWatchItem('watch-1')
    await getStrategyConfigs('watch-1')
    await updateStrategyConfig('watch-1', 'SMC', {
      enabled: false,
      paramsJson: {},
    })
    await getSettings()
    await updateSettings({ strictMode: true })
    await testTelegram()
    await getSignals({ symbol: 'BTC/USD', timeframe: '5m', limit: 50 })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${configuredApiBaseUrl}/api/symbols/search?q=BTC%2FUSDT`,
      expect.objectContaining({ method: 'GET' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${configuredApiBaseUrl}/api/watchlist`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ symbol: 'ETHUSDT', timeframe: '15m' }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `${configuredApiBaseUrl}/api/watchlist/watch-1`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ timeframe: '1h', enabled: true }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      `${configuredApiBaseUrl}/api/watchlist/watch-1`,
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      `${configuredApiBaseUrl}/api/watchlist/watch-1/strategies`,
      expect.objectContaining({ method: 'GET' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      `${configuredApiBaseUrl}/api/watchlist/watch-1/strategies/SMC`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ enabled: false, paramsJson: {} }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      `${configuredApiBaseUrl}/api/settings`,
      expect.objectContaining({ method: 'GET' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      8,
      `${configuredApiBaseUrl}/api/settings`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ strictMode: true }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      9,
      `${configuredApiBaseUrl}/api/telegram/test`,
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      10,
      `${configuredApiBaseUrl}/api/signals?symbol=BTC%2FUSD&timeframe=5m&limit=50`,
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('throws ApiError with status and response data on HTTP failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse(
        { message: 'Invalid Telegram token', code: 'BAD_TOKEN' },
        { ok: false, status: 400, statusText: 'Bad Request' },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(testTelegram()).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Invalid Telegram token',
      data: { message: 'Invalid Telegram token', code: 'BAD_TOKEN' },
    } satisfies Partial<ApiError>)
  })
})
