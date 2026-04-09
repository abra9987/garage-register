---
phase: 01-foundation-auth
plan: 01
subsystem: database, auth, infra
tags: [next.js, drizzle-orm, better-auth, postgres, docker, typescript]

# Dependency graph
requires: []
provides:
  - Next.js 16 project scaffold with TypeScript, Tailwind CSS v4, Turbopack
  - Drizzle ORM schema with 7 tables (user, session, account, verification, vehicles, documents, audit_log)
  - 3 PostgreSQL enums (vehicle_status, document_type, audit_action)
  - Better Auth server config with email/password, admin plugin, 30-day sessions
  - Better Auth client with signIn/signOut/useSession exports
  - API catch-all route at /api/auth/[...all]
  - proxy.ts route protection redirecting unauthenticated to /login
  - Admin user seeding on first startup via instrumentation.ts
  - Docker multi-stage build with node:22-alpine
  - postgres.js driver singleton (max:3, prepare:false for shared PostgreSQL)
affects: [01-02, 02-extraction, 03-review, 04-export]

# Tech tracking
tech-stack:
  added: [next.js 16.2.3, react 19.2.4, drizzle-orm 0.45.2, drizzle-kit, postgres.js 3.4.9, better-auth 1.6.1, sonner 2.0.7, zod 4.3.6, date-fns 4.1.0, tailwindcss 4, eslint 9]
  patterns: [drizzle-singleton, better-auth-drizzle-adapter, proxy-route-protection, instrumentation-seeding, standalone-docker-build]

key-files:
  created:
    - src/lib/db/schema.ts
    - src/lib/db/index.ts
    - src/lib/auth.ts
    - src/lib/auth-client.ts
    - src/app/api/auth/[...all]/route.ts
    - src/instrumentation.ts
    - proxy.ts
    - drizzle.config.ts
    - Dockerfile
    - .env.example
  modified: []

key-decisions:
  - "Direct Drizzle insert for admin seeding instead of auth.api.signUpEmail (blocked by disableSignUp:true)"
  - "Removed dotenv/config from drizzle.config.ts -- .env.local handled by Next.js, DATABASE_URL passed explicitly to drizzle-kit"
  - "Used src/ directory layout for Next.js project (tsconfig paths @/* -> ./src/*)"

patterns-established:
  - "DB singleton: src/lib/db/index.ts exports db with postgres.js (max:3, prepare:false)"
  - "Schema-first: all tables in src/lib/db/schema.ts, pushed via drizzle-kit push"
  - "Auth config: src/lib/auth.ts for server, src/lib/auth-client.ts for client"
  - "Route protection: proxy.ts at project root, matcher excludes login/api/auth/static"
  - "Admin seeding: instrumentation.ts with hashPassword from better-auth/crypto"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUDT-01, AUDT-02, AUDT-03]

# Metrics
duration: 8min
completed: 2026-04-09
---

# Phase 1 Plan 1: Project Scaffold + Auth + Schema Summary

**Next.js 16 scaffold with Drizzle ORM full schema (7 tables, 3 enums), Better Auth email/password with admin plugin, proxy.ts route protection, and admin user seeding via instrumentation.ts**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-09T00:08:41Z
- **Completed:** 2026-04-09T00:17:00Z
- **Tasks:** 3
- **Files created:** 27

## Accomplishments
- Next.js 16.2.3 project with TypeScript, Tailwind CSS v4, Turbopack, and all required dependencies
- Full Drizzle ORM schema: Better Auth tables (user, session, account, verification) + custom tables (vehicles, documents, audit_log) + 3 enums
- Better Auth configured with email/password (signUp disabled), 30-day sessions, admin plugin, and nextCookies
- Admin user seeded on first startup using direct Drizzle insert with Better Auth password hashing
- proxy.ts route protection at project root with proper matcher for login/auth/static exclusions
- Docker multi-stage build ready for Coolify deployment

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js, install deps, create Drizzle schema** - `3ba0123` (feat)
2. **Task 2: Better Auth server/client, API route, proxy.ts, seeding** - `9fca1a3` (feat)
3. **Task 3: Push schema to PostgreSQL + fix admin seeding** - `be45590` (fix)

