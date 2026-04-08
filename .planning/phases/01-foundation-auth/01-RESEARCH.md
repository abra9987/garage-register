# Phase 1: Foundation + Auth - Research

**Researched:** 2026-04-08
**Domain:** Next.js 16 project setup, Better Auth authentication, Drizzle ORM schema, theming, error handling
**Confidence:** HIGH

## Summary

Phase 1 is a greenfield Next.js 16 application setup with Better Auth email/password authentication, Drizzle ORM schema for PostgreSQL, system-preference dark mode, global error boundaries, and the sidebar app shell. The stack is well-defined and all libraries are current and actively maintained. Better Auth v1.6.1 with the Drizzle adapter handles auth tables, sessions, and cookie management. The audit_log table is created empty and append-only. No business logic ships in this phase.

The primary complexity is the interplay between Better Auth's auto-generated schema and the custom Drizzle schema (vehicles, documents, audit_log). The CLI generates auth tables (user, session, account, verification) and the project defines additional tables in the same schema file. The admin user is seeded on first deploy via `auth.api.signUpEmail()` with a conditional check.

**Primary recommendation:** Use Better Auth with the admin plugin and Drizzle adapter. Generate auth schema with `npx auth@latest generate`, then extend with custom tables. Use `proxy.ts` (Next.js 16 convention) for optimistic auth checks and `auth.api.getSession()` in server components for secure validation. For dark mode, modify shadcn/ui's CSS to use `@media (prefers-color-scheme: dark)` instead of `.dark` class selector -- no `next-themes` library needed since there is no manual toggle.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Clean centered login form with AD Auto Export branding (logo, company name). No registration page -- admin creates accounts. Email/password only for v1.
- **D-02:** Session duration: 30 days persistent via httpOnly secure cookie. User stays logged in across browser restarts. Explicit logout available from every page.
- **D-03:** Better Auth with Drizzle adapter. Auth tables auto-generated. Single admin user seeded on first deploy via environment variable (ADMIN_EMAIL, ADMIN_PASSWORD).
- **D-04:** Toast notifications (sonner) for user-facing messages -- success (green), warning (yellow), info (blue). No error toasts for backend failures.
- **D-05:** Backend errors caught by global error boundary. User sees friendly "Something went wrong" page with retry button. System logs error and retries silently where possible. No stack traces, no technical error codes shown to user.
- **D-06:** API routes return consistent JSON shape: `{ success: boolean, data?: T, error?: string }`. Frontend never displays raw error messages.
- **D-07:** Sidebar navigation (collapsible on mobile). Menu items: Dashboard, New Vehicle (upload), Register (table), Export. Sidebar shows AD Auto Export logo at top.
- **D-08:** Light/dark theme via `prefers-color-scheme` auto-detection. No manual toggle in v1 -- follows system preference. CSS variables for theming via Tailwind v4 `@theme`.
- **D-09:** Drizzle ORM with PostgreSQL (shared Coolify instance). Tables: `users` (Better Auth), `sessions` (Better Auth), `vehicles`, `documents`, `audit_log`. Vehicles and documents tables created empty -- populated in Phase 2.
- **D-10:** Audit log table: `id`, `entity_type`, `entity_id`, `action` (created/updated/deleted/exported), `field_name`, `old_value`, `new_value`, `user_id`, `timestamp`. Append-only, no updates/deletes on this table.
- **D-11:** Docker container deployed via Coolify. Environment variables for: DATABASE_URL, BETTER_AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, ANTHROPIC_API_KEY (used in Phase 2 but configured now).
- **D-12:** Domain: garage.adauto.ca (Cloudflare DNS, HTTPS via Coolify).

