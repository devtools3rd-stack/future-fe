import { useEffect, useRef, useState } from 'react'
import { getSignals } from '../api/client'

type SignalToast = {
  id: string
  symbol: string
  timeframe: string
  strategyKey: string
  direction: string
  price: string
  stopLoss: string
  takeProfit: string
}

const SIGNAL_POLL_INTERVAL_MS = 10_000

function normalizeLatestSignal(data: unknown): SignalToast | null {
  if (!Array.isArray(data) || data.length === 0) {
    return null
  }

  const item = data[0]

  if (!item || typeof item !== 'object') {
    return null
  }

  const record = item as Record<string, unknown>
  const symbol = String(record.symbol ?? '')
  const timeframe = String(record.timeframe ?? '')
  const strategyKey = String(record.strategyKey ?? '')
  const direction = String(record.direction ?? '').toUpperCase()
  const price = formatPrice(record.price)
  const stopLoss = formatPrice(record.stopLoss ?? record.stop_loss)
  const takeProfit = formatPrice(record.takeProfit ?? record.take_profit)
  const id = String(
    record.id ??
      [symbol, timeframe, strategyKey, direction, price, record.createdAt ?? '']
        .filter(Boolean)
        .join(':'),
  )

  if (!symbol || !timeframe || !strategyKey || !direction || !price) {
    return null
  }

  return {
    id,
    symbol,
    timeframe,
    strategyKey,
    direction,
    price,
    stopLoss,
    takeProfit,
  }
}

function formatPrice(value: unknown) {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN

  if (Number.isFinite(numericValue)) {
    return numericValue.toLocaleString('en-US')
  }

  return String(value ?? '')
}

export function SignalNotifier() {
  const [toast, setToast] = useState<SignalToast | null>(null)
  const lastSignalId = useRef<string | null>(null)
  const hasLoadedInitialSignal = useRef(false)

  useEffect(() => {
    let isMounted = true

    async function pollLatestSignal() {
      try {
        const data = await getSignals({ limit: 1 })
        const latestSignal = normalizeLatestSignal(data)

        if (!isMounted) {
          return
        }

        if (!hasLoadedInitialSignal.current) {
          lastSignalId.current = latestSignal?.id ?? null
          hasLoadedInitialSignal.current = true
          return
        }

        if (!latestSignal || latestSignal.id === lastSignalId.current) {
          return
        }

        lastSignalId.current = latestSignal.id
        setToast(latestSignal)
        window.dispatchEvent(
          new CustomEvent('signalpro:new-signal', { detail: latestSignal }),
        )
      } catch {
        // Notification polling should not interrupt normal app usage.
      }
    }

    void pollLatestSignal()
    const intervalId = window.setInterval(
      pollLatestSignal,
      SIGNAL_POLL_INTERVAL_MS,
    )

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  if (!toast) {
    return null
  }

  return (
    <div className="toast toast-success signal-toast" role="status">
      Tín hiệu mới: {toast.direction} {toast.symbol} {toast.timeframe}{' '}
      {toast.strategyKey} @ {toast.price}
      {toast.stopLoss ? ` | SL ${toast.stopLoss}` : ''}
      {toast.takeProfit ? ` | TP ${toast.takeProfit}` : ''}
    </div>
  )
}
