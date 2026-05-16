import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Trophy, Users, User } from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Quests' },
  { to: '/leaderboard', icon: Trophy, label: 'Ranks' },
  { to: '/friends', icon: Users, label: 'Friends' },
  { to: '/profile', icon: User, label: 'Hunter' },
]

export function AppLayout() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: '56px', background: 'rgba(8,10,15,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--accent-purple)', letterSpacing: '0.15em' }}>RISE</span>
      </header>
      <main style={{ flex: 1, paddingTop: '56px', paddingBottom: '72px', overflowY: 'auto' }}><Outlet /></main>
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, height: '64px', background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 8px' }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} style={{ textDecoration: 'none', flex: 1 }}>
            {({ isActive }) => (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px', color: isActive ? 'var(--accent-purple)' : 'var(--text-dim)', transition: 'color 0.2s' }}>
                <Icon size={20} />
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.05em' }}>{label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}