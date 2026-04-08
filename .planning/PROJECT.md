# Garage Register Automation

## What This Is

A web application for AD Auto Export (Ontario, Canada) that automates filling the Ministry of Transportation Ontario Garage Register from PDF invoices and bills of sale. The system extracts vehicle and transaction data from PDFs using Claude API vision, presents it for human review, and exports to the official XLSX format. Built for Andrey — the business owner who currently does this manually.

## Core Value

**Accurate, fast extraction of vehicle data from any PDF format into the Garage Register** — if Andrey can't trust the extracted data and review it quickly, nothing else matters.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Upload AP + AR PDFs per vehicle and extract data via Claude API vision
- [ ] Review/edit extracted data with confidence highlighting before approval
- [ ] Export to new XLSX in Ministry of Transportation Ontario format
- [ ] Export/append to existing Garage Register XLSX file
- [ ] VIN validation with check digit verification
- [ ] Audit trail — history of all changes to every record
- [ ] Multi-user ready (admin/operator roles, Andrey solo for now)
- [ ] Authentication with secure login
- [ ] Intuitive onboarding — first-run guidance, zero-question UI
- [ ] Search and filter processed vehicles
- [ ] Dashboard with processing status and recent activity
- [ ] Mobile-responsive design with light/dark theme support

### Out of Scope

- Real-time collaboration (simultaneous editing) — only 1 user initially
- OCR pipeline (Tesseract etc.) — Claude API vision handles scans natively
- Ministry direct submission API — manual submission remains
- Mobile native app — web-first, responsive design sufficient
- Batch processing of 100+ PDFs at once — focus on per-vehicle workflow

## Context

**POC completed (April 2026):** Analyzed 18 real PDFs across 6 document types. Accuracy on basic tools: VIN 80%, Make 100%, Model 90%, Seller/Buyer 100%. Claude API vision expected to reach 95-99%.

**Document types (6):**
1. Simple Dealer Invoice — low complexity
2. US Supplier Invoice (QuickBooks) — low complexity
3. Wholesale Bill of Sale — low complexity
4. OMVIC Dealer Form (Ontario) — high complexity (scattered fields)
5. Quebec BOS (French) — medium complexity
6. AD Auto own AR invoices — low complexity

~15% of documents are scans without text layer.

**Business flow:** Each vehicle deal = 2 PDFs (AP purchase + AR sale). Job numbers: `26-JXXXXX`. ~50 docs/month. Garage Register is submitted to Ministry of Transportation Ontario — errors = regulatory problems.

**Infrastructure:** Hetzner CX43 (178.156.141.208), Coolify (coolify.adauto.ca), shared PostgreSQL. Other projects on same server: Invoice Ledger (invoice.adauto.ca), Asana integration, CRM, DealManager.

**Design principles (from Invoice Ledger project):**
- No backend errors shown to user — system retries silently
- Mobile-responsive with light/dark theme (prefers-color-scheme)
- Big buttons, visual cues, minimal clicks for non-technical user

## Constraints

- **Deployment:** Coolify on Hetzner CX43 — Docker container, shared PostgreSQL
- **API:** Anthropic Claude API for vision extraction (budget: $2-5/month at 50 docs)
- **Regulatory:** Garage Register data must be accurate — human review mandatory before export
- **User:** Andrey is non-technical — UI must be self-explanatory
- **Existing format:** XLSX must match Ministry of Transportation Ontario Garage Register template exactly

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js fullstack | Consistent with AD Auto ecosystem, React for rich UI, API routes for backend | — Pending |
| PostgreSQL (shared) | Already running on Coolify, proven in Invoice Ledger | — Pending |
| Claude API vision over regex/OCR | 6+ document formats, scans, French — LLM handles all natively | — Pending |
| Human review mandatory | Regulatory requirement — VIN errors = ministry problems | — Pending |
| Both XLSX export modes | Generate new + append to existing — flexibility for Andrey | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-08 after initialization*
