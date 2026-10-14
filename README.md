# Ajaia Docs

A lightweight collaborative document editor. Create, format, rename, import, and share documents with view or edit access. Everything is persisted in Postgres, and concurrent saves are detected instead of silently overwritten.

**Live app:** https://ajaia-docs-red-nu.vercel.app

## Demo accounts

Sign-in is mocked: pick a user on the sign-in screen (each one shows its role on the welcome document) and use **Switch user** at the bottom of the sidebar to change accounts.

| User | Email | On the seeded "Welcome to Ajaia Docs" document |
|---|---|---|
| Jimwell Calma | jimwell@ajaia.test | Owner |
| Jim | jim@ajaia.test | Can edit |
| JC | jc@ajaia.test | Can view (read-only) |

**Try this (3 minutes):**

1. As **Jimwell Calma**, create a document, format it, and share it with `jim@ajaia.test` (Can edit).
2. **Switch user** to **Jim**: it appears in the sidebar under **Shared** and Jim can edit it.
3. Switch to **JC** and open the welcome document: it is read-only. Open Jimwell's new document URL: "Document not found".
4. **Edit conflict:** open the same document as Jimwell and Jim in two browsers (one normal, one private window). Save an edit as Jim, then type as Jimwell: Jimwell gets a warning and chooses which version to keep.

## Features

- **Writing-first layout:** a collapsible sidebar (a drawer on phones) lists your **Private** documents and those **Shared** with you, each with a ⋯ menu to open, download, or delete. The editor is a centered column with an inline title, a light sticky toolbar, and a top bar with the breadcrumb, save status, Download, and Share.
- **Home:** a greeting, quick "New document" and "Import file" actions, search by title, and a table of documents (name, owner, your access, last edited) filtered by All, Private, or Shared (kept in the URL)
- **Download** any document you can view as Markdown or plain text
- Create, rename, edit, reopen, and delete documents
- Rich text: headings (H1 to H3), bold, italic, underline, strikethrough, inline code, links, bulleted and numbered lists, quotes, code blocks, dividers, undo and redo, with keyboard shortcuts and Markdown-style typing shortcuts
- Autosave with a visible status, retry on failure, and a warning before leaving with unsaved changes
- **Edit conflict detection:** every save carries the version it was based on; stale saves are rejected and the user chooses "Load their version" or "Keep mine"
- **Import** `.txt`, `.md`, and `.docx` (up to 2 MB) as a new editable document
- **Sharing** by email with **Can edit** or **Can view** access, changeable or removable by the owner
- **Access control** enforced on the server: owners manage sharing and deletion, editors write, viewers read, everyone else gets a 404

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Tiptap 2 · PostgreSQL (`pg`) · Zod · Vitest · GitHub Actions

## Run locally

Requirements: Node 20+ and Postgres (a free [Neon](https://neon.tech) database works).

```bash
npm install
cp .env.example .env     # set DATABASE_URL
npm run db:setup         # runs migrations and seeds demo users (safe to rerun)
npm run dev              # http://localhost:3000
```

## Quality checks

```bash
npm run lint
npm run typecheck
npm test                 # unit tests; add TEST_DATABASE_URL to also run API integration tests
TEST_DATABASE_URL=postgresql://... npm test
```

- **Unit tests:** access rules, request validation, file import, HTML sanitization, a check that the editor's output passes the sanitizer unchanged, Markdown and plain text export, and relative times
- **Integration tests:** call the real route handlers against a real Postgres database, covering sessions, editing, edit conflicts, every permission level, sharing validation, import, download, sanitization, and the health check. They use a separate database that gets reset before each test.
- **CI:** GitHub Actions runs lint, type check, all tests against a Postgres service, and a production build on every push.

## Deploy (Vercel + Neon, both free)

1. Create a Neon project and copy the connection string.
2. Run `DATABASE_URL="<neon url>" npm run db:setup`. Run this before deploying new code too, so migrations are applied first.
3. Import the repo in Vercel, add `DATABASE_URL`, and deploy.

## Deployment checklist

Run through this for every release, in this order:

1. Run `npm run lint`, `npm run typecheck`, and `npm test` (with `TEST_DATABASE_URL` pointing at a throwaway database, never production, because the integration tests truncate tables).
2. Run `npm run db:setup` against production so new migrations are applied before new code depends on them. It is safe to rerun and prints each migration it applies.
3. Deploy (`vercel deploy --prod`).
4. Confirm `GET /api/health` returns 200 with `{"ok":true,"database":"ok","pendingMigrations":[]}`. It returns 503 if the database is unreachable or any file in `db/migrations` hasn't been applied, and never includes connection details.
5. Smoke-test sign-in: open the live URL, sign in as a demo user, and open a document.

## Project structure

```
db/migrations/            Versioned SQL migrations, applied in order and tracked in schema_migrations
scripts/                  migrate.ts, seed.ts, setup-db.ts
src/lib/access.ts         Permission rules as pure functions
src/lib/importFile.ts     File to HTML conversion and validation
src/server/
  documents.ts            Business rules: every operation checks access first
  repo.ts                 All SQL queries
  validation.ts           Zod schemas for every request body
  errors.ts               Typed errors mapped to HTTP status codes
  handler.ts              Route wrapper: consistent JSON errors, no leaked internals
  auth.ts                 Demo sign-in backed by server-side sessions (random token cookie)
  sanitize.ts             HTML allowlist applied before any document content is saved
  health.ts               Database and migration status for /api/health
  migrations.ts           Lists migration files (shared by the migration runner and the health check)
src/lib/editorExtensions.ts  The editor's formatting scope, kept identical to the sanitizer allowlist
src/lib/linkUrl.ts        Link URL rules (http, https, mailto) shared by the editor and the sanitizer
src/app/api/              Thin route handlers: parse, call a service, respond
src/components/           App shell and sidebar, home dashboard, editor, save queue hook, toolbar, share panel, menus
src/server/export.ts      HTML to Markdown and plain text for downloads
tests/unit/               Pure logic tests
tests/integration/        API tests against Postgres
.github/workflows/ci.yml  CI pipeline
```

See `ARCHITECTURE.md`, `AI_WORKFLOW.md`, and `SUBMISSION.md`.
