# Architecture Research

**Domain:** Document extraction web app (PDF to structured data with AI vision)
**Researched:** 2026-04-08
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Upload   │  │ Review   │  │ Register │  │ Dashboard│       │
│  │ Page     │  │ Page     │  │ Page     │  │ Page     │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │              │             │              │             │
├───────┴──────────────┴─────────────┴──────────────┴─────────────┤
│                       API LAYER (Route Handlers)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ /upload  │  │ /extract │  │ /vehicles│  │ /export  │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │              │             │              │             │
├───────┴──────────────┴─────────────┴──────────────┴─────────────┤
│                      SERVICE LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Extraction   │  │ Vehicle      │  │ Export       │          │
│  │ Service      │  │ Service      │  │ Service      │          │
│  │ (Claude API) │  │ (CRUD+audit) │  │ (XLSX gen)   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                  │
├─────────┴─────────────────┴──────────────────┴──────────────────┤
│                      DATA LAYER                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ PostgreSQL│  │ File     │  │ Claude   │                      │
│  │ (Prisma) │  │ Storage  │  │ API      │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Upload Page | PDF file upload with drag-drop, file validation, progress indicator | Client Component with FormData POST to Route Handler |
| Review Page | Display extracted data with confidence scores, inline editing, approval/rejection | Client Component fetching from API, form-based editing |
| Register Page | Table view of all approved vehicles, search/filter, bulk select for export | Server Component for initial load, Client for interactions |
| Dashboard | Processing status, recent activity, quick stats | Server Component with database queries |
| Extraction Service | Send PDF to Claude API, parse structured JSON response, store results | Server-side module called from Route Handler |
| Vehicle Service | CRUD operations on vehicle records, audit trail logging | Prisma-based service with transaction support |
| Export Service | Generate Ministry-format XLSX from vehicle records, append to existing | ExcelJS-based service (matching Invoice Ledger pattern) |
| File Storage | Store uploaded PDFs on disk (Docker volume) | Local filesystem with `/uploads` volume mount |
| Auth | Simple password-based auth with cookie session | Same pattern as Invoice Ledger (env-based password, httpOnly cookie) |

## Recommended Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout with auth check, theme, nav
│   ├── page.tsx                  # Dashboard (home)
│   ├── login/
│   │   └── page.tsx              # Login page
│   ├── upload/
│   │   └── page.tsx              # PDF upload flow
│   ├── review/
│   │   ├── page.tsx              # List of pending reviews
│   │   └── [id]/
│   │       └── page.tsx          # Review/edit single vehicle extraction
│   ├── register/
│   │   └── page.tsx              # Full register view with search/filter
│   ├── api/
│   │   ├── auth/
│   │   │   ├── route.ts          # POST login
│   │   │   ├── check/route.ts    # GET auth status
│   │   │   └── logout/route.ts   # POST logout
│   │   ├── upload/
│   │   │   └── route.ts          # POST PDF upload + trigger extraction
│   │   ├── extraction/
│   │   │   ├── route.ts          # GET extraction status
│   │   │   └── [id]/route.ts     # GET single extraction result
│   │   ├── vehicles/
│   │   │   ├── route.ts          # GET list, POST create/approve
│   │   │   └── [id]/
│   │   │       └── route.ts      # GET/PUT/DELETE single vehicle
│   │   └── export/
│   │       └── route.ts          # POST generate XLSX download
│   └── components/               # Shared UI components
│       ├── ui/                   # Base UI (buttons, inputs, cards)
│       ├── PDFUploader.tsx       # Upload dropzone component
│       ├── ExtractionReview.tsx  # Data review/edit form
│       ├── VehicleTable.tsx      # Register data table
│       ├── ConfidenceBadge.tsx   # Visual confidence indicator
│       └── PasswordGate.tsx      # Auth wrapper (from Invoice Ledger)
├── lib/                          # Shared server-side logic
│   ├── db.ts                     # Prisma client singleton
│   ├── claude.ts                 # Claude API client + extraction logic
│   ├── extraction.ts             # Extraction orchestration + prompt
│   ├── vin.ts                    # VIN validation with check digit
│   ├── xlsx-export.ts            # XLSX generation (ExcelJS)
│   ├── xlsx-template.ts          # Ministry format template definition
│   ├── audit.ts                  # Audit trail helper
│   └── auth.ts                   # Auth helpers (cookie check)
├── types/                        # TypeScript type definitions
│   ├── vehicle.ts                # Vehicle record types
│   ├── extraction.ts             # Extraction result types
│   └── garage-register.ts        # Ministry register field types
└── prisma/
    ├── schema.prisma             # Database schema
    └── migrations/               # Migration files
