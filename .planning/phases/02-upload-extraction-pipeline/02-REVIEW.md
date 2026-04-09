---
phase: 02-upload-extraction-pipeline
reviewed: 2026-04-09T02:14:03Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - src/app/(app)/upload/page.tsx
  - src/app/api/vehicles/route.ts
  - src/app/api/vehicles/[id]/upload/route.ts
  - src/app/api/vehicles/[id]/status/route.ts
  - src/components/upload/confidence-badge.tsx
  - src/components/upload/conflict-card.tsx
  - src/components/upload/drop-zone.tsx
  - src/components/upload/extraction-results.tsx
  - src/components/upload/extraction-status.tsx
  - src/components/upload/field-row.tsx
  - src/components/upload/vin-status.tsx
  - src/lib/db/schema.ts
  - src/lib/extraction/claude-client.ts
  - src/lib/extraction/cross-validate.ts
  - src/lib/extraction/extract-document.ts
  - src/lib/extraction/extraction-prompt.ts
  - src/lib/validation/vin.ts
  - src/lib/validation/vin.test.ts
  - src/types/extraction.ts
  - src/types/extraction.test.ts
findings:
  critical: 2
  warning: 5
  info: 5
  total: 12
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-09T02:14:03Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Reviewed the full upload and extraction pipeline: the upload page, three API routes, six UI components, the Claude extraction client, cross-validation, VIN validation, schema definitions, and test files.

The overall design is solid. Authentication is applied consistently, file validation is server-side (T-02-09), PDF bytes are excluded from polling queries (Pitfall 3), and the VIN check-digit algorithm is correctly implemented. The Zod validation on Claude's response is a good safety net.

Two critical issues were found: a race condition in the concurrent-upload background extraction that can result in a vehicle being marked `pending_review` before the second document's data has been applied, and an unhandled JSON parse exception in the vehicle creation route. Five warnings cover an unbounded polling loop with no timeout, a stale closure in the polling callback, missing authorization scoping on the status endpoint, cross-validation using potentially stale extraction data on retry, and a dead-code guard in the field-mapping loop.

---

## Critical Issues

### CR-01: Race condition — first extraction to complete sets `pending_review`, second may overwrite or be ignored

**File:** `src/app/api/vehicles/[id]/upload/route.ts:169–196`

**Issue:** When AP and AR files are uploaded sequentially (as the client does), two background `runExtraction` calls run concurrently. Both independently query `allDocs` to decide whether both documents exist and whether to run cross-validation. The first extraction to complete proceeds to line 192 and writes `status: "pending_review"` unconditionally, even if the second extraction has not yet stored its `extractionRaw`. The client polls, sees `pending_review`, stops polling, and renders results — but the second document's fields (seller, buyer, price, etc.) have not yet been written to the vehicle row. Depending on which document finishes first (AP or AR), the displayed data will be missing roughly half the fields.

The root cause is that both tasks run the "check if ready to finalize" logic independently, without coordination. The second task will eventually also set `pending_review` and write its fields, but the client has already stopped polling and the user is already looking at incomplete data.

**Fix:** Only the last extraction to complete should finalize the vehicle. Replace the unconditional status update with an atomic "finalize only when both docs have extraction data" pattern:

```typescript
// After storing extractionRaw for this document, re-fetch all docs
const allDocs = await db
  .select({ id: documents.id, type: documents.type, extractionRaw: documents.extractionRaw })
  .from(documents)
  .where(eq(documents.vehicleId, vehicleId));

const apDoc = allDocs.find((d) => d.type === "ap" && d.extractionRaw);
const arDoc = allDocs.find((d) => d.type === "ar" && d.extractionRaw);

// Determine if we should finalize: either single-doc upload, or both docs done
const expectedDocTypes = allDocs.map((d) => d.type);
const hasBothUploaded = expectedDocTypes.includes("ap") && expectedDocTypes.includes("ar");
const shouldFinalize = hasBothUploaded ? (apDoc !== undefined && arDoc !== undefined) : true;

if (!shouldFinalize) {
  // Other document hasn't been extracted yet — leave status as "extracting"
  return;
}

// ... run cross-validation, then set status to "pending_review"
```

This ensures only the second-to-finish extraction triggers the final status change.

---

### CR-02: Unhandled exception on malformed JSON body in POST /api/vehicles

**File:** `src/app/api/vehicles/route.ts:18`

**Issue:** `await request.json()` will throw a `SyntaxError` if the request body is empty or not valid JSON (e.g., the client sends an empty body or `Content-Type: application/json` with a truncated payload). This exception is not caught, so Next.js handles it as an unhandled server error and returns a 500 response. The client in `upload/page.tsx` checks `!createRes.ok` and shows the error, but a 500 with a stack trace in logs is worse than a clean 400.

**Fix:**
```typescript
let body: Record<string, unknown> = {};
try {
  body = await request.json();
} catch {
  // Missing or malformed body — treat jobNumber as null
}
const jobNumber = typeof body.jobNumber === "string" ? body.jobNumber : null;
```

---

## Warnings

