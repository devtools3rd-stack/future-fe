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
  stopLoss: string
  takeProfit: string
  message: string
}

const timeframeOptions = ['1m', '5m', '15m', '1h', '4h']
const strategyOptions = [
  { value: 'SMC', label: 'SMC' },
  { value: 'ICT', label: 'ICT' },
]
const directionOptions = ['LONG', 'SHORT']

function asErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Không tải được tín hiệu.'
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
        stopLoss: formatPrice(
          getRecordValue(item, ['stopLoss', 'stop_loss', 'sl']),
        ),
        takeProfit: formatPrice(
          getRecordValue(item, ['takeProfit', 'take_profit', 'tp']),
        ),
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

  useEffect(() => {
    function handleNewSignal() {
      void loadSignals()
    }

    window.addEventListener('signalpro:new-signal', handleNewSignal)

    return () => {
      window.removeEventListener('signalpro:new-signal', handleNewSignal)
    }
  }, [loadSignals])

  return (
    <section className="screen history-screen">
      <div className="filter-panel">
        <div className="filter-fields">
          <label>
            Mã giao dịch
            <input
              aria-label="Mã giao dịch"
              onChange={(event) => setSymbol(event.target.value)}
              placeholder="Tất cả mã"
              value={symbol}
            />
          </label>
          <label>
            Khung thời gian
            <select
              aria-label="Khung thời gian"
              onChange={(event) => setTimeframe(event.target.value)}
              value={timeframe}
            >
              <option value="">Tất cả khung</option>
              {timeframeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Chiến lược
            <select
              aria-label="Chiến lược"
              onChange={(event) => setStrategyKey(event.target.value)}
              value={strategyKey}
            >
              <option value="">Tất cả chiến lược</option>
              {strategyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Hướng
            <select
              aria-label="Hướng"
              onChange={(event) => setDirection(event.target.value)}
              value={direction}
            >
              <option value="">Tất cả hướng</option>
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
            Lọc
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
              <th>Thời gian</th>
              <th>Mã giao dịch</th>
              <th>Khung thời gian</th>
              <th>Chiến lược</th>
              <th>Hướng</th>
              <th className="right-cell">Giá</th>
              <th className="right-cell">SL</th>
              <th className="right-cell">TP</th>
              <th>Tin nhắn</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="table-state" colSpan={9}>
                  Đang tải tín hiệu...
                </td>
              </tr>
            ) : null}

            {!isLoading && signals.length === 0 ? (
              <tr>
                <td className="table-state" colSpan={9}>
                  Không tìm thấy tín hiệu.
                </td>
              </tr>
            ) : null}

            {!isLoading
              ? signals.map((signal) => (
                  <tr
                    aria-label={`Mở chi tiết tín hiệu ${signal.symbol}`}
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
                    <td className="right-cell muted-cell">{signal.stopLoss}</td>
                    <td className="right-cell muted-cell">
                      {signal.takeProfit}
                    </td>
                    <td className="muted-cell truncate-cell">
                      {signal.message}
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
        <div className="table-footer">
          <span>Đang hiển thị {signals.length}/50 tín hiệu mới nhất</span>
        </div>
      </div>

      {selectedSignal ? (
        <div className="modal-backdrop" role="presentation">
          <section
            aria-label="Chi tiết tín hiệu"
            aria-modal="true"
            className="message-modal"
            role="dialog"
          >
            <div className="modal-heading">
              <div>
                <h3>Chi tiết tín hiệu</h3>
                <p>
                  {selectedSignal.symbol} - {selectedSignal.timeframe} -{' '}
                  {selectedSignal.strategyLabel}
                </p>
              </div>
              <button
                aria-label="Đóng chi tiết tín hiệu"
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
