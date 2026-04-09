# Phase 2: Upload + Extraction Pipeline - Research

**Researched:** 2026-04-08
**Domain:** PDF upload, Claude API vision extraction, VIN validation, async server-side processing
**Confidence:** HIGH

## Summary

This phase builds the core value pipeline: PDF upload, AI-powered data extraction, and VIN validation. The implementation combines react-dropzone for the upload UX, Next.js App Router route handlers for file reception, PostgreSQL bytea storage, the Anthropic TypeScript SDK with structured JSON output via `output_config` + Zod, and a pure-TypeScript VIN check digit validator.

The Anthropic API now supports native structured JSON output via `output_config.format` with `json_schema` type -- this is the preferred approach over the older tool_use workaround. Combined with the SDK's `zodOutputFormat()` helper and `client.messages.parse()`, this gives type-safe, validated extraction results with zero parsing boilerplate. PDFs are sent as base64-encoded `document` content blocks -- Claude handles OCR internally for scanned documents.

**Primary recommendation:** Use `output_config` with `zodOutputFormat()` for extraction, store PDFs as PostgreSQL bytea, implement async extraction with a status polling pattern, and hand-roll VIN validation (17 lines of code, no library needed).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-13:** Single page flow -- upload zone at top, extracted results appear below. No multi-step wizard.
- **D-14:** Two labeled drop zones on one page -- "AP Invoice (Purchase)" and "AR Invoice (Sale)" side by side. Job number auto-extracted from PDF, user confirms.
- **D-15:** Allow single-PDF upload -- extract what's available, mark missing fields. AR or AP can be added later.
- **D-16:** PDF files stored as PostgreSQL bytea column -- ~200KB each, ~50/month = ~10MB/month.
- **D-17:** Send PDFs directly to Claude API as base64-encoded document content blocks. No preprocessing.
- **D-18:** Use Claude Sonnet 4.6 (`claude-sonnet-4-6`) for extraction.
- **D-19:** Single structured prompt handles all 6 document types. Returns typed JSON + confidence per field. No per-type templates. Zod schema for response validation.
- **D-20:** Async extraction with status polling. Upload returns immediately. UI shows "Extracting..." spinner.
- **D-21:** Claude self-reports confidence per field (high/medium/low).
- **D-22:** Extracted values parsed into vehicles table columns immediately. Raw JSON in documents.extraction_raw.
- **D-23:** "Not found" fields: NULL in vehicle column + "not_found" in confidence map.
- **D-24:** Extraction failure: vehicle stays in extracting status with error. No partial data written.
- **D-25:** VIN validation runs immediately after extraction -- format + check digit.
- **D-26:** Invalid VIN flagged as low confidence with specific error message. Does not block.
- **D-27:** Cross-validation runs automatically when both AP + AR provided.
- **D-28:** Single-PDF upload: extract and validate, skip cross-validation. Second PDF triggers it later.

### Claude's Discretion
- Exact prompt wording for extraction (optimize iteratively with reference PDFs)
- Polling interval for extraction status (recommend 2-3 seconds)
- Upload drop zone visual design (react-dropzone styling with shadcn/Tailwind)
- Error retry strategy for Claude API failures (recommend 1 retry with backoff)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UPLD-01 | Drag-and-drop or click-to-browse PDF files | react-dropzone v15 provides headless drag-and-drop with file type filtering |
| UPLD-02 | Associate two PDFs (AP + AR) with one vehicle deal via job number | Two labeled drop zones, job number auto-extracted from PDF by Claude |
| UPLD-03 | Validate uploaded files are PDFs and within size limit (10MB) | react-dropzone `accept` and `maxSize` props; Next.js default 10MB body limit |
| UPLD-04 | User sees filename and icon after upload | react-dropzone `acceptedFiles` state + shadcn Card component |
| EXTR-01 | Send PDFs to Claude API vision and receive structured JSON | Anthropic SDK `document` content blocks + `output_config` with `zodOutputFormat()` |
| EXTR-02 | Extract all ministry register fields | Zod schema covers all 14+ fields from vehicles table |
| EXTR-03 | Handle all 6 document types without configuration | Single prompt with instructions for all formats; Claude vision handles layout variance |
| EXTR-04 | Handle scanned PDFs without text layer | Claude converts each PDF page to image + text extraction internally |
| EXTR-05 | Per-field confidence scores (high/medium/low) | Prompt instructs Claude to self-report confidence; Zod schema includes confidence map |
| EXTR-06 | Cross-validate shared fields when both AP and AR provided | Server-side comparison of VIN, year, make, model after both extractions complete |
| VIN-01 | Validate VIN format (17 characters, valid character set) | Pure TypeScript regex validation: `/^[A-HJ-NPR-Z0-9]{17}$/` |
| VIN-02 | Validate VIN check digit (position 9, NHTSA algorithm) | Transliteration table + position weights + mod 11; 17 lines of TypeScript |
| VIN-03 | Invalid VIN flagged with clear error message | Specific messages: "check digit invalid -- expected X, got Y" |
</phase_requirements>

