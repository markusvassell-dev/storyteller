import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { hasPin, setPin, verifyPin, useOwnerGate } from '@/lib/ownerGate'

export default function OwnerGateScreen() {
  const unlock = useOwnerGate((s) => s.unlock)
  const [mode] = useState<'create' | 'enter'>(() => (hasPin() ? 'enter' : 'create'))
  const [pin, setPinValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(undefined)
    if (pin.length < 4) {
      setError('Please use at least 4 digits.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'create') {
        if (pin !== confirm) {
          setError("Those PINs don't match — try again.")
          return
        }
        await setPin(pin)
        unlock()
      } else {
        const ok = await verifyPin(pin)
        if (ok) unlock()
        else setError("That PIN isn't right.")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-5)',
      }}
    >
      <form
        onSubmit={(e) => void onSubmit(e)}
        style={{
          width: 'min(420px, 100%)',
          background: 'var(--color-bg-raised)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-raised)',
          padding: 'var(--space-6)',
        }}
      >
        <p style={{ fontSize: '2.6rem', textAlign: 'center' }} aria-hidden="true">
          🛠️
        </p>
        <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-2)' }}>
          Owner workshop
        </h1>
        <p style={{ color: 'var(--color-ink-soft)', marginBottom: 'var(--space-4)' }}>
          {mode === 'create'
            ? 'Choose a PIN to keep little fingers out of the book-editing tools.'
            : 'Enter your owner PIN to open the workshop.'}
        </p>

        <div className="field">
          <label htmlFor="gate-pin">{mode === 'create' ? 'New PIN' : 'PIN'}</label>
          <input
            id="gate-pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPinValue(e.target.value)}
            aria-describedby={error ? 'gate-error' : undefined}
          />
        </div>
        {mode === 'create' ? (
          <div className="field">
            <label htmlFor="gate-confirm">Repeat PIN</label>
            <input
              id="gate-confirm"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        ) : null}
        {error ? (
          <p id="gate-error" role="alert" className="error" style={{ color: 'var(--color-danger)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
            {error}
          </p>
        ) : null}
        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy}>
          {mode === 'create' ? 'Set PIN and open workshop' : 'Unlock'}
        </button>
        <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-soft)' }}>
          The PIN is a convenience lock stored on this device, not high security. Your
          private books never leave the device either way.
        </p>
        <p style={{ marginTop: 'var(--space-3)', textAlign: 'center' }}>
          <Link to="/">← Back to the library</Link>
        </p>
      </form>
    </main>
  )
}
