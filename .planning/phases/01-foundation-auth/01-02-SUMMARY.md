---
phase: 01-foundation-auth
plan: 02
subsystem: ui, auth
tags: [shadcn-ui, tailwind-v4, sonner, lucide-react, dark-mode, error-boundaries, audit-logging]

# Dependency graph
requires:
  - phase: 01-foundation-auth plan 01
    provides: Better Auth client (signIn/signOut/useSession), Drizzle schema (auditLog), db singleton
provides:
  - Login page with AD Auto Export branding at /login
  - Sidebar app shell with Dashboard, New Vehicle, Register, Export navigation
  - System-preference dark mode via CSS @media (prefers-color-scheme)
  - Error boundaries (page-level + global) showing friendly messages
  - Sonner toast integration in root layout
  - API response helpers (apiSuccess, apiError) for consistent JSON shape
  - Audit logging utilities (logAudit, logAuditBatch) append-only
  - ApiResponse<T> type definition
  - 4 placeholder pages inside authenticated (app) route group
affects: [02-extraction, 03-review, 04-export]

# Tech tracking
tech-stack:
  added: [shadcn/ui (base-nova style), @base-ui/react, class-variance-authority, tw-animate-css, lucide-react, clsx, tailwind-merge, inter-font]
  patterns: [system-preference-dark-mode, render-prop-sidebar-links, tooltip-provider-root, sonner-system-theme]

key-files:
  created:
    - src/app/login/page.tsx
    - src/components/app-sidebar.tsx
    - src/app/(app)/layout.tsx
    - src/app/error.tsx
    - src/app/global-error.tsx
    - src/lib/api-response.ts
    - src/lib/audit.ts
    - src/types/api.ts
    - src/app/(app)/dashboard/page.tsx
    - src/app/(app)/upload/page.tsx
    - src/app/(app)/register/page.tsx
    - src/app/(app)/export/page.tsx
    - src/components/ui/sidebar.tsx
    - src/components/ui/sonner.tsx
    - components.json
  modified:
    - src/app/globals.css
    - src/app/layout.tsx
    - src/app/page.tsx
    - package.json

key-decisions:
  - "Used render prop instead of asChild for SidebarMenuButton links (shadcn v4 base-nova uses @base-ui/react useRender, not Radix asChild)"
  - "Removed next-themes dependency from sonner component -- theme='system' directly since no manual toggle (D-08)"
  - "Wrapped app in TooltipProvider at root layout level (required by shadcn sidebar tooltip integration)"

patterns-established:
  - "Dark mode: @media (prefers-color-scheme: dark) { :root { } } in globals.css -- no .dark class, no @custom-variant"
  - "Sidebar links: SidebarMenuButton with render={<a href={} />} prop pattern"
  - "Error boundaries: error.tsx for page-level, global-error.tsx with own html/body for root crashes"
  - "API responses: apiSuccess(data) / apiError(message) returning NextResponse with { success, data?, error? }"
  - "Audit logging: logAudit() / logAuditBatch() insert-only pattern"

requirements-completed: [AUTH-01, AUTH-03, UIUX-02, UIUX-04]

# Metrics
duration: 6min
completed: 2026-04-09
---

# Phase 1 Plan 2: UI Shell + Login + Dark Mode + Error Handling Summary

**Login page with AD Auto Export branding, shadcn/ui sidebar app shell with 4 nav items, system-preference dark mode via CSS media query, error boundaries, Sonner toasts, API response helpers, and append-only audit logging utilities**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-09T00:19:35Z
- **Completed:** 2026-04-09T00:25:51Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved)
- **Files created:** 24
- **Files modified:** 4

## Accomplishments
- Login page at /login with AD Auto Export branding, email/password form calling signIn.email(), error display, and loading state
- Sidebar navigation with Dashboard, New Vehicle, Register, Export menu items with Lucide icons, active state highlighting, user email display, and logout button calling signOut()
- Dark mode following system preference via @media (prefers-color-scheme: dark) -- no JS toggle library, no .dark class selector
- Error boundaries: page-level (error.tsx) and root-level (global-error.tsx) showing "Something went wrong" with retry, no stack traces exposed (T-02-01)
- Sonner toast system mounted in root layout with richColors and top-right position
- API response helpers enforcing consistent { success, data?, error? } JSON shape (T-02-02)
- Audit utilities: logAudit() and logAuditBatch() that only insert, never update/delete (T-02-04)
- All 4 placeholder pages rendering inside authenticated sidebar layout

## Task Commits

Each task was committed atomically:

