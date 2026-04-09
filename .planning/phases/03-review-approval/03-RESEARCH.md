# Phase 3: Review + Approval - Research

**Researched:** 2026-04-08
**Domain:** PDF preview, form editing with validation, approval workflow
**Confidence:** HIGH

## Summary

Phase 3 builds the most critical screen in the application -- the review interface where Andrey views extracted data alongside the original PDF and corrects any errors before approval. The phase requires three new npm packages (react-pdf, react-hook-form, @hookform/resolvers), two new API routes (vehicle update, document PDF serving), and a new page route at `/vehicles/[id]/review`.

The existing codebase provides strong foundations: the vehicles table already has all fields populated by Phase 2 extraction, ConfidenceBadge and FieldRow components provide the confidence display pattern, and the audit system (logAudit/logAuditBatch) handles field-change tracking. The main implementation work is (1) a react-pdf PDF viewer component with Turbopack-compatible worker configuration, (2) a React Hook Form + Zod form for all 16 extraction fields with confidence-colored borders, and (3) approval/unapproval state transitions with validation.

**Primary recommendation:** Use react-pdf with `new URL()` worker pattern and `ssr: false` dynamic import, React Hook Form v7 with @hookform/resolvers v5 (required for Zod v4 compatibility), and the existing audit infrastructure for field edit tracking.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-29:** Side-by-side layout: PDF preview at 40% width (left), form fields at 60% (right). On mobile (<768px), stack vertically with PDF on top. Matches REVW-01.
- **D-30:** Use react-pdf for in-browser PDF rendering. Shows actual PDF pages, user can scroll through multi-page documents. Dynamic import to avoid SSR issues.
- **D-31:** List-detail navigation pattern. Register page shows vehicles with `pending_review` status. Click opens review page for that vehicle. One vehicle at a time for accuracy.
- **D-32:** Retry button per document -- if extraction was poor, user can click "Re-extract" which re-sends PDF to Claude API. Useful for scanned docs.
- **D-33:** React Hook Form with all ministry register fields as inputs. Pre-filled from extraction data. Zod validation on save. @hookform/resolvers for integration.
- **D-34:** Confidence color-coding on field borders: green (high), amber/yellow (medium), red (low). "Not found" fields = dashed border + grey background. Reuse ConfidenceBadge component from Phase 2.
- **D-35:** User-edited fields get blue border. Original extraction value shown as tooltip on hover. Audit log entry created for each field change (old value -> new value).
- **D-36:** "Approve Record" button at bottom of form. Disabled until all required fields are filled. Changes vehicle status from `pending_review` to `approved`. Requires explicit click -- no auto-approve.
- **D-37:** Required fields for approval: VIN, Year, Make, Model, and at least one of Seller Name or Buyer Name. Price and date fields are optional (can be added later in register).
- **D-38:** "Unapprove" button returns record to `pending_review` status. Only works on `approved` records (not exported ones). Audit log records unapproval.
- **D-39:** Approval feedback: sonner toast "Record approved -- ready for export". Vehicle moves from review pending list.
- **D-40:** No keyboard shortcuts in v1. Large click targets and visual cues are sufficient for Andrey's non-technical workflow.

### Claude's Discretion
- PDF preview zoom level and page navigation controls
- Form field ordering (recommend matching Garage Register column order)
- Loading states for PDF rendering and re-extraction
- Exact required field validation messages

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REVW-01 | User sees extracted fields alongside original PDF preview (side-by-side layout) | react-pdf for PDF rendering, 40/60 split layout with responsive stacking; API endpoint to serve PDF bytea from documents table |
| REVW-02 | Fields are color-coded by extraction confidence (green >90%, yellow 70-90%, red <70%) | Extend ConfidenceBadge colors to form input borders via Tailwind ring utilities; extractionConfidence JSONB already stores per-field levels |
| REVW-03 | User can edit any extracted field before approval | React Hook Form v7 + Zod v4 + @hookform/resolvers v5; all 16 fields as controlled inputs pre-filled from vehicle data |
| REVW-04 | User can explicitly approve a record (approval gate before export) | PUT /api/vehicles/[id] for field updates, POST /api/vehicles/[id]/approve for status change; required field validation before approve |
| REVW-05 | Fields marked as "not found in document" are visually distinct from low-confidence fields | not_found confidence level = dashed border + grey background (distinct from red border for low confidence) |
| UIUX-03 | UI uses large buttons, visual cues, and minimal actions for non-technical user | Large Approve/Unapprove buttons, sonner toasts for feedback, color-coded field borders, no keyboard shortcuts needed |
</phase_requirements>

