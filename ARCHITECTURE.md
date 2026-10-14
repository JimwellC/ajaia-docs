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
- **Real authentication.** The brief allows mocked users, so sign-in is a demo picker. It still issues a real server-side session, and every permission check runs against that session, so real auth would only change how a session gets issued.
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

## Authentication vs authorization

**Authentication** answers "who is this?". The demo sign-in lets you pick a seeded user, but the server then issues a real session: a random 32 byte token stored in the `sessions` table with a 7 day expiry, sent back in an httpOnly, SameSite=Lax cookie that is Secure in production. The cookie never contains a user id. On every request, `src/server/auth.ts` looks the token up, and a missing, unknown, or expired token means 401. Signing out deletes the row, so an old token stops working immediately. A cookie forged to hold a user id such as `u_jimwell` is just an unknown token.

**Authorization** answers "may this user do this?". Every check in `src/server/documents.ts` uses only the user resolved from that session. Ids in a request body or query are never trusted for identity: the API takes the document id from the URL and decides the caller's role from the database, so a client cannot claim to be someone else or claim a role it doesn't have.

## Permission matrix

| Action | Owner | Editor | Viewer | No access |
|---|---|---|---|---|
| View | Yes | Yes | Yes | No (404) |
| Edit content | Yes | Yes | No (403) | No (404) |
| Rename | Yes | Yes | No (403) | No (404) |
| Delete | Yes | No (403) | No (403) | No (404) |
| Share | Yes | No (403) | No (403) | No (404) |
| Change role | Yes | No (403) | No (403) | No (404) |
| Revoke | Yes | No (403) | No (403) | No (404) |

Users without access get 404 rather than 403, so they can't tell whether a document exists.

## Failure scenarios

| Scenario | Expected behavior |
|---|---|
| Refresh while saving | The browser warns before leaving while a save is pending or in flight. A request already sent still completes on the server. |
| Save fails | The server's message is shown with a Retry button. Changes stay in the editor and in the save queue, and "All changes saved" is not shown. |
| API unavailable | "Can't reach the server. Your changes are kept here and will retry automatically." The save retries every 5 seconds until it succeeds, and the manual Retry button stays available. |
| Saves finish out of order | Can't happen within one tab: title and content changes share one serialized queue with at most one request in flight, and each save carries the version it was based on. |
| Two users save the same document | The second save is based on a stale version and gets 409 with the latest content. The editor offers "Load their version" or "Keep mine", so nothing is silently overwritten. |
| Document deleted elsewhere | The next save gets 404. Saving stops, the content stays on screen, and the editor shows "This document was deleted or you no longer have access." with a link back to all documents. |
| Access revoked while editing | Removed entirely: same as deleted (404). Downgraded to viewer: the next save gets 403, the editor switches to read-only, and it shows "Your access changed to view-only. Your latest changes were not saved." |
| Forged session cookie | 401. The user is resolved only by looking up the session token, so a cookie holding a user id, an unknown token, or an expired token is rejected. |

## Key decisions

**Thin routes, rules in services.** Every rule ("only owners share", "viewers can't edit") lives in `src/server/documents.ts` and `src/lib/access.ts`. Route handlers only validate input and translate errors, which keeps them short and identical in shape.

**Typed errors.** Services throw `AppError` with a code (`not_found`, `forbidden`, `conflict`, and so on). One wrapper maps them to status codes and a consistent JSON shape. Unexpected errors are logged and return a generic message, so internals never leak.

**Zod validation at the boundary.** Every request body is parsed by a strict schema: titles are trimmed and length-checked, content is size-limited, unknown fields are rejected, and malformed JSON returns 400 instead of 500.

**Optimistic concurrency.** Each document has a `version`. A save includes the version the client last saw, and the `UPDATE ... WHERE version = $expected` is atomic. If someone saved in between, the API returns 409 with the latest content, and the editor shows "Load their version" or "Keep mine". On the client, title and content changes go through one serialized save queue (`useDocumentSaver`), so a client's own saves can never race each other either.

**404 for no access, 403 for wrong role.** Non-members can't tell whether a document exists. Members trying something their role doesn't allow get a 403 with a clear message.

