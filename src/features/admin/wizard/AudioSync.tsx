import { useEffect, useRef, useState } from 'react'
import { cuesFromMarks, formatTime, marksFromCues, type Cue } from '@/lib/audioCues'
import PagePreview from './PagePreview'
import type { DraftPage } from './wizardTypes'
import styles from './wizard.module.css'

/**
 * Read-along timing: play the recording and tap once as each page finishes.
 *
 * Typing twenty timestamps into a table is miserable and error-prone; a
 * grown-up listening with the book in hand already knows exactly when to turn
 * the page, so the tap *is* the measurement.
 */

interface Props {
  pages: DraftPage[]
  audio: Blob
  duration?: number
  onApply: (cues: (Cue | undefined)[]) => void
  onClose: () => void
}

/**
 * Each mark is a page's end, which is also the next page's start — except the
 * last one, which is just where the reading stops.
 */
function nudgeLabel(index: number, pageCount: number): string {
  return index >= pageCount - 1
    ? `Move the end of page ${index + 1}`
    : `Move page ${index + 2} start`
}

export default function AudioSync({ pages, audio, duration, onApply, onClose }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [url] = useState(() => URL.createObjectURL(audio))
  const [marks, setMarks] = useState<number[]>(() =>
    marksFromCues(pages.map((p) => (p.cueStart === undefined ? undefined : { start: p.cueStart, end: p.cueEnd }))),
  )
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [total, setTotal] = useState(duration ?? 0)

  useEffect(() => () => URL.revokeObjectURL(url), [url])

  // The page currently being listened to is the first one without a mark.
  const currentIndex = Math.min(marks.length, pages.length - 1)
  const done = marks.length >= pages.length - 1

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) {
      void el.play()
      setPlaying(true)
    } else {
      el.pause()
      setPlaying(false)
    }
  }

  const mark = () => {
    const el = audioRef.current
    if (!el) return
    setMarks((m) => (m.length >= pages.length - 1 ? m : [...m, Number(el.currentTime.toFixed(2))]))
  }

  const undo = () => setMarks((m) => m.slice(0, -1))
  const restart = () => {
    setMarks([])
    const el = audioRef.current
    if (el) el.currentTime = 0
  }

  const nudge = (index: number, delta: number) =>
    setMarks((m) => m.map((v, i) => (i === index ? Math.max(0, Number((v + delta).toFixed(2))) : v)))

  const cues = cuesFromMarks(marks, pages.length, total || duration)

  return (
    <div className={styles.editorBackdrop} role="dialog" aria-label="Match the recording to the pages">
      <div className={styles.editorPanel}>
        <div className={styles.editorHeader}>
          <h3 style={{ fontSize: 'var(--text-md)' }}>Match the recording to the pages</h3>
          <button type="button" className="btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <p className={styles.editorHint}>
          Press play, follow along, and tap <strong>Turn the page</strong> the moment each
          page finishes. The last page runs to the end of the recording.
        </p>

        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            if (Number.isFinite(e.currentTarget.duration)) setTotal(e.currentTarget.duration)
          }}
          onEnded={() => setPlaying(false)}
        />

        <div className={styles.syncStage}>
          <div className={styles.syncPage}>
            {pages[currentIndex] ? (
              <PagePreview page={pages[currentIndex]!} alt={`Page ${currentIndex + 1}`} />
            ) : null}
            <span className={styles.pageNum}>
              {done ? 'All pages marked' : `Listening for page ${currentIndex + 1}`}
            </span>
          </div>
          <div className={styles.syncText}>
            <p className={styles.syncClock} aria-live="off">
              {formatTime(time)} <span className={styles.editorValue}>/ {formatTime(total)}</span>
            </p>
            <p className={styles.editorHint}>
              {pages[currentIndex]?.text?.slice(0, 220) ||
                'No page text — follow the pictures instead.'}
            </p>
          </div>
        </div>

        <div className={styles.editorRow}>
          <button type="button" className="btn btn-primary btn-lg" onClick={toggle}>
            {playing ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            type="button"
            className="btn btn-lg"
            onClick={mark}
            disabled={done}
            style={{ flex: 1 }}
          >
            👉 Turn the page ({Math.min(marks.length + 1, pages.length)}/{pages.length})
          </button>
        </div>

        <div className={styles.editorRow}>
          <button type="button" className="btn" onClick={undo} disabled={marks.length === 0}>
            ↩ Undo last
          </button>
          <button type="button" className="btn" onClick={restart} disabled={marks.length === 0}>
            Start over
          </button>
          <span style={{ flex: 1 }} />
          <span className={styles.editorValue}>{marks.length} marked</span>
        </div>

        {marks.length > 0 ? (
          <ol className={styles.syncList}>
            {cues.map((cue, i) =>
              cue ? (
                <li key={i} className={styles.syncListItem}>
                  <span className={styles.pageNum}>p{i + 1}</span>
                  <span className={styles.editorValue}>
                    {formatTime(cue.start)}–{formatTime(cue.end)}
                  </span>
                  {i < marks.length ? (
                    <>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => nudge(i, -0.5)}
                        aria-label={`${nudgeLabel(i, pages.length)} half a second earlier`}
                      >
                        −½s
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => nudge(i, 0.5)}
                        aria-label={`${nudgeLabel(i, pages.length)} half a second later`}
                      >
                        +½s
                      </button>
                    </>
                  ) : null}
                </li>
              ) : null,
            )}
          </ol>
        ) : null}

        <div className={styles.editorActions}>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              audioRef.current?.pause()
              onApply(cues)
              onClose()
            }}
            disabled={marks.length === 0}
          >
            Use these timings
          </button>
        </div>
      </div>
    </div>
  )
}
