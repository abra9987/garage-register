# Phase 5: PDF Preview on Upload - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Andrey can see a visual preview of uploaded AP/AR PDF files before submitting for extraction, confirming correct documents were selected. Preview shows first page of PDF immediately after file drop using client-side File API — no server round-trip needed.

</domain>

<decisions>
## Implementation Decisions

### Preview Component Design
- Create lightweight inline preview component (first page only, no zoom/navigation) — full PdfPreview from review page is overkill for confirmation
- Use client-side File API (`URL.createObjectURL(file)`) for immediate preview after drop — no server round-trip
- Replace DropZone content area with preview when file is selected — same card transforms from drop target to preview + remove button
- Show first page with "N pages" badge for multi-page PDFs — no pagination controls needed

### Remove & Error Handling
- X icon button overlaid on preview top-right corner — consistent with current DropZone remove pattern
- Invalid PDF shows toast error via Sonner and reverts to empty DropZone — same error pattern used throughout app
- Skeleton placeholder matching preview area dimensions while PDF renders — consistent with existing Skeleton usage

### Claude's Discretion
- Exact preview container dimensions (should match or be proportional to DropZone height)
- react-pdf worker configuration reuse from existing PdfPreview setup

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `react-pdf` (^10.4.1) already installed with pdfjs worker configured
- `PdfPreview` component at `src/components/review/pdf-preview.tsx` — reference for react-pdf patterns (Document/Page components, worker config, loading/error states)
- `DropZone` component at `src/components/upload/drop-zone.tsx` — already has file state, remove button, drag-over states
- `Skeleton` component from shadcn/ui — for loading state
- `Sonner` toast — for error notifications

### Established Patterns
- Dynamic import with `ssr: false` for react-pdf components (see review page)
- `URL.createObjectURL()` pattern for client-side file handling
- Card-based layout with consistent spacing in upload page
- `renderTextLayer={true}`, `renderAnnotationLayer={true}` settings

### Integration Points
- `src/app/(app)/upload/page.tsx` — main upload page, manages `apFile`/`arFile` state
- `src/components/upload/drop-zone.tsx` — receives `onDrop` callback, shows file info
- File state: `apFile` and `arFile` as `File | null` in upload page

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard approaches using existing patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
