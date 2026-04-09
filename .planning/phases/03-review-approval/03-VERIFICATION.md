---
phase: 03-review-approval
verified: 2026-04-08T00:00:00Z
status: human_needed
score: 10/10
overrides_applied: 0
human_verification:
  - test: "Open /register, upload a vehicle, navigate to its review page. Verify PDF renders in the left 40% panel alongside the form on the right."
    expected: "PDF displays in react-pdf viewer with page navigation and zoom controls visible. Form fields appear on the right with confidence-colored borders."
    why_human: "react-pdf rendering with Turbopack worker config can only be confirmed visually in a running browser; SSR-excluded dynamic import cannot be verified programmatically."
  - test: "On the review page, check a field extracted with high confidence, one with medium, one with low, and one marked not_found."
    expected: "High = solid green border, medium = solid amber border, low = solid red border, not_found = dashed grey border with muted background. The not_found field must look visually distinct from the red low-confidence border."
    why_human: "CSS class application and visual rendering must be confirmed in browser."
  - test: "Edit a field value in the review form."
    expected: "Border changes to blue, 'Edited' label appears below the field, and a tooltip on hover shows the original extracted value."
    why_human: "React Hook Form dirty-state tracking and tooltip display require interactive browser testing."
  - test: "On a pending_review vehicle with all required fields empty, verify Approve Record button is disabled. Fill VIN (17 chars), Year, Make, Model, and Seller Name, then verify button becomes enabled."
    expected: "Button starts disabled. After filling required fields it becomes active and clicking it changes status to approved with a success toast."
    why_human: "100ms polling-based canApprove logic and button enable/disable state require live browser interaction."
  - test: "On an approved vehicle, click 'Return to Review'."
    expected: "Status badge changes from Approved to Pending Review and the Approve Record button reappears."
    why_human: "Status state transitions and UI re-render require live browser testing."
  - test: "Resize browser below 768px and navigate to a review page."
    expected: "PDF preview and form stack vertically (full width). Action buttons are sticky at the bottom of the viewport."
    why_human: "Responsive layout and sticky positioning require visual browser verification."
---

# Phase 3: Review + Approval Verification Report

