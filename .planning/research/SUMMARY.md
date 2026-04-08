# Project Research Summary

**Project:** Garage Register Automation
**Domain:** AI-powered document extraction + regulatory compliance register (Ontario automotive dealer)
**Researched:** 2026-04-08
**Confidence:** HIGH

## Executive Summary

The Garage Register Automation project is a document extraction pipeline that converts dealer invoices (PDFs) into structured vehicle records for Ontario's Ministry of Transportation Garage Register (XLSX format). This is a well-scoped, single-user internal tool for an automotive dealer (Andrey at AD Auto) who currently enters data manually from ~25 vehicle deals per month. The proven approach is to send PDFs directly to Claude API's native vision/document support for zero-shot structured extraction, run the output through a mandatory human review screen with confidence highlighting, and export approved records to the exact Ministry XLSX template. The stack aligns closely with the existing AD Auto ecosystem (Next.js 16, React 19, Tailwind v4, ExcelJS, PostgreSQL on Coolify/Hetzner) -- ensuring deployment consistency and code reuse.

The recommended architecture is a monolithic Next.js App Router application with synchronous Claude API extraction (no job queue needed at 50 docs/month), Drizzle ORM for a richer schema than raw SQL allows, Better Auth for self-hosted authentication, and ExcelJS for XLSX generation/modification. The core innovation is the AP+AR paired document processing -- each vehicle deal has a purchase invoice and a sale invoice, and the system extracts from both, cross-validates, and merges into a single register entry. This paired approach provides a natural accuracy check that competitors (who rely on manual entry) cannot match.

The dominant risks are VIN character confusion from vision extraction (80% accuracy in POC -- 1 in 5 VINs had errors), numerical value hallucination on prices and dates, XLSX template format drift when modifying the Ministry file, and prompt fragility across 6+ document types. All of these are addressable with specific technical mitigations: three-layer VIN validation (format + check digit + character substitution), range validation and AP/AR cross-validation for numbers, early template testing with byte-comparison, and per-document-type extraction prompts with regression testing against the 18 POC PDFs. The mandatory human review screen is the critical safety net -- no data reaches the Ministry register without explicit approval.

## Key Findings

### Recommended Stack

The stack is designed for consistency with the AD Auto ecosystem (Invoice Ledger, CRM, DealManager all on the same Hetzner CX43 server) while introducing Drizzle ORM and Better Auth as upgrades over raw SQL and env-based password auth. Every technology choice has been validated against at least one production reference or official documentation.

