# Phase 2: Upload + Extraction Pipeline - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the PDF upload interface and Claude API extraction pipeline. Andrey can upload AP and AR PDFs for a vehicle deal, the system extracts all ministry register fields with per-field confidence scores, validates VIN format and check digit, and cross-validates shared fields when both documents are provided. The vehicle enters `pending_review` status ready for Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Upload Flow UX
- **D-13:** Single page flow — upload zone at top, extracted results appear below. No multi-step wizard. Matches "minimal clicks" principle.
- **D-14:** Two labeled drop zones on one page — "AP Invoice (Purchase)" and "AR Invoice (Sale)" side by side. Job number auto-extracted from PDF, user confirms.
- **D-15:** Allow single-PDF upload — extract what's available, mark missing fields. AR or AP can be added later. Most fields come from AP anyway.
- **D-16:** PDF files stored as PostgreSQL bytea column — ~200KB each, ~50/month = ~10MB/month. Simpler backup/restore. Documents table `filePath` column replaced with `fileData` bytea.

### Extraction Pipeline Architecture
- **D-17:** Send PDFs directly to Claude API as base64-encoded `document` content blocks. No preprocessing, no image conversion. Claude handles OCR/vision internally.
- **D-18:** Use Claude Sonnet 4.6 (`claude-sonnet-4-6`) for extraction. Best price/performance for structured data. OMVIC forms need Sonnet-level reasoning. User explicitly chose this model.
- **D-19:** Single structured prompt handles all 6 document types. Returns typed JSON matching vehicle fields + confidence per field. No per-type prompt templates. Zod schema for response validation.
- **D-20:** Async extraction with status polling. Upload returns immediately, extraction runs server-side. UI shows "Extracting..." spinner with vehicle status `extracting`. Avoids request timeout on large/scanned PDFs.

### Confidence Scoring & Data Model
- **D-21:** Claude self-reports confidence per field (`high`/`medium`/`low`) — prompt instructs this. Stored in `extraction_raw` JSONB alongside raw values.
- **D-22:** Extracted values parsed into `vehicles` table columns immediately. Raw JSON preserved in `documents.extraction_raw` for debugging/re-extraction. New `extraction_confidence` JSONB column on vehicles table for per-field confidence map.
- **D-23:** "Not found" fields: NULL in vehicle column + `"not_found"` in confidence map. UI (Phase 3) distinguishes "not found" from "low confidence" visually.
- **D-24:** Extraction failure: vehicle stays in `extracting` status with error in extraction_raw. User sees "Extraction failed" with retry button. No partial data written. Audit log records failure.

### VIN Validation & Cross-Document Checks
- **D-25:** VIN validation runs immediately after extraction — format (17 chars, valid charset) and check digit (position 9, NHTSA algorithm). Result stored with confidence data.
- **D-26:** Invalid VIN flagged as `low` confidence with specific error message ("VIN check digit invalid — expected X, got Y"). Does not block — OCR errors common, user fixes in review.
- **D-27:** Cross-validation runs automatically when both AP + AR are provided. Compares VIN, year, make, model between documents. Conflicts flagged with both values shown for user resolution in review.
- **D-28:** Single-PDF upload: extract and validate what's available, skip cross-validation. When second PDF added later, trigger cross-validation automatically.

### Claude's Discretion
- Exact prompt wording for extraction (optimize iteratively with reference PDFs)
- Polling interval for extraction status (recommend 2-3 seconds)
- Upload drop zone visual design (react-dropzone styling with shadcn/Tailwind)
- Error retry strategy for Claude API failures (recommend 1 retry with backoff)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/db/schema.ts` — vehicles, documents, auditLog tables already defined with correct fields
- `src/lib/audit.ts` — logAudit() and logAuditBatch() ready for use
- `src/lib/api-response.ts` — apiSuccess/apiError helpers for consistent API responses
- `src/types/api.ts` — ApiResponse<T> type for frontend/backend contract
- `src/lib/auth.ts` — Better Auth configured, session validation available
- shadcn/ui components: button, card, input, skeleton, sonner (toast), tooltip

### Established Patterns
- API routes at `src/app/api/` — Next.js route handlers
- Database: Drizzle ORM with postgres.js driver, max 3 connections
- Styling: Tailwind v4, shadcn/ui components, clsx + tailwind-merge
- Error handling: apiSuccess/apiError wrappers, global error boundary
- Auth: Better Auth with session validation on protected routes

### Integration Points
- New page at `/vehicles/new` or similar (sidebar "New Vehicle" nav item from D-07)
- API routes: `/api/vehicles` (create), `/api/vehicles/[id]/upload` (PDF), `/api/vehicles/[id]/extract` (trigger)
- Documents table needs schema migration: `filePath` → `fileData` bytea, add `mimeType`
- Vehicles table needs: `extraction_confidence` JSONB column
- Package additions needed: `@anthropic-ai/sdk`, `react-dropzone`

</code_context>

<specifics>
## Specific Ideas

- Upload page should feel like a single "New Deal" workflow — not a file manager
- Job number is the natural identifier Andrey thinks in — prominently displayed
- Reference PDFs in `reference/` folder can be used for prompt development and testing
- Claude Sonnet 4.6 specifically chosen by user for extraction model

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-upload-extraction-pipeline*
*Context gathered: 2026-04-08*