**Phase Goal:** Andrey can review extracted data against the original PDF, correct any errors, and approve records for export
**Verified:** 2026-04-08
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees extracted fields alongside the original PDF in a side-by-side layout (40% PDF left, 60% form right on desktop; stacked on mobile) | VERIFIED | `review/page.tsx` lines 364-403: `flex flex-col lg:flex-row`, `lg:w-2/5` for PdfPreview, `lg:w-3/5` for ReviewForm. Both components wired and rendered. |
| 2 | Fields are color-coded by confidence: green border for high, amber border for medium, red border for low, dashed grey border for not_found | VERIFIED | `review-field.tsx` lines 28-35: `CONFIDENCE_BORDER_CLASSES` map defines `border-green-500`, `border-amber-500`, `border-red-500`, and `border-dashed border-muted-foreground` for each level respectively. Applied via `borderClass` in `inputClassName`. |
| 3 | User-edited fields show blue border with Edited indicator and tooltip showing original value | VERIFIED | `review-field.tsx` lines 37-38, 113-135, 140-141: `EDITED_BORDER_CLASS = "border-2 border-blue-500"`, Tooltip wraps edited input with `Original: {originalValue}`, `<p class="text-xs text-blue-600">Edited</p>` shown when `isEdited`. |
| 4 | User can edit any field via React Hook Form inputs pre-filled from extraction data | VERIFIED | `review-form.tsx` lines 60-80: `useForm` with `defaultValues` from all 16 vehicle fields. `zodResolver(vehicleSaveSchema)` wired. All fields registered via `form.register(field.name)`. `onSave` handler calls `PUT /api/vehicles/[id]`. |
| 5 | User can click Approve Record button (disabled until VIN+Year+Make+Model and Seller or Buyer name filled) | VERIFIED | `action-bar.tsx` lines 54-80: button shown only when `vehicleStatus === "pending_review"`, `disabled={!canApprove}`. `canApprove` computed in `review/page.tsx` lines 121-127 via 100ms polling: vinVal.length === 17 && yearVal && makeVal && modelVal && (sellerVal or buyerVal). |
| 6 | User can click Return to Review to unapprove an approved record | VERIFIED | `action-bar.tsx` lines 82-103: button shown when `vehicleStatus === "approved"`. `review/page.tsx` lines 223-241: `handleUnapprove` sends `DELETE /api/vehicles/${id}/approve`. API route `approve/route.ts` lines 88-132: verifies status is "approved" then sets to "pending_review". |
| 7 | Not-found fields have dashed border and grey background, visually distinct from low-confidence red border | VERIFIED | `review-field.tsx`: `not_found` uses `border-dashed border-muted-foreground bg-muted/50` (line 34); `low` uses `border-red-500 bg-red-50/50` (line 32). Semantically and visually different classes confirmed. |
| 8 | PDF pages can be navigated (prev/next) and zoomed (0.5x to 2.0x) with document tabs when both AP and AR exist | VERIFIED | `pdf-preview.tsx` lines 38-42: `MIN_SCALE=0.5`, `MAX_SCALE=2.0`, `SCALE_STEP=0.25`. Tabs render when `!hasSingleDoc` (lines 104-121). Page prev/next controls and zoom in/out buttons implemented (lines 159-252). |
| 9 | Register page shows list of vehicles with status filtering and links to their review pages | VERIFIED | `register/page.tsx` lines 31-42: fetches `/api/vehicles` real DB query (all vehicles ordered by `createdAt`). Lines 44-47: client-side filter by status. Line 118: `render={<Link href={/vehicles/${v.id}/review} />}` for Review/View button. |
| 10 | PUT /api/vehicles/[id] creates audit log entries for each changed field | VERIFIED | `vehicles/[id]/route.ts` lines 106-138: builds `auditEntries` comparing old vs new values for each updated field, calls `logAuditBatch(auditEntries)` when entries exist. |

**Score:** 10/10 truths verified

### Deferred Items

None.

### Required Artifacts

