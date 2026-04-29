import { useEffect, useState } from 'react'
import { BellRing, Eye, Gauge, MessageSquare, Save } from 'lucide-react'
import { getSettings, testTelegram, updateSettings } from '../api/client'

type ToastState = {
  type: 'success' | 'error'
  message: string
} | null

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed.'
}

function getSettingString(data: Record<string, unknown>, key: string) {
  const value = data[key]
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : ''
}

export function Settings() {
  const [telegramBotToken, setTelegramBotToken] = useState('')
  const [telegramChatId, setTelegramChatId] = useState('')
  const [cooldownMinutes, setCooldownMinutes] = useState('15')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true)
      setLoadError(null)

      try {
        const data = await getSettings()

        if (data && typeof data === 'object' && !Array.isArray(data)) {
          const settings = data as Record<string, unknown>
          setTelegramBotToken(getSettingString(settings, 'telegramBotToken'))
          setTelegramChatId(getSettingString(settings, 'telegramChatId'))
          setCooldownMinutes(
            getSettingString(settings, 'cooldownMinutes') || '15',
          )
        }
      } catch (error) {
        setLoadError(getErrorMessage(error))
      } finally {
        setIsLoading(false)
      }
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  async function handleSave() {
    const normalizedCooldown = Number(cooldownMinutes)

    if (
      cooldownMinutes.trim() === '' ||
      !Number.isFinite(normalizedCooldown) ||
      normalizedCooldown < 1
    ) {
      setToast({
        type: 'error',
        message: 'Cooldown minutes must be a number >= 1.',
      })
      return
    }

    setIsSaving(true)
    setToast(null)

    try {
      await updateSettings({
        telegramBotToken,
        telegramChatId,
        cooldownMinutes: normalizedCooldown,
      })
      setToast({ type: 'success', message: 'Settings saved.' })
    } catch (error) {
      setToast({ type: 'error', message: getErrorMessage(error) })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleTestNotification() {
    setIsTesting(true)
    setToast(null)

    try {
      await testTelegram()
      setToast({ type: 'success', message: 'Test notification sent.' })
    } catch (error) {
      setToast({ type: 'error', message: getErrorMessage(error) })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <section className="screen settings-screen">
      <div className="page-heading">
        <h2>Settings</h2>
        <p>
          Configure your institutional notification pipelines and execution
          cooldowns.
        </p>
      </div>

      <div className="settings-stack">
        {isLoading ? (
          <div className="state-panel muted-state">Loading settings...</div>
        ) : null}

        {loadError ? (
          <div className="state-panel error-state" role="alert">
            {loadError}
          </div>
        ) : null}

        <section className="glass-panel settings-panel">
          <div className="panel-mark">&gt;</div>
          <div className="panel-heading">
            <h3>
              <MessageSquare size={24} />
              Telegram Configuration
            </h3>
            <p>Connect your bot for real-time trade signals and alerts.</p>
          </div>
          <div className="form-stack">
            <label>
              Bot Token
              <span className="password-shell">
                <input
                  aria-label="Telegram Bot Token"
                  disabled={isLoading}
                  onChange={(event) => setTelegramBotToken(event.target.value)}
                  placeholder="e.g. 1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  type="password"
                  value={telegramBotToken}
                />
                <button type="button" aria-label="Show bot token">
                  <Eye size={17} />
                </button>
              </span>
              <small>Create a new bot via @BotFather to get your unique token.</small>
            </label>
            <label>
              Chat ID
              <input
                aria-label="Telegram Chat ID"
                disabled={isLoading}
                onChange={(event) => setTelegramChatId(event.target.value)}
                placeholder="e.g. -1001234567890"
                value={telegramChatId}
              />
              <small>
                The destination channel or group ID. Prefix with -100 for
                supergroups.
              </small>
            </label>
          </div>
        </section>

        <section className="glass-panel settings-panel">
          <div className="panel-heading">
            <h3>
              <Gauge size={24} />
              System Parameters
            </h3>
            <p>Adjust global execution rules and constraints.</p>
          </div>
          <div className="form-stack">
            <label>
              Signal Cooldown (Minutes)
              <span className="inline-input">
                <input
                  aria-label="Cooldown Minutes"
                  disabled={isLoading}
                  min="1"
                  onChange={(event) => setCooldownMinutes(event.target.value)}
                  type="number"
                  value={cooldownMinutes}
                />
                <span>minutes</span>
              </span>
              <small>
                Minimum time required between duplicate asset signals to prevent
                spam.
              </small>
            </label>
          </div>
        </section>

        {toast ? (
          <div className={`toast toast-${toast.type}`} role="status">
            {toast.message}
          </div>
        ) : null}

        <div className="footer-actions">
          <button
            className="primary-action"
            disabled={isLoading || isTesting}
            onClick={handleTestNotification}
            type="button"
          >
            <BellRing size={20} />
            {isTesting ? 'Testing...' : 'Test Notification'}
          </button>
          <button
            className="secondary-action"
            disabled={isLoading || isSaving}
            onClick={handleSave}
            type="button"
          >
            <Save size={20} />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </section>
  )
}
