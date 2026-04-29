import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { Settings } from './pages/Settings'
import { SignalHistory } from './pages/SignalHistory'
import { StrategyConfig } from './pages/StrategyConfig'
import { Watchlist } from './pages/Watchlist'

const navItems = [
  { to: '/watchlist', label: 'Watchlist' },
  { to: '/strategy-config', label: 'Strategy Config' },
  { to: '/settings', label: 'Settings' },
  { to: '/signal-history', label: 'Signal History' },
]

function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Crypto Signal</p>
          <h1>Signal Desk</h1>
        </div>
        <nav className="topnav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link-active' : 'nav-link'
              }
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="page-frame">
        <Routes>
          <Route index element={<Navigate replace to="/watchlist" />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/strategy-config" element={<StrategyConfig />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/signal-history" element={<SignalHistory />} />
          <Route path="*" element={<Navigate replace to="/watchlist" />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
