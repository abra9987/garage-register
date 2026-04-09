---
phase: 02-upload-extraction-pipeline
plan: 03
subsystem: ui, api
tags: [react-dropzone, upload, extraction, confidence-badge, vin-validation, cross-validation, polling, nextjs-routes]

# Dependency graph
requires:
  - phase: 02-upload-extraction-pipeline/01
    provides: "Drizzle schema with bytea, ExtractionSchema, FIELD_NAME_MAP, validateVin()"
  - phase: 02-upload-extraction-pipeline/02
    provides: "extractDocument(), crossValidateExtractions(), Anthropic client"
provides:
  - "Upload page at /upload with drag-and-drop PDF zones (AP/AR)"
  - "POST /api/vehicles -- create vehicle record"
  - "POST /api/vehicles/[id]/upload -- upload PDF, trigger async extraction"
  - "GET /api/vehicles/[id]/status -- poll extraction status with bytea exclusion"
  - "7 upload UI components: DropZone, ConfidenceBadge, ExtractionStatus, FieldRow, VinStatus, ConflictCard, ExtractionResults"
  - "Full async extraction pipeline with 2-second polling, VIN validation, cross-validation"
affects: [03-review-approval-ui, 04-export]

# Tech tracking
tech-stack:
  added: ["react-dropzone"]
  patterns: ["Async fire-and-forget extraction with status polling", "FormData upload for PDF binary", "Explicit column selection to exclude bytea from queries"]

key-files:
  created:
    - src/app/api/vehicles/route.ts
    - src/app/api/vehicles/[id]/upload/route.ts
    - src/app/api/vehicles/[id]/status/route.ts
    - src/components/upload/drop-zone.tsx
    - src/components/upload/confidence-badge.tsx
    - src/components/upload/extraction-status.tsx
    - src/components/upload/field-row.tsx
    - src/components/upload/vin-status.tsx
    - src/components/upload/conflict-card.tsx
    - src/components/upload/extraction-results.tsx
  modified:
    - src/app/(app)/upload/page.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "Used fire-and-forget async pattern for extraction -- upload route returns immediately, runExtraction runs in background, client polls every 2 seconds"
  - "VehicleData interface includes status field for polling state machine checks"
  - "Conflicts stored in vehicles.extractionConfidence under a 'conflicts' key alongside per-field confidence"

patterns-established:
  - "Async extraction pattern: upload stores PDF + returns 200, background function extracts + updates vehicle, client polls GET status"
  - "Explicit document column selection excluding fileData bytea to prevent large binary loading on queries"
  - "Semantic confidence badge colors: green (high), amber (medium), red (low), muted (not_found)"

requirements-completed: [UPLD-01, UPLD-02, UPLD-03, UPLD-04, EXTR-01, EXTR-02, EXTR-03, EXTR-04, EXTR-05, EXTR-06, VIN-01, VIN-02, VIN-03]

# Metrics
duration: 5min
completed: 2026-04-09
---

# Phase 02 Plan 03: Upload Page UI + API Routes + Pipeline Wiring Summary

**Drag-and-drop upload page with async extraction pipeline, confidence-scored results display, VIN validation, and AP/AR cross-document conflict detection**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-09T02:04:30Z
- **Completed:** 2026-04-09T02:09:44Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments
- Built 3 API routes: vehicle creation, PDF upload with async extraction, and status polling -- all protected by Better Auth session validation
- Created 7 custom UI components composing a full upload page with dual drop zones, extraction status state machine, confidence badges, VIN validation display, and cross-document conflict cards
- Wired the complete extraction pipeline: upload stores bytea, background extracts via Claude API, maps fields to vehicles table, validates VIN, cross-validates when both AP+AR exist, polls for completion

## Task Commits

Each task was committed atomically:

1. **Task 1: API routes -- create vehicle, upload PDF, poll status** - `d04466a` (feat)
2. **Task 2: Upload page UI with drop zones, status, and results display** - `4af99e4` (feat)
3. **Task 3: Verify end-to-end upload and extraction pipeline** - checkpoint (auto-approved)

