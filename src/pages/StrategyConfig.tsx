import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, LineChart, Save } from 'lucide-react'
import {
  getStrategyConfigs,
  getWatchlist,
  updateStrategyConfig,
} from '../api/client'

type StrategyKey = 'EMA_CROSS' | 'RSI_EXTREME' | 'MACD_CROSS'

type WatchItem = {
  id: string
  symbol: string
  timeframe: string
}

type StrategyForm = {
  enabled: boolean
  params: Record<string, string>
}

type StrategyDefinition = {
  key: StrategyKey
  title: string
  subtitle: string
  icon: 'line' | 'bar'
  fields: string[]
  defaults: Record<string, number>
}

type Toast = {
  type: 'success' | 'error'
  message: string
}

const strategyDefinitions: StrategyDefinition[] = [
  {
    key: 'EMA_CROSS',
    title: 'EMA Cross',
    subtitle: 'Trend Following',
    icon: 'line',
    fields: ['fastPeriod', 'slowPeriod'],
    defaults: { fastPeriod: 9, slowPeriod: 21 },
  },
  {
    key: 'RSI_EXTREME',
    title: 'RSI Extreme',
    subtitle: 'Momentum',
    icon: 'line',
    fields: ['period', 'oversold', 'overbought'],
    defaults: { period: 14, oversold: 30, overbought: 70 },
  },
  {
    key: 'MACD_CROSS',
    title: 'MACD Cross',
    subtitle: 'Trend & Momentum',
    icon: 'bar',
    fields: ['fastPeriod', 'slowPeriod', 'signalPeriod'],
    defaults: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  },
]

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
      id: String(item.id ?? ''),
      symbol: String(item.symbol ?? ''),
      timeframe: String(item.timeframe ?? '1h'),
    }))
    .filter((item) => item.id && item.symbol)
}

function createDefaultForms(): Record<StrategyKey, StrategyForm> {
  return strategyDefinitions.reduce(
    (forms, definition) => {
      forms[definition.key] = {
        enabled: false,
        params: Object.fromEntries(
          Object.entries(definition.defaults).map(([key, value]) => [
            key,
            String(value),
          ]),
        ),
      }

      return forms
    },
    {} as Record<StrategyKey, StrategyForm>,
  )
}

function applyServerConfigs(data: unknown): Record<StrategyKey, StrategyForm> {
  const forms = createDefaultForms()

  if (!Array.isArray(data)) {
    return forms
  }

  data.forEach((item) => {
    if (!item || typeof item !== 'object' || !('strategyKey' in item)) {
      return
    }

    const strategyKey = item.strategyKey as StrategyKey
    const definition = strategyDefinitions.find(
      (candidate) => candidate.key === strategyKey,
    )

    if (!definition) {
      return
    }

    const params =
      'params' in item && item.params && typeof item.params === 'object'
        ? (item.params as Record<string, unknown>)
        : {}

    forms[strategyKey] = {
      enabled:
        'enabled' in item && typeof item.enabled === 'boolean'
          ? item.enabled
          : forms[strategyKey].enabled,
      params: {
        ...forms[strategyKey].params,
        ...Object.fromEntries(
          definition.fields
            .filter((field) => params[field] !== undefined)
            .map((field) => [field, String(params[field])]),
        ),
      },
    }
  })

  return forms
}

function validateParams(
  definition: StrategyDefinition,
  form: StrategyForm,
): Record<string, number> | string {
  const parsedParams: Record<string, number> = {}

  for (const field of definition.fields) {
    const value = form.params[field]?.trim()
    const numberValue = Number(value)

    if (!value || !Number.isFinite(numberValue)) {
      return `${field} must be a number.`
    }

    parsedParams[field] = numberValue
  }

  return parsedParams
}

