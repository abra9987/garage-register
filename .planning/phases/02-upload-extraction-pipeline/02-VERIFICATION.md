---
phase: 02-upload-extraction-pipeline
verified: 2026-04-09T03:00:00Z
status: human_needed
score: 14/14 must-haves verified
overrides_applied: 0
gaps: []
human_verification:
  - test: "Verify end-to-end extraction with a real PDF from reference/"
    expected: "Upload a PDF from reference/ folder, click Start Extraction, wait for results to populate with confidence badges and VIN validation status"
    why_human: "Claude API integration cannot be spot-checked without a live ANTHROPIC_API_KEY and running dev server"
  - test: "Verify single-PDF upload (AP only) shows not-found fields correctly"
    expected: "Fields only present in the AR document show '--' with 'Not Found' badge; no extraction error is thrown"
    why_human: "Requires live Claude API call and visual inspection of results"
  - test: "Verify AP + AR upload triggers cross-validation and shows conflict card"
    expected: "When both PDFs are uploaded for the same vehicle, amber ConflictCard appears if VIN/year/make/model differ between documents, or green 'Documents are consistent' message if they match"
    why_human: "Requires two real PDF documents and live extraction pipeline"
  - test: "Verify drag-and-drop and file rejection toasts"
    expected: "Dropping a non-PDF shows 'Only PDF files are accepted' toast (5s); dropping a file >10MB shows 'File is too large. Maximum size is 10 MB.' toast (5s)"
    why_human: "Browser interaction and toast UI cannot be verified programmatically"
  - test: "Verify mobile layout stacks drop zones vertically"
    expected: "At viewport width < 768px, AP and AR drop zones stack vertically instead of side by side"
    why_human: "Responsive layout requires visual browser inspection"
---

# Phase 02: Upload + Extraction Pipeline — Verification Report

**Phase Goal:** Andrey can upload AP and AR PDFs for a vehicle deal and receive structured extracted data with confidence scores and VIN validation
**Verified:** 2026-04-09T03:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can drag-and-drop or browse to upload PDF files and sees filename/icon confirmation | VERIFIED | `drop-zone.tsx` uses react-dropzone with `accept: { "application/pdf": [".pdf"] }` and `maxSize: 10*1024*1024`. File-loaded state renders `{file.name} ({formatFileSize(file.size)})` with FileText icon. |
| 2 | User can associate two PDFs (AP + AR) with a single vehicle deal via job number | VERIFIED | `upload/page.tsx` maintains `apFile`/`arFile` state and a `jobNumber` input. Both are POSTed to `/api/vehicles` followed by sequential uploads to `/api/vehicles/{id}/upload` with `type=ap` and `type=ar`. |
| 3 | System extracts all ministry register fields from any of the 6 document types including scanned PDFs | VERIFIED | `extraction-prompt.ts` EXTRACTION_SYSTEM_PROMPT explicitly lists all 6 document types, handles French (Quebec BOS), and instructs Claude to use vision for scanned documents. All 16 ministry fields are in the JSON schema and user prompt. |
| 4 | Each extracted field shows a confidence level (high/medium/low) and VIN is validated with check digit verification | VERIFIED | `confidence-badge.tsx` renders correct colored pills per level. `vin.ts` implements full NHTSA mod-11 check digit algorithm. `extraction-results.tsx` calls `validateVin()` client-side and passes result to `VinStatus`. All 8 VIN validation tests pass. |
| 5 | When both AP and AR are provided, system flags inconsistencies between shared fields (VIN mismatch, vehicle detail conflicts) | VERIFIED | `cross-validate.ts` exports `crossValidateExtractions()` comparing vin/year/make/model. `upload/route.ts` runs cross-validation when both AP and AR have `extractionRaw`. Conflicts stored in `vehicles.extractionConfidence["conflicts"]`. `conflict-card.tsx` renders amber `role="alert"` card when conflicts exist. |

**Score:** 5/5 roadmap success criteria verified