## Standard Stack

### Core (New Dependencies for Phase 3)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-pdf | 10.4.1 | PDF preview in browser | De-facto standard for rendering PDFs in React. Uses pdf.js under the hood. 1.4M+ weekly downloads. Supports React 19. | [VERIFIED: npm registry] |
| react-hook-form | 7.72.1 | Form state management | Uncontrolled components = fast renders. 16 form fields with minimal re-renders. `useForm` with `defaultValues` pre-fills from extraction data. | [VERIFIED: npm registry] |
| @hookform/resolvers | 5.2.2 | RHF + Zod bridge | v5.2.2 required for Zod v4 compatibility (v3.x does NOT work with Zod v4). Uses Standard Schema protocol. | [VERIFIED: npm registry, GitHub issues] |

### Existing (Already Installed, Used in Phase 3)
| Library | Version | Purpose |
|---------|---------|---------|
| zod | 4.3.6 | Form validation schemas, shared between client and API |
| sonner | ^2.0.7 | Toast notifications for approve/unapprove feedback |
| lucide-react | ^1.7.0 | Icons for navigation, status indicators |
| date-fns | ^4.1.0 | Date formatting for purchase/sale dates |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-pdf | @react-pdf/renderer | Different library -- @react-pdf/renderer is for *generating* PDFs, not *displaying* them. react-pdf is the display library. |
| react-pdf | pdfjs-dist directly | More control but much more code. react-pdf wraps pdf.js with React components. |
| react-hook-form | Formik | Heavier, more re-renders. RHF is the community standard for performance-sensitive forms. |
| @hookform/resolvers v5 | zodResolver from zod/v3 compat | Project uses Zod v4 (4.3.6). The v3 resolver throws ZodError instead of populating formState.errors. Must use v5. |

**Installation:**
```bash
npm install react-pdf react-hook-form @hookform/resolvers
```

**Version verification:**
- react-pdf: 10.4.1 (verified 2026-04-08) [VERIFIED: npm registry]
- react-hook-form: 7.72.1 (verified 2026-04-08) [VERIFIED: npm registry]
- @hookform/resolvers: 5.2.2 (verified 2026-04-08) [VERIFIED: npm registry]
- pdfjs-dist: 5.4.296 (installed automatically as react-pdf dependency) [VERIFIED: npm registry]

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    (app)/
      vehicles/
        [id]/
          review/
            page.tsx          # Review page (server component shell)
      register/
        page.tsx              # Updated: shows pending_review vehicles list
    api/
      vehicles/
        [id]/
          route.ts            # NEW: GET vehicle detail, PUT update fields
          approve/
            route.ts          # NEW: POST approve, DELETE unapprove
          documents/
            [docId]/
              content/
                route.ts      # NEW: GET serve PDF binary for preview
  components/
    review/
      pdf-viewer.tsx          # react-pdf viewer (client component, no SSR)
      review-form.tsx         # React Hook Form with all 16 fields
      confidence-input.tsx    # Input wrapper with confidence-colored border
      approval-bar.tsx        # Approve/Unapprove buttons with status logic
  lib/
    validation/
      vehicle-schema.ts       # NEW: Zod schema for vehicle form validation
```

### Pattern 1: Side-by-Side Layout with Responsive Stacking (D-29)
**What:** 40/60 split layout with PDF on left, form on right. Stacks vertically on mobile.
**When to use:** The review page layout.
**Example:**
```typescript
// Source: D-29, Tailwind responsive utilities
<div className="flex flex-col gap-6 md:flex-row">
  {/* PDF Preview - 40% on desktop, full width on mobile */}
  <div className="w-full md:w-2/5 md:sticky md:top-6 md:self-start">
    <PdfViewer vehicleId={id} />
  </div>
  {/* Form - 60% on desktop, full width on mobile */}
  <div className="w-full md:w-3/5">
    <ReviewForm vehicle={vehicleData} />
  </div>
