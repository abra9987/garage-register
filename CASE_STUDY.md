# AD Auto — Garage Register Automation

## Problem
- **Who:** Small auto export business owner in Ontario, Canada (AD Auto Export)
- **What was happening:** Every vehicle transaction requires manual data entry into a Ministry of Transportation Ontario Garage Register. The owner reads each PDF invoice/bill of sale and types the data (VIN, make, model, year, color, odometer, seller, buyer, prices, dates) into an Excel spreadsheet — one row per vehicle.
- **Cost:** ~50 documents/month, ~10-15 minutes per entry = ~6-8 hours/month. Risk of typos in VINs or seller names that could cause regulatory issues with the Ministry.

## Solution
- The system automatically reads PDF invoices and bills of sale using AI vision, extracts vehicle and transaction data, presents it for human review with confidence scoring, and exports to the official Ministry of Transportation Excel format.
- **Key features:**
  - Drag-and-drop upload of AP (purchase) and AR (sale) PDFs per vehicle with instant visual preview
  - AI extraction from 6+ document formats including scanned documents, French-language bills of sale, and complex OMVIC dealer forms
  - Side-by-side PDF viewer with confidence-highlighted review form — green/yellow/red fields show extraction certainty
  - VIN validation with check digit verification and cross-document conflict detection (flags mismatches between AP and AR)
  - One-click export to exact Ministry of Transportation Ontario XLSX format, or append to existing register
  - Searchable vehicle register with filters by status, date range, VIN, job number
  - Dashboard with pending review count, monthly exports, and recent activity feed
  - Delete vehicle records with confirmation dialog and audit trail

## Tech Stack
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui (base-nova)
- **Backend:** Next.js App Router API routes, Drizzle ORM, PostgreSQL (shared instance)
- **AI:** Anthropic Claude API (Sonnet) for PDF vision extraction — sends PDFs as base64 document blocks
- **Auth:** Better Auth with email/password, session-based
- **Export:** ExcelJS for XLSX generation in Ministry format
- **PDF Preview:** react-pdf for client-side rendering
- **Infrastructure:** Docker on Hetzner CX43, deployed via Coolify with auto-SSL
- **Domain:** garage.adauto.ca

## Results
- **Before:** ~10-15 min per vehicle entry, manual reading of 2 PDFs, typing 15+ fields, risk of VIN typos
- **After:** ~2-3 min per vehicle — upload PDFs, review pre-filled form, approve, export
- **Estimated time savings:** ~6-8 hours/month → ~1.5 hours/month (~75% reduction)
- **API cost:** ~$2-5/month for 50 documents (Claude Sonnet)
- **Accuracy:** VIN validation catches errors automatically, confidence scoring flags uncertain fields for review
- **User feedback:** "Design is nice, everything is intuitive" — first testing session

## Screenshots
- [Upload page — drag-and-drop AP + AR PDFs with inline PDF preview]
- [Extraction results with confidence badges (High/Medium/Low) and VIN validation]
- [Review page — side-by-side PDF viewer with editable form and approval flow]
- [Register page — sortable/filterable table with search by VIN, job#, make, model]
- [Dashboard — stat cards, quick actions, recent activity feed]
- [Export page — select records, download new XLSX or append to existing register]
- [Delete confirmation dialog with vehicle identifier and exported warning]
- [Mobile responsive — vehicle cards on small screens]

## Timeline
- April 8, 2026: POC completed — analyzed 18 real PDFs, validated Claude API vision approach
- April 9, 2026: Full application built — 6 phases executed (Foundation → Upload → Review → Export → PDF Preview → Delete)
- April 9, 2026: Deployed to production at garage.adauto.ca, first user testing by business owner

## Lessons Learned
- **Document format variety is real** — 6 distinct types found in just 18 documents. Template-based parsing would have been impractical; AI vision was the right call.
- **Confidence scoring is essential** — not all extractions are equal. Color-coded confidence lets the user focus review time on uncertain fields.
- **Human review is non-negotiable** — regulatory document means 100% accuracy required. AI extracts, human verifies. Cross-document conflict detection (AP vs AR VIN mismatch) caught real data issues.
- **Claude API cost is negligible** — at $2-5/month for a business that processes ~50 documents, the AI cost is essentially free compared to labor savings.
- **User feedback drives features** — PDF preview and delete button were added after first 10 minutes of real user testing. Simple features that matter.
