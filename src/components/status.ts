export type WatchStatus =
  | 'WATCHING'
  | 'NO_SIGNAL'
  | 'SIGNAL_SENT'
  | 'FETCH_ERROR'
  | 'TELEGRAM_ERROR'

const statusClassNames: Record<WatchStatus, string> = {
  WATCHING: 'status-watching',
  NO_SIGNAL: 'status-no-signal',
  SIGNAL_SENT: 'status-signal-sent',
  FETCH_ERROR: 'status-fetch-error',
  TELEGRAM_ERROR: 'status-telegram-error',
}

export function getStatusClassName(status: WatchStatus) {
  return statusClassNames[status]
}

export function normalizeWatchStatus(status: unknown): WatchStatus {
  const normalized = String(status ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')

  if (normalized in statusClassNames) {
    return normalized as WatchStatus
  }

  return 'NO_SIGNAL'
}
