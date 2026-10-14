# Submission

**Candidate:** Jimwell Calma (jimwellwork28@gmail.com)
**Live app:** https://ajaia-docs-red-nu.vercel.app
**Source:** https://github.com/JimwellC/ajaia-docs
**Walkthrough video:** see `VIDEO_URL.txt`

## Included

| Item | Location |
|---|---|
| Source code | `src/`, `db/`, `scripts/`, `tests/` |
| Setup and run instructions | `README.md` |
| Architecture note | `ARCHITECTURE.md` |
| AI workflow note | `AI_WORKFLOW.md` |
| Walkthrough video link | `VIDEO_URL.txt` |
| Screenshots | `docs/screenshots/` |
| Tests | `tests/unit`, `tests/integration` (`npm test`) |
| CI pipeline | `.github/workflows/ci.yml` |

## Demo accounts

No passwords: pick a user on the sign-in screen.

- `alice@ajaia.test`: owns the welcome document
- `bob@ajaia.test`: can edit the welcome document
- `carol@ajaia.test`: can only view the welcome document

## Acceptance criteria

| Requirement | What "working" means | Verified by |
|---|---|---|
| Create | A signed-in user creates a blank document and lands in the editor as its owner. | Integration: "creates, edits and reopens a document with its formatting". Manual: New document on the live site. |
| Rename | Editing the title saves it; empty titles are rejected; titles are trimmed and length checked. | Unit: "trims titles and requires a version on updates", "rejects empty titles, empty patches and unknown fields". Manual: rename, reload, title persists. |
| Edit and format | Bold, italic, underline, H1 to H3, bulleted and numbered lists are applied and stored. | Integration: "creates, edits and reopens a document with its formatting". Unit: "keeps the formatting the editor produces". |
| Save | Autosave sends only confirmed changes; "All changes saved" appears only after the server confirms; stale saves are rejected with the latest content. | Integration: "rejects a save based on a stale version and returns the latest content". Manual: edit and watch the status line; stop the network and confirm the retry message. |
| Reopen | Reopening returns the same title, HTML, and version that were saved. | Integration: "creates, edits and reopens a document with its formatting". |
| Import | `.txt`, `.md`, `.docx` become new editable documents; unsupported, empty, or oversized files are rejected; imported HTML is sanitized. | Unit: all tests in `tests/unit/importFile.test.ts`. Integration: "imports a markdown file as a new editable document", "rejects unsupported uploads and malformed JSON", "sanitizes saved and imported HTML". |
| Share | The owner shares by email as editor or viewer; unknown emails, self shares, and duplicates are rejected. | Integration: "validates sharing requests". Unit: "only lets the owner share, and blocks self-shares and duplicates". |
| Permissions | Owner, editor, viewer, and no access each get exactly the actions in the permission matrix in `ARCHITECTURE.md`, enforced on the server. | Integration: "enforces owner, editor, viewer and no-access permissions". Unit: all tests in `tests/unit/access.test.ts`. |
| Ownership view | The document list separates "My documents" from "Shared with me" and shows each shared document's owner and role. | Integration: "separates owned and shared documents in the list". Manual: sign in as Bob and Carol on the live site. |
| Persistence | Documents, shares, and sessions live in Postgres and survive reloads and redeploys. | Integration tests run against a real Postgres database. Manual: reload the live site after a redeploy; the welcome document is unchanged. |
| Testing | Lint, type check, unit tests, integration tests, and a production build pass. | `npm run lint`, `npm run typecheck`, `npm test` (18 unit, 12 integration), `npm run build`, all run by `.github/workflows/ci.yml` on every push. |
| Deployment | The live URL serves the app with its production database and the sign-in page loads. | Manual: `vercel deploy --prod`, then open the live URL and confirm the sign-in page renders. |

## Status

**Working end to end:**
create, rename, delete; rich text editing (bold, italic, underline, H1 to H3, bulleted and numbered lists); autosave with retry; edit conflict detection with "Load their version" or "Keep mine"; import of `.txt`, `.md`, `.docx`; sharing by email with Can edit or Can view, changeable and removable; owned vs shared views; server-side access control; validation and consistent error handling; versioned migrations; server-side sessions; server-side HTML sanitization; 30 automated tests; CI; deployment.

**Intentionally not built:** real-time co-editing and presence (conflicts are detected rather than merged live), real authentication, comments, version history, export. The one stretch item I chose is view vs edit roles, because it deepens permission enforcement instead of widening the feature list.

**Next 2 to 4 hours:** real-time collaboration with Yjs, version history from snapshots, comments, real auth, Playwright tests in CI. Details in `ARCHITECTURE.md`.
