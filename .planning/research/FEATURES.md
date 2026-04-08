# Feature Research

**Domain:** Document extraction + compliance register automation (Ontario automotive dealer)
**Researched:** 2026-04-08
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features Andrey assumes exist. Missing these = product feels broken or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **PDF upload (AP + AR per vehicle)** | Core input mechanism. Andrey has 2 PDFs per vehicle deal — the purchase invoice and the sale invoice. Must accept both per vehicle. | LOW | Drag-and-drop + click-to-browse. Accept PDF only. Max ~10MB per file. Show thumbnail/filename after upload. |
| **Claude API vision extraction** | The entire value proposition. System must extract structured data (VIN, year, make, model, color, odometer, seller, buyer, dates, prices, job number) from any PDF format without manual configuration. | HIGH | Handles 6+ document types, scans without text layer (~15% of docs), French-language docs. Zero-shot extraction — no template training per format. |
| **Human review screen with confidence highlighting** | Regulatory requirement — MTO Garage Register errors cause compliance problems. Andrey must see what was extracted and confirm/edit before anything goes to the register. | HIGH | Side-by-side view: original PDF on left, extracted fields on right. Color-code fields by extraction confidence (green = high, yellow = medium, red = low). One-click approval after review. |
| **VIN validation (check digit verification)** | VIN is the most critical field. POC found 2/10 VIN discrepancies. NHTSA standard: position 9 is a check digit calculated from all other characters. Invalid VIN = immediate red flag. | LOW | Implement NHTSA check-digit algorithm (weights x character values, mod 11). Flag invalid VINs before Andrey even reviews. No external API needed for validation math itself. |
| **Export to new XLSX in Ministry format** | The entire output. Garage Register is submitted to MTO as XLSX. Must match exact column structure of form 023-SR-E-217: Job #, Date Acquired, Date Disposed, VIN, Year, Make, Model, Color, Odometer, Seller Name/Address, Buyer Name/Address, Purchase Price, Sale Price. | MEDIUM | Use existing `AD Auto CANADA Garage Register 2025-2026.xlsx` as the template. Preserve formatting, column widths, headers. Generate downloadable file. |
| **Append to existing Garage Register XLSX** | Andrey already has a running register with 34+ entries. He needs to add new vehicles to the same file, not start fresh every time. | MEDIUM | Upload existing XLSX, system reads last row, appends new entries below. Must preserve all existing data untouched. Critical: validate column structure matches expected format before appending. |
| **Search and filter processed vehicles** | With ~50 docs/month, Andrey will accumulate hundreds of records. He needs to find specific vehicles by VIN, job number, make/model, date range, or buyer/seller name. | MEDIUM | Full-text search across all fields. Filter by date range, status (pending review, approved, exported). Sort by any column. |
| **Dashboard with processing status** | Andrey needs a home screen showing what needs attention: recent uploads awaiting review, recently exported records, any extraction errors. | LOW | Simple card-based layout: "X pending review," "Y exported this month," recent activity feed. Not analytics — just operational awareness. |
| **Authentication with secure login** | System contains business financial data, customer information, vehicle records. Must be gated. | LOW | Email/password login. Single user for now but architecture should support roles. Session-based auth. HTTPS mandatory. |
| **Mobile-responsive design** | Andrey may check status or review a quick record from his phone. Not the primary workflow but must not break. | LOW | Responsive layout. Review screen may be desktop-preferred (side-by-side PDF + fields), but dashboard and search must work on mobile. |

### Differentiators (Competitive Advantage)

