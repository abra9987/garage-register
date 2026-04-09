---
phase: 02-upload-extraction-pipeline
plan: 02
subsystem: extraction
tags: [anthropic-sdk, claude-api, pdf-extraction, structured-output, zod, cross-validation]

# Dependency graph
requires:
  - phase: 02-upload-extraction-pipeline/01
    provides: ExtractionSchema, ConfidenceLevelSchema, FIELD_NAME_MAP types
provides:
  - Anthropic client singleton (claude-client.ts)
  - Extraction system prompt and JSON schema for structured output (extraction-prompt.ts)
  - Core extractDocument() function -- PDF buffer to validated ExtractionResult (extract-document.ts)
  - Cross-validation function for AP + AR document comparison (cross-validate.ts)
affects: [02-upload-extraction-pipeline/03, 03-review-interface]

# Tech tracking
tech-stack:
  added: ["@anthropic-ai/sdk@0.86.1"]
  patterns: ["Manual JSON schema for output_config due to Zod v4 incompatibility with zodOutputFormat", "Retry with exponential backoff for 429/529 errors", "Singleton API client pattern"]

key-files:
  created:
    - src/lib/extraction/claude-client.ts
    - src/lib/extraction/extraction-prompt.ts
    - src/lib/extraction/extract-document.ts
    - src/lib/extraction/cross-validate.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Used manual JSON schema instead of zodOutputFormat() -- Zod v4 z.record() produces additionalProperties:false with empty properties, blocking dynamic confidence map keys"
  - "Fixed confidence keys in JSON schema (all 16 fields enumerated) rather than using open record -- ensures constrained decoding works correctly"

patterns-established:
  - "Extraction library pattern: pure functions receiving Buffer, returning typed results -- no API routes or DB access"
  - "Error classification: ExtractionError with typed code (api_error, parse_error, validation_error, rate_limited, overloaded)"

requirements-completed: [EXTR-01, EXTR-02, EXTR-03, EXTR-04, EXTR-05, EXTR-06]

# Metrics
duration: 4min
completed: 2026-04-09
---

# Phase 02 Plan 02: Claude API Extraction Engine Summary

**Claude Sonnet 4.6 extraction pipeline with structured JSON output, Zod validation, and AP/AR cross-validation for vehicle data**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-09T01:57:02Z
- **Completed:** 2026-04-09T02:01:41Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Built the core AI extraction engine that converts PDF documents into structured vehicle data with per-field confidence scoring
- Anthropic client singleton with env var guard, extraction prompt covering all 6 document types (including French and scanned PDFs), and extractDocument() function with retry logic
- Cross-validation logic compares VIN, year, make, model between AP and AR documents with case-insensitive normalization

## Task Commits

Each task was committed atomically:

1. **Task 1: Anthropic client + extraction prompt + core extract function** - `c8e5789` (feat)
2. **Task 2: Cross-validation logic for AP + AR documents** - `0f76821` (feat)

## Files Created/Modified
- `src/lib/extraction/claude-client.ts` - Singleton Anthropic client initialized from ANTHROPIC_API_KEY env var
- `src/lib/extraction/extraction-prompt.ts` - System prompt for all 6 doc types + hand-written JSON schema for output_config.format
- `src/lib/extraction/extract-document.ts` - Core extractDocument() function: PDF buffer -> Claude API -> validated ExtractionResult
- `src/lib/extraction/cross-validate.ts` - crossValidateExtractions() comparing VIN/year/make/model between AP and AR
- `package.json` - Added @anthropic-ai/sdk dependency
- `package-lock.json` - Lock file updated

## Decisions Made
- Used manual JSON schema for output_config.format instead of zodOutputFormat() -- Zod v4's z.record() type converts to `{ properties: {}, additionalProperties: false }` which prevents Claude from returning any keys in the confidence object. The manual schema enumerates all 16 confidence fields explicitly with enum constraints.
- Fixed confidence schema keys match extraction field names exactly (all required, additionalProperties: false) to leverage constrained decoding for guaranteed valid output.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Zod v4 incompatible with zodOutputFormat() for z.record() schemas**
- **Found during:** Task 1 (extract-document.ts implementation)
- **Issue:** zodOutputFormat() from @anthropic-ai/sdk/helpers/zod converts Zod v4's z.record() to `{ properties: {}, additionalProperties: false }` -- an empty locked object that would reject all confidence keys
- **Fix:** Followed plan's fallback path: wrote manual JSON schema for output_config.format with explicitly enumerated confidence fields, used JSON.parse() + ExtractionSchema.parse() for validation
- **Files modified:** src/lib/extraction/extraction-prompt.ts, src/lib/extraction/extract-document.ts
- **Verification:** TypeScript compiles cleanly, JSON schema structure verified via node test
- **Committed in:** c8e5789 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking -- Zod v4 compatibility)
**Impact on plan:** Plan anticipated this exact scenario (Pitfall 4 in RESEARCH.md) and specified the fallback. No scope creep.

## Issues Encountered
None beyond the anticipated Zod v4 compatibility issue documented above.

## User Setup Required

**External services require manual configuration.** The ANTHROPIC_API_KEY environment variable must be set before extraction can work:
- Source: Anthropic Console -> API Keys -> Create Key (https://console.anthropic.com/settings/keys)
- Add to `.env.local` for development: `ANTHROPIC_API_KEY=sk-ant-...`
- Add to Coolify environment variables for production

## Next Phase Readiness
- Extraction engine ready for use by API routes in Plan 03
- All 4 extraction library files compile and export correctly
- Plan 03 will wire these into API routes with async extraction pattern and status polling

---
*Phase: 02-upload-extraction-pipeline*
*Completed: 2026-04-09*