### Claude's Discretion
- Exact sidebar width and breakpoint for mobile collapse
- Loading skeleton vs spinner for initial page load
- Specific shadcn/ui component choices for layout primitives
- Database migration strategy (push for dev, generate+migrate for prod)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can log in with email and password | Better Auth emailAndPassword with `disableSignUp: true`. Login via `authClient.signIn.email()`. [VERIFIED: better-auth.com/docs] |
| AUTH-02 | User session persists across browser refresh (httpOnly cookie) | Better Auth session config: `expiresIn: 60*60*24*30` (30 days), `updateAge: 60*60*24`. httpOnly secure cookie by default. [VERIFIED: better-auth.com/docs] |
| AUTH-03 | User can log out from any page | Better Auth `authClient.signOut()` client-side. Logout button in sidebar layout (always visible). [VERIFIED: better-auth.com/docs] |
| AUTH-04 | System supports admin and operator roles (admin-only for v1) | Better Auth admin plugin adds `role` field to user table. Default roles: admin, user. [VERIFIED: better-auth.com/docs/plugins/admin] |
| AUDT-01 | System logs every state change: upload, extraction, field edits (old->new value), approval, export | Drizzle audit_log table with entity_type, action, field_name, old_value, new_value columns. Utility function `logAudit()` for consistent logging. Schema created in Phase 1, used from Phase 2 onward. [VERIFIED: Drizzle ORM column types docs] |
| AUDT-02 | Each log entry has timestamp and user identifier | audit_log table includes `user_id` (text, references auth user) and `timestamp` (timestamptz, defaultNow). [VERIFIED: Drizzle ORM column types docs] |
| AUDT-03 | Audit log is immutable (append-only) | Enforced at application layer: audit service only exposes insert, no update/delete. Database-level: can add RLS policy or simply never call update/delete on audit_log. [ASSUMED] |
| UIUX-02 | Application supports light and dark theme via prefers-color-scheme | Tailwind v4 `dark:` variant uses prefers-color-scheme by default. Modify shadcn/ui CSS: replace `.dark { }` with `@media (prefers-color-scheme: dark) { :root { } }`. No next-themes needed. [VERIFIED: tailwindcss.com/docs/dark-mode] |
| UIUX-04 | No backend errors shown to user -- system retries silently, user always sees success or clear guidance | Next.js error.tsx + global-error.tsx for error boundaries. API response shape `{ success, data?, error? }`. Sonner toasts for user-facing feedback (never raw errors). [VERIFIED: nextjs.org/docs error handling] |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **CASE_STUDY.md required:** Must maintain a `CASE_STUDY.md` file in project root (already exists)
- **Deployment:** Coolify on Hetzner CX43, Docker container, shared PostgreSQL
- **Domain context:** Garage Register is a regulatory document for Ontario Ministry of Transportation
- **User:** Andrey is non-technical -- UI must be self-explanatory
- **GSD Workflow:** All code changes must go through GSD commands

## Standard Stack

### Core (Phase 1 specific)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.3 | Fullstack framework | Matches AD Auto ecosystem (Invoice Ledger). App Router, Turbopack default. [VERIFIED: npm registry] |
| React | 19.2.5 | UI library | Ships with Next.js 16. React Compiler available. [VERIFIED: npm registry] |
| TypeScript | ^5.x | Type safety | Ships with Next.js. Non-negotiable for data accuracy. [VERIFIED: npm registry] |
| better-auth | 1.6.1 | Authentication | Self-hosted email/password auth. First-class Drizzle adapter. Admin plugin for roles. [VERIFIED: npm registry] |
| drizzle-orm | 0.45.2 | Database ORM | Code-first TypeScript schemas. 7.4 KB gzipped. Better Auth has dedicated adapter. [VERIFIED: npm registry] |
| drizzle-kit | 0.31.10 | Migration tooling | Schema push (dev) and generate+migrate (prod). [VERIFIED: npm registry] |
| postgres | 3.4.9 | PostgreSQL driver | postgres.js -- lighter than pg, no native binaries. Drizzle default for PostgreSQL. [VERIFIED: npm registry] |
| tailwindcss | 4.2.2 | Utility CSS | v4 CSS-first config with @theme. No JS config file. [VERIFIED: npm registry] |
| sonner | 2.0.7 | Toast notifications | shadcn/ui has built-in Sonner integration. Fire-and-forget API. [VERIFIED: npm registry] |
| zod | 4.3.6 | Schema validation | TypeScript-first. Shared schemas between API and client. [VERIFIED: npm registry] |
| date-fns | 4.1.0 | Date formatting | Tree-shakeable. For audit timestamps display. [VERIFIED: npm registry] |