## Standard Stack

### Core (New Dependencies for Phase 2)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | ^0.86.1 | Claude API client | Official TypeScript SDK. Native PDF `document` content blocks. `zodOutputFormat()` + `messages.parse()` for type-safe structured output. | [VERIFIED: npm registry]
| react-dropzone | ^15.0.0 | Drag-and-drop upload | Headless -- style with Tailwind/shadcn. 5M+ weekly downloads. v15 released Feb 2026, supports React 19. | [VERIFIED: npm registry]

### Already Installed (from Phase 1)
| Library | Version | Purpose |
|---------|---------|---------|
| zod | ^4.3.6 | Schema validation -- shared between extraction response and API validation | [VERIFIED: package.json]
| drizzle-orm | ^0.45.2 | Database ORM with bytea column support | [VERIFIED: package.json]
| postgres | ^3.4.9 | PostgreSQL driver | [VERIFIED: package.json]
| sonner | ^2.0.7 | Toast notifications for upload/extraction feedback | [VERIFIED: package.json]
| lucide-react | ^1.7.0 | Icons for file type, status indicators | [VERIFIED: package.json]

### Not Needed
| Problem | Don't Use | Why |
|---------|-----------|-----|
| OCR / text extraction | Tesseract, pdf-parse, pdfjs-dist | Claude vision handles OCR internally via document content blocks |
| VIN validation | vin.js, vin-validator npm packages | Algorithm is 17 lines of TypeScript -- no dependency justified |
| Structured output | Tool use workaround | Native `output_config.format` with `json_schema` is now GA -- use that instead |

**Installation:**
```bash
npm install @anthropic-ai/sdk react-dropzone
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    (app)/
      upload/
        page.tsx              # Upload page with drop zones + extraction results
    api/
      vehicles/
        route.ts              # POST: create vehicle record
        [id]/
          upload/
            route.ts          # POST: receive PDF, store in DB, trigger extraction
          extract/
            route.ts          # POST: trigger extraction (re-extract)
          status/
            route.ts          # GET: poll extraction status + results
  lib/
    extraction/
      claude-client.ts        # Anthropic SDK client singleton
      extraction-prompt.ts    # System prompt + schema for structured extraction
      extract-document.ts     # Core extraction logic: PDF -> Claude -> parsed data
      cross-validate.ts       # Compare AP vs AR extracted fields
    validation/
      vin.ts                  # VIN format + check digit validation
    db/
      schema.ts               # Updated with bytea + extraction_confidence columns
  types/
    extraction.ts             # Zod schemas for extraction response, confidence map
```