### WR-01: No polling timeout — extraction can silently stall forever

**File:** `src/app/(app)/upload/page.tsx:74–139`

**Issue:** The polling loop started in `pollStatus` runs every 2 seconds indefinitely until the vehicle status becomes `pending_review` or an error marker appears in the database. If the background extraction crashes after storing the document but before writing `extractionRaw` (e.g., the Node.js process is OOM-killed or Claude API hangs without throwing), neither the success branch (line 99) nor the error branch (line 127) will ever fire. The user sees the spinner forever with no way to recover other than refreshing the page.

**Fix:** Add a maximum poll duration and transition to `failed` when it expires:
```typescript
const POLL_TIMEOUT_MS = 120_000; // 2 minutes
const pollStart = Date.now();

pollingRef.current = setInterval(async () => {
  if (Date.now() - pollStart > POLL_TIMEOUT_MS) {
    clearInterval(pollingRef.current!);
    pollingRef.current = null;
    setStatus("failed");
    toast.error("Extraction timed out. Please try again.", { duration: Infinity });
    return;
  }
  // ... existing poll logic
}, 2000);
```

---

### WR-02: Stale closure in `pollStatus` — `jobNumber` auto-fill uses captured-at-creation value

**File:** `src/app/(app)/upload/page.tsx:119–121`

**Issue:** `pollStatus` is wrapped in `useCallback` with `[jobNumber]` as a dependency (line 141). Every time the user types in the Job Number input, a new `pollStatus` function is created — but the *active* `setInterval` was registered with the *previous* `pollStatus` closure. The interval callback closed over the old `jobNumber` value. So when the poll at line 119 checks `if (vehicle.jobNumber && !jobNumber)`, it reads the stale `jobNumber` from the time extraction started, not the current input value.

In practice this means: if the user types something in the Job Number field after clicking "Start Extraction," the auto-fill guard may not correctly detect that the field is already populated, potentially overwriting what the user typed.

**Fix:** Replace the `jobNumber` state read in the callback with a ref so the interval always sees the current value:
```typescript
const jobNumberRef = useRef(jobNumber);
useEffect(() => { jobNumberRef.current = jobNumber; }, [jobNumber]);

// In pollStatus, remove jobNumber from the dependency array and use:
if (vehicle.jobNumber && !jobNumberRef.current) {
  setJobNumber(vehicle.jobNumber);
}
```
This eliminates the need to re-create the polling function on each keystroke.

---

### WR-03: No ownership check on GET /api/vehicles/[id]/status

**File:** `src/app/api/vehicles/[id]/status/route.ts:29–52`

**Issue:** The route validates that a session exists (line 25) but does not verify that the authenticated user owns the vehicle being queried. Any authenticated user who knows (or guesses) a valid vehicle UUID can retrieve its full extraction data, including seller/buyer names, addresses, VINs, and prices — all personally identifiable business data. The vehicles table has no `userId` or `createdBy` column, so there is currently no schema-level way to enforce this. For the current single-user MVP this is low-risk, but it is an authorization gap and the T-02-11 comment in the file implies information disclosure was considered.

**Fix (short-term):** Add a `createdBy` column to the vehicles table and filter by it on every vehicle query:
```typescript
// In schema.ts, add to vehicles:
createdBy: text("created_by").notNull().references(() => user.id),

// In status/route.ts:
const vehicleResult = await db
  .select()
  .from(vehicles)
  .where(and(eq(vehicles.id, id), eq(vehicles.createdBy, session.user.id)))
  .limit(1);
```

---

### WR-04: Cross-validation may use stale extraction data from a previous failed attempt

**File:** `src/app/api/vehicles/[id]/upload/route.ts:155–177`

**Issue:** At line 165–166, `apDoc` and `arDoc` are found with `allDocs.find((d) => d.type === "ap" && d.extractionRaw)`. If the same vehicle had a prior failed upload (where `extractionRaw` was set to `{ error: "..." }` — see line 219–222 of the same file), `find()` will return that error-carrying document as a match because `extractionRaw` is truthy. The subsequent `crossValidateExtractions` call at line 170 will receive `{ error: "..." }` cast as `ExtractionResult`, bypassing Zod validation, and `crossValidateExtractions` will silently access `apResult.vin` (which is `undefined`) on the error object. The cross-validation then skips all fields (since both values are `null`/`undefined`) and reports no conflicts — masking a data integrity issue.

**Fix:** Distinguish error documents from valid extraction documents by checking for the absence of an `error` key:
```typescript
const apDoc = allDocs.find(
  (d) => d.type === "ap" && d.extractionRaw && !("error" in (d.extractionRaw as object))
);
const arDoc = allDocs.find(
  (d) => d.type === "ar" && d.extractionRaw && !("error" in (d.extractionRaw as object))
);
```

---

### WR-05: Dead-code guard `snakeKey !== "confidence"` in field mapping loop

**File:** `src/app/api/vehicles/[id]/upload/route.ts:131–136`