</div>
```

### Pattern 2: react-pdf with Dynamic Import (D-30)
**What:** Load react-pdf only on client side to avoid SSR issues with pdf.js.
**When to use:** Any component that renders PDFs.
**Example:**
```typescript
// src/components/review/pdf-viewer.tsx
"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Worker must be configured in SAME module as react-pdf components
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

// In the page that uses this component:
// import dynamic from "next/dynamic";
// const PdfViewer = dynamic(() => import("@/components/review/pdf-viewer"), {
//   ssr: false,
//   loading: () => <Skeleton className="h-[600px]" />,
// });
```

### Pattern 3: Confidence-Colored Form Inputs (D-34, D-35)
**What:** Form inputs with border colors based on extraction confidence level.
**When to use:** Every form field in the review form.
**Example:**
```typescript
// Source: D-34 confidence colors, D-35 user-edited blue border
import { cn } from "@/lib/utils";
import type { ConfidenceLevel } from "@/types/extraction";

const CONFIDENCE_BORDER: Record<ConfidenceLevel, string> = {
  high: "ring-green-500/50",
  medium: "ring-amber-500/50",
  low: "ring-red-500/50",
  not_found: "ring-0 border-dashed border-muted bg-muted/30",
};

interface ConfidenceInputProps {
  confidence: ConfidenceLevel;
  isEdited: boolean;
  originalValue?: string;
  // ...rest of input props
}

// When isEdited = true, override with blue ring (D-35)
// Show original value as tooltip on hover
```

### Pattern 4: React Hook Form with Zod v4 (D-33)
**What:** Form state management with validation.
**When to use:** The review form.
**Critical:** Do NOT pass a generic type parameter to `useForm` with Zod v4 -- types are inferred automatically.
**Example:**
```typescript
// Source: Zod v4 + @hookform/resolvers v5 compatibility
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const vehicleFormSchema = z.object({
  jobNumber: z.string().nullable(),
  vin: z.string().min(17, "VIN must be 17 characters").max(17).nullable(),
  year: z.coerce.number().min(1900).max(2100).nullable(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  // ... all 16 fields
});

// CRITICAL: Do NOT use useForm<z.infer<typeof schema>>() with Zod v4
// Types are inferred from the resolver automatically
const form = useForm({
  resolver: zodResolver(vehicleFormSchema),
  defaultValues: {
    // Pre-fill from vehicle extraction data
  },
});
```

### Pattern 5: Audit Trail for Field Edits (D-35)
**What:** Track every field change with old/new values using existing logAuditBatch.
**When to use:** When user saves edited fields.
**Example:**
```typescript
// Source: existing src/lib/audit.ts logAuditBatch
// On form submit, compare current values with original extraction values
const changes: AuditEntry[] = [];
for (const [field, newValue] of Object.entries(formData)) {
  const oldValue = originalData[field];
  if (String(newValue) !== String(oldValue)) {
    changes.push({
      entityType: "vehicle",
      entityId: vehicleId,
      action: "updated",
      userId: session.user.id,
      fieldName: field,
      oldValue: String(oldValue ?? ""),
      newValue: String(newValue ?? ""),
    });
  }
}
if (changes.length > 0) {
  await logAuditBatch(changes);
}
```

### Pattern 6: PDF Content Serving API
**What:** API endpoint that reads bytea from documents table and returns raw PDF for react-pdf.
**When to use:** PdfViewer component needs a URL to load the PDF.
**Example:**
```typescript
// GET /api/vehicles/[id]/documents/[docId]/content
// Returns: Response with Content-Type: application/pdf, body = bytea buffer
const doc = await db.select({ fileData: documents.fileData })
  .from(documents)
  .where(eq(documents.id, docId))
  .limit(1);

return new Response(doc[0].fileData, {
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${filename}"`,
  },
});
```

### Anti-Patterns to Avoid
- **Loading full bytea in status polling:** The existing `/api/vehicles/[id]/status` route correctly excludes `fileData`. Never include binary data in JSON API responses.
- **Passing generic to useForm with Zod v4:** `useForm<z.infer<typeof schema>>()` breaks with Zod v4's input/output type distinction. Let the resolver infer types.
- **Configuring pdf.js worker in a separate file:** The worker configuration gets overwritten by module execution order. Always configure in the same file that renders Document/Page components.
- **Server-side rendering react-pdf:** pdf.js depends on canvas/DOM APIs. Always use `dynamic(() => import(...), { ssr: false })`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF rendering in browser | Custom pdf.js integration | react-pdf Document/Page components | Handles page navigation, scaling, text layers, annotation layers. Hundreds of edge cases with PDF rendering. |
| Form state with 16+ fields | useState for each field | React Hook Form useForm | Uncontrolled components avoid re-rendering all fields on every keystroke. Built-in dirty tracking. |
| Form validation | Manual if/else checks | Zod schema + zodResolver | Type-safe, shared between client and API, declarative, composable. |
| Field change tracking | Manual diff in component | Compare form.getValues() vs defaultValues on submit | React Hook Form tracks dirty state per field via `formState.dirtyFields`. |
| PDF worker loading | Manual script injection | react-pdf pdfjs.GlobalWorkerOptions.workerSrc | The library handles worker lifecycle, communication, and error handling. |

**Key insight:** The review form has 16 fields, each needing confidence display, edit tracking, and validation. Without React Hook Form, managing this state manually would be error-prone and slow. RHF's uncontrolled approach means typing in one field doesn't re-render the other 15.

## Common Pitfalls

### Pitfall 1: Zod v4 + @hookform/resolvers Version Mismatch
**What goes wrong:** ZodError is thrown directly instead of populating `formState.errors`. Form appears to work but validation messages never show.
**Why it happens:** @hookform/resolvers v3.x uses Zod v3 API internally. Zod v4 changed error structure. v5.x uses Standard Schema protocol which works with both.
**How to avoid:** Install @hookform/resolvers v5.2.2 or later. Do NOT use `^3.x`. Do NOT pass explicit generic type to `useForm()`.
**Warning signs:** "Invalid element at key" errors, empty `formState.errors` despite invalid data, ZodError in console. [VERIFIED: GitHub issues #12816, #12829, #4992]

### Pitfall 2: react-pdf Worker Not Loading with Turbopack
**What goes wrong:** "Setting up fake worker" warning, blank PDF pages, or "Module not found" build error.
**Why it happens:** Turbopack handles `new URL()` differently than Webpack. The `import.meta.url` resolution can fail.
**How to avoid:** (1) Configure worker in the SAME file as Document/Page components. (2) Use `dynamic(() => import(...), { ssr: false })` for the wrapper. (3) If `new URL()` fails with Turbopack in production, fall back to CDN: `pdfjs.GlobalWorkerOptions.workerSrc = \`https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs\``. (4) Next.js 16.2's Turbopack has improved Worker support -- test before adding CDN fallback.
**Warning signs:** "Setting up fake worker" in console, PDF pages render blank, long load times. [CITED: github.com/wojtekmaj/react-pdf/issues/1856]

