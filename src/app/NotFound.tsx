import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-6)',
        textAlign: 'center',
      }}
    >
      <div>
        <p style={{ fontSize: '3rem' }} aria-hidden="true">
          🔍📚
        </p>
        <h1>That page wandered off</h1>
        <p style={{ margin: 'var(--space-3) 0 var(--space-5)' }}>
          We couldn't find that shelf. Let's head back to the library.
        </p>
        <Link to="/" className="btn btn-primary btn-lg">
          Back to the library
        </Link>
      </div>
    </main>
  )
}