### Supporting (installed by shadcn/ui init)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | CLI v4 | Component library | Copy-paste components. Built on Radix UI. [VERIFIED: ui.shadcn.com] |
| Radix UI | (via shadcn) | Accessible primitives | Keyboard nav, screen readers, focus management |
| Lucide React | (via shadcn) | Icons | Sidebar nav icons, action icons |
| clsx + tailwind-merge | (via shadcn) | Class merging | Conditional Tailwind classes |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| better-auth | NextAuth/Auth.js | More boilerplate for email/password. No built-in schema management. |
| better-auth | Lucia Auth | Deprecated March 2025. Not suitable for new projects. |
| drizzle-orm | Prisma | 1.6 MB vs 7.4 KB. Separate schema language. Generate step required. |
| postgres.js | pg (node-postgres) | Both work. postgres.js is lighter, no native binaries. Drizzle docs default to it. |
| Pure CSS dark mode | next-themes | next-themes needed only for manual toggle. System-preference-only needs no JS library. |

**Installation:**
```bash
# Create Next.js 16 project
npx create-next-app@latest garage-register --typescript --tailwind --eslint --app --turbopack

# Core dependencies
npm install drizzle-orm postgres better-auth sonner zod date-fns

# Dev dependencies
npm install -D drizzle-kit @types/node

# Initialize shadcn/ui (installs Radix, clsx, tailwind-merge, lucide-react)
npx shadcn@latest init

# Add shadcn components needed for Phase 1
npx shadcn@latest add button card input label sonner sheet sidebar separator avatar dropdown-menu
```

## Architecture Patterns

### Recommended Project Structure (Phase 1)

```
src/
├── app/
│   ├── layout.tsx                 # Root layout: sidebar + Toaster + error boundary
│   ├── page.tsx                   # Dashboard placeholder (redirect or simple welcome)
│   ├── global-error.tsx           # Catches root layout errors (must define own <html>/<body>)
│   ├── error.tsx                  # Catches page-level errors (friendly UI + retry)
│   ├── login/
│   │   └── page.tsx               # Centered login form with AD Auto branding
│   ├── dashboard/
│   │   └── page.tsx               # Placeholder for Phase 4
│   ├── upload/
│   │   └── page.tsx               # Placeholder for Phase 2
│   ├── register/
│   │   └── page.tsx               # Placeholder for Phase 4
│   ├── export/
│   │   └── page.tsx               # Placeholder for Phase 4
│   └── api/
│       └── auth/
│           └── [...all]/
│               └── route.ts       # Better Auth catch-all handler
├── components/
│   ├── ui/                        # shadcn/ui components (button, input, card, etc.)
│   ├── app-sidebar.tsx            # Sidebar navigation component
│   ├── theme-provider.tsx         # NOT NEEDED -- using pure CSS prefers-color-scheme
│   └── auth-guard.tsx             # Client component: checks session, redirects to login
├── lib/
│   ├── auth.ts                    # Better Auth server config (with admin plugin)
│   ├── auth-client.ts             # Better Auth client (createAuthClient)
│   ├── db/
│   │   ├── index.ts               # Drizzle db singleton with postgres.js
│   │   └── schema.ts              # All Drizzle table definitions (auth + custom)
│   ├── audit.ts                   # logAudit() utility function
│   └── api-response.ts            # Typed API response helpers: success(), error()
├── types/
│   └── api.ts                     # ApiResponse<T> type definition
└── drizzle.config.ts              # Drizzle Kit configuration
proxy.ts                           # Next.js 16 route protection (was middleware.ts)
```

### Pattern 1: Better Auth with Drizzle Adapter + Admin Plugin

**What:** Configure Better Auth with the Drizzle adapter for PostgreSQL, admin plugin for role management, and email/password authentication with self-registration disabled.

**When to use:** Initial auth setup and all auth operations.

**Example:**

```typescript
// lib/auth.ts - Server-side auth configuration
// Source: https://better-auth.com/docs/installation, /docs/plugins/admin
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // D-01: No self-registration
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,  // D-02: 30 days
    updateAge: 60 * 60 * 24,        // Refresh daily
  },
  plugins: [
    admin(),         // AUTH-04: role field on user table
    nextCookies(),   // Proper cookie handling in server actions
  ],
});
```

```typescript
// lib/auth-client.ts - Client-side auth
// Source: https://better-auth.com/docs/integrations/next
import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [adminClient()],
});

// Convenience exports
export const { signIn, signOut, useSession } = authClient;
```

```typescript
// app/api/auth/[...all]/route.ts
// Source: https://better-auth.com/docs/integrations/next
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
```