Features that separate this from competitors like garageregister.ca ($99-189/month DMS) or Quantech Q-F&I. These competitors are full DMS platforms — this tool's advantage is laser focus on the extraction-to-register pipeline.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AI-powered extraction from any PDF format** | Competitors require manual data entry or pre-configured templates. This system handles any supplier's invoice format, scanned docs, and French-language documents with zero configuration. New supplier = zero code changes. | HIGH | This is THE differentiator. garageregister.ca still requires manual entry for vehicle details. Quantech pulls from existing deal records (assumes data already entered elsewhere). This system creates structured data from raw PDFs. |
| **VIN enrichment via NHTSA vPIC API** | After extracting VIN, cross-reference with NHTSA's free API to auto-fill/verify year, make, model, body type. Catches extraction errors AND manual entry errors. If extracted "2026 Toyota" but NHTSA says VIN decodes to "2025 Toyota," flag the discrepancy. | LOW | Free API, no registration, 24/7 availability. Endpoint: `vpic.nhtsa.dot.gov/api/vehicles/decodevin/{VIN}?format=json`. Use as verification layer, not primary source. |
| **Confidence-scored field highlighting** | Unlike manual entry systems, AI extraction comes with per-field confidence. Show Andrey exactly which fields need attention vs. which are near-certain. Reduces review time from "check everything" to "check the yellow/red ones." | MEDIUM | Color coding: green (>90% confidence), yellow (70-90%), red (<70%). Red fields get auto-focused in review flow. Track override rates to improve prompts over time. |
| **Dual-PDF linking (AP + AR per vehicle)** | Each vehicle deal has a purchase side (AP) and sale side (AR). System understands this pairing and extracts complementary data: seller/price from AP, buyer/price from AR, vehicle details from whichever has better data. | MEDIUM | Job number links AP and AR documents. Extract from both, merge intelligently (e.g., VIN should match between AP and AR — flag if different). |
| **PDF preview alongside extracted data** | Side-by-side view during review. Click on an extracted field to highlight where in the PDF that data came from (if technically feasible with Claude API coordinates). At minimum, show the full PDF so Andrey can visually verify. | MEDIUM | Use PDF.js or similar for in-browser rendering. Even without coordinate mapping, side-by-side dramatically speeds review vs. switching between tabs/windows. |
| **Audit trail for every record** | Full history: who uploaded, when extracted, what was changed during review, when approved, when exported. Required for compliance defensibility — if MTO questions a record, Andrey can show the chain from source PDF to register entry. | MEDIUM | Log every state change: upload, extraction, field edits (old value -> new value), approval, export. Timestamp + user. Immutable log. |
| **First-run onboarding guidance** | For a single non-technical user, the first experience must be self-explanatory. Guided walkthrough of: upload your first PDFs, review extracted data, export to register. Eliminate the need for a manual or training session. | LOW | Tooltip-based guided tour on first login. Coach marks pointing to key UI elements. Can be dismissed and re-triggered from settings. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem useful but add complexity without proportional value for this specific use case.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Full DMS (deal management, inventory, CRM)** | Competitors like Dealerpull and garageregister.ca bundle everything. Tempting to build "one platform." | Andrey already has DealManager, CRM, Invoice Ledger on the same server. Building DMS features duplicates existing tools and bloats scope. This tool's value is extraction-to-register, not running the dealership. | Integrate via job number — link to existing systems if needed. Stay focused on the extraction pipeline. |
| **Batch processing of 100+ PDFs** | "Upload everything at once and let AI handle it." | At ~50 docs/month (25 vehicle deals), batch is unnecessary. Batch obscures review quality — Andrey should review each vehicle, not rubber-stamp 50 at once. Batch also means higher API costs in spikes and complex queue management. | Process per-vehicle (2 PDFs at a time). Queue of 5-10 pending reviews is the sweet spot. |
| **Real-time collaboration / multi-user editing** | "What if Andrey hires someone?" | Only 1 user today. Building real-time sync, conflict resolution, and role-based record locking is enormous complexity for zero current value. | Build with multi-user-ready auth (admin/operator roles) but defer concurrent editing. When second user joins, they simply process different vehicles. |
| **Direct Ministry API submission** | "Skip the XLSX, submit directly to MTO." | MTO has no public API for garage register submission. The process is manual (bring/send the file). Building against a non-existent API is impossible, and if one emerged it would likely change. | Generate the XLSX in exact ministry format. That IS the submission. |
| **OCR pipeline (Tesseract, etc.)** | "What about scanned documents?" | Claude API vision handles scans natively — it reads images directly. A separate OCR pipeline adds infrastructure complexity, another failure point, and worse accuracy than LLM vision on varied formats. | Use Claude API vision for everything. It handles both text-layer PDFs and scanned images in one call. |
| **Template learning / custom extraction rules** | "Let me define where each field is on each supplier's invoice format." | Defeats the purpose. LLM-based extraction is zero-shot — it handles new formats without configuration. Template systems are brittle (layout changes break them) and shift maintenance burden to the user. | Trust Claude API vision for extraction. If a specific format consistently fails, tune the system prompt — not a per-template rule engine. |
| **Email ingestion (auto-import from inbox)** | "Automatically pull invoices from email." | Adds OAuth/IMAP complexity, security surface, and edge cases (which emails are invoices? attachments vs inline? forwards?). For 25 deals/month, drag-and-drop upload takes seconds. | Manual upload. Simple, secure, and Andrey knows exactly what's being processed. |
| **AI chatbot / natural language queries** | "Ask the system questions about your data." | Over-engineered for 25 deals/month. Andrey needs search and filter, not a conversation interface. Adds LLM cost and complexity for a feature that search handles better. | Robust search and filter with auto-complete. |
| **Automated backup/export scheduling** | "Auto-export the register every week." | Andrey submits to MTO on his own schedule (not weekly). Auto-export creates files he didn't ask for. The action should be intentional. | One-click export when Andrey decides to submit. Show "last exported" date as a reminder. |

