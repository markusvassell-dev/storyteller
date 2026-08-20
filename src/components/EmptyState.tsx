import type { ReactNode } from 'react'

interface Props {
  emoji: string
  title: string
  children?: ReactNode
}

export default function EmptyState({ emoji, title, children }: Props) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: 'var(--space-7) var(--space-5)',
        background: 'var(--color-bg-raised)',
        borderRadius: 'var(--radius-xl)',
        border: `2px dashed var(--color-border)`,
        margin: 'var(--space-5) 0',
      }}
    >
      <p style={{ fontSize: '2.6rem', marginBottom: 'var(--space-2)' }} aria-hidden="true">
        {emoji}
      </p>
      <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>{title}</h2>
      {children}
    </div>
  )
}