### Pitfall 3: Stale Form Data After Re-extraction (D-32)
**What goes wrong:** User clicks "Re-extract", new data arrives, but form still shows old values.
**Why it happens:** React Hook Form caches `defaultValues` at mount time. Changing props doesn't update the form.
**How to avoid:** Use `form.reset(newData)` when re-extraction completes. Or use a `key` prop on the form component that changes when vehicle data changes (e.g., `key={vehicle.updatedAt}`).
**Warning signs:** Form values don't match displayed extraction results after re-extract. [ASSUMED]

### Pitfall 4: Large PDF Loading Performance
**What goes wrong:** 10MB PDF (max upload size) causes slow loading and high memory usage in browser.
**Why it happens:** react-pdf loads the entire PDF into memory for rendering. Large scanned documents can be 5-10MB.
**How to avoid:** (1) Show loading skeleton while PDF loads (D-30 dynamic import loading state). (2) Render only visible pages, not all pages at once. (3) Use `renderMode="canvas"` (default) and reasonable scale. (4) Consider showing page count and navigating one page at a time.
**Warning signs:** Browser tab becomes unresponsive, high memory usage in dev tools. [ASSUMED]

### Pitfall 5: Approval Button Enabled When Required Fields Empty
**What goes wrong:** User approves a record missing VIN or Make, creating incomplete Garage Register entry.
**Why it happens:** Approval validation not tied to form validation state.
**How to avoid:** Per D-37, required fields are: VIN, Year, Make, Model, and at least one of Seller Name or Buyer Name. Create a separate Zod schema for approval validation (stricter than save validation). Disable approve button until this schema validates. Use `form.watch()` on required fields to reactively enable/disable.
**Warning signs:** Approved records with null VIN in database. [ASSUMED]