### Pattern 1: Anthropic Structured Output with Zod
**What:** Use `output_config` with `zodOutputFormat()` for guaranteed-valid JSON extraction
**When to use:** Every Claude API extraction call
**Example:**
```typescript
// Source: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const ExtractionSchema = z.object({
  job_number: z.string().nullable(),
  vin: z.string().nullable(),
  year: z.number().nullable(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  color: z.string().nullable(),
  odometer: z.number().nullable(),
  seller_name: z.string().nullable(),
  seller_address: z.string().nullable(),
  buyer_name: z.string().nullable(),
  buyer_address: z.string().nullable(),
  purchase_price: z.number().nullable(),
  sale_price: z.number().nullable(),
  purchase_date: z.string().nullable(),
  sale_date: z.string().nullable(),
  stock_number: z.string().nullable(),
  confidence: z.record(z.enum(["high", "medium", "low", "not_found"])),
});

type ExtractionResult = z.infer<typeof ExtractionSchema>;

const client = new Anthropic();

const response = await client.messages.parse({
  model: "claude-sonnet-4-6",
  max_tokens: 4096,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: pdfBase64,
          },
        },
        {
          type: "text",
          text: EXTRACTION_PROMPT,
        },
      ],
    },
  ],
  output_config: { format: zodOutputFormat(ExtractionSchema) },
});

const extracted: ExtractionResult = response.parsed_output;
```
[VERIFIED: https://platform.claude.com/docs/en/build-with-claude/structured-outputs]

### Pattern 2: PDF as Base64 Document Content Block
**What:** Send PDFs directly to Claude API without preprocessing
**When to use:** Every extraction call
**Example:**
```typescript
// Source: https://platform.claude.com/docs/en/docs/build-with-claude/pdf-support
// Read bytea from PostgreSQL, convert to base64
const document = await db.select().from(documents).where(eq(documents.id, docId));
const pdfBase64 = Buffer.from(document.fileData).toString("base64");

// Send as document content block
const content = [
  {
    type: "document" as const,
    source: {
      type: "base64" as const,
      media_type: "application/pdf" as const,
      data: pdfBase64,
    },
  },
  {
    type: "text" as const,
    text: EXTRACTION_PROMPT,
  },
];
```
[VERIFIED: https://platform.claude.com/docs/en/docs/build-with-claude/pdf-support]

### Pattern 3: Async Extraction with Status Polling
**What:** Upload returns immediately; extraction runs server-side; UI polls for status
**When to use:** D-20 requires this pattern to avoid request timeouts
**Example:**
```typescript
// API Route: POST /api/vehicles/[id]/upload
// 1. Receive PDF via FormData
// 2. Store in documents table (bytea)
// 3. Set vehicle status to "extracting"
// 4. Start extraction asynchronously (do NOT await)
// 5. Return immediately with vehicle ID

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const docType = formData.get("type") as "ap" | "ar";

  // Validate
  if (!file || file.type !== "application/pdf") {
    return apiError("Invalid file", 400);
  }
  if (file.size > 10 * 1024 * 1024) {
    return apiError("File too large (max 10MB)", 400);
  }

  // Store PDF as bytea
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const [doc] = await db.insert(documents).values({
    vehicleId: id,
    type: docType,
    filename: file.name,
    fileData: buffer,
    fileSize: file.size,
    mimeType: file.type,
  }).returning();

  // Fire and forget -- extraction runs in background
  extractDocument(id, doc.id).catch((err) => {
    console.error("Extraction failed:", err);
    // Error handling updates vehicle status
  });

  return apiSuccess({ documentId: doc.id });
}
```

```typescript
// API Route: GET /api/vehicles/[id]/status
// Client polls this every 2-3 seconds
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const vehicle = await db.query.vehicles.findFirst({
    where: eq(vehicles.id, id),
    with: { documents: true },
  });

  return apiSuccess({
    status: vehicle.status,
    data: vehicle.status === "pending_review" ? vehicle : null,
  });
}
```
[ASSUMED -- pattern based on D-20 requirement and standard Next.js patterns]

### Pattern 4: FormData File Upload in Next.js App Router
**What:** Receive binary PDF via FormData in Route Handler
**When to use:** Upload endpoint
**Example:**
```typescript
// Source: Next.js docs -- Route Handlers
// request.formData() is natively supported in App Router Route Handlers
// Default body size limit is 10MB -- matches UPLD-03
const formData = await request.formData();
const file = formData.get("file") as File;
const arrayBuffer = await file.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);
// buffer is ready for PostgreSQL bytea insertion
```
[VERIFIED: https://nextjs.org/docs/app/api-reference/file-conventions/route]

### Pattern 5: Drizzle bytea Column
**What:** Store PDF binary data directly in PostgreSQL
**When to use:** Documents table schema migration
**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/column-types/pg
import { bytea } from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
  // ... existing columns ...
  fileData: bytea("file_data"),       // replaces filePath
  mimeType: varchar("mime_type", { length: 100 }),
  // remove: filePath
});
```
[VERIFIED: https://orm.drizzle.team/docs/column-types/pg]

### Anti-Patterns to Avoid
- **Preprocessing PDFs before Claude:** Do NOT use pdf-parse, Tesseract, or image conversion. Claude's document content blocks handle text extraction + vision internally for all PDF types including scans.
- **Synchronous extraction in upload handler:** Extraction can take 5-15 seconds. Must be async with status polling per D-20.
- **Per-document-type prompt templates:** D-19 mandates a single prompt for all 6 types. Claude handles format variance.
- **Storing file paths instead of bytea:** D-16 mandates PostgreSQL bytea storage. Simpler backup/restore.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text extraction | Custom OCR pipeline | Claude API document blocks | Claude handles text + vision + scans internally |
| Structured JSON from LLM | Manual JSON.parse + validation | `output_config` + `zodOutputFormat()` | Constrained decoding guarantees valid JSON schema compliance |
| Drag-and-drop file upload | Custom drag event handlers | react-dropzone v15 | Handles browser quirks, file validation, accessibility |
| PDF type/size validation | Custom MIME checking | react-dropzone `accept` + `maxSize` | Client-side filtering before upload |

**Key insight:** The Anthropic API's native structured output (`output_config.format`) with constrained decoding makes the old tool_use workaround obsolete. `zodOutputFormat()` converts Zod schemas to JSON schemas automatically -- no manual schema translation needed.

## Common Pitfalls

### Pitfall 1: Next.js Body Size Limit for PDF Upload
**What goes wrong:** Large PDFs (>10MB) fail to upload with no clear error
**Why it happens:** Next.js App Router route handlers have a default 10MB body limit
**How to avoid:** UPLD-03 already caps at 10MB which matches the default. Validate on client side with react-dropzone `maxSize: 10 * 1024 * 1024` to show user-friendly error before upload attempt.
**Warning signs:** Silent upload failures, 413 errors in production

### Pitfall 2: Anthropic API Rate Limits and Timeouts
**What goes wrong:** Extraction calls fail intermittently under load or with large/scanned PDFs
**Why it happens:** Claude API has rate limits; scanned PDFs take longer to process (each page = image token cost)
**How to avoid:** Implement 1 retry with exponential backoff (1s, then 3s). Set reasonable `max_tokens` (4096 sufficient for extraction). Log token usage for cost monitoring.
**Warning signs:** Intermittent 429 or 529 responses, extraction times >30s

### Pitfall 3: bytea Column and Large Query Results
**What goes wrong:** Queries that SELECT * from documents return massive results because bytea data is included
**Why it happens:** PDF binary data (100KB-10MB per row) is fetched with every query
**How to avoid:** Always explicitly select columns. Never `SELECT *` from documents table. Create a helper that excludes `fileData` for list queries. Only fetch `fileData` when actually needed for extraction.
**Warning signs:** Slow queries, high memory usage, OOM errors

### Pitfall 4: Zod v4 Schema Compatibility with Anthropic SDK
**What goes wrong:** `zodOutputFormat()` may not work with Zod v4 if SDK expects Zod v3
**Why it happens:** The Anthropic SDK lists zod as a peer dependency. Version compatibility matters.
**How to avoid:** Check `@anthropic-ai/sdk` peer dependencies. The project uses Zod 4.3.6. If incompatible, use raw `json_schema` in `output_config.format` instead of `zodOutputFormat()` -- the manual approach works identically but requires writing the JSON schema by hand.
**Warning signs:** TypeScript errors on `zodOutputFormat()`, runtime schema conversion failures

### Pitfall 5: Async Fire-and-Forget in Serverless/Edge
**What goes wrong:** Background extraction gets killed when the request handler returns
**Why it happens:** In serverless environments, the runtime may terminate after response is sent
**How to avoid:** This project runs on Docker/Coolify (not serverless), so standard Node.js fire-and-forget works. The extraction promise continues after response. Use `waitUntil` if migrating to Vercel/edge later.
**Warning signs:** Extractions that never complete, vehicles stuck in "extracting" status

### Pitfall 6: Confidence Schema Mismatch Between Extraction and Database
**What goes wrong:** Extracted confidence map keys don't match vehicle column names
**Why it happens:** Claude returns field names from prompt; database uses camelCase; JSONB stores whatever you give it
**How to avoid:** Define a single source of truth for field names in the Zod schema. Map between prompt field names and database column names explicitly. Test with reference PDFs.
**Warning signs:** Missing confidence data for some fields, null confidence entries

## Code Examples

### VIN Validation (Complete Implementation)
```typescript
// Source: https://en.wikibooks.org/wiki/Vehicle_Identification_Numbers_(VIN_codes)/Check_digit
// + NHTSA 49 CFR Part 565

const VIN_TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};

