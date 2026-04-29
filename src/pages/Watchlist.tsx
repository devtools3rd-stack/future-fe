import { useCallback, useEffect, useState } from 'react'
import { Search, Trash2 } from 'lucide-react'
import {
  createWatchItem,
  deleteWatchItem,
  getWatchlist,
  searchSymbols,
  updateWatchItem,
} from '../api/client'
import {
  StatusBadge,
} from '../components/StatusBadge'
import { normalizeWatchStatus, type WatchStatus } from '../components/status'

type WatchItem = {
  id: string
  symbol: string
  timeframe: string
  strategies?: string[]
  status: WatchStatus
}

type SymbolSuggestion = {
  symbol: string
}

const timeframeOptions = ['1m', '5m', '15m', '1h', '4h', '1D']

function asErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong'
}

function normalizeWatchItems(data: unknown): WatchItem[] {
  if (!Array.isArray(data)) {
    return []
  }

  return data
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => ({
      id: String(item.id),
      symbol: String(item.symbol ?? ''),
      timeframe: String(item.timeframe ?? '1h'),
      strategies: Array.isArray(item.strategies)
        ? item.strategies.map(String)
        : [],
      status: normalizeWatchStatus(item.status),
    }))
    .filter((item) => item.id && item.symbol)
}

function normalizeSuggestions(data: unknown): SymbolSuggestion[] {
  if (!Array.isArray(data)) {
    return []
  }

  return data
    .map((item) => {
      if (typeof item === 'string') {
        return { symbol: item }
      }

      if (item && typeof item === 'object' && 'symbol' in item) {
        return { symbol: String(item.symbol) }
      }

      return null
    })
    .filter((item): item is SymbolSuggestion => Boolean(item?.symbol))
}

export function Watchlist() {
  const [items, setItems] = useState<WatchItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [rowMutatingId, setRowMutatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([])
  const [timeframe, setTimeframe] = useState('1h')

  const refreshWatchlist = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const data = await getWatchlist()
      setItems(normalizeWatchItems(data))
    } catch (fetchError) {
      setError(asErrorMessage(fetchError))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshWatchlist()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [refreshWatchlist])

  useEffect(() => {
    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      return
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const data = await searchSymbols(trimmedQuery)
        setSuggestions(normalizeSuggestions(data))
      } catch (searchError) {
        setError(asErrorMessage(searchError))
        setSuggestions([])
      }
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [query])

  async function handleAddWatchItem() {
    const symbol = (selectedSymbol || query).trim().toUpperCase()

    if (!symbol) {
      return
    }

    setIsMutating(true)
    setError(null)

    try {
      await createWatchItem(symbol, timeframe)
      setQuery('')
      setSelectedSymbol('')
      setSuggestions([])
      await refreshWatchlist(false)
    } catch (addError) {
      setError(asErrorMessage(addError))
    } finally {
      setIsMutating(false)
    }
  }

  async function handleTimeframeChange(item: WatchItem, nextTimeframe: string) {
    const previousItems = items
    setRowMutatingId(item.id)
    setError(null)
    setItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === item.id
          ? { ...currentItem, timeframe: nextTimeframe }
          : currentItem,
      ),
    )

    try {
      await updateWatchItem(item.id, { timeframe: nextTimeframe })
    } catch (updateError) {
      setItems(previousItems)
      setError(asErrorMessage(updateError))
    } finally {
      setRowMutatingId(null)
    }
  }

  async function handleDelete(item: WatchItem) {
    setRowMutatingId(item.id)
    setError(null)

    try {
      await deleteWatchItem(item.id)
      await refreshWatchlist(false)
    } catch (deleteError) {
      setError(asErrorMessage(deleteError))
    } finally {
      setRowMutatingId(null)
    }
  }

  const addSymbol = (selectedSymbol || query).trim()

  return (
    <section className="screen watchlist-screen">
      <div className="page-heading">
        <h2>Watchlist</h2>
        <p>Monitoring Binance Futures pairs for signal triggers.</p>
      </div>

      <div className="watchlist-controls glass-panel">
        <div className="pair-search">
          <label htmlFor="pair-search-input">
            <Search size={20} />
            <input
              aria-label="Search futures pair"
              autoComplete="off"
              id="pair-search-input"
              onChange={(event) => {
                const nextQuery = event.target.value
                setQuery(nextQuery)
                setSelectedSymbol('')
                if (!nextQuery.trim()) {
                  setSuggestions([])
                }
              }}
              placeholder="Search futures pair..."
              value={query}
            />
          </label>
          {suggestions.length > 0 ? (
            <div className="suggestions" role="listbox">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.symbol}
                  onClick={() => {
                    setSelectedSymbol(suggestion.symbol)
                    setQuery(suggestion.symbol)
                    setSuggestions([])
                  }}
                  type="button"
                >
                  {suggestion.symbol}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <select
          aria-label="Default timeframe"
          className="timeframe-select"
          onChange={(event) => setTimeframe(event.target.value)}
          value={timeframe}
        >
          {timeframeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <button
          className="primary-action add-watch-button"
          disabled={!addSymbol || isMutating}
          onClick={handleAddWatchItem}
          type="button"
        >
          + Watch
        </button>
      </div>

      {error ? (
        <div className="state-panel error-state" role="alert">
          {error}
        </div>
      ) : null}

      <div className="glass-table watchlist-table">
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Timeframe</th>
              <th>Strategy</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="table-state" colSpan={5}>
                  Loading watchlist...
                </td>
              </tr>
            ) : null}

            {!isLoading && items.length === 0 ? (
              <tr>
                <td className="table-state" colSpan={5}>
                  No futures pairs watched yet.
                </td>
              </tr>
            ) : null}

            {!isLoading
              ? items.map((item) => (
                  <tr key={item.id}>
                    <td className="mono-cell">{item.symbol}</td>
                    <td>
                      <select
                        aria-label={`Timeframe for ${item.symbol}`}
                        className="row-select"
                        disabled={rowMutatingId === item.id}
                        onChange={(event) =>
                          void handleTimeframeChange(item, event.target.value)
                        }
                        value={item.timeframe}
                      >
                        {timeframeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="chip-row">
                        {(item.strategies?.length
                          ? item.strategies
                          : ['DEFAULT']
                        ).map((strategy) => (
                          <span className="strategy-chip" key={strategy}>
                            {strategy}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>
                      <button
                        aria-label={`Delete ${item.symbol}`}
                        className="ghost-icon"
                        disabled={rowMutatingId === item.id}
                        onClick={() => void handleDelete(item)}
                        type="button"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