### Pitfall 6: Numeric Fields Saved as Strings
**What goes wrong:** Year, odometer, prices stored as strings in database after user edit.
**Why it happens:** HTML inputs always return string values. Without coercion, "2024" stays a string.
**How to avoid:** Use `z.coerce.number()` in Zod schema for year and odometer. Use `z.coerce.number()` or custom transform for prices. The Drizzle schema uses `integer` for year/odometer and `numeric(10,2)` for prices -- type mismatch causes silent data corruption.
**Warning signs:** Database queries return unexpected types, price calculations fail. [ASSUMED]

## Code Examples

### Vehicle Update API Route (PUT /api/vehicles/[id])
```typescript
// Source: existing API patterns from src/app/api/vehicles/route.ts
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { vehicles } from "@/lib/db/schema";
import { apiSuccess, apiError } from "@/lib/api-response";
import { logAuditBatch } from "@/lib/audit";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return apiError("Unauthorized", 401);

  // Validate body with Zod schema
  const body = await request.json();
  // ... validate, update vehicle, log audit entries for changed fields

  return apiSuccess({ vehicle: updated });
}
```

### Approval API Route (POST /api/vehicles/[id]/approve)
```typescript
// Source: D-36, D-37 approval requirements
export async function POST(request: NextRequest, { params }) {
  // Validate required fields: VIN, Year, Make, Model, at least one of Seller/Buyer
  // Change status from pending_review to approved
  // Log audit: action "updated", fieldName "status", newValue "approved"
  // Return success
}

// DELETE /api/vehicles/[id]/approve for unapprove (D-38)
export async function DELETE(request: NextRequest, { params }) {
  // Only allowed on "approved" records (not "exported")
  // Change status back to pending_review
  // Log audit: action "updated", fieldName "status", newValue "pending_review"
}
```

### Form Field with Confidence Border
```typescript
// Source: D-34, D-35 confidence colors and edit tracking
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ConfidenceLevel } from "@/types/extraction";
import type { UseFormRegisterReturn } from "react-hook-form";

const CONFIDENCE_RING: Record<ConfidenceLevel, string> = {
  high: "ring-2 ring-green-500/40",
  medium: "ring-2 ring-amber-500/40",
  low: "ring-2 ring-red-500/40",
  not_found: "border-dashed border-muted-foreground/30 bg-muted/20",
};

interface ConfidenceInputProps {
  label: string;
  confidence: ConfidenceLevel;
  isEdited: boolean;
  originalValue?: string | null;
  registration: UseFormRegisterReturn;
  error?: string;
}

export function ConfidenceInput({
  label, confidence, isEdited, originalValue, registration, error,
}: ConfidenceInputProps) {
  const ringClass = isEdited ? "ring-2 ring-blue-500/50" : CONFIDENCE_RING[confidence];

  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <Input {...registration} className={cn(ringClass)} />
        </TooltipTrigger>
        {isEdited && originalValue !== undefined && (
          <TooltipContent>Original: {originalValue ?? "Not found"}</TooltipContent>
        )}
      </Tooltip>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @hookform/resolvers v3 + Zod v3 | @hookform/resolvers v5 + Zod v4 (Standard Schema) | 2025 | Must use v5 for Zod v4 compat -- v3 throws errors |
| react-pdf v7 with webpack config | react-pdf v10 with `new URL()` worker | 2024 | Simpler config, ESM worker, no webpack-specific setup |
| FormField/FormItem/FormLabel (shadcn v3) | Field/FieldLabel/FieldError or Controller pattern (shadcn v4) | 2025 | shadcn v4 uses @base-ui/react, different component structure |

**Deprecated/outdated:**
- @hookform/resolvers v3.x: Does NOT work with Zod v4. Must use v5.x.
- react-pdf copyWorker webpack plugin: No longer needed with `new URL()` pattern.
- shadcn/ui `Form` component (legacy): The project uses shadcn v4 (base-nova) with @base-ui/react. Use Controller pattern from react-hook-form directly with shadcn Input/Label components.

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this
> section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | form.reset(newData) properly resets RHF form when re-extraction completes | Pitfall 3 | Form shows stale data; user approves wrong values |
| A2 | Large PDFs (5-10MB) may cause browser performance issues with react-pdf | Pitfall 4 | Slow review page; may need lazy page rendering |
| A3 | HTML input string values need z.coerce for numeric DB columns | Pitfall 6 | Silent data type corruption in PostgreSQL |
| A4 | Next.js 16.2 Turbopack `new URL()` worker pattern works for react-pdf | Pitfall 2 | Need CDN fallback for pdf.js worker |

**If this table is empty:** N/A -- four assumptions documented above.

## Open Questions

1. **react-pdf Turbopack compatibility in this exact setup**
   - What we know: Next.js 16.2 Turbopack improved Worker support. react-pdf 10.x uses pdfjs-dist 5.x. Some users report issues on Next.js 16.
   - What's unclear: Whether `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)` works correctly with this project's exact Next.js 16.2.3 + Turbopack setup.
   - Recommendation: Try `new URL()` first. If it fails, add CDN fallback: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`. Test both dev and build.