```

### Structure Rationale

- **app/api/:** Route Handlers for all API endpoints. Matches the proven pattern from the Invoice Ledger project. Route Handlers are preferred over Server Actions for operations that need explicit HTTP semantics (file uploads, streaming responses, XLSX downloads).
- **app/components/:** Co-located with the app directory for discoverability. Subdivided into `ui/` for reusable primitives and feature-specific components at the root level.
- **lib/:** Server-only business logic. Each file is a clear bounded module. This separation keeps Route Handlers thin (validate input, call service, return response) and enables reuse across multiple routes.
- **types/:** Shared TypeScript interfaces used by both API and frontend. Keeps type definitions DRY and ensures extraction results match review form expectations.
- **prisma/:** Database schema and migrations isolated from application code. Prisma generates typed client from schema.

## Architectural Patterns

### Pattern 1: Synchronous Extraction with Polling Fallback

**What:** Upload PDF, immediately call Claude API in the same request, return extracted data. If the extraction takes longer than expected, return a "processing" status and let the client poll.

**When to use:** When API calls complete in under 30 seconds (typical for 1-2 page PDFs with Claude). This covers the Garage Register use case where each document is 1-5 pages.

**Trade-offs:**
- PRO: Simple architecture, no job queue needed, no background workers
- PRO: Matches the ~50 docs/month volume -- no need for async infrastructure
- CON: If Claude API is slow or down, the upload request hangs
- CON: Not suitable for batch processing of many documents

**How it works:**

```
Client                     Server                    Claude API
  │                          │                          │
  │─── POST /api/upload ───> │                          │
  │    (PDF in FormData)     │                          │
  │                          │── Save PDF to disk ──>   │
  │                          │── Create DB record ──>   │
  │                          │── Send PDF base64 ────> │
  │                          │                          │── Process ──>
  │                          │<── Structured JSON ──── │
  │                          │── Save extraction ──>   │
  │<── 200 {id, status} ─── │                          │
  │                          │                          │
  │─── GET /api/extraction/  │                          │
  │    {id} ──────────────> │                          │
  │<── 200 {data, status} ──│                          │
```

**Implementation approach:**

```typescript
// lib/extraction.ts - Core extraction logic
export async function extractVehicleData(pdfBuffer: Buffer): Promise<ExtractionResult> {
  const base64 = pdfBuffer.toString('base64');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',  // Cost-effective for extraction
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 }
        },
        {
          type: 'text',
          text: EXTRACTION_PROMPT  // Structured prompt requesting JSON output
        }
      ]
    }]
  });

  return parseExtractionResponse(response);
}
```

### Pattern 2: Paired Document Processing (AP + AR per Vehicle)

**What:** Each vehicle deal consists of two PDFs (AP purchase + AR sale). The system processes them as a pair, merging extracted data into a single vehicle record.

**When to use:** Always -- this is the core business flow for the Garage Register.

**Trade-offs:**
- PRO: Matches Andrey's real workflow (he always has both documents for a vehicle)
- PRO: Two documents provide cross-validation (VIN appears in both, buyer/seller from different sides)
- CON: Sometimes only one document is available initially -- must handle partial uploads

**Data merge strategy:**

```
AP Document (Purchase Invoice)         AR Document (Sale Invoice)
├── VIN (primary source)               ├── VIN (cross-validate)
├── Year, Make, Model                  ├── Year, Make, Model (cross-validate)
├── Color, Odometer                    ├── Buyer name + address
├── Seller name + address              ├── Sale date
├── Purchase date                      ├── Sale price
└── Purchase price                     └── Job number

                    ┌──────────────┐
                    │ Merged Record│
                    │  (Vehicle)   │
                    └──────────────┘