const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

const VIN_VALID_CHARS = /^[A-HJ-NPR-Z0-9]{17}$/;

export interface VinValidationResult {
  valid: boolean;
  formatValid: boolean;
  checkDigitValid: boolean;
  expectedCheckDigit?: string;
  actualCheckDigit?: string;
  error?: string;
}

export function validateVin(vin: string | null): VinValidationResult {
  if (!vin) {
    return { valid: false, formatValid: false, checkDigitValid: false, error: "VIN is empty" };
  }

  const upperVin = vin.toUpperCase().trim();

  // VIN-01: Format validation
  if (!VIN_VALID_CHARS.test(upperVin)) {
    return {
      valid: false,
      formatValid: false,
      checkDigitValid: false,
      error: upperVin.length !== 17
        ? `VIN must be 17 characters (got ${upperVin.length})`
        : "VIN contains invalid characters (I, O, Q not allowed)",
    };
  }

  // VIN-02: Check digit validation (position 9, 0-indexed position 8)
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const char = upperVin[i];
    const value = VIN_TRANSLITERATION[char] ?? parseInt(char, 10);
    sum += value * VIN_WEIGHTS[i];
  }
  const remainder = sum % 11;
  const expected = remainder === 10 ? "X" : String(remainder);
  const actual = upperVin[8];

  if (expected !== actual) {
    return {
      valid: false,
      formatValid: true,
      checkDigitValid: false,
      expectedCheckDigit: expected,
      actualCheckDigit: actual,
      error: `VIN check digit invalid -- expected ${expected}, got ${actual}`,
    };
  }

  return { valid: true, formatValid: true, checkDigitValid: true };
}
```
[VERIFIED: https://en.wikibooks.org/wiki/Vehicle_Identification_Numbers_(VIN_codes)/Check_digit]

### Extraction Prompt (Recommended Structure)
```typescript
// Claude's discretion per CONTEXT.md -- this is a recommended starting point
export const EXTRACTION_SYSTEM_PROMPT = `You are a document data extraction specialist for a Canadian auto dealer (Ontario).
You extract vehicle transaction data from invoices, bills of sale, and dealer forms.

IMPORTANT RULES:
1. Extract ALL fields listed in the schema. If a field is not present in the document, return null for the value and "not_found" for its confidence.
2. For each field, report your confidence level:
   - "high": clearly readable, unambiguous
   - "medium": partially visible, inferred from context, or minor uncertainty
   - "low": barely legible, guessed, or conflicting information
   - "not_found": field not present in document
3. VIN must be exactly 17 characters. If you can read most but not all characters, report what you see with "low" confidence.
4. Dates should be in YYYY-MM-DD format.
5. Prices should be numeric (no currency symbols). Use the pre-tax amount if both pre-tax and total are shown.
6. Job numbers follow the pattern "26-JXXXXX" (fiscal year prefix + J + sequential digits).
7. This document may be in English or French. Extract data regardless of language.
8. This may be a scan -- use vision to read the document even if text extraction is poor.`;

