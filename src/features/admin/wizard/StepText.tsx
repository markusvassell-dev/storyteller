import { isTtsSupported, speak, stopSpeech } from '@/lib/tts'
import PagePreview from './PagePreview'
import type { Draft } from './wizardTypes'
import styles from './wizard.module.css'

interface Props {
  draft: Draft
  update: (patch: Partial<Draft>) => void
}

export default function StepText({ draft, update }: Props) {
  const patchPage = (index: number, patch: Partial<Draft['pages'][number]>) => {
    update({
      pages: draft.pages.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    })
  }

  return (
    <>
      <h2 style={{ marginBottom: 'var(--space-2)' }}>4 · Page text &amp; descriptions</h2>
      <p style={{ color: 'var(--color-ink-soft)', maxWidth: '68ch', marginBottom: 'var(--space-2)' }}>
        <strong>Picture description</strong> (required) is read by screen readers.{' '}
        <strong>Page text</strong> is shown under the artwork — for scanned books whose
        words are already in the picture, you can leave it empty.{' '}
        <strong>Spoken text</strong> is what the read-aloud voice says; it falls back to
        the page text.
      </p>
      <p style={{ color: 'var(--color-ink-soft)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
        Type the words yourself from your copy of the book — this app deliberately has no
        automatic text extraction, so what you enter is always reviewed by you.
      </p>

      {draft.pages.map((page, i) => (
        <div className={styles.textRow} key={page.key}>
          <div>
            <span className={styles.pageNum}>Page {i + 1}</span>
            <PagePreview page={page} alt={`Preview of page ${i + 1}`} />
          </div>
          <div>
            <div className="field">
              <label htmlFor={`alt-${page.key}`}>Picture description (alt text) *</label>
              <input
                id={`alt-${page.key}`}
                type="text"
                value={page.alt}
                onChange={(e) => patchPage(i, { alt: e.target.value })}
                placeholder="e.g. A fox curls up under a big oak tree at dusk"
              />
            </div>
            <div className="field">
              <label htmlFor={`text-${page.key}`}>Page text (shown to the reader)</label>
              <textarea
                id={`text-${page.key}`}
                rows={2}
                value={page.text}
                onChange={(e) => patchPage(i, { text: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={`ntext-${page.key}`}>Spoken text (if different)</label>
              <textarea
                id={`ntext-${page.key}`}
                rows={2}
                value={page.narrationText}
                onChange={(e) => patchPage(i, { narrationText: e.target.value })}
              />
            </div>
            {isTtsSupported() ? (
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => speak(page.narrationText || page.text || page.alt)}
                >
                  🔊 Hear it
                </button>
                <button type="button" className="btn btn-outline" onClick={() => stopSpeech()}>
                  ⏹ Stop
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </>
  )
}
