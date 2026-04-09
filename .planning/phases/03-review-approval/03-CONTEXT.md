# Phase 3: Review + Approval - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode — recommended answers accepted)

<domain>
## Phase Boundary

Deliver the review and approval interface. Andrey can view extracted data alongside the original PDF, edit any field, see confidence color-coding, and explicitly approve records for export. The review page is the quality gate between extraction and the Garage Register.

</domain>

<decisions>
## Implementation Decisions

### Review Layout & PDF Preview
- **D-29:** Side-by-side layout: PDF preview at 40% width (left), form fields at 60% (right). On mobile (<768px), stack vertically with PDF on top. Matches REVW-01.
- **D-30:** Use react-pdf for in-browser PDF rendering. Shows actual PDF pages, user can scroll through multi-page documents. Dynamic import to avoid SSR issues.
- **D-31:** List-detail navigation pattern. Register page shows vehicles with `pending_review` status. Click opens review page for that vehicle. One vehicle at a time for accuracy.
- **D-32:** Retry button per document — if extraction was poor, user can click "Re-extract" which re-sends PDF to Claude API. Useful for scanned docs.

### Field Editing & Confidence Display
- **D-33:** React Hook Form with all ministry register fields as inputs. Pre-filled from extraction data. Zod validation on save. @hookform/resolvers for integration.
- **D-34:** Confidence color-coding on field borders: green (high), amber/yellow (medium), red (low). "Not found" fields = dashed border + grey background. Reuse ConfidenceBadge component from Phase 2.
- **D-35:** User-edited fields get blue border. Original extraction value shown as tooltip on hover. Audit log entry created for each field change (old value -> new value).
- **D-36:** "Approve Record" button at bottom of form. Disabled until all required fields are filled. Changes vehicle status from `pending_review` to `approved`. Requires explicit click — no auto-approve.

### Approval Flow & Navigation
- **D-37:** Required fields for approval: VIN, Year, Make, Model, and at least one of Seller Name or Buyer Name. Price and date fields are optional (can be added later in register).
- **D-38:** "Unapprove" button returns record to `pending_review` status. Only works on `approved` records (not exported ones). Audit log records unapproval.
- **D-39:** Approval feedback: sonner toast "Record approved — ready for export". Vehicle moves from review pending list.
- **D-40:** No keyboard shortcuts in v1. Large click targets and visual cues are sufficient for Andrey's non-technical workflow.

### Claude's Discretion
- PDF preview zoom level and page navigation controls
- Form field ordering (recommend matching Garage Register column order)
- Loading states for PDF rendering and re-extraction
- Exact required field validation messages

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/upload/confidence-badge.tsx` — ConfidenceBadge component for high/medium/low/not_found display
- `src/components/upload/vin-status.tsx` — VIN validation status display
- `src/components/upload/conflict-card.tsx` — Cross-document conflict display
- `src/components/upload/field-row.tsx` — Field display with label and confidence
- `src/lib/extraction/extract-document.ts` — extractDocument() for re-extraction
- `src/lib/validation/vin.ts` — validateVin() for inline VIN validation
- `src/lib/audit.ts` — logAudit() and logAuditBatch() for field edit tracking
- `src/types/extraction.ts` — ExtractionResult, FIELD_NAME_MAP, EXTRACTION_FIELDS
- `src/lib/db/schema.ts` — vehicles, documents tables with all fields

### Established Patterns
- API routes with auth.api.getSession() guard
- apiSuccess/apiError response wrappers
- Tailwind v4 + shadcn/ui components
- Sonner toasts for user feedback
- Async operations with status polling

### Integration Points
- Review page at `/vehicles/[id]/review` (new route)
- API routes: PUT `/api/vehicles/[id]` (update fields), POST `/api/vehicles/[id]/approve`
- Sidebar nav "Register" item links to vehicle list with pending_review filter
- Package additions needed: `react-pdf`, `@hookform/resolvers`

</code_context>

<specifics>
## Specific Ideas

- Field order should match the Garage Register XLSX column order (Job#, VIN, Year, Make, Model, Color, Odometer, Seller, Buyer, dates, prices)
- The review page is the MOST important screen — Andrey spends 90% of his time here
- Color-coding must be immediately obvious — no legend needed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-review-approval*
*Context gathered: 2026-04-09 via autonomous mode*
