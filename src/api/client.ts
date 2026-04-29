type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

type RequestOptions = {
  body?: unknown
  headers?: HeadersInit
}

type QueryFilters = Record<
  string,
  string | number | boolean | null | undefined
>

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')

function getApiBaseUrl() {
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured')
  }

  return apiBaseUrl
}

function buildQuery(filters?: QueryFilters) {
  const params = new URLSearchParams()

  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  })

  const query = params.toString()
  return query ? `?${query}` : ''
}

async function readResponse(response: Response) {
  if (response.status === 204) {
    return undefined
  }

  const contentType = response.headers.get('Content-Type') ?? ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  return response.text()
}

function errorMessage(data: unknown, response: Response) {
  if (
    data &&
    typeof data === 'object' &&
    'message' in data &&
    typeof data.message === 'string'
  ) {
    return data.message
  }

  if (typeof data === 'string' && data.length > 0) {
    return data
  }

  return `API request failed with status ${response.status}`
}

async function request<T>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  options: RequestOptions = {},
): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const response = await fetch(`${getApiBaseUrl()}${normalizedPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const data = await readResponse(response)

  if (!response.ok) {
    throw new ApiError(errorMessage(data, response), response.status, data)
  }

  return data as T
}

export function searchSymbols(q: string) {
  return request<JsonValue[]>(
    `/symbols/search${buildQuery({ q })}`,
    'GET',
  )
}

export function getWatchlist() {
  return request<JsonValue[]>('/watchlist', 'GET')
}

export function createWatchItem(symbol: string, timeframe: string) {
  return request<JsonValue>('/watchlist', 'POST', {
    body: { symbol, timeframe },
  })
}

export function updateWatchItem(id: string, payload: Record<string, unknown>) {
  return request<JsonValue>(`/watchlist/${encodeURIComponent(id)}`, 'PATCH', {
    body: payload,
  })
}

export function deleteWatchItem(id: string) {
  return request<JsonValue>(`/watchlist/${encodeURIComponent(id)}`, 'DELETE')
}

export function getStrategyConfigs(watchlistId: string) {
  return request<JsonValue[]>(
    `/watchlist/${encodeURIComponent(watchlistId)}/strategies`,
    'GET',
  )
}

export function updateStrategyConfig(
  watchlistId: string,
  strategyKey: string,
  payload: Record<string, unknown>,
) {
  return request<JsonValue>(
    `/watchlist/${encodeURIComponent(watchlistId)}/strategies/${encodeURIComponent(
      strategyKey,
    )}`,
    'PATCH',
    { body: payload },
  )
}

export function getSettings() {
  return request<JsonValue>('/settings', 'GET')
}

export function updateSettings(payload: Record<string, unknown>) {
  return request<JsonValue>('/api/settings', 'PATCH', { body: payload })
}

export function testTelegram() {
  return request<JsonValue>('/api/telegram/test', 'POST')
}

export function getSignals(filters?: QueryFilters) {
  return request<JsonValue[]>(`/api/signals${buildQuery(filters)}`, 'GET')
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, 'GET', options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, 'POST', { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, 'PATCH', { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, 'DELETE', options),
}
