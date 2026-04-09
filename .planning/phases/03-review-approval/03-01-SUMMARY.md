---
phase: 03-review-approval
plan: 01
subsystem: api
tags: [zod, validation, drizzle, next.js-api-routes, react-pdf, audit-logging]

# Dependency graph
requires:
  - phase: 02-extraction-pipeline
    provides: vehicles/documents schema, extraction types, audit logging, api-response helpers
provides:
  - vehicleSaveSchema and vehicleApprovalSchema Zod validation schemas
  - GET/PUT /api/vehicles/[id] for vehicle detail and field update
  - POST/DELETE /api/vehicles/[id]/approve for approval workflow
  - GET /api/vehicles/[id]/documents/[docId]/content for PDF serving
  - VEHICLE_FORM_FIELDS array for review form rendering
  - react-pdf and @hookform/resolvers dependencies
  - shadcn textarea and tabs components
affects: [03-02-PLAN, 04-export]

# Tech tracking
tech-stack:
  added: [react-pdf@10.4.1, "@hookform/resolvers@5.2.2"]
  patterns: [field-level-audit-logging, zod-coerce-for-html-inputs, buffer-to-bodyinit-cast-for-pdf-serving]

key-files:
  created:
    - src/lib/validation/vehicle-schema.ts
    - src/app/api/vehicles/[id]/route.ts
    - src/app/api/vehicles/[id]/approve/route.ts
    - src/app/api/vehicles/[id]/documents/[docId]/content/route.ts
    - src/components/ui/textarea.tsx
    - src/components/ui/tabs.tsx
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Used z.coerce.number() for year/odometer/prices to handle HTML input string-to-number conversion"
  - "Cast Buffer to BodyInit via unknown for PDF content endpoint (TypeScript 5.9.3 strict Response typing)"
  - "Drizzle numeric columns get String() conversion for purchasePrice/salePrice in PUT handler"

patterns-established:
  - "Field-level audit logging: compare old vs new values, batch insert audit entries"
  - "IDOR mitigation: AND condition on vehicleId + docId for document access"
  - "Approval state machine: extracting -> pending_review -> approved -> exported (no skip)"

requirements-completed: [REVW-03, REVW-04]

# Metrics
duration: 3min
completed: 2026-04-09
---

# Phase 3 Plan 1: Review API Backend Summary

**Zod validation schemas, vehicle CRUD/approval API routes, and PDF content serving for the review workflow**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-09T05:26:46Z
- **Completed:** 2026-04-09T05:30:34Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Created vehicleSaveSchema (all fields nullable/optional with z.coerce.number for HTML inputs) and vehicleApprovalSchema (VIN+Year+Make+Model required, seller-or-buyer refine)
- Built 4 API route handlers: GET/PUT vehicle detail, POST/DELETE approval workflow, GET PDF binary content
- Field-level audit logging with old/new value tracking on every vehicle edit
- IDOR-safe PDF content endpoint with AND condition on vehicleId + docId
- Installed react-pdf and @hookform/resolvers for Plan 02 review UI

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies + create vehicle validation schemas** - `dcd845b` (feat)
2. **Task 2: Create API routes for vehicle detail, field update, approval, and PDF content serving** - `039f6ce` (feat)

## Files Created/Modified
- `src/lib/validation/vehicle-schema.ts` - Zod schemas (vehicleSaveSchema, vehicleApprovalSchema) and VEHICLE_FORM_FIELDS array
- `src/app/api/vehicles/[id]/route.ts` - GET vehicle detail + PUT field update with audit logging
- `src/app/api/vehicles/[id]/approve/route.ts` - POST approve + DELETE unapprove with status checks
- `src/app/api/vehicles/[id]/documents/[docId]/content/route.ts` - GET raw PDF binary for react-pdf preview
- `src/components/ui/textarea.tsx` - shadcn textarea component for address fields
- `src/components/ui/tabs.tsx` - shadcn tabs component for AP/AR document switching
- `package.json` - Added react-pdf@10.4.1, @hookform/resolvers@5.2.2

## Decisions Made
- Used `z.coerce.number()` for year, odometer, purchasePrice, salePrice fields in the save schema to handle HTML form inputs that always send strings -- avoids runtime type errors when form data arrives
- Cast `Buffer` to `BodyInit` via `unknown` in the PDF content endpoint because TypeScript 5.9.3 strict typing does not accept Buffer or Uint8Array as valid Response body, though both work at runtime
- Convert price values to String before passing to Drizzle SET for numeric(10,2) columns, since Drizzle expects string input for numeric types but Zod coerces to number for validation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Buffer type incompatibility in PDF content endpoint**
- **Found during:** Task 2 (PDF content route)
- **Issue:** `new Response(doc.fileData, ...)` fails TypeScript compilation because Buffer is not in BodyInit union for TS 5.9.3
- **Fix:** Cast `doc.fileData as unknown as BodyInit` -- works correctly at runtime since Buffer is accepted by the Response constructor
- **Files modified:** src/app/api/vehicles/[id]/documents/[docId]/content/route.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 039f6ce (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Type-only fix, no behavioral change. No scope creep.

## Issues Encountered
None beyond the Buffer/BodyInit type incompatibility documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All backend API contracts for the review page are complete and type-safe
- Plan 02 can now build the review UI components consuming these endpoints
- VEHICLE_FORM_FIELDS array provides field definitions for form rendering
- react-pdf and @hookform/resolvers are installed and ready

## Self-Check: PASSED

All 7 created files verified on disk. Both task commits (dcd845b, 039f6ce) found in git log.

---
*Phase: 03-review-approval*
*Completed: 2026-04-09*
