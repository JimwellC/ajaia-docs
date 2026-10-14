# AI workflow note

## Tools used

- **Claude** as a pair programmer for planning, writing code, and testing
- **Claude Code** in the terminal for repository setup, deployment to Vercel, and filling in the live URL

## How I used it

I set the scope and priorities, then had Claude generate code one layer at a time and reviewed each layer before moving on. I worked in two passes:

1. **A working first version:** editor, import, sharing, persistence, deployment
2. **An engineering pass:** after deploying, I judged the first version too thin on structure for what this assessment evaluates, so I directed a refactor into a service layer with typed errors and validation, then added edit conflict detection, viewer and editor roles, migrations, integration tests, and CI. I also cut a Markdown export feature I had added, to keep the release small and focused

## Where AI sped things up most

- Boilerplate: route handlers, form states, Tailwind styling
- Tiptap editor and toolbar setup
- Test cases, especially edge cases and permission combinations
- Browser checks with Playwright to confirm behavior in a real browser

## What I changed or rejected

- **Prisma → plain `pg`.** The first draft used Prisma, but its engine download was blocked in the build environment. Three tables don't need an ORM, so I dropped it.
- **Single schema file → versioned migrations.** Adding roles and versions to an already-deployed database needed a real upgrade path, not a rewrite of the schema file.
- **Silent last-write-wins → conflict detection.** The first autosave just saved whatever arrived last. I replaced it with versioned saves so concurrent edits are detected and the user decides.
- **Raw HTML in markdown.** A straightforward conversion would pass raw HTML through. It's escaped first, with a test to keep it that way.
- **403 vs 404.** Returning 403 for documents a user can't see would confirm they exist, so those return 404.
- **Untestable route handlers.** The first version read cookies through Next's request-scoped API, which made route handlers hard to test. Auth now reads from the `Request`, so tests call the real handlers.
- **Scope cuts.** I removed a working Markdown export feature. It was tested and fine, but a smaller release with stronger guarantees is a better product decision for this brief than one more feature.
- **User id cookie → server-side sessions.** The cookie held a raw user id, so anyone could impersonate anyone by editing it; it now holds a random token looked up in a `sessions` table, and sign-out revokes it.
- **Trusting client HTML → server-side sanitization.** Saved and imported HTML now passes through an allowlist that matches the editor, so scripts, event handlers, iframes, and styles never reach the database.
- **Generic save errors → specific recovery.** A 404 stops saving and links back, a 403 switches to read-only, a network failure retries every 5 seconds, and "Saved" appears only after the server confirms.
- **Implicit requirements → written acceptance criteria.** `SUBMISSION.md` now maps each requirement to the test or manual step that verifies it, and `ARCHITECTURE.md` lists the permission matrix and failure scenarios.
- Browser verification caught that opening a document triggered a save (Tiptap's setEditable emits an update by default), causing false edit conflicts. Fixed and added a regression check.
- UI redesign (sidebar, home dashboard, writing-first editor) and the Markdown and plain text download feature were implemented by Claude Code.
- **Flaky test scripts.** Two failures were in test code, not the app (a click during navigation, and a helper that assumed every response was JSON). I fixed the tests and confirmed the app was correct.

## How I verified it

- **48 automated tests:** 32 unit tests and 16 integration tests against a real Postgres database
- **Lint, type check, and production build** all clean, and run in CI on every push
- **Migration upgrade path:** ran the new migrations against a database created with the old schema and confirmed existing data survived
- **Browser tests (Playwright):** formatting persists after reload, viewers get a read-only editor with no toolbar or share panel, a real two-user edit conflict shows the warning and resolves correctly, and deleted documents return "not found" for collaborators. No browser console errors.
- **Manual review** of the code and UI, plus screenshots in `docs/screenshots`