**Issue:** The loop at line 131 iterates over `Object.entries(FIELD_NAME_MAP)`. `FIELD_NAME_MAP` in `src/types/extraction.ts` does not contain a `confidence` key — the map has exactly 16 data-field entries. Therefore the guard `snakeKey !== "confidence"` at line 133 can never be true and will never filter anything. This dead guard implies `confidence` should be excluded here, but it never appears in the loop iteration. This misleads future maintainers into thinking the loop processes something called `confidence` that needs filtering.

**Fix:** Remove the dead guard and add a comment clarifying that `confidence` is handled separately:
```typescript
for (const [snakeKey, camelKey] of Object.entries(FIELD_NAME_MAP)) {
  // FIELD_NAME_MAP contains only data fields — confidence is mapped separately below
  const value = result[snakeKey as keyof ExtractionResult];
  if (value !== undefined) {
    vehicleUpdate[camelKey] = value;
  }
  const conf = result.confidence[snakeKey];
  if (conf) {
    confidenceMap[camelKey] = conf;
  }
}
```

---

## Info

### IN-01: Null VIN does not get explicit "not_found" confidence override on the server

**File:** `src/app/api/vehicles/[id]/upload/route.ts:145–151`

**Issue:** When `result.vin` is `null` (field not found in document), `validateVin(null)` returns `{ valid: false, error: "VIN is empty" }`. The condition `if (!vinResult.valid && result.vin)` evaluates `result.vin` as falsy and skips both branches — neither "low" nor any explicit override is written to `confidenceMap["vin"]`. The VIN confidence for null VINs is whatever Claude returned in its confidence object (expected to be "not_found"), but there is no server-side enforcement. If Claude returns "medium" for a null VIN (unlikely but possible), the UI will show a medium badge with a `null` value.

**Fix:**
```typescript
if (result.vin === null) {
  confidenceMap["vin"] = "not_found";
} else if (!vinResult.valid) {
  confidenceMap["vin"] = "low";
  confidenceMap["vinValidation"] = vinResult.error || "VIN invalid";
} else {
  confidenceMap["vinValidation"] = "valid";
}
```

---

### IN-02: `output_config` API option should be verified against installed SDK version

**File:** `src/lib/extraction/extract-document.ts:113`

**Issue:** The Anthropic API call passes `output_config: { format: EXTRACTION_JSON_SCHEMA }`. The `@anthropic-ai/sdk` is pinned to `^0.85.x` in CLAUDE.md. The structured JSON output feature was introduced under `betas` and/or specific parameter names that have changed across SDK releases. If `output_config` is not the correct parameter name for the installed SDK version, Claude will respond with free-form text rather than structured JSON, causing a JSON parse failure on every extraction. The code has no test that verifies the API call shape at integration level.

**Fix:** Run a one-off integration test against a sample PDF with a real API key and verify `response.content[0].type === "text"` contains valid JSON. Confirm the parameter name in the SDK changelog for the installed version (`npm show @anthropic-ai/sdk version`).

---

### IN-03: `jobNumber` input validation — no length or pattern check server-side

**File:** `src/app/api/vehicles/route.ts:19`

**Issue:** `body.jobNumber` is used directly without a length or format check. The DB column is `varchar(20)`, which will cause a DB error (not a clean 400) if a string longer than 20 characters is submitted. CLAUDE.md documents the pattern `26-JXXXXX` but there is no format enforcement here.

**Fix:** Add a lightweight validation before the DB insert:
```typescript
const jobNumber = typeof body.jobNumber === "string" && body.jobNumber.length <= 20
  ? body.jobNumber.trim() || null
  : null;
```

---

### IN-04: Three-way prompt duplication — field list must be kept in sync across system prompt, user prompt, and JSON schema

**File:** `src/lib/extraction/extraction-prompt.ts:1–64`

**Issue:** The list of extractable fields appears in three separate places: the system prompt (implicit in rule descriptions), the user prompt's explicit field list (lines 44–63), and the `EXTRACTION_JSON_SCHEMA` (lines 78–202). Adding a new field (e.g., "license plate") requires updates in all three locations. There is no automated check to ensure they stay in sync.

**Fix:** Add an inline comment flagging the coupling, and consider generating the user prompt field list programmatically from `EXTRACTION_FIELDS` in `src/types/extraction.ts` or from `FIELD_NAME_MAP` keys, so at least the user prompt stays in sync with the type definitions automatically.

---

### IN-05: `console.log` in production extraction path

**File:** `src/lib/extraction/extract-document.ts:119–122`
**File:** `src/app/api/vehicles/[id]/upload/route.ts:207–209`

**Issue:** Multiple `console.log` calls in the production extraction path log token usage and completion messages. For a single-user app on a small server this is low risk, but for regulatory audit purposes (the Garage Register is a regulatory document), important operational events should go through a structured logging channel rather than stdout. Token cost logging is also best tracked in the audit log or a metrics table rather than console.

**Fix:** For now, acceptable at MVP scale. In a follow-up phase, consider routing extraction events through `logAudit` or a lightweight structured logger to consolidate the audit trail.

---

_Reviewed: 2026-04-09T02:14:03Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