2. **shadcn v4 Form component vs Controller pattern**
   - What we know: shadcn v4 (base-nova) has moved to Field/FieldLabel/FieldError components instead of the old FormField pattern. The project uses @base-ui/react.
   - What's unclear: Whether `npx shadcn@latest add form` installs the new Field components or older FormField components in this project.
   - Recommendation: Use react-hook-form Controller directly with existing shadcn Input/Label components. This avoids shadcn Form component dependency entirely and is more predictable.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| react-pdf | PDF preview (D-30) | Not installed | 10.4.1 (target) | npm install |
| react-hook-form | Form editing (D-33) | Not installed | 7.72.1 (target) | npm install |
| @hookform/resolvers | Zod + RHF bridge | Not installed | 5.2.2 (target) | npm install |
| pdfjs-dist | react-pdf dependency | Auto-installed | 5.4.296 | -- |

**Missing dependencies with no fallback:**
- react-pdf, react-hook-form, @hookform/resolvers must be installed via npm

**Missing dependencies with fallback:**
- None

## Project Constraints (from CLAUDE.md)

- **Deployment:** Coolify on Hetzner CX43 -- Docker container, shared PostgreSQL
- **Regulatory:** Garage Register data must be accurate -- human review mandatory before export
- **User:** Andrey is non-technical -- UI must be self-explanatory
- **API patterns:** Auth via `auth.api.getSession({ headers: request.headers })`, responses via `apiSuccess`/`apiError`
- **Audit:** All state changes logged via `logAudit`/`logAuditBatch`, append-only (AUDT-01, AUDT-02, AUDT-03)
- **Path alias:** `@/*` maps to `./src/*`
- **shadcn v4:** Uses @base-ui/react (base-nova), not Radix primitives
- **Status enum:** `vehicleStatusEnum` = extracting | pending_review | approved | exported
- **Audit action enum:** `auditActionEnum` = created | updated | deleted | exported -- use "updated" for approve/unapprove with fieldName "status"
- **PDF storage:** Documents stored as bytea in `documents.fileData` column -- need API route to serve binary for preview
- **Existing route pattern:** Async params: `{ params }: { params: Promise<{ id: string }> }` with `const { id } = await params;`

## Existing Code Inventory

### Components to Reuse
| Component | Path | How Used in Phase 3 |
|-----------|------|---------------------|
| ConfidenceBadge | `src/components/upload/confidence-badge.tsx` | Reuse for inline confidence labels next to form fields |
| VinStatus | `src/components/upload/vin-status.tsx` | Display VIN validation result on review page |
| Input | `src/components/ui/input.tsx` | Base input for all form fields |
| Label | `src/components/ui/label.tsx` | Field labels in review form |
| Button | `src/components/ui/button.tsx` | Approve, Unapprove, Re-extract buttons |
| Card | `src/components/ui/card.tsx` | Card wrapper for form sections |
| Skeleton | `src/components/ui/skeleton.tsx` | Loading state for PDF viewer |
| Tooltip | `src/components/ui/tooltip.tsx` | Show original extraction value on edited fields (D-35) |
| Separator | `src/components/ui/separator.tsx` | Section dividers in form |

