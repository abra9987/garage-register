# Roadmap: Garage Register Automation

## Overview

This roadmap follows the natural data pipeline of the Garage Register: foundation and auth first, then the extraction engine (core value), then the human review safety net (regulatory compliance), and finally the export/register/dashboard layer that delivers the finished output. Each phase produces the input for the next -- you cannot review what has not been extracted, and you cannot export what has not been approved.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation + Auth** - Project skeleton, database schema, authentication, audit trail infrastructure, and baseline UI setup (completed 2026-04-09)
- [ ] **Phase 2: Upload + Extraction Pipeline** - PDF upload, Claude API vision extraction, VIN validation, confidence scoring, and AP/AR paired processing
- [ ] **Phase 3: Review + Approval** - Side-by-side PDF review with confidence highlighting, field editing, and approval workflow
- [ ] **Phase 4: Export + Register + Dashboard** - XLSX export (new and append), vehicle register with search/filter, dashboard, and mobile responsive layout

## Phase Details

### Phase 1: Foundation + Auth
**Goal**: Andrey can log in to a running application with the database, audit infrastructure, and UI shell ready for feature development
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUDT-01, AUDT-02, AUDT-03, UIUX-02, UIUX-04
**Success Criteria** (what must be TRUE):
  1. User can log in with email/password and session persists across browser refresh
  2. User can log out from any page and is redirected to login
  3. Application renders with light/dark theme based on system preference
  4. Backend errors are caught and user sees friendly guidance instead of stack traces
  5. Audit log table exists and records state changes with timestamps and user ID (verified via direct DB query)
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md -- Scaffold Next.js project, Drizzle schema, Better Auth config, database push
- [x] 01-02-PLAN.md -- Login UI, sidebar navigation, dark mode, error boundaries, audit utility

### Phase 2: Upload + Extraction Pipeline
**Goal**: Andrey can upload AP and AR PDFs for a vehicle deal and receive structured extracted data with confidence scores and VIN validation
**Depends on**: Phase 1
**Requirements**: UPLD-01, UPLD-02, UPLD-03, UPLD-04, EXTR-01, EXTR-02, EXTR-03, EXTR-04, EXTR-05, EXTR-06, VIN-01, VIN-02, VIN-03
**Success Criteria** (what must be TRUE):
  1. User can drag-and-drop or browse to upload PDF files and sees filename/icon confirmation
  2. User can associate two PDFs (AP + AR) with a single vehicle deal via job number
  3. System extracts all ministry register fields from any of the 6 document types including scanned PDFs
  4. Each extracted field shows a confidence level (high/medium/low) and VIN is validated with check digit verification
  5. When both AP and AR are provided, system flags inconsistencies between shared fields (VIN mismatch, vehicle detail conflicts)
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [x] 02-01-PLAN.md -- Schema migration (bytea + confidence), extraction types, VIN validation
- [x] 02-02-PLAN.md -- Claude API extraction engine (client, prompt, core logic, cross-validation)
- [x] 02-03-PLAN.md -- Upload page UI, API routes, full pipeline wiring with status polling

### Phase 3: Review + Approval
**Goal**: Andrey can review extracted data against the original PDF, correct any errors, and approve records for export
**Depends on**: Phase 2
**Requirements**: REVW-01, REVW-02, REVW-03, REVW-04, REVW-05, UIUX-03
**Success Criteria** (what must be TRUE):
  1. User sees extracted fields alongside the original PDF in a side-by-side layout
  2. Fields are color-coded by confidence (green/yellow/red) and "not found" fields are visually distinct
  3. User can edit any field and explicitly approve a record (approval is required before export)
  4. UI uses large buttons and minimal clicks -- a non-technical user can complete review without instructions
**Plans**: 2 plans
**UI hint**: yes

Plans:
- [x] 03-01-PLAN.md -- Dependencies, validation schemas, API routes (vehicle detail/update, approve/unapprove, PDF content)
- [ ] 03-02-PLAN.md -- Review page UI (PDF preview, confidence-bordered form, approval flow), register page update

### Phase 4: Export + Register + Dashboard
**Goal**: Andrey can export approved records to Ministry-format XLSX, search the vehicle register, and see processing status at a glance
**Depends on**: Phase 3
**Requirements**: XPRT-01, XPRT-02, XPRT-03, XPRT-04, XPRT-05, REGS-01, REGS-02, REGS-03, DASH-01, DASH-02, DASH-03, UIUX-01
**Success Criteria** (what must be TRUE):
  1. User can export selected approved records to a new XLSX in exact Ministry of Transportation Ontario format
  2. User can upload an existing Garage Register XLSX and append new records while preserving all existing data and formatting
  3. User can view all vehicle records in a sortable table and search/filter by VIN, job number, make, model, status, or date
  4. Dashboard shows pending review count, monthly export count, and recent activity feed
  5. Dashboard and register table are usable on a mobile phone screen
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Auth | 2/2 | Complete    | 2026-04-09 |
| 2. Upload + Extraction Pipeline | 3/3 | Complete | 2026-04-09 |
| 3. Review + Approval | 0/2 | Not started | - |
| 4. Export + Register + Dashboard | 0/TBD | Not started | - |