## Files Created/Modified
- `package.json` - Next.js 16 project with all dependencies (drizzle-orm, better-auth, sonner, zod, date-fns)
- `tsconfig.json` - TypeScript config with src/ paths
- `next.config.ts` - output: standalone for Docker
- `drizzle.config.ts` - Drizzle Kit config pointing to src/lib/db/schema.ts
- `src/lib/db/schema.ts` - All 7 table definitions + 3 enums (Better Auth + vehicles + documents + audit_log)
- `src/lib/db/index.ts` - Drizzle db singleton with postgres.js (max:3, prepare:false)
- `src/lib/auth.ts` - Better Auth server config (email/password, admin plugin, 30-day sessions)
- `src/lib/auth-client.ts` - Better Auth client (signIn, signOut, useSession exports)
- `src/app/api/auth/[...all]/route.ts` - Catch-all auth handler via toNextJsHandler
- `proxy.ts` - Route protection: redirect unauthenticated to /login
- `src/instrumentation.ts` - Admin user seeding on first startup
- `Dockerfile` - Multi-stage build with node:22-alpine
- `.dockerignore` - Excludes node_modules, .next, .git, .planning, reference, *.xlsx
- `.env.example` - All required environment variables documented
- `.gitignore` - Next.js defaults + .env protection (allows .env.example)
- `eslint.config.mjs` - ESLint 9 config from Next.js scaffold
- `postcss.config.mjs` - PostCSS with Tailwind CSS
- `src/app/layout.tsx` - Root layout (scaffold default)
- `src/app/page.tsx` - Home page (scaffold default)
- `src/app/globals.css` - Tailwind CSS globals

## Decisions Made
- **Direct Drizzle insert for admin seeding:** `auth.api.signUpEmail()` is blocked when `disableSignUp: true`. Instead, insert user and account records directly via Drizzle using `hashPassword` from `better-auth/crypto`. This correctly creates the credential account with scrypt-hashed password.
- **Removed dotenv/config from drizzle.config.ts:** Next.js uses `.env.local` natively. For drizzle-kit push, DATABASE_URL is passed via environment. No extra `dotenv` dependency needed.
- **Used src/ directory layout:** create-next-app defaults to root `app/` but the plan specifies `src/app/`. Restructured to `src/` with tsconfig paths updated accordingly.
- **Used local Docker PostgreSQL for dev:** Existing postgres:16-alpine container on port 5432 used for development database. Created `garage_register` database.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed admin seeding blocked by disableSignUp**
- **Found during:** Task 3 (schema push and verification)
- **Issue:** `auth.api.signUpEmail()` returns "Email and password sign up is not enabled" error because `disableSignUp: true` blocks ALL signUp calls, including server-side
- **Fix:** Replaced with direct Drizzle insert of user + account records using `hashPassword` from `better-auth/crypto` for proper scrypt password hashing
- **Files modified:** `src/instrumentation.ts`
- **Verification:** Dev server starts, admin user seeded successfully, verified in database with role "admin" and hashed password
- **Committed in:** `be45590` (Task 3 commit)

**2. [Rule 3 - Blocking] Removed missing dotenv/config import**
- **Found during:** Task 3 (drizzle-kit push)
- **Issue:** `drizzle.config.ts` imports `dotenv/config` but `dotenv` is not installed. drizzle-kit push fails with "Cannot find module"
- **Fix:** Removed the import -- DATABASE_URL is passed via environment variable directly, consistent with Next.js .env.local convention
- **Files modified:** `drizzle.config.ts`
- **Verification:** `drizzle-kit push` completes successfully, all tables created
- **Committed in:** `be45590` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for correct operation. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required

For production deployment, the following environment variables must be configured in Coolify:
- `DATABASE_URL` - PostgreSQL connection string from Coolify dashboard
- `BETTER_AUTH_SECRET` - Generate with `openssl rand -base64 32`
- `BETTER_AUTH_URL` - `https://garage.adauto.ca`
- `ADMIN_EMAIL` - Andrey's email address
- `ADMIN_PASSWORD` - Strong password for initial admin account
- `ANTHROPIC_API_KEY` - Claude API key (used in Phase 2)

## Next Phase Readiness
- Database schema complete with all tables for Phases 1-4
- Better Auth accepting login requests at `/api/auth/*`
- Route protection via proxy.ts active
- Admin user seeds automatically on first deploy
- Ready for Plan 02: Login UI, app shell layout, error boundaries, and theme setup

---
*Phase: 01-foundation-auth*
*Completed: 2026-04-09*