## Feature Dependencies

```
[PDF Upload]
    |
    v
[Claude API Extraction] ──requires──> [PDF Upload]
    |
    v
[Human Review Screen] ──requires──> [Claude API Extraction]
    |                  ──requires──> [VIN Validation]
    |                  ──enhanced-by──> [VIN Enrichment via NHTSA]
    |                  ──enhanced-by──> [Confidence Highlighting]
    |                  ──enhanced-by──> [PDF Preview Side-by-Side]
    |
    v
[Approval] ──requires──> [Human Review Screen]
    |
    v
[XLSX Export (new)] ──requires──> [Approval]
[XLSX Export (append)] ──requires──> [Approval]
    |
    v
[Audit Trail] ──spans-all──> [Upload through Export]

[Authentication] ──gates──> [Everything]

[Search & Filter] ──requires──> [Approved Records in DB]

[Dashboard] ──requires──> [Records in DB]

[Dual-PDF Linking] ──enhances──> [Claude API Extraction]
                   ──enhances──> [Human Review Screen]

[Onboarding] ──enhances──> [All UI components]

[Mobile Responsive] ──applies-to──> [All UI components]
```

### Dependency Notes

- **Claude API Extraction requires PDF Upload:** Obvious — no extraction without input documents.
- **Human Review requires both Extraction AND VIN Validation:** VIN check digit result must display during review so Andrey can see if the VIN passes or fails validation before approving.
- **XLSX Export requires Approval:** Never export unreviewed data to the ministry register. This is the core compliance gate.
- **Audit Trail spans the entire pipeline:** Must log events at every stage (upload, extraction, edits, approval, export). Cannot be bolted on later — must be designed into the data model from the start.
- **Authentication gates everything:** No unauthenticated access to any feature. Deploy auth first.
- **Dual-PDF Linking enhances Extraction:** When both AP and AR are uploaded for the same vehicle, the system can cross-reference extracted data (VIN should match, vehicle details should be consistent, prices come from different sides).

## MVP Definition

### Launch With (v1)

Minimum viable product — what Andrey needs to stop doing manual data entry.

- [ ] **Authentication** — Secure login (email/password), single admin user
- [ ] **PDF upload (AP + AR per vehicle)** — Drag-and-drop, associate two PDFs with one vehicle deal via job number
- [ ] **Claude API vision extraction** — Send PDF images to Claude, receive structured JSON with vehicle data fields
- [ ] **VIN check-digit validation** — NHTSA algorithm, flag invalid VINs with clear error message
- [ ] **Human review screen** — Side-by-side PDF preview + editable extracted fields, confidence highlighting (green/yellow/red)
- [ ] **Approval workflow** — Explicit "Approve" action after review, record becomes ready for export
- [ ] **Export to new XLSX** — Generate ministry-format XLSX from approved records, downloadable
- [ ] **Export/append to existing XLSX** — Upload existing register, append new approved records, download updated file
- [ ] **Basic search** — Find records by VIN, job number, or vehicle make/model
- [ ] **Dashboard** — Pending reviews count, recently exported, recent activity