1. **Task 1: Login page, sidebar shell, dark mode, shadcn/ui components** - `b375444` (feat)
2. **Task 2: Error boundaries, API helpers, audit utility, placeholder pages** - `d3ca67e` (feat)
3. **Task 3: Checkpoint verification** - auto-approved, no commit needed

## Files Created/Modified
- `src/app/login/page.tsx` - Login form with AD Auto Export branding, signIn.email() call, error display
- `src/components/app-sidebar.tsx` - Sidebar with 4 nav items (Dashboard, New Vehicle, Register, Export), logout, user email
- `src/app/(app)/layout.tsx` - Authenticated layout with SidebarProvider + AppSidebar + SidebarInset
- `src/app/layout.tsx` - Root layout with Inter font, Sonner Toaster, TooltipProvider
- `src/app/page.tsx` - Root redirect to /dashboard
- `src/app/globals.css` - Dark mode via @media (prefers-color-scheme: dark), removed .dark and @custom-variant
- `src/app/error.tsx` - Page-level error boundary with friendly message and retry
- `src/app/global-error.tsx` - Root layout error boundary with own html/body
- `src/lib/api-response.ts` - apiSuccess() and apiError() response helpers
- `src/lib/audit.ts` - logAudit() and logAuditBatch() append-only utilities
- `src/types/api.ts` - ApiResponse<T> type definition
- `src/app/(app)/dashboard/page.tsx` - Dashboard placeholder
- `src/app/(app)/upload/page.tsx` - New Vehicle placeholder (Phase 2)
- `src/app/(app)/register/page.tsx` - Vehicle Register placeholder (Phase 4)
- `src/app/(app)/export/page.tsx` - Export placeholder (Phase 4)
- `components.json` - shadcn/ui configuration (base-nova style, neutral colors)
- `src/components/ui/*` - 12 shadcn/ui components (button, card, input, label, sonner, sheet, sidebar, separator, avatar, dropdown-menu, skeleton, tooltip)
- `src/hooks/use-mobile.ts` - Mobile detection hook (required by sidebar)
- `src/lib/utils.ts` - cn() utility (clsx + tailwind-merge)

## Decisions Made
- **render prop instead of asChild:** shadcn v4 (base-nova style) uses @base-ui/react `useRender` pattern instead of Radix `asChild`. SidebarMenuButton links use `render={<a href={} />}` prop.
- **Removed next-themes from sonner:** The generated sonner component imported `useTheme` from `next-themes` which is not installed (and not needed per D-08). Replaced with `theme="system"` directly on the Sonner component.
- **TooltipProvider in root layout:** shadcn sidebar uses tooltips internally. Added TooltipProvider wrapping children in the root layout.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed SidebarMenuButton asChild prop to render prop**
- **Found during:** Task 1 (sidebar creation)
- **Issue:** TypeScript error -- SidebarMenuButton in shadcn v4 base-nova style does not accept `asChild` prop. It uses `render` prop from @base-ui/react useRender instead.
- **Fix:** Changed `<SidebarMenuButton asChild>` to `<SidebarMenuButton render={<a href={} />}>`
- **Files modified:** src/components/app-sidebar.tsx
- **Verification:** TypeScript compiles without errors
- **Committed in:** b375444 (Task 1 commit)

**2. [Rule 3 - Blocking] Removed next-themes dependency from sonner component**
- **Found during:** Task 1 (sonner component review)
- **Issue:** shadcn-generated sonner.tsx imports `useTheme` from `next-themes`, but next-themes is not installed and not needed (D-08: system preference only, no manual toggle)
- **Fix:** Removed `useTheme` import, set `theme="system"` directly on the Sonner component
- **Files modified:** src/components/ui/sonner.tsx
- **Verification:** TypeScript compiles, Sonner follows system preference
- **Committed in:** b375444 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for correct operation with shadcn v4 base-nova style. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - uses existing .env.local from Plan 01.

## Next Phase Readiness
- Complete Phase 1 application: login, navigation, theming, error handling all functional
- All foundational UI patterns established (sidebar, toasts, error boundaries, API helpers)
- Audit logging utility ready for Phase 2 extraction pipeline
- Placeholder pages in place for Dashboard (Phase 4), New Vehicle (Phase 2), Register (Phase 4), Export (Phase 4)
- Ready for Phase 2: PDF upload and Claude API extraction

## Self-Check: PASSED

All 15 created files verified on disk. Both task commits (b375444, d3ca67e) found in git log. SUMMARY.md exists.

---
*Phase: 01-foundation-auth*
*Completed: 2026-04-09*