export const EXTRACTION_USER_PROMPT = `Extract all vehicle transaction data from this document.
This is an {docType} document (AP = purchase from supplier, AR = sale to customer).`;
```
[ASSUMED -- prompt wording is Claude's discretion per CONTEXT.md]

### react-dropzone Upload Component Pattern
```typescript
// Source: react-dropzone docs + shadcn/Tailwind styling
"use client";

import { useDropzone } from "react-dropzone";
import { Upload, FileText, X } from "lucide-react";
import { Card } from "@/components/ui/card";

interface PdfDropZoneProps {
  label: string;
  file: File | null;
  onDrop: (file: File) => void;
  onRemove: () => void;
}

export function PdfDropZone({ label, file, onDrop, onRemove }: PdfDropZoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxSize: 10 * 1024 * 1024, // 10MB per UPLD-03
    maxFiles: 1,
    onDrop: (accepted) => {
      if (accepted.length > 0) onDrop(accepted[0]);
    },
  });

  if (file) {
    return (
      <Card className="p-4 flex items-center gap-3">
        <FileText className="size-8 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {(file.size / 1024).toFixed(0)} KB
          </p>
        </div>
        <button onClick={onRemove}>
          <X className="size-4" />
        </button>
      </Card>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"}`}
    >
      <input {...getInputProps()} />
      <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">
        Drag and drop a PDF or click to browse
      </p>
    </div>
  );
}
```
[ASSUMED -- styling is Claude's discretion per CONTEXT.md]

### Schema Migration: documents.filePath to fileData bytea
```typescript
// Source: https://orm.drizzle.team/docs/column-types/pg
import { bytea, varchar } from "drizzle-orm/pg-core";

