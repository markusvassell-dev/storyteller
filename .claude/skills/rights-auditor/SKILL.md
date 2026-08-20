---
name: rights-auditor
description: Audit story content rights, licences, attribution and provenance for Storytime Library. Use this whenever the user asks about copyright, licences, attribution, whether content can be bundled or deployed, why the rights audit failed the build, or before any deploy — and whenever new content is added to public/stories.
---

# Rights auditor

Keep unauthorized or under-documented content out of the deployed app.

## Run it

```bash
npm run audit:rights        # bundled content (public/stories) — fails build on errors
```

The audit runs automatically at the start of `npm run build`, so a production
build cannot ship content with critical rights issues. In-app, the owner can
run a per-device check at Owner workshop → Library check (covers imported
books too).

## What counts as a critical error (build-failing)

- `rights.status: needs-review` in bundled content (quarantined material)
- `rights.status: owner-permission` in bundled content (private material must
  live on-device only, never on the public host)
- `personalUseOnly: true` or `remoteStorageAllowed: false` on bundled content
- Public-domain claim without a recorded `publicDomainBasis`
- Creative-Commons content without a named licence or attribution
- Missing illustrator/provenance for bundled artwork
- Asset files referenced but missing from disk

## Fixing findings

Fix findings by making the record *truthful*, never by relabelling. If rights
genuinely can't be established, the content must move out of `public/stories`
— either delete it or have the owner import it privately in-app where it stays
on-device. When adding public-domain material, record: source URL and
organisation, author/translator/illustrator, publication date, the
public-domain basis, and `rightsCheckedAt`. The audit is housekeeping, not
legal advice — say so if the user asks for a legal guarantee, and flag items
needing human review rather than guessing.

Schema of the rights record: `rightsSchema` in `src/lib/schema.ts`.
Policy background: `docs/licensing.md` and `docs/content-sources.md`.