### Pattern 2: Admin User Seeding on First Deploy

**What:** Create the admin user programmatically on application startup if no users exist. Uses `auth.api.signUpEmail()` which works without an authenticated session (unlike `admin.createUser` which requires admin auth).

**When to use:** First deploy and every application restart (idempotent -- checks if users exist first).

**Example:**

```typescript
// lib/seed.ts - Admin user seeding
// Source: https://github.com/better-auth/better-auth/discussions/3385
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { count } from "drizzle-orm";

export async function seedAdminUser() {
  const [result] = await db.select({ count: count() }).from(user);

  if (result.count === 0) {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set for first deploy");
      return;
    }

    await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: "Admin",
      },
    });

    // Set role to admin (admin plugin adds role field)
    // After signup, update the role directly via Drizzle
    await db.update(user)
      .set({ role: "admin" })
      .where(eq(user.email, email));

    console.log(`Admin user created: ${email}`);
  }
}
```

**Trigger:** Call `seedAdminUser()` from a custom instrumentation file or from the API route handler initialization. [ASSUMED]

### Pattern 3: proxy.ts Route Protection (Next.js 16)

**What:** Next.js 16 renamed `middleware.ts` to `proxy.ts`. The function runs on Node.js runtime (not Edge) and intercepts every matched request. Use for optimistic auth redirects.

**When to use:** Redirect unauthenticated users to `/login` before they hit protected pages.

**Critical note:** `proxy.ts` runs on the Node.js runtime in Next.js 16. This means you can do full session validation with database checks, not just cookie existence checks. [VERIFIED: nextjs.org/blog/next-16]

**Example:**

```typescript
// proxy.ts (project root, NOT src/)
// Source: https://nextjs.org/blog/next-16, https://better-auth.com/docs/integrations/next
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect all routes except login, api/auth, static files
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

### Pattern 4: System-Preference Dark Mode (No next-themes)

**What:** Use pure CSS `@media (prefers-color-scheme: dark)` to switch shadcn/ui CSS variables. No JavaScript library needed because there is no manual toggle (D-08).

**When to use:** This specific project. If a manual toggle is added later, install `next-themes`.

**How:** Modify shadcn/ui's generated `globals.css`:

```css
/* app/globals.css */
@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* ... all shadcn/ui theme tokens ... */
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.5);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  /* ... light mode values ... */
}