**Core technologies:**
- **Next.js 16.2.x + React 19.2.x**: Fullstack framework matching Invoice Ledger. App Router, Turbopack, React Compiler all stable.
- **Drizzle ORM 0.45.x + PostgreSQL**: Lightweight ORM (7.4 KB vs Prisma's 1.6 MB) with code-first TypeScript schemas. Justified by the complex schema (vehicles, documents, extractions, audit log).
- **Claude Sonnet (claude-sonnet-4-20250514)**: Best price/performance for structured extraction. Native PDF support via `document` content blocks. ~$0.03-0.05 per document. Budget-safe at 50 docs/month.
- **Better Auth 1.6.x**: Self-hosted auth with first-class Drizzle adapter. Replaces the env-based password pattern from Invoice Ledger.
- **ExcelJS 4.4.x**: Already proven in Invoice Ledger. Single library for both generating new XLSX and appending to existing Ministry register files.
- **shadcn/ui + Tailwind CSS v4**: Component library and styling matching the ecosystem. Accessible via Radix UI primitives.
- **React Hook Form + Zod**: Form handling and validation for the review/edit screen with many vehicle fields.

**Critical version note:** Pin Claude model to a specific version string (e.g., `claude-sonnet-4-20250514`), not the alias. Model updates can silently change extraction behavior.

### Expected Features

**Must have (table stakes -- P1):**
- PDF upload (AP + AR per vehicle deal) with drag-and-drop
- Claude API vision extraction with structured JSON output
- Human review screen with per-field confidence highlighting (green/yellow/red)
- VIN check-digit validation (NHTSA algorithm)
- Approval workflow (pending -> approved gate before export)
- XLSX export: generate new in Ministry format AND append to existing register
- Basic search/filter across vehicle records
- Dashboard with processing status
- Authentication (email/password via Better Auth)
- Audit trail backend logging (immutable, spans upload through export)
- Dual-PDF linking (AP+AR matched by job number)
- Mobile-responsive layout

**Should have (differentiators -- P2):**
- VIN enrichment via NHTSA vPIC API (auto-fill/verify year, make, model)
- Audit trail UI browser
- Onboarding guided tour
- Duplicate VIN detection
- Light/dark theme

**Defer (v2+):**
- Multi-user with role-based access control
- Analytics and reporting
- Export history with re-download
- Document type classification display

**Anti-features (explicitly reject):**
- Full DMS functionality (already have DealManager, CRM, Invoice Ledger)
- Batch processing of 100+ PDFs (obscures review quality)
- Email ingestion (adds OAuth/IMAP complexity for 25 deals/month)
- Template learning / custom extraction rules (defeats zero-shot LLM advantage)
- Direct Ministry API submission (no such API exists)

### Architecture Approach

The system follows a four-layer monolith: presentation (Next.js pages), API (Route Handlers), services (extraction, vehicle CRUD, export), and data (PostgreSQL + filesystem). The extraction pipeline is synchronous -- upload triggers Claude API call inline, results return in 5-15 seconds. No job queue, no Redis, no background workers. This is the correct choice for 50 docs/month; the architecture document explicitly identifies adding BullMQ + Redis as an anti-pattern at this scale.

**Major components:**
1. **Upload Page + API** -- Drag-drop PDF upload, FormData to Route Handler, file storage on Docker volume
2. **Extraction Service** -- Claude API client, per-document-type prompt routing, structured JSON parsing, confidence scoring
3. **Review Page** -- Side-by-side PDF preview + editable fields, confidence highlighting, VIN validation display, AP/AR cross-validation
4. **Vehicle Service** -- CRUD with audit trail, status state machine (extracting -> pending_review -> approved -> exported)
5. **Export Service** -- ExcelJS-based XLSX generation (new) and modification (append), Ministry template definition
6. **Register Page + Dashboard** -- Table view with search/filter, processing status cards, recent activity

**Database schema:** 5 core tables -- `vehicles`, `documents`, `extractions`, `audit_log`, `exports`. The `extractions` table stores both raw Claude API response and parsed/merged data, enabling re-processing if the model improves.

### Critical Pitfalls

1. **VIN character confusion from vision extraction** -- 80% VIN accuracy in POC. Mitigate with three-layer validation: format check (17 chars, no I/O/Q), check digit algorithm, and character substitution fuzzy matching (swap confusable chars when check digit fails). Must ship with extraction pipeline in Phase 1.

2. **Non-deterministic LLM extraction** -- Same PDF can produce different output on repeated calls. Mitigate with temperature 0, mandatory human review, raw API response storage, structured output schemas, and pinned model versions.

3. **Numerical value hallucination** -- Prices, years, and odometer readings are misread more often than text. Mitigate with range validation (year 1980-2027, price $1-$500K), AP/AR cross-validation, and explicit prompt instructions for character-by-character number extraction.

4. **XLSX template format drift** -- ExcelJS has known issues preserving cellStyleXfs styles on read/write. Mitigate by testing against the actual Ministry template early (Phase 1), byte-comparing output, and keeping a fallback strategy of always generating fresh from template + data.

5. **Prompt fragility across 6+ document types** -- A single generic prompt fails on OMVIC forms and French documents. Mitigate with document type classification before extraction, per-type prompt templates, and regression testing against all 18 POC PDFs.

6. **API cost creep** -- Budget is $2-5/month. Mitigate by caching all extraction results, sending only relevant pages, considering Haiku for simple documents, and tracking per-document spend.

## Implications for Roadmap

Based on combined research, the project naturally breaks into 4 phases following the data pipeline dependency chain: you cannot review what has not been extracted, you cannot export what has not been approved.

### Phase 1: Foundation + Database + Auth
**Rationale:** Every other phase depends on the project skeleton, database schema, and authentication. The architecture research confirms auth must gate everything from day one, and the schema (vehicles, documents, extractions, audit_log, exports) must be designed upfront to support the audit trail requirement.
**Delivers:** Running Next.js 16 app deployed on Coolify, PostgreSQL database with full schema via Drizzle ORM, Better Auth login, basic layout with navigation, Docker configuration.
**Addresses:** Authentication (P1), project infrastructure, database foundation, audit trail schema.
**Avoids:** Security pitfall of unprotected API routes; technical debt of bolting on audit trail later.

### Phase 2: Upload + Extraction Pipeline
**Rationale:** The extraction pipeline is the core value proposition and the highest-risk component. It must be built and validated early. The pitfalls research identifies 5 of 7 critical pitfalls in the extraction layer -- getting this right is the project's make-or-break.
**Delivers:** PDF upload with drag-drop, Claude API integration with per-document-type prompts, VIN three-layer validation, confidence scoring, extraction result storage (raw + parsed), AP/AR paired processing.
**Addresses:** PDF upload (P1), Claude API extraction (P1), VIN validation (P1), dual-PDF linking (P1), confidence highlighting data layer (P1).
**Avoids:** VIN character confusion, non-deterministic extraction, numerical hallucination, prompt fragility, API cost blow-up.
**Key validation:** Test against all 18 POC PDFs covering 6 document types. VIN accuracy must exceed 95% after validation layers.

### Phase 3: Review + Approval Workflow
**Rationale:** Depends on Phase 2 extraction results. The review screen is the critical human-in-the-loop safety net for regulatory compliance. Architecture research shows this is the most complex UI component (side-by-side PDF + editable form + confidence display + cross-validation).
**Delivers:** Review page with side-by-side PDF preview and editable fields, confidence-colored field highlighting, AP/AR cross-validation display, approval workflow (pending -> approved), audit trail logging of all edits.
**Addresses:** Human review screen (P1), PDF preview side-by-side (P1), approval workflow (P1), audit trail logging (P1).
**Avoids:** Silent extraction failures that look correct (the side-by-side view forces visual verification); skipping review (explicit approval gate).

### Phase 4: Export + Register + Dashboard
**Rationale:** Depends on Phase 3 approved records. The XLSX export is the final output and has its own pitfall (template format drift). The register page and dashboard provide operational visibility.
**Delivers:** XLSX generation in Ministry format, append-to-existing XLSX, register page with search/filter, dashboard with processing status, export selection UI.
**Addresses:** XLSX export new (P1), XLSX export append (P1), search and filter (P1), dashboard (P1), mobile responsive (P1).
**Avoids:** XLSX template format drift (test against actual Ministry file); exporting unreviewed data (only approved records are exportable).
**Key validation:** Generated XLSX must be byte-compared against a known-good Ministry submission. Test in both LibreOffice and Microsoft Excel.

### Phase Ordering Rationale

- **Dependency chain is strict:** Database -> Extraction -> Review -> Export. Each phase produces the input for the next. This ordering is confirmed by both the architecture build order and the feature dependency graph.
- **Risk-first approach:** Phase 2 (extraction) is the highest-risk, highest-value component. Building it second (right after foundation) means problems are discovered early when they are cheap to fix. The 18 POC PDFs provide an immediate regression test suite.
- **Pitfall alignment:** 5 of 7 critical pitfalls cluster in Phases 1-2, confirming that the early phases need the most careful implementation. Phases 3-4 have well-documented UI patterns (forms, tables, file downloads) with lower technical risk.
- **Value delivery:** After Phase 3, the core extraction-review loop is functional. Andrey can start using it for real deals even before XLSX export is built (he can manually transcribe approved data). Phase 4 completes the automation.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Extraction Pipeline):** Needs `/gsd-research-phase` -- Claude API prompt engineering for 6 document types, document classification strategy, confidence scoring approach, and optimal model selection (Haiku vs Sonnet per document type). The POC data provides a test suite but the production prompt architecture requires careful design.
- **Phase 4 (XLSX Export):** Needs `/gsd-research-phase` -- ExcelJS read/modify/write behavior with the actual Ministry template. The known cellStyleXfs bug could force a fallback architecture. Must test early in Phase 1 even though the feature ships in Phase 4.

