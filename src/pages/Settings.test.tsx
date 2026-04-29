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
    expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument()
  })
}

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetSettings.mockResolvedValue({
      telegramBotToken: '',
      telegramChatId: '',
      cooldownMinutes: 15,
    })
  })

  it('loads saved settings into the form', async () => {
    mockedGetSettings.mockResolvedValue({
      telegramBotToken: 'token-from-api',
      telegramChatId: '-100999',
      cooldownMinutes: 30,
    })

    render(<Settings />)

    expect(screen.getByText('Loading settings...')).toBeInTheDocument()
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
    await user.type(screen.getByLabelText('Telegram Bot Token'), '123:ABC')
    await user.type(screen.getByLabelText('Telegram Chat ID'), '-100123')
    await user.clear(screen.getByLabelText('Cooldown Minutes'))
    await user.type(screen.getByLabelText('Cooldown Minutes'), '15')
    await user.click(screen.getByRole('button', { name: 'Save Settings' }))

    await waitFor(() => {
      expect(mockedUpdateSettings).toHaveBeenCalledWith({
        telegramBotToken: '123:ABC',
        telegramChatId: '-100123',
        cooldownMinutes: 15,
      })
    })
    expect(await screen.findByText('Settings saved.')).toBeInTheDocument()
  })

  it('validates cooldown minutes is a number greater than or equal to 1', async () => {
    const user = userEvent.setup()

    render(<Settings />)

    await waitForSettingsReady()
    await user.clear(screen.getByLabelText('Cooldown Minutes'))
    await user.type(screen.getByLabelText('Cooldown Minutes'), '0')
    await user.click(screen.getByRole('button', { name: 'Save Settings' }))

    expect(mockedUpdateSettings).not.toHaveBeenCalled()
    expect(await screen.findByText('Cooldown minutes must be a number >= 1.')).toBeInTheDocument()
  })

  it('tests Telegram notification', async () => {
    const user = userEvent.setup()
    mockedTestTelegram.mockResolvedValue({ ok: true })

    render(<Settings />)

    await waitForSettingsReady()
    await user.click(screen.getByRole('button', { name: 'Test Notification' }))

    await waitFor(() => {
      expect(mockedTestTelegram).toHaveBeenCalled()
    })
    expect(await screen.findByText('Test notification sent.')).toBeInTheDocument()
  })

  it('shows API errors in toast', async () => {
    const user = userEvent.setup()
    mockedUpdateSettings.mockRejectedValue(new Error('Save failed'))

    render(<Settings />)

    await waitForSettingsReady()
    await user.click(screen.getByRole('button', { name: 'Save Settings' }))

    expect(await screen.findByText('Save failed')).toBeInTheDocument()
  })
})
