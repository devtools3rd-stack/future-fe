import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, LineChart, Save } from 'lucide-react'
import {
  getStrategyConfigs,
  getWatchlist,
  updateStrategyConfig,
} from '../api/client'

type StrategyKey = 'SMC' | 'ICT'

type WatchItem = {
  id: string
  symbol: string
  timeframe: string
}

type StrategyForm = {
  enabled: boolean
  params: Record<string, string>
}

type StrategyField = {
  key: string
  type: 'number' | 'boolean' | 'select'
  options?: Array<{ value: string; label: string }>
}

type StrategyDefinition = {
  key: StrategyKey
  title: string
  subtitle: string
  icon: 'line' | 'bar'
  fields: StrategyField[]
  defaults: Record<string, number | boolean | string>
}

type Toast = {
  type: 'success' | 'error'
  message: string
}

const strategyDefinitions: StrategyDefinition[] = [
  {
    key: 'SMC',
    title: 'SMC',
    subtitle: 'Smart Money Concepts',
    icon: 'line',
    fields: [
      { key: 'swingLookback', type: 'number' },
      { key: 'liquidityLookback', type: 'number' },
      { key: 'minDisplacementPercent', type: 'number' },
      { key: 'requireFairValueGap', type: 'boolean' },
      { key: 'usePremiumDiscount', type: 'boolean' },
      { key: 'minRiskReward', type: 'number' },
    ],
    defaults: {
      swingLookback: 5,
      liquidityLookback: 20,
      minDisplacementPercent: 0.3,
      requireFairValueGap: true,
      usePremiumDiscount: true,
      minRiskReward: 2,
    },
  },
  {
    key: 'ICT',
    title: 'ICT',
    subtitle: 'Inner Circle Trader',
    icon: 'bar',
    fields: [
      { key: 'swingLookback', type: 'number' },
      { key: 'liquidityLookback', type: 'number' },
      { key: 'minDisplacementPercent', type: 'number' },
      {
        key: 'killZone',
        type: 'select',
        options: [
          { value: 'any', label: 'Bất kỳ' },
          { value: 'london', label: 'London' },
          { value: 'newYork', label: 'New York' },
        ],
      },
      { key: 'requireFairValueGap', type: 'boolean' },
      { key: 'minRiskReward', type: 'number' },
    ],
    defaults: {
      swingLookback: 5,
      liquidityLookback: 20,
      minDisplacementPercent: 0.25,
      killZone: 'any',
      requireFairValueGap: true,
      minRiskReward: 2,
    },
  },
]

const fieldLabels: Record<string, string> = {
  swingLookback: 'Số nến swing',
  liquidityLookback: 'Vùng thanh khoản',
  minDisplacementPercent: 'Displacement tối thiểu (%)',
  requireFairValueGap: 'Yêu cầu FVG',
  usePremiumDiscount: 'Lọc Premium/Discount',
  killZone: 'Kill zone',
  minRiskReward: 'Risk/Reward tối thiểu',
}

function asErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Có lỗi xảy ra.'
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

    const params = readServerParams(item as Record<string, unknown>)

    forms[strategyKey] = {
      enabled:
        'enabled' in item && typeof item.enabled === 'boolean'
          ? item.enabled
          : forms[strategyKey].enabled,
      params: {
        ...forms[strategyKey].params,
        ...Object.fromEntries(
          definition.fields
            .filter((field) => params[field.key] !== undefined)
            .map((field) => [field.key, String(params[field.key])]),
        ),
      },
    }
  })

  return forms
}

function readServerParams(item: Record<string, unknown>): Record<string, unknown> {
  if (
    item.paramsJson &&
    typeof item.paramsJson === 'object' &&
    !Array.isArray(item.paramsJson)
  ) {
    return item.paramsJson as Record<string, unknown>
  }

  if (item.params && typeof item.params === 'object' && !Array.isArray(item.params)) {
    return item.params as Record<string, unknown>
  }

  return {}
}

