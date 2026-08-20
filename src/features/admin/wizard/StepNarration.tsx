import { useRef, useState, type ChangeEvent } from 'react'
import type { Draft } from './wizardTypes'
import styles from './wizard.module.css'

interface Props {
  draft: Draft
  update: (patch: Partial<Draft>) => void
}

function readAudioDuration(blob: Blob): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(audio.duration) ? audio.duration : undefined)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(undefined)
    }
    audio.src = url
  })
}

export default function StepNarration({ draft, update }: Props) {
  const [playingKey, setPlayingKey] = useState<string>()
  const audioRef = useRef<HTMLAudioElement | undefined>(undefined)
  const bookAudioInput = useRef<HTMLInputElement>(null)

  const patchPage = (index: number, patch: Partial<Draft['pages'][number]>) => {
    update({ pages: draft.pages.map((p, i) => (i === index ? { ...p, ...patch } : p)) })
  }

  const onPageAudio = async (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const duration = await readAudioDuration(file)
    patchPage(index, { audioBlob: file, audioName: file.name, audioDuration: duration })
  }

  const onBookAudio = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const duration = await readAudioDuration(file)
    update({ bookAudioBlob: file, bookAudioName: file.name, bookAudioDuration: duration })
  }

  const preview = (key: string, blob?: Blob) => {
    audioRef.current?.pause()
    if (playingKey === key) {
      setPlayingKey(undefined)
      return
    }
    if (!blob) return
    const audio = new Audio(URL.createObjectURL(blob))
    audio.onended = () => setPlayingKey(undefined)
    audioRef.current = audio
    void audio.play()
    setPlayingKey(key)
  }

  return (
    <>
      <h2 style={{ marginBottom: 'var(--space-2)' }}>5 · Narration (optional)</h2>
      <p style={{ color: 'var(--color-ink-soft)', maxWidth: '65ch', marginBottom: 'var(--space-4)' }}>
        Add your own recordings — one file per page, or one recording for the whole book
        with a start time for each page. Books without recordings still get the device's
        read-aloud voice.
      </p>

      <div className="field">
        <label style={{ display: 'inline-flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={draft.useBookAudio}
            onChange={(e) => update({ useBookAudio: e.target.checked })}
            style={{ width: 24, height: 24 }}
          />
          Use one whole-book recording with page timestamps
        </label>
      </div>

      {draft.useBookAudio ? (
        <section style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={() => bookAudioInput.current?.click()}>
              {draft.bookAudioBlob || draft.bookAudioRef ? 'Replace recording…' : 'Choose recording…'}
            </button>
            <input
              ref={bookAudioInput}
              type="file"
              accept="audio/*,.mp3,.m4a,.aac,.ogg,.wav"
              className="visually-hidden"
              aria-label="Choose whole-book audio"
              onChange={(e) => void onBookAudio(e)}
            />
            {draft.bookAudioName ? <span>{draft.bookAudioName}</span> : null}
            {draft.bookAudioDuration ? (
              <span className="badge">⏱ {Math.round(draft.bookAudioDuration)}s</span>
            ) : null}
            {draft.bookAudioBlob ? (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => preview('book', draft.bookAudioBlob)}
              >
                {playingKey === 'book' ? '⏹ Stop' : '▶ Preview'}
              </button>
            ) : null}
          </div>
          <table style={{ marginTop: 'var(--space-3)', borderCollapse: 'collapse' }}>
            <caption className="visually-hidden">Page start times within the recording</caption>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', paddingRight: 'var(--space-4)' }}>Page</th>
                <th style={{ textAlign: 'left', paddingRight: 'var(--space-4)' }}>Starts at (seconds)</th>
                <th style={{ textAlign: 'left' }}>Ends at (optional)</th>
              </tr>
            </thead>
            <tbody>
              {draft.pages.map((p, i) => (
                <tr key={p.key}>
                  <td style={{ fontWeight: 700, paddingRight: 'var(--space-4)' }}>{i + 1}</td>
                  <td style={{ paddingRight: 'var(--space-4)' }}>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      className="input"
                      style={{ width: 110 }}
                      aria-label={`Page ${i + 1} start time in seconds`}
                      value={p.cueStart ?? ''}
                      onChange={(e) =>
                        patchPage(i, {
                          cueStart: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      className="input"
                      style={{ width: 110 }}
                      aria-label={`Page ${i + 1} end time in seconds`}
                      value={p.cueEnd ?? ''}
                      onChange={(e) =>
                        patchPage(i, {
                          cueEnd: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          {draft.pages.map((p, i) => (
            <li
              key={p.key}
              style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap', borderTop: i > 0 ? '1px solid var(--color-border)' : undefined, paddingTop: 'var(--space-2)' }}
            >
              <span className={styles.pageNum} style={{ minWidth: 70 }}>
                Page {i + 1}
              </span>
              <label className="btn" style={{ cursor: 'pointer' }}>
                {p.audioBlob || p.audioRef ? 'Replace audio…' : 'Add audio…'}
                <input
                  type="file"
                  accept="audio/*,.mp3,.m4a,.aac,.ogg,.wav"
                  className="visually-hidden"
                  onChange={(e) => void onPageAudio(i, e)}
                />
              </label>
              {p.audioName ?? (p.audioRef ? 'Saved recording' : null) ? (
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-soft)' }}>
                  {p.audioName ?? 'Saved recording'}
                  {p.audioDuration ? ` · ${Math.round(p.audioDuration)}s` : ''}
                </span>
              ) : null}
              {p.audioBlob ? (
                <button type="button" className="btn btn-outline" onClick={() => preview(p.key, p.audioBlob)}>
                  {playingKey === p.key ? '⏹ Stop' : '▶ Preview'}
                </button>
              ) : null}
              {p.audioBlob || p.audioRef ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() =>
                    patchPage(i, { audioBlob: undefined, audioRef: undefined, audioName: undefined, audioDuration: undefined })
                  }
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: 'grid', gap: '0 var(--space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div className="field">
          <label htmlFor="n-voice">Who is narrating? (shown to readers)</label>
          <input
            id="n-voice"
            type="text"
            value={draft.voiceLabel}
            onChange={(e) => update({ voiceLabel: e.target.value })}
            placeholder="e.g. Read by Grandma"
          />
        </div>
        <div className="field">
          <label style={{ display: 'inline-flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={draft.synthetic}
              onChange={(e) => update({ synthetic: e.target.checked })}
              style={{ width: 24, height: 24 }}
            />
            This recording is computer-generated (will be disclosed)
          </label>
        </div>
        <div className="field">
          <label style={{ display: 'inline-flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={draft.autoAdvance}
              onChange={(e) => update({ autoAdvance: e.target.checked })}
              style={{ width: 24, height: 24 }}
            />
            Suggest automatic page turns while narrating
          </label>
        </div>
      </div>
    </>
  )
}
