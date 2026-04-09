# Phase 4: Export + Register + Dashboard - Research

**Researched:** 2026-04-08
**Domain:** XLSX generation/modification, data table with search/filter/sort, dashboard aggregation
**Confidence:** HIGH

## Summary

Phase 4 is the final phase -- it delivers the three remaining UI surfaces (Export, Register, Dashboard) and their supporting API endpoints. The XLSX export is the most technically challenging piece: it requires pixel-perfect Ministry of Transportation Ontario Garage Register format matching, with two modes (create new, append to existing). The register table needs server-side search, sort, filter, and pagination with URL-synced state. The dashboard is straightforward stat cards + activity feed.

ExcelJS 4.4.0 is already in `package.json` and handles both modes. The Ministry template has been fully analyzed: 4 sheets (2 title pages, 2 data sheets by year range), data starts at row 7 on the "2026, Jan-Dec" sheet, 17 columns (col 1 is spacer, col 2 is Andrey's notes, cols 3-17 map to vehicle data). Key formatting: Aptos Narrow 12pt font, thin borders, dates as Excel date type with `mm-dd-yy` numFmt, month separator rows with yellow fill. For append mode, the critical operation is finding the last data row and inserting after it while copying formatting from the previous data row.

**Primary recommendation:** Build export engine as a standalone utility (`src/lib/export/garage-register.ts`) that takes an array of vehicle records and returns an ExcelJS workbook buffer. This keeps it testable and reusable for both new-export and append-to-existing modes. Use nuqs for register URL state, server-side Drizzle queries for search/filter, and simple count queries for dashboard stats.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-41:** Two export modes: (1) "Export New" creates fresh XLSX from selected approved records in exact Ministry format. (2) "Append to Existing" lets user upload their current Garage Register XLSX and appends new records to the end.
- **D-42:** Use ExcelJS for both modes. Already proven in Invoice Ledger. For "Export New" -- use the Ministry template structure (header row + data rows, specific column widths/formatting). For "Append" -- read existing file, find last data row, insert after.
- **D-43:** Export selection via checkboxes in the register table. "Export Selected" button appears when >= 1 approved record is checked. Exported records get `exported` status + `exportedAt` timestamp.
- **D-44:** Downloaded XLSX filename pattern: `Garage_Register_{YYYY-MM-DD}.xlsx` for new, original filename preserved for append.
- **D-45:** Reference file `AD Auto CANADA Garage Register 2025-2026.xlsx` is the Ministry template. Column order and headers MUST match exactly.
- **D-46:** Sortable table with columns: Job#, VIN, Year, Make, Model, Status, Date Acquired, Date Disposed. Click column header to sort. Default sort: newest first (createdAt desc).
- **D-47:** Search bar at top -- searches across VIN, job number, make, model, seller name, buyer name. Server-side search for accuracy.
- **D-48:** Filter chips: by status (pending_review, approved, exported) and date range (this month, last 3 months, custom). Filters combine with AND logic.
- **D-49:** Pagination: 25 records per page. Show total count. Simple prev/next navigation.
- **D-50:** Use nuqs for URL-synced search params -- filters and search persist in URL for bookmarking/sharing.
- **D-51:** Dashboard is the home page (sidebar "Dashboard" nav item). Shows 3 stat cards: Pending Review count, Exported This Month count, Total Vehicles count.
- **D-52:** Recent activity feed below stat cards -- last 20 actions from audit_log (uploads, approvals, exports). Shows action type icon, vehicle job#, timestamp, relative time (date-fns formatDistanceToNow).
- **D-53:** Quick action buttons on dashboard: "Upload New Vehicle" (links to /upload), "View Register" (links to /register).
- **D-54:** Dashboard and register table must be usable on mobile (UIUX-01). Cards stack vertically, table becomes card-based list on small screens.

### Claude's Discretion
- Exact Ministry XLSX column widths and formatting (derive from reference file)
- Activity feed icon choices per action type
- Register table responsive breakpoint behavior
- Loading states for export generation
- Empty state designs for register and dashboard

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| XPRT-01 | Export approved records to new XLSX in Ministry format | Ministry template fully analyzed (17 cols, formatting details). ExcelJS `addRow()` + cell styling documented. Column-to-DB-field mapping complete. |
| XPRT-02 | Upload existing XLSX and append new records | ExcelJS `readFile()` + `worksheet.lastRow` + `addRow()` pattern. Theme/formatting preservation verified in ExcelJS docs. |
| XPRT-03 | Preserve existing data and formatting when appending | ExcelJS preserves theme files on read/write. Must copy cell styles from last data row to new rows. Font/border/fill details captured from template analysis. |
| XPRT-04 | Select which approved records to include | Checkbox-based selection in register table (D-43). shadcn `checkbox` component needed. |
| XPRT-05 | One-click downloadable XLSX | API route returns `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` with Content-Disposition header. Client triggers via anchor download. |
| REGS-01 | Sortable vehicle table | Drizzle `orderBy` with `asc`/`desc` operators. Column sort via URL param (nuqs). shadcn `table` component needed. |
| REGS-02 | Search by VIN, job#, make, model, seller, buyer | Drizzle `ilike` + `or` operators for multi-field search. Server-side query. |
| REGS-03 | Filter by status and date range | Drizzle `eq`/`inArray` for status filter, `gte`/`lte` for date range. nuqs for URL state. |
| DASH-01 | Pending review count | Drizzle `count()` with `eq(vehicles.status, 'pending_review')` |
| DASH-02 | Exported this month count | Drizzle `count()` with status='exported' + `gte(vehicles.exportedAt, firstOfMonth)` |
| DASH-03 | Recent activity feed | Drizzle query on `auditLog` table, ordered by timestamp desc, limit 20. Join to vehicles for job number. |
| UIUX-01 | Mobile responsive | Table becomes card list on small screens. Dashboard cards stack. Tailwind responsive utilities. |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ExcelJS | 4.4.0 | XLSX read/write/create | Already in package.json. Handles both create-new and append-to-existing. Preserves themes on read/write. [VERIFIED: npm registry, 4.4.0 is latest] |
| date-fns | 4.1.0 | Date formatting + relative time | Already installed. `formatDistanceToNow` for activity feed, `format` for date display, `startOfMonth` for dashboard query. [VERIFIED: npm registry, 4.1.0 is latest] |
| Drizzle ORM | 0.45.2 | Database queries | Already installed. All needed operators available: `ilike`, `or`, `and`, `eq`, `count`, `desc`, `asc`, `gte`, `lte`, `between`, `inArray`. [VERIFIED: codebase + runtime check] |

### New Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nuqs | 2.8.9 | URL-synced search params | Register page search/filter/sort/pagination state. `useQueryState` and `useQueryStates` hooks. [VERIFIED: npm registry, 2.8.9 is latest] |

### shadcn Components to Install
| Component | Purpose |
|-----------|---------|
| table | Register data table (header, body, rows, cells) |
| checkbox | Record selection for export |
| select | Status filter dropdown |
| popover | Date range picker trigger |
| calendar | Custom date range selection |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| nuqs | React useState + manual URL sync | nuqs is 6 KB, handles serialization/parsing, integrates with App Router. Manual approach is error-prone. |
| ExcelJS for new export | Template file copy + fill | Template copy would preserve perfect formatting but is fragile if Ministry changes template. Building from scratch with captured formatting is more maintainable. |
| Server-side search | Client-side filter | Client-side breaks at scale and misses DB records not yet loaded. Server-side is correct for accuracy (D-47). |

### Installation
```bash
npm install nuqs
npx shadcn@latest add table checkbox select popover calendar
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   └── export/
│       └── garage-register.ts     # XLSX generation engine (both modes)
├── app/
│   ├── (app)/
│   │   ├── dashboard/
│   │   │   └── page.tsx           # Stat cards + activity feed (replace placeholder)
│   │   ├── register/
│   │   │   └── page.tsx           # Sortable table + search/filter (replace existing)
│   │   └── export/
│   │       └── page.tsx           # Export UI (replace placeholder)
│   └── api/
│       ├── vehicles/
│       │   └── route.ts           # Extend GET with search/filter/sort/pagination
│       ├── export/
│       │   ├── route.ts           # POST: generate new XLSX from selected records
│       │   └── append/
│       │       └── route.ts       # POST: append to uploaded XLSX
│       └── dashboard/
│           └── route.ts           # GET: stat counts + recent activity
├── components/
│   ├── register/
│   │   ├── vehicle-table.tsx      # Sortable data table with checkboxes
│   │   ├── search-bar.tsx         # Search input with debounce
│   │   ├── filter-bar.tsx         # Status + date range filter chips
│   │   └── pagination.tsx         # Prev/next + total count
│   ├── dashboard/
│   │   ├── stat-card.tsx          # Count card component
│   │   └── activity-feed.tsx      # Recent activity list
│   └── export/
│       ├── export-actions.tsx     # Export New + Append buttons
│       └── append-upload.tsx      # Upload existing XLSX for append
```

### Pattern 1: XLSX Export Engine
**What:** Standalone export module that transforms vehicle records into Ministry-format XLSX
**When to use:** Both "Export New" and "Append to Existing" call into this engine
**Example:**
```typescript
// src/lib/export/garage-register.ts
// Source: Analysis of AD Auto CANADA Garage Register 2025-2026.xlsx
import ExcelJS from "exceljs";

// Ministry column mapping (verified from template analysis)
// Col 1: spacer, Col 2: notes (empty for auto-export)
// Cols 3-17 map to vehicle data
const MINISTRY_COLUMNS = {
  3: "jobNumber",    // Internal #
  4: "sellerName",   // Purchased From - Name
  5: "sellerAddress", // Purchased From - Address
  6: "make",         // Make / Marque
  7: "model",        // Style / Modele
  8: "year",         // Year (number type)
  9: "vin",          // Serial No.
  10: "color",       // Colour
  11: "odometer",    // Odometer Reading (string with "km")
  12: null,          // Plate No. (usually empty)
  13: "purchaseDate", // Date into Stock (Excel date, mm-dd-yy format)
  14: "Export",      // Always "Export" for AD Auto
  15: "saleDate",    // Date out of Stock (Excel date, mm-dd-yy format)
  16: "buyerName",   // Sold To - Name
  17: "buyerAddress", // Sold To - Address
} as const;

// Cell formatting captured from template
const DATA_CELL_STYLE: Partial<ExcelJS.Style> = {
  font: { name: "Aptos Narrow", size: 12 },
  border: {
    left: { style: "thin", color: { indexed: 64 } },
    right: { style: "thin", color: { indexed: 64 } },
    top: { style: "thin", color: { indexed: 64 } },
    bottom: { style: "thin", color: { indexed: 64 } },
  },
};

const DATE_NUM_FMT = "mm-dd-yy";
```
[VERIFIED: Direct analysis of Ministry template XLSX]

### Pattern 2: Server-side Search/Filter/Sort with Drizzle
**What:** API route that builds dynamic Drizzle queries from URL search params
**When to use:** GET /api/vehicles with query params
**Example:**
```typescript
// Source: Verified Drizzle ORM operators available in codebase
import { ilike, or, and, eq, inArray, gte, lte, desc, asc, count, sql } from "drizzle-orm";

// Search: ilike across multiple fields with OR
const searchCondition = search
  ? or(
      ilike(vehicles.vin, `%${search}%`),
      ilike(vehicles.jobNumber, `%${search}%`),
      ilike(vehicles.make, `%${search}%`),
      ilike(vehicles.model, `%${search}%`),
      ilike(vehicles.sellerName, `%${search}%`),
      ilike(vehicles.buyerName, `%${search}%`),
    )
  : undefined;

// Status filter: eq or inArray
const statusCondition = status
  ? eq(vehicles.status, status)
  : undefined;

// Date range: gte + lte on createdAt
const dateCondition = dateFrom && dateTo
  ? and(gte(vehicles.createdAt, dateFrom), lte(vehicles.createdAt, dateTo))
  : undefined;

// Combine with AND
const where = and(searchCondition, statusCondition, dateCondition);

// Sort: dynamic column + direction
const orderByClause = sortDir === "asc"
  ? asc(vehicles[sortCol])
  : desc(vehicles[sortCol]);

// Pagination
const results = await db.select().from(vehicles)
  .where(where)
  .orderBy(orderByClause)
  .limit(25)
  .offset((page - 1) * 25);

// Total count for pagination
const [{ total }] = await db.select({ total: count() })
  .from(vehicles)
  .where(where);
```
[VERIFIED: Runtime check confirmed all Drizzle operators available]

### Pattern 3: nuqs URL State for Register
**What:** Type-safe URL search params that persist across page loads
**When to use:** Register page search, sort, filter, pagination
**Example:**
```typescript
// Source: nuqs.dev official docs
"use client";
import { useQueryStates, parseAsString, parseAsInteger, parseAsStringLiteral } from "nuqs";

const statusValues = ["pending_review", "approved", "exported"] as const;

// Atomic multi-param state
const [params, setParams] = useQueryStates({
  search: parseAsString.withDefault(""),
  status: parseAsStringLiteral(statusValues),
  page: parseAsInteger.withDefault(1),
  sort: parseAsString.withDefault("createdAt"),
  dir: parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc"),
  dateFrom: parseAsString,
  dateTo: parseAsString,
});
```
[CITED: nuqs.dev]

### Pattern 4: Activity Feed with Audit Log Join
**What:** Query audit_log joined to vehicles for job number display
**When to use:** Dashboard recent activity feed (D-52)
**Example:**
```typescript
// Source: Existing codebase patterns (auditLog schema + Drizzle)
import { auditLog, vehicles } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

const recentActivity = await db
  .select({
    id: auditLog.id,
    action: auditLog.action,
    entityType: auditLog.entityType,
    entityId: auditLog.entityId,
    fieldName: auditLog.fieldName,
    timestamp: auditLog.timestamp,
    jobNumber: vehicles.jobNumber,
  })
  .from(auditLog)
  .leftJoin(vehicles, eq(auditLog.entityId, vehicles.id))
  .orderBy(desc(auditLog.timestamp))
  .limit(20);
```
[VERIFIED: Schema analysis of auditLog + vehicles tables]

### Anti-Patterns to Avoid
- **Client-side search/filter:** Never load all vehicles and filter in the browser. Always use server-side queries. At 25 deals/month, the table will grow over time.
- **Modifying Ministry template in-place for "new" export:** Do not modify the reference XLSX file. Generate fresh workbooks from code. The reference file is read-only source of truth for format validation.
- **Storing XLSX files on server:** Export is stateless. Generate, send to client, do not persist. Export history is a v2 requirement (ENHN-07).
- **Using ExcelJS `worksheet.addRows()` (plural):** Use `addRow()` one at a time so you can copy formatting from the previous row to each new row. `addRows()` does not copy styles.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL state management | Manual URLSearchParams sync | nuqs | Handles serialization, defaults, browser history, shallow updates. 6 KB. |
| XLSX generation | Custom XML builder | ExcelJS | XLSX is a complex ZIP of XML files. ExcelJS handles styles, dates, formulas, themes. |
| Date relative formatting | Manual "X minutes ago" | date-fns `formatDistanceToNow` | Handles all edge cases (just now, minutes, hours, days, months). Locale-aware. |
| Debounced search input | Manual setTimeout/clearTimeout | Debounce via `setTimeout` in useEffect | Actually fine to hand-roll this -- it is 5 lines. No library needed. |
| Sortable table headers | Custom sort logic | shadcn table + Drizzle `orderBy` | shadcn provides the UI, Drizzle provides the DB sort. The glue is a URL param. |

**Key insight:** The XLSX export is the only technically complex piece in this phase. Everything else is standard CRUD patterns with good UI components. The trap is spending time on custom table logic when shadcn + Drizzle + nuqs handle it cleanly.

## Ministry XLSX Template Analysis

### Template Structure (verified from file analysis)
[VERIFIED: Direct ExcelJS analysis of `AD Auto CANADA Garage Register 2025-2026.xlsx`]

**Sheets:**
| Index | Name | Purpose |
|-------|------|---------|
| 0 | Title 1 | Ministry header page (garage name, license, address) |
| 1 | Title 2 | Legal text (Highway Traffic Act sections, bilingual) |
| 2 | 2026, Jan-Dec | Current year data sheet (target for "Export New") |
| 3 | 2025, Jun-Dec | Previous year data sheet |

**Data Sheet Structure (Sheet "2026, Jan-Dec"):**
- Row 1: Title "GARAGE REGISTER / INSCRIPTION DE GARAGE" (height 29)
- Row 3: Notes row (merged C3:M3)
- Row 4-5: Header rows (merged cells: B4:B5, C4:C5, D4:E4, F4:J4, M4:M5, N4:N5, O4:O5, P4:Q4)
- Row 6: Month separator "2026 January" (yellow fill `FFFFFF00`, col 3)
- Row 7+: Data rows
- Between months: separator row with yellow fill and month label in col 3

**Column Mapping (cols 1-17):**

| Col | Width | Header | DB Field | Type | Notes |
|-----|-------|--------|----------|------|-------|
| 1 | 7.5 | (spacer) | -- | -- | Always empty |
| 2 | 9.66 | (notes) | -- | string | Andrey's initials (e.g., "AD", "PBS"). Leave empty for auto-export. |
| 3 | 17.66 | Internal # | `jobNumber` | string | e.g., "26-J23182" |
| 4 | 37.33 | Name / Nom (Purchased From) | `sellerName` | string | |
| 5 | 48.66 | Address / Adresse (Purchased From) | `sellerAddress` | string | |
| 6 | 14.83 | Make / Marque | `make` | string | |
| 7 | 43.83 | Style / Modele | `model` | string | |
| 8 | 6.5 | Year | `year` | number | Stored as Excel number (not string) |
| 9 | 23.33 | Serial No. / No de serie | `vin` | string | |
| 10 | 14.83 | Colour | `color` | string | |
| 11 | 11.33 | Odometer Reading | `odometer` | string | Stored as text with "km" suffix (e.g., "43,588 km") |
| 12 | 0.33 | Plate No. | -- | string | Usually empty. Column nearly hidden (width 0.33). |
| 13 | 12.83 | Date into Stock | `purchaseDate` | date | Excel date type, numFmt `mm-dd-yy` |
| 14 | 12.83 | Re-sale/wrecking/Consignment | "Export" | string | Always "Export" for AD Auto |
| 15 | 14.33 | Date out of Stock | `saleDate` | date | Excel date type, numFmt `mm-dd-yy` |
| 16 | 38.0 | Name / Nom (Sold To) | `buyerName` | string | |
| 17 | 81.83 | Address / Adresse (Sold To) | `buyerAddress` | string | |

**Cell Formatting for Data Rows:**
- Font: Aptos Narrow, size 12 (all data cells)
- Borders: thin, color indexed 64 (all sides)
- Date cells: numFmt `mm-dd-yy`, ExcelJS date type
- Year cell: number type (no numFmt)
- All other cells: string type
- No fill/background on data rows (only headers and month separators have fill)

**Month Separator Rows:**
- Col 3: "YYYY MonthName" (e.g., "2026 January")
- Font: Aptos Narrow, size 12
- Fill: yellow (`FFFFFF00`)

**2025 Sheet Difference:** Has extra Col 18 "Nominee. Acted as Agent" -- the 2026 sheet does not have this column. For "Append to Existing" mode, detect column count to determine whether to write col 18.

### Export New Strategy
For XPRT-01 ("Export New"), generate a fresh workbook with only the data sheet (no Title pages needed for a standalone export file). Include:
1. Header rows (4-5) with merged cells and formatting
2. Month separator rows grouped by purchaseDate month
3. Data rows with Ministry formatting
4. Column widths matching template

### Append to Existing Strategy
For XPRT-02/03 ("Append to Existing"):
1. Read uploaded XLSX with ExcelJS `workbook.xlsx.read(buffer)`
2. Find the last data sheet (by name pattern "YYYY, Mon-Mon" or take last sheet)
3. Find last data row: `worksheet.lastRow` (ExcelJS property)
4. For each vehicle record: call `worksheet.addRow()` with values array
5. Copy cell styles from previous data row to new row using `eachCell()` iteration
6. Write buffer and return to client

## Common Pitfalls

### Pitfall 1: ExcelJS Date Handling
**What goes wrong:** Dates stored as strings in PostgreSQL (`date` column type returns `"YYYY-MM-DD"` string from Drizzle). ExcelJS needs a JavaScript `Date` object to write proper Excel date cells with numFmt.
**Why it happens:** Drizzle's `date()` column returns ISO date strings, not Date objects. If you pass a string to ExcelJS, it writes a text cell, not a date cell.
**How to avoid:** Convert date strings to JavaScript `Date` objects before passing to ExcelJS: `new Date(purchaseDate + "T00:00:00")`. Set `cell.numFmt = "mm-dd-yy"` explicitly.
**Warning signs:** Dates appear left-aligned in Excel (text) instead of right-aligned (date).

### Pitfall 2: ExcelJS Append Mode Style Loss
**What goes wrong:** When appending rows to an existing workbook, new rows have no formatting (no borders, wrong font).
**Why it happens:** `worksheet.addRow()` adds raw data without styles. ExcelJS does not auto-inherit styles from the previous row.
**How to avoid:** After `addRow()`, iterate through each cell of the new row and explicitly set the style object (font, border, fill, numFmt) matching the template.
**Warning signs:** Exported XLSX looks correct for existing data but new rows appear unstyled.

### Pitfall 3: Odometer Formatting in Ministry Template
**What goes wrong:** Odometer is stored as `integer` in the DB but the Ministry template shows it as text like "43,588 km" or "80 km".
**Why it happens:** The template uses free-text odometer field, not a numeric field.
**How to avoid:** Format odometer as string with comma-separated thousands and " km" suffix: `odometer ? \`${odometer.toLocaleString()} km\` : null`. Write as string cell, not number.
**Warning signs:** Odometer appears as plain number without "km" suffix in exported XLSX.

### Pitfall 4: nuqs Requires NuqsAdapter in Layout
**What goes wrong:** `useQueryState` throws error about missing adapter/context.
**Why it happens:** nuqs v2 requires a `NuqsAdapter` component wrapping the app for Next.js App Router.
**How to avoid:** Add `<NuqsAdapter>` in the root layout or app layout. Import from `nuqs/adapters/next/app`.
**Warning signs:** Runtime error: "Missing NuqsAdapter context".

### Pitfall 5: Count Query Performance
**What goes wrong:** Dashboard loads slowly because count queries scan full table.
**Why it happens:** `count()` without index on `status` column does sequential scan.
**How to avoid:** At 25 deals/month this is not a problem for years. If needed later, add index: `CREATE INDEX idx_vehicles_status ON vehicles(status)`. For now, simple queries are fine.
**Warning signs:** Dashboard taking >500ms to load (unlikely at this scale).

### Pitfall 6: XLSX Content-Type for Download
**What goes wrong:** Browser tries to open XLSX inline instead of downloading.
**Why it happens:** Missing or wrong Content-Disposition header.
**How to avoid:** Set both headers:
```typescript
return new Response(buffer, {
  headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${filename}"`,
  },
});
```
**Warning signs:** Browser shows garbled text or opens XLSX viewer instead of downloading.

### Pitfall 7: Checkbox State Reset on Page Change
**What goes wrong:** Selected checkboxes clear when navigating to next page of results.
**Why it happens:** React state resets on pagination because the component re-renders with new data.
**How to avoid:** Store selected IDs in a `Set` at the page level (not per-row). The Set persists across pagination. Only approved records should be selectable.
**Warning signs:** User selects records on page 1, goes to page 2, returns to page 1 -- selections lost.

## Code Examples

### XLSX New Export -- Core Function
```typescript
// Source: ExcelJS docs + Ministry template analysis
import ExcelJS from "exceljs";

