# Licensing & rights workflow

This app is a private, single-owner library. The rights system exists to keep
two promises:

1. **Nothing ships publicly without documented rights.** The deployed site
   contains only public-domain, openly licensed, or project-original content.
2. **Private books stay private.** Owner-supplied material lives only on the
   owner's device.

The app records rights housekeeping; it does not provide legal advice or a
compliance guarantee. Items flagged `needs-review` require a human decision.

## Rights statuses

| Status | Meaning | Can be bundled/deployed? |
| --- | --- | --- |
| `original` | Created for this project | Yes |
| `public-domain` | Copyright expired / never applied — **basis must be recorded** | Yes, with basis + source |
| `creative-commons` | Openly licensed — licence id + attribution required | Yes, if licence permits |
| `owner-permission` | The owner's own books (personal use) | **Never** — on-device only |
| `needs-review` | Rights unclear | **Never** — quarantined even locally |

## What the importer collects

For owner-supplied books: title/author/illustrator, where the files came
from, an explicit confirmation of permission to use the material, whether it
may ever be stored remotely, and whether it is personal-use only. The wizard
will not save an `owner-permission` book without the confirmation checked.

For public-domain / CC content: source URL and organisation, author,
translator, illustrator, publication date, licence or public-domain basis,
attribution requirements, regional restrictions, modification/commercial-use
flags, and the date rights were checked (`rightsCheckedAt`).

## Quarantine

A book saved with `needs-review` rights is stored but **quarantined**: it
never appears in the child-facing library and is marked in the owner
workshop. Resolve it by editing the book's Rights step to a definite status.

## Content advisories are not rights

Suitability and copyright are separate questions, and the schema keeps them
apart. A book can be indisputably public domain and still contain period
content a grown-up should vet — racial caricature, frightening scenes — so
that is recorded as `contentAdvisory` plus `hidden: true`, never by pretending
the rights are unclear.

Such books are bundled **unedited**, stay out of the child-facing library
until the owner shows them, display a "note for grown-ups" on their book page,
and can be unhidden from the workshop. `npm run audit:rights` fails the build
if a book carries an advisory but is not hidden, so unvetted period content
cannot reach the library by accident.

## Project Gutenberg material

The classics are sourced from Project Gutenberg (via its GitHub mirror). The
underlying works are public domain; Project Gutenberg's header, footer and
licence boilerplate are **stripped during import** so nothing carries their
trademark or licence wrapper, and no claim of affiliation is made. Each book
records the canonical ebook page as its source. Re-run the import with
`npm run books:fetch`; the parser that strips the boilerplate is
`scripts/books/parse.ts` and is covered by tests.

## Enforcement

- `npm run audit:rights` (runs automatically inside `npm run build`) fails the
  production build if bundled content is `owner-permission`, `needs-review`,
  `personalUseOnly`, missing a public-domain basis, missing CC attribution,
  missing illustrator provenance, or references missing files.
- Schema-level rules (`src/lib/schema.ts`): owner permission requires the
  confirmation flag; CC requires a licence id.
- The in-app **Library check** (Owner workshop) surfaces rights warnings for
  on-device books.

## Ground rules (also shown in the app)

- Import only books you own or have permission to use.
- Files come from your own copies — never from unauthorized copies or
  sharing sites.
- If private assets were ever to be hosted remotely (not currently supported),
  they would need real server-side authentication — a client-side password is
  not protection. The current architecture avoids the problem by keeping
  private books off servers entirely.
