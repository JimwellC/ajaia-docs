# Architecture note

## What I prioritized

The brief rewards depth in a few areas over shallow coverage, so I put the time into the parts a reviewer will actually touch: a smooth editing flow, sharing logic that is correct, and saves that don't lose work. I treated deployment and a testable build as part of the core, not an afterthought.

**In scope:** create, rename, rich text editing, autosave, `.txt`, `.md` and `.docx` import, owner and shared access, owned vs shared views, validation, tests, and deployment.

**Cut on purpose:**

- **Real-time co-editing.** Doing this properly needs CRDTs (for example Yjs) and a websocket server, which is a project of its own. Two people editing at once means last save wins. I would rather say that clearly than ship a fragile version.
- **Real authentication.** The brief allows mocked users, so sign-in is a seeded user picker. All access checks run on the server against the session, so swapping in real auth would only change how the session is created.
- **Roles beyond owner and editor.** A viewer role is a small change in `access.ts`, but it adds UI states without changing what the demo proves.
- **Comments, version history, export.** Listed as next steps.

## Key decisions

**Next.js App Router for both frontend and API.** One codebase and one deployment. Pages are server rendered with an access check before anything reaches the browser, and API routes handle mutations.

**Tiptap for the editor.** It is built on ProseMirror, so formatting is reliable and the schema only allows the elements I enabled. Writing a rich text editor from scratch is not a good use of four hours.

**Documents stored as HTML.** Tiptap reads and writes HTML directly, and imported files convert to HTML too, so there is one format everywhere. Because Tiptap parses content through its schema, unsupported or unsafe markup is dropped when a document loads. Markdown import also escapes raw HTML before conversion.

**Postgres with plain SQL (`pg`), no ORM.** I started with Prisma, but its engine binaries couldn't be downloaded in my build environment. Three tables and a handful of queries don't need an ORM, so I switched to parameterized SQL in one file. It has fewer moving parts and runs the same locally and on Vercel.

**Access rules as pure functions.** `src/lib/access.ts` has no database or framework code, so the rules are easy to read, reuse in pages and API routes, and test directly.

**404 instead of 403 for documents you can't access.** Users without access can't tell whether a document exists. Shared users who try owner-only actions get a 403 with a clear message.

**Autosave design.** Edits save 800ms after typing stops. Saves run one at a time so an older request can't overwrite newer content, failed saves keep the unsaved content and offer Retry, and the browser warns before leaving with unsaved changes.

## Data model

```
users     (id, email unique, name)
documents (id, title, content html, owner_id → users, created_at, updated_at)
shares    (document_id → documents, user_id → users), primary key on the pair
```

Deleting a document cascades to its shares.

## What I'd build next (2 to 4 more hours)

1. Real-time collaboration with Yjs and presence indicators
2. A viewer role (read-only sharing)
3. Version history using periodic snapshots
4. Export to Markdown and PDF
5. Real authentication (magic link or OAuth)
6. Integration tests for the API routes against a test database
