import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { BUILT_IN_CATEGORIES, type CategoryDef } from '@/lib/categories'
import { slugify } from '@/lib/util'

const KV_KEY = 'customCategories'

export default function AdminCategories() {
  const custom = useLiveQuery(async () => {
    const row = await db.kv.get(KV_KEY)
    return (row?.value as CategoryDef[] | undefined) ?? []
  }, [])
  const [label, setLabel] = useState('')
  const [emoji, setEmoji] = useState('📚')
  const [error, setError] = useState<string>()

  const save = async (next: CategoryDef[]) => {
    await db.kv.put({ key: KV_KEY, value: next })
  }

  const add = async (e: FormEvent) => {
    e.preventDefault()
    setError(undefined)
    const id = slugify(label)
    if (!id) {
      setError('Give the category a name first.')
      return
    }
    if (
      BUILT_IN_CATEGORIES.some((c) => c.id === id) ||
      (custom ?? []).some((c) => c.id === id)
    ) {
      setError('A category with that name already exists.')
      return
    }
    await save([...(custom ?? []), { id, label: label.trim(), emoji: emoji || '📚' }])
    setLabel('')
    setEmoji('📚')
  }

  return (
    <>
      <h1 style={{ marginBottom: 'var(--space-2)' }}>Categories</h1>
      <p style={{ color: 'var(--color-ink-soft)', maxWidth: '60ch', marginBottom: 'var(--space-4)' }}>
        Categories become shelves on the library home screen. The built-in shelves are
        always available; add your own for anything special.
      </p>

      <h2 style={{ fontSize: 'var(--text-lg)', margin: 'var(--space-4) 0 var(--space-2)' }}>
        Built-in shelves
      </h2>
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {BUILT_IN_CATEGORIES.map((c) => (
          <li key={c.id} className="badge" style={{ fontSize: 'var(--text-sm)' }}>
            <span aria-hidden="true">{c.emoji}</span> {c.label}
          </li>
        ))}
      </ul>

      <h2 style={{ fontSize: 'var(--text-lg)', margin: 'var(--space-5) 0 var(--space-2)' }}>
        Your categories
      </h2>
      {custom === undefined ? (
        <p role="status">Loading…</p>
      ) : custom.length === 0 ? (
        <p style={{ color: 'var(--color-ink-soft)' }}>None yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 'var(--space-2)', maxWidth: 480 }}>
          {custom.map((c) => (
            <li
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                background: 'var(--color-bg-raised)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2) var(--space-3)',
              }}
            >
              <span aria-hidden="true">{c.emoji}</span>
              <span style={{ flex: 1, fontWeight: 700 }}>{c.label}</span>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => void save(custom.filter((x) => x.id !== c.id))}
                aria-label={`Remove category ${c.label}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(e) => void add(e)} style={{ maxWidth: 480, marginTop: 'var(--space-4)' }}>
        <div className="field">
          <label htmlFor="cat-name">New category name</label>
          <input
            id="cat-name"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Dinosaur Week"
          />
        </div>
        <div className="field">
          <label htmlFor="cat-emoji">Icon (emoji)</label>
          <input
            id="cat-emoji"
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
            style={{ maxWidth: 100 }}
          />
        </div>
        {error ? (
          <p role="alert" style={{ color: 'var(--color-danger)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
            {error}
          </p>
        ) : null}
        <button className="btn btn-primary">Add category</button>
      </form>
    </>
  )
}