**Documents stored as HTML, not JSON.** HTML is Tiptap's native input and output format, and every import (`.txt`, `.md`, `.docx`) produces HTML directly, so there is one format at rest with no conversion layer. Because HTML can carry scripts, the server sanitizes it before every save and import (`src/server/sanitize.ts`) with a strict allowlist. Scripts, styles, event handlers, images, and every attribute except a link's `href` are removed; links keep only http, https, and mailto URLs and always get `rel="noopener noreferrer nofollow"` and `target="_blank"`. Markdown import also escapes raw HTML first. Tiptap JSON would need its own validation and a converter for every import format, without being safer than an allowlist.

**Editor and sanitizer kept identical.** The editor's extension list lives in one file (`src/lib/editorExtensions.ts`) and the allowlist in another (`src/server/sanitize.ts`), each pointing to the other, and both use the same link rules (`src/lib/linkUrl.ts`). A unit test builds a document containing every supported node and mark, including links, renders it with the shared extension list, sanitizes it, and asserts the HTML is byte for byte unchanged. So nothing a user can create is silently lost on save, and nothing beyond it is ever stored. To keep the allowlist attribute free, code blocks carry no language and numbered lists always start at 1. Imports follow the same rules: unsupported Markdown such as images and tables keeps its readable text (alt text, cell text) and loses only the markup, while Markdown links and strikethrough import as real formatting.

**Formatting scope.** Supported: paragraphs, H1 to H3, bold, italic, underline, strikethrough, bulleted and numbered lists, quotes, code blocks, inline code, dividers, line breaks, and links. Images, tables, colors, fonts, and alignment were left out deliberately: images need file storage, tables need a much larger schema and editing UI, and colors, fonts, and alignment need style attributes, any of which would weaken the strict allowlist.

**Deployment health check.** `GET /api/health` returns 200 only when the database answers and every file in `db/migrations` is recorded in `schema_migrations`; otherwise 503 with the pending names. It needs no sign-in and never echoes connection details. The README's deployment checklist runs migrations before deploying and confirms this endpoint after.

**Postgres with plain SQL and versioned migrations.** I started with Prisma, but its engine binaries couldn't be downloaded in my build environment. Three tables don't need an ORM, so SQL lives in one repository file and schema changes are numbered migration files applied once each and tracked in `schema_migrations`. The second migration (versions and roles) upgraded the already-deployed database without data loss: existing shares became editors.

**Testable route handlers.** Auth reads the session from the `Request` rather than Next's request-scoped `cookies()`, so integration tests call the real handlers with real `Request` objects against Postgres.

## UX and accessibility

Checked against a local production build with Playwright:

- **axe scan** (`@axe-core/playwright`, all rules) of the sign-in page, both dashboard tabs, the editor as owner, the editor as viewer, the link popover showing an error, and the conflict banner. Before this pass it found 4 serious color contrast issues (gray status and helper text on the light gray page) and 1 moderate missing page heading on the editor. After darkening that text, and giving the editor page a visually hidden heading with the document title, every scanned state reports 0 violations of any severity.
- **Keyboard only:** signing in, creating a document, typing, bold (Ctrl+B or ⌘B), adding a link (Ctrl+K or ⌘K opens the link popover), reaching the toolbar, and sharing all work without a mouse. Every element reached with Tab showed a visible focus ring.
- **375px width:** sign-in, not found, both dashboard tabs, and the editor as owner and viewer have no horizontal page scroll. The header fits on one line, the toolbar scrolls sideways within itself, and the sharing panel stacks below the editor. See `docs/screenshots/09-mobile-editor.png` and `10-mobile-dashboard.png`.
- **Failure states in a real browser:** offline with automatic retry, access downgraded to viewer, document deleted while editing, and an edit conflict resolved with "Load their version". See screenshots 06 to 08.

## Data model

```
users              (id, email unique, name)
documents          (id, title, content html, owner_id → users, version, created_at, updated_at)
shares             (document_id → documents, user_id → users, role viewer|editor), primary key on the pair
sessions           (token, user_id → users, created_at, expires_at)
schema_migrations  (name, applied_at)
```

Deleting a document cascades to its shares. Deleting a user cascades to their sessions.

## Known limitations

- Last save is no longer silent, but two people can't see each other's cursor or edits live
- Demo sign-in: anyone can pick any demo user (but they get a real session, and cookies can't be forged)
- No rate limiting or audit log

## What I'd build next (2 to 4 more hours)

1. Real-time collaboration with Yjs and presence indicators
2. Version history from saved snapshots (the version column is already there)
3. Comments anchored to text ranges
4. Real authentication (magic link or OAuth)
5. Playwright end-to-end tests in CI