// Updated documents table
export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehicleId: uuid("vehicle_id")
    .references(() => vehicles.id)
    .notNull(),
  type: documentTypeEnum("type").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileData: bytea("file_data").notNull(),         // NEW: replaces filePath
  mimeType: varchar("mime_type", { length: 100 }), // NEW: e.g., "application/pdf"
  fileSize: integer("file_size").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  extractionRaw: jsonb("extraction_raw"),
});

// Updated vehicles table -- add extraction_confidence
export const vehicles = pgTable("vehicles", {
  // ... all existing columns ...
  extractionConfidence: jsonb("extraction_confidence"), // NEW: per-field confidence map
});
```
[VERIFIED: Drizzle bytea column type from https://orm.drizzle.team/docs/column-types/pg]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tool use for structured JSON | `output_config.format` with `json_schema` | GA 2026 | Constrained decoding guarantees valid JSON; no tool_use workaround needed |
| Manual JSON schema writing | `zodOutputFormat()` SDK helper | SDK ~0.85+ | Zod schema auto-converts to JSON schema for API |
| `client.messages.create()` + manual parse | `client.messages.parse()` | SDK ~0.85+ | Returns `parsed_output` with type-safe validated result |
| Separate OCR + LLM pipeline | Claude `document` content blocks | 2024 | Single API call handles text + image + scanned PDFs |
| react-dropzone v14 | react-dropzone v15 | Feb 2026 | `isDragReject` reset after drop; use `fileRejections` for post-drop UI |

**Deprecated/outdated:**
- **Tool use for structured extraction:** Still works but `output_config.format` is preferred -- simpler, faster, guaranteed schema compliance
- **`claude-sonnet-4-20250514` model ID:** Legacy. Use `claude-sonnet-4-6` for Sonnet 4.6
- **`output_format` parameter:** Deprecated in favor of `output_config.format`. SDK helpers handle translation.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `zodOutputFormat()` works with Zod v4 (project uses 4.3.6) | Architecture Patterns | Would need to write raw JSON schema manually instead -- same result, more verbose |
| A2 | Extraction prompt wording is effective for all 6 document types | Code Examples | May need iteration with reference PDFs -- covered by Claude's discretion |
| A3 | 2-3 second polling interval is appropriate for extraction status | Architecture Patterns | Too fast wastes requests, too slow feels sluggish -- easily adjustable |
| A4 | Fire-and-forget async extraction works in Docker/Coolify environment | Common Pitfalls | Node.js long-running process; not serverless -- should work. If not, use a queue. |
| A5 | Next.js App Router default body limit is 10MB | Common Pitfalls | If different, need `next.config.js` adjustment |

## Open Questions

1. **Zod v4 compatibility with @anthropic-ai/sdk zodOutputFormat()**
   - What we know: SDK has zod as peer dependency. Project uses Zod 4.3.6.
   - What's unclear: Whether SDK 0.86.1 officially supports Zod v4 or only Zod v3.
   - Recommendation: Try `zodOutputFormat()` first. If type errors occur, fall back to raw `json_schema` in `output_config.format` -- identical behavior, just manual schema definition.

2. **Drizzle bytea column behavior with postgres.js driver**
   - What we know: Drizzle has built-in `bytea()` column type. postgres.js returns Buffer for bytea.
   - What's unclear: Whether `bytea()` returns `Buffer` or `string` (hex-encoded) in Drizzle with postgres.js.
   - Recommendation: Test with a simple insert/select of a small binary payload during schema migration. If needed, use `customType` for explicit Buffer handling.

3. **Extraction token cost per document**
   - What we know: ~1,500-3,000 text tokens per page + image tokens. Sonnet 4.6: $3/MTok input, $15/MTok output.
   - What's unclear: Exact image token cost for typical 1-2 page invoices.
   - Recommendation: Log `usage.input_tokens` and `usage.output_tokens` from API response for cost tracking. Estimate $0.05-0.10 per document.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | (assumed -- Next.js works) | 20+ | -- |
| PostgreSQL | Data storage | (shared Coolify instance) | -- | -- |
| ANTHROPIC_API_KEY env var | Claude API calls | Must be set | -- | Cannot extract without it |

**Missing dependencies with no fallback:**
- `ANTHROPIC_API_KEY` environment variable must be configured on Coolify before extraction can work

**Missing dependencies with fallback:**
- None -- all dependencies are installable via npm

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (already handled Phase 1) | Better Auth session validation on all API routes |
| V3 Session Management | No (already handled Phase 1) | Better Auth httpOnly cookies |
| V4 Access Control | Yes | Verify session on all upload/extraction API routes |
| V5 Input Validation | Yes | Zod validation on all inputs; PDF MIME type check; file size limit |
| V6 Cryptography | No | API key stored in env var, not in code |

### Known Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious PDF upload | Tampering | Validate MIME type (application/pdf), size limit (10MB), send directly to Claude (no local execution) |
| API key exposure | Information Disclosure | Store ANTHROPIC_API_KEY in env var only, never return in API responses |
| File size DoS | Denial of Service | 10MB limit on client (react-dropzone maxSize) AND server (formData validation) |
| Unauthorized extraction | Elevation of Privilege | Session validation on all API routes using Better Auth |

## Sources

### Primary (HIGH confidence)
- [Anthropic PDF Support Docs](https://platform.claude.com/docs/en/docs/build-with-claude/pdf-support) -- base64 document blocks, limits (32MB request, 600 pages), token costs
- [Anthropic Structured Outputs Docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) -- `output_config.format`, `zodOutputFormat()`, `messages.parse()`, JSON schema limitations
- [Anthropic Models Overview](https://platform.claude.com/docs/en/about-claude/models/overview) -- `claude-sonnet-4-6` model ID confirmed, $3/$15 MTok pricing
- [Drizzle ORM PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg) -- `bytea()` column definition
- [npm registry: @anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk) -- v0.86.1 current
- [npm registry: react-dropzone](https://www.npmjs.com/package/react-dropzone) -- v15.0.0 current
- [VIN Check Digit Algorithm (Wikibooks)](https://en.wikibooks.org/wiki/Vehicle_Identification_Numbers_(VIN_codes)/Check_digit) -- transliteration table, position weights, mod 11

### Secondary (MEDIUM confidence)
- [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route) -- FormData handling in App Router
- [Next.js proxyClientMaxBodySize](https://nextjs.org/docs/app/api-reference/config/next-config-js/proxyClientMaxBodySize) -- default 10MB body limit
- [react-dropzone v15 releases](https://github.com/react-dropzone/react-dropzone/releases) -- isDragReject breaking change

### Tertiary (LOW confidence)
- None

## Project Constraints (from CLAUDE.md)

- **Deployment:** Coolify on Hetzner CX43 -- Docker container, shared PostgreSQL
- **API budget:** $2-5/month at ~50 documents
- **Regulatory:** Garage Register data must be accurate -- human review mandatory
- **User:** Andrey is non-technical -- UI must be self-explanatory
- **Database:** Drizzle ORM with postgres.js driver, max 3 connections
- **Auth:** Better Auth session validation on protected routes
- **Patterns:** API routes at `src/app/api/`, apiSuccess/apiError wrappers, logAudit for state changes
- **Existing components:** button, card, input, skeleton, sonner, tooltip, sidebar
- **Existing schema:** vehicles (all register fields), documents (needs migration), auditLog

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified against npm registry, Anthropic docs verified
- Architecture: HIGH -- structured output pattern verified against official docs, PDF support confirmed
- VIN validation: HIGH -- algorithm verified against Wikibooks/NHTSA specification
- Pitfalls: MEDIUM -- some async/bytea behaviors need runtime validation

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable APIs, no fast-moving changes expected)