### Add After Validation (v1.x)

Features to add once core extraction-review-export loop is proven accurate and Andrey trusts it.

- [ ] **VIN enrichment via NHTSA vPIC API** — Trigger: after v1 is stable and Andrey wants faster review. Auto-fill year/make/model from VIN decode, flag discrepancies with extracted data.
- [ ] **Audit trail UI** — Trigger: when Andrey asks "when did I change this?" or MTO questions a record. Backend logging should exist from v1, but the UI to browse audit history can come later.
- [ ] **Onboarding guided tour** — Trigger: if Andrey struggles with initial use or a second user is added. For v1, a simple help page may suffice since the developer will onboard Andrey directly.
- [ ] **Light/dark theme** — Trigger: user preference. Implement `prefers-color-scheme` detection. Low effort with CSS variables but not launch-critical.
- [ ] **Bulk status actions** — Trigger: when pending reviews accumulate. Select multiple records to approve (after individual review) or export together.

### Future Consideration (v2+)

Features to defer until the extraction pipeline is proven and Andrey's workflow is stable.

- [ ] **Multi-user with roles (admin/operator)** — Defer until Andrey hires help. Auth should support it architecturally, but role-based access control UI is v2.
- [ ] **Analytics and reporting** — Monthly summaries, extraction accuracy trends, processing time metrics. Nice for optimization but not operational.
- [ ] **Duplicate detection** — Flag if a VIN has already been registered. Useful as volume grows.
- [ ] **Document type classification display** — Show which of the 6 document types was detected. Useful for debugging extraction issues.
- [ ] **Export history with re-download** — Keep copies of every exported XLSX. Useful for audit but adds storage management.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| PDF upload (AP + AR) | HIGH | LOW | P1 |
| Claude API extraction | HIGH | HIGH | P1 |
| VIN check-digit validation | HIGH | LOW | P1 |
| Human review with confidence | HIGH | HIGH | P1 |
| XLSX export (new) | HIGH | MEDIUM | P1 |
| XLSX export (append) | HIGH | MEDIUM | P1 |
| Authentication | HIGH | LOW | P1 |
| Dashboard | MEDIUM | LOW | P1 |
| Search & filter | MEDIUM | MEDIUM | P1 |
| Mobile responsive | MEDIUM | LOW | P1 |
| VIN enrichment (NHTSA API) | MEDIUM | LOW | P2 |
| Audit trail (backend logging) | HIGH | MEDIUM | P1 |
| Audit trail (UI browser) | MEDIUM | MEDIUM | P2 |
| PDF preview side-by-side | HIGH | MEDIUM | P1 |
| Dual-PDF linking (AP+AR) | MEDIUM | MEDIUM | P1 |
| Confidence highlighting | HIGH | LOW | P1 |
| Onboarding tour | LOW | LOW | P2 |
| Light/dark theme | LOW | LOW | P2 |
| Multi-user roles | LOW | MEDIUM | P3 |
| Analytics/reporting | LOW | MEDIUM | P3 |
| Duplicate VIN detection | MEDIUM | LOW | P2 |

**Priority key:**
- P1: Must have for launch — Andrey cannot use the product without these
- P2: Should have, add when core is stable — improves accuracy or experience
- P3: Nice to have, future consideration — only when volume or users grow

## Competitor Feature Analysis