```

### Pattern 3: Confidence-Based Review UI

**What:** Claude returns extracted fields with confidence signals. The UI highlights low-confidence fields in amber/red so Andrey knows exactly what needs manual verification.

**When to use:** For every extraction. The review screen is mandatory before data enters the register.

**Trade-offs:**
- PRO: Andrey focuses attention on fields that need it, skips obviously correct ones
- PRO: Satisfies regulatory requirement for human review without making it tedious
- CON: Confidence is inferred from Claude's response patterns, not a formal score

**How confidence is derived:**
- Claude is prompted to return a confidence level (high/medium/low) per field
- VIN gets automatic check-digit validation -- mismatch = always low confidence
- Cross-validation between AP and AR documents: mismatch = low confidence on the mismatched field
- Fields not found in the document = marked as "not found" with low confidence

### Pattern 4: Append-to-Existing XLSX

**What:** Rather than only generating a new XLSX, the system can read Andrey's existing Garage Register XLSX, find the next empty row, and append approved vehicle records.

**When to use:** When Andrey wants to add new vehicles to an existing register file (the common case).

**Trade-offs:**
- PRO: Andrey keeps working with his existing file, no manual copy-paste
- PRO: Preserves existing formatting and data
- CON: Fragile if the XLSX format changes or has unexpected structure
- CON: Must handle the case where Andrey's file has manual edits that shifted rows

**Implementation:** ExcelJS can read an existing workbook, find the last populated row, and write new rows below it. The template definition (column mapping, formatting) is codified in `lib/xlsx-template.ts` based on the actual Ministry register format.

## Data Flow

### Primary Flow: PDF to Garage Register Entry

```
[Andrey uploads 2 PDFs]
    │
    ├── POST /api/upload (FormData with AP + AR PDFs)
    │       │
    │       ├── Validate files (type, size)
    │       ├── Save PDFs to /uploads/{vehicleId}/
    │       ├── Create vehicle record (status: "extracting")
    │       ├── Call Claude API with AP PDF → extract AP data
    │       ├── Call Claude API with AR PDF → extract AR data
    │       ├── Merge AP + AR extractions
    │       ├── Validate VIN check digit
    │       ├── Save extraction result (status: "pending_review")
    │       └── Return {vehicleId, extractedData, confidence}
    │
    ├── [Andrey reviews extracted data on Review page]
    │       │
    │       ├── Fields highlighted by confidence level
    │       ├── Andrey edits any incorrect fields
    │       ├── PUT /api/vehicles/{id} (approved data)
    │       │       │
    │       │       ├── Save approved data
    │       │       ├── Log audit trail (before/after)
    │       │       └── Update status: "approved"
    │       └── Return to upload or register page
    │
    └── [Andrey exports to XLSX]
            │
            ├── POST /api/export (selected vehicle IDs + mode)
            │       │
            │       ├── Mode A: Generate new XLSX
            │       │       ├── Create workbook from template
            │       │       ├── Fill rows from approved vehicles
            │       │       └── Return XLSX download
            │       │
            │       └── Mode B: Append to existing
            │               ├── Read uploaded existing XLSX
            │               ├── Find last populated row
            │               ├── Append new rows
            │               └── Return modified XLSX download
            │
            └── Andrey downloads XLSX → submits to Ministry
```

### Database Schema (Core Tables)

```
vehicles
├── id (UUID, PK)
├── job_number (VARCHAR, "26-JXXXXX")
├── status (ENUM: extracting, pending_review, approved, exported)
├── vin (VARCHAR(17), nullable until approved)
├── year (INT)
├── make (VARCHAR)
├── model (VARCHAR)
├── color (VARCHAR)
├── odometer (INT)
├── seller_name (VARCHAR)
├── seller_address (TEXT)
├── buyer_name (VARCHAR)
├── buyer_address (TEXT)
├── purchase_date (DATE)
├── sale_date (DATE)
├── purchase_price (DECIMAL)
├── sale_price (DECIMAL)
├── stock_number (VARCHAR)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
└── exported_at (TIMESTAMP, nullable)

documents
├── id (UUID, PK)
├── vehicle_id (UUID, FK → vehicles)
├── type (ENUM: ap, ar)
├── filename (VARCHAR)
├── file_path (VARCHAR)
├── file_size (INT)
├── uploaded_at (TIMESTAMP)
└── extraction_raw (JSONB, raw Claude response)

