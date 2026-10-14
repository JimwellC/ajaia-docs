# Architecture note

## The approach

I didn't try to build Google Docs in a few hours. I picked the parts that matter for this brief and tried to make each one correct, then wrote down what I left out and why. The result has fewer features than a typical clone, but stronger guarantees:

- **Permissions are enforced on the server**, in one place, for every request, with owner, editor, and viewer roles
- **Saving is reliable**: autosave, retry, a warning before leaving with unsaved changes, and detection of conflicting saves instead of silent overwrites
- **Errors are handled consistently**: every request is validated, every failure has a clear code and message, and internals never leak
- **The reasoning is explicit**: this note covers each decision and each cut

The stretch items I chose are view vs edit roles, Markdown and plain text download, and polling-based live updates, each chosen because it deepens the core rather than widening it.

## Cut on purpose

- **Live keystroke co-editing.** I've built real-time systems before (live bidding over Socket.IO and Redis), so I know what doing it properly costs: CRDTs such as Yjs, a websocket server, presence, and reconnection handling. That isn't a responsible fit for this timebox. Instead I made concurrent editing *safe*: conflicting saves are detected and the user decides. Nobody loses work, at a fraction of the complexity. On top of that, an open document polls the server every 4 seconds while the tab is visible, so other people's *saved* changes appear within about 5 seconds. No websockets and no new dependencies.
- **Real authentication.** The brief allows mocked users, so sign-in is a demo picker. It still issues a real server-side session, and every permission check runs against that session, so real auth would only change how a session gets issued.
- **Comments and version history.** Useful, but each widens the product without strengthening the core. The `version` column is a natural base for history later.

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
| Save fails | The server's message is shown with a Retry button. Changes stay in the editor and in the save queue, and "Saved" is not shown. |
| API unavailable | "Can't reach the server. Your changes are kept here and will retry automatically." The save retries every 5 seconds until it succeeds, and the manual Retry button stays available. |
| Saves finish out of order | Can't happen within one tab: title and content changes share one serialized queue with at most one request in flight, and each save carries the version it was based on. |
| Two users save the same document | The second save is based on a stale version and gets 409 with the latest content. The editor offers "Load their version" or "Keep mine", so nothing is silently overwritten. |
| Document deleted elsewhere | The next save gets 404. Saving stops, the content stays on screen, and the editor shows "This document was deleted or you no longer have access." with a link back to all documents. |
| Access revoked while editing | Removed entirely: same as deleted (404). Downgraded to viewer: the next save gets 403, the editor switches to read-only, and it shows "Your access changed to view-only. Your latest changes were not saved." |
| Someone else saves while you have the document open | Within about 5 seconds the poll sees a newer version. If you have nothing unsaved and haven't typed for 2 seconds, the editor and title update in place without triggering a save, and the status shows "Updated by another user". Otherwise your work stays and the next save gets the conflict choice above. |
| Poll fails | Unreachable server: ignored, the next poll tries again. 404: same as deleted. 403: same as downgraded to viewer. Polling pauses while the tab is hidden and checks once as soon as it is visible again. |
| Forged session cookie | 401. The user is resolved only by looking up the session token, so a cookie holding a user id, an unknown token, or an expired token is rejected. |

## Key decisions

**Thin routes, rules in services.** Every rule ("only owners share", "viewers can't edit") lives in `src/server/documents.ts` and `src/lib/access.ts`. Route handlers only validate input and translate errors, which keeps them short and identical in shape.

**Typed errors.** Services throw `AppError` with a code (`not_found`, `forbidden`, `conflict`, and so on). One wrapper maps them to status codes and a consistent JSON shape. Unexpected errors are logged and return a generic message, so internals never leak.

**Zod validation at the boundary.** Every request body is parsed by a strict schema: titles are trimmed and length-checked, content is size-limited, unknown fields are rejected, and malformed JSON returns 400 instead of 500.

**Optimistic concurrency.** Each document has a `version`. A save includes the version the client last saw, and the `UPDATE ... WHERE version = $expected` is atomic. If someone saved in between, the API returns 409 with the latest content, and the editor shows "Load their version" or "Keep mine". On the client, title and content changes go through one serialized save queue (`useDocumentSaver`), so a client's own saves can never race each other either.

**404 for no access, 403 for wrong role.** Non-members can't tell whether a document exists. Members trying something their role doesn't allow get a 403 with a clear message.

**Documents stored as HTML, not JSON.** HTML is Tiptap's native input and output format, and every import (`.txt`, `.md`, `.docx`) produces HTML directly, so there is one format at rest with no conversion layer. Because HTML can carry scripts, the server sanitizes it before every save and import (`src/server/sanitize.ts`) with a strict allowlist. Scripts, styles, event handlers, images, and every attribute except a link's `href` are removed; links keep only http, https, and mailto URLs and always get `rel="noopener noreferrer nofollow"` and `target="_blank"`. Markdown import also escapes raw HTML first. Tiptap JSON would need its own validation and a converter for every import format, without being safer than an allowlist.

**Editor and sanitizer kept identical.** The editor's extension list lives in one file (`src/lib/editorExtensions.ts`) and the allowlist in another (`src/server/sanitize.ts`), each pointing to the other, and both use the same link rules (`src/lib/linkUrl.ts`). A unit test builds a document containing every supported node and mark, including links, renders it with the shared extension list, sanitizes it, and asserts the HTML is byte for byte unchanged. So nothing a user can create is silently lost on save, and nothing beyond it is ever stored. To keep the allowlist attribute free, code blocks carry no language and numbered lists always start at 1. Imports follow the same rules: unsupported Markdown such as images and tables keeps its readable text (alt text, cell text) and loses only the markup, while Markdown links and strikethrough import as real formatting.