## Files Created/Modified
- `src/app/api/vehicles/route.ts` - POST endpoint to create vehicle record with job number
- `src/app/api/vehicles/[id]/upload/route.ts` - POST endpoint for PDF upload via FormData, stores bytea, triggers async extraction with VIN validation and cross-validation
- `src/app/api/vehicles/[id]/status/route.ts` - GET endpoint for polling extraction status, excludes fileData from document queries
- `src/app/(app)/upload/page.tsx` - Main upload page with state management, polling, drop zones, and results display
- `src/components/upload/drop-zone.tsx` - Styled react-dropzone wrapper with idle/dragover/loaded states
- `src/components/upload/confidence-badge.tsx` - Semantic colored pills for high/medium/low/not_found confidence
- `src/components/upload/extraction-status.tsx` - Status state machine: idle, ready, extracting (spinner), complete, failed
- `src/components/upload/field-row.tsx` - Single extracted field with label, value, and confidence badge
- `src/components/upload/vin-status.tsx` - VIN validation result display with format/check-digit messaging
- `src/components/upload/conflict-card.tsx` - Amber-styled card for AP/AR cross-document conflicts
- `src/components/upload/extraction-results.tsx` - Full results panel composing all field rows, VIN status, and conflict card
- `src/components/ui/badge.tsx` - shadcn badge component (installed)
- `src/components/ui/alert.tsx` - shadcn alert component (installed)
- `package.json` - Added react-dropzone dependency
- `package-lock.json` - Lock file updated

## Decisions Made
- Used fire-and-forget async pattern for extraction: the upload route stores the PDF, returns HTTP 200 immediately, and the extraction runs as a background promise. The client polls GET /api/vehicles/[id]/status every 2 seconds to detect completion.
- Added `status` field to VehicleData interface to enable client-side polling state machine checks (vehicle.status === "pending_review" triggers completion).
- Stored cross-validation conflicts in vehicles.extractionConfidence under a "conflicts" key alongside per-field confidence levels, keeping all extraction metadata in one JSONB column.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] VehicleData interface missing status field**
- **Found during:** Task 2 (Upload page TypeScript compilation)
- **Issue:** VehicleData interface in extraction-results.tsx did not include `status` field, but the upload page accessed `vehicle.status` during polling
- **Fix:** Added `status: string` to VehicleData interface
- **Files modified:** src/components/upload/extraction-results.tsx
- **Verification:** `npx tsc --noEmit` compiles cleanly
- **Committed in:** 4af99e4 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor interface fix necessary for TypeScript correctness. No scope creep.

## Checkpoint: End-to-End Verification (Task 3)

**Type:** human-verify (auto-approved per workflow config)

**What was built:** Drag-and-drop PDF upload with two zones (AP/AR), async Claude API extraction with status polling, confidence-scored results display, VIN format and check digit validation, and cross-document conflict detection between AP and AR documents.

**Verification steps:**
1. Start dev server: `npm run dev`
2. Navigate to http://localhost:3000/upload (login first if redirected)
3. Verify page shows "New Vehicle" heading, Job Number input, two drop zones labeled "AP Invoice (Purchase)" and "AR Invoice (Sale)"
4. Verify "Start Extraction" button is disabled (no files uploaded)
5. Drag a PDF from the reference/ folder onto the AP drop zone -- verify filename and size appear
6. Try dragging a non-PDF file -- verify toast error "Only PDF files are accepted"
7. Click "Start Extraction" -- verify spinner appears with "Extracting data from documents..."
8. Wait for extraction to complete (~5-15 seconds) -- verify results appear below with confidence badges
9. Check VIN validation message (valid or invalid with specific error)
10. Upload a second PDF to the AR zone, click "Start Extraction" again -- verify cross-validation section appears
11. Verify dark mode renders correctly (check system preference toggle)
12. Verify mobile layout (resize browser below 768px) -- drop zones should stack vertically

## Issues Encountered
None.

## User Setup Required
None beyond ANTHROPIC_API_KEY already configured in Plan 02-02.

## Next Phase Readiness
- Upload and extraction pipeline fully wired and ready for use
- Phase 3 (Review + Approval UI) can build on the vehicle data now populated in the database
- "Continue to Review" button is present but disabled with "Coming in Phase 3" tooltip
- All extraction confidence data is stored and accessible for the review interface

## Self-Check: PASSED

All 11 created files verified on disk. Both task commits (d04466a, 4af99e4) verified in git log. TypeScript compiles cleanly with zero errors.

---
*Phase: 02-upload-extraction-pipeline*
*Completed: 2026-04-09*
