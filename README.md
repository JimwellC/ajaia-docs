# Ajaia Docs

A lightweight collaborative document editor: create, format, rename, import, and share documents, with everything persisted in Postgres.

**Live app:** https://ajaia-docs-red-nu.vercel.app

## Demo accounts

Sign-in is mocked. Pick a user on the sign-in screen, and use **Switch user** to change accounts.

| User | Email | Notes |
|---|---|---|
| Alice Reyes | alice@ajaia.test | Owns the seeded "Welcome to Ajaia Docs" document |
| Bob Santos | bob@ajaia.test | The welcome document is shared with Bob |
| Carol Cruz | carol@ajaia.test | No access to anything at first, useful for testing denial |

**Quick sharing test:** sign in as Alice, create a document, share it with `bob@ajaia.test`, then switch to Bob and open **Shared with me**. Sign in as Carol and the same document URL returns "Document not found".

## Features

- Create, rename, edit, and reopen documents
- Rich text: bold, italic, underline, headings (H1 to H3), bulleted and numbered lists, undo and redo
- Autosave with a visible status (Unsaved, Saving, Saved, Couldn't save with Retry)
- File import: `.txt`, `.md`, and `.docx` up to 2 MB become a new editable document
- Sharing: the owner shares by email, can remove access, and documents are split into **My documents** and **Shared with me**
- Access control: owners manage sharing and deletion, shared users can view and edit, everyone else gets a 404

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Tiptap 2 · PostgreSQL via `pg` · Vitest

## Run locally

Requirements: Node 20+ and a Postgres database (a free [Neon](https://neon.tech) database works).

```bash
npm install
cp .env.example .env          # then set DATABASE_URL
npm run db:setup              # creates tables and seeds demo users (safe to rerun)
npm run dev                   # http://localhost:3000
```

## Tests

```bash
npm test
```

Covers the access control rules (owner, shared user, no access, sharing edge cases) and file import (text, markdown, unsafe HTML, unsupported, empty, and oversized files).

## Deploy (Vercel + Neon, both free)

1. Create a Neon project and copy its connection string.
2. Run `DATABASE_URL="<neon url>" npm run db:setup` once.
3. Import the repo in Vercel, add `DATABASE_URL` as an environment variable, and deploy.

## Project structure

```
db/schema.sql                 Tables: users, documents, shares
scripts/setup-db.ts           Creates tables and seeds demo users
src/lib/access.ts             Access rules as pure functions (tested)
src/lib/importFile.ts         File to HTML conversion and validation (tested)
src/lib/documents.ts          Database queries
src/app/api/...               Route handlers: session, documents, shares, import
src/components/...            Editor, toolbar, share panel, document list
tests/                        Vitest tests
```

See `ARCHITECTURE.md`, `AI_WORKFLOW.md`, and `SUBMISSION.md`.
