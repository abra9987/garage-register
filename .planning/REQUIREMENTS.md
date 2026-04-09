# Requirements: Garage Register Automation

**Defined:** 2026-04-08
**Core Value:** Accurate, fast extraction of vehicle data from any PDF format into the Garage Register

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can log in with email and password
- [x] **AUTH-02**: User session persists across browser refresh (httpOnly cookie)
- [x] **AUTH-03**: User can log out from any page
- [x] **AUTH-04**: System supports admin and operator roles (admin-only for v1)

### PDF Upload

- [x] **UPLD-01**: User can drag-and-drop or click-to-browse PDF files (AP and AR per vehicle)
- [x] **UPLD-02**: User can associate two PDFs (AP purchase + AR sale) with one vehicle deal via job number
- [x] **UPLD-03**: System validates uploaded files are PDFs and within size limit (10MB)
- [x] **UPLD-04**: User sees filename and thumbnail/icon after upload

### Data Extraction

- [x] **EXTR-01**: System sends uploaded PDFs to Claude API vision and receives structured JSON with vehicle data fields
- [x] **EXTR-02**: System extracts all ministry register fields: Job #, VIN, Year, Make, Model, Color, Odometer, Seller Name/Address, Buyer Name/Address, Purchase Price, Sale Price, Date Acquired, Date Disposed
- [x] **EXTR-03**: System handles all 6 document types without configuration (Simple Dealer Invoice, US Supplier/QuickBooks, Wholesale BOS, OMVIC Dealer Form, Quebec BOS French, AD Auto AR invoices)
- [x] **EXTR-04**: System handles scanned PDFs without text layer via Claude vision
- [x] **EXTR-05**: System returns per-field confidence scores (high/medium/low) for extracted data
- [x] **EXTR-06**: When both AP and AR PDFs are provided, system cross-validates shared fields (VIN must match, vehicle details consistent)

### VIN Validation

- [x] **VIN-01**: System validates VIN format (17 characters, valid character set)
- [x] **VIN-02**: System validates VIN check digit (position 9) using NHTSA algorithm
- [x] **VIN-03**: Invalid VIN is flagged with clear error message during review

### Human Review

- [x] **REVW-01**: User sees extracted fields alongside original PDF preview (side-by-side layout)
- [x] **REVW-02**: Fields are color-coded by extraction confidence (green >90%, yellow 70-90%, red <70%)
- [x] **REVW-03**: User can edit any extracted field before approval
- [x] **REVW-04**: User can explicitly approve a record (approval gate before export)
- [x] **REVW-05**: Fields marked as "not found in document" are visually distinct from low-confidence fields

### Export

- [ ] **XPRT-01**: User can export approved records to a new XLSX file in exact Ministry of Transportation Ontario Garage Register format
- [ ] **XPRT-02**: User can upload existing Garage Register XLSX and append new approved records to it
- [ ] **XPRT-03**: System preserves all existing data and formatting when appending to existing XLSX
- [ ] **XPRT-04**: User can select which approved records to include in export
- [ ] **XPRT-05**: Exported XLSX is downloadable with one click

### Register & Search

- [ ] **REGS-01**: User can view all processed vehicle records in a table with sortable columns
- [ ] **REGS-02**: User can search records by VIN, job number, make, model, seller, or buyer
- [ ] **REGS-03**: User can filter records by status (pending review, approved, exported) and date range

### Dashboard

- [ ] **DASH-01**: User sees count of records pending review on the home screen
- [ ] **DASH-02**: User sees count of records exported this month
- [ ] **DASH-03**: User sees recent activity feed (uploads, approvals, exports)

### Audit Trail

- [x] **AUDT-01**: System logs every state change: upload, extraction, field edits (old->new value), approval, export
- [x] **AUDT-02**: Each log entry has timestamp and user identifier
- [x] **AUDT-03**: Audit log is immutable (append-only)

### UI/UX

- [ ] **UIUX-01**: Application is mobile-responsive (dashboard and search work on phone, review is desktop-preferred)
- [x] **UIUX-02**: Application supports light and dark theme via prefers-color-scheme
- [x] **UIUX-03**: UI uses large buttons, visual cues, and minimal actions for non-technical user
- [x] **UIUX-04**: No backend errors shown to user -- system retries silently, user always sees success or clear guidance

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhancements

- **ENHN-01**: VIN enrichment via NHTSA vPIC API -- auto-fill/verify year, make, model from VIN decode
- **ENHN-02**: Audit trail UI browser -- view full change history for any record
- **ENHN-03**: First-run onboarding guided tour with tooltips
- **ENHN-04**: Duplicate VIN detection -- flag if VIN already registered
- **ENHN-05**: Bulk status actions -- select multiple records to export together
- **ENHN-06**: Multi-user with role-based access control UI (admin/operator)
- **ENHN-07**: Export history with re-download of past XLSX files
- **ENHN-08**: Document type classification display

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full DMS (deal management, inventory, CRM) | Andrey has DealManager, CRM, Invoice Ledger already |
| Batch processing 100+ PDFs | ~25 deals/month, per-vehicle review is better for accuracy |
| Real-time collaboration | Single user, no concurrent editing needed |
| Direct Ministry API submission | MTO has no public API |
| OCR pipeline (Tesseract) | Claude API vision handles scans natively |
| Template learning / custom extraction rules | LLM zero-shot extraction handles new formats |
| Email ingestion | Drag-and-drop upload sufficient for 25 deals/month |
| AI chatbot / natural language queries | Search and filter covers the need |
| Automated export scheduling | Manual export on Andrey's schedule |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUDT-01 | Phase 1 | Complete |
| AUDT-02 | Phase 1 | Complete |
| AUDT-03 | Phase 1 | Complete |
| UIUX-02 | Phase 1 | Complete |
| UIUX-04 | Phase 1 | Complete |
| UPLD-01 | Phase 2 | Complete |
| UPLD-02 | Phase 2 | Complete |
| UPLD-03 | Phase 2 | Complete |
| UPLD-04 | Phase 2 | Complete |
| EXTR-01 | Phase 2 | Complete |
| EXTR-02 | Phase 2 | Complete |
| EXTR-03 | Phase 2 | Complete |
| EXTR-04 | Phase 2 | Complete |
| EXTR-05 | Phase 2 | Complete |
| EXTR-06 | Phase 2 | Complete |
| VIN-01 | Phase 2 | Complete |
| VIN-02 | Phase 2 | Complete |
| VIN-03 | Phase 2 | Complete |
| REVW-01 | Phase 3 | Complete |
| REVW-02 | Phase 3 | Complete |
| REVW-03 | Phase 3 | Complete |
| REVW-04 | Phase 3 | Complete |
| REVW-05 | Phase 3 | Complete |
| UIUX-03 | Phase 3 | Complete |
| XPRT-01 | Phase 4 | Pending |
| XPRT-02 | Phase 4 | Pending |
| XPRT-03 | Phase 4 | Pending |
| XPRT-04 | Phase 4 | Pending |
| XPRT-05 | Phase 4 | Pending |
| REGS-01 | Phase 4 | Pending |
| REGS-02 | Phase 4 | Pending |
| REGS-03 | Phase 4 | Pending |
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 4 | Pending |
| UIUX-01 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 40 total
- Mapped to phases: 40
- Unmapped: 0

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after roadmap creation*
