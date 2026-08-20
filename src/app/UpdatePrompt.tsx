import { useRegisterSW } from 'virtual:pwa-register/react'

/** Shows a gentle banner when a new version of the app has been downloaded. */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true })

  if (!needRefresh) return null

  return (
    <div
      role="alertdialog"
      aria-label="Update available"
      style={{
        position: 'fixed',
        insetInline: 'var(--space-4)',
        bottom: 'calc(var(--safe-bottom) + var(--space-4))',
        zIndex: 60,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-bg-raised)',
        color: 'var(--color-ink)',
        boxShadow: 'var(--shadow-raised)',
        maxWidth: 480,
        marginInline: 'auto',
      }}
    >
      <p style={{ flex: 1, minWidth: 180 }}>
        <strong>A fresh version is ready.</strong>
        <br />
        Reload to get the latest Storytime Library.
      </p>
      <button className="btn btn-primary" onClick={() => void updateServiceWorker(true)}>
        Reload
      </button>
      <button className="btn btn-outline" onClick={() => setNeedRefresh(false)}>
        Later
      </button>
    </div>
  )
}
