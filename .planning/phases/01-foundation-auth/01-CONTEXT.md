# Phase 1: Foundation + Auth - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a running Next.js application on Coolify/Hetzner with PostgreSQL database, Drizzle ORM schema (vehicles, documents, audit_log tables), Better Auth authentication (email/password), light/dark theme support, global error boundary, and the app shell layout. No business logic — this is infrastructure for Phases 2-4.

</domain>

<decisions>
## Implementation Decisions

### Login & Authentication
- **D-01:** Clean centered login form with AD Auto Export branding (logo, company name). No registration page — admin creates accounts. Email/password only for v1.
- **D-02:** Session duration: 30 days persistent via httpOnly secure cookie. User stays logged in across browser restarts. Explicit logout available from every page.
- **D-03:** Better Auth with Drizzle adapter. Auth tables auto-generated. Single admin user seeded on first deploy via environment variable (ADMIN_EMAIL, ADMIN_PASSWORD).

### Error Handling
- **D-04:** Toast notifications (sonner) for user-facing messages — success (green), warning (yellow), info (blue). No error toasts for backend failures.
- **D-05:** Backend errors caught by global error boundary. User sees friendly "Something went wrong" page with retry button. System logs error and retries silently where possible. No stack traces, no technical error codes shown to user.
- **D-06:** API routes return consistent JSON shape: `{ success: boolean, data?: T, error?: string }`. Frontend never displays raw error messages.

### App Shell Layout
- **D-07:** Sidebar navigation (collapsible on mobile). Menu items: Dashboard, New Vehicle (upload), Register (table), Export. Sidebar shows AD Auto Export logo at top.
- **D-08:** Light/dark theme via `prefers-color-scheme` auto-detection. No manual toggle in v1 — follows system preference. CSS variables for theming via Tailwind v4 `@theme`.

### Database Schema
- **D-09:** Drizzle ORM with PostgreSQL (shared Coolify instance). Tables: `users` (Better Auth), `sessions` (Better Auth), `vehicles`, `documents`, `audit_log`. Vehicles and documents tables created empty — populated in Phase 2.
- **D-10:** Audit log table: `id`, `entity_type`, `entity_id`, `action` (created/updated/deleted/exported), `field_name`, `old_value`, `new_value`, `user_id`, `timestamp`. Append-only, no updates/deletes on this table.

### Deployment
- **D-11:** Docker container deployed via Coolify. Environment variables for: DATABASE_URL, BETTER_AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, ANTHROPIC_API_KEY (used in Phase 2 but configured now).
- **D-12:** Domain: garage.adauto.ca (Cloudflare DNS, HTTPS via Coolify).

### Claude's Discretion
- Exact sidebar width and breakpoint for mobile collapse
- Loading skeleton vs spinner for initial page load
- Specific shadcn/ui component choices for layout primitives
- Database migration strategy (push for dev, generate+migrate for prod)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project vision, constraints, core value
- `.planning/REQUIREMENTS.md` �� Full v1 requirements with REQ-IDs
- `.planning/research/STACK.md` — Complete technology stack with versions and rationale
- `.planning/research/ARCHITECTURE.md` — System architecture, component boundaries, data flow

### Existing Assets
- `AD Auto CANADA Garage Register 2025-2026.xlsx` — Ministry of Transportation template (reference for schema design)
- `AD Auto - Garage Register POC Report.md` — POC findings, document types, accuracy data

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- Invoice Ledger project (sibling on same server) uses Next.js 16, React 19, Tailwind v4, ExcelJS — same ecosystem
- Invoice Ledger uses env-based password auth with httpOnly cookie — similar pattern but this project upgrades to Better Auth

### Integration Points
- Shared PostgreSQL on Coolify — connection string via DATABASE_URL env var
- Coolify deployment — Docker container with health check
- Cloudflare DNS for domain routing

</code_context>

<specifics>
## Specific Ideas

- Login page should feel professional — AD Auto Export is a real business, not a side project
- Sidebar nav mirrors the workflow: Dashboard → Upload → Register → Export (left to right in the pipeline)
- Andrey is the only user — but the system should feel like a "real" app, not a toy

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-auth*
*Context gathered: 2026-04-08*