function validateParams(
  definition: StrategyDefinition,
  form: StrategyForm,
): Record<string, unknown> | string {
  const parsedParams: Record<string, unknown> = {}

  for (const field of definition.fields) {
    const fieldLabel = fieldLabels[field.key] ?? field.key
    const value = form.params[field.key]?.trim() ?? ''

    if (field.type === 'boolean') {
      parsedParams[field.key] = value === 'true'
      continue
    }

    if (field.type === 'select') {
      const allowedValues = field.options?.map((option) => option.value) ?? []

      if (!allowedValues.includes(value)) {
        return `${fieldLabel} không hợp lệ.`
      }

      parsedParams[field.key] = value
      continue
    }

    const numberValue = Number(value)

    if (!value || !Number.isFinite(numberValue)) {
      return `${fieldLabel} phải là số.`
    }

    parsedParams[field.key] = numberValue
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
      setToast({ type: 'error', message: 'Chọn cặp trước khi lưu.' })
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
        paramsJson: parsedParams,
      })
      setToast({ type: 'success', message: `Đã lưu ${definition.title}.` })
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
          <h2>Cấu hình chiến lược</h2>
          <p>
            <span className="symbol-token">
              {selectedWatchItem?.symbol ?? 'Chưa chọn cặp'}
            </span>
            {selectedWatchItem ? (
              <>
                <span className="dot-separator" aria-hidden="true" />
                <span className="mono-cell">
                  {selectedWatchItem.timeframe.toUpperCase()} Khung thời gian
                </span>
              </>
            ) : null}
          </p>
        </div>

        <label className="strategy-pair-select">
          Chọn cặp
          <select
            aria-label="Chọn cặp"
            disabled={isLoadingWatchlist || watchItems.length === 0}
            onChange={(event) => setSelectedWatchId(event.target.value)}
            value={selectedWatchId}
          >
            <option value="">
              {isLoadingWatchlist ? 'Đang tải cặp...' : 'Chọn cặp'}
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
          Chưa có cặp nào trong danh sách theo dõi. Hãy thêm cặp trước khi
          cấu hình chiến lược.
        </div>
      ) : null}

      {!selectedWatchId && watchItems.length > 0 ? (
        <div className="state-panel muted-state">
          Chọn một cặp trong danh sách theo dõi để cấu hình chiến lược.
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
                      aria-label={`Bật ${definition.title}`}
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
                  {definition.fields.map((field) => {
                    const label = fieldLabels[field.key] ?? field.key

                    if (field.type === 'boolean') {
                      return (
                        <label className="strategy-toggle-field" key={field.key}>
                          {label}
                          <span className="strategy-checkbox-control">
                            <input
                              aria-label={`${definition.title} ${label}`}
                              checked={form.params[field.key] === 'true'}
                              onChange={(event) =>
                                updateFormField(
                                  definition.key,
                                  field.key,
                                  String(event.target.checked),
                                )
                              }
                              type="checkbox"
                            />
                            {form.params[field.key] === 'true' ? 'Bật' : 'Tắt'}
                          </span>
                        </label>
                      )
                    }

                    if (field.type === 'select') {
                      return (
                        <label key={field.key}>
                          {label}
                          <select
                            aria-label={`${definition.title} ${label}`}
                            onChange={(event) =>
                              updateFormField(
                                definition.key,
                                field.key,
                                event.target.value,
                              )
                            }
                            value={form.params[field.key] ?? ''}
                          >
                            {field.options?.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      )
                    }

                    return (
                      <label key={field.key}>
                        {label}
                        <input
                          aria-label={`${definition.title} ${label}`}
                          onChange={(event) =>
                            updateFormField(
                              definition.key,
                              field.key,
                              event.target.value,
                            )
                          }
                          step="any"
                          type="number"
                          value={form.params[field.key] ?? ''}
                        />
                      </label>
                    )
                  })}
                  <button
                    className="primary-action strategy-save-button wide-field"
                    disabled={isLoadingConfig || savingKey === definition.key}
                    onClick={() => void handleSave(definition)}
                    type="button"
                  >
                    <Save size={18} />
                    Lưu {definition.title}
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
