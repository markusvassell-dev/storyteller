import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLibraryBook } from '@/lib/library'
import { recordOpened, recordPageTurn } from '@/lib/bookState'
import { releaseAssetUrl, resolveAssetUrl } from '@/lib/assets'
import { useAssetUrl } from '@/lib/useAssetUrl'
import { useSettings } from '@/lib/settings'
import type { StoryBook, StoryPage } from '@/lib/schema'
import { clamp } from '@/lib/util'
import { computeSpreads } from './spreads'
import { useNarration } from './useNarration'
import styles from './Reader.module.css'

const TURN_DEBOUNCE_MS = 300
const SWIPE_THRESHOLD_PX = 60

function useViewportWide(threshold: number): boolean {
  const [wide, setWide] = useState(() => window.innerWidth >= threshold)
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= threshold)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [threshold])
  return wide
}

function PageView({
  book,
  page,
  narrating,
}: {
  book: StoryBook
  page: StoryPage
  narrating: boolean
}) {
  const url = useAssetUrl(page.image)
  const fit = page.layout?.fit ?? 'contain'
  const textPosition = page.layout?.textPosition ?? 'below'
  const focal = page.focalPoint
  const imgStyle: CSSProperties | undefined =
    fit === 'cover' && focal
      ? { objectPosition: `${focal.x * 100}% ${focal.y * 100}%` }
      : undefined

  return (
    <div className={styles.page}>
      <div className={`${styles.pageImageWrap} ${narrating ? styles.narrating : ''}`}>
        {url ? (
          <img
            className={`${styles.pageImage} ${fit === 'cover' ? styles.pageImageCover : ''}`}
            src={url}
            alt={page.alt}
            style={imgStyle}
            draggable={false}
          />
        ) : (
          <p role="status" style={{ color: 'var(--color-night-ink-soft)' }}>
            Loading page {page.number}…
          </p>
        )}
        {textPosition === 'overlay-bottom' && page.text ? (
          <p className={`${styles.pageText} ${styles.pageTextOverlay}`}>{page.text}</p>
        ) : null}
      </div>
      {textPosition === 'below' && page.text ? (
        <p className={styles.pageText}>{page.text}</p>
      ) : null}
      <p className="visually-hidden">
        Page {page.label ?? page.number} of {book.pages.length}
      </p>
    </div>
  )
}

