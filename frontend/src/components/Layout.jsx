import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Zap, BarChart2, History, LogOut, BookOpen, FlaskConical,
  Fingerprint, FileSpreadsheet, GitCompare, Bell, CreditCard, Network,
} from 'lucide-react'
import api from '../api.js'
import styles from './Layout.module.css'
import LogoIcon from './LogoIcon.jsx'

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { to: '/app',         label: 'Dashboard', icon: LayoutDashboard },
      { to: '/app/predict', label: 'Predict',   icon: Zap },
      { to: '/app/analyze', label: 'Analyze',   icon: Fingerprint },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/app/batch',      label: 'Batch Scanner',  icon: FileSpreadsheet },
      { to: '/app/txnhistory', label: 'Card History',   icon: CreditCard },
      { to: '/app/compare',    label: 'Compare',        icon: GitCompare },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/app/models',  label: 'Models',   icon: BarChart2 },
      { to: '/app/history', label: 'History',  icon: History },
      { to: '/app/monitor', label: 'Monitor',  icon: Bell },
    ],
  },
  {
    label: 'Info',
    items: [
      { to: '/app/about',     label: 'About',       icon: BookOpen },
      { to: '/app/algorithm', label: 'Algorithm',   icon: FlaskConical },
      { to: '/app/diagrams',  label: 'Diagrams',    icon: Network },
    ],
  },
]

export default function Layout() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    api.get('/auth/me').then(r => setUser(r.data)).catch(() => {})
  }, [])

  function logout() {
    localStorage.removeItem('token')
    navigate('/')
  }

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? '??'

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        {/* Logo */}
        <div className={styles.logoWrap}>
          <div className={styles.logoRow}>
            <div className={styles.logoIcon}>
              <LogoIcon size={17} color="#0d1117" />
            </div>
            <div className={styles.logo}>
              FRAUD<span className={styles.logoAccent}>NET</span>
            </div>
          </div>
          <div className={styles.logoTag}>
            <span className={styles.onlineDot} />
            Detection Engine v1.0
          </div>
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          {NAV_GROUPS.map(({ label, items }) => (
            <div key={label}>
              <div className={styles.navSection}>{label}</div>
              {items.map(({ to, label: itemLabel, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/app'}
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.active : ''}`
                  }
                >
                  <Icon size={15} />
                  {itemLabel}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={styles.sidebarFooter}>
          {user && (
            <div className={styles.userBadge}>
              <div className={styles.userAvatar}>{initials}</div>
              <div className={styles.userName}>{user.username}</div>
            </div>
          )}
          <button className={styles.logout} onClick={logout}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
