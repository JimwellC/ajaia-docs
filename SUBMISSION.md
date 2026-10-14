# Submission

**Candidate:** Jimwell Calma (jimwellwork28@gmail.com)
**Live app:** https://ajaia-docs-red-nu.vercel.app
**Walkthrough video:** see `VIDEO_URL.txt`

## Included

| Item | Location |
|---|---|
| Source code | this folder (`src/`, `db/`, `scripts/`, `tests/`) |
| Setup and run instructions | `README.md` |
| Architecture note | `ARCHITECTURE.md` |
| AI workflow note | `AI_WORKFLOW.md` |
| Walkthrough video link | `VIDEO_URL.txt` |
| Screenshots | `docs/screenshots/` |
| Tests | `tests/` (run with `npm test`) |

## Demo accounts

`alice@ajaia.test`, `bob@ajaia.test`, `carol@ajaia.test`. Sign-in is a user picker, no password.

## Status

**Working end to end:** create, rename, rich text editing (bold, italic, underline, H1 to H3, bulleted and numbered lists), autosave and reopen, import of `.txt`, `.md`, and `.docx`, sharing by email with remove, owned vs shared views, server-side access control, validation and error states, automated tests, deployment.

**Intentionally not built:** real-time co-editing (simultaneous edits are last save wins), real authentication, viewer-only role, comments, version history, export.

**Next 2 to 4 hours:** real-time collaboration with Yjs, a viewer role, version history, and Markdown and PDF export. Details in `ARCHITECTURE.md`.
