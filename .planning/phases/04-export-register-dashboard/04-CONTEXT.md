# Phase 4: Export + Register + Dashboard - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode — recommended answers accepted)

<domain>
## Phase Boundary

Deliver the XLSX export (new + append), vehicle register with search/filter, and dashboard with activity feed. This is the final phase — after this, Andrey has a complete workflow from PDF upload through review to Garage Register export.

</domain>

<decisions>
## Implementation Decisions

### XLSX Export
- **D-41:** Two export modes: (1) "Export New" creates fresh XLSX from selected approved records in exact Ministry format. (2) "Append to Existing" lets user upload their current Garage Register XLSX and appends new records to the end.
- **D-42:** Use ExcelJS for both modes. Already proven in Invoice Ledger. For "Export New" — use the Ministry template structure (header row + data rows, specific column widths/formatting). For "Append" — read existing file, find last data row, insert after.
- **D-43:** Export selection via checkboxes in the register table. "Export Selected" button appears when >= 1 approved record is checked. Exported records get `exported` status + `exportedAt` timestamp.
- **D-44:** Downloaded XLSX filename pattern: `Garage_Register_{YYYY-MM-DD}.xlsx` for new, original filename preserved for append.
- **D-45:** Reference file `AD Auto CANADA Garage Register 2025-2026.xlsx` is the Ministry template. Column order and headers MUST match exactly.

### Register (Vehicle Table)
- **D-46:** Sortable table with columns: Job#, VIN, Year, Make, Model, Status, Date Acquired, Date Disposed. Click column header to sort. Default sort: newest first (createdAt desc).
- **D-47:** Search bar at top — searches across VIN, job number, make, model, seller name, buyer name. Server-side search for accuracy.
- **D-48:** Filter chips: by status (pending_review, approved, exported) and date range (this month, last 3 months, custom). Filters combine with AND logic.
- **D-49:** Pagination: 25 records per page. Show total count. Simple prev/next navigation.
- **D-50:** Use nuqs for URL-synced search params — filters and search persist in URL for bookmarking/sharing.

### Dashboard
- **D-51:** Dashboard is the home page (sidebar "Dashboard" nav item). Shows 3 stat cards: Pending Review count, Exported This Month count, Total Vehicles count.
- **D-52:** Recent activity feed below stat cards — last 20 actions from audit_log (uploads, approvals, exports). Shows action type icon, vehicle job#, timestamp, relative time (date-fns formatDistanceToNow).
- **D-53:** Quick action buttons on dashboard: "Upload New Vehicle" (links to /upload), "View Register" (links to /register).
- **D-54:** Dashboard and register table must be usable on mobile (UIUX-01). Cards stack vertically, table becomes card-based list on small screens.

### Claude's Discretion
- Exact Ministry XLSX column widths and formatting (derive from reference file)
- Activity feed icon choices per action type
- Register table responsive breakpoint behavior
- Loading states for export generation
- Empty state designs for register and dashboard

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/db/schema.ts` — vehicles, documents, auditLog tables with all fields
- `src/lib/audit.ts` — logAudit() for recording export actions
- `src/lib/api-response.ts` — apiSuccess/apiError helpers
- `src/app/api/vehicles/route.ts` — POST vehicle (can extend for GET list)
- ExcelJS already in package.json dependencies
- date-fns already in package.json dependencies
- shadcn components: button, card, input, badge, skeleton, table (may need install)

### Established Patterns
- API routes with auth session guard
- Drizzle ORM queries with explicit column selection
- Sonner toasts for user feedback
- URL state with nuqs (needs install)

### Integration Points
- Register page at `/register` (placeholder exists from Phase 1, needs real implementation)
- Dashboard page at `/dashboard` (placeholder exists)
- Export page at `/export` (placeholder exists)
- API routes: GET `/api/vehicles` (list with search/filter/sort), POST `/api/export` (generate XLSX), POST `/api/export/append` (append to uploaded XLSX)
- Package additions needed: `nuqs`, shadcn `table` component

</code_context>

<specifics>
## Specific Ideas

- The Ministry XLSX template in project root is the source of truth for column order, headers, and formatting
- Register table should feel fast — Andrey may search by VIN frequently
- Dashboard stat cards should update on every page load (not cached)
- Export is the final step — should feel satisfying and complete

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-export-register-dashboard*
*Context gathered: 2026-04-09 via autonomous mode*