**Formatting scope.** The same set is used everywhere: the editor, the sanitizer, imports, and downloads. Supported: paragraphs, H1 to H3, bold, italic, underline, strikethrough, bulleted and numbered lists, quotes, code blocks, inline code, dividers, line breaks, and links. Images, tables, colors, fonts, and alignment were left out deliberately: images need file storage, tables need a much larger schema and editing UI, and colors, fonts, and alignment need style attributes, any of which would weaken the strict allowlist.

**Deployment health check.** `GET /api/health` returns 200 only when the database answers and every file in `db/migrations` is recorded in `schema_migrations`; otherwise 503 with the pending names. It needs no sign-in and never echoes connection details. The README's deployment checklist runs migrations before deploying and confirms this endpoint after.

**Postgres with plain SQL and versioned migrations.** I started with Prisma, but its engine binaries couldn't be downloaded in my build environment. A handful of tables don't need an ORM, so SQL lives in one repository file and schema changes are numbered migration files applied once each and tracked in `schema_migrations`. The second migration (versions and roles) upgraded the already-deployed database without data loss: existing shares became editors.

**Downloads.** `GET /api/documents/[id]/export?format=md|txt` uses the same access check as reading: anyone who can view the document can download it, everyone else gets 404. The stored HTML is already limited to the allowlist, so the converter (`src/server/export.ts`) only has to handle those formats. Markdown keeps every format except underline, which Markdown can't express, and escapes text that would otherwise turn into Markdown syntax. The filename comes from the title, with an ASCII fallback and the full UTF-8 name in `Content-Disposition`.

**Presence via heartbeat polling, not websockets.** Each open editor's 4 second poll first posts a heartbeat (`POST /api/documents/[id]/presence`, view access required, 404 otherwise) that upserts `document_presence`; the document GET then lists other members seen in the last 12 seconds, marked typing if they typed in the last 5, never including the requester.

**Testable route handlers.** Auth reads the session from the `Request` rather than Next's request-scoped `cookies()`, so integration tests call the real handlers with real `Request` objects against Postgres.

## UX and accessibility

The interface is writing first: warm neutral colors, the system font, a sidebar instead of page chrome, and a centered 720px editing column with no card around it. The top bar keeps the save status visible ("Saving…", "Saved", "Edited 2 minutes ago", or a failure message). Times that depend on the viewer's clock (the greeting and relative times) render only after the page loads in the browser, so server and browser output never disagree.

Checked against a local production build with Playwright:

- **axe scan** (`@axe-core/playwright`, all rules) of the sign-in page, the home page (All, Private, and Shared tabs, a search with no match, a ⋯ menu, and the delete confirmation), not found, the editor as owner, the Share popover as owner and as editor, the Download menu, the sidebar ⋯ menu, the link popover showing an error, the editor as viewer, the conflict banner, and the phone layout with the navigation drawer open. 0 critical or serious violations in every state. The one moderate finding (the home top bar outside a landmark) was fixed by making it a header, so every state now reports 0 violations of any severity.
- **Keyboard only:** signing in, switching home tabs with the arrow keys (the URL updates), opening a document from the table with Enter, opening a ⋯ menu (focus moves into it and Escape returns it), creating a document, typing, bold, adding a link (Ctrl+K or ⌘K), reaching the toolbar, and sharing from the Share popover all work without a mouse. Every control reached with Tab showed a visible focus ring.
- **375px width:** sign-in, home (All and Shared), an open ⋯ menu, the navigation drawer, the editor as owner and viewer, and the Share and Download popovers have no horizontal page scroll. The top bar fits, the toolbar scrolls sideways within itself, and the drawer closes after navigating. See `docs/screenshots/09-mobile-editor.png` and `10-mobile-dashboard.png`.
- **Failure states in a real browser:** opening a document as owner and as editor sends no save (a regression check for a save on open bug), offline with automatic retry, access downgraded to viewer, document deleted while editing, and an edit conflict resolved with "Load their version". See screenshots 06 to 08.
- **Live updates in a real browser** (local build on a throwaway Postgres): Jim types and saves, and the owner's and the viewer's editors show the text within 10 seconds (about 3 seconds in the run) with no save sent by either; opening and idling through a poll sends no save; an owner's offline edit is not replaced by polling and gets the conflict banner, and "Keep mine" saves; removing a viewer's access while they have the document open shows the "deleted or no access" message after the next poll.

## Data model

```
users              (id, email unique, name)
documents          (id, title, content html, owner_id → users, version, created_at, updated_at)
shares             (document_id → documents, user_id → users, role viewer|editor), primary key on the pair
sessions           (token, user_id → users, created_at, expires_at)
document_presence  (document_id → documents, user_id → users, last_seen, typing_at), primary key on the pair
schema_migrations  (name, applied_at)
```

Deleting a document cascades to its shares. Deleting a user cascades to their sessions.

## Known limitations

- Other people's changes appear only after they are saved, within about 5 seconds. There is no live keystroke co-editing, no cursors and no presence
- An editor downgraded to viewer finds out on their next save (403), not from polling, since viewers may still read the document
- Polling costs one small request per open document every 4 seconds while the tab is visible
- The formatting toolbar has no arrow-key navigation between buttons; each button is reached with Tab
- Markdown tables flatten into a paragraph on import (the cell text is kept, the table structure is not)
- Demo sign-in: anyone can pick any demo user (but they get a real session, and cookies can't be forged)
- No rate limiting or audit log

## What I'd build next (2 to 4 more hours)

1. Live keystroke co-editing with Yjs and presence (saved changes already appear within about 5 seconds by polling)
2. Version history from saved snapshots (the version column is already there)
3. Comments anchored to text ranges
4. Real authentication (magic link or OAuth)
5. Playwright end-to-end tests in CI
