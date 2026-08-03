# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Get Stuff Done" — a multi-user GTD (Getting Things Done) productivity app. Actions live in Projects, Projects live in Folders, everything can be tagged (tags support location/context), and ownership can be shared within a Family (household-style sharing, not public sharing).

## Commands

This is a pnpm workspace (`apps/*`, `packages/*`) orchestrated by Turborepo. Run everything from the repo root unless noted.

```bash
pnpm install                    # install all workspace deps
pnpm exec turbo run typecheck   # typecheck every package (tsc --noEmit)
pnpm exec turbo run test        # run all tests (currently only packages/domain has any)
pnpm exec turbo run build       # build apps/web + anything else with a build script

# single-package / single-test-file
cd packages/domain && pnpm exec vitest run src/nextActionable.test.ts
cd packages/api && pnpm exec tsc --noEmit

# local Postgres + full stack
docker compose up -d postgres                 # just the DB, for local dev servers below
docker compose up --build -d                  # full stack: postgres (5433) + api (4000) + web (3000)

# Prisma (run from packages/db, needs DATABASE_URL)
pnpm --filter @gsd/db migrate           # prisma migrate dev (creates + applies a migration)
pnpm --filter @gsd/db generate          # regenerate the Prisma client after a schema change
pnpm --filter @gsd/db studio            # prisma studio

# running the API/web outside Docker (tsx isn't hoisted to the repo root —
# invoke it via the app's own workspace, e.g. from apps/api or apps/web)
cd apps/api && DATABASE_URL=postgresql://gsd:gsd@localhost:5433/gsd JWT_SECRET=dev-secret-change-me GOOGLE_CLIENT_ID=test PORT=4001 pnpm exec tsx src/index.ts
cd apps/web && NEXT_PUBLIC_API_URL=http://localhost:4001 pnpm exec next dev -p 3001
```

There is no lint script configured anywhere in the workspace (the root `pnpm lint` is a no-op — no package implements a `lint` task, no ESLint config exists).

### Verifying backend changes

There's no integration test suite for the API — correctness of tRPC routers/domain logic is verified by hand against a real database:

```bash
# mint a session JWT for a throwaway seeded user
cd apps/api && DATABASE_URL=postgresql://gsd:gsd@localhost:5433/gsd JWT_SECRET=dev-secret-change-me pnpm exec tsx ../../packages/api/smoke-test-seed.ts
# then curl /trpc/<router>.<procedure> (or /api/<path> for the REST surface) with that token
```

This matters especially when touching `.output()` schemas on a router (see below) — a bad output schema breaks the real `/trpc` endpoint at runtime, not just at compile time.

## Architecture

### Monorepo layout

- `apps/api` — thin Fastify process. Wires `packages/api`'s tRPC router onto `/trpc`, generates the OpenAPI doc, serves Swagger UI at `/docs`, and bridges a separate REST surface at `/api/*` (see "Two ways to call the API" below). No business logic lives here.
- `apps/web` — Next.js App Router frontend.
- `apps/mobile` — empty placeholder, not built yet.
- `packages/domain` — pure, DB-agnostic business logic (no Prisma import). This is the only package with real unit tests.
- `packages/api` — the actual tRPC router definitions + request context creation. Depends on `domain`, `db`, `validation`, `auth`.
- `packages/validation` — zod schemas, the single source of truth for both create/update *input* validation and `.output()` *output* validation used by every router.
- `packages/db` — Prisma schema/client (generated client lives in `packages/db/generated/client`, not checked into a normal `node_modules` location).
- `packages/auth` — Google ID token verification, JWT access tokens, refresh tokens, and personal-access-token issuing/hashing.
- `packages/config` — just a shared `tsconfig.base.json` that every other package's `tsconfig.json` extends.
- `packages/geocoding`, `packages/storage` — empty placeholders, not built yet.

### Domain logic lives in `packages/domain`, not the routers

`packages/api`'s routers are thin: auth/ownership checks, Prisma calls, and cascading side effects. The actual GTD algorithms are pure functions in `packages/domain`, tested in isolation:

- `nextActionable.ts` (`computeActionable`) — decides which actions are the "next actionable" items. An action is eligible only if it's active, not deferred into the future, and every ancestor (via `parentActionId`) is active. Within a sibling group, `sequential` surfaces only the lowest-`sortOrder` eligible sibling; `parallel`/`single_actions` surface all of them. **The top-level sibling group (parentActionId null) is governed by the Project's own `type`; every nested group is governed by its immediate parent *action's* own `type` instead** — each parent action configures its own children independently of the project and of any other ancestor.
- `recurrence.ts` — computes the next occurrence's dates for repeating actions (`regular` vs `from_completion` schedules, `catchUpAutomatically`).
- `review.ts` — computes a project's next review date.
- `visibility.ts` — duck-typed Prisma `where`-fragment builders (`visibleProjectsWhere`, `visibleActionsWhere`) so ownership/sharing visibility is enforced in SQL, plus `canWrite*`/`canReviewProject`/`canShareProjectWith` predicates. Deliberately has no `@prisma/client` import so it stays framework-agnostic.

### Auto-completion cascades

