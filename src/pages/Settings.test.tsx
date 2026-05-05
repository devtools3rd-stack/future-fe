import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSettings, testTelegram, updateSettings } from '../api/client'
import { Settings } from './Settings'

vi.mock('../api/client', () => ({
  getSettings: vi.fn(),
  testTelegram: vi.fn(),
  updateSettings: vi.fn(),
}))

const mockedGetSettings = vi.mocked(getSettings)
const mockedUpdateSettings = vi.mocked(updateSettings)
const mockedTestTelegram = vi.mocked(testTelegram)

async function waitForSettingsReady() {
  await waitFor(() => {
    expect(screen.queryByText('Đang tải cài đặt...')).not.toBeInTheDocument()
  })
}

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetSettings.mockResolvedValue({
      telegram_bot_token: '',
      telegram_chat_id: '',
      cooldown_minutes: 15,
    })
  })

  it('loads saved settings into the form', async () => {
    mockedGetSettings.mockResolvedValue({
      telegram_bot_token: 'token-from-api',
      telegram_chat_id: '-100999',
      cooldown_minutes: 30,
    })

    render(<Settings />)

    expect(screen.getByText('Đang tải cài đặt...')).toBeInTheDocument()
    expect(await screen.findByDisplayValue('token-from-api')).toBeInTheDocument()
    expect(screen.getByDisplayValue('-100999')).toBeInTheDocument()
    expect(screen.getByDisplayValue('30')).toBeInTheDocument()
  })

  it('shows an error state when settings fail to load', async () => {
    mockedGetSettings.mockRejectedValue(new Error('Settings unavailable'))

    render(<Settings />)

    expect(await screen.findByText('Settings unavailable')).toBeInTheDocument()
  })

  it('saves Telegram settings and cooldown minutes', async () => {
    const user = userEvent.setup()
    mockedUpdateSettings.mockResolvedValue({ ok: true })

    render(<Settings />)

    await waitForSettingsReady()
    await user.type(screen.getByLabelText('Token bot Telegram'), '123:ABC')
    await user.type(screen.getByLabelText('Chat ID Telegram'), '-100123')
    await user.clear(screen.getByLabelText('Thời gian chờ'))
    await user.type(screen.getByLabelText('Thời gian chờ'), '15')
    await user.click(screen.getByRole('button', { name: 'Lưu cài đặt' }))

    await waitFor(() => {
      expect(mockedUpdateSettings).toHaveBeenCalledWith({
        telegram_bot_token: '123:ABC',
        telegram_chat_id: '-100123',
        cooldown_minutes: 15,
      })
    })
    expect(await screen.findByText('Đã lưu cài đặt.')).toBeInTheDocument()
  })

  it('validates cooldown minutes is a number greater than or equal to 1', async () => {
    const user = userEvent.setup()

    render(<Settings />)

    await waitForSettingsReady()
    await user.clear(screen.getByLabelText('Thời gian chờ'))
    await user.type(screen.getByLabelText('Thời gian chờ'), '0')
    await user.click(screen.getByRole('button', { name: 'Lưu cài đặt' }))

    expect(mockedUpdateSettings).not.toHaveBeenCalled()
    expect(await screen.findByText('Thời gian chờ phải là số >= 1 phút.')).toBeInTheDocument()
  })

  it('tests Telegram notification', async () => {
    const user = userEvent.setup()
    mockedTestTelegram.mockResolvedValue({ ok: true })

    render(<Settings />)

    await waitForSettingsReady()
    await user.click(screen.getByRole('button', { name: 'Gửi thử thông báo' }))

    await waitFor(() => {
      expect(mockedTestTelegram).toHaveBeenCalled()
    })
    expect(await screen.findByText('Đã gửi thông báo thử.')).toBeInTheDocument()
  })

  it('shows API errors in toast', async () => {
    const user = userEvent.setup()
    mockedUpdateSettings.mockRejectedValue(new Error('Save failed'))

    render(<Settings />)

    await waitForSettingsReady()
    await user.click(screen.getByRole('button', { name: 'Lưu cài đặt' }))

    expect(await screen.findByText('Save failed')).toBeInTheDocument()
  })
})