extractions
├── id (UUID, PK)
├── vehicle_id (UUID, FK → vehicles)
├── document_id (UUID, FK → documents)
├── extracted_data (JSONB, structured fields with confidence)
├── merged_data (JSONB, merged AP+AR result)
├── confidence_scores (JSONB, per-field confidence)
├── vin_valid (BOOLEAN, check digit result)
├── created_at (TIMESTAMP)
└── model_used (VARCHAR, "claude-sonnet-4-20250514")

audit_log
├── id (UUID, PK)
├── vehicle_id (UUID, FK → vehicles)
├── action (ENUM: created, extracted, reviewed, approved, edited, exported)
├── field_changes (JSONB, {field: {old, new}} for edits)
├── performed_by (VARCHAR)
├── performed_at (TIMESTAMP)
└── notes (TEXT, nullable)

exports
├── id (UUID, PK)
├── vehicle_ids (UUID[], which vehicles were exported)
├── mode (ENUM: new, append)
├── filename (VARCHAR)
├── created_at (TIMESTAMP)
└── performed_by (VARCHAR)
```

### Key Data Flows

1. **Upload + Extract:** Client sends FormData with PDFs to Route Handler. Handler saves files to disk, creates DB records, calls Claude API synchronously for each PDF, merges results, saves extraction, returns combined data. Total expected time: 5-15 seconds.

2. **Review + Approve:** Client fetches extraction data, displays with confidence highlighting. On approval, client sends PUT with final data. Server saves approved state and creates audit log entry in a single transaction.

3. **Export:** Client sends list of vehicle IDs and export mode (new/append). Server queries approved vehicles, generates XLSX using ExcelJS, returns file as download response with proper Content-Disposition header.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-5 users, 50 docs/month (current) | Monolith is perfect. Synchronous extraction. Single PostgreSQL. Local file storage. |
| 5-20 users, 500 docs/month | Add background job queue (BullMQ + Redis) for extraction. Add file cleanup cron. Consider S3-compatible storage (MinIO on Hetzner). |
| 20+ users, 2000+ docs/month | Split extraction into a worker service. Add WebSocket for real-time status. Database read replicas. This scale is extremely unlikely for this business. |

### Scaling Priorities

1. **First bottleneck (never expected to hit):** Claude API rate limits. At 50 docs/month, this is a non-issue. Anthropic's rate limits are generous for this volume.
2. **Second bottleneck (if business grows):** Synchronous extraction blocking the upload route. Solution: move to background processing with polling.

## Anti-Patterns

### Anti-Pattern 1: Over-Engineered Job Queue from Day One

**What people do:** Set up Redis, BullMQ, separate worker processes, and WebSocket notifications for a 50-docs-per-month app.
**Why it's wrong:** Adds operational complexity (another service to monitor, Redis to maintain) with zero benefit at this scale. Claude API calls for 1-5 page PDFs complete in 5-15 seconds -- well within HTTP request timeouts.
**Do this instead:** Call Claude API synchronously in the Route Handler. Show a loading spinner. If it takes longer than 30 seconds, THEN add polling. Only add a job queue if volume exceeds 500 docs/month.

### Anti-Pattern 2: Client-Side PDF Processing

**What people do:** Use pdf.js or similar to extract text client-side, then send text to the API.
**Why it's wrong:** Claude API vision handles PDFs natively and better -- it sees layout, tables, images, and scanned content. Client-side extraction loses visual context and fails on scans (15% of Andrey's documents).
**Do this instead:** Send the raw PDF to the server, convert to base64, send directly to Claude API as a document type content block. Let Claude see the full visual document.

### Anti-Pattern 3: Storing PDFs in the Database

**What people do:** Store PDF binary data as BYTEA in PostgreSQL.
**Why it's wrong:** Bloats the database, slows backups, makes queries slower. PDFs are 200KB-10MB each.
**Do this instead:** Store PDFs on the filesystem (Docker volume at `/uploads`). Store only the file path in the database. This matches the Invoice Ledger pattern (submission-logs volume).

### Anti-Pattern 4: Building a Generic OCR Pipeline

**What people do:** Chain Tesseract OCR, pdf-parse for text extraction, custom regex for each document type, then fall back to Claude for complex cases.
**Why it's wrong:** The POC already proved Claude API vision handles ALL document types natively -- digital, scanned, French, scattered fields. A hybrid OCR pipeline adds complexity with no accuracy benefit.
**Do this instead:** Send every PDF directly to Claude API. One code path for all document types. Simpler code, higher accuracy, zero maintenance when new document formats appear.

### Anti-Pattern 5: Not Separating Extraction from Approval

**What people do:** Extract data and immediately save it as the final record.
**Why it's wrong:** Regulatory requirement mandates human review. Also, extraction accuracy is 95-99%, not 100%. Skipping review means VIN errors hit the Ministry.
**Do this instead:** Always create extraction results in a "pending_review" state. Require explicit approval before data becomes part of the register. Log all changes in the audit trail.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Claude API (Anthropic) | Direct HTTPS via `@anthropic-ai/sdk` | Use `document` content type for PDFs. Sonnet model for cost efficiency (~$0.04/doc). Base64 encode PDFs server-side. |
| PostgreSQL (shared on Coolify) | Prisma ORM with connection string from env | Use singleton pattern for connection in dev. Same DB server as other AD Auto apps, separate database. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend <-> API | HTTP (fetch from Client Components to Route Handlers) | FormData for uploads, JSON for everything else. Auth via httpOnly cookie. |
| API <-> Extraction Service | Direct function call (same process) | `lib/claude.ts` is imported and called directly in Route Handlers. No HTTP between them. |
| API <-> Database | Prisma Client (typed queries) | All DB access goes through `lib/db.ts` singleton. No raw SQL. |
| API <-> File Storage | Node.js `fs` module | Read/write to `/uploads` directory. Files organized by vehicle ID. |
| API <-> XLSX Export | Direct function call | `lib/xlsx-export.ts` returns a Buffer. Route Handler sends it as a response. |

## Build Order (Dependencies)

The following order reflects true dependency chains -- each layer builds on the previous:

```
Phase 1: Foundation
├── Next.js project setup (matching Invoice Ledger: Next.js 16, React 19, Tailwind 4)
├── Docker + Dockerfile (copy from Invoice Ledger, adapt)
├── PostgreSQL + Prisma schema (vehicles, documents, extractions, audit_log)
├── Auth (password gate, cookie-based -- port from Invoice Ledger)
└── Basic layout with nav, theme toggle

