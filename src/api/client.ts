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

type DataEnvelope = {
  data: unknown
}

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
    throw new Error('Chưa cấu hình VITE_API_BASE_URL')
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

function unwrapDataEnvelope(data: unknown) {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as DataEnvelope).data
  }

  return data
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

  return `Yêu cầu API thất bại với mã ${response.status}`
}

async function request<T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
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

  return unwrapDataEnvelope(data) as T
}

export function searchSymbols(q: string) {
  return request<JsonValue[]>(
    `/api/symbols/search${buildQuery({ q })}`,
    'GET',
  )
}

export function getWatchlist() {
  return request<JsonValue[]>('/api/watchlist', 'GET')
}

export function createWatchItem(symbol: string, timeframe: string) {
  return request<JsonValue>('/api/watchlist', 'POST', {
    body: { symbol, timeframe },
  })
}

export function updateWatchItem(id: string, payload: Record<string, unknown>) {
  return request<JsonValue>(
    `/api/watchlist/${encodeURIComponent(id)}`,
    'PATCH',
    {
      body: payload,
    },
  )
}

export function deleteWatchItem(id: string) {
  return request<JsonValue>(`/api/watchlist/${encodeURIComponent(id)}`, 'DELETE')
}

export function getStrategyConfigs(watchlistId: string) {
  return request<JsonValue[]>(
    `/api/watchlist/${encodeURIComponent(watchlistId)}/strategies`,
    'GET',
  )
}

export function updateStrategyConfig(
  watchlistId: string,
  strategyKey: string,
  payload: Record<string, unknown>,
) {
  return request<JsonValue>(
    `/api/watchlist/${encodeURIComponent(watchlistId)}/strategies/${encodeURIComponent(
      strategyKey,
    )}`,
    'PUT',
    { body: payload },
  )
}

export function getSettings() {
  return request<JsonValue>('/api/settings', 'GET')
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
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, 'PUT', { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, 'PATCH', { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, 'DELETE', options),
}
