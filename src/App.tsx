import {
  Activity,
  BrainCircuit,
  CircleUserRound,
  GitBranch,
  Network,
  Radio,
  Settings as SettingsIcon,
  Star,
} from 'lucide-react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { SignalNotifier } from './components/SignalNotifier'
import { Settings } from './pages/Settings'
import { SignalHistory } from './pages/SignalHistory'
import { StrategyConfig } from './pages/StrategyConfig'
import { Watchlist } from './pages/Watchlist'

const navItems = [
  { to: '/watchlist', label: 'Danh sách', icon: Star },
  { to: '/strategy-config', label: 'Chiến lược', icon: BrainCircuit },
  { to: '/signal-history', label: 'Tín hiệu', icon: Radio },
  { to: '/settings', label: 'Cài đặt', icon: SettingsIcon },
]

const pageMeta: Record<string, { title: string; search?: string }> = {
  '/watchlist': { title: 'SignalPro', search: 'Tìm nhanh...' },
  '/strategy-config': { title: 'SignalPro', search: 'Tìm cặp...' },
  '/settings': { title: 'Cấu hình' },
  '/signal-history': { title: 'Lịch sử tín hiệu', search: 'Tìm tín hiệu...' },
}

function App() {
  const location = useLocation()
  const meta = pageMeta[location.pathname] ?? pageMeta['/watchlist']

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <h1>SignalPro</h1>
          <p>Chuẩn chuyên nghiệp</p>
        </div>

        <nav className="side-nav" aria-label="Điều hướng chính">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                className={({ isActive }) =>
                  isActive ? 'side-link side-link-active' : 'side-link'
                }
                key={item.to}
                to={item.to}
              >
                <Icon size={22} strokeWidth={2} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="user-card">
          <div className="avatar">
            <CircleUserRound size={17} />
          </div>
          <div>
            <strong>Trader Alpha</strong>
            <span>PRO</span>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-title">
            <h2>{meta.title}</h2>
          </div>
          <div className="topbar-actions">
            {meta.search ? (
              <label className="search-field">
                <Activity size={16} />
                <input placeholder={meta.search} />
              </label>
            ) : null}
            <button className="icon-button" type="button" aria-label="Trung tâm mạng">
              <GitBranch size={22} />
            </button>
            <button className="icon-button" type="button" aria-label="Sơ đồ liên kết">
              <Network size={22} />
            </button>
            <button className="icon-button" type="button" aria-label="Tài khoản">
              <CircleUserRound size={24} />
            </button>
            <button className="live-button" type="button">
              <span />
              Đang chạy
            </button>
          </div>
        </header>

        <main className="content-canvas">
          <Routes>
            <Route index element={<Navigate replace to="/watchlist" />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/strategy-config" element={<StrategyConfig />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/signal-history" element={<SignalHistory />} />
            <Route path="*" element={<Navigate replace to="/watchlist" />} />
          </Routes>
        </main>
        <SignalNotifier />
      </div>
    </div>
  )
}

export default App
