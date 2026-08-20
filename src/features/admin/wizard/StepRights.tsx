import type { Draft } from './wizardTypes'

interface Props {
  draft: Draft
  update: (patch: Partial<Draft>) => void
}

export default function StepRights({ draft, update }: Props) {
  const patchRights = (patch: Partial<Draft['rights']>) => {
    update({ rights: { ...draft.rights, ...patch } })
  }
  const r = draft.rights

  return (
    <>
      <h2 style={{ marginBottom: 'var(--space-2)' }}>6 · Source &amp; rights</h2>
      <p style={{ color: 'var(--color-ink-soft)', maxWidth: '68ch', marginBottom: 'var(--space-4)' }}>
        A quick record of where this book came from and why you may use it. Books marked
        “needs review” are quarantined — saved, but kept out of the child-facing library
        until you resolve their rights.
      </p>

      <div className="field">
        <label htmlFor="r-status">Rights status *</label>
        <select
          id="r-status"
          value={r.status}
          onChange={(e) => patchRights({ status: e.target.value as Draft['rights']['status'] })}
        >
          <option value="owner-permission">
            I own this book / have permission (personal use)
          </option>
          <option value="public-domain">Public domain</option>
          <option value="creative-commons">Creative Commons licensed</option>
          <option value="original">Original work made for this library</option>
          <option value="needs-review">Not sure yet — needs review</option>
        </select>
      </div>

      {r.status === 'owner-permission' ? (
        <div
          style={{
            background: 'var(--color-accent-soft)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', fontWeight: 700 }}>
            <input
              type="checkbox"
              checked={Boolean(r.ownerPermissionConfirmed)}
              onChange={(e) => patchRights({ ownerPermissionConfirmed: e.target.checked })}
              style={{ width: 24, height: 24, flexShrink: 0 }}
            />
            <span>
              I confirm I own this material or have permission to use it, the files come
              from my own copy (not an unauthorised download), and it stays for personal
              use on my devices. *
            </span>
          </label>
        </div>
      ) : null}

      {r.status === 'creative-commons' ? (
        <div className="field">
          <label htmlFor="r-license">Licence *</label>
          <input
            id="r-license"
            type="text"
            value={r.license ?? ''}
            onChange={(e) => patchRights({ license: e.target.value })}
            placeholder="e.g. CC-BY-4.0"
          />
        </div>
      ) : null}

      {r.status === 'public-domain' ? (
        <div className="field">
          <label htmlFor="r-pd">Why is it public domain?</label>
          <input
            id="r-pd"
            type="text"
            value={r.publicDomainBasis ?? ''}
            onChange={(e) => patchRights({ publicDomainBasis: e.target.value })}
            placeholder="e.g. Author died more than 70 years ago"
          />
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: '0 var(--space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div className="field">
          <label htmlFor="r-source">Where did the files come from?</label>
          <input
            id="r-source"
            type="text"
            value={r.sourceOfFiles ?? ''}
            onChange={(e) => patchRights({ sourceOfFiles: e.target.value })}
            placeholder="e.g. My own scan of our home copy"
          />
        </div>
        <div className="field">
          <label htmlFor="r-url">Source link (for downloaded free content)</label>
          <input
            id="r-url"
            type="url"
            value={r.sourceUrl ?? ''}
            onChange={(e) => patchRights({ sourceUrl: e.target.value })}
            placeholder="https://…"
          />
        </div>
        <div className="field">
          <label htmlFor="r-org">Source organisation</label>
          <input
            id="r-org"
            type="text"
            value={r.sourceOrganization ?? ''}
            onChange={(e) => patchRights({ sourceOrganization: e.target.value })}
            placeholder="e.g. Project Gutenberg"
          />
        </div>
        <div className="field">
          <label htmlFor="r-attr">Required attribution text</label>
          <input
            id="r-attr"
            type="text"
            value={r.attributionRequired ?? ''}
            onChange={(e) => patchRights({ attributionRequired: e.target.value })}
          />
        </div>
      </div>

      <div className="field">
        <label style={{ display: 'inline-flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={r.personalUseOnly}
            onChange={(e) => patchRights({ personalUseOnly: e.target.checked })}
            style={{ width: 24, height: 24 }}
          />
          Personal use only (never share or re-publish)
        </label>
      </div>

      <div className="field">
        <label htmlFor="r-notes">Notes</label>
        <textarea
          id="r-notes"
          rows={2}
          value={r.notes ?? ''}
          onChange={(e) => patchRights({ notes: e.target.value })}
          placeholder="Anything future-you should know about this book's rights"
        />
      </div>

      <div style={{ display: 'grid', gap: '0 var(--space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div className="field">
          <label htmlFor="r-summary">Source summary shown on the book page</label>
          <input
            id="r-summary"
            type="text"
            value={draft.source}
            onChange={(e) => update({ source: e.target.value })}
            placeholder="e.g. Family copy, scanned March 2026"
          />
        </div>
        <div className="field">
          <label htmlFor="r-attribution">Attribution shown on the book page</label>
          <input
            id="r-attribution"
            type="text"
            value={draft.attribution}
            onChange={(e) => update({ attribution: e.target.value })}
          />
        </div>
      </div>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-soft)', maxWidth: '68ch' }}>
        This record is for your own housekeeping — the app can't give legal advice.
        Imported books are stored only on this device and are never uploaded.
      </p>
    </>
  )
}
