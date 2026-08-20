import { Link } from 'react-router-dom'
import styles from './SettingsScreen.module.css'

/**
 * In-app installation guide. Verified against current iOS/iPadOS behaviour
 * (Safari's share-sheet "Add to Home Screen"; recent iOS versions open added
 * sites as standalone web apps by default).
 */
export default function InstallGuide() {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as { standalone?: boolean }).standalone))

  return (
    <>
      <Link to="/settings" style={{ fontWeight: 700, textDecoration: 'none' }}>
        ← Settings
      </Link>
      <h1 style={{ margin: 'var(--space-3) 0 var(--space-4)' }}>
        Install on iPhone &amp; iPad
      </h1>

      {isStandalone ? (
        <section className={styles.section}>
          <p role="status">
            🎉 You're already reading from the installed app — nothing else to do!
          </p>
        </section>
      ) : null}

      <section className={styles.section} aria-labelledby="ig-what">
        <h2 id="ig-what">What installing does</h2>
        <p className={styles.note}>
          Storytime Library is an installable website (a "web app"), not an App Store
          app. Adding it to the Home Screen gives it its own icon, opens it full screen
          without browser buttons, and lets it work offline. It also makes the storage
          holding your imported books much more durable.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="ig-iphone">
        <h2 id="ig-iphone">On an iPhone</h2>
        <ol style={{ paddingLeft: '1.2em', display: 'grid', gap: 'var(--space-2)' }}>
          <li>Open this site in <strong>Safari</strong>.</li>
          <li>
            Tap the <strong>Share</strong> button <span aria-hidden="true">(⬆️ in a box)</span>{' '}
            at the bottom of the screen.
          </li>
          <li>
            Scroll down and tap <strong>Add to Home Screen</strong>.
          </li>
          <li>
            Tap <strong>Add</strong>. A 🌙 Storytime icon appears on your Home Screen.
          </li>
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="ig-ipad">
        <h2 id="ig-ipad">On an iPad</h2>
        <ol style={{ paddingLeft: '1.2em', display: 'grid', gap: 'var(--space-2)' }}>
          <li>Open this site in <strong>Safari</strong>.</li>
          <li>
            Tap the <strong>Share</strong> button at the top right of the toolbar.
          </li>
          <li>
            Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
          </li>
        </ol>
        <p className={styles.note}>
          Tip: iPad is lovely in landscape — the reader shows a two-page spread, just
          like a real picture book.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="ig-notes">
        <h2 id="ig-notes">Good to know</h2>
        <ul style={{ paddingLeft: '1.2em', display: 'grid', gap: 'var(--space-2)' }}>
          <li>
            Books imported on the iPhone don't automatically appear on the iPad (and
            vice versa). Use{' '}
            <Link to="/admin/backup">Backup &amp; restore</Link> to move your library
            between devices.
          </li>
          <li>
            Deleting the app icon, or clearing Safari's website data, can remove locally
            stored books — export a backup first.
          </li>
          <li>The app keeps working with no internet once installed.</li>
        </ul>
      </section>
    </>
  )
}