| Feature | garageregister.ca | Dealerpull DMS | Quantech Q-F&I | Our Approach |
|---------|-------------------|----------------|-----------------|--------------|
| Garage Register compliance | Yes (digital register) | Yes (auto from deals) | Yes (report from inventory) | Yes (auto from PDFs) |
| AI document extraction | No (manual entry) | No (manual entry) | No (from existing deal data) | Yes (Claude API vision) |
| VIN validation | Unknown | Unknown | Unknown | Yes (check digit + NHTSA decode) |
| Human review workflow | N/A (manual entry) | N/A (manual entry) | N/A (data already in system) | Yes (confidence-scored review) |
| Bill of Sale generation | Yes | Yes (UCDA/OMVIC forms) | Yes | No (out of scope — different tool) |
| Inventory management | Yes | Yes | Yes | No (out of scope — use DealManager) |
| CRM | Yes | Yes | No | No (out of scope — use existing CRM) |
| Deal management | Yes | Yes | Yes | No (out of scope — use DealManager) |
| XLSX export | Unknown | CSV export | CSV export | Yes (exact ministry XLSX format) |
| Scan/image handling | No | No | No | Yes (Claude vision reads scans natively) |
| French document support | No | No | No | Yes (Claude handles multilingual) |
| Pricing | $99-189/month | $99-189/month | Included with DMS | ~$2-5/month API cost only |

**Key insight:** Competitors are full DMS platforms that include garage register as one feature among many. They require all vehicle data to be entered manually into their system first. Our tool does ONE thing that none of them do: extract structured data directly from source PDFs. This is a different category — not competing with DMS platforms, but complementing the existing AD Auto toolset.

## Garage Register Field Mapping

Based on the existing `AD Auto CANADA Garage Register 2025-2026.xlsx` and CLAUDE.md, the ministry register requires these columns per vehicle:

| Register Column | Source | Extraction Priority |
|----------------|--------|---------------------|
| Job # | Filename / document content | HIGH — identifies the deal |
| Date Acquired | AP invoice date | HIGH — regulatory required |
| Date Disposed | AR invoice date | HIGH — regulatory required |
| VIN | Both AP and AR docs | CRITICAL — must validate |
| Year | AP/AR docs or NHTSA decode | HIGH |
| Make | AP/AR docs or NHTSA decode | HIGH |
| Model | AP/AR docs or NHTSA decode | HIGH |
| Color | AP/AR docs | MEDIUM — sometimes missing from invoices |
| Odometer (km) | AP/AR docs | MEDIUM — not always on invoices |
| Seller Name | AP invoice | HIGH |
| Seller Address | AP invoice | MEDIUM |
| Buyer Name | AR invoice | HIGH |
| Buyer Address | AR invoice | MEDIUM |
| Purchase Price | AP invoice | HIGH |
| Sale Price | AR invoice | HIGH |

**Extraction challenge notes:**
- Color and odometer are the most commonly missing fields across document types
- OMVIC dealer forms have fields scattered across the page (high complexity)
- Quebec bills of sale are in French — Claude handles this natively
- Prices may appear in different formats (with/without tax, CAD/USD)
- Addresses may be partial on some invoice types

## Sources

- [OMVIC Garage Register requirements](https://www.omvic.ca/selling/sales-operations/garage-register/) — Official compliance guidance
- [Ontario Central Forms Repository - Form 023-SR-E-217](https://forms.mgcs.gov.on.ca/en/dataset/023-sr-e-217) — Official form
- [Quantech Ontario Garage Registry support](https://www.quantechsoftware.com/resources/blog/ontario-garage-registry-report.html) — Competitor feature set
- [garageregister.ca](https://garageregister.ca/) — Primary competitor, DMS with register feature
- [Dealerpull DMS](https://www.dealerpull.com/) — Canadian dealer management competitor
- [NHTSA vPIC VIN Decoder API](https://vpic.nhtsa.dot.gov/api/) — Free VIN decode/validation API
- [VIN Check Digit Algorithm](https://en.wikibooks.org/wiki/Vehicle_Identification_Numbers_(VIN_codes)/Check_digit) — NHTSA standard
- [Human-in-the-Loop Best Practices (Parseur)](https://parseur.com/blog/hitl-best-practices) — Review UI patterns
- [Confidence Scoring Systems (Extend)](https://www.extend.ai/resources/best-confidence-scoring-systems-document-processing) — Field confidence patterns
- [File Uploader UX Best Practices (Uploadcare)](https://uploadcare.com/blog/file-uploader-ux-best-practices/) — Upload interface patterns

---
*Feature research for: Garage Register Automation (document extraction + compliance XLSX export)*
*Researched: 2026-04-08*
