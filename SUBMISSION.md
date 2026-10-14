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

- `jimwell@ajaia.test` (Jimwell Calma): owns the welcome document
- `jim@ajaia.test` (Jim): can edit the welcome document
- `jc@ajaia.test` (JC): can only view the welcome document

## Acceptance criteria

| Requirement | What "working" means | Verified by |
|---|---|---|
| Create | A signed-in user creates a blank document and lands in the editor as its owner. | Integration: "creates, edits and reopens a document with its formatting". Manual: New document on the live site. |
| Rename | Editing the title saves it; empty titles are rejected; titles are trimmed and length checked. | Unit: "trims titles and requires a version on updates", "rejects empty titles, empty patches and unknown fields". Manual: rename, reload, title persists. |
| Edit and format | H1 to H3, bold, italic, underline, strikethrough, inline code, links, lists, quotes, code blocks, and dividers are applied and stored unchanged. | Unit: "passes every supported node and mark through sanitization unchanged". Integration: "creates, edits and reopens a document with its formatting". Manual: keyboard-only Playwright flow applied bold and a link and both reached the server. |
| Save | Autosave sends only confirmed changes; "Saved" appears only after the server confirms; stale saves are rejected with the latest content. | Integration: "rejects a save based on a stale version and returns the latest content". Manual: edit and watch the status line; stop the network and confirm the retry message. |
| Reopen | Reopening returns the same title, HTML, and version that were saved. | Integration: "creates, edits and reopens a document with its formatting". |
| Import | `.txt`, `.md`, `.docx` become new editable documents; unsupported, empty, or oversized files are rejected; imported HTML is sanitized. | Unit: all tests in `tests/unit/importFile.test.ts`. Integration: "imports a markdown file as a new editable document", "rejects unsupported uploads and malformed JSON", "sanitizes saved and imported HTML". |
| Share | The owner shares by email as editor or viewer; unknown emails, self shares, and duplicates are rejected. | Integration: "validates sharing requests". Unit: "only lets the owner share, and blocks self-shares and duplicates". |
| Permissions | Owner, editor, viewer, and no access each get exactly the actions in the permission matrix in `ARCHITECTURE.md`, enforced on the server. | Integration: "enforces owner, editor, viewer and no-access permissions". Unit: all tests in `tests/unit/access.test.ts`. |
| Ownership view | The sidebar separates **Private** (owned) from **Shared** documents, and the home table shows each document's owner and your access, filterable by All, Private, or Shared. | Integration: "separates owned and shared documents in the list". Manual: sign in as Jim and JC on the live site. |
| Download | Anyone who can view a document can save it to their device as Markdown or plain text, with a filename from the title; others get 404. | Integration: "downloads a document as Markdown and as plain text", "lets a viewer download and hides the document from non-members". Unit: all tests in `tests/unit/export.test.ts`. |
| Persistence | Documents, shares, and sessions live in Postgres and survive reloads and redeploys. | Integration tests run against a real Postgres database. Manual: reload the live site after a redeploy; the welcome document is unchanged. |
| Testing | Lint, type check, unit tests, integration tests, and a production build pass. | `npm run lint`, `npm run typecheck`, `npm test` (32 unit, 16 integration), `npm run build`, all run by `.github/workflows/ci.yml` on every push. |
| Deployment | The live URL serves the app with its production database, every migration is applied, and the sign-in page loads. | Integration: both health check tests. Manual: the README deployment checklist, ending with `/api/health` returning 200 and a sign-in smoke test. |

## Status

**Working end to end:**
create, rename, delete; rich text editing (H1 to H3, bold, italic, underline, strikethrough, inline code, links, lists, quotes, code blocks, dividers); autosave with retry; edit conflict detection with "Load their version" or "Keep mine"; import of `.txt`, `.md`, `.docx`; sharing by email with Can edit or Can view, changeable and removable; owned vs shared views; server-side access control; validation and consistent error handling; versioned migrations; server-side sessions; server-side HTML sanitization; Markdown and plain text download; deployment health check; 48 automated tests; CI; deployment.

**Intentionally not built:** real-time co-editing and presence (conflicts are detected rather than merged live), real authentication, comments, version history. The one stretch item I chose is view vs edit roles, because it deepens permission enforcement instead of widening the feature list.

**Next 2 to 4 hours:** real-time collaboration with Yjs, version history from snapshots, comments, real auth, Playwright tests in CI. Details in `ARCHITECTURE.md`.
