import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { BUILT_IN_CATEGORIES, type CategoryDef } from '@/lib/categories'
import type { Draft } from './wizardTypes'

interface Props {
  draft: Draft
  update: (patch: Partial<Draft>) => void
}

export default function StepMetadata({ draft, update }: Props) {
  const custom = useLiveQuery(async () => {
    const row = await db.kv.get('customCategories')
    return (row?.value as CategoryDef[] | undefined) ?? []
  }, [])
  const allCategories = [...BUILT_IN_CATEGORIES, ...(custom ?? [])]

  const toggleCategory = (id: string) => {
    update({
      categories: draft.categories.includes(id)
        ? draft.categories.filter((c) => c !== id)
        : [...draft.categories, id],
    })
  }

  return (
    <>
      <h2 style={{ marginBottom: 'var(--space-3)' }}>2 · Book details</h2>
      <div style={{ display: 'grid', gap: '0 var(--space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div className="field">
          <label htmlFor="m-title">Title *</label>
          <input
            id="m-title"
            type="text"
            value={draft.title}
            onChange={(e) => update({ title: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="m-subtitle">Subtitle</label>
          <input
            id="m-subtitle"
            type="text"
            value={draft.subtitle}
            onChange={(e) => update({ subtitle: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="m-authors">Author(s) *</label>
          <input
            id="m-authors"
            type="text"
            value={draft.authors}
            onChange={(e) => update({ authors: e.target.value })}
            placeholder="Separate with commas"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="m-illustrators">Illustrator(s)</label>
          <input
            id="m-illustrators"
            type="text"
            value={draft.illustrators}
            onChange={(e) => update({ illustrators: e.target.value })}
            placeholder="Separate with commas"
          />
        </div>
        <div className="field">
          <label htmlFor="m-translators">Translator(s)</label>
          <input
            id="m-translators"
            type="text"
            value={draft.translators}
            onChange={(e) => update({ translators: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="m-age">Age range</label>
          <select
            id="m-age"
            value={draft.ageRange}
            onChange={(e) => update({ ageRange: e.target.value as Draft['ageRange'] })}
          >
            <option value="0-3">0–3</option>
            <option value="3-5">3–5</option>
            <option value="4-8">4–8</option>
            <option value="6-10">6–10</option>
            <option value="all-ages">All ages</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="m-level">Reading level</label>
          <select
            id="m-level"
            value={draft.readingLevel}
            onChange={(e) => update({ readingLevel: e.target.value as Draft['readingLevel'] })}
          >
            <option value="">Not set</option>
            <option value="pre-reader">Pre-reader (read to me)</option>
            <option value="early-reader">Early reader</option>
            <option value="independent">Independent reader</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="m-minutes">Estimated minutes to read</label>
          <input
            id="m-minutes"
            type="number"
            min={1}
            max={180}
            value={draft.estimatedMinutes}
            onChange={(e) => update({ estimatedMinutes: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="m-tags">Tags</label>
          <input
            id="m-tags"
            type="text"
            value={draft.tags}
            onChange={(e) => update({ tags: e.target.value })}
            placeholder="e.g. dragons, rhyming"
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="m-description">Short description</label>
        <textarea
          id="m-description"
          value={draft.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={3}
        />
      </div>

      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 700, fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
          Shelves (categories)
        </legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {allCategories.map((c) => (
            <label
              key={c.id}
              className="badge"
              style={{
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                minHeight: 'var(--tap-min)',
                paddingInline: 'var(--space-3)',
                background: draft.categories.includes(c.id)
                  ? 'var(--color-accent-soft)'
                  : undefined,
                borderColor: draft.categories.includes(c.id)
                  ? 'var(--color-accent)'
                  : undefined,
              }}
            >
              <input
                type="checkbox"
                checked={draft.categories.includes(c.id)}
                onChange={() => toggleCategory(c.id)}
                style={{ marginRight: 6 }}
              />
              <span aria-hidden="true">{c.emoji}</span> {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field" style={{ marginTop: 'var(--space-4)' }}>
        <label htmlFor="m-hidden" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <input
            id="m-hidden"
            type="checkbox"
            checked={draft.hidden}
            onChange={(e) => update({ hidden: e.target.checked })}
            style={{ width: 24, height: 24 }}
          />
          Keep this book hidden from the library for now
        </label>
      </div>
    </>
  )
}
