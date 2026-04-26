import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type AppRole = 'admin' | 'executive' | 'dev'
type NavItem = { to: string; label: string; icon: string; roles?: AppRole[] }

const allLinks: NavItem[] = [
  { to: '/',          label: 'Overview',         icon: 'dashboard',    roles: ['admin', 'executive'] },
  { to: '/features',  label: 'Features',         icon: 'view_list',    roles: ['admin', 'dev'] },
  { to: '/timeline',  label: 'Timeline',         icon: 'timeline' },
  { to: '/team',      label: 'Team',             icon: 'group' },
  { to: '/onboarding',label: 'Onboarding',       icon: 'person_add',   roles: ['admin'] },
  { to: '/risks',     label: 'Risks & Blockers', icon: 'warning',      roles: ['admin', 'dev'] },
  { to: '/uploads',   label: 'Uploads',          icon: 'upload_file',  roles: ['admin'] },
  { to: '/settings',  label: 'Settings',         icon: 'settings',     roles: ['admin'] },
]

export function AppShell({ role }: { role: AppRole }) {
  const { user, signOut, jobTitle } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const links = allLinks.filter((link) => !link.roles || link.roles.includes(role))

  const displayEmail = user?.email ?? ''
  const shortEmail = displayEmail.length > 22 ? displayEmail.slice(0, 20) + '…' : displayEmail

  return (
    <div className="shell">
      {/* ── Mobile menu toggle ── */}
      <button
        type="button"
        className="mobile-menu-toggle"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-expanded={isSidebarOpen}
        aria-controls="main-sidebar"
        aria-label="Toggle navigation menu"
      >
        <span className="material-symbols-rounded">
          {isSidebarOpen ? 'close' : 'menu'}
        </span>
      </button>

      {/* ── Sidebar ── */}
      <aside id="main-sidebar" className={`sidebar${isSidebarOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar-brand">
          <img className="sidebar-brand-logo" src="/ssd-tech-logo.png" alt="SSD-Tech" width={36} height={36} />
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">SSD-Tech</span>
            <span className="sidebar-brand-sub">Project Tracker</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-nav-label">
            {role === 'executive' ? 'Client Portal' : role === 'dev' ? 'Developer' : 'Navigation'}
          </span>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              onClick={() => setIsSidebarOpen(false)}
            >
              <span className="material-symbols-rounded">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* ── User Card ── */}
        <div className="sidebar-footer">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10,
              marginBottom: 8,
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: role === 'admin' ? 'rgba(227,24,55,0.2)' : role === 'dev' ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontFamily: 'Material Symbols Rounded',
                fontSize: 16,
                color: role === 'admin' ? '#e31837' : role === 'dev' ? '#22c55e' : '#3b82f6',
                fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>person</span>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  color: '#cbd5e1',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={displayEmail}
              >
                {shortEmail}
              </div>
              {/* Role badge */}
              <div style={{ marginTop: 3 }}>
                {role === 'admin' ? (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.07em',
                      padding: '2px 7px',
                      borderRadius: 100,
                      background: '#e31837',
                      color: '#fff',
                    }}
                  >
                    ADMIN
                  </span>
                ) : role === 'executive' ? (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.07em',
                      padding: '2px 7px',
                      borderRadius: 100,
                      background: 'rgba(59,130,246,0.15)',
                      color: '#3b82f6',
                      border: '1px solid rgba(59,130,246,0.25)',
                    }}
                  >
                    EXEC
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: '#94a3b8',
                    }}
                  >
                    {jobTitle || 'Developer'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sign out */}
          <button
            id="sidebar-signout-btn"
            onClick={signOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              width: '100%',
              padding: '9px 12px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              color: '#64748b',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'color 0.18s ease, border-color 0.18s ease, background 0.18s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#fb7185'
              e.currentTarget.style.borderColor = 'rgba(227,24,55,0.3)'
              e.currentTarget.style.background = 'rgba(227,24,55,0.06)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#64748b'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.background = 'transparent'
            }}
            aria-label="Sign out"
          >
            <span
              className="material-symbols-rounded"
              style={{ fontSize: 15, fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              logout
            </span>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