/* D-08: System preference only, no manual toggle */
@media (prefers-color-scheme: dark) {
  :root {
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --primary: oklch(0.922 0 0);
    --primary-foreground: oklch(0.205 0 0);
    /* ... dark mode values ... */
  }
}
```

**Key change from shadcn/ui default:** Replace `.dark { ... }` with `@media (prefers-color-scheme: dark) { :root { ... } }`. This makes the `dark:` Tailwind variant work automatically via the media query (Tailwind v4 default behavior). [VERIFIED: tailwindcss.com/docs/dark-mode]

### Pattern 5: Consistent API Response Shape

**What:** All API routes return `{ success: boolean, data?: T, error?: string }`. Never expose raw error messages to the frontend.

**Example:**

```typescript
// lib/api-response.ts
import { NextResponse } from "next/server";

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 500) {
  return NextResponse.json({ success: false, error: message }, { status });
}
```

### Pattern 6: Next.js 16 Error Boundaries

**What:** Two-layer error handling: `error.tsx` for page-level errors (renders inside the layout with sidebar), `global-error.tsx` for catastrophic root layout failures.

**Example:**

```typescript
// app/error.tsx - Page-level error boundary
// Source: https://nextjs.org/docs/app/getting-started/error-handling
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // D-05: Friendly message, no stack traces
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground">
        We encountered an unexpected issue. Please try again.
      </p>
      <button onClick={reset} className="...">
        Try again
      </button>
    </div>
  );
}
```

```typescript
// app/global-error.tsx - Root layout error boundary
// Must define its own <html> and <body>
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <button onClick={reset}>Try again</button>
        </div>
      </body>
    </html>
  );
}
```

### Anti-Patterns to Avoid

- **Using next-themes when there is no manual toggle:** Adds unnecessary JS, flash-of-unstyled-content risk, and hydration complexity. Pure CSS media query is simpler and works without JavaScript.
- **Using `.dark` class selector from shadcn/ui default:** Requires JavaScript to toggle class. The `@media (prefers-color-scheme: dark)` approach works at the CSS level, before any JS loads.
- **Seeding admin via `admin.createUser()`:** Requires an authenticated admin session, which does not exist on first deploy. Use `auth.api.signUpEmail()` instead, then update the role directly.
- **Relying on proxy.ts alone for auth security:** Proxy is an optimistic check. Always validate the session in server components and API routes using `auth.api.getSession()`. The proxy can be bypassed by directly hitting API routes.
- **Using `middleware.ts` in Next.js 16:** Deprecated. Renamed to `proxy.ts` with the export function renamed to `proxy`. Still works but will be removed in a future version.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authentication | Custom email/password + session management | Better Auth v1.6.1 | Password hashing (scrypt), session management, cookie security, CSRF protection all handled |
| Auth schema | Manual user/session table definitions | `npx auth@latest generate` | Generates Drizzle schema with all required fields, relations, and indexes |
| Role management | Custom role field + middleware checks | Better Auth admin plugin | Adds role field, ban management, impersonation. Schema changes auto-generated |
| Database migrations | Raw SQL files | drizzle-kit push (dev) / generate+migrate (prod) | Type-safe, diffable, reversible migrations from TypeScript schema |
| Toast notifications | Custom notification system | Sonner via shadcn/ui | Accessible, animated, stacking, auto-dismiss. One line to trigger |
| Dark mode theming | Custom CSS variable toggling | Tailwind v4 `dark:` variant + shadcn/ui CSS vars | Browser handles detection, CSS handles switching, zero JS needed |
| Error boundaries | Custom try/catch wrappers | Next.js error.tsx + global-error.tsx | React error boundary integration, automatic reset, per-route granularity |
| API response formatting | Ad-hoc JSON responses | Typed apiSuccess/apiError helpers | Consistent shape, type safety, centralized error formatting |

**Key insight:** Better Auth + admin plugin handles 90% of Phase 1 auth complexity. The remaining work is UI (login form, sidebar) and schema (audit_log, vehicles, documents tables).

## Common Pitfalls

### Pitfall 1: Better Auth Schema Generation Order

**What goes wrong:** Running `npx auth@latest generate` before configuring the admin plugin results in a schema missing the `role`, `banned`, `banReason`, `banExpires` fields on the user table, and `impersonatedBy` on the session table.
**Why it happens:** The CLI generates schema based on whatever plugins are configured in `auth.ts` at generation time.
**How to avoid:** Configure the full auth setup (emailAndPassword + admin plugin) in `lib/auth.ts` BEFORE running `npx auth@latest generate`. Then merge the generated auth schema with custom tables.
**Warning signs:** Missing `role` column on user table when trying to assign admin role.

### Pitfall 2: postgres.js Prepared Statements in Docker/Coolify

**What goes wrong:** Connection errors or unexpected behavior when using postgres.js with connection pooling proxies (like PgBouncer) that Coolify may use.
**Why it happens:** postgres.js uses prepared statements by default, which don't work with transaction-mode connection poolers.
**How to avoid:** If Coolify uses PgBouncer, configure postgres.js with `prepare: false`: `postgres(url, { max: 5, prepare: false })`. Test the connection during initial setup.
**Warning signs:** "prepared statement already exists" errors, connection drops.

### Pitfall 3: Shared PostgreSQL Connection Exhaustion

**What goes wrong:** Other apps on the Hetzner CX43 (Invoice Ledger, CRM, DealManager) lose database connectivity.
**Why it happens:** postgres.js defaults to 10 connections in the pool. With multiple apps sharing one PostgreSQL instance, total connections can exceed `max_connections` (usually 100).
**How to avoid:** Set `max: 3` for this app (single-user, low traffic). Verify other apps' connection counts.
**Warning signs:** "remaining connection slots are reserved for non-replication superuser connections" error.

### Pitfall 4: Admin User Seed Race Condition

**What goes wrong:** On Coolify deploy with multiple container restarts, the seed function runs concurrently and creates duplicate admin users.
**Why it happens:** Two containers checking "does user exist?" simultaneously, both finding zero users, both creating.
**How to avoid:** Use a unique constraint on email (Better Auth does this by default). Wrap seed in a try/catch that ignores duplicate key errors. Only one container should run in production.
**Warning signs:** "duplicate key value violates unique constraint" error in logs (harmless if caught).

### Pitfall 5: shadcn/ui Dark Mode CSS Conflict

**What goes wrong:** Dark mode doesn't work or only partially works because the generated CSS uses `.dark` selector but the application uses `@media (prefers-color-scheme: dark)`.
**Why it happens:** shadcn/ui init generates CSS with `.dark { ... }` by default. If you don't modify this, Tailwind's default `dark:` variant (which uses `prefers-color-scheme`) won't match the `.dark` class selector.
**How to avoid:** After `npx shadcn@latest init`, immediately replace `.dark { ... }` with `@media (prefers-color-scheme: dark) { :root { ... } }` in `globals.css`. Do NOT add `@custom-variant dark (&:where(.dark, .dark *))` to the CSS.
**Warning signs:** Dark mode works in OS settings but shadcn component colors don't change.

### Pitfall 6: Next.js 16 proxy.ts vs middleware.ts

**What goes wrong:** Creating `middleware.ts` instead of `proxy.ts`, which still works but is deprecated and generates warnings.
**Why it happens:** Most tutorials and documentation (including Better Auth's) still reference `middleware.ts`. Next.js 16 renamed it to `proxy.ts`.
**How to avoid:** Always use `proxy.ts` in the project root. Export `default function proxy()` (not `export function middleware()`).
**Warning signs:** Deprecation warnings in dev server logs.

## Code Examples

### Drizzle Database Singleton with postgres.js

```typescript
// lib/db/index.ts
// Source: https://orm.drizzle.team/docs/get-started-postgresql
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Limit connections for shared PostgreSQL instance
const client = postgres(connectionString, { max: 3 });