Phase 2: Core Pipeline
├── PDF upload Route Handler + file storage
├── Claude API integration (lib/claude.ts, extraction prompt)
├── Upload page UI (drag-drop, progress)
└── Extraction result storage in DB
    Depends on: Phase 1 (DB, auth, file storage)

Phase 3: Review + Approval
├── Review page with confidence highlighting
├── Inline editing of extracted fields
├── VIN validation (check digit algorithm)
├── AP/AR data merge logic
├── Approval workflow (pending → approved)
└── Audit trail logging
    Depends on: Phase 2 (extraction results to review)

Phase 4: Export + Register
├── XLSX template definition (Ministry format)
├── New XLSX generation
├── Append-to-existing XLSX
├── Register page (table view, search, filter)
├── Export selection UI
└── Dashboard with stats
    Depends on: Phase 3 (approved vehicle data to export)
```

## Sources

- [Claude Vision Documentation](https://platform.claude.com/docs/en/build-with-claude/vision) -- native PDF support via document content blocks, base64 encoding
- [Claude PDF Support Documentation](https://platform.claude.com/docs/en/build-with-claude/pdf-support) -- PDF processing uses vision, each page as image + text, 32MB limit
- [Next.js App Router Project Structure](https://nextjs.org/docs/app/getting-started/project-structure) -- official folder conventions
- [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route) -- POST/GET handlers for API endpoints
- [Prisma with Next.js Guide](https://www.prisma.io/nextjs) -- singleton pattern, server component integration
- [ExcelJS for XLSX generation](https://www.davegray.codes/posts/how-to-download-xlsx-files-from-a-nextjs-route-handler) -- server-side XLSX with proper response headers
- AD Auto Invoice Ledger project -- established patterns for auth, Docker, ExcelJS, project structure

---
*Architecture research for: Garage Register Automation (document extraction web app)*
*Researched: 2026-04-08*
