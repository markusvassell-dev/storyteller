import { Link, NavLink, Outlet } from 'react-router-dom'
import { useOwnerGate } from '@/lib/ownerGate'

const navStyle = ({ isActive }: { isActive: boolean }) => ({
  fontWeight: 700,
  textDecoration: 'none',
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-pill)',
  background: isActive ? 'var(--color-accent-soft)' : 'transparent',
  color: 'inherit',
  minHeight: 'var(--tap-min)',
  display: 'inline-flex',
  alignItems: 'center',
})

export default function AdminLayout() {
  const lock = useOwnerGate((s) => s.lock)
  return (
    <>
      <a className="skip-link" href="#admin-main">
        Skip to content
      </a>
      <header
        style={{
          background: 'var(--color-night)',
          color: 'var(--color-night-ink)',
          padding:
            'calc(var(--safe-top) + var(--space-2)) calc(var(--safe-right) + var(--space-4)) var(--space-2) calc(var(--safe-left) + var(--space-4))',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          flexWrap: 'wrap',
        }}
      >
        <Link
          to="/"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 800, textDecoration: 'none', color: 'inherit', minHeight: 'var(--tap-min)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
        >
          <span aria-hidden="true">🌙</span> Storytime
        </Link>
        <span className="badge" style={{ background: 'var(--color-accent)', color: '#241505', border: 'none' }}>
          🛠️ Owner workshop
        </span>
        <span style={{ flex: 1 }} />
        <button type="button" className="btn btn-outline" style={{ color: 'inherit', borderColor: 'rgb(255 255 255 / .4)' }} onClick={lock}>
          Lock workshop
        </button>
      </header>
      <nav
        aria-label="Workshop sections"
        style={{
          display: 'flex',
          gap: 'var(--space-1)',
          flexWrap: 'wrap',
          padding: 'var(--space-3) calc(var(--safe-right) + var(--space-4)) var(--space-2) calc(var(--safe-left) + var(--space-4))',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg-raised)',
        }}
      >
        <NavLink to="/admin" end style={navStyle}>
          Overview
        </NavLink>
        <NavLink to="/admin/books" style={navStyle}>
          Books
        </NavLink>
        <NavLink to="/admin/categories" style={navStyle}>
          Categories
        </NavLink>
        <NavLink to="/admin/backup" style={navStyle}>
          Backup &amp; restore
        </NavLink>
        <NavLink to="/admin/integrity" style={navStyle}>
          Library check
        </NavLink>
      </nav>
      <main
        id="admin-main"
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 1100,
          marginInline: 'auto',
          padding:
            'var(--space-5) calc(var(--safe-right) + var(--space-4)) calc(var(--safe-bottom) + var(--space-7)) calc(var(--safe-left) + var(--space-4))',
        }}
      >
        <Outlet />
      </main>
    </>
  )
}
