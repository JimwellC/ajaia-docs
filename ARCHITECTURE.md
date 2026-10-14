# Architecture note

## The approach

I didn't try to build Google Docs in a few hours. I picked the parts that matter for this brief and tried to make each one correct, then wrote down what I left out and why. The result has fewer features than a typical clone, but stronger guarantees:

- **Permissions are enforced on the server**, in one place, for every request, with owner, editor, and viewer roles
- **Saving is reliable**: autosave, retry, a warning before leaving with unsaved changes, and detection of conflicting saves instead of silent overwrites
- **Errors are handled consistently**: every request is validated, every failure has a clear code and message, and internals never leak
- **The reasoning is explicit**: this note covers each decision and each cut

The one stretch item I chose is view vs edit roles, because it deepens permission enforcement rather than widening the product.

## Cut on purpose

- **Real-time co-editing.** I've built real-time systems before (live bidding over Socket.IO and Redis), so I know what doing it properly costs: CRDTs such as Yjs, a websocket server, presence, and reconnection handling. That isn't a responsible fit for this timebox. Instead I made concurrent editing *safe*: conflicting saves are detected and the user decides. Nobody loses work, at a fraction of the complexity.
- **Real authentication.** The brief allows mocked users. Every permission check runs on the server against the session, so real auth would only change how the session cookie is created.
- **Comments, version history, export.** Useful, but each widens the product without strengthening the core. The `version` column is a natural base for history later.

## Request flow

```
Route handler (src/app/api)      parse JSON → Zod schema → call service → JSON response
        │                          errors become { error: { code, message } } via route()
        ▼
Service (src/server/documents.ts) load document + grants → check permission → act
        │                          missing and forbidden both look like 404 to non-members
        ▼
Repository (src/server/repo.ts)   parameterized SQL only, no business rules
```

Pages (server components) call the same service functions as the API, so the browser and the API can never disagree about who can see what.

## Key decisions

**Thin routes, rules in services.** Every rule ("only owners share", "viewers can't edit") lives in `src/server/documents.ts` and `src/lib/access.ts`. Route handlers only validate input and translate errors, which keeps them short and identical in shape.

**Typed errors.** Services throw `AppError` with a code (`not_found`, `forbidden`, `conflict`, and so on). One wrapper maps them to status codes and a consistent JSON shape. Unexpected errors are logged and return a generic message, so internals never leak.

**Zod validation at the boundary.** Every request body is parsed by a strict schema: titles are trimmed and length-checked, content is size-limited, unknown fields are rejected, and malformed JSON returns 400 instead of 500.

**Optimistic concurrency.** Each document has a `version`. A save includes the version the client last saw, and the `UPDATE ... WHERE version = $expected` is atomic. If someone saved in between, the API returns 409 with the latest content, and the editor shows "Load their version" or "Keep mine". On the client, title and content changes go through one serialized save queue (`useDocumentSaver`), so a client's own saves can never race each other either.

**404 for no access, 403 for wrong role.** Non-members can't tell whether a document exists. Members trying something their role doesn't allow get a 403 with a clear message.

**Documents stored as HTML.** Tiptap reads and writes HTML and imports convert to HTML, so there is one format at rest. Tiptap's schema drops unsupported or unsafe markup on load, and Markdown import escapes raw HTML first.

**Postgres with plain SQL and versioned migrations.** I started with Prisma, but its engine binaries couldn't be downloaded in my build environment. Three tables don't need an ORM, so SQL lives in one repository file and schema changes are numbered migration files applied once each and tracked in `schema_migrations`. The second migration (versions and roles) upgraded the already-deployed database without data loss: existing shares became editors.

**Testable route handlers.** Auth reads the session from the `Request` rather than Next's request-scoped `cookies()`, so integration tests call the real handlers with real `Request` objects against Postgres.

## Data model

```
users              (id, email unique, name)
documents          (id, title, content html, owner_id → users, version, created_at, updated_at)
shares             (document_id → documents, user_id → users, role viewer|editor), primary key on the pair
schema_migrations  (name, applied_at)
```

Deleting a document cascades to its shares.

## Known limitations

- Last save is no longer silent, but two people can't see each other's cursor or edits live
- Mocked auth: anyone can sign in as any demo user
- No rate limiting or audit log

## What I'd build next (2 to 4 more hours)

1. Real-time collaboration with Yjs and presence indicators
2. Version history from saved snapshots (the version column is already there)
3. Comments anchored to text ranges
4. Real authentication (magic link or OAuth)
5. Playwright end-to-end tests in CI
