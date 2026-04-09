---
phase: 03-review-approval
plan: 02
subsystem: ui
tags: [react-pdf, react-hook-form, zod, confidence-ui, review-workflow, approval]

requires:
  - phase: 03-review-approval/01
    provides: vehicle-schema, vehicle-detail-api, approve-api, document-content-api
  - phase: 02-extraction-pipeline
    provides: extraction-types, confidence-badge, vin-status, conflict-card, cross-validate

provides:
  - PdfPreview component with react-pdf, document tabs, zoom, page nav, re-extract
  - ReviewField with confidence-colored borders (green/amber/red/dashed-grey/blue-edited)
  - ReviewForm with React Hook Form + Zod v4 resolver for all 16 Garage Register fields
  - ActionBar with Save/Approve/Unapprove buttons at 48px touch targets
  - StatusBadge for vehicle status display
  - Review page at /vehicles/[id]/review with 40/60 split layout
  - Register page with status-filtered vehicle list
  - GET /api/vehicles endpoint for vehicle list
  - POST /api/vehicles/[id]/documents/[docId]/reextract endpoint

affects: [04-export]

tech-stack:
  added: []
  patterns: [render-prop-links, dynamic-import-ssr-false, polling-re-extract, form-ref-parent-communication]

key-files:
  created:
    - src/components/review/pdf-preview.tsx
    - src/components/review/review-field.tsx
    - src/components/review/review-form.tsx
    - src/components/review/action-bar.tsx
    - src/components/review/status-badge.tsx
    - src/app/(app)/vehicles/[id]/review/page.tsx
    - src/app/api/vehicles/[id]/documents/[docId]/reextract/route.ts
  modified:
    - src/app/(app)/register/page.tsx
    - src/app/api/vehicles/route.ts

key-decisions:
  - "Used render prop (not asChild) for Button links -- shadcn v4 base-nova pattern"
  - "Passed form ref from ReviewForm to parent for ActionBar canApprove computation"
  - "Used 100ms setInterval polling for form dirty/canApprove state instead of onChange callback"
  - "Re-extract polls every 2s with 60s timeout for background extraction completion"

patterns-established:
  - "render prop for Next.js Link inside shadcn v4 Button: render={<Link href='...' />}"
  - "dynamic import with ssr:false for react-pdf components"
  - "formRef pattern for parent access to React Hook Form instance"

requirements-completed: [REVW-01, REVW-02, REVW-03, REVW-04, REVW-05, UIUX-03]

duration: 5min
completed: 2026-04-09
---

# Phase 03 Plan 02: Review + Approval UI Summary

**Complete review page with side-by-side PDF preview + confidence-bordered form fields, approval workflow, re-extraction, and vehicle register list**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-09T05:32:39Z
- **Completed:** 2026-04-09T05:38:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved)
- **Files modified:** 9

## Accomplishments
- Built PdfPreview component with react-pdf worker, document tabs (AP/AR), page navigation, zoom (0.5x-2.0x), and re-extract button with loading state
- Built ReviewField with confidence-coded borders (green=high, amber=medium, red=low, dashed-grey=not_found, blue=edited) and original-value tooltips
- Built ReviewForm composing all 16 Garage Register fields via React Hook Form + Zod v4, with VIN validation and cross-document conflict display
- Built ActionBar with Save/Approve (disabled until required fields filled)/Unapprove buttons at 48px height
- Built review page at /vehicles/[id]/review with 40/60 split layout (stacked on mobile), dynamic PDF import, full approval/save/re-extract flow
- Replaced placeholder register page with status-filtered vehicle list linking to review pages
- Added GET /api/vehicles endpoint with auth guard and re-extraction POST endpoint replicating Claude API pipeline

## Task Commits

Each task was committed atomically:

1. **Task 1: PdfPreview component** - `0fc9f76` (feat)
2. **Task 2: ReviewField, ReviewForm, ActionBar, StatusBadge, Review page, Register page, API endpoints** - `c313450` (feat)
3. **Task 3: Checkpoint human-verify** - auto-approved (verification steps documented below)

## Verification Steps (Task 3 Checkpoint)

1. Start dev server: `npm run dev`
2. Navigate to http://localhost:3000/upload and upload a PDF (use reference/ folder documents)
3. Wait for extraction to complete
4. Navigate to http://localhost:3000/register -- verify vehicle appears in "Pending Review" list
5. Click "Review" on the vehicle -- verify /vehicles/[id]/review page loads
6. PDF Preview: Verify PDF renders on the left side (40% width). Try page navigation and zoom.
7. Confidence borders: Verify form fields have colored borders (green/amber/red). Check not_found fields have dashed grey border.
8. Field editing: Edit a field -- verify border changes to blue, "Edited" text appears, tooltip shows original value.
9. Save: Click "Save Changes" -- verify toast "Changes saved" appears.
10. Approve: Fill required fields (VIN, Year, Make, Model, Seller or Buyer). Click "Approve Record" -- verify toast and status change.
11. Unapprove: Click "Return to Review" -- verify record returns to "Pending Review".
12. Mobile: Resize below 768px -- verify stacked layout and sticky action buttons.
13. Dark mode: Toggle system theme -- verify all confidence colors render correctly.

## Files Created/Modified
- `src/components/review/pdf-preview.tsx` - react-pdf viewer with tabs, page nav, zoom, re-extract
- `src/components/review/review-field.tsx` - Form input with confidence borders, edit tracking, tooltips
- `src/components/review/review-form.tsx` - React Hook Form composing 16 ReviewField instances
- `src/components/review/action-bar.tsx` - Save, Approve, Unapprove buttons with state logic
- `src/components/review/status-badge.tsx` - Color-coded vehicle status badge
- `src/app/(app)/vehicles/[id]/review/page.tsx` - Review page with 40/60 layout
- `src/app/(app)/register/page.tsx` - Vehicle list with status filtering
- `src/app/api/vehicles/route.ts` - Added GET handler for vehicle list
- `src/app/api/vehicles/[id]/documents/[docId]/reextract/route.ts` - Re-extraction endpoint

## Decisions Made
- Used render prop (not asChild) for Button links -- shadcn v4 base-nova uses @base-ui/react which provides render prop instead of Radix asChild
- Passed form ref from ReviewForm to parent page for ActionBar canApprove computation via 100ms polling interval
- Re-extract uses 2-second polling with 60-second timeout for background extraction completion detection
- ReviewForm key={vehicle.updatedAt} forces remount on data refresh to pick up new extraction values

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed asChild prop to render prop for shadcn v4 base-nova Button**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** Plan specified `asChild` for Button+Link composition, but shadcn v4 base-nova uses @base-ui/react which has `render` prop instead
- **Fix:** Changed all `<Button asChild><Link>` to `<Button render={<Link href="..." />}>`
- **Files modified:** src/app/(app)/register/page.tsx, src/app/(app)/vehicles/[id]/review/page.tsx
- **Verification:** TypeScript compiles cleanly
- **Committed in:** c313450 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Consistent with established pattern from Phase 1. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All review and approval UI complete, ready for Phase 04 (Export)
- Vehicles can be uploaded, extracted, reviewed, edited, approved, and unapproved
- Register page provides navigation hub for all vehicle records
- Export phase can query approved vehicles and generate XLSX

## Self-Check: PASSED

All 9 created/modified files verified on disk. Both task commits (0fc9f76, c313450) verified in git log.

---
*Phase: 03-review-approval*
*Completed: 2026-04-09*