export function StrategyConfig() {
  const [watchItems, setWatchItems] = useState<WatchItem[]>([])
  const [selectedWatchId, setSelectedWatchId] = useState('')
  const [forms, setForms] = useState(createDefaultForms)
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(true)
  const [isLoadingConfig, setIsLoadingConfig] = useState(false)
  const [savingKey, setSavingKey] = useState<StrategyKey | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  const selectedWatchItem = useMemo(
    () => watchItems.find((item) => item.id === selectedWatchId),
    [selectedWatchId, watchItems],
  )

  const loadWatchlist = useCallback(async () => {
    setIsLoadingWatchlist(true)
    setError(null)

    try {
      const data = await getWatchlist()
      setWatchItems(normalizeWatchItems(data))
    } catch (loadError) {
      setError(asErrorMessage(loadError))
    } finally {
      setIsLoadingWatchlist(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadWatchlist()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadWatchlist])

  useEffect(() => {
    if (!selectedWatchId) {
      return
    }

    const timeoutId = window.setTimeout(async () => {
      setIsLoadingConfig(true)
      setError(null)

      try {
        const data = await getStrategyConfigs(selectedWatchId)
        setForms(applyServerConfigs(data))
      } catch (loadError) {
        setError(asErrorMessage(loadError))
      } finally {
        setIsLoadingConfig(false)
      }
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [selectedWatchId])

  function updateFormField(
    strategyKey: StrategyKey,
    field: string,
    value: string,
  ) {
    setForms((currentForms) => ({
      ...currentForms,
      [strategyKey]: {
        ...currentForms[strategyKey],
        params: {
          ...currentForms[strategyKey].params,
          [field]: value,
        },
      },
    }))
  }

  function updateEnabled(strategyKey: StrategyKey, enabled: boolean) {
    setForms((currentForms) => ({
      ...currentForms,
      [strategyKey]: {
        ...currentForms[strategyKey],
        enabled,
      },
    }))
  }

  async function handleSave(definition: StrategyDefinition) {
    if (!selectedWatchId) {
      setToast({ type: 'error', message: 'Choose a pair before saving.' })
      return
    }

    const form = forms[definition.key]
    const parsedParams = validateParams(definition, form)

    if (typeof parsedParams === 'string') {
      setToast({ type: 'error', message: parsedParams })
      return
    }

    setSavingKey(definition.key)
    setToast(null)

    try {
      await updateStrategyConfig(selectedWatchId, definition.key, {
        enabled: form.enabled,
        params: parsedParams,
      })
      setToast({ type: 'success', message: `${definition.title} saved.` })
    } catch (saveError) {
      setToast({ type: 'error', message: asErrorMessage(saveError) })
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <section className="screen">
      <div className="page-heading split-heading strategy-heading">
        <div>
          <h2>Configuring Strategy</h2>
          <p>
            <span className="symbol-token">
              {selectedWatchItem?.symbol ?? 'No pair selected'}
            </span>
            {selectedWatchItem ? (
              <>
                <span className="dot-separator" aria-hidden="true" />
                <span className="mono-cell">
                  {selectedWatchItem.timeframe.toUpperCase()} Timeframe
                </span>
              </>
            ) : null}
          </p>
        </div>

        <label className="strategy-pair-select">
          Choose pair
          <select
            aria-label="Choose pair"
            disabled={isLoadingWatchlist || watchItems.length === 0}
            onChange={(event) => setSelectedWatchId(event.target.value)}
            value={selectedWatchId}
          >
            <option value="">
              {isLoadingWatchlist ? 'Loading pairs...' : 'Select pair'}
            </option>
            {watchItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.symbol}
              </option>
            ))}
          </select>
        </label>
      </div>

      {toast ? (
        <div
          className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}
          role="status"
        >
          {toast.message}
        </div>
      ) : null}

      {error ? (
        <div className="state-panel error-state" role="alert">
          {error}
        </div>
      ) : null}

      {!isLoadingWatchlist && watchItems.length === 0 ? (
        <div className="state-panel muted-state">
          No watchlist pairs available. Add a pair before configuring
          strategies.
        </div>
      ) : null}

      {!selectedWatchId && watchItems.length > 0 ? (
        <div className="state-panel muted-state">
          Select a watchlist pair to configure strategies.
        </div>
      ) : null}

      {selectedWatchId ? (
        <div className="strategy-grid">
          {strategyDefinitions.map((definition) => {
            const Icon = definition.icon === 'line' ? LineChart : BarChart3
            const form = forms[definition.key]

            return (
              <article
                className={form.enabled ? 'strategy-card' : 'strategy-card strategy-card-muted'}
                key={definition.key}
              >
                <div className="strategy-card-head">
                  <div className="strategy-title-row">
                    <span className="strategy-icon">
                      <Icon size={20} />
                    </span>
                    <div>
                      <h3>{definition.title}</h3>
                      <p>{definition.subtitle}</p>
                    </div>
                  </div>
                  <label className="toggle">
                    <input
                      aria-label={`${definition.title} enabled`}
                      checked={form.enabled}
                      onChange={(event) =>
                        updateEnabled(definition.key, event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span />
                  </label>
                </div>

                <div className="strategy-fields">
                  {definition.fields.map((field) => (
                    <label key={field}>
                      {field}
                      <input
                        aria-label={`${definition.title} ${field}`}
                        onChange={(event) =>
                          updateFormField(
                            definition.key,
                            field,
                            event.target.value,
                          )
                        }
                        value={form.params[field] ?? ''}
                      />
                    </label>
                  ))}
                  <button
                    className="primary-action strategy-save-button wide-field"
                    disabled={isLoadingConfig || savingKey === definition.key}
                    onClick={() => void handleSave(definition)}
                    type="button"
                  >
                    <Save size={18} />
                    Save {definition.title}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