export default function Reader() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { entry, loading } = useLibraryBook(slug)
  const settings = useSettings()

  const book = entry?.book
  const tabletWide = useViewportWide(900)
  const twoUp =
    settings.readerLayout === 'spread' || (settings.readerLayout === 'auto' && tabletWide)

  const pageCount = book?.pages.length ?? 0
  const spreads = useMemo(() => computeSpreads(pageCount, twoUp), [pageCount, twoUp])

  const [spreadIndex, setSpreadIndex] = useState(0)
  const [chromeHidden, setChromeHidden] = useState(false)
  const [menuOpen, setMenuOpen] = useState<'narration' | 'display' | null>(null)
  const [turnDirection, setTurnDirection] = useState<1 | -1>(1)
  const initialisedRef = useRef(false)
  const lastTurnAtRef = useRef(0)
  const liveRef = useRef<HTMLParagraphElement>(null)

  // Initialise from ?page= or saved progress, once the book (and its saved
  // state) is available.
  useEffect(() => {
    if (!book || initialisedRef.current) return
    if (loading) return
    const fromQuery = Number(searchParams.get('page'))
    const target =
      Number.isInteger(fromQuery) && fromQuery >= 1
        ? fromQuery
        : entry?.state && entry.state.currentPage > 1 && !entry.state.completed
          ? entry.state.currentPage
          : 1
    const idx = spreads.findIndex((s) => s.some((p) => p + 1 === target))
    setSpreadIndex(idx >= 0 ? idx : 0)
    initialisedRef.current = true
    void recordOpened(book.id, book.pages.length)
  }, [book, entry, loading, searchParams, spreads])

  // Keep the current page visible when the layout mode flips.
  const prevTwoUpRef = useRef(twoUp)
  useEffect(() => {
    if (prevTwoUpRef.current === twoUp) return
    prevTwoUpRef.current = twoUp
    setSpreadIndex((current) => {
      const firstVisible = (spreads[current]?.[0] ?? 0) + 1
      const idx = spreads.findIndex((s) => s.some((p) => p + 1 === firstVisible))
      return idx >= 0 ? idx : 0
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [twoUp])

  const currentSpread = useMemo(
    () => spreads[clamp(spreadIndex, 0, Math.max(0, spreads.length - 1))] ?? [],
    [spreads, spreadIndex],
  )
  const currentPages = useMemo(
    () => currentSpread.map((i) => book?.pages[i]).filter((p): p is StoryPage => Boolean(p)),
    [currentSpread, book],
  )

  const goToSpread = useCallback(
    (next: number, direction: 1 | -1) => {
      if (!book) return
      const now = Date.now()
      if (now - lastTurnAtRef.current < TURN_DEBOUNCE_MS) return
      lastTurnAtRef.current = now
      const bounded = clamp(next, 0, spreads.length - 1)
      if (bounded === spreadIndex) return
      setTurnDirection(direction)
      setSpreadIndex(bounded)
      const firstPage = (spreads[bounded]?.[0] ?? 0) + 1
      const lastPage = spreads[bounded]?.at(-1) ?? 0
      void recordPageTurn(book.id, lastPage + 1 >= book.pages.length ? book.pages.length : firstPage, book.pages.length)
      if (liveRef.current) {
        liveRef.current.textContent = `Page ${firstPage} of ${book.pages.length}`
      }
    },
    [book, spreads, spreadIndex],
  )

  const nextSpread = useCallback(() => goToSpread(spreadIndex + 1, 1), [goToSpread, spreadIndex])
  const prevSpread = useCallback(() => goToSpread(spreadIndex - 1, -1), [goToSpread, spreadIndex])

  const narration = useNarration(
    book ?? EMPTY_BOOK,
    currentPages,
    nextSpread,
  )

  // Preload only the next likely page images.
  useEffect(() => {
    if (!book) return
    const next = spreads[spreadIndex + 1]
    if (!next) return
    for (const i of next) {
      const page = book.pages[i]
      if (page) {
        void resolveAssetUrl(page.image).then((url) => {
          if (url) {
            const img = new Image()
            img.src = url
          }
        })
      }
    }
    // Release object URLs for imported pages far behind/ahead.
    const keep = new Set(
      [spreads[spreadIndex - 1], spreads[spreadIndex], spreads[spreadIndex + 1]]
        .flat()
        .filter((v): v is number => v !== undefined),
    )
    book.pages.forEach((page, i) => {
      if (!keep.has(i) && page.image.startsWith('idb:')) releaseAssetUrl(page.image)
    })
  }, [book, spreads, spreadIndex])

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      }
      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault()
          nextSpread()
          break
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault()
          prevSpread()
          break
        case 'Home':
          e.preventDefault()
          goToSpread(0, -1)
          break
        case 'End':
          e.preventDefault()
          goToSpread(spreads.length - 1, 1)
          break
        case ' ':
          e.preventDefault()
          narration.toggle()
          break
        case 'Escape':
          if (menuOpen) setMenuOpen(null)
          else if (chromeHidden) setChromeHidden(false)
          else void navigate(book ? `/book/${book.slug}` : '/')
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nextSpread, prevSpread, goToSpread, narration, spreads.length, chromeHidden, menuOpen, navigate, book])

  // Optional swipe navigation (visible buttons always remain).
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: ReactPointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: ReactPointerEvent) => {
    const start = pointerStart.current
    pointerStart.current = null
    if (!start || !settings.swipeEnabled) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) >= SWIPE_THRESHOLD_PX && Math.abs(dy) < 90) {
      if (dx < 0) nextSpread()
      else prevSpread()
    } else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
      // Simple tap on the artwork toggles distraction-free mode.
      setChromeHidden((v) => !v)
      setMenuOpen(null)
    }
  }

  if (loading) {
    return (
      <div className={styles.reader}>
        <p role="status" style={{ margin: 'auto' }}>
          Opening the book…
        </p>
      </div>
    )
  }
  if (!book) {
    return (
      <div className={styles.reader}>
        <div style={{ margin: 'auto', textAlign: 'center' }}>
          <p style={{ fontSize: '2.5rem' }} aria-hidden="true">
            🔍
          </p>
          <p>We couldn't find that book.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>
            Back to the library
          </Link>
        </div>
      </div>
    )
  }

  const firstVisiblePage = (currentSpread[0] ?? 0) + 1
  const lastVisiblePage = (currentSpread.at(-1) ?? 0) + 1
  const progressPercent = Math.round((lastVisiblePage / book.pages.length) * 100)
  const pageIndicator =
    currentSpread.length > 1
      ? `${firstVisiblePage}–${lastVisiblePage} / ${book.pages.length}`
      : `${firstVisiblePage} / ${book.pages.length}`
  const narratingPageNumber =
    narration.status !== 'idle' && narration.captionText !== undefined
      ? currentPages.find(
          (p) => (p.narrationText ?? p.text ?? '') === narration.captionText,
        )?.number
      : undefined

  return (
    <div className={`${styles.reader} ${chromeHidden ? styles.chromeHidden : ''}`}>
      <p ref={liveRef} aria-live="polite" className="visually-hidden" />

      <header className={styles.topBar}>
        <Link
          to={`/book/${book.slug}`}
          className={styles.chromeBtn}
          aria-label="Close book and go back"
          title="Back to book page"
        >
          <span aria-hidden="true">✕</span>
        </Link>
        <span className={styles.bookTitle}>{book.title}</span>
        <span className={styles.pageIndicator} aria-hidden="true">
          {pageIndicator}
        </span>
        <button
          type="button"
          className={styles.chromeBtn}
          aria-label="Display options"
          aria-expanded={menuOpen === 'display'}
          onClick={() => setMenuOpen((m) => (m === 'display' ? null : 'display'))}
        >
          <span aria-hidden="true">Aa</span>
        </button>
        <button
          type="button"
          className={styles.chromeBtn}
          aria-label={chromeHidden ? 'Show reading controls' : 'Hide reading controls'}
          aria-pressed={chromeHidden}
          onClick={() => setChromeHidden((v) => !v)}
        >
          <span aria-hidden="true">⛶</span>
        </button>
      </header>

      <div
        className={styles.stage}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <div
          key={spreadIndex}
          className={styles.spreadEnter}
          style={
            {
              display: 'flex',
              gap: 'var(--space-2)',
              flex: 1,
              minWidth: 0,
              justifyContent: 'center',
              '--turn-direction': turnDirection === 1 ? '14px' : '-14px',
            } as CSSProperties
          }
        >
          {currentPages.map((page) => (
            <PageView
              key={page.number}
              book={book}
              page={page}
              narrating={page.number === narratingPageNumber}
            />
          ))}
        </div>
      </div>

      {chromeHidden ? (
        <button
          type="button"
          className={styles.restoreChrome}
          onClick={() => setChromeHidden(false)}
          aria-label="Show reading controls"
        >
          <span aria-hidden="true">⛶</span>
        </button>
      ) : null}

      {narration.captionText && settings.showCaptions && narration.source === 'prerecorded' ? (
        <p className={styles.caption} role="status">
          {narration.captionText}
        </p>
      ) : null}

      <footer className={styles.bottomBar}>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label="Reading progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
        >
          <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={prevSpread}
            disabled={spreadIndex === 0}
            aria-label="Previous page"
          >
            <span aria-hidden="true">◀</span>
          </button>
          <button
            type="button"
            className={styles.navBtn}
            onClick={narration.replay}
            aria-label="Replay this page's narration"
            title="Replay page"
          >
            <span aria-hidden="true">🔁</span>
          </button>
          <button
            type="button"
            className={`${styles.navBtn} ${styles.playBtn}`}
            onClick={narration.toggle}
            aria-label={
              narration.status === 'playing' ? 'Pause narration' : 'Play narration'
            }
          >
            <span aria-hidden="true">{narration.status === 'playing' ? '⏸' : '▶'}</span>
          </button>
          <button
            type="button"
            className={styles.navBtn}
            aria-label="Narration options"
            aria-expanded={menuOpen === 'narration'}
            onClick={() => setMenuOpen((m) => (m === 'narration' ? null : 'narration'))}
          >
            <span aria-hidden="true">🔊</span>
          </button>
          <button
            type="button"
            className={styles.navBtn}
            onClick={nextSpread}
            disabled={spreadIndex >= spreads.length - 1}
            aria-label="Next page"
          >
            <span aria-hidden="true">▶</span>
          </button>
        </div>
      </footer>

      {menuOpen === 'narration' ? (
        <div className={styles.menu} role="dialog" aria-label="Narration options">
          <h2 className={styles.menuTitle}>Narration</h2>
          {narration.availableSources.length > 1 ? (
            <div className={styles.menuRow}>
              <label id="nar-source">Voice source</label>
              <div className={styles.segmented} role="group" aria-labelledby="nar-source">
                <button
                  type="button"
                  aria-pressed={narration.source === 'prerecorded'}
                  onClick={() => narration.setSource('prerecorded')}
                >
                  Recorded
                </button>
                <button
                  type="button"
                  aria-pressed={narration.source === 'tts'}
                  onClick={() => narration.setSource('tts')}
                >
                  Device voice
                </button>
              </div>
            </div>
          ) : null}
          {narration.source === 'tts' && narration.voices.length > 0 ? (
            <div className={styles.menuRow}>
              <label htmlFor="nar-voice">Voice</label>
              <select
                id="nar-voice"
                value={narration.voiceUri ?? ''}
                onChange={(e) => narration.setVoiceUri(e.target.value || undefined)}
              >
                <option value="">Device default</option>
                {narration.voices.slice(0, 25).map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className={styles.menuRow}>
            <label htmlFor="nar-speed">Speed</label>
            <select
              id="nar-speed"
              value={String(narration.rate)}
              onChange={(e) => narration.setRate(Number(e.target.value))}
            >
              <option value="0.8">Slower (0.8×)</option>
              <option value="1">Normal (1×)</option>
              <option value="1.2">Quicker (1.2×)</option>
              <option value="1.5">Fast (1.5×)</option>
            </select>
          </div>
          <div className={styles.menuRow}>
            <label htmlFor="nar-volume">Volume</label>
            <input
              id="nar-volume"
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={narration.volume}
              onChange={(e) => narration.setVolume(Number(e.target.value))}
            />
          </div>
          <div className={styles.menuRow}>
            <label htmlFor="nar-mute">Mute</label>
            <input
              id="nar-mute"
              type="checkbox"
              checked={narration.muted}
              onChange={(e) => narration.setMuted(e.target.checked)}
              style={{ width: 28, height: 28 }}
            />
          </div>
          <div className={styles.menuRow}>
            <label htmlFor="nar-auto">Turn pages automatically</label>
            <input
              id="nar-auto"
              type="checkbox"
              checked={narration.autoAdvance}
              onChange={(e) => narration.setAutoAdvance(e.target.checked)}
              style={{ width: 28, height: 28 }}
            />
          </div>
          {narration.source === 'tts' && narration.availableSources.includes('tts') === false ? null : null}
          <p className={styles.voiceNote}>{narration.voiceLabel}</p>
          {!narration.availableSources.includes('tts') && narration.source !== 'prerecorded' ? (
            <p className={styles.voiceNote}>
              This device doesn't offer a read-aloud voice, so narration is unavailable
              for this book.
            </p>
          ) : null}
          <button
            type="button"
            className="btn"
            style={{ marginTop: 'var(--space-3)', width: '100%' }}
            onClick={() => setMenuOpen(null)}
          >
            Done
          </button>
        </div>
      ) : null}

      {menuOpen === 'display' ? (
        <div className={styles.menu} role="dialog" aria-label="Display options">
          <h2 className={styles.menuTitle}>Display</h2>
          <div className={styles.menuRow}>
            <label id="disp-size">Text size</label>
            <div className={styles.segmented} role="group" aria-labelledby="disp-size">
              {(['normal', 'large', 'huge'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={settings.textSize === size}
                  onClick={() => settings.setSetting('textSize', size)}
                >
                  {size === 'normal' ? 'A' : size === 'large' ? 'AA' : 'AAA'}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.menuRow}>
            <label htmlFor="disp-layout">Page layout</label>
            <select
              id="disp-layout"
              value={settings.readerLayout}
              onChange={(e) =>
                settings.setSetting(
                  'readerLayout',
                  e.target.value as 'auto' | 'single' | 'spread',
                )
              }
            >
              <option value="auto">Automatic</option>
              <option value="single">One page</option>
              <option value="spread">Two-page spread</option>
            </select>
          </div>
          <div className={styles.menuRow}>
            <label htmlFor="disp-motion">Reduce motion</label>
            <input
              id="disp-motion"
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => settings.setSetting('reducedMotion', e.target.checked)}
              style={{ width: 28, height: 28 }}
            />
          </div>
          <div className={styles.menuRow}>
            <label htmlFor="disp-swipe">Swipe to turn pages</label>
            <input
              id="disp-swipe"
              type="checkbox"
              checked={settings.swipeEnabled}
              onChange={(e) => settings.setSetting('swipeEnabled', e.target.checked)}
              style={{ width: 28, height: 28 }}
            />
          </div>
          <div className={styles.menuRow}>
            <label htmlFor="disp-captions">Narration captions</label>
            <input
              id="disp-captions"
              type="checkbox"
              checked={settings.showCaptions}
              onChange={(e) => settings.setSetting('showCaptions', e.target.checked)}
              style={{ width: 28, height: 28 }}
            />
          </div>
          <button
            type="button"
            className="btn"
            style={{ marginTop: 'var(--space-3)', width: '100%' }}
            onClick={() => setMenuOpen(null)}
          >
            Done
          </button>
        </div>
      ) : null}
    </div>
  )
}

/** Placeholder while a book is loading (never rendered). */
const EMPTY_BOOK: StoryBook = {
  id: '__empty__',
  slug: 'empty',
  title: '',
  authors: ['—'],
  illustrators: [],
  translators: [],
  description: '',
  language: 'en',
  ageRange: 'all-ages',
  categories: [],
  tags: [],
  cover: 'stories/_empty.svg',
  pages: [
    {
      number: 1,
      image: 'stories/_empty.svg',
      alt: 'Empty page',
    },
  ],
  rights: { status: 'original', remoteStorageAllowed: false, personalUseOnly: true },
  storageLocation: 'builtin',
  offlineStatus: 'available',
  featured: false,
  hidden: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as StoryBook