Both Projects and Actions can have `completeWithLastAction: boolean`. Completing an action in `packages/api/src/router/actions.ts`:
1. Walks up the `parentActionId` chain (`touchParentActionsAndMaybeAutoComplete`), auto-completing any ancestor action whose `completeWithLastAction` is on and has no remaining active children — stopping at the first ancestor that doesn't qualify (it's still active, so nothing further up needs to change).
2. Then checks the project itself the same way (`touchProjectAndMaybeAutoComplete`) — this check is independent of how far the action-level walk went, since it counts *all* active actions in the project, not just top-level ones.

A repeating action's completion clones a fresh active occurrence into the same project/parent *before* these checks run, so the cascade correctly sees "there's still an active occurrence" and doesn't prematurely auto-complete. Note the asymmetry: `drop` does **not** trigger either auto-complete cascade — only actually completing the last item does.

### Two ways to call the API

`packages/api`'s single tRPC router is exposed two ways from `apps/api`:
1. **`/trpc/*`** — the standard tRPC/superjson endpoint the web app uses (session JWT via `Authorization: Bearer`, or the refresh-token httpOnly cookie).
2. **`/api/*`** — a plain REST/JSON surface for direct API clients (personal access tokens, `gsd_pat_...`, created in Settings), documented at `/docs` (Swagger UI) and generated from the same router via `trpc-to-openapi`.

Every router procedure needs `.meta({ openapi: {...} })` *and* `.output(schema)` to appear on the REST surface — `.output()` is enforced at runtime on every call including `/trpc`, so a mismatched schema breaks the live app, not just `tsc`. `protect: true` must be explicit even on `protectedProcedure`s; omitting it defaults to `protect: true` in the generated OpenAPI security requirements anyway, but public procedures (`auth.loginWithGoogle`, `auth.refresh`, `auth.logout`) must explicitly set `protect: false` or the generated docs wrongly imply they require auth.

`trpc-to-openapi` is pinned to `^2.4.0`, not the current `3.x` line — 3.x requires Zod v4, and this repo is on Zod v3.25. Also, `apps/api`'s `/api/*` route bridges Fastify requests into a real Fetch API `Request` (see `toFetchRequest` in `apps/api/src/index.ts`) rather than using `trpc-to-openapi`'s Fastify adapter directly — that adapter feeds the Fastify request object into a raw-Node-stream reader that Fastify's request wrapper doesn't satisfy (`req.once is not a function`). The Fetch adapter's request context is intentionally a separate `createRestContext` (in `packages/api/src/context.ts`) from the cookie-based `createContext` used by `/trpc` — REST clients have no cookie jar, so refresh-token handling there is body-only (same fallback path already used for mobile clients).

### Auth model

Two independent ways to authenticate, resolved in `packages/api/src/context.ts`: a short-lived JWT access token (`Authorization: Bearer <jwt>`, paired with an httpOnly refresh-token cookie for browser sessions), or a long-lived personal access token (`gsd_pat_<hex>`, hashed with SHA-256 before storage, never re-displayed after creation, managed in `/settings`). `looksLikeApiToken` distinguishes which path to take before verifying.

### Ownership and sharing

Projects and Actions aren't purely private: a `Family` groups `User`s, and `ProjectShare` lets a project be shared with a specific family member. `visibleProjectsWhere`/`visibleActionsWhere` (in `packages/domain`) are the only place this visibility logic should live — routers call them rather than reimplementing the `OR` conditions. Tags and Folders are always private to their owner (no sharing concept).

### Frontend shell (`apps/web`)

An OmniFocus-style shell, not a per-page layout: `AppShell` composes `Header` + `StatusMessageBar` + `GlobalSidebar` (icon rail across "perspectives" — Inbox/Projects/Tags/Forecast/Flagged/Completed/Changed, defined in `lib/perspectives.ts`) + page content + `Inspector` (a persistent detail/edit panel on the right, driven by `ShellStateProvider`'s current `selection`, not by routing). Projects and Tags additionally get a context-sensitive sidebar (nested tree with drag-and-drop reparenting) via their own `layout.tsx`.

`ShellStateProvider` holds cross-cutting UI state (current selection for the Inspector, sidebar visibility, view-options panel, the "hide completed" toggle) — most components read/write through this rather than local state or prop-drilling.

Hierarchical pickers (project-in-folder, tag-in-tag) render a "Parent : Child : Leaf" path via `lib/projectPath.ts` / `lib/tagPath.ts` while showing just the leaf name once something is selected/chipped — this split (full path while picking, leaf name once committed) is a deliberate, established convention; match it for any new hierarchical picker.

### Env vars

`DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID` (server-side verification), `WEB_ORIGIN` (CORS), `API_ORIGIN` (OpenAPI doc's `baseUrl`, defaults to `http://localhost:<PORT>`). Web needs `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` as **build args**, not just runtime env — they're inlined into the client bundle at `next build` time.

### Docker build notes

Both `apps/api/Dockerfile` and `apps/web/Dockerfile` share a BuildKit cache mount (`--mount=type=cache,id=pnpm-store,...`) for pnpm's package store, and a root `.npmrc` sets longer fetch timeouts/retries and `network-concurrency=4` — this workspace has hit npm-registry timeouts on constrained/flaky connections during `pnpm install` inside Docker, and reducing concurrency (not just raising timeouts) is what actually fixed it.
