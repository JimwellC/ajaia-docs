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

## Status

**Working end to end:**
create, rename, delete; rich text editing (bold, italic, underline, H1 to H3, bulleted and numbered lists); autosave with retry; edit conflict detection with "Load their version" or "Keep mine"; import of `.txt`, `.md`, `.docx`; sharing by email with Can edit or Can view, changeable and removable; owned vs shared views; server-side access control; validation and consistent error handling; versioned migrations; 21 automated tests; CI; deployment.

**Intentionally not built:** real-time co-editing and presence (conflicts are detected rather than merged live), real authentication, comments, version history, export. The one stretch item I chose is view vs edit roles, because it deepens permission enforcement instead of widening the feature list.

**Next 2 to 4 hours:** real-time collaboration with Yjs, version history from snapshots, comments, real auth, Playwright tests in CI. Details in `ARCHITECTURE.md`.
