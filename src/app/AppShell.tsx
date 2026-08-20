import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import styles from './AppShell.module.css'

function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

export default function AppShell() {
  const online = useOnlineStatus()
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandMoon} aria-hidden="true">
            🌙
          </span>
          Storytime Library
        </Link>
        <nav aria-label="App" className={styles.headerActions}>
          <Link
            to="/settings"
            className={styles.iconLink}
            aria-label="Settings"
            title="Settings"
          >
            <span aria-hidden="true">⚙️</span>
          </Link>
        </nav>
      </header>
      {!online && (
        <p className={styles.offline} role="status">
          <span aria-hidden="true">📖</span> Reading offline — your saved books are still
          here.
        </p>
      )}
      <main id="main" className={styles.main}>
        <Outlet />
      </main>
    </>
  )
}
