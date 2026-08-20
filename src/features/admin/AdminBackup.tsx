import { useRef, useState } from 'react'
import {
  BackupPasswordError,
  exportLibrary,
  importLibrary,
  type ExportProgress,
  type RestoreSummary,
} from '@/lib/backup'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

const sectionStyle: React.CSSProperties = {
  background: 'var(--color-bg-raised)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-4)',
  maxWidth: 640,
  marginBottom: 'var(--space-4)',
}

export default function AdminBackup() {
  const [exportPassword, setExportPassword] = useState('')
  const [importPassword, setImportPassword] = useState('')
  const [progress, setProgress] = useState<ExportProgress>()
  const [busy, setBusy] = useState<'export' | 'import' | null>(null)
  const [error, setError] = useState<string>()
  const [summary, setSummary] = useState<RestoreSummary>()
  const [exported, setExported] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const runExport = async () => {
    setBusy('export')
    setError(undefined)
    setExported(false)
    try {
      const blob = await exportLibrary(exportPassword || undefined, setProgress)
      const date = new Date().toISOString().slice(0, 10)
      downloadBlob(
        blob,
        exportPassword ? `storytime-backup-${date}.stbke` : `storytime-backup-${date}.zip`,
      )
      setExported(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
      setProgress(undefined)
    }
  }

  const runImport = async (file: File) => {
    setBusy('import')
    setError(undefined)
    setSummary(undefined)
    try {
      const result = await importLibrary(file, importPassword || undefined, setProgress)
      setSummary(result)
    } catch (err) {
      if (err instanceof BackupPasswordError) setError(err.message)
      else setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
      setProgress(undefined)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <>
      <h1 style={{ marginBottom: 'var(--space-2)' }}>Backup &amp; restore</h1>
      <p style={{ color: 'var(--color-ink-soft)', maxWidth: '62ch', marginBottom: 'var(--space-4)' }}>
        Your imported books live only on this device. A backup file is the way to keep
        them safe — and the way to move your library between an iPhone and an iPad.
      </p>

      <section style={sectionStyle} aria-labelledby="bk-export">
        <h2 id="bk-export" style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
          Export the library
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-soft)', marginBottom: 'var(--space-3)' }}>
          Bundles every imported book (pages, audio, metadata), plus favourites, reading
          progress and settings, into one file you can save to Files, iCloud Drive or a
          computer.
        </p>
        <div className="field">
          <label htmlFor="bk-pass">Optional password (encrypts the backup)</label>
          <input
            id="bk-pass"
            type="password"
            autoComplete="new-password"
            value={exportPassword}
            onChange={(e) => setExportPassword(e.target.value)}
          />
          <p className="hint">
            With a password the file is AES-encrypted; without one it's a plain ZIP.
            There is no password recovery — write it down.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void runExport()}
          disabled={busy !== null}
        >
          {busy === 'export' ? 'Exporting…' : '⬇️ Export backup'}
        </button>
        {exported ? (
          <p role="status" style={{ marginTop: 'var(--space-3)' }}>
            ✅ Backup exported — check your downloads.
          </p>
        ) : null}
      </section>

      <section style={sectionStyle} aria-labelledby="bk-import">
        <h2 id="bk-import" style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
          Restore from a backup
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-soft)', marginBottom: 'var(--space-3)' }}>
          Books from the backup are added to this device. A book with the same identity
          replaces the local copy; nothing else is deleted.
        </p>
        <div className="field">
          <label htmlFor="bk-import-pass">Password (only for encrypted backups)</label>
          <input
            id="bk-import-pass"
            type="password"
            autoComplete="off"
            value={importPassword}
            onChange={(e) => setImportPassword(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="bk-file">Backup file (.zip or .stbke)</label>
          <input
            id="bk-file"
            ref={fileRef}
            type="file"
            accept=".zip,.stbke,application/zip,application/octet-stream"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void runImport(file)
            }}
            disabled={busy !== null}
          />
        </div>
        {summary ? (
          <div role="status" style={{ marginTop: 'var(--space-2)' }}>
            <p>
              ✅ Restored {summary.imported} new book{summary.imported === 1 ? '' : 's'}
              {summary.replaced > 0 ? `, updated ${summary.replaced}` : ''}
              {summary.stateRestored ? ', with reading progress and favourites' : ''}.
            </p>
            {summary.errors.length > 0 ? (
              <ul style={{ marginTop: 'var(--space-2)', paddingLeft: '1.2em', color: 'var(--color-danger)' }}>
                {summary.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      {progress ? (
        <p role="status" className="badge" style={{ fontSize: 'var(--text-sm)' }}>
          ⏳ {progress.step} ({progress.done}/{progress.total})
        </p>
      ) : null}
      {error ? (
        <p role="alert" style={{ color: 'var(--color-danger)', fontWeight: 600, marginTop: 'var(--space-3)' }}>
          {error}
        </p>
      ) : null}

      <section style={{ ...sectionStyle, background: 'var(--color-accent-soft)', border: 'none' }}>
        <h2 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-2)' }}>
          Moving between iPhone and iPad
        </h2>
        <ol style={{ paddingLeft: '1.2em', display: 'grid', gap: 'var(--space-1)', fontSize: 'var(--text-sm)' }}>
          <li>Export a backup here and save it to iCloud Drive (Files app).</li>
          <li>Open Storytime Library on the other device.</li>
          <li>Open the workshop → Backup &amp; restore → choose the file.</li>
        </ol>
        <p style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
          Libraries don't sync automatically — repeat this after adding new books.
        </p>
      </section>
    </>
  )
}
