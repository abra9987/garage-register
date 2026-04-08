# Phase 1: Foundation + Auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 1-Foundation + Auth
**Areas discussed:** Login design, Session handling, Error UX, App shell layout
**Mode:** Auto (all recommended defaults selected)

---

## Login Design

| Option | Description | Selected |
|--------|-------------|----------|
| Clean centered form with branding | AD Auto logo, company name, email/password fields | ✓ |
| Minimal no-brand | Just email/password, no visual identity | |
| Full landing page | Marketing-style page with login section | |

**User's choice:** [auto] Clean centered form with AD Auto branding (recommended default)
**Notes:** Consistent with Invoice Ledger's professional feel. Single admin user, no registration page needed.

---

## Session Handling

| Option | Description | Selected |
|--------|-------------|----------|
| 30 days persistent | httpOnly secure cookie, stays across browser restarts | ✓ |
| 7 days | Shorter session, more frequent re-login | |
| Session only | Expires when browser closes | |

**User's choice:** [auto] 30 days persistent (recommended default)
**Notes:** Andrey is the sole user on a trusted device. Long sessions reduce friction.

---

## Error UX

| Option | Description | Selected |
|--------|-------------|----------|
| Toast notifications + silent retry | Sonner toasts for success/warning, backend errors hidden and retried | ✓ |
| Inline error messages | Errors shown near the component that failed | |
| Modal error dialogs | Blocking dialog for errors | |

**User's choice:** [auto] Toast notifications with silent backend retry (recommended default)
**Notes:** Follows established feedback from Invoice Ledger project: "No backend errors shown to user — system retries silently."

---

## App Shell Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar navigation | Collapsible sidebar with menu items, logo at top | ✓ |
| Top navigation bar | Horizontal nav at top of page | |
| Minimal tabs | Tab-based navigation, no persistent sidebar | |

**User's choice:** [auto] Sidebar navigation with collapsible menu (recommended default)
**Notes:** Sidebar maps naturally to the workflow pipeline: Dashboard → Upload → Register → Export.

---

## Claude's Discretion

- Sidebar width and mobile breakpoint
- Loading skeleton vs spinner
- shadcn/ui component selections
- Migration strategy details

## Deferred Ideas

None
