import { useEffect, useState } from 'react'
import { BellRing, Eye, Gauge, MessageSquare, Save } from 'lucide-react'
import { getSettings, testTelegram, updateSettings } from '../api/client'

type ToastState = {
  type: 'success' | 'error'
  message: string
} | null

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Yêu cầu thất bại.'
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
          setTelegramBotToken(
            getSettingString(settings, 'telegram_bot_token') ||
              getSettingString(settings, 'telegramBotToken'),
          )
          setTelegramChatId(
            getSettingString(settings, 'telegram_chat_id') ||
              getSettingString(settings, 'telegramChatId'),
          )
          setCooldownMinutes(
            getSettingString(settings, 'cooldown_minutes') ||
              getSettingString(settings, 'cooldownMinutes') ||
              '15',
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
        message: 'Thời gian chờ phải là số >= 1 phút.',
      })
      return
    }

    setIsSaving(true)
    setToast(null)

    try {
      await updateSettings({
        telegram_bot_token: telegramBotToken,
        telegram_chat_id: telegramChatId,
        cooldown_minutes: normalizedCooldown,
      })
      setToast({ type: 'success', message: 'Đã lưu cài đặt.' })
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
      setToast({ type: 'success', message: 'Đã gửi thông báo thử.' })
    } catch (error) {
      setToast({ type: 'error', message: getErrorMessage(error) })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <section className="screen settings-screen">
      <div className="page-heading">
        <h2>Cài đặt</h2>
        <p>
          Cấu hình luồng thông báo và thời gian chờ thực thi cho hệ thống.
        </p>
      </div>

      <div className="settings-stack">
        {isLoading ? (
          <div className="state-panel muted-state">Đang tải cài đặt...</div>
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
              Cấu hình Telegram
            </h3>
            <p>Kết nối bot để nhận tín hiệu giao dịch và cảnh báo theo thời gian thực.</p>
          </div>
          <div className="form-stack">
            <label>
              Token bot
              <span className="password-shell">
                <input
                  aria-label="Token bot Telegram"
                  disabled={isLoading}
                  onChange={(event) => setTelegramBotToken(event.target.value)}
                  placeholder="VD: 1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  type="password"
                  value={telegramBotToken}
                />
                <button type="button" aria-label="Hiện token bot">
                  <Eye size={17} />
                </button>
              </span>
              <small>Tạo bot mới qua @BotFather để lấy token riêng.</small>
            </label>
            <label>
              Chat ID
              <input
                aria-label="Chat ID Telegram"
                disabled={isLoading}
                onChange={(event) => setTelegramChatId(event.target.value)}
                placeholder="VD: -1001234567890"
                value={telegramChatId}
              />
              <small>
                ID kênh hoặc nhóm nhận tin. Nhóm supergroup thường bắt đầu bằng
                -100.
              </small>
            </label>
          </div>
        </section>

        <section className="glass-panel settings-panel">
          <div className="panel-heading">
            <h3>
              <Gauge size={24} />
              Tham số hệ thống
            </h3>
            <p>Điều chỉnh quy tắc và giới hạn thực thi chung.</p>
          </div>
          <div className="form-stack">
            <label>
              Thời gian chờ tín hiệu
              <span className="inline-input">
                <input
                  aria-label="Thời gian chờ"
                  disabled={isLoading}
                  min="1"
                  onChange={(event) => setCooldownMinutes(event.target.value)}
                  type="number"
                  value={cooldownMinutes}
                />
                <span>phút</span>
              </span>
              <small>
                Khoảng cách tối thiểu giữa các tín hiệu trùng mã để tránh spam.
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
            {isTesting ? 'Đang gửi thử...' : 'Gửi thử thông báo'}
          </button>
          <button
            className="secondary-action"
            disabled={isLoading || isSaving}
            onClick={handleSave}
            type="button"
          >
            <Save size={20} />
            {isSaving ? 'Đang lưu...' : 'Lưu cài đặt'}
          </button>
        </div>
      </div>
    </section>
  )
}