### API Patterns to Follow
| Pattern | Source | Apply To |
|---------|--------|----------|
| Session guard | `auth.api.getSession({ headers: request.headers })` | All new API routes |
| Response format | `apiSuccess(data)` / `apiError(message, status)` | All new API responses |
| Async params | `{ params: Promise<{ id: string }> }` | All dynamic route handlers |
| Audit logging | `logAudit()` / `logAuditBatch()` | Field edits, approval, unapproval |
| Exclude fileData | Select specific columns, not `select()` | Document queries (avoid loading bytea) |

### Database Schema Context
| Table | Relevant Columns | Phase 3 Usage |
|-------|------------------|---------------|
| vehicles | All 16 data fields + status + extractionConfidence | Read for form defaults, update on save, status change on approve |
| documents | id, vehicleId, type, filename, fileData | Serve PDF binary for preview, re-extraction trigger |
| auditLog | entityType, entityId, action, fieldName, oldValue, newValue | Log field edits, approval, unapproval |

### Field Order (Matching Garage Register XLSX)
Per D-33 and CONTEXT.md specifics, form fields should match the Garage Register column order:
1. Job Number (jobNumber)
2. VIN (vin) -- with VinStatus validation display
3. Year (year)
4. Make (make)
5. Model (model)
6. Color (color)
7. Odometer (odometer)
8. Seller Name (sellerName)
9. Seller Address (sellerAddress)
10. Buyer Name (buyerName)
11. Buyer Address (buyerAddress)
12. Purchase Date (purchaseDate)
13. Sale Date (saleDate)
14. Purchase Price (purchasePrice)
15. Sale Price (salePrice)
16. Stock Number (stockNumber)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing: auth.api.getSession() guard on all API routes |
| V3 Session Management | yes | Existing: Better Auth session with 30-day expiry |
| V4 Access Control | yes | Existing: session check before any data mutation |
| V5 Input Validation | yes | Zod schema validation on all PUT/POST bodies; z.coerce for type safety |
| V6 Cryptography | no | No crypto operations in this phase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized vehicle data modification | Tampering | Session validation on PUT /api/vehicles/[id] |
| IDOR on vehicle/document access | Information Disclosure | Verify vehicleId belongs to session user (single-user app, but pattern matters) |
| XSS via extraction data in form fields | Tampering | React's default escaping + Zod validation on save |
| PDF content injection | Tampering | react-pdf renders in sandboxed canvas, not DOM injection |
| Approval without required fields | Elevation of Privilege | Server-side Zod validation on approve endpoint (D-37 required fields) |

## Sources

### Primary (HIGH confidence)
- npm registry -- react-pdf 10.4.1, react-hook-form 7.72.1, @hookform/resolvers 5.2.2, pdfjs-dist 5.4.296 versions verified
- Existing codebase -- schema.ts, audit.ts, api-response.ts, extraction-results.tsx patterns verified by reading source files
- [react-pdf README](https://github.com/wojtekmaj/react-pdf/blob/main/packages/react-pdf/README.md) -- Worker configuration, Next.js setup, SSR avoidance

### Secondary (MEDIUM confidence)
- [Zod v4 + RHF compatibility](https://github.com/colinhacks/zod/issues/4992) -- v5.2.1+ resolvers needed, useForm generic pitfall
- [react-pdf Turbopack issue](https://github.com/wojtekmaj/react-pdf/issues/1856) -- Known issues and Next.js 16 status
- [shadcn/ui forms docs](https://ui.shadcn.com/docs/forms/react-hook-form) -- Field component pattern, zodResolver usage
- [Next.js 16.2 Turbopack improvements](https://nextjs.org/blog/next-16-2-turbopack) -- Worker handling improvements

### Tertiary (LOW confidence)
- Turbopack + react-pdf on Next.js 16 exact compatibility -- needs testing in this specific project setup

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified on npm, versions confirmed, peer deps compatible with React 19
- Architecture: HIGH -- patterns derived from existing codebase code review, all integration points verified
- Pitfalls: HIGH for Zod v4 compat (verified via GitHub issues), MEDIUM for Turbopack worker (reports vary by setup)
- Form patterns: HIGH -- React Hook Form + Zod is battle-tested, just need v5 resolvers for Zod v4

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (30 days -- stable ecosystem)