export const db = drizzle(client, { schema });
```

### Drizzle Configuration

```typescript
// drizzle.config.ts
// Source: https://orm.drizzle.team/docs/get-started-postgresql
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Custom Schema Tables (alongside Better Auth generated tables)

```typescript
// lib/db/schema.ts (custom tables -- auth tables generated by CLI)
// Source: Drizzle ORM column types https://orm.drizzle.team/docs/column-types/pg
import {
  pgTable, pgEnum, uuid, text, varchar, integer,
  timestamp, numeric, date, jsonb, boolean,
} from "drizzle-orm/pg-core";

// ---- Better Auth tables (generated by `npx auth@latest generate`) ----
// user, session, account, verification tables go here
// The CLI generates these with all required fields + admin plugin fields

// ---- Custom enums ----
export const vehicleStatusEnum = pgEnum("vehicle_status", [
  "extracting", "pending_review", "approved", "exported",
]);

export const documentTypeEnum = pgEnum("document_type", ["ap", "ar"]);

export const auditActionEnum = pgEnum("audit_action", [
  "created", "updated", "deleted", "exported",
]);

// ---- Vehicles table (empty in Phase 1, populated in Phase 2) ----
export const vehicles = pgTable("vehicles", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobNumber: varchar("job_number", { length: 20 }),
  status: vehicleStatusEnum("status").default("extracting").notNull(),
  vin: varchar("vin", { length: 17 }),
  year: integer("year"),
  make: varchar("make", { length: 100 }),
  model: varchar("model", { length: 100 }),
  color: varchar("color", { length: 50 }),
  odometer: integer("odometer"),
  sellerName: varchar("seller_name", { length: 255 }),
  sellerAddress: text("seller_address"),
  buyerName: varchar("buyer_name", { length: 255 }),
  buyerAddress: text("buyer_address"),
  purchaseDate: date("purchase_date"),
  saleDate: date("sale_date"),
  purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }),
  salePrice: numeric("sale_price", { precision: 10, scale: 2 }),
  stockNumber: varchar("stock_number", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  exportedAt: timestamp("exported_at", { withTimezone: true }),
});

// ---- Documents table (empty in Phase 1) ----
export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id).notNull(),
  type: documentTypeEnum("type").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  extractionRaw: jsonb("extraction_raw"),
});

// ---- Audit Log (D-10: append-only) ----
export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  action: auditActionEnum("action").notNull(),
  fieldName: varchar("field_name", { length: 100 }),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  userId: text("user_id").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
});
```

### Audit Log Utility

