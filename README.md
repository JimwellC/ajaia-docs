# Ajaia Docs

A lightweight collaborative document editor. Create, format, rename, import, and share documents with view or edit access. Everything is persisted in Postgres, and concurrent saves are detected instead of silently overwritten.

**Live app:** https://ajaia-docs-red-nu.vercel.app

## Demo accounts

Sign-in is mocked: pick a user on the sign-in screen and use **Switch user** to change accounts.

| User | Email | On the seeded "Welcome to Ajaia Docs" document |
|---|---|---|
| Alice Reyes | alice@ajaia.test | Owner |
| Bob Santos | bob@ajaia.test | Can edit |
| Carol Cruz | carol@ajaia.test | Can view (read-only) |

**Try this (3 minutes):**

1. As **Alice**, create a document, format it, and share it with `bob@ajaia.test` (Can edit).
2. **Switch user** to **Bob**: it appears under **Shared with me** and he can edit it.
3. Switch to **Carol** and open the welcome document: it is read-only. Open Alice's new document URL: "Document not found".
4. **Edit conflict:** open the same document as Alice and Bob in two browsers (one normal, one private window). Save an edit as Bob, then type as Alice: Alice gets a warning and chooses which version to keep.

## Features

- Create, rename, edit, reopen, and delete documents
- Rich text: bold, italic, underline, headings (H1 to H3), bulleted and numbered lists, undo and redo
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

- **Unit tests:** access rules, request validation, file import
- **Integration tests:** call the real route handlers against a real Postgres database, covering auth, editing, edit conflicts, every permission level, sharing validation, and import. They use a separate database that gets reset before each test.
- **CI:** GitHub Actions runs lint, type check, all tests against a Postgres service, and a production build on every push.

## Deploy (Vercel + Neon, both free)

1. Create a Neon project and copy the connection string.
2. Run `DATABASE_URL="<neon url>" npm run db:setup`. Run this before deploying new code too, so migrations are applied first.
3. Import the repo in Vercel, add `DATABASE_URL`, and deploy.

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
src/app/api/              Thin route handlers: parse, call a service, respond
src/components/           Editor, save queue hook, toolbar, share panel, document list
tests/unit/               Pure logic tests
tests/integration/        API tests against Postgres
.github/workflows/ci.yml  CI pipeline
```

See `ARCHITECTURE.md`, `AI_WORKFLOW.md`, and `SUBMISSION.md`.