| Artifact | Min Lines | Actual Lines | Status | Notes |
|----------|-----------|-------------|--------|-------|
| `src/lib/validation/vehicle-schema.ts` | — | 89 | VERIFIED | Exports `vehicleSaveSchema`, `vehicleApprovalSchema`, `VEHICLE_FORM_FIELDS` (16 fields), type exports. |
| `src/app/api/vehicles/[id]/route.ts` | — | 149 | VERIFIED | GET (vehicle + doc metadata, no bytea) + PUT (validates, audits, updates). |
| `src/app/api/vehicles/[id]/approve/route.ts` | — | 132 | VERIFIED | POST (pending_review -> approved, validates required fields) + DELETE (approved -> pending_review, blocks exported). |
| `src/app/api/vehicles/[id]/documents/[docId]/content/route.ts` | — | 46 | VERIFIED | GET returns raw PDF binary with IDOR mitigation (AND vehicleId+docId). |
| `src/components/review/pdf-preview.tsx` | 80 | 252 | VERIFIED | react-pdf with worker config, Tabs, page nav, zoom, re-extract button. |
| `src/components/review/review-field.tsx` | 40 | 148 | VERIFIED | Confidence-colored borders, blue edited border, Tooltip with original value, Edited label. |
| `src/components/review/review-form.tsx` | 80 | 175 | VERIFIED | RHF + Zod resolver, 16 VEHICLE_FORM_FIELDS, VIN validation display, conflicts display. |
| `src/components/review/action-bar.tsx` | 40 | 106 | VERIFIED | Save (when dirty), Approve (disabled until canApprove), Unapprove — all h-12 size="lg". |
| `src/components/review/status-badge.tsx` | 15 | 47 | VERIFIED | All 4 statuses with distinct color classes. |
| `src/app/(app)/vehicles/[id]/review/page.tsx` | 60 | 406 | VERIFIED | 40/60 split layout, all handlers wired, dynamic import PdfPreview (ssr:false). |
| `src/app/(app)/register/page.tsx` | 30 | 145 | VERIFIED | Fetches real vehicle list, status filter, links to review pages. |
| `src/components/ui/textarea.tsx` | — | 18 | VERIFIED | shadcn textarea component. |
| `src/components/ui/tabs.tsx` | — | 82 | VERIFIED | shadcn tabs component. |
| `src/app/api/vehicles/route.ts` | — | 64 | VERIFIED | GET returns real DB query (`allVehicles` from vehicles table). |
| `src/app/api/vehicles/[id]/documents/[docId]/reextract/route.ts` | — | 199 | VERIFIED | Calls `extractDocument` from extraction pipeline. |

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|-----|-----|--------|---------|
| `vehicles/[id]/route.ts` | `vehicle-schema.ts` | `import vehicleSaveSchema` | WIRED | Line 9: import; line 72: `vehicleSaveSchema.parse(body)` |
| `vehicles/[id]/approve/route.ts` | `vehicle-schema.ts` | `import vehicleApprovalSchema` | WIRED | Line 9: import; line 45: `vehicleApprovalSchema.parse({...})` |
| `vehicles/[id]/route.ts` | `audit.ts` | `logAuditBatch` | WIRED | Line 8: import; line 138: `await logAuditBatch(auditEntries)` |
| `review-form.tsx` | `vehicle-schema.ts` | `vehicleSaveSchema, VEHICLE_FORM_FIELDS` | WIRED | Lines 13-14: import; line 61: `zodResolver(vehicleSaveSchema)`; line 117: `VEHICLE_FORM_FIELDS.map(...)` |
| `pdf-preview.tsx` | `/api/vehicles/[id]/documents/[docId]/content` | fetch URL for react-pdf Document | WIRED | Line 93: `` `/api/vehicles/${vehicleId}/documents/${activeDocId}/content` `` |
| `review/page.tsx` | `/api/vehicles/[id]/approve` | fetch POST + DELETE | WIRED | Lines 206, 226: POST approve and DELETE unapprove |
| `review/page.tsx` | `/api/vehicles/[id]` | fetch GET on load | WIRED | Line 77: `` fetch(`/api/vehicles/${id}`) `` in `fetchVehicle` |
| `register/page.tsx` | `/api/vehicles` | fetch GET for vehicle list | WIRED | Line 31: `fetch("/api/vehicles")` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `review/page.tsx` | `vehicle`, `documents` | `GET /api/vehicles/${id}` → `db.select().from(vehicles)` + doc metadata query | Yes — Drizzle DB query, no static fallback | FLOWING |
| `register/page.tsx` | `vehicles` | `GET /api/vehicles` → `db.select().from(vehicles).orderBy(desc(vehicles.createdAt))` | Yes — real DB query with order | FLOWING |
| `review-form.tsx` | `defaultValues` (16 fields) | Props from `vehicle` state in review page (loaded from DB) | Yes — flows from DB through API to form | FLOWING |
| `review-field.tsx` | `confidence`, `isEdited`, `originalValue` | Props from `ReviewForm` confidence map (from `vehicle.extractionConfidence` DB jsonb column) | Yes — flows from DB extraction confidence | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — review page requires running browser with authentication and uploaded PDF documents. No programmatic spot-check is feasible without a live server and seeded database.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| REVW-01 | 03-02-PLAN | User sees extracted fields alongside original PDF preview (side-by-side layout) | SATISFIED | `review/page.tsx` lg:w-2/5 PdfPreview + lg:w-3/5 ReviewForm |
| REVW-02 | 03-02-PLAN | Fields are color-coded by extraction confidence (green >90%, yellow 70-90%, red <70%) | SATISFIED | `review-field.tsx` CONFIDENCE_BORDER_CLASSES with green/amber/red borders |
| REVW-03 | 03-01-PLAN, 03-02-PLAN | User can edit any extracted field before approval | SATISFIED | RHF form with 16 registered fields; PUT route validates and persists edits |
| REVW-04 | 03-01-PLAN, 03-02-PLAN | User can explicitly approve a record (approval gate before export) | SATISFIED | POST /api/vehicles/[id]/approve with pending_review status guard; Approve button with canApprove gate |
| REVW-05 | 03-02-PLAN | Fields marked as "not found in document" are visually distinct from low-confidence fields | SATISFIED | `not_found` = dashed grey; `low` = solid red — different CSS classes |
| UIUX-03 | 03-02-PLAN | UI uses large buttons, visual cues, and minimal actions for non-technical user | SATISFIED | All ActionBar buttons: `size="lg" className="h-12 w-full"` (48px height, full width) |