Phases with standard patterns (skip deeper research):
- **Phase 1 (Foundation):** Well-documented Next.js 16 + Drizzle ORM + Better Auth setup. Invoice Ledger provides a reference implementation for Docker/Coolify deployment.
- **Phase 3 (Review UI):** Standard React form patterns with React Hook Form + Zod. The side-by-side layout is a common document review UX pattern. react-pdf for preview is straightforward.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Every technology verified against official docs or existing AD Auto production code (Invoice Ledger). Drizzle ORM is the only "new" addition -- but well-documented with 900K+ weekly downloads. |
| Features | HIGH | Feature set derived from real user workflow (Andrey's current manual process), POC validation (18 documents tested), and competitor analysis. Ministry XLSX format is a known, fixed target. |
| Architecture | HIGH | Monolith with synchronous extraction is the correct architecture at this scale. Build order follows natural dependency chain. Patterns proven in Invoice Ledger. |
| Pitfalls | HIGH | Pitfalls verified against Anthropic official documentation, production post-mortems, and the POC results (80% VIN accuracy, 90% model accuracy confirmed the extraction risks). Mitigations are specific and actionable. |

**Overall confidence:** HIGH

### Gaps to Address

- **ExcelJS append-mode formatting preservation:** The STACK.md notes MEDIUM confidence on ExcelJS's ability to preserve Ministry template formatting during read/modify/write. This MUST be validated with the actual `AD Auto CANADA Garage Register 2025-2026.xlsx` file during Phase 1, even though the feature ships in Phase 4. If it fails, the fallback is generation-only (always create fresh from template + data, never modify in-place).

- **Optimal prompt architecture for 6 document types:** The POC validated that Claude can extract from all document types, but production prompts with per-type routing, few-shot examples, and confidence signals have not been designed. This is the primary design challenge in Phase 2.

- **Haiku vs Sonnet accuracy tradeoff:** Pitfalls research suggests Haiku for simple documents and Sonnet for complex ones (OMVIC, French BOS). The accuracy difference has not been benchmarked. During Phase 2, run the 18 POC PDFs through both models and compare.

- **Connection pooling on shared PostgreSQL:** Five apps (Garage Register, Invoice Ledger, CRM, DealManager, plus Coolify itself) share one PostgreSQL instance. Drizzle with postgres.js needs connection limit configuration to avoid starving other apps. Validate during Phase 1 deployment.

- **PDF preview bundle size impact:** react-pdf adds pdf.js to the client bundle. May need dynamic import or defer to Phase 3 if it significantly impacts initial load performance.

## Sources

### Primary (HIGH confidence)
- [Anthropic Claude PDF Support Docs](https://platform.claude.com/docs/en/docs/build-with-claude/pdf-support) -- PDF limits, base64 encoding, token costs
- [Anthropic Claude Vision Docs](https://platform.claude.com/docs/en/build-with-claude/vision) -- hallucination limitations, spatial reasoning
- [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing) -- Haiku $1/$5, Sonnet $3/$15 per MTok
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/get-started-postgresql) -- PostgreSQL setup, migrations
- [Better Auth](https://better-auth.com/) -- v1.6.0, Drizzle adapter, email/password auth
- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16) -- Turbopack stable, React Compiler
- [shadcn/ui](https://ui.shadcn.com/) -- CLI v4, Next.js + Tailwind v4 support
- [OMVIC Garage Register Requirements](https://www.omvic.ca/selling/sales-operations/garage-register/) -- Official compliance guidance
- [VIN Check Digit Algorithm](https://en.wikibooks.org/wiki/Vehicle_Identification_Numbers_(VIN_codes)/Check_digit) -- NHTSA standard
- AD Auto Invoice Ledger project -- established patterns for Next.js 16, ExcelJS, Docker/Coolify deployment

### Secondary (MEDIUM confidence)
- [Drizzle vs Prisma 2026 comparison](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) -- Performance and DX analysis
- [Better Auth vs Lucia vs NextAuth 2026](https://trybuildpilot.com/625-better-auth-vs-lucia-vs-nextauth-2026) -- Auth landscape
- [Don't Use LLMs as OCR (Medium)](https://medium.com/@martia_es/dont-use-llms-as-ocr-lessons-learned-from-extracting-complex-documents-db2d1fafcdfb) -- Numbers misread more than text
- [Confidence Signals for LLM Extraction](https://www.sensible.so/blog/confidence-signals) -- Per-field uncertainty approaches
- [ExcelJS cellStyleXfs Bug (GitHub #2830)](https://github.com/exceljs/exceljs/issues/2830) -- Styles not preserved on read/write
- [PDF Parsing Benchmark (Applied AI)](https://www.applied-ai.com/briefings/pdf-parsing-benchmark/) -- Accuracy varies by document type

### Tertiary (needs validation)
- Haiku vs Sonnet accuracy for structured extraction -- suggested in pitfalls research, not benchmarked against these specific document types
- xlsx-populate fork (@xlsx/xlsx-populate v0.2.0) -- too new to trust, mentioned as potential fallback but not recommended

---
*Research completed: 2026-04-08*
*Ready for roadmap: yes*