interface VehicleExportData {
  jobNumber: string | null;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  color: string | null;
  odometer: number | null;
  sellerName: string | null;
  sellerAddress: string | null;
  buyerName: string | null;
  buyerAddress: string | null;
  purchaseDate: string | null; // "YYYY-MM-DD"
  saleDate: string | null;     // "YYYY-MM-DD"
}

export async function generateNewGarageRegister(
  records: VehicleExportData[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Garage Register");

  // Set column widths to match Ministry template
  ws.columns = [
    { width: 7.5 },   // A (spacer)
    { width: 9.66 },  // B (notes)
    { width: 17.66 }, // C (Internal #)
    { width: 37.33 }, // D (Seller Name)
    { width: 48.66 }, // E (Seller Address)
    { width: 14.83 }, // F (Make)
    { width: 43.83 }, // G (Model)
    { width: 6.5 },   // H (Year)
    { width: 23.33 }, // I (VIN)
    { width: 14.83 }, // J (Color)
    { width: 11.33 }, // K (Odometer)
    { width: 0.33 },  // L (Plate No - hidden)
    { width: 12.83 }, // M (Date In)
    { width: 12.83 }, // N (Purpose)
    { width: 14.33 }, // O (Date Out)
    { width: 38.0 },  // P (Buyer Name)
    { width: 81.83 }, // Q (Buyer Address)
  ];

  // Add header rows (row 4 group headers, row 5 column headers)
  // ... header creation with merged cells and formatting

  // Add data rows
  for (const record of records) {
    const rowValues = [
      null,                           // Col A: spacer
      null,                           // Col B: notes (empty for auto)
      record.jobNumber,               // Col C
      record.sellerName,              // Col D
      record.sellerAddress,           // Col E
      record.make,                    // Col F
      record.model,                   // Col G
      record.year,                    // Col H (number)
      record.vin,                     // Col I
      record.color,                   // Col J
      record.odometer                 // Col K
        ? `${record.odometer.toLocaleString()} km`
        : null,
      null,                           // Col L: Plate No (empty)
      record.purchaseDate             // Col M (date)
        ? new Date(record.purchaseDate + "T00:00:00")
        : null,
      "Export",                       // Col N: always "Export"
      record.saleDate                 // Col O (date)
        ? new Date(record.saleDate + "T00:00:00")
        : null,
      record.buyerName,               // Col P
      record.buyerAddress,            // Col Q
    ];

    const row = ws.addRow(rowValues);

    // Apply Ministry formatting to each cell
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: "Aptos Narrow", size: 12 };
      cell.border = {
        left: { style: "thin", color: { indexed: 64 } },
        right: { style: "thin", color: { indexed: 64 } },
        top: { style: "thin", color: { indexed: 64 } },
        bottom: { style: "thin", color: { indexed: 64 } },
      };
      // Date formatting for cols 13 and 15
      if (colNumber === 13 || colNumber === 15) {
        cell.numFmt = "mm-dd-yy";
      }
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
```
[VERIFIED: ExcelJS API + Ministry template formatting analysis]

### XLSX Append to Existing
```typescript
// Source: ExcelJS docs + GitHub issue #1062
export async function appendToExistingRegister(
  existingBuffer: Buffer,
  records: VehicleExportData[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(existingBuffer);

  // Find the last data sheet (typically the one with current year)
  const ws = wb.worksheets[wb.worksheets.length - 1];

  // Get last row for style reference
  const lastRowNum = ws.lastRow?.number ?? 7;
  const styleRefRow = ws.getRow(lastRowNum);

  for (const record of records) {
    const rowValues = [/* same mapping as above */];
    const newRow = ws.addRow(rowValues);

    // Copy styles from reference row
    styleRefRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const newCell = newRow.getCell(colNumber);
      newCell.style = { ...cell.style };
    });

    // Set date numFmt explicitly (style copy may not handle this)
    if (newRow.getCell(13).value) newRow.getCell(13).numFmt = "mm-dd-yy";
    if (newRow.getCell(15).value) newRow.getCell(15).numFmt = "mm-dd-yy";
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
```
[VERIFIED: ExcelJS API patterns]

### Dashboard Stats Query
```typescript
// Source: Existing codebase Drizzle patterns
import { count, eq, gte, and } from "drizzle-orm";
import { startOfMonth } from "date-fns";

// Pending review count (DASH-01)
const [{ pendingCount }] = await db
  .select({ pendingCount: count() })
  .from(vehicles)
  .where(eq(vehicles.status, "pending_review"));

// Exported this month (DASH-02)
const monthStart = startOfMonth(new Date());
const [{ exportedCount }] = await db
  .select({ exportedCount: count() })
  .from(vehicles)
  .where(
    and(
      eq(vehicles.status, "exported"),
      gte(vehicles.exportedAt, monthStart)
    )
  );

// Total vehicles
const [{ totalCount }] = await db
  .select({ totalCount: count() })
  .from(vehicles);
```
[VERIFIED: Drizzle operators + existing codebase patterns]

### nuqs Setup for Register Page
```typescript
// Source: nuqs.dev docs
// In root layout or app layout, add NuqsAdapter:
import { NuqsAdapter } from "nuqs/adapters/next/app";

export default function AppLayout({ children }) {
  return (
    <NuqsAdapter>
      <SidebarProvider>
        {/* ... existing layout */}
      </SidebarProvider>
    </NuqsAdapter>
  );
}
```
[CITED: nuqs.dev]

### File Download from API Route
```typescript
// Source: Next.js API route pattern (existing codebase)
// API route: POST /api/export
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return apiError("Unauthorized", 401);

  const { vehicleIds } = await request.json();

  // Fetch approved vehicles by IDs
  const records = await db.select().from(vehicles)
    .where(and(
      inArray(vehicles.id, vehicleIds),
      eq(vehicles.status, "approved")
    ));

  const buffer = await generateNewGarageRegister(records);
  const filename = `Garage_Register_${format(new Date(), "yyyy-MM-dd")}.xlsx`;

  // Mark records as exported
  await db.update(vehicles)
    .set({ status: "exported", exportedAt: new Date(), updatedAt: new Date() })
    .where(inArray(vehicles.id, vehicleIds));

  // Audit log each export
  for (const r of records) {
    await logAudit({
      entityType: "vehicle",
      entityId: r.id,
      action: "exported",
      userId: session.user.id,
    });
  }

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```
[VERIFIED: Existing codebase API pattern + ExcelJS docs]

### Client-side Download Trigger
```typescript
// Source: Standard browser download pattern
async function handleExport(vehicleIds: string[]) {
  const res = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicleIds }),
  });

  if (!res.ok) {
    toast.error("Export failed");
    return;
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = res.headers.get("Content-Disposition")
    ?.split("filename=")[1]
    ?.replace(/"/g, "")
    ?? `Garage_Register_${new Date().toISOString().split("T")[0]}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Garage Register exported successfully");
}
```
[ASSUMED: Standard browser blob download pattern]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| xlsx-populate for complex XLSX | ExcelJS 4.4.0 | xlsx-populate unmaintained since 2020 | ExcelJS is the only viable option for read+write+style XLSX in Node.js |
| useSearchParams + manual sync | nuqs 2.x | nuqs 2.0 added NuqsAdapter for App Router | Clean, type-safe URL state with zero boilerplate |
| moment.js for dates | date-fns 4.x | moment.js deprecated 2020 | Tree-shakeable, smaller bundle, better TypeScript support |

**Deprecated/outdated:**
- xlsx-populate: Original unmaintained 6+ years. Fork `@xlsx/xlsx-populate` is too new (v0.2.0) for regulatory documents.
- SheetJS free version: Strips styling on write. Not viable for Ministry format.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | "Aptos Narrow" font will render correctly in Excel even though it is an Office 365 font | Ministry XLSX Template Analysis | If the user opens the exported file in older Excel versions that lack Aptos Narrow, the font will fall back to a different font. Low risk -- Andrey uses modern Excel. |
| A2 | Month separator rows are not needed in "Export New" mode | Export New Strategy | If Ministry inspectors expect monthly grouping, we would need to sort by month and add separator rows. The current decision is to omit them for simplicity in new exports. Andrey can manually add if needed. |
| A3 | Column 2 (notes/initials) can be left empty in auto-export | Code Examples | Andrey currently writes initials like "AD", "PBS" in this column. If he needs these, we would need to add a notes field to the vehicle record. Low risk -- he can fill these in manually in the exported file. |
| A4 | ExcelJS `workbook.xlsx.load()` preserves all formatting when reading an existing Ministry template | Append to Existing Strategy | If ExcelJS corrupts complex formatting (merged cells, theme colors) on read/write, the append mode would produce broken files. Medium risk -- should be tested with actual Ministry file during implementation. |

## Open Questions

1. **Should "Export New" include month separator rows?**
   - What we know: The Ministry template groups records by month with yellow-highlighted separator rows (e.g., "2026 January"). The current data in the template has these separators.
   - What's unclear: Whether Ministry inspectors expect this grouping or if it is just Andrey's organizational preference.
   - Recommendation: Include month separators in "Export New" mode -- sort records by purchaseDate and insert separator rows at month boundaries. This matches the template format exactly and satisfies D-45.

2. **Should column 2 auto-populate with any value?**
   - What we know: Andrey uses col 2 for initials like "AD", "PBS", "RGR" etc. These appear to be source identifiers.
   - What's unclear: Whether these are meaningful or just personal notes.
   - Recommendation: Leave empty for now. Andrey can fill in manually. This is low-priority and can be added later if needed.

3. **Append mode: which sheet to append to?**
   - What we know: The template has multiple year sheets ("2026, Jan-Dec", "2025, Jun-Dec"). Different years have different column counts (17 vs 18).
   - What's unclear: Whether Andrey always appends to the last sheet or a specific year sheet.
   - Recommendation: Default to the last worksheet in the workbook. This is the most recent and matches the expected workflow.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | v25.6.0 | -- |
| PostgreSQL | Database queries | Yes | (shared Coolify) | -- |
| npm | Package install | Yes | (bundled with Node) | -- |
| ExcelJS | XLSX generation | Yes | 4.4.0 (in package.json) | -- |
| nuqs | URL state | No (not installed) | -- | npm install nuqs |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:**
- nuqs: Must be installed via `npm install nuqs` before use

## Project Constraints (from CLAUDE.md)

- **Deployment:** Coolify on Hetzner CX43 -- Docker container, standalone output mode already configured
- **API budget:** $2-5/month for Claude API (not relevant for this phase -- no AI calls)
- **Regulatory:** Garage Register data must be accurate -- XLSX format MUST match Ministry template exactly
- **User:** Andrey is non-technical -- UI must be self-explanatory, large buttons, clear feedback
- **XLSX format:** Must match Ministry of Transportation Ontario Garage Register template exactly (D-45)
- **GSD Workflow:** Must use GSD commands for file changes
- **shadcn v4:** Uses base-nova variant with @base-ui/react. Render prop pattern for Button links (not asChild).
- **Drizzle patterns:** Explicit column selection in queries. Auth session guard on all API routes.
- **Error handling:** No backend errors shown to user (UIUX-04). Sonner toasts for feedback.

## Sources

### Primary (HIGH confidence)
- Ministry XLSX template (`AD Auto CANADA Garage Register 2025-2026.xlsx`) -- Direct ExcelJS analysis of all 4 sheets, column widths, formatting, merged cells, font/border/fill details [VERIFIED: Local file analysis]
- ExcelJS 4.4.0 -- Version verified via npm registry. API patterns from GitHub README and npm docs [VERIFIED: npm registry]
- Drizzle ORM operators -- Runtime verification that `ilike`, `or`, `and`, `eq`, `count`, `desc`, `asc`, `gte`, `lte`, `between`, `inArray` are all available as functions [VERIFIED: Runtime check in project]
- nuqs 2.8.9 -- Version verified via npm registry. Setup pattern from official docs [VERIFIED: npm registry, CITED: nuqs.dev]
- date-fns 4.1.0 -- Version verified via npm registry [VERIFIED: npm registry]
- Existing codebase -- schema.ts, audit.ts, api-response.ts, vehicles route, approve route, auth-client.ts, app-sidebar.tsx, register/page.tsx patterns [VERIFIED: Local file reads]

### Secondary (MEDIUM confidence)
- [nuqs.dev](https://nuqs.dev/) -- NuqsAdapter setup, useQueryState API, parsers [CITED: nuqs.dev]
- [ExcelJS GitHub](https://github.com/exceljs/exceljs) -- addRow, readFile, writeBuffer, style copying patterns [CITED: github.com/exceljs/exceljs]
- [ExcelJS formatting preservation](https://prodissertation.co.uk/post/preserve-cell-column-formatting-when-adding-rows-in-excel-js) -- Style copying pattern for append mode [CITED: prodissertation.co.uk]

### Tertiary (LOW confidence)
- None -- all claims verified or cited

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use or verified via npm registry
- Architecture: HIGH -- patterns derived from existing codebase + verified library APIs
- Ministry XLSX format: HIGH -- directly analyzed from actual template file
- Pitfalls: HIGH -- derived from known ExcelJS behaviors and verified API patterns
- nuqs integration: MEDIUM -- version verified but not yet tested in this codebase

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable libraries, no fast-moving dependencies)
