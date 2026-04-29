import { describe, expect, it, vi } from 'vitest'
import { apiClient } from './client'

describe('apiClient', () => {
  it('uses the configured backend base URL and parses JSON responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ symbol: 'BTCUSDT' }],
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiClient.get('/watchlist')

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/watchlist', {
      headers: { 'Content-Type': 'application/json' },
    })
    expect(result).toEqual([{ symbol: 'BTCUSDT' }])
  })
})
