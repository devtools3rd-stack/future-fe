import { useCallback, useEffect, useState } from 'react'
import { Filter, MoveDown, MoveUp, X } from 'lucide-react'
import { getSignals } from '../api/client'

type SignalRow = {
  id: string
  time: string
  symbol: string
  timeframe: string
  strategyKey: string
  strategyLabel: string
  direction: string
  price: string
  message: string
}

const timeframeOptions = ['1m', '5m', '15m', '1h', '4h', '1D']
const strategyOptions = [
  { value: 'EMA_CROSS', label: 'EMA Cross' },
  { value: 'RSI_EXTREME', label: 'RSI Extreme' },
  { value: 'MACD_CROSS', label: 'MACD Cross' },
]
const directionOptions = ['LONG', 'SHORT']

function asErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to load signals.'
}

function getRecordValue(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key]

    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return ''
}

function formatStrategyLabel(strategyKey: string) {
  const knownStrategy = strategyOptions.find(
    (strategy) => strategy.value === strategyKey,
  )

  if (knownStrategy) {
    return knownStrategy.label
  }

  return strategyKey
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatTime(value: unknown) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return ''
  }

  const rawValue = String(value)
  const parsedDate = new Date(rawValue)

  if (!Number.isNaN(parsedDate.getTime()) && rawValue.includes('T')) {
    return parsedDate.toLocaleTimeString('en-US', { hour12: false })
  }

  return rawValue
}

function formatPrice(value: unknown) {
  if (typeof value === 'number') {
    return value.toLocaleString('en-US')
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value)

    if (Number.isFinite(parsedValue)) {
      return parsedValue.toLocaleString('en-US')
    }

    return value
  }

  return ''
}

function normalizeSignals(data: unknown): SignalRow[] {
  const rawItems =
    data && typeof data === 'object' && 'items' in data
      ? (data as { items: unknown }).items
      : data

  if (!Array.isArray(rawItems)) {
    return []
  }

  return rawItems
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item, index) => {
      const strategyValue = String(
        getRecordValue(item, ['strategyKey', 'strategy', 'strategyName']),
      )
      const strategyLabel = String(
        getRecordValue(item, ['strategyName', 'strategyLabel']),
      )

      return {
        id: String(getRecordValue(item, ['id', '_id']) || index),
        time: formatTime(getRecordValue(item, ['time', 'createdAt', 'timestamp'])),
        symbol: String(getRecordValue(item, ['symbol'])),
        timeframe: String(getRecordValue(item, ['timeframe'])),
        strategyKey: strategyValue,
        strategyLabel: strategyLabel || formatStrategyLabel(strategyValue),
        direction: String(getRecordValue(item, ['direction'])).toUpperCase(),
        price: formatPrice(getRecordValue(item, ['price'])),
        message: String(getRecordValue(item, ['message', 'telegramMessage'])),
      }
    })
    .filter((item) => item.symbol && item.message)
}

export function SignalHistory() {
  const [signals, setSignals] = useState<SignalRow[]>([])
  const [symbol, setSymbol] = useState('')
  const [timeframe, setTimeframe] = useState('')
  const [strategyKey, setStrategyKey] = useState('')
  const [direction, setDirection] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSignal, setSelectedSignal] = useState<SignalRow | null>(null)

  const loadSignals = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await getSignals({
        limit: 50,
        symbol: symbol.trim() || undefined,
        timeframe: timeframe || undefined,
        strategyKey: strategyKey || undefined,
        direction: direction || undefined,
      })
      setSignals(normalizeSignals(data))
    } catch (loadError) {
      setSignals([])
      setError(asErrorMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }, [direction, strategyKey, symbol, timeframe])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSignals()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadSignals])

  return (
    <section className="screen history-screen">
      <div className="filter-panel">
        <div className="filter-fields">
          <label>
            Symbol
            <input
              aria-label="Symbol"
              onChange={(event) => setSymbol(event.target.value)}
              placeholder="All Symbols"
              value={symbol}
            />
          </label>
          <label>
            Timeframe
            <select
              aria-label="Timeframe"
              onChange={(event) => setTimeframe(event.target.value)}
              value={timeframe}
            >
              <option value="">All TF</option>
              {timeframeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Strategy
            <select
              aria-label="Strategy"
              onChange={(event) => setStrategyKey(event.target.value)}
              value={strategyKey}
            >
              <option value="">All Strategies</option>
              {strategyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Direction
            <select
              aria-label="Direction"
              onChange={(event) => setDirection(event.target.value)}
              value={direction}
            >
              <option value="">All Direction</option>
              {directionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="action-row">
          <button className="secondary-action" onClick={loadSignals} type="button">
            <Filter size={16} />
            Filters
          </button>
        </div>
      </div>

      {error ? (
        <div className="state-panel error-state" role="alert">
          {error}
        </div>
      ) : null}

      <div className="glass-table history-table">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Symbol</th>
              <th>Timeframe</th>
              <th>Strategy</th>
              <th>Direction</th>
              <th className="right-cell">Price</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="table-state" colSpan={7}>
                  Loading signals...
                </td>
              </tr>
            ) : null}

            {!isLoading && signals.length === 0 ? (
              <tr>
                <td className="table-state" colSpan={7}>
                  No signals found.
                </td>
              </tr>
            ) : null}

            {!isLoading
              ? signals.map((signal) => (
                  <tr
                    aria-label={`Open ${signal.symbol} signal details`}
                    key={signal.id}
                    onClick={() => setSelectedSignal(signal)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedSignal(signal)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <td className="muted-cell">{signal.time}</td>
                    <td className="strong-cell">{signal.symbol}</td>
                    <td className="muted-cell">{signal.timeframe}</td>
                    <td>{signal.strategyLabel}</td>
                    <td>
                      <span
                        className={
                          signal.direction === 'LONG'
                            ? 'direction-badge direction-long'
                            : 'direction-badge direction-short'
                        }
                      >
                        {signal.direction === 'LONG' ? (
                          <MoveUp size={14} />
                        ) : (
                          <MoveDown size={14} />
                        )}
                        {signal.direction}
                      </span>
                    </td>
                    <td className="right-cell strong-cell">{signal.price}</td>
                    <td className="muted-cell truncate-cell">
                      {signal.message}
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
        <div className="table-footer">
          <span>Showing {signals.length} of 50 latest entries</span>
        </div>
      </div>

      {selectedSignal ? (
        <div className="modal-backdrop" role="presentation">
          <section
            aria-label="Telegram Message"
            aria-modal="true"
            className="message-modal"
            role="dialog"
          >
            <div className="modal-heading">
              <div>
                <h3>Telegram Message</h3>
                <p>
                  {selectedSignal.symbol} - {selectedSignal.timeframe} -{' '}
                  {selectedSignal.strategyLabel}
                </p>
              </div>
              <button
                aria-label="Close message modal"
                className="ghost-icon"
                onClick={() => setSelectedSignal(null)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <pre>{selectedSignal.message}</pre>
          </section>
        </div>
      ) : null}
    </section>
  )
}