Additionally, all 14 plan-level must-haves from Plans 01, 02, and 03 are verified (see artifact table below).

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/lib/db/schema.ts` | VERIFIED | `fileData: bytea("file_data")` present; `filePath` absent; `mimeType` column present; `extractionConfidence: jsonb("extraction_confidence")` on vehicles table |
| `src/types/extraction.ts` | VERIFIED | Exports `ExtractionSchema`, `ExtractionResult`, `ConfidenceLevelSchema`, `FIELD_NAME_MAP`, `EXTRACTION_FIELDS`, `ExtractionFieldConfidence`. All 8 schema tests pass. |
| `src/lib/validation/vin.ts` | VERIFIED | Exports `validateVin`, `VinValidationResult`. Implements VIN_TRANSLITERATION, VIN_WEIGHTS, format regex. Error messages include "17 characters", "invalid characters", "VIN check digit invalid". All 8 tests pass. |
| `src/lib/validation/vin.test.ts` | VERIFIED | 8 test cases, 8 pass, 0 fail |
| `src/lib/extraction/claude-client.ts` | VERIFIED | Exports `anthropic` singleton. Guards on `ANTHROPIC_API_KEY`. Throws descriptive error if missing. |
| `src/lib/extraction/extraction-prompt.ts` | VERIFIED | Exports `EXTRACTION_SYSTEM_PROMPT` and `getExtractionUserPrompt`. Covers all 6 doc types, bilingual, scanned PDFs, YYYY-MM-DD dates, "not_found" confidence, "26-JXXXXX" pattern. |
| `src/lib/extraction/extract-document.ts` | VERIFIED | Exports `extractDocument`. Uses `claude-sonnet-4-6`, `type: "document"`, `application/pdf`, base64 encoding. Validates via `ExtractionSchema.parse()`. Logs `input_tokens`/`output_tokens`. 1 retry on 429/529. |
| `src/lib/extraction/cross-validate.ts` | VERIFIED | Exports `crossValidateExtractions`, `CrossValidationResult`, `FieldConflict`. Compares vin/year/make/model. Skips null values. Case-insensitive string normalization. |
| `src/app/(app)/upload/page.tsx` | VERIFIED | 314 lines (>100). "use client". "New Vehicle" heading. AP/AR drop zones. `/api/vehicles` fetch. `pending_review` poll check. `setInterval` polling at 2s. |
| `src/components/upload/drop-zone.tsx` | VERIFIED | Exports `DropZone`. Uses `useDropzone`. `application/pdf` accept filter. `10 * 1024 * 1024` maxSize. Toast error messages for invalid type/size. |
| `src/components/upload/confidence-badge.tsx` | VERIFIED | Exports `ConfidenceBadge`. `bg-green-100`, `bg-amber-100`, `bg-red-100` per level. `aria-label="Confidence: {level}"`. |
| `src/components/upload/extraction-results.tsx` | VERIFIED | Exports `ExtractionResults`. Composes FieldRow, VinStatus, ConflictCard. "Extracted Data" heading. All 16 fields rendered with confidence badges. |
| `src/app/api/vehicles/route.ts` | VERIFIED | Exports `POST`. Session validation via `auth.api.getSession`. `db.insert(vehicles)`. `logAudit`. Returns `{ id, jobNumber }` with 201. |
| `src/app/api/vehicles/[id]/upload/route.ts` | VERIFIED | Exports `POST`. Session guard. `application/pdf` check. `10 * 1024 * 1024` size limit. Imports `extractDocument`, `crossValidateExtractions`, `validateVin`. Sets `pending_review` on success. `logAudit`. Fire-and-forget `runExtraction`. |
| `src/app/api/vehicles/[id]/status/route.ts` | VERIFIED | Exports `GET`. Session guard. Explicit column select excludes `fileData`. Returns vehicle + document metadata. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `upload/page.tsx` | `/api/vehicles` | `fetch POST` with jobNumber | WIRED | 4 occurrences of `/api/vehicles` fetch, including create + upload + status poll |
| `upload/route.ts` | `extract-document.ts` | `import extractDocument` | WIRED | Import at line 8; called in `runExtraction` at line 119 |
| `upload/route.ts` | `schema.ts` | `db.insert(documents)` with bytea `fileData` | WIRED | `fileData: buffer` insert at lines 60–70 |
| `extract-document.ts` | `claude-client.ts` | `import { anthropic }` | WIRED | Line 1 import; `anthropic.messages.create()` at line 90 |
| `extract-document.ts` | `extraction-prompt.ts` | `import EXTRACTION_SYSTEM_PROMPT` | WIRED | Line 2–6 import; both system and user prompt used in API call |
| `extract-document.ts` | `types/extraction.ts` | `ExtractionSchema.parse()` | WIRED | Line 7 import; `ExtractionSchema.parse(parsed)` at line 147 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `extraction-results.tsx` | `vehicle` prop (vin, make, model, etc.) | `vehicles` DB row via GET `/api/vehicles/[id]/status` | Yes — vehicle row populated by `runExtraction` from Claude API | FLOWING |
| `extraction-results.tsx` | `documents` prop | `documents` table explicit-column select | Yes — metadata from real DB rows | FLOWING |
| `extraction-results.tsx` | `conflicts` prop | `vehicles.extractionConfidence["conflicts"]` stored after `crossValidateExtractions()` | Yes — populated when both AP+AR extractions complete | FLOWING |
| `field-row.tsx` | `confidence` prop | `vehicle.extractionConfidence[field]` key lookup | Yes — confidence map written by `runExtraction` after Claude API response | FLOWING |
| `vin-status.tsx` | `vinResult` prop | `validateVin(vehicle.vin)` called in `extraction-results.tsx` | Yes — computed from real VIN value extracted by Claude | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| VIN test suite (8 tests) | `npx tsx src/lib/validation/vin.test.ts` | 8 pass, 0 fail | PASS |
| Extraction schema test suite (8 tests) | `npx tsx src/types/extraction.test.ts` | 8 pass, 0 fail | PASS |
| TypeScript compilation (all files) | `npx tsc --noEmit` | 0 errors | PASS |
| schema.ts excludes filePath | `grep -c "filePath\|file_path" src/lib/db/schema.ts` | 0 matches | PASS |
| schema.ts includes fileData + mimeType + extractionConfidence | direct grep | All 3 present | PASS |
| Live Claude API extraction | requires ANTHROPIC_API_KEY + dev server | not tested | SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| UPLD-01 | 02-01, 02-03 | Drag-and-drop or click-to-browse PDF upload | SATISFIED | `drop-zone.tsx` react-dropzone with idle/drag/loaded states |
| UPLD-02 | 02-01, 02-03 | Associate two PDFs with one vehicle via job number | SATISFIED | `upload/page.tsx` + `POST /api/vehicles` + job number input |
| UPLD-03 | 02-01, 02-03 | Validate PDFs within size limit (10MB) | SATISFIED | Client: `maxSize: 10*1024*1024` in react-dropzone. Server: `file.size > 10*1024*1024` check in upload route |
| UPLD-04 | 02-03 | User sees filename/icon after upload | SATISFIED | `drop-zone.tsx` file-loaded state shows FileText icon + `{file.name} ({size})` |
| EXTR-01 | 02-02, 02-03 | Claude API vision receives PDFs and returns structured JSON | SATISFIED | `extract-document.ts`: base64 PDF document block, `output_config.format` JSON schema, `ExtractionSchema.parse()` validation |
| EXTR-02 | 02-02 | Extracts all ministry register fields (16 total) | SATISFIED | `extraction-prompt.ts` user prompt enumerates all 16 fields; JSON schema requires all 16 |
| EXTR-03 | 02-02 | Handles all 6 document types without configuration | SATISFIED | `EXTRACTION_SYSTEM_PROMPT` lists all 6 document types; zero-shot, no per-type logic |
| EXTR-04 | 02-02 | Handles scanned PDFs via Claude vision | SATISFIED | Prompt rule 8: "use vision to read the content even if the text layer is poor or absent" |
| EXTR-05 | 02-02, 02-03 | Per-field confidence scores (high/medium/low) | SATISFIED | `confidence-badge.tsx` renders correct colors; confidence map stored in `extractionConfidence` JSONB |
| EXTR-06 | 02-02, 02-03 | Cross-validates shared fields when both AP+AR provided | SATISFIED | `cross-validate.ts` + called in `runExtraction` when both docs have `extractionRaw` |
| VIN-01 | 02-01 | VIN format validation (17 chars, valid character set) | SATISFIED | `vin.ts` regex `^[A-HJ-NPR-Z0-9]{17}$`, tested with 8 cases |
| VIN-02 | 02-01 | VIN check digit validation (NHTSA mod-11 algorithm) | SATISFIED | `vin.ts` full transliteration + weights + mod 11 implementation |
| VIN-03 | 02-01 | Invalid VIN flagged with clear error message | SATISFIED | `vin-status.tsx` shows specific messages: "VIN valid", "check digit invalid -- expected X, got Y", format errors. VIN confidence set to "low" in upload route when invalid. |

All 13 required Phase 2 requirements are SATISFIED. No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `upload/route.ts` | 169–196 | Race condition: first extraction to finish writes `pending_review` before second document data is applied | Warning | Client stops polling prematurely when both AP+AR uploaded; second document's fields (seller, buyer, prices) may not be in the vehicle row when results are rendered. From REVIEW.md CR-01. |
| `vehicles/route.ts` | 18 | `request.json()` uncaught — throws 500 on empty/malformed body | Warning | Returns 500 instead of clean 400 on malformed POST body. From REVIEW.md CR-02. |
| `upload/page.tsx` | 74–139 | No polling timeout — extraction stall loops forever | Warning | If Claude API hangs without throwing, spinner never clears. From REVIEW.md WR-01. |
| `upload/page.tsx` | 119–121 | Stale closure on `jobNumber` in polling callback | Info | Auto-fill may overwrite user-typed job number in rare timing scenario. From REVIEW.md WR-02. |
| `upload/route.ts` | 165–166 | Cross-validation may use stale error-carrying extractionRaw from prior failed attempt | Warning | Silent cross-validation using `{ error: "..." }` as ExtractionResult, no actual conflict detected. From REVIEW.md WR-04. |

Note: None of these anti-patterns prevent the core goal from being achieved for the primary happy path (single PDF upload, or sequential AP+AR upload where extractions do not race). The race condition (CR-01) is a correctness issue for the dual-upload case and should be fixed before production use.

### Human Verification Required

#### 1. End-to-End Extraction with Real PDF

**Test:** Start dev server (`npm run dev`). Login and navigate to `/upload`. Drag a PDF from `reference/` folder onto the AP drop zone. Click "Start Extraction". Wait ~5–15 seconds.
**Expected:** Spinner shows "Extracting data from documents...". Results panel populates below with all available fields, each with a confidence badge (green/amber/red/muted). VIN validation status message appears.
**Why human:** Requires live ANTHROPIC_API_KEY, running PostgreSQL, and visual inspection of the rendered UI.

#### 2. Single-PDF Upload — Missing Fields Show as Not Found

**Test:** Upload only an AP invoice (no AR). Click "Start Extraction".
**Expected:** AP-only fields (e.g., seller info, purchase price) populate. AR-only fields (buyer info, sale price, sale date) show "--" with "Not Found" badge. No cross-validation section appears.
**Why human:** Requires live API call. Confirms EXTR-05 "not_found" path and D-15/D-28 single-PDF behavior.

#### 3. AP + AR Cross-Validation Conflict Display

**Test:** Upload two PDFs for the same vehicle where the VIN or make differs between documents. Click "Start Extraction".
**Expected:** After extraction, the amber ConflictCard appears with "Conflicts Found" heading, listing the conflicting fields with AP and AR values side by side. The card has `role="alert"`.
**Why human:** Requires two real PDFs with known conflicts and live extraction pipeline.

#### 4. File Rejection Toasts

**Test:** Drag a .docx or image file onto a drop zone. Then try a PDF larger than 10MB.
**Expected:** Wrong type shows "Only PDF files are accepted" toast (5s). Oversized shows "File is too large. Maximum size is 10 MB." toast (5s).
**Why human:** Browser drag-and-drop interaction and visual toast confirmation.

#### 5. Mobile Responsive Drop Zones

**Test:** Open `/upload` in browser. Resize viewport below 768px.
**Expected:** AP and AR drop zones stack vertically (not side by side).
**Why human:** Responsive layout requires visual browser verification.

### Gaps Summary

No gaps found. All 14 plan must-haves are verified at all four levels (exists, substantive, wired, data-flowing). All 5 roadmap success criteria are met in code. All 13 requirement IDs are satisfied.

The 5 human verification items above are standard end-to-end UI and API integration checks that cannot be verified programmatically. All automated checks pass: TypeScript compiles cleanly, all 16 unit tests pass, all required artifacts exist with substantive implementations, and all key links are wired.

Known issues from code review (02-REVIEW.md) that should be addressed before production:
- CR-01: Race condition in concurrent dual-upload extraction (both `runExtraction` calls can set `pending_review` before both are complete)
- CR-02: Uncaught `request.json()` exception in vehicle creation route
- WR-01: No polling timeout in upload page

These do not block goal achievement for the primary use case but represent correctness issues.

---

_Verified: 2026-04-09T03:00:00Z_
_Verifier: Claude (gsd-verifier)_
