---
phase: 02-upload-extraction-pipeline
plan: 01
subsystem: database, validation
tags: [drizzle, bytea, zod, vin, extraction, postgresql]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: "Drizzle schema with vehicles and documents tables, PostgreSQL connection"
provides:
  - "bytea PDF storage column on documents table (replaces filePath)"
  - "mimeType column on documents table"
  - "extractionConfidence JSONB column on vehicles table"
  - "ExtractionSchema Zod schema for Claude API response validation"
  - "FIELD_NAME_MAP for snake_case API to camelCase DB column mapping"
  - "validateVin() with format check and NHTSA check digit algorithm"
affects: [02-upload-extraction-pipeline, 03-review-approval-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: ["customType for Drizzle bytea column", "Zod enum for confidence levels", "node:test for unit testing"]

key-files:
  created:
    - src/types/extraction.ts
    - src/types/extraction.test.ts
    - src/lib/validation/vin.ts
    - src/lib/validation/vin.test.ts
  modified:
    - src/lib/db/schema.ts

key-decisions:
  - "Used Drizzle customType for bytea since drizzle-orm/pg-core does not export a built-in bytea function"
  - "ExtractionFieldConfidenceSchema uses optional values to allow partial confidence maps"
  - "Applied schema migration via direct SQL ALTER statements since drizzle-kit push required interactive TTY prompts for column conflict resolution"

patterns-established:
  - "customType<{ data: Buffer }> pattern for binary columns in Drizzle"
  - "Zod schemas as shared contracts between API responses and database storage"
  - "node:test + node:assert/strict for unit tests (no external test framework)"

requirements-completed: [VIN-01, VIN-02, VIN-03, UPLD-03]

# Metrics
duration: 5min
completed: 2026-04-09
---

# Phase 02 Plan 01: Schema + Extraction Types + VIN Validation Summary

**Drizzle schema migrated to bytea PDF storage with extraction confidence JSONB, Zod type contracts for Claude API extraction pipeline, and VIN format + check digit validator with 16 passing tests**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-09T01:49:05Z
- **Completed:** 2026-04-09T01:54:55Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Documents table migrated from filePath varchar to fileData bytea for direct PDF binary storage (D-16)
- Extraction Zod schemas define the contract between Claude API structured output and database columns with per-field confidence levels
- VIN validation handles format check (17 chars, no I/O/Q), check digit algorithm (NHTSA mod 11), and returns specific error messages for each failure mode
- Database schema pushed and verified in sync with drizzle-kit

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration + extraction types** - `aa52828` (feat)
2. **Task 2: VIN validation with tests** - `b7beb3d` (feat)
3. **Task 3: Push schema to database** - no code commit (DB-only operation, schema code in Task 1)

## Files Created/Modified
- `src/lib/db/schema.ts` - Updated documents table (fileData bytea, mimeType), vehicles table (extractionConfidence JSONB), added customType for bytea
- `src/types/extraction.ts` - ExtractionSchema, ConfidenceLevelSchema, FIELD_NAME_MAP, EXTRACTION_FIELDS
- `src/types/extraction.test.ts` - 8 test cases for Zod schema validation
- `src/lib/validation/vin.ts` - validateVin() with format + check digit validation
- `src/lib/validation/vin.test.ts` - 8 test cases covering valid VINs, edge cases, error messages

## Decisions Made
- Used Drizzle `customType` for bytea because `drizzle-orm/pg-core` does not export a standalone `bytea()` function. The customType handles Buffer to/from driver conversion.
- Made `ExtractionFieldConfidenceSchema` values optional (`.optional()`) because not all fields will always have confidence reported, allowing partial confidence maps.
- Applied schema migration via direct SQL ALTER statements instead of `drizzle-kit push` because push required interactive TTY prompts for column conflict resolution (dropping file_path, adding file_data). Verified sync with `drizzle-kit push` after -- "No changes detected".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Drizzle bytea type not available as built-in export**
- **Found during:** Task 1 (Schema migration)
- **Issue:** `bytea` is not exported from `drizzle-orm/pg-core` -- plan suggested importing it but it does not exist
- **Fix:** Used `customType<{ data: Buffer }>` with explicit `dataType()`, `toDriver()`, and `fromDriver()` implementations as suggested in plan fallback
- **Files modified:** src/lib/db/schema.ts
- **Verification:** `drizzle-kit push` shows "No changes detected" -- schema matches database
- **Committed in:** aa52828

**2. [Rule 1 - Bug] ExtractionFieldConfidenceSchema rejected partial confidence maps**
- **Found during:** Task 1 (Extraction type tests)
- **Issue:** `z.record(z.enum(EXTRACTION_FIELDS), ConfidenceLevelSchema)` in Zod v4 validates all enum keys, causing undefined values for missing keys to fail validation
- **Fix:** Added `.optional()` to the record value type
- **Files modified:** src/types/extraction.ts
- **Verification:** Test "accepts valid field confidence map" passes with partial input
- **Committed in:** aa52828

**3. [Rule 3 - Blocking] drizzle-kit push requires interactive TTY for column conflicts**
- **Found during:** Task 3 (Push schema to database)
- **Issue:** `drizzle-kit push` prompts interactively when detecting column renames/drops, fails in non-TTY environment
- **Fix:** Applied direct SQL ALTER statements (DROP file_path, ADD file_data bytea, ADD mime_type, ADD extraction_confidence) after confirming documents table was empty
- **Files modified:** None (database-only)
- **Verification:** `drizzle-kit push --force` returns "No changes detected" confirming sync
- **Committed in:** N/A (DB operation only)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All auto-fixes necessary for correct operation. No scope creep. Plan's fallback guidance followed for bytea customType.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema foundation ready for Plan 02 (extraction pipeline) and Plan 03 (upload API)
- ExtractionSchema and FIELD_NAME_MAP provide the contract between Claude API responses and database storage
- validateVin() ready for post-extraction VIN validation (D-25, D-26)
- Documents table accepts bytea PDF storage for direct binary upload

---
*Phase: 02-upload-extraction-pipeline*
*Completed: 2026-04-09*
