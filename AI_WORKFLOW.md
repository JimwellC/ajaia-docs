# AI workflow note

## Tools used

- **Claude** as a pair programmer for planning, writing code, and testing
- **Claude Code** in the terminal for repository setup, deployment to Vercel, and filling in the live URL

## How I used it

I decided the scope and stack up front (what to build, what to cut, mocked auth, which file types to import), then had Claude generate code one layer at a time: schema, access rules, API routes, then UI. I reviewed each layer before moving on.

## Where AI sped things up most

- Boilerplate: route handlers, form states, and Tailwind styling
- The Tiptap toolbar and editor setup
- Writing test cases, especially edge cases like unsafe HTML in markdown and oversized files
- Writing end-to-end checks with curl and Playwright to confirm behavior in a real browser

## What I changed or rejected

- **Prisma → plain `pg`.** The first draft used Prisma, but its engine download was blocked in the build environment. Rather than work around it, I dropped the ORM, since three tables don't need one.
- **Raw HTML in markdown.** A straightforward markdown conversion would pass raw HTML through. I made sure it's escaped first and added a test so it stays that way.
- **Autosave race condition.** A simple debounced save can let an older request finish after a newer one and overwrite it. Saves now run one at a time and failed saves are kept for Retry.
- **Access error codes.** Returning 403 for documents a user can't see would confirm the document exists, so those return 404.
- **A flaky browser test.** One Playwright step clicked a name that appeared on two pages during navigation. The app was fine; I fixed the test to wait for the right page.

## How I verified it

- **Unit tests (Vitest):** access rules and file import, 9 tests
- **Production build:** `next build` with type checking and linting, no errors
- **End-to-end API checks:** signed in as each demo user and confirmed create, edit, rename validation, sharing, duplicate shares, owner-only actions (403), no-access requests (404), and file import including rejected file types
- **Browser test (Playwright):** created a document, applied headings, bold, underline, and lists, waited for autosave, reloaded and confirmed formatting persisted, shared with Bob, then switched users and confirmed Bob sees it
- **Manual review:** read through the generated code, checked the UI in the browser, and checked screenshots in `docs/screenshots`