All 6 requirements are satisfied. No orphaned Phase 3 requirements found in REQUIREMENTS.md — the traceability table maps exactly REVW-01 through REVW-05 and UIUX-03 to Phase 3.

### Anti-Patterns Found

No blockers or stubs detected. The following matches were investigated and cleared:

- `placeholder` in `review-field.tsx`: This is the HTML input `placeholder` attribute for not_found fields ("Not found in document — enter manually"). It is an intentional UX feature, not a code stub.
- `return null` in `review/page.tsx` (lines 81, 95): These are early returns from the `fetchVehicle` async function when the API returns an error or missing data — standard error handling, not an empty implementation.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | No anti-patterns found |

### Human Verification Required

All automated checks pass. Six items require live browser testing to confirm visual rendering, interactive behavior, and responsive layout — these cannot be verified programmatically.

**1. PDF Renders in Side-by-Side Layout**

**Test:** Start the dev server (`npm run dev`), upload a PDF via /upload, navigate to the vehicle's review page.
**Expected:** react-pdf renders the PDF in the left 40% panel. Right 60% shows form fields. Both panels are visible simultaneously on a desktop viewport.
**Why human:** react-pdf uses a dynamically imported component (SSR disabled) with a Turbopack-specific worker configuration. Rendering can only be confirmed visually in a browser.

**2. Confidence Color Borders Display Correctly**

**Test:** On the review page, examine fields with different confidence levels extracted from a real document.
**Expected:** High confidence = green border, medium = amber border, low = red border, not_found = dashed grey border with muted background. The not_found and low fields must be visually distinguishable.
**Why human:** CSS class application and visual differentiation require browser rendering.

**3. Edit Tracking: Blue Border, Edited Label, Original Value Tooltip**

**Test:** Change the value of any field in the review form.
**Expected:** Field border turns blue immediately. "Edited" text appears below the input. Hovering the field shows a tooltip with the original extracted value.
**Why human:** React Hook Form `formState.dirtyFields` tracking and tooltip display require interactive testing.

**4. Approve Button Enable/Disable Logic**

**Test:** On a pending_review vehicle with empty fields, verify Approve Record is disabled. Enter a 17-character VIN, Year, Make, Model, and Seller Name. Verify button becomes enabled and clicking it approves the record.
**Expected:** Button disabled with tooltip message until all required fields meet criteria. After filling, button activates. After clicking, toast "Record approved — ready for export" appears and status badge updates to Approved.
**Why human:** The 100ms polling loop for `canApprove` computation and button state transitions require live interaction.

**5. Unapprove Workflow**

**Test:** On an approved record, click "Return to Review".
**Expected:** Toast appears confirming return to review. Status badge changes to Pending Review. Approve Record button reappears.
**Why human:** Status state transitions and UI re-renders must be observed in a running browser.

**6. Mobile Responsive Layout**

**Test:** Navigate to the review page at viewport width below 768px (mobile).
**Expected:** PDF preview and form stack vertically (full width). Action buttons (Save, Approve) are sticky at the bottom of the viewport.
**Why human:** Responsive breakpoints and sticky positioning require visual browser verification at mobile viewport size.

### Gaps Summary

No gaps. All 10 truths verified, all 15 artifacts exist and are substantive, all 8 key links confirmed wired, all 6 requirements satisfied, and TypeScript compiles with zero errors. Phase goal is achievable — the remaining items are human UI verification only.

---

_Verified: 2026-04-08_
_Verifier: Claude (gsd-verifier)_