```typescript
// lib/audit.ts
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

type AuditAction = "created" | "updated" | "deleted" | "exported";

interface AuditEntry {
  entityType: string;
  entityId: string;
  action: AuditAction;
  userId: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
}

export async function logAudit(entry: AuditEntry) {
  await db.insert(auditLog).values({
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    userId: entry.userId,
    fieldName: entry.fieldName ?? null,
    oldValue: entry.oldValue ?? null,
    newValue: entry.newValue ?? null,
  });
}
```

### Docker Multi-Stage Build

```dockerfile
# Dockerfile for Coolify deployment
# Source: STACK.md Docker Configuration
FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

**Note:** Requires `output: "standalone"` in `next.config.ts` for the standalone build to work.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| middleware.ts | proxy.ts | Next.js 16 (Oct 2025) | Rename file and export function. Node.js runtime (not Edge). |
| tailwind.config.js darkMode | @custom-variant dark / default media query | Tailwind v4 (2025) | No JS config file. Dark mode via prefers-color-scheme by default. |
| next-themes for all dark mode | Pure CSS for system-preference-only | Tailwind v4 + shadcn/ui | No JS library needed when there's no manual toggle. |
| HSL colors in shadcn/ui | OKLCH colors | shadcn/ui v4 (2025) | More perceptually uniform color scales. |
| Prisma as default ORM | Drizzle gaining momentum | 2024-2025 | 7.4 KB vs 1.6 MB. No generate step. TypeScript-native schemas. |
| Lucia Auth | Better Auth | March 2025 | Lucia deprecated. Better Auth fastest-growing alternative. |
| `experimental.ppr` | `cacheComponents` | Next.js 16 | PPR flag removed. Cache Components is the new model. |

**Deprecated/outdated:**
- `middleware.ts` in Next.js 16 -- use `proxy.ts` instead [VERIFIED: nextjs.org/blog/next-16]
- Lucia Auth -- deprecated March 2025, now educational material only [VERIFIED: STACK.md research]
- `darkMode` key in tailwind.config.js -- v4 uses CSS-first `@custom-variant` [VERIFIED: tailwindcss.com/docs]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | AUDT-03 immutability enforced at application layer is sufficient (no DB-level policy) | Phase Requirements | LOW -- single app, single user. DB-level RLS is overkill but could be added later. |
| A2 | Admin seed triggered from instrumentation file or API route init | Pattern 2 | MEDIUM -- need to verify the best hook point in Next.js 16 for one-time initialization. May need a custom /api/seed endpoint or `instrumentation.ts`. |
| A3 | proxy.ts location is project root (same as middleware.ts was) | Pattern 3 | LOW -- documented in Next.js 16 blog post. |
| A4 | Coolify does not use PgBouncer by default for shared PostgreSQL | Pitfall 2 | MEDIUM -- if it does, need `prepare: false` on postgres.js. |

## Open Questions

1. **Admin seed trigger mechanism**
   - What we know: `auth.api.signUpEmail()` works server-side without auth. Need to call it once on first deploy.
   - What's unclear: Best hook point in Next.js 16. Options: `instrumentation.ts` (runs once on server start), custom `/api/seed` endpoint, or inline in the auth catch-all route.
   - Recommendation: Use Next.js `instrumentation.ts` with a `register()` export. This runs once when the server starts. Check if users exist, seed if empty.

2. **Coolify PostgreSQL connection pooling**
   - What we know: Shared PostgreSQL instance on Hetzner CX43. postgres.js defaults to 10 connections.
   - What's unclear: Whether Coolify uses PgBouncer or direct connections.
   - Recommendation: Start with `max: 3` and `prepare: false` (safe for both direct and pooled connections). Test during initial deployment.

3. **Better Auth generated schema merge strategy**
   - What we know: CLI generates auth tables to a schema file. Custom tables need to be in the same or imported schema.
   - What's unclear: Whether to keep auth tables in a separate file and import, or merge into one schema.ts.
   - Recommendation: Generate to a temporary file, then merge into `lib/db/schema.ts`. Keep all tables in one file for simplicity.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | v25.6.0 | -- |
| npm | Package management | Yes | 11.8.0 | -- |
| Docker | Coolify deployment | Yes | 29.3.1 | -- |
| PostgreSQL | Database (shared on Coolify) | Remote only | -- | Local Docker PostgreSQL for dev |

**Missing dependencies with no fallback:**
- None -- all required tools are available locally.

**Missing dependencies with fallback:**
- PostgreSQL is remote (on Coolify/Hetzner). For local development, use a Docker PostgreSQL container or `drizzle-kit push` against the remote database.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Better Auth: scrypt password hashing, email/password auth, session tokens |
| V3 Session Management | Yes | Better Auth: httpOnly secure cookie, 30-day expiry, session refresh, server-side validation |
| V4 Access Control | Yes | Better Auth admin plugin: role-based access (admin role for v1). proxy.ts + server-side session checks |
| V5 Input Validation | Yes | Zod schema validation on all API inputs. Login form validation. |
| V6 Cryptography | No (handled by Better Auth) | Better Auth handles password hashing (scrypt) and session token generation |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Session hijacking | Spoofing | httpOnly + Secure + SameSite cookies (Better Auth defaults) |
| Brute force login | Elevation of Privilege | Better Auth built-in rate limiting (if configured). Cloudflare WAF. |
| CSRF on auth endpoints | Tampering | Better Auth CSRF protection built-in |
| Session fixation | Spoofing | Better Auth regenerates session on login |
| Error information leakage | Information Disclosure | D-05/D-06: Never expose stack traces or raw errors to user. Consistent `{ success, error }` shape. |
| SQL injection | Tampering | Drizzle ORM parameterized queries. Never use raw SQL. |

## Sources

### Primary (HIGH confidence)
- [npm registry] - better-auth 1.6.1, drizzle-orm 0.45.2, next 16.2.3, postgres 3.4.9, sonner 2.0.7, zod 4.3.6, tailwindcss 4.2.2, date-fns 4.1.0 (all verified via `npm view`)
- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16) - proxy.ts rename, Turbopack stable, Cache Components, React 19.2, breaking changes
- [Better Auth Installation](https://better-auth.com/docs/installation) - Server config, client config, API route handler
- [Better Auth Email/Password](https://better-auth.com/docs/authentication/email-password) - disableSignUp, signUpEmail server API, password hashing
- [Better Auth Session Management](https://better-auth.com/docs/concepts/session-management) - expiresIn, updateAge, cookie config, useSession
- [Better Auth Admin Plugin](https://better-auth.com/docs/plugins/admin) - Role management, createUser, schema changes
- [Better Auth Drizzle Adapter](https://better-auth.com/docs/adapters/drizzle) - drizzleAdapter config, provider: "pg", schema generation
- [Better Auth Next.js Integration](https://better-auth.com/docs/integrations/next) - Route handler, proxy protection, server-side session, nextCookies plugin
- [Drizzle ORM PostgreSQL Setup](https://orm.drizzle.team/docs/get-started-postgresql) - postgres.js driver, drizzle.config.ts, db singleton
- [Drizzle ORM Column Types](https://orm.drizzle.team/docs/column-types/pg) - uuid, text, varchar, timestamp, jsonb, pgEnum
- [Tailwind CSS v4 Dark Mode](https://tailwindcss.com/docs/dark-mode) - prefers-color-scheme default, @custom-variant, no config needed
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming) - OKLCH colors, CSS variables, @theme inline, .dark selector
- [Next.js Error Handling](https://nextjs.org/docs/app/getting-started/error-handling) - error.tsx, global-error.tsx patterns

### Secondary (MEDIUM confidence)
- [Better Auth GitHub Discussion #3385](https://github.com/better-auth/better-auth/discussions/3385) - Admin seeding approach: use auth.api.signUpEmail on server-side
- [Drizzle ORM GitHub Discussion #688](https://github.com/drizzle-team/drizzle-orm/discussions/688) - Singleton pattern for Next.js
- [WebSearch: Drizzle + postgres.js best practices] - Connection pool max:3 for shared instances

### Tertiary (LOW confidence)
- None -- all critical claims verified against official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified via npm registry. Libraries actively maintained.
- Architecture: HIGH - Patterns verified against official docs for Better Auth, Drizzle, Next.js 16.
- Pitfalls: HIGH - Connection pooling and schema generation order verified via official docs and community discussions.
- Dark mode approach: HIGH - Verified against Tailwind v4 docs and shadcn/ui theming docs.

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable stack, 30-day window)
